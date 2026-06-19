/**
 * engine/core/engine.js
 *
 * GalEngine —— 视觉小说 / Galgame 内核。
 *
 * 设计理念：
 *  - 框架无关：不依赖 Vue / React 等任何 UI 框架
 *  - 数据驱动：输入章节数据 + 配置，输出状态变更事件
 *  - 可扩展：通过事件钩子 (hooks) 注入自定义行为
 *  - 可序列化：完整状态快照支持存档 / 读档 / 回溯
 *
 * 使用方式：
 *   const engine = new GalEngine({ chapters, characters, scenes, items, endings, config });
 *   engine.on('step:enter', (step) => { ... });
 *   engine.start('main');
 *   engine.advance();
 */

import { EventEmitter } from './event-emitter.js';
import { GameState }  from './state.js';
import { SaveManager } from '../storage/save-manager.js';

export class GalEngine extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.chapters   - 章节数据 { chapterId: Step[] }
     * @param {Object} options.characters - 角色配置
     * @param {Object} options.scenes     - 场景配置
     * @param {Object} options.cgLibrary  - CG 图鉴配置
     * @param {Object} options.items      - 物品配置
     * @param {Array}  options.endings    - 结局列表
     * @param {Object} options.config     - 全局配置 { title, aspectRatio, textSpeed }
     * @param {Object} options.homeConfig - 首页配置
     */
    constructor(options = {}) {
        super();

        // ---- 静态数据（ROM） ----
        this.chapters   = options.chapters   || {};
        this.characters = options.characters || {};
        this.scenes     = options.scenes     || {};
        this.cgLibrary  = options.cgLibrary  || {};
        this.items      = options.items      || {};
        this.endings    = options.endings    || [];
        this.config     = options.config     || { title: 'Untitled', textSpeed: 25, aspectRatio: { width: 1280, height: 720 } };
        this.homeConfig = options.homeConfig || {};

        // ---- 运行时状态 ----
        this.state = new GameState();

        // ---- 存档管理器 ----
        this.saveManager = new SaveManager();

        // ---- 内部定时器 ----
        this._typingTimer = null;
        this._autoAdvanceTimer = null;
        // ---- 文本批处理（texts 数组多段推进，减少 _executeStep 调用） ----
        this._textBatch = null;      // string[] | null
        this._textBatchIndex = 0;    // 当前批次内的文本索引

        // ---- 回调钩子（供外部注入 UI 行为） ----
        this._hooks = {
            onTypewriterTick: null,   // (char, index) => void
            onTypewriterDone: null,   // () => void
            onItemToast: null,        // (itemId, mode, approach) => void
        };
    }

    // ====================================================================
    //  钩子注册
    // ====================================================================

    /**
     * 注册钩子函数
     * @param {'typewriterTick'|'typewriterDone'|'itemToast'} name
     */
    hook(name, fn) {
        this._hooks[name] = fn;
        return this;
    }

    // ====================================================================
    //  核心流程
    // ====================================================================

    /**
     * 开始新游戏
     * @param {string} chapterId
     * @param {number} [stepIndex=0]
     */
    start(chapterId = 'main', stepIndex = 0) {
        this._clearTimers();
        this.state.reset({
            currentChapterId: chapterId,
            currentStepIndex: stepIndex,
            gameState: { money: 100, inventory: ['log', 'amulet'], flags: {} }
        });
        this.emit('chapter:change', { from: null, to: chapterId, stepIndex });
        this.emit('game:start', { chapterId, stepIndex });
        this._executeStep();
    }

    /**
     * 获取当前步骤
     */
    get currentStep() {
        const pool = this.chapters[this.state.currentChapterId];
        if (!pool) return null;
        return pool[this.state.currentStepIndex] || null;
    }

    /**
     * 推进剧情（点击对话框 / 全局点击）
     * @returns {string} 操作结果: 'typing' | 'text_batch' | 'advance' | 'choice' | 'ending' | 'end'
     */
    advance() {
        // 正在打字 → 强制完成
        if (!this.state.typingFinished) {
            this._finishTyping();
            return 'typing';
        }

        // 文本批处理：当前段打字完毕，推进到下一段（不触发 _executeStep）
        if (this._textBatch && this._textBatchIndex < this._textBatch.length - 1) {
            this._textBatchIndex++;
            const nextText = this._textBatch[this._textBatchIndex];
            const speed = this._resolveBatchSpeed();

            // 应用当前批段的 per-text 特效（effects / screenEffect 变化）
            const step = this.currentStep;
            if (step && step.textEffects && step.textEffects[this._textBatchIndex]) {
                const te = step.textEffects[this._textBatchIndex];
                if (te.effects !== undefined) this.state.setActiveEffects(te.effects);
                if (te.screenEffect !== undefined && te.screenEffect !== this.state.currentScreenEffect) {
                    this.state.setScreenEffect(te.screenEffect);
                    this.emit('effect:screen', te.screenEffect);
                }
                this.emit('effect:change', {
                    effects: this.state.activeEffects,
                    screenEffect: this.state.currentScreenEffect,
                });
            }

            this._startTypewriter(nextText, speed);
            this.emit('typewriter:batch', {
                index: this._textBatchIndex,
                total: this._textBatch.length,
                text: nextText,
            });
            return 'text_batch';
        }

        // 有待触发的结局
        if (this.state.pendingEnding) {
            const ending = this.state.pendingEnding;
            this.state.setPendingEnding(null);
            this._triggerEnding(ending);
            return 'ending';
        }

        const step = this.currentStep;

        // 到达章节末尾 → 尝试匹配结局
        if (!step) {
            this._autoMatchEnding();
            return 'end';
        }

        // 分支选项 → 不可推进
        if (step.type === 'choice') {
            return 'choice';
        }

        // 设置 lastSpeaker
        this.state.setLastSpeaker(this._getSpeakerId());

        // 章节跳转（仅 jump / ending / choice 步骤具备跳转能力）
        if ((step.type === 'jump' || step.type === 'ending' || step.type === 'choice') && step.jumpChapter) {
            if (step.jumpChapter.startsWith('_end_')) {
                const endingId = step.jumpChapter.slice(5);
                const endingObj = this.endings.find(e => e.id === endingId);
                this._triggerEnding(endingObj || { id: endingId, title: endingId, description: '' });
                return 'ending';
            }
            this.state.truncateHistoryLogs(this.state.historyLogs.length - 1);
            const fromChapter = this.state.currentChapterId;
            // 角色保留在舞台，由新步骤的 characterChanges 显式管理（leave / clearAll）
            // 不自动清场，避免角色跨章节消失
            this.state.setChapter(step.jumpChapter, 0);
            this.state.setLastSpeaker(null);
            this.emit('chapter:change', { from: fromChapter, to: step.jumpChapter, stepIndex: 0 });
        } else {
            this.state.advanceStep();
        }

        this._executeStep();
        return 'advance';
    }

    /**
     * 选择分支选项
     * @param {Object} choice - 选项对象 { text, flag, jumpChapter, gainItem, loseItem, ... }
     */
    selectChoice(choice) {
        this.state.truncateHistoryLogs(this.state.historyLogs.length - 1);

        // 处理选项附带效果
        if (choice.flag) this.state.setFlag(choice.flag);
        if (choice.loseMoney) {
            this.state.setGameStateField('money', this.state.gameState.money - choice.loseMoney);
        }
        if (choice.gainItem) {
            this._processItemGain(choice.gainItem, choice.gainApproach || 'find');
        }
        if (choice.loseItem) {
            this._processItemLoss(choice.loseItem, choice.loseApproach || 'use');
        }
        if (choice.updateItem) {
            const u = choice.updateItem;
            if (u.flag) this.state.setFlag(u.flag);
            this.emit('item:update', { id: u.id, mode: 'update', approach: 'change' });
        }

        if (choice.jumpChapter) {
            if (choice.jumpChapter.startsWith('_end_')) {
                const endingId = choice.jumpChapter.slice(5);
                const endingObj = this.endings.find(e => e.id === endingId);
                this._triggerEnding(endingObj || { id: endingId, title: endingId, description: '' });
                this.emit('choice:selected', choice);
                return;
            }
            const fromCh = this.state.currentChapterId;
            // 角色保留在舞台，由后续步骤显式管理（leave / clearAll）
            this.state.setChapter(choice.jumpChapter, 0);
            this.state.setLastSpeaker(null);
            this.emit('chapter:change', { from: fromCh, to: choice.jumpChapter, stepIndex: 0 });
        } else {
            this.state.advanceStep();
        }

        this.emit('choice:selected', choice);
        this._executeStep();
    }

    // ====================================================================
    //  步骤执行引擎（私有）
    // ====================================================================

    _executeStep() {
        this._clearTimers();
        const step = this.currentStep;

        if (!step) {
            this._autoMatchEnding();
            return;
        }

        this.emit('step:enter', step);

        // ---- 物品变更 ----
        if (step.gainItem) this._processItemGain(step.gainItem, step.gainApproach || 'find');
        if (step.loseItem) this._processItemLoss(step.loseItem, step.loseApproach || 'use');
        if (step.updateItem) {
            const u = step.updateItem;
            if (u.flag) this.state.setFlag(u.flag);
            this.emit('item:update', { id: u.id, mode: 'update', approach: 'change' });
        }

        // ---- Flag ----
        if (step.flag) this.state.setFlag(step.flag);

        // ---- CG 变化 ----
        if (step.cgChanges) this._processCGChange(step.cgChanges);

        // ---- 屏幕特效 ----
        if (step.effects !== undefined) this.state.setActiveEffects(step.effects);
        if (step.screenEffect !== undefined) {
            if (step.screenEffect !== this.state.currentScreenEffect) {
                this.state.setScreenEffect(step.screenEffect);
                this.emit('effect:screen', step.screenEffect);
            }
        }
        this.emit('effect:change', { effects: this.state.activeEffects, screenEffect: this.state.currentScreenEffect });

        // ---- 角色变更 ----
        if (step.characterChanges) this._processCharacterChanges(step.characterChanges);
        this.emit('characters:change', this.state.stageCharacters);

        // ---- 跳转步骤：无条件直接跳转（无对话、无交互） ----
        // 内部抽象：ending_trigger 是 jump_step 的派生，通过 endingId 标识
        // ending 步骤与 jump 步骤的 ending_trigger 派生行为一致
        if (step.type === 'jump' || step.type === 'ending') {
            if (step.endingId) {
                // ending_trigger / ending step：展示结局描述后触发结局
                const endingObj = this.endings.find(e => e.id === step.endingId);
                if (endingObj) {
                    this.state.setPendingEnding(endingObj);
                    this.emit('step:ending-pending', endingObj);
                    const fakeStep = {
                        type: 'dialogue',
                        characterId: null,
                        text: endingObj.description,
                        speed: 25,
                        autoAdvance: false
                    };
                    this._startTypewriter(fakeStep.text, fakeStep.speed);
                    return;
                } else {
                    this._triggerEnding({ id: step.endingId, title: step.endingId, description: '' });
                    return;
                }
            }
            // 常规跳转（仅 jump 步骤支持，ending 步骤必须设置 endingId）
            if (step.type === 'jump') {
                this.emit('step:jump', { from: this.state.currentChapterId, to: step.jumpChapter });
                if (step.jumpChapter) {
                    this.state.truncateHistoryLogs(this.state.historyLogs.length - 1);
                    const fromCh = this.state.currentChapterId;
                    // 角色保留在舞台，由后续步骤显式管理
                    this.state.setChapter(step.jumpChapter, 0);
                    this.state.setLastSpeaker(null);
                    this.emit('chapter:change', { from: fromCh, to: step.jumpChapter, stepIndex: 0 });
                } else {
                    this.state.advanceStep();
                }
                this._executeStep();
                return;
            }
            // ending 步骤无 endingId 时：视为章节末尾，尝试匹配结局
            this._autoMatchEnding();
            return;
        }

        // ---- 对话（支持 texts 多段批处理） ----
        if (step.type === 'dialogue') {
            let speed = this.config.textSpeed;
            if (step.characterId && this.characters[step.characterId]?.defaultSpeed !== undefined) {
                speed = this.characters[step.characterId].defaultSpeed;
            }
            if (step.speed !== undefined) speed = step.speed;

            // 明确声明 texts 数组 → 多段批处理
            const batchTexts = step.texts && step.texts.length ? step.texts : null;

            if (batchTexts) {
                this._textBatch = batchTexts;
                this._textBatchIndex = 0;
                this._startTypewriter(batchTexts[0], speed);
            } else {
                this._textBatch = null;
                this._textBatchIndex = 0;
                this._startTypewriter(step.text || '', speed);
            }

            // 历史记录（不论 batch 多大，只记录一条）
            const displayText = batchTexts
                ? batchTexts[0].substring(0, 120)
                : ((step.text || '').substring(0, 120));
            const logMeta = {
                chapterId: this.state.currentChapterId,
                stepIndex: this.state.currentStepIndex,
                speaker: this._getSpeakerName(),
                color: this._getSpeakerColor(),
                text: displayText,
                textsFull: batchTexts && batchTexts.length > 1 ? batchTexts : undefined,
                snap: this.state.snapshot()
            };

            const isExist = this.state.historyLogs.some(
                l => l.chapterId === logMeta.chapterId && l.stepIndex === logMeta.stepIndex
            );
            if (!isExist) {
                this.state.pushHistoryLog(logMeta);
                // 内存优化：仅保留最近 30 条历史记录的完整 snap（用于回滚）
                if (this.state.historyLogs.length > 30) {
                    const stale = this.state.historyLogs.length - 30;
                    for (let i = 0; i < stale; i++) {
                        if (this.state.historyLogs[i].snap) {
                            this.state.historyLogs[i] = { ...this.state.historyLogs[i], snap: undefined };
                        }
                    }
                }
                this.emit('history:push', logMeta);
            }
        }

        // ---- 分支 ----
        if (step.type === 'choice') {
            this._finishTyping();
            this.emit('choice:present', step.choices || []);
        }
    }

    // ====================================================================
    //  打字机
    // ====================================================================

    _startTypewriter(text, speed) {
        this._clearTypingTimer();
        this.state.setTypedText('');
        this.state.setTypingFinished(false);
        this.emit('typewriter:start', { text, speed });

        let index = 0;
        let lastTickTime = performance.now();
        const minInterval = Math.max(speed, 16); // 不低于 16ms (~60fps)

        const tick = (now) => {
            const elapsed = now - lastTickTime;
            if (elapsed < minInterval) {
                this._typingTimer = requestAnimationFrame(tick);
                return;
            }
            lastTickTime = now;

            if (index < text.length) {
                const currentText = text.substring(0, index + 1);
                this.state.setTypedText(currentText);
                index++;
                this.emit('typewriter:tick', { char: text[index - 1], index: index - 1, finished: false, text: currentText });
                if (this._hooks.onTypewriterTick) {
                    this._hooks.onTypewriterTick(text[index - 1], index - 1);
                }
                this._typingTimer = requestAnimationFrame(tick);
            } else {
                this._finishTyping();
                // 自动推进
                if (!this.state.pendingEnding && this.currentStep?.autoAdvance) {
                    const delay = this.currentStep.autoDelay || 1500;
                    this._autoAdvanceTimer = setTimeout(() => this.advance(), delay);
                }
            }
        };

        this._typingTimer = requestAnimationFrame(tick);
    }

    _finishTyping() {
        this._clearTypingTimer();
        const step = this.currentStep;
        if (this._textBatch && this._textBatchIndex < this._textBatch.length) {
            this.state.setTypedText(this._textBatch[this._textBatchIndex]);
        } else if (step && step.text) {
            this.state.setTypedText(step.text);
        }
        this.state.setTypingFinished(true);
        this.emit('typewriter:done', { text: this.state.typedText });
        if (this._hooks.onTypewriterDone) this._hooks.onTypewriterDone();
    }

    // ====================================================================
    //  回溯
    // ====================================================================

    /**
     * 回溯到指定历史记录点
     */
    rollbackToLog(logIndex) {
        const targetLog = this.state.historyLogs[logIndex];
        if (!targetLog || !targetLog.snap) return false;

        this._clearTimers();
        // 清理滞留的退场定时器
        if (this._stageLeaveTimers) {
            this._stageLeaveTimers.forEach(t => clearTimeout(t));
            this._stageLeaveTimers = [];
        }
        this.state.truncateHistoryLogs(logIndex);
        this.state.restore(targetLog.snap);
        this.state.setChapter(targetLog.chapterId, targetLog.stepIndex);

        this.emit('chapter:change', { from: this.state.currentChapterId, to: targetLog.chapterId, stepIndex: targetLog.stepIndex });
        this.emit('rollback', { logIndex, targetLog });
        this._executeStep();
        return true;
    }

    // ====================================================================
    //  存档 / 读档
    // ====================================================================

    save(slotId, meta = {}) {
        // 1. 获取快照（snapshot 内部已做递归 snap 剥离 + 字符串截断 + 异常兜底）
        let snap;
        try {
            snap = this.state.snapshot();
        } catch (e) {
            console.error('[GalEngine] snapshot() 生成失败，无法存档:', e.message);
            this.emit('save:error', { slotId, error: `快照生成失败: ${e.message}` });
            return false;
        }

        if (!snap || typeof snap !== 'object') {
            console.error('[GalEngine] snapshot() 返回无效数据，无法存档');
            this.emit('save:error', { slotId, error: '快照数据无效' });
            return false;
        }

        // 2. 安全获取场景配置
        let bgPlaceholder = '#111';
        let sceneUrl = null;
        try {
            const step = this.currentStep;
            const sceneCfg = step?.sceneId ? this.scenes[step.sceneId] : null;
            if (sceneCfg) {
                bgPlaceholder = typeof sceneCfg.bgPlaceholder === 'string' ? sceneCfg.bgPlaceholder : '#111';
                const resolvedUrl = step.sceneId ? this._resolveSceneUrl(step.sceneId) : null;
                sceneUrl = resolvedUrl || null;
            }
        } catch (e) {
            console.warn('[GalEngine] 获取场景配置失败:', e.message);
        }

        // 3. 构建存档数据
        const slotData = {
            ...snap,
            ...meta,
            bgPlaceholder,
            sceneUrl,
        };

        // 4. 发包前二次检查：确保所有字段可安全序列化
        try {
            const testJson = JSON.stringify(slotData);
            // 预估大小，超过 3MB 发出警告
            const estimatedSize = typeof Blob !== 'undefined' ? new Blob([testJson]).size : testJson.length;
            if (estimatedSize > 3 * 1024 * 1024) {
                console.warn(`[GalEngine] 存档过大 (约 ${(estimatedSize / 1024 / 1024).toFixed(1)}MB)，尝试压缩...`);
                // 截断历史日志到最近 20 条
                if (slotData.historyLogs && slotData.historyLogs.length > 20) {
                    slotData.historyLogs = slotData.historyLogs.slice(-20);
                }
            }
        } catch (e) {
            console.error('[GalEngine] 存档数据不可序列化，使用精简数据重试:', e.message);
            // 极端情况：构建最小存档数据
            slotData.historyLogs = [];
            slotData.stageCharacters = {};
            slotData.activeCG = null;
            // 再试一次
            try {
                JSON.stringify(slotData);
            } catch (e2) {
                console.error('[GalEngine] 精简后仍无法序列化，存档失败:', e2.message);
                this.emit('save:error', { slotId, error: `数据不可序列化: ${e2.message}` });
                return false;
            }
        }

        // 5. 持久化
        try {
            return this.saveManager.save(slotId, slotData);
        } catch (e) {
            console.error('[GalEngine] 存档失败:', e.message);
            this.emit('save:error', { slotId, error: e.message });
            return false;
        }
    }

    load(slotId) {
        try {
            const data = this.saveManager.load(slotId);
            if (!data) {
                console.warn('[GalEngine] 读取存档为空:', slotId);
                return false;
            }
            if (typeof data !== 'object' || Array.isArray(data)) {
                console.error('[GalEngine] 存档数据格式异常:', slotId);
                return false;
            }

            this._clearTimers();
            const prevChapter = this.state.currentChapterId;
            // 清理滞留的退场定时器（restore 会覆盖角色数据）
            if (this._stageLeaveTimers) {
                this._stageLeaveTimers.forEach(t => clearTimeout(t));
                this._stageLeaveTimers = [];
            }
            this.state.restore(data);
            this.emit('chapter:change', {
                from: prevChapter,
                to: this.state.currentChapterId || 'main',
                stepIndex: this.state.currentStepIndex ?? 0
            });
            this.emit('game:load', data);
            this._executeStep();
            return true;
        } catch (e) {
            console.error('[GalEngine] 读档失败:', slotId, e.message);
            this.emit('load:error', { slotId, error: e.message });
            return false;
        }
    }

    getSaveSlots() {
        return this.saveManager.getAll();
    }

    clearSaveSlot(slotId) {
        return this.saveManager.clear(slotId);
    }

    // ====================================================================
    //  物品系统
    // ====================================================================

    _processItemGain(itemId, approach) {
        if (!this.state.gameState.inventory.includes(itemId)) {
            this.state.addItem(itemId);
            this.emit('item:gain', { itemId, approach });
        }
    }

    _processItemLoss(itemId, approach) {
        const idx = this.state.gameState.inventory.indexOf(itemId);
        if (idx > -1) {
            this.state.removeItem(itemId);
            this.emit('item:lose', { itemId, approach });
        }
    }

    // ====================================================================
    //  CG 系统
    // ====================================================================

    _processCGChange(cg) {
        if (!cg || typeof cg !== 'object') {
            console.warn('[GalEngine] cgChanges 无效，已跳过');
            return;
        }
        if (cg.action === 'enter') {
            const cgData = {
                id: cg.id || 'unknown',
                url: cg.id ? this._resolveCGUrl(cg.id) : '',
                animation: cg.animation || 'scaleIn',
                effectClass: cg.effect ? `fx-${cg.effect}` : ''
            };
            this.state.setActiveCG(cgData);
            this.emit('cg:enter', cgData);
        } else if (cg.action === 'update' && this.state.activeCG) {
            const updated = { ...this.state.activeCG, animation: cg.animation || 'pulse' };
            if (cg.effect) updated.effectClass = `fx-${cg.effect}`;
            this.state.setActiveCG(updated);
            this.emit('cg:update', updated);
        } else if (cg.action === 'leave') {
            const leaving = { ...this.state.activeCG, animation: cg.animation || 'fadeOut' };
            this.state.setActiveCG(leaving);
            this.emit('cg:leave', leaving);
            // CG 离开后清除（由 UI 层处理动画完成后的回调）
        }
    }

    clearActiveCG() {
        this.state.setActiveCG(null);
        this.emit('cg:cleared');
    }

    // ====================================================================
    //  角色管理
    // ====================================================================

    /**
     * 安全获取角色精灵 URL。
     * 验证资源存在性，对缺失/异常资源返回空字符串以触发 UI 兜底占位图。
     */
    _resolveSpriteUrl(charId, spriteId) {
        try {
            const charCfg = this.characters[charId];
            if (!charCfg) return '';
            if (!charCfg.sprites || typeof charCfg.sprites !== 'object') return '';
            const sprite = charCfg.sprites[spriteId];
            if (!sprite) return '';
            const url = sprite.url;
            // 只接受有限长度（< 1MB）的字符串 url，拒绝对象/数字/过长 data:uri
            if (typeof url === 'string' && url.length > 0 && url.length < 1024 * 1024) {
                return url;
            }
            return '';
        } catch (e) {
            console.warn(`[GalEngine] 解析角色精灵 URL 失败: ${charId}/${spriteId}`, e.message);
            return '';
        }
    }

    /**
     * 安全获取 CG URL。
     */
    _resolveCGUrl(cgId) {
        try {
            const asset = this.cgLibrary[cgId];
            if (!asset) return '';
            const url = asset.url;
            if (typeof url === 'string' && url.length > 0 && url.length < 1024 * 1024) {
                return url;
            }
            return '';
        } catch (e) {
            console.warn(`[GalEngine] 解析 CG URL 失败: ${cgId}`, e.message);
            return '';
        }
    }

    /**
     * 安全获取场景 URL。
     */
    _resolveSceneUrl(sceneId) {
        try {
            const scene = this.scenes[sceneId];
            if (!scene) return '';
            const url = scene.url;
            if (typeof url === 'string' && url.length > 0 && url.length < 1024 * 1024) {
                return url;
            }
            return '';
        } catch (e) {
            console.warn(`[GalEngine] 解析场景 URL 失败: ${sceneId}`, e.message);
            return '';
        }
    }

    // ====================================================================
    //  增强角色控制 DSL —— 位置常量
    // ====================================================================

    /** 预设位置映射表，用于 gather/scatter 等批操作 */
    static POSITIONS = [
        'left-far', 'left', 'center-left',
        'center',
        'center-right', 'right', 'right-far'
    ];

    /**
     * 动画名称标准化映射（兼容旧格式）
     */
    _normalizeAnimation(anim) {
        if (!anim) return '';
        const map = {
            'fadeIn': 'fade-in',
            'fadeOut': 'fade-out',
            'fadein': 'fade-in',
            'fadeout': 'fade-out',
            'slideIn': 'slide-in-up',
            'slideOut': 'slide-out-up',
            'slidein': 'slide-in-up',
            'slideout': 'slide-out-up',
            'bounce': 'bounce-in',
            'zoomIn': 'zoom-in',
            'zoomOut': 'zoom-out',
            'shake': 'shake',
            'pulse': 'pulse',
            'float': 'float',
            'flash': 'flash',
            'glow': 'glow',
            'blur': 'blur',
            'flip': 'flip-in',
            'flipIn': 'flip-in',
            'flipOut': 'flip-out',
            // 旧式 slide-left/right 保持兼容
            'slide-left': 'slide-left',
            'slide-right': 'slide-right',
        };
        return map[anim] || anim;
    }

    /**
     * 获取下一个可用的 z-order 值（新角色排在最后）
     */
    _getNextOrder() {
        const chars = this.state.stageCharacters;
        let max = 0;
        for (const c of Object.values(chars)) {
            if (c && typeof c.order === 'number' && c.order > max) max = c.order;
        }
        return max + 1;
    }

    /**
     * 说话角色的 order 解析 —— 说话者自动提升到最上层，
     * 同时记录原始 order 以便恢复。
     *
     * @param {string} charId
     * @param {boolean} isSpeaking
     * @returns {number} 新的 order 值
     */
    _resolveSpeakingOrder(charId, isSpeaking) {
        const existing = this.state.stageCharacters[charId];
        if (!existing) return this._getNextOrder();

        if (isSpeaking) {
            // 首次说话时记录原始 order
            if (existing._originalOrder === undefined) {
                existing._originalOrder = existing.order;
            }
            // 说话角色提升到最高层（当前最大 order + 1）
            return this._getNextOrder();
        }
        // 恢复原始 order
        return existing._originalOrder ?? existing.order;
    }

    /**
     * 增强型角色变更处理器 —— 完整的 DSL 支持。
     *
     * 支持的 action 类型：
     *   enter / leave / update / move / speak / silence / speakAll
     *   action / effect / filter / resetFilter / scale / opacity
     *   swap / gather / scatter / order / clearAll / batch
     *
     * @param {Array|Object} changes - 单个变更或变更数组
     */
    _processCharacterChanges(changes) {
        if (!changes) return;

        // 允许单条变更（非数组）
        const list = Array.isArray(changes) ? changes : [changes];

        list.forEach(ch => {
            if (!ch || typeof ch !== 'object') return;
            try {
                this._applyCharacterChange(ch);
            } catch (e) {
                console.warn(`[GalEngine] 角色变更 "${ch.action}" 执行失败:`, e.message);
            }
        });
    }

    /**
     * 执行单条角色变更指令
     */
    _applyCharacterChange(ch) {
        switch (ch.action) {

            // ── 入场 ──
            case 'enter': {
                const existing = this.state.stageCharacters[ch.id];
                const url = this._resolveSpriteUrl(ch.id, ch.spriteId);

                // ★ 优化：角色已在舞台上 → 不做入场动画，只更新属性（静默过渡）
                // 避免章节切换或重复指令导致角色"闪入"
                if (existing && existing.visible !== false) {
                    const oldPos = existing.position;
                    const newPos = ch.position || 'center';
                    // 位置变了 → 用移动动画而非入场动画
                    const moveAnim = (oldPos !== newPos)
                        ? this._normalizeAnimation(ch.animation || 'slide-' + this._getDirection(newPos, oldPos))
                        : '';
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        spriteId: ch.spriteId || existing.spriteId,
                        url: url || existing.url,
                        position: newPos,
                        isSpeaking: ch.speak !== undefined ? !!ch.speak : existing.isSpeaking,
                        speechWeight: ch.speak ? (ch.weight ?? 1) : existing.speechWeight,
                        scale: ch.scale ?? existing.scale ?? 1,
                        opacity: ch.opacity ?? existing.opacity ?? 1,
                        visible: true,
                        animation: moveAnim,
                        groupId: ch.groupId ?? existing.groupId,
                        filters: ch.filters !== undefined ? { ...(existing.filters || {}), ...ch.filters } : existing.filters,
                        offsetX: ch.offsetX ?? existing.offsetX ?? 0,
                        offsetY: ch.offsetY ?? existing.offsetY ?? 0,
                        _leaving: false,
                        // 说话角色自动提升 z-order
                        order: this._resolveSpeakingOrder(ch.id, ch.speak !== undefined ? !!ch.speak : false),
                    });
                } else {
                    // ★ 真正的首次入场 → 播放入场动画
                    this.state.setStageCharacter(ch.id, {
                        id: ch.id,
                        spriteId: ch.spriteId || 'idle',
                        url,
                        position: ch.position || 'center',
                        order: ch.order ?? this._getNextOrder(),
                        isSpeaking: ch.speak !== undefined ? !!ch.speak : false,
                        speechWeight: ch.speak ? (ch.weight ?? 1) : 0,
                        scale: ch.scale ?? 1,
                        opacity: ch.opacity ?? 1,
                        visible: true,
                        animation: this._normalizeAnimation(ch.animation || 'fade-in'),
                        animationDuration: ch.duration ?? 0.6,
                        groupId: ch.groupId || null,
                        filters: ch.filters || undefined,
                        offsetX: ch.offsetX || 0,
                        offsetY: ch.offsetY || 0,
                        actionState: null,
                        _leaving: false,
                    });
                }

                // 入场音效事件（首次入场才触发）
                if (!existing && ch.sfx) {
                    this.emit('character:sfx', { id: ch.id, sfx: ch.sfx, type: 'enter' });
                }
                break;
            }

            // ── 退场 ──
            case 'leave': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    // 先设置退场动画，让 UI 播放动画后再删除
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        animation: this._normalizeAnimation(ch.animation || 'fade-out'),
                        visible: false,
                        _leaving: true,
                    });
                    const durationMs = (ch.duration ?? 0.5) * 1000;
                    const timer = setTimeout(() => {
                        this.state.removeStageCharacter(ch.id);
                        this.emit('characters:change', this.state.stageCharacters);
                        // 从定时器列表中移除
                        if (this._stageLeaveTimers) {
                            this._stageLeaveTimers = this._stageLeaveTimers.filter(t => t !== timer);
                        }
                    }, durationMs);
                    // 跟踪定时器以便章节切换时清理
                    if (!this._stageLeaveTimers) this._stageLeaveTimers = [];
                    this._stageLeaveTimers.push(timer);
                }
                break;
            }

            // ── 更新精灵/表情 ──
            case 'update': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    const url = ch.spriteId ? this._resolveSpriteUrl(ch.id, ch.spriteId) : existing.url;
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        spriteId: ch.spriteId || existing.spriteId,
                        url: url || existing.url,
                        // 只保留显式指定的 animation，避免用空字符串覆盖已有动画
                        animation: ch.animation
                            ? this._normalizeAnimation(ch.animation)
                            : existing.animation,
                    });
                }
                break;
            }

            // ── 移动位置 ──
            case 'move': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        position: ch.position || existing.position,
                        animation: this._normalizeAnimation(ch.animation || 'slide-' + this._getDirection(ch.position, existing.position)),
                        offsetX: ch.offsetX ?? existing.offsetX,
                        offsetY: ch.offsetY ?? existing.offsetY,
                    });
                }
                break;
            }

            // ── 说话状态 ──
            case 'speak': {
                this.state.setSpeaking(ch.id, true, ch.weight ?? 1);
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    const patch = { isSpeaking: true, speechWeight: ch.weight ?? 1 };
                    // ★ 说话角色自动提升到最上层
                    patch.order = this._resolveSpeakingOrder(ch.id, true);
                    if (ch.animation) patch.animation = this._normalizeAnimation(ch.animation);
                    this.state.setStageCharacter(ch.id, { ...existing, ...patch });
                }
                break;
            }

            // ── 沉默 ──
            case 'silence': {
                this.state.setSpeaking(ch.id, false, 0);
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    // ★ 停止说话后恢复普通 z-order
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        isSpeaking: false,
                        speechWeight: 0,
                        order: existing._originalOrder ?? existing.order,
                    });
                }
                break;
            }

            // ── 全员沉默 ──
            case 'silenceAll': {
                this.state.silenceAll();
                // 恢复所有角色的普通 z-order
                for (const [id, data] of Object.entries(this.state.stageCharacters)) {
                    if (data.isSpeaking === false && data._originalOrder !== undefined) {
                        this.state.setStageCharacter(id, { ...data, order: data._originalOrder });
                    }
                }
                break;
            }

            // ── 多角色同时说话 ──
            case 'speakAll': {
                if (!Array.isArray(ch.ids)) break;
                ch.ids.forEach((id, i) => {
                    const weight = (ch.weights && ch.weights[i]) ?? 1;
                    this.state.setSpeaking(id, true, weight);
                    const existing = this.state.stageCharacters[id];
                    if (existing) {
                        this.state.setStageCharacter(id, {
                            ...existing,
                            isSpeaking: true,
                            speechWeight: weight,
                            order: this._resolveSpeakingOrder(id, true),
                        });
                    }
                });
                break;
            }

            // ── 角色动作（动画） ──
            case 'action': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        actionState: ch.actionId || null,
                        animation: ch.actionId ? `action-${ch.actionId}` : '',
                    });
                    // 动作结束后自动清除状态
                    const dur = (ch.duration ?? 1.0) * 1000;
                    setTimeout(() => {
                        const cur = this.state.stageCharacters[ch.id];
                        if (cur && cur.actionState === (ch.actionId || null)) {
                            this.state.setStageCharacter(ch.id, { ...cur, actionState: null, animation: '' });
                            this.emit('characters:change', this.state.stageCharacters);
                        }
                    }, dur);
                }
                break;
            }

            // ── 视觉特效 ──
            case 'effect': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        animation: this._normalizeAnimation(ch.effect || 'shake'),
                    });
                    // 特效结束后清除动画状态
                    const dur = (ch.duration ?? 0.5) * 1000;
                    setTimeout(() => {
                        const cur = this.state.stageCharacters[ch.id];
                        if (cur && cur.animation === this._normalizeAnimation(ch.effect || 'shake')) {
                            this.state.setStageCharacter(ch.id, { ...cur, animation: '' });
                            this.emit('characters:change', this.state.stageCharacters);
                        }
                    }, dur);
                }
                break;
            }

            // ── 颜色滤镜（亮度、饱和度、对比度） ──
            case 'filter': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    const base = existing.filters || { brightness: 1, saturation: 1, contrast: 1 };
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        filters: { ...base, ...ch.filters },
                    });
                }
                break;
            }

            // ── 重置滤镜 ──
            case 'resetFilter': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        filters: undefined,
                    });
                }
                break;
            }

            // ── 缩放 ──
            case 'scale': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        scale: ch.scale ?? 1,
                        animation: this._normalizeAnimation(ch.animation || ''),
                    });
                }
                break;
            }

            // ── 透明度 ──
            case 'opacity': {
                const existing = this.state.stageCharacters[ch.id];
                if (existing) {
                    this.state.setStageCharacter(ch.id, {
                        ...existing,
                        opacity: ch.opacity ?? 1,
                        animation: this._normalizeAnimation(ch.animation || ''),
                    });
                }
                break;
            }

            // ── 位置交换 ──
            case 'swap': {
                this.state.swapStageCharacters(ch.id1, ch.id2);
                // 两个角色都获得交换动画
                if (ch.id1) {
                    const c1 = this.state.stageCharacters[ch.id1];
                    if (c1) this.state.setStageCharacter(ch.id1, { ...c1, animation: 'swap' });
                }
                if (ch.id2) {
                    const c2 = this.state.stageCharacters[ch.id2];
                    if (c2) this.state.setStageCharacter(ch.id2, { ...c2, animation: 'swap' });
                }
                break;
            }

            // ── 聚集（多个角色聚集到同一位置区域） ──
            case 'gather': {
                if (!Array.isArray(ch.ids)) break;
                const basePos = ch.position || 'center';
                const spread = ch.spread ?? 0.15;
                const total = ch.ids.length;
                ch.ids.forEach((id, i) => {
                    const offset = (i - (total - 1) / 2) * spread;
                    const existing = this.state.stageCharacters[id];
                    if (existing) {
                        this.state.setStageCharacter(id, {
                            ...existing,
                            position: basePos,
                            offsetX: offset * 100, // 转换为百分比偏移
                            animation: this._normalizeAnimation(ch.animation || 'slide-in-up'),
                        });
                    } else {
                        // 角色不在舞台上则自动入场
                        const url = this._resolveSpriteUrl(id, ch.spriteId || 'idle');
                        this.state.setStageCharacter(id, {
                            id,
                            spriteId: ch.spriteId || 'idle',
                            url,
                            position: basePos,
                            order: i,
                            offsetX: offset * 100,
                            animation: this._normalizeAnimation(ch.animation || 'slide-in-up'),
                            scale: ch.scale ?? 1,
                            opacity: ch.opacity ?? 1,
                            visible: true,
                        });
                    }
                });
                break;
            }

            // ── 散开（将聚集的角色分散到预设位置） ──
            case 'scatter': {
                if (!Array.isArray(ch.ids)) break;
                const presets = GalEngine.POSITIONS;
                const startIdx = Math.floor((presets.length - ch.ids.length) / 2);
                ch.ids.forEach((id, i) => {
                    const existing = this.state.stageCharacters[id];
                    if (existing) {
                        const pos = presets[startIdx + i] || presets[presets.length - 1];
                        this.state.setStageCharacter(id, {
                            ...existing,
                            position: pos,
                            offsetX: 0,
                            offsetY: 0,
                            animation: this._normalizeAnimation(ch.animation || 'slide-out-right'),
                        });
                    }
                });
                break;
            }

            // ── Z 轴顺序 ──
            case 'order': {
                if (!Array.isArray(ch.ids)) break;
                ch.ids.forEach((id, i) => {
                    const existing = this.state.stageCharacters[id];
                    if (existing) {
                        this.state.setStageCharacter(id, { ...existing, order: i });
                    }
                });
                break;
            }

            // ── 清空舞台 ──
            case 'clearAll': {
                const anim = this._normalizeAnimation(ch.animation || 'fade-out');
                const ids = Object.keys(this.state.stageCharacters);
                if (ids.length === 0) break;

                ids.forEach(id => {
                    const existing = this.state.stageCharacters[id];
                    if (existing) {
                        this.state.setStageCharacter(id, {
                            ...existing,
                            animation: anim,
                            visible: false,
                            _leaving: true,
                        });
                    }
                });

                // 延迟删除
                const durationMs = (ch.duration ?? 0.5) * 1000;
                const timer = setTimeout(() => {
                    this.state.clearStageCharacters();
                    this.emit('characters:change', this.state.stageCharacters);
                    if (this._stageLeaveTimers) {
                        this._stageLeaveTimers = this._stageLeaveTimers.filter(t => t !== timer);
                    }
                }, durationMs);
                if (!this._stageLeaveTimers) this._stageLeaveTimers = [];
                this._stageLeaveTimers.push(timer);
                break;
            }

            // ── 批量执行（嵌套子变更） ──
            case 'batch': {
                if (Array.isArray(ch.changes)) {
                    this._processCharacterChanges(ch.changes);
                }
                break;
            }

            default:
                console.warn(`[GalEngine] 未知的角色变更 action: ${ch.action}`);
        }
    }

    /**
     * 计算两点之间的移动方向（用于 move animation 自动推导）
     */
    _getDirection(to, from) {
        if (!to || !from) return 'fade';
        const order = ['left-far', 'left', 'center-left', 'center', 'center-right', 'right', 'right-far'];
        const toIdx = order.indexOf(to);
        const fromIdx = order.indexOf(from);
        if (toIdx === -1 || fromIdx === -1) return 'fade';
        return toIdx > fromIdx ? 'right' : 'left';
    }

    // ====================================================================
    //  结局系统
    // ====================================================================

    _triggerEnding(ending) {
        const ed = this.endings.find(e => e.id === ending.id) || ending;
        this.state.setPendingEnding(null);
        this.emit('ending:trigger', ed);
    }

    _autoMatchEnding() {
        this._triggerEnding({
            id: '__to_be_continued__',
            title: '— 未完待续 —',
            description: '故事尚未结束，但这趟旅程已在此告一段落。\n新的篇章将在不久后展开。\n\n感谢你一路陪伴。'
        });
    }

    // ====================================================================
    //  章节切换时的舞台清理
    // ====================================================================

    /**
     * 章节切换时清理舞台角色：
     *  - 清除所有 _leaving 定时器残留
     *  - 立即清空 stageCharacters（无动画）
     *  - 新章节由各自的 characterChanges 重新建场
     */
    _clearStageForChapterChange() {
        // 终止所有 _leaving 延迟操作
        if (this._stageLeaveTimers) {
            this._stageLeaveTimers.forEach(t => clearTimeout(t));
            this._stageLeaveTimers = [];
        }
        this.state.clearStageCharacters();
        this.emit('characters:change', {});
    }

    // ====================================================================
    //  辅助方法
    // ====================================================================

    _getSpeakerId() {
        const step = this.currentStep;
        return step ? step.characterId || null : null;
    }

    _getSpeakerName() {
        const id = this._getSpeakerId();
        return id && this.characters[id] ? this.characters[id].name : '';
    }

    _getSpeakerColor() {
        const id = this._getSpeakerId();
        return id && this.characters[id] ? this.characters[id].color : '#fff';
    }

    _clearTypingTimer() {
        if (this._typingTimer) {
            if (typeof this._typingTimer === 'number') {
                cancelAnimationFrame(this._typingTimer);
            } else {
                clearInterval(this._typingTimer);
            }
        }
        this._typingTimer = null;
    }

    _clearTimers() {
        this._clearTypingTimer();
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;
        // 清理文本批次（确保状态切换时批次不会残留）
        this._textBatch = null;
        this._textBatchIndex = 0;
    }

    // ====================================================================
    //  文本批处理（降低 _executeStep 调用频率）
    // ====================================================================

    /**
     * 收集连续的同角色纯叙述步骤，合并为文本批次。
     * 仅合并无游戏态副作用的 dialogue 步骤（无 items / flag / cg / characterChanges）。
     * 返回 string[] 或 null（单条时不合并）。
     */
    _collectDialogueBatch() {
        const steps = this.chapters[this.state.currentChapterId];
        if (!steps) return null;
        const startIdx = this.state.currentStepIndex;
        const first = steps[startIdx];
        if (!first || first.type !== 'dialogue' || first.texts) return null;

        const speakerId = first.characterId || '__narrator__';
        const collected = [first.text || ''];

        for (let i = startIdx + 1; i < steps.length; i++) {
            const s = steps[i];
            if (s.type !== 'dialogue') break;
            if ((s.characterId || '__narrator__') !== speakerId) break;
            // 有游戏态副作用 → 不可合并
            if (s.gainItem || s.loseItem || s.updateItem || s.flag ||
                s.cgChanges || s.characterChanges) break;
            collected.push(s.text || '');
        }

        return collected.length > 1 ? collected : null;
    }

    /**
     * 解析当前批次的打字速度（取当前 step 的配置）
     */
    _resolveBatchSpeed() {
        const step = this.currentStep;
        if (!step) return this.config.textSpeed;
        let speed = this.config.textSpeed;
        if (step.characterId && this.characters[step.characterId]?.defaultSpeed !== undefined) {
            speed = this.characters[step.characterId].defaultSpeed;
        }
        if (step.speed !== undefined) speed = step.speed;
        return speed;
    }

    /**
     * 销毁引擎，清理所有资源
     */
    destroy() {
        this._clearTimers();
        this._textBatch = null;
        this._textBatchIndex = 0;
        this.clear();
    }
}

export default GalEngine;

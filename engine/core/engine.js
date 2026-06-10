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

    _processCharacterChanges(changes) {
        if (!Array.isArray(changes)) {
            console.warn('[GalEngine] characterChanges 不是数组，已跳过');
            return;
        }
        changes.forEach(ch => {
            if (!ch || typeof ch !== 'object') return;
            if (ch.action === 'enter' || ch.action === 'update') {
                const url = this._resolveSpriteUrl(ch.id, ch.spriteId);
                this.state.setStageCharacter(ch.id, {
                    id: ch.id,
                    spriteId: ch.spriteId || 'idle',
                    url,
                    animation: ch.animation || ''
                });
            } else if (ch.action === 'leave') {
                this.state.removeStageCharacter(ch.id);
            }
        });
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

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
     * @returns {string} 操作结果: 'typing' | 'advance' | 'choice' | 'ending' | 'end'
     */
    advance() {
        // 正在打字 → 强制完成
        if (!this.state.typingFinished) {
            this._finishTyping();
            return 'typing';
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

        // 章节跳转（支持 _end_<endingId> 直接跳转到结局）
        if (step.jumpChapter) {
            if (step.jumpChapter.startsWith('_end_')) {
                const endingId = step.jumpChapter.slice(5);
                const endingObj = this.endings.find(e => e.id === endingId);
                this._triggerEnding(endingObj || { id: endingId, title: endingId, description: '' });
                return 'ending';
            }
            this.state.truncateHistoryLogs(this.state.historyLogs.length - 1);
            this.state.setChapter(step.jumpChapter, 0);
            this.state.setLastSpeaker(null);
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
            this.state.setChapter(choice.jumpChapter, 0);
            this.state.setLastSpeaker(null);
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
        if (step.type === 'jump') {
            this.emit('step:jump', { from: this.state.currentChapterId, to: step.jumpChapter });
            if (step.jumpChapter) {
                this.state.truncateHistoryLogs(this.state.historyLogs.length - 1);
                this.state.setChapter(step.jumpChapter, 0);
                this.state.setLastSpeaker(null);
            } else {
                this.state.advanceStep();
            }
            this._executeStep();
            return;
        }

        // ---- 结局 ----
        if (step.type === 'ending') {
            const endingObj = this.endings.find(e => e.id === step.endingId);
            if (endingObj) {
                this.state.setPendingEnding(endingObj);
                this.emit('step:ending-pending', endingObj);
                // 生成伪对话步骤展示结局描述
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

        // ---- 对话 ----
        if (step.type === 'dialogue') {
            let speed = this.config.textSpeed;
            if (step.characterId && this.characters[step.characterId]?.defaultSpeed !== undefined) {
                speed = this.characters[step.characterId].defaultSpeed;
            }
            if (step.speed !== undefined) speed = step.speed;

            this._startTypewriter(step.text, speed);

            // 历史记录
            const logMeta = {
                chapterId: this.state.currentChapterId,
                stepIndex: this.state.currentStepIndex,
                speaker: this._getSpeakerName(),
                color: this._getSpeakerColor(),
                text: step.text,
                snap: this.state.snapshot()
            };

            const isExist = this.state.historyLogs.some(
                l => l.chapterId === logMeta.chapterId && l.stepIndex === logMeta.stepIndex
            );
            if (!isExist) {
                this.state.pushHistoryLog(logMeta);
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
        this._typingTimer = setInterval(() => {
            if (index < text.length) {
                const currentText = text.substring(0, index + 1);
                this.state.setTypedText(currentText);
                index++;
                this.emit('typewriter:tick', { char: text[index - 1], index: index - 1, finished: false, text: currentText });
                if (this._hooks.onTypewriterTick) {
                    this._hooks.onTypewriterTick(text[index - 1], index - 1);
                }
            } else {
                this._finishTyping();
                // 自动推进
                if (!this.state.pendingEnding && this.currentStep?.autoAdvance) {
                    const delay = this.currentStep.autoDelay || 1500;
                    this._autoAdvanceTimer = setTimeout(() => this.advance(), delay);
                }
            }
        }, speed);
    }

    _finishTyping() {
        this._clearTypingTimer();
        const step = this.currentStep;
        if (step && step.text) {
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

        this.emit('rollback', { logIndex, targetLog });
        this._executeStep();
        return true;
    }

    // ====================================================================
    //  存档 / 读档
    // ====================================================================

    save(slotId, meta = {}) {
        const snap = this.state.snapshot();
        const sceneCfg = this.scenes[this.currentStep?.sceneId];

        const slotData = {
            ...snap,
            ...meta,
            bgPlaceholder: sceneCfg?.bgPlaceholder || '#111',
            sceneUrl: sceneCfg?.url || null,
        };

        return this.saveManager.save(slotId, slotData);
    }

    load(slotId) {
        const data = this.saveManager.load(slotId);
        if (!data) return false;

        this._clearTimers();
        this.state.restore(data);
        this.emit('game:load', data);
        this._executeStep();
        return true;
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
        if (cg.action === 'enter') {
            const asset = this.cgLibrary[cg.id];
            const cgData = {
                id: cg.id,
                url: asset ? asset.url : '',
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

    _processCharacterChanges(changes) {
        changes.forEach(ch => {
            if (ch.action === 'enter' || ch.action === 'update') {
                const charCfg = this.characters[ch.id];
                this.state.setStageCharacter(ch.id, {
                    id: ch.id,
                    spriteId: ch.spriteId,
                    url: charCfg?.sprites[ch.spriteId]?.url || '',
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
        clearInterval(this._typingTimer);
        this._typingTimer = null;
    }

    _clearTimers() {
        this._clearTypingTimer();
        clearTimeout(this._autoAdvanceTimer);
        this._autoAdvanceTimer = null;
    }

    /**
     * 销毁引擎，清理所有资源
     */
    destroy() {
        this._clearTimers();
        this.clear();
    }
}

export default GalEngine;

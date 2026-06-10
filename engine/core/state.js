/**
 * engine/core/state.js
 *
 * GameState —— 游戏运行时状态的不可变快照容器。
 *
 * 职责：
 *  - 持有当前运行时状态
 *  - 提供 snapshot() 用于存档序列化
 *  - 提供 restore(snap) 用于读档恢复
 *  - 保证所有状态变更可追踪
 */
export class GameState {
    constructor(initial = {}) {
        this._state = {
            currentChapterId: initial.currentChapterId || 'main',
            currentStepIndex: initial.currentStepIndex ?? 0,
            gameState: initial.gameState || { money: 100, inventory: [], flags: {} },
            stageCharacters: initial.stageCharacters || {},
            historyLogs: initial.historyLogs || [],
            lastSpeakerId: initial.lastSpeakerId || null,
            activeCG: initial.activeCG || null,
            activeEffects: initial.activeEffects || [],
            currentScreenEffect: initial.currentScreenEffect || '',
            pendingEnding: initial.pendingEnding || null,
            typedText: initial.typedText || '',
            typingFinished: initial.typingFinished ?? true,
        };
    }

    // ---- 读取 ----

    get currentChapterId()   { return this._state.currentChapterId; }
    get currentStepIndex()   { return this._state.currentStepIndex; }
    get gameState()          { return this._state.gameState; }
    get stageCharacters()    { return this._state.stageCharacters; }
    get historyLogs()        { return this._state.historyLogs; }
    get lastSpeakerId()      { return this._state.lastSpeakerId; }
    get activeCG()           { return this._state.activeCG; }
    get activeEffects()      { return this._state.activeEffects; }
    get currentScreenEffect(){ return this._state.currentScreenEffect; }
    get pendingEnding()      { return this._state.pendingEnding; }
    get typedText()          { return this._state.typedText; }
    get typingFinished()     { return this._state.typingFinished; }

    // ---- 写入（由 Engine 调用） ----

    setChapter(id, stepIndex = 0) {
        this._state.currentChapterId = id;
        this._state.currentStepIndex = stepIndex;
    }

    setStepIndex(index) {
        this._state.currentStepIndex = index;
    }

    advanceStep() {
        this._state.currentStepIndex++;
    }

    setGameStateField(key, value) {
        this._state.gameState[key] = value;
    }

    addItem(itemId) {
        if (!this._state.gameState.inventory.includes(itemId)) {
            this._state.gameState.inventory.push(itemId);
        }
    }

    removeItem(itemId) {
        const idx = this._state.gameState.inventory.indexOf(itemId);
        if (idx > -1) this._state.gameState.inventory.splice(idx, 1);
    }

    setFlag(flag) {
        this._state.gameState.flags[flag] = true;
    }

    setStageCharacter(charId, data) {
        this._state.stageCharacters[charId] = data;
    }

    removeStageCharacter(charId) {
        delete this._state.stageCharacters[charId];
    }

    pushHistoryLog(log) {
        this._state.historyLogs.push(log);
    }

    truncateHistoryLogs(index) {
        this._state.historyLogs = this._state.historyLogs.slice(0, index + 1);
    }

    setLastSpeaker(id) {
        this._state.lastSpeakerId = id;
    }

    setActiveCG(cg) {
        this._state.activeCG = cg;
    }

    setActiveEffects(effects) {
        this._state.activeEffects = effects;
    }

    setScreenEffect(effect) {
        this._state.currentScreenEffect = effect;
    }

    setPendingEnding(ending) {
        this._state.pendingEnding = ending;
    }

    setTypedText(text) {
        this._state.typedText = text;
    }

    setTypingFinished(finished) {
        this._state.typingFinished = finished;
    }

    // ---- 快照 / 恢复（存档系统核心） ----

    /**
     * 返回当前完整状态的深拷贝，用于存档
     */
    snapshot() {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * 从快照恢复状态
     */
    restore(snap) {
        this._state = JSON.parse(JSON.stringify(snap));
    }

    /**
     * 重置为默认初始状态
     */
    reset(initial = {}) {
        this._state = {
            currentChapterId: initial.currentChapterId || 'main',
            currentStepIndex: initial.currentStepIndex ?? 0,
            gameState: initial.gameState || { money: 100, inventory: [], flags: {} },
            stageCharacters: initial.stageCharacters || {},
            historyLogs: initial.historyLogs || [],
            lastSpeakerId: initial.lastSpeakerId || null,
            activeCG: initial.activeCG || null,
            activeEffects: initial.activeEffects || [],
            currentScreenEffect: initial.currentScreenEffect || '',
            pendingEnding: initial.pendingEnding || null,
            typedText: initial.typedText || '',
            typingFinished: initial.typingFinished ?? true,
        };
    }
}

export default GameState;

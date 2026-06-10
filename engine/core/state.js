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
 *
 * 安全设计：
 *  - snapshot() 在深拷贝前会剥离 historyLogs 中递归嵌套的 snap 字段，
 *    避免 O(2^N) 指数级数据膨胀导致 RangeError: Invalid string length。
 *  - 所有字符串字段超过 1MB 时会被截断，防止巨型 data: URI 等异常数据撑爆 JSON。
 *  - 序列化失败时有兜底 fallback，确保 save() 不会崩溃。
 */

/** 单字段最大字符串长度（1MB），防止异常巨型字符串撑爆 JSON.stringify */
const MAX_FIELD_STRING_LENGTH = 1024 * 1024;

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
     * 安全深拷贝：比 JSON.parse(JSON.stringify()) 更健壮，
     * 遇到不可序列化的值时直接抛错终止。
     *
     * @param {*} obj
     * @returns {*} 深拷贝副本
     */
    _safeDeepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * 剥离 historyLogs 中递归嵌套的 snap 字段，阻断指数级数据膨胀。
     * 同时截断过长的字符串字段（> 1MB）。
     *
     * 设计要点：
     *  - 先手动剥离嵌套 snap 字段，再调用 JSON.parse(JSON.stringify())
     *    做标准深拷贝，避免大递归结构在序列化阶段就撑爆字符串长度。
     *  - 所有截断/清理逻辑在浅层副本上完成后再深拷贝。
     *
     * @param {Object} state - 原始 _state
     * @returns {Object} 剥离后的安全副本（可安全 JSON.stringify）
     */
    _sanitizeStateForSerialize(state) {
        if (!state || typeof state !== 'object') {
            return this._buildSafeFallback(state);
        }

        // ── 分步剥离逻辑 ──
        // 第一步：在浅层手动构建可安全深拷贝的中间对象
        // 关键：手动浅拷贝 + 剥离 snap 字段，避免 JSON.stringify 遇到大递归

        let safeIntermediate;
        try {
            safeIntermediate = {
                currentChapterId:      state.currentChapterId,
                currentStepIndex:      state.currentStepIndex,
                gameState:             state.gameState,             // 浅引用，JSON.stringify 内部展开
                stageCharacters:       state.stageCharacters,
                lastSpeakerId:         state.lastSpeakerId,
                activeCG:              state.activeCG,
                activeEffects:         state.activeEffects,
                currentScreenEffect:   state.currentScreenEffect,
                pendingEnding:         state.pendingEnding,
                typedText:             state.typedText,
                typingFinished:        state.typingFinished,
                // historyLogs 单独处理：剥离 snap
                historyLogs:           this._stripHistorySnaps(state.historyLogs),
            };
        } catch (e) {
            console.error('[GameState] 构建安全中间对象失败:', e.message);
            return this._buildSafeFallback(state);
        }

        // 第二步：深拷贝（此时已无深层递归 snap，不会爆串）
        let clone;
        try {
            clone = this._safeDeepClone(safeIntermediate);
        } catch (e) {
            console.error('[GameState] 深拷贝失败，使用手动安全构建:', e.message);
            return this._buildSafeFallback(state);
        }

        // 第三步：深拷贝后对字符串字段做长度限制
        clone = this._truncateLongFields(clone);

        return clone;
    }

    /**
     * 剥离 historyLogs 中的 snap 字段（浅层操作，不触发深序列化）。
     * 阻断递归嵌套的关键步骤。
     */
    _stripHistorySnaps(historyLogs) {
        if (!Array.isArray(historyLogs)) return [];
        const MAX_HISTORY = 30;
        const sliced = historyLogs.length > MAX_HISTORY ? historyLogs.slice(-MAX_HISTORY) : historyLogs;
        return sliced.map(entry => {
            if (!entry || typeof entry !== 'object') return entry;
            const cleaned = { ...entry };
            // 剥离 snap（阻断递归）
            delete cleaned.snap;
            // 剥离 textsFull（大文本，单个字段 > 1MB 时截断）
            if (Array.isArray(cleaned.textsFull)) {
                const totalLen = cleaned.textsFull.reduce((sum, t) => sum + (typeof t === 'string' ? t.length : 0), 0);
                if (totalLen > MAX_FIELD_STRING_LENGTH) {
                    cleaned.textsFull = ['[文本过长，已截断]'];
                }
            }
            return cleaned;
        });
    }

    /**
     * 深拷贝后截断过长的字符串字段
     */
    _truncateLongFields(clone) {
        if (!clone || typeof clone !== 'object') return clone;

        // typedText
        if (typeof clone.typedText === 'string' && clone.typedText.length > MAX_FIELD_STRING_LENGTH) {
            clone.typedText = clone.typedText.substring(0, MAX_FIELD_STRING_LENGTH);
        }

        // screenEffect
        if (typeof clone.currentScreenEffect === 'string' && clone.currentScreenEffect.length > MAX_FIELD_STRING_LENGTH) {
            clone.currentScreenEffect = '';
        }

        // stageCharacters URLs
        if (clone.stageCharacters && typeof clone.stageCharacters === 'object') {
            for (const [charId, charData] of Object.entries(clone.stageCharacters)) {
                if (charData && typeof charData === 'object') {
                    if (typeof charData.url === 'string' && charData.url.length > MAX_FIELD_STRING_LENGTH) {
                        clone.stageCharacters[charId] = { ...charData, url: '' };
                    }
                }
            }
        }

        // activeCG URL
        if (clone.activeCG && typeof clone.activeCG === 'object') {
            if (typeof clone.activeCG.url === 'string' && clone.activeCG.url.length > MAX_FIELD_STRING_LENGTH) {
                clone.activeCG = { ...clone.activeCG, url: '' };
            }
        }

        return clone;
    }

    /**
     * 手动构建最小安全副本 —— 当标准深拷贝失败时的兜底方案
     */
    _buildSafeFallback(state) {
        return {
            currentChapterId:      typeof state?.currentChapterId === 'string' ? state.currentChapterId.substring(0, 256) : 'main',
            currentStepIndex:      typeof state?.currentStepIndex === 'number' ? state.currentStepIndex : 0,
            gameState: {
                money:     typeof state?.gameState?.money === 'number' ? state.gameState.money : 0,
                inventory: Array.isArray(state?.gameState?.inventory) ? [...state.gameState.inventory] : [],
                flags:     state?.gameState?.flags ? { ...state.gameState.flags } : {},
            },
            stageCharacters:       {},
            historyLogs:           [],
            lastSpeakerId:         typeof state?.lastSpeakerId === 'string' ? state.lastSpeakerId.substring(0, 128) : null,
            activeCG:              null,
            activeEffects:         Array.isArray(state?.activeEffects) ? [...state.activeEffects] : [],
            currentScreenEffect:   '',
            pendingEnding:         null,
            typedText:             '',
            typingFinished:        true,
        };
    }

    /**
     * 返回当前完整状态的深拷贝，用于存档。
     * 自动剥离 historyLogs 中的递归 snap 字段，防止 RangeError。
     *
     * @returns {Object} 安全的快照副本
     */
    snapshot() {
        try {
            const sanitized = this._sanitizeStateForSerialize(this._state);
            return sanitized;
        } catch (e) {
            console.error('[GameState] snapshot 序列化失败，使用最小兜底:', e.message);
            return this._buildSafeFallback(this._state);
        }
    }

    /**
     * 从快照恢复状态。
     */
    restore(snap) {
        try {
            if (!snap || typeof snap !== 'object') {
                console.warn('[GameState] restore 收到无效 snap，忽略');
                return;
            }
            this._state = this._safeDeepClone(snap);
        } catch (e) {
            console.error('[GameState] restore 深拷贝失败，部分恢复:', e.message);
            // 逐字段安全地恢复
            if (snap.currentChapterId !== undefined) this._state.currentChapterId = String(snap.currentChapterId).substring(0, 256);
            if (snap.currentStepIndex !== undefined) this._state.currentStepIndex = Number(snap.currentStepIndex) || 0;
            if (snap.gameState) {
                if (snap.gameState.money !== undefined) this._state.gameState.money = Number(snap.gameState.money) || 0;
                if (Array.isArray(snap.gameState.inventory)) this._state.gameState.inventory = [...snap.gameState.inventory];
                if (snap.gameState.flags && typeof snap.gameState.flags === 'object') {
                    this._state.gameState.flags = { ...snap.gameState.flags };
                }
            }
            if (Array.isArray(snap.historyLogs)) {
                this._state.historyLogs = snap.historyLogs
                    .slice(-50)
                    .map(e => (typeof e === 'object' && e !== null) ? { ...e, snap: undefined } : e);
            }
        }
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

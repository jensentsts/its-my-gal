/**
 * use-keybindings.js
 *
 * 通用按键绑定系统 —— 管理动作↔按键映射，支持自定义重绑定与持久化。
 *
 * 设计：
 *   每个动作形如 "context.action-name"，通过 focusContext 计算属性按上下文派发。
 *   默认绑定继承已有键盘操作逻辑，同时覆盖新增 UI 面板（角色名录、画廊、存档槽位等）。
 *   自定义绑定通过 localStorage 持久化，运行时与默认绑定合并。
 */

const STORAGE_KEY = 'gal_keybindings_v2';

// ── 上下文分组标签（用于设置界面） ──
const GROUP_LABELS = {
    global:      '全局快捷键',
    menu:        '主菜单',
    settings:    '设置面板',
    'info-panel':'关于面板',
    'menu-panel':'子面板（角色名录 / 画廊 / 存档）',
    dialog:      '对话框',
    ending:      '结局画面',
    lightbox:    '灯箱查看',
    'game-panel':'游戏内面板',
    game:        '游戏主视图',
    game:        '游戏主视图',
    choice:      '分支选项',
    'item-toast':'物品提示',
    inventory:   '背包',
    'game-panel':'游戏内面板',
    lightbox:    '灯箱查看',
    dialog:      '对话框',
    ending:      '结局画面',
};

// ── 默认按键绑定表 ──
// 每个条目：{ key, ctrl?, alt?, shift?, label, context, onlyIn? }
//   context:  匹配 focusContext 返回值；'global' 表示全局（always active）
//   onlyIn:   可选的上下文白名单（仅在这些上下文中触发）
const DEFAULT_BINDINGS = {
    // ════════ 全局（Ctrl 快捷键） ════════
    'global.quick-save':  { key: 's', ctrl: true,  label: '快速存档',   context: 'global' },
    'global.quick-load':  { key: 'o', ctrl: true,  label: '快速读档',   context: 'global' },
    'global.new-game':    { key: 'n', ctrl: true,  label: '新游戏',     context: 'global', onlyIn: ['menu'] },

    // ════════ 主菜单 ════════
    'menu.navigate-up':     { key: 'ArrowUp',   label: '导航上移',         context: 'menu' },
    'menu.navigate-down':   { key: 'ArrowDown', label: '导航下移',         context: 'menu' },
    'menu.activate':        { key: 'Enter',     label: '确认',             context: 'menu' },
    'menu.activate-alt':    { key: ' ',         label: '确认（空格）',     context: 'menu' },
    'menu.open-info':       { key: 'i',         label: '关于面板',         context: 'menu' },
    'menu.open-settings':   { key: 'o',         label: '打开设置',         context: 'menu' },

    // ════════ 设置面板 ════════
    'settings.close':       { key: 'Escape',    label: '关闭设置',         context: 'settings' },
    'settings.navigate-up':   { key: 'ArrowUp',   label: '设置上移',       context: 'settings' },
    'settings.navigate-down': { key: 'ArrowDown', label: '设置下移',       context: 'settings' },
    'settings.navigate-left': { key: 'ArrowLeft', label: '设置左移',       context: 'settings' },
    'settings.navigate-right':{ key: 'ArrowRight',label: '设置右移',       context: 'settings' },
    'settings.activate':      { key: 'Enter',     label: '激活设置项',     context: 'settings' },
    'settings.activate-alt':  { key: ' ',         label: '激活设置项（空格）', context: 'settings' },

    // ════════ 关于面板 ════════
    'info-panel.close':     { key: 'Escape',    label: '关闭关于',         context: 'info-panel' },
    'info-panel.activate':  { key: 'Enter',     label: '确认',             context: 'info-panel' },
    'info-panel.activate-alt': { key: ' ',      label: '确认（空格）',     context: 'info-panel' },

    // ════════ 菜单子面板（角色名录 / 画廊 / 存档） ════════
    'menu-panel.close':        { key: 'Escape',    label: '关闭面板',      context: 'menu-panel' },
    'menu-panel.navigate-up':  { key: 'ArrowUp',   label: '上移',          context: 'menu-panel' },
    'menu-panel.navigate-down':{ key: 'ArrowDown', label: '下移',          context: 'menu-panel' },
    'menu-panel.navigate-left':{ key: 'ArrowLeft', label: '左移',          context: 'menu-panel' },
    'menu-panel.navigate-right':{key: 'ArrowRight',label: '右移',          context: 'menu-panel' },
    'menu-panel.activate':     { key: 'Enter',     label: '确认',          context: 'menu-panel' },
    'menu-panel.activate-alt': { key: ' ',         label: '确认（空格）',  context: 'menu-panel' },

    // ════════ 游戏主视图 ════════
    'game.advance':          { key: ' ',         label: '推进剧情',        context: 'game' },
    'game.exit-hold':        { key: 'Escape',    label: '退出暂存（长按）',context: 'game' },
    'game.toggle-log':       { key: 'l',         label: '历史记录',        context: 'game' },
    'game.open-inventory':   { key: 'b',         label: '打开背包',        context: 'game' },
    'game.open-save-panel':  { key: 's',         label: '打开存档面板',    context: 'game' },
    'game.open-load-panel':  { key: 'd',         label: '打开读档面板',    context: 'game' },

    // ════════ 分支选项 ════════
    'choice.navigate-up':    { key: 'ArrowUp',   label: '选项上移',        context: 'choice' },
    'choice.navigate-down':  { key: 'ArrowDown', label: '选项下移',        context: 'choice' },
    'choice.confirm':        { key: 'Enter',     label: '确认选项',        context: 'choice' },
    'choice.confirm-alt':    { key: ' ',         label: '确认选项（空格）',context: 'choice' },

    // ════════ 物品提示 ════════
    'item-toast.dismiss':    { key: 'Escape',    label: '关闭',            context: 'item-toast' },
    'item-toast.dismiss-alt':{ key: ' ',         label: '关闭（空格）',    context: 'item-toast' },

    // ════════ 背包 ════════
    'inventory.close':       { key: 'Escape',    label: '关闭背包',        context: 'inventory' },
    'inventory.navigate-up':   { key: 'ArrowUp',   label: '物品上移',      context: 'inventory' },
    'inventory.navigate-down': { key: 'ArrowDown', label: '物品下移',      context: 'inventory' },
    'inventory.activate':      { key: 'Enter',     label: '查看物品',      context: 'inventory' },

    // ════════ 游戏内面板（存档/读档） ════════
    'game-panel.close':        { key: 'Escape',    label: '关闭面板',      context: 'game-panel' },
    'game-panel.navigate-up':  { key: 'ArrowUp',   label: '上移',          context: 'game-panel' },
    'game-panel.navigate-down':{ key: 'ArrowDown', label: '下移',          context: 'game-panel' },
    'game-panel.navigate-left':{ key: 'ArrowLeft', label: '左移',          context: 'game-panel' },
    'game-panel.navigate-right':{key: 'ArrowRight',label: '右移',          context: 'game-panel' },
    'game-panel.activate':     { key: 'Enter',     label: '确认',          context: 'game-panel' },

    // ════════ 灯箱 ════════
    'lightbox.close':        { key: 'Escape',    label: '关闭灯箱',        context: 'lightbox' },

    // ════════ 对话框 ════════
    'dialog.cancel':         { key: 'Escape',    label: '取消',            context: 'dialog' },
    'dialog.navigate-left':  { key: 'ArrowLeft', label: '左移焦点',        context: 'dialog' },
    'dialog.navigate-right': { key: 'ArrowRight',label: '右移焦点',        context: 'dialog' },
    'dialog.activate':       { key: 'Enter',     label: '确认选择',        context: 'dialog' },
    'dialog.activate-alt':   { key: ' ',         label: '确认选择（空格）',context: 'dialog' },

    // ════════ 结局画面 ════════
    'ending.return':         { key: 'Enter',     label: '返回主菜单',      context: 'ending' },
    'ending.return-alt':     { key: ' ',         label: '返回主菜单（空格）',context: 'ending' },
};

export function useKeybindings() {
    // ── 响应式状态 ──
    const customBindings = Vue.ref({});
    const isCapturing = Vue.ref(false);
    let captureResolve = null;
    let _loaded = false;

    // ── 当前生效的绑定（默认 + 自定义覆盖） ──
    const bindings = Vue.computed(() => ({
        ...DEFAULT_BINDINGS,
        ...customBindings.value,
    }));

    // ── 从 localStorage 加载自定义绑定 ──
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                customBindings.value = JSON.parse(raw);
            }
            _loaded = true;
        } catch (e) {
            console.warn('[Keybindings] 加载自定义绑定失败:', e);
        }
    }

    // ── 持久化自定义绑定 ──
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings.value));
        } catch (e) {
            console.warn('[Keybindings] 保存自定义绑定失败:', e);
        }
    }

    // ── 设置某个动作的自定义按键 ──
    function setBinding(actionId, keyDef) {
        customBindings.value = {
            ...customBindings.value,
            [actionId]: { ...keyDef, label: DEFAULT_BINDINGS[actionId]?.label || actionId },
        };
        save();
    }

    // ── 移除自定义绑定（恢复默认） ──
    function removeBinding(actionId) {
        const next = { ...customBindings.value };
        delete next[actionId];
        customBindings.value = next;
        save();
    }

    // ── 全部恢复默认 ──
    function resetToDefaults() {
        customBindings.value = {};
        save();
    }

    // ── 获取某个动作的当前按键定义 ──
    function getBinding(actionId) {
        return bindings.value[actionId] || DEFAULT_BINDINGS[actionId] || null;
    }

    /**
     * 核心匹配函数：给定 focusContext 和 KeyboardEvent，返回匹配的动作 ID
     * @param {string} context  — focusContext 值
     * @param {KeyboardEvent} e — 键盘事件
     * @returns {string|null}   匹配的动作 ID，无匹配返回 null
     */
    function matchAction(context, e) {
        const { key, ctrlKey, altKey, shiftKey, metaKey } = e;
        const current = bindings.value;

        for (const [actionId, def] of Object.entries(current)) {
            // 按键必须匹配
            if (def.key !== key) continue;

            // 修饰键必须精确匹配（无修饰键时 def.ctrl 为 undefined → !!def.ctrl === false）
            const hasCtrl  = !!(ctrlKey || metaKey);
            const hasAlt   = !!altKey;
            const hasShift = !!shiftKey;
            if (!!def.ctrl  !== hasCtrl)  continue;
            if (!!def.alt   !== hasAlt)   continue;
            if (!!def.shift !== hasShift) continue;

            // 上下文过滤
            const bindingCtx = def.context || 'global';
            if (bindingCtx === 'global' || bindingCtx === context) {
                // onlyIn 限制：仅在这些上下文中生效
                if (def.onlyIn && !def.onlyIn.includes(context)) continue;
                return actionId;
            }
        }

        return null;
    }

    // ── 按键捕获（双向追踪：按下/释放，松键确认） ──
    // 内部追踪状态
    let _heldKeys = new Set();
    let _lastModifiers = { ctrl: false, alt: false, shift: false, meta: false };
    let _lastNonModifier = null;
    /** 非修饰键松开那一瞬间的快照 —— 修饰键后松开也能正确记录 */
    let _lastCombo = null;
    let _captureResolver = null;

    /** 捕获期间的实时预览（模板响应式绑定） */
    const capturedPreview = Vue.ref('');

    function _keyDisplayName(key) {
        const map = {
            ' ':          'Space',
            'ArrowUp':    '↑',
            'ArrowDown':  '↓',
            'ArrowLeft':  '←',
            'ArrowRight': '→',
            'Escape':     'Esc',
            'Enter':      'Enter',
            'Tab':        'Tab',
            'Backspace':  'Backspace',
            'Delete':     'Del',
        };
        return map[key] || key;
    }

    function _updatePreview() {
        const parts = [];
        if (_lastModifiers.ctrl)  parts.push('Ctrl');
        if (_lastModifiers.alt)   parts.push('Alt');
        if (_lastModifiers.shift) parts.push('Shift');
        if (_lastModifiers.meta)  parts.push('Meta');
        if (_lastNonModifier) {
            parts.push(_keyDisplayName(_lastNonModifier));
        }
        capturedPreview.value = parts.length ? parts.join(' + ') : '…';
    }

    function _resetCaptureState() {
        _heldKeys.clear();
        _lastNonModifier = null;
        _lastCombo = null;
        _lastModifiers = { ctrl: false, alt: false, shift: false, meta: false };
        capturedPreview.value = '…';
    }

    function _finalizeCapture() {
        // 用 _lastCombo 兜底——非修饰键先松开、修饰键后松开的情况
        const targetKey = _lastNonModifier || _lastCombo?.key || null;
        if (!targetKey || ['Control', 'Alt', 'Shift', 'Meta'].includes(targetKey)) {
            _resetCaptureState();
            return;
        }
        const def = {
            key: targetKey,
            // _lastCombo 里的修饰键状态是在非修饰键松开时拍的快照，更准确
            ctrl:  _lastCombo?.ctrl  ?? _lastModifiers.ctrl,
            alt:   _lastCombo?.alt   ?? _lastModifiers.alt,
            shift: _lastCombo?.shift ?? _lastModifiers.shift,
        };
        isCapturing.value = false;
        capturedPreview.value = '';
        _heldKeys.clear();
        _lastNonModifier = null;
        _lastCombo = null;
        _lastModifiers = { ctrl: false, alt: false, shift: false, meta: false };
        if (_captureResolver) {
            const r = _captureResolver;
            _captureResolver = null;
            r(def);
        }
    }

    /**
     * 处理捕获中的一次键盘事件（keydown 或 keyup）
     * @param {KeyboardEvent} e
     * @param {boolean} isKeyup
     */
    function _onCaptureKey(e, isKeyup) {
        e.preventDefault();
        e.stopPropagation();

        const key = e.key;
        const isMod = ['Control', 'Alt', 'Shift', 'Meta'].includes(key);

        // 总以事件上的修饰键状态为准（keyup 时某些修饰键可能已松开）
        _lastModifiers = {
            ctrl:  !!(e.ctrlKey || e.metaKey),
            alt:   !!e.altKey,
            shift: !!e.shiftKey,
            meta:  !!e.metaKey,
        };

        if (isKeyup) {
            _heldKeys.delete(key);

            // 非修饰键松开时拍下当前组合快照
            if (!isMod && _lastNonModifier === key) {
                _lastCombo = {
                    key,
                    ctrl:  _lastModifiers.ctrl,
                    alt:   _lastModifiers.alt,
                    shift: _lastModifiers.shift,
                };
            }

            // 从当前仍按住的键中找出最新的非修饰键
            const remainingReal = [..._heldKeys].filter(k => !['Control', 'Alt', 'Shift', 'Meta'].includes(k));
            _lastNonModifier = remainingReal.length > 0 ? remainingReal[remainingReal.length - 1] : null;

            if (!_lastNonModifier && _heldKeys.size === 0) {
                // 所有键都已松开 → 定案
                _finalizeCapture();
                return;
            }
            // 仍有键按住 → 更新预览
            _updatePreview();
            return;
        }

        // ── keydown ──
        if (e.repeat) return;        // 忽略自动连发
        _heldKeys.add(key);
        if (!isMod) {
            _lastNonModifier = key;
        }
        _updatePreview();
    }

    /** 开始捕获（返回 Promise，在用户松开所有键时 resolve 按键定义） */
    function startCapture() {
        if (isCapturing.value) return Promise.resolve(null);
        isCapturing.value = true;
        _resetCaptureState();
        return new Promise((resolve) => {
            _captureResolver = resolve;
        });
    }

    /** 喂入 keydown 事件（由 app.js 的 onGlobalKeyDown 调用） */
    function feedCapturedEvent(e) {
        if (_captureResolver) {
            _onCaptureKey(e, false);
            return true;
        }
        return false;
    }

    /** 喂入 keyup 事件（由 app.js 的 onGlobalKeyUp 调用） */
    function feedCapturedKeyUp(e) {
        if (_captureResolver) {
            _onCaptureKey(e, true);
            return true;
        }
        return false;
    }

    /** 取消捕获 */
    function cancelCapture() {
        if (_captureResolver) {
            _captureResolver(null);
            _captureResolver = null;
        }
        isCapturing.value = false;
        capturedPreview.value = '';
        _heldKeys.clear();
        _lastNonModifier = null;
        _lastCombo = null;
        _lastModifiers = { ctrl: false, alt: false, shift: false, meta: false };
    }

    // ── 按键定义为可读字符串 ──
    function formatKey(def) {
        if (!def || !def.key) return '…';
        const parts = [];
        if (def.ctrl)  parts.push('Ctrl');
        if (def.alt)   parts.push('Alt');
        if (def.shift) parts.push('Shift');
        const keyMap = {
            ' ':          'Space',
            'ArrowUp':    '↑',
            'ArrowDown':  '↓',
            'ArrowLeft':  '←',
            'ArrowRight': '→',
            'Escape':     'Esc',
            'Enter':      'Enter',
        };
        parts.push(keyMap[def.key] || def.key);
        return parts.join('+');
    }

    // ── 获取按上下文分组的动作列表（设置 UI 用） ──
    function getActionsByGroup() {
        const groups = {};
        for (const [actionId, def] of Object.entries(DEFAULT_BINDINGS)) {
            const ctx = def.context || 'global';
            if (!groups[ctx]) {
                groups[ctx] = {
                    label: GROUP_LABELS[ctx] || ctx,
                    actions: [],
                };
            }
            const current = getBinding(actionId);
            groups[ctx].actions.push({
                id: actionId,
                label: def.label,
                currentKey: current,
                display: formatKey(current),
                isCustom: !!customBindings.value[actionId],
            });
        }
        return groups;
    }

    // ── 查找冲突：某上下文中某按键已被哪个动作占用 ──
    function findConflict(context, newKeyDef, excludeActionId) {
        for (const [actionId, def] of Object.entries(bindings.value)) {
            if (actionId === excludeActionId) continue;
            const bindingCtx = def.context || 'global';
            if (bindingCtx !== context && bindingCtx !== 'global') continue;
            if (def.onlyIn && !def.onlyIn.includes(context)) continue;

            if (def.key    === newKeyDef.key &&
                !!def.ctrl  === !!newKeyDef.ctrl &&
                !!def.alt   === !!newKeyDef.alt &&
                !!def.shift === !!newKeyDef.shift) {
                return { actionId, label: DEFAULT_BINDINGS[actionId]?.label || actionId };
            }
        }
        return null;
    }

    // ── 初始化 ──
    load();

    return {
        // 状态
        bindings,
        customBindings,
        isCapturing,
        // 持久化
        load,
        save,
        setBinding,
        removeBinding,
        resetToDefaults,
        getBinding,
        // 匹配
        matchAction,
        findConflict,
        // 捕获
        startCapture,
        cancelCapture,
        feedCapturedEvent,
        feedCapturedKeyUp,
        capturedPreview,
        // 工具
        formatKey,
        getActionsByGroup,
        DEFAULT_BINDINGS,
        GROUP_LABELS,
    };
}

/**
 * editor/utils.js
 *
 * 纯工具函数 —— 不依赖 Vue 响应式系统
 */

/** 深拷贝 */
export function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/** 生成唯一 ID */
export function uid(prefix = 'c') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * 计算从外部点射向节点中心的射线与节点矩形边界的交点（用于磁吸和周围拖拽）
 * @param {Object} node - 节点对象 { x, y, width, height }
 * @param {Object} fromPt - 射线起点（世界坐标）
 * @param {Object} toPt - 射线方向参考点（世界坐标）
 * @returns {Object} { x, y, side } - 边界交点及所在边 ('top'|'bottom'|'left'|'right')
 */
export function getPerimeterPoint(node, fromPt, toPt) {
    const hw = (node.width || 200) / 2;
    const hh = (node.height || 90) / 2;
    const cx = node.x;
    const cy = node.y;

    let dx = toPt.x - cx;
    let dy = toPt.y - cy;

    if (dx === 0 && dy === 0) {
        dx = cx - fromPt.x;
        dy = cy - fromPt.y;
        if (dx === 0 && dy === 0) return { x: cx, y: cy - hh, side: 'top' };
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let scale, side;

    if (absDx * hh > absDy * hw) {
        scale = hw / absDx;
        side = dx > 0 ? 'right' : 'left';
    } else {
        scale = hh / absDy;
        side = dy > 0 ? 'bottom' : 'top';
    }

    return {
        x: cx + dx * scale,
        y: cy + dy * scale,
        side,
    };
}

/** 检查当前焦点是否在输入框等可编辑元素中 */
export function isInputFocused() {
    const tag = document.activeElement?.tagName || '';
    const editable = document.activeElement?.getAttribute('contenteditable');
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
}

/** 获取内置特效图标 */
export function getEffectIcon(name) {
    const map = { rain: '🌧️', snow: '❄️', sakura: '🌸', fire: '🔥', stardust: '✨', bloodmoon: '🩸', corruption: '🌑' };
    return map[name] || '✨';
}

/** 获取角色名称 */
export function getCharName(gameCharacters, charId) {
    return gameCharacters[charId]?.name || charId;
}

/** 获取角色立绘列表 */
export function getCharSprites(gameCharacters, charId) {
    if (!charId || !gameCharacters[charId]) return {};
    return gameCharacters[charId].sprites || {};
}

/** 步骤简短文本描述 */
export function stepTextBrief(step) {
    if (!step) return '';
    if (step.type === 'choice') return `[分支] ${(step.text || '').substring(0, 40)}...`;
    if (step.type === 'ending') return `[结局触发] → ${step.endingId || '(未选择结局)'}`;
    if (step.type === 'jump') {
        if (step.endingId) return `[结局触发] → ${step.endingId}`;
        return `[跳转] → ${step.jumpChapter || '(无目标)'}`;
    }
    const previewText = step.texts && step.texts.length
        ? step.texts[0]
        : (step.text || '');
    return previewText.substring(0, 50) + (previewText.length > 50 ? '...' : '');
}

/** 步骤类型标签 */
export function stepTypeLabel(type, step) {
    if (type === 'jump' && step?.endingId) return '结局触发';
    const map = { dialogue: '对话', choice: '分支', jump: '跳转' };
    return map[type] || type || '对话';
}

/** 格式化 JS 对象为代码字符串 */
export function formatJS(obj, indent) {
    const pad = '    '.repeat(indent);
    const pad1 = '    '.repeat(indent + 1);

    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj.toString();
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'string') return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        if (obj.every(e => typeof e === 'string' && e.length < 30)) {
            return '[' + obj.map(e => JSON.stringify(e)).join(', ') + ']';
        }
        const items = obj.map((item, i) => {
            const comma = i < obj.length - 1 ? ',' : '';
            return pad1 + formatJS(item, indent + 1) + comma;
        });
        return '[\n' + items.join('\n') + '\n' + pad + ']';
    }

    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        const realKeys = keys.filter(k => !k.startsWith('_'));
        if (realKeys.length === 0) return '{}';

        const pairs = realKeys.map((k, i) => {
            const comma = i < realKeys.length - 1 ? ',' : '';
            const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
            return pad1 + keyStr + ': ' + formatJS(obj[k], indent + 1) + comma;
        });
        return '{\n' + pairs.join('\n') + '\n' + pad + '}';
    }

    return JSON.stringify(obj);
}

/** 初始化 CG 表单临时属性 */
export function initCGForm(step) {
    if (!step._cgAction) {
        step._cgAction = step.cgChanges?.action || '';
        step._cgId = step.cgChanges?.id || '';
        step._cgAnimation = step.cgChanges?.animation || '';
        step._cgEffect = step.cgChanges?.effect || '';
    }
}

/** 初始化角色变更临时属性 */
export function initCharChanges(step) {
    if (!step._charChanges) {
        step._charChanges = clone(step.characterChanges || []);
    }
}

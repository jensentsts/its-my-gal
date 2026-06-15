/**
 * editor/helpers.js
 *
 * 纯工具函数 —— 不依赖 Vue，可安全地在任意模块中使用。
 */

/** 深拷贝（基于 JSON，适用于普通对象） */
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
 * @returns {Object} { x, y, side } - 边界交点及所在边
 */
export function getPerimeterPoint(node, fromPt, toPt) {
    const hw = (node.width || 200) / 2;
    const hh = (node.height || 90) / 2;
    const cx = node.x;
    const cy = node.y;

    // 方向向量：从节点中心指向目标点
    let dx = toPt.x - cx;
    let dy = toPt.y - cy;

    // 如果目标正好在中心，朝来源方向偏移
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

/** 屏幕坐标 → 世界坐标（纯函数，依赖注入坐标值而非 ref） */
export function screenToWorld(sx, sy, panX, panY, viewScale) {
    return {
        x: (sx - panX) / viewScale,
        y: (sy - panY) / viewScale,
    };
}

/** 世界坐标 → 屏幕坐标 */
export function worldToScreen(wx, wy, panX, panY, viewScale) {
    return {
        x: wx * viewScale + panX,
        y: wy * viewScale + panY,
    };
}

/**
 * 将 JS 对象格式化为代码字符串（用于导出的 formatJS）
 * @param {*} obj
 * @param {number} indent - 缩进层数
 */
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

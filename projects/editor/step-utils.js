/**
 * editor/step-utils.js
 *
 * 步骤域常量与纯辅助函数 —— 不依赖 Vue 响应式状态。
 * 所有函数都是纯函数或工厂函数，便于测试和复用。
 */

// ════════════════════════════════════════════════════════════════════
//  节点类型
// ════════════════════════════════════════════════════════════════════

export const NODE_TYPE = { CHAPTER: 'chapter', ENDING: 'ending' };

export function getNodeType(id) {
    if (!id) return null;
    if (id.startsWith('_end_')) return NODE_TYPE.ENDING;
    return NODE_TYPE.CHAPTER;
}

export function isEndingNode(id) { return getNodeType(id) === NODE_TYPE.ENDING; }

// ════════════════════════════════════════════════════════════════════
//  步骤辅助函数
// ════════════════════════════════════════════════════════════════════

/** 步骤文本摘要（40-50 字） */
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
    return previewText.substring(0, 50) + (previewText.length > 50 ? ' ' : '');
}

/** 步骤类型标签中文名 */
export function stepTypeLabel(type, step) {
    if (type === 'ending' || (type === 'jump' && step?.endingId)) return '结局触发';
    const map = { dialogue: '对话', choice: '分支', jump: '跳转' };
    return map[type] || type || '对话';
}

/** 步骤是否被用户锁定（locked 属性） */
export function isStepEditLocked(step) {
    return step && step.locked === true;
}

/** 步骤是否因位置被锁定（末尾 jump step 不可拖拽） */
export function isStepLocked(steps, index) {
    if (!steps || index < 0 || index >= steps.length) return true;
    return index === steps.length - 1 && steps[index].type === 'jump' && !steps[index].endingId;
}

// ════════════════════════════════════════════════════════════════════
//  角色变更常量
// ════════════════════════════════════════════════════════════════════

export const CHAR_CHANGE_FIELDS = [
    'id', 'id1', 'id2', 'ids',
    'action', 'spriteId', 'animation', 'position',
    'scale', 'opacity', 'filters',
    'speak', 'weight', 'weights',
    'actionId', 'effect', 'duration',
    'offsetX', 'offsetY', 'spread',
    'groupId', 'sfx', 'order',
];

export const ANIM_ENTER = [
    'fade-in', 'slide-in-left', 'slide-in-right', 'slide-in-up', 'slide-in-down',
    'bounce-in', 'zoom-in', 'flip-in', 'drop-in', 'float-in', 'stumble-in', 'swing-in',
];
export const ANIM_LEAVE = [
    'fade-out', 'slide-out-left', 'slide-out-right', 'slide-out-up', 'slide-out-down',
    'bounce-out', 'zoom-out', 'flip-out', 'shrink-out', 'vanish',
];
export const ANIM_MOVE  = ['slide-left', 'slide-right', 'flip-move'];
export const POSITIONS  = [
    'center', 'left', 'right',
    'left-far', 'center-left', 'center-right', 'right-far',
];
export const FX_CHAR = [
    'shake', 'flash', 'glow', 'float', 'pulse',
    'tremble', 'blur', 'highlight', 'shine', 'dizzy',
];
export const ACTIONS = [
    'wave', 'bow', 'point', 'nod', 'shake-head',
    'sit', 'stand', 'jump', 'fall', 'turn',
];
export const DURATIONS = [0.3, 0.5, 0.6, 0.8, 1.0, 1.5, 2.0];

export const builtinEffects = [
    'rain', 'snow', 'sakura', 'fire', 'stardust', 'bloodmoon', 'corruption',
];

/** 内置角色变更动作预设 */
export const builtinCharEffects = {
    'char-enter':       { name:'入场',     icon:'🎭', action:'enter',       animation:'fade-in',        position:'center' },
    'char-update':      { name:'更新立绘', icon:'🔄', action:'update',      spriteId:'default' },
    'char-leave':       { name:'退场',     icon:'🚪', action:'leave',       animation:'fade-out',       duration:0.5 },
    'char-move':        { name:'移动',     icon:'🚶', action:'move',        animation:'slide-left',     position:'left' },
    'char-speak':       { name:'说话',     icon:'💬', action:'speak',       weight:1.0 },
    'char-silence':     { name:'沉默',     icon:'🔇', action:'silence' },
    'char-action':      { name:'动作',     icon:'💃', action:'action',      actionId:'wave',            duration:0.8 },
    'char-effect':      { name:'特效',     icon:'💫', action:'effect',      effect:'shake',             duration:0.5 },
    'char-filter':      { name:'滤镜',     icon:'🎨', action:'filter',      filters:{ brightness:1.0, saturation:1.0, contrast:1.0 } },
    'char-reset-filter':{ name:'清滤镜',   icon:'🔄', action:'resetFilter' },
    'char-scale':       { name:'缩放',     icon:'🔍', action:'scale',       scale:1.3 },
    'char-opacity':     { name:'透明度',   icon:'👻', action:'opacity',     opacity:0.5 },
    'char-speak-all':   { name:'全员说话', icon:'🗣️', action:'speakAll',    ids:['_a','_b'],           weights:[1.0, 0.7] },
    'char-silence-all': { name:'全沉默',   icon:'🤫', action:'silenceAll' },
    'char-swap':        { name:'交换位置', icon:'🔄', action:'swap',         id1:'_a',                   id2:'_b' },
    'char-gather':      { name:'聚集',     icon:'📦', action:'gather',      ids:['_a','_b'],           position:'center',  spread:0.15,    animation:'slide-in-up' },
    'char-scatter':     { name:'散开',     icon:'💥', action:'scatter',     ids:['_a','_b'],           animation:'slide-out-right' },
    'char-order':       { name:'排序',     icon:'📋', action:'order',       ids:['_a','_b'] },
    'char-clear-all':   { name:'全清',     icon:'🗑️', action:'clearAll',    animation:'fade-out',       duration:0.5 },
};

/** 预览位置 → CSS left% 映射 */
export const POSITION_MAP_FOR_PREVIEW = {
    'left-far':'17%', 'left':'29%', 'center-left':'40%',
    'center':'50%', 'center-right':'60%', 'right':'71%', 'right-far':'83%',
};

export const availableEffects = [
    'vignette', 'dim', 'screenShake', 'flashWhite', 'flashBlack',
];

// ════════════════════════════════════════════════════════════════════
//  工厂函数（依赖注入）
// ════════════════════════════════════════════════════════════════════

/**
 * 创建角色名称/立绘查询函数
 * @param {Object} gameCharacters - 响应式角色数据
 */
export function createNameHelpers(gameCharacters) {
    function getCharName(charId) {
        return gameCharacters[charId]?.name || charId;
    }

    function getCharSprites(charId) {
        if (!charId || !gameCharacters[charId]) return {};
        return gameCharacters[charId].sprites || {};
    }

    return { getCharName, getCharSprites };
}

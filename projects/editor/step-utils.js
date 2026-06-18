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
//  枚举常量（用于 HTML 模板 v-for 驱动）
// ════════════════════════════════════════════════════════════════════

/** 全部动画列表（用于 <datalist id="dl-anims">） */
export const ALL_ANIMATIONS = [
    ...ANIM_ENTER, ...ANIM_LEAVE, ...ANIM_MOVE,
    'bounce-in', 'bounce-out',
    'zoom-in', 'zoom-out',
    'flip-in', 'flip-out',
    'drop-in', 'float-in', 'stumble-in', 'swing-in',
    'shrink-out', 'vanish',
    'shake', 'flash', 'glow', 'float',
    'pulse', 'tremble', 'blur', 'highlight', 'shine', 'dizzy',
    'swap', 'slide-left', 'slide-right',
    'action-wave', 'action-bow', 'action-nod',
    'action-jump', 'action-fall', 'action-turn',
];

/** 步骤类型选项（用于 <select>） */
export const STEP_TYPE_OPTIONS = [
    { value: 'dialogue', label: '对话 (dialogue)' },
    { value: 'choice',   label: '分支选择 (choice)' },
    { value: 'jump',     label: '直接跳转 (jump)' },
    { value: 'ending',   label: '结局触发 (ending)' },
];

/** 角色变更动作选项（用于 <select> 驱动） */
export const CHAR_ACTIONS = [
    { value: 'enter',       label: '🎭 入场',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'update',      label: '🔄 更新',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'leave',       label: '👋 退场',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'move',        label: '🚶 移动',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'speak',       label: '💬 说话',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'silence',     label: '🔇 沉默',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'speakAll',    label: '🗣️ 全员说',   needsId: false, isSwap: false, hasIds: true },
    { value: 'silenceAll',  label: '🤫 全沉默',   needsId: false, isSwap: false, hasIds: false },
    { value: 'action',      label: '💃 动作',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'effect',      label: '✨ 特效',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'filter',      label: '🎨 滤镜',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'resetFilter', label: '🔄 清滤镜',   needsId: true,  isSwap: false, hasIds: false },
    { value: 'scale',       label: '🔍 缩放',     needsId: true,  isSwap: false, hasIds: false },
    { value: 'opacity',     label: '👻 透明度',   needsId: true,  isSwap: false, hasIds: false },
    { value: 'swap',        label: '🔄 交换',     needsId: false, isSwap: true,  hasIds: false },
    { value: 'gather',      label: '📦 聚集',     needsId: false, isSwap: false, hasIds: true },
    { value: 'scatter',     label: '💥 散开',     needsId: false, isSwap: false, hasIds: true },
    { value: 'order',       label: '📋 排序',     needsId: false, isSwap: false, hasIds: true },
    { value: 'clearAll',    label: '🗑️ 全清',     needsId: false, isSwap: false, hasIds: false },
];

/**
 * 角色变更动作拥有的字段，true = 当 action 为此值时该字段显示。
 * 用于模板中取代手写的 ['enter','update',...].includes(cc.action) 数组字面量。
 */
export const CHAR_ACTION_FIELDS_MAP = {
    enter:       { spriteId:true, position:true, animation:true, duration:false, speak:true, groupId:true, offset:true, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    update:      { spriteId:true, animation:true, position:false, duration:false, speak:false, groupId:false, offset:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    leave:       { spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, offset:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    move:        { position:true, animation:true, offset:true, spriteId:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    speak:       { weight:true, animation:true, spriteId:false, position:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    silence:     { spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    speakAll:    { ids:true, weights:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false },
    silenceAll:  { spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    action:      { actionId:true, duration:true, animation:true, spriteId:false, position:false, speak:false, groupId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    effect:      { effect:true, duration:true, animation:true, spriteId:false, position:false, speak:false, groupId:false, actionId:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    filter:      { filters:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    resetFilter: { spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    scale:       { scale:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    opacity:     { opacity:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, spread:false, id1:false, id2:false, ids:false, weights:false },
    swap:        { id1:true, id2:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, ids:false, weights:false },
    gather:      { ids:true, position:true, spread:true, animation:true, spriteId:true, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, offset:false, id1:false, id2:false, weights:false },
    scatter:     { ids:true, animation:true, spriteId:false, position:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, weights:false },
    order:       { ids:true, spriteId:false, position:false, animation:false, duration:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, weights:false },
    clearAll:    { animation:true, duration:true, spriteId:false, position:false, speak:false, groupId:false, actionId:false, effect:false, filters:false, scale:false, opacity:false, spread:false, id1:false, id2:false, ids:false, weights:false },
};

/** 检查某个角色变更 action 是否需要单角色选择器 */
export function charActionNeedsId(action) {
    return CHAR_ACTIONS.some(a => a.value === action && a.needsId);
}

/** 检查某个角色变更 action 是否需要双角色选择器（swap） */
export function charActionIsSwap(action) {
    return CHAR_ACTIONS.some(a => a.value === action && a.isSwap);
}

/** 检查某个角色变更 action 是否需要多角色输入框 */
export function charActionHasIds(action) {
    return CHAR_ACTIONS.some(a => a.value === action && a.hasIds);
}

/** 检查某个角色变更 action 在子行中是否显示特定字段 */
export function charActionHasField(action, field) {
    const m = CHAR_ACTION_FIELDS_MAP[action];
    return m ? !!m[field] : false;
}

/** 获得物品方式选项 */
export const GAIN_APPROACH_OPTIONS = [
    { value: 'find',    label: '寻获' },
    { value: 'receive', label: '赠予' },
    { value: 'unlock',  label: '解锁' },
];

/** CG 变更动作选项 */
export const CG_ACTION_OPTIONS = [
    { value: '',      label: '(无)' },
    { value: 'enter', label: '进入 CG' },
    { value: 'leave', label: '离开 CG' },
];

/** 跳转模式选项 */
export const JUMP_MODE_OPTIONS = [
    { value: 'chapter', label: '⤵ 跳转到章节', icon: '⤵' },
    { value: 'ending',  label: '🎬 触发结局',   icon: '🎬' },
];

/** 位置选项（带中文标签） */
export const POSITION_OPTIONS = [
    { value: 'center',      label: '居中' },
    { value: 'left',        label: '左' },
    { value: 'right',       label: '右' },
    { value: 'left-far',    label: '最左' },
    { value: 'center-left', label: '左中' },
    { value: 'center-right',label: '右中' },
    { value: 'right-far',   label: '最右' },
];

/** 缩放比例选项 */
export const SCALE_OPTIONS = [0.3, 0.5, 0.7, 0.8, 1.0, 1.2, 1.3, 1.5, 2.0];

/** 透明度选项 */
export const OPACITY_OPTIONS = [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];

/** 集散动画选项 */
export const GATHER_ANIM_OPTIONS = ['slide-in-up', 'fade-in', 'bounce-in', 'zoom-in'];

export const SCATTER_ANIM_OPTIONS = ['slide-out-right', 'slide-out-left', 'fade-out'];

/** 全清退场动画选项 */
export const CLEAR_ALL_ANIM_OPTIONS = ['fade-out', 'shrink-out', 'vanish', ...ANIM_LEAVE];

/** 内置特效类别选项 */
export const BUILTIN_EFFECT_TYPE_OPTIONS = [
    { value: 'rain',     label: '🌧️ 雨' },
    { value: 'snow',     label: '❄️ 雪' },
    { value: 'sakura',   label: '🌸 樱花' },
    { value: 'fire',     label: '🔥 火焰' },
    { value: 'stardust', label: '✨ 星尘' },
    { value: 'bloodmoon',label: '🩸 血月' },
    { value: 'corruption',label: '🌑 腐蚀' },
];

/** 特效类别（编辑器）选项 */
export const EFFECT_CATEGORY_OPTIONS = [
    { value: 'builtin',  label: '内置特效（雨/雪/火焰等）' },
    { value: 'template', label: '模板 + Emoji 特效' },
    { value: 'custom',   label: '独立 JS + CSS 特效' },
];

/** 动画模板选项（Emoji 特效） */
export const TEMPLATE_ANIM_OPTIONS = [
    { value: 'fall',    label: '下落 (fall)' },
    { value: 'rise',    label: '上升 (rise)' },
    { value: 'float',   label: '漂浮 (float)' },
    { value: 'explode', label: '爆炸 (explode)' },
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

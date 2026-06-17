/**
 * engine/resource/item-helpers.js
 *
 * 可移植的物品辅助函数。
 *
 * 这些函数独立于 game/ 数据源，接受 ITEMS 数据作为参数，
 * 因此无论数据来自直接导入还是通过 ResourceManager 加载的资源包，均可使用。
 */

/**
 * 根据物品 ID 和当前游戏 Flag 动态获取物品描述
 * @param {string} itemId - 物品 ID
 * @param {Object} currentFlags - 当前游戏 flags 状态
 * @param {Object} items - 物品配置字典 (ITEMS)
 * @returns {string} 物品描述
 */
export function getDynamicItemDescription(itemId, currentFlags, items) {
    const item = items[itemId];
    if (!item) return '一件未在帝国图鉴上登录的未知神秘物件。';

    if (item.dynamicDescriptions && item.dynamicDescriptions.length > 0) {
        // 从后向前遍历，优先返回最新满足条件的描述
        for (let i = item.dynamicDescriptions.length - 1; i >= 0; i--) {
            const cond = item.dynamicDescriptions[i];
            if (currentFlags && currentFlags[cond.flag]) return cond.description;
        }
    }

    return item.defaultDescription;
}

/**
 * 根据物品 ID 获取图标
 * @param {string} itemId - 物品 ID
 * @param {Object} items - 物品配置字典 (ITEMS)
 * @returns {string} 图标 emoji
 */
export function getItemIcon(itemId, items) {
    return items[itemId]?.icon || '🎁';
}

/**
 * 根据物品 ID 获取图片 URL（若物品有独立图片而非仅 emoji）
 * @param {string} itemId - 物品 ID
 * @param {Object} items - 物品配置字典 (ITEMS)
 * @returns {string|null} 图片 URL 或 null
 */
export function getItemImage(itemId, items) {
    return items[itemId]?.image || null;
}

/**
 * 根据物品 ID 获取名称
 * @param {string} itemId - 物品 ID
 * @param {Object} items - 物品配置字典 (ITEMS)
 * @returns {string} 物品名称
 */
export function getItemName(itemId, items) {
    return items[itemId]?.name || itemId;
}

/**
 * 物品动画预设（静态配置，可从 JSON 加载）
 * 当从资源包加载时，此预设会被 pack 中的数据覆盖。
 * 此处提供硬编码默认值作为回退。
 */
export const DEFAULT_ITEM_ANIMATION_PRESETS = {
    'gain': {
        'find':    { class: 'fx-item-find',    title: '✨ 寻获物品', soundEffect: 'pickup' },
        'receive': { class: 'fx-item-receive', title: '🤝 获得赠予', soundEffect: 'gift'   },
        'unlock':  { class: 'fx-item-unlock',  title: '🔓 封印解除', soundEffect: 'magic'  }
    },
    'lose': {
        'use':      { class: 'fx-item-use',      title: '⚙️ 消耗物品', soundEffect: 'consume' },
        'destroy':  { class: 'fx-item-destroy',  title: '💥 物品损毁', soundEffect: 'break'   },
        'handOver': { class: 'fx-item-give',     title: '🤲 交出物品', soundEffect: 'give'    }
    },
    'update': {
        'change': { class: 'fx-item-unlock', title: '🔄 物品发生异变', soundEffect: 'magic' }
    }
};

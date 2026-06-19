/**
 * app/mount-game.js
 *
 * mountGamePlayer —— 将 GalGame 播放器挂载到任意 DOM 容器的入口函数。
 *
 * 使用方式：
 *   import { mountGamePlayer } from './mount-game.js';
 *   const player = mountGamePlayer('#my-div', storyData);
 *   player.getEngine()       // → GalEngine 实例
 *   player.unmount()         // 销毁
 *
 * 对于 Vue 项目，也可直接导入 GamePlayer 组件：
 *   import { GamePlayer } from './game-player.js';
 *   // 在模板中: <GamePlayer :story-data="data" />
 */

import { GamePlayer } from './game-player.js';

// ── 组件导入（供全局注册，子组件模板内按名引用需要全局可见） ──
import { default as ToastNotification } from './components/ToastNotification.js';
import { default as Lightbox } from './components/Lightbox.js';
import { default as DialogBox } from './components/DialogBox.js';
import { default as MenuView } from './components/MenuView.js';
import { default as SettingsPanel } from './components/SettingsPanel.js';
import { default as CharacterArchive } from './components/CharacterArchive.js';
import { default as GalleryPanel } from './components/GalleryPanel.js';
import { default as ArchiveSlots } from './components/ArchiveSlots.js';
import { default as GameView } from './components/GameView.js';
import { default as TopNavBar } from './components/TopNavBar.js';
import { default as DialoguePanel } from './components/DialoguePanel.js';
import { default as ChoicePanel } from './components/ChoicePanel.js';
import { default as HistoryLog } from './components/HistoryLog.js';
import { default as InventoryPanel } from './components/InventoryPanel.js';
import { default as ItemToast } from './components/ItemToast.js';
import { default as EndingScreen } from './components/EndingScreen.js';

// 所有组件注册表 —— 子组件按名引用时通过全局注册解析
const GLOBAL_COMPONENTS = [
    ['toast-notification', ToastNotification],
    ['lightbox', Lightbox],
    ['dialog-box', DialogBox],
    ['menu-view', MenuView],
    ['settings-panel', SettingsPanel],
    ['character-archive', CharacterArchive],
    ['gallery-panel', GalleryPanel],
    ['archive-slots', ArchiveSlots],
    ['game-view', GameView],
    ['top-nav-bar', TopNavBar],
    ['dialogue-panel', DialoguePanel],
    ['choice-panel', ChoicePanel],
    ['history-log', HistoryLog],
    ['inventory-panel', InventoryPanel],
    ['item-toast', ItemToast],
    ['ending-screen', EndingScreen],
];

/**
 * @typedef {Object} MountedPlayer
 * @property {Object}    app        - Vue 应用实例
 * @property {Function}  unmount    - 销毁播放器
 * @property {Function}  getEngine  - 获取 GalEngine 内核实例
 * @property {Function}  getEngineCtx - 获取引擎桥接上下文（包含所有 ref/方法）
 */

/**
 * 挂载一个独立的 GalGame 播放器到指定 DOM 容器。
 *
 * @param {string|Element} container - CSS 选择器或 DOM 元素
 * @param {Object} storyData - 完整的游戏数据（STORY_CHAPTERS, CHARACTERS, SCENES...）
 * @param {Object} [options]
 * @param {Object}  [options.aspectRatio]    - 覆盖画幅宽高比
 * @param {boolean} [options.autoStart=false] - 挂载后自动开始游戏
 * @param {boolean} [options.loadEditorData=false] - 是否检查编辑器同步数据
 * @returns {MountedPlayer}
 */
export function mountGamePlayer(container, storyData, options = {}) {
    const {
        aspectRatio = null,
        autoStart = false,
        loadEditorData = false,
    } = options || {};

    const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!el) {
        throw new Error(`[mountGamePlayer] 容器未找到: "${container}"`);
    }

    // 创建独立的 Vue 应用实例
    // containerRef 让 GamePlayer 的 useScale 以容器尺寸代替 window 尺寸计算缩放
    const app = Vue.createApp(GamePlayer, {
        storyData,
        aspectRatio,
        autoStart,
        loadEditorData,
        containerRef: { current: el },
    });

    // ★ 全局注册组件 —— 子组件模板（如 MenuView → <archive-slots>）通过全局解析
    for (const [name, comp] of GLOBAL_COMPONENTS) {
        app.component(name, comp);
    }

    // 挂载到容器
    const vm = app.mount(el);

    return {
        app,
        unmount() {
            app.unmount();
        },
        getEngine() {
            return vm.engine?.value || null;
        },
        getEngineCtx() {
            return vm;
        },
    };
}

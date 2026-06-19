/**
 * app/app.js
 *
 * Vue 3 应用入口 —— 向下兼容的薄包装层。
 *
 * 现在 GalGame 播放器的核心逻辑已迁移到 game-player.js，
 * app.js 仅负责导入静态数据并调用 mountGamePlayer。
 *
 * 架构演进：
 *   app.js (厚) →  data + mountGamePlayer  ->  game-player.js (核心)
 *
 * 外部嵌入时，可直接使用 game-player.js 中的 GamePlayer 组件
 * 或 mount-game.js 中的 mountGamePlayer 函数。
 */

import * as GameData from '../../../resource-packs/default/index.js';
import { mountGamePlayer } from './mount-game.js';

mountGamePlayer('#app', GameData, {
    loadEditorData: true,
});

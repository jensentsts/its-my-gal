/**
 * engine/index.js
 *
 * GalEngine 内核统一导出入口。
 *
 * 引擎是一个独立内核，不依赖任何 UI 框架。
 * 使用方（如 Vue App）通过事件监听和钩子与引擎交互。
 *
 * 架构层次：
 *   ┌──────────────────────────┐
 *   │   Vue App (UI Layer)     │  ← app/
 *   ├──────────────────────────┤
 *   │   Engine Adapter         │  ← app/composables/use-engine.js
 *   ├──────────────────────────┤
 *   │   GalEngine (Kernel)     │  ← engine/core/engine.js
 *   │   ├─ GameState           │
 *   │   ├─ EventEmitter        │
 *   │   └─ SaveManager         │
 *   ├──────────────────────────┤
 *   │   Resource Layer         │  ← engine/resource/
 *   │   ├─ ResourceManager     │     资源包加载 / ZIP 导入
 *   │   ├─ PackValidator       │     资源包结构验证
 *   │   └─ ItemHelpers         │     可移植物品辅助函数
 *   ├──────────────────────────┤
 *   │   Game Data (ROM)        │  ← game/ 或 资源包
 *   └──────────────────────────┘
 */

export { EventEmitter } from './core/event-emitter.js';
export { GameState }     from './core/state.js';
export { GalEngine }     from './core/engine.js';
export { SaveManager }   from './storage/save-manager.js';
export { EffectsManager } from './effects/effects-manager.js';
export { CustomEffectLoader } from './effects/custom-effect-loader.js';

// 资源包系统
export { ResourceManager } from './resource/resource-manager.js';
export { validatePackStructure, validatePackData } from './resource/pack-validator.js';
export { getDynamicItemDescription, getItemIcon, getItemImage, getItemName, DEFAULT_ITEM_ANIMATION_PRESETS } from './resource/item-helpers.js';
export { ResourcePathResolver } from './resource/resource-path-resolver.js';

// 故事系统（分支预测 + 懒加载）
export {
    extractBranchPoints,
    rankNextChapters,
    buildChapterGraph,
    deepPredict,
    ChapterLoader,
    CACHE_STATUS,
} from './story/index.js';

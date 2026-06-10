# 系统架构概述

## 整体架构

本系统采用 **三层架构** 设计，各层之间通过事件和接口解耦：

```
┌──────────────────────────────────────────────────────┐
│                   UI 表现层 (Vue 3)                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │  app/app.js          Vue 应用入口 + 模板渲染       │ │
│  │  app/composables/    引擎桥接 + 缩放 + Toast       │ │
│  │  app/styles/         界面样式层                    │ │
│  └──────────────┬───────────────────────────────────┘ │
│                 │ 引擎事件 → Vue ref 变更              │
│                 │ Vue 方法 → 引擎 API 调用             │
├─────────────────┼──────────────────────────────────────┤
│                 ▼                                      │
│              桥接层 (Adapter)                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │  app/composables/use-engine.js                    │ │
│  │  └─ GalEngine 事件监听 → 响应式状态同步            │ │
│  │  └─ Vue 操作 → 引擎 API 调用                      │ │
│  │  └─ 资源包加载管理                                │ │
│  └──────────────────────────────────────────────────┘ │
├─────────────────┬──────────────────────────────────────┤
│                 ▼                                      │
│             GalEngine 内核 (框架无关)                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  engine/core/engine.js   引擎主类                  │ │
│  │  engine/core/state.js    运行时状态容器             │ │
│  │  engine/core/event-emitter.js  事件总线            │ │
│  │  engine/storage/save-manager.js  存档管理器        │ │
│  │  engine/effects/effects-manager.js  粒子特效       │ │
│  │  engine/resource/resource-manager.js  资源包管理    │ │
│  └──────────────┬───────────────────────────────────┘ │
│                 │ 数据注入                              │
├─────────────────┼──────────────────────────────────────┤
│                 ▼                                      │
│             游戏数据层 ("卡带" / ROM)                   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  game/index.js        数据统一导出入口             │ │
│  │  game/config/         配置数据                    │ │
│  │  game/chapters/       13个故事章节                │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 核心设计理念

### 1. 框架无关的引擎内核

`GalEngine` 不依赖任何 UI 框架（Vue / React / 小程序等）。它通过事件 (`EventEmitter`) 向外暴露状态变更，任何 UI 框架都可以订阅这些事件来实现渲染。这意味着同一份引擎代码可以复用于不同平台。

### 2. 数据驱动

引擎是纯数据驱动的：输入章节数据（步骤数组）+ 配置数据，输出状态变更事件。开发者只需编写 JSON 格式的步骤数据，无需修改引擎代码。

### 3. "卡带"（ROM）架构

`game/` 目录类比为游戏卡带（ROM），包含：
- **配置数据**：角色、场景、物品、结局等定义
- **章节数据**：故事剧情步骤数组

更换 `game/` 目录即可切换为完全不同的故事，引擎无需任何修改。

### 4. 资源包系统

支持将游戏数据打包为标准化的资源包格式（JSON 目录结构或 ZIP 文件），实现：
- 运行时可切换资源包
- 支持从 ZIP 导入
- 编辑器与运行时数据同步

### 5. 双数据源支持

应用支持两种数据加载模式：
- **静态导入**：直接 import `game/` 目录的 JS 模块（开发模式）
- **资源包加载**：通过 `ResourceManager` 从目录或 ZIP 加载（发布模式）

## 数据流

### 游戏流程

```
用户点击 → advance() → 引擎处理步骤逻辑
                        ├── 打字机效果 → typewriter:tick → UI 更新文字
                        ├── 物品变更 → item:gain/lose → UI 播放 Toast
                        ├── CG 变化 → cg:enter/leave → UI 显示 CG
                        ├── 角色变化 → characters:change → UI 更新立绘
                        ├── 场景变化 → step:enter → UI 切换背景
                        ├── 特效变化 → effect:change → UI 切换粒子效果
                        └── 分支选项 → choice:present → UI 显示选项面板
```

### 存档 / 读档

```
存档: GalEngine.save(slotId) → GameState.snapshot() → JSON → SaveManager(localStorage)
读档: SaveManager → JSON → GameState.restore(snapshot) → 状态同步事件 → UI 恢复
```

## 关键模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| `GalEngine` | 剧情推进、步骤执行、分支处理、结局判定 | EventEmitter, GameState, SaveManager |
| `GameState` | 运行时状态容器的不可变快照 | 无 |
| `EventEmitter` | 事件发布/订阅 | 无 |
| `SaveManager` | localStorage 存档持久化（16槽） | 无 |
| `EffectsManager` | DOM 粒子特效（rain/snow/sakura/fire等） | CustomEffectLoader |
| `ResourceManager` | 资源包加载（目录/ZIP）与解析 | PackValidator |
| `useEngine` (composable) | 引擎 ↔ Vue 响应式桥接 | GalEngine, EffectsManager, ResourceManager |
| `useScale` (composable) | 画布自适应缩放 | 无 |
| `useToast` (composable) | 通知队列管理 | 无 |

## 关键技术选型

- **UI 框架**：Vue 3 (CDN, 无构建步骤)
- **特效引擎**：原生 DOM + CSS 动画（无 Canvas/WebGL 依赖）
- **存档方式**：localStorage（纯浏览器端）
- **数据格式**：原生 ES Module → JSON
- **资源包打包**：Python 脚本 (`scripts/pack.py`)
- **ZIP 支持**：JSZip (CDN)
- **响应式设计**：固定比例 (1280×720) + 自适应缩放 + 移动端支持

# GalEngine 内核文档

## 概述

`GalEngine` 是一个框架无关的视觉小说引擎内核，位于 `engine/` 目录下。它不依赖任何 UI 框架，通过事件系统与表现层通信。

## 核心类

### GalEngine (`engine/core/engine.js`)

引擎主类，继承自 `EventEmitter`。

#### 构造参数

```js
const engine = new GalEngine({
    chapters,    // { chapterId: Step[] } — 章节数据
    characters,  // { charId: Character } — 角色配置
    scenes,      // { sceneId: Scene } — 场景配置
    cgLibrary,   // { cgId: CG } — CG 图鉴
    items,       // { itemId: Item } — 物品配置
    endings,     // Ending[] — 结局列表
    config,      // { title, aspectRatio, textSpeed } — 全局配置
    homeConfig,  // { backgroundUrl, screenEffect, ... } — 首页配置
});
```

#### 核心 API

| 方法 | 说明 |
|------|------|
| `start(chapterId, stepIndex)` | 开始新游戏，重置状态 |
| `advance()` | 推进剧情（点击响应），返回 `'typing'` / `'advance'` / `'choice'` / `'ending'` / `'end'` |
| `selectChoice(choice)` | 选择分支选项 |
| `save(slotId, meta)` | 存档（快照到 SaveManager） |
| `load(slotId)` | 读档（从 SaveManager 恢复） |
| `rollbackToLog(logIndex)` | 回滚到指定历史记录 |
| `hook(name, fn)` | 注册打字机/物品 Toast 等钩子 |

#### 事件系统

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `step:enter` | `step` | 进入新步骤 |
| `game:start` | `{ chapterId, stepIndex }` | 游戏开始 |
| `character:change` | `{ charId, data }` | 单个角色变更 |
| `characters:change` | `chars` | 舞台角色批量变更 |
| `effect:change` | `{ effects, screenEffect }` | 特效变更 |
| `effect:screen` | `effect` | 屏幕粒子特效 |
| `cg:enter` | `cg` | CG 进入 |
| `cg:update` | `cg` | CG 更新 |
| `cg:leave` | `cg` | CG 离开 |
| `cg:cleared` | 无 | CG 清除 |
| `typewriter:start` | `{ text, speed }` | 打字机开始 |
| `typewriter:tick` | `{ text, char, index }` | 打字机逐字 |
| `typewriter:done` | `{ text }` | 打字机完成 |
| `item:gain` | `{ itemId, approach }` | 获得物品 |
| `item:lose` | `{ itemId, approach }` | 失去物品 |
| `item:update` | `{ id, mode, approach }` | 物品更新 |
| `choice:present` | `choices` | 呈现分支选项 |
| `choice:selected` | `choice` | 选中分支选项 |
| `ending:trigger` | `ending` | 触发结局 |
| `history:push` | `logEntry` | 历史记录追加 |

### GameState (`engine/core/state.js`)

运行时的状态容器，提供不可变快照。

**状态字段：**

```
currentChapterId  — 当前章节 ID
currentStepIndex  — 当前步骤索引
gameState         — { money, inventory[], flags{} }
stageCharacters   — { charId: { spriteId, position, ... } }
historyLogs       — 对话历史记录数组
lastSpeakerId     — 上一个发言角色
activeCG          — 当前激活的 CG
activeEffects     — 当前激活效果列表
currentScreenEffect — 屏幕粒子特效
pendingEnding     — 待触发的结局
typedText         — 打字机已打出文本
typingFinished    — 打字机是否完成
```

**关键方法：** `snapshot()` / `restore(snap)` — 用于存档序列化与恢复。

### EventEmitter (`engine/core/event-emitter.js`)

轻量级事件系统，支持：
- `on(event, fn)` — 注册监听，返回取消函数
- `once(event, fn)` — 一次性监听
- `off(event, fn)` — 移除监听
- `emit(event, ...args)` — 触发事件
- 命名空间事件名（如 `step:enter`）

### SaveManager (`engine/storage/save-manager.js`)

基于 `localStorage` 的存档管理器：
- 16 个存档槽位
- 自动生成存档时间戳
- 画廊 / 结局成就持久化（独立 key）
- 已游览章节跟踪（独立 key `gal_chapters_visited`）
- 存档数据包含完整状态快照

**画廊 / 结局 / 章节成就 API：**

| 方法 | 说明 |
|------|------|
| `getGallery()` | 获取已解锁 CG 图鉴 `{ cgId: true }` |
| `unlockGallery(id)` | 解锁 CG |
| `getEndings()` | 获取已解锁结局 `{ endingId: true }` |
| `unlockEnding(id)` | 解锁结局 |
| `getVisitedChapters()` | 获取已游览章节 `{ chapterId: { visitedAt } }` |
| `visitChapter(id)` | 记录章节已游览 |

## 步骤类型 (Step Types)

每个步骤是一个对象，通过 `type` 字段区分类型：

### dialogue — 对话步骤

```js
{
    sceneId: 'tavern_interior',   // 场景 ID
    type: 'dialogue',             // 步骤类型
    characterId: 'player',        // 说话角色
    text: '对话内容...',          // 显示文本
    effects: ['vignette'],        // 屏幕效果列表
    screenEffect: 'rain',         // 粒子特效
    cgChanges: { action: 'enter', id: 'old_photo', animation: 'scaleIn' },
    gainItem: 'amulet',           // 获得物品
    gainApproach: 'receive',      // 获得方式
    loseItem: 'dagger',           // 失去物品
    flag: 'read_letter',          // 设置 flag
    jumpChapter: 'meet_elysia',   // 跳转章节
}
```

### choice — 分支选项步骤

```js
{
    sceneId: 'forest_path',
    type: 'choice',
    characterId: null,            // 无说话者
    text: '你做出选择：',
    choices: [
        { text: '选项A', flag: 'path_a', jumpChapter: 'chapter_a' },
        { text: '选项B', flag: 'path_b', gainItem: 'sword' },
        { text: '选项C', flag: 'path_c', jumpChapter: '_end_bad_end' },
    ]
}
```

`choices` 中的每个选项支持：`text`、`flag`、`jumpChapter`、`gainItem`、`loseItem`、`updateItem`、`loseMoney` 等。

### jump — 无声跳转步骤

```js
{
    type: 'jump',
    jumpChapter: 'next_chapter'   // 无条件跳转
}
```

### 跳转目标约定

- 普通章节跳转：直接写章节 ID（如 `'forest_explore'`）
- 结局跳转：`_end_<endingId>` 格式（如 `'_end_bad_end'`），跳转后直接触发结局

## 其它引擎模块

### EffectsManager (`engine/effects/effects-manager.js`)

DOM 粒子特效引擎，无需 Canvas。

支持特效类型：
- `rain` — 雨
- `snow` — 雪
- `sakura` — 樱花
- `fire` — 火焰
- `stardust` — 星尘
- `bloodmoon` — 血色月光
- `corruption` — 黑暗腐蚀
- `template` — 基于 emoji + 动画模板
- `custom` — 自定义 JS + CSS 特效

使用方式：
```js
const fx = new EffectsManager(containerElement);
fx.play('snow?density=30,speed=50');
fx.play({ type: 'rain', density: 25 });
fx.clear();
```

### ResourceManager (`engine/resource/resource-manager.js`)

资源包加载管理器，支持：
- 从 HTTP 目录路径加载
- 从 ZIP 文件导入
- 解析 pack.json 清单
- 递归加载所有 JSON 配置和章节
- 输出引擎兼容的标准数据格式

详见[资源包系统](resource-pack.md)。

### 物品辅助函数 (`engine/resource/item-helpers.js`)

与数据源无关的可移植函数：
- `getDynamicItemDescription(itemId, flags, items)` — 根据 flag 动态获取物品描述
- `getItemIcon(itemId, items)` — 获取物品图标
- `getItemName(itemId, items)` — 获取物品名称
- `DEFAULT_ITEM_ANIMATION_PRESETS` — 默认物品动画预设

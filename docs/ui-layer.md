# UI 表现层文档

## 概述

UI 层使用 Vue 3（通过 CDN 引入，无构建步骤），位于 `app/` 目录。负责所有视觉呈现和用户交互，所有游戏逻辑委托给 GalEngine 内核。

## 应用入口 (`app/app.js`)

`index.html` 中直接挂载 Vue 3 应用，采用 Options API（无 SFC，纯 JS 模板）。

**核心职责：**
- 创建 Vue 根实例
- 初始化引擎桥接 (`useEngine`)
- 初始化缩放适配 (`useScale`)
- 初始化 Toast 通知 (`useToast`)
- 定义视图切换逻辑（菜单 view ↔ 游戏 view）
- 处理用户输入事件

**视图状态机：**

```
currentView = 'menu'   → 主菜单界面
currentView = 'game'   → 游戏主界面（含存档/设置面板）
```

## Composables

### useEngine (`app/composables/use-engine.js`)

引擎 ↔ Vue 的响应式桥接层，是整个架构中最关键的适配器。

**功能：**

1. **引擎初始化** — 从静态导入或资源包创建 GalEngine 实例
2. **响应式映射** — 将引擎状态（当前章节、步骤、物品等）映射为 Vue `ref`
3. **事件绑定** — 订阅引擎事件并同步到 Vue 响应式状态
4. **资产包管理** — 加载/导入/导出资源包
5. **UI 特有逻辑** — 物品 Toast 队列、粒子特效管理、场景背景检测

**暴露的响应式状态（ref）：**

```
currentView          — 当前视图 ('menu' | 'game')
currentChapterId     — 当前章节
currentStepIndex     — 当前步骤索引
gameState            — { money, inventory[], flags{} }
stageCharacters      — 舞台角色
historyLogs          — 历史记录
activeCG             — 当前 CG
activeEffects        — 激活效果列表
currentScreenEffect  — 屏幕粒子特效
triggeredEnding      — 触发的结局
typedText            — 打字机文本
typingFinished       — 打字机是否完成
stageDisplayItem     — 物品展示
```

**暴露的方法：**

```
initEngine(data)           — 从 JS 数据初始化引擎
loadPackFromPath(path)     — 从目录加载资源包
importPackFromZip(file)    — 从 ZIP 导入资源包
exportCurrentAsPack()       — 导出当前数据为资源包
startNewGame()             — 开始新游戏
advanceStory()             — 推进剧情
selectChoice(choice)       — 选择选项
rollbackToTimeline(idx)    — 回滚对话历史
saveGame(slotId)           — 存档
loadGame(slotId)           — 读档
exitToMenu()               — 返回主菜单
```

### useScale (`app/composables/use-scale.js`)

自适应缩放适配器。

**功能：**
- 固定画布比例（1280×720）自适应视口
- 自动计算缩放比例 `scale`
- 响应窗口 resize 和方向变化
- 区分横竖屏和移动端
- 返回 `scale`、`displayW`、`displayH`、`isLandscape`、`isMobile` 等

### useToast (`app/composables/use-toast.js`)

轻量级通知队列管理，处理游戏中非阻塞提示信息。

## 视图与面板

### 主菜单 (menu view)

```
├── 游戏标题
├── [▶ 继续游戏]         → 从上次退出暂存点继续（仅在有暂存时显示）
├── [从已有存档继续]     → 打开存档面板
├── [新的旅程]          → 开始新游戏
├── [角色名录]          → 角色详情面板
├── [画廊 CG 图鉴]     → CG 收集展示 + 结局 + 章节 + 清除记忆
└── 背景粒子特效 (snow)
```

### 游戏主界面 (game view)

```
┌─────────────────────────────────────────┐
│  场景背景图 + 粒子特效                  │
│  ┌──────────────────────────────────┐   │
│  │  角色立绘（左右位置）             │   │
│  │  CG 图片（遮罩层）                │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  对话文本框                       │   │
│  │  角色名 + 说话人颜色              │   │
│  │  打字机效果文本                   │   │
│  └──────────────────────────────────┘   │
│  ┌───┬─────┬──────┬──────┬───────┐    │
│  │ ⚙ │ 📦 │ 📖 │ 💾 │ 🚪 │    │ 底部工具栏
│  └───┴─────┴──────┴──────┴───────┘    │
└─────────────────────────────────────────┘
```

**底部工具栏按钮：**
- ⚙ — 设置面板
- 📦 — 背包/物品栏
- 📖 — 对话历史
- 💾 — 存档/读档
- 🚪 — 退出暂存（保存当前进度并返回主菜单）

### 退出暂存与继续游戏

游戏过程中点击「🚪 退出暂存」会：

1. **自动保存当前状态**到 `localStorage`（`gal_exit_save` key），包含章节、步骤、物品、flag 等完整快照
2. 返回主菜单
3. 主菜单顶部出现「▶ 继续游戏」按钮（桃红色高亮），点击直接恢复退出时的进度

**注意**：触发任何结局后自动清除退出暂存，避免结局后误点继续。

### 画廊面板

画廊分为四个区域：

| 区域 | 内容 |
|------|------|
| **CG 图鉴** | 剧情中解锁的 CG 图片，带标题和副标题 |
| **结局收集** | 所有结局卡片，已解锁显示标题/描述，未锁定显示占位文本 |
| **已启程的篇章** | 所有章节卡片，已游览显示章节目录+简介，未抵达显示锁定状态 |
| **清除所有记忆** | 底部 95% 宽度按钮，**长按 3 秒**（带填充动画+抖动效果）后弹出确认对话框 |

清除所有记忆会删除：画廊解锁、结局记录、章节进度、所有存档槽位、退出暂存。

### 自定义对话框系统

引擎提供三种对话框类型，替代浏览器原生 `alert/confirm/prompt`，所有文本和按钮均可自定义：

```js
// alert — 单一确认按钮
engineCtx.showDialog({
    type: 'alert',
    title: '提示',
    message: '操作已完成。',
    confirmText: '确定',
})

// confirm — 确认/取消
engineCtx.showDialog({
    type: 'confirm',
    title: '确认删除',
    message: '确定要删除吗？\n此操作不可撤销。',
    confirmText: '删除',
    cancelText: '取消',
    confirmDisabled: false,  // 可禁用确认按钮
    cancelDisabled: false,   // 可禁用取消按钮
}).then(result => {
    if (result === true) { /* 用户确认 */ }
})

// prompt — 文本输入
engineCtx.showDialog({
    type: 'prompt',
    title: '输入名称',
    message: '请输入新章节名称：',
    placeholder: '章节 ID',
    promptValue: '',
    confirmText: '确定',
    cancelText: '取消',
}).then(result => {
    if (result !== null) { /* 用户输入了: result */ }
})
```

`showDialog()` 返回 Promise：
- **alert 确定** → resolve `true`
- **confirm 确定** → resolve `true`，取消 → resolve `null`
- **prompt 确定** → resolve 输入的字符串，取消 → resolve `null`

点击遮罩层背景也会 resolve `null`。

## 全局键盘快捷键

| 按键 | 功能 | 条件 |
|------|------|------|
| **ESC** | 关闭当前弹窗/面板（灯箱→物品栏→对话框→游戏面板→菜单面板→物品提示） | 不限制 |
| **Space** | 推进剧情（等价于点击） | 仅游戏视图 |
| **Ctrl+S** | 快速存档（自动选空槽位，全满时覆盖 SLOT 01） | 仅游戏视图 |
| **Ctrl+O** | 打开存档面板（读档模式） | 全部视图 |
| **Ctrl+N** | 新开游戏 | 仅主菜单视图 |

所有快捷键在 `<input>` / `<textarea>` / `<select>` / `contenteditable` 获得焦点时自动屏蔽，避免误触发。

### 分支选项面板

当步骤 `type === 'choice'` 时，以卡片列表形式展示所有选项。

### 物品 Toast

获得/失去物品时的弹出动画，支持不同类型的动画预设（寻获、赠予、封印解除、消耗等）。

## 样式系统

样式分 4 个 CSS 文件：

| 文件 | 用途 |
|------|------|
| `base.css` | 基础样式重置 + Flexbox 布局 + 排版 |
| `effects.css` | 粒子/过渡/物品动画关键帧 + 特效 CSS |
| `game.css` | 游戏界面样式（对话框、工具栏、选项面板等） |
| `menu.css` | 主菜单样式（标题、按钮、角色名录、画廊） |

## 移动端适配

- 通过 `viewport-fit=cover` 处理刘海屏
- `useScale` 响应式缩放
- 触摸事件支持
- 竖屏 / 横屏适配

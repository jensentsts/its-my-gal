# 开发指南

## 环境要求

- 现代浏览器（Chrome / Firefox / Edge / Safari）
- （可选）Python 3.6+ — 用于资源包打包
- （可选）本地 HTTP 服务器 — 用于测试资源包加载

## 快速开始

### 1. 运行游戏

直接在浏览器中打开 `index.html` 即可：

```bash
# 方式一：直接双击
open index.html          # macOS
start index.html         # Windows

# 方式二：本地 HTTP 服务器（推荐，资源包加载需要）
npx serve .
# 或
python -m http.server 8080
```

### 2. 使用编辑器

打开 `editor/editor.html` 即可启动剧情树编辑器。

### 3. 构建资源包

```bash
python scripts/pack.py          # 构建到 resource-packs/default/
python scripts/pack.py --zip    # 同时生成 ZIP
```

## 目录结构速查

| 目录 | 内容 | 开发时修改频率 |
|------|------|---------------|
| `engine/` | 引擎内核 | 低频（框架层） |
| `game/config/` | 角色/场景/物品等配置 | 中频 |
| `game/chapters/` | 故事剧本（步骤数组） | 高频 |
| `app/` | UI 层（Vue 3） | 中频 |
| `editor/` | 剧情编辑器 | 低频 |
| `assets/` | 图片资源 | 中频 |
| `scripts/pack.py` | 打包工具 | 低频 |

## 如何添加新章节

### 步骤 1：创建章节文件

在 `game/chapters/` 下创建新文件，如 `my-chapter.js`：

```js
export const chapter_my_chapter = [
    {
        sceneId: 'forest_gate',
        type: 'dialogue',
        characterId: 'player',
        text: '新的故事从这里开始...',
        effects: ['vignette'],
    },
    {
        type: 'choice',
        text: '你要怎么做？',
        choices: [
            { text: '往前走', jumpChapter: 'next_chapter' },
            { text: '回头', jumpChapter: '_end_bad_end' },
        ],
    },
];
```

### 步骤 2：注册章节

在 `game/index.js` 中导入并注册到 `STORY_CHAPTERS`：

```js
import { chapter_my_chapter } from './chapters/my-chapter.js';

export const STORY_CHAPTERS = {
    // ... 已有章节
    'my_chapter': chapter_my_chapter,
};
```

### 步骤 3：添加场景（如需新场景）

在 `game/config/scenes.js` 中添加场景定义。

### 步骤 4：添加结局（如需新结局）

在 `game/config/endings.js` 中添加结局定义。

## 如何添加新角色

在 `game/config/characters.js` 中添加角色对象：
- 设置 `name`、`color`、`race`、`role` 等基本属性
- 配置 `avatars`（头像）和 `sprites`（立绘）的图片 URL
- 将角色图片放入 `assets/characters/` 对应目录

## 如何添加新 CG

1. 将 CG 图片放入 `assets/cg/` 目录
2. 在 `game/config/cg-library.js` 中添加 CG 条目
3. 在章节步骤中使用 `cgChanges: { action: 'enter', id: 'your_cg_id', animation: 'scaleIn' }`

## 如何添加新物品

1. 在 `game/config/items.js` 的 `ITEMS` 中添加物品配置
2. 可选：在 `ITEM_ANIMATION_PRESETS` 中添加自定义动画预设
3. 在章节步骤中使用 `gainItem: 'itemId'` 让角色获得物品

## 如何添加新粒子特效

1. 在 `EffectsManager` (`engine/effects/effects-manager.js`) 中添加特效类型
2. 或通过 `template` 类型使用 emoji + CSS 动画快速创建特效
3. 在步骤中使用 `screenEffect: 'your_effect?density=30,speed=50'`

## 关于附身剧情的特殊说明

本项目中附身相关剧情（`possession_prelude`、`possession_event`、`body_explore`、`elysia_life`）的**文学创作规范和设定要求**记录在 `docs/story_exception.md` 中。该文件是 AI 写作提示，包含附身设定和撰写要求。

> ⚠️ **注意**：`story_exception.md` 不可修改。

## 调试技巧

### 检查引擎状态

```js
// 在浏览器控制台
engine.value.state.snapshot()  // 查看当前运行时状态
```

### 跳转到指定步骤

```js
// 跳过剧情
engine.value.start('main', 0);  // 从序章开始
engine.value.start('final_choice', 0);  // 直接跳到终局抉择
```

### 手动设置 Flag

```js
engine.value.state.setFlag('ancient_mural_read');
```

### 编辑器调试

- 编辑器修改后，刷新主应用页面即可看到效果
- 编辑器数据通过 `localStorage` 自动同步，主应用检测到新数据会合并

## 常见问题

**Q: 资源包加载失败怎么办？**
A: 浏览器安全策略限制 `file://` 协议下的 fetch 请求。请使用 HTTP 服务器访问。

**Q: 新增章节后编辑器看不到？**
A: 检查是否在 `game/index.js` 的 `STORY_CHAPTERS` 中注册了该章节。

**Q: 图片不显示？**
A: 检查 `assets/` 目录下是否有对应图片文件，以及 `url` 路径是否正确。样式表中定义了背景失败回退的 CSS 渐变。

**Q: 存档数据丢了？**
A: 存档存储在 `localStorage` 中，清除浏览器数据会导致存档丢失。

# 游戏数据文档

游戏数据是引擎的"燃料"，位于 `game/` 目录下。共 13 个章节和 6 个配置文件。

## 配置文件

### game-config.js

```js
export const GAME_CONFIG = {
    title: '幻象物语：阿瓦隆之觉醒',
    aspectRatio: { width: 1280, height: 720 },
    textSpeed: 25           // 打字机基本速度 (ms)
};

export const HOME_CONFIG = {
    backgroundUrl: 'assets/scenes/home_menu_bg.png',
    placeholderGradient: 'linear-gradient(135deg, #0e0e14 0%, #030305 100%)',
    screenEffect: 'snow',   // 首页粒子特效
    maskEffects: ['vignette', 'dim'],
    showOverlay: true,
    overlayOpacity: 0.65
};
```

### characters.js — 角色配置

定义三个主要角色：

| ID | 名称 | 种族 | 角色 |
|----|------|------|------|
| `player` | 安文 | 人类 | 冒险探求者 |
| `elysia` | 爱莉希雅 | 高等精灵 | 迷雾森林守护者 |
| `vargas` | 瓦尔加斯 | 魔族/堕落领主 | 封印守护者之敌 |

每个角色配置包含：`name`、`color`（主题色）、`race`、`gender`、`role`、`defaultSpeed`（打字速度）、`description`、`avatars`（头像映射）、`sprites`（立绘映射）。

爱莉希雅的特殊状态：`possessed`（附身状态）头像和立绘。

### scenes.js — 场景配置

9 个场景定义：

| ID | 标题 | 背景图 |
|----|------|--------|
| `tavern_interior` | 深夜酒馆 | tavern.jpg |
| `forest_gate` | 迷雾森林入口 | forest.png |
| `forest_path` | 幽暗林道 | forest_path.png |
| `secret_cavern` | 微光晶石洞窟 | cavern.jpg |
| `ancient_altar` | 古代巍峨祭坛 | altar.png |
| `sky_bg` | 崩坏苍穹 | sky.jpg |
| `ruins_entrance` | 远古遗迹廊道 | ruins_entrance.png |
| `altar_core` | 核心祭坛 | altar_core.png |
| `void` | 虚无空间 | void.jpg |

每个场景包含：`id`、`title`、`url`（背景图片）、`bgPlaceholder`（CSS 渐变回退）。

### items.js — 物品配置

4 个可交互物品：

| ID | 名称 | 图标 |
|----|------|------|
| `log` | 祖父的航海日志 | 📘 |
| `amulet` | 神秘传家护身符 | 📿 |
| `dagger` | 古代祭祀匕首 | 🗡️ |
| `crystal` | 阿瓦隆核心晶石 | 💎 |

物品支持 **动态描述**：根据游戏中的 flag 变化自动更新描述文字（如对照壁画后、驱魔仪式时）。

另包含 `ITEM_ANIMATION_PRESETS`：物品获取/失去/更新的动画预设，定义了 CSS class、标题和音效。

### cg-library.js — CG 图鉴

6 张 CG：

| ID | 标题 | 说明 |
|----|------|------|
| `old_photo` | 泛黄的旧照片 | Memory Fragment - The Old Days |
| `ancient_mural` | 石壁上的毁灭预言 | Prophecy Fragment - Ancient Wall |
| `boss_awaken` | 远古炎魔苏醒 | Desire Branch - The Slumbering Fire |
| `avalon_seal` | 重筑圣洁结界 | Hope Branch - The Last Light |
| `elysia_possession` | 暗影侵蚀 | The Fallen Guardian |
| `redemption_light` | 救赎之光 | Soul Liberated |

### endings.js — 结局定义

8 个结局：

| ID | 标题 | 类型 |
|----|------|------|
| `bad_end` | BAD END: 迷失于永恒之雾 | 坏结局 |
| `ruin_end` | BAD END: 灰烬世界 | 坏结局 |
| `trap_end` | BAD END: 傀儡的契约 | 坏结局 |
| `dark_possession_end` | 至暗结局·永夜的低语 | 至暗结局 |
| `sacrifice_end` | NORMAL END: 孤注一掷的燃刃 | 普通结局 |
| `hope_end` | TRUE END: 璀璨的破晓之光 | 真结局 |
| `true_end` | TRUE END: 阿瓦隆的新晨 | 真结局 |
| `redemption_end` | 救赎结局·灵魂的觉醒 | 救赎结局 |

## 章节故事线

### 主线流程 (推荐阅读顺序)

```
序章 (main)
  └─→ 初遇 · 森林守护者 (meet_elysia)
       └─→ 探索 · 幽暗林道 (forest_explore)
            └─→ 遗迹 · 远古之秘 (ruins_exploration)
                 └─→ 深入 · 迷雾核心 (forest_deep)
                      └─→ 附身前奏 (possession_prelude)
                           └─→ 附身事件 (possession_event)
                                └─→ 身体探索 (body_explore)
                                     └─→ 爱莉希雅的生活 (elysia_life)
                                          └─→ 终局抉择 (final_choice)
                                               ├─→ 救赎路线 (redemption_route)
                                               ├─→ 驱魔路线 (exorcism_route)
                                               └─→ 绝望路线 (desperate_route)
```

### 章节详细说明

| 章节 ID | 章节名 | 说明 |
|---------|--------|------|
| `main` | 序章：迷雾之邀 | 主人公安文收到祖父遗信，启程前往阿瓦隆森林 |
| `meet_elysia` | 初遇·森林守护者 | 在森林入口遇到精灵守护者爱莉希雅 |
| `forest_explore` | 探索·幽暗林道 | 深入森林，遭遇谜题与考验 |
| `ruins_exploration` | 遗迹·远古之秘 | 探索远古遗迹，发现壁画预言 |
| `forest_deep` | 深入·迷雾核心 | 接近迷雾中心，矛盾升级 |
| `possession_prelude` | 附身前奏 | 黑暗力量逼近，附身事件的前兆 |
| `possession_event` | 附身事件 | 核心附身情节，安文进入爱莉希雅的身体 |
| `body_explore` | 身体探索 | 附身后的身体认知与探索 |
| `elysia_life` | 爱莉希雅的生活 | 以精灵身份体验她的生活与社交 |
| `final_choice` | 终局抉择 | 分支点：三条路线选择 |
| `redemption_route` | 救赎路线 | 护身符 + 祷文，灵魂共鸣 |
| `exorcism_route` | 驱魔路线 | 驱魔仪式，驱逐黑暗 |
| `desperate_route` | 绝望路线 | 被黑暗吞噬的至暗结局 |

## 数据导出入口

`game/index.js` 将所有配置和章节汇总导出，作为引擎的"卡带"数据源。

```js
import { STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS, GAME_CONFIG } from './game/index.js';
```

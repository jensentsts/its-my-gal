# 幻象物语：阿瓦隆之觉醒 — 项目文档

> 基于 **GalEngine** 的视觉小说（Galgame）项目，使用 Vue 3 构建 UI 层，纯前端运行。

## 文档目录

| 文档 | 说明 |
|------|------|
| [项目概述](overview.md) | 项目简介、功能特性、技术栈概览 |
| [系统架构](architecture.md) | 整体架构、分层设计、数据流 |
| [GalEngine 内核](engine.md) | 引擎核心设计、API、事件系统、状态管理 |
| [游戏数据](game-data.md) | 故事章节、角色、场景、物品、结局配置 |
| [UI 表现层](ui-layer.md) | Vue 3 应用结构、组件、Composables |
| [编辑器](editor.md) | 剧情树节点编辑器功能与使用 |
| [资源包系统](resource-pack.md) | 资源包结构、打包工具、加载机制 |
| [开发指南](development.md) | 环境搭建、开发流程、扩展方式 |

## 项目结构总览

```
gal_game/
├── index.html             # 入口 HTML（Vue 3 + JSZip CDN）
├── engine/                # GalEngine 内核（框架无关）
│   ├── index.js           #   统一导出入口
│   ├── core/
│   │   ├── engine.js      #   引擎主类
│   │   ├── state.js       #   游戏运行时状态
│   │   └── event-emitter.js # 轻量级事件总线
│   ├── storage/
│   │   └── save-manager.js # 存档管理器 (localStorage)
│   ├── effects/
│   │   ├── effects-manager.js  # 粒子特效引擎 (DOM)
│   │   └── custom-effect-loader.js # 自定义特效加载器
│   └── resource/
│       ├── resource-manager.js  # 资源包加载管理
│       ├── pack-validator.js    # 资源包验证器
│       └── item-helpers.js      # 物品辅助函数
├── game/                  # 游戏数据（"卡带"）
│   ├── index.js           #   统一导出入口
│   ├── config/
│   │   ├── game-config.js #   游戏全局配置
│   │   ├── characters.js  #   角色配置库
│   │   ├── scenes.js      #   场景环境库
│   │   ├── items.js       #   物品配置 + 动画预设
│   │   ├── cg-library.js  #   CG 图鉴库
│   │   └── endings.js     #   结局定义
│   └── chapters/          #   故事章节（13个）
│       ├── prologue.js    #      序章：迷雾之邀
│       ├── meet-elysia.js #      初遇：森林守护者
│       ├── forest-explore.js #   探索：幽暗林道
│       ├── ruins-exploration.js # 遗迹：远古之秘
│       ├── forest-deep.js #      深入：迷雾核心
│       ├── possession-prelude.js # 附身前奏
│       ├── possession-event.js #  附身事件
│       ├── body-explore.js #     身体探索
│       ├── elysia-life.js #      爱莉希雅的生活
│       ├── final-choice.js #     终局抉择
│       ├── redemption-route.js # 救赎路线
│       ├── exorcism-route.js #   驱魔路线
│       └── desperate-route.js #  绝望路线
├── app/                   # UI 表现层 (Vue 3)
│   ├── app.js             #   Vue 应用入口
│   ├── composables/
│   │   ├── use-engine.js  #   引擎 ↔ Vue 桥接
│   │   ├── use-scale.js   #   自适应缩放
│   │   └── use-toast.js   #   Toast 通知
│   └── styles/
│       ├── base.css       #   基础样式
│       ├── effects.css    #   特效动画样式
│       ├── game.css       #   游戏界面样式
│       └── menu.css       #   主菜单样式
├── editor/                # 剧情树编辑器
│   ├── editor.html        #   编辑器入口
│   ├── editor-app.js      #   编辑器 Vue 应用
│   └── editor-styles.css  #   编辑器样式
├── assets/                # 静态资源（图片等）
├── resource-packs/        # 构建生成的资源包
│   └── default/           #   默认资源包
│       ├── pack.json
│       ├── config/
│       └── chapters/
├── scripts/
│   └── pack.py            # 资源包打包工具 (Python)
└── docs/                  # 项目文档
    ├── README.md
    └── ...
```

---

**游戏标题：** 幻象物语：阿瓦隆之觉醒  
**引擎：** GalEngine (自定义)  
**UI 框架：** Vue 3  
**运行方式：** 纯前端（浏览器打开 index.html 即可）

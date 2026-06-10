# 项目概述

## 游戏简介

**《幻象物语：阿瓦隆之觉醒》** 是一款基于自研 GalEngine 的视觉小说（Galgame）项目。讲述主人公安文继承祖父遗志，前往被迷雾笼罩的阿瓦隆森林，邂逅精灵守护者爱莉希雅，并在探索中遭遇附身事件与黑暗力量的故事。

核心主题包含：迷雾探索、跨越种族的羁绊、附身体验、灵魂共鸣。

## 游戏特性

- 🎮 **纯前端运行** — 浏览器打开即玩，无需后端、无需构建
- 📖 **13 章节分支剧情** — 4 条路线、8 种结局
- 🎨 **CG 图鉴系统** — 收集和解锁剧情关键 CG
- 👥 **角色名录** — 角色档案与立绘展示
- 💾 **存档/读档系统** — 16 槽位自由读写
- ✨ **DOM 粒子特效** — 雨、雪、樱花、火焰等多种环境效果
- 📦 **资源包系统** — 支持资源包打包、加载、切换
- ✏️ **剧情树编辑器** — 浏览器中的可视化编辑工具
- 📱 **移动端适配** — 自适应缩放，支持手机游玩

## 技术栈

| 层次 | 技术 |
|------|------|
| 运行时 | 纯前端（HTML + CSS + JS） |
| UI 框架 | Vue 3 (CDN, 无构建步骤) |
| 引擎内核 | 自研 GalEngine (框架无关) |
| 粒子特效 | 原生 DOM + CSS 动画 (无 Canvas) |
| 数据存储 | localStorage (存档/画廊) |
| 资源包格式 | JSON 目录结构 / ZIP |
| 构建工具 | Python 3 (资源包打包) |
| ZIP 支持 | JSZip (CDN) |

## 项目仓库

当前分支：`story-possession-refactor`  
主线分支：`master`

## 相关文档

| 文档 | 地址 |
|------|------|
| 系统架构 | [architecture.md](architecture.md) |
| 引擎内核 | [engine.md](engine.md) |
| 游戏数据 | [game-data.md](game-data.md) |
| UI 表现层 | [ui-layer.md](ui-layer.md) |
| 剧情编辑器 | [editor.md](editor.md) |
| 资源包系统 | [resource-pack.md](resource-pack.md) |
| 开发指南 | [development.md](development.md) |
| 附身创作规范 | [story_exception.md](story_exception.md) |

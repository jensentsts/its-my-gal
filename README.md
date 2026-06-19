> 一时Vibe一时爽，一直Vibe一直爽！（除了git commit，这是本项目唯一的人写的话了）

# GalEngine — 视觉小说引擎与编辑器

一个面向视觉小说（GalGame）的轻量引擎，配套图形式分支剧情编辑器。

## 项目结构

```
├── projects/
│   ├── engine/       # 游戏引擎核心
│   │   ├── core/     #   引擎循环、事件系统、状态管理
│   │   ├── resource/ #   资源包加载、验证、路径解析
│   │   ├── effects/  #   特效管理器
│   │   ├── storage/  #   存档/读档系统
│   │   └── story/    #   剧情调度、分支预判
│   │
│   ├── editor/       # 剧情编辑器
│   │   ├── cli/      #   命令行工具（资源管理、验证、导出、分析）
│   │   └── components/ #  编辑器 UI 组件
│   │
│   └── game/         # 游戏前端（浏览器运行时）
│       └── app/      #   Vue 组件、样式、挂载入口
│
├── resource-packs/   # 资源包（游戏内容，未纳入仓库）
│   └── default/
│       ├── pack.json       # 资源包清单
│       ├── config/         # 游戏配置（角色、场景、CG、物品…）
│       ├── chapters/       # 剧情章节（JSON 结构）
│       └── assets/         # 静态资源（图片等）
│
├── LICENSE           # MIT License
├── package.json      # Monorepo 工作区
└── index.html        # 入口页，重定向至 game/
```

## 核心特性

- **资源包体系** — 引擎与内容完全解耦，游戏内容以 `resource-packs/` 为单位加载，支持多包切换
- **分支剧情** — 树形剧情节点结构，支持条件跳转、结局分叉、多路线
- **编辑器 CLI** — 命令行工具管理资源、验证数据完整性、导出发布包、分析剧情结构
- **懒加载** — 按需加载章节，配合分支预判优化大型剧情加载体验
- **存档系统** — 基于 `localStorage` 的多槽位存档/读档
- **特效系统** — 场景过渡、立绘动画、粒子效果、屏幕遮罩等视觉表现

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动编辑器 CLI
pnpm cli

# 验证资源包完整性
pnpm validate

# 导出资源包
pnpm export
```

浏览器打开 `index.html` 或 `projects/game/index.html` 即可运行游戏。

## 技术栈

- **运行时** — 原生 JavaScript，无构建步骤，浏览器直接运行
- **前端** — Vue 3（CDN 加载，Composition API）
- **引擎** — 自定义剧情引擎，基于状态机的线性+分支剧情驱动
- **样式** — 纯 CSS，暗色主题，Canvas 粒子效果

## License

MIT — 详见 [LICENSE](LICENSE)

Copyright © 2026 jensentsts

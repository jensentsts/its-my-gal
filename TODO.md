# GalEngine TODO

## 近期

- [ ] **resource-packs 选择能力**
  - 游戏启动时 / 运行时支持选择加载哪个资源包
  - 编辑器支持切换编辑哪个资源包
  - 资源包元数据描述（名称、版本、作者、缩略图）
  - 支持从多个 resource-packs/ 子目录中选择，而非硬编码 `default`

## 中期

- [ ] **解除各 project 对 assets 的直接依赖**
  - 所有资源应完全通过 resource-packs 提供
  - `projects/game/` 不包含任何静态资源文件
  - `projects/editor/` 中的资源管理应完全基于 resource-packs

- [ ] **迁移至 TypeScript + Vue 桌面端项目**
  - galengine-engine → TS 库，可 npm 发布
  - galgame-game → Vue 3 + Vite + TS 桌面应用（Electron / Tauri）
  - galgame-editor → Vue 3 + Vite + TS 桌面应用（Electron / Tauri）
  - 引入构建工具链（Vite、TypeScript 编译）
  - 使用 `<script setup>` + Composition API 重构现有 Vue 组件
  - 移除 CDN 加载模式，改用 npm 包管理

## 远期

- [ ] **resource-packs 商店 / 社区市场**
  - 资源包格式标准化（.galpack）
  - 资源包预览、评分、下载
  - 支持 mod / DLC 资源包叠加加载

- [ ] **多语言支持**
  - 剧情文本 i18n
  - UI 界面 i18n

- [ ] **性能优化**
  - 虚拟列表优化超长章节编辑
  - 按需加载 / 流式加载大型资源包

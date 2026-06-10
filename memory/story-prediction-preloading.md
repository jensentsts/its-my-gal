---
name: story-prediction-preloading
description: 剧情分支预判与章节预加载优化系统
metadata:
  type: reference
---

# 剧情分支预判与预加载系统

实现了 engine/story/ 子系统，包含两个核心模块和一个完整的集成链路：

## 模块

### 1. BranchPredictor (`engine/story/branch-predictor.js`)
- `extractBranchPoints(steps, flags)` — 扫描章节步骤数组，提取所有跳转目标（jump/choice/ending）
- `rankNextChapters(branchPoints, flags)` — 基于 flags 加权排序，必达分支权重 +3，已满足条件的 flag 分支权重 +2
- `buildChapterGraph(chapters)` — 构建完整故事有向图（邻接表/入度/根叶节点）
- `deepPredict(steps, allChapters, maxDepth, flags)` — 多级深度预判（预测目标的后续分支）

### 2. ChapterLoader (`engine/story/chapter-loader.js`)
- **同步模式**：`initSync(chapters)` — 接收静态导入的全量章节数据
- **异步模式**：`setLoadFn(fn)` — 注册异步加载函数（与 ResourceManager.loadChapter 联动）
- `ensure(chapterId)` — 确保章节加载，返回 Promise
- `getChapter(chapterId)` — 同步获取已缓存的章节
- `preload(chapterIds)` — 后台静默预加载（批量化、错误隔离）
- `setCurrentChapter(chapterId, steps, flags)` — 设置当前章节并自动触发预判+预加载

## 集成链路

1. **engine/core/engine.js** — 新增 `chapter:change` 事件（在 start/advance/jump/choice/rollback/load 路径中发射）
2. **engine/resource/resource-manager.js** — 新增 `loadChapter(chapterId)` 单章加载 + `hasChapter()` + `lazyChapters` 选项
3. **app/composables/use-engine.js** — 创建 ChapterLoader 实例，监听 chapter:change 事件，自动执行 `_preloadOnChapterChange`

## 加载策略

- **静态导入模式**（默认）：所有章节已在内存中，预加载为 no-op，但预判日志仍可追踪
- **资源包懒加载模式**（`lazyChapters: true`）：只加载 entry chapters，后续按 BranchPredictor 的预判结果逐章异步 fetch
- **高优先级处理**：weight >= 3 的必达分支立即 `ensure`，其余章节放入后台批量预加载队列

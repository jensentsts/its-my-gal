/**
 * engine/story/index.js
 *
 * 故事系统模块统一导出入口。
 *
 * 提供：
 *  - StoryBranchPredictor 系列函数：分支预测、权重排序、图分析、深度预判
 *  - ChapterLoader：懒加载与智能预加载管理器
 */

export {
    extractBranchPoints,
    rankNextChapters,
    buildChapterGraph,
    deepPredict,
} from './branch-predictor.js';

export { ChapterLoader, CACHE_STATUS } from './chapter-loader.js';

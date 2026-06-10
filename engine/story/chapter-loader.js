/**
 * engine/story/chapter-loader.js
 *
 * ChapterLoader —— 章节懒加载与智能预加载管理器。
 *
 * 职责：
 *  - 章节数据缓存（内存级，支持同步/异步两种数据源）
 *  - 同步模式：静态 import 全量注入，零开销
 *  - 异步模式：按需 fetch + 后台预加载
 *  - 与 BranchPredictor 联动，自动预判并预加载可能的分支章节
 *  - 提供加载状态追踪，供 UI 层展示加载指示器
 *
 * 使用方式：
 *   // 同步模式（静态导入）
 *   const loader = new ChapterLoader();
 *   loader.initSync(STORY_CHAPTERS);
 *   loader.setCurrentChapter('main', flags); // 自动预判+预加载
 *
 *   // 异步模式（ResourceManager）
 *   const loader = new ChapterLoader();
 *   loader.setLoadFn((id) => resourceManager.loadChapter(id));
 *   await loader.ensure('main');
 *   loader.setCurrentChapter('main');
 */

import { extractBranchPoints, rankNextChapters } from './branch-predictor.js';

/** 默认预加载批次大小（并发 fetch 数） */
const PRELOAD_BATCH_SIZE = 3;

/** 缓存条目状态 */
const CACHE_STATUS = {
    MISSING: 0,
    LOADING: 1,
    READY: 2,
    ERROR: 3,
};

export class ChapterLoader {
    constructor(options = {}) {
        this._options = {
            batchSize: options.batchSize || PRELOAD_BATCH_SIZE,
            onProgress: options.onProgress || null, // (chapterId, status) => void
        };

        /** @type {Map<string, { status: number, data: any, promise: Promise|null }>} */
        this._cache = new Map();

        /** @type {Function|null} 异步加载函数 (chapterId) => Promise<steps[]> */
        this._loadFn = null;

        /** @type {Set<string>} 待预加载队列 */
        this._preloadQueue = new Set();

        /** @type {boolean} 是否正在执行预加载 */
        this._preloadActive = false;

        /** @type {number} 命中/未命中统计 */
        this._stats = { hits: 0, misses: 0, preloads: 0 };

        /** @type {string|null} 当前活跃章节 ID */
        this._currentChapterId = null;
    }

    // ====================================================================
    //  模式配置
    // ====================================================================

    /**
     * 同步初始化 —— 全量注入（适用于静态 import 场景）
     * @param {Object<string, Array>} chapters - { chapterId: steps[] }
     */
    initSync(chapters) {
        if (!chapters || typeof chapters !== 'object') return;
        for (const [id, steps] of Object.entries(chapters)) {
            this._cache.set(id, { status: CACHE_STATUS.READY, data: steps, promise: null });
        }
    }

    /**
     * 注册异步加载函数
     * @param {Function} fn - (chapterId: string) => Promise<steps[]>
     */
    setLoadFn(fn) {
        this._loadFn = fn;
    }

    /**
     * 获取总章节数
     */
    get size() {
        return this._cache.size;
    }

    /**
     * 统计信息
     */
    get stats() {
        return { ...this._stats, cached: this._cache.size };
    }

    // ====================================================================
    //  核心 API
    // ====================================================================

    /**
     * 同步获取章节数据（仅适用于已缓存的章节）
     * @param {string} chapterId
     * @returns {Array|null}
     */
    getChapter(chapterId) {
        const entry = this._cache.get(chapterId);
        if (entry && entry.status === CACHE_STATUS.READY) {
            this._stats.hits++;
            return entry.data;
        }
        this._stats.misses++;
        return null;
    }

    /**
     * 检查章节是否已就绪
     * @param {string} chapterId
     * @returns {boolean}
     */
    has(chapterId) {
        const entry = this._cache.get(chapterId);
        return !!(entry && entry.status === CACHE_STATUS.READY);
    }

    /**
     * 检查章节是否正在加载中
     * @param {string} chapterId
     * @returns {boolean}
     */
    isLoading(chapterId) {
        const entry = this._cache.get(chapterId);
        return !!(entry && entry.status === CACHE_STATUS.LOADING);
    }

    /**
     * 确保章节已加载，如尚未加载则触发异步加载
     * @param {string} chapterId
     * @returns {Promise<Array>}
     */
    async ensure(chapterId) {
        // 已就绪 → 直接返回
        const existing = this._cache.get(chapterId);
        if (existing && existing.status === CACHE_STATUS.READY) {
            return existing.data;
        }

        // 正在加载 → 复用已有 Promise
        if (existing && existing.promise) {
            return existing.promise;
        }

        // 没有加载器 → 报错
        if (!this._loadFn) {
            const err = new Error(`[ChapterLoader] 章节 "${chapterId}" 未缓存且无异步加载器可用`);
            this._cache.set(chapterId, { status: CACHE_STATUS.ERROR, data: null, promise: null });
            throw err;
        }

        // 发起加载
        const promise = this._loadFn(chapterId)
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error(`章节 "${chapterId}" 数据格式错误：期望数组，得到 ${typeof data}`);
                }
                this._cache.set(chapterId, { status: CACHE_STATUS.READY, data, promise: null });
                this._emitProgress(chapterId, 'ready');
                return data;
            })
            .catch(err => {
                this._cache.set(chapterId, { status: CACHE_STATUS.ERROR, data: null, promise: null });
                this._emitProgress(chapterId, 'error');
                throw err;
            });

        this._cache.set(chapterId, { status: CACHE_STATUS.LOADING, data: null, promise });
        this._emitProgress(chapterId, 'loading');

        return promise;
    }

    /**
     * 静默预加载多个章节（后台执行，不抛出错误）
     * @param {string|string[]} chapterIds
     */
    preload(chapterIds) {
        const ids = Array.isArray(chapterIds) ? chapterIds : [chapterIds];
        for (const id of ids) {
            if (!this._cache.has(id) || this._cache.get(id).status === CACHE_STATUS.ERROR) {
                this._preloadQueue.add(id);
            }
        }
        this._flushPreload();
    }

    /**
     * 设置当前章节，触发自动预判 + 预加载
     * @param {string} chapterId
     * @param {Object} [steps] - 可选，不传则从缓存读取
     * @param {Object} [flags={}] - 当前游戏 flags，用于加权排序
     * @param {number} [predictDepth=1] - 预判深度
     */
    setCurrentChapter(chapterId, steps, flags = {}, predictDepth = 1) {
        this._currentChapterId = chapterId;

        if (!steps) {
            const entry = this._cache.get(chapterId);
            if (entry && entry.status === CACHE_STATUS.READY) {
                steps = entry.data;
            }
        }

        if (!Array.isArray(steps)) return;

        // 预判下一跳
        const branchPoints = extractBranchPoints(steps, flags);
        const ranked = rankNextChapters(branchPoints, flags);

        // 收集需要预加载的目标
        const toPreload = ranked.map(r => r.chapterId);

        // 如果开启了深度预测，追加二级目标
        if (predictDepth >= 2) {
            for (const target of branchPoints.targets) {
                const targetSteps = this.getChapter(target);
                if (targetSteps) {
                    const deeper = extractBranchPoints(targetSteps, flags);
                    for (const dt of deeper.targets) {
                        if (!toPreload.includes(dt)) {
                            toPreload.push(dt);
                        }
                    }
                }
            }
        }

        if (toPreload.length > 0) {
            this._stats.preloads += toPreload.length;
            this.preload(toPreload);
        }
    }

    /**
     * 获取当前活跃章节 ID
     * @returns {string|null}
     */
    getCurrentChapterId() {
        return this._currentChapterId;
    }

    /**
     * 获取所有已就绪的章节 ID 列表
     * @returns {string[]}
     */
    getLoadedChapters() {
        const result = [];
        for (const [id, entry] of this._cache) {
            if (entry.status === CACHE_STATUS.READY) {
                result.push(id);
            }
        }
        return result;
    }

    /**
     * 获取正在加载或已出错的章节
     * @returns {{ loading: string[], errors: string[] }}
     */
    getPendingChapters() {
        const loading = [];
        const errors = [];
        for (const [id, entry] of this._cache) {
            if (entry.status === CACHE_STATUS.LOADING) loading.push(id);
            if (entry.status === CACHE_STATUS.ERROR) errors.push(id);
        }
        return { loading, errors };
    }

    /**
     * 重置所有加载状态
     */
    reset() {
        this._cache.clear();
        this._preloadQueue.clear();
        this._preloadActive = false;
        this._currentChapterId = null;
        this._stats = { hits: 0, misses: 0, preloads: 0 };
    }

    // ====================================================================
    //  内部
    // ====================================================================

    _flushPreload() {
        if (this._preloadActive || this._preloadQueue.size === 0) return;
        this._preloadActive = true;

        // 使用 Promise.allSettled 静默执行预加载，不让加载失败影响主流程
        const drain = async () => {
            while (this._preloadQueue.size > 0) {
                const batch = [...this._preloadQueue].slice(0, this._options.batchSize);
                for (const id of batch) {
                    this._preloadQueue.delete(id);
                }
                await Promise.allSettled(batch.map(id => this.ensure(id)));
            }
            this._preloadActive = false;
        };

        // 用微任务延迟执行，避免阻塞当前事件循环
        queueMicrotask(drain);
    }

    _emitProgress(chapterId, status) {
        if (typeof this._options.onProgress === 'function') {
            queueMicrotask(() => {
                this._options.onProgress(chapterId, status);
            });
        }
    }
}

export { CACHE_STATUS };
export default ChapterLoader;

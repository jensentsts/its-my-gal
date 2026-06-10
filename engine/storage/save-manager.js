/**
 * engine/storage/save-manager.js
 *
 * SaveManager —— 存档持久化层。
 *
 * 职责：
 *  - localStorage 读写
 *  - 多槽位管理（16格）
 *  - 画廊 / 结局成就持久化
 *  - 存档元数据（时间戳、摘要）自动生成
 */
export class SaveManager {
    constructor(options = {}) {
        this._slotKey     = options.slotKey     || 'gal_matrix_save_slots';
        this._galleryKey  = options.galleryKey  || 'gal_gallery_achievements';
        this._endingsKey  = options.endingsKey  || 'gal_endings_achievements';
        this._chaptersKey = options.chaptersKey || 'gal_chapters_visited';
        this._maxSlots    = options.maxSlots    || 16;
    }

    // ---- 存档槽位 ----

    save(slotId, data) {
        const all = this.getAll();
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        all[slotId] = {
            ...data,
            saveTime: data.saveTime || timeStr,
            savedAt: now.getTime()
        };

        try {
            this._writeSlots(all);
            return true;
        } catch (e) {
            // _writeSlots 已打印错误，这里再尝试单独保存该槽位
            console.warn(`[SaveManager] 批量写入失败，尝试单独保存槽位 ${slotId}...`);
            try {
                const singleSlot = { [slotId]: all[slotId] };
                const testJson = JSON.stringify(singleSlot);
                localStorage.setItem(this._slotKey + '_tmp', testJson);
                // 如果单独能写入，则用单独数据覆盖全部存档
                const existing = this.getAll();
                existing[slotId] = all[slotId];
                // 只保留最近的 5 个 + 当前槽位
                const keys = Object.keys(existing).sort((a, b) => (existing[b].savedAt || 0) - (existing[a].savedAt || 0));
                const keep = keys.slice(0, Math.min(5, keys.length));
                const compacted = {};
                for (const k of keep) compacted[k] = existing[k];
                compacted[slotId] = all[slotId];
                this._writeSlots(compacted);
                console.log(`[SaveManager] ✅ 单独槽位 ${slotId} 保存成功（已压缩）`);
                return true;
            } catch (e2) {
                console.error(`[SaveManager] ❌ 槽位 ${slotId} 保存彻底失败:`, e2.message);
                // 清理临时数据
                try { localStorage.removeItem(this._slotKey + '_tmp'); } catch {}
                throw e2;
            }
        }
    }

    load(slotId) {
        const all = this.getAll();
        return all[slotId] || null;
    }

    clear(slotId) {
        const all = this.getAll();
        delete all[slotId];
        this._writeSlots(all);
        return true;
    }

    getAll() {
        try {
            const raw = localStorage.getItem(this._slotKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    _writeSlots(data) {
        try {
            const json = JSON.stringify(data);
            // 预估大小，超过 4MB 发出警告
            const estimatedSize = typeof Blob !== 'undefined' ? new Blob([json]).size : json.length;
            if (estimatedSize > 4 * 1024 * 1024) {
                console.warn(`[SaveManager] 存档体积过大 (约 ${(estimatedSize / 1024 / 1024).toFixed(1)}MB)，建议清理旧存档`);
                // 自动压缩：仅保留最近 8 个槽位
                const keys = Object.keys(data).sort((a, b) => (data[b].savedAt || 0) - (data[a].savedAt || 0));
                if (keys.length > 8) {
                    const keep = keys.slice(0, 8);
                    const compacted = {};
                    for (const k of keep) compacted[k] = data[k];
                    data = compacted;
                    const retryJson = JSON.stringify(data);
                    const retrySize = typeof Blob !== 'undefined' ? new Blob([retryJson]).size : retryJson.length;
                    if (retrySize > 4 * 1024 * 1024) {
                        console.warn(`[SaveManager] 压缩后仍为 ${(retrySize / 1024 / 1024).toFixed(1)}MB，进一步精简...`);
                        // 进一步精简单个槽位数据
                        for (const k of Object.keys(data)) {
                            if (data[k].historyLogs && data[k].historyLogs.length > 10) {
                                data[k] = { ...data[k], historyLogs: data[k].historyLogs.slice(-10) };
                            }
                        }
                    }
                    localStorage.setItem(this._slotKey, JSON.stringify(data));
                    return;
                }
            }
            localStorage.setItem(this._slotKey, json);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.error('[SaveManager] localStorage 配额不足，尝试清理旧数据...');
                // 尝试保留最近 5 个存档，删除其余的
                this._compactSlots(data);
            } else if (e.message && (e.message.includes('string') || e.message.includes('length'))) {
                // RangeError: Invalid string length — 单个值过大
                console.error('[SaveManager] 序列化字符串过大，尝试精简后重试...');
                // 对每个槽位精简 historyLogs
                for (const k of Object.keys(data)) {
                    if (data[k].historyLogs && Array.isArray(data[k].historyLogs)) {
                        data[k] = { ...data[k], historyLogs: data[k].historyLogs.slice(-5).map(log => {
                            const { snap: _s, textsFull: _t, ...rest } = log;
                            return rest;
                        }) };
                    }
                    // 精简 stageCharacters 到大头贴模式（只保留 id）
                    if (data[k].stageCharacters && typeof data[k].stageCharacters === 'object') {
                        const minimal = {};
                        for (const [id, ch] of Object.entries(data[k].stageCharacters)) {
                            minimal[id] = { id, spriteId: ch?.spriteId || 'idle', url: '', animation: '' };
                        }
                        data[k] = { ...data[k], stageCharacters: minimal };
                    }
                    // 清除 activeCG 大图
                    if (data[k].activeCG) {
                        data[k] = { ...data[k], activeCG: null };
                    }
                }
                try {
                    localStorage.setItem(this._slotKey, JSON.stringify(data));
                    console.log('[SaveManager] ✅ 精简重试成功');
                    return;
                } catch (e2) {
                    console.error('[SaveManager] 精简重试仍失败:', e2.message);
                    throw e2;
                }
            } else {
                console.error('[SaveManager] Failed to write slots:', e);
            }
            throw e; // 向上传递，让 engine 层处理
        }
    }

    /**
     * 存档紧凑：保留最近最多 5 个槽位
     */
    _compactSlots(data) {
        const keys = Object.keys(data).sort();
        const keep = Math.min(keys.length, 5);
        const toRemove = keys.slice(0, keys.length - keep);
        for (const k of toRemove) {
            delete data[k];
        }
        try {
            localStorage.setItem(this._slotKey, JSON.stringify(data));
            console.log(`[SaveManager] 已压缩存档，保留 ${keep} 个槽位`);
        } catch {
            console.error('[SaveManager] 压缩后仍无法写入，请清理浏览器存储');
        }
    }

    // ---- 画廊成就 ----

    getGallery() {
        try {
            const raw = localStorage.getItem(this._galleryKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    unlockGallery(id) {
        const g = this.getGallery();
        g[id] = true;
        localStorage.setItem(this._galleryKey, JSON.stringify(g));
    }

    // ---- 结局成就 ----

    getEndings() {
        try {
            const raw = localStorage.getItem(this._endingsKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    unlockEnding(id) {
        const e = this.getEndings();
        e[id] = true;
        localStorage.setItem(this._endingsKey, JSON.stringify(e));
    }

    // ---- 已游览章节跟踪 ----

    getVisitedChapters() {
        try {
            const raw = localStorage.getItem(this._chaptersKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    visitChapter(id) {
        const c = this.getVisitedChapters();
        if (!c[id]) {
            c[id] = { visitedAt: Date.now() };
            localStorage.setItem(this._chaptersKey, JSON.stringify(c));
        }
    }
}

export default SaveManager;

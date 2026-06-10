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

        this._writeSlots(all);
        return true;
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
            const estimatedSize = new Blob([json]).size;
            if (estimatedSize > 4 * 1024 * 1024) {
                console.warn(`[SaveManager] 存档体积过大 (约 ${(estimatedSize / 1024 / 1024).toFixed(1)}MB)，建议清理旧存档`);
            }
            localStorage.setItem(this._slotKey, json);
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('[SaveManager] localStorage 配额不足，尝试清理旧数据...');
                // 尝试保留最近 5 个存档，删除其余的
                this._compactSlots(data);
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
}

export default SaveManager;

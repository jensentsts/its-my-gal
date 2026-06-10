/**
 * engine/resource/resource-path-resolver.js
 *
 * 资源路径解析器 —— 根据数据结构层级，逐步拼接出完整资源路径。
 *
 * 设计动机：
 *   现有代码中大量重复书写完整路径（如 "assets/characters/elysia/sprites/idle.png"），
 *   实际上这些路径完全可以根据数据结构（characterId、spriteId、sceneId 等）自动推导。
 *   本模块实现"拼图式"路径构建，统一管理路径约定，并提供资源完整性校验。
 *
 * 路径约定（统一不带前导 /）：
 *   立绘:    assets/characters/{charId}/sprites/{spriteId}.png
 *   头像:    assets/characters/{charId}/avatar.{ext}
 *   场景:    assets/scenes/{sceneId}.{ext}
 *   CG:      assets/cg/{cgId}.{ext}
 *   物品:    assets/items/{itemId}.{ext}
 *   首页背景: assets/scenes/home_menu_bg.png
 */

export class ResourcePathResolver {
    /**
     * @param {Object} [options]
     * @param {string[]} [options.knownExtensions] 尝试检测的扩展名列表
     */
    constructor(options = {}) {
        this._knownExtensions = options.knownExtensions || ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    }

    // ================================================================
    //  路径构建
    // ================================================================

    /** 立绘路径：assets/characters/{charId}/sprites/{spriteId}.png */
    sprite(charId, spriteId) {
        if (!charId || !spriteId) return '';
        return `assets/characters/${charId}/sprites/${spriteId}.png`;
    }

    /** 头像路径：assets/characters/{charId}/avatar.{ext} */
    avatar(charId, key) {
        if (!charId) return '';
        const name = key || 'normal';
        // 尝试 .png，不存在时由调用方自行回退
        return `assets/characters/${charId}/avatar.${name}.png`;
    }

    /** 场景背景路径：assets/scenes/{sceneId}.{ext} */
    scene(sceneId, ext) {
        if (!sceneId) return '';
        return `assets/scenes/${sceneId}.${ext || 'png'}`;
    }

    /** CG 路径：assets/cg/{cgId}.{ext} */
    cg(cgId, ext) {
        if (!cgId) return '';
        return `assets/cg/${cgId}.${ext || 'png'}`;
    }

    /** 物品图片路径：assets/items/{itemId}.{ext} */
    item(itemId, ext) {
        if (!itemId) return '';
        return `assets/items/${itemId}.${ext || 'png'}`;
    }

    /** 首页背景 */
    homeBg() {
        return 'assets/scenes/home_menu_bg.png';
    }

    // ================================================================
    //  智能解析：兼容短路径（纯文件名）和完整路径
    // ================================================================

    /**
     * 智能解析资源路径。
     * 如果传入的 path 已经是完整路径（含 /），直接使用（向后兼容）；
     * 如果是纯文件名，根据类型和 ID 自动构建完整路径。
     *
     * @param {string} type  资源类型: 'sprite' | 'avatar' | 'scene' | 'cg' | 'item'
     * @param {string} id    资源主 ID（如 charId、sceneId）
     * @param {string} [variant] 变体 ID（如 spriteId、头像 key）
     * @param {string} [path] 可选的原始路径（来自 config）
     * @returns {string} 规范化后的完整路径
     */
    resolve(type, id, variant, path) {
        // 如果传入了显式路径且包含斜杠，视为完整路径直接使用
        if (path && path.includes('/')) {
            return this._normalize(path);
        }
        // 如果是纯文件名或空，按规则构建
        switch (type) {
            case 'sprite':
                return this.sprite(id, variant || path);
            case 'avatar':
                return this.avatar(id, variant || 'normal');
            case 'scene':
                return this.scene(id, this._extFromPath(path));
            case 'cg':
                return this.cg(id, this._extFromPath(path));
            case 'item':
                return this.item(id, this._extFromPath(path));
            default:
                return path || '';
        }
    }

    /** 从文件名推测扩展名 */
    _extFromPath(path) {
        if (!path) return 'png';
        const m = path.match(/\.(\w+)$/);
        return m ? m[1] : 'png';
    }

    /** 统一规范化：移除前导 / */
    _normalize(path) {
        if (!path) return '';
        return path.replace(/^\/+/, '');
    }

    // ================================================================
    //  资源完整性校验
    // ================================================================

    /**
     * 扫描游戏数据中的所有资源引用，验证文件是否存在。
     *
     * @param {Object} gameData - 完整游戏数据（CHARACTERS, SCENES, CG_LIBRARY 等）
     * @param {Object} [options]
     * @param {Function} [options.onCheck] 每检查一个文件时回调 (path) => void
     * @param {Set|Function} [options.fileExists] 文件存在性判断函数/集合
     *        Function: (path) => boolean | Promise<boolean>
     *        Set:      内含存在的路径字符串
     * @returns {Promise<{ ok: boolean, missing: Array<{ type: string, path: string, context: string }> }>}
     */
    async validateAll(gameData, options = {}) {
        const missing = [];
        const { onCheck, fileExists } = options;

        // 统一存在性检查接口
        const exists = fileExists
            ? (typeof fileExists === 'function' ? fileExists : (p) => fileExists.has(p))
            : null;

        // 收集所有资源路径
        const checks = [];

        // -- 角色立绘 & 头像 --
        const chars = gameData.CHARACTERS || {};
        for (const [charId, char] of Object.entries(chars)) {
            // 立绘
            if (char.sprites) {
                for (const [spId, sp] of Object.entries(char.sprites)) {
                    const path = this.resolve('sprite', charId, spId, sp.url);
                    if (path) checks.push({ type: '立绘', path, context: `${char.name || charId}/${sp.label || spId}` });
                }
            }
            // 头像
            if (char.avatars) {
                for (const [key, url] of Object.entries(char.avatars)) {
                    if (url && !url.startsWith('data:')) {
                        checks.push({ type: '头像', path: this._normalize(url), context: `${char.name || charId}/${key}` });
                    }
                }
            }
        }

        // -- 场景背景 --
        const scenes = gameData.SCENES || {};
        for (const [sceneId, sc] of Object.entries(scenes)) {
            if (sc.url) {
                checks.push({ type: '场景背景', path: this._normalize(sc.url), context: sc.title || sceneId });
            }
        }

        // -- CG --
        const cgLib = gameData.CG_LIBRARY || {};
        for (const [cgId, cg] of Object.entries(cgLib)) {
            if (cg.url) {
                checks.push({ type: 'CG', path: this._normalize(cg.url), context: cg.title || cgId });
            }
        }

        // -- 首页背景 --
        const homeCfg = gameData.HOME_CONFIG;
        if (homeCfg?.backgroundUrl) {
            checks.push({ type: '首页背景', path: this._normalize(homeCfg.backgroundUrl), context: '主菜单' });
        }

        // -- 执行校验 --
        for (const item of checks) {
            if (onCheck) onCheck(item.path);
            const ok = exists ? await exists(item.path) : await this._checkFileExists(item.path);
            if (!ok) {
                missing.push(item);
            }
        }

        return {
            ok: missing.length === 0,
            missing,
        };
    }

    /**
     * 通过 Image 预加载检查文件是否存在（浏览器环境）
     * @param {string} path
     * @returns {Promise<boolean>}
     */
    _checkFileExists(path) {
        return new Promise((resolve) => {
            const img = new Image();
            let settled = false;
            const done = (ok) => {
                if (!settled) { settled = true; resolve(ok); }
            };
            img.onload = () => done(true);
            img.onerror = () => done(false);
            // 超时保护
            img.onabort = () => done(false);
            img.src = path;
            // 如果图片是空字符串或 data URI，标记为存在
            if (!path || path.startsWith('data:')) {
                done(true);
            }
        });
    }

    /**
     * 常规检查（不做实际网络请求，仅分析路径合理性）
     * 用于 ZIP 加载模式，配合 ResourceManager 的文件列表
     *
     * @param {string} path
     * @param {Set<string>} availableFiles 资源包中存在的文件路径集合
     * @returns {boolean}
     */
    checkAgainstFileSet(path, availableFiles) {
        if (!path) return true;
        if (path.startsWith('data:') || path.startsWith('blob:')) return true;
        // 移除前导 / 后匹配
        const normalized = this._normalize(path);
        return availableFiles.has(normalized);
    }
}

export default ResourcePathResolver;

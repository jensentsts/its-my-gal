/**
 * engine/resource/resource-manager.js
 *
 * ResourceManager —— 资源包加载与管理系统。
 *
 * 职责：
 *  - 从目录路径或 ZIP 文件加载资源包
 *  - 解析 pack.json 清单文件
 *  - 递归加载所有 JSON 配置和章节数据
 *  - 验证资源包结构完整性
 *  - 提供 getData() 返回引擎所需的标准数据格式
 *
 * 资源包目录结构：
 *   {packName}/
 *   ├── pack.json           # 资源包清单
 *   ├── config/
 *   │   ├── game.json       # 游戏全局配置
 *   │   ├── home.json       # 首页配置
 *   │   ├── characters.json # 角色库
 *   │   ├── scenes.json     # 场景库
 *   │   ├── cg-library.json # CG 图鉴库
 *   │   ├── items.json      # 物品库
 *   │   └── endings.json    # 结局库
 *   ├── chapters/
 *   │   ├── main.json       # 序章
 *   │   ├── ...             # 其它章节
 *   │   └── *.json
 *   └── assets/             # 图片等静态资源
 *       ├── scenes/
 *       ├── characters/
 *       └── cg/
 */

import { validatePackStructure, validatePackData } from './pack-validator.js';

/** 默认内置资源包名称 */
const DEFAULT_PACK_NAME = 'default';

/** 资源包格式版本 */
const FORMAT_VERSION = '1.0.0';

export class ResourceManager {
    constructor() {
        /** @type {Object|null} 已加载的资源包完整数据 */
        this._packData = null;

        /** @type {Object|null} 已加载的包清单 */
        this._manifest = null;

        /** @type {string} 当前包的基础路径 */
        this._basePath = '';

        /** @type {string} 当前包名称 */
        this._packName = '';

        /** @type {boolean} 是否已加载 */
        this._loaded = false;
    }

    // ====================================================================
    //  公共 API
    // ====================================================================

    /**
     * 从目录路径加载资源包（通过 HTTP fetch）
     * @param {string} packPath - 资源包根目录路径（相对于 HTML 页面的路径）
     *   例如: 'resource-packs/default' 或 './resource-packs/default'
     * @returns {Promise<Object>} 引擎可用的完整数据对象
     */
    async loadPack(packPath, onProgress) {
        this._reset();
        this._basePath = packPath.replace(/\/+$/, '');

        const report = (percent, status, detail) => {
            if (typeof onProgress === 'function') {
                onProgress({ percent: Math.min(100, Math.max(0, percent)), status, detail });
            }
        };

        report(0, 'init', '正在连接资源包...');

        // 1. 加载并验证 pack.json
        const manifestUrl = `${this._basePath}/pack.json`;
        let manifest;
        try {
            const resp = await fetch(manifestUrl);
            if (!resp.ok) {
                throw new Error(`无法读取资源包清单 ${manifestUrl}: HTTP ${resp.status}`);
            }
            manifest = await resp.json();
            report(5, 'manifest', `清单加载完成: ${manifest.title || manifest.name}`);
        } catch (e) {
            throw new Error(`资源包清单加载失败: ${e.message}`);
        }

        // 验证清单结构
        const manifestErrors = validatePackStructure(manifest);
        if (manifestErrors.length > 0) {
            throw new Error(`资源包清单验证失败:\n${manifestErrors.map(e => `  - ${e}`).join('\n')}`);
        }

        this._manifest = manifest;
        this._packName = manifest.name || DEFAULT_PACK_NAME;

        report(10, 'config', '正在加载配置文件...');

        // 2. 并行加载所有配置文件
        const configKeys = ['game', 'home', 'characters', 'scenes', 'cgLibrary', 'items', 'endings'];
        const configs = {};
        let configsLoaded = 0;
        const configPromises = configKeys.map(async (key) => {
            const filePath = manifest.configs?.[key];
            if (!filePath) {
                const defaultPath = `config/${key}.json`;
                try {
                    configs[key] = await this._fetchJSON(`${this._basePath}/${defaultPath}`);
                } catch {
                    console.warn(`[ResourceManager] 配置文件 "${key}" 未找到，使用空值`);
                    configs[key] = (key === 'endings') ? [] : {};
                }
                configsLoaded++;
                report(10 + Math.round((configsLoaded / configKeys.length) * 20), 'config', `配置加载中: ${key}`);
                return;
            }
            try {
                configs[key] = await this._fetchJSON(`${this._basePath}/${filePath}`);
            } catch (e) {
                console.warn(`[ResourceManager] 配置文件 "${key}" 加载失败: ${e.message}，使用空值`);
                configs[key] = (key === 'endings') ? [] : {};
            }
            configsLoaded++;
            report(10 + Math.round((configsLoaded / configKeys.length) * 20), 'config', `配置加载中: ${key}`);
        });
        await Promise.all(configPromises);

        report(30, 'chapters', '正在加载故事章节...');

        // 3. 并行加载所有章节文件
        const chapters = {};
        const chapterEntries = manifest.chapters && Object.keys(manifest.chapters).length > 0
            ? Object.entries(manifest.chapters)
            : [];
        const totalChapters = chapterEntries.length || 13; // fallback estimate

        if (chapterEntries.length > 0) {
            let chaptersLoaded = 0;
            const chapterPromises = chapterEntries.map(async ([chId, filePath]) => {
                try {
                    chapters[chId] = await this._fetchJSON(`${this._basePath}/${filePath}`);
                } catch (e) {
                    console.error(`[ResourceManager] 章节 "${chId}" 加载失败: ${e.message}`);
                    chapters[chId] = [];
                }
                chaptersLoaded++;
                report(30 + Math.round((chaptersLoaded / totalChapters) * 50), 'chapters', `章节加载中: ${chId} (${chaptersLoaded}/${totalChapters})`);
            });
            await Promise.all(chapterPromises);
        } else {
            console.warn('[ResourceManager] 清单中无章节映射，尝试自动扫描...');
            await this._autoScanChapters(chapters, (loaded, total, chId) => {
                report(30 + Math.round((loaded / Math.max(total, 1)) * 50), 'chapters', `自动扫描: ${chId || ''} (${loaded}/${total})`);
            });
        }

        report(80, 'build', '正在组装资源数据...');

        // 4. 组装完整数据
        this._packData = {
            GAME_CONFIG:  configs.game || {},
            HOME_CONFIG:  configs.home || {},
            CHARACTERS:   configs.characters || {},
            SCENES:       configs.scenes || {},
            CG_LIBRARY:   configs.cgLibrary || {},
            ITEMS:        configs.items || {},
            ENDINGS:      configs.endings || [],
            STORY_CHAPTERS: chapters,
            _meta: {
                packName: this._packName,
                packTitle: manifest.title || '',
                packVersion: manifest.version || '',
                packAuthor: manifest.author || '',
                packDescription: manifest.description || '',
                basePath: this._basePath,
            }
        };

        report(90, 'validate', '正在验证数据完整性...');

        // 5. 验证数据完整性
        const dataErrors = validatePackData(this._packData);
        if (dataErrors.length > 0) {
            console.warn(`[ResourceManager] 资源包数据警告:\n${dataErrors.map(e => `  ⚠ ${e}`).join('\n')}`);
        }

        report(98, 'ready', '数据验证完毕，即将启动...');

        this._loaded = true;
        console.log(`[ResourceManager] ✅ 资源包 "${this._packName}" 加载完成 (${Object.keys(chapters).length} 个章节)`);

        report(100, 'done', '加载完成！');
        return this._packData;
    }

    /**
     * 从 ZIP 文件导入资源包（浏览器端解压）
     * @param {File|Blob} zipFile - ZIP 文件
     * @returns {Promise<Object>} 引擎可用的完整数据对象
     */
    async importPack(zipFile) {
        // 动态加载 JSZip（如果可用）
        const JSZip = await this._loadJSZip();
        if (!JSZip) {
            throw new Error('ZIP 导入需要 JSZip 库。请在页面中引入: <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>');
        }

        const zip = await JSZip.loadAsync(zipFile);
        const packName = this._detectPackName(zip);

        // 1. 加载 pack.json
        const manifestFile = zip.file(/^(.*\/)?pack\.json$/)[0];
        if (!manifestFile) throw new Error('ZIP 中未找到 pack.json 清单文件');

        const manifestText = await manifestFile.async('string');
        const manifest = JSON.parse(manifestText);

        const manifestErrors = validatePackStructure(manifest);
        if (manifestErrors.length > 0) {
            throw new Error(`资源包清单验证失败:\n${manifestErrors.map(e => `  - ${e}`).join('\n')}`);
        }

        this._manifest = manifest;
        this._packName = manifest.name || 'imported';
        this._basePath = ''; // ZIP 模式下无 basePath

        // 提取包内根目录前缀
        const rootPrefix = this._extractRootPrefix(zip, packName);

        // 2. 加载配置
        const configKeys = ['game', 'home', 'characters', 'scenes', 'cgLibrary', 'items', 'endings'];
        const configs = {};
        const configPromises = configKeys.map(async (key) => {
            const filePath = manifest.configs?.[key] || `config/${key}.json`;
            const fullPath = rootPrefix ? `${rootPrefix}/${filePath}` : filePath;
            const file = zip.file(fullPath);
            if (file) {
                configs[key] = JSON.parse(await file.async('string'));
            } else {
                configs[key] = (key === 'endings') ? [] : {};
            }
        });
        await Promise.all(configPromises);

        // 3. 加载章节
        const chapters = {};
        if (manifest.chapters) {
            const chapterPromises = Object.entries(manifest.chapters).map(async ([chId, filePath]) => {
                const fullPath = rootPrefix ? `${rootPrefix}/${filePath}` : filePath;
                const file = zip.file(fullPath);
                if (file) {
                    chapters[chId] = JSON.parse(await file.async('string'));
                } else {
                    console.warn(`[ResourceManager] 章节 "${chId}" 在 ZIP 中未找到: ${fullPath}`);
                    chapters[chId] = [];
                }
            });
            await Promise.all(chapterPromises);
        }

        // 4. 提取图片资源为 Blob URLs
        await this._extractAssetsFromZip(zip, rootPrefix, configs, chapters);

        // 5. 组装数据
        this._packData = {
            GAME_CONFIG:  configs.game || {},
            HOME_CONFIG:  configs.home || {},
            CHARACTERS:   configs.characters || {},
            SCENES:       configs.scenes || {},
            CG_LIBRARY:   configs.cgLibrary || {},
            ITEMS:        configs.items || {},
            ENDINGS:      configs.endings || [],
            STORY_CHAPTERS: chapters,
            _meta: {
                packName: this._packName,
                packTitle: manifest.title || '',
                packVersion: manifest.version || '',
                packAuthor: manifest.author || '',
                packDescription: manifest.description || '',
                basePath: '',
                isImported: true,
            }
        };

        this._loaded = true;
        return this._packData;
    }

    /**
     * 获取已加载的引擎就绪数据
     * @returns {Object|null}
     */
    getData() {
        return this._packData;
    }

    /**
     * 获取资源包元数据
     * @returns {Object|null}
     */
    getMeta() {
        return this._packData?._meta || null;
    }

    /**
     * 检查是否已加载
     * @returns {boolean}
     */
    isLoaded() {
        return this._loaded;
    }

    /**
     * 获取当前包名称
     * @returns {string}
     */
    getPackName() {
        return this._packName;
    }

    /**
     * 列出指定目录下的可用资源包
     * @param {string} baseDir - 资源包目录的父目录
     * @returns {Promise<Array<{name: string, title: string, version: string}>>}
     */
    static async listPacks(baseDir = 'resource-packs') {
        // 对于浏览器环境，无法直接列举目录
        // 需要依赖一个 index.json 文件来枚举可用包
        try {
            const resp = await fetch(`${baseDir}/index.json`);
            if (resp.ok) {
                return await resp.json();
            }
        } catch {
            // 回退：尝试默认包
            try {
                const resp = await fetch(`${baseDir}/default/pack.json`);
                if (resp.ok) {
                    const manifest = await resp.json();
                    return [{ name: 'default', title: manifest.title, version: manifest.version }];
                }
            } catch {
                // 无可用包
            }
        }
        return [];
    }

    // ====================================================================
    //  导出
    // ====================================================================

    /**
     * 将当前加载的数据导出为可下载的 JSON 资源包结构
     * @returns {Object} { packName, files: { path: content } }
     */
    exportPackData() {
        if (!this._packData) return null;

        const data = this._packData;
        const files = {};

        // pack.json
        files['pack.json'] = JSON.stringify({
            name: this._packName,
            title: this._manifest?.title || '',
            version: this._manifest?.version || '1.0.0',
            author: this._manifest?.author || '',
            description: this._manifest?.description || '',
            format: FORMAT_VERSION,
            configs: {
                game: 'config/game.json',
                home: 'config/home.json',
                characters: 'config/characters.json',
                scenes: 'config/scenes.json',
                cgLibrary: 'config/cg-library.json',
                items: 'config/items.json',
                endings: 'config/endings.json',
            },
            chapters: Object.keys(data.STORY_CHAPTERS || {}).reduce((acc, chId) => {
                acc[chId] = `chapters/${chId}.json`;
                return acc;
            }, {})
        }, null, 2);

        // 配置文件
        files['config/game.json'] = JSON.stringify(data.GAME_CONFIG, null, 2);
        files['config/home.json'] = JSON.stringify(data.HOME_CONFIG, null, 2);
        files['config/characters.json'] = JSON.stringify(data.CHARACTERS, null, 2);
        files['config/scenes.json'] = JSON.stringify(data.SCENES, null, 2);
        files['config/cg-library.json'] = JSON.stringify(data.CG_LIBRARY, null, 2);
        files['config/items.json'] = JSON.stringify(data.ITEMS, null, 2);
        files['config/endings.json'] = JSON.stringify(data.ENDINGS, null, 2);

        // 章节文件
        for (const [chId, steps] of Object.entries(data.STORY_CHAPTERS || {})) {
            files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
        }

        return { packName: this._packName, files };
    }

    /**
     * 导出为 ZIP Blob（需要 JSZip）
     * @returns {Promise<Blob|null>}
     */
    async exportAsZip() {
        const JSZip = await this._loadJSZip();
        if (!JSZip) return null;

        const exportData = this.exportPackData();
        if (!exportData) return null;

        const zip = new JSZip();
        const folder = zip.folder(exportData.packName);

        for (const [path, content] of Object.entries(exportData.files)) {
            folder.file(path, content);
        }

        return await zip.generateAsync({ type: 'blob' });
    }

    // ====================================================================
    //  静态工具方法
    // ====================================================================

    /**
     * 创建一个新的空白资源包模板
     * @param {Object} meta - { name, title, author, description }
     * @returns {Object} 空白包数据
     */
    static createBlankPack(meta = {}) {
        return {
            GAME_CONFIG: {
                title: meta.title || '未命名故事',
                aspectRatio: { width: 1280, height: 720 },
                textSpeed: 25,
            },
            HOME_CONFIG: {
                backgroundUrl: '',
                placeholderGradient: 'linear-gradient(135deg, #0e0e14 0%, #030305 100%)',
                screenEffect: '',
                maskEffects: ['vignette'],
                showOverlay: true,
                overlayOpacity: 0.5,
            },
            CHARACTERS: {},
            SCENES: {},
            CG_LIBRARY: {},
            ITEMS: {},
            ENDINGS: [],
            STORY_CHAPTERS: {
                'main': [{
                    sceneId: '',
                    type: 'dialogue',
                    characterId: null,
                    text: '欢迎来到你的新故事！这是第一章的第一个场景。',
                    effects: [],
                }]
            },
            _meta: {
                packName: meta.name || 'new-pack',
                packTitle: meta.title || '未命名故事',
                packVersion: '1.0.0',
                packAuthor: meta.author || '',
                packDescription: meta.description || '',
                basePath: '',
            }
        };
    }

    // ====================================================================
    //  私有方法
    // ====================================================================

    _reset() {
        this._packData = null;
        this._manifest = null;
        this._basePath = '';
        this._packName = '';
        this._loaded = false;
    }

    async _fetchJSON(url) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    }

    async _autoScanChapters(chapters, onProgress) {
        const commonIds = ['main', 'prologue', 'meet_elysia', 'forest_explore', 'ruins_exploration',
            'forest_deep', 'possession_prelude', 'possession_event', 'body_explore',
            'elysia_life', 'final_choice', 'redemption_route', 'exorcism_route', 'desperate_route'];

        let loaded = 0;
        const scanPromises = commonIds.map(async (chId) => {
            try {
                const data = await this._fetchJSON(`${this._basePath}/chapters/${chId}.json`);
                chapters[chId] = data;
                console.log(`[ResourceManager]   自动扫描到章节: ${chId}`);
            } catch {
                // 章节不存在，跳过
            }
            loaded++;
            if (typeof onProgress === 'function') {
                onProgress(loaded, commonIds.length, chId);
            }
        });
        await Promise.all(scanPromises);
    }

    async _loadJSZip() {
        // 检查是否已全局加载
        if (typeof window !== 'undefined' && window.JSZip) {
            return window.JSZip;
        }
        // 尝试动态加载
        try {
            // 使用 import() 动态加载
            const module = await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            return window.JSZip || null;
        } catch {
            return null;
        }
    }

    _detectPackName(zip) {
        // 查找 pack.json 所在目录作为包名
        const packFiles = zip.file(/pack\.json$/);
        if (packFiles.length > 0) {
            const path = packFiles[0].name;
            const parts = path.split('/');
            return parts.length > 1 ? parts[parts.length - 2] : 'imported';
        }
        return 'imported';
    }

    _extractRootPrefix(zip, packName) {
        // 检查是否有根级别文件夹
        const allFiles = Object.keys(zip.files).filter(f => !f.endsWith('/'));
        const topDirs = new Set(allFiles.map(f => f.split('/')[0]));

        if (topDirs.has('pack.json')) {
            return ''; // pack.json 在根级别
        }

        // 寻找包含 pack.json 的目录
        for (const dir of topDirs) {
            if (allFiles.some(f => f === `${dir}/pack.json`)) {
                return dir;
            }
        }

        return packName; // 使用包名作为前缀
    }

    async _extractAssetsFromZip(zip, rootPrefix, configs, chapters) {
        // 创建 Blob URL 缓存
        const blobCache = new Map();

        // 收集所有图片引用
        const imagePaths = new Set();

        // 从配置中收集
        const collectPaths = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            for (const [key, val] of Object.entries(obj)) {
                if (key === 'url' || key === 'backgroundUrl' || key.endsWith('Url')) {
                    if (typeof val === 'string' && val.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)) {
                        imagePaths.add(val);
                    }
                } else if (typeof val === 'object') {
                    collectPaths(val);
                }
            }
        };

        // 从配置中收集图片路径
        for (const key of ['characters', 'scenes', 'cgLibrary', 'home']) {
            if (configs[key]) collectPaths(configs[key]);
        }

        // 提取并替换图片路径为 Blob URLs
        const prefix = rootPrefix ? `${rootPrefix}/` : '';
        for (const imgPath of imagePaths) {
            const fullPath = prefix + imgPath.replace(/^\//, '');
            const file = zip.file(fullPath);
            if (file) {
                const blob = await file.async('blob');
                const blobUrl = URL.createObjectURL(blob);
                blobCache.set(imgPath, blobUrl);
            }
        }

        // 替换所有配置中的数据路径
        if (blobCache.size > 0) {
            this._replaceImagePaths(configs, blobCache);
        }

        console.log(`[ResourceManager]   提取了 ${blobCache.size} 个图片资源`);
    }

    _replaceImagePaths(obj, blobCache) {
        if (!obj || typeof obj !== 'object') return;
        for (const [key, val] of Object.entries(obj)) {
            if ((key === 'url' || key === 'backgroundUrl' || key.endsWith('Url')) &&
                typeof val === 'string' && blobCache.has(val)) {
                obj[key] = blobCache.get(val);
            } else if (typeof val === 'object') {
                this._replaceImagePaths(val, blobCache);
            }
        }
    }
}

export default ResourceManager;

/**
 * app/composables/use-engine.js
 *
 * useEngine —— GalEngine ↔ Vue 响应式桥接层。
 *
 * 职责：
 *  1. 将引擎事件转换为 Vue ref 变更
 *  2. 提供简化的 API 给 Vue 组件
 *  3. 处理 UI 特有逻辑（物品 Toast 队列、特效渲染等）
 *  4. 管理资源包加载（通过 ResourceManager）
 *
 * 这是整个架构中唯一同时接触引擎和 Vue 的模块。
 */
import { GalEngine, EffectsManager, ResourceManager,
         getDynamicItemDescription as getDynamicDesc,
         getItemIcon as getIcon, getItemImage as getImage, getItemName as getName,
         DEFAULT_ITEM_ANIMATION_PRESETS,
         ChapterLoader,
         extractBranchPoints,
         rankNextChapters } from '../../engine/index.js';
export function useEngine() {
    // ---- 引擎实例 ----
    const engine = Vue.ref(null);
    let fxManager = null;
    let homeFxManager = null;
    let _scenes = {};       // 内部缓存，initEngine 时注入

    // ---- 物品数据引用（可来自静态导入或资源包） ----
    let _items = {};
    let _itemAnimPresets = {};

    // ---- 资源包管理器 ----
    const resourceManager = new ResourceManager();

    // ---- 章节智能预加载器 ----
    const chapterLoader = new ChapterLoader({
        onProgress: (chapterId, status) => {
            if (status === 'ready') {
                console.log(`[Preloader] ✅ 章节预加载完成: ${chapterId}`);
            } else if (status === 'loading') {
                console.log(`[Preloader] ⏳ 章节预加载中: ${chapterId}`);
            } else if (status === 'error') {
                console.warn(`[Preloader] ⚠ 章节预加载失败: ${chapterId}`);
            }
        }
    });
    // 预加载激活标记（用于尾部追踪）
    let _lastTrackedChapterId = null;

    // ---- 当前游戏数据引用（供外部 computed 使用） ----
    const gameData = Vue.ref(null);

    // ---- 响应式状态（映射引擎状态到 Vue） ----
    const currentView            = Vue.ref('menu');
    const activeMenuPanel        = Vue.ref(null);
    const activeGamePanel        = Vue.ref(null);
    const archiveMode            = Vue.ref('save');
    const saveSlotsData          = Vue.ref({});
    const uiVisible              = Vue.ref(true);
    const unlockedGalleries      = Vue.ref({});
    const unlockedEndings        = Vue.ref({});

    // 游戏内状态
    const currentChapterId       = Vue.ref('main');
    const currentStepIndex       = Vue.ref(0);
    const gameState              = Vue.ref({ money: 100, inventory: [], flags: {} });
    const stageCharacters        = Vue.ref({});
    const historyLogs            = Vue.ref([]);
    const lastSpeakerId          = Vue.ref(null);
    const activeCG               = Vue.ref(null);
    const activeEffects          = Vue.ref([]);
    const currentScreenEffect    = Vue.ref('');
    const triggeredEnding        = Vue.ref(null);
    const typedText              = Vue.ref('');
    const typingFinished         = Vue.ref(true);
    const avatarLoadFail         = Vue.ref(false);

    // 物品展示
    const stageDisplayItem       = Vue.ref(null);
    const itemToastQueue         = Vue.ref([]);
    const isShowingItemToast     = Vue.ref(false);
    const selectedBagItemId      = Vue.ref(null);

    // 场景
    const sceneBgFailed          = Vue.ref(false);
    const currentSceneTestUrl    = Vue.ref(null);

    // 面板
    const showLog                = Vue.ref(false);
    const showInventory          = Vue.ref(false);

    // 角色名录
    const activeInspectedCharId    = Vue.ref(null);
    const activeSpriteIdForInspection = Vue.ref(null);
    const activeInspectedSpriteUrl  = Vue.ref('');
    const lightboxUrl              = Vue.ref('');

    // ---- 从编辑器 localStorage 加载同步数据 ----
    function loadEditorData() {
        try {
            const raw = localStorage.getItem('galgame-editor-data');
            if (!raw) return null;
            const data = JSON.parse(raw);
            // 检查是否是新数据（24小时内）
            if (data.timestamp && Date.now() - data.timestamp > 24 * 3600 * 1000) return null;
            return data;
        } catch {
            return null;
        }
    }

    // ---- 初始化引擎（从标准游戏数据对象） ----
    function initEngine(gameDataInput) {
        _scenes = gameDataInput.SCENES || {};
        _items = gameDataInput.ITEMS || {};
        _itemAnimPresets = gameDataInput.ITEM_ANIMATION_PRESETS || DEFAULT_ITEM_ANIMATION_PRESETS;
        gameData.value = gameDataInput;

        // 初始化 ChapterLoader：同步注入所有已加载章节
        chapterLoader.initSync(gameDataInput.STORY_CHAPTERS);

        // 如果是资源包懒加载模式，设置异步加载器
        if (resourceManager.isLoaded() && !resourceManager.hasChapter('main')) {
            // 资源包未预加载所有章节 → 注册异步加载函数
            chapterLoader.setLoadFn((chapterId) => resourceManager.loadChapter(chapterId));
        }

        engine.value = new GalEngine({
            chapters:   gameDataInput.STORY_CHAPTERS,
            characters: gameDataInput.CHARACTERS,
            scenes:     gameDataInput.SCENES,
            cgLibrary:  gameDataInput.CG_LIBRARY,
            items:      gameDataInput.ITEMS,
            endings:    gameDataInput.ENDINGS,
            config:     gameDataInput.GAME_CONFIG,
            homeConfig: gameDataInput.HOME_CONFIG,
        });

        _bindEvents();
    }

    // ---- 从资源包目录路径加载 ----
    async function loadPackFromPath(packPath, onProgress) {
        const data = await resourceManager.loadPack(packPath, onProgress);

        // 合并资源包的物品动画预设（如果存在）
        if (!data.ITEM_ANIMATION_PRESETS && data.ITEMS) {
            // 使用默认预设
            data.ITEM_ANIMATION_PRESETS = DEFAULT_ITEM_ANIMATION_PRESETS;
        }

        initEngine(data);
        return data;
    }

    // ---- 从 ZIP 文件导入资源包 ----
    async function importPackFromZip(zipFile) {
        const data = await resourceManager.importPack(zipFile);

        if (!data.ITEM_ANIMATION_PRESETS && data.ITEMS) {
            data.ITEM_ANIMATION_PRESETS = DEFAULT_ITEM_ANIMATION_PRESETS;
        }

        initEngine(data);
        return data;
    }

    // ---- 获取资源包元数据 ----
    function getPackMeta() {
        return resourceManager.getMeta();
    }

    // ---- 检查是否从资源包加载 ----
    function isPackLoaded() {
        return resourceManager.isLoaded();
    }

    // ---- 导出当前数据为资源包文件结构 ----
    function exportCurrentAsPack() {
        // 如果通过 ResourceManager 加载，直接使用其导出
        if (resourceManager.isLoaded()) {
            return resourceManager.exportPackData();
        }
        // 否则从 gameData 手动构建
        return _buildPackFromGameData();
    }

    // ---- 导出当前数据为 ZIP Blob ----
    async function exportCurrentAsZip() {
        if (resourceManager.isLoaded()) {
            return await resourceManager.exportAsZip();
        }
        // 从 gameData 构建后转换为 ZIP
        const packData = _buildPackFromGameData();
        if (!packData) return null;

        const JSZip = await _loadJSZip();
        if (!JSZip) return null;

        const zip = new JSZip();
        const folder = zip.folder(packData.packName);
        for (const [path, content] of Object.entries(packData.files)) {
            folder.file(path, content);
        }
        return await zip.generateAsync({ type: 'blob' });
    }

    function _buildPackFromGameData() {
        const data = gameData.value;
        if (!data) return null;

        const packName = 'game-export';
        const files = {};

        files['pack.json'] = JSON.stringify({
            name: packName,
            title: data.GAME_CONFIG?.title || '',
            version: '1.0.0',
            author: '',
            description: '',
            format: '1.0.0',
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
            }, {}),
        }, null, 2);

        files['config/game.json'] = JSON.stringify(data.GAME_CONFIG, null, 2);
        files['config/home.json'] = JSON.stringify(data.HOME_CONFIG, null, 2);
        files['config/characters.json'] = JSON.stringify(data.CHARACTERS, null, 2);
        files['config/scenes.json'] = JSON.stringify(data.SCENES, null, 2);
        files['config/cg-library.json'] = JSON.stringify(data.CG_LIBRARY, null, 2);
        files['config/items.json'] = JSON.stringify(data.ITEMS, null, 2);
        files['config/endings.json'] = JSON.stringify(data.ENDINGS, null, 2);

        for (const [chId, steps] of Object.entries(data.STORY_CHAPTERS || {})) {
            files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
        }

        return { packName, files };
    }

    async function _loadJSZip() {
        if (typeof window !== 'undefined' && window.JSZip) {
            return window.JSZip;
        }
        try {
            await import('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            return window.JSZip || null;
        } catch {
            return null;
        }
    }

    // ---- 事件绑定 ----
    function _bindEvents() {
        const eng = engine.value;
        if (!eng) return;

        eng.on('step:enter', (step) => {
            syncState();
        });

        eng.on('characters:change', (chars) => {
            stageCharacters.value = { ...chars };
        });

        eng.on('effect:change', ({ effects, screenEffect }) => {
            activeEffects.value = effects;
            currentScreenEffect.value = screenEffect;
        });

        eng.on('effect:screen', (effect) => {
            if (fxManager) fxManager.play(effect);
        });

        eng.on('cg:enter', (cg) => {
            activeCG.value = { ...cg };
            eng.saveManager.unlockGallery(cg.id);
            unlockedGalleries.value = eng.saveManager.getGallery();
        });

        eng.on('cg:update', (cg) => {
            activeCG.value = { ...cg };
        });

        eng.on('cg:leave', (cg) => {
            activeCG.value = { ...cg };
        });

        eng.on('cg:cleared', () => {
            activeCG.value = null;
        });

        eng.on('typewriter:start', ({ text, speed }) => {
            typedText.value = '';
            typingFinished.value = false;
            avatarLoadFail.value = false;
        });

        eng.on('typewriter:tick', ({ text }) => {
            typedText.value = text;
        });

        eng.on('typewriter:done', ({ text }) => {
            typedText.value = text;
            typingFinished.value = true;
        });

        eng.on('item:gain', ({ itemId, approach }) => {
            enqueueItemToast(itemId, 'gain', approach);
            syncInventory();
        });

        eng.on('item:lose', ({ itemId, approach }) => {
            enqueueItemToast(itemId, 'lose', approach);
            syncInventory();
            if (selectedBagItemId.value === itemId) selectedBagItemId.value = null;
        });

        eng.on('item:update', ({ id, mode, approach }) => {
            enqueueItemToast(id, mode, approach);
        });

        eng.on('ending:trigger', (ending) => {
            triggeredEnding.value = ending;
            eng.saveManager.unlockEnding(ending.id);
            unlockedEndings.value = eng.saveManager.getEndings();
        });

        eng.on('history:push', (log) => {
            // historyLogs synced in syncState
        });

        eng.on('choice:present', () => {
            typingFinished.value = true;
        });

        // ---- 章节变更 → 预判 + 预加载 ----
        eng.on('chapter:change', ({ from, to }) => {
            _preloadOnChapterChange(to);
        });
    }

    // ====================================================================
    //  章节预判与预加载（核心优化）
    // ====================================================================

    /**
     * 当章节发生变更时触发 —— 分析当前章节的分支，预加载可能的前往章节
     * @param {string} chapterId - 新进入的章节 ID
     */
    function _preloadOnChapterChange(chapterId) {
        // 避免同一章节重复触发
        if (_lastTrackedChapterId === chapterId) return;
        _lastTrackedChapterId = chapterId;

        // 从缓存获取章节步骤
        const steps = chapterLoader.getChapter(chapterId);
        if (!Array.isArray(steps)) {
            // 章节尚未加载 → 先确保加载，再预判
            if (!chapterLoader.isLoading(chapterId)) {
                chapterLoader.ensure(chapterId).then(loadedSteps => {
                    _doPreload(chapterId, loadedSteps);
                }).catch(() => {
                    // 静默失败
                });
            }
            return;
        }

        _doPreload(chapterId, steps);
    }

    /**
     * 执行实际预判和预加载
     * @param {string} chapterId
     * @param {Array} steps
     */
    function _doPreload(chapterId, steps) {
        const flags = engine.value?.state?.gameState?.flags || {};

        // 1. 提取分支点
        const branchPoints = extractBranchPoints(steps, flags);

        // 2. 加权排序
        const ranked = rankNextChapters(branchPoints, flags);

        if (ranked.length === 0) return;

        // 3. 触发预加载（全部可能的下一跳，按权重排序，高优先级在前）
        const targets = ranked.map(r => r.chapterId);

        // 去重
        const uniqueTargets = [...new Set(targets)];

        // 记录预加载
        if (uniqueTargets.length > 0) {
            console.log(`[Preloader] 🔮 章节 "${chapterId}" 分支预判:`, uniqueTargets);
        }

        // 对于高权重（必达）章节，立即触发 ensure
        const highPriority = ranked.filter(r => r.weight >= 3).map(r => r.chapterId);
        for (const hc of highPriority) {
            if (!chapterLoader.has(hc)) {
                chapterLoader.ensure(hc).catch(() => {});
            }
        }

        // 其余放入后台预加载队列
        chapterLoader.preload(uniqueTargets);
    }

    // ---- 状态同步（带去重守卫） ----
    let _syncGuard = false;
    function syncState() {
        if (_syncGuard) return; // 防止同一帧内重复同步
        _syncGuard = true;
        queueMicrotask(() => { _syncGuard = false; }); // 下一微任务释放

        const s = engine.value?.state;
        if (!s) return;

        currentChapterId.value    = s.currentChapterId;
        currentStepIndex.value    = s.currentStepIndex;
        gameState.value           = { ...s.gameState };
        stageCharacters.value     = { ...s.stageCharacters };
        historyLogs.value         = [...s.historyLogs];
        lastSpeakerId.value       = s.lastSpeakerId;
        activeCG.value            = s.activeCG ? { ...s.activeCG } : null;
        activeEffects.value       = s.activeEffects;
        currentScreenEffect.value = s.currentScreenEffect;
        typedText.value           = s.typedText;
        typingFinished.value      = s.typingFinished;
    }

    function syncInventory() {
        const s = engine.value?.state;
        if (!s) return;
        gameState.value = { ...s.gameState };
    }

    // ---- 物品 Toast 队列（使用可移植辅助函数） ----
    function enqueueItemToast(itemId, mode, approach) {
        itemToastQueue.value.push({ itemId, mode, approach });
        processItemToastQueue();
    }

    function processItemToastQueue() {
        if (isShowingItemToast.value || itemToastQueue.value.length === 0) return;

        isShowingItemToast.value = true;
        const task = itemToastQueue.value.shift();
        const presets = _itemAnimPresets || DEFAULT_ITEM_ANIMATION_PRESETS;
        const preset = presets[task.mode]?.[task.approach] || { class: 'fx-item-find', title: '物品更新' };

        const itemImage = getImage(task.itemId, _items);
        stageDisplayItem.value = {
            name:        getName(task.itemId, _items),
            icon:        getIcon(task.itemId, _items),
            image:       itemImage || '',
            titleLabel:  preset.title,
            animClass:   preset.class,
            description: getDynamicDesc(task.itemId, engine.value?.state.gameState.flags || {}, _items)
        };
    }

    function dismissItemStageToast() {
        stageDisplayItem.value = null;
        setTimeout(() => {
            isShowingItemToast.value = false;
            processItemToastQueue();
        }, 300);
    }

    // ---- 便捷操作 ----
    /** 获取入口章节 ID：优先从编辑器同步数据的 entryPoints 中取第一个，回退到 'main' */
    function getEntryChapterId() {
        const engineConfig = engine.value?.config;
        const entryPoints = engineConfig?.entryPoints;
        if (entryPoints && Array.isArray(entryPoints) && entryPoints.length > 0) {
            const validEntry = entryPoints.find(id => engine.value?.chapters[id]);
            if (validEntry) return validEntry;
        }
        // 回退：直接从 gameData 的 GAME_CONFIG 读取
        const gd = gameData.value;
        if (gd?.GAME_CONFIG?.entryPoints?.length > 0) {
            const validEntry = gd.GAME_CONFIG.entryPoints.find(id => gd.STORY_CHAPTERS[id]);
            if (validEntry) return validEntry;
        }
        return 'main';
    }

    function startNewGame() {
        if (homeFxManager) { homeFxManager.clear(); homeFxManager = null; }
        itemToastQueue.value = [];
        isShowingItemToast.value = false;
        stageDisplayItem.value = null;
        selectedBagItemId.value = null;
        triggeredEnding.value = null;
        sceneBgFailed.value = false;

        const entryChapterId = getEntryChapterId();
        engine.value?.start(entryChapterId, 0);
        syncState();
        currentView.value = 'game';
        activeMenuPanel.value = null;
        activeGamePanel.value = null;
        uiVisible.value = true;

        // 触发入口章节的预判预加载
        _lastTrackedChapterId = null;
        _preloadOnChapterChange(entryChapterId);

        Vue.nextTick(() => {
            initGameEffects();
            updateSceneBgTest();
        });
    }

    function advanceStory() {
        if (!uiVisible.value) return;
        if (stageDisplayItem.value) { dismissItemStageToast(); return; }

        const result = engine.value?.advance();
        syncState();

        if (result === 'typing') {
            // Typing was force-finished; text synced via events
        }
    }

    function selectChoice(choice) {
        itemToastQueue.value = [];
        isShowingItemToast.value = false;
        stageDisplayItem.value = null;

        engine.value?.selectChoice(choice);
        syncState();
    }

    function rollbackToTimeline(logIndex) {
        itemToastQueue.value = [];
        isShowingItemToast.value = false;
        stageDisplayItem.value = null;

        const ok = engine.value?.rollbackToLog(logIndex);
        if (ok) {
            syncState();
            showLog.value = false;
        }
        return ok;
    }

    function saveGame(slotId, meta) {
        const ok = engine.value?.save(slotId, meta);
        if (ok) saveSlotsData.value = engine.value.getSaveSlots();
        return ok;
    }

    function loadGame(slotId) {
        if (homeFxManager) { homeFxManager.clear(); homeFxManager = null; }
        itemToastQueue.value = [];
        isShowingItemToast.value = false;
        stageDisplayItem.value = null;
        triggeredEnding.value = null;
        sceneBgFailed.value = false;

        const ok = engine.value?.load(slotId);
        if (ok) {
            syncState();
            currentView.value = 'game';
            activeGamePanel.value = null;
            activeMenuPanel.value = null;
            uiVisible.value = true;

            // 读档后重新触发预判预加载
            _lastTrackedChapterId = null;
            _preloadOnChapterChange(currentChapterId.value);

            Vue.nextTick(() => {
                initGameEffects();
                updateSceneBgTest();
            });
        }
        return ok;
    }

    function clearSaveSlot(slotId) {
        const ok = engine.value?.clearSaveSlot(slotId);
        if (ok) saveSlotsData.value = engine.value.getSaveSlots();
        return ok;
    }

    function loadSaveSlots() {
        if (engine.value) {
            saveSlotsData.value = engine.value.getSaveSlots();
            unlockedGalleries.value = engine.value.saveManager.getGallery();
            unlockedEndings.value = engine.value.saveManager.getEndings();
        }
    }

    // ---- 特效管理 ----
    function initGameEffects() {
        const el = document.getElementById('particles-container');
        if (el) {
            fxManager = new EffectsManager(el);
            if (currentScreenEffect.value) fxManager.play(currentScreenEffect.value);
        }
    }

    function initHomeEffects(homeConfig) {
        Vue.nextTick(() => {
            const el = document.getElementById('home-particles-container');
            if (el && homeConfig?.screenEffect) {
                homeFxManager = new EffectsManager(el);
                homeFxManager.play(homeConfig.screenEffect);
            }
        });
    }

    function clearGameEffects() {
        if (fxManager) fxManager.clear();
        if (homeFxManager) { homeFxManager.clear(); homeFxManager = null; }
    }

    // ---- 场景背景检测 ----
    function updateSceneBgTest() {
        const step = engine.value?.currentStep;
        if (!step?.sceneId) {
            currentSceneTestUrl.value = null;
            return;
        }
        const sc = _scenes[step.sceneId];
        if (sc?.url) {
            currentSceneTestUrl.value = sc.url;
            sceneBgFailed.value = false;
            const img = new Image();
            img.onload  = () => { if (currentSceneTestUrl.value === sc.url) sceneBgFailed.value = false; };
            img.onerror = () => { if (currentSceneTestUrl.value === sc.url) sceneBgFailed.value = true; };
            img.src = sc.url;
        } else {
            currentSceneTestUrl.value = null;
            sceneBgFailed.value = true;
        }
    }

    function onSceneBgError() {
        sceneBgFailed.value = true;
    }

    // ---- 辅助 ----
    function exitToMenu() {
        clearGameEffects();
        currentView.value = 'menu';
        activeGamePanel.value = null;
        activeMenuPanel.value = null;
        loadSaveSlots();
    }

    // ---- 销毁 ----
    function destroy() {
        clearGameEffects();
        engine.value?.destroy();
        engine.value = null;
    }

    // ---- 预加载统计（供调试/UI 展示） ----
    const preloadStats = Vue.computed(() => ({
        ...chapterLoader.stats,
        pending: chapterLoader.getPendingChapters(),
        loaded: chapterLoader.getLoadedChapters().length,
    }));

    return {
        // 实例
        engine,
        resourceManager,
        chapterLoader,
        gameData,
        preloadStats,
        // 响应式状态
        currentView, activeMenuPanel, activeGamePanel, archiveMode, saveSlotsData, uiVisible,
        unlockedGalleries, unlockedEndings,
        currentChapterId, currentStepIndex, gameState, stageCharacters, historyLogs, lastSpeakerId,
        activeCG, activeEffects, currentScreenEffect, triggeredEnding,
        typedText, typingFinished, avatarLoadFail,
        stageDisplayItem, itemToastQueue, isShowingItemToast, selectedBagItemId,
        sceneBgFailed, currentSceneTestUrl,
        showLog, showInventory,
        activeInspectedCharId, activeSpriteIdForInspection, activeInspectedSpriteUrl, lightboxUrl,
        // 方法
        initEngine, loadEditorData, loadPackFromPath, importPackFromZip,
        getPackMeta, isPackLoaded,
        exportCurrentAsPack, exportCurrentAsZip,
        syncState, syncInventory,
        startNewGame, advanceStory, selectChoice, rollbackToTimeline,
        saveGame, loadGame, clearSaveSlot, loadSaveSlots,
        initGameEffects, initHomeEffects, clearGameEffects,
        updateSceneBgTest, onSceneBgError,
        enqueueItemToast, processItemToastQueue, dismissItemStageToast,
        exitToMenu, destroy,
    };
}

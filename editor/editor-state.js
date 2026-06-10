/**
 * editor/editor-state.js
 *
 * Vue 3 组合式 —— 响应式状态声明（ref / reactive）
 * 不包含 computed 和方法，仅提供原始状态引用
 */
// Vue APIs from global (Vue loaded via CDN <script> tag)
const { ref, reactive } = Vue;
import { clone } from './utils.js';

/**
 * @param {Object} initialData - 从 GameData 注入的初始数据
 * @returns {Object} 所有响应式状态引用
 */
export function useEditorState(initialData) {
    // ── 可编辑的游戏数据（全部 reactive 化） ────────────────────
    const gameScenes = reactive(clone(initialData.SCENES));
    const gameCharacters = reactive(clone(initialData.CHARACTERS));
    const gameCgLibrary = reactive(clone(initialData.CG_LIBRARY));
    const gameItems = reactive(clone(initialData.ITEMS));
    const gameEndings = reactive(clone(initialData.ENDINGS));
    const gameConfig = reactive(clone(initialData.GAME_CONFIG));

    // 原始数据备份（用于"还原"）
    const originalChapters = clone(initialData.STORY_CHAPTERS);
    const originalScenes = clone(initialData.SCENES);
    const originalCharacters = clone(initialData.CHARACTERS);
    const originalCgLibrary = clone(initialData.CG_LIBRARY);
    const originalItems = clone(initialData.ITEMS);
    const originalEndings = clone(initialData.ENDINGS);
    const originalConfig = clone(initialData.GAME_CONFIG);

    // ── 可编辑的章节数据 ──────────────────────────────────────
    const chapters = reactive(clone(initialData.STORY_CHAPTERS));
    const chapterDescriptions = reactive({});

    // ── 入口节点 ─────────────────────────────────────────────
    const entryPoints = reactive({ main: true });

    function isEntryPoint(nodeId) {
        return !!entryPoints[nodeId];
    }

    // ── 节点类型判定 ──────────────────────────────────────────
    const NODE_TYPE = { CHAPTER: 'chapter', ENDING: 'ending' };
    function getNodeType(id) {
        if (!id) return null;
        if (id.startsWith('_end_')) return NODE_TYPE.ENDING;
        return NODE_TYPE.CHAPTER;
    }
    function isEndingNode(id) { return getNodeType(id) === NODE_TYPE.ENDING; }

    // ── 角色名称/立绘查询（闭包绑定 gameCharacters） ─────────
    function getCharName(charId) {
        return gameCharacters[charId]?.name || charId;
    }
    function getCharSprites(charId) {
        if (!charId || !gameCharacters[charId]) return {};
        return gameCharacters[charId].sprites || {};
    }

    // ── 编辑器 UI 状态 ────────────────────────────────────────
    const selectedChapterId = ref(null);
    const selectedEndingId = ref(null);
    const editingStepIndex = ref(null);
    const hoveredNodeId = ref(null);

    // 同步 editingChapterId ← selectedChapterId（由 events 中的 watch 维护）
    const editingChapterId = ref('');

    const treePanel = ref(null);
    const viewScale = ref(1.0);
    const panX = ref(0);
    const panY = ref(0);
    const nodePositions = reactive({});

    const dragging = reactive({
        active: false, nodeId: null,
        startX: 0, startY: 0,
        nodeStartX: 0, nodeStartY: 0,
        multiDrag: false,
        nodeStartPositions: {},
    });
    const panning = reactive({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0 });
    const selection = reactive({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    const selectedNodeIds = reactive({});

    const contextMenu = reactive({ show: false, x: 0, y: 0, nodeId: null, groupId: null, worldX: 0, worldY: 0 });

    const showGameSettings = ref(false);
    const editableGameConfig = reactive({
        title: gameConfig.title || '',
        aspectWidth: gameConfig.aspectRatio?.width || 1280,
        aspectHeight: gameConfig.aspectRatio?.height || 720,
        textSpeed: gameConfig.textSpeed || 25,
    });

    const showResourceManager = ref(false);
    const resourceTab = ref('characters');
    const selectedResourceId = ref(null);

    const editingGlobalSearch = ref(false);
    const globalSearchQuery = ref('');
    const globalSearchInput = ref(null);

    const globalContextMenu = reactive({ show: false, x: 0, y: 0 });
    const showZoomInput = ref(false);
    const zoomPercent = ref(100);
    const detailPanelCollapsed = ref(false);
    const detailPanelWidth = ref(440);
    const showFileMenu = ref(false);

    const tooltip = reactive({ show: false, text: '', x: 0, y: 0 });
    const selectedSpriteId = ref(null);
    const showAvatarSection = ref(false);
    const resourceImageTarget = ref(null);

    const nodeStyles = reactive({});
    const editorGroups = reactive({});
    const canvasComments = reactive({});

    const portDragging = reactive({
        active: false,
        fromNodeId: null,
        fromPortIdx: null,
        fromStepIdx: null,
        fromChoiceIdx: null,
        mouseX: 0, mouseY: 0,
        snapTargetId: null,
    });

    const resizingNode = reactive({ active: false, nodeId: null, edge: null, startX: 0, startY: 0, startW: 0, startH: 0 });

    const batchEditMode = ref(false);
    const showEffectsManager = ref(false);
    const customEffects = reactive({});
    const selectedEffectId = ref(null);
    const effectPreviewRef = ref(null);
    const effectPreviewActive = ref(false);
    const builtinEffects = ['rain', 'snow', 'sakura', 'fire', 'stardust', 'bloodmoon', 'corruption'];

    const resourceMeta = {
        characters: { label: '角色', icon: '👤', data: gameCharacters, isObject: true },
        scenes: { label: '场景', icon: '🏞️', data: gameScenes, isObject: true },
        cg: { label: 'CG 图鉴', icon: '🖼️', data: gameCgLibrary, isObject: true },
        items: { label: '物品', icon: '🎒', data: gameItems, isObject: true },
        endings: { label: '结局', icon: '🎬', data: gameEndings, isObject: false },
    };

    const toastMsg = ref('');
    const showExportModal = ref(false);
    const exportContent = ref('');
    const exportModalTitle = ref('');

    const selectedGroupId = ref(null);
    const availableEffects = ['vignette', 'dim', 'screenShake', 'flashWhite', 'flashBlack'];

    return {
        gameScenes, gameCharacters, gameCgLibrary, gameItems, gameEndings, gameConfig,
        originalChapters, originalScenes, originalCharacters, originalCgLibrary,
        originalItems, originalEndings, originalConfig,
        chapters, chapterDescriptions,
        entryPoints, isEntryPoint, NODE_TYPE, getNodeType, isEndingNode,
        getCharName, getCharSprites,

        selectedChapterId, selectedEndingId, editingStepIndex, hoveredNodeId,
        editingChapterId,
        treePanel, viewScale, panX, panY, nodePositions,
        dragging, panning, selection, selectedNodeIds,
        contextMenu, showGameSettings, editableGameConfig,
        showResourceManager, resourceTab, selectedResourceId,
        resourceMeta,
        editingGlobalSearch, globalSearchQuery, globalSearchInput,
        globalContextMenu,
        showZoomInput, zoomPercent,
        detailPanelCollapsed, detailPanelWidth,
        showFileMenu, tooltip, selectedSpriteId, showAvatarSection,
        resourceImageTarget,
        nodeStyles, editorGroups, canvasComments,
        portDragging, resizingNode,
        batchEditMode, showEffectsManager, customEffects, selectedEffectId,
        effectPreviewRef, effectPreviewActive, builtinEffects,
        toastMsg, showExportModal, exportContent, exportModalTitle,
        selectedGroupId, availableEffects,
    };
}

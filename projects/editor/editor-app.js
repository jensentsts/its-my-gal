/**
 * editor/editor-app.js
 *
 * 剧情树节点编辑器 —— Vue 3 应用主入口（编排器）。
 *
 * 各领域逻辑委托给模块：
 *   actions/  — 数据操作（章节/步骤/资源/分组/设置）
 *   interaction/ — 交互逻辑（画布/右键菜单/键盘）
 *   ui/       — 界面功能（视图控制/搜索/预览/导出导入）
 *   core/     — 核心系统（撤销/树数据）
 *   utils/    — 工具函数
 */

import * as GameData from '../../resource-packs/default/index.js';
import { ResourcePathResolver } from '../engine/index.js';
import { analyzeTree, computeLayout, computeEndingLayout, computeEdgePath } from './tree-layout.js';
import { clone, uid } from './helpers.js';
import {
    stepTextBrief, stepTypeLabel, isStepEditLocked, isStepLocked,
    getNodeType, isEndingNode, NODE_TYPE,
    ANIM_ENTER, ANIM_LEAVE, ANIM_MOVE, POSITIONS, FX_CHAR, ACTIONS, DURATIONS,
    builtinCharEffects, builtinEffects, availableEffects,
    createNameHelpers,
} from './step-utils.js';
import { createUndoSystem } from './undo.js';
import { createTreeData } from './tree-data.js';

import { createChapterOps } from './actions/chapter-ops.js';
import { createResourceOps } from './actions/resource-ops.js';
import { createGroupOps } from './actions/group-ops.js';
import { createSettings } from './actions/settings.js';
import { createCanvas } from './interaction/canvas.js';
import { createContextMenu } from './interaction/context-menu.js';
import { createKeyboard } from './interaction/keyboard.js';
import { createViewControls } from './ui/view-controls.js';
import { createSearch } from './ui/search.js';
import { createPreview } from './ui/preview.js';
import { createExportImport } from './ui/export-import.js';
import { createTerminal } from './ui/terminal.js';
import { createWindowManager } from './ui/window-manager.js';
import { mountGamePlayer } from '../game/app/mount-game.js';

const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick, provide } = Vue;

// ══════════════════════════════════════════════════════════════
//  Component registrations (loaded after app creation)
// ══════════════════════════════════════════════════════════════
import ToastNotification from './components/ToastNotification.js';
import ExportModal from './components/ExportModal.js';
import GlobalContextMenu from './components/GlobalContextMenu.js';
import TerminalPanel from './components/TerminalPanel.js';
import EditorToolbar from './components/EditorToolbar.js';
import TreeCanvas from './components/TreeCanvas.js';
import StepDetailPanel from './components/StepDetailPanel.js';
import DetailPanel from './components/DetailPanel.js';
import GameSettingsWindow from './components/GameSettingsWindow.js';
import ResourceManagerWindow from './components/ResourceManagerWindow.js';
import ResourceCharEffectEditor from './components/ResourceCharEffectEditor.js';
import ResourceEffectEditor from './components/ResourceEffectEditor.js';
import ResourceChapterStepEditor from './components/ResourceChapterStepEditor.js';

const app = createApp({
    setup() {
        // ══════════════════════════════════════════════════════════════
        //  1. 游戏数据
        // ══════════════════════════════════════════════════════════════
        const gameScenes = reactive(clone(GameData.SCENES));
        const gameCharacters = reactive(clone(GameData.CHARACTERS));
        const gameCgLibrary = reactive(clone(GameData.CG_LIBRARY));
        const gameItems = reactive(clone(GameData.ITEMS));
        const gameEndings = reactive(clone(GameData.ENDINGS));
        const gameConfig = reactive(clone(GameData.GAME_CONFIG));

        const originalChapters = clone(GameData.STORY_CHAPTERS);
        const originalScenes = clone(GameData.SCENES);
        const originalCharacters = clone(GameData.CHARACTERS);
        const originalCgLibrary = clone(GameData.CG_LIBRARY);
        const originalItems = clone(GameData.ITEMS);
        const originalEndings = clone(GameData.ENDINGS);
        const originalConfig = clone(GameData.GAME_CONFIG);

        const chapters = reactive(clone(GameData.STORY_CHAPTERS));
        const chapterDescriptions = reactive(clone(GameData.CHAPTER_DESCRIPTIONS || {}));
        const entryPoints = reactive({ main: true });
        const editorPathResolver = new ResourcePathResolver();

        // ══════════════════════════════════════════════════════════════
        //  2. 编辑器 UI 状态
        // ══════════════════════════════════════════════════════════════
        const selectedChapterId = ref(null);
        const selectedEndingId = ref(null);
        const editingStepIndex = ref(null);
        const hoveredNodeId = ref(null);
        const selectedEdge = ref(null);
        const treePanel = ref(null);
        const viewScale = ref(1.0);
        const panX = ref(0);
        const panY = ref(0);
        const nodePositions = reactive({});
        const dragging = reactive({ active:false, nodeId:null, startX:0, startY:0, nodeStartX:0, nodeStartY:0, multiDrag:false, nodeStartPositions:{} });
        const panning = reactive({ active:false, startX:0, startY:0, origPanX:0, origPanY:0 });
        const selection = reactive({ active:false, startX:0, startY:0, endX:0, endY:0 });
        const selectedNodeIds = reactive({});
        const contextMenu = reactive({ show:false, x:0, y:0, nodeId:null, groupId:null, worldX:0, worldY:0, zIndex:100 });
        // 窗口管理器（取代旧有的模态弹窗系统）
        const windowManager = createWindowManager();
        // 注册调试窗口
        windowManager.register('gameDebug', {
            title: '游戏调试', icon: '🎮',
            x: 40, y: 40, width: 1200, height: 800,
            minWidth: 800, minHeight: 600,
        });
        const showGameSettings = windowManager.compat.gameSettings;
        const showResourceManager = windowManager.compat.resourceManager;

        const editableHomeConfig = reactive({ panelBgUrl:GameData.HOME_CONFIG?.panelBackground?.url||'', panelOverlayColor:GameData.HOME_CONFIG?.panelBackground?.overlayColor||'rgba(4,4,10,0.88)', panelOverlayGradient:GameData.HOME_CONFIG?.panelBackground?.overlayGradient||'' });
        const editableGameConfig = reactive({ title:gameConfig.title||'', aspectWidth:gameConfig.aspectRatio?.width||1280, aspectHeight:gameConfig.aspectRatio?.height||720, textSpeed:gameConfig.textSpeed||25 });
        const resourceTab = ref('characters');
        const selectedResourceId = ref(null);
        const resEditStepIndex = ref(null);
        const editingGlobalSearch = ref(false);
        const globalSearchQuery = ref('');
        const globalSearchInput = ref(null);
        const globalContextMenu = reactive({ show:false, x:0, y:0, focusIndex:0, zIndex:1000 });
        const showZoomInput = ref(false);
        const zoomPercent = ref(100);
        const detailPanelCollapsed = ref(false);
        const detailPanelWidth = ref(440);
        const detailPanelHeight = ref(null); // null = auto height
        const resourceListWidth = ref(240);  // 资源管理器左侧列表宽度
        const stepDetailWidth = ref(380);    // 步骤编辑面板宽度
        const stepListFocusIndex = ref(0);
        const showFileMenu = ref(false);
        const selectedSpriteId = ref(null);
        const selectedAvatarIdx = ref(-1);
        const showAvatarSection = ref(false);
        const resourceImageTarget = ref(null);
        // 头像编辑列表 —— 将 avatars 对象转成数组，支持稳定的响应式双向绑定
        const avatarList = ref([]);
        const nodeStyles = reactive({});
        const editorGroups = reactive({});
        const portDragging = reactive({ active:false, fromNodeId:null, fromPortIdx:null, fromStepIdx:null, fromChoiceIdx:null, mouseX:0, mouseY:0, snapTargetId:null, isEndingPort:false });
        const resizingNode = reactive({ active:false, nodeId:null, edge:null, startX:0, startY:0, startW:0, startH:0 });
        const contextMenuFocusIndex = ref(-1);
        const customEffects = reactive({});
        const effectPreviewRef = ref(null);
        const effectPreviewActive = ref(false);
        const customCharEffects = reactive({});
        const charEffectPreviewRef = ref(null);
        const charEffectPreviewActive = ref(false);
        const editingCharEffect = reactive({});
        const chapterRenameIds = reactive({});
        const selectedGroupId = ref(null);
        const toastMsg = ref('');
        const showExportModal = ref(false);
        const exportContent = ref('');
        const exportModalTitle = ref('');
        const editingChapterId = ref('');

        // ══════════════════════════════════════════════════════════════
        //  3. 名称查询工厂
        // ══════════════════════════════════════════════════════════════
        const { getCharName, getCharSprites } = createNameHelpers(gameCharacters);

        // ══════════════════════════════════════════════════════════════
        //  4. 撤销/重做系统
        // ══════════════════════════════════════════════════════════════
        const undoSystem = createUndoSystem(chapters, chapterDescriptions, nodePositions, nodeStyles, gameEndings, editorGroups, entryPoints);

        // ══════════════════════════════════════════════════════════════
        //  5. 树数据结构
        // ══════════════════════════════════════════════════════════════
        const treeData = createTreeData({ chapters, nodePositions, nodeStyles, gameEndings, chapterDescriptions, entryPoints, selection, panX, panY, viewScale, selectedChapterId, selectedEndingId, selectedEdge, editorGroups });

        // ══════════════════════════════════════════════════════════════
        //  6. 本地计算属性
        // ══════════════════════════════════════════════════════════════
        const editingSteps = computed(() => !selectedChapterId.value ? [] : chapters[selectedChapterId.value] || []);
        const editingStep = computed({ get:() => {
            if (editingStepIndex.value === null || !selectedChapterId.value) return null;
            const steps = chapters[selectedChapterId.value];
            if (!steps || editingStepIndex.value >= steps.length) return null;
            const step = steps[editingStepIndex.value];
            if (!step._cgAction) { step._cgAction = step.cgChanges?.action||''; step._cgId = step.cgChanges?.id||''; step._cgAnimation = step.cgChanges?.animation||''; step._cgEffect = step.cgChanges?.effect||''; }
            if (!step._charChanges) { step._charChanges = clone(step.characterChanges||[]); for (const cc of step._charChanges) { if (Array.isArray(cc.ids)) cc.ids = cc.ids.join(', '); if (Array.isArray(cc.weights)) cc.weights = cc.weights.join(', '); } }
            return step;
        }, set:()=>{} });

        const resourceMeta = {
            chapters:{label:'章节',icon:'📜',data:chapters,isObject:true,isChapter:true},
            characters:{label:'角色',icon:'👤',data:gameCharacters,isObject:true},
            scenes:{label:'场景',icon:'🏞️',data:gameScenes,isObject:true},
            cg:{label:'CG 图鉴',icon:'🖼️',data:gameCgLibrary,isObject:true},
            items:{label:'物品',icon:'🎒',data:gameItems,isObject:true},
            endings:{label:'结局',icon:'🎬',data:gameEndings,isObject:false},
            charEffects:{label:'角色变更',icon:'🎭',data:customCharEffects,isObject:true,isCharEffects:true},
            effects:{label:'特效',icon:'✨',data:customEffects,isObject:true,isEffects:true},
        };

        const resourceList = computed(() => {
            const meta = resourceMeta[resourceTab.value]; if (!meta) return [];
            if (meta.isObject) {
                if (meta.isChapter) return Object.entries(meta.data).map(([id,s]) => ({ id, stepCount:s.length, title:id }));
                if (meta.isEffects) {
                    const items = Object.entries(meta.data).map(([id,it]) => ({ id, name:it.name||id, icon:it.icon||'✨', _isCustom:true }));
                    for (const n of builtinEffects) if (!meta.data[n]) items.push({ id:n, name:n, icon:getEffectIcon(n), _isBuiltin:true });
                    return items;
                }
                if (meta.isCharEffects) {
                    const items = Object.entries(meta.data).map(([id,it]) => ({ id, name:it.name||id, icon:it.icon||'🎭', _isCustom:true }));
                    for (const [bid, p] of Object.entries(builtinCharEffects)) if (!meta.data[bid]) items.push({ id:bid, name:p.name, icon:p.icon||'🎭', _isBuiltin:true });
                    return items;
                }
                return Object.entries(meta.data).map(([id,it]) => ({ id, ...it }));
            }
            return (meta.data||[]).map((it,i) => ({ _idx:i, id:it.id, ...it }));
        });

        const selectedResource = computed(() => {
            if (!selectedResourceId.value) return null;
            const meta = resourceMeta[resourceTab.value]; if (!meta) return null;
            if (meta.isObject) {
                if (meta.isChapter) { const s = meta.data[selectedResourceId.value]; return { id:selectedResourceId.value, _steps:s||[], _renameId:chapterRenameIds[selectedResourceId.value]||'' }; }
                if (meta.isCharEffects) return editingCharEffect.action ? editingCharEffect : builtinCharEffects[selectedResourceId.value] || meta.data[selectedResourceId.value] || null;
                return meta.data[selectedResourceId.value] || null;
            }
            return (meta.data||[]).find(e => e.id === selectedResourceId.value) || null;
        });

        const resEditStep = computed({ get:() => {
            if (resEditStepIndex.value === null || !selectedResourceId.value) return null;
            const steps = chapters[selectedResourceId.value];
            if (!steps || resEditStepIndex.value >= steps.length) return null;
            const step = steps[resEditStepIndex.value];
            if (!step._cgAction) { step._cgAction = step.cgChanges?.action||''; step._cgId = step.cgChanges?.id||''; step._cgAnimation = step.cgChanges?.animation||''; step._cgEffect = step.cgChanges?.effect||''; }
            if (!step._charChanges) { step._charChanges = clone(step.characterChanges||[]); for (const cc of step._charChanges) { if (Array.isArray(cc.ids)) cc.ids = cc.ids.join(', '); if (Array.isArray(cc.weights)) cc.weights = cc.weights.join(', '); } }
            return step;
        }, set:()=>{} });

        const selectedEndingPreview = computed(() => {
            if (!editingStep.value) return null;
            return (editingStep.value.type === 'ending' || (editingStep.value.type === 'jump' && editingStep.value.endingId))
                ? gameEndings.find(e => e.id === editingStep.value.endingId) || null : null;
        });

        // ══════════════════════════════════════════════════════════════
        //  7a. 头像编辑列表同步（avatars 对象 ↔ avatarList 数组）
        // ══════════════════════════════════════════════════════════════
        let _avatarSyncLock = false;

        // 头像对象 → 数组（资源切换时同步）
        watch([selectedResourceId, resourceTab], () => {
            const res = selectedResource.value;
            if (!res || !res.avatars) { avatarList.value = []; return; }
            _avatarSyncLock = true;
            avatarList.value = Object.entries(res.avatars).map(([id, url]) => ({ id, url }));
            _avatarSyncLock = false;
        }, { flush: 'post' });

        // 头像数组 → 对象（编辑时即时同步回数据模型）
        watch(avatarList, (list) => {
            if (_avatarSyncLock) return;
            const res = selectedResource.value;
            if (!res) return;
            if (!res.avatars) res.avatars = {};
            // 重建目标对象
            const rebuilt = {};
            for (const entry of list) if (entry.id.trim()) rebuilt[entry.id.trim()] = entry.url;
            // 比较 keys + values，避免无意义写入导致循环
            const curStr = JSON.stringify(res.avatars);
            const newStr = JSON.stringify(rebuilt);
            if (curStr === newStr) return;
            // 用新内容替换旧对象
            for (const k of Object.keys(res.avatars)) delete res.avatars[k];
            for (const [k, v] of Object.entries(rebuilt)) res.avatars[k] = v;
        }, { deep: true, flush: 'sync' });

        // ══════════════════════════════════════════════════════════════
        //  7. 步骤拖拽排序
        // ══════════════════════════════════════════════════════════════
        function createStepDragHandler(chapterIdRef, stepIdxRef) {
            const state = reactive({ dragging:false, dragIndex:-1, dropIndex:-1 });
            function dragStart(e, i) {
                const steps = chapters[chapterIdRef.value];
                if (!steps || isStepLocked(steps, i)) return;
                state.dragging = true; state.dragIndex = i;
                e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i));
            }
            function dragOver(e, i) {
                if (!state.dragging) return;
                const steps = chapters[chapterIdRef.value];
                if (!steps || isStepLocked(steps, i)) return;
                e.preventDefault(); state.dropIndex = i; e.dataTransfer.dropEffect = 'move';
            }
            function drop(e, i) {
                e.preventDefault(); if (!state.dragging) return;
                const steps = chapters[chapterIdRef.value];
                if (!steps || !chapterIdRef.value) { state.dragging = false; return; }
                const from = state.dragIndex; let to = i;
                if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) { state.dragging = false; return; }
                if (isStepLocked(steps, from) || isStepLocked(steps, to)) { state.dragging = false; return; }
                if (isStepEditLocked(steps[from]) || isStepEditLocked(steps[to])) { showToast('⚠ 步骤已锁定，无法移动'); state.dragging = false; return; }
                const lastLocked = isStepLocked(steps, steps.length - 1);
                if (lastLocked && to >= steps.length - 1) { to = steps.length - 2; if (to < 0 || to === from) { state.dragging = false; return; } }
                undoSystem.saveUndoSnapshot();
                const [moved] = steps.splice(from, 1);
                const adj = from < to ? to - 1 : to;
                steps.splice(adj, 0, moved);
                if (stepIdxRef.value === from) stepIdxRef.value = adj;
                else if (from < stepIdxRef.value && stepIdxRef.value <= adj) stepIdxRef.value--;
                else if (from > stepIdxRef.value && stepIdxRef.value >= adj) stepIdxRef.value++;
                state.dragging = false; state.dragIndex = -1; state.dropIndex = -1;
            }
            function dragEnd() { state.dragging = false; state.dragIndex = -1; state.dropIndex = -1; }
            return { state, dragStart, dragOver, drop, dragEnd };
        }

        const resDrag = createStepDragHandler(selectedResourceId, resEditStepIndex);
        const detDrag = createStepDragHandler(selectedChapterId, editingStepIndex);

        // ══════════════════════════════════════════════════════════════
        //  8. 共享上下文 & 函数注册表
        // ══════════════════════════════════════════════════════════════
        const ctx = {
            chapters, chapterDescriptions, nodePositions, nodeStyles,
            gameEndings, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameConfig,
            entryPoints, editorGroups,
            selectedChapterId, selectedEndingId, selectedEdge,
            editingStepIndex, editingChapterId,
            treePanel, viewScale, panX, panY,
            dragging, panning, selection, selectedNodeIds,
            contextMenu, showGameSettings, editableGameConfig, editableHomeConfig,
            showResourceManager, resourceTab, selectedResourceId,
            resourceMeta, chapterRenameIds,
            showExportModal, exportContent, exportModalTitle,
            showFileMenu,
            showZoomInput, zoomPercent, detailPanelCollapsed, detailPanelWidth, detailPanelHeight,
            resourceListWidth, stepDetailWidth,
            stepListFocusIndex, contextMenuFocusIndex,
            customEffects, effectPreviewRef, effectPreviewActive,
            editingCharEffect, charEffectPreviewRef, charEffectPreviewActive,
            customCharEffects,
            selectedSpriteId, selectedAvatarIdx, showAvatarSection, avatarList,
            resourceImageTarget,
            globalContextMenu, editingGlobalSearch, globalSearchQuery, globalSearchInput,
            portDragging, resizingNode,
            selectedGroupId, toastMsg,
            hoveredNodeId,
            treeNodes: treeData.treeNodes,
            treeEdges: treeData.treeEdges,
            totalChapters: treeData.totalChapters,
            totalSteps: treeData.totalSteps,
            totalChoices: treeData.totalChoices,
            chapterOutgoing: treeData.chapterOutgoing,
            chapterIncomingCount: treeData.chapterIncomingCount,
            selectedEndingNode: treeData.selectedEndingNode,
            selectedEndingData: treeData.selectedEndingData,
            endingIncomingChapters: treeData.endingIncomingChapters,
            worldStyle: treeData.worldStyle,
            selectionBoxStyle: treeData.selectionBoxStyle,
            editingSteps, editingStep, resEditStep, resourceList, selectedResource,
            saveUndoSnapshot: undoSystem.saveUndoSnapshot,
            undoCount: undoSystem.undoCount, redoCount: undoSystem.redoCount,
            undo: undoSystem.undo, redo: undoSystem.redo,
            originalChapters, originalScenes, originalCharacters,
            originalCgLibrary, originalItems, originalEndings, originalConfig,
            editorPathResolver, getCharName, getCharSprites,
            isStepEditLocked, isStepLocked,
            resEditStepIndex,
            // 窗口管理器
            windowManager,
        };

        const ops = {};

        // 核心工具函数（优先于模块加载）
        let toastTimer = null;
        ops.showToast = (msg) => { toastMsg.value = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2500); };
        // 在 ctx 中也注入 showToast，供通过 ctx 引用的模块使用
        ctx.showToast = ops.showToast;
        ops.saveUndoSnapshot = undoSystem.saveUndoSnapshot;

        // ══════════════════════════════════════════════════════════════
        //  9. 核心视图状态操作（必须优先注册，被所有模块依赖）
        // ══════════════════════════════════════════════════════════════

        /** 选中一个节点（章节或结局） */
        ops.selectNode = (nodeId) => {
            const tid = nodeId || '';
            if (tid.startsWith('_end_')) {
                selectedEndingId.value = tid;
                selectedChapterId.value = null;
            } else {
                selectedChapterId.value = tid;
                selectedEndingId.value = null;
            }
            editingStepIndex.value = null;
        };

        /** 选中一个步骤 */
        ops.selectStep = (index) => {
            if (ops.saveUndoSnapshot) ops.saveUndoSnapshot();
            editingStepIndex.value = index;
        };

        /** 定位到指定对象（在树中选中并聚焦，或打开资源管理器） */
        ops.locateTo = (type, id, subId) => {
            switch (type) {
                case 'chapter':
                    ops.selectNode(id);
                    const chNode = treeData.treeNodes.value.find(n => n.id === id);
                    if (chNode && ops.zoomToNode) ops.zoomToNode(chNode);
                    break;
                case 'ending':
                    ops.selectNode(id);
                    const enNode = treeData.treeNodes.value.find(n => n.id === id);
                    if (enNode && ops.zoomToNode) ops.zoomToNode(enNode);
                    break;
                case 'resource':
                    // 打开资源管理器但不改变窗口状态（位置/全屏/最大化）
                    {
                        const w = windowManager.windows.resourceManager;
                        if (w) {
                            if (!w.visible) w.visible = true;
                            windowManager.focusWindow('resourceManager');
                        }
                    }
                    resourceTab.value = subId || 'characters';
                    selectedResourceId.value = id;
                    break;
                default: break;
            }
        };

        /** 清除所有节点的框选状态 */
        ops.clearNodeSelection = () => {
            for (const key of Object.keys(selectedNodeIds)) {
                delete selectedNodeIds[key];
            }
        };

        /** 清除全部选中状态（选择 + 框选 + 当前编辑步骤） */
        ops.clearSelection = () => {
            for (const key of Object.keys(selectedNodeIds)) {
                delete selectedNodeIds[key];
            }
            selectedChapterId.value = null;
            selectedEndingId.value = null;
            selectedEdge.value = null;
            editingStepIndex.value = null;
        };

        /** 更新端口连线的跳转目标 */
        ops.updatePortTarget = (port, newTargetId) => {
            if (ops.saveUndoSnapshot) ops.saveUndoSnapshot();
            const steps = chapters[portDragging.fromNodeId];
            if (!steps) return;
            const step = steps[port.stepIdx];
            if (!step) return;
            if (port.choiceIdx !== undefined && step.choices) {
                step.choices[port.choiceIdx].jumpChapter = newTargetId;
            } else if (port.type === 'jump-ending' || port.isEnding) {
                if (newTargetId.startsWith('_end_')) {
                    step.endingId = newTargetId.slice(5);
                    step.jumpChapter = '';
                } else {
                    ops.showToast('❌ 结局触发只能连接到结局节点（_end_*）');
                    return;
                }
            } else {
                step.jumpChapter = newTargetId;
            }
            port.targetId = newTargetId;
            port.isEnding = newTargetId.startsWith('_end_');
            ops.showToast(`跳转目标已更新 → ${newTargetId}`);
        };

        /** 自动创建缺失的结局数据（当选中一个在 gameEndings 中不存在的结局节点时） */
        ops.createMissingEnding = () => {
            const node = treeData.selectedEndingNode.value;
            if (!node || !node.endingId) return;
            const id = node.endingId;
            if (gameEndings.find(e => e.id === id)) {
                ops.showToast('✅ 结局数据已存在');
                return;
            }
            gameEndings.push({ id, title: id, description: '' });
            ops.showToast(`✅ 已自动创建缺失结局「${id}」`);
        };

        // ══════════════════════════════════════════════════════════════
        //  10. 加载模块（按依赖顺序）
        // ══════════════════════════════════════════════════════════════
        Object.assign(ops, createChapterOps(ctx, ops));
        Object.assign(ops, createResourceOps(ctx, ops));
        Object.assign(ops, createGroupOps(ctx, ops));
        Object.assign(ops, createSettings(ctx, ops));
        Object.assign(ops, createViewControls(ctx, ops));
        Object.assign(ops, createCanvas(ctx, ops));
        Object.assign(ops, createContextMenu(ctx, ops));
        Object.assign(ops, createExportImport(ctx, ops));
        Object.assign(ops, createPreview(ctx, ops));
        Object.assign(ops, createSearch(ctx, ops));
        Object.assign(ops, createKeyboard(ctx, ops));

        // ══════════════════════════════════════════════════════════════
        //  终端面板（在生命周期中注册全局快捷键）
        // ══════════════════════════════════════════════════════════════
        const terminal = createTerminal(ctx, ops);
        Object.assign(ops, terminal);

        // 终端可见性 ↦ 窗口管理器同步（含边栏处理）
        watch(terminal.terminalVisible, (v) => {
            if (!windowManager.windows.terminal) return;
            if (v) {
                // 打开：如果已停靠则弹出，否则打开
                if (windowManager.isDocked('terminal')) {
                    for (const side of ['left','right','bottom']) {
                        const idx = windowManager.docks[side].findIndex(e => e.id === 'terminal');
                        if (idx >= 0) { windowManager.undockDockItem(side, idx); break; }
                    }
                } else {
                    windowManager.openWindow('terminal');
                }
            } else {
                // 关闭：如果已停靠则不需要操作
                if (!windowManager.isDocked('terminal')) {
                    windowManager.closeWindow('terminal');
                }
            }
        }, { immediate: false });


        // ══════════════════════════════════════════════════════════════
        //  游戏调试窗口
        // ══════════════════════════════════════════════════════════════
        let _debugPlayer = null;
        const DEBUG_STYLE_IDS = ['gal-debug-base','gal-debug-effects','gal-debug-game','gal-debug-menu'];
        const DEBUG_STYLE_URLS = [
            'projects/game/app/styles/base.css',
            'projects/game/app/styles/effects.css',
            'projects/game/app/styles/game.css',
            'projects/game/app/styles/menu.css',
        ];

        function _injectDebugStyles() {
            for (let i = 0; i < DEBUG_STYLE_URLS.length; i++) {
                if (!document.getElementById(DEBUG_STYLE_IDS[i])) {
                    const link = document.createElement('link');
                    link.id = DEBUG_STYLE_IDS[i];
                    link.rel = 'stylesheet';
                    link.href = DEBUG_STYLE_URLS[i];
                    document.head.appendChild(link);
                }
            }
            // 覆盖 CSS：让游戏容器化，不从固定定位溢出
            if (!document.getElementById('gal-debug-override')) {
                const style = document.createElement('style');
                style.id = 'gal-debug-override';
                style.textContent = `
                    .game-debug-body {
                        position: relative !important;
                    }
                    .game-debug-body .game-view {
                        position: absolute !important;
                        inset: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    .game-debug-body .menu-view {
                        position: absolute !important;
                        inset: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        min-height: 0 !important;
                    }
                    .game-debug-body .game-viewport {
                        top: 50% !important;
                        left: 50% !important;
                    }
                    .game-debug-body .game-player-root {
                        width: 100% !important;
                        height: 100% !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        function _removeDebugStyles() {
            for (const id of [...DEBUG_STYLE_IDS, 'gal-debug-override']) {
                const el = document.getElementById(id);
                if (el) el.remove();
            }
        }

        ops.openGameDebug = () => {
            // 1. 保存当前编辑器数据到 localStorage
            ops.syncToGame();

            // 2. 注入游戏 CSS + 容器覆盖
            _injectDebugStyles();

            // 3. 打开窗口并默认最大化
            windowManager.openWindow('gameDebug');
            const dw = windowManager.windows.gameDebug;
            if (dw && !dw.maximized) {
                windowManager.toggleMaximize('gameDebug');
            }

            // 4. 挂载游戏实例
            nextTick(() => {
                const container = document.getElementById('game-debug-container');
                if (container && !_debugPlayer) {
                    try {
                        _debugPlayer = mountGamePlayer(container, {
                            STORY_CHAPTERS: JSON.parse(JSON.stringify(chapters)),
                            CHARACTERS: gameCharacters,
                            SCENES: gameScenes,
                            CG_LIBRARY: gameCgLibrary,
                            ITEMS: gameItems,
                            ENDINGS: gameEndings,
                            GAME_CONFIG: gameConfig,
                            HOME_CONFIG: GameData.HOME_CONFIG,
                            CHAPTER_DESCRIPTIONS: chapterDescriptions,
                        }, { loadEditorData: true });
                        ops.showToast('🎮 调试模式已启动');
                    } catch (e) {
                        ops.showToast('❌ 调试启动失败: ' + e.message);
                        console.error('[Debug] mountGamePlayer error:', e);
                    }
                }
            });
        };

        ops.closeGameDebug = () => {
            if (_debugPlayer) {
                _debugPlayer.unmount();
                _debugPlayer = null;
            }
            _removeDebugStyles();
            windowManager.closeWindow('gameDebug');
        };

        // 窗口关闭时自动卸载
        watch(() => windowManager.windows.gameDebug?.visible, (visible) => {
            if (!visible && _debugPlayer) {
                _debugPlayer.unmount();
                _debugPlayer = null;
                _removeDebugStyles();
            }
        });


        // ══════════════════════════════════════════════════════════════
        //  11. 生命周期
        // ══════════════════════════════════════════════════════════════
        const _preventCM = e => e.preventDefault();

        /** 中间键按下：画布平移（capture 阶段监听，绕过子元素 .stop 拦截） */
        function _onMiddleMouseDown(e) {
            if (e.button !== 1) return;
            panning.active = true; panning.startX = e.clientX; panning.startY = e.clientY;
            panning.origPanX = panX.value; panning.origPanY = panY.value;
            const onMove = (ev) => {
                if (!panning.active) { window.removeEventListener('mousemove', onMove); return; }
                panX.value = panning.origPanX + (ev.clientX - panning.startX);
                panY.value = panning.origPanY + (ev.clientY - panning.startY);
            };
            const onUp = () => {
                panning.active = false;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            e.preventDefault();
        }

        onMounted(() => {
            if (Object.keys(chapters).length === 0) ops.showToast('⚠️ 当前资源包中无任何剧情章节，请在画布上右键创建新章节');
            ops.autoLayout();
            undoSystem.saveUndoSnapshot();
            window.addEventListener('mouseup', ops.onCanvasMouseUp);
            window.addEventListener('mousedown', _onMiddleMouseDown, true);
            document.addEventListener('contextmenu', _preventCM, true);
            document.addEventListener('selectstart', ops.onGlobalSelectStart);
            document.addEventListener('dragstart', ops.onGlobalDragStart);
            document.addEventListener('keydown', ops.onGlobalKeyDown);
            document.addEventListener('keydown', ops.onTerminalGlobalKeydown);
            document.title = '剧情树节点编辑器 — ' + (gameConfig.title || 'Galgame');
            // 终端欢迎信息
            ops.termWelcome();
        });
        watch(() => gameConfig.title, t => { document.title = '剧情树节点编辑器 — ' + (t || 'Galgame'); });
        onUnmounted(() => {
            window.removeEventListener('mouseup', ops.onCanvasMouseUp);
            window.removeEventListener('mousedown', _onMiddleMouseDown, true);
            document.removeEventListener('contextmenu', _preventCM, true);
            document.removeEventListener('selectstart', ops.onGlobalSelectStart);
            document.removeEventListener('dragstart', ops.onGlobalDragStart);
            document.removeEventListener('keydown', ops.onGlobalKeyDown);
            document.removeEventListener('keydown', ops.onTerminalGlobalKeydown);
        });

        // ══════════════════════════════════════════════════════════════
        //  12. 返回模板绑定
        // ══════════════════════════════════════════════════════════════
        function getEffectIcon(name) {
            const m = { rain:'🌧️', snow:'❄️', sakura:'🌸', fire:'🔥', stardust:'✨', bloodmoon:'🩸', corruption:'🌑' };
            return m[name] || '✨';
        }

        // 点击外部时关闭所有弹出菜单
        ops.closeAllMenus = () => {
            if (ops.closeContextMenu) ops.closeContextMenu();
            if (ops.closeGlobalContextMenu) ops.closeGlobalContextMenu();
        };

        // ══════════════════════════════════════════════════════════
        //  13. 构建编辑器状态（provide → inject 给子组件）
        // ══════════════════════════════════════════════════════════
        const appState = reactive({
            // 数据状态
            ...ctx,
            // 覆盖 selectedEndingPreview（tree-data 中的 stub）
            selectedEndingPreview,
            // 纯函数（不包含在 ctx 中）
            getNodeType, isEndingNode, NODE_TYPE,
            stepTextBrief, stepTypeLabel, isStepEditLocked, isStepLocked,
            getCharName, getCharSprites,
            ANIM_ENTER, ANIM_LEAVE, ANIM_MOVE, POSITIONS, FX_CHAR, ACTIONS, DURATIONS,
            availableEffects, builtinCharEffects, builtinEffects,
            getEffectIcon,
            // 撤销/重做（显式覆盖 ctx 中的同名属性）
            undo: undoSystem.undo,
            redo: undoSystem.redo,
            undoCount: undoSystem.undoCount,
            redoCount: undoSystem.redoCount,
            // 步骤拖拽
            resStepDrag: resDrag.state, resStepDragStart: resDrag.dragStart,
            resStepDragOver: resDrag.dragOver, resStepDrop: resDrag.drop, resStepDragEnd: resDrag.dragEnd,
            detailStepDrag: detDrag.state, detailStepDragStart: detDrag.dragStart,
            detailStepDragOver: detDrag.dragOver, detailStepDrop: detDrag.drop, detailStepDragEnd: detDrag.dragEnd,
            // 终端面板
            terminalVisible: terminal.terminalVisible,
            terminalLines: terminal.terminalLines,
            terminalInput: terminal.terminalInput,
            terminalFullscreen: terminal.terminalFullscreen,
            terminalHeight: terminal.terminalHeight,
            terminalPanelClass: terminal.terminalPanelClass,
            // 窗口管理器
            windows: windowManager.windows,
            docks: windowManager.docks,
            dockActiveIdx: windowManager.dockActiveIdx,
            snapPreview: windowManager.snapPreview,
            openWindow: windowManager.openWindow,
            closeWindow: windowManager.closeWindow,
            toggleWindow: windowManager.toggleWindow,
            focusWindow: windowManager.focusWindow,
            toggleMaximize: windowManager.toggleMaximize,
            dockWindow: windowManager.dockWindow,
            undockDockItem: windowManager.undockDockItem,
            moveDockItem: windowManager.moveDockItem,
            startDockItemDrag: windowManager.startDockItemDrag,
            setDockActive: windowManager.setDockActive,
            isDocked: windowManager.isDocked,
            startWindowDrag: windowManager.startWindowDrag,
            startWindowResize: windowManager.startWindowResize,
            getWindowStyle: windowManager.getWindowStyle,
            // 所有业务函数
            ...ops,
        });

        // Provide editor state so descendant components can inject it
        provide('editor', appState);

        return appState;
    },
});

// ══════════════════════════════════════════════════════════════
//  Register global components
// ══════════════════════════════════════════════════════════════
app.component('toast-notification', ToastNotification);
app.component('export-modal', ExportModal);
app.component('global-context-menu', GlobalContextMenu);
app.component('terminal-panel', TerminalPanel);
app.component('editor-toolbar', EditorToolbar);
app.component('tree-canvas', TreeCanvas);
app.component('step-detail-panel', StepDetailPanel);
app.component('detail-panel', DetailPanel);
app.component('game-settings-window', GameSettingsWindow);
app.component('resource-manager-window', ResourceManagerWindow);
app.component('resource-char-effect-editor', ResourceCharEffectEditor);
app.component('resource-effect-editor', ResourceEffectEditor);
app.component('resource-chapter-step-editor', ResourceChapterStepEditor);

app.mount('#editor-app');

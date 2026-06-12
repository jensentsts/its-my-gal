/**
 * editor/editor-app.js
 *
 * 剧情树节点编辑器 —— Vue 3 应用主模块。
 *
 * 功能：
 *  - 可视化剧情树（SVG 连线 + 可拖拽节点）
 *  - 章节/步骤 CRUD
 *  - 步骤表单编辑（对话、分支、结局）
 *  - 导出 JS 模块 / JSON
 *  - 缩放、平移、自动布局
 */

import * as GameData from '../resource-packs/default/index.js';
import { ResourceManager, validatePackStructure, validatePackData, EffectsManager, ResourcePathResolver } from '../engine/index.js';
import { analyzeTree, computeLayout, computeEndingLayout, computeEdgePath } from './tree-layout.js';


const { createApp, ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

// ── 版本信息 ──
const ENGINE_VERSION = '0.1.0';
const EDITOR_VERSION = '0.2.0';
const STORY_VERSION  = '1.0.0';

// ════════════════════════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════════════════════════

/** 深拷贝 */
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/** 生成唯一 ID */
function uid(prefix = 'c') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// ════════════════════════════════════════════════════════════════════
//  树结构分析 / 自动布局 —— 从 tree-layout.js 导入
// ════════════════════════════════════════════════════════════════════

// analyzeTree, computeLayout, computeEdgePath, computeEndingLayout
// 现在由 ./tree-layout.js 的 import 提供

/**
 * 计算从外部点射向节点中心的射线与节点矩形边界的交点（用于磁吸和周围拖拽）
 * @param {Object} node - 节点对象 { x, y, width, height }
 * @param {Object} fromPt - 射线起点（世界坐标）
 * @param {Object} toPt - 射线方向参考点（世界坐标）
 * @returns {Object} { x, y, side } - 边界交点及所在边 ('top'|'bottom'|'left'|'right')
 */
function getPerimeterPoint(node, fromPt, toPt) {
    const hw = (node.width || 200) / 2;
    const hh = (node.height || 90) / 2;
    const cx = node.x;
    const cy = node.y;

    // 方向向量：从节点中心指向目标点
    let dx = toPt.x - cx;
    let dy = toPt.y - cy;

    // 如果目标正好在中心，朝来源方向偏移
    if (dx === 0 && dy === 0) {
        dx = cx - fromPt.x;
        dy = cy - fromPt.y;
        if (dx === 0 && dy === 0) return { x: cx, y: cy - hh, side: 'top' };
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let scale, side;

    if (absDx * hh > absDy * hw) {
        // 与左右边相交
        scale = hw / absDx;
        side = dx > 0 ? 'right' : 'left';
    } else {
        // 与上下边相交
        scale = hh / absDy;
        side = dy > 0 ? 'bottom' : 'top';
    }

    return {
        x: cx + dx * scale,
        y: cy + dy * scale,
        side,
    };
}

// ════════════════════════════════════════════════════════════════════
//  Vue 应用
// ════════════════════════════════════════════════════════════════════

createApp({
    setup() {
        // ── 可编辑的游戏数据（全部 reactive 化） ────────────────────────
        const gameScenes = reactive(clone(GameData.SCENES));
        const gameCharacters = reactive(clone(GameData.CHARACTERS));
        const gameCgLibrary = reactive(clone(GameData.CG_LIBRARY));
        const gameItems = reactive(clone(GameData.ITEMS));
        const gameEndings = reactive(clone(GameData.ENDINGS));
        const gameConfig = reactive(clone(GameData.GAME_CONFIG));

        // 原始数据备份（用于"还原"）
        const originalChapters = clone(GameData.STORY_CHAPTERS);
        const originalScenes = clone(GameData.SCENES);
        const originalCharacters = clone(GameData.CHARACTERS);
        const originalCgLibrary = clone(GameData.CG_LIBRARY);
        const originalItems = clone(GameData.ITEMS);
        const originalEndings = clone(GameData.ENDINGS);
        const originalConfig = clone(GameData.GAME_CONFIG);

        // ── 可编辑的章节数据 ──────────────────────────────────────────
        const chapters = reactive(clone(GameData.STORY_CHAPTERS));

        // ── 章节简介 ─────────────────────────────────────────────────
        const chapterDescriptions = reactive(clone(GameData.CHAPTER_DESCRIPTIONS || {})); // { [chapterId]: "简介文本" }

        // ── 资源路径解析器 ────────────────────────────────────────────
        const editorPathResolver = new ResourcePathResolver();

        // ── 入口节点（package 可以有多个入口，但执行时指定唯一入口） ────
        // 默认入口为 'main'
        const entryPoints = reactive({ main: true });

        /** 设置/取消节点为入口 */
        function toggleEntryPoint(nodeId) {
            if (entryPoints[nodeId]) {
                // 至少保留一个入口
                if (Object.keys(entryPoints).length <= 1) {
                    showToast('至少需要一个入口节点');
                    return;
                }
                delete entryPoints[nodeId];
                showToast(`已移除入口: ${nodeId}`);
            } else {
                entryPoints[nodeId] = true;
                showToast(`已设为入口: ${nodeId}`);
            }
        }

        /** 检查节点是否为入口 */
        function isEntryPoint(nodeId) {
            return !!entryPoints[nodeId];
        }

        // ── 节点类型判定 ──────────────────────────────────────────────
        const NODE_TYPE = { CHAPTER: 'chapter', ENDING: 'ending' };
        function getNodeType(id) {
            if (!id) return null;
            if (id.startsWith('_end_')) return NODE_TYPE.ENDING;
            return NODE_TYPE.CHAPTER;
        }
        function isEndingNode(id) { return getNodeType(id) === NODE_TYPE.ENDING; }

        // ── 编辑器 UI 状态 ────────────────────────────────────────────
        const selectedChapterId = ref(null);
        const selectedEndingId = ref(null);
        const editingStepIndex = ref(null);
        const hoveredNodeId = ref(null);
        const selectedEdge = ref(null); // 当前选中的连线

        // 树视图状态
        const treePanel = ref(null);
        const viewScale = ref(1.0);
        const panX = ref(0);
        const panY = ref(0);
        const nodePositions = reactive({});

        // 拖拽状态
        const dragging = reactive({
            active: false, nodeId: null,
            startX: 0, startY: 0,
            nodeStartX: 0, nodeStartY: 0,
            multiDrag: false,
            nodeStartPositions: {}, // { [nodeId]: { x, y } }
        });
        const panning = reactive({ active: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0 });

        // 框选状态
        const selection = reactive({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
        const selectedNodeIds = reactive({}); // { [nodeId]: true }

        // ── 统一选择管理器 ──────────────────────────────────────────────
        /** 清除所有选中状态 */
        function clearSelection() {
            selectedChapterId.value = null;
            selectedEndingId.value = null;
            selectedGroupId.value = null;
            selectedEdge.value = null;
            editingStepIndex.value = null;
            clearNodeSelection();
        }

        /** 获取当前选中的主要对象类型 */
        function getSelection() {
            if (selectedNodeIds && Object.keys(selectedNodeIds).length > 0)
                return { type: 'nodes', ids: Object.keys(selectedNodeIds) };
            if (selectedChapterId.value) return { type: 'chapter', id: selectedChapterId.value };
            if (selectedEndingId.value) return { type: 'ending', id: selectedEndingId.value };
            if (selectedEdge.value) return { type: 'edge', from: selectedEdge.value.from, to: selectedEdge.value.to };
            if (selectedGroupId.value) return { type: 'group', id: selectedGroupId.value };
            return null;
        }

        /** 统一选择调度 */
        function selectObject(type, id, extra) {
            clearSelection();
            switch (type) {
                case 'chapter': selectedChapterId.value = id; break;
                case 'ending': selectedEndingId.value = id; break;
                case 'edge': selectedEdge.value = extra || id; break;
                case 'group': selectedGroupId.value = id; break;
                default: break;
            }
        }

        // 右键菜单状态
        const contextMenu = reactive({ show: false, x: 0, y: 0, nodeId: null, groupId: null, worldX: 0, worldY: 0 });

        // 游戏设置弹窗
        const showGameSettings = ref(false);
        const editableHomeConfig = reactive({
            panelBgUrl: GameData.HOME_CONFIG?.panelBackground?.url || '',
            panelOverlayColor: GameData.HOME_CONFIG?.panelBackground?.overlayColor || 'rgba(4,4,10,0.88)',
            panelOverlayGradient: GameData.HOME_CONFIG?.panelBackground?.overlayGradient || '',
        });
        const editableGameConfig = reactive({
            title: gameConfig.title || '',
            aspectWidth: gameConfig.aspectRatio?.width || 1280,
            aspectHeight: gameConfig.aspectRatio?.height || 720,
            textSpeed: gameConfig.textSpeed || 25,
        });

        // 资源管理器
        const showResourceManager = ref(false);
        const resourceTab = ref('characters');
        const selectedResourceId = ref(null);

        // 全局搜索
        const editingGlobalSearch = ref(false);
        const globalSearchQuery = ref('');
        const globalSearchInput = ref(null);

        // 全局右键菜单
        const globalContextMenu = reactive({ show: false, x: 0, y: 0, focusIndex: 0 });

        // 缩放百分比输入
        const showZoomInput = ref(false);
        const zoomPercent = ref(100);

        // 侧边栏收起 + 拖拽宽度
        const detailPanelCollapsed = ref(false);
        const detailPanelWidth = ref(440); // 默认宽度

        // ── 编辑器焦点管理（基于 Vue 自然顺序，v-for index 即为焦点位置） ──
        const stepListFocusIndex = ref(0);

        // 导入/导出子菜单
        const showFileMenu = ref(false);

        // 自定义悬浮提示
        const tooltip = reactive({ show: false, text: '', x: 0, y: 0 });

        // 立绘选中 ID
        const selectedSpriteId = ref(null);

        // 头像折叠
        const showAvatarSection = ref(false);

        // 资源图片拖放
        const resourceImageTarget = ref(null);

        // 节点样式 { [nodeId]: { color, bgColor, icon, width, height } }
        const nodeStyles = reactive({});

        // 编辑器对象组 { [groupId]: { name, color, bgOpacity, bgImage, nodeIds, x, y, w, h } }
        const editorGroups = reactive({});

        // 画布注释 { [commentId]: { text, x, y, color } }
        const canvasComments = reactive({});

        // 连线端口拖拽状态
        const portDragging = reactive({
            active: false,
            fromNodeId: null,
            fromPortIdx: null,
            fromStepIdx: null,
            fromChoiceIdx: null,
            mouseX: 0, mouseY: 0,
            snapTargetId: null, // 磁吸目标节点 ID
            isEndingPort: false, // 当前拖拽的端口是否为 ending_trigger（仅限连接到结局节点）
        });

        // 正在缩放的节点
        const resizingNode = reactive({ active: false, nodeId: null, edge: null, startX: 0, startY: 0, startW: 0, startH: 0 });

        // ── 编辑器焦点导航辅助 ──
        const contextMenuFocusIndex = ref(-1); // 右键菜单焦点索引
        // 更新上下文菜单项列表（由模板中 @mouseenter 更新）
        function updateContextMenuFocus() { contextMenuFocusIndex.value = 0; }

        // 批量编辑
        const batchEditMode = ref(false);
        const showEffectsManager = ref(false);
        const customEffects = reactive({}); // { effectId: { name, icon, type, density, speed, ... } }
        const selectedEffectId = ref(null);
        const effectPreviewRef = ref(null);
        const effectPreviewActive = ref(false);
        let effectPreviewTimer = null;
        const builtinEffects = ['rain', 'snow', 'sakura', 'fire', 'stardust', 'bloodmoon', 'corruption'];

        // 章节重命名 ID 暂存（提供 _renameId 给模板）
        const chapterRenameIds = reactive({});

        // 资源类型元数据
        const resourceMeta = {
            chapters: { label: '章节', icon: '📜', data: chapters, isObject: true, isChapter: true },
            characters: { label: '角色', icon: '👤', data: gameCharacters, isObject: true },
            scenes: { label: '场景', icon: '🏞️', data: gameScenes, isObject: true },
            cg: { label: 'CG 图鉴', icon: '🖼️', data: gameCgLibrary, isObject: true },
            items: { label: '物品', icon: '🎒', data: gameItems, isObject: true },
            endings: { label: '结局', icon: '🎬', data: gameEndings, isObject: false },
        };

        // 在 resourceMeta 之后、resourceList 之前添加
        const resEditStepIndex = ref(null);
        // 选中步骤时保存撤销快照
        watch(resEditStepIndex, (newVal, oldVal) => {
            if (newVal !== null && newVal !== oldVal && oldVal !== null) {
                saveUndoSnapshot();
            }
        });
        const resEditStep = computed({
            get: () => {
                if (resEditStepIndex.value === null || !selectedResourceId.value) return null;
                const steps = chapters[selectedResourceId.value];
                if (!steps || resEditStepIndex.value >= steps.length) return null;
                const step = steps[resEditStepIndex.value];
                initCGForm(step);
                initCharChanges(step);
                return step;
            },
            set: () => {},
        });

        // 资源管理器步骤编辑帮助函数
        function resEditAddStep() {
            const id = selectedResourceId.value;
            if (!id || !chapters[id]) return;
            // 如果末尾步骤已锁定，不可在其前插入
            const lastIdx = chapters[id].length - 1;
            if (lastIdx >= 0 && isStepEditLocked(chapters[id][lastIdx])) {
                showToast('⚠ 末尾步骤已锁定，无法添加新步骤');
                return;
            }
            saveUndoSnapshot();
            chapters[id].push({
                sceneId: '',
                type: 'dialogue',
                characterId: null,
                text: '新对话段落...',
                effects: [],
            });
            resEditStepIndex.value = chapters[id].length - 1;
        }
        function resEditDeleteStep() {
            if (resEditStepIndex.value === null || !selectedResourceId.value) return;
            const steps = chapters[selectedResourceId.value];
            if (!steps || resEditStepIndex.value >= steps.length) return;
            if (isStepEditLocked(steps[resEditStepIndex.value])) { showToast('⚠ 此步骤已锁定，无法删除'); return; }
            saveUndoSnapshot();
            steps.splice(resEditStepIndex.value, 1);
            if (resEditStepIndex.value >= steps.length) {
                resEditStepIndex.value = steps.length > 0 ? steps.length - 1 : null;
            }
        }
        function resEditMoveStep(delta) {
            if (resEditStepIndex.value === null || !selectedResourceId.value) return;
            const steps = chapters[selectedResourceId.value];
            if (!steps) return;
            const from = resEditStepIndex.value;
            const to = from + delta;
            if (to < 0 || to >= steps.length) return;
            if (isStepEditLocked(steps[from]) || isStepEditLocked(steps[to])) {
                showToast('⚠ 步骤已锁定，无法移动'); return;
            }
            saveUndoSnapshot();
            const [moved] = steps.splice(from, 1);
            steps.splice(to, 0, moved);
            resEditStepIndex.value = to;
        }
        function resEditAddChoice() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step) || step.type !== 'choice') return;
            if (!step.choices) step.choices = [];
            step.choices.push({ text: '新选项...', jumpChapter: '', flag: '', gainItem: '' });
        }
        function resEditRemoveChoice(ci) {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step) || !step.choices) return;
            step.choices.splice(ci, 1);
        }
        function resEditOnCGChange() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step)) return;
            const action = step._cgAction;
            if (action === 'enter') {
                step.cgChanges = { action: 'enter', id: step._cgId || '', animation: step._cgAnimation || 'scaleIn' };
                if (step._cgEffect) step.cgChanges.effect = step._cgEffect;
            } else if (action === 'leave') {
                step.cgChanges = { action: 'leave', animation: step._cgAnimation || 'fadeOut' };
            } else {
                delete step.cgChanges;
            }
        }
        function resEditAddCharChange() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step)) return;
            if (!step._charChanges) step._charChanges = [];
            step._charChanges.push({ id: '', action: 'enter', spriteId: '', animation: '' });
            resEditSyncCharChanges();
        }
        function resEditRemoveCharChange(cci) {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step) || !step._charChanges) return;
            step._charChanges.splice(cci, 1);
            resEditSyncCharChanges();
        }
        function resEditSyncCharChanges() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step)) return;
            const valid = (step._charChanges || []).filter(cc => cc.id);
            if (valid.length > 0) {
                step.characterChanges = valid.map(cc => ({
                    id: cc.id, action: cc.action,
                    spriteId: cc.action !== 'leave' ? cc.spriteId : undefined,
                    animation: cc.animation || undefined,
                }));
            } else {
                delete step.characterChanges;
            }
        }
        function resEditOnCharChangeField() { resEditSyncCharChanges(); }
        function resEditAddBatchTextSegment() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step)) return;
            if (!step.texts) step.texts = [step.text || ''];
            step.texts.push('新段落...');
        }
        function resEditRemoveBatchTextSegment(ti) {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step) || !step.texts || step.texts.length <= 1) return;
            step.texts.splice(ti, 1);
            step.text = step.texts[0];
        }
        function resEditDisableBatchText() {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step) || !step.texts) return;
            step.text = step.texts[0] || '';
            delete step.texts;
        }
        function resEditToggleEffect(effect) {
            const step = resEditStep.value;
            if (!step || isStepEditLocked(step)) return;
            if (!step.effects) step.effects = [];
            const idx = step.effects.indexOf(effect);
            if (idx > -1) step.effects.splice(idx, 1);
            else step.effects.push(effect);
        }
        function resEditSetDefaultJumpMode(step) {
            if (!step || isStepEditLocked(step)) return;
            if (!step._jumpMode) {
                step._jumpMode = step.endingId ? 'ending' : (step.jumpChapter ? 'chapter' : 'chapter');
            }
        }

        // ── 资源管理器步骤拖拽排序 ────────────────────────────────────
        const resStepDrag = reactive({
            dragging: false,
            dragIndex: -1,
            dropIndex: -1,
        });

        /** 判断步骤是否被锁定（不可拖拽、不可在其后插入） */
        function isStepLocked(steps, index) {
            if (!steps || index < 0 || index >= steps.length) return true;
            // 章节末尾的纯 jump 步骤（非 ending 触发）视为路由步骤，锁定位置
            return index === steps.length - 1 && steps[index].type === 'jump' && !steps[index].endingId;
        }

        function resStepDragStart(e, index) {
            const steps = chapters[selectedResourceId.value];
            if (!steps || isStepLocked(steps, index)) return;
            resStepDragCleanup(); // 清理旧状态
            resStepDrag.dragging = true;
            resStepDrag.dragIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
        }

        function resStepDragOver(e, index) {
            if (!resStepDrag.dragging) return;
            const steps = chapters[selectedResourceId.value];
            if (!steps) return;
            // 不允许拖到被锁定的步骤上，也不允许拖到最后锁定步骤之后
            if (isStepLocked(steps, index)) return;
            e.preventDefault();
            resStepDrag.dropIndex = index;
            e.dataTransfer.dropEffect = 'move';
        }

        function resStepDrop(e, index) {
            e.preventDefault();
            if (!resStepDrag.dragging) return;
            const steps = chapters[selectedResourceId.value];
            if (!steps || !selectedResourceId.value) { resStepDragCleanup(); return; }

            const from = resStepDrag.dragIndex;
            let to = index;

            // 有效性检查
            if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) {
                resStepDragCleanup(); return;
            }
            if (isStepLocked(steps, from) || isStepLocked(steps, to)) {
                resStepDragCleanup(); return;
            }
            if (isStepEditLocked(steps[from]) || isStepEditLocked(steps[to])) {
                showToast('⚠ 步骤已锁定，无法移动'); resStepDragCleanup(); return;
            }

            // 如果末尾有锁定步骤，不允许拖到它的位置或之后
            const lastLocked = isStepLocked(steps, steps.length - 1);
            if (lastLocked && to >= steps.length - 1) {
                to = steps.length - 2;
                if (to < 0 || to === from) { resStepDragCleanup(); return; }
            }

            saveUndoSnapshot();
            const [moved] = steps.splice(from, 1);
            const adjustedTo = from < to ? to - 1 : to;
            steps.splice(adjustedTo, 0, moved);

            // 同步编辑中步骤索引
            if (resEditStepIndex.value === from) {
                resEditStepIndex.value = adjustedTo;
            } else if (from < resEditStepIndex.value && resEditStepIndex.value <= adjustedTo) {
                resEditStepIndex.value--;
            } else if (from > resEditStepIndex.value && resEditStepIndex.value >= adjustedTo) {
                resEditStepIndex.value++;
            }

            resStepDragCleanup();
        }

        function resStepDragEnd() { resStepDragCleanup(); }

        function resStepDragCleanup() {
            resStepDrag.dragging = false;
            resStepDrag.dragIndex = -1;
            resStepDrag.dropIndex = -1;
        }

        // ── 侧边栏（详情面板）步骤拖拽排序 ──────────────────────────────
        const detailStepDrag = reactive({
            dragging: false,
            dragIndex: -1,
            dropIndex: -1,
        });

        function detailStepDragStart(e, index) {
            const steps = chapters[selectedChapterId.value];
            if (!steps || isStepLocked(steps, index)) return;
            detailStepDragCleanup();
            detailStepDrag.dragging = true;
            detailStepDrag.dragIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
        }

        function detailStepDragOver(e, index) {
            if (!detailStepDrag.dragging) return;
            const steps = chapters[selectedChapterId.value];
            if (!steps) return;
            if (isStepLocked(steps, index)) return;
            e.preventDefault();
            detailStepDrag.dropIndex = index;
            e.dataTransfer.dropEffect = 'move';
        }

        function detailStepDrop(e, index) {
            e.preventDefault();
            if (!detailStepDrag.dragging) return;
            const steps = chapters[selectedChapterId.value];
            if (!steps || !selectedChapterId.value) { detailStepDragCleanup(); return; }

            const from = detailStepDrag.dragIndex;
            let to = index;

            if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) {
                detailStepDragCleanup(); return;
            }
            if (isStepLocked(steps, from) || isStepLocked(steps, to)) {
                detailStepDragCleanup(); return;
            }
            if (isStepEditLocked(steps[from]) || isStepEditLocked(steps[to])) {
                showToast('⚠ 步骤已锁定，无法移动'); detailStepDragCleanup(); return;
            }

            const lastLocked = isStepLocked(steps, steps.length - 1);
            if (lastLocked && to >= steps.length - 1) {
                to = steps.length - 2;
                if (to < 0 || to === from) { detailStepDragCleanup(); return; }
            }

            saveUndoSnapshot();
            const [moved] = steps.splice(from, 1);
            const adjustedTo = from < to ? to - 1 : to;
            steps.splice(adjustedTo, 0, moved);

            if (editingStepIndex.value === from) {
                editingStepIndex.value = adjustedTo;
            } else if (from < editingStepIndex.value && editingStepIndex.value <= adjustedTo) {
                editingStepIndex.value--;
            } else if (from > editingStepIndex.value && editingStepIndex.value >= adjustedTo) {
                editingStepIndex.value++;
            }

            detailStepDragCleanup();
        }

        function detailStepDragEnd() { detailStepDragCleanup(); }
        function detailStepDragCleanup() {
            detailStepDrag.dragging = false;
            detailStepDrag.dragIndex = -1;
            detailStepDrag.dropIndex = -1;
        }

        const resourceList = computed(() => {
            const meta = resourceMeta[resourceTab.value];
            if (!meta) return [];
            const data = meta.data;
            if (meta.isObject) {
                // 章节：data 是 chapters 对象，值为步骤数组
                if (meta.isChapter) {
                    return Object.entries(data).map(([id, steps]) => ({
                        id,
                        stepCount: steps.length,
                        title: id,
                    }));
                }
                return Object.entries(data).map(([id, item]) => ({ id, ...item }));
            }
            // endings 是数组
            return (data || []).map((item, idx) => ({ _idx: idx, id: item.id, ...item }));
        });

        // 当前选中的资源
        const selectedResource = computed(() => {
            if (!selectedResourceId.value) return null;
            const meta = resourceMeta[resourceTab.value];
            if (!meta) return null;
            if (meta.isObject) {
                if (meta.isChapter) {
                    const steps = meta.data[selectedResourceId.value];
                    return {
                        id: selectedResourceId.value,
                        _steps: steps || [],
                        _renameId: chapterRenameIds[selectedResourceId.value] || '',
                    };
                }
                return meta.data[selectedResourceId.value] || null;
            }
            // endings: 按 id 查找
            const arr = meta.data || [];
            return arr.find(e => e.id === selectedResourceId.value) || null;
        });

        // Toast
        const toastMsg = ref('');
        let toastTimer = null;

        // ── Undo / Redo ──────────────────────────────────────────────────
        const MAX_UNDO = 50;
        const undoStack = [];       // 过去的状态快照
        const redoStack = [];       // 撤销后的状态（可重做）
        const undoLock = ref(false); // 防止 restore 时重复保存

        /** 获取当前全部可编辑状态的深拷贝快照 */
        function captureState() {
            return {
                chapters: clone(chapters),
                chapterDescriptions: clone(chapterDescriptions),
                nodePositions: clone(nodePositions),
                nodeStyles: clone(nodeStyles),
                gameEndings: clone(gameEndings),
                editorGroups: clone(editorGroups),
                canvasComments: clone(canvasComments),
                entryPoints: clone(entryPoints),
            };
        }

        /** 将快照恢复到各 reactive 对象 */
        function restoreState(snapshot) {
            undoLock.value = true;
            // chapters（reactive 对象 → 删旧添新）
            for (const key of Object.keys(chapters)) { if (!(key in snapshot.chapters)) delete chapters[key]; }
            for (const [k, v] of Object.entries(snapshot.chapters)) chapters[k] = clone(v);
            // chapterDescriptions
            for (const key of Object.keys(chapterDescriptions)) { if (!(key in snapshot.chapterDescriptions)) delete chapterDescriptions[key]; }
            for (const [k, v] of Object.entries(snapshot.chapterDescriptions)) chapterDescriptions[k] = v;
            // nodePositions
            for (const key of Object.keys(nodePositions)) { if (!(key in snapshot.nodePositions)) delete nodePositions[key]; }
            for (const [k, v] of Object.entries(snapshot.nodePositions)) nodePositions[k] = { ...v };
            // nodeStyles
            for (const key of Object.keys(nodeStyles)) { if (!(key in snapshot.nodeStyles)) delete nodeStyles[key]; }
            for (const [k, v] of Object.entries(snapshot.nodeStyles)) nodeStyles[k] = { ...v };
            // gameEndings（数组）
            gameEndings.length = 0;
            for (const item of snapshot.gameEndings) gameEndings.push(clone(item));
            // editorGroups
            for (const key of Object.keys(editorGroups)) { if (!(key in snapshot.editorGroups)) delete editorGroups[key]; }
            for (const [k, v] of Object.entries(snapshot.editorGroups)) editorGroups[k] = { ...v };
            // canvasComments
            for (const key of Object.keys(canvasComments)) { if (!(key in snapshot.canvasComments)) delete canvasComments[key]; }
            for (const [k, v] of Object.entries(snapshot.canvasComments)) canvasComments[k] = { ...v };
            // entryPoints
            for (const key of Object.keys(entryPoints)) { if (!(key in snapshot.entryPoints)) delete entryPoints[key]; }
            for (const [k, v] of Object.entries(snapshot.entryPoints)) entryPoints[k] = v;
            undoLock.value = false;
        }

        /** 保存当前状态到撤销栈（在每次变更前调用） */
        function saveUndoSnapshot() {
            if (undoLock.value) return; // restore 中不保存
            undoStack.push(captureState());
            if (undoStack.length > MAX_UNDO) undoStack.shift();
            redoStack.length = 0; // 新变更清空重做栈
        }

        /** 撤销 */
        function undo() {
            if (undoStack.length === 0) {
                showToast('没有可撤销的操作');
                return;
            }
            // 当前状态 → 重做栈
            redoStack.push(captureState());
            const prev = undoStack.pop();
            restoreState(prev);
            showToast(`已撤销 (还可撤销 ${undoStack.length} 步)`);
        }

        /** 重做 */
        function redo() {
            if (redoStack.length === 0) {
                showToast('没有可重做的操作');
                return;
            }
            // 当前状态 → 撤销栈
            undoStack.push(captureState());
            const next = redoStack.pop();
            restoreState(next);
            showToast(`已重做 (还可撤销 ${undoStack.length} 步)`);
        }

        // 撤销/重做计数的响应式引用（供模板绑定禁用状态）
        const undoCount = ref(undoStack.length);
        const redoCount = ref(redoStack.length);
        // 每次 saveUndoSnapshot/undo/redo 后更新计数
        const origSave = saveUndoSnapshot;
        saveUndoSnapshot = function() { origSave(); undoCount.value = undoStack.length; redoCount.value = 0; };
        const origUndo = undo;
        undo = function() { origUndo(); undoCount.value = undoStack.length; redoCount.value = redoStack.length; };
        const origRedo = redo;
        redo = function() { origRedo(); undoCount.value = undoStack.length; redoCount.value = redoStack.length; };

        // 导出弹窗
        const showExportModal = ref(false);
        const exportContent = ref('');
        const exportModalTitle = ref('');

        // ── 派生的树数据 ──────────────────────────────────────────────
        const treeAnalysis = computed(() => analyzeTree(chapters));
        const adjacency = computed(() => treeAnalysis.value.adjacency);
        const incoming = computed(() => treeAnalysis.value.incoming);
        const roots = computed(() => treeAnalysis.value.roots);
        const leaves = computed(() => treeAnalysis.value.leaves);

        // 树节点（用于渲染）—— 统一处理章节、结局、入口三种节点
        const treeNodes = computed(() => {
            const nodes = [];
            const endingNodes = {}; // 暂存结局节点（后处理）
            const incomingSources = {}; // { targetId: [fromId, ...] }
            const allEdges = [];

            // ── Phase 1: 遍历所有章节，收集跳转关系 ──────────────────
            // 内部抽象：所有"分支步骤"（branch_step）共享同一种处理模式，
            // 即从当前步骤引出连线连接到目标节点。
            //   branch_step (内部)
            //   ├── jump_step ── type: 'jump'（含 ending_trigger 派生）
            //   └── choice_step ── type: 'choice'
            //
            for (const [cid, steps] of Object.entries(chapters)) {
                let portIdx = 0;
                steps.forEach((step, si) => {
                    // ── jump step（含 ending_trigger 派生）──
                    if (step.type === 'jump') {
                        // ending_trigger：jump_step 的派生——通过 endingId 触发结局
                        if (step.endingId) {
                            const endNodeId = '_end_' + step.endingId;
                            if (!endingNodes[endNodeId]) {
                                const endPos = nodePositions[endNodeId] || { x: 0, y: 0 };
                                endingNodes[endNodeId] = createEndingNodeData(endNodeId, step.endingId, endPos);
                            }
                            if (!incomingSources[endNodeId]) incomingSources[endNodeId] = [];
                            incomingSources[endNodeId].push({ fromId: cid, portIdx, isEnding: true });
                            allEdges.push({ fromId: cid, toId: endNodeId, portIdx, stepIdx: si, isEnding: true });
                            portIdx++;
                        } else if (step.jumpChapter) {
                            // 常规跳转目标
                            const tid = step.jumpChapter;
                            if (tid) {
                                if (!incomingSources[tid]) incomingSources[tid] = [];
                                incomingSources[tid].push({ fromId: cid, portIdx, isEnding: tid.startsWith('_end_') });
                            }
                            allEdges.push({ fromId: cid, toId: tid || null, portIdx, stepIdx: si, type: 'jump' });
                            portIdx++;
                        } else {
                            // 既无 endingId 也无 jumpChapter → 仍预留端口位置（用于未配置的占位端口）
                            portIdx++;
                        }
                    } else if (step.type === 'ending') {
                        // ending step：结局触发——连接到结局节点
                        if (step.endingId) {
                            const endNodeId = '_end_' + step.endingId;
                            if (!endingNodes[endNodeId]) {
                                const endPos = nodePositions[endNodeId] || { x: 0, y: 0 };
                                endingNodes[endNodeId] = createEndingNodeData(endNodeId, step.endingId, endPos);
                            }
                            if (!incomingSources[endNodeId]) incomingSources[endNodeId] = [];
                            incomingSources[endNodeId].push({ fromId: cid, portIdx, isEnding: true });
                            allEdges.push({ fromId: cid, toId: endNodeId, portIdx, stepIdx: si, isEnding: true });
                            portIdx++;
                        } else {
                            portIdx++;
                        }
                    } else if (step.type === 'choice' && step.choices) {
                        step.choices.forEach((ch, ci) => {
                            if (ch.jumpChapter) {
                                const tid = ch.jumpChapter;
                                if (!incomingSources[tid]) incomingSources[tid] = [];
                                incomingSources[tid].push({ fromId: cid, portIdx, isEnding: tid.startsWith('_end_') });
                                allEdges.push({ fromId: cid, toId: tid, portIdx, stepIdx: si, choiceIdx: ci });
                            }
                            portIdx++;
                        });
                    }
                    // 其他步骤类型（dialogue 等）不具备跳转能力，不构建连线
                });
            }

            // ── Phase 2: 从 gameEndings 初始化尚未创建的结局节点 ──────
            for (const end of gameEndings) {
                const endNodeId = '_end_' + end.id;
                if (!endingNodes[endNodeId]) {
                    const pos = nodePositions[endNodeId] || { x: 0, y: 0 };
                    endingNodes[endNodeId] = createEndingNodeData(endNodeId, end.id, pos);
                }
            }

            // ── Phase 3: 补齐通过 jumpChapter 引用的未知结局 ──────────
            for (const [cid, steps] of Object.entries(chapters)) {
                for (const step of steps) {
                    const checkTarget = (targetId) => {
                        if (targetId && targetId.startsWith('_end_') && !endingNodes[targetId]) {
                            const endId = targetId.slice(5);
                            const pos = nodePositions[cid] || { x: 0, y: 0 };
                            const fallbackPos = { x: pos.x + 240, y: pos.y + 120 };
                            endingNodes[targetId] = createEndingNodeData(targetId, endId, fallbackPos);
                            if (!nodePositions[targetId]) {
                                nodePositions[targetId] = { ...fallbackPos };
                            }
                        }
                    };
                    if (step.jumpChapter) checkTarget(step.jumpChapter);
                    // ending_trigger：jump 的派生，通过 endingId 引用结局
                    if (step.type === 'jump' && step.endingId) {
                        checkTarget('_end_' + step.endingId);
                    }
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter) checkTarget(ch.jumpChapter);
                        }
                    }
                }
            }

            // ── Phase 4: 构建章节节点 ────────────────────────────────
            for (const [cid, steps] of Object.entries(chapters)) {
                const pos = nodePositions[cid] || { x: 0, y: 0 };
                const firstStep = steps[0];
                const style = nodeStyles[cid] || {};
                const sW = style.width || 200;
                const sH = style.height || 90;

                // 底部出口端口
                const bottomPorts = buildBottomPorts(cid, steps, sW, sH);

                // 顶部入口端口
                const topPorts = buildTopPorts(incomingSources[cid] || [], sW, sH, pos, isEntryPoint(cid));

                nodes.push({
                    id: cid, label: cid,
                    type: NODE_TYPE.CHAPTER,
                    x: pos.x, y: pos.y,
                    stepCount: steps.length,
                    outgoing: bottomPorts.length,
                    incoming: (incomingSources[cid] || []).length,
                    isRoot: roots.value.includes(cid),
                    isLeaf: leaves.value.includes(cid),
                    isEnding: false,
                    entryPoint: isEntryPoint(cid),
                    firstText: firstStep ? stepTextBrief(firstStep) : '',
                    description: chapterDescriptions[cid] || '',
                    endingId: null,
                    bottomPorts, topPorts,
                    style, width: sW, height: sH,
                });
            }

            // ── Phase 5: 构建结局节点 ────────────────────────────────
            for (const [endNodeId, endData] of Object.entries(endingNodes)) {
                const eW = endData.width || 180;
                const eH = endData.height || 60;
                const pos = nodePositions[endNodeId] || { x: 0, y: 0 };
                const eIncoming = incomingSources[endNodeId] || [];
                const topPorts = eIncoming.length > 0 ? [{
                    fromId: eIncoming[0].fromId,
                    portIdx: 0, isEnding: true,
                    rpX: eW / 2, rpY: 0,
                    pxWorld: pos.x,
                    pyWorld: pos.y - eH / 2,
                    multiSource: eIncoming.length > 1,
                    sourceCount: eIncoming.length,
                }] : [];

                nodes.push({
                    id: endNodeId, label: endData.label || endNodeId,
                    type: NODE_TYPE.ENDING,
                    x: pos.x, y: pos.y,
                    stepCount: 0,
                    outgoing: 0,
                    incoming: eIncoming.length,
                    isRoot: false, isLeaf: true, isEnding: true,
                    entryPoint: isEntryPoint(endNodeId),
                    firstText: '',
                    description: '',
                    endingId: endData.endingId,
                    bottomPorts: [],
                    topPorts,
                    style: eW === 180 ? {} : { width: eW, height: eH },
                    width: eW, height: eH,
                });
            }

            return nodes;
        });

        /** 构建底部出口端口
         *  数量由章节内的 step 决定，无论是否已连线：
         *  - jump 类型 step → 1 个端口
         *  - choice 类型 step → 每个选项 1 个端口
         *  - dialogue 类型 step 带 jumpChapter → 1 个端口
         *  - jump 类型 step → 1 个端口（endingId 非空时为 ending_trigger 派生）
         *  端口不会因为目标未设置而被撤销，便于开发者提前规划连线。
         */
        function buildBottomPorts(cid, steps, sW, sH) {
            const bottomPorts = [];
            let portIdx = 0;
            const pos = nodePositions[cid] || { x: 0, y: 0 };
            steps.forEach((step, si) => {
                // ═══ 分支步骤（内部概念）═══
                // jump / choice / dialogue+jumpChapter 都属于"在章节上引出分支"的步骤。
                // 统一抽象：这些步骤在树节点上产生端口，连接至其他节点。
                //
                //   branch_step (内部) ─── 引出分支的步骤
                //   ├── jump_step ──────── 无条件跳转
                //   │   └── ending_trigger ─ 跳转派生→触发结局（endingId 不为空）
                //   └── choice_step ────── 用户选项分支
                //
                // ── jump step（含 ending_trigger 派生）──
                if (step.type === 'jump') {
                    // ending_trigger：jump_step 的派生——endingId 非空时标识为结局触发
                    if (step.endingId) {
                        const endingName = (gameEndings.find(e => e.id === step.endingId)?.title || step.endingId);
                        bottomPorts.push({
                            stepIdx: si, targetId: '_end_' + step.endingId,
                            label: '🎬', portIdx: portIdx, isEnding: true,
                            type: 'jump-ending', hasTarget: true,
                            tooltipText: '[结局触发] ' + endingName,
                            stepBrief: '结局: ' + endingName,
                        });
                        portIdx++;
                    } else if (step.jumpChapter) {
                        // 常规跳转目标（含 _end_ 快捷跳转）
                        const targetIsEnding = step.jumpChapter.startsWith('_end_');
                        bottomPorts.push({
                            stepIdx: si, targetId: step.jumpChapter || '',
                            label: '⤵ ' + (step.jumpChapter || '?'), portIdx: portIdx,
                            type: 'jump', hasTarget: !!step.jumpChapter,
                            isEnding: targetIsEnding,
                            tooltipText: targetIsEnding
                                ? '[结局] ' + step.jumpChapter
                                : '[跳转] → ' + (step.jumpChapter || '未设置目标'),
                            stepBrief: stepTextBrief(step),
                        });
                        portIdx++;
                    } else {
                        // 占位端口：允许从未设置目标的跳转步骤拖出连线
                        bottomPorts.push({
                            stepIdx: si, targetId: '',
                            label: '⤵ ?', portIdx: portIdx,
                            type: 'jump', hasTarget: false,
                            tooltipText: '[跳转] 未设置目标',
                            stepBrief: stepTextBrief(step),
                        });
                        portIdx++;
                    }
                } else if (step.type === 'choice' && step.choices) {
                    // choice step：每个选项一个端口，无论是否设置了跳转目标
                    step.choices.forEach((ch, ci) => {
                        bottomPorts.push({
                            stepIdx: si, choiceIdx: ci, targetId: ch.jumpChapter || '',
                            label: (ch.text?.substring(0, 6) || '选项') + (ch.jumpChapter ? '' : '?'),
                            portIdx: portIdx, type: 'choice',
                            hasTarget: !!ch.jumpChapter,
                            tooltipText: '[分支#' + (ci + 1) + '] ' + (ch.text?.substring(0, 20) || '无文本')
                                + (ch.jumpChapter ? ' → ' + ch.jumpChapter : ' (未设置目标)'),
                            stepBrief: '选项: ' + (ch.text?.substring(0, 30) || '无文本'),
                        });
                        portIdx++;
                    });
                } else if (step.type === 'ending') {
                    // ending step：结局触发——只能连接到结局节点
                    if (step.endingId) {
                        const endingName = (gameEndings.find(e => e.id === step.endingId)?.title || step.endingId);
                        bottomPorts.push({
                            stepIdx: si, targetId: '_end_' + step.endingId,
                            label: '🎬', portIdx: portIdx, isEnding: true,
                            type: 'jump-ending', hasTarget: true,
                            tooltipText: '[结局触发] ' + endingName,
                            stepBrief: '结局: ' + endingName,
                        });
                        portIdx++;
                    } else {
                        bottomPorts.push({
                            stepIdx: si, targetId: '',
                            label: '🎬?', portIdx: portIdx,
                            type: 'jump-ending', hasTarget: false, isEnding: true,
                            tooltipText: '[结局触发] 未选择结局',
                            stepBrief: '结局触发: (未选择结局)',
                        });
                        portIdx++;
                    }
                }
                // 其他步骤类型（dialogue 等）不具备跳转能力，不产生出口端口
            });
            const totalBP = Math.max(1, bottomPorts.length);
            bottomPorts.forEach((bp, i) => {
                bp.rpX = ((sW) / (totalBP + 1)) * (i + 1);
                bp.rpY = sH;
                bp.pxWorld = pos.x - sW / 2 + bp.rpX;
                bp.pyWorld = pos.y + sH / 2;
            });
            return bottomPorts;
        }

        /** 构建顶部入口端口
         *  非入口章节节点恒常显示一个入口端口（即使当前无入度），
         *  表示该节点可接受外部连接；入口节点不显示入口端口（不允许有入度）。 */
        function buildTopPorts(incomingSrcs, sW, sH, pos, isEntry) {
            if (isEntry) return [];
            // 无入度时返回占位端口（表示可接受连接）
            if (incomingSrcs.length === 0) {
                return [{
                    fromId: null,
                    portIdx: 0,
                    isEnding: false,
                    rpX: sW / 2, rpY: 0,
                    pxWorld: pos.x,
                    pyWorld: pos.y - sH / 2,
                    multiSource: false,
                    sourceCount: 0,
                }];
            }
            return [{
                fromId: incomingSrcs[0].fromId,
                portIdx: 0,
                isEnding: incomingSrcs.some(s => s.isEnding),
                rpX: sW / 2, rpY: 0,
                pxWorld: pos.x,
                pyWorld: pos.y - sH / 2,
                multiSource: incomingSrcs.length > 1,
                sourceCount: incomingSrcs.length,
            }];
        }

        /** 创建结局节点数据 */
        function createEndingNodeData(endNodeId, endingId, pos) {
            const endingData = gameEndings.find(e => e.id === endingId);
            return {
                id: endNodeId, label: endingId,
                endingId: endingId,
                title: (endingData && endingData.title) || endingId,
                description: (endingData && endingData.description) || '',
                x: pos.x, y: pos.y,
                width: 180, height: 60,
            };
        }

        // 边映射 (fromId, toId, portIdx) → edge
        const edgeMap = computed(() => {
            const map = {};
            for (const node of treeNodes.value) {
                for (const bp of (node.bottomPorts || [])) {
                    const key = `${node.id}→${bp.targetId}`;
                    if (!map[key]) map[key] = [];
                    map[key].push({ fromNodeId: node.id, toNodeId: bp.targetId, bottomPort: bp });
                }
            }
            return map;
        });

        // 所有节点的端口数（用于定位）
        const maxPortsPerNode = computed(() => {
            let max = 0;
            for (const n of treeNodes.value) { if (n.ports && n.ports.length > max) max = n.ports.length; }
            return max;
        });

        // 树连线（端口到端口）—— 小圆形（起点）→ 弧线 → 小圆角矩形（终点）
        const treeEdges = computed(() => {
            const edges = [];
            for (const node of treeNodes.value) {
                const fromNode = node;
                for (const bp of (fromNode.bottomPorts || [])) {
                    if (!bp.targetId) continue; // 端口未连线，不渲染弧线
                    const toNode = treeNodes.value.find(n => n.id === bp.targetId);
                    if (!toNode) continue;
                    const isActive = selectedChapterId.value === fromNode.id || selectedChapterId.value === toNode.id
                        || selectedEndingId.value === fromNode.id || selectedEndingId.value === toNode.id;
                    const isEnding = bp.isEnding || toNode.isEnding;
                    // 找到目标节点上对应的顶部端口
                    const topPort = (toNode.topPorts || []).find(tp => tp.fromId === fromNode.id) || (toNode.topPorts || [])[0];
                    edges.push({
                        key: `${fromNode.id}→${toNode.id}_${bp.portIdx}`,
                        from: fromNode.id, to: toNode.id,
                        fromPortIdx: bp.portIdx,
                        toPortIdx: topPort ? topPort.portIdx : 0,
                        path: computeEdgePath(fromNode, bp, toNode, topPort),
                        active: isActive, isEnding,
                        stepIdx: bp.stepIdx, choiceIdx: bp.choiceIdx,
                        endX: topPort ? topPort.pxWorld : 0,
                        endY: topPort ? topPort.pyWorld : 0,
                    });
                }
            }
            return edges;
        });

        // 世界容器样式
        const worldStyle = computed(() => ({
            transform: `translate(${panX.value}px, ${panY.value}px) scale(${viewScale.value})`,
        }));

        // 框选矩形样式
        const selectionBoxStyle = computed(() => {
            const s = selection;
            return {
                left: Math.min(s.startX, s.endX) + 'px',
                top: Math.min(s.startY, s.endY) + 'px',
                width: Math.abs(s.endX - s.startX) + 'px',
                height: Math.abs(s.endY - s.startY) + 'px',
            };
        });

        // ── 正在编辑的章节和步骤 ──────────────────────────────────────
        const editingChapterId = ref('');

        // 同步 editingChapterId ← selectedChapterId
        watch(selectedChapterId, (newId) => {
            editingChapterId.value = newId || '';
        }, { immediate: true });

        const editingSteps = computed(() => {
            if (!selectedChapterId.value) return [];
            return chapters[selectedChapterId.value] || [];
        });

        const editingStep = computed({
            get: () => {
                if (editingStepIndex.value === null || !selectedChapterId.value) return null;
                const steps = chapters[selectedChapterId.value];
                if (!steps || editingStepIndex.value >= steps.length) return null;
                const step = steps[editingStepIndex.value];
                // 初始化 UI 临时属性（仅首次）
                initCGForm(step);
                initCharChanges(step);
                return step;
            },
            set: (val) => {
                // 由表单直接修改 reactive 对象，此 setter 通常不被调用
            }
        });

        const chapterOutgoing = computed(() => adjacency.value[selectedChapterId.value] || []);
        const chapterIncomingCount = computed(() => incoming.value[selectedChapterId.value] || 0);

        const selectedEndingPreview = computed(() => {
            if (!editingStep.value) return null;
            // ending_trigger 是 jump_step 的派生，通过 endingId 标识
            if (editingStep.value.type === 'ending' || (editingStep.value.type === 'jump' && editingStep.value.endingId)) {
                return gameEndings.find(e => e.id === editingStep.value.endingId) || null;
            }
            return null;
        });

        // ── 结局节点编辑数据 ──────────────────────────────────────────
        /** 当前选中的结局节点在 treeNodes 中的完整数据 */
        const selectedEndingNode = computed(() => {
            if (!selectedEndingId.value) return null;
            return treeNodes.value.find(n => n.id === selectedEndingId.value) || null;
        });

        /** 当前选中的结局节点对应的 gameEndings 条目 */
        const selectedEndingData = computed(() => {
            const node = selectedEndingNode.value;
            if (!node || !node.endingId) return null;
            return gameEndings.find(e => e.id === node.endingId) || null;
        });

        /** 指向当前结局节点的源章节列表 */
        const endingIncomingChapters = computed(() => {
            if (!selectedEndingId.value) return [];
            const result = [];
            for (const [cid, steps] of Object.entries(chapters)) {
                for (const step of steps) {
                    if (step.jumpChapter === selectedEndingId.value) {
                        result.push({ id: cid, stepIdx: steps.indexOf(step), text: stepTextBrief(step) });
                    }
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === selectedEndingId.value) {
                                result.push({ id: cid, choiceText: ch.text });
                            }
                        }
                    }
                    if (step.type === 'jump' && step.endingId === selectedEndingId.value.slice(5)) {
                        result.push({ id: cid, stepIdx: steps.indexOf(step), text: '[结局触发]' });
                    }
                    if (step.type === 'ending' && step.endingId === selectedEndingId.value.slice(5)) {
                        result.push({ id: cid, stepIdx: steps.indexOf(step), text: '[结局触发]' });
                    }
                }
            }
            return result;
        });

        // ── 统计数据 ──────────────────────────────────────────────────
        const totalChapters = computed(() => Object.keys(chapters).length);
        const totalSteps = computed(() => {
            let count = 0;
            for (const steps of Object.values(chapters)) count += steps.length;
            return count;
        });
        const totalChoices = computed(() => {
            let count = 0;
            for (const steps of Object.values(chapters)) {
                for (const s of steps) {
                    if (s.type === 'choice') count += (s.choices || []).length;
                }
            }
            return count;
        });

        const availableEffects = ['vignette', 'dim', 'screenShake', 'flashWhite', 'flashBlack'];

        // ── 初始化 ────────────────────────────────────────────────────
        // 存储事件监听器引用以便正确清理
        const _preventContextMenu = e => e.preventDefault();
        onMounted(() => {
            // 检查剧情数据是否为空
            if (Object.keys(chapters).length === 0) {
                showToast('⚠️ 当前资源包中无任何剧情章节，请在画布上右键创建新章节');
            }
            autoLayout();
            // 初始化完成后保存首次快照（避免 autoLayout 被记入操作记录）
            saveUndoSnapshot();
            // 结局节点已由 autoLayout 在章节树下方自动摆放
            window.addEventListener('mouseup', onCanvasMouseUp);
            // 全局禁用浏览器右键菜单（使用 capture 确保优先于所有冒泡处理器）
            document.addEventListener('contextmenu', _preventContextMenu, true);
            // 全局禁用文本选中和图片拖拽（CSS 已处理，JS 二次防御）
            document.addEventListener('selectstart', onGlobalSelectStart);
            document.addEventListener('dragstart', onGlobalDragStart);
            // 全局键盘快捷键
            document.addEventListener('keydown', onGlobalKeyDown);
            // 从 gameConfig 读取标题并同步到页面 title
            document.title = '剧情树节点编辑器 — ' + (gameConfig.title || 'Galgame');
        });

        // 监听 title 变化（用户可在游戏设置中修改标题）
        watch(() => gameConfig.title, (newTitle) => {
            document.title = '剧情树节点编辑器 — ' + (newTitle || 'Galgame');
        });

        // 右键菜单打开时重置焦点
        watch(() => contextMenu.show, (v) => { if (v) contextMenuFocusIndex.value = 0; });
        watch(() => globalContextMenu.show, (v) => { if (v) globalContextMenu.focusIndex = 0; });

        onUnmounted(() => {
            window.removeEventListener('mouseup', onCanvasMouseUp);
            document.removeEventListener('contextmenu', _preventContextMenu, true);
            document.removeEventListener('selectstart', onGlobalSelectStart);
            document.removeEventListener('dragstart', onGlobalDragStart);
            document.removeEventListener('keydown', onGlobalKeyDown);
        });

        // ── 坐标转换 ──────────────────────────────────────────────────
        function screenToWorld(sx, sy) {
            return {
                x: (sx - panX.value) / viewScale.value,
                y: (sy - panY.value) / viewScale.value,
            };
        }

        function worldToScreen(wx, wy) {
            return {
                x: wx * viewScale.value + panX.value,
                y: wy * viewScale.value + panY.value,
            };
        }

        /** 获取框选矩形内包含的节点 */
        function getNodesInRect(screenLeft, screenTop, screenRight, screenBottom) {
            const result = [];
            for (const node of treeNodes.value) {
                const sp = worldToScreen(node.x, node.y);
                if (sp.x >= screenLeft && sp.x <= screenRight &&
                    sp.y >= screenTop && sp.y <= screenBottom) {
                    result.push(node);
                }
            }
            return result;
        }

        /** 清除所有节点的选框选中状态 */
        function clearNodeSelection() {
            for (const key of Object.keys(selectedNodeIds)) {
                delete selectedNodeIds[key];
            }
        }

        // ── Toast ─────────────────────────────────────────────────────
        function showToast(msg) {
            toastMsg.value = msg;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2500);
        }

        // ── 布局 ──────────────────────────────────────────────────────
        function autoLayout() {
            // 1. 章节节点树状布局（使用实际节点尺寸）
            const chapterPositions = computeLayout(chapters, nodeStyles);
            for (const [id, pos] of Object.entries(chapterPositions)) {
                nodePositions[id] = pos;
            }
            // 2. 结局节点放在章节树下方
            const endingPositions = computeEndingLayout(chapters, gameEndings, chapterPositions, nodeStyles);
            for (const [id, pos] of Object.entries(endingPositions)) {
                nodePositions[id] = pos;
            }
            showToast('已自动排列节点布局');
        }

        // computeEndingLayout 已由 ./tree-layout.js 的 import 提供

        // ── 缩放平移 ──────────────────────────────────────────────────
        function zoomIn() {
            viewScale.value = Math.min(2.0, viewScale.value + 0.1);
        }

        function zoomOut() {
            viewScale.value = Math.max(0.3, viewScale.value - 0.1);
        }

        function resetView() {
            const panel = treePanel.value;
            const nodes = treeNodes.value;
            if (!panel || nodes.length === 0) {
                viewScale.value = 1.0;
                panX.value = 0;
                panY.value = 0;
                return;
            }

            // 计算所有节点的包围盒
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const node of nodes) {
                if (node.x < minX) minX = node.x;
                if (node.y < minY) minY = node.y;
                if (node.x > maxX) maxX = node.x;
                if (node.y > maxY) maxY = node.y;
            }

            const contentCenterX = (minX + maxX) / 2;
            const contentCenterY = (minY + maxY) / 2;
            const rect = panel.getBoundingClientRect();

            viewScale.value = 1.0;
            panX.value = rect.width / 2 - contentCenterX;
            panY.value = rect.height / 2 - contentCenterY;
        }

        function handleWheel(e) {
            const oldScale = viewScale.value;
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newScale = Math.max(0.3, Math.min(2.0, oldScale + delta));

            // 以鼠标位置为缩放中心
            const rect = treePanel.value.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldX = (mouseX - panX.value) / oldScale;
            const worldY = (mouseY - panY.value) / oldScale;
            panX.value = mouseX - worldX * newScale;
            panY.value = mouseY - worldY * newScale;

            viewScale.value = newScale;
        }

        function zoomToNode(node) {
            const panel = treePanel.value;
            if (!panel) return;
            const rect = panel.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            // 把节点移到面板中心
            panX.value = centerX - node.x * viewScale.value;
            panY.value = centerY - node.y * viewScale.value;
            selectNode(node.id);
            editingStepIndex.value = null;
        }

        // ── 画布鼠标事件 ───────────────────────────────────────────────
        function onCanvasMouseDown(e) {
            // 中键 = 平移
            if (e.button === 1) {
                panning.active = true;
                panning.startX = e.clientX;
                panning.startY = e.clientY;
                panning.origPanX = panX.value;
                panning.origPanY = panY.value;
                e.preventDefault();
                return;
            }

            // 左键在空白区域 = 框选
            if (e.button === 0) {
                const isCanvas = e.target === treePanel.value ||
                    e.target.classList.contains('tree-world') ||
                    e.target.classList.contains('tree-svg') ||
                    e.target.classList.contains('tree-nodes-layer') ||
                    e.target.classList.contains('tree-empty');
                if (isCanvas) {
                    const rect = treePanel.value.getBoundingClientRect();
                    selection.active = true;
                    selection.startX = e.clientX - rect.left;
                    selection.startY = e.clientY - rect.top;
                    selection.endX = selection.startX;
                    selection.endY = selection.startY;
                }
            }
        }

        function onCanvasMouseMove(e) {
            const panelRect = treePanel.value ? treePanel.value.getBoundingClientRect() : null;

            if (panning.active) {
                panX.value = panning.origPanX + (e.clientX - panning.startX);
                panY.value = panning.origPanY + (e.clientY - panning.startY);
            }
            if (selection.active && panelRect) {
                selection.endX = e.clientX - panelRect.left;
                selection.endY = e.clientY - panelRect.top;
            }
            if (dragging.active) {
                const dx = (e.clientX - dragging.startX) / viewScale.value;
                const dy = (e.clientY - dragging.startY) / viewScale.value;
                if (dragging.multiDrag) {
                    for (const [nid, startPos] of Object.entries(dragging.nodeStartPositions)) {
                        if (nodePositions[nid] !== undefined) {
                            nodePositions[nid] = { x: startPos.x + dx, y: startPos.y + dy };
                            updateGroupsForNode(nid);
                        }
                    }
                } else {
                    nodePositions[dragging.nodeId] = {
                        x: dragging.nodeStartX + dx,
                        y: dragging.nodeStartY + dy,
                    };
                    updateGroupsForNode(dragging.nodeId);
                }
            }
            if (resizingNode.active) { /* resize handled by document mousemove */ }
        }

        function onCanvasMouseUp() {
            // 结束框选
            if (selection.active) {
                const left = Math.min(selection.startX, selection.endX);
                const top = Math.min(selection.startY, selection.endY);
                const right = Math.max(selection.startX, selection.endX);
                const bottom = Math.max(selection.startY, selection.endY);
                const w = right - left;
                const h = bottom - top;

                if (w > 4 || h > 4) {
                    // 有效框选（大于 4px 才算）
                    const selected = getNodesInRect(left, top, right, bottom);
                    clearNodeSelection();
                    for (const node of selected) {
                        selectedNodeIds[node.id] = true;
                    }
                    if (selected.length > 0) {
                        selectNode(selected[0].id);
                    }
                } else {
                    // 单击空白 = 取消所有选中（节点、连线、分组等）
                    clearSelection();
                }

                selection.active = false;
            }

            panning.active = false;
            if (dragging.active) {
                dragging.active = false;
                dragging.nodeId = null;
            }
        }

        // ── 节点拖拽 ──────────────────────────────────────────────────
        function onNodeMouseDown(e, node) {
            if (e.button !== 0) return; // 只响应左键
            saveUndoSnapshot(); // 拖拽前保存状态
            dragging.active = true;
            dragging.nodeId = node.id;
            dragging.startX = e.clientX;
            dragging.startY = e.clientY;

            // 多选拖拽：如果被拖节点在选中集合中，则同时移动所有选中节点
            if (selectedNodeIds[node.id] && Object.keys(selectedNodeIds).length > 1) {
                dragging.multiDrag = true;
                dragging.nodeStartPositions = {};
                for (const nid of Object.keys(selectedNodeIds)) {
                    if (nodePositions[nid]) {
                        dragging.nodeStartPositions[nid] = { x: nodePositions[nid].x, y: nodePositions[nid].y };
                    }
                }
            } else {
                dragging.multiDrag = false;
                dragging.nodeStartX = node.x;
                dragging.nodeStartY = node.y;
            }
        }

        // ── 选择 ──────────────────────────────────────────────────────
        function selectNode(nodeId) {
            const type = getNodeType(nodeId);
            if (type === NODE_TYPE.ENDING) {
                selectedEndingId.value = nodeId;
                selectedChapterId.value = null;
            } else {
                selectedChapterId.value = nodeId;
                selectedEndingId.value = null;
            }
            editingStepIndex.value = null;
        }

        function selectStep(index) {
            saveUndoSnapshot(); // 保存状态，编辑步骤文本后可撤销
            editingStepIndex.value = index;
        }

        /** 定位到指定对象（在树中选中并聚焦，或打开资源管理器） */
        function locateTo(type, id, subId) {
            switch (type) {
                case 'chapter':
                    selectNode(id);
                    const chapterNode = treeNodes.value.find(n => n.id === id);
                    if (chapterNode) zoomToNode(chapterNode);
                    break;
                case 'ending':
                    selectNode(id);
                    const endingNode = treeNodes.value.find(n => n.id === id);
                    if (endingNode) zoomToNode(endingNode);
                    break;
                case 'resource':
                    // 打开资源管理器并选中指定标签页和资源
                    showResourceManager.value = true;
                    resourceTab.value = subId || 'characters';
                    selectedResourceId.value = id;
                    break;
                default: break;
            }
        }

        // ── 右键菜单 ──────────────────────────────────────────────────
        function onCanvasContextMenu(e) {
            const rect = treePanel.value.getBoundingClientRect();
            contextMenu.show = true;
            contextMenu.x = e.clientX - rect.left;
            contextMenu.y = e.clientY - rect.top;
            const wp = screenToWorld(contextMenu.x, contextMenu.y);
            contextMenu.worldX = wp.x;
            contextMenu.worldY = wp.y;
            // 由 onNodeContextMenu 或默认设置 nodeId
            if (!contextMenu.nodeId) {
                // 检查是否在某个节点上右键
                const clickedNode = treeNodes.value.find(n => {
                    const dx = Math.abs(n.x - wp.x);
                    const dy = Math.abs(n.y - wp.y);
                    return dx < 100 && dy < 45;
                });
                contextMenu.nodeId = clickedNode ? clickedNode.id : null;
            }
        }

        function onNodeContextMenu(e, node) {
            contextMenu.show = true;
            contextMenu.nodeId = node.id;
            contextMenu.groupId = null;
            const rect = treePanel.value.getBoundingClientRect();
            contextMenu.x = e.clientX - rect.left;
            contextMenu.y = e.clientY - rect.top;
            const wp = screenToWorld(contextMenu.x, contextMenu.y);
            contextMenu.worldX = wp.x;
            contextMenu.worldY = wp.y;
        }

        function onGroupContextMenu(e, groupId) {
            contextMenu.show = true;
            contextMenu.nodeId = null;
            contextMenu.groupId = groupId;
            const rect = treePanel.value.getBoundingClientRect();
            contextMenu.x = e.clientX - rect.left;
            contextMenu.y = e.clientY - rect.top;
            const wp = screenToWorld(contextMenu.x, contextMenu.y);
            contextMenu.worldX = wp.x;
            contextMenu.worldY = wp.y;
        }

        function closeContextMenu() {
            contextMenu.show = false;
            contextMenu.nodeId = null;
            contextMenuFocusIndex.value = -1;
        }

        function contextZoomToNode() {
            if (contextMenu.nodeId) {
                const node = treeNodes.value.find(n => n.id === contextMenu.nodeId);
                if (node) zoomToNode(node);
            }
            closeContextMenu();
        }

        function contextCopyId() {
            if (contextMenu.nodeId) {
                navigator.clipboard.writeText(contextMenu.nodeId).then(() => {
                    showToast('已复制章节 ID：' + contextMenu.nodeId);
                }).catch(() => {
                    showToast('复制失败，ID：' + contextMenu.nodeId);
                });
            }
            closeContextMenu();
        }

        function contextDeleteChapter() {
            if (contextMenu.nodeId) {
                selectNode(contextMenu.nodeId);
                nextTick(() => deleteChapter());
            }
            closeContextMenu();
        }

        function contextDuplicateChapter() {
            saveUndoSnapshot();
            if (!contextMenu.nodeId) { closeContextMenu(); return; }
            const srcId = contextMenu.nodeId;
            // 结局节点不能复制为章节
            if (isEndingNode(srcId)) {
                showToast('结局节点不支持复制操作');
                closeContextMenu();
                return;
            }
            const srcSteps = chapters[srcId];
            if (!srcSteps) { closeContextMenu(); return; }
            const newId = uid('chapter');
            chapters[newId] = clone(srcSteps);
            // 放置偏移位置
            if (nodePositions[srcId]) {
                nodePositions[newId] = {
                    x: nodePositions[srcId].x + 50,
                    y: nodePositions[srcId].y + 50,
                };
            }
            selectedChapterId.value = newId;
            editingStepIndex.value = null;
            showToast(`已复制章节：${srcId} → ${newId}`);
            closeContextMenu();
        }

        function contextEditEnding() {
            if (contextMenu.nodeId && isEndingNode(contextMenu.nodeId)) {
                selectNode(contextMenu.nodeId);
            }
            closeContextMenu();
        }

        function addChapterAtPos(worldX, worldY) {
            saveUndoSnapshot();
            const newId = uid('chapter');
            chapters[newId] = [{
                sceneId: '',
                type: 'dialogue',
                characterId: null,
                text: '新对话段落...',
                effects: [],
            }, {
                sceneId: '',
                type: 'jump',
                jumpChapter: '',
            }];
            nodePositions[newId] = { x: worldX, y: worldY };
            selectedChapterId.value = newId;
            editingStepIndex.value = 0;
            showToast(`已在位置创建新章节：${newId}`);
            closeContextMenu();
        }

        function addStepFromContext() {
            saveUndoSnapshot();
            if (!contextMenu.nodeId) { closeContextMenu(); return; }
            if (isEndingNode(contextMenu.nodeId)) {
                showToast('结局节点不能添加步骤');
                closeContextMenu();
                return;
            }
            selectedChapterId.value = contextMenu.nodeId;
            nextTick(() => addStep());
            closeContextMenu();
        }

        // ── 游戏设置 ──────────────────────────────────────────────────
        function openGameSettings() {
            editableGameConfig.title = gameConfig.title || '';
            editableGameConfig.aspectWidth = gameConfig.aspectRatio?.width || 1280;
            editableGameConfig.aspectHeight = gameConfig.aspectRatio?.height || 720;
            editableGameConfig.textSpeed = gameConfig.textSpeed || 25;
            const pb = GameData.HOME_CONFIG?.panelBackground || {};
            editableHomeConfig.panelBgUrl = pb.url || '';
            editableHomeConfig.panelOverlayColor = pb.overlayColor || 'rgba(4,4,10,0.88)';
            editableHomeConfig.panelOverlayGradient = pb.overlayGradient || '';
            showGameSettings.value = true;
        }

        function saveGameSettings() {
            // 直接修改 gameConfig 对象（它是从 GameData 来的引用）
            gameConfig.title = editableGameConfig.title;
            gameConfig.aspectRatio = {
                width: editableGameConfig.aspectWidth,
                height: editableGameConfig.aspectHeight,
            };
            gameConfig.textSpeed = editableGameConfig.textSpeed;
            gameConfig.entryPoints = Object.keys(entryPoints);
            // 保存面板背景配置到 HomeConfig
            if (!GameData.HOME_CONFIG.panelBackground) {
                GameData.HOME_CONFIG.panelBackground = {};
            }
            GameData.HOME_CONFIG.panelBackground.url = editableHomeConfig.panelBgUrl;
            GameData.HOME_CONFIG.panelBackground.overlayColor = editableHomeConfig.panelOverlayColor;
            GameData.HOME_CONFIG.panelBackground.overlayGradient = editableHomeConfig.panelOverlayGradient;
            showGameSettings.value = false;
            showToast('✅ 游戏设置已保存！请点击"同步到游戏"使引擎生效。');
        }

        // ── 资源完整性校验（编辑器内手动触发） ──────────────────────────
        async function validateEditorResources() {
            const data = {
                CHARACTERS: gameCharacters,
                SCENES: gameScenes,
                CG_LIBRARY: gameCgLibrary,
                HOME_CONFIG: gameConfig?.home || gameConfig,
            };
            try {
                const result = await editorPathResolver.validateAll(data);
                if (result.ok) {
                    showToast('✅ 所有资源文件完整，共检查 ' + result.missing.length + ' 项');
                } else {
                    const msg = result.missing.map(m => `  · [${m.type}] ${m.path}`).join('\n');
                    showToast(`⚠️ 发现 ${result.missing.length} 个缺失资源（控制台查看详情）`);
                    console.warn('缺失资源列表:\n' + msg);
                }
            } catch (e) {
                showToast('❌ 校验过程异常: ' + e.message);
            }
        }

        // ── 同步到游戏引擎 ──────────────────────────────────────────────
        function syncToGame() {
            try {
                const data = {
                    chapters: JSON.parse(JSON.stringify(chapters)),
                    characters: JSON.parse(JSON.stringify(gameCharacters)),
                    scenes: JSON.parse(JSON.stringify(gameScenes)),
                    cgLibrary: JSON.parse(JSON.stringify(gameCgLibrary)),
                    items: JSON.parse(JSON.stringify(gameItems)),
                    endings: JSON.parse(JSON.stringify(gameEndings)),
                    // 编辑器元数据
                    editorMeta: {
                        nodePositions: JSON.parse(JSON.stringify(nodePositions)),
                        nodeStyles: JSON.parse(JSON.stringify(nodeStyles)),
                        editorGroups: JSON.parse(JSON.stringify(editorGroups)),
                        canvasComments: JSON.parse(JSON.stringify(canvasComments)),
                        chapterDescriptions: JSON.parse(JSON.stringify(chapterDescriptions)),
                    },
                    entryPoints: Object.keys(entryPoints),
                    config: {
                        title: gameConfig.title,
                        aspectRatio: { ...gameConfig.aspectRatio },
                        textSpeed: gameConfig.textSpeed,
                        entryPoints: Object.keys(entryPoints),
                    },
                    timestamp: Date.now(),
                };
                localStorage.setItem('galgame-editor-data', JSON.stringify(data));
                showToast('✅ 已同步到游戏引擎！刷新游戏页面（F5）即可生效。');
            } catch (e) {
                showToast('❌ 同步失败：' + e.message);
            }
        }

        /** 剧情预览：先同步数据，再打开游戏页面 */
        function previewStory() {
            try {
                syncToGame();
                // 使用目标=_blank 在新窗口打开游戏页面，或使用已存在的游戏窗口
                const previewUrl = '../index.html?preview=1&t=' + Date.now();
                window.open(previewUrl, 'galgame_preview');
                showToast('✅ 已打开剧情预览窗口');
            } catch (e) {
                showToast('❌ 预览打开失败：' + e.message);
            }
        }

        // ── 资源管理器 ──────────────────────────────────────────────────
        function openResourceManager() {
            showResourceManager.value = true;
            resourceTab.value = 'characters';
            selectedResourceId.value = null;
        }

        function selectResource(type, id) {
            resourceTab.value = type;
            selectedResourceId.value = id;
            resEditStepIndex.value = null;
        }

        function addResource(type) {
            const meta = resourceMeta[type];
            if (!meta) return;
            const newId = uid(type === 'endings' ? 'ending' : type);

            if (meta.isObject) {
                // 章节：新建默认步骤
                if (meta.isChapter) {
                    meta.data[newId] = [{
                        sceneId: '',
                        type: 'dialogue',
                        characterId: null,
                        text: '新对话段落...',
                        effects: [],
                    }, {
                        sceneId: '',
                        type: 'jump',
                        jumpChapter: '',
                    }];
                    nodePositions[newId] = { x: 400, y: 300 };
                } else if (type === 'characters') {
                    meta.data[newId] = {
                        name: '新角色', color: '#ffffff', race: '', gender: '', role: '',
                        defaultSpeed: 25, description: '', avatars: {}, sprites: { default: { id: 'default', label: '👤 默认', url: '' } },
                    };
                } else if (type === 'scenes') {
                    meta.data[newId] = { title: '新场景', url: '', bgPlaceholder: '#111111' };
                } else if (type === 'cg') {
                    meta.data[newId] = { title: '新 CG', subtitle: '', url: '' };
                } else if (type === 'items') {
                    meta.data[newId] = { name: '新物品', icon: '📦', image: '', description: '' };
                }
            } else {
                // Endings (array)
                meta.data.push({ id: newId, title: '新结局', description: '' });
            }

            selectedResourceId.value = newId;
            showToast(`已创建新${meta.label}：${newId}`);
        }

        function deleteResource(type, id) {
            const meta = resourceMeta[type];
            if (!meta) return;
            // 删除包含锁定步骤的章节时给出警告
            if (meta.isChapter && chapters[id]?.some(s => s.locked)) {
                if (!confirm(`⚠ 此章节包含已锁定的步骤，确定删除吗？`)) return;
            }
            if (!confirm(`确定删除此${meta.label}吗？此操作不可撤销。`)) return;

            if (meta.isObject) {
                // 章节：同时清理节点位置
                if (meta.isChapter) {
                    delete nodePositions[id];
                    delete chapterRenameIds[id];
                }
                delete meta.data[id];
            } else {
                // endings 是数组 —— 清理步骤中的引用后再删除
                const arr = meta.data;
                const idx = arr.findIndex(e => e.id === id);
                if (idx > -1) {
                    // 清理所有步骤中对这个结局的引用
                    for (const [cid, steps] of Object.entries(chapters)) {
                        for (const step of steps) {
                            if (step.endingId === id) step.endingId = '';
                            if (step.jumpChapter === '_end_' + id) step.jumpChapter = '';
                            if (step.type === 'choice' && step.choices) {
                                for (const ch of step.choices) {
                                    if (ch.jumpChapter === '_end_' + id) ch.jumpChapter = '';
                                }
                            }
                        }
                    }
                    // 清理树节点位置
                    delete nodePositions['_end_' + id];
                    arr.splice(idx, 1);
                }
            }

            if (selectedResourceId.value === id) {
                selectedResourceId.value = null;
            }
            showToast(`已删除${meta.label}`);
        }

        /** 为角色添加立绘 */
        function addSprite(character) {
            if (!character.sprites) character.sprites = {};
            const spriteId = 'sprite_' + Date.now().toString(36);
            // 从角色ID + 立绘ID 自动生成路径（拼图式构建）
            const charId = Object.keys(gameCharacters).find(cid => gameCharacters[cid] === character);
            const autoUrl = charId ? editorPathResolver.sprite(charId, spriteId) : '';
            character.sprites[spriteId] = { id: spriteId, label: '新立绘', url: autoUrl };
        }

        /** 为角色添加头像 */
        function addAvatar(character) {
            if (!character.avatars) character.avatars = {};
            const avatarId = 'avatar_' + Date.now().toString(36);
            const charId = Object.keys(gameCharacters).find(cid => gameCharacters[cid] === character);
            const autoUrl = charId ? editorPathResolver.avatar(charId, avatarId) : '';
            character.avatars[avatarId] = autoUrl;
        }

        // ── 曲线（边）交互 ────────────────────────────────────────────
        let edgeDragState = null; // { edge, fromPort, toPort, isDragging }

        function onEdgeClick(edge) {
            // 点击曲线：选中该连线，支持按 Delete 删除
            selectedEdge.value = edge;
            showToast(`选中连线: ${edge.from} → ${edge.to}`);
        }

        function onEdgeMouseDown(e, edge) {
            if (e.button !== 0) return;
            // 开始拖动曲线以重新连接
            const fromNode = treeNodes.value.find(n => n.id === edge.from);
            const toNode = treeNodes.value.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return;
            // 允许拖动来断开/重新连接
            edgeDragState = { edge, fromNode, toNode, isDragging: false };
            // 记录初始点击位置
            const rect = treePanel.value.getBoundingClientRect();
            edgeDragState.startX = e.clientX - rect.left;
            edgeDragState.startY = e.clientY - rect.top;
        }

        function onEdgeHandleMouseDown(e, edge) {
            if (e.button !== 0) return;
            // 从箭头端拖拽手柄 → 重新连接目标
            const fromNode = treeNodes.value.find(n => n.id === edge.from);
            const toNode = treeNodes.value.find(n => n.id === edge.to);
            if (!fromNode) return;
            // 查找对应的底部端口
            const bp = (fromNode.bottomPorts || []).find(p => p.targetId === edge.to);
            if (!bp) return;

            // 启动端口拖拽重新连接模式（复用 portDragging）
            portDragging.active = true;
            portDragging.fromNodeId = edge.from;
            portDragging.fromPortIdx = bp.portIdx;
            portDragging.fromStepIdx = bp.stepIdx;
            portDragging.fromChoiceIdx = bp.choiceIdx;
            portDragging.isEndingPort = !!bp.isEnding; // 标记是否为 ending_trigger
            portDragging.mouseX = e.clientX;
            portDragging.mouseY = e.clientY;

            const onMove = (ev) => {
                portDragging.mouseX = ev.clientX;
                portDragging.mouseY = ev.clientY;
            };
            const onUp = (ev) => {
                portDragging.active = false;
                portDragging.isEndingPort = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                const rect = treePanel.value.getBoundingClientRect();
                const sx = ev.clientX - rect.left;
                const sy = ev.clientY - rect.top;
                const wp = screenToWorld(sx, sy);
                // 磁吸检测（ending_trigger 由 portDragCurve 中的逻辑限制目标类型）
                const snapped = findSnapTarget(wp);
                const target = snapped || treeNodes.value.find(n => {
                    if (n.id === edge.from) return false;
                    // ending_trigger 端口只能连接到结局节点
                    if (bp.isEnding && !n.id.startsWith('_end_')) return false;
                    const dx = Math.abs(n.x - wp.x);
                    const dy = Math.abs(n.y - wp.y);
                    return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                });
                if (target) {
                    portDragging.fromPortIdx = bp.portIdx;
                    updatePortTarget(bp, target.id);
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        // 磁吸检测：在世界坐标附近寻找最近的节点端口
        function findSnapTarget(worldPos, threshold = 40) {
            const snapDist = threshold / viewScale.value;
            let best = null, bestDist = snapDist;
            for (const node of treeNodes.value) {
                const dx = node.x - worldPos.x;
                const dy = node.y - worldPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = node;
                }
            }
            return best;
        }

        // ── 连接端口（底部圆形 → 拖拽 → 目标节点顶部圆角正方形）──────
        function startPortDrag(e, nodeId, portIdx, port) {
            // ending_trigger 端口：允许拖拽，但只能连接到结局节点
            if (port.isEnding) {
                // 记录为 ending_trigger 端口，拖拽曲线和磁吸逻辑会据此限制目标
                portDragging.active = true;
                portDragging.fromNodeId = nodeId;
                portDragging.fromPortIdx = portIdx;
                portDragging.fromStepIdx = port.stepIdx;
                portDragging.fromChoiceIdx = port.choiceIdx;
                portDragging.isEndingPort = true;
                portDragging.snapTargetId = null;
                portDragging.mouseX = e.clientX;
                portDragging.mouseY = e.clientY;

                const onMove = (ev) => {
                    portDragging.mouseX = ev.clientX;
                    portDragging.mouseY = ev.clientY;
                };
                const onUp = (ev) => {
                    portDragging.active = false;
                    portDragging.isEndingPort = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    const targetId = portDragging.snapTargetId;
                    if (targetId) {
                        if (!targetId.startsWith('_end_')) {
                            showToast('❌ 结局触发端口只能连接到结局节点');
                            return;
                        }
                        updatePortTarget(port, targetId);
                    } else {
                        const rect = treePanel.value.getBoundingClientRect();
                        const sx = ev.clientX - rect.left;
                        const sy = ev.clientY - rect.top;
                        const wp = screenToWorld(sx, sy);
                        const target = treeNodes.value.find(n => {
                            if (n.id === nodeId || !n.id.startsWith('_end_')) return false;
                            const dx = Math.abs(n.x - wp.x);
                            const dy = Math.abs(n.y - wp.y);
                            return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                        });
                        if (target) updatePortTarget(port, target.id);
                    }
                    portDragging.snapTargetId = null;
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                return;
            }

            portDragging.active = true;
            portDragging.fromNodeId = nodeId;
            portDragging.fromPortIdx = portIdx;
            portDragging.fromStepIdx = port.stepIdx;
            portDragging.fromChoiceIdx = port.choiceIdx;
            portDragging.isEndingPort = false;
            portDragging.snapTargetId = null;
            portDragging.mouseX = e.clientX;
            portDragging.mouseY = e.clientY;
            const onMove = (ev) => {
                portDragging.mouseX = ev.clientX;
                portDragging.mouseY = ev.clientY;
            };
            const onUp = (ev) => {
                portDragging.active = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                // 使用磁吸检测结果（已在 portDragCurve 中计算）
                const targetId = portDragging.snapTargetId;
                if (targetId) {
                    updatePortTarget(port, targetId);
                } else {
                    const rect = treePanel.value.getBoundingClientRect();
                    const sx = ev.clientX - rect.left;
                    const sy = ev.clientY - rect.top;
                    const wp = screenToWorld(sx, sy);
                    const target = treeNodes.value.find(n => {
                        if (n.id === nodeId) return false;
                        const dx = Math.abs(n.x - wp.x);
                        const dy = Math.abs(n.y - wp.y);
                        return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                    });
                    if (target) updatePortTarget(port, target.id);
                }
                portDragging.snapTargetId = null;
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        function jumpToPortTarget(port) {
            const tid = port.targetId;
            if (tid.startsWith('_end_')) {
                showToast('结局: ' + (treeNodes.value.find(n => n.id === tid)?.firstText || tid));
                return;
            }
            const targetNode = treeNodes.value.find(n => n.id === tid);
            if (targetNode) { selectNode(targetNode.id); zoomToNode(targetNode); }
        }

        function updatePortTarget(port, newTargetId) {
            saveUndoSnapshot();
            const steps = chapters[portDragging.fromNodeId];
            if (!steps) return;
            const step = steps[port.stepIdx];
            if (!step) return;
            if (port.choiceIdx !== undefined && step.choices) {
                // choice step 的选项端口
                step.choices[port.choiceIdx].jumpChapter = newTargetId;
            } else if (port.type === 'jump-ending' || port.isEnding) {
                // ending_trigger 端口（jump_step 的派生）—— 引擎限制只能指向结局
                if (newTargetId.startsWith('_end_')) {
                    step.endingId = newTargetId.slice(5);
                    step.jumpChapter = '';
                } else {
                    showToast('❌ 结局触发只能连接到结局节点（_end_*）');
                    return;
                }
            } else {
                // 常规跳转端口
                step.jumpChapter = newTargetId;
            }
            port.targetId = newTargetId;
            port.isEnding = newTargetId.startsWith('_end_');
            showToast(`跳转目标已更新 → ${newTargetId}`);
        }

        const portDragCurve = computed(() => {
            if (!portDragging.active) return '';
            const fromNode = treeNodes.value.find(n => n.id === portDragging.fromNodeId);
            if (!fromNode) return '';
            const rect = treePanel.value?.getBoundingClientRect();
            if (!rect) return '';
            const wp = screenToWorld(portDragging.mouseX - rect.left, portDragging.mouseY - rect.top);
            // 从端口存储的世界坐标开始
            const bp = (fromNode.bottomPorts || [])[portDragging.fromPortIdx];
            if (!bp) return '';
            const x1 = bp.pxWorld;
            const y1 = bp.pyWorld;

            // 磁吸检测：在光标附近找最近的节点
            const snapThreshold = 50 / viewScale.value;
            let snapTarget = null;
            let snapDist = snapThreshold;
            for (const node of treeNodes.value) {
                if (node.id === portDragging.fromNodeId) continue;
                // ending_trigger 端口只能磁吸到结局节点
                if (portDragging.isEndingPort && !node.id.startsWith('_end_')) continue;
                const dx = node.x - wp.x;
                const dy = node.y - wp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < snapDist) {
                    snapDist = dist;
                    snapTarget = node;
                }
            }
            // 存储磁吸目标供 onUp 使用
            portDragging.snapTargetId = snapTarget ? snapTarget.id : null;

            let endX = wp.x, endY = wp.y;
            if (snapTarget) {
                // 磁吸到节点边界（周界点）
                const pp = getPerimeterPoint(snapTarget, { x: x1, y: y1 }, wp);
                endX = pp.x;
                endY = pp.y;
            }

            const dy2 = Math.abs(endY - y1);
            const cpOffset = Math.max(50, dy2 * 0.5);
            return `M ${x1} ${y1} C ${x1} ${y1 + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
        });

        // ── 节点缩放 ────────────────────────────────────────────────────
        function startNodeResize(e, node, edge) {
            e.preventDefault(); e.stopPropagation();
            resizingNode.active = true;
            resizingNode.nodeId = node.id;
            resizingNode.edge = edge;
            resizingNode.startX = e.clientX;
            resizingNode.startY = e.clientY;
            resizingNode.startW = node.width || 200;
            resizingNode.startH = node.height || 90;
            const onMove = (ev) => {
                const dx = (ev.clientX - resizingNode.startX) / viewScale.value;
                const dy = (ev.clientY - resizingNode.startY) / viewScale.value;
                if (!nodeStyles[resizingNode.nodeId]) nodeStyles[resizingNode.nodeId] = {};
                const st = nodeStyles[resizingNode.nodeId];
                if (edge === 'e' || edge === 'se') st.width = Math.max(140, resizingNode.startW + dx);
                if (edge === 'se') st.height = Math.max(50, resizingNode.startH + dy);
            };
            const onUp = () => {
                resizingNode.active = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        // ── 分组（重做） ──────────────────────────────────────────────────
        const selectedGroupId = ref(null);

        /** 从当前选中节点创建分组 */
        function createGroupFromSelection() {
            saveUndoSnapshot();
            const ids = Object.keys(selectedNodeIds);
            if (ids.length < 2) { showToast('请先框选至少 2 个节点'); return; }
            const groupId = uid('group');
            const nodes = ids.map(id => treeNodes.value.find(n => n.id === id)).filter(Boolean);
            const minX = Math.min(...nodes.map(n => n.x)) - 60;
            const minY = Math.min(...nodes.map(n => n.y)) - 40;
            const maxX = Math.max(...nodes.map(n => n.x)) + 60;
            const maxY = Math.max(...nodes.map(n => n.y)) + 40;
            editorGroups[groupId] = {
                name: '分组 ' + (Object.keys(editorGroups).length + 1),
                color: '#5a8a5a',
                bgColor: '#2a4a2a',
                bgOpacity: 0.25,
                bgImage: '',
                nodeIds: [...ids],
                x: minX, y: minY,
                w: maxX - minX, h: maxY - minY,
            };
            selectedGroupId.value = groupId;
            showToast(`✅ 已创建分组: ${editorGroups[groupId].name}`);
        }

        /** 删除分组 */
        function deleteGroup(groupId) {
            if (!groupId || !editorGroups[groupId]) return;
            if (!confirm(`确定删除分组「${editorGroups[groupId].name}」？`)) return;
            saveUndoSnapshot();
            delete editorGroups[groupId];
            if (selectedGroupId.value === groupId) selectedGroupId.value = null;
            showToast('已删除分组');
        }

        /** 重命名分组 */
        function renameGroup(groupId) {
            const name = prompt('分组名称:', editorGroups[groupId]?.name || '');
            if (name) { editorGroups[groupId].name = name; }
        }

        /** 向分组添加节点 */
        function addNodeToGroup(groupId, nodeId) {
            const grp = editorGroups[groupId];
            if (!grp || grp.nodeIds.includes(nodeId)) return;
            grp.nodeIds.push(nodeId);
            updateGroupBounds(groupId);
            showToast(`已将节点加入分组`);
        }

        /** 从分组移除节点 */
        function removeNodeFromGroup(groupId, nodeId) {
            const grp = editorGroups[groupId];
            if (!grp) return;
            const idx = grp.nodeIds.indexOf(nodeId);
            if (idx === -1) return;
            grp.nodeIds.splice(idx, 1);
            if (grp.nodeIds.length === 0) {
                deleteGroup(groupId);
            } else {
                updateGroupBounds(groupId);
            }
        }

        /** 更新分组的边界矩形 */
        function updateGroupBounds(groupId) {
            const grp = editorGroups[groupId];
            if (!grp || grp.nodeIds.length === 0) return;
            const nodes = grp.nodeIds.map(id => treeNodes.value.find(n => n.id === id)).filter(Boolean);
            if (nodes.length === 0) return;
            grp.x = Math.min(...nodes.map(n => n.x)) - 60;
            grp.y = Math.min(...nodes.map(n => n.y)) - 40;
            grp.w = Math.max(...nodes.map(n => n.x)) - grp.x + 60;
            grp.h = Math.max(...nodes.map(n => n.y)) - grp.y + 40;
        }

        /** 分组选中 */
        function selectGroup(groupId) {
            selectedGroupId.value = groupId;
            // 选中分组内所有节点
            const grp = editorGroups[groupId];
            if (grp) {
                clearNodeSelection();
                for (const nid of grp.nodeIds) {
                    selectedNodeIds[nid] = true;
                }
            }
        }

        /** 右键菜单：将选中节点加入分组 */
        function contextAddToGroup(groupId) {
            for (const nid of Object.keys(selectedNodeIds)) {
                addNodeToGroup(groupId, nid);
            }
            closeContextMenu();
        }

        /** 右键菜单：从分组移除当前节点 */
        function contextRemoveFromGroup(groupId) {
            if (contextMenu.nodeId) {
                removeNodeFromGroup(groupId, contextMenu.nodeId);
            }
            closeContextMenu();
        }

        /** 获取节点所属的所有分组 */
        function getNodeGroups(nodeId) {
            return Object.entries(editorGroups)
                .filter(([_, grp]) => grp.nodeIds.includes(nodeId))
                .map(([gid, grp]) => ({ id: gid, ...grp }));
        }

        // 拖拽节点时同步更新分组矩形
        function updateGroupsForNode(nodeId) {
            for (const gid of Object.keys(editorGroups)) {
                const grp = editorGroups[gid];
                if (grp.nodeIds.includes(nodeId)) {
                    updateGroupBounds(gid);
                }
            }
        }

        // ── 批量编辑 ────────────────────────────────────────────────────
        const batchCommonProps = computed(() => {
            const ids = Object.keys(selectedNodeIds);
            if (ids.length < 2) return null;
            const styles = ids.map(id => nodeStyles[id] || {}).filter(Boolean);
            // 求交集属性
            const common = {};
            if (styles.every(s => s.color !== undefined && s.color === styles[0].color)) common.color = styles[0].color;
            if (styles.every(s => s.bgColor !== undefined && s.bgColor === styles[0].bgColor)) common.bgColor = styles[0].bgColor;
            if (styles.every(s => s.icon !== undefined && s.icon === styles[0].icon)) common.icon = styles[0].icon;
            return Object.keys(common).length > 0 ? common : null;
        });

        function applyBatchStyle(prop, value) {
            saveUndoSnapshot();
            for (const id of Object.keys(selectedNodeIds)) {
                if (!nodeStyles[id]) nodeStyles[id] = {};
                nodeStyles[id][prop] = value;
            }
        }

        // ── 重命名资源 ──────────────────────────────────────────────────
        function renameResource(type, oldId) {
            const meta = resourceMeta[type];
            if (!meta || !oldId) return;

            // 章节特殊处理（数据是步骤数组，不是属性对象）
            if (meta.isChapter) {
                const newId = (chapterRenameIds[oldId] || '').trim();
                if (!newId || newId === oldId) { showToast('请输入新的 ID'); return; }
                if (meta.data[newId]) { showToast(`ID "${newId}" 已存在！`); return; }
                // 迁移章节数据
                meta.data[newId] = meta.data[oldId];
                delete meta.data[oldId];
                // 迁移节点位置
                if (nodePositions[oldId]) {
                    nodePositions[newId] = nodePositions[oldId];
                    delete nodePositions[oldId];
                }
                // 迁移章节简介
                if (chapterDescriptions[oldId] !== undefined) {
                    chapterDescriptions[newId] = chapterDescriptions[oldId];
                    delete chapterDescriptions[oldId];
                }
                // 清理暂存的 rename ID
                delete chapterRenameIds[oldId];
                // 更新引用
                updateReferences(oldId, newId, 'chapters');
                selectedResourceId.value = newId;
                showToast(`章节 ID 已更新：${oldId} → ${newId}`);
                return;
            }

            const item = meta.isObject ? meta.data[oldId] : (meta.data || []).find(e => e.id === oldId);
            if (!item) return;
            const newId = (item._renameId || '').trim();
            if (!newId || newId === oldId) { showToast('请输入新的 ID'); return; }

            if (meta.isObject) {
                if (meta.data[newId]) { showToast(`ID "${newId}" 已存在！`); return; }
                meta.data[newId] = meta.data[oldId];
                delete meta.data[oldId];
                delete item._renameId;
            } else {
                const arr = meta.data;
                if (arr.some(e => e !== item && e.id === newId)) { showToast(`ID "${newId}" 已存在！`); return; }
                item.id = newId;
                delete item._renameId;
            }

            // 更新章节中的引用
            updateReferences(oldId, newId, type);

            selectedResourceId.value = newId;
            showToast(`ID 已更新：${oldId} → ${newId}`);
        }

        function updateReferences(oldId, newId, type) {
            for (const [cid, steps] of Object.entries(chapters)) {
                for (const step of steps) {
                    // 章节跳转引用
                    if (step.jumpChapter === oldId) step.jumpChapter = newId;
                    // 角色引用
                    if (type === 'characters' && step.characterId === oldId) step.characterId = newId;
                    // 分支中的引用
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                        }
                    }
                }
            }
        }

        // ── 全局右键菜单 ────────────────────────────────────────────────
        function onGlobalContextMenu(e) {
            globalContextMenu.show = true;
            globalContextMenu.x = e.clientX;
            globalContextMenu.y = e.clientY;
        }

        function closeGlobalContextMenu() {
            globalContextMenu.show = false;
            globalContextMenu.focusIndex = 0;
        }

        // ── 全局搜索 ────────────────────────────────────────────────────
        function startGlobalSearch() {
            editingGlobalSearch.value = true;
            globalSearchQuery.value = '';
            nextTick(() => {
                const el = document.querySelector('.global-search-input');
                if (el) el.focus();
            });
        }

        function endGlobalSearch() {
            editingGlobalSearch.value = false;
            globalSearchQuery.value = '';
        }

        const globalSearchResults = computed(() => {
            const q = globalSearchQuery.value.toLowerCase().trim();
            if (!q || q.length < 1) return [];
            const results = [];
            const add = (type, icon, label, id, action) => {
                if (label.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
                    results.push({ type, icon, label, id, action });
                }
            };
            for (const [cid, steps] of Object.entries(chapters)) add('章节', '📜', cid, cid, 'chapter');
            for (const [cid, ch] of Object.entries(gameCharacters)) add('角色', '👤', ch.name || cid, cid, 'character');
            for (const [sid, sc] of Object.entries(gameScenes)) add('场景', '🏞️', sc.title || sid, sid, 'scene');
            for (const [gid, cg] of Object.entries(gameCgLibrary)) add('CG', '🖼️', cg.title || gid, gid, 'cg');
            for (const [iid, item] of Object.entries(gameItems)) add('物品', '🎒', item.name || iid, iid, 'item');
            for (const end of gameEndings) add('结局', '🎬', end.title || end.id, end.id, 'ending');
            return results.slice(0, 20);
        });

        function navigateToSearchResult(result) {
            const typeMap = { character: 'characters', scene: 'scenes', cg: 'cg', item: 'items', ending: 'endings' };
            const type = typeMap[result.action];
            if (type) {
                showResourceManager.value = true;
                resourceTab.value = type;
                selectedResourceId.value = result.id;
            } else {
                selectedChapterId.value = result.id;
                editingStepIndex.value = null;
                const node = treeNodes.value.find(n => n.id === result.id);
                if (node) zoomToNode(node);
            }
            endGlobalSearch();
        }

        // ── 缩放控制 ────────────────────────────────────────────────────
        function applyZoomPercent() {
            if (zoomPercent.value >= 30 && zoomPercent.value <= 200) {
                viewScale.value = zoomPercent.value / 100;
            }
            showZoomInput.value = false;
        }

        // 同步 zoomPercent 到当前缩放
        watch(viewScale, (s) => { zoomPercent.value = Math.round(s * 100); });

        // 关闭文件菜单（点击其他地方）
        watch(showFileMenu, (v) => {
            if (v) setTimeout(() => document.addEventListener('click', () => { showFileMenu.value = false; }, { once: true }), 100);
        });

        // ── 自定义悬浮提示 ──────────────────────────────────────────────
        function onGlobalMouseOver(e) {
            const target = e.target.closest('[data-tooltip]') || e.target.closest('[title]');
            if (target) {
                const text = target.getAttribute('data-tooltip') || target.getAttribute('title');
                if (text) {
                    tooltip.show = true;
                    tooltip.text = text;
                    tooltip.x = e.clientX + 14;
                    tooltip.y = e.clientY - 8;
                }
            }
        }

        function onGlobalMouseOut(e) {
            tooltip.show = false;
        }

        // ── 面板拖拽调整宽度 ────────────────────────────────────────────
        function startPanelResize(e) {
            const startX = e.clientX;
            const startWidth = detailPanelWidth.value;
            const onMove = (ev) => {
                const dx = startX - ev.clientX;
                detailPanelWidth.value = Math.max(300, Math.min(900, startWidth + dx));
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        // ── 资源图片拖放 ────────────────────────────────────────────────
        function triggerResourceFile(target) {
            resourceImageTarget.value = target;
            const input = document.getElementById('resource-image-input');
            if (input) input.click();
        }

        function handleResourceImagePick(event) {
            const file = event.target.files?.[0];
            if (!file || !resourceImageTarget.value) return;
            const url = URL.createObjectURL(file);
            resourceImageTarget.value.url = url;
            // 存储文件名作为路径提示
            resourceImageTarget.value._fileName = file.name;
            // 存储 blob 以备导出
            if (!resourceImageTarget.value._blob) {
                resourceImageTarget.value._blob = file;
            }
            resourceImageTarget.value = null;
            event.target.value = '';
        }

        function onResourceDrop(event, target) {
            const file = event.dataTransfer.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            const url = URL.createObjectURL(file);
            target.url = url;
            target._fileName = file.name;
            target._blob = file;
        }

        function onSpriteDrop(event, sprite) {
            const file = event.dataTransfer.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            const url = URL.createObjectURL(file);
            sprite.url = url;
            sprite._fileName = file.name;
            sprite._blob = file;
        }

        // ── 特效管理器 ──────────────────────────────────────────────────
        function openEffectsManager() {
            showEffectsManager.value = true;
            selectedEffectId.value = null;
            stopEffectPreview();
        }

        function addCustomEffect() {
            const eid = uid('effect');
            customEffects[eid] = {
                name: '新特效', icon: '✨',
                // 特效类型：'builtin' | 'template' | 'custom'
                effectType: 'template',
                // 内置特效用
                type: 'stardust',
                // 模板特效用
                emoji: '✨',
                animation: 'fall',
                sizeMin: 12, sizeMax: 28,
                color: '',
                // 通用参数
                density: 30, speed: 50,
                // JS 特效用
                jsPath: '',
                cssPath: '',
            };
            selectedEffectId.value = eid;
        }

        function deleteCustomEffect(eid) {
            if (!confirm('确定删除此自定义特效吗？')) return;
            delete customEffects[eid];
            if (selectedEffectId.value === eid) selectedEffectId.value = null;
            stopEffectPreview();
        }

        function getEffectIcon(name) {
            const map = { rain: '🌧️', snow: '❄️', sakura: '🌸', fire: '🔥', stardust: '✨', bloodmoon: '🩸', corruption: '🌑' };
            return map[name] || '✨';
        }

        /** 保存 EffectsManager 实例（按需创建） */
        let _effectManager = null;
        function getEffectManager() {
            if (!_effectManager && effectPreviewRef.value) {
                _effectManager = new EffectsManager(effectPreviewRef.value);
            }
            return _effectManager;
        }

        function toggleEffectPreview(effectId) {
            if (effectPreviewActive.value) { stopEffectPreview(); return; }
            const el = effectPreviewRef.value;
            if (!el) return;
            el.innerHTML = '';
            effectPreviewActive.value = true;

            const cfg = customEffects[effectId];
            let config;
            if (!cfg) {
                // 内置特效
                config = { type: effectId, density: 30, speed: 50 };
            } else if (cfg.effectType === 'template') {
                // 模板 Emoji 特效
                config = {
                    type: 'template',
                    emoji: cfg.emoji || '✨',
                    animation: cfg.animation || 'fall',
                    density: cfg.density || 30,
                    speed: cfg.speed || 50,
                    sizeMin: cfg.sizeMin || 12,
                    sizeMax: cfg.sizeMax || 28,
                    color: cfg.color || '',
                };
            } else if (cfg.effectType === 'builtin') {
                // 内置特效引用
                config = { type: cfg.type || effectId, density: cfg.density || 30, speed: cfg.speed || 50 };
            } else {
                // JS 自定义特效
                config = { type: cfg.jsEffectId || effectId, density: cfg.density || 30 };
            }

            // 使用实际的 EffectsManager 播放特效
            const fx = getEffectManager();
            if (fx) {
                fx.container = el;
                fx.play(config);
            } else {
                // 降级：简单 DOM 模拟
                const spawn = () => {
                    if (!effectPreviewActive.value) return;
                    const p = document.createElement('div');
                    const emoji = getEffectIcon(config.type || effectId);
                    p.innerHTML = emoji;
                    p.style.cssText = `position:absolute;top:${Math.random()*80}%;left:${Math.random()*90}%;font-size:${Math.random()*20+10}px;opacity:0.7;pointer-events:none;transition:all 2s ease-out;`;
                    el.appendChild(p);
                    setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(1.5)'; }, 50);
                    setTimeout(() => p.remove(), 2000);
                };
                effectPreviewTimer = setInterval(spawn, 1000 / (config.density || 30));
            }
        }

        function stopEffectPreview() {
            effectPreviewActive.value = false;
            clearInterval(effectPreviewTimer);
            const fx = getEffectManager();
            if (fx) fx.clear(true); // 立即清理，预览容器需要立刻复用
            if (effectPreviewRef.value) effectPreviewRef.value.innerHTML = '<div class="effect-preview-bg"><span>预览已停止</span></div>';
        }

        // ── 资源包导出（含图片资源）──────────────────────────────────────
        async function exportPackZipWithAssets() {
            if (typeof JSZip === 'undefined') { showToast('JSZip 未加载'); return; }
            try {
                const itemAnimPresets = GameData.ITEM_ANIMATION_PRESETS || {};
                const packName = 'game-export';
                const files = {};
                const assetBlobs = []; // 收集图片 blob

                // 收集所有资源中的图片 URL
                const collectImages = (obj) => {
                    if (!obj) return;
                    const urls = new Set();
                    for (const item of Object.values(obj)) {
                        if (item.url) urls.add(item.url);
                        if (item.sprites) for (const sp of Object.values(item.sprites)) { if (sp.url) urls.add(sp.url); if (sp._blob) assetBlobs.push({ path: sp.url, blob: sp._blob, name: sp._fileName }); }
                        if (item.avatars) for (const av of Object.values(item.avatars)) { if (av) urls.add(av); }
                        // _blob 直接加入
                        if (item._blob && item._fileName) assetBlobs.push({ path: 'resource-packs/default/assets/' + item._fileName, blob: item._blob, name: item._fileName });
                    }
                    return urls;
                };

                // pack.json
                files['pack.json'] = JSON.stringify({
                    name: packName, title: gameConfig.title || '未命名', version: '1.0.0', author: '', description: '', format: '1.0.0',
                    configs: { game: 'config/game.json', home: 'config/home.json', characters: 'config/characters.json', scenes: 'config/scenes.json', cgLibrary: 'config/cg-library.json', items: 'config/items.json', endings: 'config/endings.json', effects: 'config/effects.json' },
                    chapters: Object.keys(chapters).reduce((acc, chId) => { acc[chId] = `chapters/${chId}.json`; return acc; }, {}),
                }, null, 2);

                // 合并入口信息到 game config
                const exportGameConfig = { ...gameConfig, entryPoints: Object.keys(entryPoints) };
                files['config/game.json'] = JSON.stringify(exportGameConfig, null, 2);
                files['config/home.json'] = JSON.stringify(GameData.HOME_CONFIG, null, 2);
                files['config/characters.json'] = JSON.stringify(gameCharacters, null, 2);
                files['config/scenes.json'] = JSON.stringify(gameScenes, null, 2);
                files['config/cg-library.json'] = JSON.stringify(gameCgLibrary, null, 2);
                files['config/items.json'] = JSON.stringify(gameItems, null, 2);
                files['config/endings.json'] = JSON.stringify(gameEndings, null, 2);
                files['config/effects.json'] = JSON.stringify(customEffects, null, 2);

                for (const [chId, steps] of Object.entries(chapters)) {
                    files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
                }

                const zip = new JSZip();
                const folder = zip.folder(packName);
                for (const [path, content] of Object.entries(files)) {
                    folder.file(path, content);
                }
                // 添加图片资源
                for (const asset of assetBlobs) {
                    if (asset.blob) {
                        const assetPath = (asset.path && !asset.path.startsWith('blob:'))
                            ? asset.path.replace(/^\/+/, '')
                            : 'resource-packs/default/assets/' + (asset.name || 'unknown');
                        folder.file(assetPath, asset.blob);
                    }
                }

                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${packName}.zip`; a.click();
                URL.revokeObjectURL(url);
                showToast('资源包已导出（含图片资源）！');
            } catch (e) { showToast('导出失败: ' + e.message); }
        }

        // ── 章节操作 ──────────────────────────────────────────────────
        function addChapter() {
            saveUndoSnapshot();
            const newId = uid('chapter');
            chapters[newId] = [{
                sceneId: '',
                type: 'dialogue',
                characterId: null,
                text: '新对话段落...',
                effects: [],
            }, {
                sceneId: '',
                type: 'jump',
                jumpChapter: '',
            }];

            // 放置在画布中央附近
            const panel = treePanel.value;
            const cx = panel ? -(panX.value / viewScale.value) + (panel.clientWidth / 2 / viewScale.value) : 400;
            const cy = panel ? -(panY.value / viewScale.value) + (panel.clientHeight / 2 / viewScale.value) : 300;
            nodePositions[newId] = { x: cx, y: cy };

            selectedChapterId.value = newId;
            editingStepIndex.value = 0;
            showToast(`已创建新章节：${newId}`);
        }

        /** 在画布上创建结局节点 */
        function addEndingNode() {
            saveUndoSnapshot();
            const newId = uid('end');
            const newEnding = { id: newId, title: '新结局', description: '' };
            gameEndings.push(newEnding);
            const panel = treePanel.value;
            const cx = panel ? -(panX.value / viewScale.value) + (panel.clientWidth / 2 / viewScale.value) : 400;
            const cy = panel ? -(panY.value / viewScale.value) + (panel.clientHeight / 2 / viewScale.value) : 300;
            nodePositions['_end_' + newId] = { x: cx, y: cy };
            const endNodeId = '_end_' + newId;
            selectedEndingId.value = endNodeId;
            showToast(`已创建结局节点：${newId}`);
        }

        /** 在指定世界坐标创建结局节点（右键菜单用） */
        function addEndingNodeAtPos(worldX, worldY) {
            saveUndoSnapshot();
            const newId = uid('end');
            const newEnding = { id: newId, title: '新结局', description: '' };
            gameEndings.push(newEnding);
            nodePositions['_end_' + newId] = { x: worldX, y: worldY };
            selectedEndingId.value = '_end_' + newId;
            showToast(`已创建结局节点：${newId}`);
        }

        function deleteChapter(batchIds) {
            // 批量删除
            if (batchIds && batchIds.length > 1) {
                const hasEnding = batchIds.some(id => getNodeType(id) === NODE_TYPE.ENDING);
                const typeLabel = hasEnding ? '节点' : '章节';
                if (!confirm(`确定要删除选中的 ${batchIds.length} 个${typeLabel}吗？\n\n其他章节中指向这些${typeLabel}的跳转不会被自动清理。`)) return;
                saveUndoSnapshot();
                for (const id of batchIds) {
                    if (isEndingNode(id)) {
                        deleteEndingNodeById(id, true);
                    } else {
                        delete chapters[id];
                        delete nodePositions[id];
                        delete nodeStyles[id];
                        delete chapterDescriptions[id];
                    }
                }
                clearSelection();
                showToast(`已批量删除 ${batchIds.length} 个${typeLabel}`);
                return;
            }

            // 单个删除 —— 区分节点类型
            const singleId = selectedEndingId.value || selectedChapterId.value;
            if (!singleId) return;

            if (isEndingNode(singleId)) {
                if (!confirm(`确定要删除结局 "${selectedEndingNode.value?.label || singleId}" 吗？\n\n此结局的相关数据将从游戏结束列表中移除。\n其他章节中指向此结局的跳转不会被自动清理。`)) return;
                saveUndoSnapshot();
                deleteEndingNodeById(singleId, true);
                selectedEndingId.value = null;
                editingStepIndex.value = null;
                showToast(`已删除结局：${singleId}`);
                return;
            }

            // 章节删除（原有逻辑）
            const id = singleId;
            if (chapters[id]?.some(s => s.locked)) {
                if (!confirm(`⚠ 章节 "${id}" 包含已锁定的步骤，确定删除吗？`)) return;
            }
            if (!confirm(`确定要删除章节 "${id}" 吗？\n\n此操作会删除该章节的所有步骤。\n其他章节中指向此章节的跳转不会被自动清理。`)) return;
            saveUndoSnapshot();
            delete chapters[id];
            delete nodePositions[id];
            delete nodeStyles[id];
            delete chapterDescriptions[id];
            selectedChapterId.value = null;
            editingStepIndex.value = null;
            showToast(`已删除章节：${id}`);
        }

        /** 按 ID 删除结局节点 */
        function deleteEndingNodeById(endNodeId, clearChapterRefs) {
            const endingId = endNodeId.startsWith('_end_') ? endNodeId.slice(5) : endNodeId;
            // 从 gameEndings 移除
            const idx = gameEndings.findIndex(e => e.id === endingId);
            if (idx > -1) gameEndings.splice(idx, 1);
            delete nodePositions[endNodeId];
            // 清理章节中对结局的引用（不限步骤类型，只要 endingId 匹配就清空）
            if (clearChapterRefs) {
                for (const [cid, steps] of Object.entries(chapters)) {
                    for (const step of steps) {
                        if (step.jumpChapter === endNodeId) step.jumpChapter = '';
                        if (step.endingId === endingId) step.endingId = '';
                        if (step.type === 'choice' && step.choices) {
                            for (const ch of step.choices) {
                                if (ch.jumpChapter === endNodeId) ch.jumpChapter = '';
                            }
                        }
                    }
                }
            }
        }

        function onChapterIdChange() {
            saveUndoSnapshot();
            const oldId = selectedChapterId.value;
            if (!oldId) return;
            const newId = editingChapterId.value;
            if (!newId || oldId === newId) return;

            if (chapters[newId]) {
                showToast(`章节 ID "${newId}" 已存在！`);
                return;
            }

            chapters[newId] = chapters[oldId];
            delete chapters[oldId];

            if (nodePositions[oldId]) {
                nodePositions[newId] = nodePositions[oldId];
                delete nodePositions[oldId];
            }

            // 更新所有章节中对旧 ID 的引用
            for (const [cid, steps] of Object.entries(chapters)) {
                for (const step of steps) {
                    if (step.jumpChapter === oldId) step.jumpChapter = newId;
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                        }
                    }
                }
            }

            selectedChapterId.value = newId;
            showToast(`章节 ID 已更新：${oldId} → ${newId}`);
        }

        // ── 步骤操作 ──────────────────────────────────────────────────
        function addStep() {
            saveUndoSnapshot();
            if (!selectedChapterId.value) return;
            const steps = chapters[selectedChapterId.value];
            // 如果末尾步骤已锁定，不可在其前插入
            const lastIdx = steps.length - 1;
            if (lastIdx >= 0 && isStepEditLocked(steps[lastIdx])) {
                showToast('⚠ 末尾步骤已锁定，无法添加新步骤');
                return;
            }
            const newStep = {
                sceneId: steps.length > 0 ? steps[steps.length - 1].sceneId : '',
                type: 'dialogue',
                characterId: null,
                text: '新对话...',
                effects: [],
            };
            // 在末尾 jump step 之前插入（保留章节末尾的 jump step）
            const insertIdx = steps.length > 0 && steps[steps.length - 1]?.type === 'jump'
                ? steps.length - 1 : steps.length;
            steps.splice(insertIdx, 0, newStep);
            editingStepIndex.value = insertIdx;
            showToast(`已添加步骤 #${insertIdx + 1}`);
        }

        /** 初始化 jump step 的 UI 模式（_jumpMode = 'chapter' | 'ending'） */
        function setDefaultJumpMode(step) {
            if (isStepEditLocked(step)) return;
            if (!step._jumpMode) {
                step._jumpMode = step.endingId ? 'ending' : 'chapter';
            }
        }

        function deleteStep(index) {
            saveUndoSnapshot();
            if (!selectedChapterId.value) return;
            const steps = chapters[selectedChapterId.value];
            if (isStepEditLocked(steps[index])) { showToast('⚠ 此步骤已锁定，无法删除'); return; }
            // 禁止删除末尾的 jump step（章节末端标记）
            if (index === steps.length - 1 && steps[index]?.type === 'jump') {
                showToast('⚠ 章节末尾的跳转步骤不可删除，用于标记章节末端');
                return;
            }
            if (!confirm(`确定删除步骤 #${index + 1} 吗？`)) return;
            steps.splice(index, 1);
            if (editingStepIndex.value === index) {
                editingStepIndex.value = null;
            } else if (editingStepIndex.value > index) {
                editingStepIndex.value--;
            }
            showToast(`已删除步骤 #${index + 1}`);
        }

        function moveStep(index, direction) {
            saveUndoSnapshot();
            if (!selectedChapterId.value) return;
            const steps = chapters[selectedChapterId.value];
            if (isStepEditLocked(steps[index])) { showToast('⚠ 此步骤已锁定，无法移动'); return; }
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= steps.length) return;
            if (isStepEditLocked(steps[newIndex])) { showToast('⚠ 目标位置步骤已锁定'); return; }

            const [moved] = steps.splice(index, 1);
            steps.splice(newIndex, 0, moved);

            if (editingStepIndex.value === index) {
                editingStepIndex.value = newIndex;
            } else if (editingStepIndex.value === newIndex) {
                editingStepIndex.value = index;
            }
        }

        // ── 分支选项操作 ──────────────────────────────────────────────
        function addChoice() {
            if (isStepEditLocked(editingStep.value)) { showToast('⚠ 此步骤已锁定'); return; }
            saveUndoSnapshot();
            if (!editingStep.value || editingStep.value.type !== 'choice') return;
            if (!editingStep.value.choices) editingStep.value.choices = [];
            editingStep.value.choices.push({
                text: '新选项...',
                jumpChapter: '',
                flag: '',
                gainItem: '',
            });
        }

        function removeChoice(index) {
            if (isStepEditLocked(editingStep.value)) { showToast('⚠ 此步骤已锁定'); return; }
            saveUndoSnapshot();
            if (!editingStep.value || !editingStep.value.choices) return;
            editingStep.value.choices.splice(index, 1);
        }

        // ── CG 变更 ───────────────────────────────────────────────────
        function onCGChange() {
            if (isStepEditLocked(editingStep.value)) return;
            if (!editingStep.value) return;
            const action = editingStep.value._cgAction;
            if (action === 'enter') {
                editingStep.value.cgChanges = {
                    action: 'enter',
                    id: editingStep.value._cgId || '',
                    animation: editingStep.value._cgAnimation || 'scaleIn',
                };
                if (editingStep.value._cgEffect) {
                    editingStep.value.cgChanges.effect = editingStep.value._cgEffect;
                }
            } else if (action === 'leave') {
                editingStep.value.cgChanges = {
                    action: 'leave',
                    animation: editingStep.value._cgAnimation || 'fadeOut',
                };
            } else {
                delete editingStep.value.cgChanges;
            }
        }

        function initCGForm(step) {
            if (!step._cgAction) {
                step._cgAction = step.cgChanges?.action || '';
                step._cgId = step.cgChanges?.id || '';
                step._cgAnimation = step.cgChanges?.animation || '';
                step._cgEffect = step.cgChanges?.effect || '';
            }
        }

        // ── 角色变更 ──────────────────────────────────────────────────
        function addCharChange() {
            if (isStepEditLocked(editingStep.value)) return;
            if (!editingStep.value) return;
            if (!editingStep.value._charChanges) editingStep.value._charChanges = [];
            editingStep.value._charChanges.push({ id: '', action: 'enter', spriteId: '', animation: '' });
            syncCharChangesToStep();
        }

        function removeCharChange(index) {
            if (isStepEditLocked(editingStep.value)) return;
            if (!editingStep.value?._charChanges) return;
            editingStep.value._charChanges.splice(index, 1);
            syncCharChangesToStep();
        }

        function syncCharChangesToStep() {
            if (isStepEditLocked(editingStep.value)) return;
            saveUndoSnapshot();
            if (!editingStep.value) return;
            const valid = (editingStep.value._charChanges || []).filter(cc => cc.id);
            if (valid.length > 0) {
                editingStep.value.characterChanges = valid.map(cc => ({
                    id: cc.id,
                    action: cc.action,
                    spriteId: cc.action !== 'leave' ? cc.spriteId : undefined,
                    animation: cc.animation || undefined,
                }));
            } else {
                delete editingStep.value.characterChanges;
            }
        }

        function onCharChangeField() {
            syncCharChangesToStep();
        }

        function initCharChanges(step) {
            if (!step._charChanges) {
                step._charChanges = clone(step.characterChanges || []);
            }
        }

        // ── 特效 ──────────────────────────────────────────────────────
        function toggleEffect(effect) {
            if (isStepEditLocked(editingStep.value)) return;
            if (!editingStep.value) return;
            if (!editingStep.value.effects) editingStep.value.effects = [];
            const idx = editingStep.value.effects.indexOf(effect);
            if (idx > -1) {
                editingStep.value.effects.splice(idx, 1);
            } else {
                editingStep.value.effects.push(effect);
            }
        }

        // ── 文本批处理 ──────────────────────────────────────────────
        function addBatchTextSegment() {
            const step = editingStep.value;
            if (!step || isStepEditLocked(step)) return;
            if (!step.texts) {
                step.texts = [step.text || ''];
            }
            step.texts.push('新段落...');
        }

        function removeBatchTextSegment(index) {
            const step = editingStep.value;
            if (!step || isStepEditLocked(step) || !step.texts) return;
            if (step.texts.length <= 1) return;
            step.texts.splice(index, 1);
            step.text = step.texts[0];
        }

        function disableBatchText() {
            const step = editingStep.value;
            if (!step || isStepEditLocked(step) || !step.texts) return;
            step.text = step.texts[0] || '';
            delete step.texts;
        }

        // ── 步骤锁定编辑 ──────────────────────────────────────────────
        function isStepEditLocked(step) {
            return step && step.locked === true;
        }

        function toggleStepLock(index) {
            // 资源管理器活跃时用 selectedResourceId，否则用 selectedChapterId
            const cid = (showResourceManager.value && resourceTab.value === 'chapters')
                ? selectedResourceId.value : selectedChapterId.value;
            if (!cid) return;
            const steps = chapters[cid];
            if (!steps || index < 0 || index >= steps.length) return;
            const step = steps[index];
            if (step.locked) {
                delete step.locked;
                showToast(`步骤 #${index + 1} 已解锁`);
            } else {
                step.locked = true;
                showToast(`步骤 #${index + 1} 已锁定`);
            }
        }

        // ── 辅助 ──────────────────────────────────────────────────────
        function getCharName(charId) {
            return gameCharacters[charId]?.name || charId;
        }

        function getCharSprites(charId) {
            if (!charId || !gameCharacters[charId]) return {};
            return gameCharacters[charId].sprites || {};
        }

        function stepTextBrief(step) {
            if (!step) return '';
            if (step.type === 'choice') return `[分支] ${(step.text || '').substring(0, 40)}...`;
            if (step.type === 'ending') return `[结局触发] → ${step.endingId || '(未选择结局)'}`;
            if (step.type === 'jump') {
                if (step.endingId) return `[结局触发] → ${step.endingId}`;
                return `[跳转] → ${step.jumpChapter || '(无目标)'}`;
            }
            const previewText = step.texts && step.texts.length
                ? step.texts[0]
                : (step.text || '');
            return previewText.substring(0, 50) + (previewText.length > 50 ? ' ' : '');
        }

        function stepTypeLabel(type, step) {
            if (type === 'ending' || (type === 'jump' && step?.endingId)) return '结局触发';
            const map = { dialogue: '对话', choice: '分支', jump: '跳转' };
            return map[type] || type || '对话';
        }

        // ── 导出 ──────────────────────────────────────────────────────
        function exportAll() {
            exportModalTitle.value = '导出 JS 模块代码';
            const lines = [];
            lines.push('/**');
            lines.push(' * 由剧情树节点编辑器生成的章节数据');
            lines.push(` * 导出时间：${new Date().toISOString()}`);
            lines.push(' * 总计章节：' + totalChapters.value + ' / 步骤：' + totalSteps.value);
            lines.push(' */');
            lines.push('');

            for (const [cid, steps] of Object.entries(chapters)) {
                const varName = 'chapter_' + cid.replace(/-/g, '_');
                lines.push(`export const ${varName} = ${formatJS(steps, 0)};`);
                lines.push('');
            }

            // 生成汇总对象
            lines.push('export const STORY_CHAPTERS = {');
            for (const cid of Object.keys(chapters)) {
                const varName = 'chapter_' + cid.replace(/-/g, '_');
                lines.push(`    '${cid}': ${varName},`);
            }
            lines.push('};');

            // 入口节点信息
            lines.push('export const ENTRY_POINTS = ' + JSON.stringify(Object.keys(entryPoints)) + ';');
            lines.push('');

            // 章节简介
            lines.push('export const CHAPTER_DESCRIPTIONS = ' + JSON.stringify(chapterDescriptions, null, 2) + ';');
            lines.push('');

            exportContent.value = lines.join('\n');
            showExportModal.value = true;
        }

        function exportJSON() {
            exportModalTitle.value = '导出 JSON';
            const data = {
                chapters: JSON.parse(JSON.stringify(chapters)),
                entryPoints: Object.keys(entryPoints),
                chapterDescriptions: JSON.parse(JSON.stringify(chapterDescriptions)),
            };
            exportContent.value = JSON.stringify(data, null, 2);
            showExportModal.value = true;
        }

        function formatJS(obj, indent) {
            const pad = '    '.repeat(indent);
            const pad1 = '    '.repeat(indent + 1);

            if (obj === null || obj === undefined) return 'null';
            if (typeof obj === 'boolean') return obj.toString();
            if (typeof obj === 'number') return obj.toString();
            if (typeof obj === 'string') return JSON.stringify(obj);

            if (Array.isArray(obj)) {
                if (obj.length === 0) return '[]';
                // 简单数组单行
                if (obj.every(e => typeof e === 'string' && e.length < 30)) {
                    return '[' + obj.map(e => JSON.stringify(e)).join(', ') + ']';
                }
                const items = obj.map((item, i) => {
                    const comma = i < obj.length - 1 ? ',' : '';
                    return pad1 + formatJS(item, indent + 1) + comma;
                });
                return '[\n' + items.join('\n') + '\n' + pad + ']';
            }

            if (typeof obj === 'object') {
                const keys = Object.keys(obj);
                if (keys.length === 0) return '{}';
                // 过滤掉临时属性
                const realKeys = keys.filter(k => !k.startsWith('_'));
                if (realKeys.length === 0) return '{}';

                const pairs = realKeys.map((k, i) => {
                    const comma = i < realKeys.length - 1 ? ',' : '';
                    const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
                    return pad1 + keyStr + ': ' + formatJS(obj[k], indent + 1) + comma;
                });
                return '{\n' + pairs.join('\n') + '\n' + pad + '}';
            }

            return JSON.stringify(obj);
        }

        function copyExport() {
            navigator.clipboard.writeText(exportContent.value).then(() => {
                showToast('已复制到剪贴板！');
            }).catch(() => {
                showToast('复制失败，请手动选择并复制', 'info');
            });
        }

        function downloadExport() {
            const ext = exportModalTitle.value.includes('JSON') ? 'json' : 'js';
            const blob = new Blob([exportContent.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chapters-export.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('文件下载已开始');
        }

        function resetAll() {
            if (!confirm('确定要还原所有数据为原始版本吗？\n包括章节、角色、场景、CG、物品、结局在内的所有修改将丢失！')) return;

            // 还原章节
            const origCh = clone(originalChapters);
            for (const key of Object.keys(chapters)) delete chapters[key];
            for (const [key, val] of Object.entries(origCh)) chapters[key] = val;

            // 还原资源
            const origSc = clone(originalScenes);
            for (const key of Object.keys(gameScenes)) delete gameScenes[key];
            for (const [key, val] of Object.entries(origSc)) gameScenes[key] = val;

            const origChr = clone(originalCharacters);
            for (const key of Object.keys(gameCharacters)) delete gameCharacters[key];
            for (const [key, val] of Object.entries(origChr)) gameCharacters[key] = val;

            const origCg = clone(originalCgLibrary);
            for (const key of Object.keys(gameCgLibrary)) delete gameCgLibrary[key];
            for (const [key, val] of Object.entries(origCg)) gameCgLibrary[key] = val;

            const origIt = clone(originalItems);
            for (const key of Object.keys(gameItems)) delete gameItems[key];
            for (const [key, val] of Object.entries(origIt)) gameItems[key] = val;

            const origEnd = clone(originalEndings);
            gameEndings.splice(0, gameEndings.length, ...origEnd);

            const origCfg = clone(originalConfig);
            for (const key of Object.keys(gameConfig)) delete gameConfig[key];
            for (const [key, val] of Object.entries(origCfg)) gameConfig[key] = val;

            selectedChapterId.value = null;
            selectedEndingId.value = null;
            editingStepIndex.value = null;
            // 还原章节简介
            for (const key of Object.keys(chapterDescriptions)) delete chapterDescriptions[key];
            for (const [key, val] of Object.entries(GameData.CHAPTER_DESCRIPTIONS || {})) chapterDescriptions[key] = val;
            autoLayout();
            showToast('已还原所有数据为原始版本');
        }

        // ── 资源包导出/导入 ──────────────────────────────────────────

        /** 导出为资源包 ZIP 并下载 */
        async function exportPackZip() {
            // 从 GameData 读取 ITEM_ANIMATION_PRESETS（items.js 的函数不可导出故仅导出数据）
            const itemAnimPresets = GameData.ITEM_ANIMATION_PRESETS || {};

            // 构建包数据
            const packName = 'game-export';
            const files = {};

            // pack.json
            files['pack.json'] = JSON.stringify({
                name: packName,
                title: gameConfig.title || '未命名故事',
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
                chapters: Object.keys(chapters).reduce((acc, chId) => {
                    acc[chId] = `chapters/${chId}.json`;
                    return acc;
                }, {}),
            }, null, 2);

            // 配置文件（含入口信息）
            const exportGameConfig = { ...gameConfig, entryPoints: Object.keys(entryPoints) };
            files['config/game.json'] = JSON.stringify(exportGameConfig, null, 2);
            files['config/home.json'] = JSON.stringify(GameData.HOME_CONFIG, null, 2);
            files['config/characters.json'] = JSON.stringify(gameCharacters, null, 2);
            files['config/scenes.json'] = JSON.stringify(gameScenes, null, 2);
            files['config/cg-library.json'] = JSON.stringify(gameCgLibrary, null, 2);
            // items: 合并 ITEMS 与 ITEM_ANIMATION_PRESETS
            files['config/items.json'] = JSON.stringify(gameItems, null, 2);
            if (Object.keys(itemAnimPresets).length > 0) {
                files['config/item-animation-presets.json'] = JSON.stringify(itemAnimPresets, null, 2);
            }
            files['config/endings.json'] = JSON.stringify(gameEndings, null, 2);

            // 章节文件
            for (const [chId, steps] of Object.entries(chapters)) {
                files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
            }

            // 使用 JSZip 打包
            if (typeof JSZip === 'undefined') {
                showToast('JSZip 未加载，无法导出资源包 ZIP。请检查网络连接。');
                return;
            }

            try {
                const zip = new JSZip();
                const folder = zip.folder(packName);
                for (const [path, content] of Object.entries(files)) {
                    folder.file(path, content);
                }
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${packName}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('资源包 ZIP 已下载！');
            } catch (e) {
                showToast(`资源包导出失败: ${e.message}`);
            }
        }

        /** 触发文件选择器导入资源包 */
        function triggerImportPack() {
            const input = document.getElementById('pack-import-input');
            if (input) input.click();
        }

        /** 处理资源包 ZIP 导入 */
        async function handlePackImport(event) {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.name.endsWith('.zip')) {
                showToast('请选择 .zip 格式的资源包文件');
                return;
            }

            if (typeof JSZip === 'undefined') {
                showToast('JSZip 未加载，无法导入资源包。请检查网络连接。');
                return;
            }

            try {
                const zip = await JSZip.loadAsync(file);

                // 1. 加载 pack.json
                const manifestFile = zip.file(/^(.*\/)?pack\.json$/)[0];
                if (!manifestFile) {
                    showToast('ZIP 中未找到 pack.json 清单文件');
                    return;
                }
                const manifestText = await manifestFile.async('string');
                const manifest = JSON.parse(manifestText);

                // 验证清单
                const manifestErrors = validatePackStructure(manifest);
                if (manifestErrors.length > 0) {
                    showToast(`资源包清单验证失败: ${manifestErrors[0]}`);
                    console.warn('Pack validation errors:', manifestErrors);
                    return;
                }

                // 提取根前缀
                const allFiles = Object.keys(zip.files).filter(f => !f.endsWith('/'));
                let rootPrefix = '';
                if (!allFiles.some(f => f === 'pack.json')) {
                    for (const f of allFiles) {
                        if (f.endsWith('/pack.json')) {
                            rootPrefix = f.replace(/\/pack\.json$/, '');
                            break;
                        }
                    }
                }

                const resolve = (path) => rootPrefix ? `${rootPrefix}/${path}` : path;

                // 2. 加载配置（合并到编辑器只读数据）
                // 注意：编辑器中的配置是只读的（来自 GameData），
                // 导入的配置仅用于验证。章节数据会完全替换。
                const importedChapters = {};
                let importCount = 0;

                // 3. 加载章节
                if (manifest.chapters) {
                    for (const [chId, filePath] of Object.entries(manifest.chapters)) {
                        const fullPath = resolve(filePath);
                        const file = zip.file(fullPath);
                        if (file) {
                            const text = await file.async('string');
                            importedChapters[chId] = JSON.parse(text);
                            importCount++;
                        }
                    }
                }

                if (importCount === 0) {
                    showToast('资源包中未找到任何章节数据');
                    return;
                }

                // 4. 验证导入数据的完整性
                const tmpData = {
                    GAME_CONFIG: gameConfig,
                    HOME_CONFIG: GameData.HOME_CONFIG,
                    CHARACTERS: gameCharacters,
                    SCENES: gameScenes,
                    CG_LIBRARY: gameCgLibrary,
                    ITEMS: gameItems,
                    ENDINGS: gameEndings,
                    STORY_CHAPTERS: importedChapters,
                };
                const dataWarnings = validatePackData(tmpData);
                if (dataWarnings.length > 0) {
                    console.warn('Imported pack data warnings:', dataWarnings);
                    // 非致命警告，继续导入
                }

                // 5. 替换编辑器中的章节数据
                if (!confirm(
                    `即将从资源包导入 ${importCount} 个章节。\n\n` +
                    `资源包: ${manifest.title || manifest.name}\n` +
                    `版本: ${manifest.version || '未知'}\n\n` +
                    `⚠ 当前编辑器中的所有章节修改将被覆盖！\n` +
                    `确定继续吗？`
                )) {
                    // 清空 file input
                    event.target.value = '';
                    return;
                }

                // 清除现有章节
                for (const key of Object.keys(chapters)) delete chapters[key];
                // 导入新章节
                for (const [key, val] of Object.entries(importedChapters)) {
                    chapters[key] = val;
                }

                selectedChapterId.value = null;
                selectedEndingId.value = null;
                editingStepIndex.value = null;
                autoLayout();
                showToast(`已成功导入资源包 "${manifest.title || manifest.name}"：${importCount} 个章节`);
            } catch (e) {
                showToast(`资源包导入失败: ${e.message}`);
                console.error('Pack import error:', e);
            }

            // 清空 file input 以便重复导入同一文件
            event.target.value = '';
        }

        // ── 键盘快捷键 ──────────────────────────────────────────────────

        /** 检查当前焦点是否在输入框等可编辑元素中 */
        function isInputFocused() {
            const tag = document.activeElement?.tagName || '';
            const editable = document.activeElement?.getAttribute('contenteditable');
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
        }

        /** 全局按键处理 */
        function onGlobalKeyDown(e) {
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const key = e.key;

            // ── 在输入框中依然生效的快捷键 ──
            if (key === 'Escape') {
                if (contextMenu.show) { closeContextMenu(); e.preventDefault(); return; }
                if (globalContextMenu.show) { closeGlobalContextMenu(); e.preventDefault(); return; }
                if (showGameSettings.value) { showGameSettings.value = false; e.preventDefault(); return; }
                if (showResourceManager.value) { showResourceManager.value = false; e.preventDefault(); return; }
                if (showExportModal.value) { showExportModal.value = false; e.preventDefault(); return; }
                if (showEffectsManager.value) { showEffectsManager.value = false; e.preventDefault(); return; }
                if (showFileMenu.value) { showFileMenu.value = false; e.preventDefault(); return; }
                if (editingGlobalSearch.value) { endGlobalSearch(); e.preventDefault(); return; }
                if (showZoomInput.value) { showZoomInput.value = false; e.preventDefault(); return; }
                if (selectedChapterId.value || selectedEndingId.value || selectedEdge.value || selectedGroupId.value) {
                    clearSelection();
                    e.preventDefault();
                }
                return;
            }

            // ── 右键菜单键盘导航 ──
            if (contextMenu.show) {
                e.preventDefault();
                const items = document.querySelectorAll('.tree-context-menu .context-menu-item');
                if (key === 'ArrowDown') {
                    contextMenuFocusIndex.value = Math.min(contextMenuFocusIndex.value + 1, items.length - 1);
                    items[contextMenuFocusIndex.value]?.focus();
                } else if (key === 'ArrowUp') {
                    contextMenuFocusIndex.value = Math.max(contextMenuFocusIndex.value - 1, 0);
                    items[contextMenuFocusIndex.value]?.focus();
                } else if (key === 'Enter' || key === ' ') {
                    if (contextMenuFocusIndex.value >= 0 && items[contextMenuFocusIndex.value]) {
                        items[contextMenuFocusIndex.value].click();
                    }
                }
                return;
            }
            if (globalContextMenu.show) {
                e.preventDefault();
                const items = document.querySelectorAll('.global-context-menu .context-menu-item');
                const gIdx = globalContextMenu.focusIndex || 0;
                if (key === 'ArrowDown') {
                    globalContextMenu.focusIndex = Math.min(gIdx + 1, items.length - 1);
                    items[globalContextMenu.focusIndex]?.focus();
                } else if (key === 'ArrowUp') {
                    globalContextMenu.focusIndex = Math.max(gIdx - 1, 0);
                    items[globalContextMenu.focusIndex]?.focus();
                } else if (key === 'Enter' || key === ' ') {
                    if (items[gIdx]) items[gIdx].click();
                }
                return;
            }

            // ── 以下快捷键在输入框中不生效 ──
            if (isInputFocused()) return;

            // Ctrl+N: 新建章节 / Ctrl+Shift+N: 新建结局节点
            if (ctrl && key === 'n') {
                e.preventDefault();
                if (shift) {
                    addEndingNode();
                } else {
                    addChapter();
                }
                return;
            }

            // Ctrl+S: 同步到游戏
            if (ctrl && !shift && key === 's') {
                e.preventDefault();
                syncToGame();
                return;
            }

            // Ctrl+F: 全局搜索
            if (ctrl && !shift && key === 'f') {
                e.preventDefault();
                startGlobalSearch();
                return;
            }

            // Ctrl+D: 复制选中章节
            if (ctrl && !shift && key === 'd') {
                e.preventDefault();
                if (selectedChapterId.value) {
                    contextMenu.nodeId = selectedChapterId.value;
                    contextDuplicateChapter();
                } else {
                    showToast('请先选中一个章节');
                }
                return;
            }

            // Delete / Backspace: 删除选中的连线或节点
            if (key === 'Delete' || key === 'Backspace') {
                // 优先删除选中的连线
                if (selectedEdge.value) {
                    e.preventDefault();
                    const edge = selectedEdge.value;
                    // 找到对应步骤并清除跳转目标
                    const fromNode = treeNodes.value.find(n => n.id === edge.from);
                    if (fromNode) {
                        const bp = (fromNode.bottomPorts || []).find(p => p.targetId === edge.to);
                        if (bp) {
                            const steps = chapters[edge.from];
                            if (steps) {
                                const step = steps[bp.stepIdx];
                                if (step) {
                                    if (bp.choiceIdx !== undefined && step.choices) {
                                        step.choices[bp.choiceIdx].jumpChapter = '';
                                    } else if (step.endingId) {
                                        step.endingId = '';
                                    } else {
                                        step.jumpChapter = '';
                                    }
                                    bp.targetId = '';
                                    bp.hasTarget = false;
                                    showToast(`已删除连线: ${edge.from} → ${edge.to}`);
                                }
                            }
                        }
                    }
                    selectedEdge.value = null;
                    return;
                }
                const multiIds = Object.keys(selectedNodeIds);
                if (multiIds.length > 1) {
                    e.preventDefault();
                    deleteChapter(multiIds);
                } else if (selectedChapterId.value || selectedEndingId.value) {
                    e.preventDefault();
                    deleteChapter();
                }
                return;
            }

            // Home: 跳转到第一个/根节点
            if (key === 'Home') {
                e.preventDefault();
                const nodes = treeNodes.value;
                if (nodes.length === 0) return;
                // 找 'main' 入口节点，找不到则取第一个
                const target = nodes.find(n => n.id === 'main') || nodes[0];
                selectNode(target.id);
                zoomToNode(target);
                return;
            }

            // End: 跳转到最后一个节点
            if (key === 'End') {
                e.preventDefault();
                const nodes = treeNodes.value;
                if (nodes.length === 0) return;
                const target = nodes[nodes.length - 1];
                selectNode(target.id);
                zoomToNode(target);
                return;
            }

            // + / =: 放大
            if (key === '=' || key === '+') {
                e.preventDefault();
                zoomIn();
                return;
            }

            // - / _: 缩小
            if (key === '-' || key === '_') {
                e.preventDefault();
                zoomOut();
                return;
            }

            // Ctrl+A: 全选节点
            if (ctrl && !shift && key === 'a') {
                e.preventDefault();
                treeNodes.value.forEach(n => { selectedNodeIds[n.id] = true; });
                showToast(`已选中 ${Object.keys(selectedNodeIds).length} 个节点`);
                return;
            }

            // Ctrl+E: 导出 JSON
            if (ctrl && !shift && key === 'e') {
                e.preventDefault();
                exportJSON();
                return;
            }

            // Ctrl+Shift+E: 导出 JS
            if (ctrl && shift && key === 'e') {
                e.preventDefault();
                exportAll();
                return;
            }

            // Ctrl+Z: 撤销
            if (ctrl && !shift && key === 'z') {
                e.preventDefault();
                undo();
                return;
            }

            // Ctrl+Shift+Z / Ctrl+Y: 重做
            if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
                e.preventDefault();
                redo();
                return;
            }

            // 0: 重置缩放
            if (key === '0' && ctrl) {
                e.preventDefault();
                resetView();
                return;
            }

            // 方向键：在选中节点间跳转（找相邻节点）
            if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
                if (!selectedChapterId.value) {
                    // 没有选中节点 → 选中第一个节点
                    const nodes = treeNodes.value;
                    if (nodes.length > 0) {
                        selectNode(nodes[0].id);
                        zoomToNode(nodes[0]);
                    }
                    e.preventDefault();
                    return;
                }
                // 找当前节点在 treeNodes 中的位置
                const nodes = treeNodes.value;
                // ── 步骤列表导航（当 detail 面板聚焦时用方向键切换步骤） ──
                if (selectedChapterId.value && editingSteps?.length > 0) {
                    const activeEl = document.activeElement;
                    if (activeEl?.closest('.step-detail-panel, .step-list')) {
                        e.preventDefault();
                        if (key === 'ArrowDown' || key === 'ArrowRight') {
                            const next = Math.min(editingStepIndex.value + 1, editingSteps.length - 1);
                            if (next !== editingStepIndex.value) selectStep(next);
                        } else {
                            const prev = Math.max(editingStepIndex.value - 1, 0);
                            if (prev !== editingStepIndex.value) selectStep(prev);
                        }
                        return;
                    }
                }
                const idx = nodes.findIndex(n => n.id === selectedChapterId.value);
                if (idx === -1) return;
                let targetIdx = idx;
                if (key === 'ArrowDown') targetIdx = Math.min(idx + 1, nodes.length - 1);
                else if (key === 'ArrowUp') targetIdx = Math.max(idx - 1, 0);
                else if (key === 'ArrowRight') targetIdx = Math.min(idx + 1, nodes.length - 1);
                else if (key === 'ArrowLeft') targetIdx = Math.max(idx - 1, 0);
                if (targetIdx !== idx) {
                    e.preventDefault();
                    selectNode(nodes[targetIdx].id);
                    zoomToNode(nodes[targetIdx]);
                }
                return;
            }
        }

        /** 全局禁止文本选中（输入框等可编辑元素不受影响） */
        function onGlobalSelectStart(e) {
            if (!isInputFocused()) {
                e.preventDefault();
            }
        }

        /** 全局禁止图片拖拽 */
        function onGlobalDragStart(e) {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        }

        // ── 返回模板 ──────────────────────────────────────────────────
        return {
            // 数据
            gameScenes, gameCharacters, gameCgLibrary, gameItems, gameEndings, gameConfig,
            chapters, originalChapters,
            chapterDescriptions,
            // 状态
            selectedChapterId, selectedEndingId, selectedEdge, editingStepIndex, hoveredNodeId,
            treePanel, viewScale, panX, panY, nodePositions,
            dragging, panning, selection, selectedNodeIds,
            contextMenu, showGameSettings, editableGameConfig, editableHomeConfig,
            showResourceManager, resourceTab, selectedResourceId,
            resourceMeta, resourceList, selectedResource, chapterRenameIds,
            resEditStepIndex, resEditStep,
            resEditAddStep, resEditDeleteStep, resEditMoveStep,
            resEditAddChoice, resEditRemoveChoice,
            resEditOnCGChange, resEditAddCharChange, resEditRemoveCharChange,
            resEditSyncCharChanges, resEditOnCharChangeField,
            resEditAddBatchTextSegment, resEditRemoveBatchTextSegment, resEditDisableBatchText,
            resEditToggleEffect, resEditSetDefaultJumpMode,
            resStepDrag, isStepLocked, resStepDragStart, resStepDragOver, resStepDrop, resStepDragEnd,
            detailStepDrag, detailStepDragStart, detailStepDragOver, detailStepDrop, detailStepDragEnd,
            editingGlobalSearch, globalSearchQuery, globalSearchInput,
            globalSearchResults, globalContextMenu,
            showZoomInput, zoomPercent,
            detailPanelCollapsed, detailPanelWidth,
            showFileMenu, tooltip, selectedSpriteId, showAvatarSection,
            showEffectsManager, customEffects, selectedEffectId,
            effectPreviewRef, effectPreviewActive, builtinEffects,
            nodeStyles, editorGroups, canvasComments,
            portDragging, portDragCurve, resizingNode,
            batchEditMode, batchCommonProps, applyBatchStyle,
            maxPortsPerNode,
            toastMsg, showExportModal, exportContent, exportModalTitle,
            // 派生
            treeNodes, treeEdges, worldStyle, selectionBoxStyle,
            editingChapterId, editingSteps, editingStep,
            chapterOutgoing, chapterIncomingCount,
            selectedEndingPreview,
            selectedEndingNode, selectedEndingData, endingIncomingChapters,
            totalChapters, totalSteps, totalChoices,
            ENGINE_VERSION, EDITOR_VERSION, STORY_VERSION,
            availableEffects,
            // 方法
            showToast, undo, redo, undoCount, redoCount, autoLayout, zoomIn, zoomOut, resetView,
            handleWheel, zoomToNode,
            onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp,
            onNodeMouseDown,
            selectNode, selectStep, selectObject, getSelection, clearSelection, locateTo,
            addChapter, addEndingNode, addEndingNodeAtPos, deleteChapter, onChapterIdChange,
            addStep, setDefaultJumpMode, deleteStep, moveStep,
            addChoice, removeChoice,
            onCGChange, initCGForm, addCharChange, removeCharChange, onCharChangeField, syncCharChangesToStep,
            toggleEffect,
            addBatchTextSegment, removeBatchTextSegment, disableBatchText,
            getCharName, getCharSprites, stepTextBrief, stepTypeLabel,
            isStepEditLocked, toggleStepLock,
            exportAll, exportJSON, formatJS, copyExport, downloadExport, resetAll,
            exportPackZip, triggerImportPack, handlePackImport,
            // 右键菜单
            onCanvasContextMenu, onNodeContextMenu, onGroupContextMenu, closeContextMenu,
            contextZoomToNode, contextCopyId, contextDeleteChapter,
            contextDuplicateChapter, contextEditEnding, addChapterAtPos, addStepFromContext,
            // 游戏设置
            openGameSettings, saveGameSettings,
            // 资源管理
            openResourceManager, selectResource, addResource, deleteResource,
            addSprite, addAvatar, renameResource,
            startPortDrag, jumpToPortTarget, updatePortTarget,
            startNodeResize, onEdgeClick, onEdgeMouseDown, onEdgeHandleMouseDown, findSnapTarget,
            selectedGroupId, selectGroup, addNodeToGroup, removeNodeFromGroup,
            createGroupFromSelection, deleteGroup, renameGroup, getNodeGroups, contextAddToGroup, contextRemoveFromGroup,
            entryPoints, toggleEntryPoint, isEntryPoint, getNodeType, isEndingNode,
            // 全局
            onGlobalContextMenu, closeGlobalContextMenu,
            startGlobalSearch, endGlobalSearch, navigateToSearchResult,
            applyZoomPercent,
            onGlobalMouseOver, onGlobalMouseOut, startPanelResize,
            // ── 编辑器焦点管理（基于 Vue 自然顺序） ──
            stepListFocusIndex, contextMenuFocusIndex, updateContextMenuFocus,
            triggerResourceFile, handleResourceImagePick,
            onResourceDrop, onSpriteDrop,
            openEffectsManager, addCustomEffect, deleteCustomEffect,
            getEffectIcon, toggleEffectPreview, stopEffectPreview,
            exportPackZipWithAssets,
            // 同步 & 校验
            syncToGame, previewStory,
            editorPathResolver, validateEditorResources,
        };
    }
}).mount('#editor-app');

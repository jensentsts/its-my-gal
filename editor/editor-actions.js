/**
 * editor/editor-actions.js
 *
 * Vue 3 组合式 —— 业务操作方法
 * 包括：章节/步骤 CRUD、导出/导入、资源管理、特效管理、分组等
 */
// Vue APIs from global (Vue loaded via CDN <script> tag)
const { nextTick } = Vue;
import { clone, uid, formatJS } from './utils.js';
import { computeLayout, computeEndingLayout } from './tree-layout.js';

/**
 * @param {Object} s - useEditorState() 返回的状态引用
 * @param {Object} c - useEditorComputed(s) 返回的计算属性
 * @param {Object} deps - 外部依赖 { GameData, ResourceManager, validatePackStructure, validatePackData, EffectsManager }
 * @returns {Object} 所有操作方法
 */
export function useEditorActions(s, c, deps) {
    const { GameData, validatePackStructure, validatePackData, EffectsManager } = deps;
    let toastTimer = null;

    // ── Toast ─────────────────────────────────────────────────
    function showToast(msg) {
        s.toastMsg.value = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { s.toastMsg.value = ''; }, 2500);
    }

    // ── 入口节点 ─────────────────────────────────────────────
    function setEntryPoint(nodeId) {
        const wasActive = s.entryPoints[nodeId];
        // 清空所有入口
        for (const key of Object.keys(s.entryPoints)) {
            delete s.entryPoints[key];
        }
        if (!wasActive) {
            s.entryPoints[nodeId] = true;
            showToast(`已设为入口: ${nodeId}`);
        } else {
            showToast('至少需要一个入口节点');
            // 恢复第一个节点为入口
            const first = Object.keys(s.chapters)[0];
            if (first) s.entryPoints[first] = true;
        }
    }

    // ── 布局 ──────────────────────────────────────────────────
    function autoLayout() {
        const chapterPositions = computeLayout(s.chapters, s.nodeStyles);
        for (const [id, pos] of Object.entries(chapterPositions)) {
            s.nodePositions[id] = pos;
        }
        const endingPositions = computeEndingLayout(s.chapters, s.gameEndings, chapterPositions, s.nodeStyles);
        for (const [id, pos] of Object.entries(endingPositions)) {
            s.nodePositions[id] = pos;
        }
        showToast('已自动排列节点布局');
    }

    // ── 缩放平移 ──────────────────────────────────────────────
    function zoomIn() {
        s.viewScale.value = Math.min(2.0, s.viewScale.value + 0.1);
    }
    function zoomOut() {
        s.viewScale.value = Math.max(0.3, s.viewScale.value - 0.1);
    }
    function resetView() {
        const panel = s.treePanel.value;
        const nodes = c.treeNodes.value;
        if (!panel || nodes.length === 0) {
            s.viewScale.value = 1.0;
            s.panX.value = 0;
            s.panY.value = 0;
            return;
        }
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
        s.viewScale.value = 1.0;
        s.panX.value = rect.width / 2 - contentCenterX;
        s.panY.value = rect.height / 2 - contentCenterY;
    }

    function handleWheel(e) {
        const oldScale = s.viewScale.value;
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.3, Math.min(2.0, oldScale + delta));
        const rect = s.treePanel.value.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - s.panX.value) / oldScale;
        const worldY = (mouseY - s.panY.value) / oldScale;
        s.panX.value = mouseX - worldX * newScale;
        s.panY.value = mouseY - worldY * newScale;
        s.viewScale.value = newScale;
    }

    function zoomToNode(node) {
        const panel = s.treePanel.value;
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        s.panX.value = centerX - node.x * s.viewScale.value;
        s.panY.value = centerY - node.y * s.viewScale.value;
        selectNode(node.id);
        s.editingStepIndex.value = null;
    }

    // ── 选择 ──────────────────────────────────────────────────
    function selectNode(nodeId) {
        const type = s.getNodeType(nodeId);
        if (type === s.NODE_TYPE.ENDING) {
            s.selectedEndingId.value = nodeId;
            s.selectedChapterId.value = null;
        } else {
            s.selectedChapterId.value = nodeId;
            s.selectedEndingId.value = null;
        }
        s.editingStepIndex.value = null;
    }

    function selectStep(index) {
        s.editingStepIndex.value = index;
    }

    /** 清除所有节点的选框选中状态 */
    function clearNodeSelection() {
        for (const key of Object.keys(s.selectedNodeIds)) {
            delete s.selectedNodeIds[key];
        }
    }

    // ── 章节操作 ──────────────────────────────────────────────
    function addChapter() {
        const newId = uid('chapter');
        s.chapters[newId] = [{
            sceneId: '',
            type: 'dialogue',
            characterId: null,
            text: '新对话段落...',
            effects: [],
        }];
        const panel = s.treePanel.value;
        const cx = panel ? -(s.panX.value / s.viewScale.value) + (panel.clientWidth / 2 / s.viewScale.value) : 400;
        const cy = panel ? -(s.panY.value / s.viewScale.value) + (panel.clientHeight / 2 / s.viewScale.value) : 300;
        s.nodePositions[newId] = { x: cx, y: cy };
        s.selectedChapterId.value = newId;
        s.editingStepIndex.value = 0;
        showToast(`已创建新章节：${newId}`);
    }

    function addEndingNode() {
        const newId = uid('end');
        const newEnding = { id: newId, title: '新结局', description: '' };
        s.gameEndings.push(newEnding);
        const panel = s.treePanel.value;
        const cx = panel ? -(s.panX.value / s.viewScale.value) + (panel.clientWidth / 2 / s.viewScale.value) : 400;
        const cy = panel ? -(s.panY.value / s.viewScale.value) + (panel.clientHeight / 2 / s.viewScale.value) : 300;
        s.nodePositions['_end_' + newId] = { x: cx, y: cy };
        s.selectedEndingId.value = '_end_' + newId;
        showToast(`已创建结局节点：${newId}`);
    }

    function addEndingNodeAtPos(worldX, worldY) {
        const newId = uid('end');
        const newEnding = { id: newId, title: '新结局', description: '' };
        s.gameEndings.push(newEnding);
        s.nodePositions['_end_' + newId] = { x: worldX, y: worldY };
        s.selectedEndingId.value = '_end_' + newId;
        showToast(`已创建结局节点：${newId}`);
    }

    function addChapterAtPos(worldX, worldY) {
        const newId = uid('chapter');
        s.chapters[newId] = [{
            sceneId: '',
            type: 'dialogue',
            characterId: null,
            text: '新对话段落...',
            effects: [],
        }];
        s.nodePositions[newId] = { x: worldX, y: worldY };
        s.selectedChapterId.value = newId;
        s.editingStepIndex.value = 0;
        showToast(`已在位置创建新章节：${newId}`);
    }

    function deleteChapter(batchIds) {
        if (batchIds && batchIds.length > 1) {
            const hasEnding = batchIds.some(id => s.getNodeType(id) === s.NODE_TYPE.ENDING);
            const typeLabel = hasEnding ? '节点' : '章节';
            if (!confirm(`确定要删除选中的 ${batchIds.length} 个${typeLabel}吗？\n\n此操作不可撤销。`)) return;
            for (const id of batchIds) {
                if (s.isEndingNode(id)) {
                    deleteEndingNodeById(id, false);
                } else {
                    delete s.chapters[id];
                    delete s.nodePositions[id];
                    delete s.nodeStyles[id];
                    delete s.chapterDescriptions[id];
                }
            }
            clearNodeSelection();
            s.selectedChapterId.value = null;
            s.selectedEndingId.value = null;
            s.editingStepIndex.value = null;
            showToast(`已批量删除 ${batchIds.length} 个${typeLabel}`);
            return;
        }

        const singleId = s.selectedEndingId.value || s.selectedChapterId.value;
        if (!singleId) return;

        if (s.isEndingNode(singleId)) {
            if (!confirm(`确定要删除结局 "${c.selectedEndingNode.value?.label || singleId}" 吗？`)) return;
            deleteEndingNodeById(singleId, true);
            s.selectedEndingId.value = null;
            s.editingStepIndex.value = null;
            showToast(`已删除结局：${singleId}`);
            return;
        }

        const id = singleId;
        if (!confirm(`确定要删除章节 "${id}" 吗？`)) return;
        delete s.chapters[id];
        delete s.nodePositions[id];
        delete s.nodeStyles[id];
        delete s.chapterDescriptions[id];
        s.selectedChapterId.value = null;
        s.editingStepIndex.value = null;
        showToast(`已删除章节：${id}`);
    }

    function deleteEndingNodeById(endNodeId, clearChapterRefs) {
        const endingId = endNodeId.startsWith('_end_') ? endNodeId.slice(5) : endNodeId;
        const idx = s.gameEndings.findIndex(e => e.id === endingId);
        if (idx > -1) s.gameEndings.splice(idx, 1);
        delete s.nodePositions[endNodeId];
        if (clearChapterRefs) {
            for (const [cid, steps] of Object.entries(s.chapters)) {
                for (const step of steps) {
                    if (step.jumpChapter === endNodeId) step.jumpChapter = '';
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === endNodeId) ch.jumpChapter = '';
                        }
                    }
                    if (step.type === 'jump' && step.endingId === endingId) {
                        step.endingId = '';
                    }
                }
            }
        }
    }

    function onChapterIdChange() {
        const oldId = s.selectedChapterId.value;
        if (!oldId) return;
        const newId = s.editingChapterId.value;
        if (!newId || oldId === newId) return;

        if (s.chapters[newId]) {
            showToast(`章节 ID "${newId}" 已存在！`);
            return;
        }

        s.chapters[newId] = s.chapters[oldId];
        delete s.chapters[oldId];

        if (s.nodePositions[oldId]) {
            s.nodePositions[newId] = s.nodePositions[oldId];
            delete s.nodePositions[oldId];
        }

        for (const [cid, steps] of Object.entries(s.chapters)) {
            for (const step of steps) {
                if (step.jumpChapter === oldId) step.jumpChapter = newId;
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                    }
                }
            }
        }

        s.selectedChapterId.value = newId;
        showToast(`章节 ID 已更新：${oldId} → ${newId}`);
    }

    // ── 步骤操作 ──────────────────────────────────────────────
    function addStep() {
        if (!s.selectedChapterId.value) return;
        const steps = s.chapters[s.selectedChapterId.value];
        const newStep = {
            sceneId: steps.length > 0 ? steps[steps.length - 1].sceneId : '',
            type: 'dialogue', characterId: null, text: '新对话...', effects: [],
        };
        steps.push(newStep);
        s.editingStepIndex.value = steps.length - 1;
        showToast(`已添加步骤 #${steps.length}`);
    }

    function setDefaultJumpMode(step) {
        if (!step._jumpMode) {
            step._jumpMode = step.endingId ? 'ending' : 'chapter';
        }
    }

    function deleteStep(index) {
        if (!s.selectedChapterId.value) return;
        const steps = s.chapters[s.selectedChapterId.value];
        if (!confirm(`确定删除步骤 #${index + 1} 吗？`)) return;
        steps.splice(index, 1);
        if (s.editingStepIndex.value === index) {
            s.editingStepIndex.value = null;
        } else if (s.editingStepIndex.value > index) {
            s.editingStepIndex.value--;
        }
        showToast(`已删除步骤 #${index + 1}`);
    }

    function moveStep(index, direction) {
        if (!s.selectedChapterId.value) return;
        const steps = s.chapters[s.selectedChapterId.value];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= steps.length) return;
        const [moved] = steps.splice(index, 1);
        steps.splice(newIndex, 0, moved);
        if (s.editingStepIndex.value === index) {
            s.editingStepIndex.value = newIndex;
        } else if (s.editingStepIndex.value === newIndex) {
            s.editingStepIndex.value = index;
        }
    }

    // ── 分支选项操作 ──────────────────────────────────────────
    function addChoice() {
        if (!c.editingStep.value || c.editingStep.value.type !== 'choice') return;
        if (!c.editingStep.value.choices) c.editingStep.value.choices = [];
        c.editingStep.value.choices.push({
            text: '新选项...', jumpChapter: '', flag: '', gainItem: '',
        });
    }

    function removeChoice(index) {
        if (!c.editingStep.value || !c.editingStep.value.choices) return;
        c.editingStep.value.choices.splice(index, 1);
    }

    // ── CG 变更 ───────────────────────────────────────────────
    function onCGChange() {
        if (!c.editingStep.value) return;
        const action = c.editingStep.value._cgAction;
        if (action === 'enter') {
            c.editingStep.value.cgChanges = {
                action: 'enter',
                id: c.editingStep.value._cgId || '',
                animation: c.editingStep.value._cgAnimation || 'scaleIn',
            };
            if (c.editingStep.value._cgEffect) {
                c.editingStep.value.cgChanges.effect = c.editingStep.value._cgEffect;
            }
        } else if (action === 'leave') {
            c.editingStep.value.cgChanges = {
                action: 'leave',
                animation: c.editingStep.value._cgAnimation || 'fadeOut',
            };
        } else {
            delete c.editingStep.value.cgChanges;
        }
    }

    // ── 角色变更 ──────────────────────────────────────────────
    function addCharChange() {
        if (!c.editingStep.value) return;
        if (!c.editingStep.value._charChanges) c.editingStep.value._charChanges = [];
        c.editingStep.value._charChanges.push({ id: '', action: 'enter', spriteId: '', animation: '', position: 'center' });
        syncCharChangesToStep();
    }

    function removeCharChange(index) {
        if (!c.editingStep.value?._charChanges) return;
        c.editingStep.value._charChanges.splice(index, 1);
        syncCharChangesToStep();
    }

    /** 角色变更字段白名单 — 只序列化这些字段到 characterChanges */
    const CHAR_CHANGE_FIELDS = [
        'id', 'id1', 'id2', 'ids',
        'action', 'spriteId', 'animation', 'position',
        'scale', 'opacity', 'filters',
        'speak', 'weight', 'weights',
        'actionId', 'effect', 'duration',
        'offsetX', 'offsetY', 'spread',
        'groupId', 'sfx', 'order',
    ];

    function syncCharChangesToStep() {
        if (!c.editingStep.value) return;
        const valid = (c.editingStep.value._charChanges || []).filter(cc => cc.id || cc.ids || cc.id1 || cc.action === 'clearAll' || cc.action === 'silenceAll');
        if (valid.length > 0) {
            c.editingStep.value.characterChanges = valid.map(cc => {
                const entry = { action: cc.action };
                // 复制白名单中所有非空字段
                for (const field of CHAR_CHANGE_FIELDS) {
                    let val = cc[field];
                    if (val === undefined || val === null || val === '') continue;
                    if (Array.isArray(val) && val.length === 0) continue;
                    // ids 字段：逗号分隔字符串 → 数组
                    if (field === 'ids' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).filter(Boolean);
                        if (val.length === 0) continue;
                    }
                    // weights 字段：逗号分隔字符串 → 数字数组
                    if (field === 'weights' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n));
                        if (val.length === 0) continue;
                    }
                    entry[field] = val;
                }
                // leave / clearAll 自动移除 spriteId
                if (cc.action === 'leave' || cc.action === 'clearAll') {
                    delete entry.spriteId;
                }
                return entry;
            });
        } else {
            delete c.editingStep.value.characterChanges;
        }
    }

    function onCharChangeField() {
        // 切换 action 时初始化默认值
        for (const cc of (c.editingStep.value?._charChanges || [])) {
            if (cc.action === 'filter' && !cc.filters) {
                cc.filters = { brightness: 1, saturation: 1, contrast: 1 };
            }
            if (cc.action === 'gather' && !cc.spread) {
                cc.spread = 0.15;
            }
            if (cc.action === 'speak' && !cc.weight) {
                cc.weight = 1;
            }
        }
        syncCharChangesToStep();
    }

    // ── 特效 ──────────────────────────────────────────────────
    function toggleEffect(effect) {
        if (!c.editingStep.value) return;
        if (!c.editingStep.value.effects) c.editingStep.value.effects = [];
        const idx = c.editingStep.value.effects.indexOf(effect);
        if (idx > -1) {
            c.editingStep.value.effects.splice(idx, 1);
        } else {
            c.editingStep.value.effects.push(effect);
        }
    }

    // ── 文本批处理 ─────────────────────────────────────────────
    function addBatchTextSegment() {
        const step = c.editingStep.value;
        if (!step) return;
        if (!step.texts) {
            step.texts = [step.text || ''];
        }
        step.texts.push('新段落...');
    }

    function removeBatchTextSegment(index) {
        const step = c.editingStep.value;
        if (!step || !step.texts) return;
        if (step.texts.length <= 1) return;
        step.texts.splice(index, 1);
        // 同步第一段到 step.text（兼容旧消费方，引擎实际以 texts 为准）
        step.text = step.texts[0];
    }

    function disableBatchText() {
        const step = c.editingStep.value;
        if (!step || !step.texts) return;
        step.text = step.texts[0] || '';
        delete step.texts;
    }

    // ── 游戏设置 ──────────────────────────────────────────────
    function openGameSettings() {
        s.editableGameConfig.title = s.gameConfig.title || '';
        s.editableGameConfig.aspectWidth = s.gameConfig.aspectRatio?.width || 1280;
        s.editableGameConfig.aspectHeight = s.gameConfig.aspectRatio?.height || 720;
        s.editableGameConfig.textSpeed = s.gameConfig.textSpeed || 25;
        s.showGameSettings.value = true;
    }

    function saveGameSettings() {
        s.gameConfig.title = s.editableGameConfig.title;
        s.gameConfig.aspectRatio = {
            width: s.editableGameConfig.aspectWidth,
            height: s.editableGameConfig.aspectHeight,
        };
        s.gameConfig.textSpeed = s.editableGameConfig.textSpeed;
        s.gameConfig.entryPoints = Object.keys(s.entryPoints);
        s.showGameSettings.value = false;
        showToast('✅ 游戏设置已保存！请点击"同步到游戏"使引擎生效。');
    }

    // ── 同步到游戏引擎 ──────────────────────────────────────────
    function syncToGame() {
        try {
            const data = {
                chapters: JSON.parse(JSON.stringify(s.chapters)),
                characters: JSON.parse(JSON.stringify(s.gameCharacters)),
                scenes: JSON.parse(JSON.stringify(s.gameScenes)),
                cgLibrary: JSON.parse(JSON.stringify(s.gameCgLibrary)),
                items: JSON.parse(JSON.stringify(s.gameItems)),
                endings: JSON.parse(JSON.stringify(s.gameEndings)),
                editorMeta: {
                    nodePositions: JSON.parse(JSON.stringify(s.nodePositions)),
                    nodeStyles: JSON.parse(JSON.stringify(s.nodeStyles)),
                    editorGroups: JSON.parse(JSON.stringify(s.editorGroups)),
                    canvasComments: JSON.parse(JSON.stringify(s.canvasComments)),
                    chapterDescriptions: JSON.parse(JSON.stringify(s.chapterDescriptions)),
                },
                entryPoints: Object.keys(s.entryPoints),
                config: {
                    title: s.gameConfig.title,
                    aspectRatio: { ...s.gameConfig.aspectRatio },
                    textSpeed: s.gameConfig.textSpeed,
                    entryPoints: Object.keys(s.entryPoints),
                },
                timestamp: Date.now(),
            };
            localStorage.setItem('galgame-editor-data', JSON.stringify(data));
            showToast('✅ 已同步到游戏引擎！刷新游戏页面（F5）即可生效。');
        } catch (e) {
            showToast('❌ 同步失败：' + e.message);
        }
    }

    function previewStory() {
        try {
            syncToGame();
            const previewUrl = '../index.html?preview=1&t=' + Date.now();
            window.open(previewUrl, 'galgame_preview');
            showToast('✅ 已打开剧情预览窗口');
        } catch (e) {
            showToast('❌ 预览打开失败：' + e.message);
        }
    }

    // ── 资源管理器 ──────────────────────────────────────────────
    function openResourceManager() {
        s.showResourceManager.value = true;
        s.resourceTab.value = 'characters';
        s.selectedResourceId.value = null;
    }

    function selectResource(type, id) {
        s.resourceTab.value = type;
        s.selectedResourceId.value = id;
    }

    function addResource(type) {
        const meta = s.resourceMeta[type];
        if (!meta) return;
        const newId = uid(type === 'endings' ? 'ending' : type);

        if (meta.isObject) {
            if (type === 'characters') {
                meta.data[newId] = {
                    name: '新角色', color: '#ffffff', race: '', gender: '', role: '',
                    defaultSpeed: 25, description: '', avatars: {},
                    sprites: { default: { id: 'default', label: '👤 默认', url: '' } },
                };
            } else if (type === 'scenes') {
                meta.data[newId] = { title: '新场景', url: '', bgPlaceholder: '#111111' };
            } else if (type === 'cg') {
                meta.data[newId] = { title: '新 CG', subtitle: '', url: '' };
            } else if (type === 'items') {
                meta.data[newId] = { name: '新物品', icon: '📦', image: '', description: '' };
            }
        } else {
            meta.data.push({ id: newId, title: '新结局', description: '' });
        }

        s.selectedResourceId.value = newId;
        showToast(`已创建新${meta.label}：${newId}`);
    }

    function deleteResource(type, id) {
        const meta = s.resourceMeta[type];
        if (!meta) return;
        if (!confirm(`确定删除此${meta.label}吗？此操作不可撤销。`)) return;

        if (meta.isObject) {
            delete meta.data[id];
        } else {
            const arr = meta.data;
            const idx = arr.findIndex(e => e.id === id);
            if (idx > -1) arr.splice(idx, 1);
        }

        if (s.selectedResourceId.value === id) {
            s.selectedResourceId.value = null;
        }
        showToast(`已删除${meta.label}`);
    }

    function addSprite(character) {
        if (!character.sprites) character.sprites = {};
        const spriteId = 'sprite_' + Date.now().toString(36);
        character.sprites[spriteId] = { id: spriteId, label: '新立绘', url: '' };
    }

    function addAvatar(character) {
        if (!character.avatars) character.avatars = {};
        const avatarId = 'avatar_' + Date.now().toString(36);
        character.avatars[avatarId] = '';
    }

    function renameResource(type, oldId) {
        const meta = s.resourceMeta[type];
        if (!meta || !oldId) return;
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

        updateReferences(oldId, newId, type);
        s.selectedResourceId.value = newId;
        showToast(`ID 已更新：${oldId} → ${newId}`);
    }

    function updateReferences(oldId, newId, type) {
        for (const [cid, steps] of Object.entries(s.chapters)) {
            for (const step of steps) {
                if (step.jumpChapter === oldId) step.jumpChapter = newId;
                if (type === 'characters' && step.characterId === oldId) step.characterId = newId;
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                    }
                }
            }
        }
    }

    // ── 曲线（边）交互 ────────────────────────────────────────
    let edgeDragState = null;

    function onEdgeClick(edge) {
        if (s.selectedChapterId.value === edge.from) {
            selectNode(edge.to);
        } else {
            selectNode(edge.from);
        }
        showToast(`连线: ${edge.from} → ${edge.to}`);
    }

    function onEdgeMouseDown(e, edge) {
        if (e.button !== 0) return;
        const fromNode = c.treeNodes.value.find(n => n.id === edge.from);
        const toNode = c.treeNodes.value.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;
        edgeDragState = { edge, fromNode, toNode, isDragging: false };
    }

    function onEdgeHandleMouseDown(e, edge) {
        if (e.button !== 0) return;
        const fromNode = c.treeNodes.value.find(n => n.id === edge.from);
        if (!fromNode) return;
        const bp = (fromNode.bottomPorts || []).find(p => p.targetId === edge.to);
        if (!bp) return;

        s.portDragging.active = true;
        s.portDragging.fromNodeId = edge.from;
        s.portDragging.fromPortIdx = bp.portIdx;
        s.portDragging.fromStepIdx = bp.stepIdx;
        s.portDragging.fromChoiceIdx = bp.choiceIdx;
        s.portDragging.mouseX = e.clientX;
        s.portDragging.mouseY = e.clientY;

        const onMove = (ev) => {
            s.portDragging.mouseX = ev.clientX;
            s.portDragging.mouseY = ev.clientY;
        };
        const onUp = (ev) => {
            s.portDragging.active = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const rect = s.treePanel.value.getBoundingClientRect();
            const sx = ev.clientX - rect.left;
            const sy = ev.clientY - rect.top;
            const wp = c.screenToWorld(sx, sy);
            const snapped = findSnapTarget(wp);
            const target = snapped || c.treeNodes.value.find(n => {
                if (n.id === edge.from) return false;
                const dx = Math.abs(n.x - wp.x);
                const dy = Math.abs(n.y - wp.y);
                return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
            });
            if (target) {
                s.portDragging.fromPortIdx = bp.portIdx;
                updatePortTarget(bp, target.id);
            }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // ── 连接端口 ──────────────────────────────────────────────
    function startPortDrag(e, nodeId, portIdx, port) {
        if (port.isEnding) { jumpToPortTarget(port); return; }
        s.portDragging.active = true;
        s.portDragging.fromNodeId = nodeId;
        s.portDragging.fromPortIdx = portIdx;
        s.portDragging.fromStepIdx = port.stepIdx;
        s.portDragging.fromChoiceIdx = port.choiceIdx;
        s.portDragging.snapTargetId = null;
        s.portDragging.mouseX = e.clientX;
        s.portDragging.mouseY = e.clientY;

        const onMove = (ev) => {
            s.portDragging.mouseX = ev.clientX;
            s.portDragging.mouseY = ev.clientY;
        };
        const onUp = (ev) => {
            s.portDragging.active = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const targetId = s.portDragging.snapTargetId;
            if (targetId) {
                updatePortTarget(port, targetId);
            } else {
                const rect = s.treePanel.value.getBoundingClientRect();
                const sx = ev.clientX - rect.left;
                const sy = ev.clientY - rect.top;
                const wp = c.screenToWorld(sx, sy);
                const target = c.treeNodes.value.find(n => {
                    if (n.id === nodeId) return false;
                    const dx = Math.abs(n.x - wp.x);
                    const dy = Math.abs(n.y - wp.y);
                    return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                });
                if (target) updatePortTarget(port, target.id);
            }
            s.portDragging.snapTargetId = null;
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function jumpToPortTarget(port) {
        const tid = port.targetId;
        if (tid.startsWith('_end_')) {
            showToast('结局: ' + (c.treeNodes.value.find(n => n.id === tid)?.firstText || tid));
            return;
        }
        const targetNode = c.treeNodes.value.find(n => n.id === tid);
        if (targetNode) { selectNode(targetNode.id); zoomToNode(targetNode); }
    }

    function updatePortTarget(port, newTargetId) {
        const steps = s.chapters[s.portDragging.fromNodeId];
        if (!steps) return;
        const step = steps[port.stepIdx];
        if (!step) return;
        if (port.choiceIdx !== undefined && step.choices) {
            step.choices[port.choiceIdx].jumpChapter = newTargetId;
        } else if (port.type === 'jump-ending' || port.isEnding) {
            if (newTargetId.startsWith('_end_')) {
                step.endingId = newTargetId.slice(5);
            } else {
                step.endingId = '';
                step.jumpChapter = newTargetId;
            }
        } else {
            step.jumpChapter = newTargetId;
        }
        port.targetId = newTargetId;
        port.isEnding = newTargetId.startsWith('_end_');
        showToast(`跳转目标已更新 → ${newTargetId}`);
    }

    function findSnapTarget(worldPos, threshold = 40) {
        const snapDist = threshold / s.viewScale.value;
        let best = null, bestDist = snapDist;
        for (const node of c.treeNodes.value) {
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

    // ── 节点缩放 ────────────────────────────────────────────────
    function startNodeResize(e, node, edge) {
        e.preventDefault(); e.stopPropagation();
        s.resizingNode.active = true;
        s.resizingNode.nodeId = node.id;
        s.resizingNode.edge = edge;
        s.resizingNode.startX = e.clientX;
        s.resizingNode.startY = e.clientY;
        s.resizingNode.startW = node.width || 200;
        s.resizingNode.startH = node.height || 90;

        const onMove = (ev) => {
            const dx = (ev.clientX - s.resizingNode.startX) / s.viewScale.value;
            const dy = (ev.clientY - s.resizingNode.startY) / s.viewScale.value;
            if (!s.nodeStyles[s.resizingNode.nodeId]) s.nodeStyles[s.resizingNode.nodeId] = {};
            const st = s.nodeStyles[s.resizingNode.nodeId];
            if (edge === 'e' || edge === 'se') st.width = Math.max(140, s.resizingNode.startW + dx);
            if (edge === 'se') st.height = Math.max(50, s.resizingNode.startH + dy);
        };
        const onUp = () => {
            s.resizingNode.active = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // ── 分组 ────────────────────────────────────────────────────
    function createGroupFromSelection() {
        const ids = Object.keys(s.selectedNodeIds);
        if (ids.length < 2) { showToast('请先框选至少 2 个节点'); return; }
        const groupId = uid('group');
        const nodes = ids.map(id => c.treeNodes.value.find(n => n.id === id)).filter(Boolean);
        const minX = Math.min(...nodes.map(n => n.x)) - 60;
        const minY = Math.min(...nodes.map(n => n.y)) - 40;
        const maxX = Math.max(...nodes.map(n => n.x)) + 60;
        const maxY = Math.max(...nodes.map(n => n.y)) + 40;
        s.editorGroups[groupId] = {
            name: '分组 ' + (Object.keys(s.editorGroups).length + 1),
            color: '#5a8a5a', bgColor: '#2a4a2a',
            bgOpacity: 0.25, bgImage: '',
            nodeIds: [...ids],
            x: minX, y: minY, w: maxX - minX, h: maxY - minY,
        };
        s.selectedGroupId.value = groupId;
        showToast(`✅ 已创建分组: ${s.editorGroups[groupId].name}`);
    }

    function deleteGroup(groupId) {
        if (!groupId || !s.editorGroups[groupId]) return;
        if (!confirm(`确定删除分组「${s.editorGroups[groupId].name}」？`)) return;
        delete s.editorGroups[groupId];
        if (s.selectedGroupId.value === groupId) s.selectedGroupId.value = null;
        showToast('已删除分组');
    }

    function renameGroup(groupId) {
        const name = prompt('分组名称:', s.editorGroups[groupId]?.name || '');
        if (name) s.editorGroups[groupId].name = name;
    }

    function addNodeToGroup(groupId, nodeId) {
        const grp = s.editorGroups[groupId];
        if (!grp || grp.nodeIds.includes(nodeId)) return;
        grp.nodeIds.push(nodeId);
        updateGroupBounds(groupId);
        showToast('已将节点加入分组');
    }

    function removeNodeFromGroup(groupId, nodeId) {
        const grp = s.editorGroups[groupId];
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

    function updateGroupBounds(groupId) {
        const grp = s.editorGroups[groupId];
        if (!grp || grp.nodeIds.length === 0) return;
        const nodes = grp.nodeIds.map(id => c.treeNodes.value.find(n => n.id === id)).filter(Boolean);
        if (nodes.length === 0) return;
        grp.x = Math.min(...nodes.map(n => n.x)) - 60;
        grp.y = Math.min(...nodes.map(n => n.y)) - 40;
        grp.w = Math.max(...nodes.map(n => n.x)) - grp.x + 60;
        grp.h = Math.max(...nodes.map(n => n.y)) - grp.y + 40;
    }

    function selectGroup(groupId) {
        s.selectedGroupId.value = groupId;
        const grp = s.editorGroups[groupId];
        if (grp) {
            clearNodeSelection();
            for (const nid of grp.nodeIds) {
                s.selectedNodeIds[nid] = true;
            }
        }
    }

    function getNodeGroups(nodeId) {
        return Object.entries(s.editorGroups)
            .filter(([_, grp]) => grp.nodeIds.includes(nodeId))
            .map(([gid, grp]) => ({ id: gid, ...grp }));
    }

    function updateGroupsForNode(nodeId) {
        for (const gid of Object.keys(s.editorGroups)) {
            if (s.editorGroups[gid].nodeIds.includes(nodeId)) {
                updateGroupBounds(gid);
            }
        }
    }

    // ── 批量编辑 ──────────────────────────────────────────────
    function applyBatchStyle(prop, value) {
        for (const id of Object.keys(s.selectedNodeIds)) {
            if (!s.nodeStyles[id]) s.nodeStyles[id] = {};
            s.nodeStyles[id][prop] = value;
        }
    }

    // ── 导出 ──────────────────────────────────────────────────
    function exportAll() {
        s.exportModalTitle.value = '导出 JS 模块代码';
        const lines = [];
        lines.push('/**');
        lines.push(' * 由剧情树节点编辑器生成的章节数据');
        lines.push(` * 导出时间：${new Date().toISOString()}`);
        lines.push(' * 总计章节：' + c.totalChapters.value + ' / 步骤：' + c.totalSteps.value);
        lines.push(' */');
        lines.push('');

        for (const [cid, steps] of Object.entries(s.chapters)) {
            const varName = 'chapter_' + cid.replace(/-/g, '_');
            lines.push(`export const ${varName} = ${formatJS(steps, 0)};`);
            lines.push('');
        }

        lines.push('export const STORY_CHAPTERS = {');
        for (const cid of Object.keys(s.chapters)) {
            const varName = 'chapter_' + cid.replace(/-/g, '_');
            lines.push(`    '${cid}': ${varName},`);
        }
        lines.push('};');
        lines.push('export const ENTRY_POINTS = ' + JSON.stringify(Object.keys(s.entryPoints)) + ';');
        lines.push('');
        lines.push('export const CHAPTER_DESCRIPTIONS = ' + JSON.stringify(s.chapterDescriptions, null, 2) + ';');
        lines.push('');

        s.exportContent.value = lines.join('\n');
        s.showExportModal.value = true;
    }

    function exportJSON() {
        s.exportModalTitle.value = '导出 JSON';
        const data = {
            chapters: JSON.parse(JSON.stringify(s.chapters)),
            entryPoints: Object.keys(s.entryPoints),
            chapterDescriptions: JSON.parse(JSON.stringify(s.chapterDescriptions)),
        };
        s.exportContent.value = JSON.stringify(data, null, 2);
        s.showExportModal.value = true;
    }

    function copyExport() {
        navigator.clipboard.writeText(s.exportContent.value).then(() => {
            showToast('已复制到剪贴板！');
        }).catch(() => {
            showToast('复制失败，请手动选择并复制');
        });
    }

    function downloadExport() {
        const ext = s.exportModalTitle.value.includes('JSON') ? 'json' : 'js';
        const blob = new Blob([s.exportContent.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chapters-export.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('文件下载已开始');
    }

    function resetAll() {
        if (!confirm('确定要还原所有数据为原始版本吗？包括章节、角色、场景、CG、物品、结局在内的所有修改将丢失！')) return;

        const origCh = clone(s.originalChapters);
        for (const key of Object.keys(s.chapters)) delete s.chapters[key];
        for (const [key, val] of Object.entries(origCh)) s.chapters[key] = val;

        const origSc = clone(s.originalScenes);
        for (const key of Object.keys(s.gameScenes)) delete s.gameScenes[key];
        for (const [key, val] of Object.entries(origSc)) s.gameScenes[key] = val;

        const origChr = clone(s.originalCharacters);
        for (const key of Object.keys(s.gameCharacters)) delete s.gameCharacters[key];
        for (const [key, val] of Object.entries(origChr)) s.gameCharacters[key] = val;

        const origCg = clone(s.originalCgLibrary);
        for (const key of Object.keys(s.gameCgLibrary)) delete s.gameCgLibrary[key];
        for (const [key, val] of Object.entries(origCg)) s.gameCgLibrary[key] = val;

        const origIt = clone(s.originalItems);
        for (const key of Object.keys(s.gameItems)) delete s.gameItems[key];
        for (const [key, val] of Object.entries(origIt)) s.gameItems[key] = val;

        const origEnd = clone(s.originalEndings);
        s.gameEndings.splice(0, s.gameEndings.length, ...origEnd);

        const origCfg = clone(s.originalConfig);
        for (const key of Object.keys(s.gameConfig)) delete s.gameConfig[key];
        for (const [key, val] of Object.entries(origCfg)) s.gameConfig[key] = val;

        s.selectedChapterId.value = null;
        s.selectedEndingId.value = null;
        s.editingStepIndex.value = null;
        for (const key of Object.keys(s.chapterDescriptions)) delete s.chapterDescriptions[key];
        autoLayout();
        showToast('已还原所有数据为原始版本');
    }

    // ── 资源包导出（不含图片） ────────────────────────────────
    async function exportPackZip() {
        const itemAnimPresets = GameData.ITEM_ANIMATION_PRESETS || {};
        const packName = 'game-export';
        const files = {};

        files['pack.json'] = JSON.stringify({
            name: packName, title: s.gameConfig.title || '未命名故事',
            version: '1.0.0', author: '', description: '', format: '1.0.0',
            configs: {
                game: 'config/game.json', home: 'config/home.json',
                characters: 'config/characters.json', scenes: 'config/scenes.json',
                cgLibrary: 'config/cg-library.json', items: 'config/items.json',
                endings: 'config/endings.json',
            },
            chapters: Object.keys(s.chapters).reduce((acc, chId) => {
                acc[chId] = `chapters/${chId}.json`; return acc;
            }, {}),
        }, null, 2);

        const exportGameConfig = { ...s.gameConfig, entryPoints: Object.keys(s.entryPoints) };
        files['config/game.json'] = JSON.stringify(exportGameConfig, null, 2);
        files['config/home.json'] = JSON.stringify(GameData.HOME_CONFIG, null, 2);
        files['config/characters.json'] = JSON.stringify(s.gameCharacters, null, 2);
        files['config/scenes.json'] = JSON.stringify(s.gameScenes, null, 2);
        files['config/cg-library.json'] = JSON.stringify(s.gameCgLibrary, null, 2);
        files['config/items.json'] = JSON.stringify(s.gameItems, null, 2);
        if (Object.keys(itemAnimPresets).length > 0) {
            files['config/item-animation-presets.json'] = JSON.stringify(itemAnimPresets, null, 2);
        }
        files['config/endings.json'] = JSON.stringify(s.gameEndings, null, 2);

        for (const [chId, steps] of Object.entries(s.chapters)) {
            files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
        }

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
            a.href = url; a.download = `${packName}.zip`; a.click();
            URL.revokeObjectURL(url);
            showToast('资源包 ZIP 已下载！');
        } catch (e) {
            showToast(`资源包导出失败: ${e.message}`);
        }
    }

    // ── 资源包导出（含图片） ──────────────────────────────────
    async function exportPackZipWithAssets() {
        if (typeof JSZip === 'undefined') { showToast('JSZip 未加载'); return; }
        try {
            const itemAnimPresets = GameData.ITEM_ANIMATION_PRESETS || {};
            const packName = 'game-export';
            const files = {};
            const assetBlobs = [];

            const collectImages = (obj) => {
                if (!obj) return;
                const urls = new Set();
                for (const item of Object.values(obj)) {
                    if (item.url) urls.add(item.url);
                    if (item.sprites) for (const sp of Object.values(item.sprites)) {
                        if (sp.url) urls.add(sp.url);
                        if (sp._blob) assetBlobs.push({ path: sp.url, blob: sp._blob, name: sp._fileName });
                    }
                    if (item.avatars) for (const av of Object.values(item.avatars)) {
                        if (av) urls.add(av);
                    }
                    if (item._blob && item._fileName) assetBlobs.push({ path: 'resource-packs/default/assets/' + item._fileName, blob: item._blob, name: item._fileName });
                }
                return urls;
            };

            files['pack.json'] = JSON.stringify({
                name: packName, title: s.gameConfig.title || '未命名', version: '1.0.0',
                author: '', description: '', format: '1.0.0',
                configs: {
                    game: 'config/game.json', home: 'config/home.json',
                    characters: 'config/characters.json', scenes: 'config/scenes.json',
                    cgLibrary: 'config/cg-library.json', items: 'config/items.json',
                    endings: 'config/endings.json', effects: 'config/effects.json',
                },
                chapters: Object.keys(s.chapters).reduce((acc, chId) => {
                    acc[chId] = `chapters/${chId}.json`; return acc;
                }, {}),
            }, null, 2);

            const exportGameConfig = { ...s.gameConfig, entryPoints: Object.keys(s.entryPoints) };
            files['config/game.json'] = JSON.stringify(exportGameConfig, null, 2);
            files['config/home.json'] = JSON.stringify(GameData.HOME_CONFIG, null, 2);
            files['config/characters.json'] = JSON.stringify(s.gameCharacters, null, 2);
            files['config/scenes.json'] = JSON.stringify(s.gameScenes, null, 2);
            files['config/cg-library.json'] = JSON.stringify(s.gameCgLibrary, null, 2);
            files['config/items.json'] = JSON.stringify(s.gameItems, null, 2);
            files['config/endings.json'] = JSON.stringify(s.gameEndings, null, 2);
            files['config/effects.json'] = JSON.stringify(s.customEffects, null, 2);

            for (const [chId, steps] of Object.entries(s.chapters)) {
                files[`chapters/${chId}.json`] = JSON.stringify(steps, null, 2);
            }

            const zip = new JSZip();
            const folder = zip.folder(packName);
            for (const [path, content] of Object.entries(files)) {
                folder.file(path, content);
            }
            for (const asset of assetBlobs) {
                if (asset.blob) {
                    // 使用配置中的完整路径（resource-packs/default/assets/...）
                    // 若 path 是 blob URL 则回退到 resource-packs/default/assets/ + 文件名
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

    // ── 资源包导入 ────────────────────────────────────────────
    function triggerImportPack() {
        const input = document.getElementById('pack-import-input');
        if (input) input.click();
    }

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
            const manifestFile = zip.file(/^(.*\/)?pack\.json$/)[0];
            if (!manifestFile) { showToast('ZIP 中未找到 pack.json 清单文件'); return; }
            const manifestText = await manifestFile.async('string');
            const manifest = JSON.parse(manifestText);

            const manifestErrors = validatePackStructure(manifest);
            if (manifestErrors.length > 0) {
                showToast(`资源包清单验证失败: ${manifestErrors[0]}`);
                console.warn('Pack validation errors:', manifestErrors);
                return;
            }

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

            const importedChapters = {};
            let importCount = 0;

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

            if (importCount === 0) { showToast('资源包中未找到任何章节数据'); return; }

            const tmpData = {
                GAME_CONFIG: s.gameConfig,
                HOME_CONFIG: GameData.HOME_CONFIG,
                CHARACTERS: s.gameCharacters,
                SCENES: s.gameScenes,
                CG_LIBRARY: s.gameCgLibrary,
                ITEMS: s.gameItems,
                ENDINGS: s.gameEndings,
                STORY_CHAPTERS: importedChapters,
            };
            const dataWarnings = validatePackData(tmpData);
            if (dataWarnings.length > 0) console.warn('Imported pack data warnings:', dataWarnings);

            if (!confirm(`即将从资源包导入 ${importCount} 个章节。\n资源包: ${manifest.title || manifest.name}\n版本: ${manifest.version || '未知'}\n\n⚠ 当前编辑器中的所有章节修改将被覆盖！\n确定继续吗？`)) {
                event.target.value = '';
                return;
            }

            for (const key of Object.keys(s.chapters)) delete s.chapters[key];
            for (const [key, val] of Object.entries(importedChapters)) s.chapters[key] = val;

            s.selectedChapterId.value = null;
            s.selectedEndingId.value = null;
            s.editingStepIndex.value = null;
            autoLayout();
            showToast(`已成功导入资源包 "${manifest.title || manifest.name}"：${importCount} 个章节`);
        } catch (e) {
            showToast(`资源包导入失败: ${e.message}`);
            console.error('Pack import error:', e);
        }

        event.target.value = '';
    }

    // ── 右键菜单操作 ──────────────────────────────────────────
    function closeContextMenu() {
        s.contextMenu.show = false;
        s.contextMenu.nodeId = null;
    }

    function contextZoomToNode() {
        if (s.contextMenu.nodeId) {
            const node = c.treeNodes.value.find(n => n.id === s.contextMenu.nodeId);
            if (node) zoomToNode(node);
        }
        closeContextMenu();
    }

    function contextCopyId() {
        if (s.contextMenu.nodeId) {
            navigator.clipboard.writeText(s.contextMenu.nodeId).then(() => {
                showToast('已复制章节 ID：' + s.contextMenu.nodeId);
            }).catch(() => {
                showToast('复制失败，ID：' + s.contextMenu.nodeId);
            });
        }
        closeContextMenu();
    }

    function contextDeleteChapter() {
        if (s.contextMenu.nodeId) {
            selectNode(s.contextMenu.nodeId);
            nextTick(() => deleteChapter());
        }
        closeContextMenu();
    }

    function contextDuplicateChapter() {
        if (!s.contextMenu.nodeId) { closeContextMenu(); return; }
        const srcId = s.contextMenu.nodeId;
        if (s.isEndingNode(srcId)) {
            showToast('结局节点不支持复制操作');
            closeContextMenu();
            return;
        }
        const srcSteps = s.chapters[srcId];
        if (!srcSteps) { closeContextMenu(); return; }
        const newId = uid('chapter');
        s.chapters[newId] = clone(srcSteps);
        if (s.nodePositions[srcId]) {
            s.nodePositions[newId] = {
                x: s.nodePositions[srcId].x + 50,
                y: s.nodePositions[srcId].y + 50,
            };
        }
        s.selectedChapterId.value = newId;
        s.editingStepIndex.value = null;
        showToast(`已复制章节：${srcId} → ${newId}`);
        closeContextMenu();
    }

    function contextEditEnding() {
        if (s.contextMenu.nodeId && s.isEndingNode(s.contextMenu.nodeId)) {
            selectNode(s.contextMenu.nodeId);
        }
        closeContextMenu();
    }

    function addStepFromContext() {
        if (!s.contextMenu.nodeId) { closeContextMenu(); return; }
        if (s.isEndingNode(s.contextMenu.nodeId)) {
            showToast('结局节点不能添加步骤');
            closeContextMenu();
            return;
        }
        s.selectedChapterId.value = s.contextMenu.nodeId;
        nextTick(() => addStep());
        closeContextMenu();
    }

    function contextAddToGroup(groupId) {
        for (const nid of Object.keys(s.selectedNodeIds)) {
            addNodeToGroup(groupId, nid);
        }
        closeContextMenu();
    }

    function contextRemoveFromGroup(groupId) {
        if (s.contextMenu.nodeId) {
            removeNodeFromGroup(groupId, s.contextMenu.nodeId);
        }
        closeContextMenu();
    }

    // ── 全局搜索 ──────────────────────────────────────────────
    function startGlobalSearch() {
        s.editingGlobalSearch.value = true;
        s.globalSearchQuery.value = '';
        nextTick(() => {
            const el = document.querySelector('.global-search-input');
            if (el) el.focus();
        });
    }

    function endGlobalSearch() {
        s.editingGlobalSearch.value = false;
        s.globalSearchQuery.value = '';
    }

    function navigateToSearchResult(result) {
        const typeMap = { character: 'characters', scene: 'scenes', cg: 'cg', item: 'items', ending: 'endings' };
        const type = typeMap[result.action];
        if (type) {
            s.showResourceManager.value = true;
            s.resourceTab.value = type;
            s.selectedResourceId.value = result.id;
        } else {
            s.selectedChapterId.value = result.id;
            s.editingStepIndex.value = null;
            const node = c.treeNodes.value.find(n => n.id === result.id);
            if (node) zoomToNode(node);
        }
        endGlobalSearch();
    }

    // ── 缩放控制 ──────────────────────────────────────────────
    function applyZoomPercent() {
        if (s.zoomPercent.value >= 30 && s.zoomPercent.value <= 200) {
            s.viewScale.value = s.zoomPercent.value / 100;
        }
        s.showZoomInput.value = false;
    }

    // ── 资源图片拖放 ──────────────────────────────────────────
    function triggerResourceFile(target) {
        s.resourceImageTarget.value = target;
        const input = document.getElementById('resource-image-input');
        if (input) input.click();
    }

    function handleResourceImagePick(event) {
        const file = event.target.files?.[0];
        if (!file || !s.resourceImageTarget.value) return;
        const url = URL.createObjectURL(file);
        s.resourceImageTarget.value.url = url;
        s.resourceImageTarget.value._fileName = file.name;
        if (!s.resourceImageTarget.value._blob) {
            s.resourceImageTarget.value._blob = file;
        }
        s.resourceImageTarget.value = null;
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

    // ── 特效管理器 ────────────────────────────────────────────
    function openEffectsManager() {
        s.showEffectsManager.value = true;
        s.selectedEffectId.value = null;
        stopEffectPreview();
    }

    function addCustomEffect() {
        const eid = uid('effect');
        s.customEffects[eid] = {
            name: '新特效', icon: '✨',
            effectType: 'template',
            type: 'stardust',
            emoji: '✨', animation: 'fall',
            sizeMin: 12, sizeMax: 28, color: '',
            density: 30, speed: 50,
            jsPath: '', cssPath: '',
        };
        s.selectedEffectId.value = eid;
    }

    function deleteCustomEffect(eid) {
        if (!confirm('确定删除此自定义特效吗？')) return;
        delete s.customEffects[eid];
        if (s.selectedEffectId.value === eid) s.selectedEffectId.value = null;
        stopEffectPreview();
    }

    let _effectManager = null;
    let effectPreviewTimer = null;

    function getEffectManager() {
        if (!_effectManager && s.effectPreviewRef.value) {
            _effectManager = new EffectsManager(s.effectPreviewRef.value);
        }
        return _effectManager;
    }

    function toggleEffectPreview(effectId) {
        if (s.effectPreviewActive.value) { stopEffectPreview(); return; }
        const el = s.effectPreviewRef.value;
        if (!el) return;
        el.innerHTML = '';
        s.effectPreviewActive.value = true;

        const cfg = s.customEffects[effectId];
        let config;
        if (!cfg) {
            config = { type: effectId, density: 30, speed: 50 };
        } else if (cfg.effectType === 'template') {
            config = {
                type: 'template', emoji: cfg.emoji || '✨',
                animation: cfg.animation || 'fall',
                density: cfg.density || 30, speed: cfg.speed || 50,
                sizeMin: cfg.sizeMin || 12, sizeMax: cfg.sizeMax || 28,
                color: cfg.color || '',
            };
        } else if (cfg.effectType === 'builtin') {
            config = { type: cfg.type || effectId, density: cfg.density || 30, speed: cfg.speed || 50 };
        } else {
            config = { type: cfg.jsEffectId || effectId, density: cfg.density || 30 };
        }

        const fx = getEffectManager();
        if (fx) {
            fx.container = el;
            fx.play(config);
        } else {
            const spawn = () => {
                if (!s.effectPreviewActive.value) return;
                const p = document.createElement('div');
                const emoji = '✨';
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
        s.effectPreviewActive.value = false;
        clearInterval(effectPreviewTimer);
        const fx = getEffectManager();
        if (fx) fx.clear();
        if (s.effectPreviewRef.value) {
            s.effectPreviewRef.value.innerHTML = '<div class="effect-preview-bg"><span>预览已停止</span></div>';
        }
    }

    // ── 面板拖拽调整宽度 ────────────────────────────────────
    function startPanelResize(e) {
        const startX = e.clientX;
        const startWidth = s.detailPanelWidth.value;
        const onMove = (ev) => {
            const dx = startX - ev.clientX;
            s.detailPanelWidth.value = Math.max(300, Math.min(900, startWidth + dx));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // ── 全局右键菜单 ────────────────────────────────────────
    function closeGlobalContextMenu() {
        s.globalContextMenu.show = false;
    }

    return {
        showToast, toggleEntryPoint,
        autoLayout, zoomIn, zoomOut, resetView, handleWheel, zoomToNode,
        selectNode, selectStep, clearNodeSelection,
        addChapter, addEndingNode, addEndingNodeAtPos, addChapterAtPos,
        deleteChapter, onChapterIdChange,
        addStep, setDefaultJumpMode, deleteStep, moveStep,
        addChoice, removeChoice,
        onCGChange, addCharChange, removeCharChange, onCharChangeField, syncCharChangesToStep,
        toggleEffect,
        addBatchTextSegment, removeBatchTextSegment, disableBatchText,
        openGameSettings, saveGameSettings, syncToGame, previewStory,
        openResourceManager, selectResource, addResource, deleteResource,
        addSprite, addAvatar, renameResource, updateReferences,
        onEdgeClick, onEdgeMouseDown, onEdgeHandleMouseDown,
        startPortDrag, jumpToPortTarget, updatePortTarget, findSnapTarget,
        startNodeResize,
        createGroupFromSelection, deleteGroup, renameGroup,
        addNodeToGroup, removeNodeFromGroup, updateGroupBounds,
        selectGroup, getNodeGroups, updateGroupsForNode,
        applyBatchStyle,
        exportAll, exportJSON, copyExport, downloadExport, resetAll,
        exportPackZip, exportPackZipWithAssets, triggerImportPack, handlePackImport,
        closeContextMenu, contextZoomToNode, contextCopyId,
        contextDeleteChapter, contextDuplicateChapter, contextEditEnding,
        addStepFromContext, contextAddToGroup, contextRemoveFromGroup,
        startGlobalSearch, endGlobalSearch, navigateToSearchResult,
        applyZoomPercent,
        triggerResourceFile, handleResourceImagePick, onResourceDrop, onSpriteDrop,
        openEffectsManager, addCustomEffect, deleteCustomEffect,
        getEffectManager, toggleEffectPreview, stopEffectPreview,
        startPanelResize, closeGlobalContextMenu,
        deleteEndingNodeById,
    };
}

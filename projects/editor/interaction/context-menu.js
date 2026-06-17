/**
 * editor/interaction/context-menu.js —— 所有右键菜单处理器
 */
import { screenToWorld } from '../helpers.js';
import { isEndingNode } from '../step-utils.js';
const { watch: _watch } = Vue;

export function createContextMenu(ctx, ops) {
    const { contextMenu, globalContextMenu, contextMenuFocusIndex, treePanel, treeNodes, viewScale, panX, panY } = ctx;

    function onCanvasContextMenu(e) {
        const rect = treePanel.value.getBoundingClientRect();
        contextMenu.show = true; contextMenu.x = e.clientX - rect.left; contextMenu.y = e.clientY - rect.top;
        const wp = screenToWorld(contextMenu.x, contextMenu.y, panX.value, panY.value, viewScale.value);
        contextMenu.worldX = wp.x; contextMenu.worldY = wp.y;
        if (!contextMenu.nodeId) {
            const node = treeNodes.value.find(n => Math.abs(n.x - wp.x) < 100 && Math.abs(n.y - wp.y) < 45);
            contextMenu.nodeId = node ? node.id : null;
        }
    }

    function onNodeContextMenu(e, node) {
        contextMenu.show = true; contextMenu.nodeId = node.id; contextMenu.groupId = null;
        const rect = treePanel.value.getBoundingClientRect();
        contextMenu.x = e.clientX - rect.left; contextMenu.y = e.clientY - rect.top;
        Object.assign(contextMenu, screenToWorld(contextMenu.x, contextMenu.y, panX.value, panY.value, viewScale.value));
    }

    function onGroupContextMenu(e, groupId) {
        contextMenu.show = true; contextMenu.nodeId = null; contextMenu.groupId = groupId;
        const rect = treePanel.value.getBoundingClientRect();
        contextMenu.x = e.clientX - rect.left; contextMenu.y = e.clientY - rect.top;
        const wp = screenToWorld(contextMenu.x, contextMenu.y, panX.value, panY.value, viewScale.value);
        contextMenu.worldX = wp.x; contextMenu.worldY = wp.y;
    }

    function closeContextMenu() { contextMenu.show = false; contextMenu.nodeId = null; contextMenuFocusIndex.value = -1; }

    function contextZoomToNode() {
        if (contextMenu.nodeId) { const node = treeNodes.value.find(n => n.id === contextMenu.nodeId); if (node && ops.zoomToNode) ops.zoomToNode(node); }
        closeContextMenu();
    }

    function contextCopyId() {
        if (contextMenu.nodeId) {
            navigator.clipboard.writeText(contextMenu.nodeId)
                .then(() => ops.showToast('已复制章节 ID：' + contextMenu.nodeId))
                .catch(() => ops.showToast('复制失败，ID：' + contextMenu.nodeId));
        }
        closeContextMenu();
    }

    function contextDeleteChapter() {
        if (contextMenu.nodeId) { if (ops.selectNode) ops.selectNode(contextMenu.nodeId); setTimeout(() => { if (ops.deleteChapter) ops.deleteChapter(); }, 0); }
        closeContextMenu();
    }

    function contextDuplicateChapter() {
        if (!contextMenu.nodeId) { closeContextMenu(); return; }
        if (isEndingNode(contextMenu.nodeId)) { ops.showToast('结局节点不支持复制操作'); closeContextMenu(); return; }
        if (ops.saveUndoSnapshot) ops.saveUndoSnapshot();
        const srcSteps = ctx.chapters[contextMenu.nodeId];
        if (!srcSteps) { closeContextMenu(); return; }
        const { uid, clone } = { uid: () => 'chapter_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7), clone: JSON.parse(JSON.stringify) };
        const newId = uid();
        ctx.chapters[newId] = clone(srcSteps);
        if (ctx.nodePositions[contextMenu.nodeId]) ctx.nodePositions[newId] = { ...ctx.nodePositions[contextMenu.nodeId], x: ctx.nodePositions[contextMenu.nodeId].x + 50, y: ctx.nodePositions[contextMenu.nodeId].y + 50 };
        if (ops.selectNode) ops.selectNode(newId);
        ctx.editingStepIndex.value = null;
        ops.showToast(`已复制章节：${contextMenu.nodeId} → ${newId}`);
        closeContextMenu();
    }

    function contextEditEnding() {
        if (contextMenu.nodeId && isEndingNode(contextMenu.nodeId) && ops.selectNode) ops.selectNode(contextMenu.nodeId);
        closeContextMenu();
    }

    function addChapterAtPos(worldX, worldY) {
        if (ops.saveUndoSnapshot) ops.saveUndoSnapshot();
        const newId = 'chapter_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        ctx.chapters[newId] = [{ sceneId:'', type:'dialogue', characterId:null, text:'新对话段落...', effects:[] }, { sceneId:'', type:'jump', jumpChapter:'' }];
        ctx.nodePositions[newId] = { x: worldX, y: worldY };
        if (ops.selectNode) ops.selectNode(newId);
        ctx.editingStepIndex.value = 0;
        ops.showToast(`已在位置创建新章节：${newId}`);
        closeContextMenu();
    }

    function addStepFromContext() {
        if (ops.saveUndoSnapshot) ops.saveUndoSnapshot();
        if (!contextMenu.nodeId) { closeContextMenu(); return; }
        if (isEndingNode(contextMenu.nodeId)) { ops.showToast('结局节点不能添加步骤'); closeContextMenu(); return; }
        if (ops.selectNode) ops.selectNode(contextMenu.nodeId);
        setTimeout(() => { if (ops.addStep) ops.addStep(); }, 0);
        closeContextMenu();
    }

    function onGlobalContextMenu(e) { globalContextMenu.show = true; globalContextMenu.x = e.clientX; globalContextMenu.y = e.clientY; }
    function closeGlobalContextMenu() { globalContextMenu.show = false; globalContextMenu.focusIndex = 0; }

    _watch(() => contextMenu.show, v => { if (v) contextMenuFocusIndex.value = 0; });
    _watch(() => globalContextMenu.show, v => { if (v) globalContextMenu.focusIndex = 0; });

    return { onCanvasContextMenu, onNodeContextMenu, onGroupContextMenu, closeContextMenu, contextZoomToNode, contextCopyId, contextDeleteChapter, contextDuplicateChapter, contextEditEnding, addChapterAtPos, addStepFromContext, onGlobalContextMenu, closeGlobalContextMenu };
}

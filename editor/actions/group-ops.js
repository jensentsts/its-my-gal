/**
 * editor/actions/group-ops.js —— 分组管理操作
 */
import { clone, uid } from '../helpers.js';

const { computed: _computed } = Vue;

export function createGroupOps(ctx, ops) {
    const { editorGroups, selectedNodeIds, nodeStyles, treeNodes } = ctx;
    const { showToast, saveUndoSnapshot, clearNodeSelection } = ops;

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
            name:'分组 ' + (Object.keys(editorGroups).length + 1), color:'#5a8a5a',
            bgColor:'#2a4a2a', bgOpacity:0.25, bgImage:'', nodeIds:[...ids],
            x:minX, y:minY, w:maxX - minX, h:maxY - minY,
        };
        ctx.selectedGroupId.value = groupId;
        showToast(`✅ 已创建分组: ${editorGroups[groupId].name}`);
    }

    function deleteGroup(groupId) {
        if (!groupId || !editorGroups[groupId]) return;
        if (!confirm(`确定删除分组「${editorGroups[groupId].name}」？`)) return;
        saveUndoSnapshot();
        delete editorGroups[groupId];
        if (ctx.selectedGroupId.value === groupId) ctx.selectedGroupId.value = null;
        showToast('已删除分组');
    }

    function renameGroup(groupId) {
        const name = prompt('分组名称:', editorGroups[groupId]?.name || '');
        if (name) editorGroups[groupId].name = name;
    }

    function addNodeToGroup(groupId, nodeId) {
        const grp = editorGroups[groupId];
        if (!grp || grp.nodeIds.includes(nodeId)) return;
        grp.nodeIds.push(nodeId);
        updateGroupBounds(groupId);
    }

    function removeNodeFromGroup(groupId, nodeId) {
        const grp = editorGroups[groupId];
        if (!grp) return;
        const idx = grp.nodeIds.indexOf(nodeId);
        if (idx === -1) return;
        grp.nodeIds.splice(idx, 1);
        if (grp.nodeIds.length === 0) deleteGroup(groupId);
        else updateGroupBounds(groupId);
    }

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

    function selectGroup(groupId) {
        ctx.selectedGroupId.value = groupId;
        const grp = editorGroups[groupId];
        if (grp) {
            if (clearNodeSelection) clearNodeSelection();
            for (const nid of grp.nodeIds) selectedNodeIds[nid] = true;
        }
    }

    function getNodeGroups(nodeId) {
        return Object.entries(editorGroups)
            .filter(([_, grp]) => grp.nodeIds.includes(nodeId))
            .map(([gid, grp]) => ({ id: gid, ...grp }));
    }

    function updateGroupsForNode(nodeId) {
        for (const gid of Object.keys(editorGroups)) {
            if (editorGroups[gid].nodeIds.includes(nodeId)) updateGroupBounds(gid);
        }
    }

    function contextAddToGroup(groupId) {
        for (const nid of Object.keys(selectedNodeIds)) addNodeToGroup(groupId, nid);
        if (ops.closeContextMenu) ops.closeContextMenu();
    }

    function contextRemoveFromGroup(groupId) {
        if (ctx.contextMenu?.nodeId) removeNodeFromGroup(groupId, ctx.contextMenu.nodeId);
        if (ops.closeContextMenu) ops.closeContextMenu();
    }

    function applyBatchStyle(prop, value) {
        saveUndoSnapshot();
        for (const id of Object.keys(selectedNodeIds)) {
            if (!nodeStyles[id]) nodeStyles[id] = {};
            nodeStyles[id][prop] = value;
        }
    }

    const batchCommonProps = _computed(() => {
        const ids = Object.keys(selectedNodeIds);
        if (ids.length < 2) return null;
        const styles = ids.map(id => nodeStyles[id] || {}).filter(Boolean);
        const common = {};
        if (styles.every(s => s.color !== undefined && s.color === styles[0].color)) common.color = styles[0].color;
        if (styles.every(s => s.bgColor !== undefined && s.bgColor === styles[0].bgColor)) common.bgColor = styles[0].bgColor;
        if (styles.every(s => s.icon !== undefined && s.icon === styles[0].icon)) common.icon = styles[0].icon;
        return Object.keys(common).length > 0 ? common : null;
    });

    return {
        createGroupFromSelection, deleteGroup, renameGroup,
        addNodeToGroup, removeNodeFromGroup, updateGroupBounds,
        selectGroup, getNodeGroups, updateGroupsForNode,
        contextAddToGroup, contextRemoveFromGroup,
        applyBatchStyle, batchCommonProps,
    };
}

/**
 * editor/interaction/canvas.js
 *
 * 画布交互 —— 鼠标事件、节点/端口/连线拖拽、节点缩放
 */
import { getPerimeterPoint, screenToWorld } from '../helpers.js';

const { computed: _computed } = Vue;

export function createCanvas(ctx, ops) {
    const { treePanel, viewScale, panX, panY, dragging, panning, selection, selectedNodeIds, treeNodes, portDragging, resizingNode, chapters, nodePositions, nodeStyles, selectedEdge, selectedChapterId, selectedEndingId } = ctx;

    // ═══ 画布鼠标事件 ═══
    function onCanvasMouseDown(e) {
        if (e.button === 1) {
            panning.active = true; panning.startX = e.clientX; panning.startY = e.clientY;
            panning.origPanX = panX.value; panning.origPanY = panY.value;
            // window 级 mousemove/mouseup 确保浏览器 autoscroll 不干扰
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
            e.preventDefault(); return;
        }
        if (e.button === 0) {
            const isCanvas = e.target === treePanel.value || e.target.classList.contains('tree-world') || e.target.classList.contains('tree-svg') || e.target.classList.contains('tree-nodes-layer') || e.target.classList.contains('tree-empty');
            if (isCanvas) {
                const rect = treePanel.value.getBoundingClientRect();
                selection.active = true; selection.startX = e.clientX - rect.left; selection.startY = e.clientY - rect.top;
                selection.endX = selection.startX; selection.endY = selection.startY;
            }
        }
    }

    function onCanvasMouseMove(e) {
        const panelRect = treePanel.value ? treePanel.value.getBoundingClientRect() : null;
        if (panning.active) {
            panX.value = panning.origPanX + (e.clientX - panning.startX);
            panY.value = panning.origPanY + (e.clientY - panning.startY);
        }
        if (selection.active && panelRect) { selection.endX = e.clientX - panelRect.left; selection.endY = e.clientY - panelRect.top; }
        if (dragging.active) {
            const dx = (e.clientX - dragging.startX) / viewScale.value;
            const dy = (e.clientY - dragging.startY) / viewScale.value;
            if (dragging.multiDrag) {
                for (const [nid, startPos] of Object.entries(dragging.nodeStartPositions)) {
                    if (nodePositions[nid] !== undefined) {
                        nodePositions[nid] = { x: startPos.x + dx, y: startPos.y + dy };
                        if (ops.updateGroupsForNode) ops.updateGroupsForNode(nid);
                    }
                }
            } else {
                nodePositions[dragging.nodeId] = { x: dragging.nodeStartX + dx, y: dragging.nodeStartY + dy };
                if (ops.updateGroupsForNode) ops.updateGroupsForNode(dragging.nodeId);
            }
        }
    }

    function onCanvasMouseUp() {
        if (selection.active) {
            const left = Math.min(selection.startX, selection.endX);
            const top = Math.min(selection.startY, selection.endY);
            const right = Math.max(selection.startX, selection.endX);
            const bottom = Math.max(selection.startY, selection.endY);
            if (right - left > 4 || bottom - top > 4) {
                const selected = getNodesInRect(left, top, right, bottom);
                if (ops.clearNodeSelection) ops.clearNodeSelection();
                for (const node of selected) selectedNodeIds[node.id] = true;
                if (selected.length > 0 && ops.selectNode) ops.selectNode(selected[0].id);
            } else { if (ops.clearSelection) ops.clearSelection(); }
            selection.active = false;
        }
        panning.active = false; dragging.active = false; dragging.nodeId = null;
    }

    function getNodesInRect(screenLeft, screenTop, screenRight, screenBottom) {
        const vs = viewScale.value, px = panX.value, py = panY.value;
        const result = [];
        for (const node of treeNodes.value) {
            const sp = { x: node.x * vs + px, y: node.y * vs + py };
            if (sp.x >= screenLeft && sp.x <= screenRight && sp.y >= screenTop && sp.y <= screenBottom) result.push(node);
        }
        return result;
    }

    function onNodeMouseDown(e, node) {
        if (e.button !== 0) return;
        if (ctx.saveUndoSnapshot) ctx.saveUndoSnapshot();
        dragging.active = true; dragging.nodeId = node.id; dragging.startX = e.clientX; dragging.startY = e.clientY;
        if (selectedNodeIds[node.id] && Object.keys(selectedNodeIds).length > 1) {
            dragging.multiDrag = true; dragging.nodeStartPositions = {};
            for (const nid of Object.keys(selectedNodeIds)) {
                if (nodePositions[nid]) dragging.nodeStartPositions[nid] = { x: nodePositions[nid].x, y: nodePositions[nid].y };
            }
        } else { dragging.multiDrag = false; dragging.nodeStartX = node.x; dragging.nodeStartY = node.y; }
    }

    // ═══ 曲线（边）交互 ═══
    let edgeDragState = null;

    function onEdgeClick(edge) { selectedEdge.value = edge; ctx.showToast(`选中连线: ${edge.from} → ${edge.to}`); }

    function onEdgeMouseDown(e, edge) {
        if (e.button !== 0) return;
        const fromNode = treeNodes.value.find(n => n.id === edge.from);
        const toNode = treeNodes.value.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;
        edgeDragState = { edge, fromNode, toNode, isDragging: false };
        const rect = treePanel.value.getBoundingClientRect();
        edgeDragState.startX = e.clientX - rect.left; edgeDragState.startY = e.clientY - rect.top;
    }

    function onEdgeHandleMouseDown(e, edge) {
        if (e.button !== 0) return;
        const fromNode = treeNodes.value.find(n => n.id === edge.from);
        if (!fromNode) return;
        const bp = (fromNode.bottomPorts || []).find(p => p.targetId === edge.to);
        if (!bp) return;
        portDragging.active = true; portDragging.fromNodeId = edge.from; portDragging.fromPortIdx = bp.portIdx;
        portDragging.fromStepIdx = bp.stepIdx; portDragging.fromChoiceIdx = bp.choiceIdx;
        portDragging.isEndingPort = !!bp.isEnding; portDragging.mouseX = e.clientX; portDragging.mouseY = e.clientY;
        const onMove = ev => { portDragging.mouseX = ev.clientX; portDragging.mouseY = ev.clientY; };
        const onUp = ev => {
            portDragging.active = false; portDragging.isEndingPort = false;
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            const rect = treePanel.value.getBoundingClientRect();
            const sx = ev.clientX - rect.left; const sy = ev.clientY - rect.top;
            const wp = screenToWorld(sx, sy, panX.value, panY.value, viewScale.value);
            const snapped = findSnapTarget(wp);
            const target = snapped || treeNodes.value.find(n => {
                if (n.id === edge.from) return false;
                if (bp.isEnding && !n.id.startsWith('_end_')) return false;
                const dx = Math.abs(n.x - wp.x); const dy = Math.abs(n.y - wp.y);
                return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
            });
            if (target && ops.updatePortTarget) { ops.updatePortTarget(bp, target.id); }
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }

    function findSnapTarget(worldPos, threshold = 40) {
        const snapDist = threshold / viewScale.value;
        let best = null, bestDist = snapDist;
        for (const node of treeNodes.value) {
            const dist = Math.sqrt((node.x - worldPos.x) ** 2 + (node.y - worldPos.y) ** 2);
            if (dist < bestDist) { bestDist = dist; best = node; }
        }
        return best;
    }

    // ═══ 端口拖拽 ═══
    function startPortDrag(e, nodeId, portIdx, port) {
        if (port.isEnding) {
            portDragging.active = true; portDragging.fromNodeId = nodeId; portDragging.fromPortIdx = portIdx;
            portDragging.fromStepIdx = port.stepIdx; portDragging.fromChoiceIdx = port.choiceIdx;
            portDragging.isEndingPort = true; portDragging.snapTargetId = null;
            portDragging.mouseX = e.clientX; portDragging.mouseY = e.clientY;
            const onMove = ev => { portDragging.mouseX = ev.clientX; portDragging.mouseY = ev.clientY; };
            const onUp = ev => {
                portDragging.active = false; portDragging.isEndingPort = false;
                document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                const targetId = portDragging.snapTargetId;
                if (targetId) {
                    if (!targetId.startsWith('_end_')) { ctx.showToast('❌ 结局触发端口只能连接到结局节点'); return; }
                    if (ops.updatePortTarget) ops.updatePortTarget(port, targetId);
                } else {
                    const rect = treePanel.value.getBoundingClientRect();
                    const wp = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, panX.value, panY.value, viewScale.value);
                    const target = treeNodes.value.find(n => {
                        if (n.id === nodeId || !n.id.startsWith('_end_')) return false;
                        const dx = Math.abs(n.x - wp.x); const dy = Math.abs(n.y - wp.y);
                        return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                    });
                    if (target && ops.updatePortTarget) ops.updatePortTarget(port, target.id);
                }
                portDragging.snapTargetId = null;
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            return;
        }
        portDragging.active = true; portDragging.fromNodeId = nodeId; portDragging.fromPortIdx = portIdx;
        portDragging.fromStepIdx = port.stepIdx; portDragging.fromChoiceIdx = port.choiceIdx;
        portDragging.isEndingPort = false; portDragging.snapTargetId = null;
        portDragging.mouseX = e.clientX; portDragging.mouseY = e.clientY;
        const onMove = ev => { portDragging.mouseX = ev.clientX; portDragging.mouseY = ev.clientY; };
        const onUp = ev => {
            portDragging.active = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            const targetId = portDragging.snapTargetId;
            if (targetId && ops.updatePortTarget) { ops.updatePortTarget(port, targetId); }
            else {
                const rect = treePanel.value.getBoundingClientRect();
                const wp = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, panX.value, panY.value, viewScale.value);
                const target = treeNodes.value.find(n => {
                    if (n.id === nodeId) return false;
                    const dx = Math.abs(n.x - wp.x); const dy = Math.abs(n.y - wp.y);
                    return dx < (n.width || 200) / 2 + 30 && dy < (n.height || 90) / 2 + 30;
                });
                if (target && ops.updatePortTarget) ops.updatePortTarget(port, target.id);
            }
            portDragging.snapTargetId = null;
        };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }

    function jumpToPortTarget(port) {
        const tid = port.targetId;
        if (tid.startsWith('_end_')) { ctx.showToast('结局: ' + (treeNodes.value.find(n => n.id === tid)?.firstText || tid)); return; }
        const targetNode = treeNodes.value.find(n => n.id === tid);
        if (targetNode) { if (ops.selectNode) ops.selectNode(targetNode.id); if (ops.zoomToNode) ops.zoomToNode(targetNode); }
    }

    const portDragCurve = _computed(() => {
        if (!portDragging.active) return '';
        const fromNode = treeNodes.value.find(n => n.id === portDragging.fromNodeId);
        if (!fromNode) return '';
        const rect = treePanel.value?.getBoundingClientRect();
        if (!rect) return '';
        const wp = screenToWorld(portDragging.mouseX - rect.left, portDragging.mouseY - rect.top, panX.value, panY.value, viewScale.value);
        const bp = (fromNode.bottomPorts || [])[portDragging.fromPortIdx];
        if (!bp) return '';
        const x1 = bp.pxWorld, y1 = bp.pyWorld;
        const snapThreshold = 50 / viewScale.value;
        let snapTarget = null, snapDist = snapThreshold;
        for (const node of treeNodes.value) {
            if (node.id === portDragging.fromNodeId) continue;
            if (portDragging.isEndingPort && !node.id.startsWith('_end_')) continue;
            const dist = Math.sqrt((node.x - wp.x) ** 2 + (node.y - wp.y) ** 2);
            if (dist < snapDist) { snapDist = dist; snapTarget = node; }
        }
        portDragging.snapTargetId = snapTarget ? snapTarget.id : null;
        let endX = wp.x, endY = wp.y;
        if (snapTarget) { const pp = getPerimeterPoint(snapTarget, { x: x1, y: y1 }, wp); endX = pp.x; endY = pp.y; }
        const dy2 = Math.abs(endY - y1);
        const cpOffset = Math.max(50, dy2 * 0.5);
        return `M ${x1} ${y1} C ${x1} ${y1 + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
    });

    // ═══ 节点缩放 ═══
    function startNodeResize(e, node, edge) {
        e.preventDefault(); e.stopPropagation();
        resizingNode.active = true; resizingNode.nodeId = node.id; resizingNode.edge = edge;
        resizingNode.startX = e.clientX; resizingNode.startY = e.clientY;
        resizingNode.startW = node.width || 200; resizingNode.startH = node.height || 90;
        const onMove = ev => {
            const dx = (ev.clientX - resizingNode.startX) / viewScale.value;
            const dy = (ev.clientY - resizingNode.startY) / viewScale.value;
            if (!nodeStyles[resizingNode.nodeId]) nodeStyles[resizingNode.nodeId] = {};
            const st = nodeStyles[resizingNode.nodeId];
            if (edge === 'e' || edge === 'se') st.width = Math.max(140, resizingNode.startW + dx);
            if (edge === 'se') st.height = Math.max(50, resizingNode.startH + dy);
        };
        const onUp = () => { resizingNode.active = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }

    return { onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp, onNodeMouseDown, onEdgeClick, onEdgeMouseDown, onEdgeHandleMouseDown, findSnapTarget, startPortDrag, jumpToPortTarget, portDragCurve, startNodeResize };
}

/**
 * editor/editor-events.js
 *
 * Vue 3 组合式 —— 事件处理、键盘快捷键、生命周期
 */
// Vue APIs from global (Vue loaded via CDN <script> tag)
const { watch, onMounted, onUnmounted } = Vue;
import { isInputFocused } from './utils.js';

/**
 * @param {Object} s - useEditorState() 返回的状态引用
 * @param {Object} c - useEditorComputed(s) 返回的计算属性
 * @param {Object} a - useEditorActions(s, c) 返回的操作方法
 * @returns {Object} 事件处理函数和生命周期注册方法
 */
export function useEditorEvents(s, c, a) {
    // ── 生命周期 ──────────────────────────────────────────────
    const _preventContextMenu = e => e.preventDefault();

    function setupLifecycle() {
        onMounted(() => {
            a.autoLayout();
            window.addEventListener('mouseup', onCanvasMouseUp);
            document.addEventListener('contextmenu', _preventContextMenu, true);
            document.addEventListener('selectstart', onGlobalSelectStart);
            document.addEventListener('dragstart', onGlobalDragStart);
            document.addEventListener('keydown', onGlobalKeyDown);
        });

        onUnmounted(() => {
            window.removeEventListener('mouseup', onCanvasMouseUp);
            document.removeEventListener('contextmenu', _preventContextMenu, true);
            document.removeEventListener('selectstart', onGlobalSelectStart);
            document.removeEventListener('dragstart', onGlobalDragStart);
            document.removeEventListener('keydown', onGlobalKeyDown);
        });
    }

    // ── 画布鼠标事件 ───────────────────────────────────────────
    function onCanvasMouseDown(e) {
        if (e.button === 1) {
            s.panning.active = true;
            s.panning.startX = e.clientX;
            s.panning.startY = e.clientY;
            s.panning.origPanX = s.panX.value;
            s.panning.origPanY = s.panY.value;
            e.preventDefault();
            return;
        }

        if (e.button === 0) {
            const isCanvas = e.target === s.treePanel.value
                || e.target.classList.contains('tree-world')
                || e.target.classList.contains('tree-svg')
                || e.target.classList.contains('tree-nodes-layer')
                || e.target.classList.contains('tree-empty');
            if (isCanvas) {
                const rect = s.treePanel.value.getBoundingClientRect();
                s.selection.active = true;
                s.selection.startX = e.clientX - rect.left;
                s.selection.startY = e.clientY - rect.top;
                s.selection.endX = s.selection.startX;
                s.selection.endY = s.selection.startY;
            }
        }
    }

    function onCanvasMouseMove(e) {
        const panelRect = s.treePanel.value ? s.treePanel.value.getBoundingClientRect() : null;

        if (s.panning.active) {
            s.panX.value = s.panning.origPanX + (e.clientX - s.panning.startX);
            s.panY.value = s.panning.origPanY + (e.clientY - s.panning.startY);
        }
        if (s.selection.active && panelRect) {
            s.selection.endX = e.clientX - panelRect.left;
            s.selection.endY = e.clientY - panelRect.top;
        }
        if (s.dragging.active) {
            const dx = (e.clientX - s.dragging.startX) / s.viewScale.value;
            const dy = (e.clientY - s.dragging.startY) / s.viewScale.value;
            if (s.dragging.multiDrag) {
                for (const [nid, startPos] of Object.entries(s.dragging.nodeStartPositions)) {
                    if (s.nodePositions[nid] !== undefined) {
                        s.nodePositions[nid] = { x: startPos.x + dx, y: startPos.y + dy };
                        a.updateGroupsForNode(nid);
                    }
                }
            } else {
                s.nodePositions[s.dragging.nodeId] = {
                    x: s.dragging.nodeStartX + dx,
                    y: s.dragging.nodeStartY + dy,
                };
                a.updateGroupsForNode(s.dragging.nodeId);
            }
        }
    }

    function onCanvasMouseUp() {
        if (s.selection.active) {
            const left = Math.min(s.selection.startX, s.selection.endX);
            const top = Math.min(s.selection.startY, s.selection.endY);
            const right = Math.max(s.selection.startX, s.selection.endX);
            const bottom = Math.max(s.selection.startY, s.selection.endY);
            const w = right - left;
            const h = bottom - top;

            if (w > 4 || h > 4) {
                const selected = c.getNodesInRect(left, top, right, bottom);
                a.clearNodeSelection();
                for (const node of selected) {
                    s.selectedNodeIds[node.id] = true;
                }
                if (selected.length > 0) {
                    a.selectNode(selected[0].id);
                }
            } else {
                a.clearNodeSelection();
                s.selectedChapterId.value = null;
                s.selectedEndingId.value = null;
                s.editingStepIndex.value = null;
            }
            s.selection.active = false;
        }

        s.panning.active = false;
        if (s.dragging.active) {
            s.dragging.active = false;
            s.dragging.nodeId = null;
        }
    }

    // ── 节点拖拽 ──────────────────────────────────────────────
    function onNodeMouseDown(e, node) {
        if (e.button !== 0) return;
        s.dragging.active = true;
        s.dragging.nodeId = node.id;
        s.dragging.startX = e.clientX;
        s.dragging.startY = e.clientY;

        if (s.selectedNodeIds[node.id] && Object.keys(s.selectedNodeIds).length > 1) {
            s.dragging.multiDrag = true;
            s.dragging.nodeStartPositions = {};
            for (const nid of Object.keys(s.selectedNodeIds)) {
                if (s.nodePositions[nid]) {
                    s.dragging.nodeStartPositions[nid] = { x: s.nodePositions[nid].x, y: s.nodePositions[nid].y };
                }
            }
        } else {
            s.dragging.multiDrag = false;
            s.dragging.nodeStartX = node.x;
            s.dragging.nodeStartY = node.y;
        }
    }

    // ── 右键菜单 ──────────────────────────────────────────────
    function onCanvasContextMenu(e) {
        const rect = s.treePanel.value.getBoundingClientRect();
        s.contextMenu.show = true;
        s.contextMenu.x = e.clientX - rect.left;
        s.contextMenu.y = e.clientY - rect.top;
        const wp = c.screenToWorld(s.contextMenu.x, s.contextMenu.y);
        s.contextMenu.worldX = wp.x;
        s.contextMenu.worldY = wp.y;
        if (!s.contextMenu.nodeId) {
            const clickedNode = c.treeNodes.value.find(n => {
                const dx = Math.abs(n.x - wp.x);
                const dy = Math.abs(n.y - wp.y);
                return dx < 100 && dy < 45;
            });
            s.contextMenu.nodeId = clickedNode ? clickedNode.id : null;
        }
    }

    function onNodeContextMenu(e, node) {
        s.contextMenu.show = true;
        s.contextMenu.nodeId = node.id;
        s.contextMenu.groupId = null;
        const rect = s.treePanel.value.getBoundingClientRect();
        s.contextMenu.x = e.clientX - rect.left;
        s.contextMenu.y = e.clientY - rect.top;
        const wp = c.screenToWorld(s.contextMenu.x, s.contextMenu.y);
        s.contextMenu.worldX = wp.x;
        s.contextMenu.worldY = wp.y;
    }

    function onGroupContextMenu(e, groupId) {
        s.contextMenu.show = true;
        s.contextMenu.nodeId = null;
        s.contextMenu.groupId = groupId;
        const rect = s.treePanel.value.getBoundingClientRect();
        s.contextMenu.x = e.clientX - rect.left;
        s.contextMenu.y = e.clientY - rect.top;
        const wp = c.screenToWorld(s.contextMenu.x, s.contextMenu.y);
        s.contextMenu.worldX = wp.x;
        s.contextMenu.worldY = wp.y;
    }

    // ── 全局右键菜单 ──────────────────────────────────────────
    function onGlobalContextMenu(e) {
        s.globalContextMenu.show = true;
        s.globalContextMenu.x = e.clientX;
        s.globalContextMenu.y = e.clientY;
    }

    // ── 全局悬浮提示 ──────────────────────────────────────────
    function onGlobalMouseOver(e) {
        const target = e.target.closest('[data-tooltip]') || e.target.closest('[title]');
        if (target) {
            const text = target.getAttribute('data-tooltip') || target.getAttribute('title');
            if (text) {
                s.tooltip.show = true;
                s.tooltip.text = text;
                s.tooltip.x = e.clientX + 14;
                s.tooltip.y = e.clientY - 8;
            }
        }
    }

    function onGlobalMouseOut() {
        s.tooltip.show = false;
    }

    // ── 全局禁止文本选中（输入框等不受影响） ──────────────────
    function onGlobalSelectStart(e) {
        if (!isInputFocused()) e.preventDefault();
    }

    function onGlobalDragStart(e) {
        if (e.target.tagName === 'IMG') e.preventDefault();
    }

    // ── 全局键盘快捷键 ────────────────────────────────────────
    function onGlobalKeyDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const key = e.key;

        // ── 在输入框中依然生效的快捷键 ──
        if (key === 'Escape') {
            if (s.contextMenu.show) { a.closeContextMenu(); e.preventDefault(); return; }
            if (s.globalContextMenu.show) { a.closeGlobalContextMenu(); e.preventDefault(); return; }
            if (s.showGameSettings.value) { s.showGameSettings.value = false; e.preventDefault(); return; }
            if (s.showResourceManager.value) { s.showResourceManager.value = false; e.preventDefault(); return; }
            if (s.showExportModal.value) { s.showExportModal.value = false; e.preventDefault(); return; }
            if (s.showEffectsManager.value) { s.showEffectsManager.value = false; e.preventDefault(); return; }
            if (s.showFileMenu.value) { s.showFileMenu.value = false; e.preventDefault(); return; }
            if (s.editingGlobalSearch.value) { a.endGlobalSearch(); e.preventDefault(); return; }
            if (s.showZoomInput.value) { s.showZoomInput.value = false; e.preventDefault(); return; }
            if (s.selectedChapterId.value || s.selectedEndingId.value) {
                s.selectedChapterId.value = null;
                s.selectedEndingId.value = null;
                s.editingStepIndex.value = null;
                a.clearNodeSelection();
                e.preventDefault();
            }
            return;
        }

        // ── 以下快捷键在输入框中不生效 ──
        if (isInputFocused()) return;

        if (ctrl && key === 'n') {
            e.preventDefault();
            if (shift) a.addEndingNode(); else a.addChapter();
            return;
        }
        if (ctrl && !shift && key === 's') { e.preventDefault(); a.syncToGame(); return; }
        if (ctrl && !shift && key === 'f') { e.preventDefault(); a.startGlobalSearch(); return; }
        if (ctrl && !shift && key === 'd') {
            e.preventDefault();
            if (s.selectedChapterId.value) {
                s.contextMenu.nodeId = s.selectedChapterId.value;
                a.contextDuplicateChapter();
            } else { a.showToast('请先选中一个章节'); }
            return;
        }
        if (key === 'Delete' || key === 'Backspace') {
            const multiIds = Object.keys(s.selectedNodeIds);
            if (multiIds.length > 1) { e.preventDefault(); a.deleteChapter(multiIds); }
            else if (s.selectedChapterId.value || s.selectedEndingId.value) { e.preventDefault(); a.deleteChapter(); }
            return;
        }
        if (key === 'Home') {
            e.preventDefault();
            const nodes = c.treeNodes.value;
            if (nodes.length === 0) return;
            const target = nodes.find(n => n.id === 'main') || nodes[0];
            a.selectNode(target.id);
            a.zoomToNode(target);
            return;
        }
        if (key === 'End') {
            e.preventDefault();
            const nodes = c.treeNodes.value;
            if (nodes.length === 0) return;
            const target = nodes[nodes.length - 1];
            a.selectNode(target.id);
            a.zoomToNode(target);
            return;
        }
        if (key === '=' || key === '+') { e.preventDefault(); a.zoomIn(); return; }
        if (key === '-' || key === '_') { e.preventDefault(); a.zoomOut(); return; }
        if (ctrl && !shift && key === 'a') {
            e.preventDefault();
            c.treeNodes.value.forEach(n => { s.selectedNodeIds[n.id] = true; });
            a.showToast(`已选中 ${Object.keys(s.selectedNodeIds).length} 个节点`);
            return;
        }
        if (ctrl && !shift && key === 'e') { e.preventDefault(); a.exportJSON(); return; }
        if (ctrl && shift && key === 'e') { e.preventDefault(); a.exportAll(); return; }
        if (ctrl && !shift && key === 'z') { e.preventDefault(); a.showToast('⚠ 撤销功能暂未实现（可手动还原）'); return; }
        if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) { e.preventDefault(); a.showToast('⚠ 重做功能暂未实现'); return; }
        if (key === '0' && ctrl) { e.preventDefault(); a.resetView(); return; }

        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
            if (!s.selectedChapterId.value) {
                const nodes = c.treeNodes.value;
                if (nodes.length > 0) { a.selectNode(nodes[0].id); a.zoomToNode(nodes[0]); }
                e.preventDefault();
                return;
            }
            const nodes = c.treeNodes.value;
            const idx = nodes.findIndex(n => n.id === s.selectedChapterId.value);
            if (idx === -1) return;
            let targetIdx = idx;
            if (key === 'ArrowDown') targetIdx = Math.min(idx + 1, nodes.length - 1);
            else if (key === 'ArrowUp') targetIdx = Math.max(idx - 1, 0);
            else if (key === 'ArrowRight') targetIdx = Math.min(idx + 1, nodes.length - 1);
            else if (key === 'ArrowLeft') targetIdx = Math.max(idx - 1, 0);
            if (targetIdx !== idx) {
                e.preventDefault();
                a.selectNode(nodes[targetIdx].id);
                a.zoomToNode(nodes[targetIdx]);
            }
        }
    }

    // ── Watches ────────────────────────────────────────────────
    function setupWatches() {
        // 同步 editingChapterId ← selectedChapterId
        watch(s.selectedChapterId, (newId) => {
            s.editingChapterId.value = newId || '';
        }, { immediate: true });

        // 同步 zoomPercent ← viewScale
        watch(s.viewScale, (scl) => { s.zoomPercent.value = Math.round(scl * 100); });

        // 文件菜单自动关闭
        watch(s.showFileMenu, (v) => {
            if (v) setTimeout(() => document.addEventListener('click', () => { s.showFileMenu.value = false; }, { once: true }), 100);
        });
    }

    // ── 自动执行生命周期和 watch ────────────────────────────
    setupLifecycle();
    setupWatches();

    return {
        onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp,
        onNodeMouseDown,
        onCanvasContextMenu, onNodeContextMenu, onGroupContextMenu,
        onGlobalContextMenu,
        onGlobalKeyDown, onGlobalSelectStart, onGlobalDragStart,
        onGlobalMouseOver, onGlobalMouseOut,
    };
}

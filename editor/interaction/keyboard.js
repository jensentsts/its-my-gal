/**
 * editor/interaction/keyboard.js —— 全局键盘快捷键
 */
export function createKeyboard(ctx, ops) {
    const { contextMenu, globalContextMenu, showGameSettings, showResourceManager, showExportModal, showFileMenu, editingGlobalSearch, showZoomInput, selectedChapterId, selectedEndingId, selectedEdge, contextMenuFocusIndex, treeNodes, chapters, selectedNodeIds, editingSteps, editingStepIndex, globalContextMenu: gcm } = ctx;

    function isInputFocused() {
        const tag = document.activeElement?.tagName || '';
        const editable = document.activeElement?.getAttribute('contenteditable');
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable === 'true';
    }

    function onGlobalKeyDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        const key = e.key;

        // Escape
        if (key === 'Escape') {
            if (contextMenu.show) { ops.closeContextMenu(); e.preventDefault(); return; }
            if (globalContextMenu.show) { ops.closeGlobalContextMenu(); e.preventDefault(); return; }
            if (showGameSettings.value) { showGameSettings.value = false; e.preventDefault(); return; }
            if (showResourceManager.value) { showResourceManager.value = false; e.preventDefault(); return; }
            if (showExportModal.value) { showExportModal.value = false; e.preventDefault(); return; }
            if (showFileMenu.value) { showFileMenu.value = false; e.preventDefault(); return; }
            if (editingGlobalSearch.value) { ops.endGlobalSearch(); e.preventDefault(); return; }
            if (showZoomInput.value) { showZoomInput.value = false; e.preventDefault(); return; }
            if (selectedChapterId.value || selectedEndingId.value || selectedEdge.value) {
                if (ops.clearSelection) ops.clearSelection(); e.preventDefault();
            }
            return;
        }

        // 右键菜单键盘导航
        if (contextMenu.show) {
            e.preventDefault();
            const items = document.querySelectorAll('.tree-context-menu .context-menu-item');
            if (key === 'ArrowDown') { contextMenuFocusIndex.value = Math.min(contextMenuFocusIndex.value + 1, items.length - 1); items[contextMenuFocusIndex.value]?.focus(); }
            else if (key === 'ArrowUp') { contextMenuFocusIndex.value = Math.max(contextMenuFocusIndex.value - 1, 0); items[contextMenuFocusIndex.value]?.focus(); }
            else if ((key === 'Enter' || key === ' ') && contextMenuFocusIndex.value >= 0 && items[contextMenuFocusIndex.value]) items[contextMenuFocusIndex.value].click();
            return;
        }
        if (globalContextMenu.show) {
            e.preventDefault();
            const items = document.querySelectorAll('.global-context-menu .context-menu-item');
            const gIdx = globalContextMenu.focusIndex || 0;
            if (key === 'ArrowDown') { globalContextMenu.focusIndex = Math.min(gIdx + 1, items.length - 1); items[globalContextMenu.focusIndex]?.focus(); }
            else if (key === 'ArrowUp') { globalContextMenu.focusIndex = Math.max(gIdx - 1, 0); items[globalContextMenu.focusIndex]?.focus(); }
            else if ((key === 'Enter' || key === ' ') && items[gIdx]) items[gIdx].click();
            return;
        }

        if (isInputFocused()) return;

        // Ctrl+N / Ctrl+Shift+N: 新建章节/结局
        if (ctrl && key === 'n') { e.preventDefault(); if (shift && ops.addEndingNode) ops.addEndingNode(); else if (ops.addChapter) ops.addChapter(); return; }
        // Ctrl+S: 同步
        if (ctrl && !shift && key === 's') { e.preventDefault(); if (ops.syncToGame) ops.syncToGame(); return; }
        // Ctrl+F: 搜索
        if (ctrl && !shift && key === 'f') { e.preventDefault(); if (ops.startGlobalSearch) ops.startGlobalSearch(); return; }
        // Ctrl+D: 复制章节
        if (ctrl && !shift && key === 'd') {
            e.preventDefault();
            if (selectedChapterId.value) { ctx.contextMenu.nodeId = selectedChapterId.value; if (ops.contextDuplicateChapter) ops.contextDuplicateChapter(); }
            else ctx.showToast('请先选中一个章节');
            return;
        }
        // Delete/Backspace: 删除连线或节点
        if (key === 'Delete' || key === 'Backspace') {
            if (selectedEdge.value) {
                e.preventDefault();
                const edge = selectedEdge.value;
                const fromNode = treeNodes.value.find(n => n.id === edge.from);
                if (fromNode) {
                    const bp = (fromNode.bottomPorts || []).find(p => p.targetId === edge.to);
                    if (bp) {
                        const steps = chapters[edge.from];
                        if (steps) {
                            const step = steps[bp.stepIdx];
                            if (step) {
                                if (bp.choiceIdx !== undefined && step.choices) step.choices[bp.choiceIdx].jumpChapter = '';
                                else if (step.endingId) step.endingId = '';
                                else step.jumpChapter = '';
                                bp.targetId = ''; bp.hasTarget = false;
                                ctx.showToast(`已删除连线: ${edge.from} → ${edge.to}`);
                            }
                        }
                    }
                }
                selectedEdge.value = null; return;
            }
            const multiIds = Object.keys(selectedNodeIds);
            if (multiIds.length > 1) { e.preventDefault(); if (ops.deleteChapter) ops.deleteChapter(multiIds); }
            else if (selectedChapterId.value || selectedEndingId.value) { e.preventDefault(); if (ops.deleteChapter) ops.deleteChapter(); }
            return;
        }
        // Home: 第一个节点
        if (key === 'Home') {
            e.preventDefault();
            if (treeNodes.value.length === 0) return;
            const target = treeNodes.value.find(n => n.id === 'main') || treeNodes.value[0];
            if (ops.selectNode) ops.selectNode(target.id); if (ops.zoomToNode) ops.zoomToNode(target);
            return;
        }
        // End: 最后一个节点
        if (key === 'End') {
            e.preventDefault();
            if (treeNodes.value.length === 0) return;
            const target = treeNodes.value[treeNodes.value.length - 1];
            if (ops.selectNode) ops.selectNode(target.id); if (ops.zoomToNode) ops.zoomToNode(target);
            return;
        }
        // +/-: 缩放
        if (key === '=' || key === '+') { e.preventDefault(); if (ops.zoomIn) ops.zoomIn(); return; }
        if (key === '-' || key === '_') { e.preventDefault(); if (ops.zoomOut) ops.zoomOut(); return; }
        // Ctrl+A: 全选
        if (ctrl && !shift && key === 'a') {
            e.preventDefault();
            treeNodes.value.forEach(n => { ctx.selectedNodeIds[n.id] = true; });
            ctx.showToast(`已选中 ${Object.keys(ctx.selectedNodeIds).length} 个节点`);
            return;
        }
        // Ctrl+E / Ctrl+Shift+E: 导出
        if (ctrl && !shift && key === 'e') { e.preventDefault(); if (ops.exportJSON) ops.exportJSON(); return; }
        if (ctrl && shift && key === 'e') { e.preventDefault(); if (ops.exportAll) ops.exportAll(); return; }
        // Ctrl+Z / Ctrl+Y: 撤销/重做
        if (ctrl && !shift && key === 'z') { e.preventDefault(); if (ctx.undo) ctx.undo(); return; }
        if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) { e.preventDefault(); if (ctx.redo) ctx.redo(); return; }
        // Ctrl+0: 重置视图
        if (key === '0' && ctrl) { e.preventDefault(); if (ops.resetView) ops.resetView(); return; }

        // 方向键导航
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
            if (!selectedChapterId.value) {
                if (treeNodes.value.length > 0) { if (ops.selectNode) ops.selectNode(treeNodes.value[0].id); if (ops.zoomToNode) ops.zoomToNode(treeNodes.value[0]); }
                e.preventDefault(); return;
            }
            if (selectedChapterId.value && editingSteps?.length > 0) {
                const activeEl = document.activeElement;
                if (activeEl?.closest('.step-detail-panel, .step-list')) {
                    e.preventDefault();
                    if (key === 'ArrowDown' || key === 'ArrowRight') { const next = Math.min(editingStepIndex.value + 1, editingSteps.length - 1); if (next !== editingStepIndex.value && ops.selectStep) ops.selectStep(next); }
                    else { const prev = Math.max(editingStepIndex.value - 1, 0); if (prev !== editingStepIndex.value && ops.selectStep) ops.selectStep(prev); }
                    return;
                }
            }
            const nodes = treeNodes.value;
            const idx = nodes.findIndex(n => n.id === selectedChapterId.value);
            if (idx === -1) return;
            let ti = idx;
            if (key === 'ArrowDown') ti = Math.min(idx + 1, nodes.length - 1);
            else if (key === 'ArrowUp') ti = Math.max(idx - 1, 0);
            else ti = Math.min(Math.max(key === 'ArrowRight' ? idx + 1 : idx - 1, 0), nodes.length - 1);
            if (ti !== idx) { e.preventDefault(); if (ops.selectNode) ops.selectNode(nodes[ti].id); if (ops.zoomToNode) ops.zoomToNode(nodes[ti]); }
        }
    }

    function onGlobalSelectStart(e) { if (!isInputFocused()) e.preventDefault(); }
    function onGlobalDragStart(e) { if (e.target.tagName === 'IMG') e.preventDefault(); }

    return { onGlobalKeyDown, isInputFocused, onGlobalSelectStart, onGlobalDragStart };
}

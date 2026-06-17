/**
 * editor/ui/view-controls.js —— 缩放、平移、面板调整、工具提示、图片拖放
 */
import { computeLayout, computeEndingLayout } from '../tree-layout.js';

export function createViewControls(ctx, ops) {
    const { viewScale, panX, panY, treePanel, treeNodes, showZoomInput, zoomPercent, detailPanelWidth, tooltip, resourceImageTarget, chapters, nodePositions, nodeStyles, gameEndings } = ctx;
    const { showToast } = ops;

    // ═══ 自动布局 ═══
    function autoLayout() {
        const cp = computeLayout(chapters, nodeStyles);
        for (const [id, pos] of Object.entries(cp)) nodePositions[id] = pos;
        const ep = computeEndingLayout(chapters, gameEndings, cp, nodeStyles);
        for (const [id, pos] of Object.entries(ep)) nodePositions[id] = pos;
        showToast('已自动排列节点布局');
    }

    // ═══ 缩放/平移 ═══
    function zoomIn() { viewScale.value = Math.min(2.0, viewScale.value + 0.1); }
    function zoomOut() { viewScale.value = Math.max(0.3, viewScale.value - 0.1); }

    function resetView() {
        const panel = treePanel.value;
        const nodes = treeNodes.value;
        if (!panel || nodes.length === 0) { viewScale.value = 1.0; panX.value = 0; panY.value = 0; return; }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y; }
        const rect = panel.getBoundingClientRect();
        viewScale.value = 1.0; panX.value = rect.width / 2 - (minX + maxX) / 2; panY.value = rect.height / 2 - (minY + maxY) / 2;
    }

    function handleWheel(e) {
        const oldScale = viewScale.value;
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.3, Math.min(2.0, oldScale + delta));
        const rect = treePanel.value.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const wx = (mx - panX.value) / oldScale, wy = (my - panY.value) / oldScale;
        panX.value = mx - wx * newScale; panY.value = my - wy * newScale;
        viewScale.value = newScale;
    }

    function zoomToNode(node) {
        const panel = treePanel.value;
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        panX.value = rect.width / 2 - node.x * viewScale.value;
        panY.value = rect.height / 2 - node.y * viewScale.value;
        if (ops.selectNode) ops.selectNode(node.id);
        ctx.editingStepIndex.value = null;
    }

    function applyZoomPercent() { if (zoomPercent.value >= 30 && zoomPercent.value <= 200) viewScale.value = zoomPercent.value / 100; showZoomInput.value = false; }

    // 同步 zoomPercent 到 viewScale
    const { watch: _watch } = Vue;
    _watch(viewScale, s => { zoomPercent.value = Math.round(s * 100); });

    // ═══ 面板调整宽度 ═══
    function startPanelResize(e) {
        const startX = e.clientX, startW = detailPanelWidth.value;
        const onMove = ev => { detailPanelWidth.value = Math.max(300, Math.min(900, startW + startX - ev.clientX)); };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    }

    // ═══ 自定义悬浮提示 ═══
    function onGlobalMouseOver(e) {
        const t = e.target.closest('[data-tooltip]') || e.target.closest('[title]');
        if (t) {
            const text = t.getAttribute('data-tooltip') || t.getAttribute('title');
            if (text) { tooltip.show = true; tooltip.text = text; tooltip.x = e.clientX + 14; tooltip.y = e.clientY - 8; }
        }
    }
    function onGlobalMouseOut() { tooltip.show = false; }

    // ═══ 资源图片拖放 ═══
    function triggerResourceFile(target) { resourceImageTarget.value = target; document.getElementById('resource-image-input')?.click(); }
    function handleResourceImagePick(event) {
        const file = event.target.files?.[0];
        if (!file || !resourceImageTarget.value) return;
        const url = URL.createObjectURL(file);
        resourceImageTarget.value.url = url; resourceImageTarget.value._fileName = file.name;
        if (!resourceImageTarget.value._blob) resourceImageTarget.value._blob = file;
        resourceImageTarget.value = null; event.target.value = '';
    }
    function onResourceDrop(event, target) {
        const file = event.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        target.url = URL.createObjectURL(file); target._fileName = file.name; target._blob = file;
    }
    function onSpriteDrop(event, sprite) {
        const file = event.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        sprite.url = URL.createObjectURL(file); sprite._fileName = file.name; sprite._blob = file;
    }

    return { autoLayout, zoomIn, zoomOut, resetView, handleWheel, zoomToNode, applyZoomPercent, startPanelResize, onGlobalMouseOver, onGlobalMouseOut, triggerResourceFile, handleResourceImagePick, onResourceDrop, onSpriteDrop };
}

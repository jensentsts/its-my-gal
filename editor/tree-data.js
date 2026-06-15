/**
 * editor/tree-data.js
 *
 * 树结构数据计算 —— 从响应式状态派生出树节点/边/连线数据。
 * 返回 Vue computed 引用，供模板和交互层使用。
 *
 * 依赖：tree-layout.js（布局算法）、step-utils.js（步骤辅助）
 */

import { analyzeTree, computeEdgePath } from './tree-layout.js';
import { NODE_TYPE, stepTextBrief } from './step-utils.js';

const { computed } = Vue;

/**
 * @param {Object} ctx - 上下文对象
 * @param {Object} ctx.chapters - reactive 章节数据 { id: [steps] }
 * @param {Object} ctx.nodePositions - reactive 节点位置 { id: {x, y} }
 * @param {Object} ctx.nodeStyles - reactive 节点样式 { id: {color, bgColor, width, height} }
 * @param {Array} ctx.gameEndings - reactive 结局数组 [{id, title, description}]
 * @param {Object} ctx.chapterDescriptions - reactive 章节简介 { id: string }
 * @param {Object} ctx.entryPoints - reactive 入口标记 { id: true }
 * @param {Object} ctx.selection - reactive 框选状态 { active, startX, startY, endX, endY }
 * @param {Object} ctx.panX - ref 平移 X
 * @param {Object} ctx.panY - ref 平移 Y
 * @param {Object} ctx.viewScale - ref 缩放
 * @param {Object} ctx.selectedChapterId - ref 选中章节 ID
 * @param {Object} ctx.selectedEndingId - ref 选中结局 ID
 * @param {Object} ctx.selectedEdge - ref 选中连线
 * @param {Object} ctx.editorGroups - reactive 分组
 * @returns {Object} 计算属性集合
 */
export function createTreeData(ctx) {
    const {
        chapters, nodePositions, nodeStyles, gameEndings,
        chapterDescriptions, entryPoints,
        selection, panX, panY, viewScale,
        selectedChapterId, selectedEndingId, selectedEdge, editorGroups,
    } = ctx;

    // ── 入口判定（注入 entryPoints 依赖）─────────────────────────────
    function isEntryPoint(nodeId) {
        return !!entryPoints[nodeId];
    }

    // ── 派生树分析结果 ─────────────────────────────────────────────
    const treeAnalysis = computed(() => analyzeTree(chapters));
    const adjacency = computed(() => treeAnalysis.value.adjacency);
    const incoming = computed(() => treeAnalysis.value.incoming);
    const roots = computed(() => treeAnalysis.value.roots);
    const leaves = computed(() => treeAnalysis.value.leaves);

    // ── 构建节点列表 ───────────────────────────────────────────────
    /** 创建结局节点数据 */
    function createEndingNodeData(endNodeId, endingId, pos) {
        const endingData = gameEndings.find(e => e.id === endingId);
        return {
            id: endNodeId, label: endingId,
            endingId,
            title: (endingData && endingData.title) || endingId,
            description: (endingData && endingData.description) || '',
            x: pos.x, y: pos.y,
            width: 180, height: 60,
        };
    }

    /** 构建底部出口端口 */
    function buildBottomPorts(cid, steps, sW, sH) {
        const bottomPorts = [];
        let portIdx = 0;
        const pos = nodePositions[cid] || { x: 0, y: 0 };
        steps.forEach((step, si) => {
            if (step.type === 'jump') {
                if (step.endingId) {
                    const endingName = (gameEndings.find(e => e.id === step.endingId)?.title || step.endingId);
                    bottomPorts.push({
                        stepIdx: si, targetId: '_end_' + step.endingId,
                        label: '🎬', portIdx, isEnding: true,
                        type: 'jump-ending', hasTarget: true,
                        tooltipText: '[结局触发] ' + endingName,
                        stepBrief: '结局: ' + endingName,
                    });
                    portIdx++;
                } else if (step.jumpChapter) {
                    const targetIsEnding = step.jumpChapter.startsWith('_end_');
                    bottomPorts.push({
                        stepIdx: si, targetId: step.jumpChapter || '',
                        label: '⤵ ' + (step.jumpChapter || '?'), portIdx,
                        type: 'jump', hasTarget: !!step.jumpChapter,
                        isEnding: targetIsEnding,
                        tooltipText: targetIsEnding
                            ? '[结局] ' + step.jumpChapter
                            : '[跳转] → ' + (step.jumpChapter || '未设置目标'),
                        stepBrief: stepTextBrief(step),
                    });
                    portIdx++;
                } else {
                    bottomPorts.push({
                        stepIdx: si, targetId: '',
                        label: '⤵ ?', portIdx,
                        type: 'jump', hasTarget: false,
                        tooltipText: '[跳转] 未设置目标',
                        stepBrief: stepTextBrief(step),
                    });
                    portIdx++;
                }
            } else if (step.type === 'choice' && step.choices) {
                step.choices.forEach((ch, ci) => {
                    bottomPorts.push({
                        stepIdx: si, choiceIdx: ci, targetId: ch.jumpChapter || '',
                        label: (ch.text?.substring(0, 6) || '选项') + (ch.jumpChapter ? '' : '?'),
                        portIdx, type: 'choice',
                        hasTarget: !!ch.jumpChapter,
                        tooltipText: '[分支#' + (ci + 1) + '] ' + (ch.text?.substring(0, 20) || '无文本')
                            + (ch.jumpChapter ? ' → ' + ch.jumpChapter : ' (未设置目标)'),
                        stepBrief: '选项: ' + (ch.text?.substring(0, 30) || '无文本'),
                    });
                    portIdx++;
                });
            } else if (step.type === 'ending') {
                if (step.endingId) {
                    const endingName = (gameEndings.find(e => e.id === step.endingId)?.title || step.endingId);
                    bottomPorts.push({
                        stepIdx: si, targetId: '_end_' + step.endingId,
                        label: '🎬', portIdx, isEnding: true,
                        type: 'jump-ending', hasTarget: true,
                        tooltipText: '[结局触发] ' + endingName,
                        stepBrief: '结局: ' + endingName,
                    });
                    portIdx++;
                } else {
                    bottomPorts.push({
                        stepIdx: si, targetId: '',
                        label: '🎬?', portIdx,
                        type: 'jump-ending', hasTarget: false, isEnding: true,
                        tooltipText: '[结局触发] 未选择结局',
                        stepBrief: '结局触发: (未选择结局)',
                    });
                    portIdx++;
                }
            }
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

    /** 构建顶部入口端口 */
    function buildTopPorts(incomingSrcs, sW, sH, pos, isEntry) {
        if (isEntry) return [];
        if (incomingSrcs.length === 0) {
            return [{
                fromId: null, portIdx: 0, isEnding: false,
                rpX: sW / 2, rpY: 0,
                pxWorld: pos.x, pyWorld: pos.y - sH / 2,
                multiSource: false, sourceCount: 0,
            }];
        }
        return [{
            fromId: incomingSrcs[0].fromId, portIdx: 0,
            isEnding: incomingSrcs.some(s => s.isEnding),
            rpX: sW / 2, rpY: 0,
            pxWorld: pos.x, pyWorld: pos.y - sH / 2,
            multiSource: incomingSrcs.length > 1,
            sourceCount: incomingSrcs.length,
        }];
    }

    const treeNodes = computed(() => {
        const nodes = [];
        const endingNodes = {};
        const incomingSources = {};
        const allEdges = [];

        // Phase 1: 遍历所有章节，收集跳转关系
        for (const [cid, steps] of Object.entries(chapters)) {
            let portIdx = 0;
            steps.forEach((step, si) => {
                if (step.type === 'jump') {
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
                        const tid = step.jumpChapter;
                        if (tid) {
                            if (!incomingSources[tid]) incomingSources[tid] = [];
                            incomingSources[tid].push({ fromId: cid, portIdx, isEnding: tid.startsWith('_end_') });
                        }
                        allEdges.push({ fromId: cid, toId: tid || null, portIdx, stepIdx: si, type: 'jump' });
                        portIdx++;
                    } else {
                        portIdx++;
                    }
                } else if (step.type === 'ending') {
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
            });
        }

        // Phase 2: 从 gameEndings 初始化尚未创建的结局节点
        for (const end of gameEndings) {
            const endNodeId = '_end_' + end.id;
            if (!endingNodes[endNodeId]) {
                const pos = nodePositions[endNodeId] || { x: 0, y: 0 };
                endingNodes[endNodeId] = createEndingNodeData(endNodeId, end.id, pos);
            }
        }

        // Phase 3: 补齐通过 jumpChapter 引用的未知结局
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

        // Phase 4: 构建章节节点
        for (const [cid, steps] of Object.entries(chapters)) {
            const pos = nodePositions[cid] || { x: 0, y: 0 };
            const firstStep = steps[0];
            const style = nodeStyles[cid] || {};
            const sW = style.width || 200;
            const sH = style.height || 90;

            const bottomPorts = buildBottomPorts(cid, steps, sW, sH);
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

        // Phase 5: 构建结局节点
        for (const [endNodeId, endData] of Object.entries(endingNodes)) {
            const eW = endData.width || 180;
            const eH = endData.height || 60;
            const pos = nodePositions[endNodeId] || { x: 0, y: 0 };
            const eIncoming = incomingSources[endNodeId] || [];
            const topPorts = eIncoming.length > 0 ? [{
                fromId: eIncoming[0].fromId, portIdx: 0, isEnding: true,
                rpX: eW / 2, rpY: 0,
                pxWorld: pos.x, pyWorld: pos.y - eH / 2,
                multiSource: eIncoming.length > 1,
                sourceCount: eIncoming.length,
            }] : [];

            nodes.push({
                id: endNodeId, label: endData.label || endNodeId,
                type: NODE_TYPE.ENDING,
                x: pos.x, y: pos.y,
                stepCount: 0, outgoing: 0,
                incoming: eIncoming.length,
                isRoot: false, isLeaf: true, isEnding: true,
                entryPoint: isEntryPoint(endNodeId),
                firstText: '', description: '',
                endingId: endData.endingId,
                bottomPorts: [], topPorts,
                style: eW === 180 ? {} : { width: eW, height: eH },
                width: eW, height: eH,
            });
        }

        return nodes;
    });

    // ── 边映射 ──────────────────────────────────────────────────────
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

    // ── 树连线（端口到端口贝塞尔曲线） ────────────────────────────────
    const treeEdges = computed(() => {
        const edges = [];
        for (const node of treeNodes.value) {
            const fromNode = node;
            for (const bp of (fromNode.bottomPorts || [])) {
                if (!bp.targetId) continue;
                const toNode = treeNodes.value.find(n => n.id === bp.targetId);
                if (!toNode) continue;
                const isActive = selectedChapterId.value === fromNode.id
                    || selectedChapterId.value === toNode.id
                    || selectedEndingId.value === fromNode.id
                    || selectedEndingId.value === toNode.id;
                const isEnding = bp.isEnding || toNode.isEnding;
                const topPort = (toNode.topPorts || []).find(tp => tp.fromId === fromNode.id)
                    || (toNode.topPorts || [])[0];
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

    // ── 样式计算 ────────────────────────────────────────────────────
    const worldStyle = computed(() => ({
        transform: `translate(${panX.value}px, ${panY.value}px) scale(${viewScale.value})`,
    }));

    const selectionBoxStyle = computed(() => ({
        left: Math.min(selection.startX, selection.endX) + 'px',
        top: Math.min(selection.startY, selection.endY) + 'px',
        width: Math.abs(selection.endX - selection.startX) + 'px',
        height: Math.abs(selection.endY - selection.startY) + 'px',
    }));

    // ── 统计数据 ────────────────────────────────────────────────────
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

    // ── 章节间关系 ──────────────────────────────────────────────────
    const chapterOutgoing = computed(() => adjacency.value[selectedChapterId.value] || []);
    const chapterIncomingCount = computed(() => incoming.value[selectedChapterId.value] || 0);

    // ── 结局节点编辑数据 ────────────────────────────────────────────
    const selectedEndingNode = computed(() => {
        if (!selectedEndingId.value) return null;
        return treeNodes.value.find(n => n.id === selectedEndingId.value) || null;
    });

    const selectedEndingData = computed(() => {
        const node = selectedEndingNode.value;
        if (!node || !node.endingId) return null;
        return gameEndings.find(e => e.id === node.endingId) || null;
    });

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

    const selectedEndingPreview = computed(() => {
        // ending_trigger 预览：由 selectedChapterId + editingStepIndex 决定
        // 此处保留引用以便模板绑定，但实际值依赖于 editingStep
        // 由 editor-app.js 通过 editingStep 计算得出
        return null;
    });

    // ── 章节 ID 同步 ────────────────────────────────────────────────
    // editingChapterId 的同步逻辑保留在 editor-app.js

    return {
        treeAnalysis, adjacency, incoming, roots, leaves,
        treeNodes, treeEdges, edgeMap,
        worldStyle, selectionBoxStyle,
        totalChapters, totalSteps, totalChoices,
        chapterOutgoing, chapterIncomingCount,
        selectedEndingNode, selectedEndingData,
        endingIncomingChapters, selectedEndingPreview,
        // 内部函数（供调试/外部调用）
        isEntryPoint, buildBottomPorts, buildTopPorts,
    };
}

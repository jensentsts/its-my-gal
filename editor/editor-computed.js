/**
 * editor/editor-computed.js
 *
 * Vue 3 组合式 —— 派生计算属性
 * 依赖 editor-state 提供的响应式引用
 */
// Vue APIs from global (Vue loaded via CDN <script> tag)
const { computed } = Vue;
import { stepTextBrief, initCGForm, initCharChanges, getPerimeterPoint } from './utils.js';
import { analyzeTree, computeEdgePath } from './tree-layout.js';

/**
 * @param {Object} s - useEditorState() 返回的所有状态引用
 * @returns {Object} 所有计算属性
 */
export function useEditorComputed(s) {
    // ── 资源列表（派生） ────────────────────────────────────────
    const resourceList = computed(() => {
        const meta = s.resourceMeta[s.resourceTab.value];
        if (!meta) return [];
        const data = meta.data;
        if (meta.isObject) {
            return Object.entries(data).map(([id, item]) => ({ id, ...item }));
        }
        return (data || []).map((item, idx) => ({ _idx: idx, id: item.id, ...item }));
    });

    const selectedResource = computed(() => {
        if (!s.selectedResourceId.value) return null;
        const meta = s.resourceMeta[s.resourceTab.value];
        if (!meta) return null;
        if (meta.isObject) {
            return meta.data[s.selectedResourceId.value] || null;
        }
        const arr = meta.data || [];
        return arr.find(e => e.id === s.selectedResourceId.value) || null;
    });

    // ── 派生的树数据 ────────────────────────────────────────────
    const treeAnalysis = computed(() => analyzeTree(s.chapters));
    const adjacency = computed(() => treeAnalysis.value.adjacency);
    const incoming = computed(() => treeAnalysis.value.incoming);
    const roots = computed(() => treeAnalysis.value.roots);
    const leaves = computed(() => treeAnalysis.value.leaves);

    // ── 树节点（用于渲染） ──────────────────────────────────────
    const treeNodes = computed(() => {
        const nodes = [];
        const endingNodes = {};
        const incomingSources = {};
        const allEdges = [];

        // ── Phase 1: 遍历所有章节，收集跳转关系 ──────────────────
        for (const [cid, steps] of Object.entries(s.chapters)) {
            let portIdx = 0;
            steps.forEach((step, si) => {
                if (step.type === 'jump') {
                    if (step.endingId) {
                        const endNodeId = '_end_' + step.endingId;
                        if (!endingNodes[endNodeId]) {
                            const endPos = s.nodePositions[endNodeId] || { x: 0, y: 0 };
                            endingNodes[endNodeId] = createEndingNodeData(endNodeId, step.endingId, endPos);
                        }
                        if (!incomingSources[endNodeId]) incomingSources[endNodeId] = [];
                        incomingSources[endNodeId].push({ fromId: cid, portIdx, isEnding: true });
                        portIdx++;
                    } else if (step.jumpChapter) {
                        const tid = step.jumpChapter;
                        if (tid) {
                            if (!incomingSources[tid]) incomingSources[tid] = [];
                            incomingSources[tid].push({ fromId: cid, portIdx, isEnding: tid.startsWith('_end_') });
                        }
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
                        }
                        portIdx++;
                    });
                } else if (step.jumpChapter) {
                    const tid = step.jumpChapter;
                    if (!incomingSources[tid]) incomingSources[tid] = [];
                    incomingSources[tid].push({ fromId: cid, portIdx, isEnding: tid.startsWith('_end_') });
                    portIdx++;
                }
            });
        }

        // ── Phase 2: 从 gameEndings 初始化结局节点 ──────────────
        for (const end of s.gameEndings) {
            const endNodeId = '_end_' + end.id;
            if (!endingNodes[endNodeId]) {
                const pos = s.nodePositions[endNodeId] || { x: 0, y: 0 };
                endingNodes[endNodeId] = createEndingNodeData(endNodeId, end.id, pos);
            }
        }

        // ── Phase 3: 补齐通过 jumpChapter 引用的未知结局 ────────
        for (const [cid, steps] of Object.entries(s.chapters)) {
            for (const step of steps) {
                const checkTarget = (targetId) => {
                    if (targetId && targetId.startsWith('_end_') && !endingNodes[targetId]) {
                        const endId = targetId.slice(5);
                        const pos = s.nodePositions[cid] || { x: 0, y: 0 };
                        const fallbackPos = { x: pos.x + 240, y: pos.y + 120 };
                        endingNodes[targetId] = createEndingNodeData(targetId, endId, fallbackPos);
                        if (!s.nodePositions[targetId]) {
                            s.nodePositions[targetId] = { ...fallbackPos };
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

        // ── Phase 4: 构建章节节点 ────────────────────────────────
        for (const [cid, steps] of Object.entries(s.chapters)) {
            const pos = s.nodePositions[cid] || { x: 0, y: 0 };
            const firstStep = steps[0];
            const style = s.nodeStyles[cid] || {};
            const sW = style.width || 200;
            const sH = style.height || 90;

            const bottomPorts = buildBottomPorts(cid, steps, sW, sH);
            const topPorts = buildTopPorts(incomingSources[cid] || [], sW, sH, pos);

            nodes.push({
                id: cid, label: cid,
                type: s.NODE_TYPE.CHAPTER,
                x: pos.x, y: pos.y,
                stepCount: steps.length,
                outgoing: bottomPorts.length,
                incoming: (incomingSources[cid] || []).length,
                isRoot: roots.value.includes(cid),
                isLeaf: leaves.value.includes(cid),
                isEnding: false,
                entryPoint: s.isEntryPoint(cid),
                firstText: firstStep ? stepTextBrief(firstStep) : '',
                description: s.chapterDescriptions[cid] || '',
                endingId: null,
                bottomPorts, topPorts,
                style, width: sW, height: sH,
            });
        }

        // ── Phase 5: 构建结局节点 ────────────────────────────────
        for (const [endNodeId, endData] of Object.entries(endingNodes)) {
            const eW = endData.width || 180;
            const eH = endData.height || 60;
            const pos = s.nodePositions[endNodeId] || { x: 0, y: 0 };
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
                type: s.NODE_TYPE.ENDING,
                x: pos.x, y: pos.y,
                stepCount: 0,
                outgoing: 0,
                incoming: eIncoming.length,
                isRoot: false, isLeaf: true, isEnding: true,
                entryPoint: s.isEntryPoint(endNodeId),
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

    // ── 内部辅助（供 treeNodes 计算属性使用） ────────────────────
    function createEndingNodeData(endNodeId, endingId, pos) {
        const endingData = s.gameEndings.find(e => e.id === endingId);
        return {
            id: endNodeId, label: endingId,
            endingId: endingId,
            title: (endingData && endingData.title) || endingId,
            description: (endingData && endingData.description) || '',
            x: pos.x, y: pos.y,
            width: 180, height: 60,
        };
    }

    function buildBottomPorts(cid, steps, sW, sH) {
        const bottomPorts = [];
        let portIdx = 0;
        const pos = s.nodePositions[cid] || { x: 0, y: 0 };
        steps.forEach((step, si) => {
            if (step.type === 'jump') {
                if (step.endingId) {
                    const endingName = (s.gameEndings.find(e => e.id === step.endingId)?.title || step.endingId);
                    bottomPorts.push({
                        stepIdx: si, targetId: '_end_' + step.endingId,
                        label: '🎬', portIdx: portIdx, isEnding: true,
                        type: 'jump-ending', hasTarget: true,
                        tooltipText: '[结局触发] ' + endingName,
                        stepBrief: '结局: ' + endingName,
                    });
                    portIdx++;
                } else if (step.jumpChapter) {
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
            } else if (step.type === 'dialogue' && step.jumpChapter) {
                const speaker = step.characterId ? s.getCharName(step.characterId) + ': ' : '';
                bottomPorts.push({
                    stepIdx: si, targetId: step.jumpChapter,
                    label: '→' + step.jumpChapter, portIdx: portIdx,
                    type: 'dialogue-jump', hasTarget: true,
                    tooltipText: '[对话跳转] ' + speaker + (step.text?.substring(0, 20) || '')
                        + ' → ' + step.jumpChapter,
                    stepBrief: stepTextBrief(step),
                });
                portIdx++;
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

    function buildTopPorts(incomingSrcs, sW, sH, pos) {
        if (incomingSrcs.length === 0) return [];
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

    // ── 边映射 ──────────────────────────────────────────────────
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

    const maxPortsPerNode = computed(() => {
        let max = 0;
        for (const n of treeNodes.value) {
            if (n.ports && n.ports.length > max) max = n.ports.length;
        }
        return max;
    });

    // ── 树连线（端口到端口） ────────────────────────────────────
    const treeEdges = computed(() => {
        const edges = [];
        for (const node of treeNodes.value) {
            const fromNode = node;
            for (const bp of (fromNode.bottomPorts || [])) {
                if (!bp.targetId) continue;
                const toNode = treeNodes.value.find(n => n.id === bp.targetId);
                if (!toNode) continue;
                const isActive = s.selectedChapterId.value === fromNode.id
                    || s.selectedChapterId.value === toNode.id
                    || s.selectedEndingId.value === fromNode.id
                    || s.selectedEndingId.value === toNode.id;
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

    // ── 变换样式 ─────────────────────────────────────────────────
    const worldStyle = computed(() => ({
        transform: `translate(${s.panX.value}px, ${s.panY.value}px) scale(${s.viewScale.value})`,
    }));

    const selectionBoxStyle = computed(() => {
        const sel = s.selection;
        return {
            left: Math.min(sel.startX, sel.endX) + 'px',
            top: Math.min(sel.startY, sel.endY) + 'px',
            width: Math.abs(sel.endX - sel.startX) + 'px',
            height: Math.abs(sel.endY - sel.startY) + 'px',
        };
    });

    // ── 正在编辑的章节和步骤 ────────────────────────────────────
    const editingSteps = computed(() => {
        if (!s.selectedChapterId.value) return [];
        return s.chapters[s.selectedChapterId.value] || [];
    });

    const editingStep = computed({
        get: () => {
            if (s.editingStepIndex.value === null || !s.selectedChapterId.value) return null;
            const steps = s.chapters[s.selectedChapterId.value];
            if (!steps || s.editingStepIndex.value >= steps.length) return null;
            const step = steps[s.editingStepIndex.value];
            initCGForm(step);
            initCharChanges(step);
            return step;
        },
        set: () => {},
    });

    const chapterOutgoing = computed(() => adjacency.value[s.selectedChapterId.value] || []);
    const chapterIncomingCount = computed(() => incoming.value[s.selectedChapterId.value] || 0);

    const selectedEndingPreview = computed(() => {
        if (!editingStep.value) return null;
        if (editingStep.value.type === 'jump' && editingStep.value.endingId) {
            return s.gameEndings.find(e => e.id === editingStep.value.endingId) || null;
        }
        return null;
    });

    // ── 结局节点编辑数据 ────────────────────────────────────────
    const selectedEndingNode = computed(() => {
        if (!s.selectedEndingId.value) return null;
        return treeNodes.value.find(n => n.id === s.selectedEndingId.value) || null;
    });

    const selectedEndingData = computed(() => {
        const node = selectedEndingNode.value;
        if (!node || !node.endingId) return null;
        return s.gameEndings.find(e => e.id === node.endingId) || null;
    });

    const endingIncomingChapters = computed(() => {
        if (!s.selectedEndingId.value) return [];
        const result = [];
        for (const [cid, steps] of Object.entries(s.chapters)) {
            for (const step of steps) {
                if (step.jumpChapter === s.selectedEndingId.value) {
                    result.push({ id: cid, stepIdx: steps.indexOf(step), text: stepTextBrief(step) });
                }
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter === s.selectedEndingId.value) {
                            result.push({ id: cid, choiceText: ch.text });
                        }
                    }
                }
                if (step.type === 'jump' && step.endingId === s.selectedEndingId.value.slice(5)) {
                    result.push({ id: cid, stepIdx: steps.indexOf(step), text: '[结局触发]' });
                }
            }
        }
        return result;
    });

    // ── 统计数据 ──────────────────────────────────────────────────
    const totalChapters = computed(() => Object.keys(s.chapters).length);
    const totalSteps = computed(() => {
        let count = 0;
        for (const steps of Object.values(s.chapters)) count += steps.length;
        return count;
    });
    const totalChoices = computed(() => {
        let count = 0;
        for (const steps of Object.values(s.chapters)) {
            for (const s2 of steps) {
                if (s2.type === 'choice') count += (s2.choices || []).length;
            }
        }
        return count;
    });

    // ── 拖拽曲线（端口拖拽时的临时连线） ────────────────────────
    const portDragCurve = computed(() => {
        if (!s.portDragging.active) return '';
        const fromNode = treeNodes.value.find(n => n.id === s.portDragging.fromNodeId);
        if (!fromNode) return '';
        const rect = s.treePanel.value?.getBoundingClientRect();
        if (!rect) return '';
        const wp = screenToWorld(
            s.portDragging.mouseX - rect.left,
            s.portDragging.mouseY - rect.top
        );
        const bp = (fromNode.bottomPorts || [])[s.portDragging.fromPortIdx];
        if (!bp) return '';
        const x1 = bp.pxWorld;
        const y1 = bp.pyWorld;

        const snapThreshold = 50 / s.viewScale.value;
        let snapTarget = null;
        let snapDist = snapThreshold;
        for (const node of treeNodes.value) {
            if (node.id === s.portDragging.fromNodeId) continue;
            const dx = node.x - wp.x;
            const dy = node.y - wp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < snapDist) {
                snapDist = dist;
                snapTarget = node;
            }
        }
        s.portDragging.snapTargetId = snapTarget ? snapTarget.id : null;

        let endX = wp.x, endY = wp.y;
        if (snapTarget) {
            const pp = getPerimeterPoint(snapTarget, { x: x1, y: y1 }, wp);
            endX = pp.x;
            endY = pp.y;
        }

        const dy2 = Math.abs(endY - y1);
        const cpOffset = Math.max(50, dy2 * 0.5);
        return `M ${x1} ${y1} C ${x1} ${y1 + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
    });

    // ── 批量编辑 ──────────────────────────────────────────────────
    const batchCommonProps = computed(() => {
        const ids = Object.keys(s.selectedNodeIds);
        if (ids.length < 2) return null;
        const styles = ids.map(id => s.nodeStyles[id] || {}).filter(Boolean);
        const common = {};
        if (styles.every(st => st.color !== undefined && st.color === styles[0].color)) common.color = styles[0].color;
        if (styles.every(st => st.bgColor !== undefined && st.bgColor === styles[0].bgColor)) common.bgColor = styles[0].bgColor;
        if (styles.every(st => st.icon !== undefined && st.icon === styles[0].icon)) common.icon = styles[0].icon;
        return Object.keys(common).length > 0 ? common : null;
    });

    // ── 全局搜索结果 ──────────────────────────────────────────────
    const globalSearchResults = computed(() => {
        const q = s.globalSearchQuery.value.toLowerCase().trim();
        if (!q || q.length < 1) return [];
        const results = [];
        const add = (type, icon, label, id, action) => {
            if (label.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
                results.push({ type, icon, label, id, action });
            }
        };
        for (const [cid] of Object.entries(s.chapters)) add('章节', '📜', cid, cid, 'chapter');
        for (const [cid, ch] of Object.entries(s.gameCharacters)) add('角色', '👤', ch.name || cid, cid, 'character');
        for (const [sid, sc] of Object.entries(s.gameScenes)) add('场景', '🏞️', sc.title || sid, sid, 'scene');
        for (const [gid, cg] of Object.entries(s.gameCgLibrary)) add('CG', '🖼️', cg.title || gid, gid, 'cg');
        for (const [iid, item] of Object.entries(s.gameItems)) add('物品', '🎒', item.name || iid, iid, 'item');
        for (const end of s.gameEndings) add('结局', '🎬', end.title || end.id, end.id, 'ending');
        return results.slice(0, 20);
    });

    // ── 屏幕/世界坐标转换 ────────────────────────────────────────
    function screenToWorld(sx, sy) {
        return {
            x: (sx - s.panX.value) / s.viewScale.value,
            y: (sy - s.panY.value) / s.viewScale.value,
        };
    }

    function worldToScreen(wx, wy) {
        return {
            x: wx * s.viewScale.value + s.panX.value,
            y: wy * s.viewScale.value + s.panY.value,
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

    return {
        resourceList, selectedResource,
        treeAnalysis, adjacency, incoming, roots, leaves,
        treeNodes, edgeMap, maxPortsPerNode, treeEdges,
        worldStyle, selectionBoxStyle,
        editingSteps, editingStep,
        chapterOutgoing, chapterIncomingCount,
        selectedEndingPreview,
        selectedEndingNode, selectedEndingData, endingIncomingChapters,
        totalChapters, totalSteps, totalChoices,
        portDragCurve, batchCommonProps, globalSearchResults,
        screenToWorld, worldToScreen, getNodesInRect,
    };
}

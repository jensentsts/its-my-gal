/**
 * editor/tree-layout.js
 *
 * 剧情树结构分析与自动布局算法 —— 纯函数，不依赖 Vue
 *
 * 布局算法（基于 Sugiyama 分层布局思想）：
 *  1. 提取邻接关系
 *  2. BFS 分层（layer = y 坐标）
 *  3. Crossing Minimization —— 通过 barycenter 法调整每层节点顺序，减少连线交叉
 *  4. 提取"主父节点"树，子节点按 crossing-min 后的层内顺序排列
 *  5. 自底向上计算子树宽度
 *  6. 自顶向下分配 x 坐标
 *  7. 多父节点调整：多父节点取父节点平均 x，偏移整个子树
 *  8. 孤立节点放在主树下方
 *
 * 全程避免依赖对象属性遍历顺序（Object.keys/entries 的插入顺序），
 * 所有需要排序的地方按节点 ID 字典序或 barycenter 值决定，确保结果可复现。
 */

/**
 * 从章节数据中提取树结构
 * @returns {{ adjacency: Object, incoming: Object, roots: string[], leaves: string[] }}
 */
export function analyzeTree(chapters) {
    const adjacency = {};   // chapterId → [targetChapterIds]
    const incoming = {};    // chapterId → count (被多少章节引用)

    // 按 ID 排序保证确定性
    const sortedCids = Object.keys(chapters).sort();

    for (const cid of sortedCids) {
        const steps = chapters[cid];
        if (!adjacency[cid]) adjacency[cid] = [];
        const targets = new Set();

        for (const step of steps) {
            if (step.jumpChapter) targets.add(step.jumpChapter);
            if (step.type === 'jump' && step.endingId) {
                targets.add('_end_' + step.endingId);
            }
            if (step.type === 'choice' && step.choices) {
                for (const ch of step.choices) {
                    if (ch.jumpChapter) targets.add(ch.jumpChapter);
                }
            }
        }

        // 排序 targets 保证 adjacency 顺序确定
        adjacency[cid] = [...targets].sort();
        for (const t of targets) {
            incoming[t] = (incoming[t] || 0) + 1;
        }
    }

    const allIds = Object.keys(adjacency).sort();
    const roots = allIds.filter(id => !incoming[id]);

    // 确保 'main' 总是第一个根
    if (roots.includes('main')) {
        roots.splice(roots.indexOf('main'), 1);
        roots.unshift('main');
    }

    const leaves = allIds.filter(id => adjacency[id] && adjacency[id].length === 0);

    return { adjacency, incoming, roots, leaves };
}

/**
 * 获取节点的所有父节点（上层有边指向本节点的节点）
 */
function getParents(nodeId, adjacency, layerOf) {
    const parents = [];
    const nodeLayer = layerOf[nodeId];
    if (nodeLayer === undefined) return parents;
    for (const [p, targets] of Object.entries(adjacency)) {
        if (p === nodeId) continue;
        const pLayer = layerOf[p];
        if (pLayer === undefined) continue;
        if (pLayer >= nodeLayer) continue;
        if (targets.includes(nodeId)) {
            parents.push(p);
        }
    }
    return parents.sort(); // 按 ID 排序保证确定性
}

/**
 * 获取节点的所有子节点（下层本节点有边指向的节点）
 */
function getChildren(nodeId, adjacency, layerOf) {
    const children = [];
    const nodeLayer = layerOf[nodeId];
    if (nodeLayer === undefined) return children;
    for (const t of (adjacency[nodeId] || [])) {
        if (t === nodeId) continue;
        const tLayer = layerOf[t];
        if (tLayer === undefined) continue;
        if (tLayer <= nodeLayer) continue;
        children.push(t);
    }
    return children.sort(); // 按 ID 排序保证确定性
}

/**
 * Crossing Minimization —— 使用 Barycenter 启发式方法
 *
 * 在每层内部反复调整节点顺序，使得连线的总交叉数最小化。
 * 策略：
 *  - 初始顺序按节点 ID 字典序（确定且与存储无关）
 *  - 自上而下：子节点按所有父节点在当前层的位置均值排序
 *  - 自下而上：父节点按所有子节点在当前层的位置均值排序
 *  - 迭代 4 轮收敛
 *
 * @param {Array<Array<string>>} layers - layers[l] = [nodeId, ...]
 * @param {Object} adjacency
 * @param {Object} layerOf - nodeId → layer
 * @returns {Array<Array<string>>} 重排后的 layers
 */
function minimizeCrossings(layers, adjacency, layerOf) {
    // 过滤可能为 undefined 的层，确保安全
    const safeLayers = layers.filter(Boolean);
    if (safeLayers.length <= 1) return safeLayers.map(l => [...l].sort());

    // 深拷贝 layers，初始按节点 ID 排序（确定性）
    const result = safeLayers.map(l => [...l].sort());
    const nLayers = result.length;

    for (let iter = 0; iter < 4; iter++) {
        // ── 自上而下 ──
        for (let l = 1; l < nLayers; l++) {
            const currentLayer = result[l];
            const prevLayer = result[l - 1];
            if (!currentLayer || !prevLayer || currentLayer.length <= 1) continue;

            const indexed = currentLayer.map(nodeId => {
                const parents = getParents(nodeId, adjacency, layerOf);
                let bary = 0;
                if (parents.length > 0) {
                    const positions = parents
                        .map(p => prevLayer.indexOf(p))
                        .filter(idx => idx >= 0);
                    if (positions.length > 0) {
                        bary = positions.reduce((a, b) => a + b, 0) / positions.length;
                    } else {
                        // 没有父节点在当前层，取中间位置
                        bary = (prevLayer.length - 1) / 2;
                    }
                } else {
                    // 孤立节点在这层，取中间位置
                    bary = (prevLayer.length - 1) / 2;
                }
                return { nodeId, bary };
            });

            // 按 barycenter 排序，并列时按 nodeId 字典序
            indexed.sort((a, b) => {
                if (a.bary !== b.bary) return a.bary - b.bary;
                return a.nodeId.localeCompare(b.nodeId);
            });
            result[l] = indexed.map(x => x.nodeId);
        }

        // ── 自下而上 ──
        for (let l = nLayers - 2; l >= 0; l--) {
            const currentLayer = result[l];
            const nextLayer = result[l + 1];
            if (!currentLayer || !nextLayer || currentLayer.length <= 1) continue;

            const indexed = currentLayer.map(nodeId => {
                const children = getChildren(nodeId, adjacency, layerOf);
                let bary = 0;
                if (children.length > 0) {
                    const positions = children
                        .map(c => nextLayer.indexOf(c))
                        .filter(idx => idx >= 0);
                    if (positions.length > 0) {
                        bary = positions.reduce((a, b) => a + b, 0) / positions.length;
                    } else {
                        bary = (nextLayer.length - 1) / 2;
                    }
                } else {
                    bary = (nextLayer.length - 1) / 2;
                }
                return { nodeId, bary };
            });

            indexed.sort((a, b) => {
                if (a.bary !== b.bary) return a.bary - b.bary;
                return a.nodeId.localeCompare(b.nodeId);
            });
            result[l] = indexed.map(x => x.nodeId);
        }
    }

    return result;
}

/**
 * 自动布局 —— 入口节点在上方，按树状分支从上到下排列
 *
 * 算法：
 *  1. BFS 分层（layer = y 坐标）
 *  2. Crossing Minimization（barycenter 法，减少连线交叉）
 *  3. 提取"主父节点"树（多父节点取层数最浅的那个）
 *  4. 子节点按 crossing-min 后的层内顺序排列
 *  5. 自底向上计算子树宽度
 *  6. 自顶向下分配 x 坐标（子节点在其父节点下居中排列）
 *  7. 多父节点调整：有多个父节点的子节点，在父节点间取平均 x
 *  8. 孤立节点放在主树下方
 */
export function computeLayout(chapters, nodeSizes = {}) {
    const { adjacency, roots } = analyzeTree(chapters);
    const allIds = Object.keys(adjacency).sort();
    if (allIds.length === 0) return {};

    // ── 常量 ──────────────────────────────────────────────────────
    const DEFAULT_W = 200;
    const DEFAULT_H = 90;
    const H_GAP = 40;       // 兄弟子树之间的水平间距
    const V_GAP = 80;       // 层间垂直间距
    const MIN_LAYER_GAP = 30; // 不同根子树之间的额外间距
    const ORIGIN_X = 300;
    const ORIGIN_Y = 80;

    function nodeW(id) { return nodeSizes[id]?.width || DEFAULT_W; }
    function nodeH(id) { return nodeSizes[id]?.height || DEFAULT_H; }

    // ── 1. BFS 分层 ──────────────────────────────────────────────
    const layerOf = {};    // id → 层号（从上到下 0,1,2…）
    const layers = [];     // layers[layer] = [id, …]
    const visited = new Set();
    const queue = [];

    for (const r of roots) {
        layerOf[r] = 0;
        visited.add(r);
        queue.push(r);
    }

    while (queue.length > 0) {
        const cur = queue.shift();
        const l = layerOf[cur];
        if (!layers[l]) layers[l] = [];
        if (!layers[l].includes(cur)) layers[l].push(cur);

        for (const t of adjacency[cur] || []) {
            if (t === cur) continue;
            const nl = l + 1;
            if (nl > allIds.length + 5) continue;
            if (!visited.has(t) || layerOf[t] < nl) {
                layerOf[t] = nl;
                visited.add(t);
                queue.push(t);
            }
        }
    }

    // 孤立节点（未被 BFS 遍历到的）放到最后一层之后
    const orphans = [];
    for (const id of allIds) {
        if (!visited.has(id)) {
            orphans.push(id);
            layerOf[id] = layers.length;
        }
    }
    orphans.sort(); // 按 ID 排序保证确定性

    // ── 2. Crossing Minimization ──────────────────────────────────
    // 重新组织每层内节点顺序，使连线尽可能不交叉
    for (let l = 0; l < layers.length; l++) {
        if (!layers[l]) layers[l] = [];
    }
    const orderedLayers = minimizeCrossings(layers, adjacency, layerOf);

    // ── 3. 构建主父节点树 ────────────────────────────────────────
    const primaryParent = {}; // childId → parentId
    const children = {};      // parentId → [childId, …]

    for (const [parent, targets] of Object.entries(adjacency)) {
        if (layerOf[parent] === undefined) continue;
        for (const child of targets) {
            if (child === parent) continue;
            if (layerOf[child] === undefined || layerOf[child] <= layerOf[parent]) continue;
            if (primaryParent[child] === undefined ||
                layerOf[primaryParent[child]] > layerOf[parent]) {
                primaryParent[child] = parent;
            }
        }
    }

    // ── 4. 子节点按 crossing-min 后的层内顺序排序 ────────────────
    // 这样兄弟节点在最终布局中的左右顺序与 crossing minimization 的结果一致
    const childOrder = {}; // parentId → [childId, …] (排序后)
    for (const [child, parent] of Object.entries(primaryParent)) {
        if (!childOrder[parent]) childOrder[parent] = [];
        childOrder[parent].push(child);
    }
    for (const parent of Object.keys(childOrder)) {
        const parentLayer = layerOf[parent];
        if (parentLayer === undefined || parentLayer + 1 >= orderedLayers.length) {
            // 子节点按 ID 排序
            childOrder[parent].sort();
        } else {
            const nextLayerOrder = orderedLayers[parentLayer + 1];
            childOrder[parent].sort((a, b) => {
                const ia = nextLayerOrder.indexOf(a);
                const ib = nextLayerOrder.indexOf(b);
                if (ia >= 0 && ib >= 0) return ia - ib;
                if (ia >= 0) return -1;
                if (ib >= 0) return 1;
                return a.localeCompare(b);
            });
        }
        if (!children[parent]) children[parent] = [];
        children[parent] = childOrder[parent];
    }

    // ── 5. 自底向上计算子树宽度 ──────────────────────────────────
    const subtreeW = {};

    function calcSubtree(id) {
        if (subtreeW[id] !== undefined) return subtreeW[id];
        const w = nodeW(id);
        const kids = children[id] || [];
        if (kids.length === 0) {
            subtreeW[id] = w;
            return w;
        }
        let total = 0;
        for (const k of kids) {
            total += calcSubtree(k);
        }
        total += (kids.length - 1) * H_GAP;
        subtreeW[id] = Math.max(w, total);
        return subtreeW[id];
    }

    for (const id of allIds) calcSubtree(id);
    for (const id of orphans) calcSubtree(id);

    // ── 6. 自顶向下分配 x 坐标 ────────────────────────────────────
    const xPos = {};

    function assignX(id, centerX) {
        xPos[id] = centerX;
        const kids = children[id] || [];
        if (kids.length === 0) return;

        let totalW = 0;
        for (const k of kids) totalW += subtreeW[k];
        totalW += (kids.length - 1) * H_GAP;

        let curX = centerX - totalW / 2;
        for (const k of kids) {
            assignX(k, curX + subtreeW[k] / 2);
            curX += subtreeW[k] + H_GAP;
        }
    }

    let rootsTotalW = 0;
    for (const r of roots) rootsTotalW += subtreeW[r];
    rootsTotalW += (roots.length - 1) * (H_GAP + MIN_LAYER_GAP);

    let rootCurX = -rootsTotalW / 2;
    for (const r of roots) {
        assignX(r, rootCurX + subtreeW[r] / 2);
        rootCurX += subtreeW[r] + H_GAP + MIN_LAYER_GAP;
    }

    // ── 7. 多父节点调整 ──────────────────────────────────────────
    {
        const mpTarget = {};
        for (const [child] of Object.entries(primaryParent)) {
            const allP = [];
            for (const [p, targets] of Object.entries(adjacency)) {
                if (targets.includes(child) && p !== child && (layerOf[p] ?? -1) < (layerOf[child] ?? Infinity)) {
                    allP.push(p);
                }
            }
            if (allP.length > 1) {
                let sumX = 0, cnt = 0;
                for (const p of allP) {
                    if (xPos[p] !== undefined) { sumX += xPos[p]; cnt++; }
                }
                if (cnt >= 2) mpTarget[child] = sumX / cnt;
            }
        }

        const mpVisited = new Set();
        function mpShift(id, delta) {
            if (mpVisited.has(id)) return;
            mpVisited.add(id);
            xPos[id] += delta;
            for (const k of (children[id] || [])) mpShift(k, delta);
        }

        // 按 child ID 排序确保多父节点调整顺序确定
        const sortedMP = Object.entries(mpTarget).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [child, targetX] of sortedMP) {
            const delta = targetX - xPos[child];
            mpShift(child, delta);
        }
    }

    // ── 8. 孤立节点定位 ──────────────────────────────────────────
    if (orphans.length > 0) {
        let orphanY = layers.length;
        if (roots.length === 0) orphanY = 0;
        const orphanLayer = orphanY;
        if (!layers[orphanLayer]) layers[orphanLayer] = [];
        let orphanX = 0;
        for (const o of orphans) {
            layerOf[o] = orphanLayer;
            layers[orphanLayer].push(o);
            xPos[o] = orphanX;
            orphanX += nodeW(o) + H_GAP;
        }
        const totalW = orphans.reduce((sum, o) => sum + nodeW(o), 0) + (orphans.length - 1) * H_GAP;
        const shiftOrphanX = -totalW / 2;
        for (const o of orphans) {
            xPos[o] += shiftOrphanX;
        }
    }

    // ── 9. 转换为最终坐标 ────────────────────────────────────────
    const positions = {};

    let minX = Infinity;
    for (const id of allIds) {
        if (xPos[id] !== undefined && xPos[id] < minX && isFinite(xPos[id])) {
            minX = xPos[id];
        }
    }
    const shiftX = (isFinite(minX) && minX < 0) ? -minX + DEFAULT_W / 2 : DEFAULT_W / 2;

    const layerMaxH = {};
    for (const id of allIds) {
        const l = layerOf[id];
        if (l === undefined) continue;
        layerMaxH[l] = Math.max(layerMaxH[l] || 0, nodeH(id));
    }

    const layerY = {};
    let curY = ORIGIN_Y;
    for (let li = 0; li < layers.length; li++) {
        const maxH = layerMaxH[li] || DEFAULT_H;
        layerY[li] = curY + maxH / 2;
        curY += maxH + V_GAP;
    }

    for (const id of allIds) {
        const l = layerOf[id];
        if (l === undefined) continue;
        positions[id] = {
            x: (xPos[id] || 0) + shiftX + ORIGIN_X,
            y: layerY[l] !== undefined ? layerY[l] : curY + nodeH(id) / 2,
        };
    }

    return positions;
}

/**
 * 自动布局结局节点 —— 放在章节树下方
 * 被引用的结局居中于其源章节；未被引用的结局在底部居中排列
 */
export function computeEndingLayout(chapters, endings, chapterPositions, nodeSizes = {}) {
    const positions = {};
    const DEFAULT_W = 180;
    const DEFAULT_H = 60;
    const H_GAP = 40;
    const V_GAP = 80;

    function endW(id) { return nodeSizes[id]?.width || DEFAULT_W; }
    function endH(id) { return nodeSizes[id]?.height || DEFAULT_H; }

    const sourceMap = {};
    for (const [cid, steps] of Object.entries(chapters)) {
        for (const step of steps) {
            let endId = null;
            if (step.type === 'jump' && step.endingId) {
                endId = step.endingId;
            }
            if (endId) {
                if (!sourceMap[endId]) sourceMap[endId] = [];
                if (!sourceMap[endId].includes(cid)) sourceMap[endId].push(cid);
            }
        }
    }

    let maxChapterBottom = 0;
    for (const pos of Object.values(chapterPositions)) {
        const bottom = pos.y + 45;
        if (bottom > maxChapterBottom) maxChapterBottom = bottom;
    }

    const referencedMaxH = Math.max(
        ...endings.filter(e => sourceMap[e.id]?.length > 0).map(e => endH('_end_' + e.id)),
        DEFAULT_H
    );
    const ROW1_Y = maxChapterBottom + V_GAP + referencedMaxH / 2;

    const referencedIds = [];
    for (const end of endings) {
        const srcList = sourceMap[end.id] || [];
        if (srcList.length === 0) continue;

        let sumX = 0, count = 0;
        for (const src of srcList) {
            const p = chapterPositions[src];
            if (p) { sumX += p.x; count++; }
        }
        if (count === 0) continue;

        positions['_end_' + end.id] = { x: sumX / count, y: ROW1_Y };
        referencedIds.push(end.id);
    }
    referencedIds.sort();

    const unreferenced = endings.filter(e => !referencedIds.includes(e.id)).sort((a, b) => a.id.localeCompare(b.id));
    if (unreferenced.length > 0) {
        const row1H = referencedIds.length > 0
            ? Math.max(...referencedIds.map(e => endH('_end_' + e)))
            : DEFAULT_H;
        const row2H = Math.max(...unreferenced.map(e => endH('_end_' + e.id)), DEFAULT_H);
        const ROW2_Y = ROW1_Y + row1H / 2 + V_GAP + row2H / 2;

        let centerX = 0, countCenter = 0;
        if (referencedIds.length > 0) {
            for (const endId of referencedIds) {
                const p = positions['_end_' + endId];
                if (p) { centerX += p.x; countCenter++; }
            }
        } else {
            for (const pos of Object.values(chapterPositions)) {
                centerX += pos.x; countCenter++;
            }
        }
        centerX = countCenter > 0 ? centerX / countCenter : 0;

        let curX = centerX - unreferenced.reduce((sum, e) => sum + endW('_end_' + e.id), 0) / 2
                  - (unreferenced.length - 1) * H_GAP / 2;
        for (const end of unreferenced) {
            const w = endW('_end_' + end.id);
            positions['_end_' + end.id] = { x: curX + w / 2, y: ROW2_Y };
            curX += w + H_GAP;
        }
    }

    return positions;
}

/**
 * 计算从底部端口（圆形）到顶部端口（圆角矩形）的 SVG 贝塞尔曲线路径
 */
export function computeEdgePath(fromNode, fromPort, toNode, toPort) {
    if (!fromPort || !toPort) return '';
    const x1 = fromPort.pxWorld;
    const y1 = fromPort.pyWorld;
    const x2 = toPort.pxWorld;
    const y2 = toPort.pyWorld;

    const dy = Math.abs(y2 - y1);
    const cpOffset = Math.max(50, dy * 0.5);

    return `M ${x1} ${y1} C ${x1} ${y1 + cpOffset}, ${x2} ${y2 - cpOffset}, ${x2} ${y2}`;
}

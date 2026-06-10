/**
 * editor/tree-layout.js
 *
 * 剧情树结构分析与自动布局算法 —— 纯函数，不依赖 Vue
 */

/**
 * 从章节数据中提取树结构
 * @returns {{ adjacency: Object, incoming: Object, roots: string[], leaves: string[] }}
 */
export function analyzeTree(chapters) {
    const adjacency = {};   // chapterId → [targetChapterIds]
    const incoming = {};    // chapterId → count (被多少章节引用)

    for (const [cid, steps] of Object.entries(chapters)) {
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

        adjacency[cid] = [...targets];
        for (const t of targets) {
            incoming[t] = (incoming[t] || 0) + 1;
        }
    }

    const allIds = Object.keys(chapters);
    const roots = allIds.filter(id => !incoming[id]);
    const leaves = allIds.filter(id => adjacency[id] && adjacency[id].length === 0);

    if (roots.includes('main')) {
        roots.splice(roots.indexOf('main'), 1);
        roots.unshift('main');
    }

    return { adjacency, incoming, roots, leaves };
}

/**
 * 自动布局 —— 入口节点在上方，按树状分支从上到下排列
 *
 * 算法：
 *  1. BFS 分层（layer = y 坐标）
 *  2. 提取"主父节点"树
 *  3. 自底向上计算子树宽度
 *  4. 自顶向下分配 x 坐标
 *  5. 多父节点调整
 *  6. 孤立节点放在主树下方
 */
export function computeLayout(chapters, nodeSizes = {}) {
    const { adjacency, roots } = analyzeTree(chapters);
    const allIds = Object.keys(chapters);
    if (allIds.length === 0) return {};

    // ── 常量 ──────────────────────────────────────────────────────
    const DEFAULT_W = 200;
    const DEFAULT_H = 90;
    const H_GAP = 40;
    const V_GAP = 80;
    const MIN_LAYER_GAP = 30;
    const ORIGIN_X = 300;
    const ORIGIN_Y = 80;

    function nodeW(id) { return nodeSizes[id]?.width || DEFAULT_W; }
    function nodeH(id) { return nodeSizes[id]?.height || DEFAULT_H; }

    // ── 1. BFS 分层 ──────────────────────────────────────────────
    const layerOf = {};
    const layers = [];
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
            if (!visited.has(t) || (layerOf[t] < nl)) {
                layerOf[t] = nl;
                visited.add(t);
                queue.push(t);
            }
        }
    }

    const orphans = [];
    for (const id of allIds) {
        if (!visited.has(id)) {
            orphans.push(id);
            layerOf[id] = layers.length;
        }
    }

    // ── 2. 构建主父节点树 ────────────────────────────────────────
    const primaryParent = {};
    const children = {};

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
    for (const [child, parent] of Object.entries(primaryParent)) {
        if (!children[parent]) children[parent] = [];
        children[parent].push(child);
    }

    // ── 3. 自底向上计算子树宽度 ──────────────────────────────────
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

    // ── 4. 自顶向下分配 x 坐标 ────────────────────────────────────
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

    // ── 5. 多父节点调整 ──────────────────────────────────────────
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

        for (const [child, targetX] of Object.entries(mpTarget)) {
            const delta = targetX - xPos[child];
            mpShift(child, delta);
        }
    }

    // ── 6. 孤立节点定位 ──────────────────────────────────────────
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

    // ── 7. 转换为最终坐标 ────────────────────────────────────────
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

    const unreferenced = endings.filter(e => !referencedIds.includes(e.id));
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

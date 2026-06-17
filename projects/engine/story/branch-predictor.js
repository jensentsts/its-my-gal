/**
 * engine/story/branch-predictor.js
 *
 * StoryBranchPredictor —— 剧情分支预测器。
 *
 * 职责：
 *  - 扫描章节步骤数组，提取所有可能的跳转目标
 *  - 构建完整的故事有向图（邻接表、入度、根/叶节点）
 *  - 支持基于 flags 的加权优先级排序
 *  - 多级深度预测（预测目标的后续分支）
 *
 * 供 ChapterLoader 使用，实现智能预加载。
 */

/**
 * 从步骤数组中提取所有直接跳转目标
 * @param {Array} steps - 章节步骤数组
 * @param {Object} [flags={}] - 当前游戏 flags，用于优先级排序
 * @returns {{ targets: string[], choices: Array<{text:string, chapter:string, flag?:string}>, endings: string[] }}
 */
export function extractBranchPoints(steps, flags = {}) {
    const targets = new Set();
    const choices = [];
    const endings = [];

    if (!Array.isArray(steps)) return { targets: [], choices: [], endings: [] };

    for (const step of steps) {
        // ---- jump 步骤 ----
        if (step.type === 'jump') {
            if (step.jumpChapter) {
                targets.add(step.jumpChapter);
            }
            if (step.endingId) {
                endings.push(step.endingId);
            }
        }

        // ---- choice 步骤 ----
        if (step.type === 'choice' && Array.isArray(step.choices)) {
            for (const ch of step.choices) {
                if (ch.jumpChapter) {
                    targets.add(ch.jumpChapter);
                    choices.push({
                        text: ch.text || '',
                        chapter: ch.jumpChapter,
                        flag: ch.flag || null,
                    });
                }
                if (ch.endingId) {
                    endings.push(ch.endingId);
                }
            }
        }

        // ---- ending 步骤 ----
        if (step.type === 'ending') {
            if (step.endingId) {
                endings.push(step.endingId);
            }
            if (step.jumpChapter) {
                targets.add(step.jumpChapter);
            }
        }
    }

    return {
        targets: [...targets],
        choices,
        endings: [...endings],
    };
}

/**
 * 对预测结果按可能性加权排序
 *
 * 加权规则：
 *  - 如果 choice 设置了 flag 且该 flag 已激活 → 权重 +2
 *  - 如果 choice 设置了 flag 且该 flag 未激活 → 权重 -1
 *  - base 权重 = 1（无条件分支权重更高，因其必达）
 *
 * @param {{ targets: string[], choices: Array, endings: string[] }} branchPoints
 * @param {Object} flags - 当前玩家 flags { flagName: true }
 * @returns {Array<{ chapterId: string, weight: number, reason: string }>}
 */
export function rankNextChapters(branchPoints, flags = {}) {
    const weightMap = new Map(); // chapterId → { weight: number, reasons: string[] }

    // 初始化：jump 和 ending 中的目标为无条件分支，权重高
    for (const target of branchPoints.targets) {
        if (!weightMap.has(target)) {
            weightMap.set(target, { weight: 0, reasons: [] });
        }
        // 如果一个 target 只出现在无条件 jump 中（不在 choices 中），标记为高权重
    }

    // 处理 choice 中的目标
    for (const ch of branchPoints.choices) {
        if (!weightMap.has(ch.chapter)) {
            weightMap.set(ch.chapter, { weight: 0, reasons: [] });
        }
        const entry = weightMap.get(ch.chapter);
        if (ch.flag) {
            if (flags[ch.flag]) {
                entry.weight += 2;
                entry.reasons.push(`flag[${ch.flag}] = true → 权重 +2`);
            } else {
                entry.weight -= 1;
                entry.reasons.push(`flag[${ch.flag}] = false → 权重 -1`);
            }
        } else {
            entry.weight += 0; // 无条件 choice，中立
            entry.reasons.push('无条件选项');
        }
    }

    // 标记 "只出现在 jump 中" 的目标为高确定性
    const allChoiceChapters = new Set(branchPoints.choices.map(c => c.chapter));
    for (const target of branchPoints.targets) {
        if (!allChoiceChapters.has(target)) {
            const entry = weightMap.get(target);
            if (entry) {
                entry.weight += 3;
                entry.reasons.push('必达跳转 → 权重 +3');
            }
        }
    }

    // 排序：权重从高到低
    return [...weightMap.entries()]
        .map(([chapterId, data]) => ({
            chapterId,
            weight: data.weight,
            reasons: data.reasons,
        }))
        .sort((a, b) => b.weight - a.weight);
}

/**
 * 构建全章节跳转关系图
 *
 * @param {Object} chapters - 所有章节数据 { chapterId: steps[] }
 * @returns {Object}
 *   { adjacency: { chapterId: string[] },
 *     incoming: { chapterId: number },
 *     roots: string[],
 *     leaves: string[] }
 */
export function buildChapterGraph(chapters) {
    const adjacency = {};
    const incoming = {};

    for (const [cid, steps] of Object.entries(chapters)) {
        if (!adjacency[cid]) adjacency[cid] = [];
        const { targets, endings } = extractBranchPoints(steps);

        const allTargets = new Set(targets);
        for (const eid of endings) {
            allTargets.add('_end_' + eid);
        }

        adjacency[cid] = [...allTargets];
        for (const t of allTargets) {
            incoming[t] = (incoming[t] || 0) + 1;
        }
    }

    const allIds = Object.keys(chapters);
    const roots = allIds.filter(id => (incoming[id] || 0) === 0);
    const leaves = allIds.filter(id => !adjacency[id] || adjacency[id].length === 0);

    if (roots.includes('main')) {
        roots.splice(roots.indexOf('main'), 1);
        roots.unshift('main');
    }

    return { adjacency, incoming, roots, leaves };
}

/**
 * 多级深度预判 —— 从当前步骤出发，预测玩家在 maxDepth 跳内可能到达的所有章节
 *
 * @param {Array} steps - 当前章节步骤数组
 * @param {Object} allChapters - 全量章节数据（用于递归查找深层目标）
 * @param {number} maxDepth - 预测深度（1 = 只预测下一跳）
 * @param {Object} [flags={}] - 当前 flags
 * @returns {{ targets: string[], depthMap: { [depth: number]: string[] }, chain: string[][] }}
 */
export function deepPredict(steps, allChapters, maxDepth = 2, flags = {}) {
    const depthMap = {};
    const visited = new Set();
    const chains = [];

    function dfs(currentSteps, depth, chain) {
        if (depth > maxDepth) return;
        const branch = extractBranchPoints(currentSteps, flags);
        const currentTargets = [...new Set(branch.targets)];

        if (!depthMap[depth]) depthMap[depth] = [];
        for (const t of currentTargets) {
            if (!visited.has(t)) {
                depthMap[depth].push(t);
                visited.add(t);
            }
        }

        for (const target of currentTargets) {
            const nextChain = [...chain, target];
            if (depth < maxDepth) {
                chains.push(nextChain);
            }
            const nextSteps = allChapters?.[target];
            if (nextSteps && depth < maxDepth) {
                dfs(nextSteps, depth + 1, nextChain);
            }
        }
    }

    dfs(steps, 1, []);

    return {
        targets: [...new Set(Object.values(depthMap).flat())],
        depthMap,
        chains,
    };
}

export default {
    extractBranchPoints,
    rankNextChapters,
    buildChapterGraph,
    deepPredict,
};

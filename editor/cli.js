#!/usr/bin/env node
/**
 * editor/cli.js
 *
 * 剧情树节点编辑器 CLI（命令行界面）
 *
 * 用法:
 *   node editor/cli.js <command> [options]
 *
 * 命令:
 *   validate                验证所有游戏数据的完整性
 *   list       <type>       列出资源（chapters|characters|scenes|cg|items|endings）
 *   export     <format>     导出数据（json|js）
 *   analyze    <type>       分析剧情（stats|branches|crossref）
 *   info                    显示项目概览
 *   help                    显示此帮助信息
 *
 * 选项:
 *   --pretty, -p    美化输出（JSON 缩进）
 *   --output, -o    输出到文件（仅 export 命令）
 *   --silent, -s    静默模式（仅输出原始数据，无装饰）
 */

// ══════════════════════════════════════════════════════════════════════
//  依赖
// ══════════════════════════════════════════════════════════════════════
import * as GameData from '../resource-packs/default/index.js';
import { validatePackData } from '../engine/index.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══════════════════════════════════════════════════════════════════════
//  样式（终端颜色）
// ══════════════════════════════════════════════════════════════════════
const style = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

// ══════════════════════════════════════════════════════════════════════
//  辅助函数
// ══════════════════════════════════════════════════════════════════════

function color(c, text) { return `${style[c]}${text}${style.reset}`; }

function header(text) {
    const line = '─'.repeat(Math.min(text.length + 4, 60));
    return `\n${color('bold', color('cyan', line))}\n  ${color('bold', color('cyan', text))}\n${color('bold', color('cyan', line))}`;
}

function success(text) { console.log(`  ${color('green', '✓')} ${text}`); }
function warn(text) { console.log(`  ${color('yellow', '⚠')} ${text}`); }
function error(text) { console.log(`  ${color('red', '✗')} ${text}`); }
function info(label, value) { console.log(`  ${color('bold', label)}: ${value}`); }
function dim(text) { console.log(`  ${color('gray', text)}`); }

function plural(n, singular, pluralStr) {
    return `${n} ${n === 1 ? singular : (pluralStr || singular + 's')}`;
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function countSteps(steps) {
    return steps.length;
}

function countDialogue(steps) {
    return steps.filter(s => s.type === 'dialogue' || !s.type).length;
}

function countChoices(steps) {
    return steps.filter(s => s.type === 'choice').length;
}

function countJumps(steps) {
    return steps.filter(s => s.type === 'jump').length;
}

function countEndings(steps) {
    return steps.filter(s => s.type === 'ending').length;
}

function collectOptionCount(steps) {
    let n = 0;
    for (const s of steps) {
        if (s.type === 'choice' && s.choices) n += s.choices.length;
    }
    return n;
}

// ══════════════════════════════════════════════════════════════════════
//  命令处理
// ══════════════════════════════════════════════════════════════════════

// ─── info ────────────────────────────────────────────────────────────
function cmdInfo() {
    const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS, CHAPTER_DESCRIPTIONS } = GameData;

    console.log(header(`📖 ${GAME_CONFIG.title || '未命名游戏'}`));

    info('画面', `${GAME_CONFIG.aspectRatio?.width || 1280}×${GAME_CONFIG.aspectRatio?.height || 720}`);
    info('打字速度', `${GAME_CONFIG.textSpeed || 25}ms/字`);

    const chCount = Object.keys(STORY_CHAPTERS).length;
    let totalSteps = 0, totalChoices = 0, totalOptions = 0;
    const chapterStepCounts = {};
    for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
        const n = steps.length;
        totalSteps += n;
        totalChoices += countChoices(steps);
        totalOptions += collectOptionCount(steps);
        chapterStepCounts[id] = n;
    }

    console.log(header('📊 资源统计'));
    info('章节', chCount);
    info('步骤', totalSteps);
    info('分支步骤', totalChoices);
    info('分支选项', totalOptions);
    info('角色', Object.keys(CHARACTERS || {}).length);
    info('场景', Object.keys(SCENES || {}).length);
    info('CG 图鉴', Object.keys(CG_LIBRARY || {}).length);
    info('物品', Object.keys(ITEMS || {}).length);
    info('结局', (ENDINGS || []).length);

    console.log(header('📜 章节一览'));
    const maxIdLen = Math.max(...Object.keys(chapterStepCounts).map(k => k.length), 10);
    const headerLine = `  ${'章节 ID'.padEnd(maxIdLen)}  步骤数  对话  分支  跳转  结局  选项`;
    console.log(color('bold', color('cyan', headerLine)));
    console.log(`  ${color('cyan', '─'.repeat(headerLine.length - 2))}`);
    for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
        const desc = CHAPTER_DESCRIPTIONS?.[id] || '';
        const row = `${id.padEnd(maxIdLen)}  ${String(countSteps(steps)).padStart(5)}  ${String(countDialogue(steps)).padStart(4)}  ${String(countChoices(steps)).padStart(4)}  ${String(countJumps(steps)).padStart(4)}  ${String(countEndings(steps)).padStart(4)}  ${String(collectOptionCount(steps)).padStart(4)}`;
        console.log(`  ${row}`);
        if (desc) dim(`  ${desc.substring(0, 60)}${desc.length > 60 ? '…' : ''}`);
    }
}

// ─── validate ────────────────────────────────────────────────────────
function cmdValidate() {
    console.log(header('🔍 数据完整性验证'));

    const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;

    // 组装数据对象（与 validatePackData 兼容）
    const data = { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS };

    const start = Date.now();

    // 第一部分：基础检查（使用引擎验证器）
    const warnings = validatePackData(data);

    // 第二部分：额外的结构性检查
    const extraWarnings = [];

    // 2a. 检查每个步骤的结构
    for (const [chId, steps] of Object.entries(STORY_CHAPTERS || {})) {
        if (!Array.isArray(steps)) continue;
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (s.type === 'choice' && (!s.choices || s.choices.length === 0)) {
                extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 类型为 choice 但选项列表为空`);
            }
            if (s.type === 'choice' && s.choices) {
                for (let j = 0; j < s.choices.length; j++) {
                    const c = s.choices[j];
                    if (!c.jumpChapter) {
                        extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 选项 #${j + 1} 没有跳转目标`);
                    }
                }
            }
            if (s.type === 'jump' && !s.jumpChapter && !s.endingId) {
                extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 类型为 jump 但缺少目标和 endingId`);
            }
            if (s.type === 'ending' && !s.endingId) {
                extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 类型为 ending 但缺少 endingId`);
            }
            // 检查角色变更引用的角色是否存在
            const changes = s.characterChanges || s._charChanges || [];
            for (const cc of changes) {
                if (cc.id && CHARACTERS && !CHARACTERS[cc.id]) {
                    extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 角色变更引用不存在的角色 "${cc.id}"`);
                }
            }
        }
    }

    // 2b. 结局引用检查
    const endingIds = new Set((ENDINGS || []).map(e => e.id));
    for (const [chId, steps] of Object.entries(STORY_CHAPTERS || {})) {
        if (!Array.isArray(steps)) continue;
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (s.endingId && !endingIds.has(s.endingId)) {
                extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 引用不存在的结局 "${s.endingId}"`);
            }
            if (s.type === 'choice' && s.choices) {
                for (const c of s.choices) {
                    if (c.jumpChapter && c.jumpChapter.startsWith('_end_')) {
                        const eid = c.jumpChapter.slice(5);
                        if (!endingIds.has(eid)) {
                            extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 选项跳转到不存在的结局 "${eid}"`);
                        }
                    }
                }
            }
            if (s.jumpChapter && s.jumpChapter.startsWith('_end_')) {
                const eid = s.jumpChapter.slice(5);
                if (!endingIds.has(eid)) {
                    extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 跳转到不存在的结局 "${eid}"`);
                }
            }
        }
    }

    const elapsed = Date.now() - start;

    // 输出结果
    const allWarnings = [...warnings, ...extraWarnings];
    if (allWarnings.length === 0) {
        success('完全通过，未发现问题');
    } else {
        console.log('');
        for (const w of allWarnings) warn(w);
    }

    console.log('');
    info('验证耗时', formatDuration(elapsed));
    info('结果', `${color(allWarnings.length === 0 ? 'green' : 'yellow', allWarnings.length === 0 ? '✓ 通过' : `⚠ ${allWarnings.length} 个警告`)}`);
}

// ─── list ────────────────────────────────────────────────────────────
function cmdList(type, opts) {
    const { STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS, CHAPTER_DESCRIPTIONS } = GameData;

    switch (type) {
        case 'chapters': {
            console.log(header(`📜 章节列表 (${Object.keys(STORY_CHAPTERS).length})`));
            for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
                const desc = CHAPTER_DESCRIPTIONS?.[id] || '';
                const choiceCount = collectOptionCount(steps);
                const parts = [
                    `步:${steps.length}`,
                    countChoices(steps) > 0 ? `分:${countChoices(steps)}` : '',
                    choiceCount > 0 ? `选:${choiceCount}` : '',
                    countJumps(steps) > 0 ? `跳:${countJumps(steps)}` : '',
                    countEndings(steps) > 0 ? `结:${countEndings(steps)}` : '',
                ].filter(Boolean).join(' ');
                console.log(`  ${color('bold', id)}  ${color('gray', `(${parts})`)}`);
                if (desc && !opts.silent) dim(`  ${desc.substring(0, 70)}`);
                const stepsWithText = steps.filter(s => s.text || (s.texts && s.texts.length));
                if (opts.verbose && stepsWithText.length > 0) {
                    for (let i = 0; i < Math.min(stepsWithText.length, 3); i++) {
                        const s = stepsWithText[i];
                        const txt = (s.texts?.[0] || s.text || '').substring(0, 50);
                        dim(`    #${steps.indexOf(s) + 1}: ${txt}`);
                    }
                    if (stepsWithText.length > 3) dim(`    … 还有 ${stepsWithText.length - 3} 步`);
                }
            }
            break;
        }
        case 'characters': {
            console.log(header(`👤 角色列表 (${Object.keys(CHARACTERS || {}).length})`));
            for (const [id, ch] of Object.entries(CHARACTERS || {})) {
                const spriteCount = Object.keys(ch.sprites || {}).length;
                const avatarCount = Object.keys(ch.avatars || {}).length;
                console.log(`  ${color('bold', id)}  ${color('green', ch.name || '?')}  ${color('gray', `立绘:${spriteCount} 头像:${avatarCount}${ch.role ? ' ' + ch.role : ''}${ch.race ? ' ' + ch.race : ''}`)}`);
            }
            break;
        }
        case 'scenes': {
            console.log(header(`🏞️ 场景列表 (${Object.keys(SCENES || {}).length})`));
            for (const [id, sc] of Object.entries(SCENES || {})) {
                console.log(`  ${color('bold', id)}  ${sc.title || sc.url || '(无标题)'}${sc.url ? color('gray', ' → ' + sc.url) : ''}`);
            }
            break;
        }
        case 'cg': {
            console.log(header(`🖼️ CG 图鉴列表 (${Object.keys(CG_LIBRARY || {}).length})`));
            for (const [id, cg] of Object.entries(CG_LIBRARY || {})) {
                console.log(`  ${color('bold', id)}  ${cg.title || '(无标题)'}${cg.url ? color('gray', ' → ' + cg.url) : ''}${cg.subtitle ? color('dim', ' — ' + cg.subtitle) : ''}`);
            }
            break;
        }
        case 'items': {
            console.log(header(`🎒 物品列表 (${Object.keys(ITEMS || {}).length})`));
            for (const [id, item] of Object.entries(ITEMS || {})) {
                console.log(`  ${item.icon || ' '} ${color('bold', id)}  ${color('green', item.name || '?')}${item.description ? color('gray', ' — ' + item.description.substring(0, 50)) : ''}`);
            }
            break;
        }
        case 'endings': {
            console.log(header(`🎬 结局列表 (${(ENDINGS || []).length})`));
            for (const end of ENDINGS || []) {
                // 统计引用次数
                let refs = 0;
                for (const steps of Object.values(STORY_CHAPTERS)) {
                    for (const s of steps) {
                        if (s.endingId === end.id) refs++;
                        if (s.type === 'choice' && s.choices) {
                            for (const c of s.choices) {
                                if (c.jumpChapter === '_end_' + end.id) refs++;
                            }
                        }
                        if (s.jumpChapter === '_end_' + end.id) refs++;
                    }
                }
                console.log(`  ${color('bold', end.id)}  ${end.title || '(无标题)'}  ${color('gray', `引用:${refs}次`)}`);
                if (end.description && !opts.silent) dim(`  ${end.description.substring(0, 80)}`);
            }
            break;
        }
        default:
            console.log(`  ${color('red', '未知资源类型:')} ${type}`);
            console.log(`  有效类型: chapters, characters, scenes, cg, items, endings`);
            process.exitCode = 1;
    }
}

// ─── export ──────────────────────────────────────────────────────────
function cmdExport(format, opts) {
    const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS, CHAPTER_DESCRIPTIONS, HOME_CONFIG } = GameData;

    let output;
    let filename;

    switch (format) {
        case 'json': {
            const exportData = {
                meta: {
                    title: GAME_CONFIG.title,
                    exportedAt: new Date().toISOString(),
                    chapterCount: Object.keys(STORY_CHAPTERS).length,
                    totalSteps: Object.values(STORY_CHAPTERS).reduce((a, s) => a + s.length, 0),
                },
                gameConfig: GAME_CONFIG,
                characters: CHARACTERS,
                scenes: SCENES,
                cgLibrary: CG_LIBRARY,
                items: ITEMS,
                endings: ENDINGS,
                chapters: STORY_CHAPTERS,
                chapterDescriptions: CHAPTER_DESCRIPTIONS,
            };
            output = JSON.stringify(exportData, null, opts.pretty ? 2 : undefined);
            filename = 'galgame-export.json';
            break;
        }
        case 'js': {
            // 生成 JS 模块代码（与 editor exportAll 一致）
            const lines = [
                '/**',
                ' * 由 CLI 工具生成的故事数据',
                ` * 导出时间：${new Date().toISOString()}`,
                ` * 章节：${Object.keys(STORY_CHAPTERS).length} / 步骤：${Object.values(STORY_CHAPTERS).reduce((a, s) => a + s.length, 0)}`,
                ' */',
                '',
            ];
            for (const [cid, steps] of Object.entries(STORY_CHAPTERS)) {
                const vn = 'chapter_' + cid.replace(/-/g, '_');
                lines.push(`export const ${vn} = ${JSON.stringify(steps, null, opts.pretty ? 2 : undefined)};`, '');
            }
            lines.push('export const STORY_CHAPTERS = {');
            for (const cid of Object.keys(STORY_CHAPTERS)) {
                lines.push(`    '${cid}': chapter_${cid.replace(/-/g, '_')},`);
            }
            lines.push('};');
            lines.push('');
            lines.push('export const CHAPTER_DESCRIPTIONS = ' + JSON.stringify(CHAPTER_DESCRIPTIONS, null, opts.pretty ? 2 : undefined) + ';');

            // 同时输出配置（方便同步）
            lines.push('');
            lines.push('export const GAME_CONFIG = ' + JSON.stringify(GAME_CONFIG, null, opts.pretty ? 2 : undefined) + ';');
            lines.push('export const CHARACTERS = ' + JSON.stringify(CHARACTERS, null, opts.pretty ? 2 : undefined) + ';');
            lines.push('export const SCENES = ' + JSON.stringify(SCENES, null, opts.pretty ? 2 : undefined) + ';');
            lines.push('export const CG_LIBRARY = ' + JSON.stringify(CG_LIBRARY, null, opts.pretty ? 2 : undefined) + ';');
            lines.push('export const ITEMS = ' + JSON.stringify(ITEMS, null, opts.pretty ? 2 : undefined) + ';');
            lines.push('export const ENDINGS = ' + JSON.stringify(ENDINGS, null, opts.pretty ? 2 : undefined) + ';');

            output = lines.join('\n');
            filename = 'galgame-export.js';
            break;
        }
        default:
            console.log(`  ${color('red', '未知导出格式:')} ${format}`);
            console.log(`  有效格式: json, js`);
            process.exitCode = 1;
            return;
    }

    if (opts.output) {
        const outPath = resolve(process.cwd(), opts.output);
        writeFileSync(outPath, output, 'utf-8');
        success(`已写入文件: ${outPath}`);
    } else {
        // 输出到 stdout 或打印摘要
        if (opts.silent) {
            console.log(output);
        } else {
            const sizeKB = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(1);
            console.log(header(`📦 导出 ${format.toUpperCase()}`));
            info('文件名', filename);
            info('大小', `${sizeKB} KB`);
            info('章节数', Object.keys(STORY_CHAPTERS).length);
            info('步骤数', Object.values(STORY_CHAPTERS).reduce((a, s) => a + s.length, 0));
            console.log('');
            // 输出前 20 行预览
            const previewLines = output.split('\n').slice(0, 20);
            console.log(color('gray', previewLines.join('\n')));
            if (output.split('\n').length > 20) {
                console.log(color('gray', `\n… 剩余 ${output.split('\n').length - 20} 行`));
            }
            console.log('');
            info('提示', `使用 ${color('cyan', '--output <file>')} 导出到文件，或 ${color('cyan', '--silent')} 输出原始数据`);
        }
    }
}

// ─── analyze ─────────────────────────────────────────────────────────
function cmdAnalyze(type, opts) {
    const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;

    switch (type) {
        case 'stats': {
            console.log(header('📊 剧情统计'));

            let totalSteps = 0, totalDialogue = 0, totalChoices = 0;
            let totalOptions = 0, totalJumps = 0, totalEndingCalls = 0;
            let maxSteps = 0, minSteps = Infinity, maxStepsId = '', minStepsId = '';
            const allChoiceTexts = [];

            for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
                const n = steps.length;
                totalSteps += n;
                totalDialogue += countDialogue(steps);
                totalChoices += countChoices(steps);
                totalJumps += countJumps(steps);
                totalEndingCalls += countEndings(steps);
                totalOptions += collectOptionCount(steps);

                if (n > maxSteps) { maxSteps = n; maxStepsId = id; }
                if (n < minSteps) { minSteps = n; minStepsId = id; }

                for (const s of steps) {
                    if (s.type === 'choice' && s.choices) {
                        for (const c of s.choices) {
                            allChoiceTexts.push(c.text);
                        }
                    }
                }
            }

            // 对话总字数
            let totalChars = 0;
            for (const steps of Object.values(STORY_CHAPTERS)) {
                for (const s of steps) {
                    if (s.text) totalChars += s.text.length;
                    if (s.texts) for (const t of s.texts) totalChars += t.length;
                }
            }

            const avgSteps = Object.keys(STORY_CHAPTERS).length > 0
                ? (totalSteps / Object.keys(STORY_CHAPTERS).length).toFixed(1) : '0';

            info('章节数', Object.keys(STORY_CHAPTERS).length);
            info('总步骤数', totalSteps);
            info('对话步骤', `${totalDialogue} (${(totalDialogue / totalSteps * 100).toFixed(1)}%)`);
            info('分支步骤', `${totalChoices} (${(totalChoices / totalSteps * 100).toFixed(1)}%)`);
            info('跳转步骤', `${totalJumps} (${(totalJumps / totalSteps * 100).toFixed(1)}%)`);
            info('结局触发', totalEndingCalls);
            info('分支选项', totalOptions);
            info('对话总字数', `${totalChars} 字`);
            info('平均每章步数', avgSteps);
            info('最多步骤章节', `${maxStepsId} (${maxSteps} 步)`);
            info('最少步骤章节', `${minStepsId} (${minSteps} 步)`);

            // 如果没有 silent，显示一些有趣的统计
            if (!opts.silent) {
                const uniqueChoices = [...new Set(allChoiceTexts.filter(Boolean))];
                console.log('');
                info('唯一选项文本数', uniqueChoices.length);
                if (uniqueChoices.length > 0) {
                    console.log(color('gray', `  例: "${uniqueChoices.slice(0, 5).join('", "')}"`));
                }
            }
            break;
        }

        case 'branches': {
            console.log(header('🌿 分支分析'));

            // 构建章节引用图
            const refs = {}; // chapterId -> Set of targets
            for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
                refs[id] = new Set();
                for (const s of steps) {
                    if (s.type === 'choice' && s.choices) {
                        for (const c of s.choices) {
                            if (c.jumpChapter) refs[id].add(c.jumpChapter);
                        }
                    }
                    if (s.jumpChapter) refs[id].add(s.jumpChapter);
                }
            }

            // 计算入度
            const inDegree = {};
            const chaptersSorted = Object.keys(STORY_CHAPTERS);
            for (const id of chaptersSorted) { inDegree[id] = 0; }

            for (const [src, targets] of Object.entries(refs)) {
                for (const t of targets) {
                    if (t.startsWith('_end_')) continue;
                    if (inDegree[t] !== undefined) inDegree[t]++;
                }
            }

            // 找出死胡同章节（无出度且不是结局）
            const deadEnds = chaptersSorted.filter(id => refs[id].size === 0);

            // 找出孤立章节（无入度且不是 main）
            const isolated = chaptersSorted.filter(id => id !== 'main' && inDegree[id] === 0);

            // 找出有分支选择的章节
            const branchingChapters = chaptersSorted.filter(id => {
                const steps = STORY_CHAPTERS[id];
                return steps.some(s => s.type === 'choice');
            });

            info('总章节数', chaptersSorted.length);
            info('有分支章节', `${branchingChapters.length} (${(branchingChapters.length / chaptersSorted.length * 100).toFixed(1)}%)`);
            info('入度为零（除main外）', isolated.length > 0 ? color('yellow', `${isolated.length}`) : color('green', '0'));
            info('零出度章节（可能为终点）', deadEnds.length > 0 ? color('yellow', `${deadEnds.length}`) : color('green', '0'));

            if (isolated.length > 0 && !opts.silent) {
                console.log('');
                warn('孤立章节（无引用指向）:');
                for (const id of isolated) {
                    const desc = CHAPTER_DESCRIPTIONS?.[id] || '';
                    console.log(`    ${color('bold', id)}  ${color('gray', desc.substring(0, 50))}`);
                }
            }

            if (deadEnds.length > 0 && !opts.silent) {
                console.log('');
                warn('零出度章节（无跳转目标）:');
                for (const id of deadEnds) {
                    const desc = CHAPTER_DESCRIPTIONS?.[id] || '';
                    console.log(`    ${color('bold', id)}  ${color('gray', desc.substring(0, 50))}`);
                }
            }

            // 输出引用图（简化版）
            if (opts.verbose) {
                console.log('');
                console.log(header('🔄 引用关系图'));
                for (const id of chaptersSorted) {
                    const targets = [...refs[id]];
                    if (targets.length === 0) {
                        dim(`  ${id} → (无)`);
                    } else {
                        const chTargets = targets.filter(t => !t.startsWith('_end_'));
                        const endTargets = targets.filter(t => t.startsWith('_end_'));
                        const parts = [];
                        if (chTargets.length > 0) parts.push(chTargets.join(', '));
                        if (endTargets.length > 0) parts.push(color('magenta', endTargets.join(', ')));
                        console.log(`  ${color('bold', id)} → ${parts.join(' | ')}`);
                    }
                }
            }
            break;
        }

        case 'crossref': {
            console.log(header('🔗 交叉引用分析'));

            const { CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;
            const endingIds = new Set((ENDINGS || []).map(e => e.id));

            // 收集所有引用
            const usedScenes = new Set();
            const usedCharacters = new Set();
            const usedCG = new Set();
            const usedItems = new Set();
            const usedEndings = new Set();
            const refDetails = {};

            for (const [chId, steps] of Object.entries(STORY_CHAPTERS)) {
                for (let i = 0; i < steps.length; i++) {
                    const s = steps[i];
                    const key = `${chId}#${i + 1}`;
                    if (s.sceneId) { usedScenes.add(s.sceneId); }
                    if (s.characterId) { usedCharacters.add(s.characterId); }
                    if (s.cgChanges?.id) { usedCG.add(s.cgChanges.id); }
                    if (s.gainItem) { usedItems.add(s.gainItem); }
                    if (s.endingId) { usedEndings.add(s.endingId); }
                    const changes = s.characterChanges || s._charChanges || [];
                    for (const cc of changes) {
                        if (cc.id) usedCharacters.add(cc.id);
                    }
                }
            }

            // 已定义的所有资源
            const allScenes = new Set(Object.keys(SCENES || {}));
            const allChars = new Set(Object.keys(CHARACTERS || {}));
            const allCG = new Set(Object.keys(CG_LIBRARY || {}));
            const allItems = new Set(Object.keys(ITEMS || {}));

            // 缺失引用
            const missingScenes = [...usedScenes].filter(s => !allScenes.has(s));
            const missingChars = [...usedCharacters].filter(s => !allChars.has(s));
            const missingCG = [...usedCG].filter(s => !allCG.has(s));
            const missingItems = [...usedItems].filter(s => !allItems.has(s));
            const missingEndings = [...usedEndings].filter(s => !endingIds.has(s));

            // 未使用的资源
            const unusedScenes = [...allScenes].filter(s => !usedScenes.has(s));
            const unusedChars = [...allChars].filter(s => !usedCharacters.has(s));
            const unusedCGs = [...allCG].filter(s => !usedCG.has(s));
            const unusedItems = [...allItems].filter(s => !usedItems.has(s));

            info('场景', `${usedScenes.size}/${allScenes.size} 被使用`);
            info('角色', `${usedCharacters.size}/${allChars.size} 被使用`);
            info('CG', `${usedCG.size}/${allCG.size} 被使用`);
            info('物品', `${usedItems.size}/${allItems.size} 被使用`);

            const totalMissing = missingScenes.length + missingChars.length + missingCG.length + missingItems.length + missingEndings.length;
            const totalUnused = unusedScenes.length + unusedChars.length + unusedCGs.length + unusedItems.length;

            if (totalMissing > 0) {
                console.log('');
                warn(`缺失引用 (${totalMissing}):`);
                for (const id of missingScenes) error(`  场景 "${id}" 被引用但未定义`);
                for (const id of missingChars) error(`  角色 "${id}" 被引用但未定义`);
                for (const id of missingCG) error(`  CG "${id}" 被引用但未定义`);
                for (const id of missingItems) error(`  物品 "${id}" 被引用但未定义`);
                for (const id of missingEndings) error(`  结局 "${id}" 被引用但未定义`);
            }

            if (totalUnused > 0 && !opts.silent) {
                console.log('');
                warn(`未使用的资源 (${totalUnused}):`);
                for (const id of unusedScenes) warn(`  场景 "${id}" 定义了但未被任何步骤引用`);
                for (const id of unusedChars) warn(`  角色 "${id}" 定义了但未被任何步骤引用`);
                for (const id of unusedCGs) warn(`  CG "${id}" 定义了但未被引用`);
                for (const id of unusedItems) warn(`  物品 "${id}" 定义了但未被引用`);
            }

            if (totalMissing === 0) {
                console.log('');
                success('所有资源引用均有效');
            }
            break;
        }

        default:
            console.log(`  ${color('red', '未知分析类型:')} ${type}`);
            console.log(`  有效类型: stats, branches, crossref`);
            process.exitCode = 1;
    }
}

// ─── help ────────────────────────────────────────────────────────────
function cmdHelp() {
    const b = (t) => color('bold', color('cyan', t));

    console.log(`
${color('bold', '剧情树节点编辑器 CLI')}
${color('gray', '用法: node editor/cli.js <command> [options]')}

${b('命令:')}
  ${b('validate')}                 验证所有游戏数据的完整性
  ${b('list')}       <type>        列出资源
                       chapters    章节列表（含步骤数统计）
                       characters  角色列表（含立绘/头像数）
                       scenes      场景列表
                       cg          CG 图鉴列表
                       items       物品列表
                       endings     结局列表
  ${b('export')}     <format>      导出数据
                       json        导出为 JSON
                       js          导出为 JS 模块代码
  ${b('analyze')}    <type>        分析剧情结构
                       stats       总体统计
                       branches    分支引用分析
                       crossref    交叉引用检查
  ${b('info')}                     显示项目概览
  ${b('help')}                     显示此帮助信息

${b('选项:')}
  -p, --pretty                     美化输出（JSON 缩进）
  -o, --output <file>              输出到文件（仅 export）
  -s, --silent                     静默模式（仅原始数据，无装饰）
  -v, --verbose                    详细输出

${b('示例:')}
  ${color('gray', 'node editor/cli.js info')}
  ${color('gray', 'node editor/cli.js validate')}
  ${color('gray', 'node editor/cli.js list chapters')}
  ${color('gray', 'node editor/cli.js list characters')}
  ${color('gray', 'node editor/cli.js export json --pretty --output export.json')}
  ${color('gray', 'node editor/cli.js analyze stats')}
  ${color('gray', 'node editor/cli.js analyze branches --verbose')}
  ${color('gray', 'node editor/cli.js analyze crossref')}
`);
}

// ══════════════════════════════════════════════════════════════════════
//  命令行入口
// ══════════════════════════════════════════════════════════════════════

function main() {
    const args = process.argv.slice(2);

    // 解析选项
    const opts = {
        pretty: false,
        output: null,
        silent: false,
        verbose: false,
    };

    const positional = [];
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-p': case '--pretty': opts.pretty = true; break;
            case '-o': case '--output': opts.output = args[++i]; break;
            case '-s': case '--silent': opts.silent = true; break;
            case '-v': case '--verbose': opts.verbose = true; break;
            default: positional.push(args[i]);
        }
    }

    const command = positional[0] || 'help';

    try {
        switch (command) {
            case 'info':
                cmdInfo();
                break;
            case 'validate':
                cmdValidate();
                break;
            case 'list':
                if (!positional[1]) {
                    console.log(`  ${color('red', '请指定资源类型')}: chapters, characters, scenes, cg, items, endings\n`);
                    cmdHelp();
                    process.exitCode = 1;
                } else {
                    cmdList(positional[1], opts);
                }
                break;
            case 'export':
                if (!positional[1]) {
                    console.log(`  ${color('red', '请指定导出格式')}: json, js\n`);
                    cmdHelp();
                    process.exitCode = 1;
                } else {
                    cmdExport(positional[1], opts);
                }
                break;
            case 'analyze':
                if (!positional[1]) {
                    console.log(`  ${color('red', '请指定分析类型')}: stats, branches, crossref\n`);
                    cmdHelp();
                    process.exitCode = 1;
                } else {
                    cmdAnalyze(positional[1], opts);
                }
                break;
            case 'help': default:
                cmdHelp();
                break;
        }
    } catch (e) {
        console.error(`\n  ${color('red', '发生错误:')} ${e.message}`);
        if (opts.verbose) {
            console.error(e);
        }
        process.exitCode = 1;
    }
}

main();

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
 *   info [topic]            显示项目信息（stats|chapters|resources）
 *   validate                验证所有游戏数据的完整性
 *   resource <action> ...   资源管理（add|delete|set|get|list|rename）
 *   export     <format>     导出数据（json|js）
 *   analyze    <type>       分析剧情（branches|crossref）
 *   help                    显示此帮助信息
 *
 * 资源管理:
 *   resource add <type> [id]             添加新资源
 *   resource delete <type> <id>          删除资源
 *   resource set <type> <id> <path> <val> 设置深层属性
 *   resource get <type> <id> [path]       查看资源/属性
 *   resource list <type>                 列出资源
 *   resource rename <type> <oldId> <newId> 重命名资源
 *
 * 选项:
 *   --pretty, -p    美化输出（JSON 缩进）
 *   --output, -o    输出到文件（export 及 resource 修改命令）
 *   --silent, -s    静默模式（仅输出原始数据，无装饰）
 *   --verbose, -v   详细输出
 *   --save, -S      保存修改到 JSON 文件（resource add/set/delete/rename）
 *   --interactive, -i  启动交互模式（含 Tab 命令补全）
 */

// ══════════════════════════════════════════════════════════════════════
//  依赖
// ══════════════════════════════════════════════════════════════════════
import * as GameData from '../../resource-packs/default/index.js';
import { validatePackData } from '@galgame/engine';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline';

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

// ══════════════════════════════════════════════════════════════════════
//  深度路径访问辅助
// ══════════════════════════════════════════════════════════════════════

/**
 * 解析值字符串为合适类型（JSON、数字或原始字符串）
 */
function parseValue(str) {
    if (str === undefined || str === null) return str;
    try { return JSON.parse(str); } catch {}
    if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
    return str;
}

/**
 * 通过点号路径安全地获取深层属性
 * 对数组支持数字索引或 id 属性查找
 */
function deepGet(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        if (Array.isArray(current)) {
            current = /^\d+$/.test(part)
                ? current[parseInt(part)]
                : current.find(item => item && item.id === part);
        } else {
            current = current[part];
        }
    }
    return current;
}

/**
 * 通过点号路径安全地设置深层属性
 * 自动创建中间对象/数组
 */
function deepSet(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current == null || typeof current !== 'object') return false;
        const nextIsNum = /^\d+$/.test(parts[i + 1]);
        if (!(parts[i] in current)) {
            current[parts[i]] = nextIsNum ? [] : {};
        }
        current = current[parts[i]];
    }
    if (current == null || typeof current !== 'object') return false;
    current[parts[parts.length - 1]] = value;
    return true;
}

/**
 * 获取资源容器及其元信息
 */
function getResourceMeta(type) {
    const map = {
        chapters:   { data: GameData.STORY_CHAPTERS,        label:'章节', isObject:true, isChapter:true },
        characters: { data: GameData.CHARACTERS,            label:'角色', isObject:true },
        scenes:     { data: GameData.SCENES,                label:'场景', isObject:true },
        cg:         { data: GameData.CG_LIBRARY,            label:'CG 图鉴', isObject:true },
        items:      { data: GameData.ITEMS,                 label:'物品', isObject:true },
        endings:    { data: GameData.ENDINGS,               label:'结局', isObject:false },
    };
    return map[type] || null;
}

/**
 * 将当前游戏数据保存为 JSON 文件（配合 --save 选项使用）
 */
function saveGameData(outputPath) {
    const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS, CHAPTER_DESCRIPTIONS, HOME_CONFIG } = GameData;
    const data = {
        meta: {
            title: GAME_CONFIG.title,
            savedAt: new Date().toISOString(),
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
    const outPath = outputPath || resolve(process.cwd(), 'galgame-saved.json');
    writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    success(`已保存到文件: ${outPath}`);
}

// ══════════════════════════════════════════════════════════════════════
//  步骤统计辅助
// ══════════════════════════════════════════════════════════════════════

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
function cmdInfo(sub, opts) {
    switch (sub) {
        case 'stats':     return cmdInfoStats(opts);
        case 'chapters':  return cmdInfoChapters(opts);
        case 'resources': return cmdInfoResources(opts);
        default:          return cmdInfoOverview(opts);
    }
}

function cmdInfoOverview() {
    const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;

    console.log(header(`📖 ${GAME_CONFIG.title || '未命名游戏'}`));

    info('画面', `${GAME_CONFIG.aspectRatio?.width || 1280}×${GAME_CONFIG.aspectRatio?.height || 720}`);
    info('打字速度', `${GAME_CONFIG.textSpeed || 25}ms/字`);

    let totalSteps = 0, totalChoices = 0, totalOptions = 0;
    for (const steps of Object.values(STORY_CHAPTERS)) {
        totalSteps += steps.length;
        totalChoices += countChoices(steps);
        totalOptions += collectOptionCount(steps);
    }

    console.log(header('📊 资源统计'));
    info('章节', `${Object.keys(STORY_CHAPTERS).length}`);
    info('步骤', totalSteps);
    info('分支选项', totalOptions);
    info('角色', Object.keys(CHARACTERS || {}).length);
    info('场景', Object.keys(SCENES || {}).length);
    info('CG 图鉴', Object.keys(CG_LIBRARY || {}).length);
    info('物品', Object.keys(ITEMS || {}).length);
    info('结局', (ENDINGS || []).length);

    console.log('');
    info('提示', `使用 ${color('cyan', 'info stats')} 查看详细统计`);
    info('提示', `使用 ${color('cyan', 'info chapters')} 查看章节列表`);
    info('提示', `使用 ${color('cyan', 'info resources')} 查看资源详情`);
}

function cmdInfoStats() {
    const { STORY_CHAPTERS } = GameData;

    console.log(header('📊 详细剧情统计'));

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

    const chCount = Object.keys(STORY_CHAPTERS).length;
    const avgSteps = chCount > 0 ? (totalSteps / chCount).toFixed(1) : '0';

    info('章节数', chCount);
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

    const uniqueChoices = [...new Set(allChoiceTexts.filter(Boolean))];
    if (uniqueChoices.length > 0) {
        console.log('');
        info('唯一选项文本数', uniqueChoices.length);
        console.log(color('gray', `  例: "${uniqueChoices.slice(0, 5).join('", "')}"`));
    }
}

function cmdInfoChapters() {
    const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;

    console.log(header(`📜 章节一览 (${Object.keys(STORY_CHAPTERS).length})`));
    const maxIdLen = Math.max(...Object.keys(STORY_CHAPTERS).map(k => k.length), 10);
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

function cmdInfoResources() {
    const { CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;

    console.log(header('👤 角色'));
    for (const [id, ch] of Object.entries(CHARACTERS || {})) {
        const spriteCount = Object.keys(ch.sprites || {}).length;
        const avatarCount = Object.keys(ch.avatars || {}).length;
        console.log(`  ${color('bold', id)}  ${color('green', ch.name || '?')}  ${color('gray', `立绘:${spriteCount} 头像:${avatarCount}${ch.role ? ' ' + ch.role : ''}`)}`);
    }

    console.log(header('🏞️ 场景'));
    for (const [id, sc] of Object.entries(SCENES || {})) {
        console.log(`  ${color('bold', id)}  ${sc.title || '(无标题)'}${sc.url ? color('gray', ' → ' + sc.url) : ''}`);
    }

    console.log(header('🖼️ CG 图鉴'));
    for (const [id, cg] of Object.entries(CG_LIBRARY || {})) {
        console.log(`  ${color('bold', id)}  ${cg.title || '(无标题)'}${cg.subtitle ? color('dim', ' — ' + cg.subtitle) : ''}`);
    }

    console.log(header('🎒 物品'));
    for (const [id, item] of Object.entries(ITEMS || {})) {
        console.log(`  ${item.icon || ' '} ${color('bold', id)}  ${color('green', item.name || '?')}${item.description ? color('gray', ' — ' + item.description.substring(0, 50)) : ''}`);
    }

    console.log(header('🎬 结局'));
    for (const end of ENDINGS || []) {
        console.log(`  ${color('bold', end.id)}  ${end.title || '(无标题)'}${end.description ? color('gray', ' — ' + end.description.substring(0, 50)) : ''}`);
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

            for (const [chId, steps] of Object.entries(STORY_CHAPTERS)) {
                for (let i = 0; i < steps.length; i++) {
                    const s = steps[i];
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
            console.log(`  有效类型: branches, crossref`);
            process.exitCode = 1;
    }
}

// ─── resource ────────────────────────────────────────────────────────

function cmdResource(args, opts) {
    const sub = args[0];
    if (!sub) {
        console.log(`  ${color('red', '请指定资源操作')}: add, delete, set, get, list, rename`);
        console.log(`  使用 ${color('cyan', 'resource list <type>')} 列出资源`);
        console.log(`  使用 ${color('cyan', 'resource add <type> [id]')} 添加资源`);
        console.log(`  使用 ${color('cyan', 'resource get <type> <id> [path]')} 查看资源`);
        console.log(`  使用 ${color('cyan', 'resource set <type> <id> <path> <value>')} 修改属性`);
        process.exitCode = 1;
        return;
    }

    switch (sub) {
        case 'add':    cmdResourceAdd(args.slice(1), opts); break;
        case 'delete': cmdResourceDelete(args.slice(1), opts); break;
        case 'set':    cmdResourceSet(args.slice(1), opts); break;
        case 'get':    cmdResourceGet(args.slice(1), opts); break;
        case 'list':   cmdResourceList(args[1], opts); break;
        case 'rename': cmdResourceRename(args.slice(1), opts); break;
        default:
            console.log(`  ${color('red', '未知资源操作:')} ${sub}`);
            console.log(`  有效操作: add, delete, set, get, list, rename`);
            process.exitCode = 1;
    }
}

function cmdResourceAdd(args, opts) {
    const type = args[0];
    const customId = args[1];
    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        console.log(`  有效类型: chapters, characters, scenes, cg, items, endings`);
        process.exitCode = 1;
        return;
    }

    // 生成 ID
    const ts = Date.now().toString(36);
    const newId = customId || (type + '_' + ts);

    // 检查是否已存在
    if (meta.isObject && meta.data[newId]) {
        error(`"${newId}" 已存在`);
        process.exitCode = 1;
        return;
    }
    if (!meta.isObject && meta.data.some(e => e.id === newId)) {
        error(`"${newId}" 已存在`);
        process.exitCode = 1;
        return;
    }

    // 按类型创建默认资源
    if (meta.isObject) {
        if (meta.isChapter) {
            meta.data[newId] = [
                { sceneId:'', type:'dialogue', characterId:null, text:'新对话段落...', effects:[] },
                { sceneId:'', type:'jump', jumpChapter:'' }
            ];
        } else if (type === 'characters') {
            meta.data[newId] = { name:'新角色', color:'#ffffff', race:'', gender:'', role:'', defaultSpeed:25, description:'', avatars:{}, sprites:{ default:{ id:'default', label:'👤 默认', url:'' } } };
        } else if (type === 'scenes') {
            meta.data[newId] = { title:'新场景', url:'', bgPlaceholder:'#111111' };
        } else if (type === 'cg') {
            meta.data[newId] = { title:'新 CG', subtitle:'', url:'' };
        } else if (type === 'items') {
            meta.data[newId] = { name:'新物品', icon:'📦', image:'', description:'' };
        }
    } else {
        meta.data.push({ id:newId, title:'新结局', description:'' });
    }

    success(`已创建${meta.label}：${color('bold', newId)}`);
    // JSON 输出新建资源的完整内容
    const created = meta.isObject ? meta.data[newId] : meta.data.find(e => e.id === newId);
    console.log(color('gray', JSON.stringify(created, null, 2)));
    if (opts.save) saveGameData(opts.output);
}

function cmdResourceDelete(args, opts) {
    const type = args[0];
    const id = args[1];
    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        process.exitCode = 1;
        return;
    }
    if (!id) {
        console.log(`  ${color('red', '请指定要删除的资源 ID')}`);
        process.exitCode = 1;
        return;
    }

    if (meta.isObject) {
        if (!(id in meta.data)) {
            error(`"${id}" 不存在`);
            process.exitCode = 1;
            return;
        }
        delete meta.data[id];
    } else {
        const idx = meta.data.findIndex(e => e.id === id);
        if (idx === -1) {
            error(`"${id}" 不存在`);
            process.exitCode = 1;
            return;
        }
        meta.data.splice(idx, 1);
    }

    success(`已删除${meta.label}：${color('bold', id)}`);
    if (opts.save) saveGameData(opts.output);
}

function cmdResourceSet(args, opts) {
    const type = args[0];
    const id = args[1];
    const path = args[2];
    const valueRaw = args.slice(3).join(' ');

    if (!type || !id || !path) {
        console.log(`  ${color('red', '用法')}: resource set <type> <id> <path> <value>`);
        console.log(`  示例: resource set characters hero name "新名称"`);
        console.log(`  示例: resource set chapters main 0.text "新对话"`);
        process.exitCode = 1;
        return;
    }

    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        process.exitCode = 1;
        return;
    }

    // 获取目标对象
    let target;
    if (meta.isObject) {
        target = meta.data[id];
    } else {
        target = meta.data.find(e => e.id === id);
    }
    if (!target) {
        error(`"${id}" 不存在`);
        process.exitCode = 1;
        return;
    }

    const value = parseValue(valueRaw);
    const oldVal = deepGet(target, path);
    const ok = deepSet(target, path, value);
    if (!ok) {
        error(`无法设置路径 "${path}"`);
        process.exitCode = 1;
        return;
    }

    const displayVal = JSON.stringify(value);
    const displayOld = oldVal !== undefined ? JSON.stringify(oldVal) : color('gray', '(无)');
    success(`已设置 ${color('bold', `${type}.${id}.${path}`)}`);
    console.log(`  ${color('gray', `${displayOld} → ${color('green', displayVal)}`)}`);
    if (opts.save) saveGameData(opts.output);
}

function cmdResourceGet(args, opts) {
    const type = args[0];
    const id = args[1];
    const path = args[2];

    if (!type || !id) {
        console.log(`  ${color('red', '用法')}: resource get <type> <id> [path]`);
        console.log(`  示例: resource get characters hero`);
        console.log(`  示例: resource get characters hero name`);
        console.log(`  示例: resource get chapters main 0.text`);
        process.exitCode = 1;
        return;
    }

    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        process.exitCode = 1;
        return;
    }

    let target;
    if (meta.isObject) {
        target = meta.data[id];
    } else {
        target = meta.data.find(e => e.id === id);
    }
    if (!target) {
        error(`"${id}" 不存在`);
        process.exitCode = 1;
        return;
    }

    const result = path ? deepGet(target, path) : target;
    if (result === undefined) {
        error(`路径 "${path}" 不存在于 ${type}.${id}`);
        process.exitCode = 1;
        return;
    }

    if (typeof result === 'string') {
        console.log(result);
    } else {
        console.log(JSON.stringify(result, null, opts.pretty ? 2 : undefined));
    }
}

function cmdResourceList(type, opts) {
    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        console.log(`  有效类型: chapters, characters, scenes, cg, items, endings`);
        process.exitCode = 1;
        return;
    }
    const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;

    if (type === 'chapters') {
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
    } else if (type === 'characters') {
        console.log(header(`👤 角色列表 (${Object.keys(GameData.CHARACTERS || {}).length})`));
        for (const [id, ch] of Object.entries(GameData.CHARACTERS || {})) {
            const spriteCount = Object.keys(ch.sprites || {}).length;
            const avatarCount = Object.keys(ch.avatars || {}).length;
            console.log(`  ${color('bold', id)}  ${color('green', ch.name || '?')}  ${color('gray', `立绘:${spriteCount} 头像:${avatarCount}${ch.role ? ' ' + ch.role : ''}${ch.race ? ' ' + ch.race : ''}`)}`);
        }
    } else if (type === 'scenes') {
        console.log(header(`🏞️ 场景列表 (${Object.keys(GameData.SCENES || {}).length})`));
        for (const [id, sc] of Object.entries(GameData.SCENES || {})) {
            console.log(`  ${color('bold', id)}  ${sc.title || sc.url || '(无标题)'}${sc.url ? color('gray', ' → ' + sc.url) : ''}`);
        }
    } else if (type === 'cg') {
        console.log(header(`🖼️ CG 图鉴列表 (${Object.keys(GameData.CG_LIBRARY || {}).length})`));
        for (const [id, cg] of Object.entries(GameData.CG_LIBRARY || {})) {
            console.log(`  ${color('bold', id)}  ${cg.title || '(无标题)'}${cg.url ? color('gray', ' → ' + cg.url) : ''}${cg.subtitle ? color('dim', ' — ' + cg.subtitle) : ''}`);
        }
    } else if (type === 'items') {
        console.log(header(`🎒 物品列表 (${Object.keys(GameData.ITEMS || {}).length})`));
        for (const [id, item] of Object.entries(GameData.ITEMS || {})) {
            console.log(`  ${item.icon || ' '} ${color('bold', id)}  ${color('green', item.name || '?')}${item.description ? color('gray', ' — ' + item.description.substring(0, 50)) : ''}`);
        }
    } else if (type === 'endings') {
        console.log(header(`🎬 结局列表 (${(GameData.ENDINGS || []).length})`));
        for (let i = 0; i < (GameData.ENDINGS || []).length; i++) {
            const end = GameData.ENDINGS[i];
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
            console.log(`  [${i}] ${color('bold', end.id)}  ${end.title || '(无标题)'}  ${color('gray', `引用:${refs}次`)}`);
            if (end.description && !opts.silent) dim(`  ${end.description.substring(0, 80)}`);
        }
    }
}

function cmdResourceRename(args, opts) {
    const type = args[0];
    const oldId = args[1];
    const newId = args[2];

    if (!type || !oldId || !newId) {
        console.log(`  ${color('red', '用法')}: resource rename <type> <oldId> <newId>`);
        console.log(`  示例: resource rename characters hero main_hero`);
        process.exitCode = 1;
        return;
    }

    const meta = getResourceMeta(type);
    if (!meta) {
        console.log(`  ${color('red', '未知资源类型:')} ${type}`);
        process.exitCode = 1;
        return;
    }

    if (meta.isObject) {
        if (!(oldId in meta.data)) {
            error(`"${oldId}" 不存在`);
            process.exitCode = 1;
            return;
        }
        if (oldId === newId) {
            warn('新旧 ID 相同，无需重命名');
            return;
        }
        if (newId in meta.data) {
            error(`"${newId}" 已存在`);
            process.exitCode = 1;
            return;
        }
        meta.data[newId] = meta.data[oldId];
        delete meta.data[oldId];
    } else {
        const item = meta.data.find(e => e.id === oldId);
        if (!item) {
            error(`"${oldId}" 不存在`);
            process.exitCode = 1;
            return;
        }
        if (oldId === newId) {
            warn('新旧 ID 相同，无需重命名');
            return;
        }
        if (meta.data.some(e => e.id === newId)) {
            error(`"${newId}" 已存在`);
            process.exitCode = 1;
            return;
        }
        item.id = newId;
    }

    // 更新章节中的引用
    if (type === 'chapters' || type === 'endings') {
        const { STORY_CHAPTERS } = GameData;
        for (const steps of Object.values(STORY_CHAPTERS)) {
            for (const step of steps) {
                if (step.jumpChapter === oldId) step.jumpChapter = newId;
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                    }
                }
                if (type === 'endings') {
                    const endRef = '_end_' + oldId;
                    const endNewRef = '_end_' + newId;
                    if (step.jumpChapter === endRef) step.jumpChapter = endNewRef;
                    if (step.endingId === oldId) step.endingId = newId;
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === endRef) ch.jumpChapter = endNewRef;
                        }
                    }
                }
            }
        }
    }
    if (type === 'characters') {
        const { STORY_CHAPTERS } = GameData;
        for (const steps of Object.values(STORY_CHAPTERS)) {
            for (const step of steps) {
                if (step.characterId === oldId) step.characterId = newId;
                const changes = step.characterChanges || step._charChanges || [];
                for (const cc of changes) {
                    if (cc.id === oldId) cc.id = newId;
                }
            }
        }
    }
    if (type === 'scenes') {
        const { STORY_CHAPTERS } = GameData;
        for (const steps of Object.values(STORY_CHAPTERS)) {
            for (const step of steps) {
                if (step.sceneId === oldId) step.sceneId = newId;
            }
        }
    }

    success(`已重命名${meta.label}：${color('bold', oldId)} → ${color('bold', newId)}`);
    if (type === 'chapters' || type === 'endings' || type === 'characters' || type === 'scenes') {
        info('引用', '已自动更新所有章节中的引用');
    }
    if (opts.save) saveGameData(opts.output);
}

// ─── help ────────────────────────────────────────────────────────────
function cmdHelp() {
    const b = (t) => color('bold', color('cyan', t));

    console.log(`
${color('bold', '剧情树节点编辑器 CLI')}
${color('gray', '用法: node editor/cli.js <command> [options]')}

${b('命令:')}
  ${b('info')}      [stats|chapters|resources]  项目信息
  ${b('validate')}                              数据完整性验证
  ${b('resource')}  <add|delete|set|get|list|rename> 资源管理
  ${b('export')}    <json|js>                   导出数据
  ${b('analyze')}   <branches|crossref>         分析剧情

${b('选项:')}
  -p, --pretty               美化输出（JSON 缩进）
  -o, --output  <file>       输出到文件
  -s, --silent               静默模式
  -v, --verbose              详细输出
  -S, --save                 保存修改到 JSON
  -i, --interactive          交互模式

${b('使用')} ${color('gray', 'node editor/cli.js <command> --help  查看各命令详细用法')}
`);
}

// ══════════════════════════════════════════════════════════════════════
//  交互模式（含 Tab 补全）
// ══════════════════════════════════════════════════════════════════════

/**
 * fuzzy match：query 字符按顺序出现在 text 中
 */
function fuzzyMatch(query, text) {
    if (!query) return true;
    const q = query.toLowerCase(), t = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (q[qi] === t[ti]) qi++;
    }
    return qi >= q.length;
}

/**
 * 获取资源类型列表
 */
function getResourceTypes() {
    return ['chapters', 'characters', 'scenes', 'cg', 'items', 'endings'];
}

/**
 * 获取指定资源类型的所有 ID
 */
function getResourceIds(type) {
    const meta = getResourceMeta(type);
    if (!meta) return [];
    if (meta.isObject) return Object.keys(meta.data);
    return meta.data.map(e => e.id);
}

/**
 * 补全核心：根据输入上下文返回候选列表
 * @param {string} line  当前输入行
 * @returns {{label:string, type:string}[]} 候选项
 */
function getCompletionCandidates(line) {
    const trimmed = line.trimStart();
    const parts = trimmed.split(/\s+/);
    const isEndSpace = line.endsWith(' ');
    const tokenCount = parts.length;

    // 顶层命令
    if (tokenCount === 0 || (tokenCount === 1 && !isEndSpace && parts[0] === '')) {
        return ['help','info','validate','resource','export','analyze','clear','exit','quit']
            .map(c => ({label:c, type:'命令'}));
    }

    const cmd = parts[0].toLowerCase();
    const partial = (parts[tokenCount - 1] || '').toLowerCase();

    // 第一个 token
    if (tokenCount === 1 && !isEndSpace) {
        return ['help','info','validate','resource','export','analyze','clear','exit','quit']
            .filter(c => c.startsWith(cmd) || fuzzyMatch(partial, c))
            .map(c => ({label:c, type:'命令'}));
    }

    // info / export / analyze 静态子命令
    const staticDirs = {
        info:    ['stats', 'chapters', 'resources'],
        export:  ['json', 'js'],
        analyze: ['branches', 'crossref'],
    };
    if (staticDirs[cmd] && parts.length <= 2) {
        return staticDirs[cmd]
            .filter(s => s.startsWith(partial) || fuzzyMatch(partial, s))
            .map(s => ({label:s, type:'子命令'}));
    }

    // ─── resource 动态补全 ───
    if (cmd === 'resource') {
        const ACTIONS = ['add', 'delete', 'set', 'get', 'list', 'rename'];
        const TYPES = ['chapters', 'characters', 'scenes', 'cg', 'items', 'endings'];
        const action = (parts[1] || '').toLowerCase();

        // action
        if (parts.length <= 2) {
            return ACTIONS
                .filter(a => a.startsWith(action) || fuzzyMatch(partial, a))
                .map(a => ({label:a, type:'操作'}));
        }

        // type
        if (parts.length <= 3) {
            return TYPES
                .filter(t => t.startsWith(partial) || fuzzyMatch(partial, t))
                .map(t => ({label:t, type:'类型'}));
        }

        // resource ID
        if ((action === 'get' || action === 'delete' || action === 'set' || action === 'rename') && parts.length >= 4) {
            const type = parts[2];
            const ids = getResourceIds(type);
            return ids
                .filter(id => id.toLowerCase().startsWith(partial) || fuzzyMatch(partial, id))
                .map(id => ({label:id, type: type === 'chapters' ? '章节' : type === 'characters' ? '角色' : 'ID'}));
        }
    }

    return [];
}

/**
 * （readline completer 兼容）仅返回 label 列表
 * @param {string} line  当前输入行
 * @returns {string[]}
 */
function getCompletions(line) {
    return getCompletionCandidates(line).map(c => c.label);
}

/**
 * 交互模式：启动 readline REPL 带 Tab 补全
 */
function cmdInteractive() {
    console.log(color('cyan', '╭──────────────────────────────────────────╮'));
    console.log(color('cyan', '│  剧情树节点编辑器 CLI · 交互模式         │'));
    console.log(color('cyan', '│  help 查看命令 · exit/quit/Ctrl+C 退出   │'));
    console.log(color('cyan', '│  Tab 补全 · ↓↑ 历史 · Ctrl+R 历史搜索   │'));
    console.log(color('cyan', '╰──────────────────────────────────────────╯'));
    console.log('');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: color('cyan', 'gal> '),
        tabSize: 2,
        completer: (line) => {
            const candidates = getCompletionCandidates(line);
            if (candidates.length === 0) {
                return [[], ''];
            }
            // 显示带类型标记的候选项（readline 会打印出来）
            const labels = candidates.map(c =>
                c.label + '  ' + color('dim', '(' + c.type + ')')
            );
            return [labels, candidates[0].label];
        },
    });

    rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            rl.prompt();
            return;
        }

        const lower = trimmed.toLowerCase();
        if (lower === 'exit' || lower === 'quit') {
            console.log(color('gray', '再见！'));
            rl.close();
            return;
        }
        if (lower === 'clear') {
            console.clear();
            rl.prompt();
            return;
        }

        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const opts = { pretty: false, output: null, silent: false, verbose: false, save: false };

        try {
            switch (cmd) {
                case 'help':
                    cmdHelp();
                    break;
                case 'info':
                    cmdInfo(parts[1], opts);
                    break;
                case 'validate':
                    cmdValidate();
                    break;
                case 'export':
                    if (!parts[1]) {
                        console.log(`  ${color('red', '请指定导出格式')}: json, js\n`);
                    } else {
                        cmdExport(parts[1], opts);
                    }
                    break;
                case 'analyze':
                    if (!parts[1]) {
                        console.log(`  ${color('red', '请指定分析类型')}: branches, crossref\n`);
                    } else {
                        cmdAnalyze(parts[1], opts);
                    }
                    break;
                case 'resource':
                    cmdResource(parts.slice(1), opts);
                    break;
                default:
                    console.log(`  ${color('red', '未知命令:')} ${cmd}  ${color('gray', '输入 help 查看帮助')}`);
                    break;
            }
        } catch (e) {
            console.log(`  ${color('red', '错误:')} ${e.message}`);
        }

        rl.prompt();
    }).on('close', () => {
        process.exit(0);
    }).on('SIGINT', () => {
        console.log(color('gray', '\n再见！'));
        process.exit(0);
    });

    rl.prompt();
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
        save: false,
        interactive: false,
    };

    const positional = [];
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-p': case '--pretty': opts.pretty = true; break;
            case '-o': case '--output': opts.output = args[++i]; break;
            case '-s': case '--silent': opts.silent = true; break;
            case '-v': case '--verbose': opts.verbose = true; break;
            case '-S': case '--save': opts.save = true; break;
            case '-i': case '--interactive': opts.interactive = true; break;
            default: positional.push(args[i]);
        }
    }

    // 检测是否进入交互模式
    if (opts.interactive || positional.length === 0) {
        cmdInteractive();
        return;
    }

    const command = positional[0];

    try {
        switch (command) {
            case 'info':
                cmdInfo(positional[1], opts);
                break;
            case 'validate':
                cmdValidate();
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
                    console.log(`  ${color('red', '请指定分析类型')}: branches, crossref\n`);
                    cmdHelp();
                    process.exitCode = 1;
                } else {
                    cmdAnalyze(positional[1], opts);
                }
                break;
            case 'resource':
                cmdResource(positional.slice(1), opts);
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

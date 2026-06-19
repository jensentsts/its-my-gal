/**
 * cli/interactive.js
 *
 * Interactive REPL mode with Tab completion for CLI commands.
 */
import * as readline from 'node:readline';
import { color } from './style.js';
import { getResourceMeta } from './utils.js';
import { cmdInfo } from './commands/info.js';
import { cmdValidate } from './commands/validate.js';
import { cmdExport } from './commands/export.js';
import { cmdAnalyze } from './commands/analyze.js';
import { cmdResource } from './commands/resource.js';
import { cmdHelp } from './commands/help.js';

// ══════════════════════════════════════════════════════════════════
//  Completion system
// ══════════════════════════════════════════════════════════════════

function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase(), t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (q[qi] === t[ti]) qi++;
  }
  return qi >= q.length;
}

function getResourceTypes() {
  return ['chapters', 'characters', 'scenes', 'cg', 'items', 'endings'];
}

function getResourceIds(type) {
  const meta = getResourceMeta(type);
  if (!meta) return [];
  if (meta.isObject) return Object.keys(meta.data);
  return meta.data.map(e => e.id);
}

/**
 * Return completion candidates based on input context.
 * @param {string} line  current input line
 * @returns {{label:string, type:string}[]}
 */
function getCompletionCandidates(line) {
  const trimmed = line.trimStart();
  const parts = trimmed.split(/\s+/);
  const isEndSpace = line.endsWith(' ');
  const tokenCount = parts.length;

  if (tokenCount === 0 || (tokenCount === 1 && !isEndSpace && parts[0] === '')) {
    return ['help','info','validate','resource','export','analyze','clear','exit','quit']
      .map(c => ({label:c, type:'命令'}));
  }

  const cmd = parts[0].toLowerCase();
  const partial = (parts[tokenCount - 1] || '').toLowerCase();

  if (tokenCount === 1 && !isEndSpace) {
    return ['help','info','validate','resource','export','analyze','clear','exit','quit']
      .filter(c => c.startsWith(cmd) || fuzzyMatch(partial, c))
      .map(c => ({label:c, type:'命令'}));
  }

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

  if (cmd === 'resource') {
    const ACTIONS = ['add', 'delete', 'set', 'get', 'list', 'rename'];
    const TYPES = ['chapters', 'characters', 'scenes', 'cg', 'items', 'endings'];
    const action = (parts[1] || '').toLowerCase();

    if (parts.length <= 2) {
      return ACTIONS
        .filter(a => a.startsWith(action) || fuzzyMatch(partial, a))
        .map(a => ({label:a, type:'操作'}));
    }
    if (parts.length <= 3) {
      return TYPES
        .filter(t => t.startsWith(partial) || fuzzyMatch(partial, t))
        .map(t => ({label:t, type:'类型'}));
    }
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

// ══════════════════════════════════════════════════════════════════
//  Interactive REPL
// ══════════════════════════════════════════════════════════════════

export function cmdInteractive() {
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
      if (candidates.length === 0) return [[], ''];
      const labels = candidates.map(c => c.label + '  ' + color('dim', '(' + c.type + ')'));
      return [labels, candidates[0].label];
    },
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) { rl.prompt(); return; }

    const lower = trimmed.toLowerCase();
    if (lower === 'exit' || lower === 'quit') { console.log(color('gray', '再见！')); rl.close(); return; }
    if (lower === 'clear') { console.clear(); rl.prompt(); return; }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const opts = { pretty: false, output: null, silent: false, verbose: false, save: false };

    try {
      switch (cmd) {
        case 'help': cmdHelp(); break;
        case 'info': cmdInfo(parts[1], opts); break;
        case 'validate': cmdValidate(); break;
        case 'export':
          if (!parts[1]) { console.log(`  ${color('red', '请指定导出格式')}: json, js\n`); }
          else { cmdExport(parts[1], opts); }
          break;
        case 'analyze':
          if (!parts[1]) { console.log(`  ${color('red', '请指定分析类型')}: branches, crossref\n`); }
          else { cmdAnalyze(parts[1], opts); }
          break;
        case 'resource': cmdResource(parts.slice(1), opts); break;
        default: console.log(`  ${color('red', '未知命令:')} ${cmd}  ${color('gray', '输入 help 查看帮助')}`);
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

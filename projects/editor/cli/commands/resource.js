/**
 * cli/commands/resource.js
 *
 * `resource` command — manage game resources (add/delete/set/get/list/rename).
 */
import * as GameData from '../../../../resource-packs/default/index.js';
import { header, color, success, warn, error, info, dim } from '../style.js';
import { parseValue, deepGet, deepSet, getResourceMeta, saveGameData,
         countSteps, countChoices, countJumps, countEndings, collectOptionCount } from '../utils.js';

export function cmdResource(args, opts) {
  const sub = args[0];
  if (!sub) {
    error('请指定资源操作: add, delete, set, get, list, rename');
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
      error(`未知资源操作: ${sub}`);
      console.log(`  有效操作: add, delete, set, get, list, rename`);
      process.exitCode = 1;
  }
}

// ═══════════════════════════════════════════════════
//  add
// ═══════════════════════════════════════════════════
function cmdResourceAdd(args, opts) {
  const type = args[0];
  const customId = args[1];
  const meta = getResourceMeta(type);
  if (!meta) {
    error(`未知资源类型: ${type}`);
    console.log(`  有效类型: chapters, characters, scenes, cg, items, endings`);
    process.exitCode = 1;
    return;
  }

  const ts = Date.now().toString(36);
  const newId = customId || (type + '_' + ts);

  if (meta.isObject && meta.data[newId]) { error(`"${newId}" 已存在`); process.exitCode = 1; return; }
  if (!meta.isObject && meta.data.some(e => e.id === newId)) { error(`"${newId}" 已存在`); process.exitCode = 1; return; }

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
  const created = meta.isObject ? meta.data[newId] : meta.data.find(e => e.id === newId);
  console.log(color('gray', JSON.stringify(created, null, 2)));
  if (opts.save) saveGameData(opts.output);
}

// ═══════════════════════════════════════════════════
//  delete
// ═══════════════════════════════════════════════════
function cmdResourceDelete(args, opts) {
  const type = args[0];
  const id = args[1];
  const meta = getResourceMeta(type);
  if (!meta) { error(`未知资源类型: ${type}`); process.exitCode = 1; return; }
  if (!id) { error('请指定要删除的资源 ID'); process.exitCode = 1; return; }

  if (meta.isObject) {
    if (!(id in meta.data)) { error(`"${id}" 不存在`); process.exitCode = 1; return; }
    delete meta.data[id];
  } else {
    const idx = meta.data.findIndex(e => e.id === id);
    if (idx === -1) { error(`"${id}" 不存在`); process.exitCode = 1; return; }
    meta.data.splice(idx, 1);
  }

  success(`已删除${meta.label}：${color('bold', id)}`);
  if (opts.save) saveGameData(opts.output);
}

// ═══════════════════════════════════════════════════
//  set
// ═══════════════════════════════════════════════════
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
  if (!meta) { error(`未知资源类型: ${type}`); process.exitCode = 1; return; }

  let target;
  if (meta.isObject) {
    target = meta.data[id];
  } else {
    target = meta.data.find(e => e.id === id);
  }
  if (!target) { error(`"${id}" 不存在`); process.exitCode = 1; return; }

  const value = parseValue(valueRaw);
  const oldVal = deepGet(target, path);
  const ok = deepSet(target, path, value);
  if (!ok) { error(`无法设置路径 "${path}"`); process.exitCode = 1; return; }

  const displayVal = JSON.stringify(value);
  const displayOld = oldVal !== undefined ? JSON.stringify(oldVal) : color('gray', '(无)');
  success(`已设置 ${color('bold', `${type}.${id}.${path}`)}`);
  console.log(`  ${color('gray', `${displayOld} → ${color('green', displayVal)}`)}`);
  if (opts.save) saveGameData(opts.output);
}

// ═══════════════════════════════════════════════════
//  get
// ═══════════════════════════════════════════════════
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
  if (!meta) { error(`未知资源类型: ${type}`); process.exitCode = 1; return; }

  let target;
  if (meta.isObject) { target = meta.data[id]; }
  else { target = meta.data.find(e => e.id === id); }
  if (!target) { error(`"${id}" 不存在`); process.exitCode = 1; return; }

  const result = path ? deepGet(target, path) : target;
  if (result === undefined) { error(`路径 "${path}" 不存在于 ${type}.${id}`); process.exitCode = 1; return; }

  if (typeof result === 'string') {
    console.log(result);
  } else {
    console.log(JSON.stringify(result, null, opts.pretty ? 2 : undefined));
  }
}

// ═══════════════════════════════════════════════════
//  list
// ═══════════════════════════════════════════════════
function cmdResourceList(type, opts) {
  const meta = getResourceMeta(type);
  if (!meta) {
    error(`未知资源类型: ${type}`);
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
            for (const c of s.choices) { if (c.jumpChapter === '_end_' + end.id) refs++; }
          }
          if (s.jumpChapter === '_end_' + end.id) refs++;
        }
      }
      console.log(`  [${i}] ${color('bold', end.id)}  ${end.title || '(无标题)'}  ${color('gray', `引用:${refs}次`)}`);
      if (end.description && !opts.silent) dim(`  ${end.description.substring(0, 80)}`);
    }
  }
}

// ═══════════════════════════════════════════════════
//  rename
// ═══════════════════════════════════════════════════
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
  if (!meta) { error(`未知资源类型: ${type}`); process.exitCode = 1; return; }

  if (meta.isObject) {
    if (!(oldId in meta.data)) { error(`"${oldId}" 不存在`); process.exitCode = 1; return; }
    if (oldId === newId) { warn('新旧 ID 相同，无需重命名'); return; }
    if (newId in meta.data) { error(`"${newId}" 已存在`); process.exitCode = 1; return; }
    meta.data[newId] = meta.data[oldId];
    delete meta.data[oldId];
  } else {
    const item = meta.data.find(e => e.id === oldId);
    if (!item) { error(`"${oldId}" 不存在`); process.exitCode = 1; return; }
    if (oldId === newId) { warn('新旧 ID 相同，无需重命名'); return; }
    if (meta.data.some(e => e.id === newId)) { error(`"${newId}" 已存在`); process.exitCode = 1; return; }
    item.id = newId;
  }

  // Update references
  const { STORY_CHAPTERS } = GameData;
  if (type === 'chapters' || type === 'endings') {
    for (const steps of Object.values(STORY_CHAPTERS)) {
      for (const step of steps) {
        if (step.jumpChapter === oldId) step.jumpChapter = newId;
        if (step.type === 'choice' && step.choices) {
          for (const ch of step.choices) { if (ch.jumpChapter === oldId) ch.jumpChapter = newId; }
        }
        if (type === 'endings') {
          const endRef = '_end_' + oldId;
          const endNewRef = '_end_' + newId;
          if (step.jumpChapter === endRef) step.jumpChapter = endNewRef;
          if (step.endingId === oldId) step.endingId = newId;
          if (step.type === 'choice' && step.choices) {
            for (const ch of step.choices) { if (ch.jumpChapter === endRef) ch.jumpChapter = endNewRef; }
          }
        }
      }
    }
  }
  if (type === 'characters') {
    for (const steps of Object.values(STORY_CHAPTERS)) {
      for (const step of steps) {
        if (step.characterId === oldId) step.characterId = newId;
        const changes = step.characterChanges || step._charChanges || [];
        for (const cc of changes) { if (cc.id === oldId) cc.id = newId; }
      }
    }
  }
  if (type === 'scenes') {
    for (const steps of Object.values(STORY_CHAPTERS)) {
      for (const step of steps) { if (step.sceneId === oldId) step.sceneId = newId; }
    }
  }

  success(`已重命名${meta.label}：${color('bold', oldId)} → ${color('bold', newId)}`);
  if (type === 'chapters' || type === 'endings' || type === 'characters' || type === 'scenes') {
    info('引用', '已自动更新所有章节中的引用');
  }
  if (opts.save) saveGameData(opts.output);
}

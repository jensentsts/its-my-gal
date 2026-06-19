/**
 * cli/commands/info.js
 *
 * `info` command — display project overview, stats, chapter list, or resource list.
 */
import * as GameData from '../../../../resource-packs/default/index.js';
import { header, color, info, success, dim } from '../style.js';
import { countSteps, countDialogue, countChoices, countJumps, countEndings, collectOptionCount } from '../utils.js';

export function cmdInfo(sub, opts) {
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
        for (const c of s.choices) { allChoiceTexts.push(c.text); }
      }
    }
  }

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

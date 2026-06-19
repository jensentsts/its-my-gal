/**
 * cli/commands/analyze.js
 *
 * `analyze` command — branch analysis and cross-reference checks.
 */
import * as GameData from '../../../../resource-packs/default/index.js';
import { header, color, info, success, warn, error, dim } from '../style.js';

export function cmdAnalyze(type, opts) {
  const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;

  switch (type) {
    case 'branches': return analyzeBranches(opts);
    case 'crossref': return analyzeCrossref(opts);
    default:
      error(`未知分析类型: ${type}`);
      console.log(`  有效类型: branches, crossref`);
      process.exitCode = 1;
  }
}

function analyzeBranches(opts) {
  const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;
  console.log(header('🌿 分支分析'));

  const refs = {};
  for (const [id, steps] of Object.entries(STORY_CHAPTERS)) {
    refs[id] = new Set();
    for (const s of steps) {
      if (s.type === 'choice' && s.choices) {
        for (const c of s.choices) { if (c.jumpChapter) refs[id].add(c.jumpChapter); }
      }
      if (s.jumpChapter) refs[id].add(s.jumpChapter);
    }
  }

  const inDegree = {};
  const chaptersSorted = Object.keys(STORY_CHAPTERS);
  for (const id of chaptersSorted) { inDegree[id] = 0; }

  for (const [src, targets] of Object.entries(refs)) {
    for (const t of targets) {
      if (t.startsWith('_end_')) continue;
      if (inDegree[t] !== undefined) inDegree[t]++;
    }
  }

  const deadEnds = chaptersSorted.filter(id => refs[id].size === 0);
  const isolated = chaptersSorted.filter(id => id !== 'main' && inDegree[id] === 0);
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
}

function analyzeCrossref(opts) {
  const { STORY_CHAPTERS, CHAPTER_DESCRIPTIONS } = GameData;
  const { CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;

  console.log(header('🔗 交叉引用分析'));

  const endingIds = new Set((ENDINGS || []).map(e => e.id));
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
      for (const cc of changes) { if (cc.id) usedCharacters.add(cc.id); }
    }
  }

  const allScenes = new Set(Object.keys(SCENES || {}));
  const allChars = new Set(Object.keys(CHARACTERS || {}));
  const allCG = new Set(Object.keys(CG_LIBRARY || {}));
  const allItems = new Set(Object.keys(ITEMS || {}));

  const missingScenes = [...usedScenes].filter(s => !allScenes.has(s));
  const missingChars = [...usedCharacters].filter(s => !allChars.has(s));
  const missingCG = [...usedCG].filter(s => !allCG.has(s));
  const missingItems = [...usedItems].filter(s => !allItems.has(s));
  const missingEndings = [...usedEndings].filter(s => !endingIds.has(s));

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
}

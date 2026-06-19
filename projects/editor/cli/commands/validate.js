/**
 * cli/commands/validate.js
 *
 * `validate` command — verify game data integrity.
 */
import * as GameData from '../../../../resource-packs/default/index.js';
import { validatePackData } from '@galgame/engine';
import { header, color, info, success, warn, error, formatDuration } from '../style.js';

export function cmdValidate() {
  console.log(header('🔍 数据完整性验证'));

  const { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS } = GameData;
  const data = { GAME_CONFIG, STORY_CHAPTERS, CHARACTERS, SCENES, CG_LIBRARY, ITEMS, ENDINGS };
  const start = Date.now();

  const warnings = validatePackData(data);
  const extraWarnings = [];

  for (const [chId, steps] of Object.entries(STORY_CHAPTERS || {})) {
    if (!Array.isArray(steps)) continue;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.type === 'choice' && (!s.choices || s.choices.length === 0)) {
        extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 类型为 choice 但选项列表为空`);
      }
      if (s.type === 'choice' && s.choices) {
        for (let j = 0; j < s.choices.length; j++) {
          if (!s.choices[j].jumpChapter) {
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
      const changes = s.characterChanges || s._charChanges || [];
      for (const cc of changes) {
        if (cc.id && CHARACTERS && !CHARACTERS[cc.id]) {
          extraWarnings.push(`章节 "${chId}" 步骤 #${i + 1} 角色变更引用不存在的角色 "${cc.id}"`);
        }
      }
    }
  }

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

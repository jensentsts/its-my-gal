/**
 * cli/utils.js
 *
 * Shared utilities for CLI commands: deep property access, resource metadata,
 * data persistence, and step counting helpers.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as GameData from '../../../resource-packs/default/index.js';
import { success } from './style.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══════════════════════════════════════════════════════════════════
//  Value parsing
// ══════════════════════════════════════════════════════════════════

export function parseValue(str) {
  if (str === undefined || str === null) return str;
  try { return JSON.parse(str); } catch {}
  if (/^-?\d+(\.\d+)?$/.test(str)) return Number(str);
  return str;
}

// ══════════════════════════════════════════════════════════════════
//  Deep path access
// ══════════════════════════════════════════════════════════════════

export function deepGet(obj, path) {
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

export function deepSet(obj, path, value) {
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

// ══════════════════════════════════════════════════════════════════
//  Resource metadata
// ══════════════════════════════════════════════════════════════════

export function getResourceMeta(type) {
  const map = {
    chapters:   { data: GameData.STORY_CHAPTERS, label:'章节', isObject:true, isChapter:true },
    characters: { data: GameData.CHARACTERS, label:'角色', isObject:true },
    scenes:     { data: GameData.SCENES, label:'场景', isObject:true },
    cg:         { data: GameData.CG_LIBRARY, label:'CG 图鉴', isObject:true },
    items:      { data: GameData.ITEMS, label:'物品', isObject:true },
    endings:    { data: GameData.ENDINGS, label:'结局', isObject:false },
  };
  return map[type] || null;
}

// ══════════════════════════════════════════════════════════════════
//  Save game data
// ══════════════════════════════════════════════════════════════════

export function saveGameData(outputPath) {
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

// ══════════════════════════════════════════════════════════════════
//  Step statistics helpers
// ══════════════════════════════════════════════════════════════════

export function countSteps(steps) { return steps.length; }
export function countDialogue(steps) { return steps.filter(s => s.type === 'dialogue' || !s.type).length; }
export function countChoices(steps) { return steps.filter(s => s.type === 'choice').length; }
export function countJumps(steps) { return steps.filter(s => s.type === 'jump').length; }
export function countEndings(steps) { return steps.filter(s => s.type === 'ending').length; }

export function collectOptionCount(steps) {
  let n = 0;
  for (const s of steps) {
    if (s.type === 'choice' && s.choices) n += s.choices.length;
  }
  return n;
}

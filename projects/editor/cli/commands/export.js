/**
 * cli/commands/export.js
 *
 * `export` command — export game data to JSON or JS module format.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as GameData from '../../../../resource-packs/default/index.js';
import { header, color, info, success, error } from '../style.js';

export function cmdExport(format, opts) {
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
      error(`未知导出格式: ${format}`);
      console.log(`  有效格式: json, js`);
      process.exitCode = 1;
      return;
  }

  if (opts.output) {
    const outPath = resolve(process.cwd(), opts.output);
    writeFileSync(outPath, output, 'utf-8');
    success(`已写入文件: ${outPath}`);
  } else {
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

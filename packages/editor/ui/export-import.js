/**
 * editor/ui/export-import.js —— 导出 JS/JSON/ZIP 与导入资源包
 */
import { clone, uid, formatJS } from '../helpers.js';
import { stepTextBrief } from '../step-utils.js';
import * as GameData from '../../../resource-packs/default/index.js';
import { validatePackStructure, validatePackData } from '@galgame/engine';

export function createExportImport(ctx, ops) {
    const { chapters, chapterDescriptions, entryPoints, gameConfig, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings, nodePositions, nodeStyles, editorGroups, showExportModal, exportContent, exportModalTitle, customEffects } = ctx;
    const { showToast, autoLayout, saveUndoSnapshot: _sus } = ops;
    const { originalChapters, originalScenes, originalCharacters, originalCgLibrary, originalItems, originalEndings, originalConfig } = ctx;

    function getTotalChapters() { return Object.keys(chapters).length; }
    function getTotalSteps() { let c = 0; for (const s of Object.values(chapters)) c += s.length; return c; }

    // ═══ 导出 JS ═══
    function exportAll() {
        exportModalTitle.value = '导出 JS 模块代码';
        const lines = ['/**', ' * 由剧情树节点编辑器生成的章节数据', ` * 导出时间：${new Date().toISOString()}`, ' * 总计章节：' + getTotalChapters() + ' / 步骤：' + getTotalSteps(), ' */', ''];
        for (const [cid, steps] of Object.entries(chapters)) { const vn = 'chapter_' + cid.replace(/-/g, '_'); lines.push(`export const ${vn} = ${formatJS(steps, 0)};`, ''); }
        lines.push('export const STORY_CHAPTERS = {');
        for (const cid of Object.keys(chapters)) lines.push(`    '${cid}': chapter_${cid.replace(/-/g, '_')},`);
        lines.push('};');
        lines.push('export const ENTRY_POINTS = ' + JSON.stringify(Object.keys(entryPoints)) + ';');
        lines.push('export const CHAPTER_DESCRIPTIONS = ' + JSON.stringify(chapterDescriptions, null, 2) + ';');
        exportContent.value = lines.join('\n'); showExportModal.value = true;
    }

    // ═══ 导出 JSON ═══
    function exportJSON() {
        exportModalTitle.value = '导出 JSON';
        exportContent.value = JSON.stringify({ chapters: JSON.parse(JSON.stringify(chapters)), entryPoints: Object.keys(entryPoints), chapterDescriptions: JSON.parse(JSON.stringify(chapterDescriptions)) }, null, 2);
        showExportModal.value = true;
    }

    function copyExport() {
        navigator.clipboard.writeText(exportContent.value).then(() => showToast('已复制到剪贴板！')).catch(() => showToast('复制失败，请手动选择并复制'));
    }

    function downloadExport() {
        const ext = exportModalTitle.value.includes('JSON') ? 'json' : 'js';
        const blob = new Blob([exportContent.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `chapters-export.${ext}`; a.click();
        URL.revokeObjectURL(url); showToast('文件下载已开始');
    }

    // ═══ 还原数据 ═══
    function resetAll() {
        if (!confirm('确定要还原所有数据为原始版本吗？')) return;
        const _clone = JSON.parse(JSON.stringify);

        const origCh = _clone(originalChapters);
        for (const k of Object.keys(chapters)) delete chapters[k];
        for (const [k, v] of Object.entries(origCh)) chapters[k] = v;

        for (const [src, dest] of [[originalScenes, gameScenes], [originalCharacters, gameCharacters], [originalCgLibrary, gameCgLibrary], [originalItems, gameItems]]) {
            const d = _clone(src);
            for (const k of Object.keys(dest)) delete dest[k];
            for (const [k, v] of Object.entries(d)) dest[k] = v;
        }

        gameEndings.splice(0, gameEndings.length, ..._clone(originalEndings));

        const origCfg = _clone(originalConfig);
        for (const k of Object.keys(gameConfig)) delete gameConfig[k];
        for (const [k, v] of Object.entries(origCfg)) gameConfig[k] = v;

        ctx.selectedChapterId.value = null; ctx.selectedEndingId.value = null; ctx.editingStepIndex.value = null;
        for (const k of Object.keys(chapterDescriptions)) delete chapterDescriptions[k];
        for (const [k, v] of Object.entries(GameData.CHAPTER_DESCRIPTIONS || {})) chapterDescriptions[k] = v;
        autoLayout();
        showToast('已还原所有数据为原始版本');
    }

    // ═══ 资源包打包导出 ═══
    function _buildPackFiles() {
        const files = {};
        const egc = { ...gameConfig, entryPoints: Object.keys(entryPoints) };
        files['pack.json'] = JSON.stringify({ name:'game-export', title:gameConfig.title||'未命名故事', version:'1.0.0', author:'', description:'', format:'1.0.0', configs:{ game:'config/game.json', home:'config/home.json', characters:'config/characters.json', scenes:'config/scenes.json', cgLibrary:'config/cg-library.json', items:'config/items.json', endings:'config/endings.json' }, chapters:Object.keys(chapters).reduce((a,c)=>{a[c]=`chapters/${c}.json`;return a},{}) }, null, 2);
        files['config/game.json'] = JSON.stringify(egc, null, 2);
        files['config/home.json'] = JSON.stringify(GameData.HOME_CONFIG, null, 2);
        files['config/characters.json'] = JSON.stringify(gameCharacters, null, 2);
        files['config/scenes.json'] = JSON.stringify(gameScenes, null, 2);
        files['config/cg-library.json'] = JSON.stringify(gameCgLibrary, null, 2);
        files['config/items.json'] = JSON.stringify(gameItems, null, 2);
        files['config/endings.json'] = JSON.stringify(gameEndings, null, 2);
        for (const [id, steps] of Object.entries(chapters)) files[`chapters/${id}.json`] = JSON.stringify(steps, null, 2);
        return files;
    }

    async function _zipAndDownload(files, packName) {
        if (typeof JSZip === 'undefined') { showToast('JSZip 未加载'); return; }
        const zip = new JSZip(), folder = zip.folder(packName);
        for (const [path, content] of Object.entries(files)) folder.file(path, content);
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${packName}.zip`; a.click();
        URL.revokeObjectURL(url);
    }

    async function exportPackZipWithAssets() {
        try {
            const packName = 'game-export';
            const files = _buildPackFiles();
            files['config/effects.json'] = JSON.stringify(customEffects, null, 2);
            const pj = JSON.parse(files['pack.json']); pj.configs.effects = 'config/effects.json'; files['pack.json'] = JSON.stringify(pj, null, 2);
            const blobs = [];
            for (const obj of [gameCharacters, gameScenes, gameCgLibrary]) {
                for (const item of Object.values(obj)) {
                    if (!item) continue;
                    if (item.sprites) for (const sp of Object.values(item.sprites)) if (sp._blob) blobs.push({ path: sp.url, blob: sp._blob, name: sp._fileName });
                    if (item._blob && item._fileName) blobs.push({ path:'resource-packs/default/assets/' + item._fileName, blob: item._blob, name: item._fileName });
                }
            }
            const zip = new JSZip(), folder = zip.folder(packName);
            for (const [path, content] of Object.entries(files)) folder.file(path, content);
            for (const asset of blobs) {
                if (!asset.blob) continue;
                folder.file((asset.path && !asset.path.startsWith('blob:') ? asset.path.replace(/^\/+/, '') : 'resource-packs/default/assets/' + (asset.name || 'unknown')), asset.blob);
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${packName}.zip`; a.click();
            URL.revokeObjectURL(url); showToast('资源包已导出（含图片资源）！');
        } catch (e) { showToast('导出失败: ' + e.message); }
    }

    async function exportPackZip() {
        try {
            const files = _buildPackFiles();
            const iap = GameData.ITEM_ANIMATION_PRESETS || {};
            if (Object.keys(iap).length > 0) files['config/item-animation-presets.json'] = JSON.stringify(iap, null, 2);
            await _zipAndDownload(files, 'game-export'); showToast('资源包 ZIP 已下载！');
        } catch (e) { showToast(`导出失败: ${e.message}`); }
    }

    function triggerImportPack() { document.getElementById('pack-import-input')?.click(); }

    async function handlePackImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.zip')) { showToast('请选择 .zip 格式的资源包文件'); return; }
        if (typeof JSZip === 'undefined') { showToast('JSZip 未加载'); return; }
        try {
            const zip = await JSZip.loadAsync(file);
            const mf = zip.file(/^(.*\/)?pack\.json$/)[0];
            if (!mf) { showToast('ZIP 中未找到 pack.json'); return; }
            const manifest = JSON.parse(await mf.async('string'));
            const errs = validatePackStructure(manifest);
            if (errs.length > 0) { showToast(`资源包验证失败: ${errs[0]}`); return; }

            const allFiles = Object.keys(zip.files).filter(f => !f.endsWith('/'));
            let rootPrefix = '';
            if (!allFiles.some(f => f === 'pack.json')) {
                for (const f of allFiles) { if (f.endsWith('/pack.json')) { rootPrefix = f.replace(/\/pack\.json$/, ''); break; } }
            }
            const resolve = path => rootPrefix ? `${rootPrefix}/${path}` : path;
            const imported = {}; let count = 0;
            if (manifest.chapters) {
                for (const [chId, fp] of Object.entries(manifest.chapters)) {
                    const f = zip.file(resolve(fp)); if (f) { imported[chId] = JSON.parse(await f.async('string')); count++; }
                }
            }
            if (count === 0) { showToast('资源包中未找到任何章节数据'); return; }
            if (!confirm(`即将从资源包导入 ${count} 个章节。\n\n确定继续吗？`)) { event.target.value = ''; return; }

            for (const k of Object.keys(chapters)) delete chapters[k];
            for (const [k, v] of Object.entries(imported)) chapters[k] = v;
            ctx.selectedChapterId.value = null; ctx.selectedEndingId.value = null; ctx.editingStepIndex.value = null;
            autoLayout(); showToast(`已成功导入资源包：${count} 个章节`);
        } catch (e) { showToast(`资源包导入失败: ${e.message}`); }
        event.target.value = '';
    }

    return { exportAll, exportJSON, copyExport, downloadExport, resetAll, exportPackZip, exportPackZipWithAssets, triggerImportPack, handlePackImport };
}

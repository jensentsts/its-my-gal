/**
 * editor/actions/settings.js —— 游戏设置 / 同步 / 校验 / 入口点
 */
import * as GameData from '../../../resource-packs/default/index.js';

export function createSettings(ctx, ops) {
    const { gameConfig, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings, chapters, entryPoints, chapterDescriptions, nodePositions, nodeStyles, editorGroups, editableGameConfig, editableHomeConfig, showGameSettings, editorPathResolver } = ctx;
    const { showToast, autoLayout } = ops;

    function openGameSettings() {
        if (showGameSettings.value) {
            showGameSettings.value = false;
            return;
        }
        editableGameConfig.title = gameConfig.title || '';
        editableGameConfig.aspectWidth = gameConfig.aspectRatio?.width || 1280;
        editableGameConfig.aspectHeight = gameConfig.aspectRatio?.height || 720;
        editableGameConfig.textSpeed = gameConfig.textSpeed || 25;
        const pb = GameData.HOME_CONFIG?.panelBackground || {};
        editableHomeConfig.panelBgUrl = pb.url || '';
        editableHomeConfig.panelOverlayColor = pb.overlayColor || 'rgba(4,4,10,0.88)';
        editableHomeConfig.panelOverlayGradient = pb.overlayGradient || '';
        showGameSettings.value = true;
    }

    function saveGameSettings() {
        gameConfig.title = editableGameConfig.title;
        gameConfig.aspectRatio = { width: editableGameConfig.aspectWidth, height: editableGameConfig.aspectHeight };
        gameConfig.textSpeed = editableGameConfig.textSpeed;
        gameConfig.entryPoints = Object.keys(entryPoints);
        if (!GameData.HOME_CONFIG.panelBackground) GameData.HOME_CONFIG.panelBackground = {};
        GameData.HOME_CONFIG.panelBackground.url = editableHomeConfig.panelBgUrl;
        GameData.HOME_CONFIG.panelBackground.overlayColor = editableHomeConfig.panelOverlayColor;
        GameData.HOME_CONFIG.panelBackground.overlayGradient = editableHomeConfig.panelOverlayGradient;
        showGameSettings.value = false;
        showToast('✅ 游戏设置已保存！请点击"同步到游戏"使引擎生效。');
    }

    function setEntryPoint(nodeId) {
        const wasActive = !!entryPoints[nodeId];
        for (const key of Object.keys(entryPoints)) delete entryPoints[key];
        if (!wasActive) { entryPoints[nodeId] = true; showToast(`已设为入口: ${nodeId}`); }
        else { showToast('至少需要一个入口节点'); const first = Object.keys(chapters)[0]; if (first) entryPoints[first] = true; }
    }

    function isEntryPoint(nodeId) { return !!entryPoints[nodeId]; }

    async function validateEditorResources() {
        const data = { CHARACTERS: gameCharacters, SCENES: gameScenes, CG_LIBRARY: gameCgLibrary, HOME_CONFIG: gameConfig?.home || gameConfig };
        const missing = [];
        try {
            const result = await editorPathResolver.validateAll(data);
            if (!result.ok) missing.push(...result.missing.map(m => `[${m.type}] ${m.path}`));
        } catch (e) { showToast('❌ 校验过程异常: ' + e.message); return; }

        // 扫描所有章节中引用的结局 ID，检查是否在 gameEndings 中定义
        const definedEndingIds = new Set(gameEndings.map(e => e.id));
        const missingEndingIds = new Set();
        for (const [cid, steps] of Object.entries(chapters)) {
            for (const step of steps) {
                if (step.type === 'ending' && step.endingId && !definedEndingIds.has(step.endingId)) {
                    missingEndingIds.add(step.endingId);
                }
                if (step.type === 'jump' && step.endingId && !definedEndingIds.has(step.endingId)) {
                    missingEndingIds.add(step.endingId);
                }
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter && ch.jumpChapter.startsWith('_end_')) {
                            const eid = ch.jumpChapter.slice(5);
                            if (!definedEndingIds.has(eid)) missingEndingIds.add(eid);
                        }
                    }
                }
            }
        }
        if (missingEndingIds.size > 0) {
            for (const eid of missingEndingIds) {
                missing.push(`[结局] "${eid}" 被章节引用但未在 endings.js 中定义`);
            }
        }

        if (missing.length === 0) {
            showToast('✅ 所有资源完整，结局引用均有效，共检查 ' + (result?.ok ? result.missing.length : 0) + ' 项');
            if (ops.termOut) ops.termOut('✅ 资源完整性校验通过', 'system');
        }
        else {
            showToast(`⚠️ 发现 ${missing.length} 个问题（控制台查看详情）`);
            console.warn('资源校验问题列表:\n' + missing.map(m => `  · ${m}`).join('\n'));
            if (ops.termOut) {
                ops.termOut(`⚠️ 资源校验发现 ${missing.length} 个问题:`, 'error');
                for (const m of missing) ops.termOut(`  · ${m}`, 'error');
                ops.termOut('', 'system');
            }
        }
    }

    function syncToGame() {
        try {
            const data = {
                chapters: JSON.parse(JSON.stringify(chapters)),
                characters: JSON.parse(JSON.stringify(gameCharacters)),
                scenes: JSON.parse(JSON.stringify(gameScenes)),
                cgLibrary: JSON.parse(JSON.stringify(gameCgLibrary)),
                items: JSON.parse(JSON.stringify(gameItems)),
                endings: JSON.parse(JSON.stringify(gameEndings)),
                editorMeta: { nodePositions: JSON.parse(JSON.stringify(nodePositions)), nodeStyles: JSON.parse(JSON.stringify(nodeStyles)), editorGroups: JSON.parse(JSON.stringify(editorGroups)), chapterDescriptions: JSON.parse(JSON.stringify(chapterDescriptions)) },
                entryPoints: Object.keys(entryPoints),
                config: { title: gameConfig.title, aspectRatio: { ...gameConfig.aspectRatio }, textSpeed: gameConfig.textSpeed, entryPoints: Object.keys(entryPoints) },
                timestamp: Date.now(),
            };
            localStorage.setItem('galgame-editor-data', JSON.stringify(data));
            showToast('✅ 已同步到游戏引擎！刷新游戏页面（F5）即可生效。');
        } catch (e) { showToast('❌ 同步失败：' + e.message); }
    }

    function previewStory() {
        try { syncToGame(); window.open('../index.html?preview=1&t=' + Date.now(), 'galgame_preview'); showToast('✅ 已打开剧情预览窗口'); }
        catch (e) { showToast('❌ 预览打开失败：' + e.message); }
    }

    function getEffectIcon(name) {
        const map = { rain: '🌧️', snow: '❄️', sakura: '🌸', fire: '🔥', stardust: '✨', bloodmoon: '🩸', corruption: '🌑' };
        return map[name] || '✨';
    }

    return { openGameSettings, saveGameSettings, setEntryPoint, isEntryPoint, validateEditorResources, syncToGame, previewStory, getEffectIcon };
}

/**
 * editor/ui/search.js —— 全局搜索
 */
const { computed: _computed, nextTick: _nextTick } = Vue;

export function createSearch(ctx, ops) {
    const { editingGlobalSearch, globalSearchQuery, globalSearchInput, chapters, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameEndings, showResourceManager, resourceTab, selectedResourceId, selectedChapterId, editingStepIndex, treeNodes } = ctx;

    function startGlobalSearch() {
        editingGlobalSearch.value = true;
        globalSearchQuery.value = '';
        _nextTick(() => document.querySelector('.global-search-input')?.focus());
    }

    function endGlobalSearch() { editingGlobalSearch.value = false; globalSearchQuery.value = ''; }

    const globalSearchResults = _computed(() => {
        const q = globalSearchQuery.value.toLowerCase().trim();
        if (!q || q.length < 1) return [];
        const r = [];
        const add = (type, icon, label, id, action) => { if (label.toLowerCase().includes(q) || id.toLowerCase().includes(q)) r.push({ type, icon, label, id, action }); };
        for (const [cid] of Object.entries(chapters)) add('章节', '📜', cid, cid, 'chapter');
        for (const [cid, ch] of Object.entries(gameCharacters)) add('角色', '👤', ch.name || cid, cid, 'character');
        for (const [sid, sc] of Object.entries(gameScenes)) add('场景', '🏞️', sc.title || sid, sid, 'scene');
        for (const [gid, cg] of Object.entries(gameCgLibrary)) add('CG', '🖼️', cg.title || gid, gid, 'cg');
        for (const [iid, item] of Object.entries(gameItems)) add('物品', '🎒', item.name || iid, iid, 'item');
        for (const end of gameEndings) add('结局', '🎬', end.title || end.id, end.id, 'ending');
        return r.slice(0, 20);
    });

    function navigateToSearchResult(result) {
        const tmap = { character: 'characters', scene: 'scenes', cg: 'cg', item: 'items', ending: 'endings' };
        const type = tmap[result.action];
        if (type) {
            showResourceManager.value = true; resourceTab.value = type; selectedResourceId.value = result.id;
        } else {
            selectedChapterId.value = result.id; editingStepIndex.value = null;
            const node = treeNodes.value.find(n => n.id === result.id);
            if (node && ops.zoomToNode) ops.zoomToNode(node);
        }
        endGlobalSearch();
    }

    return { startGlobalSearch, endGlobalSearch, globalSearchResults, navigateToSearchResult };
}

/**
 * editor/actions/resource-ops.js —— 资源管理 CRUD
 */
import { clone, uid } from '../helpers.js';
import { builtinCharEffects, builtinEffects } from '../step-utils.js';

const { watch: _watch } = Vue;

export function createResourceOps(ctx, ops) {
    const {
        chapters, nodePositions, nodeStyles, chapterDescriptions,
        gameEndings, gameCharacters, gameScenes, gameCgLibrary, gameItems, gameConfig,
        resourceMeta, chapterRenameIds,
        selectedResourceId, resourceTab, showResourceManager,
        selectedSpriteId, showAvatarSection,
        resourceImageTarget, editingCharEffect,
        customCharEffects, customEffects, builtinCharEffects: _bce,
        editorPathResolver, entryPoints,
    } = ctx;

    const { showToast, saveUndoSnapshot, stopEffectPreview, stopCharEffectPreview } = ops;

    function openResourceManager() {
        showResourceManager.value = true;
        resourceTab.value = 'characters';
        selectedResourceId.value = null;
    }

    function selectResource(type, id) {
        resourceTab.value = type;
        selectedResourceId.value = id;
        ctx.resEditStepIndex.value = null;
    }

    function addResource(type) {
        const meta = resourceMeta[type];
        if (!meta) return;
        if (meta.isCharEffects) { showToast('⚠ 角色变更暂不支持自定义新增'); return; }
        const newId = uid(type === 'endings' ? 'ending' : type);
        if (meta.isObject) {
            if (meta.isChapter) {
                meta.data[newId] = [{ sceneId:'', type:'dialogue', characterId:null, text:'新对话段落...', effects:[] }, { sceneId:'', type:'jump', jumpChapter:'' }];
                nodePositions[newId] = { x:400, y:300 };
            } else if (type === 'characters') {
                meta.data[newId] = { name:'新角色', color:'#ffffff', race:'', gender:'', role:'', defaultSpeed:25, description:'', avatars:{}, sprites:{ default:{ id:'default', label:'👤 默认', url:'' } } };
            } else if (type === 'scenes') { meta.data[newId] = { title:'新场景', url:'', bgPlaceholder:'#111111' };
            } else if (type === 'cg') { meta.data[newId] = { title:'新 CG', subtitle:'', url:'' };
            } else if (type === 'items') { meta.data[newId] = { name:'新物品', icon:'📦', image:'', description:'' };
            } else if (meta.isEffects) {
                meta.data[newId] = { name:'新特效', icon:'✨', effectType:'template', type:'stardust', emoji:'✨', animation:'fall', sizeMin:12, sizeMax:28, color:'', density:30, speed:50, jsPath:'', cssPath:'' };
            }
        } else {
            meta.data.push({ id:newId, title:'新结局', description:'' });
        }
        selectedResourceId.value = newId;
        showToast(`已创建新${meta.label}：${newId}`);
    }

    function deleteResource(type, id) {
        const meta = resourceMeta[type];
        if (!meta) return;
        if ((meta.isEffects || meta.isCharEffects) && !meta.data[id]) { showToast('⚠ 内置资源不可删除'); return; }
        if (meta.isChapter && chapters[id]?.some(s => s.locked)) {
            if (!confirm(`⚠ 此章节包含已锁定的步骤，确定删除吗？`)) return;
        }
        if (!confirm(`确定删除此${meta.label}吗？`)) return;
        if (meta.isObject) {
            if (meta.isChapter) { delete nodePositions[id]; delete chapterRenameIds[id]; }
            if (meta.isEffects && stopEffectPreview) stopEffectPreview();
            if (meta.isCharEffects && stopCharEffectPreview) stopCharEffectPreview();
            delete meta.data[id];
        } else {
            const arr = meta.data;
            const idx = arr.findIndex(e => e.id === id);
            if (idx > -1) {
                for (const [cid, steps] of Object.entries(chapters)) {
                    for (const step of steps) {
                        if (step.endingId === id) step.endingId = '';
                        if (step.jumpChapter === '_end_' + id) step.jumpChapter = '';
                        if (step.type === 'choice' && step.choices) {
                            for (const ch of step.choices) if (ch.jumpChapter === '_end_' + id) ch.jumpChapter = '';
                        }
                    }
                }
                delete nodePositions['_end_' + id];
                arr.splice(idx, 1);
            }
        }
        if (selectedResourceId.value === id) selectedResourceId.value = null;
        showToast(`已删除${meta.label}`);
    }

    function addSprite(character) {
        if (!character.sprites) character.sprites = {};
        const spriteId = 'sprite_' + Date.now().toString(36);
        const charId = Object.keys(gameCharacters).find(cid => gameCharacters[cid] === character);
        const autoUrl = charId ? editorPathResolver.sprite(charId, spriteId) : '';
        character.sprites[spriteId] = { id: spriteId, label: '新立绘', url: autoUrl };
    }

    function addAvatar(character) {
        if (!character.avatars) character.avatars = {};
        const avatarId = 'avatar_' + Date.now().toString(36);
        const charId = Object.keys(gameCharacters).find(cid => gameCharacters[cid] === character);
        const autoUrl = charId ? editorPathResolver.avatar(charId, avatarId) : '';
        character.avatars[avatarId] = autoUrl;
    }

    function renameResource(type, oldId) {
        const meta = resourceMeta[type];
        if (!meta || !oldId) return;
        if (meta.isChapter) {
            const newId = (chapterRenameIds[oldId] || '').trim();
            if (!newId || newId === oldId) { showToast('请输入新的 ID'); return; }
            if (meta.data[newId]) { showToast(`ID "${newId}" 已存在！`); return; }
            meta.data[newId] = meta.data[oldId]; delete meta.data[oldId];
            if (nodePositions[oldId]) { nodePositions[newId] = nodePositions[oldId]; delete nodePositions[oldId]; }
            if (chapterDescriptions[oldId] !== undefined) { chapterDescriptions[newId] = chapterDescriptions[oldId]; delete chapterDescriptions[oldId]; }
            delete chapterRenameIds[oldId];
            updateReferences(oldId, newId, 'chapters');
            selectedResourceId.value = newId;
            showToast(`章节 ID 已更新：${oldId} → ${newId}`);
            return;
        }
        const item = meta.isObject ? meta.data[oldId] : (meta.data || []).find(e => e.id === oldId);
        if (!item) return;
        const newId = (item._renameId || '').trim();
        if (!newId || newId === oldId) { showToast('请输入新的 ID'); return; }
        if (meta.isObject) {
            if (meta.data[newId]) { showToast(`ID "${newId}" 已存在！`); return; }
            meta.data[newId] = meta.data[oldId]; delete meta.data[oldId];
            delete item._renameId;
        } else {
            if (meta.data.some(e => e !== item && e.id === newId)) { showToast(`ID "${newId}" 已存在！`); return; }
            item.id = newId; delete item._renameId;
        }
        updateReferences(oldId, newId, type);
        selectedResourceId.value = newId;
        showToast(`ID 已更新：${oldId} → ${newId}`);
    }

    function updateReferences(oldId, newId, type) {
        for (const [cid, steps] of Object.entries(chapters)) {
            for (const step of steps) {
                if (step.jumpChapter === oldId) step.jumpChapter = newId;
                if (type === 'characters' && step.characterId === oldId) step.characterId = newId;
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                }
            }
        }
    }

    // 选中角色变更时复制可编辑副本
    _watch([() => resourceTab.value, () => selectedResourceId.value], ([tab, id]) => {
        if (tab !== 'charEffects' || !id) return;
        const src = builtinCharEffects[id] || customCharEffects[id];
        if (!src) return;
        for (const key of Object.keys(editingCharEffect)) delete editingCharEffect[key];
        Object.assign(editingCharEffect, clone(src));
    });

    return {
        openResourceManager, selectResource,
        addResource, deleteResource, addSprite, addAvatar,
        renameResource, updateReferences,
    };
}

/**
 * editor/actions/chapter-ops.js
 *
 * 章节 / 步骤 CRUD 操作 —— 创建、删除、编辑章节与步骤，
 * 包括步骤内的分支选项、CG 变更、角色变更、文本批处理等。
 *
 * 工厂模式：createChapterOps(ctx, ops)
 *   ctx — 共享响应式状态
 *   ops — 共享函数注册表（showToast, saveUndoSnapshot 等）
 */

import { clone, uid } from '../helpers.js';
import { isStepEditLocked, isStepLocked, CHAR_CHANGE_FIELDS } from '../step-utils.js';

const { watch: _watch } = Vue;

export function createChapterOps(ctx, ops) {
    const {
        chapters, nodePositions, nodeStyles, chapterDescriptions,
        gameEndings, gameCharacters,
        selectedChapterId, selectedEndingId, editingStepIndex,
        editingStep, editingChapterId,
        selectedResourceId, resourceTab, resEditStepIndex,
        treePanel, panX, viewScale,
        showResourceManager,
    } = ctx;

    const { showToast, saveUndoSnapshot } = ops;

    // ══════════════════════════════════════════════════════════════════
    //  章节创建/删除
    // ══════════════════════════════════════════════════════════════════

    function addChapter() {
        saveUndoSnapshot();
        const newId = uid('chapter');
        chapters[newId] = [{
            sceneId: '', type: 'dialogue',
            characterId: null, text: '新对话段落...', effects: [],
        }, {
            sceneId: '', type: 'jump', jumpChapter: '',
        }];
        const panel = treePanel.value;
        const cx = panel ? -(panX.value / viewScale.value) + (panel.clientWidth / 2 / viewScale.value) : 400;
        const cy = panel ? -(panY.value / viewScale.value) + (panel.clientHeight / 2 / viewScale.value) : 300;
        nodePositions[newId] = { x: cx, y: cy };
        selectedChapterId.value = newId;
        editingStepIndex.value = 0;
        showToast(`已创建新章节：${newId}`);
    }

    function addEndingNode() {
        saveUndoSnapshot();
        const newId = uid('end');
        gameEndings.push({ id: newId, title: '新结局', description: '' });
        const panel = treePanel.value;
        const cx = panel ? -(panX.value / viewScale.value) + (panel.clientWidth / 2 / viewScale.value) : 400;
        const cy = panel ? -(panY.value / viewScale.value) + (panel.clientHeight / 2 / viewScale.value) : 300;
        nodePositions['_end_' + newId] = { x: cx, y: cy };
        selectedEndingId.value = '_end_' + newId;
        showToast(`已创建结局节点：${newId}`);
    }

    function addEndingNodeAtPos(worldX, worldY) {
        saveUndoSnapshot();
        const newId = uid('end');
        gameEndings.push({ id: newId, title: '新结局', description: '' });
        nodePositions['_end_' + newId] = { x: worldX, y: worldY };
        selectedEndingId.value = '_end_' + newId;
        showToast(`已创建结局节点：${newId}`);
    }

    function deleteEndingNodeById(endNodeId, clearChapterRefs) {
        const endingId = endNodeId.startsWith('_end_') ? endNodeId.slice(5) : endNodeId;
        const idx = gameEndings.findIndex(e => e.id === endingId);
        if (idx > -1) gameEndings.splice(idx, 1);
        delete nodePositions[endNodeId];
        if (clearChapterRefs) {
            for (const [cid, steps] of Object.entries(chapters)) {
                for (const step of steps) {
                    if (step.jumpChapter === endNodeId) step.jumpChapter = '';
                    if (step.endingId === endingId) step.endingId = '';
                    if (step.type === 'choice' && step.choices) {
                        for (const ch of step.choices) {
                            if (ch.jumpChapter === endNodeId) ch.jumpChapter = '';
                        }
                    }
                }
            }
        }
    }

    function deleteChapter(batchIds) {
        if (batchIds && batchIds.length > 1) {
            const hasEnding = batchIds.some(id => id.startsWith('_end_'));
            const typeLabel = hasEnding ? '节点' : '章节';
            if (!confirm(`确定要删除选中的 ${batchIds.length} 个${typeLabel}吗？`)) return;
            saveUndoSnapshot();
            for (const id of batchIds) {
                if (id.startsWith('_end_')) {
                    deleteEndingNodeById(id, true);
                } else {
                    delete chapters[id];
                    delete nodePositions[id];
                    delete nodeStyles[id];
                    delete chapterDescriptions[id];
                }
            }
            ctx.clearSelection();
            showToast(`已批量删除 ${batchIds.length} 个${typeLabel}`);
            return;
        }

        const singleId = selectedEndingId.value || selectedChapterId.value;
        if (!singleId) return;

        if (singleId.startsWith('_end_')) {
            if (!confirm(`确定要删除结局吗？`)) return;
            saveUndoSnapshot();
            deleteEndingNodeById(singleId, true);
            selectedEndingId.value = null;
            editingStepIndex.value = null;
            showToast(`已删除结局：${singleId}`);
            return;
        }

        const id = singleId;
        if (chapters[id]?.some(s => s.locked)) {
            if (!confirm(`⚠ 章节 "${id}" 包含已锁定的步骤，确定删除吗？`)) return;
        }
        if (!confirm(`确定要删除章节 "${id}" 吗？`)) return;
        saveUndoSnapshot();
        delete chapters[id];
        delete nodePositions[id];
        delete nodeStyles[id];
        delete chapterDescriptions[id];
        selectedChapterId.value = null;
        editingStepIndex.value = null;
        showToast(`已删除章节：${id}`);
    }

    function onChapterIdChange() {
        saveUndoSnapshot();
        const oldId = selectedChapterId.value;
        if (!oldId) return;
        const newId = editingChapterId.value;
        if (!newId || oldId === newId) return;
        if (chapters[newId]) {
            showToast(`章节 ID "${newId}" 已存在！`);
            return;
        }
        chapters[newId] = chapters[oldId];
        delete chapters[oldId];
        if (nodePositions[oldId]) {
            nodePositions[newId] = nodePositions[oldId];
            delete nodePositions[oldId];
        }
        for (const [cid, steps] of Object.entries(chapters)) {
            for (const step of steps) {
                if (step.jumpChapter === oldId) step.jumpChapter = newId;
                if (step.type === 'choice' && step.choices) {
                    for (const ch of step.choices) {
                        if (ch.jumpChapter === oldId) ch.jumpChapter = newId;
                    }
                }
            }
        }
        selectedChapterId.value = newId;
        showToast(`章节 ID 已更新：${oldId} → ${newId}`);
    }

    // ══════════════════════════════════════════════════════════════════
    //  步骤操作
    // ══════════════════════════════════════════════════════════════════

    function addStep() {
        saveUndoSnapshot();
        if (!selectedChapterId.value) return;
        const steps = chapters[selectedChapterId.value];
        const lastIdx = steps.length - 1;
        if (lastIdx >= 0 && isStepEditLocked(steps[lastIdx])) {
            showToast('⚠ 末尾步骤已锁定，无法添加新步骤');
            return;
        }
        const newStep = {
            sceneId: steps.length > 0 ? steps[steps.length - 1].sceneId : '',
            type: 'dialogue', characterId: null,
            text: '新对话...', effects: [],
        };
        const insertIdx = steps.length > 0 && steps[steps.length - 1]?.type === 'jump'
            ? steps.length - 1 : steps.length;
        steps.splice(insertIdx, 0, newStep);
        editingStepIndex.value = insertIdx;
        showToast(`已添加步骤 #${insertIdx + 1}`);
    }

    function setDefaultJumpMode(step) {
        if (isStepEditLocked(step)) return;
        if (!step._jumpMode) {
            step._jumpMode = step.endingId ? 'ending' : 'chapter';
        }
    }

    function deleteStep(index) {
        saveUndoSnapshot();
        if (!selectedChapterId.value) return;
        const steps = chapters[selectedChapterId.value];
        if (isStepEditLocked(steps[index])) { showToast('⚠ 此步骤已锁定，无法删除'); return; }
        if (index === steps.length - 1 && steps[index]?.type === 'jump') {
            showToast('⚠ 章节末尾的跳转步骤不可删除');
            return;
        }
        if (!confirm(`确定删除步骤 #${index + 1} 吗？`)) return;
        steps.splice(index, 1);
        if (editingStepIndex.value === index) {
            editingStepIndex.value = null;
        } else if (editingStepIndex.value > index) {
            editingStepIndex.value--;
        }
        showToast(`已删除步骤 #${index + 1}`);
    }

    function moveStep(index, direction) {
        saveUndoSnapshot();
        if (!selectedChapterId.value) return;
        const steps = chapters[selectedChapterId.value];
        if (isStepEditLocked(steps[index])) { showToast('⚠ 此步骤已锁定，无法移动'); return; }
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= steps.length) return;
        if (isStepEditLocked(steps[newIndex])) { showToast('⚠ 目标位置步骤已锁定'); return; }
        const [moved] = steps.splice(index, 1);
        steps.splice(newIndex, 0, moved);
        if (editingStepIndex.value === index) {
            editingStepIndex.value = newIndex;
        } else if (editingStepIndex.value === newIndex) {
            editingStepIndex.value = index;
        }
    }

    function toggleStepLock(index) {
        const cid = (showResourceManager.value && resourceTab.value === 'chapters')
            ? selectedResourceId.value : selectedChapterId.value;
        if (!cid) return;
        const steps = chapters[cid];
        if (!steps || index < 0 || index >= steps.length) return;
        const step = steps[index];
        if (step.locked) {
            delete step.locked;
            showToast(`步骤 #${index + 1} 已解锁`);
        } else {
            step.locked = true;
            showToast(`步骤 #${index + 1} 已锁定`);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  分支 / CG / 角色变更 / 特效 / 文本批处理
    // ══════════════════════════════════════════════════════════════════

    function addChoice() {
        if (isStepEditLocked(editingStep.value)) { showToast('⚠ 此步骤已锁定'); return; }
        saveUndoSnapshot();
        if (!editingStep.value || editingStep.value.type !== 'choice') return;
        if (!editingStep.value.choices) editingStep.value.choices = [];
        editingStep.value.choices.push({
            text: '新选项...', jumpChapter: '', flag: '', gainItem: '',
        });
    }

    function removeChoice(index) {
        if (isStepEditLocked(editingStep.value)) { showToast('⚠ 此步骤已锁定'); return; }
        saveUndoSnapshot();
        if (!editingStep.value || !editingStep.value.choices) return;
        editingStep.value.choices.splice(index, 1);
    }

    function onCGChange() {
        if (isStepEditLocked(editingStep.value)) return;
        if (!editingStep.value) return;
        const action = editingStep.value._cgAction;
        if (action === 'enter') {
            editingStep.value.cgChanges = {
                action: 'enter', id: editingStep.value._cgId || '',
                animation: editingStep.value._cgAnimation || 'scaleIn',
            };
            if (editingStep.value._cgEffect) editingStep.value.cgChanges.effect = editingStep.value._cgEffect;
        } else if (action === 'leave') {
            editingStep.value.cgChanges = { action: 'leave', animation: editingStep.value._cgAnimation || 'fadeOut' };
        } else {
            delete editingStep.value.cgChanges;
        }
    }

    function addCharChange() {
        if (isStepEditLocked(editingStep.value)) return;
        if (!editingStep.value) return;
        if (!editingStep.value._charChanges) editingStep.value._charChanges = [];
        editingStep.value._charChanges.push({ id: '', action: 'enter', spriteId: '', animation: '', position: 'center' });
        syncCharChangesToStep();
    }

    function removeCharChange(index) {
        if (isStepEditLocked(editingStep.value)) return;
        if (!editingStep.value?._charChanges) return;
        editingStep.value._charChanges.splice(index, 1);
        syncCharChangesToStep();
    }

    function syncCharChangesToStep() {
        if (isStepEditLocked(editingStep.value)) return;
        saveUndoSnapshot();
        if (!editingStep.value) return;
        const valid = (editingStep.value._charChanges || []).filter(
            cc => cc.id || cc.ids || cc.id1 || cc.action === 'clearAll' || cc.action === 'silenceAll'
        );
        if (valid.length > 0) {
            editingStep.value.characterChanges = valid.map(cc => {
                const entry = { action: cc.action };
                for (const field of CHAR_CHANGE_FIELDS) {
                    let val = cc[field];
                    if (val === undefined || val === null || val === '') continue;
                    if (Array.isArray(val) && val.length === 0) continue;
                    if (field === 'ids' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).filter(Boolean);
                        if (val.length === 0) continue;
                    }
                    if (field === 'weights' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n));
                        if (val.length === 0) continue;
                    }
                    entry[field] = val;
                }
                if (cc.action === 'leave' || cc.action === 'clearAll') delete entry.spriteId;
                return entry;
            });
        } else {
            delete editingStep.value.characterChanges;
        }
    }

    function onCharChangeField() {
        for (const cc of (editingStep.value?._charChanges || [])) {
            if (cc.action === 'filter' && !cc.filters) cc.filters = { brightness: 1, saturation: 1, contrast: 1 };
            if (cc.action === 'gather' && !cc.spread) cc.spread = 0.15;
            if (cc.action === 'speak' && !cc.weight) cc.weight = 1;
        }
        syncCharChangesToStep();
    }

    function toggleEffect(effect) {
        if (isStepEditLocked(editingStep.value)) return;
        if (!editingStep.value) return;
        if (!editingStep.value.effects) editingStep.value.effects = [];
        const idx = editingStep.value.effects.indexOf(effect);
        if (idx > -1) editingStep.value.effects.splice(idx, 1);
        else editingStep.value.effects.push(effect);
    }

    function addBatchTextSegment() {
        const step = editingStep.value;
        if (!step || isStepEditLocked(step)) return;
        if (!step.texts) step.texts = [step.text || ''];
        step.texts.push('新段落...');
    }

    function removeBatchTextSegment(index) {
        const step = editingStep.value;
        if (!step || isStepEditLocked(step) || !step.texts) return;
        if (step.texts.length <= 1) return;
        step.texts.splice(index, 1);
        step.text = step.texts[0];
    }

    function disableBatchText() {
        const step = editingStep.value;
        if (!step || isStepEditLocked(step) || !step.texts) return;
        step.text = step.texts[0] || '';
        delete step.texts;
    }

    // ── 资源管理器步骤编辑 ──

    function resEditAddStep() {
        const id = selectedResourceId.value;
        if (!id || !chapters[id]) return;
        const lastIdx = chapters[id].length - 1;
        if (lastIdx >= 0 && isStepEditLocked(chapters[id][lastIdx])) {
            showToast('⚠ 末尾步骤已锁定，无法添加新步骤');
            return;
        }
        saveUndoSnapshot();
        chapters[id].push({
            sceneId: '', type: 'dialogue', characterId: null, text: '新对话段落...', effects: [],
        });
        resEditStepIndex.value = chapters[id].length - 1;
    }

    function resEditDeleteStep() {
        if (resEditStepIndex.value === null || !selectedResourceId.value) return;
        const steps = chapters[selectedResourceId.value];
        if (!steps || resEditStepIndex.value >= steps.length) return;
        if (isStepEditLocked(steps[resEditStepIndex.value])) { showToast('⚠ 此步骤已锁定，无法删除'); return; }
        saveUndoSnapshot();
        steps.splice(resEditStepIndex.value, 1);
        if (resEditStepIndex.value >= steps.length) {
            resEditStepIndex.value = steps.length > 0 ? steps.length - 1 : null;
        }
    }

    function resEditMoveStep(delta) {
        if (resEditStepIndex.value === null || !selectedResourceId.value) return;
        const steps = chapters[selectedResourceId.value];
        if (!steps) return;
        const from = resEditStepIndex.value;
        const to = from + delta;
        if (to < 0 || to >= steps.length) return;
        if (isStepEditLocked(steps[from]) || isStepEditLocked(steps[to])) { showToast('⚠ 步骤已锁定，无法移动'); return; }
        saveUndoSnapshot();
        const [moved] = steps.splice(from, 1);
        steps.splice(to, 0, moved);
        resEditStepIndex.value = to;
    }

    function resEditAddChoice() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step) || step.type !== 'choice') return;
        if (!step.choices) step.choices = [];
        step.choices.push({ text: '新选项...', jumpChapter: '', flag: '', gainItem: '' });
    }

    function resEditRemoveChoice(ci) {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step) || !step.choices) return;
        step.choices.splice(ci, 1);
    }

    function resEditOnCGChange() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step)) return;
        const action = step._cgAction;
        if (action === 'enter') {
            step.cgChanges = { action: 'enter', id: step._cgId || '', animation: step._cgAnimation || 'scaleIn' };
            if (step._cgEffect) step.cgChanges.effect = step._cgEffect;
        } else if (action === 'leave') {
            step.cgChanges = { action: 'leave', animation: step._cgAnimation || 'fadeOut' };
        } else {
            delete step.cgChanges;
        }
    }

    function resEditAddCharChange() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step)) return;
        if (!step._charChanges) step._charChanges = [];
        step._charChanges.push({ id: '', action: 'enter', spriteId: '', animation: '', position: 'center' });
        resEditSyncCharChanges();
    }

    function resEditRemoveCharChange(cci) {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step) || !step._charChanges) return;
        step._charChanges.splice(cci, 1);
        resEditSyncCharChanges();
    }

    function resEditSyncCharChanges() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step)) return;
        const valid = (step._charChanges || []).filter(
            cc => cc.id || cc.ids || cc.id1 || cc.action === 'clearAll' || cc.action === 'silenceAll'
        );
        if (valid.length > 0) {
            step.characterChanges = valid.map(cc => {
                const entry = { action: cc.action };
                for (const field of CHAR_CHANGE_FIELDS) {
                    let val = cc[field];
                    if (val === undefined || val === null || val === '') continue;
                    if (Array.isArray(val) && val.length === 0) continue;
                    if (field === 'ids' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).filter(Boolean);
                        if (val.length === 0) continue;
                    }
                    if (field === 'weights' && typeof val === 'string') {
                        val = val.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n));
                        if (val.length === 0) continue;
                    }
                    entry[field] = val;
                }
                if (cc.action === 'leave' || cc.action === 'clearAll') delete entry.spriteId;
                return entry;
            });
        } else {
            delete step.characterChanges;
        }
    }

    function resEditOnCharChangeField() {
        for (const cc of (ctx.resEditStep?.value?._charChanges || [])) {
            if (cc.action === 'filter' && !cc.filters) cc.filters = { brightness: 1, saturation: 1, contrast: 1 };
            if (cc.action === 'gather' && !cc.spread) cc.spread = 0.15;
            if (cc.action === 'speak' && !cc.weight) cc.weight = 1;
        }
        resEditSyncCharChanges();
    }

    function resEditAddBatchTextSegment() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step)) return;
        if (!step.texts) step.texts = [step.text || ''];
        step.texts.push('新段落...');
    }

    function resEditRemoveBatchTextSegment(ti) {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step) || !step.texts || step.texts.length <= 1) return;
        step.texts.splice(ti, 1);
        step.text = step.texts[0];
    }

    function resEditDisableBatchText() {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step) || !step.texts) return;
        step.text = step.texts[0] || '';
        delete step.texts;
    }

    function resEditToggleEffect(effect) {
        const step = ctx.resEditStep?.value;
        if (!step || isStepEditLocked(step)) return;
        if (!step.effects) step.effects = [];
        const idx = step.effects.indexOf(effect);
        if (idx > -1) step.effects.splice(idx, 1);
        else step.effects.push(effect);
    }

    function resEditSetDefaultJumpMode(step) {
        if (!step || isStepEditLocked(step)) return;
        if (!step._jumpMode) step._jumpMode = step.endingId ? 'ending' : 'chapter';
    }

    // ── 资源管理器选中步骤时保存撤销快照 ──
    _watch(resEditStepIndex, (newVal, oldVal) => {
        if (newVal !== null && newVal !== oldVal && oldVal !== null) {
            saveUndoSnapshot();
        }
    });

    return {
        addChapter, addEndingNode, addEndingNodeAtPos,
        deleteChapter, onChapterIdChange,
        addStep, setDefaultJumpMode, deleteStep, moveStep, toggleStepLock,
        addChoice, removeChoice,
        onCGChange,
        addCharChange, removeCharChange, syncCharChangesToStep, onCharChangeField,
        toggleEffect, addBatchTextSegment, removeBatchTextSegment, disableBatchText,
        resEditAddStep, resEditDeleteStep, resEditMoveStep,
        resEditAddChoice, resEditRemoveChoice, resEditOnCGChange,
        resEditAddCharChange, resEditRemoveCharChange,
        resEditSyncCharChanges, resEditOnCharChangeField,
        resEditAddBatchTextSegment, resEditRemoveBatchTextSegment, resEditDisableBatchText,
        resEditToggleEffect, resEditSetDefaultJumpMode,
    };
}

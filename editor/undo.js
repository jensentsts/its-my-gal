/**
 * editor/undo.js
 *
 * 撤销/重做系统 —— 通过快照机制管理编辑器状态变更。
 *
 * 职责：
 *  - 捕获并恢复所有可编辑状态的快照（章节、位置、样式、结局、分组、入口点）
 *  - 维护撤销/重做栈，上限 50 步
 *  - 提供 saveUndoSnapshot/undo/redo 接口
 *
 * 使用方式：createUndoSystem(reactiveState) → { saveUndoSnapshot, undo, redo, ... }
 */

import { clone } from './helpers.js';

/**
 * @param {Object} chapters - reactive({})
 * @param {Object} chapterDescriptions - reactive({})
 * @param {Object} nodePositions - reactive({})
 * @param {Object} nodeStyles - reactive({})
 * @param {Array} gameEndings - reactive([])
 * @param {Object} editorGroups - reactive({})
 * @param {Object} entryPoints - reactive({})
 * @returns {{ undoStack, redoStack, undoLock, captureState, restoreState, saveUndoSnapshot, undo, redo, undoCount, redoCount }}
 */
export function createUndoSystem(
    chapters, chapterDescriptions, nodePositions, nodeStyles,
    gameEndings, editorGroups, entryPoints
) {
    const MAX_UNDO = 50;
    const undoStack = [];
    const redoStack = [];

    // 非响应式锁 —— 防止 restore 过程中反复触发 saveUndoSnapshot
    const undoLock = { value: false };

    // 响应式计数器（供模板绑定禁用状态）
    const { ref } = Vue;
    const undoCount = ref(0);
    const redoCount = ref(0);

    /** 获取当前全部可编辑状态的深拷贝快照 */
    function captureState() {
        return {
            chapters: clone(chapters),
            chapterDescriptions: clone(chapterDescriptions),
            nodePositions: clone(nodePositions),
            nodeStyles: clone(nodeStyles),
            gameEndings: clone(gameEndings),
            editorGroups: clone(editorGroups),
            entryPoints: clone(entryPoints),
        };
    }

    /** 将快照恢复到各 reactive 对象 */
    function restoreState(snapshot) {
        undoLock.value = true;

        // chapters（reactive 对象 → 删旧添新）
        for (const key of Object.keys(chapters)) {
            if (!(key in snapshot.chapters)) delete chapters[key];
        }
        for (const [k, v] of Object.entries(snapshot.chapters)) chapters[k] = clone(v);

        // chapterDescriptions
        for (const key of Object.keys(chapterDescriptions)) {
            if (!(key in snapshot.chapterDescriptions)) delete chapterDescriptions[key];
        }
        for (const [k, v] of Object.entries(snapshot.chapterDescriptions)) chapterDescriptions[k] = v;

        // nodePositions
        for (const key of Object.keys(nodePositions)) {
            if (!(key in snapshot.nodePositions)) delete nodePositions[key];
        }
        for (const [k, v] of Object.entries(snapshot.nodePositions)) nodePositions[k] = { ...v };

        // nodeStyles
        for (const key of Object.keys(nodeStyles)) {
            if (!(key in snapshot.nodeStyles)) delete nodeStyles[key];
        }
        for (const [k, v] of Object.entries(snapshot.nodeStyles)) nodeStyles[k] = { ...v };

        // gameEndings（数组）
        gameEndings.length = 0;
        for (const item of snapshot.gameEndings) gameEndings.push(clone(item));

        // editorGroups
        for (const key of Object.keys(editorGroups)) {
            if (!(key in snapshot.editorGroups)) delete editorGroups[key];
        }
        for (const [k, v] of Object.entries(snapshot.editorGroups)) editorGroups[k] = { ...v };

        // entryPoints
        for (const key of Object.keys(entryPoints)) {
            if (!(key in snapshot.entryPoints)) delete entryPoints[key];
        }
        for (const [k, v] of Object.entries(snapshot.entryPoints)) entryPoints[k] = v;

        undoLock.value = false;
    }

    /** 保存当前状态到撤销栈（在每次变更前调用） */
    function saveUndoSnapshot() {
        if (undoLock.value) return;
        undoStack.push(captureState());
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack.length = 0;
        // 更新计数器
        undoCount.value = undoStack.length;
        redoCount.value = 0;
    }

    /** 撤销 */
    function undo() {
        if (undoStack.length === 0) return false;
        redoStack.push(captureState());
        const prev = undoStack.pop();
        restoreState(prev);
        undoCount.value = undoStack.length;
        redoCount.value = redoStack.length;
        return true;
    }

    /** 重做 */
    function redo() {
        if (redoStack.length === 0) return false;
        undoStack.push(captureState());
        const next = redoStack.pop();
        restoreState(next);
        undoCount.value = undoStack.length;
        redoCount.value = redoStack.length;
        return true;
    }

    return {
        undoStack, redoStack, undoLock,
        captureState, restoreState,
        saveUndoSnapshot, undo, redo,
        undoCount, redoCount,
    };
}

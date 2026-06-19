/**
 * editor/ui/panel-host.js
 *
 * 通用面板宿主 —— 管理一组侧边面板的状态（增删、切换、排序）。
 *
 * 设计为与 Vue 模板无缝集成：panels 是 reactive 数组，
 * activeIdx 是 ref，可直接绑定到模板。
 *
 * 两个使用场景（复用同一机制）：
 *   1. window-manager.js 的全局边栏（左/右/底 dock）
 *   2. ResourceChapterStepEditor 的窗口内侧边栏（步骤编辑面板）
 */

const { reactive, ref, computed } = Vue;

export function createPanelHost() {
  const panels = reactive([]);
  const activeIdx = ref(-1);

  const activePanel = computed(() => {
    const i = activeIdx.value;
    return (i >= 0 && i < panels.length) ? panels[i] : null;
  });

  const panelCount = computed(() => panels.length);

  /**
   * 添加面板。如果 panels 原为空则自动激活。
   * @param {object} item  { id, title?, icon?, ...any }
   */
  function add(item) {
    const idx = panels.findIndex(p => p.id === item.id);
    if (idx >= 0) {
      // 已存在 → 直接切到它
      activeIdx.value = idx;
      return;
    }
    panels.push(item);
    if (activeIdx.value < 0) activeIdx.value = 0;
  }

  /**
   * 按 id 移除面板。移除后 activeIdx 自动修正。
   */
  function remove(id) {
    const idx = panels.findIndex(p => p.id === id);
    if (idx < 0) return;
    removeAt(idx);
  }

  function removeAt(idx) {
    panels.splice(idx, 1);
    // 修正 activeIdx
    if (activeIdx.value >= panels.length) {
      activeIdx.value = Math.max(-1, panels.length - 1);
    } else if (activeIdx.value >= idx) {
      // 被删的面板在当前或之前，activeIdx 前移
      activeIdx.value = Math.max(0, activeIdx.value - 1);
    }
  }

  /**
   * 按 id 激活面板。
   */
  function activate(id) {
    const idx = panels.findIndex(p => p.id === id);
    if (idx >= 0) activeIdx.value = idx;
  }

  /**
   * 按索引激活面板。
   */
  function activateAt(idx) {
    if (idx >= 0 && idx < panels.length) activeIdx.value = idx;
  }

  /**
   * 拖拽排序。
   */
  function move(from, to) {
    if (from < 0 || from >= panels.length) return;
    if (to < 0 || to >= panels.length) return;
    const [item] = panels.splice(from, 1);
    panels.splice(to, 0, item);
    if (activeIdx.value === from) {
      activeIdx.value = to;
    }
  }

  /** 查询 panel 是否存在 */
  function has(id) {
    return panels.some(p => p.id === id);
  }

  /** 查找 panel 索引 */
  function indexOf(id) {
    return panels.findIndex(p => p.id === id);
  }

  return {
    // 状态
    panels,
    activeIdx,
    activePanel,
    panelCount,
    // 操作
    add,
    remove,
    removeAt,
    activate,
    activateAt,
    move,
    has,
    indexOf,
  };
}

/** 创建一个 dock 风格的三侧面板管理器（左/右/底） */
export function createDockHosts() {
  const left = createPanelHost();
  const right = createPanelHost();
  const bottom = createPanelHost();

  const hosts = { left, right, bottom };

  /** 查找 panel 在哪一侧 */
  function findSide(id) {
    for (const side of ['left', 'right', 'bottom']) {
      if (hosts[side].has(id)) return side;
    }
    return null;
  }

  return {
    hosts,
    left,
    right,
    bottom,
    findSide,
  };
}

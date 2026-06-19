/**
 * editor/ui/window-manager.js
 *
 * 窗口管理器 —— 浮动窗口 + 边栏停靠系统。
 *
 * 特性：
 *   - 窗口注册与状态管理
 *   - 拖拽移动（通过标题栏），支持顶部贴靠全屏（Windows Aero Snap 风格）
 *   - 全屏窗口下拉标题栏恢复窗口
 *   - 边缘/角缩放（8 方向）
 *   - 拖拽到左/右/下边缘停靠为边栏
 *   - 边栏面板拖出还原为浮动窗口
 *   - 多面板同侧停靠，支持拖动排序
 *   - Z-Order 管理（点击聚焦）
 *   - 提供兼容层（showGameSettings / showResourceManager 伪 ref）
 */

const { reactive, computed } = Vue;
import { createPanelHost } from './panel-host.js';

export function createWindowManager() {
  // ── 窗口默认定义 ──
  const DEFAULTS = {
    gameSettings: {
      title: '游戏全局设置', icon: '⚙️',
      x: 200, y: 80, width: 640, height: 580,
      minWidth: 480, minHeight: 400,
    },
    resourceManager: {
      title: '资源管理', icon: '📦',
      x: 120, y: 60, width: 960, height: 720,
      minWidth: 720, minHeight: 400,
    },
    terminal: {
      title: '终端', icon: '>_',
      x: 80, y: 200, width: 720, height: 360,
      minWidth: 400, minHeight: 180,
    },
  };

  // ── 响应式窗口状态 ──
  const windows = reactive({});
  let nextZ = 200;

  for (const [id, def] of Object.entries(DEFAULTS)) {
    windows[id] = {
      id,
      title: def.title,
      icon: def.icon,
      x: def.x, y: def.y,
      width: def.width, height: def.height,
      minWidth: def.minWidth || 300,
      minHeight: def.minHeight || 200,
      maximized: false,
      visible: false,
      zIndex: nextZ++,
      _restoreX: def.x, _restoreY: def.y,
      _restoreW: def.width, _restoreH: def.height,
    };
  }

  // ── 边栏系统（基于通用 panel-host） ──
  const dockHosts = {
    left: createPanelHost(),
    right: createPanelHost(),
    bottom: createPanelHost(),
  };
  const docks = {
    left: dockHosts.left.panels,
    right: dockHosts.right.panels,
    bottom: dockHosts.bottom.panels,
  };
  // dockActiveIdx 是 reactive(ref) 属性，Vue 自动解包，模板可直接读写
  const dockActiveIdx = reactive({
    left: dockHosts.left.activeIdx,
    right: dockHosts.right.activeIdx,
    bottom: dockHosts.bottom.activeIdx,
  });

  function setDockActive(side, idx) {
    dockHosts[side].activateAt(idx);
  }

  // 边栏里每个条目的结构: { id, title, icon, width/height, _restoreState }
  function dockWindow(id, side) {
    const w = windows[id];
    if (!w) return;
    const host = dockHosts[side];
    if (host.has(id)) { host.activate(id); return; }
    const entry = reactive({
      id, side,
      title: w.title, icon: w.icon,
      width: 300, height: 200,
      active: true,
    });
    entry._restoreState = {
      x: w.x, y: w.y, width: w.width, height: w.height,
      maximized: w.maximized,
    };
    w.visible = false;
    w.maximized = false;
    host.add(entry);
  }

  function undockDockItem(side, index) {
    const host = dockHosts[side];
    const entry = host.panels[index];
    if (!entry) return;
    const id = entry.id;
    host.removeAt(index);
    // 恢复窗口
    const w = windows[id];
    if (w && entry._restoreState) {
      w.x = entry._restoreState.x;
      w.y = entry._restoreState.y;
      w.width = entry._restoreState.width;
      w.height = entry._restoreState.height;
      w.visible = true;
      w.zIndex = nextZ++;
    } else if (w) {
      w.visible = true;
      w.zIndex = nextZ++;
    }
  }

  function moveDockItem(side, fromIndex, toIndex) {
    dockHosts[side].move(fromIndex, toIndex);
  }

  function isDocked(id) {
    return !!dockHosts.left.has(id) || !!dockHosts.right.has(id) || !!dockHosts.bottom.has(id);
  }

  // ── 窗口操作 ──
  function openWindow(id) {
    const w = windows[id];
    if (!w) return;
    // 如果该窗口已停靠，先取消停靠
    for (const side of ['left', 'right', 'bottom']) {
      const idx = docks[side].findIndex(e => e.id === id);
      if (idx >= 0) { undockDockItem(side, idx); break; }
    }
    // 重置到默认位置（关闭再打开时恢复到初始位置）
    const def = DEFAULTS[id];
    if (def) {
      w.x = def.x; w.y = def.y;
      w.width = def.width; w.height = def.height;
      w.maximized = false;
      w._restoreX = def.x; w._restoreY = def.y;
      w._restoreW = def.width; w._restoreH = def.height;
    }
    w.visible = true;
    w.zIndex = nextZ++;
  }

  function closeWindow(id) {
    const w = windows[id];
    if (!w) return;
    w.visible = false;
    if (w.maximized) w.maximized = false;
    // 关闭后自动聚焦下一个可见窗口（焦点向下继承）
    const visibleIds = Object.keys(windows)
      .filter(k => windows[k].visible)
      .sort((a, b) => windows[b].zIndex - windows[a].zIndex);
    if (visibleIds.length > 0) {
      focusWindow(visibleIds[0]);
    }
  }

  function toggleWindow(id) {
    const w = windows[id];
    if (!w) return;
    // 如果已停靠 → 取消停靠并打开为浮动窗口
    for (const side of ['left', 'right', 'bottom']) {
      const idx = docks[side].findIndex(e => e.id === id);
      if (idx >= 0) { undockDockItem(side, idx); return; }
    }
    if (w.visible) closeWindow(id);
    else openWindow(id);
  }

  function focusWindow(id) {
    const w = windows[id];
    if (!w || !w.visible) return;
    w.zIndex = nextZ++;
  }

  function toggleMaximize(id) {
    const w = windows[id];
    if (!w || !w.visible) return;
    if (w.maximized) {
      w.maximized = false;
      w.x = w._restoreX; w.y = w._restoreY;
      w.width = w._restoreW; w.height = w._restoreH;
    } else {
      w._restoreX = w.x; w._restoreY = w.y;
      w._restoreW = w.width; w._restoreH = w.height;
      w.maximized = true;
      w.x = 0; w.y = 0;
    }
    focusWindow(id);
  }

  // ── 贴靠阈值 ──
  const SNAP = {
    TOP: 12,        // 顶部贴靠 → 全屏
    SIDE: 80,       // 左/右贴靠 → 边栏停靠
    BOTTOM: 80,     // 底部贴靠 → 底边栏停靠
    RESTORE_DOWN: 30, // 全屏状态下下拉恢复阈值
  };
  const TOOLBAR_HEIGHT = 48;    // editor-toolbar 实际高度
  const TITLEBAR_HEIGHT = 38;   // window-header min-height
  const MIN_WIN_Y = Math.max(0, TOOLBAR_HEIGHT - TITLEBAR_HEIGHT); // 标题栏底部不超出顶栏

  // ── 贴靠预览状态 ──
  const snapPreview = reactive({
    active: false,
    zone: null,  // 'maximize' | 'left' | 'right' | 'bottom'
    rect: null,  // { left, top, width, height } 预览矩形
  });

  function getSnapZone(e) {
    const mw = window.innerWidth, mh = window.innerHeight;
    if (e.clientY < SNAP.TOP) return 'maximize';
    if (e.clientX < SNAP.SIDE) return 'left';
    if (e.clientX > mw - SNAP.SIDE) return 'right';
    if (e.clientY > mh - SNAP.BOTTOM) return 'bottom';
    return null;
  }

  function getSnapRect(zone, id) {
    const w = windows[id];
    if (!w) return null;
    const mw = window.innerWidth, mh = window.innerHeight;
    const tb = 48; // toolbar 高度
    switch (zone) {
      case 'maximize': return { left: 0, top: tb, width: mw, height: mh - tb };
      case 'left': return { left: 0, top: tb, width: Math.round(mw * 0.4), height: mh - tb };
      case 'right': return { left: Math.round(mw * 0.6), top: tb, width: Math.round(mw * 0.4), height: mh - tb };
      case 'bottom': return { left: 0, top: Math.round(mh * 0.6), width: mw, height: Math.round(mh * 0.4) };
      default: return null;
    }
  }

  // ── 窗口拖拽（通过标题栏） ──
  const dragState = reactive({
    active: false, windowId: null,
    startX: 0, startY: 0,
    origX: 0, origY: 0,
    wasMaximized: false,  // 拖拽开始时是否全屏
    startOnHeader: false,  // 是否从标题栏开始拖（用于恢复判断）
  });

  function startWindowDrag(e, id) {
    const w = windows[id];
    if (!w || !w.visible) return;
    // 允许在全屏窗口上 mousedown，稍后判断是否下拉恢复
    if (!w.maximized) e.preventDefault();
    dragState.active = true;
    dragState.windowId = id;
    dragState.startX = e.clientX; dragState.startY = e.clientY;
    dragState.origX = w.x; dragState.origY = w.y;
    dragState.wasMaximized = w.maximized;
    dragState.startOnHeader = true;
    focusWindow(id);

    function onMove(ev) {
      if (!dragState.active) { cleanup(); return; }
      const ww = windows[dragState.windowId];
      if (!ww) { cleanup(); return; }

      const dx = ev.clientX - dragState.startX;
      const dy = ev.clientY - dragState.startY;

      // 全屏状态：检测下拉恢复
      if (dragState.wasMaximized) {
        if (dy > SNAP.RESTORE_DOWN) {
          // 恢复窗口，并让窗口跟随鼠标（保持鼠标抓取位置在标题栏的相对位置）
          ww.maximized = false;
          ww.x = ww._restoreX;
          ww.y = ww._restoreY;
          ww.width = ww._restoreW;
          ww.height = ww._restoreH;
          dragState.wasMaximized = false;
          // 重新计算偏移，使窗口顶部跟随鼠标
          // 为了让抓取感自然，从 startX/startY 偏移到当前鼠标位置
          const headerRelY = Math.min(e.clientY - dragState.startY, ww.height * 0.3);
          dragState.origX = ww.x;
          dragState.origY = ww.y - dy + headerRelY;
          dragState.startX = ev.clientX;
          dragState.startY = ev.clientY;
        }
        // 未超过阈值，不移动窗口
        return;
      }

      // 正常拖拽移动
      let newX = Math.max(0, dragState.origX + dx);
      let newY = Math.max(MIN_WIN_Y, dragState.origY + dy);
      ww.x = newX; ww.y = newY;

      // 贴靠预览检测
      const zone = getSnapZone(ev);
      if (zone) {
        snapPreview.active = true;
        snapPreview.zone = zone;
        snapPreview.rect = getSnapRect(zone, dragState.windowId);
      } else {
        snapPreview.active = false;
        snapPreview.zone = null;
        snapPreview.rect = null;
      }
    }

    function onUp(ev) {
      snapPreview.active = false;
      snapPreview.zone = null;
      snapPreview.rect = null;

      if (!dragState.active) { cleanup(); return; }
      const ww = windows[dragState.windowId];
      if (!ww) { cleanup(); return; }

      // 全屏状态松手但不做下拉：无操作（保持全屏）
      if (dragState.wasMaximized) { cleanup(); return; }

      // 检查是否有贴靠动作
      const zone = getSnapZone(ev);
      if (zone) {
        if (zone === 'maximize') {
          toggleMaximize(dragState.windowId);
        } else {
          dockWindow(dragState.windowId, zone);
        }
      }
      // 无贴靠：正常拖拽定位（已由 onMove 完成）
      cleanup();
    }

    function cleanup() {
      dragState.active = false; dragState.windowId = null;
      dragState.wasMaximized = false; dragState.startOnHeader = false;
      snapPreview.active = false; snapPreview.zone = null; snapPreview.rect = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── 窗口缩放（通过边缘/角手柄） ──
  const resizeState = reactive({
    active: false, windowId: null, edge: '',
    startX: 0, startY: 0,
    origX: 0, origY: 0, origW: 0, origH: 0,
  });

  /**
   * 开始缩放窗口
   * @param {MouseEvent} e
   * @param {string} id - 窗口 ID
   * @param {string} edge - 方向: n, s, e, w, ne, nw, se, sw
   */
  function startWindowResize(e, id, edge) {
    const w = windows[id];
    if (!w || !w.visible || w.maximized) return;
    e.preventDefault(); e.stopPropagation();
    resizeState.active = true;
    resizeState.windowId = id;
    resizeState.edge = edge;
    resizeState.startX = e.clientX; resizeState.startY = e.clientY;
    resizeState.origX = w.x; resizeState.origY = w.y;
    resizeState.origW = w.width; resizeState.origH = w.height;
    focusWindow(id);

    function onMove(ev) {
      if (!resizeState.active) { cleanup(); return; }
      const ww = windows[resizeState.windowId];
      if (!ww) { cleanup(); return; }
      const dx = ev.clientX - resizeState.startX;
      const dy = ev.clientY - resizeState.startY;
      const edge = resizeState.edge;
      let { x, y, w, h } = { x: resizeState.origX, y: resizeState.origY, w: resizeState.origW, h: resizeState.origH };

      if (edge.includes('e')) w = Math.max(ww.minWidth, resizeState.origW + dx);
      if (edge.includes('w')) { const nw = Math.max(ww.minWidth, resizeState.origW - dx); x = resizeState.origX + (resizeState.origW - nw); w = nw; }
      if (edge.includes('s')) h = Math.max(ww.minHeight, resizeState.origH + dy);
      if (edge.includes('n')) { const nh = Math.max(ww.minHeight, resizeState.origH - dy); y = resizeState.origY + (resizeState.origH - nh); h = nh; }

      ww.x = Math.max(0, x); ww.y = Math.max(MIN_WIN_Y, y);
      ww.width = w; ww.height = h;
    }
    function onUp() { cleanup(); }
    function cleanup() {
      resizeState.active = false; resizeState.windowId = null; resizeState.edge = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── 边栏停靠拖拽排序 ──
  const dockDragState = reactive({
    active: false, side: null, fromIndex: -1,
    startY: 0,
  });

  function startDockItemDrag(e, side, index) {
    e.preventDefault();
    dockDragState.active = true;
    dockDragState.side = side;
    dockDragState.fromIndex = index;
    dockDragState.startY = e.clientY;

    function onMove(ev) {
      if (!dockDragState.active) { cleanup(); return; }
      const arr = docks[dockDragState.side];
      if (!arr) { cleanup(); return; }
      const dy = ev.clientY - dockDragState.startY;
      const itemH = 36; // 每个标签的近似高度
      const delta = Math.round(dy / itemH);
      const toIdx = Math.max(0, Math.min(arr.length - 1, dockDragState.fromIndex + delta));
      if (toIdx !== dockDragState.fromIndex) {
        moveDockItem(dockDragState.side, dockDragState.fromIndex, toIdx);
        dockDragState.fromIndex = toIdx;
        dockDragState.startY = ev.clientY;
      }
    }
    function onUp() { cleanup(); }
    function cleanup() {
      dockDragState.active = false; dockDragState.side = null; dockDragState.fromIndex = -1;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── 计算窗口样式 ──
  function getWindowStyle(id) {
    const w = windows[id];
    if (!w || !w.visible) return { display: 'none' };
    if (w.maximized) {
      return {
        position: 'fixed',
        top: '48px', left: '0', right: '0', bottom: '0',
        width: 'auto', height: 'auto',
        zIndex: w.zIndex,
        borderRadius: 0,
      };
    }
    return {
      position: 'fixed',
      top: w.y + 'px', left: w.x + 'px',
      width: w.width + 'px', height: w.height + 'px',
      zIndex: w.zIndex,
    };
  }

  // ── 兼容 ref 层 ──
  const compatRefs = {};
  for (const id of Object.keys(DEFAULTS)) {
    compatRefs[id] = computed({
      get: () => windows[id]?.visible ?? false,
      set: (v) => { if (v) openWindow(id); else closeWindow(id); },
    });
  }

  return {
    windows, docks, dockActiveIdx, snapPreview,
    openWindow, closeWindow, toggleWindow,
    focusWindow, toggleMaximize,
    dockWindow, undockDockItem, moveDockItem, startDockItemDrag,
    setDockActive, isDocked,
    startWindowDrag, getWindowStyle,
    startWindowResize, resizeState, dragState, dockDragState,
    compat: compatRefs,
    register(id, def) {
      if (windows[id]) return;
      windows[id] = { ...def, id, maximized: false, visible: false, zIndex: nextZ++ };
      compatRefs[id] = computed({
        get: () => windows[id]?.visible ?? false,
        set: (v) => { if (v) openWindow(id); else closeWindow(id); },
      });
    },
  };
}

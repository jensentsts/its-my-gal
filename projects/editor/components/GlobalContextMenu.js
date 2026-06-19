/**
 * components/GlobalContextMenu.js
 *
 * Global right-click context menu (triggered outside the tree canvas).
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'GlobalContextMenu',
  template: `
    <div class="global-context-menu" v-if="globalContextMenu.show"
         :style="{ left: globalContextMenu.x + 'px', top: globalContextMenu.y + 'px', zIndex: globalContextMenu.zIndex }"
         @click.stop>
      <div class="context-menu-item" @click="addChapter; closeGlobalContextMenu()">➕ 新建章节</div>
      <div class="context-menu-item" @click="openResourceManager; closeGlobalContextMenu()">📦 资源管理</div>
      <div class="context-menu-item" @click="openGameSettings; closeGlobalContextMenu()">⚙️ 游戏设置</div>
      <div class="context-menu-item" @click="syncToGame; closeGlobalContextMenu()">💾 同步到游戏</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="autoLayout; closeGlobalContextMenu()">🔄 自动布局</div>
      <div class="context-menu-item" @click="resetView; closeGlobalContextMenu()">🏠 重置视图</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="exportAll; closeGlobalContextMenu()">📋 导出 JS</div>
      <div class="context-menu-item" @click="exportJSON; closeGlobalContextMenu()">📄 导出 JSON</div>
      <div class="context-menu-item" @click="exportPackZip; closeGlobalContextMenu()">📦 导出资源包</div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

/**
 * components/EditorToolbar.js
 *
 * Top toolbar: undo/redo, file operations (import/export), game title with search,
 * window toggle buttons (terminal, settings, resource manager).
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'EditorToolbar',
  template: `
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="tb-icon-btn" :class="{ 'tb-disabled': !undoCount }" title="撤销 (Ctrl+Z)" @click="undo" :disabled="!undoCount">↩</button>
        <button class="tb-icon-btn" :class="{ 'tb-disabled': !redoCount }" title="重做 (Ctrl+Shift+Z)" @click="redo" :disabled="!redoCount">↪</button>
        <span class="toolbar-sep"></span>
        <button class="tb-icon-btn tb-icon-sync" title="同步到游戏引擎 (Ctrl+S)" @click="syncToGame">💾</button>
        <div class="toolbar-submenu-wrap">
          <button class="tb-icon-btn" title="导入/导出" @click.stop="showFileMenu = !showFileMenu">📂</button>
          <div class="toolbar-submenu" v-if="showFileMenu" @click.stop>
            <div class="submenu-item" @click="exportAll; showFileMenu=false">📋 导出 JS (Ctrl+Shift+E)</div>
            <div class="submenu-item" @click="exportJSON; showFileMenu=false">📄 导出 JSON (Ctrl+E)</div>
            <div class="submenu-item" @click="exportPackZipWithAssets; showFileMenu=false">📦 导出资源包 (含图片)</div>
            <div class="submenu-item" @click="triggerImportPack; showFileMenu=false">📥 导入资源包</div>
          </div>
        </div>
        <span class="toolbar-subtitle">{{ totalChapters }}章·{{ totalSteps }}步</span>
      </div>
      <div class="toolbar-center">
        <div class="toolbar-game-title" title="双击或按 Ctrl+F 进行全局资源搜索" @dblclick="startGlobalSearch">
          <span v-if="!editingGlobalSearch" class="game-title-text">{{ gameConfig.title || '未命名游戏' }}</span>
          <input v-else ref="globalSearchInput" v-model="globalSearchQuery"
                 @blur="endGlobalSearch" @keyup.escape="endGlobalSearch"
                 placeholder="搜索角色、场景、CG、物品、结局、章节…"
                 class="global-search-input" />
        </div>
        <div class="global-search-dropdown" v-if="editingGlobalSearch && globalSearchQuery">
          <div v-for="result in globalSearchResults" :key="result.type + result.id"
               class="search-result-item" @mousedown.prevent="navigateToSearchResult(result)">
            <span class="search-result-icon">{{ result.icon }}</span>
            <span class="search-result-label">{{ result.label }}</span>
            <span class="search-result-type">{{ result.type }}</span>
          </div>
          <div class="search-no-results" v-if="globalSearchQuery && globalSearchResults.length === 0">未找到匹配资源</div>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="tb-icon-btn" title="全局搜索 (双击标题触发)" @click="startGlobalSearch">🔍</button>
        <button class="tb-icon-btn" title="同步并打开游戏" @click="previewStory">🎮</button>
        <button class="tb-icon-btn tb-icon-debug" :class="{ 'tb-active': windows.gameDebug?.visible }" title="游戏调试窗口 — 编辑器内实时运行游戏 (Ctrl+D)" @click="openGameDebug">🐛</button>
        <button class="tb-icon-btn" title="资源自检" @click="validateEditorResources">⚠️</button>
        <span class="toolbar-sep"></span>
        <button class="tb-icon-btn tb-icon-terminal" :class="{ 'tb-active': windows.terminal?.visible }" title="终端面板 (/ 或 Ctrl+&#96;)" @click="toggleTerminal">>_</button>
        <button class="tb-icon-btn tb-icon-config" :class="{ 'tb-active': windows.gameSettings?.visible }" title="游戏全局设置" @click="openGameSettings">⚙️</button>
        <button class="tb-icon-btn tb-icon-resource" :class="{ 'tb-active': windows.resourceManager?.visible }" title="资源管理" @click="openResourceManager">📦</button>
      </div>
      <input type="file" id="pack-import-input" accept=".zip" style="display:none" @change="handlePackImport" />
      <input type="file" id="resource-image-input" accept="image/*" style="display:none" @change="handleResourceImagePick" />
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

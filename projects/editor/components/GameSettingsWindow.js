/**
 * components/GameSettingsWindow.js
 *
 * Floating game settings window — title, aspect ratio, text speed,
 * panel backgrounds, entry point selector.
 * Includes the floating-window chrome (resize handles, header, footer).
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'GameSettingsWindow',
  template: `
    <div class="editor-window" :class="{ 'window-is-maximized': windows.gameSettings?.maximized }"
         v-if="windows.gameSettings?.visible && !isDocked('gameSettings')" :style="getWindowStyle('gameSettings')"
         @mousedown="focusWindow('gameSettings')">
      <div class="window-resize-overlay">
        <div class="wr-edge-n" @mousedown.stop="startWindowResize($event, 'gameSettings', 'n')"></div>
        <div class="wr-edge-s" @mousedown.stop="startWindowResize($event, 'gameSettings', 's')"></div>
        <div class="wr-edge-w" @mousedown.stop="startWindowResize($event, 'gameSettings', 'w')"></div>
        <div class="wr-edge-e" @mousedown.stop="startWindowResize($event, 'gameSettings', 'e')"></div>
        <div class="wr-corner-nw" @mousedown.stop="startWindowResize($event, 'gameSettings', 'nw')"></div>
        <div class="wr-corner-ne" @mousedown.stop="startWindowResize($event, 'gameSettings', 'ne')"></div>
        <div class="wr-corner-sw" @mousedown.stop="startWindowResize($event, 'gameSettings', 'sw')"></div>
        <div class="wr-corner-se" @mousedown.stop="startWindowResize($event, 'gameSettings', 'se')"></div>
      </div>
      <div class="window-header" @mousedown.stop="startWindowDrag($event, 'gameSettings')">
        <span class="window-header-title">{{ windows.gameSettings?.icon }} {{ windows.gameSettings?.title }}</span>
        <div class="window-header-actions">
          <button class="window-btn window-btn-maximize" @click.stop="toggleMaximize('gameSettings')"
                  :title="windows.gameSettings?.maximized ? '还原' : '全屏'">
            {{ windows.gameSettings?.maximized ? '⤡' : '⤢' }}
          </button>
          <button class="window-btn window-btn-close" @click.stop="closeWindow('gameSettings')" title="关闭">✕</button>
        </div>
      </div>
      <div class="window-body">
        <div class="modal-body">
          <div class="form-row">
            <label>游戏标题</label>
            <input type="text" v-model="editableGameConfig.title" placeholder="游戏标题" />
          </div>
          <div class="form-row form-row-2col">
            <div class="form-col">
              <label>画面宽度</label>
              <input type="number" v-model.number="editableGameConfig.aspectWidth" min="800" max="3840" />
            </div>
            <div class="form-col">
              <label>画面高度</label>
              <input type="number" v-model.number="editableGameConfig.aspectHeight" min="480" max="2160" />
            </div>
          </div>
          <div class="form-row">
            <label>默认打字速度 (ms/字)</label>
            <input type="number" v-model.number="editableGameConfig.textSpeed" min="1" max="200" />
          </div>
          <div class="section-label" style="margin-top:16px">🖼️ 面板背景（画廊/存档/角色名录）</div>
          <div class="settings-note">
            设置子面板的背景图片和叠加遮罩，体现主题风格。支持科幻/赛博风背景图。
          </div>
          <div class="form-row">
            <label>背景图片 URL</label>
            <input type="text" v-model="editableHomeConfig.panelBgUrl" placeholder="assets/scenes/panel_bg.png（留空使用纯色/渐变）" />
          </div>
          <div class="form-row form-row-2col">
            <div class="form-col">
              <label>叠加色（有图时）</label>
              <input type="text" v-model="editableHomeConfig.panelOverlayColor" placeholder="rgba(4,4,10,0.88)" />
            </div>
            <div class="form-col">
              <label>渐变底色（无图时）</label>
              <input type="text" v-model="editableHomeConfig.panelOverlayGradient" placeholder="linear-gradient(...)" />
            </div>
          </div>
          <div class="section-label" style="margin-top:16px">🚪 入口节点</div>
          <div class="settings-note">
            设置游戏开始时自动进入的章节节点。只有被标记为入口的节点才会出现在可选列表中。
            若未设置任何入口，则默认从 <strong>main</strong> 章节开始。
          </div>
          <div class="entry-points-list">
            <div v-for="node in treeNodes" :key="node.id"
                 class="entry-point-item"
                 :class="{ 'entry-point-active': entryPoints[node.id] }"
                 @click="setEntryPoint(node.id)">
              <span class="entry-point-indicator">{{ entryPoints[node.id] ? '🔘' : '○' }}</span>
              <span class="entry-point-name">{{ node.label }}</span>
              <span class="entry-point-type">{{ node.type === 'ending' ? '🎬结局' : '📜章节' }}</span>
            </div>
            <div class="entry-points-empty" v-if="treeNodes.length === 0">暂无节点，请先创建章节</div>
          </div>
          <div class="settings-note">⚠ 修改设置后请点击"同步到游戏"使游戏引擎生效。</div>
        </div>
        <div class="window-footer">
          <button class="tb-btn" @click="saveGameSettings">💾 保存设置</button>
          <button class="tb-btn" @click="closeWindow('gameSettings')">关闭</button>
        </div>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

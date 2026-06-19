/**
 * components/ArchiveSlots.js
 *
 * Save/load slot grid — used both in menu and in-game.
 * slotContext: 'menu' | 'game' determines which action buttons appear.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'ArchiveSlots',
  template: `
    <div class="sub-panel" v-if="activeMenuPanel === 'archiveSlots' || activeGamePanel === 'archiveSlots'" :style="panelBackgroundStyle" @click.stop>
      <div class="panel-header">
        <h2>{{ activeGamePanel === 'archiveSlots' ? (archiveMode === 'save' ? '保存核心进度节点（16格）' : '历史时空跳转节点（16格）') : '历史时空跳转节点（16格）' }}</h2>
        <button class="close-btn" @click="activeMenuPanel = null; activeGamePanel = null">关闭面板</button>
      </div>

      <div class="save-matrix-grid">
        <div class="save-slot-card" v-for="slotId in 16" :key="slotId"
             :class="focus.cls(activeGamePanel === 'archiveSlots' ? 'archive-slots-game' : 'archive-slots-menu', slotId - 1, 'slot-focused')"
             @mouseenter="focus.to(activeGamePanel === 'archiveSlots' ? 'archive-slots-game' : 'archive-slots-menu', slotId - 1)">
          <div class="slot-header-bar" :class="{'has-data': saveSlotsData[slotId]}">
            <span>SLOT {{ String(slotId).padStart(2, '0') }}</span>
            <span>{{ saveSlotsData[slotId] ? 'DATA EXIST' : 'EMPTY' }}</span>
          </div>

          <div class="slot-thumbnail-pane">
            <div v-if="saveSlotsData[slotId]" :style="{background: saveSlotsData[slotId].bgRenderStyle || saveSlotsData[slotId].bgPlaceholder || '#111', width:'100%', height:'100%', position:'relative'}">
              <img v-if="saveSlotsData[slotId].sceneBgUrl || saveSlotsData[slotId].sceneUrl" :src="saveSlotsData[slotId].sceneBgUrl || saveSlotsData[slotId].sceneUrl" class="thumbnail-image-render" @error="e => e.target.style.display='none'">
              <div v-if="!(saveSlotsData[slotId].sceneBgUrl || saveSlotsData[slotId].sceneUrl)" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#555;">No Preview</div>
            </div>
            <div v-else class="thumbnail-empty-placeholder">
              <div class="tree-node-icon"></div>
            </div>
          </div>

          <div class="slot-meta-footer">
            <div class="slot-chapter-tag" v-if="saveSlotsData[slotId]">
              {{ saveSlotsData[slotId].speaker ? saveSlotsData[slotId].speaker + ': ' : '' }}{{ saveSlotsData[slotId].textBrief }}
            </div>
            <div class="slot-time-string" v-if="saveSlotsData[slotId]">{{ saveSlotsData[slotId].saveTime }}</div>
          </div>

          <div class="slot-action-overlay">
            <button class="overlay-act-btn" v-if="activeGamePanel === 'archiveSlots' && archiveMode === 'save'" @click="executeSlotSave(slotId)">覆写保存</button>
            <button class="overlay-act-btn" v-if="(activeGamePanel === 'archiveSlots' ? archiveMode === 'load' : true) && saveSlotsData[slotId]" @click="executeSlotLoad(slotId)">引导读取</button>
            <button class="overlay-act-btn danger-style" v-if="saveSlotsData[slotId]" @click.stop="executeSlotClear(slotId)">粉碎</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

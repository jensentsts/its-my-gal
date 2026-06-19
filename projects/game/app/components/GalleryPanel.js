/**
 * components/GalleryPanel.js
 *
 * Gallery panel — CG grid, endings collection, chapters, clear memories.
 */
const { defineComponent, inject, ref } = Vue;
export default defineComponent({
  name: 'GalleryPanel',
  template: `
    <div class="sub-panel" v-if="activeMenuPanel === 'gallery'" :style="panelBackgroundStyle">
      <div class="panel-header">
        <h2>艺术画廊图鉴</h2>
        <button class="close-btn" @click="activeMenuPanel = null">返回主视图</button>
      </div>

      <div class="gallery-grid">
        <div class="gallery-item" v-for="(cg, id, idx) in assetsCgLibrary" :key="id"
             :class="focus.cls('gallery-grid', idx, 'gallery-focused')"
             @click="clickGalleryItem(id)"
             @mouseenter="focus.to('gallery-grid', idx)">
          <div v-if="unlockedGalleries[id]" style="width:100%; height:100%;">
            <img :src="cg.url">
            <div class="lyric-gallery-label">
              <div class="lyric-title">{{ cg.title }}</div>
              <div class="lyric-subtitle">{{ cg.subtitle }}</div>
            </div>
          </div>
          <div v-else class="gallery-locked">🔒 已封存映像<br><small style="color:#555;margin-top:6px;">在剧情中经历对应事件后自动解锁</small></div>
        </div>
      </div>

      <div class="ending-gallery-section">
        <h3>🎬 编年史分歧结局收集</h3>
        <div class="ending-matrix-grid">
          <div class="ending-card-badge"
               v-for="(end, idx) in fullEndingsList" :key="end.id"
               :class="{ unlocked: unlockedEndings[end.id], 'gallery-card-focused': focus.is('endings-grid', idx) }"
               @mouseenter="gallerySection = 'endings'; focus.to('endings-grid', idx)">
            <div class="ending-badge-status">{{ unlockedEndings[end.id] ? "✨ UNLOCKED" : "🔒 LOCKED" }}</div>
            <div class="ending-badge-title">{{ unlockedEndings[end.id] ? end.title : "未探明的时间线终局" }}</div>
            <div class="ending-badge-desc">{{ unlockedEndings[end.id] ? end.description : "在旅程中达成该分歧结局后，将激活此处的时空记录。" }}</div>
          </div>
        </div>
      </div>

      <div class="ending-gallery-section">
        <h3>📖 已启程的篇章</h3>
        <div class="ending-matrix-grid">
          <div class="ending-card-badge"
               v-for="(desc, cid, idx) in chapterDescriptions" :key="cid"
               :class="{ unlocked: visitedChapters[cid], 'gallery-card-focused': focus.is('chapters-grid', idx) }"
               @mouseenter="gallerySection = 'chapters'; focus.to('chapters-grid', idx)">
            <div class="ending-badge-status">{{ visitedChapters[cid] ? "✅ 已探索" : "🔒 未抵达" }}</div>
            <div class="ending-badge-title">{{ visitedChapters[cid] ? cid : '???' }}</div>
            <div class="ending-badge-desc">{{ visitedChapters[cid] ? desc : '在此章节被经历之前，其内容缠绕在命运的迷雾之中。' }}</div>
          </div>
        </div>
      </div>

      <div class="ending-gallery-section" style="border-top: none; padding-top: 10px;">
        <div class="clear-memories-container">
          <button class="clear-memories-btn"
                  :class="{ 'clearing': clearHolding, 'gallery-card-focused': gallerySection === 'clear' }"
                  @mousedown.prevent="startClearHold"
                  @mouseup.prevent="cancelClearHold"
                  @mouseleave.prevent="cancelClearHold"
                  @touchstart.prevent="startClearHold"
                  @touchend.prevent="cancelClearHold"
                  @touchcancel.prevent="cancelClearHold"
                  @mouseenter="gallerySection = 'clear'"
                  @keydown.space.prevent="startClearHold"
                  @keyup.space.prevent="cancelClearHold">
            <span class="clear-memories-fill" :style="{ width: clearProgress + '%' }"></span>
            <span class="clear-memories-text">{{ clearHolding ? '继续按住...' : '🗑️ 清除所有记忆' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

/**
 * components/MenuView.js
 *
 * Main menu view — title, buttons, about panel, settings, archive, gallery.
 * Composes sub-components: SettingsPanel, CharacterArchive, GalleryPanel, ArchiveSlots.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'MenuView',
  template: `
    <div class="menu-view" v-if="currentView === 'menu'" :style="homeBackgroundStyle">
      <div class="menu-dark-overlay" v-if="homeConfig.showOverlay" :style="{ opacity: homeConfig.overlayOpacity || 0.5 }"></div>
      <div class="screen-mask-overlay" :class="homeEffectMaskClasses"></div>
      <div id="home-particles-container" class="effect-canvas-container"></div>

      <div class="menu-top-right-btns">
        <button class="menu-info-btn" @click="openSettings" title="设置">⚙️</button>
        <button class="menu-info-btn" @click="openInfoPanel" title="关于">ⓘ</button>
      </div>

      <div class="menu-container">
        <h1>{{ configTitle }}</h1>
        <div class="menu-buttons">
          <button v-for="(item, index) in menuItems" :key="index"
                  class="btn" :class="[item.cls || '', focus.cls('main-menu', index, 'menu-focused')]"
                  @click="item.action"
                  @mouseenter="focus.to('main-menu', index)">
            {{ item.label }}
          </button>
        </div>
      </div>

      <!-- About panel -->
      <div class="sub-panel" v-if="showInfoPanel" :style="panelBackgroundStyle">
        <div class="panel-header">
          <h2>ℹ️ 关于</h2>
          <button class="close-btn" :class="focus.cls('info-panel', 0, 'kb-focused')" @click="closeInfoPanel" @mouseenter="focus.to('info-panel', 0)">返回主视图</button>
        </div>
        <div class="about-container">
          <div class="about-section">
            <h3>{{ configTitle }}</h3>
            <p class="about-story-version">剧情版本 <strong>{{ STORY_VERSION }}</strong></p>
          </div>
          <div class="about-section">
            <h4>引擎内核</h4>
            <p>GalEngine v{{ ENGINE_VERSION }}</p>
            <p class="about-tech">自研视觉小说引擎 · 框架无关 · 事件驱动</p>
          </div>
          <div class="about-section">
            <h4>开发人员</h4>
            <p>jensentsts</p>
          </div>
          <div class="about-section">
            <h4>版权声明</h4>
            <p>© 2026 29103. All rights reserved.</p>
            <p class="about-legal">本作品采用 知识共享署名-非商业性使用-禁止演绎 4.0 国际许可协议。<br>未经许可，不得用于任何商业用途。</p>
          </div>
          <div class="about-section about-tech-stack">
            <h4>技术栈</h4>
            <p>Vue 3 · GalEngine · DOM Particles · localStorage</p>
          </div>
        </div>
      </div>

      <settings-panel></settings-panel>
      <character-archive></character-archive>
      <gallery-panel></gallery-panel>
      <archive-slots></archive-slots>
    </div>
  `,
  setup() { return inject('game'); }
});

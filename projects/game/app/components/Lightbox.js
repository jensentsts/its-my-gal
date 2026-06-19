/**
 * components/Lightbox.js
 *
 * CG / sprite full-screen lightbox modal.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'Lightbox',
  template: `
    <div class="cg-lightbox-modal" :class="{'modal-active': lightboxUrl}" @click="closeLightbox">
      <img v-if="lightboxUrl && !lightboxError" :src="lightboxUrl" class="lightbox-large-img" @click.stop @error="onLightboxError">
      <div v-if="lightboxError" class="lightbox-fallback" @click.stop>
        <span class="lightbox-fallback-icon">🖼️</span>
        <span class="lightbox-fallback-text">图片加载失败</span>
        <button class="lightbox-fallback-close" @click="closeLightbox">关闭</button>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

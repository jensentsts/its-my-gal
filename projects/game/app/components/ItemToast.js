/**
 * components/ItemToast.js
 *
 * Item gain/loss/update notification overlay centered on stage.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'ItemToast',
  template: `
    <div class="item-toast-layer"
         v-if="stageDisplayItem"
         :class="stageDisplayItem.animClass"
         @click.stop="dismissItemStageToast">
      <div class="item-toast-badge">{{ stageDisplayItem.titleLabel }}</div>
      <div class="item-toast-avatar">
        <img v-if="stageDisplayItem.image" :src="stageDisplayItem.image"
             class="item-toast-img" @error="e => { e.target.style.display='none'; e.target.parentElement.innerText = stageDisplayItem.icon; }" />
        <span v-else>{{ stageDisplayItem.icon }}</span>
      </div>
      <div class="item-toast-name">{{ stageDisplayItem.name }}</div>
      <div class="item-toast-desc">{{ stageDisplayItem.description }}</div>
      <div class="item-toast-close-tip">点击任意区域关闭展示，或等待自动推进队列</div>
    </div>
  `,
  setup() { return inject('game'); }
});

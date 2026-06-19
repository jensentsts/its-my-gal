/**
 * components/EndingScreen.js
 *
 * Ending screen overlay — title, description, return to menu.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'EndingScreen',
  template: `
    <div class="ending-screen" v-if="triggeredEnding">
      <div class="ending-title">{{ triggeredEnding.title }}</div>
      <div class="ending-desc">{{ triggeredEnding.description }}</div>
      <button class="return-main-btn" @click="exitToMenu">确认并返回主菜单</button>
    </div>
  `,
  setup() { return inject('game'); }
});

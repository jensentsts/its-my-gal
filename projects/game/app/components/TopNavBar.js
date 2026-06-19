/**
 * components/TopNavBar.js
 *
 * In-game top dock bar — exit button, save/load.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'TopNavBar',
  template: `
    <div class="game-top-dock-bar" @click.stop v-show="uiVisible">
      <div class="dock-left-group">
        <button class="dock-action-btn exit-btn" @click="safelyExitToMenu"
                :class="[{ 'esc-holding': escHolding }, focus.cls('game-dock', 0, 'kb-focused')]"
                @mouseenter="focus.to('game-dock', 0)">
          <span class="esc-exit-fill" :style="{ width: escHoldProgress + '%' }"></span>
          <span class="esc-exit-text">🚪 退出暂存</span>
        </button>
      </div>
      <div class="dock-right-group">
        <button class="dock-action-btn" @click="openArchiveSlotsPanel('save')"
                :class="focus.cls('game-dock', 1, 'kb-focused')"
                @mouseenter="focus.to('game-dock', 1)">💾 存入节点</button>
        <button class="dock-action-btn" @click="openArchiveSlotsPanel('load')"
                :class="focus.cls('game-dock', 2, 'kb-focused')"
                @mouseenter="focus.to('game-dock', 2)">📂 读取节点</button>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

/**
 * components/GameView.js
 *
 * Main game view — scene background, CG overlay, characters, choices,
 * dialogue panel, side panels, ending screen.
 * Composes: TopNavBar, DialoguePanel, ChoicePanel, HistoryLog,
 *           InventoryPanel, ItemToast, ArchiveSlots, EndingScreen.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'GameView',
  template: `
    <div class="game-view" v-if="currentView === 'game'" @contextmenu.prevent="handleGameViewRightClick">
      <div class="game-viewport" :style="viewportStyle">

        <!-- Global click advance -->
        <div class="game-click-area" @click="globalAdvance"></div>

        <top-nav-bar></top-nav-bar>

        <!-- Scene background -->
        <div class="scene-background" :style="backgroundStyle"></div>
        <img v-if="currentSceneTestUrl" :src="currentSceneTestUrl" style="display:none;" @error="onSceneBgError">

        <!-- CG overlay -->
        <div class="cg-overlay-viewport" v-if="activeCG" :class="activeCG.animation">
          <img v-if="activeCG.url" :src="activeCG.url" class="cg-img-content" :class="activeCG.effectClass"
               @error="onCGError">
          <div v-else class="cg-fallback">
            <div class="cg-fallback-icon">🖼️</div>
            <div class="cg-fallback-text">CG 资源缺失</div>
          </div>
        </div>

        <!-- Screen effects -->
        <div class="screen-mask-overlay" :class="effectMaskClasses"></div>
        <div id="particles-container" class="effect-canvas-container"></div>

        <!-- Floating control rack -->
        <div class="stage-floating-control-rack" v-show="uiVisible" @click.stop>
          <button class="rack-glass-btn" :class="focus.cls('game-floating', 0, 'kb-focused')" @click="showLog = true" title="历史剧情回放" @mouseenter="focus.to('game-floating', 0)">📋</button>
          <button class="rack-glass-btn" :class="focus.cls('game-floating', 1, 'kb-focused')" @click="openInventoryPanel" title="随身背包物资" @mouseenter="focus.to('game-floating', 1)">🎒</button>
        </div>

        <item-toast></item-toast>

        <!-- Character stage -->
        <div class="stage-container">
          <div v-for="state in sortedStageCharacters" :key="state.id"
               class="stage-character"
               :style="getCharacterPositionStyle(state)">
            <div class="character-anim-layer"
                 :class="getCharacterAnimationClasses(state)"
                 :style="getCharacterAnimStyle(state)"
                 @animationend="onCharacterAnimationEnd(state, $event)">
              <!-- Speech indicator -->
              <div class="speech-indicator" v-if="state.isSpeaking && state.visible"
                   :style="{'--speech-weight': state.speechWeight || 1}">
                <span class="speech-wave" v-for="n in 3" :key="n"></span>
              </div>

              <!-- Character image -->
              <img v-if="state.url && state.visible"
                   :src="state.url"
                   @error="handleSpriteError(state.id)"
                   class="character-img"
                   :class="{ 'action-active': state.actionState }">
              <div v-else-if="state.visible"
                   class="fallback-placeholder"
                   :style="{'--char-color': getCharColor(state.id)}">
                <div class="fallback-head">
                  <span class="fallback-emoji">{{ getCharEmoji(state.id, state.spriteId) }}</span>
                </div>
                <div class="fallback-body"></div>
                <div class="fallback-tags">
                  <span>{{ getCharName(state.id) }}</span>
                  <small>{{ getCharMeta(state.id) }}</small>
                </div>
              </div>

              <!-- Name tag -->
              <div class="char-name-tag" v-if="Object.keys(stageCharacters).length > 1 && state.visible"
                   :style="{ color: getCharColor(state.id) }">
                {{ getCharName(state.id) }}
              </div>
            </div>
          </div>
        </div>

        <choice-panel></choice-panel>
        <dialogue-panel></dialogue-panel>
        <history-log></history-log>
        <inventory-panel></inventory-panel>
        <archive-slots></archive-slots>
        <ending-screen></ending-screen>

      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

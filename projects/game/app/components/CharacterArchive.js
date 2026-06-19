/**
 * components/CharacterArchive.js
 *
 * Character viewer fullscreen panel — sprite viewport, bio, expression grid.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'CharacterArchive',
  template: `
    <div class="archive-panel-fullscreen" v-if="activeMenuPanel === 'characters'" :style="panelBackgroundStyle">
      <div class="archive-header-fluid">
        <h2>角色名录详存</h2>
        <button class="close-btn" @click="activeMenuPanel = null">返回主视图</button>
      </div>

      <div class="archive-container-layout" v-if="activeInspectedCharId">
        <div class="archive-left-nav">
          <div class="archive-nav-item"
               v-for="(char, id) in assetsCharacters" :key="id"
               :class="{ active: activeInspectedCharId === id }"
               :style="{ '--char-color': char.color, '--char-rgb': hexToRgb(char.color) }"
               @click="switchInspectedCharacter(id)"
               @mouseenter="switchInspectedCharacter(id)">
            <div class="nav-mini-avatar">
              <img v-if="char.avatars && char.avatars['normal']" :src="char.avatars['normal']">
            </div>
            <div class="nav-info">
              <h4>{{ char.name }}</h4>
              <span>{{ char.role }}</span>
            </div>
          </div>
        </div>

        <div class="archive-right-details" v-if="inspectedChar" :style="{ '--char-color': inspectedChar.color, '--char-rgb': hexToRgb(inspectedChar.color) }">
          <div class="details-visual-pane">
            <div class="details-sprite-viewport" @click.stop="openLightbox(activeInspectedSpriteUrl)">
              <img v-if="activeInspectedSpriteUrl" :src="activeInspectedSpriteUrl" @error="handleArchiveSpriteError">
              <div v-else class="details-sprite-fallback">
                <div class="sprite-fallback-emoji">{{ getArchiveEmoji }}</div>
                <div class="sprite-fallback-label">{{ activeInspectedSpriteLabel }}</div>
              </div>
              <div v-if="activeInspectedSpriteUrl" class="sprite-zoom-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <span>查看大图</span>
              </div>
            </div>
          </div>

          <div class="details-content-pane">
            <div class="char-meta-header">
              <h2 :style="{color: inspectedChar.color}">{{ inspectedChar.name }}</h2>
              <div class="char-meta-tags">
                <span class="meta-tag-badge">种族：{{ inspectedChar.race }}</span>
                <span class="meta-tag-badge">性别：{{ inspectedChar.gender }}</span>
                <span class="meta-tag-badge">阵营职责：{{ inspectedChar.role }}</span>
              </div>
            </div>
            <div class="char-biography-box">{{ inspectedChar.description }}</div>
            <div class="expression-matrix-title">形态立绘与表情差分镜像</div>
            <div class="expression-grid-layout">
              <div class="expression-chip"
                   v-for="(sp, spIdx) in inspectedChar.sprites" :key="sp.id"
                   :class="[{ active: activeSpriteIdForInspection === sp.id }, focus.cls('character-sprites', spIdx, 'sprite-focused')]"
                   @click="switchInspectedSprite(sp.id)"
                   @mouseenter="focus.to('character-sprites', spIdx)">
                {{ sp.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

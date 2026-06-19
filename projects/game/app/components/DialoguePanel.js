/**
 * components/DialoguePanel.js
 *
 * Dialogue step display — speaker avatar, name, typed text, next arrow.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'DialoguePanel',
  template: `
    <div class="dialogue-panel"
         v-if="currentStep && currentStep.type === 'dialogue'"
         v-show="uiVisible"
         @click.stop="advanceStory"
         @contextmenu.stop>
      <div class="speaker-avatar-box" v-if="shouldShowAvatar">
        <img :src="currentAvatarUrl" @error="avatarLoadFail = true" v-if="currentAvatarUrl && !avatarLoadFail">
        <div v-else class="avatar-fallback" :style="{background: currentSpeakerColor}">
          {{ currentSpeakerName ? currentSpeakerName[0] : '?' }}
        </div>
      </div>

      <div class="dialogue-body-content">
        <div class="speaker-name" :style="{ color: currentSpeakerColor, textShadow: '0 0 4px ' + currentSpeakerColor }">
          {{ currentSpeakerName }}
        </div>
        <div class="dialogue-text">
          {{ typedText }}<span class="typing-cursor" v-if="!typingFinished">|</span>
        </div>
      </div>

      <div class="next-arrow"
           v-if="typingFinished && currentStep?.type === 'dialogue' && uiVisible"
           @click.stop="advanceStory">
        ↓
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

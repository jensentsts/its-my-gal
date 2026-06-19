/**
 * components/DialogBox.js
 *
 * Custom dialog modal (alert/confirm/prompt).
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'DialogBox',
  template: `
    <div class="game-dialog-overlay" v-if="dialogState.show" @click.self="closeDialog(null)">
      <div class="game-dialog-box">
        <div class="game-dialog-title">{{ dialogState.title }}</div>
        <div class="game-dialog-message" v-if="dialogState.message">{{ dialogState.message }}</div>
        <div class="game-dialog-prompt" v-if="dialogState.type === 'prompt'">
          <input type="text" v-model="dialogState.promptValue"
                 :placeholder="dialogState.promptPlaceholder"
                 class="game-dialog-input"
                 @keyup.enter="dialogState.confirmDisabled || closeDialog(dialogState.promptValue)" />
        </div>
        <div class="game-dialog-buttons">
          <button v-if="dialogState.type !== 'alert'"
                  class="game-dialog-btn cancel"
                  :class="{ disabled: dialogState.cancelDisabled, 'focused-btn': focus.is('dialog-buttons', 0) }"
                  :disabled="dialogState.cancelDisabled"
                  @click="closeDialog(null)"
                  @mouseenter="focus.to('dialog-buttons', 0)">
            {{ dialogState.cancelText }}
          </button>
          <button class="game-dialog-btn confirm"
                  :class="{ disabled: dialogState.confirmDisabled, 'focused-btn': focus.is('dialog-buttons', 1) }"
                  :disabled="dialogState.confirmDisabled"
                  @click="closeDialog(dialogState.type === 'prompt' ? dialogState.promptValue : true)"
                  @mouseenter="focus.to('dialog-buttons', 1)">
            {{ dialogState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

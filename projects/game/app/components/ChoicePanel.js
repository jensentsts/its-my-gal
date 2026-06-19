/**
 * components/ChoicePanel.js
 *
 * Branch choice options overlay.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'ChoicePanel',
  template: `
    <div class="choices-container" v-if="currentStep && currentStep.type === 'choice' && uiVisible">
      <div v-for="(choice, index) in availableChoices" :key="index"
           class="choice-item"
           :class="{
               'choice-highlighted': focus.is('choices', index),
               'choice-holding': choiceHolding && focus.is('choices', index)
           }"
           @click.stop="selectChoice(choice)"
           @mouseenter="focus.to('choices', index)">
        <span class="choice-hold-fill" v-if="choiceHolding && focus.is('choices', index)"
              :style="{ width: choiceHoldProgress + '%' }"></span>
        <span class="choice-hold-text">{{ choice.text }}</span>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

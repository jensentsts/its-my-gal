/**
 * components/ToastNotification.js
 *
 * Global toast notification overlay.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'ToastNotification',
  template: `
    <div class="toast-alert-notification" :class="{'info-theme': toastType === 'info'}" v-if="toastMessage">
      {{ toastMessage }}
    </div>
  `,
  setup() { return inject('game'); }
});

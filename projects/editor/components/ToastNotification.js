/**
 * components/ToastNotification.js
 *
 * Toast notification overlay — auto-hides after 2.5s.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'ToastNotification',
  template: `
    <div class="editor-toast" :class="{ 'toast-visible': toastMsg }" v-if="toastMsg">
      {{ toastMsg }}
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

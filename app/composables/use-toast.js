/**
 * app/composables/use-toast.js
 *
 * 全局通知 Toast Composable
 */
export function useToast() {
    const message = Vue.ref('');
    const type = Vue.ref('success');
    let timer = null;

    function show(msg, msgType = 'success') {
        clearTimeout(timer);
        message.value = msg;
        type.value = msgType;
        timer = setTimeout(() => { message.value = ''; }, 2500);
    }

    function cleanup() {
        clearTimeout(timer);
        message.value = '';
    }

    return { message, type, show, cleanup };
}

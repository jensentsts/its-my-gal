/**
 * app/composables/use-scale.js
 *
 * 视口自适应缩放 Composable
 *
 * 以 1280×720 为设计基准，使用 CSS transform: scale() 等比缩放整个视口。
 * 响应窗口 resize 和设备方向变化。
 */
export function useScale(viewportW = 1280, viewportH = 720) {
    const scale = Vue.ref(1);
    const displayW = Vue.ref(1280);
    const displayH = Vue.ref(720);
    const isLandscape = Vue.ref(true);
    const isMobile = Vue.ref(false);
    let debounceTimer = null;

    function update() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const scaleX = winW / viewportW;
        const scaleY = winH / viewportH;
        const raw = Math.min(scaleX, scaleY);

        scale.value = Math.max(raw, 0.35);
        displayW.value = Math.round(viewportW * scale.value);
        displayH.value = Math.round(viewportH * scale.value);
        isLandscape.value = winW >= winH;
        isMobile.value = winW < 768 || winH < 768;

        const root = document.documentElement;
        root.style.setProperty('--game-scale', scale.value);
        root.style.setProperty('--game-scale-percent', `${(scale.value * 100).toFixed(1)}%`);
        root.style.setProperty('--game-win-w', `${winW}px`);
        root.style.setProperty('--game-win-h', `${winH}px`);
        root.style.setProperty('--game-is-landscape', isLandscape.value ? '1' : '0');
        root.style.setProperty('--game-is-mobile', isMobile.value ? '1' : '0');
    }

    function onResize() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(update, 80);
    }

    function onOrientationChange() {
        setTimeout(update, 200);
    }

    function cleanup() {
        clearTimeout(debounceTimer);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onOrientationChange);
    }

    return { scale, displayW, displayH, isLandscape, isMobile, update, onResize, onOrientationChange, cleanup };
}

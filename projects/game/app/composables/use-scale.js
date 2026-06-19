/**
 * app/composables/use-scale.js
 *
 * 视口自适应缩放 Composable
 *
 * 以 1280×720 为设计基准，使用 CSS transform: scale() 等比缩放整个视口。
 * 响应窗口 resize 和设备方向变化。
 *
 * @param {number} viewportW - 设计基准宽度（默认 1280）
 * @param {number} viewportH - 设计基准高度（默认 720）
 * @param {Element|null} containerEl - 可选容器元素，提供后以其尺寸代替 window
 */
export function useScale(viewportW = 1280, viewportH = 720, containerEl = null) {
    const scale = Vue.ref(1);
    const displayW = Vue.ref(1280);
    const displayH = Vue.ref(720);
    const isLandscape = Vue.ref(true);
    const isMobile = Vue.ref(false);
    let debounceTimer = null;
    let resizeObserver = null;

    function getViewSize() {
        if (containerEl && containerEl.isConnected) {
            return { w: containerEl.clientWidth, h: containerEl.clientHeight };
        }
        return { w: window.innerWidth, h: window.innerHeight };
    }

    function update() {
        const { w: winW, h: winH } = getViewSize();

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

    function onResizeObserver() {
        update();
    }

    function cleanup() {
        clearTimeout(debounceTimer);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onOrientationChange);
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
    }

    // 启动：如果是容器模式，用 ResizeObserver 精确跟踪容器尺寸变化
    if (containerEl) {
        // 先立即计算一次
        Vue.nextTick(update);
        // 用 ResizeObserver 精确跟踪容器尺寸变化
        try {
            resizeObserver = new ResizeObserver(onResizeObserver);
            resizeObserver.observe(containerEl);
        } catch (e) {
            // fallback: 回退到 window resize
            window.addEventListener('resize', onResize);
        }
    }

    return { scale, displayW, displayH, isLandscape, isMobile, update, onResize, onOrientationChange, cleanup };
}

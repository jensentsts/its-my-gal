// effects.js
class GameEffectsManager {
    constructor(container) {
        this.container = container;
        this.timer = null;
        this.currentMode = "";
    }

    clear() {
        clearInterval(this.timer);
        if (this.container) this.container.innerHTML = "";
        this.currentMode = "";
    }

    /**
     * 播放特效
     * @param {string|object} modeOrConfig - 可以是字符串 "rain", "snow?density=30,speed=2" 或直接配置对象 { type: "snow", density: 30, speed: 2 }
     */
    play(modeOrConfig) {
        this.clear();
        if (!modeOrConfig || !this.container) return;

        let config = { type: modeOrConfig };
        if (typeof modeOrConfig === "string") {
            const [type, query] = modeOrConfig.split('?');
            config.type = type;
            if (query) {
                const params = new URLSearchParams(query);
                for (let [k, v] of params.entries()) {
                    config[k] = isNaN(v) ? v : Number(v);
                }
            }
        } else if (typeof modeOrConfig === "object") {
            config = { ...modeOrConfig };
        }

        const mode = config.type;
        this.currentMode = mode;

        // 默认参数
        let density = config.density || 40;
        let speedBase = config.speed || 50;

        if (mode === "rain") this.createWeather('🌧️', density, speedBase, config);
        else if (mode === "snow") this.createWeather('❄️', density, speedBase, config);
        else if (mode === "sakura") this.createWeather('🌸', density, speedBase, config);
        else if (mode === "fire") this.createFlameParticles(config);
        else if (mode === "stardust") this.createStardust(config);      // 新增梦幻星尘特效
        else if (mode === "bloodmoon") this.createBloodMoon(config);    // 新增血色月光
        else if (mode === "corruption") this.createCorruption(config);  // 新增黑暗腐蚀
    }

    /**
     * 获取容器高度（用于粒子掉落距离计算）
     * 优先使用容器高度，兼容缩放后的视口
     */
    getContainerHeight() {
        if (this.container && this.container.clientHeight > 0) {
            return this.container.clientHeight;
        }
        // fallback：尝试从 viewport 计算
        const vp = document.querySelector('.game-viewport');
        if (vp) return vp.clientHeight;
        return 720; // 基准设计高度
    }

    createWeather(char, density, speedBase, config = {}) {
        const wind = config.wind || 0;      // 横向飘移强度
        const sizeMin = config.sizeMin || 12;
        const sizeMax = config.sizeMax || 28;
        const containerH = this.getContainerHeight();
        const spawn = () => {
            if (this.currentMode !== config.type) return;
            const p = document.createElement("div");
            p.innerText = char;
            p.style.position = "absolute";
            p.style.top = "-30px";
            p.style.left = Math.random() * 100 + "%";
            const fontSize = Math.random() * (sizeMax - sizeMin) + sizeMin;
            p.style.fontSize = fontSize + "px";
            p.style.opacity = Math.random() * 0.6 + 0.4;
            p.style.pointerEvents = "none";
            p.style.transition = `transform ${Math.random() * 3 + 2}s linear`;
            if (config.color) p.style.color = config.color;
            this.container.appendChild(p);

            const endX = (Math.random() - 0.5) * 200 + (wind * 50);
            const dropDistance = containerH + 100;
            setTimeout(() => {
                p.style.transform = `translateY(${dropDistance}px) translateX(${endX}px)`;
            }, 50);
            setTimeout(() => p.remove(), 5000);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }

    createFlameParticles(config = {}) {
        const intensity = config.intensity || 1;
        const interval = 30 / (intensity || 1);
        const spawn = () => {
            if (this.currentMode !== "fire") return;
            const p = document.createElement("div");
            p.style.position = "absolute";
            p.style.bottom = "-20px";
            p.style.left = Math.random() * 100 + "%";
            const size = (Math.random() * 10 + 6) * (config.scale || 1);
            p.style.width = p.style.height = size + "px";
            p.style.background = ["#e67e22", "#e74c3c", "#f1c40f"][Math.floor(Math.random() * 3)];
            p.style.borderRadius = "50%";
            p.style.filter = "blur(2px)";
            p.style.pointerEvents = "none";
            p.style.boxShadow = "0 0 10px " + p.style.background;
            p.style.transition = `all ${Math.random() * 1.5 + 1}s ease-out`;
            this.container.appendChild(p);

            setTimeout(() => {
                p.style.transform = `translateY(-${Math.random() * 400 + 200}px) scale(0)`;
                p.style.opacity = "0";
            }, 50);
            setTimeout(() => p.remove(), 2500);
        };
        this.timer = setInterval(spawn, interval);
    }

    // 新增：梦幻星尘特效
    createStardust(config = {}) {
        const density = config.density || 30;
        const spawn = () => {
            if (this.currentMode !== "stardust") return;
            const p = document.createElement("div");
            p.innerHTML = "✨";
            p.style.position = "absolute";
            p.style.top = Math.random() * 100 + "%";
            p.style.left = Math.random() * 100 + "%";
            p.style.fontSize = (Math.random() * 20 + 10) + "px";
            p.style.opacity = Math.random() * 0.7 + 0.3;
            p.style.pointerEvents = "none";
            p.style.filter = "blur(1px)";
            p.style.transition = "all 2s ease-out";
            this.container.appendChild(p);
            setTimeout(() => {
                p.style.opacity = "0";
                p.style.transform = "scale(2)";
            }, 50);
            setTimeout(() => p.remove(), 2000);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }

    // 新增：血色月光（暗红氛围 + 飘浮血滴）
    createBloodMoon(config = {}) {
        const density = config.density || 20;
        const spawn = () => {
            if (this.currentMode !== "bloodmoon") return;
            const p = document.createElement("div");
            p.innerHTML = "🩸";
            p.style.position = "absolute";
            p.style.top = Math.random() * 100 + "%";
            p.style.left = Math.random() * 100 + "%";
            p.style.fontSize = (Math.random() * 18 + 8) + "px";
            p.style.opacity = Math.random() * 0.6 + 0.2;
            p.style.pointerEvents = "none";
            p.style.filter = "drop-shadow(0 0 3px #ff0000)";
            p.style.transition = "all 3s ease-out";
            this.container.appendChild(p);
            setTimeout(() => {
                p.style.opacity = "0";
                p.style.transform = "translateY(-50px) rotate(20deg)";
            }, 100);
            setTimeout(() => p.remove(), 3000);
        };
        this.timer = setInterval(spawn, 1000 / density);
        // 额外添加红色 overlay 效果
        if (this.container.parentElement) {
            const overlay = document.createElement("div");
            overlay.className = "temp-blood-overlay";
            overlay.style.position = "absolute";
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.backgroundColor = "rgba(80, 0, 0, 0.3)";
            overlay.style.pointerEvents = "none";
            overlay.style.zIndex = 5;
            this.container.appendChild(overlay);
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // 新增：黑暗腐蚀（扭曲粒子）
    createCorruption(config = {}) {
        const density = config.density || 25;
        const spawn = () => {
            if (this.currentMode !== "corruption") return;
            const p = document.createElement("div");
            p.innerHTML = "🌑";
            p.style.position = "absolute";
            p.style.top = Math.random() * 100 + "%";
            p.style.left = Math.random() * 100 + "%";
            p.style.fontSize = (Math.random() * 24 + 12) + "px";
            p.style.opacity = Math.random() * 0.8 + 0.2;
            p.style.pointerEvents = "none";
            p.style.filter = "blur(2px)";
            p.style.transition = "all 2s ease-in-out";
            this.container.appendChild(p);
            setTimeout(() => {
                p.style.opacity = "0";
                p.style.transform = "scale(0.5) rotate(45deg)";
            }, 100);
            setTimeout(() => p.remove(), 2500);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }
}

window.GameEffectsManager = GameEffectsManager;
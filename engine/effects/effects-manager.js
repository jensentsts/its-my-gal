/**
 * engine/effects/effects-manager.js
 *
 * EffectsManager —— 粒子特效引擎（Canvas-free DOM 粒子系统）。
 *
 * 支持特效类型：
 *  - rain, snow, sakura  —— 天气粒子
 *  - fire                  —— 火焰粒子
 *  - stardust              —— 星尘粒子
 *  - bloodmoon             —— 血色月光
 *  - corruption            —— 黑暗腐蚀
 *  - template              —— 基于 emoji + 动画模板的特效
 *  - custom                —— 独立 JS + CSS 特效（通过 CustomEffectLoader）
 *
 * 使用：
 *   const fx = new EffectsManager(containerElement);
 *   fx.play('snow?density=30,speed=50');
 *   fx.play({ type: 'rain', density: 25 });
 *   fx.play({ type: 'template', emoji: '💖', animation: 'fall', density: 30 });
 *   fx.clear();
 */

import { CustomEffectLoader } from './custom-effect-loader.js';

export class EffectsManager {
    /** 全局自定义特效注册表 */
    static customEffects = {};

    /**
     * 注册自定义特效配置
     * @param {Object} effectsConfig - { effectId: { name, type, icon, density, speed, ... } }
     */
    static registerEffects(effectsConfig) {
        if (effectsConfig) Object.assign(EffectsManager.customEffects, effectsConfig);
    }

    /**
     * @param {HTMLElement} container - 粒子容器 DOM 元素
     */
    constructor(container) {
        this.container = container;
        this.timer = null;
        this.currentMode = '';
        this._customCssLinks = [];
    }

    clear() {
        clearInterval(this.timer);
        this.timer = null;
        // 清除自定义 CSS
        this._customCssLinks.forEach(link => {
            if (link.parentNode) link.parentNode.removeChild(link);
        });
        this._customCssLinks = [];
        if (this.container) this.container.innerHTML = '';
        this.currentMode = '';
    }

    /**
     * 播放特效
     * @param {string|object} modeOrConfig
     *   - 字符串: "snow?density=30,speed=50,wind=0.5"
     *   - 对象: { type: 'rain', density: 25, speed: 40 }
     *   - 对象（模板）: { type: 'template', emoji: '💖', animation: 'fall', density: 30 }
     *   - 对象（JS 自定义）: { type: 'custom', jsEffectId: 'my_effect', density: 20 }
     */
    play(modeOrConfig) {
        this.clear();
        if (!modeOrConfig || !this.container) return;

        let config = { type: modeOrConfig };
        if (typeof modeOrConfig === 'string') {
            const [type, query] = modeOrConfig.split('?');
            config.type = type;
            if (query) {
                const params = new URLSearchParams(query);
                for (let [k, v] of params.entries()) {
                    config[k] = isNaN(v) ? v : Number(v);
                }
            }
        } else if (typeof modeOrConfig === 'object') {
            config = { ...modeOrConfig };
        }

        // 检查自定义特效注册表（编辑器定义的自定义特效）
        const customDef = EffectsManager.customEffects[config.type];
        if (customDef) {
            config = { ...customDef, ...config, type: customDef.type || config.type };
        }

        const mode = config.type;
        this.currentMode = mode;

        // ---- 处理模板特效 (emoji + 动画模板) ----
        if (mode === 'template' || config.emoji) {
            this._playTemplate(config);
            return;
        }

        // ---- 处理独立 JS 特效 ----
        const jsModule = CustomEffectLoader.getModule(mode);
        if (jsModule) {
            this._playJSEffect(jsModule, config);
            return;
        }

        const density   = config.density || 40;
        const speedBase = config.speed || 50;

        switch (mode) {
            case 'rain':     this._weather('🌧️', density, speedBase, config); break;
            case 'snow':     this._weather('❄️', density, speedBase, config); break;
            case 'sakura':   this._weather('🌸', density, speedBase, config); break;
            case 'fire':     this._flame(config);   break;
            case 'stardust':  this._stardust(config); break;
            case 'bloodmoon': this._bloodmoon(config); break;
            case 'corruption':this._corruption(config); break;
            default:         this.currentMode = ''; break;
        }
    }

    // ---- 新：模板特效 ----

    _playTemplate(config) {
        if (!this.container) return;
        const spawner = CustomEffectLoader.createTemplateSpawner(config);
        const interval = CustomEffectLoader.getSpawnInterval(config);
        this.timer = setInterval(() => {
            if (this.currentMode !== 'template' && !config.emoji) return;
            spawner(this.container);
        }, interval);
    }

    // ---- 新：JS 特效 ----

    _playJSEffect(module, config) {
        if (!this.container) return;
        // 加载 CSS
        if (module.css) {
            const styleId = 'effect-css-' + (module.name || 'custom');
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = module.css;
                document.head.appendChild(style);
                this._customCssLinks.push(style);
            }
        }
        try {
            if (module.onStart) module.onStart(this.container, config);
        } catch (e) {
            console.warn('[EffectsManager] JS特效 onStart 错误:', e);
        }
        const interval = (module.getInterval ? module.getInterval(config) : CustomEffectLoader.getSpawnInterval(config)) || 100;
        if (interval > 0) {
            this.timer = setInterval(() => {
                if (this.currentMode !== config.type) return;
                try {
                    module.spawn(this.container, config);
                } catch (e) {
                    console.warn('[EffectsManager] JS特效 spawn 错误:', e);
                }
            }, interval);
        }
    }

    // ---- 内部 ----

    _containerHeight() {
        if (this.container?.clientHeight > 0) return this.container.clientHeight;
        const vp = document.querySelector('.game-viewport');
        if (vp) return vp.clientHeight;
        return 720;
    }

    _weather(char, density, speedBase, config = {}) {
        const wind = config.wind || 0;
        const szMin = config.sizeMin || 12;
        const szMax = config.sizeMax || 28;
        const containerH = this._containerHeight();

        const spawn = () => {
            if (this.currentMode !== config.type) return;
            const p = document.createElement('div');
            p.innerText = char;
            p.style.cssText = `position:absolute;top:-30px;left:${Math.random()*100}%;font-size:${Math.random()*(szMax-szMin)+szMin}px;opacity:${Math.random()*0.6+0.4};pointer-events:none;transition:transform ${Math.random()*3+2}s linear;`;
            if (config.color) p.style.color = config.color;
            this.container.appendChild(p);

            const endX = (Math.random() - 0.5) * 200 + (wind * 50);
            setTimeout(() => { p.style.transform = `translateY(${containerH+100}px) translateX(${endX}px)`; }, 50);
            setTimeout(() => p.remove(), 5000);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }

    _flame(config = {}) {
        const interval = 30 / (config.intensity || 1);
        const spawn = () => {
            if (this.currentMode !== 'fire') return;
            const p = document.createElement('div');
            const sz = (Math.random() * 10 + 6) * (config.scale || 1);
            const color = ['#e67e22','#e74c3c','#f1c40f'][Math.floor(Math.random()*3)];
            p.style.cssText = `position:absolute;bottom:-20px;left:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${color};border-radius:50%;filter:blur(2px);pointer-events:none;box-shadow:0 0 10px ${color};transition:all ${Math.random()*1.5+1}s ease-out;`;
            this.container.appendChild(p);
            setTimeout(() => { p.style.transform = `translateY(-${Math.random()*400+200}px) scale(0)`; p.style.opacity = '0'; }, 50);
            setTimeout(() => p.remove(), 2500);
        };
        this.timer = setInterval(spawn, interval);
    }

    _stardust(config = {}) {
        const density = config.density || 30;
        const spawn = () => {
            if (this.currentMode !== 'stardust') return;
            const p = document.createElement('div');
            p.innerHTML = '✨';
            p.style.cssText = `position:absolute;top:${Math.random()*100}%;left:${Math.random()*100}%;font-size:${Math.random()*20+10}px;opacity:${Math.random()*0.7+0.3};pointer-events:none;filter:blur(1px);transition:all 2s ease-out;`;
            this.container.appendChild(p);
            setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(2)'; }, 50);
            setTimeout(() => p.remove(), 2000);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }

    _bloodmoon(config = {}) {
        const density = config.density || 20;
        const spawn = () => {
            if (this.currentMode !== 'bloodmoon') return;
            const p = document.createElement('div');
            p.innerHTML = '🩸';
            p.style.cssText = `position:absolute;top:${Math.random()*100}%;left:${Math.random()*100}%;font-size:${Math.random()*18+8}px;opacity:${Math.random()*0.6+0.2};pointer-events:none;filter:drop-shadow(0 0 3px #ff0000);transition:all 3s ease-out;`;
            this.container.appendChild(p);
            setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'translateY(-50px) rotate(20deg)'; }, 100);
            setTimeout(() => p.remove(), 3000);
        };
        this.timer = setInterval(spawn, 1000 / density);
        // 红色 overlay
        if (this.container.parentElement) {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(80,0,0,0.3);pointer-events:none;z-index:5;';
            this.container.appendChild(ov);
            setTimeout(() => ov.remove(), 300);
        }
    }

    _corruption(config = {}) {
        const density = config.density || 25;
        const spawn = () => {
            if (this.currentMode !== 'corruption') return;
            const p = document.createElement('div');
            p.innerHTML = '🌑';
            p.style.cssText = `position:absolute;top:${Math.random()*100}%;left:${Math.random()*100}%;font-size:${Math.random()*24+12}px;opacity:${Math.random()*0.8+0.2};pointer-events:none;filter:blur(2px);transition:all 2s ease-in-out;`;
            this.container.appendChild(p);
            setTimeout(() => { p.style.opacity = '0'; p.style.transform = 'scale(0.5) rotate(45deg)'; }, 100);
            setTimeout(() => p.remove(), 2500);
        };
        this.timer = setInterval(spawn, 1000 / density);
    }
}

export default EffectsManager;

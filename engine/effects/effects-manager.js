/**
 * engine/effects/effects-manager.js
 *
 * EffectsManager —— 粒子特效引擎（Canvas-free DOM 粒子系统）。
 *
 * ✨ 优化特性：
 *  1. requestAnimationFrame 统一循环（与浏览器帧同步，消除 setInterval 漂移）
 *  2. DOM 对象池复用粒子元素（减少 GC 压力和 DOM 操作）
 *  3. 粒子上限控制（防止内存堆积）
 *  4. 预热爆发（切换特效时立即填充屏幕避免空白期）
 *  5. 特效过渡（旧粒子淡出 + 新粒子淡入，消除硬切换卡顿）
 *  6. 混合动画策略：简单动画用 CSS transition（GPU 合成），复杂动画用 RAF（精细控制）
 *  7. CSS will-change 提示（让浏览器提前优化合成层）
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

    /** 全局粒子对象池（跨实例共享） */
    static _particlePool = [];

    /** 池中最大缓存粒子数 */
    static POOL_MAX = 500;

    /** 每个特效最大活跃粒子数 */
    static MAX_PARTICLES = 250;

    /** 过渡时长 (ms) */
    static TRANSITION_DURATION = 400;

    /**
     * 注册自定义特效配置
     */
    static registerEffects(effectsConfig) {
        if (effectsConfig) Object.assign(EffectsManager.customEffects, effectsConfig);
    }

    /**
     * 从对象池获取粒子元素
     */
    static _acquireParticle() {
        return EffectsManager._particlePool.pop() || document.createElement('div');
    }

    /**
     * 将粒子归还对象池
     */
    static _releaseParticle(el) {
        if (EffectsManager._particlePool.length >= EffectsManager.POOL_MAX) {
            el.remove();
            return;
        }
        el.style.cssText = '';
        el.className = '';
        el.innerText = '';
        el.innerHTML = '';
        if (el.parentNode) el.parentNode.removeChild(el);
        EffectsManager._particlePool.push(el);
    }

    /**
     * @param {HTMLElement} container
     */
    constructor(container) {
        this.container = container;
        this.currentMode = '';
        this._customCssLinks = [];

        // ---- RAF 循环 ----
        this._activeParticles = [];
        this._transitionParticles = [];
        this._rafId = null;
        this._lastFrameTime = 0;

        // ---- 生成器状态 ----
        this._spawnTimer = 0;
        this._spawnInterval = 0;
        this._spawnFn = null;
        this._spawnConfig = null;

        // ---- 预热标记 ----
        this._warmedUp = false;

        // ---- 特效附加元素（如 bloodmoon 的红色覆盖层）----
        this._effectOverlays = [];
    }

    // ====================================================================
    //  RAF 循环
    // ====================================================================

    _startLoop() {
        if (this._rafId) return;
        this._lastFrameTime = performance.now();
        this._spawnTimer = 0;
        const loop = (now) => {
            const dt = Math.min(now - this._lastFrameTime, 100);
            this._lastFrameTime = now;
            this._tick(dt);
            this._rafId = requestAnimationFrame(loop);
        };
        this._rafId = requestAnimationFrame(loop);
    }

    _stopLoop() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _tick(dt) {
        // 1. 过渡粒子淡出动画
        this._tickTransitions(dt);

        // 2. 生成新粒子
        if (this._spawnFn && this._activeParticles.length < EffectsManager.MAX_PARTICLES) {
            this._spawnTimer += dt;
            while (this._spawnTimer >= this._spawnInterval
                && this._activeParticles.length < EffectsManager.MAX_PARTICLES) {
                this._spawnTimer -= this._spawnInterval;
                this._spawnParticle();
            }
        }

        // 3. 更新活跃粒子（仅 RAF 驱动的粒子类型需要）
        this._tickParticles(dt);

        // 4. 清理过期粒子
        this._sweepExpired();

        // 5. 无工作时停止循环
        if (this._activeParticles.length === 0
            && this._transitionParticles.length === 0
            && !this._spawnFn) {
            this._stopLoop();
        }
    }

    _spawnParticle() {
        if (!this._spawnFn || !this.container) return;
        const el = EffectsManager._acquireParticle();
        const particle = this._spawnFn(el, this._spawnConfig);
        if (!particle) {
            EffectsManager._releaseParticle(el);
            return;
        }
        this.container.appendChild(el);
        this._activeParticles.push(particle);
    }

    _tickParticles(dt) {
        for (let i = 0; i < this._activeParticles.length; i++) {
            const p = this._activeParticles[i];
            try { p.update(dt, p.el); } catch (e) { /* 安全跳过 */ }
        }
    }

    _sweepExpired() {
        const now = performance.now();
        for (let i = this._activeParticles.length - 1; i >= 0; i--) {
            if (now >= this._activeParticles[i].expireAt) {
                const p = this._activeParticles[i];
                try { p.onExpire(p.el); } catch (e) { /* 安全清理 */ }
                EffectsManager._releaseParticle(p.el);
                this._activeParticles.splice(i, 1);
            }
        }
    }

    _tickTransitions(dt) {
        const now = performance.now();
        for (let i = this._transitionParticles.length - 1; i >= 0; i--) {
            const tp = this._transitionParticles[i];
            const elapsed = now - tp.startTime;
            const progress = Math.min(elapsed / tp.duration, 1);
            if (tp.fadeOut) {
                const baseOpacity = parseFloat(tp.el.dataset._origOpacity || '1');
                tp.el.style.opacity = ((1 - progress) * baseOpacity);
                const scale = 1 - progress * 0.3;
                const cur = tp.el.style.transform || '';
                tp.el.style.transform = cur.replace(/scale\([^)]+\)/g, '') + ` scale(${scale})`;
            }
            if (progress >= 1) {
                EffectsManager._releaseParticle(tp.el);
                this._transitionParticles.splice(i, 1);
            }
        }
    }

    // ====================================================================
    //  播放 / 清除
    // ====================================================================

    /**
     * 播放特效
     * @param {string|object} modeOrConfig
     */
    play(modeOrConfig) {
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

        const customDef = EffectsManager.customEffects[config.type];
        if (customDef) {
            config = { ...customDef, ...config, type: customDef.type || config.type };
        }

        const mode = config.type;
        this.currentMode = mode;

        // 清除旧特效（带过渡淡出）
        const hasExisting = this._activeParticles.length > 0 || this._transitionParticles.length > 0;
        if (hasExisting) this.clear(false);

        // 设置新特效
        const setupResult = this._setupEffect(mode, config);
        if (!setupResult) {
            this.currentMode = '';
            return;
        }

        this._spawnFn = setupResult.spawnFn;
        this._spawnConfig = { ...config };
        this._spawnInterval = setupResult.interval;
        this._spawnTimer = 0;
        this._warmedUp = false;

        // 预热爆发
        this._prewarm();
        this._startLoop();
    }

    /**
     * 清除当前特效
     * @param {boolean} [immediate=false] 是否跳过过渡直接清除
     */
    clear(immediate = false) {
        this._spawnFn = null;
        this._spawnConfig = null;
        this._spawnTimer = 0;

        if (immediate || this._activeParticles.length === 0) {
            for (const p of this._activeParticles) {
                try { p.onExpire(p.el); } catch (e) { /* 安全清理 */ }
                EffectsManager._releaseParticle(p.el);
            }
            this._activeParticles = [];
            for (const tp of this._transitionParticles) {
                EffectsManager._releaseParticle(tp.el);
            }
            this._transitionParticles = [];
            this._clearCustomCSS();
            this._cleanupOverlays();
            this.currentMode = '';
            return;
        }

        // 过渡清除：将现有粒子移到过渡队列
        const now = performance.now();
        for (const p of this._activeParticles) {
            const origOpacity = parseFloat(p.el.style.opacity) || 1;
            p.el.dataset._origOpacity = origOpacity;
            p.el.style.willChange = 'transform, opacity';
            this._transitionParticles.push({
                el: p.el,
                startTime: now,
                duration: EffectsManager.TRANSITION_DURATION,
                fadeOut: true,
            });
        }
        this._activeParticles = [];
        this._cleanupOverlays();
        this.currentMode = '';

        // 延迟清理 CSS
        setTimeout(() => {
            this._clearCustomCSS();
            if (this._transitionParticles.length > 0) {
                setTimeout(() => this._clearCustomCSS(), EffectsManager.TRANSITION_DURATION);
            }
        }, EffectsManager.TRANSITION_DURATION + 50);
    }

    _cleanupOverlays() {
        for (const el of this._effectOverlays) {
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        this._effectOverlays = [];
    }

    _clearCustomCSS() {
        this._customCssLinks.forEach(link => {
            if (link.parentNode) link.parentNode.removeChild(link);
        });
        this._customCssLinks = [];
    }

    // ====================================================================
    //  预热
    // ====================================================================

    _prewarm() {
        if (!this._spawnFn || this._warmedUp) return;
        this._warmedUp = true;

        const warmCount = Math.min(
            Math.ceil(EffectsManager.MAX_PARTICLES * 0.3),
            40
        );

        const fragment = document.createDocumentFragment();
        let count = 0;
        for (let i = 0; i < warmCount; i++) {
            if (this._activeParticles.length >= EffectsManager.MAX_PARTICLES) break;
            const el = EffectsManager._acquireParticle();
            const particle = this._spawnFn(el, this._spawnConfig, true);
            if (particle) {
                fragment.appendChild(el);
                this._activeParticles.push(particle);
                count++;
            } else {
                EffectsManager._releaseParticle(el);
            }
        }

        if (count > 0 && this.container) {
            this.container.appendChild(fragment);
        }
    }

    // ====================================================================
    //  特效注册 / 生成器工厂
    // ====================================================================

    _setupEffect(mode, config) {
        // 模板特效
        if (mode === 'template' || config.emoji) {
            return {
                spawnFn: this._createTemplateSpawnFn(config),
                interval: CustomEffectLoader.getSpawnInterval(config),
            };
        }

        // JS 自定义特效
        const jsModule = CustomEffectLoader.getModule(mode);
        if (jsModule) {
            if (jsModule.css) {
                const styleId = 'effect-css-' + (jsModule.name || 'custom');
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = jsModule.css;
                    document.head.appendChild(style);
                    this._customCssLinks.push(style);
                }
            }
            try { if (jsModule.onStart) jsModule.onStart(this.container, config); } catch (e) {
                console.warn('[EffectsManager] JS特效 onStart 错误:', e);
            }
            const interval = (jsModule.getInterval
                ? jsModule.getInterval(config)
                : CustomEffectLoader.getSpawnInterval(config)) || 100;
            return {
                spawnFn: (el, cfg, isWarmup) => {
                    try {
                        return jsModule.spawn(el, cfg, this.container, isWarmup);
                    } catch (e) {
                        console.warn('[EffectsManager] JS特效 spawn 错误:', e);
                        return null;
                    }
                },
                interval: Math.max(interval, 16),
            };
        }

        // 内置特效
        const density = config.density || 40;
        switch (mode) {
            case 'rain':
                return { spawnFn: this._createWeatherSpawnFn('🌧️', config), interval: 1000 / density };
            case 'snow':
                return { spawnFn: this._createWeatherSpawnFn('❄️', config), interval: 1000 / density };
            case 'sakura':
                return { spawnFn: this._createWeatherSpawnFn('🌸', config), interval: 1000 / density };
            case 'fire':
                return { spawnFn: this._createFlameSpawnFn(config), interval: 30 / (config.intensity || 1) };
            case 'stardust':
                return { spawnFn: this._createStardustSpawnFn(config), interval: 1000 / (config.density || 30) };
            case 'bloodmoon': {
                // 红色覆盖层（bloodmoon 专属）
                if (this.container && this.container.parentElement) {
                    const ov = document.createElement('div');
                    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(80,0,0,0.3);pointer-events:none;z-index:5;';
                    this.container.appendChild(ov);
                    this._effectOverlays.push(ov);
                }
                return { spawnFn: this._createBloodmoonSpawnFn(config), interval: 1000 / (config.density || 20) };
            }
            case 'corruption':
                return { spawnFn: this._createCorruptionSpawnFn(config), interval: 1000 / (config.density || 25) };
            default:
                return null;
        }
    }

    _containerHeight() {
        if (this.container?.clientHeight > 0) return this.container.clientHeight;
        const vp = document.querySelector('.game-viewport');
        if (vp) return vp.clientHeight;
        return 720;
    }

    // ====================================================================
    //  天气粒子（CSS transition 驱动，GPU 合成）
    // ====================================================================

    _createWeatherSpawnFn(char, config) {
        const wind = config.wind || 0;
        const szMin = config.sizeMin || 12;
        const szMax = config.sizeMax || 28;
        const containerH = this._containerHeight();

        return (el, cfg, isWarmup) => {
            const sz = Math.random() * (szMax - szMin) + szMin;
            const left = Math.random() * 100;
            const endX = (Math.random() - 0.5) * 200 + (wind * 50);
            const fallDuration = (Math.random() * 3 + 2) * 1000; // 2-5s
            const lifetime = fallDuration + 500;
            const startTime = performance.now();

            // 初始状态：可见度 0，位置在容器上方
            const startY = isWarmup ? Math.random() * containerH : -30;
            el.innerText = char;
            el.style.cssText =
                `position:absolute;top:${startY}px;left:${left}%;` +
                `font-size:${sz}px;opacity:0;pointer-events:none;` +
                `will-change:transform,opacity;` +
                (config.color ? `color:${config.color};` : '');

            // 预热粒子直接显示
            if (isWarmup) {
                el.style.opacity = (Math.random() * 0.6 + 0.4).toString();
            }

            return {
                el,
                expireAt: startTime + lifetime,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    if (element.dataset._animated) return; // CSS 动画已触发

                    if (isWarmup ? elapsed > 16 : elapsed > 50) {
                        // 触发 CSS transition：一次设置，GPU 合成
                        element.dataset._animated = '1';
                        element.style.transition =
                            `transform ${fallDuration}ms linear, opacity ${Math.min(800, fallDuration * 0.3)}ms ease-in`;
                        element.style.transform =
                            `translateY(${containerH + 100}px) translateX(${endX}px)`;
                        element.style.opacity = Math.random() * 0.6 + 0.4;
                    }
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  火焰（RAF 逐帧驱动，需要连续更新颜色/缩放）
    // ====================================================================

    _createFlameSpawnFn(config) {
        const scale = config.scale || 1;
        const lifetime = 2500;
        const colors = ['#e67e22','#e74c3c','#f1c40f'];

        return (el, cfg, isWarmup) => {
            const sz = (Math.random() * 10 + 6) * scale;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const startTime = performance.now();
            const totalLife = lifetime + Math.random() * 500;

            el.style.cssText =
                `position:absolute;bottom:-20px;left:${left}%;` +
                `width:${sz}px;height:${sz}px;background:${color};border-radius:50%;` +
                `filter:blur(2px);pointer-events:none;` +
                `box-shadow:0 0 10px ${color};will-change:transform,opacity;opacity:0;`;

            if (isWarmup) {
                el.style.opacity = '0.8';
                el.style.bottom = `${Math.random() * 40 + 10}px`;
            }

            return {
                el,
                expireAt: startTime + totalLife,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    const progress = Math.min(elapsed / totalLife, 1);
                    // 上升 + 缩小 + 淡出
                    const riseY = progress * 300;
                    const shrink = 1 - progress * 0.7;
                    const opacity = isWarmup
                        ? Math.max(0, 1 - progress * 1.5)
                        : Math.min(1, progress * 5) * Math.max(0, 1 - progress * 1.2);
                    element.style.transform = `translateY(-${riseY}px) scale(${shrink})`;
                    element.style.opacity = Math.max(0, opacity);
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  星尘（CSS transition 驱动）
    // ====================================================================

    _createStardustSpawnFn(config) {
        const lifetime = 2500;
        return (el, cfg, isWarmup) => {
            const startTime = performance.now();
            const totalLife = lifetime + Math.random() * 500;

            el.innerHTML = '✨';
            el.style.cssText =
                `position:absolute;top:${isWarmup ? Math.random()*80+10 : Math.random()*100}%;` +
                `left:${Math.random()*100}%;font-size:${Math.random()*20+10}px;` +
                `opacity:0;pointer-events:none;filter:blur(1px);will-change:transform,opacity;`;

            return {
                el,
                expireAt: startTime + totalLife,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    if (element.dataset._animated) return;
                    if (elapsed > 50) {
                        element.dataset._animated = '1';
                        element.style.transition = 'opacity 2s ease-out, transform 2s ease-out';
                        element.style.opacity = isWarmup
                            ? Math.max(0, 0.8 - 0.8 * (elapsed / totalLife))
                            : (Math.random() * 0.7 + 0.3);
                        element.style.transform = 'scale(2)';
                    }
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  血月（CSS transition 驱动）
    // ====================================================================

    _createBloodmoonSpawnFn(config) {
        const lifetime = 3500;
        return (el, cfg, isWarmup) => {
            const startTime = performance.now();
            const totalLife = lifetime + Math.random() * 500;

            el.innerHTML = '🩸';
            el.style.cssText =
                `position:absolute;top:${isWarmup ? Math.random()*80+10 : Math.random()*100}%;` +
                `left:${Math.random()*100}%;font-size:${Math.random()*18+8}px;` +
                `opacity:0;pointer-events:none;filter:drop-shadow(0 0 3px #ff0000);` +
                `will-change:transform,opacity;`;

            return {
                el,
                expireAt: startTime + totalLife,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    if (element.dataset._animated) return;
                    if (elapsed > 50) {
                        element.dataset._animated = '1';
                        const riseY = Math.random() * 50 + 20;
                        const rotate = Math.random() * 20 + 10;
                        element.style.transition = `transform 3s ease-out, opacity 3s ease-out`;
                        element.style.transform = `translateY(-${riseY}px) rotate(${rotate}deg)`;
                        element.style.opacity = isWarmup
                            ? Math.max(0, 0.6 - 0.6 * (elapsed / totalLife))
                            : (Math.random() * 0.6 + 0.2);
                    }
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  腐蚀（CSS transition 驱动）
    // ====================================================================

    _createCorruptionSpawnFn(config) {
        const lifetime = 3000;
        return (el, cfg, isWarmup) => {
            const startTime = performance.now();
            const totalLife = lifetime + Math.random() * 500;

            el.innerHTML = '🌑';
            el.style.cssText =
                `position:absolute;top:${isWarmup ? Math.random()*80+10 : Math.random()*100}%;` +
                `left:${Math.random()*100}%;font-size:${Math.random()*24+12}px;` +
                `opacity:0;pointer-events:none;filter:blur(2px);will-change:transform,opacity;`;

            return {
                el,
                expireAt: startTime + totalLife,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    if (element.dataset._animated) return;
                    if (elapsed > 50) {
                        element.dataset._animated = '1';
                        element.style.transition = `transform 2.5s ease-in-out, opacity 2.5s ease-in-out`;
                        element.style.transform = 'scale(0.5) rotate(45deg)';
                        element.style.opacity = isWarmup
                            ? Math.max(0, 0.8 - 0.8 * (elapsed / totalLife))
                            : (Math.random() * 0.8 + 0.2);
                    }
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  模板特效（CSS transition 驱动）
    // ====================================================================

    _createTemplateSpawnFn(config) {
        const emoji = config.emoji || '✨';
        const szMin = config.sizeMin || 12;
        const szMax = config.sizeMax || 28;
        const color = config.color || '';
        const anim = config.animation || 'fall';
        const containerH = 180;
        const lifetime = 4000;

        // 根据动画类型生成初始/结束状态
        const getState = (isWarmup) => {
            const sz = Math.random() * (szMax - szMin) + szMin;
            let startCss, endTransform, endOpacity;

            switch (anim) {
                case 'fall':
                    startCss = `top:${isWarmup ? Math.random()*80+5 : -5}%;left:${Math.random()*90}%;opacity:0;`;
                    endTransform = `translateY(${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
                    endOpacity = Math.random() * 0.6 + 0.4;
                    break;
                case 'rise':
                    startCss = `bottom:${isWarmup ? Math.random()*80+5 : -5}%;left:${Math.random()*90}%;opacity:0;`;
                    endTransform = `translateY(-${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
                    endOpacity = Math.random() * 0.6 + 0.4;
                    break;
                case 'float':
                    startCss = `top:${Math.random()*80}%;left:${Math.random()*90}%;opacity:${isWarmup ? 0.8 : 0};`;
                    endTransform = `translate(${(Math.random()-0.5)*60}px, ${(Math.random()-0.5)*40}px)`;
                    endOpacity = isWarmup ? 0.8 : 0.8;
                    break;
                case 'explode':
                    startCss = `top:${isWarmup ? 20+Math.random()*60 : 50}%;left:${isWarmup ? 20+Math.random()*60 : 50}%;opacity:${isWarmup ? 0.8 : 1};`;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 100 + 30;
                    endTransform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0.3)`;
                    endOpacity = 0;
                    break;
                default:
                    startCss = `top:${isWarmup ? Math.random()*80+5 : -5}%;left:${Math.random()*90}%;opacity:0;`;
                    endTransform = `translateY(${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
                    endOpacity = Math.random() * 0.6 + 0.4;
            }

            const animDuration = Math.random() * 1500 + 1500;
            return { sz, startCss, endTransform, endOpacity, animDuration };
        };

        return (el, cfg, isWarmup) => {
            const s = getState(isWarmup);
            const startTime = performance.now();

            el.innerText = emoji;
            let css = `position:absolute;font-size:${s.sz}px;pointer-events:none;will-change:transform,opacity;`;
            if (color) css += `color:${color};`;
            css += s.startCss;
            el.style.cssText = css;

            return {
                el,
                expireAt: startTime + lifetime,
                update: (dt, element) => {
                    const elapsed = performance.now() - startTime;
                    if (element.dataset._animated) return;
                    if (elapsed > 50) {
                        element.dataset._animated = '1';
                        element.style.transition =
                            `transform ${s.animDuration}ms ease-out, opacity ${Math.min(500, s.animDuration * 0.3)}ms ease-in-out`;
                        element.style.transform = s.endTransform;
                        element.style.opacity = s.endOpacity;
                    }
                },
                onExpire: () => {},
            };
        };
    }

    // ====================================================================
    //  统计
    // ====================================================================

    get particleCount() {
        return this._activeParticles.length;
    }

    get transitioningCount() {
        return this._transitionParticles.length;
    }

    static get poolSize() {
        return EffectsManager._particlePool.length;
    }
}

export default EffectsManager;

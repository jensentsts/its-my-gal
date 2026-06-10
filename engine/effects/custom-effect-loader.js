/**
 * engine/effects/custom-effect-loader.js
 *
 * CustomEffectLoader —— 自定义特效加载器。
 *
 * 支持两种自定义特效：
 * 1. Template + Emoji 特效：通过配置定义 emoji 和动画参数
 * 2. 独立 JS + CSS 特效：独立的 JS 模块（暴露特定 API）+ CSS 样式
 *
 * ── JS 特效模块 API（推荐 - 新格式）──
 *
 * 模块需要导出 default 对象：
 *
 *   export default {
 *     name: '特效名称',
 *     icon: '✨',
 *     css: '.my-effect-particle { ... }',      // 可选：CSS 样式文本
 *
 *     // ★ 必须：生成粒子。el 由 EffectsManager 从对象池提供，直接配置即可。
 *     //   返回粒子对象 { el, expireAt, update, onExpire } 以接入 RAF 循环。
 *     //   或返回 null 放弃此粒子。
 *     spawn(el, config, container, isWarmup) {
 *       el.innerText = '💥';
 *       el.style.cssText = `position:absolute;top:0;left:${Math.random()*100}%;...`;
 *       const startTime = performance.now();
 *       return {
 *         el,
 *         expireAt: startTime + 3000,       // 3000ms 后自动清理
 *         update(dt, element) {              // 每帧调用（可选，不设置或空函数则跳过）
 *           const elapsed = performance.now() - startTime;
 *           element.style.opacity = 1 - elapsed / 3000;
 *         },
 *         onExpire(element) { }, // 可选清理回调, 粒子过期时调用
 *       };
 *     },
 *
 *     // 可选：获取生成间隔 (ms)
 *     getInterval(config) { return 1000 / (config.density || 30); },
 *     // 可选：特效开始
 *     onStart(container, config) {},
 *     // 可选：特效停止
 *     onStop(container) {},
 *   }
 *
 * ── JS 特效模块 API（旧格式 - 自动兼容）──
 *
 * 旧格式模块只需要提供 spawn(container, config) → element 即可。
 * CustomEffectLoader 会自动包装为新格式接入 RAF 循环。
 *
 *   export default {
 *     spawn(container, config) {
 *       const el = document.createElement('div');
 *       el.textContent = '💥';
 *       container.appendChild(el);
 *       el.style.cssText = '...初始样式...';
 *       setTimeout(() => { el.style.transform = '...'; }, 50);
 *       setTimeout(() => el.remove(), 3000);
 *       return el;
 *     },
 *   }
 */

/** 已注册的 JS 特效模块 */
const jsEffectModules = {};

export class CustomEffectLoader {
    /**
     * 注册 JS 特效模块
     * @param {string} id - 特效 ID
     * @param {Object} module - 特效模块对象
     */
    static register(id, module) {
        if (!module || typeof module.spawn !== 'function') {
            console.warn(`[CustomEffectLoader] 无效的特效模块: ${id}，缺少 spawn 函数`);
            return;
        }
        jsEffectModules[id] = module;
    }

    /**
     * 检查是否为已注册的 JS 特效
     */
    static isJSEffect(id) {
        return !!jsEffectModules[id];
    }

    /**
     * 获取 JS 特效模块
     */
    static getModule(id) {
        return jsEffectModules[id] || null;
    }

    /**
     * 获取所有已注册的 JS 特效
     */
    static getAllModules() {
        return { ...jsEffectModules };
    }

    /**
     * 从配置获取生成间隔 (ms)
     */
    static getSpawnInterval(config) {
        return 1000 / (config.density || 30);
    }

    /**
     * 检测模块是否为旧格式（spawn 签名非 el 开头）
     * 旧格式：spawn(container, config) → element
     * 新格式：spawn(el, config, container, isWarmup) → particleObject
     */
    static _isOldStyleModule(module) {
        // 如果 spawn 函数不接受至少 2 个参数，可能是旧格式
        // 更可靠的检测：新格式的 spawn 返回对象包含 el 字段
        // 我们在运行时检测返回类型来自适适配
        return module._style === 'old' || (
            module._style !== 'new' &&
            module.spawn.length <= 2  // 旧格式只接受 (container, config)
        );
    }

    /**
     * 创建兼容性包装：将旧格式模块的 spawn 包装为新格式粒子对象
     * @param {Object} module - 旧格式模块
     * @returns {Function} 新格式 spawn 函数
     */
    static wrapOldModule(module) {
        return (el, config, container, isWarmup) => {
            try {
                // 旧模块自己创建元素并追加到容器
                const result = module.spawn(container, config);
                if (!result) return null;

                // result 是旧模块创建并追加到容器的元素
                const startTime = performance.now();
                const lifetime = 5000;

                return {
                    el: result,
                    expireAt: startTime + lifetime,
                    update: () => {
                        // 旧模块使用 setTimeout/CSS transitions 自行管理
                        // 不需要逐帧更新
                    },
                    onExpire: (element) => {
                        // 如果元素还在 DOM 中，remove 会由 _releaseParticle 处理
                    },
                };
            } catch (e) {
                console.warn('[CustomEffectLoader] 旧模块 spawn 错误:', e);
                return null;
            }
        };
    }

    /**
     * 创建新格式 spawn 函数（兼容新旧两种模块）
     * 由 EffectsManager 在 _setupEffect 中调用
     * @param {Object} module
     * @param {Object} config
     * @returns {Function} spawnFn(el, config, isWarmup) → particleObject|null
     */
    static createCompatibleSpawnFn(module, config) {
        // 判断模块类型
        // 新格式的 spawn 签名是 (el, config, container, isWarmup)
        // 旧格式的 spawn 签名是 (container, config)
        const isNewStyle = module._style === 'new' || module.spawn.length >= 3;

        if (!isNewStyle) {
            return CustomEffectLoader.wrapOldModule(module);
        }

        // 新格式：直接使用
        return (el, cfg, isWarmup) => {
            try {
                return module.spawn(el, cfg, container => this.container, isWarmup);
            } catch (e) {
                console.warn('[CustomEffectLoader] 模块 spawn 错误:', e);
                return null;
            }
        };
    }

    /**
     * 模板特效配置 → 生成粒子（旧版兼容，供编辑器/外部使用）
     * 注意：EffectsManager 已内置 RAF 版模板生成器，此函数保留供兼容
     *
     * @param {Object} config - { emoji, animation, sizeMin, sizeMax, color, ... }
     * @returns {Function} spawn(container) → void
     */
    static createTemplateSpawner(config) {
        const emoji     = config.emoji || '✨';
        const szMin     = config.sizeMin || 12;
        const szMax     = config.sizeMax || 28;
        const color     = config.color || '';
        const anim      = config.animation || 'fall';
        const speedBase = config.speed || 50;
        const containerH = 180;

        return (container) => {
            const p = document.createElement('div');
            p.innerText = emoji;
            const sz = Math.random() * (szMax - szMin) + szMin;
            let startCss = `position:absolute;font-size:${sz}px;pointer-events:none;`;
            let endCss = '';

            switch (anim) {
                case 'fall':
                    startCss += `top:-30px;left:${Math.random()*90}%;opacity:${Math.random()*0.6+0.4};`;
                    endCss = `transform:translateY(${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
                    break;
                case 'rise':
                    startCss += `bottom:-30px;left:${Math.random()*90}%;opacity:${Math.random()*0.6+0.4};`;
                    endCss = `transform:translateY(-${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
                    break;
                case 'float':
                    startCss += `top:${Math.random()*80}%;left:${Math.random()*90}%;opacity:0;`;
                    endCss = `opacity:0.8;transform:translate(${(Math.random()-0.5)*60}px, ${(Math.random()-0.5)*40}px)`;
                    break;
                case 'explode':
                    startCss += `top:50%;left:50%;opacity:1;`;
                    const angle = Math.random() * Math.PI * 2;
                    const dist  = Math.random() * 100 + 30;
                    endCss = `opacity:0;transform:translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0.3)`;
                    break;
                default:
                    startCss += `top:-30px;left:${Math.random()*90}%;opacity:${Math.random()*0.6+0.4};`;
                    endCss = `transform:translateY(${containerH+60}px) translateX(${(Math.random()-0.5)*100}px)`;
            }

            if (color) startCss += `color:${color};`;
            p.style.cssText = startCss;
            p.style.transition = `all ${Math.random()*2+1.5}s ease-out`;
            container.appendChild(p);

            requestAnimationFrame(() => {
                p.style.cssText += endCss;
            });
            setTimeout(() => p.remove(), 4000);
        };
    }

    /**
     * 加载 JS 特效的动态导入
     * @param {string} id - 特效 ID
     * @param {string} jsPath - JS 文件路径
     * @param {string} cssPath - CSS 文件路径（可选）
     */
    static async loadFromFiles(id, jsPath, cssPath) {
        try {
            if (cssPath) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssPath;
                link.dataset.effectId = id;
                if (!document.querySelector(`link[data-effect-id="${id}"]`)) {
                    document.head.appendChild(link);
                }
            }
            const module = await import(jsPath);
            if (module.default) {
                CustomEffectLoader.register(id, module.default);
                return module.default;
            }
        } catch (err) {
            console.error(`[CustomEffectLoader] 加载特效失败: ${id}`, err);
        }
        return null;
    }
}

export default CustomEffectLoader;

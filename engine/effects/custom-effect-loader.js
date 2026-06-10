/**
 * engine/effects/custom-effect-loader.js
 *
 * CustomEffectLoader —— 自定义特效加载器。
 *
 * 支持两种自定义特效：
 * 1. Template + Emoji 特效：通过配置定义 emoji 和动画参数
 * 2. 独立 JS + CSS 特效：独立的 JS 模块（暴露特定 API）+ CSS 样式
 *
 * JS 特效模块必须通过以下方式注册：
 *   CustomEffectLoader.register('effectId', module)
 *
 * 模块 API:
 *   export default {
 *     name: '特效名称',
 *     icon: '✨',
 *     // 必须：生成粒子的函数
 *     spawn(container, config) { return particleElement },
 *     // 可选：获取生成间隔 (ms)
 *     getInterval(config) { return 1000/30 },
 *     // 可选：特效开始
 *     onStart(container, config) {},
 *     // 可选：特效停止
 *     onStop(container) {},
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
     * 模板特效配置 → 生成粒子
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
        const containerH = 180; // 预览容器高度

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
                default: // fall
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
     * 从配置获取生成间隔 (ms)
     */
    static getSpawnInterval(config) {
        return 1000 / (config.density || 30);
    }

    /**
     * 加载 JS 特效的动态导入
     * @param {string} jsPath - JS 文件路径
     * @param {string} cssPath - CSS 文件路径（可选）
     */
    static async loadFromFiles(id, jsPath, cssPath) {
        try {
            if (cssPath) {
                // 加载 CSS
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssPath;
                link.dataset.effectId = id;
                // 避免重复加载
                if (!document.querySelector(`link[data-effect-id="${id}"]`)) {
                    document.head.appendChild(link);
                }
            }
            // 动态导入 JS
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

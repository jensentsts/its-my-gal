/**
 * use-vue-focus.js
 *
 * 轻量焦点导航系统 —— 基于 Vue 的 v-for 自然顺序。
 *
 * 核心思想：
 *   每个 v-for 列表的 index 就是焦点的天然顺序。
 *   左右按键 = index +/- 1，上下按键 = index +/- cols。
 *   焦点区域之间的"跨越"由上层容器代码根据 index 边界判断处理。
 *
 * 用法：
 *   const focus = useVueFocus();
 *   focus.add('main-menu', { cols: 1, loop: true });
 *
 *   模板中：
 *   v-for="(item, idx) in items"
 *   :class="focus.cls('main-menu', idx, 'menu-focused')"
 *   @mouseenter="focus.to('main-menu', idx)"
 *
 *   按键事件：
 *   focus.go('main-menu', 'up', items.length);
 *
 *   跨区导航（由容器代码处理）：
 *   const old = focus.idx('gallery-grid');
 *   focus.go('gallery-grid', 'down', ids.length);
 *   if (focus.idx('gallery-grid') === old) {
 *     // 触底 → 跨越到下一区域
 *     focus.to('endings-grid', 0);
 *   }
 */

/**
 * 创建一个 Vue 焦点实例
 * 每个需要键盘导航的区域（zone）只存储：
 *   - idx: 当前焦点索引（响应式）
 *   - cols: 列数（1 = 列表，>1 = 网格）
 *   - loop: 上下是否允许循环绕行
 *   - wrap: 左右是否允许循环绕行
 */
export function useVueFocus() {
    /** @type {Record<string, import('vue').Reactive<{idx:number, cols:number, loop:boolean, wrap:boolean}>>} */
    const _z = {};

    const api = {
        /**
         * 定义或更新一个焦点区域
         * @param {string} id   - 区域唯一 ID
         * @param {object} [opts]
         * @param {number} [opts.cols=1] - 列数（1 = 列表，>1 = 网格）
         * @param {boolean} [opts.loop=false] - 上下是否循环
         * @param {boolean} [opts.wrap=true]  - 左右是否循环
         */
        add(id, opts = {}) {
            if (!_z[id]) {
                _z[id] = Vue.reactive({
                    idx: 0,
                    cols: opts.cols ?? 1,
                    loop: opts.loop ?? false,
                    wrap: opts.wrap ?? true,
                });
            } else {
                const z = _z[id];
                if (opts.cols !== undefined) z.cols = opts.cols;
                if (opts.loop !== undefined) z.loop = opts.loop;
                if (opts.wrap !== undefined) z.wrap = opts.wrap;
            }
            return api;
        },

        /**
         * 在区域内导航
         * @param {string} id   - 区域 ID
         * @param {'up'|'down'|'left'|'right'} dir - 方向
         * @param {number} total - 当前区域项目总数（v-for 数组长度）
         * @returns {number} 新的索引，-1 表示区域不存在或无项目
         */
        go(id, dir, total = 0) {
            const z = _z[id];
            if (!z || !total || total <= 0) return -1;

            let i = z.idx;
            const { cols, loop, wrap } = z;

            if (cols <= 1) {
                // ── 列表：四个方向都按 index +/- 1 移动 ──
                switch (dir) {
                    case 'up':
                    case 'left':
                        if (i > 0) i--;
                        else if (wrap || loop) i = total - 1;
                        break;
                    case 'down':
                    case 'right':
                        if (i < total - 1) i++;
                        else if (wrap || loop) i = 0;
                        break;
                }
            } else {
                // ── 网格 ──
                switch (dir) {
                    case 'up': {
                        if (i >= cols) {
                            i -= cols;
                        } else if (loop) {
                            const col = i % cols;
                            const lastRow = Math.floor((total - 1) / cols) * cols;
                            i = Math.min(lastRow + col, total - 1);
                        }
                        break;
                    }
                    case 'down': {
                        if (i + cols < total) {
                            i += cols;
                        } else if (loop) {
                            const col = i % cols;
                            i = col < total ? col : 0;
                        }
                        break;
                    }
                    case 'left':
                        if (i > 0) i--;
                        else if (wrap) i = total - 1;
                        break;
                    case 'right':
                        if (i < total - 1) i++;
                        else if (wrap) i = 0;
                        break;
                }
            }

            i = Math.max(0, Math.min(total - 1, i));
            z.idx = i;
            return i;
        },

        /**
         * 将焦点重置到指定索引
         * @param {string} id
         * @param {number} [idx=0]
         */
        to(id, idx = 0) {
            const z = _z[id];
            if (z) z.idx = Math.max(0, idx);
        },

        /**
         * 检查指定索引是否当前焦点
         * @param {string} id
         * @param {number} idx
         * @returns {boolean}
         */
        is(id, idx) {
            const z = _z[id];
            return z ? z.idx === idx : false;
        },

        /**
         * 获取焦点 CSS 类名字符串（模板便捷方法）
         * @param {string} id
         * @param {number} idx
         * @param {string} [className='focused']
         * @returns {string}
         */
        cls(id, idx, className = 'focused') {
            return api.is(id, idx) ? className : '';
        },

        /**
         * 获取当前焦点索引
         * @param {string} id
         * @returns {number} -1 表示区域不存在
         */
        idx(id) {
            return _z[id]?.idx ?? -1;
        },

        /**
         * 销毁一个区域
         * @param {string} id
         */
        remove(id) {
            delete _z[id];
        },
    };

    return api;
}

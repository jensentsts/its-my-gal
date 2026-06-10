/**
 * engine/core/event-emitter.js
 *
 * 轻量级事件系统 —— GalEngine 内核的消息总线。
 * 引擎内部状态变更通过事件通知外部消费者（Vue 等 UI 层），
 * 实现引擎与表现层的完全解耦。
 */
export class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }

    /**
     * 注册事件监听
     * @param {string} event - 事件名，支持命名空间如 'step:enter'
     * @param {Function} fn  - 回调函数
     * @returns {Function}    - 取消监听的函数
     */
    on(event, fn) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(fn);
        return () => this.off(event, fn);
    }

    /**
     * 注册一次性监听
     */
    once(event, fn) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            fn(...args);
        };
        return this.on(event, wrapper);
    }

    /**
     * 移除监听
     */
    off(event, fn) {
        const set = this._listeners.get(event);
        if (set) {
            set.delete(fn);
            if (set.size === 0) this._listeners.delete(event);
        }
    }

    /**
     * 触发事件
     * @param {string} event
     * @param {...any} args
     */
    emit(event, ...args) {
        const set = this._listeners.get(event);
        if (set) {
            for (const fn of set) {
                try { fn(...args); } catch (e) { console.error(`[Engine Event Error] ${event}:`, e); }
            }
        }
        // 通配符监听器 '*'
        const wildcard = this._listeners.get('*');
        if (wildcard) {
            for (const fn of wildcard) {
                try { fn(event, ...args); } catch (e) { console.error(`[Engine Event Error] *:`, e); }
            }
        }
    }

    /**
     * 清除所有监听器
     */
    clear() {
        this._listeners.clear();
    }

    /**
     * 获取已注册的事件列表（调试用）
     */
    getEvents() {
        return Array.from(this._listeners.keys());
    }
}

export default EventEmitter;

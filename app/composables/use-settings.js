/**
 * use-settings.js
 *
 * 游戏设置持久化管理 —— 文字速度等通用选项。
 * 按键绑定由 use-keybindings.js 独立管理。
 */

const STORAGE_KEY = 'gal_settings_v2';

const DEFAULTS = {
    textSpeed: 25,       // 每字符毫秒数
    autoAdvance: false,  // 自动推进
};

// 文字速度预设标签（切换档位用）
const TEXT_SPEED_PRESETS = [
    { value: 10, label: '极快' },
    { value: 25, label: '快速' },
    { value: 50, label: '标准' },
    { value: 80, label: '较慢' },
    { value: 120, label: '慢速' },
    { value: 200, label: '极慢' },
];

export function useSettings() {
    const settings = Vue.ref({ ...DEFAULTS });

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                settings.value = { ...DEFAULTS, ...parsed };
            }
        } catch (e) {
            console.warn('[Settings] 加载设置失败:', e);
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
        } catch (e) {
            console.warn('[Settings] 保存设置失败:', e);
        }
    }

    function update(key, value) {
        settings.value = { ...settings.value, [key]: value };
        save();
    }

    function resetToDefaults() {
        settings.value = { ...DEFAULTS };
        save();
    }

    load();

    return {
        settings,
        TEXT_SPEED_PRESETS,
        update,
        resetToDefaults,
    };
}

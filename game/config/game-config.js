/**
 * game/config/game-config.js
 *
 * 游戏全局配置
 */
export const GAME_CONFIG = {
    title: '幻象物语：阿瓦隆之觉醒',
    aspectRatio: {
        width: 1280,
        height: 720
    },
    textSpeed: 25,  // 全局打字机默认基本速度 (ms)
    entryPoints: ['main'],  // 游戏入口章节 ID 列表
};

export const HOME_CONFIG = {
    backgroundUrl: 'assets/scenes/home_menu_bg.png',
    placeholderGradient: 'linear-gradient(135deg, #0e0e14 0%, #030305 100%)',
    screenEffect: 'snow',
    maskEffects: ['vignette', 'dim'],
    showOverlay: true,
    overlayOpacity: 0.65
};

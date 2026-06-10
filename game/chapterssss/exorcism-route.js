/**
 * game/chapters/exorcism-route.js
 *
 * 外部驱魔路线·牺牲
 */
export const chapter_exorcism_route = [
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我选择了回归。护身符的绿光逆转流动，将我的意识从爱莉希雅的身体中抽离回自己的躯壳。那种感觉怪异极了——前一秒我还带着她轻盈的身体站立着，后一秒我就重重地摔回了自己沉重的人类躯体中，大口喘着气。',
        updateItem: { id: 'log', flag: 'exorcism_ritual' },
        effects: ['flashWhite', 'screenShake']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '日志夹层中的驱魔祷文。我飞快地翻到那一页，上面的古精灵语符文在我眼前跳动着——我在附身期间似乎获得了一些对精灵语的直觉理解。\'以先祖之名，以森林之源，驱散盘踞的黑暗！\'我念出了祷文的第一句，护身符应声而起，绿色的光柱冲破天穹。',
        updateItem: { id: 'amulet', flag: 'exorcism_ritual' },
        screenEffect: 'stardust?density=45',
        effects: ['flashWhite']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'elysia',
        text: '被附身的爱莉希雅——瓦尔加斯——被绿光击中，发出一声痛苦的嘶吼。这具纤细的精灵之躯剧烈地颤抖起来，黑色的雾气从她的皮肤表面渗出一缕缕的暗影，像是被强行撕扯出来的寄生虫。\'这不可能！区区人类的祷文……啊！！\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'shock', animation: 'shake' }],
        effects: ['screenShake'],
        screenEffect: 'corruption?density=50'
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '但驱魔的代价比我想象中更大。祷文每念出一句，护身符的晶石就裂开一道裂痕。当最后一句祷文脱口而出时，护身符发出了最后一声清脆的鸣响——然后粉碎了。千百年来守护家族传承的至宝，在这个瞬间化为了飘散在空中的晶莹尘埃。',
        loseItem: 'amulet',
        loseApproach: 'destroy',
        effects: ['flashBlack']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'vargas',
        text: '瓦尔加斯的暗影在消散之前发出了最后的诅咒：\'毁了我的容器……不等于消灭了我。封印还在持续崩解，失去护身符的你……迟早还会面对我。到时候，没有精灵的躯体，也没有先祖的庇护——你什么都不是……\'',
        characterChanges: [{ id: 'vargas', action: 'leave', animation: 'fadeOut' }],
        cgChanges: { action: 'leave', animation: 'fadeOut' }
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'elysia',
        text: '黑暗褪去。爱莉希雅的身体软倒在地上，我冲过去扶住她。她缓慢地睁开了眼睛——淡绿色恢复了清澈，但眼底深处的疲惫清晰可见。\'安……文？我……我感觉像做了一场长长的噩梦……那祭坛……瓦尔加斯……他被赶走了？\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'sad', animation: 'bounce' }]
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '\'暂时是的。但他说得对——封印还在。护身符碎了，我们没有永久解决的办法。\'我握住她的手——那双我曾短暂拥有过的纤细的手——感受到她指尖传来的微弱凉意。\'但只要你还活着，只要这片森林还在，我们就有时间找到另一个答案。\'',
        effects: ['dim'],
        cgChanges: { action: 'enter', id: 'avalon_seal', animation: 'scaleIn' }
    },
    {
        sceneId: 'forest_gate',
        type: 'dialogue',
        characterId: 'elysia',
        text: '她微微点头，银发散落在草地上，像是铺了一地的月光。迷雾没有完全散去——只是暂时退到了森林的边界之外。但阳光已经照进了这片古老林地的一角，而爱莉希雅仍然站在那里，守护着她注定要守护的一切。这份守护，如今多了另一个人的承诺。',
        screenEffect: 'sakura?density=35,color=#ffb7c5',
        effects: []
    },
    {
        sceneId: 'forest_gate',
        type: 'jump',
        endingId: 'sacrifice_end'
    }
];

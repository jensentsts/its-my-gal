/**
 * game/chapters/possession-prelude.js
 *
 * 附身前奏·护身符的真相
 */
export const chapter_possession_prelude = [
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我强迫自己冷静下来。瓦尔加斯虽然占据了爱莉希雅的身体，但他似乎还不能完全发挥她的力量——他的动作偶尔会有一瞬间的迟滞，像是操纵着不太合身的木偶。我需要争取时间。',
        updateItem: { id: 'log', flag: 'exorcism_ritual' },
        effects: ['vignette']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '\'瓦尔加斯，如果你真的那么强大，为什么还需要她的身体？你连自己真正的躯壳都没有了吗？\'我故意用挑衅的语气说道，同时手指在背后悄悄翻开了祖父的日志。',
        effects: []
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'elysia',
        text: '被附身的爱莉希雅——瓦尔加斯——发出了一声低沉的笑。\'嘴倒是挺硬。我的真身被你们人类的先祖封印在祭坛底下太久了，久到血肉都化作了砂石。不过没关系——这具精灵的躯体足够我重新君临这片大陆。而你，凡人，你会成为我新纪元的第一块垫脚石。\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'possessed', animation: 'bounce' }],
        screenEffect: 'corruption?density=25'
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我的手指触到了日志夹层中一块格外厚实的纸页。我小心地撕开封口，里面掉出一张折叠了不知多少年的羊皮纸。纸上是祖父工整的字迹，墨迹虽然褪色但依然清晰可辨。标题是——《关于护身符与意识转移的完整记录》。',
        effects: ['flashWhite'],
        updateItem: { id: 'amulet', flag: 'exorcism_ritual' }
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我飞快地扫过羊皮纸上的内容。祖父写道：护身符的真正力量不在于防护，而在于\'意识引导\'——它能够将持有者的意识从自身的躯壳中分离出来，并转移到另一个生命体中。这是远古精灵族流传下来的禁忌秘术，原本用于濒死精灵将意识转移到圣树中以延续存在。但祖父发现，通过调整术式中的符文序列，它也可以用于……附身于另一个活着的生命。',
        effects: [],
        screenEffect: 'stardust?density=20'
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我深吸了一口气，继续往下读。祖父写道：\'启动意识转移需要三个条件：第一，持有者必须与被转移者之间存在某种灵魂层面的纽带——共同的记忆、情感或血脉；第二，转移必须在强大的自然魔力节点附近进行——如阿瓦隆的古代祭坛；第三，持有者必须紧握护身符，同时与目标保持身体接触，然后默念符文序列。转移是瞬间完成的，持有者的意识将完全进入目标的身体，而目标的意识将被暂时抑制。\'',
        effects: ['dim']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我的心跳加速了。我抬起头，看着面前被瓦尔加斯占据的爱莉希雅。她的身体——那具纤细优雅的精灵之躯——正被一个恶意的入侵者操纵着。如果我也能进入那具身体呢？如果我能从内部把瓦尔加斯驱逐出去？祖父的笔记里提到，如果两个意识同时存在于一具身体中，力量更强的一方会占据主导。',
        effects: []
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '但我立刻意识到其中的巨大风险。如果我失败了，或者如果我也被困在那具身体里……甩了甩头，我把这些疑虑压下。没有时间犹豫了。爱莉希雅信任我的祖父，而她的身体此刻正在被玷污。我必须做些什么。',
        effects: ['screenShake'],
        screenEffect: 'stardust?density=30'
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'elysia',
        text: '瓦尔加斯操控着爱莉希雅的躯体向我逼近了一步，修长的腿在长袍下交替迈动，每一步都透着不属于她的侵略性。\'怎么，看完了吗？你祖父留了什么秘密给你？不如拿出来分享分享。\'他伸出手——那只手小巧而白皙，五指修长，指尖晶莹如玉——但伸出的姿势却充满了威胁。',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'possessed', animation: 'bounce' }]
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '就是现在。我猛地向前跨出一步，左手握紧胸前的护身符，右手抓住了她的手腕。符文的序列在我脑海中浮现——祖父在羊皮纸上用粗体标注的那串古精灵语，不知为何我只看了一遍就牢牢记住了。护身符的晶石爆发出一团刺目的绿色光芒，整个祭坛都在震颤。我看见瓦尔加斯——在爱莉希雅的脸上——第一次露出了惊愕的表情。然后，世界消失了。',
        effects: ['flashWhite', 'screenShake'],
        cgChanges: { action: 'enter', id: 'redemption_light', animation: 'scaleIn' },
        jumpChapter: 'possession_event'
    }
];

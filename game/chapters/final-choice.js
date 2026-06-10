/**
 * game/chapters/final-choice.js
 *
 * 命运抉择
 */
export const chapter_final_choice = [
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '回到祭坛的时候，天色已经完全暗了下来。厚重的云层遮住了月亮，只有护身符的绿光照亮了一小片区域。安文的身体还静静地躺在石凹中，胸口缓缓起伏。我蹲下来看着那张熟悉的、却又显得陌生的面孔——二十四年来我每天在镜子里看到的那张脸，此刻从外部看，格外不真实。',
        screenEffect: 'bloodmoon?density=15',
        effects: ['dim']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '瓦尔加斯在我意识深处蠢蠢欲动。我能感觉到他在积蓄力量，试图重新夺取对这具身体的控制权。而爱莉希雅的灵魂仍然安静地沉在最底层——但如果我的判断没错，通过护身符的力量，我有办法唤醒她。问题是，这需要我继续留在这具身体里，与瓦尔加斯的意识对抗。而另一边，回到自己的身体、用人类的身份去对抗他……胜算更低。',
        effects: ['screenShake']
    },
    {
        sceneId: 'ancient_altar',
        type: 'dialogue',
        characterId: 'player',
        text: '我低头看着自己纤细的精灵双手，感受着这具身体里涌动的魔力。爱莉希雅的魔力——纯粹的、流淌了数百年的森林之力——此刻尽在我的掌握之中。如果我将这股力量与护身符的咒文结合起来，或许真的能够从内部击溃瓦尔加斯。但如果失败了，不仅爱莉希雅的身体会被他彻底占据，连我的意识也会被吞噬。',
        effects: [],
        cgChanges: { action: 'enter', id: 'ancient_mural', animation: 'scaleIn' }
    },
    {
        sceneId: 'ancient_altar',
        type: 'choice',
        text: '这是攸关两个灵魂命运的关键抉择：',
        choices: [
            {
                text: '✨ 留在爱莉希雅体内，借助护身符与精灵魔力从内部驱散瓦尔加斯',
                updateItem: { id: 'amulet', flag: 'exorcism_ritual' },
                jumpChapter: 'redemption_route'
            },
            {
                text: '⬅️ 返回自己的身体，用人类的力量配合祭祀匕首进行外部对抗',
                jumpChapter: 'exorcism_route'
            }
        ]
    }
];

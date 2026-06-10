/**
 * game/chapters/forest-explore.js
 *
 * 密林探索·羁绊的种子
 */
export const chapter_forest_explore = [
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'player',
        text: '我跟在爱莉希雅身后，沿着一条若有若无的林间小径前行。她的步伐轻盈得几乎没有声响，赤脚踩在覆满苔藓的泥土上，每一步都像踩着某种我看不见的节奏。作为对比，我的靴子踩在枯枝和落叶上，发出沙沙的响声，笨拙得让我自己都有些不好意思。',
        screenEffect: 'snow?density=25',
        effects: []
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'elysia',
        text: '她走在前头，头也不回地说：\'你走路的姿势暴露了你。你是城里人——每一步都在试图踩稳地面，而不是与地面共生。放松你的膝盖，感受泥土的回弹。在森林里，对抗只会让你更快疲倦。\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'happy', animation: 'pulse' }]
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'player',
        text: '我试着放松脚步，但收效甚微。不过她的话让我对这位精灵守护者多了几分好奇。\'你和我祖父……是怎么认识的？他从来没有详细说过。\'',
        effects: []
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'elysia',
        text: '爱莉希雅放慢了脚步，与我并肩而行。她的银发在林间微光中泛着柔和的光泽，侧脸的轮廓如同被细笔勾勒出来的。\'四十年前，你祖父是个年轻的水手。他的船在暴风雨中偏离了航线，漂到了阿瓦隆的海岸。是我巡林时发现了他，把他从礁石上救了下来。\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'idle', animation: 'fadeIn' }]
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'elysia',
        text: '她顿了顿，声音里带上了一丝很难察觉的温度。\'他在森林里住了一个多月。那个时候的森林比现在繁盛得多，古老的树木覆盖着每一寸土地。他帮我绘制了森林的地图，记录了上百种你们人类从未见过的植物。我们还一起修好了东面的矿道入口——他有一双巧手。\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'happy', animation: 'pulse' }]
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'player',
        text: '我不由自主地笑了。祖父在我记忆里只是个坐在藤椅上的老人，可从她的描述里，我看到的是一个充满冒险精神的年轻水手——那才是真正的他。\'后来呢？他为什么不留在森林里？\'',
        effects: ['dim']
    },
    {
        sceneId: 'forest_path',
        type: 'dialogue',
        characterId: 'elysia',
        text: '她的脚步彻底停住了。她转过身来，那双淡绿色的眼眸直直地看着我，里面盛着一种沉淀了太久的情绪。\'因为他有家人。他说家里有个年幼的儿子——就是你的父亲——等着他回去。他把护身符留给了我，说如果有一天森林需要帮助，它会指引他的后代回到这里。\'她移开目光，望向密林深处。\'而现在，时候到了。\'',
        characterChanges: [{ id: 'elysia', action: 'update', spriteId: 'sad', animation: 'bounce' }],
        effects: ['vignette'],
        jumpChapter: 'ruins_exploration'
    }
];

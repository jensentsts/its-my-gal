/**
 * resource-packs/default/chapters/crystal_chamber.js
 *
 * 水晶密室 —— 使用 texts 批处理优化。
 */
export const chapter_crystal_chamber = [
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "在瓦尔加斯那番话之后，一种强烈的不安感攫住了我。我本能地感觉到，硬碰硬绝不是正确的选择。我需要更多的信息——关于这片森林真正的力量来源。爱莉希雅曾经提到过，森林的魔力不仅仅来自封印，还有更深层的源头。",
      "我回想起祖父日志中夹着的那张泛黄的手绘地图——在森林腹地，离祭坛大约半日路程的地方，标记了一个奇特的符号。那不是精灵的文字，也不是魔族的印记，而是一个我从未见过的图案：一颗被藤蔓缠绕的菱形晶石。祖父在旁边用铅笔写着：\"真正的钥匙。\"",
      "瓦尔加斯的注意力还集中在爱莉希雅身上——他的意识主体已经侵入了她的灵魂深处，对外界的感知暂时变弱了。这是我的机会。我紧握着护身符，循着地图上的标记，向着森林极深处悄然前行。越往里走，雾气越稀薄，取而代之的是一种奇异的、温暖的晶蓝色光芒，从岩石的缝隙中透射出来。"
    ],
    "textEffects": [
      null,
      {"effects": ["vignette"]},
      {"effects": [], "screenEffect": "stardust?density=25"}
    ],
    "effects": ["dim"]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "穿过一片被藤蔓遮蔽的石拱门后，我来到了一处从未在地面上见过的景象：一面如镜的深潭嵌在参天古树的环抱之中，水面静止得仿佛凝固了时间。潭水深处隐约可见一块巨大的、多面体的晶石——它缓缓地旋转着，每一次转动都向四周散发出涟漪般的魔力波动。",
    "cgChanges": {"action": "enter", "id": "redemption_light", "animation": "scaleIn"},
    "screenEffect": "stardust?density=40",
    "effects": ["flashWhite"]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "水面泛起了一圈圈柔和的涟漪。一个声音——不是从空气中传来的，而是直接在脑海中响起的——充满了整片空间。那是一种不分男女、古老而悠远的声音，带着岁月沉淀下来的沉静与智慧。\"你终于来了，护身符的继承者。我已经等了你两百年。\"",
    "effects": ["dim"]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "水面上的涟漪汇聚成一个半透明的虚影——一个身材修长的精灵女性形态，长发如瀑布般垂落，面容模糊却透着慈祥。她不是实体，更像是水面与光影交织而成的幻象。\"我是第一代守护者的残响，被封印在这颗源晶之中。这块晶石是阿瓦隆森林所有魔力网络的交汇点——包括封印瓦尔加斯的锁链在内，所有的力量都从这里出发。\"",
    "effects": [],
    "cgChanges": {"action": "leave", "animation": "fadeOut"}
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "虚影继续说道：\"你手中的护身符，正是从这颗源晶上切割下来的第一片碎片。它之所以能引导你的意识、护佑你的灵魂，正是因为与源晶同源。你若想彻底终结瓦尔加斯的威胁，就需要将源晶的力量引导至封印的核心。但这个过程极为危险——源晶的力量足以焚毁一切不配触碰它的生命。\"她顿了顿，意味深长地盯着我。",
    "screenEffect": "snow?density=20",
    "effects": ["flashWhite"]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "我看着潭水下那块缓缓旋转的晶石，感受到了从其中散发出的纯然的、不容侵犯的力量。护身符在我胸前共鸣着，发出低低的嗡鸣，像是在回应源晶的召唤。我知道，我面前站着一个分岔口——是选择这条充满未知的探索之路，还是赶回爱莉希雅身边面对眼前更紧迫的危机。",
    "effects": ["vignette"]
  },
  {
    "sceneId": "forest_path",
    "type": "choice",
    "text": "面对源晶守护者的启示，你决定：",
    "choices": [
      {
        "text": "🙏 恭敬地潜入潭底，以护身符引导取回源晶碎片",
        "jumpChapter": "crystal_retrieval"
      },
      {
        "text": "🔥 强行汲取源晶中的火焰之力，追求极致力量",
        "jumpChapter": "ruins_awakening"
      },
      {
        "text": "⬅️ 先返回祭坛，以现有力量对抗瓦尔加斯",
        "jumpChapter": "possession_prelude"
      }
    ]
  }
];

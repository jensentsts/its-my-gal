/**
 * resource-packs/default/chapters/crystal_retrieval.js
 *
 * Auto-converted from crystal_retrieval.json
 */
export const chapter_crystal_retrieval = [
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "我深吸一口气，握紧护身符，纵身跃入了清凉的潭水之中。水下比我想象中温暖得多——源晶散发的光芒将周围的水域照得如同白昼。我没有感到窒息，因为护身符在我入水的瞬间张开了一层薄如蝉翼的绿色光罩，将水隔在了外面。",
    "effects": ["flashWhite"],
    "screenEffect": "stardust?density=45"
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "我缓缓下降，向着那块缓缓旋转的晶石伸出手。源晶的表面平滑如镜，内部流动着液态般的光华——碧绿、湛蓝与金色交织，仿佛将整个森林的生命力都浓缩在了这一颗多面体中。当我的指尖触到晶石表面的那一刻，护身符猛烈地颤动起来，发出一声清越的共鸣音。",
    "cgChanges": {"action": "enter", "id": "redemption_light", "animation": "scaleIn"},
    "effects": ["flashWhite", "screenShake"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "守护者的声音再次在脑海中响起：\"你没有被源晶拒绝——这说明你的灵魂足够纯净。现在，集中你的意念，想象源晶的碎片从主体上分离。它会听到你的召唤。\"我闭上眼睛，将所有的意志集中在指尖与晶石相接的那一点。我感受到了一股温暖的、蓬勃的力量沿着手臂涌入身体——那感觉不同于附身时的抽离，而是一种充盈，像干涸的大地终于迎来了甘霖。",
    "effects": ["dim"],
    "screenEffect": "stardust?density=50"
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "一声清脆的碎裂声响起。一枚拇指大小的晶石碎片从源晶的主体上脱落，飘浮在水中，然后像受到牵引般缓缓飞向我的掌心。它停留在我的手心中，散发着温润的蓝绿色光芒。同时，我脖子上的护身符发出了一声满足的叹息般的共鸣——两枚碎片，本为一体，终于在百年后重新感应到了彼此的存在。",
    "effects": ["flashWhite"],
    "gainItem": "crystal_shard",
    "gainApproach": "receive"
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "我浮出水面，浑身湿透但精神焕发。掌心的晶石碎片与胸前的护身符交相辉映，在我的皮肤表面投下了一片淡淡的蓝色光晕。守护者的虚影已经变得极淡，像是完成了使命即将消散。\"你做出了正确的选择，继承者。带着碎片回到祭坛去吧——将它与护身符结合，你就能重新编织封印的锁链。记住：真正的力量不是占有，而是守护。\"说完这句话，虚影化作千万点星光，消散在了湖面上空。",
      "我回到地面时，天色已经微明。掌心的晶石碎片散发着温暖的脉动，与护身符的绿光交相辉映。我站在原地，望着远方祭坛的方向，心中充满了前所未有的清明。我知道该怎么做了一一将碎片嵌入护身符，赶在瓦尔加斯完全突破封印之前，重新锁上那道门。"
    ],
    "textEffects": [
      null,
      {"effects": [], "screenEffect": "snow?density=15"}
    ],
    "effects": ["flashWhite"],
    "screenEffect": "sakura?density=30,color=#aaddff"
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "player",
    "text": "我赶回祭坛，将从源晶获得的碎片高高举起。护身符自动脱离了我的脖子，飘浮在半空中，与碎片融合在一起。一道夺目的光柱冲天而起，穿透了层层树冠，将整座阿瓦隆森林照得如同被初升的朝阳拥抱。迷雾在光芒中瓦解、消散——那层笼罩了数百年的厚重雾障，终于在这一刻彻底化为了乌有。",
    "screenEffect": "sakura?density=45,color=#ffd700",
    "effects": ["flashWhite", "screenShake"],
    "cgChanges": {"action": "enter", "id": "avalon_seal", "animation": "scaleIn"}
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "player",
    "text": "远处传来一声不甘的嘶吼——那是瓦尔加斯被彻底封印前最后的挣扎。我感到他的气息从森林中迅速消退，如同潮水退去。祭坛的石碑发出了低沉的轰鸣，裂缝开始自动愈合，远古的符文重新亮起了金色的光芒。我成功了——不是用暴力，不是用牺牲，而是用理解和传承。",
    "effects": ["flashWhite", "screenShake"]
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "爱莉希雅的气息重新变得纯净而强大。她来到我身边，银色的长发在破晓的光辉中闪闪发亮，眼眸中倒映着金色的晨曦。\"你找到了源晶。你做到了连我也做不到的事。\"她的声音里有惊讶、有感激，还有一种我从未在她身上感受到过的温暖。\"谢谢你，安文——不仅是为了森林，也是为了我。\"",
    "characterChanges": [{"id": "elysia", "action": "enter", "spriteId": "happy", "animation": "fadeIn"}]
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "player",
    "text": "破晓的曙光撕裂了笼罩数百年的迷雾。森林中的每一片树叶都在发光，每一缕微风都在歌唱。世界迎来了久违的平静与真相——阿瓦隆的新晨，终于到来了。",
    "effects": ["vignette"],
    "screenEffect": "sakura?density=50,color=#ffb7c5"
  },
  {
    "sceneId": "forest_gate",
    "type": "ending",
    "endingId": "true_end"
  }
];

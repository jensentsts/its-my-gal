/**
 * resource-packs/default/chapters/ruins_awakening.js
 *
 * Auto-converted from ruins_awakening.json
 */
export const chapter_ruins_awakening = [
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "守护者的警告还在耳边回响，但我已经没有耐心了。爱莉希雅正在被瓦尔加斯折磨，而我站在这里听一个幽灵讲长篇小说？不。力量——我只需要力量。强大的、足以一击粉碎敌人的力量。眼前的源晶就是答案。",
    "effects": ["vignette"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "我没有按照守护者教导的方式去触碰源晶。相反，我将护身符当作撬棍，狠狠地凿入了晶石表面的裂缝中。一股灼热的、暴烈的力量从裂缝中喷涌而出，将我整个人震飞出去。我的后背重重地撞在石壁上，口中的血腥味弥漫开来——但我看到了。晶石的裂缝中涌出的不是温和的蓝绿色光芒，而是暗红色的、如同熔岩般的炽热洪流。",
    "effects": ["screenShake", "flashWhite"],
    "screenEffect": "corruption?density=50"
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "守护者的声音变得尖锐而痛苦：\"愚昧！你释放的不是源晶的力量——是被封印在晶石核心的炎魔残骸！那是千年前初代守护者用自己的生命镇压在源晶中的上古怪物！\"她的虚影剧烈地扭曲着，像被火焰灼烧的纸片一样蜷缩、消散。",
    "effects": ["flashBlack", "screenShake"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "大地开始震动。潭水沸腾蒸发，岩石崩裂，整个地下空间在炎魔的咆哮中摇摇欲坠。一团由火焰与岩浆构成的巨大身影从破碎的晶石中升起——它的躯体由燃烧的岩石组成，双眼是两个深不见底的深渊，散发着毁灭性的橙红色光芒。高温扭曲了空气，我连呼吸都变得困难。",
    "screenEffect": "bloodmoon?density=60",
    "effects": ["screenShake", "flashBlack"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "炎魔发出了震耳欲聋的咆哮。\"千年了！我被囚禁了一千年！终于——自由了！！！\"它的身体不断膨胀，撑破了洞穴的穹顶，碎石如雨般坠落。我拼命向外跑去，但炎魔的烈焰已经追上了我的脚步。森林在我身后燃烧——不是雾气的吞噬，而是真正的、不可阻挡的火焰。",
    "effects": ["screenShake", "flashWhite"],
    "screenEffect": "corruption?density=70"
  },
  {
    "sceneId": "sky_bg",
    "type": "dialogue",
    "characterId": "player",
    "text": "我跑出了地下洞穴，但眼前的景象让我停下了脚步。天空被染成了不祥的暗红色，浓烟遮蔽了太阳。阿瓦隆森林——那片古老而美丽的林地——正在化为火海。鸟兽四散奔逃，精灵们惊慌失措的哭喊声从远方传来。这一切，都是因为我——因为我的贪婪和急躁。",
    "cgChanges": {"action": "enter", "id": "ancient_mural", "animation": "scaleIn"},
    "effects": ["flashBlack", "vignette"]
  },
  {
    "sceneId": "sky_bg",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "我试图寻找爱莉希雅的身影，但意识在高温和烟雾中逐渐模糊。在倒下的最后一刻，我看到炎魔张开遮天蔽日的火焰双翼，俯冲向远方精灵聚居的树城。在更远的山后——那里有着人类的村庄和城市。烈焰蔓延——阿瓦隆森林、精灵国度、人类的土地，整个大陆都在烈火中化为了焦土。一切，都结束了。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "shock", "animation": "shake"}],
    "effects": ["flashBlack", "screenShake"]
  },
  {
    "sceneId": "sky_bg",
    "type": "jump",
    "endingId": "ruin_end"
  }
];

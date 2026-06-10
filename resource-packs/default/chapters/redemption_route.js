/**
 * resource-packs/default/chapters/redemption_route.js
 *
 * Auto-converted from redemption_route.json
 */
export const chapter_redemption_route = [
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我做出了决定：留下来。不是为了占有什么，而是为了夺回什么。我盘腿坐在祭坛的石板上，双手握住护身符，闭上眼睛。我将意识向内收束，沿着护身符的绿光潜入这具身体的深处——潜入了那片被黑暗盘踞的意识之海。",
    "updateItem": {
      "id": "amulet",
      "flag": "exorcism_ritual"
    },
    "effects": [
      "flashWhite"
    ],
    "screenEffect": "stardust?density=45"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "在那片幽深的意识空间中，我看见了瓦尔加斯。他不再是人形的投影，而是一团扭曲的暗红色暗影——触手般的黑暗蔓延向意识空间的各个角落，牢牢地缠绕着空间的每一道壁垒。看到我出现，那团暗影发出了低沉的咆哮。'愚蠢的人类！你以为凭你那点意志就能对抗我？我盘踞了上千年的灵魂牢笼，岂是你这凡人的意识所能撼动的？'",
    "characterChanges": [
      {
        "id": "vargas",
        "action": "enter",
        "spriteId": "angry",
        "animation": "shake"
      }
    ],
    "screenEffect": "corruption?density=40",
    "effects": [
      "screenShake"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我没有理会他的咆哮，而是将注意力投向意识空间最深处的那个光点——那里蜷缩着爱莉希雅的灵魂。她的意识像一团微弱的淡青色火焰，被黑暗缠绕着几乎熄灭，但火心仍然顽强地跳动。我向她伸出'手'——不是身体的手，而是意识的触手。",
    "screenEffect": "stardust?density=50",
    "effects": [
      "flashWhite"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "在意识相触的一瞬间，她的声音——她真正的、未被污染的声音——微弱地在我心中响起。'安……文？是你吗？我感觉到了……是你在我的身体里？'",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "enter",
        "spriteId": "sad",
        "animation": "bounce"
      }
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "'是我。爱莉希雅，听着——你祖父把护身符留给我祖父是有原因的。你的身体里现在有两个外来意识，但你是这具身体真正的主人。我需要你醒来——和我一起——把那个入侵者赶出去！'",
    "effects": []
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她的意识在我身边亮了起来，淡青色的火焰迅速壮大。'我……我以为我已经输了。我不够强大。但既然你在这里——既然你在我的身体里为我而战——那我绝不会让你一个人面对。我们一起来。'她的声音从微弱变得坚定，带着数百年来作为森林守护者积淀下来的不容置疑的力量。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "determined",
        "animation": "pulse"
      }
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "在意识的层面，两个灵魂的力量汇聚在一起。护身符的绿光在外部世界爆发出耀眼的光芒，将整个祭坛照得如同白昼。爱莉希雅的精灵魔力从沉睡中全面苏醒，像决堤的洪流般冲刷着意识空间的每一个角落。瓦尔加斯的黑暗触手开始退缩、崩解、化为虚无。",
    "effects": [
      "flashWhite",
      "screenShake"
    ],
    "screenEffect": "stardust?density=60"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "不！！！这不可能！千年的积累，被一个人类和一个精灵丫头——我不接受！！！",
    "characterChanges": [
      {
        "id": "vargas",
        "action": "leave",
        "animation": "fadeOut"
      }
    ],
    "effects": [
      "flashBlack",
      "screenShake"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "暗影像退潮般消散而去。意识空间恢复了澄澈——一片宁静的、淡青色的湖泊出现在了原本被黑暗占据的地方。瓦尔加斯的恶意被彻底驱逐了。爱莉希雅的灵魂重新充盈了她的身体，而我——我该离开了。",
    "cgChanges": {
      "action": "leave",
      "animation": "fadeOut"
    },
    "effects": [
      "flashWhite"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我在意识空间中最后'看'了她一眼——完整的、自由的、光芒四射的爱莉希雅。然后我将意识沿着护身符的绿光抽离，回到了自己原先的身体之中。",
    "effects": [],
    "screenEffect": "stardust?density=40",
    "cgChanges": {
      "action": "enter",
      "id": "redemption_light",
      "animation": "scaleIn"
    }
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "睁开眼的时候，我——真正的我，安文——正在喘着粗气，后背被冷汗浸透了。我的手——我自己的、粗糙的、熟悉的手——正紧紧地握着护身符。而在我面前，爱莉希雅独自站立着，眼中的暗红已经完全褪去，那双淡绿色的眼眸恢复了清澈。她低头看着自己的双手，肩膀微微颤抖着。",
    "effects": []
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她抬起头，泪水从眼角滑落——清澈的、无声的泪水，顺着白皙的面颊淌过精巧的下巴，滴落在祭坛的石板上。'你……你做到了。你进入我的身体，在我的灵魂最深处，与瓦尔加斯正面交锋……为了我。'她的声音在颤抖，但语气里不再是疏离，而是某种破裂之后重新凝结的、更深厚的情感。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "happy",
        "animation": "pulse"
      }
    ],
    "effects": []
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "我们一起走出森林。迷雾正在散去，阳光穿透了几个世纪以来不曾被穿透的厚重雾障，一道道金色的光束洒在林间空地上。森林发出了某种低沉的、愉悦的回响——那是整座阿瓦隆在醒来。爱莉希雅走到我身边，握住了我的手。她的掌心很凉，但握得比任何时候都用力。'迷雾终于散了。安文，你祖父的遗愿——我们共同完成了。'",
    "screenEffect": "sakura?density=35,color=#ffb7c5",
    "cgChanges": {
      "action": "enter",
      "id": "avalon_seal",
      "animation": "scaleIn"
    }
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "player",
    "text": "我看着她的侧脸——在阳光下，她的银发泛着碎金般的光泽，尖耳微微向后倾斜，嘴角挂着淡淡的笑意。在经历了附身与被附身的一切之后，我们之间生出了某种难以名状的纽带。我知道，我将永远记得在另一具身体里度过的那段短暂而奇怪的时光——记得那双纤细的手，那头银色的长发，那双灵巧的赤脚踩在泥土上的触感。那不仅是被附身的她的体验，也是附身者我自己的体验。",
    "effects": [
      "dim"
    ]
  },
  {
    "sceneId": "forest_gate",
    "type": "ending",
    "endingId": "redemption_end"
  }
];

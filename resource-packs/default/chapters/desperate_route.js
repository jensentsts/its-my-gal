/**
 * resource-packs/default/chapters/desperate_route.js
 *
 * Auto-converted from desperate_route.json
 */
export const chapter_desperate_route = [
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我拔出祖父的祭祀匕首，不顾一切地冲向被附身的爱莉希雅。'我一定会把你救回来！'愤怒和恐惧同时燃烧在我的胸口——我无法忍受看到她被那个恶魔操纵的样子。",
    "effects": [
      "screenShake"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "瓦尔加斯——在爱莉希雅的脸上——露出了一个残酷的微笑。'愚蠢！这把匕首上的术式早在几十年前就被我暗中篡改过了。你以为你祖父托付给她的是武器？不——那是另一道封印的钥匙，而我就是那个封印的受益者！'",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "possessed",
        "animation": "shake"
      }
    ],
    "screenEffect": "corruption?density=45",
    "effects": [
      "flashBlack"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "匕首刺出的瞬间，剑身上的术式忽然反向旋转——暗红色的光从刀尖迸发，顺着我的手臂蔓延到我的肩膀、脖颈、全身。一阵尖锐的刺痛穿透了我的胸腔，然后——我第二次感受到了那种意识被抽离的感觉。但这一次，不是按照我的意愿。",
    "loseItem": "dagger",
    "loseApproach": "destroy",
    "effects": [
      "flashWhite",
      "screenShake"
    ]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "瓦尔加斯利用匕首上被篡改的术式，强行将我的意识也拉进了爱莉希雅的身体。现在——三个意识共同存在于同一具纤细的精灵躯壳之中。一个真正的守护者，一个疯狂的入侵者，还有一个愚蠢的、主动送上门的凡人。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "possessed",
        "animation": "bounce"
      }
    ],
    "cgChanges": {
      "action": "enter",
      "id": "elysia_possession",
      "animation": "pulse"
    }
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "'现在你明白了吗，安文？你自己跳进了笼子。爱莉希雅的灵魂被困在最底层，你的意识被我压制在中间层，而我——瓦尔加斯——现在拥有两个灵魂的力量作为养分。再见了，凡人。你的愚蠢为我们拉开了新纪元的序幕。'",
    "characterChanges": [
      {
        "id": "vargas",
        "action": "enter",
        "spriteId": "angry",
        "animation": "bounce"
      }
    ],
    "effects": [
      "flashBlack"
    ]
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "player",
    "text": "在意识的最深处，我隐约感知到爱莉希雅——她的灵魂像一片枯萎的花瓣飘浮在黑暗中。她的声音奇异地平静，没有任何责备。'安文……你不该来的。但现在说这些都太迟了。他吞噬了我大部分的力量，而你的恐惧只会加速这个过程。我们……或许真的出不去了。'",
    "effects": [
      "dim"
    ]
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "player",
    "text": "我挣扎着想要回应她，但黑暗已经侵蚀了意识的大半。护身符的绿光越来越微弱——它在努力维持我仅存的意识碎片，但瓦尔加斯的力量太强了。我的感官开始褪去：精灵耳朵听到的风声消失了，赤脚踩在石面上的触感消失了，最后连意识本身也在黑暗中沉没。最后残存的念头，是爱莉希雅那头银发在风中散开的画面。",
    "screenEffect": "bloodmoon?density=50",
    "effects": [
      "flashBlack",
      "vignette"
    ],
    "cgChanges": {
      "action": "leave",
      "animation": "fadeOut"
    }
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "他操控着那具美丽的精灵之躯，缓缓走向祭坛的正中央。黑暗从她的脚下蔓延开来，笼罩了整座阿瓦隆。迷雾不再只是困扰森林——它们变成了活物，开始吞噬一切生命。至暗的时代，就此开始。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "possessed",
        "animation": "shake"
      }
    ],
    "screenEffect": "corruption?density=60",
    "effects": [
      "flashBlack"
    ]
  },
  {
    "sceneId": "altar_core",
    "type": "ending",
    "endingId": "dark_possession_end"
  }
];

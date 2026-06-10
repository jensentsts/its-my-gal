/**
 * resource-packs/default/chapters/ruins_exploration.js
 *
 * Auto-converted from ruins_exploration.json
 */
export const chapter_ruins_exploration = [
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "player",
    "text": "我们来到了一座被藤蔓覆盖的古老石门面前。爱莉希雅伸出手掌按在石门正中的凹槽上，一串发光的符文从她的手心蔓延开来，石门轰然向内打开。门内是一条幽深的廊道，两侧的石壁上绘满了色彩鲜艳的壁画。",
    "effects": [
      "dim"
    ],
    "screenEffect": "corruption?density=15",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "idle",
        "animation": "fadeIn"
      }
    ]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "小心那些壁画。它们是远古封印的一部分，描绘的是千年前那场封印之战的经过。如果你盯着看太久，画中封印的低语魔咒可能会侵蚀你的意志——那是瓦尔加斯在被封印前留下的陷阱。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "shock",
        "animation": "shake"
      }
    ],
    "effects": [
      "screenShake"
    ]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "player",
    "text": "但我已经被壁画吸引住了。第一幅画上，一个身披黑袍的高大身影——应该就是瓦尔加斯——站在燃烧的森林中央，周围是倒下的精灵和人类。第二幅画里，一群手持法杖的精灵围成一圈，将黑袍身影封入了一座祭坛。第三幅画——我眯起眼睛仔细辨认——画着一个人类和一个精灵并肩站在一起，人类手中握着的竟是一枚发光的护身符。",
    "cgChanges": {
      "action": "enter",
      "id": "ancient_mural",
      "animation": "scaleIn"
    }
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她一把抓住我的手腕将我往后拽，手指纤细却有力。'我说了别看太久！你的眼神已经开始涣散了。'她的掌心贴在我手腕的皮肤上，温度比人类要低一些，带着一种像薄荷叶似的清凉触感。",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "shock",
        "animation": "shake"
      }
    ]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "player",
    "text": "我晃了晃脑袋，确实感到一阵轻微的眩晕。但壁画的内容让我无法不在意——那个握着护身符的人类，难道就是我的祖先？",
    "effects": [],
    "cgChanges": {
      "action": "leave",
      "animation": "fadeOut"
    }
  },
  {
    "sceneId": "ruins_entrance",
    "type": "choice",
    "text": "面对壁画的诱惑，你选择：",
    "choices": [
      {
        "text": "🧠 集中精神，对照日志深度解读壁画（获得关键线索）",
        "updateItem": {
          "id": "log",
          "flag": "read_ancient_mural"
        },
        "jumpChapter": "forest_deep"
      },
      {
        "text": "🙈 听从劝告，闭眼快速通过",
        "jumpChapter": "forest_deep"
      },
      {
        "text": "👁️ 被壁画蛊惑，深陷其中无法自拔",
        "jumpChapter": "ruins_exploration_bad"
      }
    ]
  }
];

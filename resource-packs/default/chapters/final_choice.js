/**
 * resource-packs/default/chapters/final_choice.js
 *
 * 最终抉择 —— 使用 texts 批处理优化。
 */
export const chapter_final_choice = [
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "回到祭坛的时候，天色已经完全暗了下来。厚重的云层遮住了月亮，只有护身符的绿光照亮了一小片区域。安文的身体还静静地躺在石凹中，胸口缓缓起伏。我蹲下来看着那张熟悉的、却又显得陌生的面孔——二十四年来我每天在镜子里看到的那张脸，此刻从外部看，格外不真实。",
      "瓦尔加斯在我意识深处蠢蠢欲动。我能感觉到他在积蓄力量，试图重新夺取对这具身体的控制权。而爱莉希雅的灵魂仍然安静地沉在最底层——但如果我的判断没错，通过护身符的力量，我有办法唤醒她。问题是，这需要我继续留在这具身体里，与瓦尔加斯的意识对抗。而另一边，回到自己的身体、用人类的身份去对抗他……胜算更低。"
    ],
    "textEffects": [
      null,
      {"effects": ["screenShake"]}
    ],
    "effects": ["dim"],
    "screenEffect": "bloodmoon?density=15"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我低头看着自己纤细的精灵双手，感受着这具身体里涌动的魔力。爱莉希雅的魔力——纯粹的、流淌了数百年的森林之力——此刻尽在我的掌握之中。如果我将这股力量与护身符的咒文结合起来，或许真的能够从内部击溃瓦尔加斯。但如果失败了，不仅爱莉希雅的身体会被他彻底占据，连我的意识也会被吞噬。",
    "effects": [],
    "cgChanges": {"action": "enter", "id": "ancient_mural", "animation": "scaleIn"}
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "但还有一件事一直在我脑海中挥之不去——在遗迹的壁画上，我看到了远古精灵们封印瓦尔加斯的完整场景。如果我没有理解错的话，壁画中那位手持护身符的人类祖先所念诵的祷文，并不仅仅是普通的封印咒语——它是一种更加古老的、能够从根源上瓦解黑暗力量的'源初之言'。",
      "壁画上的每一个符文、每一个手势都清晰地印在我的脑海中。那是一种超越语言的力量——古精灵语的元初形态，据称是森林本身在人类诞生之前就拥有的声音。如果我能用爱莉希雅的身体——这具流淌着纯净精灵魔力的躯体——来吟诵那段祷文，配合护身符的力量，或许可以从根源上瓦解瓦尔加斯的整个存在基础。"
    ],
    "textEffects": [
      null,
      {"effects": ["dim"], "screenEffect": "stardust?density=35"}
    ],
    "effects": ["flashWhite"],
    "screenEffect": "stardust?density=30"
  },
  {
    "sceneId": "ancient_altar",
    "type": "choice",
    "text": "这是攸关两个灵魂命运的关键抉择：",
    "choices": [
      {
        "text": "✨ 留在爱莉希雅体内，借助护身符与精灵魔力从内部驱散瓦尔加斯",
        "updateItem": {"id": "amulet", "flag": "exorcism_ritual"},
        "jumpChapter": "redemption_route"
      },
      {
        "text": "⬅️ 返回自己的身体，用人类的力量配合祭祀匕首进行外部对抗",
        "jumpChapter": "exorcism_route"
      },
      {
        "text": "🌟 以壁画中悟得的远古祷文唤醒护身符的真正力量，从根源瓦解瓦尔加斯",
        "updateItem": {"id": "amulet", "flag": "ancient_prayer"},
        "jumpChapter": "hope_awakening"
      }
    ]
  }
];

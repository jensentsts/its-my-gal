/**
 * resource-packs/default/chapters/ruins_exploration_bad.js
 *
 * Auto-converted from ruins_exploration_bad.json
 */
export const chapter_ruins_exploration_bad = [
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "player",
    "text": "壁画的色彩在我眼前旋转、融合，化作一条条蠕动的暗影触手。我想要移开视线，但眼睛像被钉在了画面上——那上面的人物仿佛活了过来，用无声的语言召唤着我的灵魂。",
    "effects": ["vignette", "flashBlack"],
    "screenEffect": "corruption?density=35"
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她的声音从很远的地方传来，像是隔了一层厚重的水幕。我感觉到她抓住我的肩膀用力摇晃，但我已经无法回应了。意识像沙子一样从指缝间流走，我最后看到的画面，是壁画上那个手持护身符的人类身影正在逐渐变得模糊、扭曲、最终化为了一团灰色的雾气。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "shock", "animation": "shake"}],
    "effects": ["screenShake"]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "不！安文——看着我的眼睛！不要看壁画！太迟了。他的瞳孔已经扩散了——那是瓦尔加斯的低语侵入了他心智的迹象。秘道开始崩塌了，藤蔓和石块从穹顶坠落，尘埃弥漫了整个空间。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "sad", "animation": "shake"}],
    "effects": ["screenShake", "flashWhite"]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "我不再知道自己在哪。森林、祭坛、壁画——一切都融化成了一片无法穿透的灰白色浓雾。我听见爱莉希雅在呼喊我的名字，但那声音越来越远，越来越轻，像是从另一个世界传来的回声。迷雾涌入了我的口鼻，我的耳朵，我的眼睛，最后涌入了我的灵魂。",
      "不知过了多久——几分钟？几小时？几天？——我发现自己站在一片完全陌生的森林中。爱莉希雅不见了。护身符的绿光已经完全熄灭。四周围绕着一模一样的古树和一模一样的迷雾，每一条路都通向另一个完全相同的场景。我在森林中永远地迷失了。脚步声和呼唤声混杂在一起，分不清哪些是我的，哪些是森林中无数前驱者的幽灵。"
    ],
    "textEffects": [
      null,
      {"effects": ["flashBlack", "vignette"], "screenEffect": "snow?density=45"}
    ],
    "effects": ["dim", "vignette"]
  },
  {
    "sceneId": "ruins_entrance",
    "type": "jump",
    "endingId": "bad_end"
  }
];

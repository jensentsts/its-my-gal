/**
 * resource-packs/default/chapters/puppet_contract.js
 *
 * Auto-converted from puppet_contract.json
 */
export const chapter_puppet_contract = [
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我手中的护身符垂了下来。绿色的光芒闪烁不定，像是我内心的犹豫在晶石上的投影。我抬起头——看着面前那张属于爱莉希雅的、被瓦尔加斯占据的脸。他的嘴角挂着一个意味深长的笑容，暗红色的眼瞳中倒映着我动摇的身影。",
    "effects": ["vignette"],
    "screenEffect": "corruption?density=30"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "瓦尔加斯感受到了我的犹豫，他的语气变得更加柔和，更加体贴——像一个真正的导师在对迷途的学生说话。\"对……就是这样。放下你祖父灌输给你的那套责任与牺牲的说教。你难道不想知道吗——真正拥有力量是什么感觉？不是像现在这样被命运推着走，而是亲手掌握命运的缰绳。\"",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "possessed", "animation": "pulse"}],
    "effects": ["dim"]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "他伸出了爱莉希雅那只白皙纤细的手，掌心向上，像是在邀请我握住它。\"只需要一个简单的接触。把你的手给我，让我引导你的灵魂进入正确的轨道。一瞬间就好了——然后，你将获得你应得的一切。\"我盯着那只手，它精致、美丽、充满了诱惑。不属于我的手——却又如此迷人。",
    "effects": [],
    "screenEffect": "corruption?density=35"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我伸出手。我的手指——粗糙的、属于人类的手指——与那只精灵的手触碰在了一起。在接触的瞬间，我感受到的不是温暖，不是力量，而是一种虚空——深渊般的、吞噬一切的空洞。",
    "effects": ["flashBlack", "screenShake"]
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "瓦尔加斯的笑声在整个祭坛中回荡。\"愚蠢的凡人！你当真以为我会与你分享力量？契约——需要的是祭品！而你的灵魂，正是我冲破最后一道封印所需的完美养料！\"他的声音从低语变成了咆哮，暗红色的光芒从我们交握的掌心迸发出来，像无数条毒蛇缠绕上我的手臂、我的肩膀、我的全身。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "possessed", "animation": "shake"}],
    "effects": ["flashWhite", "screenShake"],
    "screenEffect": "corruption?density=60"
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "player",
    "text": "一股强大的吸力从掌心传来——我的意识被拽离了身体。但这不是护身符引导的、温和的转移。这是粗暴的、撕裂般的剥离，像是有人用钝刀在我的灵魂上切割。我试图尖叫，但声音在出口之前就被黑暗吞噬了。",
    "effects": ["flashBlack", "screenShake"],
    "loseItem": "amulet",
    "loseApproach": "destroy"
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "当意识重新凝聚时，我发现自己的视野从外部看着自己的身体——我正飘浮在半空中，被无数暗红色的、半透明的丝线缠绕着。那些丝线的另一端连接着我的躯壳——不，现在已经是瓦尔加斯的傀儡了。我的身体缓缓站起，脸上挂着一个不属于我的笑容。瓦尔加斯在我原本的身体里活动着手指，满意地点头。",
    "screenEffect": "corruption?density=50",
    "effects": ["flashBlack", "dim"]
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "\"你以为附身只限于精灵的身体吗？你的躯壳虽然平凡，但作为我的临时容器也勉强够用了。至于你——\"他抬眼看着漂浮在半空中的我的透明灵魂，\"你会留在祭坛上，成为连接我与现世的锚点。永远。\"",
    "characterChanges": [{"id": "elysia", "action": "leave", "animation": "fadeOut"}],
    "effects": ["flashBlack"]
  },
  {
    "sceneId": "altar_core",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "我的意识——被剥离出来的、透明的、脆弱的意识——被栓在了祭坛的石柱上。暗影的丝线穿过了我的手腕和脚踝，将我固定在半空中，像一个悬挂在舞台上的提线木偶。我能看到、能听到、能感受到周围的一切——但无法移动，无法说话，无法做任何事情。瓦尔加斯操控着我的身体和爱莉希雅的身体并肩消失在遗迹的阴影中。",
      "祭坛恢复了寂静。只有护身符的碎片散落在石面上，反射着微弱的、即将熄灭的绿光。我被绑在自己的灵魂中，永远地注视着这空无一人的祭坛——阿瓦隆最后一道防线崩溃的地方。傀儡的契约，就是这样：你献出一切，换来的只是永恒的无尽监禁。"
    ],
    "textEffects": [
      null,
      {"effects": ["flashBlack", "dim"], "screenEffect": "corruption?density=20"}
    ],
    "effects": ["flashBlack", "vignette"]
  },
  {
    "sceneId": "altar_core",
    "type": "ending",
    "endingId": "trap_end"
  }
];

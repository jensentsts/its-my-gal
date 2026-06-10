/**
 * resource-packs/default/chapters/forest_deep.js
 *
 * Auto-converted from forest_deep.json
 */
export const chapter_forest_deep = [
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "穿过遗迹廊道后，我们进入了森林的心腹地带。周围的树木愈发古老，树干粗得需要十人合抱，树冠层叠交错，将天空切割成零碎的暗绿色碎片。爱莉希雅的脚步忽然停了下来，她的耳朵微微颤动——那对尖耳在警觉状态下会轻微地改变角度，这是我刚刚才注意到的小细节。",
    "screenEffect": "snow?density=30",
    "effects": ["vignette"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "小心！我感觉到了一股异样的魔力……是瓦尔加斯的气息。但按常理来说，他不应该能把自己的投影投射到这个区域。封印虽然弱了，但还没破。除非——",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "shock", "animation": "shake"}],
    "effects": ["screenShake"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "在她说出那个假设之前，我注意到了一些异常。空气中除了瓦尔加斯那股令人不适的暗影魔力之外，还飘荡着一缕极淡的、几乎不可察觉的另一道气息——纯净的、古老的、如同自亘古以来就在那里沉睡的某种力量。它与瓦尔加斯的邪恶形成了鲜明的对比，像是黑暗中一盏微弱的烛火。这个感知也许是在附身之后才获得的，但此刻我清楚地捕捉到了它。",
    "effects": ["dim", "flashWhite"],
    "screenEffect": "stardust?density=15"
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "爱莉希雅没有注意到我的异样——她的全部注意力都在前方那片翻涌的暗红色雾气上。\"安文，你退后。瓦尔加斯的投影比我想象中要强大得多。如果待会儿情况失控——你就带着护身符往东面跑，去找精灵长老。不要回头。\"她说话的语气不容置疑，但我听出了那语气之下的——恐惧。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "determined", "animation": "pulse"}],
    "effects": ["vignette"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "瓦尔加斯的投影从暗红色的雾气中凝聚成形，高大的暗影轮廓在林地间投射出令人窒息的压迫感。\"多么动人的一幕。精灵和人类并肩作战——就像千年前一样。可惜历史的剧本不会重演。这一次，结局由我来书写。\"",
    "characterChanges": [{"id": "vargas", "action": "enter", "spriteId": "idle", "animation": "fadeIn"}],
    "screenEffect": "corruption?density=30",
    "effects": ["flashBlack"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "暗红色的雾气像活物一般缠绕上爱莉希雅的身体。她猛地弓起腰，发出一声短促的尖叫，然后——她的身体突然僵住了。几秒之后，她缓缓直起身来，但那双淡绿色的眼睛已经变成了浑浊的暗红色。她嘴角扬起一个完全不属于她的笑容——残忍而玩味。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "possessed", "animation": "shake"}]
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "爱莉希雅！你……你的眼睛！你的声音……",
    "effects": []
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她——不对，是他——低头打量着自己的双手，活动着纤细的手指，脸上的笑容越来越深。'哈哈哈哈！这具身体……比他预想的还要完美。纤细却有力的四肢，轻盈的骨架，每一根手指都流淌着纯净的精灵魔力。安文是吧？我得感谢你。若不是你带着那枚护身符深入森林，单凭他自己还真没法突破封印的最后一层屏障。'",
    "screenEffect": "bloodmoon?density=20",
    "cgChanges": {"action": "enter", "id": "elysia_possession", "animation": "scaleIn"}
  },
  {
    "sceneId": "secret_cavern",
    "type": "dialogue",
    "characterId": "player",
    "text": "我的心脏像被一只无形的手攥住了。眼前的这个人——这具躯壳——明明是爱莉希雅，但里面的东西绝对不是她。她的手势，她的站姿，她说话时尾音上挑的腔调，完全是另一个人——一个充满恶意的闯入者。与此同时，我再次感受到了那股来自森林深处的纯净力量——它在召唤我，在指引着另一条路的方向。",
    "effects": ["screenShake"]
  },
  {
    "sceneId": "secret_cavern",
    "type": "choice",
    "text": "瓦尔加斯占据了爱莉希雅的意识！你该如何应对？",
    "choices": [
      {
        "text": "📖 翻阅祖父的日志，寻找关于附身和驱魔的记载",
        "updateItem": {"id": "log", "flag": "exorcism_ritual"},
        "jumpChapter": "possession_prelude"
      },
      {
        "text": "🗡️ 拔出祭祀匕首，试图强行驱魔",
        "jumpChapter": "desperate_route"
      },
      {
        "text": "💎 循着那股纯净的古老气息，探索森林深处的源晶密室",
        "jumpChapter": "crystal_chamber"
      }
    ]
  }
];

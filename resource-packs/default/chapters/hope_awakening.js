/**
 * resource-packs/default/chapters/hope_awakening.js
 *
 * Auto-converted from hope_awakening.json
 */
export const chapter_hope_awakening = [
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我做出了超越直觉的选择。不是躲进爱莉希雅的身体里战斗，也不是逃回自己的躯壳中求生——而是站在两个世界的交汇点上，用跨越千年的智慧作为武器。我盘腿坐下——用爱莉希雅那双修长的精灵腿——将护身符高举过头顶，闭上了眼睛。",
    "updateItem": {"id": "amulet", "flag": "ancient_prayer"},
    "effects": ["flashWhite"],
    "screenEffect": "stardust?density=45"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "壁画中的符文开始在我脑海中闪烁——不是作为记忆，而是作为活着的、呼吸着的力量。那些古老的精灵文字像种子一样在我的意识中生根发芽，它们不需要翻译，不需要理解——它们本身就是意义。我的嘴唇开始不受控制地翕动，一段古老的、从未被任何人类发声过的旋律从爱莉希雅的口中流淌而出。",
    "effects": ["flashWhite", "dim"],
    "screenEffect": "stardust?density=50"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "瓦尔加斯的反应是激烈的。在我吟出第一个音符的瞬间，他发出了凄厉的尖叫——那声音里充满了真实的恐惧。\"住口！你怎么会知道那段祷文？！那是初代守护者的禁语——连爱莉希雅都不曾学会的东西！停下来！！！\"",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "possessed", "animation": "shake"}],
    "screenEffect": "corruption?density=60",
    "effects": ["screenShake"]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我没有停下。事实上，我无法停下。祷文像是有自己的生命一般，从我的灵魂深处向上涌出，每一个音节都带动着护身符的震动频率。绿色的光芒开始变色——从浅绿变为翠绿，从翠绿变为金色，最终化为一种纯粹的、如同初升旭日般的白金色。光芒穿透了爱莉希雅的胸膛，穿透了祭坛的穹顶，穿透了笼罩阿瓦隆数百年的层层迷雾。",
    "effects": ["flashWhite", "screenShake"],
    "screenEffect": "stardust?density=60",
    "cgChanges": {"action": "enter", "id": "redemption_light", "animation": "scaleIn"}
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "瓦尔加斯的暗影被光芒从爱莉希雅的身体中一寸一寸地剥离出来。他化为一团扭曲的黑雾，在半空中挣扎、收缩、咆哮。\"不！这不可能——我是不朽的！我是永恒的！\"但光芒没有给他任何机会。黑雾像被阳光照射的冰块一样迅速消融，最终化为了一缕轻烟，被吸入了祭坛中央重新合拢的封印之中。符文锁链哗啦作响，将那团黑暗牢牢地锁回了千年的囚笼深处。",
    "characterChanges": [{"id": "vargas", "action": "leave", "animation": "fadeOut"}],
    "effects": ["flashWhite", "screenShake"],
    "screenEffect": "corruption?density=50"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "光芒渐弱，护身符恢复了温和的绿光。但我清楚地感觉到——它变了。不再只是一件遗物或工具，而是真正地与我——与我们——融为了一体。封印比任何时候都坚固，瓦尔加斯的气息完全消失了。不是被压制，不是被驱散——而是从根本上被瓦解了。",
    "effects": ["flashWhite"]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "我低下头——用爱莉希雅的眼睛看向自己的身体。那双淡绿色的眼眸正在一眨不眨地注视着我。清澈的、温和的、完全属于她自己的眼神。她回来了。爱莉希雅的灵魂已经完全苏醒，重新占据了自己的躯壳。而我还在她的身体里——我们面对面，共用着同一双眼睛的视野。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "happy", "animation": "pulse"}],
    "effects": ["flashWhite"]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她的声音在我的脑海中响起——不再是外部的声音，而是来自内部的、属于这具身体真正主人的直接交流。\"安文……我感受到了。你在我的灵魂深处吟诵的祷文——那是连我都不知道的语言。你不仅在壁画上读懂了它，你还理解了它。你比我自己还要了解这具身体里沉睡的力量。\"她的语气中没有被侵犯的愤怒，只有深深的感动和某种我无法准确描述的柔软情感。",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "sad", "animation": "bounce"}],
    "effects": ["dim"]
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "\"现在——让我把你的意识送回你的身体。你值得拥有自己的身体——你用它为我做了一切。\"她的声音温柔而坚定。我感觉到一股温和的推力——不是驱逐，而是护送。护身符发出了最后一声温润的嗡鸣，我的意识沿着那道绿色的光桥滑回了自己栖息了二十四年的躯壳之中。",
    "effects": ["flashWhite"],
    "screenEffect": "stardust?density=40"
  },
  {
    "sceneId": "ancient_altar",
    "type": "dialogue",
    "characterId": "player",
    "text": "我睁开眼。我的手——粗糙的、属于人类的手。我的身体——沉重的、熟悉的、坚实的男性躯体。我撑着地面站起来，膝盖有些发软，但稳稳地站住了。就在我面前三步之遥的地方，爱莉希雅静静地站立着。银色的长发在夜风中轻轻飘动，淡绿色的眼眸中倒映着篝火的暖光。她完好无缺。她自由了。",
    "effects": [],
    "cgChanges": {"action": "leave", "animation": "fadeOut"}
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "我们一起走出了森林——真正地、彻底地走了出来。迷雾已经完全消散。阿瓦隆的清晨，千年来第一次迎来了没有被雾气遮蔽的阳光。金橙色的晨曦洒在林地间，每一片叶子都挂着露珠，闪闪发光。爱莉希雅站在我身边，第一次对着我露出了毫无保留的微笑——那个笑容里有释然、有感激，还有一种说不太清道不太明的东西。",
    "characterChanges": [{"id": "elysia", "action": "enter", "spriteId": "happy", "animation": "fadeIn"}],
    "screenEffect": "sakura?density=40,color=#ffb7c5",
    "effects": [],
    "cgChanges": {"action": "enter", "id": "avalon_seal", "animation": "scaleIn"}
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "她转过身，面对着我，银色的睫毛上沾着晨露的光芒。\"安文……我不知道该怎样感谢你。你进入了我最私密的空间——我的身体，我的灵魂——但你用尊重和勇气对待了它们。你不仅驱散了瓦尔加斯，还让我看到了自己从未意识到的力量。\"她顿了顿，声音低了一些，\"我会记得你——记得你的温度，你的声音，你的坚定。在每一片树叶的沙沙声中，在每一缕穿过林间的阳光里。\"",
    "characterChanges": [{"id": "elysia", "action": "update", "spriteId": "happy", "animation": "pulse"}],
    "effects": ["vignette"]
  },
  {
    "sceneId": "forest_gate",
    "type": "dialogue",
    "characterId": "player",
    "texts": [
      "我看着她的面庞，在晨光中美得不真实。我本想说什么——也许是道别，也许是承诺——但最终只是微笑着点了点头。有些纽带不需要语言来维系。我低头看向胸前的护身符——它安静地悬挂着，光芒已经完全内敛，像一颗沉睡的种子。它的任务完成了。我和她的故事，在另一个层面上，才刚刚开始。",
      "破碎的迷雾终于完全散去，阳光普照在阿瓦隆的大地上。我用两代人的守护与传承，换来了这一刻——璀璨的破晓之光。"
    ],
    "textEffects": [
      null,
      {"effects": ["flashWhite"], "screenEffect": "sakura?density=50,color=#ffb7c5"}
    ],
    "effects": ["dim"],
    "screenEffect": "sakura?density=35,color=#ffd700"
  },
  {
    "sceneId": "forest_gate",
    "type": "ending",
    "endingId": "hope_end"
  }
];

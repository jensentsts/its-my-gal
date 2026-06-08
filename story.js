// story.js

// 全局结局元数据定义库（供首页结局收集墙与局内终章匹配使用）
window.ENDINGS = [
    {
        id: "bad_end",
        title: "BAD END: 迷失于永恒之雾",
        description: "你未能在错综复杂的森林线索中找到出路。浓雾侵蚀了你的心智，你成为了森林中无数徘徊幽魂中的一员。"
    },
    {
        id: "ruin_end",
        title: "BAD END: 灰烬世界",
        description: "远古炎魔的怒火撕裂了苍穹。贪婪蒙蔽了凡人的双眼，阿瓦隆森林乃至整个大陆都在烈焰中化为了焦土。"
    },
    {
        id: "trap_end",
        title: "BAD END: 傀儡的契约",
        description: "你轻信了瓦尔加斯的低语。灵魂被剥离，躯壳化为了祭坛上永世无法离开的提线木偶。"
    },
    {
        id: "true_end",
        title: "TRUE END: 阿瓦隆的新晨",
        description: "成功地将古老魔晶带回。破晓的曙光撕裂了笼罩数百年的迷雾。你与爱丽希雅并肩而立，世界迎来了久违的平静与真相。"
    },
    {
        id: "dark_possession_end",
        title: "至暗结局·永夜的低语",
        description: "面对被附身的爱丽希雅，你未能找到驱魔的方法。瓦尔加斯彻底占据了她的灵魂，精灵守护者成为新的黑暗载体，迷雾森林陷入永恒的绝望。"
    },
    {
        id: "redemption_end",
        title: "救赎结局·灵魂的觉醒",
        description: "你从祖父的日志夹层中发现了驱魔祷文，借助灵魂晶石的力量唤醒了她深处的自我。黑暗被驱散，她流下感激的泪水，你们共同重建了阿瓦隆的希望。"
    },
    {
        id: "elf_body_end",
        title: "精灵之终·永恒的守护",
        description: "在精灵之躯中度过了漫长的时光，你与她的意识达成了和谐。你选择留在她的体内，以精灵守护者的身份继续守护森林。两种意志融为了一体，阿瓦隆迎来了新的传说。"
    },
    {
        id: "human_love_end",
        title: "人间之终·温暖的归宿",
        description: "经历了两种躯体的附身之后，你在莉娜纯真的善意中找到了归属。你放下了祖父的使命，选择在边境小镇与她共度余生。每个黄昏，你都会握着她的双手，感激命运让你懂得了不同生命的美好。"
    },
    {
        id: "knight_end",
        title: "骑士之终·边境的黎明",
        description: "在赛拉菲娜的躯体中，你亲历了边境战场的残酷与荣耀。你赢得了整个骑士团的尊敬，带领他们击退了黑暗势力的入侵。当朝阳从边境线升起，你以骑士之躯立于城墙之上，一个新的传奇诞生了。"
    }
];

const STORY_CHAPTERS = {
    // ======================= 序章：迷雾之邀【扩展版】 =======================
    "main": [
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "深夜。酒馆的炉火已经快要熄灭，只剩下暗红色的余烬在壁炉中明灭不定。我将酒杯放到一旁，再次翻开祖父安德鲁留下的那本航海日志。封皮已经被岁月和海风磨得柔软，边角卷起了毛边。",
            effects: ["vignette"],
            screenEffect: "rain?density=25,speed=40,wind=0.3",
            cgChanges: { action: "enter", id: "old_photo", animation: "scaleIn" }
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "翻到中间某一页时，一张泛黄的旧照片从书页间滑落。照片上，祖父年轻时的面孔依旧清晰，他身旁站着一个银发的身影——那是一位精灵女子，眼睛在黑白照片中依然显得明亮得不可思议。",
            cgChanges: { action: "update", animation: "pulse" }
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我翻过照片，背面写着一行褪色的钢笔字：'赠予我最挚爱的森林挚友——愿迷雾永远不能将我们分离。'落款是祖父的名字，日期是整整四十年前。我的手不自觉地握紧了书脊。",
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我继续翻阅日志。前面大部分内容都是航海记录和贸易账目，但在最后的几页，祖父的字迹突然变得潦草而急促。他反复提到一个名字——阿瓦隆，迷雾森林。还有几个被圈起来的词：'意识共鸣'、'灵魂晶石'、'附身之术'……",
            effects: ["dim"]
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "祖父在日志中写道：'我发现了。这不是诅咒，而是一种能力。灵魂并非只能困在自己的躯壳之中。只要找到正确的共鸣频率，意识便可以流动——像水从一只杯子倒入另一只。我成功了，但也因此欠下了一笔无法偿还的债。'",
            effects: []
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我合上日志，深吸了一口气。窗外是茫茫夜色。父亲临终前的话回荡在耳边：'去阿瓦隆，去找你祖父留下的东西。那不是宝藏，而是一份责任。'那时候我不明白。现在我隐约有些懂了。",
            effects: ["vignette"]
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我将日志和照片收进怀中，背起行囊推开了酒馆的木门。夜风吹来，带着森林远处潮湿的草木气息。前方通往阿瓦隆的小路在月光下蜿蜒，像一条银蛇隐入黑暗的树影之中。",
            screenEffect: "snow?density=30,speed=40",
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "走了大约两个时辰，林木逐渐变得高大而古老。树冠密密地交织在一起，连月光也只能从缝隙中洒下零星的碎片。空气中弥漫着一种说不清的清冷感——不是寒冷，而是某种超越自然的灵性存在。",
            screenEffect: "snow?density=35,speed=35,wind=0.2",
            effects: ["dim"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "就在我停下脚步辨认方向的一刻，一道白影从前方的雾气中缓缓浮现。起初只是一团模糊的光晕，然后轮廓渐渐清晰——纤细的身形、及腰的银发、一双在黑暗中泛着淡绿光芒的眼睛。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "停下脚步，凡人。前方是阿瓦隆迷雾森林的禁地。凡人的足迹在此处只会迷失方向，然后永远成为林间游荡的幽魂。",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "她站在距我十步之遥的地方，一身素白长袍在夜雾中微微飘动。她的脸在月光下近乎透明——颧骨微微凸起，下颌线条优美而纤细，精灵特有的尖长耳朵从银色发丝间探出，耳尖处的弧度像是被精心打磨过的玉石。她整个人站在那里，既像森林的守护神，也像森林本身。",
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "我慢慢从怀中取出那本日志，翻到扉页上祖父的名字，高高举起让她看清。我是安德鲁的孙子，我叫安文。祖父四十年里从未停止谈论这片森林，还有……那些守护它的人。",
            loseItem: "log",
            loseApproach: "handOver"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "（她的瞳孔猛然收缩。那双翡翠色的眼睛在夜色中闪动了一下，像是被投入石子的深潭。）安德鲁……你说你是安德鲁的后代？",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "是的。我父亲去世前让我来找祖父当年留下的东西。他说那是一份责任。我看不懂日志最后的几页内容，所以才来到这里。",
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "（她走近了几步，衣袍的下摆拂过地上的蕨草。借着月光，我看清了她脸上复杂的表情——惊讶、怀念、警惕，还有一种深藏的悲伤。）你的眼睛……和安德鲁一模一样。那个老骗子，他答应过我会回来的。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "pulse" }]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "我叫爱丽希雅。三百年来，我是这片森林唯一的守护者。四十年前，你祖父曾误打误撞闯入了森林深处。他不仅没有迷失，还帮我击退了一次魔族的入侵。也是在那时，他在祭坛中发现了灵魂共鸣的秘密。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "森林正在再次枯萎。封印在上古遗迹中的魔族领主瓦尔加斯正在挣脱束缚。跟我来，安文。但我必须警告你——你祖父当年跨过的那道门，一旦踏入，就没有回头路了。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "determined", animation: "fadeIn" }]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "她从长袍内侧取出一柄短匕，递到我面前。匕首通体暗银，刃面上刻满了弯弯曲曲的术式纹路。这是安德鲁当年托我保管的祭祀匕首。它本来就是你的。",
            gainItem: "dagger",
            gainApproach: "receive"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "我接过匕首。入手的一瞬间，掌心的护身符忽然微微发热——那颗一向黯淡的晶石竟然闪过了一丝绿光。爱丽希雅的目光也落在那枚护身符上，嘴唇轻微地动了一下，但没有说什么。",
            gainItem: "log",
            gainApproach: "receive",
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "远古遗迹在这个方向。路上我会告诉你关于瓦尔加斯的事——以及为什么你祖父当年会选择进入那个禁忌的领域。",
            jumpChapter: "ruins_exploration"
        }
    ],

    // ======================= 遗迹探索 & 壁画解读【扩展版】 =======================
    "ruins_exploration": [
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "爱丽希雅领着我穿过一片茂密的荆棘丛，前方豁然开朗。一座由巨大青石砌成的古老门廊从藤蔓中露出轮廓。石柱上爬满了发出微光的苔藓，将整个入口笼罩在一片诡异的蓝绿色光晕中。",
            effects: ["dim"],
            screenEffect: "snow?density=20,speed=20",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "这里是远古种族的遗迹。他们在数千年前就掌握了灵魂共鸣的技艺，但最终因为滥用而被反噬。这些石壁上刻着的，就是当年留下来的记录。",
            effects: []
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "我举高火把，照亮了廊道两侧的石壁。壁画在火光下呈现出惊人的精细度——画面上描绘着一个人影从一个躯体转移到另一个躯体的过程。线条流畅而准确，作画者的功底远超我见过的任何古代文明。",
            effects: ["vignette"],
            cgChanges: { action: "enter", id: "ancient_mural", animation: "scaleIn" }
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "不对……这些不只是画。壁画上的人影周围分布着密密麻麻的符号和箭头，像是一套完整的方法论。我凑近去看，发现其中一组符号与祖父日志夹层中的那些标记完全吻合。",
            cgChanges: { action: "update", animation: "pulse" }
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "（她突然伸手挡住了我的视线）不要直视中间那些符号太久。壁画中蕴含的能量至今还有残留。你祖父当年就是在这些壁画前站了整整一天一夜，然后他就忽然明白了该怎么做了。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "我退后半步，但目光仍然无法从那些符号上移开。壁画的核心位置描绘着两具躯体之间被一道光连接，而那道光的中间悬浮着一枚菱形晶石——与我护身符上那颗几乎一模一样。",
            effects: []
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "（她看了我一眼，似乎在权衡什么。然后她缓缓走向壁画左侧的一个暗格，以指尖在石壁上划出一道复杂的轨迹。）你祖父当年在这里藏了一样东西。他告诉我，如果有一天他的后人来到这里，就把它拿出来。",
            screenEffect: "stardust?density=30",
            effects: ["dim"]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "暗格在轻微的石块摩擦声中打开了。里面是一枚拳头大小的半透明晶石，内部有银白色的光丝在缓缓流动。我伸手触碰它的瞬间，整个手臂都感受到了一种奇异的震颤——不是震动，而是某种更深层面的共鸣。",
            gainItem: "spirit_crystal",
            gainApproach: "unlock",
            cgChanges: { action: "enter", id: "spirit_crystal_glow", animation: "scaleIn" }
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "灵魂共鸣晶石。只有拥有特定血脉的人才能激活它。你祖父当年说过，你们家族的血脉中流淌着一种罕见的灵魂亲和力——能够与另一个人的意识频率产生谐振。",
            effects: []
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "我将晶石小心地收入内袋，与护身符放在一起。两者之间立刻产生了一种温和的脉动，像两颗心脏在彼此呼应。祖父研究的东西远比我想象的要深远——这不是简单的魔法，而是一种触及生命本质的技艺。",
            updateItem: { id: "log", flag: "read_ancient_mural" },
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "ruins_entrance",
            type: "choice",
            text: "壁画中的信息远超你的预期。你选择：",
            choices: [
                {
                    text: "🧠 仔细研究壁画中的意识转移流程（获得核心知识）",
                    updateItem: { id: "spirit_crystal", flag: "first_resonance" },
                    jumpChapter: "forest_deep"
                },
                {
                    text: "🏃 跟随爱丽希雅继续深入森林（保持警惕）",
                    jumpChapter: "forest_deep"
                }
            ]
        }
    ],

    // ======================= 森林深处·黑暗的低语与初次附身 =======================
    "forest_deep": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "穿过遗迹廊道之后，我们步入了一片更加幽暗的密林。这里的树木巨大得不可理喻，树干粗得需要十几个人才能合抱。树冠遮蔽了天空，只有偶尔从叶片缝隙中漏下的一两缕微光证明了头顶还有星辰存在。",
            effects: ["vignette"],
            screenEffect: "snow?density=25,speed=25",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "（爱丽希雅忽然停住了。她的耳朵以微不可察的幅度转动了一下，像一只察觉到危险的鹿。）等等。有东西在靠近。不是野兽。是暗影魔力。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "空气在下一刻变得沉重起来。像是有一只无形的手压住了我的胸口，呼吸变得困难。周围的树木开始发出低沉的声响，那不是风吹树叶的声音，而更像是某种痛苦的呻吟。",
            screenEffect: "corruption?density=20",
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "呵呵呵呵……三百年了。终于有新鲜的灵魂踏入了这片土地。而且——（他的声音突然变得兴奋）——我嗅到了安德鲁那混账的后代的气息！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            screenEffect: "corruption?density=30",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "瓦尔加斯。你的封印还没有完全解除，你不过是一道意识残影罢了。退回去！否则我会把你剩下的碎片也一并驱散！",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "determined", animation: "bounce" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "（一阵低沉的笑声从四面八方涌来，紫黑色的雾团在树影间凝聚成一个高大的人形轮廓。）没错，我现在确实不够完整。但这不正好吗？你的身体——三百年的精灵守护者，充满了阿瓦隆的本源魔力——正是我最需要的容器！",
            characterChanges: [{ id: "vargas", action: "update", spriteId: "angry", animation: "shake" }],
            screenEffect: "bloodmoon?density=20"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "（她的双手在胸前交叠，翠绿色的魔力开始在指尖汇聚。）我不会让你得逞的。以精灵守护者之名，以阿瓦隆的意志——退散！",
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "一道刺目的绿光从爱丽希雅的掌心迸发而出，直直撞向那团紫黑色的雾气。两股力量碰撞的瞬间，空气中炸开一圈肉眼可见的冲击波。我被震退了好几步，后背重重地撞在一棵巨树上。",
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "可笑！凭这点力量也想阻拦我？（暗影不仅没有被驱散，反而像活物一样缠绕上了爱丽希雅的双臂）我说过了——你的躯体，我要定了！",
            screenEffect: "corruption?density=40",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "不——！安文！快跑！他的目标是用我的身体——不要让他——（她的声音被一股从口中溢出的暗紫色光雾所淹没，身体剧烈地抽搐起来。）",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "shake" }],
            effects: ["flashWhite", "screenShake"],
            screenEffect: "bloodmoon?density=35"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "那一瞬间，我体会到了什么叫真正的恐惧。不是对死亡的害怕，而是眼睁睁看着一个活生生的人被从内部吞噬的窒息感。我的手不受控制地按在了胸口——护身符在燃烧，灵魂晶石在发出刺耳的蜂鸣。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "然后我明白了。祖父日志里的那些潦草字迹。壁画上的那些符号。灵魂亲和力。意识共鸣。所有的一切在我脑中闪电般地串联在一起。这不是用来攻击的方法。但这是我唯一的武器。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我攥紧了灵魂晶石，另一只手握住了护身符。晶石内部的银白光丝剧烈跳动，护身符的绿光则化作了无数纤细的光丝缠绕住我的手臂。我集中全部注意力，将目光锁定在爱丽希雅身上——不是在看她的外表，而是在寻找她内在意识的频率。",
            screenEffect: "stardust?density=50",
            effects: ["vignette"],
            cgChanges: { action: "enter", id: "elysia_possession", animation: "scaleIn" }
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "然后它发生了。一道无法形容的牵引力从晶石中涌出，像是一只温暖的手探入了我的意识深处——不是拉扯我的灵魂离开身体，而是将我与另一个生命的存在通道连接在了一起。我看到了爱丽希雅的意识，那是一团温暖的翡翠色光辉，正在被紫黑色的暗影紧紧缠绕。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "共鸣在一刹那达成。没有声音，没有光芒，没有任何戏剧性的特效。只有一个短暂的失重感——像是从悬崖上踏出一步的那个瞬间——然后我的整个世界都变了。",
            effects: ["flashWhite", "screenShake"],
            screenEffect: "stardust?density=60",
            updateItem: { id: "spirit_crystal", flag: "first_resonance" }
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我的身体——安文的身体——软软地倒在了身后的树干上，眼睛失去了神采。而我的意识，我全部的感知，已经完完全全地转移到了面前这具躯体之中。",
            effects: ["dim"],
            characterChanges: [
                { id: "elysia", action: "update", spriteId: "possessed", animation: "pulse" },
                { id: "vargas", action: "leave", animation: "fadeOut" }
            ],
            screenEffect: "stardust?density=25",
            jumpChapter: "elf_body_exploration"
        }
    ],

    // ======================= 精灵之躯：全新的感知世界【核心附身章】 =======================
    "elf_body_exploration": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我张开眼睛——不对，应该说是"她"张开了眼睛。但控制这具躯体、接收这些感官的，是我的意识。安文的意识。而瓦尔加斯的暗影已经在我进入的瞬间被晶石的力量震散了。",
            effects: ["dim"],
            screenEffect: "stardust?density=20"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "这种感觉……很难用语言来描述。你知道自己是谁，你知道你曾经是什么样的，但你现在感受到的一切——肌肉的重量、骨骼的结构、皮肤上掠过的气流——全部属于另一个人。一个女性。一个精灵。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我低下头，看到了垂落在胸前的银色长发。发丝轻柔得像最上等的丝绸，每一根都在微弱的月光下泛着柔和的银辉。这与我的短发——干练、粗糙、时不时扎到眼睛——是完全不同的体验。这些长发贴着脸颊滑落的感觉像水一样温柔。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我试着抬起手。一只纤细的手从长袍的袖口伸了出来。手指细长，每一根都像是精心雕刻的工艺品。指甲圆润整齐，皮肤薄得能隐约看到下面青色的血管纹路。我将这只手举到眼前，缓缓地握拳、展开——每一根手指的运动都比我的原生躯体灵活得多，关节的活动范围更大，仿佛少了一层阻碍。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "精灵的手。这双手的手指比我记忆中自己的手长出了将近一个指节。更重要的是——它们没有我手上的茧。二十二年来因为握笔、拉绳、攀爬而磨出的薄茧，在这里完全不在了。掌心柔软光滑，指腹的触感敏锐得令人眩晕。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我沿着手臂向上摸去。前臂纤细，腕骨突出得恰到好处，皮肤下的肌肉线条清晰但不过于发达。当我的手滑过肘弯、触及上臂的时候，差异就更加明显了——这双臂的力量感远不如我自己锻炼有素的上臂，但它轻，轻得像是只需要最小的力气就能做出最精细的动作。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "然后我注意到了肩膀。我下意识地耸了耸肩——肩头的肌肉运动轨迹与我熟悉的完全不同。我的肩膀原来比这宽出不少，锁骨到肩峰的距离更长，整个人有更开阔的肩架。而现在这副肩膀窄了、圆润了，每一步手臂的活动范围都因此而调整了角度。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "还有胸口。重量。这是我意识到的第一个突破性差异。一个我之前作为男性从未体会过的持续物理存在——胸腔前方的柔和重量。不算沉，但每时每刻都在。每一次呼吸、每一步移动，它都以一种轻微但不可忽略的方式参与着身体的平衡。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我缓缓地深吸了一口气，感受着这具身体呼吸的方式。胸腔扩张的幅度比我原本的要小，但呼吸带动的范围却更向下延伸，似乎膈肌降得更低。每一次吸气都将一种奇异的清新感注入全身——那是精灵的敏锐感官在起作用，连空气的质地都能察觉。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "还有耳朵。不是外在的形状——虽然尖长的耳廓在余光中确实是一个陌生而美丽的轮廓——而是听力本身。我听到了之前完全听不到的声音：数十步外蜘蛛在树皮上爬行的窸窣声、头顶叶片中水分蒸发的细微沙沙声、甚至脚下泥土里蚯蚓蠕动的湿润声响。整个世界变成了一座无限精细的声学殿堂。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我伸手摸了摸自己的耳朵。指尖滑过耳廓上半部，沿着那道优美的尖弧一路向上。精灵的耳朵比人类的更长、更尖、更灵活。我只是轻微地想了想，耳尖就不自觉地轻颤了一下——这是人类永远做不到的微动作。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "然后是视觉。我抬头望向树冠间的缝隙。之前作为安文，我只能看到暗绿色的模糊剪影。而现在我能分辨出每一片叶子的纹理、叶脉的走向、以及叶片背面附着的细小水珠在微风中晃动的轨迹。精灵的眼睛天生就是为森林而造的。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我试着迈出第一步。这是最奇异的部分。双腿的发力方式完全不同。我原来的腿——粗壮、有力、膝盖以下略微外翻——迈步时重心从脚跟滚动到前脚掌，稳健但沉缓。而这两条腿更细、更直，脚踝的内外侧活动范围更大，迈步的触地点则更倾向于前脚掌。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "还有一个需要立刻适应的——腰。这具身体的腰部窄得令人难以置信。我低头看下去，双手贴在自己的腰侧，几乎能将这截腰身完全环住。与此形成对比的是，腰以下的曲线向外扩展，髋部的宽度明显大于我原本的身形。这意味着整个身体的重心比我习惯的位置低了大约一截。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我走了几步，像学步的婴儿一样笨拙地适应着新的重心。臀部的重量感、大腿的走向、膝盖的内收角度——一切都与之前不同。精灵的步态天然带着一种轻盈的韵律，每一个落脚点都精准而安静。这副躯体不会像我的身体那样在草地上留下沉重的脚印。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我放慢脚步，低头审视着这具身体的腿和脚。裸露的脚踝纤细得近乎脆弱，踝骨的轮廓在薄薄的皮肤下清晰可见。小腿修长而线条流畅，肌肉不是凸起的块状，而是细细地贴合在骨骼上的流线型。膝盖小巧，不像我原来的膝盖那样——每次屈伸都能听到轻微的关节响声。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "脚。精灵的足部窄而修长，足弓高高隆起。我抬起一只脚仔细审视——脚趾细长整齐，第二根脚趾略长于大脚趾，趾间的皮肤薄得透着粉色。整个脚掌的皮肤细嫩光滑，没有任何磨损的痕迹。这双脚不曾像人类那样在粗砺的靴子里闷出老茧，它们生来就是赤足踏在森林的苔藓和落叶上的。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我站直身体，将手掌放在腹部。平坦、紧致，腹肌的线条在指腹下隐约可辨。这不是我那种通过体育锻炼堆起来的块状腹肌，而是一种天然的、参与每一次呼吸和身体活动的柔韧力量。肚腹的皮肤温暖而柔软，手指按下去能感受到腹腔深处的微微温热。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "还有头发——不只是垂在胸前的那一束。我转过头，银色的长发随之摆动，扫过后腰。发丝的长度达到腰际以下，发量丰厚但每一根都极细。我将手绕到颈后，捧起一整把头发——轻盈得像一捧月光，几乎没有重量感，但数量之多足以覆盖整个背部。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我去摸自己的脸。这双手指循着颧骨、下颌、眉弓缓缓移动，绘制出一张不是我的脸的面孔。颧骨微耸但不突兀，下颌窄而圆润，额头光洁饱满，眉毛细长而弧度优美。嘴唇比我原本的薄了不少，但更柔软，用舌尖触碰时能感到细腻的湿润感。这张脸的皮肤细滑到指尖几乎无法感知到任何阻力。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "然后一阵特别的感受出现了。在安文的身体木然瘫坐在树下的同时，爱丽希雅原本的意识——那团翡翠色的光——正在这具躯体深处安静地沉睡着。她没有苏醒的迹象，也没有任何挣扎或者抗拒的信号。她只是在那里，像一颗被温柔包裹的种子，等待合适的时候发芽。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "而我——安文——则完全控制着这具身体。从头顶到脚尖，每一块肌肉、每一个感官、每一次呼吸都在我的意志之下。就像穿上了一件最合身的外衣，但这件外衣拥有自己的体温、心跳和记忆。",
            effects: ["dim"],
            screenEffect: "stardust?density=15",
            jumpChapter: "forest_battle"
        }
    ],

    // ======================= 森林中的战斗·以精灵之躯 =======================
    "forest_battle": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "（暗影在林间的不远处重新凝聚，但比之前明显虚弱了许多）你……你做了什么？你怎么会——那个老东西居然把共鸣的方法传给了你？！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "fadeIn" }],
            screenEffect: "corruption?density=20"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "（我开口说话，从这具精灵躯体中发出的声音让我自己都愣了一瞬。那是轻柔的、带着清澈回响的嗓音，与我低沉的中年男音截然不同。）瓦尔加斯，你的时机选错了。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我抬起右手——这只纤细的精灵的手。在进入之前我只是旁观了爱丽希雅使用魔法，而现在，我能清晰地感受到这具身体中流淌着的魔力。那不是需要学习的东西，它就是这具身躯的一部分，像是血液、像是呼吸。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我张开手指，意念一动——翠绿色的魔力从掌心迸发而出，比爱丽希雅之前驱动的更强、更集中。因为这一次，除了身体本能的魔法回路，还有我安文的意志在驱动——一个学者的精确、一个战士的决心。",
            screenEffect: "stardust?density=40",
            effects: ["flashWhite"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "不可能！你只不过是一个凡人，怎么可能掌控精灵的魔力——（他的话音被一股极强的绿光冲击波打断，暗影雾气被当场撕裂出一个巨大的裂口。）",
            characterChanges: [{ id: "vargas", action: "update", spriteId: "angry", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "（我感受着魔力从身体的深处——丹田以下、胸口正中、掌心——同时涌出的澎湃感。人类的身躯永远不会有这种感觉。这是一种纯粹的生命力在体内奔涌，像是有一条翠绿色的河流在血管中流动。）这不是精灵的魔力。这是阿瓦隆在通过她回应我。",
            effects: ["flashWhite", "screenShake"],
            screenEffect: "stardust?density=50"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "（暗影在一阵凄厉的尖啸声中散逸开来）我记下你了……安文！等你从这个躯壳中出来的时候，我会找到你的……（声音逐渐在空气中消散。）",
            characterChanges: [{ id: "vargas", action: "leave", animation: "fadeOut" }],
            screenEffect: "corruption?density=10"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "暗影散尽。森林重新陷入了宁静。我站在原地——精灵的躯体仍然微微发着绿光，魔力回路的余波让指尖有种轻微的酥麻感。我看了看自己瘫软在树下的原身，胸膛仍在规律地起伏。活着，只是没有了意识。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我需要思考接下来的事情。我的原身需要保护。爱丽希雅的意识需要恢复。瓦尔加斯虽然被暂时击退，但森林枯萎的根源仍然存在。而现在——我低头看着这双纤细白皙的、正在微微发光的手。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "我做出了决定。暂时不能离开这个身体。瓦尔加斯随时可能卷土重来，而爱丽希雅需要时间恢复。这具精灵的躯体拥有足够的力量和感官来应对当前的一切。安文的身体就先安置在安全的遗迹中。",
            effects: ["vignette"],
            jumpChapter: "elf_deep_experience"
        }
    ],

    // ======================= 精灵生活的深度体验 =======================
    "elf_deep_experience": [
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "将安文的身体安置在遗迹内部的保护结界中之后，我以爱丽希雅的姿态走入了森林更深处的秘境圣坛。这里是她——也是我——平日的居所。泉水从石缝中细细流下，汇入一汪清澈见底的水池。周围的树木自发地弯曲形成了天然的回廊和穹顶。",
            screenEffect: "snow?density=15,speed=15",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我走到水池边，低头看向水面。月光恰好从穹顶的缝隙中洒下，照亮了水中的倒影。一位精灵少女正从水面中看着我——银发如瀑，翠眸如星，白色的长袍在肩头微微滑落，露出纤细的锁骨。那是爱丽希雅的脸，但那双眼睛里的神情是安文的。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我伸出手拨动水面，倒影碎成了千万片光点。长袍的袖子浸入水中，冰凉的泉水漫过纤细的手腕——皮肤对温度的敏感度比我原本的躯体高出了不止一个层次。每一度的水温变化都清晰得像写在皮肤上的刻度。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我在水池边坐了下来。这个动作本身就是一个全新的体验。由于骨盆的宽度不同，坐下时双腿自然并拢的角度更小，大腿内侧接触的面积更大。臀部的软组织提供了比男性躯体更厚的缓冲，坐在石面上并不觉得硌。但与此同时，缺少了男性躯体在臀部的肌肉支撑，久坐后的酸胀感分布也完全不一样。",
            effects: []
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我将注意力转向内部。闭上眼睛，将意识沉入这具身体的深处。我能够感知到爱丽希雅的意识——她在那里，沉睡在她的身体最深的角落里，像一团蜷缩的翡翠色光晕。温暖、安静，但没有消失。我小心地绕开了她，不去触碰那一部分。这是她的领地。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "当我睁开眼睛，我不由自主地盯着自己的腿看。原来只需轻微的动作，那双腿就会呈现出完全不同的轮廓：并拢时修长而温顺；分开时大腿内侧的皮肤在月光下泛着柔和的光泽。膝盖微微弯曲时，小腿肚的线条像一笔挥就的流畅曲线。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "精灵的身体几乎没有体毛——这是我在仔细审视自己手臂和腿部时发现的。皮肤光滑得像打磨过的瓷器，连汗毛都细到肉眼几乎不可见。唯一的例外是头顶的银色长发，以及睫毛和眉毛——这三处的毛发反而比人类的更加浓密纤长。",
            effects: []
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我还注意到皮肤的温度偏低。我用手掌贴着另一只手的手背，感受到的温度大约比我原先的体温低了一些。不是冷，而是一种温和的凉意，像是被清晨的露水打湿过的花瓣。这或许是精灵族的特性——适应在密林深处终年不见阳光的环境。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我决定探索更多。我解下长袍的系带，让衣襟自然地敞开。月光照在锁骨和肩头的皮肤上，泛起一层的淡银色光泽。用手指沿着锁骨走向向外抚摸——骨头的弧度柔和而优雅，肩膀与颈部的交汇处形成一个精致的凹陷。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "再往下——腰肢的线条向内收拢，形成一道几乎夸张的弧线。我张开双手量了一下腰的宽度。两只手掌几乎可以完全环绕——这还是将拇指尖和食指尖轻轻搭在一起的情况下。而髋部的宽度则正好相反，胯骨向外展开的弧度明显大于男性骨盆，形成鲜明的对比。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "腹部的中央有一条颜色稍浅的线纵贯而下，这是人类女性躯体常见但男性身上不存在的特征。指尖沿着这条线轻轻划下去，腹部肌肉不自觉地向内收紧——这具身体对外界触碰的反射比我原来的要敏感。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "再往下——我停顿了片刻。这是最大的差异。作为安文时，那是存在了二十二年的熟悉感，一个每时每刻都在但不被特别注意到的事实。而现在它是缺席的。取而代之的是一种内收的、紧凑的结构。小腹下方的感觉是平坦而柔软，没有任何外在的凸起。双腿并拢时的大腿根部比男性躯体闭合得更紧密。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "这是根本性的不同。不是程度上的，而是种类上的。我不再拥有男性的身体，而是完全地、彻底地处于一个女性的躯体之中。这个认知并不令人恐惧，反而激起了一种深处的好奇——这是祖父研究了一生的奥秘，如今我亲身经历着它。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我重新系好长袍。站起来的时候，身体的感觉已经比刚才自然了一些。每一步踩在苔藓上，足底的柔软触感都是新的发现。脚趾在潮湿的苔藓上自然展开又合拢——这双脚生来就没有穿过鞋，它们与大地之间没有任何隔阂。",
            effects: []
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "一夜过去。当清晨的第一缕微光穿过层层树冠洒在圣坛的水面上时，我已经基本适应了这具身体的日常运作。走路不再踉跄，手指的精细动作也没有了最初的笨拙。但战斗时的魔力调用和应急反应还需要更多的练习。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我同时也发现了一些之前没有预料到的细节：精灵的身体不需要像人类那样频繁进食。从昨晚到现在，我几乎没有感到饥饿。取而代之的是一种与周围植物的隐约共鸣——阳光照在皮肤上时，身体似乎能从中直接汲取一部分所需的能量。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "还有——情绪。这具身体对情绪的反馈比我原来的要强烈。当我看到一只小鸟落在树枝上时，胸中涌起的那种柔软的喜爱比我记忆中的任何一次都更浓烈。当我想到瓦尔加斯的威胁时，愤怒来得更快也更滚烫。荷尔蒙的差异——无论是种类还是浓度——都在深刻地影响着我的情感反应。",
            effects: []
        },
        {
            sceneId: "forest_shrine",
            type: "choice",
            text: "在新身体中适应了一夜之后，你需要决定下一步的行动方向：",
            choices: [
                {
                    text: "🗡️ 以精灵身份深入调查瓦尔加斯的封印（战斗路线）",
                    updateItem: { id: "dagger", flag: "dagger_awakened" },
                    jumpChapter: "investigate_seal"
                },
                {
                    text: "🏘️ 前往边境小镇获取更多信息和资源（探索路线）",
                    jumpChapter: "town_entrance"
                }
            ]
        }
    ],

    // ======================= 调查封印·战斗路线 =======================
    "investigate_seal": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "以爱丽希雅的身份穿过森林深处，我来到了封印瓦尔加斯的古代祭坛。这里的空气中弥漫着浓郁的暗影魔力，石壁上紫黑色的纹路像血管一样跳动着。封印确实在松动——比我预想的还要严重。",
            screenEffect: "corruption?density=25",
            effects: ["vignette"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "我抽出祭祀匕首。在精灵的魔力注入下，刃面上的术式开始发出淡蓝色的荧光。那些古老的精灵文字——'意志为引，血肉为门'——此刻在我眼中亮得像暗夜中的灯塔。",
            updateItem: { id: "dagger", flag: "dagger_awakened" },
            effects: ["dim"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "在祭坛的中心，我看到了一块裂开的封印石。暗影魔力正从裂缝中汩汩渗出。我跪下身，用精灵纤细的手指触摸封印石的表面。指尖传来一阵刺骨的寒意——那是瓦尔加斯残留的情绪：愤怒、贪婪、还有对躯体的无尽渴望。",
            effects: ["vignette"],
            screenEffect: "corruption?density=35"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "必须重新加固封印。但这需要精灵守护者的全部力量——以及那把祭祀匕首作为引导媒介。我深吸一口气，感受着身体深处的魔力回路开始运转。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "（低沉的声音从裂隙中传出）你以为你赢了？就算你重新加固封印，我能感受到……你并不是真正的精灵守护者。你的灵魂频率在波动……矛盾……有趣。",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "不需要回应他。我将全部注意力集中在封印术式上。匕首在空中划出复杂的轨迹，每一条线都留下淡蓝色的光痕。精灵的魔力通过这双纤细的手稳定地流入封印石，将紫黑色的裂缝一处处封堵。",
            screenEffect: "stardust?density=40",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "当最后一个术式落位时，封印石发出了一声深沉的嗡鸣。紫黑色的纹路从石壁上褪去，取而代之的是重新亮起的银白色守护符文。祭坛周围的暗影魔力被压缩回到了裂缝之中，短时间内无法再溢出了。",
            effects: ["vignette"],
            screenEffect: "stardust?density=20"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "但我知道这只是权宜之计。封印石本身已经严重受损，下一次碎裂时，仅凭精灵的魔力将不足以再次压制。我需要找到更根本的解决方案——要么完全摧毁瓦尔加斯的意识核心，要么找到能够永久取代封印的东西。",
            effects: ["dim"],
            jumpChapter: "return_decision"
        }
    ],

    // ======================= 回归抉择 =======================
    "return_decision": [
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "回到圣坛，我看到了依然安放在结界中的安文的原身。那张脸——我自己的脸——此刻看起来既熟悉又遥远。他安静地沉睡着，面容平和，心跳规律。只要我愿意，随时可以通过灵魂晶石将意识转移回去。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "但问题就在这里。我是否应该回去？在精灵之躯中度过的这段时间让我获得了太多新的理解——对森林、对魔力、对爱丽希雅和她的种族。以一个男人的身份，我不是无法获得这些知识，但我永远无法如此深入地体验它们。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "而另一方面，爱丽希雅的意识虽然正在逐渐恢复，但她仍然很虚弱。如果我离开她的身体，她能否独自面对接下来的挑战？更重要的是——她已经信任了我的意识在这副躯体中的存在。每一次我使用她的魔力，每一次我在这片森林中行走，我都能感受到她的意识深处产生了某种温暖的认可。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我坐在安文沉睡的身体旁边，手中握着那枚灵魂晶石。内部的银白光丝在轻轻跳动，像是在等待我的指令。选择权完全在我手中——回去，或者继续留在精灵的躯体中，直到一切尘埃落定。",
            effects: [],
            gainItem: "soul_mirror",
            gainApproach: "find"
        },
        {
            sceneId: "forest_shrine",
            type: "choice",
            text: "面对回归与停留的抉择，你选择：",
            choices: [
                {
                    text: "↩️ 返回安文的身体（回归路线，展开人类视角的新篇章）",
                    updateItem: { id: "spirit_crystal", flag: "first_resonance" },
                    jumpChapter: "return_to_body"
                },
                {
                    text: "🧝 继续留在精灵躯体中（精灵路线，深入附身之旅）",
                    updateItem: { id: "spirit_crystal", flag: "mastered_resonance" },
                    jumpChapter: "stay_elf_route"
                }
            ]
        }
    ],

    // ======================= 回归身体路线 =======================
    "return_to_body": [
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我做出了决定。我抬起精灵的双手，将灵魂晶石贴近安文身体的胸口。同时，护身符的绿光再次亮起，与晶石中的银光交织在一起。返回的过程与进入时几乎完全相同——一次短暂的失重感，然后意识被温和地拉回了自己的躯体。",
            screenEffect: "stardust?density=50",
            effects: ["flashWhite"],
            characterChanges: [
                { id: "elysia", action: "update", spriteId: "sad", animation: "fadeIn" }
            ]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "player",
            text: "我睁开了自己的眼睛。肩膀的宽度、手臂的重量、坚实的胸膛、粗糙的双手——一切都回来了。但这一次，它们不再是我以为的那样理所当然。每一处差异都变得异常鲜明。我的肩膀宽了，但却少了精灵躯体那种轻盈的自在。我的力量更强了，但却失去了与前方的魔法共鸣。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "player",
            text: "还有感官。世界忽然安静了许多。树上的蜘蛛声、叶片的呼吸声、泥土里的生命动静——全部消失了。我的耳朵又变回了人类的耳朵，只能捕捉到最明显的声音。视觉也黯淡了几分，暗处的细节重新被阴影吞噬。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "（爱丽希雅缓缓睁开了眼睛。她的翡翠色瞳孔重新找回了焦点。她看向我——真正地、以她自己的意识看向我——然后她的眼眶红了。）安文……你回来了。我感受到了你……在你还在我身体里的时候。你在保护森林。你在保护我。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "player",
            text: "我点了点头。一种难以言说的情绪——介于尴尬、感激和深刻的连结——充盈在胸口。我曾在她体内度过了一段完整的时光。我知道她的身体如何运作，知道她的魔力如何流动，知道她的心脏在安静时每分钟跳动的次数。",
            effects: []
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "（她走近我，俯下身子。银色的长发垂落在我的肩头。她的手指轻轻按在我的手背上。）谢谢你没有滥用我的身体。你本可以做任何事——可你选择了我最在意的事。我欠你一份无法用言语偿还的信任。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "bounce" }],
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "player",
            text: "她停顿了一下，从腰间取出了一面造型古朴的镜子。镜面不是玻璃——是一层静止的液态光芒。映魂之镜。精灵宝库中的古物。她将镜子递给我。也许你需要这个。它会映照出你所经历的一切。",
            gainItem: "soul_mirror",
            gainApproach: "receive",
            updateItem: { id: "soul_mirror", flag: "mirror_used" }
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "但现在——我提议去边境小镇。瓦尔加斯的封印需要从另一个角度来应对。镇上的骑士团和商会可能有我们需要的信息。而且——（她的嘴角微微上扬）——以人类的身份走一趟，对你来说应该会很轻松了。",
            effects: ["vignette"],
            jumpChapter: "town_entrance"
        }
    ],

    // ======================= 精灵停留路线 =======================
    "stay_elf_route": [
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我决定继续留在这具精灵躯体中。安文的原身仍然安全地沉睡在结界里，呼吸平稳，生命体征完全正常。而外面世界的威胁还没有解除——瓦尔加斯虽然被暂时压制，但封印的松动可能只是时间问题。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "更重要的是——我不能否认——这具身体的体验已经让我深深地沉迷了。不是一种病态的沉溺，而是对另一种生命形态的真诚欣赏。每一次使用魔力、每一次在林间奔跑、每一次感受到风吹过这具身体的每一寸皮肤，都在加深我对这个世界的理解。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我拿起映魂之镜举到面前。在液态光芒静止的镜面上，我看到了两个重叠的影像——爱丽希雅的身形轮廓中嵌着一个模糊的男性剪影。镜子不映照外形，只映照灵魂。我可以清楚地看到两条灵魂的边界。",
            updateItem: { id: "soul_mirror", flag: "mirror_used" }
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "随着我在精灵生活中度过的时间越来越长，我发现身体的自然反应在某种程度上开始影响我的思维习惯。看到危险时第一时间想到的不再是前冲阻挡，而是运用魔力远程击退；听到异常的声响时不再想用拳头解决问题，而是先辨识来源。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "社交上的变化更是微妙。森林中有时会有树人、小精灵或其他精灵路过。他们对爱丽希雅——也就是对我——的态度截然不同于他们对一个人类男性的态度。他们毫无戒备地与我分享情报、讨论族内事务，甚至向我——一个被当作守护者的人——求助。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "有一次，一只受伤的小鹿蹒跚着走进了圣坛。我下意识地蹲下身子，用纤细的手指轻轻抚过它的脊背。一股柔和的绿光从指尖流出，渗入小鹿的身体。伤口开始以肉眼可见的速度愈合。这个动作完全是自发性的——因为精灵的身体知道该怎么做。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我也注意到了更私密的差异。每日的身体护理——晨起梳洗、更衣整理——每一件小事都在提醒我这是一副完全不同的躯体。梳理及腰长发需要花费比打理短发多出数倍的时间和耐心；穿脱长袍时手臂的活动范围必须配合较窄的肩膀和较高的髋部。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "还有沐浴。在隔了很久之后的第一次在泉水池中洗浴时，我几乎重新经历了初次附身时的震惊。水从肩上流下，经过胸腔前方时因两旁的弧度而分流；流过腹部平坦的原野后在髋骨的宽阔平台上稍作停留；然后沿着腿内侧顺流而下。水流的一路上，每一处身体轮廓的起伏都是全新的地形。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我不禁比较起两具躯体在面对同一件事——比如寒冷——时的不同反应。人类男性的反应是体表温度下降、肌肉开始轻微颤抖、皮肤起鸡皮疙瘩。而这副精灵之躯的反应是：体表温度似乎不会明显下降，取而代之的是身体核心处会涌起一股微弱的暖流，向外辐射。这是一种被动保温机制，人类根本没有。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "经过数日，我确信自己没有后悔这个选择。留在精灵体内的每一天都在深化我的理解。而且我能隐约感觉到，爱丽希雅深层的意识也在逐渐从初期的虚弱中恢复。她偶尔会在我的思绪边缘投射出模糊的印象——对某个地点的记忆、对某种植物的了解。我们正在以一种前所未闻的方式共存。",
            effects: ["vignette"],
            updateItem: { id: "spirit_crystal", flag: "mastered_resonance" },
            jumpChapter: "town_entrance"
        }
    ],

    // ======================= 边境小镇·新的邂逅 =======================
    "town_entrance": [
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "边境小镇坐落于阿瓦隆森林的南缘，是这片广袤林地通往人类世界的最后一道门户。青石板铺就的广场中央有一座历经沧桑的喷泉，四周分布着商会、铁匠铺和骑士团的驻地。",
            screenEffect: "snow?density=15,speed=20"
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "广场上的人不多，但每个路过的人看到爱丽希雅时都露出了不同的表情——有人好奇，有人敬畏，也有人不自觉地躲开了视线。毕竟，精灵在人类的世界中极为罕见。而我，无论是以安文的身份还是以爱丽希雅的姿态，都需要在这里找到对抗瓦尔加斯的新线索。",
            effects: ["dim"]
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "lina",
            text: "（一个栗色长辫的女孩从商会的大门口跑了出来，看到我们的时候愣了一瞬。）啊——你是……精灵？我从来没有见过精灵！（她的眼睛亮得像发现了宝藏。）我听说森林里住着一位银发的守护者，没想到真的存在！",
            characterChanges: [{ id: "lina", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            effects: []
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "lina",
            text: "（她走上前几步，忽然意识到了自己的冒失，脸颊微微泛红。）对不起，我太激动了。我叫莉娜，我爸爸是福斯特商会的会长。您需要什么帮助吗？我们商会有镇上最好的药材和物资！",
            characterChanges: [{ id: "lina", action: "update", spriteId: "happy", animation: "bounce" }]
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "那天下午，我在莉娜和她的父亲福斯特先生的热心帮助下，以安文的身份在商会安顿了下来。福斯特先生是个健壮的中年人，手指粗壮、皮肤黝黑，典型的边境商人模样。他对精灵很友好，显然过去与阿瓦隆做过不少生意。",
            effects: ["dim"]
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "而莉娜——这个十九岁的女孩总是在不忙的时候跑来和我说话。她问森林是什么样子，精灵吃什么食物，长生不老是什么感觉。每一个问题都带着纯真的好奇，而不是猎奇。她的笑容干净得像冬天的初雪，让人很难对她产生任何戒备。",
            effects: []
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "lina",
            text: "（她在傍晚时分捧来了一碗自制的蜜饯果子。）这是我们商会的特产！用边境蜜枣酿的。我从小就帮爸爸做这个。你现在是……安文先生对吗？你们人类的学者都像你这么沉默吗？",
            characterChanges: [{ id: "lina", action: "update", spriteId: "happy", animation: "pulse" }],
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "晚餐后，莉娜带我参观了商会的仓库。这里有来自王国各地的奇珍异品——但不是那种贵族收藏的珍宝，而是边境商人们代代相传的实用之物。古老的星盘、南方沙漠的香料、北方雪原的毛皮。每一种货物背后都有一长串故事。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "（她走到一个角落，从架子上取下一个落满灰尘的木匣。）这个……是几个月前一个骑士团的人送来的。他说是在清理古代遗迹时找到的。上面有一些奇怪的文字，我们看不懂。但你看上去是个学者——也许你认识？",
            characterChanges: [{ id: "lina", action: "update", spriteId: "sad", animation: "pulse" }]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "我接过木匣，翻开盖子。里面是一卷用精灵文字书写的羊皮卷。我现在的精灵知识远超常人——那些符号对我来说如同母语。卷上记录的是关于灵魂共鸣术的一种古老变体：临时的意识交换，而非单向的占据。这可能是对抗瓦尔加斯的关键线索。",
            updateItem: { id: "spirit_crystal", flag: "second_resonance" },
            effects: ["flashWhite"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "（她歪着头看着我，栗色的长辫滑落到肩前。）你看得懂吗？你的表情变得好严肃……是因为这上面写了什么可怕的事吗？",
            characterChanges: [{ id: "lina", action: "update", spriteId: "shock", animation: "shake" }]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "我告诉她，这不是可怕的东西，但事关重大。我需要了解更多关于骑士团和遗迹的情况。莉娜毫不犹豫地说，她明天可以带我去见骑士团的副团长——赛拉菲娜。她们俩从小就认识。",
            effects: ["dim"],
            jumpChapter: "lina_crisis"
        }
    ],

    // ======================= 莉娜的危机 =======================
    "lina_crisis": [
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "变故出现在第二天的黄昏。我正在商会的二楼翻阅那卷精灵文献，楼下忽然传来了一阵骚动。莉娜的呼喊声夹杂在其中，然后是玻璃碎裂的声响。",
            effects: ["screenShake"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "我冲下楼，看到商会的大门被撞开了。几个穿着深色斗篷的人正粗暴地翻动着货架和柜子。领头的是一个身形瘦高的男人，他的眼睛闪烁着不自然的紫色光芒——那是被暗影魔力侵蚀过的标志。",
            screenEffect: "corruption?density=15",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "（莉娜被逼到墙角，双手护在胸前，但她的声音居然相当镇定。）我已经告诉你们了，我们这里没有什么'核心晶石'。我父亲是正经商人，不会收藏那些危险的古物。",
            characterChanges: [{ id: "lina", action: "update", spriteId: "shock", animation: "shake" }],
            effects: []
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "那些人是冲着阿瓦隆的核心晶石来的。瓦尔加斯的触手伸向了人类世界——这说明他的封印破损程度远比我之前判断的严重。他不仅在寻找可占据的精灵身体，还在招揽人类棋子为他收集森林的本源力量。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "在混战中，莉娜被她身边的攻击者推了一把，背部重重地撞在了货架上。她发出了一声闷哼，身体滑落到地面，额角上渗出了血。她没有昏迷，但明显无法再站立。",
            effects: ["screenShake"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "灵魂晶石在我内袋中再次发热。共鸣的脉动比任何时候都要强烈——不仅是对我，而是对莉娜。她的灵魂频率在恐惧中骤然变得高度活跃，而那种纯粹的、未经过任何训练的人类意识波动，恰好是灵魂共鸣最原始也最直接的匹配对象。",
            effects: ["flashWhite"],
            screenEffect: "stardust?density=40"
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "player",
            text: "几乎是在本能驱使下，我将灵魂晶石对准了莉娜。共鸣在这一次比之前更加流畅——不到一个心跳的间隙，我的意识就从安文的身躯中弹出，穿过了晶石与护身符构建的通道，完完全全地落入了莉娜的躯体之中。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "lina_possession", animation: "scaleIn" },
            jumpChapter: "lina_body_exploration"
        }
    ],

    // ======================= 凡人之躯·第二次附身体验 =======================
    "lina_body_exploration": [
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "这一次的感觉完全不同。精灵之躯是轻盈、凉爽、充满魔力回路的。而莉娜的身体——厚重、温暖、钝拙但充满了不可忽视的生命力。每一寸皮肤都散发着活人的体温，血液在血管中奔流的声音像是远处传来的鼓声。",
            screenEffect: "stardust?density=30",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "第一感觉是——更矮了。我不只是变矮了，而是整个尺度都收缩了。我抬起莉娜的头，视线的高度比安文的状态低了将近一个头，比爱丽希雅的高度也矮了一些。周围的一切——货架、门框、那些斗篷攻击者——都变得比记忆中更加高大。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "然后是这双手。我将它们举到眼前。圆润的、短了一截的手指，指甲上还残留着之前剥蜜饯时沾染的淡淡果渍。掌心的温度比精灵的高，皮肤略厚——那是常年在店铺搬货、整理、书写而积累下的薄茧，不如我那双手厚，但足以在这双手的柔软质感中留下勤勉的印记。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "我将手收回来，贴在自己的脸颊上。触感令人惊异——这具身体的皮肤不仅温暖，而且有一种特别的弹性。不是精灵那种光滑到极致的质感，而是一种更贴近生活、更有人间烟火气的柔软。面颊上的细软绒毛几乎看不见，但指腹能够感受到它们的存在。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "头发。我伸手向后摸去。栗色的长发编成了一条松散的辫子垂在左肩。发丝比精灵的银发粗一些、硬一些，但数量同样很多。我把辫子拉到面前闻了闻——是蜂蜜和干草的味道，混合着日间在店铺里沾染上的淡淡香料气息。",
            effects: []
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "眼前的危机还没有解除。那些被暗影魔力侵蚀的人还在屋内。但莉娜的身体无法施展精灵魔法，我也没有她的战斗经验。我需要——不，我需要信任这副躯体本身具备的优势。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "我用莉娜的嗓音开了口。声音比爱丽希雅的更低沉一点，但更圆润、更温暖，尾音带着一种小镇女孩特有的柔和上扬。住手。我手里有你们想要的东西。但如果你们再动商会里的任何一件东西，我就把晶石的所在位置彻底忘了。",
            effects: []
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "斗篷攻击者们停下了。他们来此的任务是找晶石，而不是伤人。为首的那人死死盯着莉娜的眼睛——却不知道这副躯体里已经不再是那个天真的小店女儿，而是一个经历过灵魂共鸣、曾与恶魔正面交锋的灵魂。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "接下来的半个时辰里，我以莉娜的身份与这些人周旋，套出了不少信息。他们来自一个叫'暗影之环'的地下组织，是瓦尔加斯的崇拜者。他们已经在镇上潜伏了数月之久，收集关于封印和阿瓦隆魔力的一切情报。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "当那些斗篷人终于离开，我回到商会的二楼，在莉娜房间的镜子前停了下来。镜中的女孩正瞪大了眼睛看着我——栗色的眼眸、微翘的小鼻头、因刚才的紧张而略失血色的双唇。粉红色的棉布长裙裹着圆润的肩膀和微隆的胸膛，一切都是陌生的，但又出奇地真实。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "我开始仔细比较这副躯体与精灵之躯的不同。首先，莉娜比爱丽希雅矮了一圈。精灵之躯比安文本人只矮了少许，但莉娜的身体却明显小了一个尺码——不仅是身高，整个骨架都是更小的型号。肩膀窄而塌，锁骨更突出，手腕更细。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "身体的曲线走向也完全不同。精灵的曲线是轻盈的、渐变的，像柳树在风中的轮廓。而人类的曲线更多是一种柔和的圆润——肩头圆、手臂圆、腰线虽然收窄但没有精灵的那种极端收缩，髋部则向外饱满地展开。整个人看起来更丰腴、更柔软。",
            effects: []
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "然后是腿。莉娜的腿不像精灵那样修长得过分，但比例极好。小腿线条流畅，大腿则因为常年在店铺和家中奔波而比精灵的腿多一些丰腴的厚度。脚——我脱下她的布鞋——这双脚更小、更宽，脚趾齐整而有力，足底的茧很薄但位置明确：在脚掌的前端和脚后跟，是久立久走留下的。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "腰腹区域——我掀开衣裙的下摆查看。莉娜的腹部比爱丽希雅的稍微柔软一些，没有那种紧致的天然纤薄，但也不松弛。它是属于一个健康姑娘的正常状态：平坦之上覆盖着一层细细的柔软脂肪，触摸时有温暖的弹力回馈。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "胸腔前方。刚才的行动中一直能感受到它们的重量——比精灵的更沉、更饱满，每一次迈步踏下楼梯都会产生清晰的波动。我用双手托住它们掂了掂，这份实实在在的重感是在精灵躯体中没有体会过的。爱丽希雅的胸部轻盈而贴合，需要特意去注意才能感觉到存在。而莉娜的——则时时刻刻都是身体重心的一部分。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "还有心跳。人类女性心脏跳动的节奏比我自己的稍快。在这片寂静之中，我能清晰地听到血液在颈动脉中流淌的声音——不太快也不太慢，但稳定而有力的收缩声不断提醒着我这是另一个人的身体。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "最后是整体的感受对比。精灵的身体是高雅的、轻灵的、被魔力微微托起的；人类的女性身体则是温暖的、实在的、浸润在日常生活中每一个细节中的。前者让我理解了森林和古老的奥秘，后者让我重新理解了普通人生活的份量。",
            effects: ["vignette"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "天色已完全黑下来，莉娜的伤在额头上还在隐隐作痛。我需要决定下一步。安文的身体还在商会的库房里，而莉娜的意识需要恢复。更重要的是——那些暗影之环的人明天还会再来。我需要帮手。",
            effects: ["dim"],
            jumpChapter: "seraphine_intro"
        }
    ],

    // ======================= 骑士团的援手·赛拉菲娜的登场 =======================
    "seraphine_intro": [
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "lina",
            text: "第二天清晨，以莉娜的身份来到了骑士团驻地。驻地是一栋用深色石材建成的二层建筑，门外站着两个全副武装的哨兵。副团长办公室在二楼的尽头，门口连个卫兵都没有——因为副团长本人就是整个边境最锋利的武器。",
            effects: ["dim"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "（她正坐在办公桌前查阅文书，听到敲门声才抬起头。浅紫色的短发利落地别在耳后，一双银灰色的眼睛像两枚钢钉，瞬间锁定了来人的身份。）莉娜？你额头上怎么了——谁伤了你？",
            characterChanges: [{ id: "seraphine", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            effects: []
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "lina",
            text: "赛拉菲娜站起来绕过办公桌，她身姿高挑挺拔，身量与安文相仿。经年训练让她的每一寸肌肉都充满了力量感——宽阔的肩膀、有力的双臂、紧实的腰腹，以及被骑士裤装包裹住的修长而结实的双腿。她的动作干净利落，没有任何多余的花哨。",
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "（她走到我面前，用拇指轻轻掀开我额前的发丝查看伤口。手指的触感干燥而温热，指腹上有一层厚实的握剑茧。）皮外伤。不用缝合。但这是人为打伤的。谁干的？",
            characterChanges: [{ id: "seraphine", action: "update", spriteId: "angry", animation: "shake" }],
            effects: []
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "lina",
            text: "我——以莉娜的身份——将暗影之环的事和盘托出。我说这些都是一个叫安文的旅者告诉我的，他现在受伤在商会的库房中休养。暗影之环的目标是阿瓦隆森林的核心晶石，他们背后是某个更强大的黑暗力量。",
            effects: ["dim"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "（赛拉菲娜的表情变得极为严肃。她回到办公桌前，从抽屉里抽出了一张标满记号的地图铺在桌上。）暗影之环。我们追查这个组织已经半年了。他们渗透得很深——不止在镇上，连骑士团内部都可能有他们的人。",
            characterChanges: [{ id: "seraphine", action: "update", spriteId: "idle", animation: "fadeIn" }],
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "她抬起头望着我——在莉娜的眼中。半精灵的直觉让她隐约察觉到了什么，但她终究什么都没有说。她只是拍了拍我的肩膀，力道控制得很轻。回去转告那个安文：如果他能带来更多关于暗影之环的情报，骑士团将为他提供一切必要的支援。",
            characterChanges: [{ id: "seraphine", action: "update", spriteId: "soft", animation: "pulse" }],
            jumpChapter: "major_crossroads"
        }
    ],

    // ======================= 重要抉择：三具躯体的命运交汇 =======================
    "major_crossroads": [
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "暗影之环的威胁近在眼前。瓦尔加斯的封印正在加速崩解。核心晶石的力量需要被引导到正确的位置才能重建封印。而我——安文——同时拥有三副可用的躯体：我自己的、精灵爱丽希雅的、以及人类女孩莉娜的。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "灵魂晶石内的光丝已经完全稳定。经历了两次共鸣之后，我的意识可以在三具躯体之间相对自如地转移——只要遵循晶石的引导，理解目标的灵魂频率。但这种能力也有代价：每一次转移都会消耗大量的精神力，而在被转移的身体中停留的时间越长，回到原身时的适应期也越长。",
            effects: ["dim"]
        },
        {
            sceneId: "lina_home",
            type: "dialogue",
            characterId: "lina",
            text: "但最大问题是：一旦与瓦尔加斯的最终对决开始，我将需要选择一个身体来承受战斗的全部冲击。不同的身体决定了不同的战斗方式、不同的盟友、以及不同的结局。",
            effects: ["vignette"]
        },
        {
            sceneId: "lina_home",
            type: "choice",
            text: "最终决战的时刻已至。你选择以谁的身份面对瓦尔加斯？",
            choices: [
                {
                    text: "🗡️ 返回安文的原身——以人类的意志和知识直面黑暗",
                    flag: "chose_player_body",
                    jumpChapter: "player_final_route"
                },
                {
                    text: "🧝 进入爱丽希雅——以精灵守护者的魔力终结一切",
                    flag: "chose_elysia_body",
                    jumpChapter: "elysia_final_route"
                },
                {
                    text: "🛡️ 与赛拉菲娜并肩——以骑士的战技迎战（新附身分支）",
                    flag: "chose_seraphine_body",
                    jumpChapter: "seraphine_possession"
                },
                {
                    text: "🌻 留在莉娜体内——以人类的温度斩断仇恨的锁链",
                    flag: "chose_lina_body",
                    jumpChapter: "lina_final_route"
                }
            ]
        }
    ],

    // ======================= 赛拉菲娜附身分支 =======================
    "seraphine_possession": [
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "在最终决战之前，赛拉菲娜找到了我。她说暗影之环已经集结在了森林边缘，需要在黎明前出击。但她的骑兵队被内部叛徒泄露了路线，整个突击计划面临暴露的风险。她需要一个能完全信任的人主导第一波冲锋——而她看穿了我不是普通的旅者。",
            characterChanges: [{ id: "seraphine", action: "enter", spriteId: "determined", animation: "fadeIn" }],
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "（她注视着我——安文的身体——目光如炬。）我知道你是安德鲁的孙子。我读过边境的旧档案——你的祖父曾经用一种特殊方法帮骑士团打了一场不可能赢的仗。档案里只写了四个字：'灵魂附身'。我需要你做同样的事。但不是附身我——而是附身那个叛徒。拿到他的口供。",
            effects: []
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "player",
            text: "我摇了摇头。灵魂共鸣需要理解和共情才能启动——我不可能附着在一个一无所知的叛徒身上。但赛拉菲娜——这位副团长——我曾与她有了交流，我理解她的决心、她的荣誉感、她对边境人民的责任。如果她愿意……",
            effects: ["dim"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "（她沉默了片刻。然后她脱掉了左手的铁手套，将裸露的手伸向我。）来吧。但是安文——如果你在我身体里做出任何有损骑士荣誉的事，等我夺回身体之后，我会亲手把你劈成两半。",
            characterChanges: [{ id: "seraphine", action: "update", spriteId: "angry", animation: "bounce" }],
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "player",
            text: "第三次共鸣。晶石的光芒比任何时候都强烈。我触碰了赛拉菲娜的手——那双手布满厚茧、指节粗大有力、皮肤干涩粗糙——然后我的意识穿过了一个意想不到的障碍。半精灵的血统让她的灵魂频率夹在两个种族之间，调和的过程比我预想的要费力。",
            screenEffect: "stardust?density=45",
            effects: ["flashWhite"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "但共鸣还是达成了。安文的身体向后靠在了墙上，而赛拉菲娜的躯体——这具高大有力的女性骑士之身——已经完全在我的掌控之下。我的第一个感觉是：力量。纯粹的、可以通过每一根肌肉纤维传达的物理力量。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "seraphine_possession", animation: "scaleIn" },
            updateItem: { id: "spirit_crystal", flag: "second_resonance" }
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "这副身体与我自己的男性躯体最为接近，但差异也最为具体。肩膀同样宽阔，但锁骨上方的肌肉分布更平滑。手臂同样粗壮，但肱骨的长度略短于我的原身，使得手臂的杠杆作用稍有不同。腹部的肌肉块数一样多、一样紧实，但腰部比我的更细——这是女性骑士经年穿着束腰护甲的结果。",
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "然后是大腿。这是我第一次在一副女性躯体中感受到如此强壮的腿部力量。赛拉菲娜的腿比她身材比例显示的还要结实——大腿前方的肌肉群在裤装的包裹下鼓出清晰的轮廓，小腿肚硬得像石头。这双腿曾在马背上夹紧过无数个小时，也曾徒步穿越过半片边境的荒原。",
            effects: ["dim"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "我活动了一下手指——每根手指都有力地弯曲和伸展，关节发出轻微的咔嗒声。这副手上的茧不是写字的茧，是握剑的茧——在掌根、虎口、指关节处厚厚地堆积着。指尖却出乎意外地敏感——那是熟练的剑客必须有的触觉，用来感知剑刃与空气的每一次微细接触。",
            effects: ["vignette"]
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "我取下挂在墙上的长剑，抽出剑鞘。剑身在手中自然滑入最合适的握持位置。这具身体知道如何使用这柄剑——每一寸肌肉的记忆都在本能地引导着我的动作。不需要思考，我就可以做出完美的起手式。",
            effects: ["flashWhite"],
            jumpChapter: "seraphine_final_route"
        }
    ],

    // ======================= 安文原身最终路线 =======================
    "player_final_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我回到了自己的身体。厚重的肩膀、粗糙的双手、朴素的感官——一切都是熟悉的，但经历了两次附身之后，我对这副身体也有了全新的认识。作为安文，我没有魔力，没有精灵的感官，没有骑士的战斗本能。但我有一颗被两种生命体验丰富过的心。",
            screenEffect: "bloodmoon?density=20",
            effects: ["vignette"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "（暗影在祭坛上方凝聚）又是你！人类！你体内的灵魂波动——你居然接连附身了两个女人？！多么……令人作呕的技艺。安德鲁当年也是这样，但他至少知道适可而止！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "fadeIn" }],
            screenEffect: "corruption?density=35",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "（我高举灵魂晶石，另一只手握紧了祭祀匕首。）瓦尔加斯。你错了。我祖父发现的不只是一种技术——它是一种理解的方式。只有在别人体内活过，才能真正明白什么值得保护。这片森林、这个小镇、每一个正在努力活着的灵魂——你都不配触碰。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "（爱丽希雅从侧翼出现，双手凝聚着翠绿色的魔力。她已经完全恢复了。）以守护者之名，以安德鲁后人的意志——瓦尔加斯，你的侵占到此为止！",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "determined", animation: "fadeIn" }],
            screenEffect: "stardust?density=40"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "合力之下，灵魂晶石中爆发出耀眼的白光——它不再是单纯的转移媒介，而是成为了封印的核心。瓦尔加斯的意识碎片在光中被一块块剥离、压缩、封入晶石内部。他的尖啸声从愤怒变成了惊恐，最后消失在无声的光中。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "日落时分，我站在森林入口回望阿瓦隆。迷雾已经完全散去，金色的夕阳洒在层层叠叠的树冠上，将每一片叶子都镀成了琥珀色。爱丽希雅站在我身旁，银发在风中轻轻飘动。她没有说话，只是安静地站着——我们之间不需要言语了。",
            screenEffect: "snow?density=25,speed=20",
            effects: ["dim"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "祖父的航海日志静静地躺在我胸前的内袋里。我终于读懂了最后一页——不是潦草的研究笔记，而是他一笔一划写下的最后的话：'共鸣不是夺取，而是理解。当你真正懂得另一个生命的时候，你就永远不会孤独了。'",
            updateItem: { id: "log", flag: "mastered_resonance" },
            effects: ["vignette"]
        },
        {
            sceneId: "forest_gate",
            type: "ending",
            endingId: "true_end"
        }
    ],

    // ======================= 爱丽希雅最终路线 =======================
    "elysia_final_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "我以爱丽希雅的身体站在了祭坛前。封存在内心的安文的意识与这副精灵躯体已经磨合到了近乎完美的程度。我可以随心所欲地调用森林的本源魔力，同时又保留着一个人类学者对术式结构和战术逻辑的清晰认知。",
            screenEffect: "bloodmoon?density=20",
            effects: ["vignette"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "（暗影从封印石的每个裂缝中同时涌出，像一个巨大的黑色水泡在空气中膨胀。）守护者——不，不对——这副躯壳里装的不再是那个高傲的精灵了。你是那个人类小子！你居然一直赖在她的身体里不走？哈哈哈哈！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "fadeIn" }],
            screenEffect: "corruption?density=40",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "你说对了一半。但另一半你没说对——我并不是'赖着不走'。我是选择留下。而爱丽希雅——（我轻轻将手按在胸口，感受着那道翡翠色的意识深处传来的温暖脉动）——她也选择了让我留下。这不叫侵占。这叫信任。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "在那一刻，我感受到了。爱丽希雅的意识从深处浮了上来——不是抢夺，而是加入。两条灵魂在同一副躯体中并肩而立，一个以翡翠色的魔力为介质，一个以灵魂晶石的光芒为通道，共同将阿瓦隆的本源力量推向了最高峰。",
            screenEffect: "stardust?density=60",
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "不！两只蚂蚁揉成一团还是蚂蚁——（但他的话被一道前所未见的翠白色光柱吞没了。暗影在光中蒸发、溶解、彻底消失。封印石上的紫黑色纹路全部转为银白，然后整个石台轰然下沉，将残存的暗影封入了地底深处。）",
            characterChanges: [{ id: "vargas", action: "leave", animation: "fadeOut" }],
            effects: ["screenShake"],
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "尘埃落定。圣坛的水池再次平静下来。我望着水中的倒影，看到了爱丽希雅的面容——但那双眼睛中同时闪烁着两个灵魂的光芒。安文的身体依然在结界中沉睡。但我们都知道，有些旅程一旦开始，便不必再走回原点了。",
            screenEffect: "sakura?density=30,color=#90ee90",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_shrine",
            type: "dialogue",
            characterId: "elysia",
            text: "我选择留在精灵的躯体中。不是因为迷失了自己，而是因为找到了新的自己。安文曾经只是一个学者，一个背负着家族使命的年轻人。而现在，在爱丽希雅的躯壳中，在阿瓦隆的森林里，他成为了一个全新的存在——双魂守卫者。",
            effects: ["dim"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "forest_shrine",
            type: "ending",
            endingId: "elf_body_end"
        }
    ],

    // ======================= 赛拉菲娜最终路线 =======================
    "seraphine_final_route": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "seraphine",
            text: "以赛拉菲娜的身体率领骑兵队奔袭在夜色中的林道上，是一种前所未有的体验。胯下的战马敏锐地感受到了骑手今晚的不同——我的腿对马腹的施压更精准，缰绳的掌控更有力，因为我的手是赛拉菲娜的手，一双熟练掌握了一切骑术细节的手。",
            screenEffect: "bloodmoon?density=15",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "seraphine",
            text: "暗影之环的临时营地在森林深处的一片空地上。篝火的光芒映出了十几个斗篷人影。我高举长剑——这把剑在赛拉菲娜的手中轻若无物，剑身反射着月光划出一道完美的弧线，然后劈开了第一个斗篷人手中的暗影法器。",
            effects: ["screenShake", "flashWhite"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "seraphine",
            text: "战斗是纯粹的。这副身体知道该怎么格挡、怎么闪避、怎么反击——不需要思考，肌肉的本能就是最好的导师。同时我的意识在背后进行着冷静的战术调度：指挥骑兵队包抄左翼，命令弓箭手压制后排，所有人都在赛拉菲娜的威严嗓音下精确执行。",
            effects: ["dim"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "seraphine",
            text: "战斗结束后，我独自策马来到了祭坛。瓦尔加斯的封印仍然在那里，但没有了崇拜者的支援，它的暗影魔力正在加速衰减。而一个半精灵骑士——一个融合了精灵血统与人类意志的灵魂——可以做到纯人类或纯精灵都做不到的事。",
            effects: ["vignette"],
            screenEffect: "stardust?density=30"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "seraphine",
            text: "我握紧长剑，将剑尖插入了封印石的裂缝之中。精灵的魔力——赛拉菲娜继承自她另一半血统的微量力量——沿着剑身缓缓渗入石中。与此同时，我以安文的语言念出了日志上记录的封印祷文。两者结合之下，封印石开始从内部发光。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "seraphine",
            text: "次日正午。边境骑士团驻地的操场上，我作为赛拉菲娜站在全团队列面前接受了城主的嘉奖。莉娜在人群中向我挥手。安文的身体已经苏醒，他的意识已从赛拉菲娜体内离开，回到了自己体内。但副团长的眼睛里比以前多了一些东西——那是被另一个灵魂暂时占驻后留下的扩展了的视野。",
            effects: ["vignette"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "knight_hall",
            type: "dialogue",
            characterId: "player",
            text: "当朝阳从边境线的远山后升起，金色的光芒照亮了骑士团驻地的每一块石砖。我——安文——与赛拉菲娜并肩站在城墙上。当我们的视线交汇时，不需要言语。她拍了拍我的肩膀，力道重得让我咧了咧嘴。然后她笑了——那是属于她自己的、带着三分傲意和七分真诚的笑。",
            effects: ["dim"]
        },
        {
            sceneId: "knight_hall",
            type: "ending",
            endingId: "knight_end"
        }
    ],

    // ======================= 莉娜最终路线 =======================
    "lina_final_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "lina",
            text: "留在莉娜的躯体中去面对瓦尔加斯——这看起来是一个自杀式的选择。这副娇小的人类女孩身体既没有魔力，也没有战斗训练。但灵魂共鸣让我和爱丽希雅的精灵魔力之间保持着一条纤细的通道。而莉娜的特殊之处在于——她的灵魂频率异常纯粹，纯粹到可以将精灵的魔力通过晶石桥接过来。",
            screenEffect: "stardust?density=35",
            effects: ["vignette"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "你疯了吗？！用一介平民女子的身体来挑战我？她的手臂连提剑的力气都没有！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "fadeIn" }],
            screenEffect: "corruption?density=30",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "lina",
            text: "我没有回答。双手握着灵魂晶石贴近胸口，感受着莉娜的心跳在掌心下有力地搏动。那条通过晶石连接爱丽希雅魔力的通道完全打开了——翠绿色的魔力涌入莉娜的身体，沿着她的血管和神经飞速蔓延。这具平凡的躯体开始发光。",
            screenEffect: "stardust?density=50",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "lina",
            text: "她用尽全力向封印石伸出了右手。在那一瞬间，我没有选择纯粹的破坏，而是以灵魂共鸣的手法将封印的力量完整地重建。当光芒散尽，祭坛恢复了沉寂。封印石焕然一新，光洁得像刚刚从山中开采而出。瓦尔加斯的身影消失了——他不是被消灭，而是被一种超越了他理解范围的力量驱逐回了最初的暗影深渊。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "lina",
            text: "春日暖阳洒满了边境小镇的中央广场。喷泉水池边，莉娜的身体正坐在石栏上晒太阳。她的意识已经苏醒，而安文的意识正缓缓从她的身体中退出来，通过晶石回到自己在商会库房中被仔细看护的原身之中。",
            effects: ["vignette"]
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "当我以安文的面目再次走进商会，莉娜正在给花盆里的向日葵浇水。她转过头看到我，愣了一下，然后脸颊上浮起了一抹淡淡的红晕。她当然不记得附身期间的每一件事——但她记得一种感觉。一种被紧紧保护着的感觉。一种温暖。",
            effects: ["dim"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "lina",
            text: "（她放下了手里的水壶，在围裙上擦了擦手，然后朝我跑过来。她的辫子在身后晃来晃去。）安文先生！你醒啦！我炖了鸡汤——爸爸说病人要多喝汤。你在我家多住几天好不好？镇上的人都想问你关于精灵森林的事！",
            characterChanges: [{ id: "lina", action: "update", spriteId: "happy", animation: "bounce" }],
            effects: []
        },
        {
            sceneId: "village_square",
            type: "dialogue",
            characterId: "player",
            text: "我看着她清澈的栗色眼睛，忽然想起在精灵圣坛的那个夜晚——想起第一次共鸣时在爱丽希雅体内体会到的轻盈，想起在莉娜身体里感受到的温暖。世间有如此之多的存在方式，而每一种都蕴含着无法被替代的美。",
            effects: ["vignette"]
        },
        {
            sceneId: "village_square",
            type: "ending",
            endingId: "human_love_end"
        }
    ]
};

window.STORY_CHAPTERS = STORY_CHAPTERS;

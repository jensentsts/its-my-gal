// story.js

// 全局结局元数据定义库（供首页结局收集墙与局内终章匹配使用）
window.ENDINGS = [
    {
        id: "bad_end",
        title: "BAD END: 迷失于永恒之雾",
        description: "你未能解开护身符的真正秘密，在错综复杂的森林线索中迷失了方向。随着密道崩塌，浓雾永远侵蚀了你的心智。你成为了森林中无数徘徊幽灵的其中一员。"
    },
    {
        id: "hope_end",
        title: "TRUE END: 璀璨的破晓之光",
        description: "凭借智慧与传承，你对照壁画读懂了日志，成功在核心祭坛唤醒了'神秘传家护身符'。你击碎了瓦加斯的野心，用两代人的守护换来了迷雾的散去与阿瓦隆森林的永恒觉醒。"
    },
    {
        id: "sacrifice_end",
        title: "NORMAL END: 孤注一掷的燃刃",
        description: "在没有唤醒核心魔力的情况下，你选择将刻满充能术式的'古代祭祀匕首'过载引爆，用极端的毁灭方式与邪恶势力同归于尽。阿瓦隆得以保全，而你的名字成为了精灵史诗中的无名传说。"
    },
    {
        id: "dark_possession_end",
        title: "至暗结局·永夜的低语",
        description: "瓦尔加斯的黑暗力量彻底吞噬了一切。你在附身的精灵躯壳中感受到了前所未有的绝望——两个灵魂共同坠入永夜，迷雾森林成为永恒的黑暗国度。"
    },
    {
        id: "redemption_end",
        title: "救赎结局·灵魂的觉醒",
        description: "在附身的体验中，你真正理解了爱莉希雅的灵魂。借助护身符与日志中的古老祷文，你们共同抵御了瓦尔加斯的侵蚀。黑暗被驱散，她流下感激的泪水，两个灵魂在共鸣中找到了彼此。"
    }
];

const STORY_CHAPTERS = {
    // ======================= 序章：迷雾之邀 =======================
    "main": [
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "深夜的酒馆终于安静了下来。窗外的雨丝斜斜地打在玻璃上，把远处街灯的昏黄光线揉成一片模糊。我叫安文，今年二十四岁，在一家不起眼的旧书店打工。日子过得平平淡淡，直到今晚。",
            effects: ["vignette"],
            screenEffect: "rain?density=25,speed=40,wind=0.3"
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "房东催了我三次房租，手机里躺着三条未读的消息——两条是大学同学王明发来的聚会邀请，一条是书店老板问我明天能不能替班。我都没回。因为此刻，我手里正捏着祖父留给我的唯一遗物——那本厚重的航海日志。",
            effects: []
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "祖父安德鲁去世那年我才七岁。记忆里他总坐在老宅的藤椅上，对着窗外喃喃自语，说些我听不懂的话——关于一座被迷雾笼罩的森林，关于住在里面的精灵，关于一枚能改变命运的护身符。大人们都说是老年痴呆的胡话，可我知道不是。",
            cgChanges: { action: "enter", id: "old_photo", animation: "scaleIn" },
            effects: ["dim"]
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我从日志的封皮夹层里抽出那张泛黄的旧照片。照片上，年轻时的祖父站在一棵参天古树前，身旁是一个身姿纤细、耳廓微尖的少女——她有一头垂至腰际的银色长发，眉眼间带着不属于人间的清冷气质。照片背面写着一行娟秀的字：'赠予我最挚爱的森林挚友——爱莉希雅。'",
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "我翻开日志的最后一页，上面是祖父潦草却有力的字迹：'安文，当你读到这些的时候，去阿瓦隆。迷雾森林的入口就在旧城北面的古石阵后。带上护身符，找到爱莉希雅。有些事，只有你才能完成。'护身符——我从领口拉出那条从不离身的项链，晶石在烛火下泛着幽微的绿光。",
            effects: [],
            gainItem: "amulet",
            gainApproach: "receive"
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "第二天一早，我给王明发了条消息：'我出趟远门，可能要好几天。别担心。'然后背上包，搭上了去旧城北郊的公交车。窗外的城市风景一点一点褪去，高楼大厦变成了矮旧平房，柏油路变成了土路，最后连路都没有了——只剩一片密不透风的老树林。",
            effects: [],
            jumpChapter: "meet_elysia"
        }
    ],

    // ======================= 邂逅精灵 =======================
    "meet_elysia": [
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "古石阵后果然有一条隐蔽的小径。我拨开齐腰高的蕨类植物，沿着几乎看不清的路径往里走了大约半个小时，空气渐渐变得湿润而清冷。周围的树木愈发高大，树冠遮天蔽日，只有零星的光斑洒在地上。一种难以言喻的感觉攫住了我——这里的时间似乎流得比外面慢。",
            effects: ["dim"],
            screenEffect: "snow?density=20"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "正想着，前方忽然亮起一团柔和的淡绿色光晕。一个纤细的身影从雾气中缓缓走出。我下意识地停下脚步，呼吸几乎停滞。",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "停下脚步，凡人。前方是迷雾森林的禁地——阿瓦隆的边界。凡人踏入其中，将永世迷失于无尽的林间幻境。现在，转身离开，我可以当做没看到你。",
            screenEffect: "snow?density=35",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "她的声音清冽如同山涧流水，每一个字都清晰而有力。我盯着她看了足足五秒才回过神来。她比照片上看起来更美——不，'美'这个词太俗了。她的面容带着一种不属于人间的端庄与疏离，尖尖的耳朵从银发间微微探出，淡绿色的眼瞳像是两汪不见底的深潭。她穿着一袭贴身的淡青色长袍，腰间系着一条编织精细的藤蔓腰带，勾勒出纤细的腰身。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "idle", animation: "pulse" }]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "我把手伸进衣领，扯出那枚护身符，又举起祖父的日志。'我是安德鲁的孙子！请看这个——我祖父的日志！照片上的人就是你，对不对？'",
            loseItem: "log",
            loseApproach: "handOver"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "她接过日志的瞬间，手指微微一颤。她翻到那张照片，指尖轻轻划过相纸表面，沉默了很久。当她再次抬起眼时，那双淡绿色的眸子里多了一层我看不太懂的复杂情绪——有怀念，有悲伤，还有些许苦涩。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "bounce" }],
            cgChanges: { action: "enter", id: "old_photo", animation: "scaleIn" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "你是安德鲁的后代？……难怪。你身上带着他的气息。不对——不只是气息。这枚护身符……它选择了你。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "她叹了口气，将日志递还给我，语气软了几分。'森林正在枯萎。一股古老而黑暗的力量在深处蠢蠢欲动。我叫爱莉希雅，是阿瓦隆的守护者。你祖父……他曾是我的战友。既然护身符在你身上亮了，说明命运还没有放弃这片森林。跟我来吧。不过，别指望我会像对老朋友那样对你。'她转过身，长长的银发在雾气中划出一道优雅的弧线。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }],
            gainItem: "log",
            gainApproach: "receive"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "她从腰间解下一把匕首，反手递给我。'这是你祖父当年托我保管的祭祀匕首，如今物归原主。剑身上的术式虽然沉睡已久，但若有危机，它自会觉醒。'匕首的剑柄冰凉而沉重，剑身上刻着繁复的纹路，在接触我掌心的瞬间微微发出一丝暖意。",
            gainItem: "dagger",
            gainApproach: "receive",
            jumpChapter: "forest_explore"
        }
    ],

    // ======================= 密林探索·羁绊的种子 =======================
    "forest_explore": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我跟在爱莉希雅身后，沿着一条若有若无的林间小径前行。她的步伐轻盈得几乎没有声响，赤脚踩在覆满苔藓的泥土上，每一步都像踩着某种我看不见的节奏。作为对比，我的靴子踩在枯枝和落叶上，发出沙沙的响声，笨拙得让我自己都有些不好意思。",
            screenEffect: "snow?density=25",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "她走在前头，头也不回地说：'你走路的姿势暴露了你。你是城里人——每一步都在试图踩稳地面，而不是与地面共生。放松你的膝盖，感受泥土的回弹。在森林里，对抗只会让你更快疲倦。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我试着放松脚步，但收效甚微。不过她的话让我对这位精灵守护者多了几分好奇。'你和我祖父……是怎么认识的？他从来没有详细说过。'",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "爱莉希雅放慢了脚步，与我并肩而行。她的银发在林间微光中泛着柔和的光泽，侧脸的轮廓如同被细笔勾勒出来的。'四十年前，你祖父是个年轻的水手。他的船在暴风雨中偏离了航线，漂到了阿瓦隆的海岸。是我巡林时发现了他，把他从礁石上救了下来。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "她顿了顿，声音里带上了一丝很难察觉的温度。'他在森林里住了一个多月。那个时候的森林比现在繁盛得多，古老的树木覆盖着每一寸土地。他帮我绘制了森林的地图，记录了上百种你们人类从未见过的植物。我们还一起修好了东面的矿道入口——他有一双巧手。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我不由自主地笑了。祖父在我记忆里只是个坐在藤椅上的老人，可从她的描述里，我看到的是一个充满冒险精神的年轻水手——那才是真正的他。'后来呢？他为什么不留在森林里？'",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "她的脚步彻底停住了。她转过身来，那双淡绿色的眼眸直直地看着我，里面盛着一种沉淀了太久的情绪。'因为他有家人。他说家里有个年幼的儿子——就是你的父亲——等着他回去。他把护身符留给了我，说如果有一天森林需要帮助，它会指引他的后代回到这里。'她移开目光，望向密林深处。'而现在，时候到了。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "bounce" }],
            effects: ["vignette"],
            jumpChapter: "ruins_exploration"
        }
    ],

    // ======================= 遗迹探索·壁画之谜 =======================
    "ruins_exploration": [
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "我们来到了一座被藤蔓覆盖的古老石门面前。爱莉希雅伸出手掌按在石门正中的凹槽上，一串发光的符文从她的手心蔓延开来，石门轰然向内打开。门内是一条幽深的廊道，两侧的石壁上绘满了色彩鲜艳的壁画。",
            effects: ["dim"],
            screenEffect: "corruption?density=15",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "小心那些壁画。它们是远古封印的一部分，描绘的是千年前那场封印之战的经过。如果你盯着看太久，画中封印的低语魔咒可能会侵蚀你的意志——那是瓦尔加斯在被封印前留下的陷阱。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "但我已经被壁画吸引住了。第一幅画上，一个身披黑袍的高大身影——应该就是瓦尔加斯——站在燃烧的森林中央，周围是倒下的精灵和人类。第二幅画里，一群手持法杖的精灵围成一圈，将黑袍身影封入了一座祭坛。第三幅画——我眯起眼睛仔细辨认——画着一个人类和一个精灵并肩站在一起，人类手中握着的竟是一枚发光的护身符。",
            cgChanges: { action: "enter", id: "ancient_mural", animation: "scaleIn" }
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "她一把抓住我的手腕将我往后拽，手指纤细却有力。'我说了别看太久！你的眼神已经开始涣散了。'她的掌心贴在我手腕的皮肤上，温度比人类要低一些，带着一种像薄荷叶似的清凉触感。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "我晃了晃脑袋，确实感到一阵轻微的眩晕。但壁画的内容让我无法不在意——那个握着护身符的人类，难道就是我的祖先？",
            effects: [],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "ruins_entrance",
            type: "choice",
            text: "面对壁画的诱惑，你选择：",
            choices: [
                {
                    text: "🧠 集中精神，对照日志深度解读壁画（获得关键线索）",
                    updateItem: { id: "log", flag: "read_ancient_mural" },
                    jumpChapter: "forest_deep"
                },
                {
                    text: "🙈 听从劝告，闭眼快速通过",
                    jumpChapter: "forest_deep"
                }
            ]
        }
    ],

    // ======================= 森林深处·不祥的预兆 =======================
    "forest_deep": [
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "elysia",
            text: "穿过遗迹廊道后，我们进入了森林的心腹地带。周围的树木愈发古老，树干粗得需要十人合抱，树冠层叠交错，将天空切割成零碎的暗绿色碎片。爱莉希雅的脚步忽然停了下来，她的耳朵微微颤动——那对尖耳在警觉状态下会轻微地改变角度，这是我刚刚才注意到的小细节。",
            screenEffect: "snow?density=30",
            effects: ["vignette"]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "elysia",
            text: "小心！我感觉到了一股异样的魔力……是瓦尔加斯的气息。但按常理来说，他不应该能把自己的投影投射到这个区域。封印虽然弱了，但还没破。除非——",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "vargas",
            text: "一团暗红色的雾气在林地间凝聚，逐渐勾勒出一个人形的轮廓。那个身影高大而扭曲，周身缭绕着暗影般的魔力。一双猩红色的眼睛在雾气中睁开，燃着某种不加掩饰的贪欲。",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            screenEffect: "corruption?density=30",
            effects: ["flashBlack"]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "vargas",
            text: "呵呵呵……小精灵，你的感知倒是敏锐。可惜敏锐救不了你。今天我要猎取的不是你那不值一提的性命，而是你那具年轻而完美的躯体！几百年的精灵之躯，充沛的魔力——多么美妙的容器。",
            characterChanges: [{ id: "vargas", action: "update", spriteId: "angry", animation: "pulse" }]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "elysia",
            text: "无耻！你休想触碰我的身体——啊！！！",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "vargas",
            text: "暗红色的雾气像活物一般缠绕上爱莉希雅的身体。她猛地弓起腰，发出一声短促的尖叫，然后——她的身体突然僵住了。几秒之后，她缓缓直起身来，但那双淡绿色的眼睛已经变成了浑浊的暗红色。她嘴角扬起一个完全不属于她的笑容——残忍而玩味。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "shake" }]
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "player",
            text: "爱莉希雅！你……你的眼睛！你的声音……",
            effects: []
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "elysia",
            text: "她——不对，是他——低头打量着自己的双手，活动着纤细的手指，脸上的笑容越来越深。'哈哈哈哈！这具身体……比他预想的还要完美。纤细却有力的四肢，轻盈的骨架，每一根手指都流淌着纯净的精灵魔力。安文是吧？我得感谢你。若不是你带着那枚护身符深入森林，单凭他自己还真没法突破封印的最后一层屏障。'",
            screenEffect: "bloodmoon?density=20",
            cgChanges: { action: "enter", id: "elysia_possession", animation: "scaleIn" }
        },
        {
            sceneId: "secret_cavern",
            type: "dialogue",
            characterId: "player",
            text: "我的心脏像被一只无形的手攥住了。眼前的这个人——这具躯壳——明明是爱莉希雅，但里面的东西绝对不是她。她的手势，她的站姿，她说话时尾音上挑的腔调，完全是另一个人——一个充满恶意的闯入者。",
            effects: ["screenShake"]
        },
        {
            sceneId: "secret_cavern",
            type: "choice",
            text: "瓦尔加斯占据了爱莉希雅的意识！你该如何应对？",
            choices: [
                {
                    text: "📖 翻阅祖父的日志，寻找关于附身和驱魔的记载",
                    updateItem: { id: "log", flag: "exorcism_ritual" },
                    jumpChapter: "possession_prelude"
                },
                {
                    text: "🗡️ 拔出祭祀匕首，试图强行驱魔",
                    jumpChapter: "desperate_route"
                }
            ]
        }
    ],

    // ======================= 附身前奏·护身符的真相 =======================
    "possession_prelude": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我强迫自己冷静下来。瓦尔加斯虽然占据了爱莉希雅的身体，但他似乎还不能完全发挥她的力量——他的动作偶尔会有一瞬间的迟滞，像是操纵着不太合身的木偶。我需要争取时间。",
            updateItem: { id: "log", flag: "exorcism_ritual" },
            effects: ["vignette"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "'瓦尔加斯，如果你真的那么强大，为什么还需要她的身体？你连自己真正的躯壳都没有了吗？'我故意用挑衅的语气说道，同时手指在背后悄悄翻开了祖父的日志。",
            effects: []
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "被附身的爱莉希雅——瓦尔加斯——发出了一声低沉的笑。'嘴倒是挺硬。我的真身被你们人类的先祖封印在祭坛底下太久了，久到血肉都化作了砂石。不过没关系——这具精灵的躯体足够我重新君临这片大陆。而你，凡人，你会成为我新纪元的第一块垫脚石。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "bounce" }],
            screenEffect: "corruption?density=25"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我的手指触到了日志夹层中一块格外厚实的纸页。我小心地撕开封口，里面掉出一张折叠了不知多少年的羊皮纸。纸上是祖父工整的字迹，墨迹虽然褪色但依然清晰可辨。标题是——《关于护身符与意识转移的完整记录》。",
            effects: ["flashWhite"],
            updateItem: { id: "amulet", flag: "exorcism_ritual" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我飞快地扫过羊皮纸上的内容。祖父写道：护身符的真正力量不在于防护，而在于'意识引导'——它能够将持有者的意识从自身的躯壳中分离出来，并转移到另一个生命体中。这是远古精灵族流传下来的禁忌秘术，原本用于濒死精灵将意识转移到圣树中以延续存在。但祖父发现，通过调整术式中的符文序列，它也可以用于……附身于另一个活着的生命。",
            effects: [],
            screenEffect: "stardust?density=20"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我深吸了一口气，继续往下读。祖父写道：'启动意识转移需要三个条件：第一，持有者必须与被转移者之间存在某种灵魂层面的纽带——共同的记忆、情感或血脉；第二，转移必须在强大的自然魔力节点附近进行——如阿瓦隆的古代祭坛；第三，持有者必须紧握护身符，同时与目标保持身体接触，然后默念符文序列。转移是瞬间完成的，持有者的意识将完全进入目标的身体，而目标的意识将被暂时抑制。'",
            effects: ["dim"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我的心跳加速了。我抬起头，看着面前被瓦尔加斯占据的爱莉希雅。她的身体——那具纤细优雅的精灵之躯——正被一个恶意的入侵者操纵着。如果我也能进入那具身体呢？如果我能从内部把瓦尔加斯驱逐出去？祖父的笔记里提到，如果两个意识同时存在于一具身体中，力量更强的一方会占据主导。",
            effects: []
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "但我立刻意识到其中的巨大风险。如果我失败了，或者如果我也被困在那具身体里……甩了甩头，我把这些疑虑压下。没有时间犹豫了。爱莉希雅信任我的祖父，而她的身体此刻正在被玷污。我必须做些什么。",
            effects: ["screenShake"],
            screenEffect: "stardust?density=30"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "瓦尔加斯操控着爱莉希雅的躯体向我逼近了一步，修长的腿在长袍下交替迈动，每一步都透着不属于她的侵略性。'怎么，看完了吗？你祖父留了什么秘密给你？不如拿出来分享分享。'他伸出手——那只手小巧而白皙，五指修长，指尖晶莹如玉——但伸出的姿势却充满了威胁。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "bounce" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "就是现在。我猛地向前跨出一步，左手握紧胸前的护身符，右手抓住了她的手腕。符文的序列在我脑海中浮现——祖父在羊皮纸上用粗体标注的那串古精灵语，不知为何我只看了一遍就牢牢记住了。护身符的晶石爆发出一团刺目的绿色光芒，整个祭坛都在震颤。我看见瓦尔加斯——在爱莉希雅的脸上——第一次露出了惊愕的表情。然后，世界消失了。",
            effects: ["flashWhite", "screenShake"],
            cgChanges: { action: "enter", id: "redemption_light", animation: "scaleIn" },
            jumpChapter: "possession_event"
        }
    ],

    // ======================= 附身时刻·意识的转移 =======================
    "possession_event": [
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "一种难以形容的感觉席卷了一切。不是疼痛，也不是眩晕，而是一种彻底的、毫无保留的抽离。就好像整个人被从自己的皮肤里剥了出来，却没有任何痛苦——只是突然之间，我不再占据任何空间，不再拥有任何重量。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "在世界消失的那一瞬间，我感知到了一种奇异的流动——我的意识像是一缕烟，被护身符的绿光裹挟着，沿着我与她手腕相接的触点，流向另一个容器。那个过程快得无法用时间衡量，仿佛只是眨了眨眼，又仿佛穿越了一条没有尽头的隧道。",
            screenEffect: "stardust?density=50",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "然后，一切重新出现了。但不是从原来的位置。",
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我感到了重量。我感到了温度。我感到了空气拂过皮肤的触感——但一切都和以前不一样了。我的视角比原来低了小半个头的位置，前方的景物——祭坛的石柱、远处的树冠、空气中漂浮的微光——看起来都和之前略有不同。我低下头，看到的是一双完全陌生的手。",
            effects: ["dim"],
            screenEffect: "snow?density=15"
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "那是一双纤细而白皙的手，手指修长得不像是人类应有的比例，每一个指节都精致得仿佛被精心雕刻过。指甲是自然的淡粉色，泛着柔和的光泽。皮肤薄得几乎透明，可以看到皮肤下细细的青色血管。手掌比我的小了一圈，手指的触感却比我的敏锐得多——我甚至能感觉到空气中每一丝微弱的魔力波动。",
            effects: [],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "这就是……爱莉希雅的手。我——我现在的身体——就是她的身体。",
            effects: ["flashWhite"],
            cgChanges: { action: "enter", id: "elysia_possession", animation: "scaleIn" }
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我猛地回头看去——用这具新的身体回头。在我的身后，我原先的身体——那个二十四年的人类躯壳——正软倒在地上，双目紧闭，像个断了线的木偶。而我的意识，此刻完全、彻底地存在于爱莉希雅的身体之中。",
            effects: ["screenShake"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "但更令我震惊的是另一件事。我能感觉到，在这具身体的深处，还存在着另一个意识——黑暗的，侵略性的，此刻正在疯狂地挣扎。瓦尔加斯。他也在这里。但与预想不同的是，我能清晰地感觉到自己的力量占据着上风——护身符的绿光在我进入的瞬间似乎压制住了他的暗影之力，把他逼退到了意识深处的某个角落。",
            screenEffect: "stardust?density=35",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "而更深处——在那黑暗之下——我隐约感知到了一个安静的、温柔的、仿佛沉睡了一般的意识。那是爱莉希雅。她的灵魂被瓦尔加斯压制了，但并没有消失。她还在这里。这个发现让我心中涌起一股强烈的决心。",
            effects: [],
            jumpChapter: "body_explore"
        }
    ],

    // ======================= 身躯探索 =======================
    "body_explore": [
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我——作为爱莉希雅——缓缓地站直了身体。这是我用这具新身体做出的第一个自主动作。立刻，无数细微的感受如潮水般涌来。",
            effects: [],
            screenEffect: "snow?density=20"
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "首先是平衡感。我原来的身体重心在胸腔偏上的位置，肩膀宽而沉，每一步都需要大腿和腰腹的肌肉配合来维持稳定。但这具身体的重心低了很多——大约在腰腹之间——而且整个骨架都轻得让我一时无法适应。就好像从开一辆笨重的卡车变成了驾驶一艘轻盈的小船。我下意识地想要迈出一步，结果差点因为用力过度而向前扑倒。",
            effects: ["screenShake"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我稳住身体，低头看向自己的——不，她的——肩膀和手臂。原先宽阔的、覆着一层结实肌肉的肩膀不见了，取而代之的是一对圆润而纤细的肩头，锁骨在皮肤下清晰可见，勾勒出一道优雅的弧线。我的上臂比以前细了何止一圈，手指圈上去能轻松环握。手臂上的皮肤光滑而柔软，没有我原来那些粗大的毛孔和零星的疤痕——不对，应该说完全没有丝毫瑕疵。",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我抬起手——这只陌生而又亲密的精灵之手——轻轻触碰了自己的脸。指尖传来的触感让我倒吸了一口气。我原来的脸棱角分明，下颚骨突出，皮肤也因常年日晒而有些粗糙。但此刻指尖触及的是一张线条柔和得多的面孔，颧骨的位置更高，脸颊的皮肤滑嫩得像是刚剥壳的蛋。下巴小巧精致，嘴唇比我原来的厚一些，也更柔软，手指按上去有种微弹的触感。",
            effects: ["dim"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我的指尖沿着脸颊滑到了耳侧，触到了耳朵上方尖锐的软骨——那对属于精灵的耳朵。耳朵的外部比我原来大了一圈，但形状纤巧，耳廓的弧度优美，最上端形成了一个尖角。当我的指尖触到耳尖的时候，一阵奇异的酥麻感从耳尖蔓延开来，沿着颈侧一路传到了肩膀。这具身体的耳朵远比人类的敏感得多——我能听到远处树叶摩挲的声音，甚至能分辨出风中夹杂的、来自森林各处的微弱魔力波动。",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我的手从耳边滑落，抚过了自己的头发。银色的长发像流水一样从指缝间滑落，柔顺得不可思议。我原来的头发是深棕色的短发，硬而粗，早起时总是东翘西翘。但现在这头银发垂到了腰际，每一丝都细如蚕丝却更坚韧，带着一种天然的凉意，在昏暗的祭坛光线下泛着微弱的荧光。我把一束头发凑到鼻子前——淡淡的草木清香，混合着某种说不出的甜味，像是夜色中的茉莉。",
            effects: [],
            screenEffect: "stardust?density=20"
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我深吸了一口气，将注意力继续向下。脖子——纤细的、天鹅般的颈项，皮肤薄而敏感，每一次吞咽都能清晰感觉到喉部的细微运动。脖子下方，锁骨平直而分明，形成两道优美的横向弧线。再向下——我的呼吸不由自主地停了一瞬。",
            effects: ["flashWhite"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "胸口。那里不再是我熟悉的平坦和坚实的胸肌，而是一对柔软而饱满的隆起。青色的长袍在胸口处被撑起了一道起伏的曲线——曲线不大，但足以让这件贴身的袍子呈现出完全不同的形态。我感到一阵强烈的陌生感，同时又夹杂着无法否认的好奇。我抬起双手，缓缓地放在了自己的胸口上。",
            effects: ["dim"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "柔软的触感透过薄薄的衣料传到掌心，温热而微弹。与男人平坦坚硬的胸部完全不同，这里的每一寸皮肤都柔嫩而敏感，隔着衣服也能感受到内部细微的重量和轮廓。我本能地收回了手，心脏在胸腔里跳得又快又重——这颗心脏跳动的频率和力道也和我原来的不一样，更轻更快一些，像是林间受惊的小鹿。",
            effects: ["screenShake"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我强迫自己冷静下来，继续向下感受这具身体的每一处。腹部——平坦而柔软，没有我原先那层虽薄但坚实的腹肌。取而代之的是一种柔顺的曲线，从肋骨下方平滑地过渡到腰身。而腰——这是我感受最明显的变化之一。原来的腰是直的，维度与胸腹几乎一致。但这具身体的腰明显向内收束，形成了一个柔美的内凹弧度。我的手沿着腰侧滑过，能清晰感受到那道从肋骨到胯骨的优美曲线。",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "腰胯之下，是另一种全新的体验。原来身体的骨盆较窄，两条腿之间的距离近。而现在——胯部比原来宽了不少，形成了女性特有的圆润曲线。长袍的布料在胯部被微微撑开，垂落时形成一道不同于男子的褶皱。我试着并拢双腿——膝盖可以轻松地靠在一起，两条大腿之间几乎没有间隙，这和男性身体的感觉完全不同。",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "而最核心的不同……在两腿之间。那里原本熟悉的重量和存在消失了，取而代之的是一片平坦和柔软。一种深刻的、根本性的缺失感让我心头一凛。这不是失去了某种功能的不便，而是整个身体底层的自我认知在这一刻被彻底颠覆了。我的大脑仍然认为'我'是男性，但这具身体每一寸皮肤、每一个器官所反馈回来的信号都在说：不，你是女性。",
            effects: ["flashBlack", "screenShake"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我花了很长时间来消化这种分裂感。然后，我弯下腰——动作比预期中轻盈得多——掀起了长袍的下摆，看向自己的双腿。那双腿修长而笔直，皮肤白得像上好的羊脂玉，在微光下泛着淡淡的青色。小腿的线条流畅优美，脚踝纤细得我可以一只手握住。我原先的腿粗壮有力，膝盖上布满了运动留下的擦伤痕迹。而这双腿——光滑、纤细、线条柔和——膝盖圆润可爱，皮肤上没有任何疤痕或粗糙的痕迹。",
            effects: []
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "最后，我看向了自己的双脚。那是两只小巧的、赤裸的脚——爱莉希雅在森林里从不穿鞋。脚背的皮肤薄而白皙，足弓高高隆起形成一道优美的弧线。脚趾修长整齐，从大脚趾到小脚趾排列成流畅的斜线，趾尖圆润如珍珠。我试着活动了一下脚趾——它们灵活得超出预期，每一根都能独立弯曲和伸展。原来男人的脚宽大厚实，脚趾短粗，脚底布满硬茧。而此刻这双精灵的赤脚踩在祭坛冰冷的石面上，那一丝丝凉意沿着脚底向上蔓延，每一处触感都清晰得惊人。",
            effects: ["dim"],
            screenEffect: "snow?density=25"
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我重新站直了身体——用这具轻盈的、柔软的、陌生而又美丽的精灵之躯。我花了一段不短的时间来重新学习如何站立、如何呼吸、如何在这个全新的身体里存在。护身符在我脖子上仍然散发着微弱的暖意，提醒着我还是'安文'——至少在意识上。但此刻我的身体是爱莉希雅的，而我必须扮演好这个角色。",
            effects: [],
            jumpChapter: "elysia_life"
        }
    ],

    // ======================= 精灵生涯 =======================
    "elysia_life": [
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我把自己的——安文的——身体小心地安置在祭坛旁一处安全的石凹中。护身符在他脖子上继续发出微弱的绿光，维持着身体最低限度的生命体征。祖父的笔记里说，只要护身符不离开本体太远，意识随时可以返回。我暂时松了口气。",
            screenEffect: "snow?density=25",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "踏出祭坛，重新走在森林小径上的感觉完全不同了。爱莉希雅的眼睛——现在是我的眼睛——看到的森林比原先丰富得多。普通的树木上浮动着肉眼不可见的光晕，林间的雾气呈现出一层淡淡的金辉，那是森林自身的魔力在流动。耳朵能捕捉到数十步外松鼠踏过枯叶的声响。连脚底踩在泥土上的触感都比人类时细腻了十倍——我能分辨出覆于泥土表面的每一粒沙砾、每一片薄苔的纹理。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我穿过森林，走向爱莉希雅在笔记里提到过的林间小屋。那是一间用古老橡木搭建的小巧屋舍，爬满了发光的藤蔓。推开门的瞬间，一股淡淡的草木熏香扑鼻而来——这是她的住处，她的气味，她的生活。房间里面布置得简洁而雅致，墙上挂着几幅手绘的植物图鉴，桌上放着一叠写了一半的巡林记录，窗台上摆着几盆我叫不出名字的发光植物。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我在一面磨光的铜镜前停下了脚步。镜子里映出的人——是爱莉希雅。银色的长发垂落在肩头，淡绿色的眼眸在昏暗的房间里泛着微光。尖尖的耳朵，小巧的鼻子，柔软的嘴唇。纤细的颈项，圆润的肩头，青色长袍下起伏的曲线。我抬起手，镜中人也抬起手。我微微侧头，她也微微侧头。我试着微笑——镜中人的嘴角上扬了一个微小的弧度，眼神中却带着几分不确定的迷茫。",
            cgChanges: { action: "enter", id: "elysia_possession", animation: "pulse" },
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "就在这时，小屋外传来了脚步声——不是动物的，而是另一个精灵。一个年轻的声音从门外传来：'爱莉希雅姐姐？你在里面吗？森林东面的封印节点出现了魔力紊乱——长老让我来找你商量对策。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "我的心跳漏了一拍。这是爱莉希雅的社交圈——她的同族，她的伙伴。如果我现在拒绝见面，反而会引起怀疑。我必须装作她。我走到门边，回忆着她说话的语气和节奏——清冽的、略带疏离但不乏温和的声音。",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "'我在这里。'我开口说话——从这具身体第一次发出自主的声音。嗓音从喉咙里流出来的一瞬间，我几乎被自己吓了一跳。那是爱莉希雅的声音——清澈、柔和、带着精灵特有的韵味。'东面的节点？具体是什么情况？'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "门外的精灵回答道：'第三和第四符文出现了逆向旋转——长老说是祭坛方向传来的暗影波动所致。瓦尔加斯的封印正在加速崩解，我们可能需要启动紧急预案。'",
            effects: ["dim"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "'我明白了。你先回去告诉长老，我处理好手头的事情就过去。还有——'我顿了顿，搜刮着爱莉希雅的记忆碎片——那些隐约浮现在意识边缘的、属于她的知识和情感。'让巡林的队伍远离北面古石阵那一带，那里来了一个人类的访客。'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "determined", animation: "pulse" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "那个精灵应声离去后，我靠在门板上长长地呼出一口气。第一次用这具身体与其他人交流——而且是爱莉希雅的族人——竟然成功了。但同时，一个沉重的认识也压在了我心上：森林的危机比爱莉希雅告诉我的还要严重。瓦尔加斯的封印不是'弱了'，而是正在崩塌。而此刻，他的意识——至少一部分——正和我一同住在这具精灵的身体里。",
            effects: ["vignette"],
            screenEffect: "corruption?density=15",
            jumpChapter: "final_choice"
        }
    ],

    // ======================= 命运抉择 =======================
    "final_choice": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "回到祭坛的时候，天色已经完全暗了下来。厚重的云层遮住了月亮，只有护身符的绿光照亮了一小片区域。安文的身体还静静地躺在石凹中，胸口缓缓起伏。我蹲下来看着那张熟悉的、却又显得陌生的面孔——二十四年来我每天在镜子里看到的那张脸，此刻从外部看，格外不真实。",
            screenEffect: "bloodmoon?density=15",
            effects: ["dim"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "瓦尔加斯在我意识深处蠢蠢欲动。我能感觉到他在积蓄力量，试图重新夺取对这具身体的控制权。而爱莉希雅的灵魂仍然安静地沉在最底层——但如果我的判断没错，通过护身符的力量，我有办法唤醒她。问题是，这需要我继续留在这具身体里，与瓦尔加斯的意识对抗。而另一边，回到自己的身体、用人类的身份去对抗他……胜算更低。",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我低头看着自己纤细的精灵双手，感受着这具身体里涌动的魔力。爱莉希雅的魔力——纯粹的、流淌了数百年的森林之力——此刻尽在我的掌握之中。如果我将这股力量与护身符的咒文结合起来，或许真的能够从内部击溃瓦尔加斯。但如果失败了，不仅爱莉希雅的身体会被他彻底占据，连我的意识也会被吞噬。",
            effects: [],
            cgChanges: { action: "enter", id: "ancient_mural", animation: "scaleIn" }
        },
        {
            sceneId: "ancient_altar",
            type: "choice",
            text: "这是攸关两个灵魂命运的关键抉择：",
            choices: [
                {
                    text: "✨ 留在爱莉希雅体内，借助护身符与精灵魔力从内部驱散瓦尔加斯",
                    updateItem: { id: "amulet", flag: "exorcism_ritual" },
                    jumpChapter: "redemption_route"
                },
                {
                    text: "⬅️ 返回自己的身体，用人类的力量配合祭祀匕首进行外部对抗",
                    jumpChapter: "exorcism_route"
                }
            ]
        }
    ],

    // ======================= 内部救赎路线（救赎结局） =======================
    "redemption_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我做出了决定：留下来。不是为了占有什么，而是为了夺回什么。我盘腿坐在祭坛的石板上，双手握住护身符，闭上眼睛。我将意识向内收束，沿着护身符的绿光潜入这具身体的深处——潜入了那片被黑暗盘踞的意识之海。",
            updateItem: { id: "amulet", flag: "exorcism_ritual" },
            effects: ["flashWhite"],
            screenEffect: "stardust?density=45"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "在那片幽深的意识空间中，我看见了瓦尔加斯。他不再是人形的投影，而是一团扭曲的暗红色暗影——触手般的黑暗蔓延向意识空间的各个角落，牢牢地缠绕着空间的每一道壁垒。看到我出现，那团暗影发出了低沉的咆哮。'愚蠢的人类！你以为凭你那点意志就能对抗我？我盘踞了上千年的灵魂牢笼，岂是你这凡人的意识所能撼动的？'",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "shake" }],
            screenEffect: "corruption?density=40",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我没有理会他的咆哮，而是将注意力投向意识空间最深处的那个光点——那里蜷缩着爱莉希雅的灵魂。她的意识像一团微弱的淡青色火焰，被黑暗缠绕着几乎熄灭，但火心仍然顽强地跳动。我向她伸出'手'——不是身体的手，而是意识的触手。",
            screenEffect: "stardust?density=50",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "在意识相触的一瞬间，她的声音——她真正的、未被污染的声音——微弱地在我心中响起。'安……文？是你吗？我感觉到了……是你在我的身体里？'",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "sad", animation: "bounce" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "'是我。爱莉希雅，听着——你祖父把护身符留给我祖父是有原因的。你的身体里现在有两个外来意识，但你是这具身体真正的主人。我需要你醒来——和我一起——把那个入侵者赶出去！'",
            effects: []
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "她的意识在我身边亮了起来，淡青色的火焰迅速壮大。'我……我以为我已经输了。我不够强大。但既然你在这里——既然你在我的身体里为我而战——那我绝不会让你一个人面对。我们一起来。'她的声音从微弱变得坚定，带着数百年来作为森林守护者积淀下来的不容置疑的力量。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "determined", animation: "pulse" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "在意识的层面，两个灵魂的力量汇聚在一起。护身符的绿光在外部世界爆发出耀眼的光芒，将整个祭坛照得如同白昼。爱莉希雅的精灵魔力从沉睡中全面苏醒，像决堤的洪流般冲刷着意识空间的每一个角落。瓦尔加斯的黑暗触手开始退缩、崩解、化为虚无。",
            effects: ["flashWhite", "screenShake"],
            screenEffect: "stardust?density=60"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "不！！！这不可能！千年的积累，被一个人类和一个精灵丫头——我不接受！！！",
            characterChanges: [{ id: "vargas", action: "leave", animation: "fadeOut" }],
            effects: ["flashBlack", "screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "暗影像退潮般消散而去。意识空间恢复了澄澈——一片宁静的、淡青色的湖泊出现在了原本被黑暗占据的地方。瓦尔加斯的恶意被彻底驱逐了。爱莉希雅的灵魂重新充盈了她的身体，而我——我该离开了。",
            cgChanges: { action: "leave", animation: "fadeOut" },
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我在意识空间中最后'看'了她一眼——完整的、自由的、光芒四射的爱莉希雅。然后我将意识沿着护身符的绿光抽离，回到了自己原先的身体之中。",
            effects: [],
            screenEffect: "stardust?density=40",
            cgChanges: { action: "enter", id: "redemption_light", animation: "scaleIn" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "睁开眼的时候，我——真正的我，安文——正在喘着粗气，后背被冷汗浸透了。我的手——我自己的、粗糙的、熟悉的手——正紧紧地握着护身符。而在我面前，爱莉希雅独自站立着，眼中的暗红已经完全褪去，那双淡绿色的眼眸恢复了清澈。她低头看着自己的双手，肩膀微微颤抖着。",
            effects: []
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "她抬起头，泪水从眼角滑落——清澈的、无声的泪水，顺着白皙的面颊淌过精巧的下巴，滴落在祭坛的石板上。'你……你做到了。你进入我的身体，在我的灵魂最深处，与瓦尔加斯正面交锋……为了我。'她的声音在颤抖，但语气里不再是疏离，而是某种破裂之后重新凝结的、更深厚的情感。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }],
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "我们一起走出森林。迷雾正在散去，阳光穿透了几个世纪以来不曾被穿透的厚重雾障，一道道金色的光束洒在林间空地上。森林发出了某种低沉的、愉悦的回响——那是整座阿瓦隆在醒来。爱莉希雅走到我身边，握住了我的手。她的掌心很凉，但握得比任何时候都用力。'迷雾终于散了。安文，你祖父的遗愿——我们共同完成了。'",
            screenEffect: "sakura?density=35,color=#ffb7c5",
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "我看着她的侧脸——在阳光下，她的银发泛着碎金般的光泽，尖耳微微向后倾斜，嘴角挂着淡淡的笑意。在经历了附身与被附身的一切之后，我们之间生出了某种难以名状的纽带。我知道，我将永远记得在另一具身体里度过的那段短暂而奇怪的时光——记得那双纤细的手，那头银色的长发，那双灵巧的赤脚踩在泥土上的触感。那不仅是被附身的她的体验，也是附身者我自己的体验。",
            effects: ["dim"]
        },
        {
            sceneId: "forest_gate",
            type: "ending",
            endingId: "redemption_end"
        }
    ],

    // ======================= 外部驱魔路线·牺牲 =======================
    "exorcism_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我选择了回归。护身符的绿光逆转流动，将我的意识从爱莉希雅的身体中抽离回自己的躯壳。那种感觉怪异极了——前一秒我还带着她轻盈的身体站立着，后一秒我就重重地摔回了自己沉重的人类躯体中，大口喘着气。",
            updateItem: { id: "log", flag: "exorcism_ritual" },
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "日志夹层中的驱魔祷文。我飞快地翻到那一页，上面的古精灵语符文在我眼前跳动着——我在附身期间似乎获得了一些对精灵语的直觉理解。'以先祖之名，以森林之源，驱散盘踞的黑暗！'我念出了祷文的第一句，护身符应声而起，绿色的光柱冲破天穹。",
            updateItem: { id: "amulet", flag: "exorcism_ritual" },
            screenEffect: "stardust?density=45",
            effects: ["flashWhite"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "被附身的爱莉希雅——瓦尔加斯——被绿光击中，发出一声痛苦的嘶吼。这具纤细的精灵之躯剧烈地颤抖起来，黑色的雾气从她的皮肤表面渗出一缕缕的暗影，像是被强行撕扯出来的寄生虫。'这不可能！区区人类的祷文……啊！！'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"],
            screenEffect: "corruption?density=50"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "但驱魔的代价比我想象中更大。祷文每念出一句，护身符的晶石就裂开一道裂痕。当最后一句祷文脱口而出时，护身符发出了最后一声清脆的鸣响——然后粉碎了。千百年来守护家族传承的至宝，在这个瞬间化为了飘散在空中的晶莹尘埃。",
            loseItem: "amulet",
            loseApproach: "destroy",
            effects: ["flashBlack"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "瓦尔加斯的暗影在消散之前发出了最后的诅咒：'毁了我的容器……不等于消灭了我。封印还在持续崩解，失去护身符的你……迟早还会面对我。到时候，没有精灵的躯体，也没有先祖的庇护——你什么都不是……'",
            characterChanges: [{ id: "vargas", action: "leave", animation: "fadeOut" }],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "黑暗褪去。爱莉希雅的身体软倒在地上，我冲过去扶住她。她缓慢地睁开了眼睛——淡绿色恢复了清澈，但眼底深处的疲惫清晰可见。'安……文？我……我感觉像做了一场长长的噩梦……那祭坛……瓦尔加斯……他被赶走了？'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "bounce" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "'暂时是的。但他说得对——封印还在。护身符碎了，我们没有永久解决的办法。'我握住她的手——那双我曾短暂拥有过的纤细的手——感受到她指尖传来的微弱凉意。'但只要你还活着，只要这片森林还在，我们就有时间找到另一个答案。'",
            effects: ["dim"],
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "她微微点头，银发散落在草地上，像是铺了一地的月光。迷雾没有完全散去——只是暂时退到了森林的边界之外。但阳光已经照进了这片古老林地的一角，而爱莉希雅仍然站在那里，守护着她注定要守护的一切。这份守护，如今多了另一个人的承诺。",
            screenEffect: "sakura?density=35,color=#ffb7c5",
            effects: []
        },
        {
            sceneId: "forest_gate",
            type: "ending",
            endingId: "sacrifice_end"
        }
    ],

    // ======================= 至暗路线·双重附身的终局 =======================
    "desperate_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "我拔出祖父的祭祀匕首，不顾一切地冲向被附身的爱莉希雅。'我一定会把你救回来！'愤怒和恐惧同时燃烧在我的胸口——我无法忍受看到她被那个恶魔操纵的样子。",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "瓦尔加斯——在爱莉希雅的脸上——露出了一个残酷的微笑。'愚蠢！这把匕首上的术式早在几十年前就被我暗中篡改过了。你以为你祖父托付给她的是武器？不——那是另一道封印的钥匙，而我就是那个封印的受益者！'",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "shake" }],
            screenEffect: "corruption?density=45",
            effects: ["flashBlack"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "匕首刺出的瞬间，剑身上的术式忽然反向旋转——暗红色的光从刀尖迸发，顺着我的手臂蔓延到我的肩膀、脖颈、全身。一阵尖锐的刺痛穿透了我的胸腔，然后——我第二次感受到了那种意识被抽离的感觉。但这一次，不是按照我的意愿。",
            loseItem: "dagger",
            loseApproach: "destroy",
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "瓦尔加斯利用匕首上被篡改的术式，强行将我的意识也拉进了爱莉希雅的身体。现在——三个意识共同存在于同一具纤细的精灵躯壳之中。一个真正的守护者，一个疯狂的入侵者，还有一个愚蠢的、主动送上门的凡人。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "bounce" }],
            cgChanges: { action: "enter", id: "elysia_possession", animation: "pulse" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "'现在你明白了吗，安文？你自己跳进了笼子。爱莉希雅的灵魂被困在最底层，你的意识被我压制在中间层，而我——瓦尔加斯——现在拥有两个灵魂的力量作为养分。再见了，凡人。你的愚蠢为我们拉开了新纪元的序幕。'",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "angry", animation: "bounce" }],
            effects: ["flashBlack"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "在意识的最深处，我隐约感知到爱莉希雅——她的灵魂像一片枯萎的花瓣飘浮在黑暗中。她的声音奇异地平静，没有任何责备。'安文……你不该来的。但现在说这些都太迟了。他吞噬了我大部分的力量，而你的恐惧只会加速这个过程。我们……或许真的出不去了。'",
            effects: ["dim"]
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "player",
            text: "我挣扎着想要回应她，但黑暗已经侵蚀了意识的大半。护身符的绿光越来越微弱——它在努力维持我仅存的意识碎片，但瓦尔加斯的力量太强了。我的感官开始褪去：精灵耳朵听到的风声消失了，赤脚踩在石面上的触感消失了，最后连意识本身也在黑暗中沉没。最后残存的念头，是爱莉希雅那头银发在风中散开的画面。",
            screenEffect: "bloodmoon?density=50",
            effects: ["flashBlack", "vignette"],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "altar_core",
            type: "dialogue",
            characterId: "vargas",
            text: "他操控着那具美丽的精灵之躯，缓缓走向祭坛的正中央。黑暗从她的脚下蔓延开来，笼罩了整座阿瓦隆。迷雾不再只是困扰森林——它们变成了活物，开始吞噬一切生命。至暗的时代，就此开始。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "shake" }],
            screenEffect: "corruption?density=60",
            effects: ["flashBlack"]
        },
        {
            sceneId: "altar_core",
            type: "ending",
            endingId: "dark_possession_end"
        }
    ]
};

window.STORY_CHAPTERS = STORY_CHAPTERS;

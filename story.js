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
        description: "凭借智慧与传承，你对照壁画读懂了日志，成功在核心祭坛唤醒了‘神秘传家护身符’。你击碎了瓦加斯的野心，用两代人的守护换来了迷雾的散去与阿瓦隆森林的永恒觉醒。"
    },
    {
        id: "sacrifice_end",
        title: "NORMAL END: 孤注一掷的燃刃",
        description: "在没有唤醒核心魔力的情况下，你选择将刻满充能术式的‘古代祭祀匕首’过载引爆，用极端的毁灭方式与邪恶势力同归于尽。阿瓦隆得以保全，而你的名字成为了精灵史诗中的无名传说。"
    },
    {
        id: "dark_possession_end",
        title: "至暗结局·永夜的低语",
        description: "面对被附身的爱莉希雅，你未能找到驱魔的方法。瓦尔加斯彻底占据了她的灵魂，精灵守护者成为新的黑暗载体，迷雾森林陷入永恒的绝望。"
    },
    {
        id: "redemption_end",
        title: "救赎结局·灵魂的觉醒",
        description: "你从祖父的日志夹层中发现了驱魔祷文，并借助护身符的力量唤醒了爱莉希雅深处的自我。黑暗被驱散，她流下感激的泪水，你们共同重建了阿瓦隆的希望。"
    }
];

const STORY_CHAPTERS = {
    // ======================= 序章：迷雾之邀 =======================
    "main": [
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "（深夜，酒馆的烛火摇曳。我再次翻开祖父的航海日志，一张泛黄的旧照片滑落。）",
            effects: ["vignette"],
            screenEffect: "rain?density=25,speed=40,wind=0.3",
            cgChanges: { action: "enter", id: "old_photo", animation: "scaleIn" }
        },
        {
            sceneId: "tavern_interior",
            type: "dialogue",
            characterId: "player",
            text: "照片背面写着：‘赠予我最挚爱的森林挚友’。我必须前往阿瓦隆，解开家族诅咒。",
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "停下脚步，凡人。前方是迷雾森林的禁地，凡人踏入将永世迷失。",
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            screenEffect: "snow?density=35",
            effects: ["dim"]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "我是安德鲁的孙子！请看这个——祖父的日志！",
            loseItem: "log",
            loseApproach: "handOver"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "（瞳孔震动）你是安德鲁的后代？……难怪我嗅到了熟悉的气息。森林正在枯萎，邪恶势力蠢蠢欲动。跟我来，但别指望我会完全信任你。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }]
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "这是你祖父当年托我保管的祭祀匕首，如今物归原主。",
            gainItem: "dagger",
            gainApproach: "receive"
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "player",
            text: "（接过冰冷的匕首，刃面术式微微发光。）",
            gainItem: "log",
            gainApproach: "receive",
            jumpChapter: "ruins_exploration"
        }
    ],

    // ======================= 遗迹探索 & 壁画解读 =======================
    "ruins_exploration": [
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "player",
            text: "这些石壁上的壁画……似乎描绘着远古战争与封印仪式。",
            effects: ["dim"],
            characterChanges: [{ id: "elysia", action: "enter", spriteId: "idle", animation: "fadeIn" }]
        },
        {
            sceneId: "ruins_entrance",
            type: "dialogue",
            characterId: "elysia",
            text: "不要直视太久！壁画中封印着低语魔咒，意志不坚者会被侵蚀。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "shock", animation: "shake" }],
            effects: ["screenShake"]
        },
        {
            sceneId: "ruins_entrance",
            type: "choice",
            text: "面对壁画的诱惑，你选择：",
            choices: [
                {
                    text: "🧠 集中精神，研究壁画暗号（获得关键线索）",
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
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "小心！我感觉到了一股异样的魔力……是瓦尔加斯的气息，但他不应该直接出现在这里。",
            effects: ["vignette"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "呵呵呵……小精灵，你的感知倒是不错。不过，今天我要猎取的不是你的性命，而是你那具年轻的身体！",
            characterChanges: [{ id: "vargas", action: "enter", spriteId: "idle", animation: "fadeIn" }],
            screenEffect: "corruption?density=30"
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",
            text: "无耻！你休想——啊！！！",
            effects: ["flashWhite", "screenShake"]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "vargas",
            text: "太迟了！你的意志力远不如当年的安德鲁。现在，这具精灵躯壳归我了！",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "shake" }]
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "player",
            text: "爱莉希雅！你……你的眼睛变成了暗红色！",
            effects: []
        },
        {
            sceneId: "forest_path",
            type: "dialogue",
            characterId: "elysia",  // 此时已被附身，但名字仍显示爱莉希雅
            text: "哈哈哈哈！这具身体充满了魔力，比预想中还要完美。安文是吧？感谢你把她带到我面前。",
            screenEffect: "bloodmoon?density=20",
            cgChanges: { action: "enter", id: "elysia_possession", animation: "scaleIn" }
        },
        {
            sceneId: "forest_path",
            type: "choice",
            text: "瓦尔加斯占据了爱莉希雅的意识！你该如何应对？",
            choices: [
                {
                    text: "📖 翻阅祖父的日志，寻找破解附身的记载",
                    updateItem: { id: "log", flag: "exorcism_ritual" },
                    jumpChapter: "exorcism_route"
                },
                {
                    text: "🗡️ 拔出祭祀匕首，试图强行驱魔",
                    jumpChapter: "desperate_route"
                }
            ]
        }
    ],

    // ======================= 驱魔路线（救赎结局） =======================
    "exorcism_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "日志夹层里……果然有祖父留下的驱魔祷文！这是专门针对魔族附身的古老咒语！",
            updateItem: { id: "log", flag: "exorcism_ritual" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "护身符也在共鸣……它感应到了爱莉希雅灵魂深处的挣扎。",
            updateItem: { id: "amulet", flag: "exorcism_ritual" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "（挣扎地）安…文…快…趁我还能压制它…动手！",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "sad", animation: "bounce" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "以先祖之名，以森林之源，驱散盘踞的黑暗！",
            effects: ["flashWhite", "screenShake"],
            screenEffect: "stardust?density=40",
            cgChanges: { action: "enter", id: "redemption_light", animation: "scaleIn" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "不！！！你们这些蝼蚁，怎能破除千年的诅咒！",
            characterChanges: [{ id: "vargas", action: "leave", animation: "fadeOut" }]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "（黑暗褪去，她跌坐在地上，眼中恢复清澈）我…我还活着？谢谢你，安文。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "happy", animation: "pulse" }],
            cgChanges: { action: "leave", animation: "fadeOut" }
        },
        {
            sceneId: "forest_gate",
            type: "dialogue",
            characterId: "elysia",
            text: "笼罩森林的迷雾正在散去，阿瓦隆终于等来了真正的春天。祖父的遗愿，我们共同完成了。",
            screenEffect: "sakura?density=35,color=#ffb7c5",
            cgChanges: { action: "enter", id: "avalon_seal", animation: "scaleIn" }
        },
        {
            sceneId: "forest_gate",
            type: "ending",
            endingId: "redemption_end"
        }
    ],

    // ======================= 绝望路线（至暗结局） =======================
    "desperate_route": [
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "（握紧匕首，冲向被附身的爱莉希雅）我一定会把你救回来！",
            effects: ["screenShake"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "vargas",
            text: "愚蠢！这把匕首上的术式早已被我篡改！",
            screenEffect: "corruption?density=45",
            effects: ["flashBlack"]
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "什么？！（匕首反噬，手臂被暗影缠绕）",
            loseItem: "dagger",
            loseApproach: "destroy"
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "elysia",
            text: "（冷酷的声音）再见了，安文。这具完美的躯体将带来新的纪元。",
            characterChanges: [{ id: "elysia", action: "update", spriteId: "possessed", animation: "bounce" }],
            cgChanges: { action: "enter", id: "elysia_possession", animation: "pulse" }
        },
        {
            sceneId: "ancient_altar",
            type: "dialogue",
            characterId: "player",
            text: "不……爱莉希雅……（意识逐渐模糊）",
            effects: ["dim", "flashBlack"],
            screenEffect: "bloodmoon?density=30"
        },
        {
            sceneId: "ancient_altar",
            type: "ending",
            endingId: "dark_possession_end"
        }
    ]
};

window.STORY_CHAPTERS = STORY_CHAPTERS;
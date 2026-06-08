// assets.js

// 1. 角色配置库
const CHARACTERS = {
    "player": {
        name: "安文",
        color: "#3498db",
        race: "人类",
        gender: "男",
        role: "冒险探求者",
        defaultSpeed: 20,
        description: "继承了祖父遗志的年轻学者，今年二十二岁。身材匀称，肩膀宽阔有力，一双深褐色的眼眸中透着学者的沉静与冒险者的果敢。深棕短发略显凌乱，手指因常年翻阅古籍而磨出薄茧。祖父安德鲁留下的航海日志中隐藏着关于'意识共鸣'的古老秘术——那是他尚未完全理解的力量。",
        avatars: {
            "normal": "assets/characters/player/avatar.png",
        },
        sprites: {
            "idle": { id: "idle", label: "👤 默认日常", url: "/assets/characters/player/sprites/normal.png" }
        }
    },
    "elysia": {
        name: "爱丽希雅",
        color: "#2ecc71",
        race: "高等精灵",
        gender: "女",
        role: "迷雾森林守护者",
        defaultSpeed: 45,
        description: "活了三百余年的精灵守护者，外表却停留在人类二十岁的光景。银白长发如月光瀑布般垂至腰际，尖长的耳廓在发丝间若隐若现。身形纤长轻盈，腰肢柔韧得不可思议，一身素白长袍勾勒出精灵特有的优雅线条。双眸是澄澈的翡翠色，能在最深的暗夜中视物。数百年的孤独让她对凡人充满戒备，但安文的祖父安德鲁曾是她唯一信任的人类。",
        avatars: {
            "normal": "assets/characters/elysia/avatar.jpg",
            "happy": "assets/characters/elysia/avatar.jpg",
            "shock": "assets/characters/elysia/avatar.jpg",
            "sad": "assets/characters/elysia/avatar.jpg",
            "determined": "assets/characters/elysia/avatar.jpg",
            "possessed": "assets/characters/elysia/avatar_possessed.jpg"
        },
        sprites: {
            "idle": { id: "idle", url: "assets/characters/elysia/sprites/normal.png", label: "🍃 警惕冷漠" },
            "happy": { id: "happy", url: "assets/characters/elysia/sprites/normal.png", label: "✨ 释怀微笑" },
            "shock": { id: "shock", url: "assets/characters/elysia/sprites/normal.png", label: "💢 惊愕愤怒" },
            "sad": { id: "sad", url: "assets/characters/elysia/sprites/normal.png", label: "💧 情绪低落" },
            "determined": { id: "determined", url: "assets/characters/elysia/sprites/normal.png", label: "⚔️ 决然迎战" },
            "possessed": { id: "possessed", url: "assets/characters/elysia/sprites/possessed.png", label: "🌑 被附身·暗影瞳" }
        }
    },
    "vargas": {
        name: "瓦尔加斯",
        color: "#e74c3c",
        race: "魔族 / 堕落领主",
        gender: "男",
        role: "封印守护者之敌",
        defaultSpeed: 60,
        description: "被封印在远古遗迹深处的魔族领主。身躯高大，周身缭绕着紫黑色的暗影魔力。曾试图夺取精灵守护者的躯体以获得永生，却在三百年前被安德鲁与爱丽希雅联手封印。如今封印松动，他的意识碎片开始在森林中游荡，寻找新的躯体。",
        avatars: {
            "normal": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='100%' height='100%' fill='%23e74c3c'/><text x='50%' y='55%' font-size='60' fill='white' text-anchor='middle'>魔</text></svg>"
        },
        sprites: {
            "idle": { id: "idle", label: "🔥 投影狂妄", url: "assets/characters/vargas/sprites/angry.png" },
            "angry": { id: "angry", label: "👿 狰狞暴怒", url: "assets/characters/vargas/sprites/angry.png" }
        }
    },
    "lina": {
        name: "莉娜",
        color: "#f39c12",
        race: "人类",
        gender: "女",
        role: "商会之女·小镇之花",
        defaultSpeed: 35,
        description: "边境小镇商会长福斯特的独女，今年十九岁。一头栗色长发编成松散的辫子垂在左肩，圆润的脸颊上总是挂着温暖的笑容。身材娇小玲珑，双手因常年在店铺帮忙而灵巧有力。母亲早逝，从小在父亲和商会伙计们的照看下长大，性格开朗而善解人意。镇上几乎人人都认识她，她也能叫出每一个常客的名字。",
        avatars: {
            "normal": "assets/characters/lina/avatar.jpg"
        },
        sprites: {
            "idle": { id: "idle", url: "assets/characters/lina/sprites/normal.png", label: "🌻 开朗微笑" },
            "happy": { id: "happy", url: "assets/characters/lina/sprites/normal.png", label: "🌟 欣喜雀跃" },
            "sad": { id: "sad", url: "assets/characters/lina/sprites/normal.png", label: "🥀 黯然神伤" },
            "shock": { id: "shock", url: "assets/characters/lina/sprites/normal.png", label: "💥 惊恐万状" }
        }
    },
    "seraphine": {
        name: "赛拉菲娜",
        color: "#9b59b6",
        race: "半精灵",
        gender: "女",
        role: "王国骑士·边境守卫长",
        defaultSpeed: 40,
        description: "边境守卫骑士团的副团长，半精灵血统赋予了她超越常人的体能。浅紫色的短发利落地别在耳后，一双锐利的银灰色眼眸从不放过任何细节。身姿高挑挺拔，经年训练让她的每一寸肌肉都充满力量感——宽阔的肩膀、有力的双臂、紧实的腰腹和修长结实的双腿。她的剑术在边境无人能敌，手下的骑士们对她既敬畏又信赖。",
        avatars: {
            "normal": "assets/characters/seraphine/avatar.jpg"
        },
        sprites: {
            "idle": { id: "idle", url: "assets/characters/seraphine/sprites/normal.png", label: "⚜️ 英姿飒爽" },
            "angry": { id: "angry", url: "assets/characters/seraphine/sprites/normal.png", label: "🗡️ 怒目而视" },
            "soft": { id: "soft", url: "assets/characters/seraphine/sprites/normal.png", label: "🌙 温柔沉静" }
        }
    }
};

// 2. 场景环境库（扩充）
const SCENES = {
    "tavern_interior": {
        id: "tavern_interior",
        title: "深夜酒馆",
        url: "assets/scenes/tavern.jpg",
        bgPlaceholder: "linear-gradient(135deg, #2c1a1a 0%, #0b0808 100%)"
    },
    "forest_gate": {
        id: "forest_gate",
        title: "迷雾森林入口",
        url: "assets/scenes/forest.png",
        bgPlaceholder: "linear-gradient(to bottom, #114357, #f29492)"
    },
    "forest_path": {
        id: "forest_path",
        title: "幽暗林道",
        url: "assets/scenes/forest_path.png",
        bgPlaceholder: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)"
    },
    "secret_cavern": {
        id: "secret_cavern",
        title: "微光晶石洞窟",
        url: "assets/scenes/cavern.jpg",
        bgPlaceholder: "linear-gradient(135deg, #093028 0%, #237a57 100%)"
    },
    "ancient_altar": {
        id: "ancient_altar",
        title: "古代巍峨祭坛",
        url: "assets/scenes/altar.png",
        bgPlaceholder: "linear-gradient(to top, #41295a, #2f0743)"
    },
    "sky_bg": {
        id: "sky_bg",
        title: "崩坏苍穹",
        url: "assets/scenes/sky.jpg",
        bgPlaceholder: "linear-gradient(135deg, #1a1a2e 0%, #020024 100%)"
    },
    "ruins_entrance": {
        id: "ruins_entrance",
        title: "远古遗迹廊道",
        url: "assets/scenes/ruins_entrance.png",
        bgPlaceholder: "linear-gradient(145deg, #1a1a2a, #0a0a14)"
    },
    "altar_core": {
        id: "altar_core",
        title: "核心祭坛·封印之地",
        url: "assets/scenes/altar_core.png",
        bgPlaceholder: "radial-gradient(circle, #2a0a2a, #000000)"
    },
    "forest_shrine": {
        id: "forest_shrine",
        title: "森林深处的秘境圣坛",
        url: "assets/scenes/cavern.jpg",
        bgPlaceholder: "linear-gradient(135deg, #0a2a1a 0%, #1a4a3a 100%)"
    },
    "village_square": {
        id: "village_square",
        title: "边境小镇·中央广场",
        url: "assets/scenes/forest.png",
        bgPlaceholder: "linear-gradient(135deg, #c9b896 0%, #8b7355 100%)"
    },
    "lina_home": {
        id: "lina_home",
        title: "福斯特商会·莉娜的住所",
        url: "assets/scenes/tavern.jpg",
        bgPlaceholder: "linear-gradient(135deg, #3a2a1a 0%, #1a0a08 100%)"
    },
    "knight_hall": {
        id: "knight_hall",
        title: "边境骑士团驻地",
        url: "assets/scenes/altar.png",
        bgPlaceholder: "linear-gradient(to bottom, #4a4a5a, #1a1a2a)"
    },
    "crystal_cave": {
        id: "crystal_cave",
        title: "共鸣晶窟·意识交汇之所",
        url: "assets/scenes/cavern.jpg",
        bgPlaceholder: "radial-gradient(circle at center, #2a0a4a, #0a0a1a)"
    }
};

// 3. 剧情图鉴 CG 资产库（扩充）
const CG_LIBRARY = {
    "old_photo": {
        id: "old_photo",
        title: "泛黄的旧照片",
        subtitle: "Memory Fragment - The Old Days",
        url: "/assets/cg/old_photo.png",
    },
    "ancient_mural": {
        id: "ancient_mural",
        title: "石壁上的意识传承图谱",
        subtitle: "Ancient Secret - Soul Resonance",
        url: "/assets/cg/ancient_mural.png",
    },
    "boss_awaken": {
        id: "boss_awaken",
        title: "远古暗影苏醒",
        subtitle: "Desire Branch - The Slumbering Evil",
        url: "/assets/cg/boss_awaken.png",
    },
    "avalon_seal": {
        id: "avalon_seal",
        title: "重筑圣洁结界",
        subtitle: "Hope Branch - The Last Light",
        url: "/assets/cg/seal_active.png",
    },
    "elysia_possession": {
        id: "elysia_possession",
        title: "初次的意识共鸣·精灵之躯",
        subtitle: "First Resonance - Elven Vessel",
        url: "/assets/cg/possession.png",
    },
    "redemption_light": {
        id: "redemption_light",
        title: "救赎之光",
        subtitle: "Soul Liberated",
        url: "/assets/cg/redemption.png",
    },
    "lina_possession": {
        id: "lina_possession",
        title: "第二次共鸣·凡人之躯",
        subtitle: "Second Resonance - Human Warmth",
        url: "/assets/cg/possession.png",
    },
    "seraphine_possession": {
        id: "seraphine_possession",
        title: "战场的共鸣·骑士之躯",
        subtitle: "Battle Resonance - Knight's Vessel",
        url: "/assets/cg/possession.png",
    },
    "spirit_crystal_glow": {
        id: "spirit_crystal_glow",
        title: "灵魂晶石的觉醒",
        subtitle: "The Awakening Crystal",
        url: "/assets/cg/redemption.png",
    }
};

// 4. 首页全局美学视觉配置文件
const HOME_CONFIG = {
    backgroundUrl: "assets/scenes/home_menu_bg.png",
    placeholderGradient: "linear-gradient(135deg, #0e0e14 0%, #030305 100%)",
    screenEffect: "snow",
    maskEffects: ["vignette", "dim"],
    showOverlay: true,
    overlayOpacity: 0.65
};

// 5. 游戏全结局定义库（扩充至包含新结局）
const ENDINGS = [
    {
        id: "bad_end",
        title: "BAD END: 迷失于永恒之雾",
        description: "你未能在错综复杂的森林线索中找到出路，浓雾侵蚀了你的心智。你成为了森林中无数徘徊幽魂中的一员。"
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
        description: "成功的将古老魔晶带回。破晓的曙光撕裂了笼罩数百年的迷雾，世界迎来了久违的平静与真相。"
    },
    {
        id: "dark_possession_end",
        title: "至暗结局·永夜的低语",
        description: "面对被附身的爱丽希雅，你未能找到驱魔的方法。瓦尔加斯彻底占据了她的灵魂，精灵守护者成为新的黑暗载体，迷雾森林陷入永恒的绝望。"
    },
    {
        id: "redemption_end",
        title: "救赎结局·灵魂的觉醒",
        description: "你从祖父的日志夹层中发现了驱魔祷文，借助灵魂晶石的力量唤醒了爱丽希雅深处的自我。黑暗被驱散，她流下感激的泪水，你们共同重建了阿瓦隆的希望。"
    },
    {
        id: "elf_body_end",
        title: "精灵之终·永恒的守护",
        description: "在精灵之躯中经历了漫长的时光，你与爱丽希雅的意识达成了前所未有的和谐。你选择留在她的体内，以精灵守护者的身份继续守护森林。两种意志融为了一体，阿瓦隆迎来了永恒的双魂守卫。"
    },
    {
        id: "human_love_end",
        title: "人间之终·温暖的归宿",
        description: "经历了精灵与人类两种躯体的附身之后，你在莉娜的纯真善意中找到了归属。你放下了祖父的使命，选择在小镇上与莉娜共度余生。每个黄昏，你都会握着她温暖的双手，感激命运让你懂得了不同生命的美。"
    },
    {
        id: "knight_end",
        title: "骑士之终·边境的黎明",
        description: "在赛拉菲娜的躯体中，你亲历了边境战场的残酷与荣耀。你赢得了整个骑士团的尊敬，带领他们击退了黑暗势力的入侵。当朝阳从边境线升起，你以骑士之躯立于城墙之上，一个新的传奇就此诞生。"
    }
];

// 6. 核心物品配置字典（扩充）
const ITEMS = {
    "log": {
        id: "log",
        name: "祖父的航海日志",
        icon: "📘",
        defaultDescription: "祖父安德鲁留下的破旧日志。前半部分记录了他年轻时探索阿瓦隆森林的零星片段，大部分字迹已被水渍和时间模糊。但在其中几页的夹层中，隐隐透出一些关于'意识转移'与'灵魂共鸣'的古老记载。",
        dynamicDescriptions: [
            { flag: "read_ancient_mural", description: "在对照古代壁画后，你终于读懂了日志夹层中隐藏的暗号。祖父在第三页用特殊墨水记录了他对灵魂共鸣术的研究——那是一种可以将意识暂时转移至他人体内的禁忌秘法。" },
            { flag: "boss_defeated", description: "使命已达。这本陪伴你走过生死迷途的日志，如今静静地躺着，诉说着两代人对守护阿瓦隆做出的牺牲。最后一页上，祖父写下了一行清晰的字：'共鸣不是夺取，而是理解。'" },
            { flag: "exorcism_ritual", description: "你从日志的最深层夹页中发现了祖父留下的完整驱魔祷文和灵魂共鸣的解除方法。那是以自身意志为锚点，将外来意识从被附身者体内驱逐的强大仪式。" },
            { flag: "mastered_resonance", description: "日志中关于灵魂共鸣的记载已被你完全掌握。祖父写道：'当你能真正理解另一个生命时，共鸣便不再是禁忌之术，而是灵魂之间最深的桥梁。'" }
        ]
    },
    "amulet": {
        id: "amulet",
        name: "神秘传家护身符",
        icon: "📿",
        defaultDescription: "材质不明的古老护身符，核心处镶嵌着一颗黯淡的晶石。握着它时，掌心会传来微微的温度，仿佛它拥有自己的生命。祖父的日志中提到，它是'开启意识之门的钥匙'。",
        dynamicDescriptions: [
            { flag: "altar_activated", description: "护身符在核心祭坛前引发了前所未有的共鸣。晶石已被完全点亮，散发着纯净的翠绿色荧光，充盈着古老的庇护魔法与灵魂共振之力。" },
            { flag: "exorcism_ritual", description: "护身符感应到了爱丽希雅体内的黑暗，晶石剧烈震颤，内部的绿光与暗影交替闪烁。它仿佛在催促——不，是在呼唤你采取行动。" },
            { flag: "mastered_resonance", description: "护身符的晶石如今稳定地散发出柔和的暖光。它不再是一件神秘的古物，而是你与灵魂共鸣之力之间最深层的联结。你可以通过它感知到周围生命的意识波动。" }
        ]
    },
    "dagger": {
        id: "dagger",
        name: "古代祭祀匕首",
        icon: "🗡️",
        defaultDescription: "在密道遗迹中寻获的仪式用短刃。刃口虽已微钝，但通体雕刻着繁复的能量引导术式。刃面上有一行细小的精灵文字：'意志为引，血肉为门。'",
        dynamicDescriptions: [
            { flag: "dagger_awakened", description: "匕首上的术式在灵魂晶石的共鸣下已被激活。刃面流转着淡蓝色的光纹，握柄处传来清晰的脉动。它不再只是一件仪式工具，而成为了引导意识流动的通道。" }
        ]
    },
    "crystal": {
        id: "crystal",
        name: "阿瓦隆核心晶石",
        icon: "💎",
        defaultDescription: "蕴含着庞大森林本源魔力的璀璨晶石。它的温度随着周围意识波动而不断变化，时而温热，时而滚烫。爱丽希雅说，它是整片森林的生命之心。",
        dynamicDescriptions: []
    },
    "spirit_crystal": {
        id: "spirit_crystal",
        name: "灵魂共鸣晶石",
        icon: "🔮",
        defaultDescription: "在远古遗迹壁画后方的暗格中发现的神秘晶石。通体半透明，内部流转着银白色的光丝。触碰它时，会感受到微弱的意识牵引——仿佛有什么在另一端呼唤。祖父的日志称之为'共鸣之钥'，是启动意识转移的媒介。",
        dynamicDescriptions: [
            { flag: "first_resonance", description: "经历过第一次灵魂共鸣后，晶石内部的银白光丝变得更加活跃，隐隐呈现出你与爱丽希雅意识交汇时的纹路。它已经与你的灵魂频率建立了联结。" },
            { flag: "second_resonance", description: "第二次共鸣让晶石的光芒变得更加稳定。它似乎记录下了每一种你曾触碰过的灵魂频率——爱丽希雅的翡翠绿、莉娜的暖金色……每一道光丝都在诉说一段独特的体验。" },
            { flag: "mastered_resonance", description: "晶石如今完全透明，内部的光丝编织成了复杂的立体图案。它不再是单纯的工具，而成为了你意识的延伸。你可以通过它感受到周围所有生命的灵魂脉动，并在必要的时候与之共鸣。" }
        ]
    },
    "soul_mirror": {
        id: "soul_mirror",
        name: "映魂之镜",
        icon: "🪞",
        defaultDescription: "爱丽希雅从精灵宝库中取出的古物。镜面并非玻璃，而是一层静止的液态光芒。它不映照外貌，而是映照灵魂的形态——对于被附身者而言，镜中会显现出两个重叠的身影。",
        dynamicDescriptions: [
            { flag: "mirror_used", description: "你曾经在镜中看到过两个重叠的身影——一个是身体的主人，一个是占据者。如今镜中的影像变得清晰而和谐，两条灵魂的轮廓不再撕裂，而是彼此交织。" }
        ]
    }
};

// ==================== 物品系统辅助函数（原 itemSystem.js 内容） ====================

// 1. 多样化的物品获取/失去/更新动画映射表
const ITEM_ANIMATION_PRESETS = {
    "gain": {
        "find": { class: "fx-item-find", title: "✨ 寻获物品", soundEffect: "pickup" },
        "receive": { class: "fx-item-receive", title: "🤝 获得赠予", soundEffect: "gift" },
        "unlock": { class: "fx-item-unlock", title: "🔓 封印解除", soundEffect: "magic" }
    },
    "lose": {
        "use": { class: "fx-item-use", title: "⚙️ 消耗物品", soundEffect: "consume" },
        "destroy": { class: "fx-item-destroy", title: "💥 物品损毁", soundEffect: "break" },
        "handOver": { class: "fx-item-give", title: "🤲 交出物品", soundEffect: "give" }
    },
    "update": {
        "change": { class: "fx-item-unlock", title: "🔄 物品发生异变", soundEffect: "magic" }
    }
};

function getDynamicItemDescription(itemId, currentFlags) {
    const item = ITEMS[itemId];
    if (!item) return "一件未在图鉴上登录的未知物件。";

    if (item.dynamicDescriptions && item.dynamicDescriptions.length > 0) {
        for (let i = item.dynamicDescriptions.length - 1; i >= 0; i--) {
            const cond = item.dynamicDescriptions[i];
            if (currentFlags && currentFlags[cond.flag]) {
                return cond.description;
            }
        }
    }
    return item.defaultDescription;
}

function getItemIcon(itemId) {
    return ITEMS[itemId]?.icon || "🎁";
}

function getItemName(itemId) {
    return ITEMS[itemId]?.name || itemId;
}

// 挂载到全局对象
window.CHARACTERS = CHARACTERS;
window.SCENES = SCENES;
window.CG_LIBRARY = CG_LIBRARY;
window.HOME_CONFIG = HOME_CONFIG;
window.ENDINGS = ENDINGS;
window.ITEMS = ITEMS;
window.ITEM_ANIMATION_PRESETS = ITEM_ANIMATION_PRESETS;
window.getDynamicItemDescription = getDynamicItemDescription;
window.getItemIcon = getItemIcon;
window.getItemName = getItemName;

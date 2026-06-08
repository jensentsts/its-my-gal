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
        description: "继承了祖父遗志的年轻学者，手中紧握着那本泛黄的航海日志。为了解开家族诅咒与迷雾森林的真相而踏上旅途。虽不会高深魔法，却拥有极强的洞察力与冷静的头脑。",
        avatars: {
            "normal": "assets/characters/player/avatar.png",
        },
        sprites: {
            "idle": { id: "idle", label: "👤 默认日常", url: "/assets/characters/player/sprites/normal.png" }
        }
    },
    "elysia": {
        name: "爱丽西亚",
        color: "#2ecc71",
        race: "高等精灵",
        gender: "女",
        role: "迷雾森林守护者",
        defaultSpeed: 45, 
        description: "活了数百年的精灵少女，岁月的痕迹并未留在她的脸上，反而沉淀出一种孤傲的冰冷。对凡人怀有极大的戒备心，但似乎对安文的祖父有着一段鲜为人知的复杂回忆。",
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
        description: "被封印在古代遗迹深处的远古魔族领主，企图通过诱骗凡人解开核心禁制来恢复真身。言语中充满诱惑与陷阱。",
        avatars: {
            "normal": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='100%' height='100%' fill='%23e74c3c'/><text x='50%' y='55%' font-size='60' fill='white' text-anchor='middle'>魔</text></svg>"
        },
        sprites: {
            "idle": { id: "idle", label: "🔥 投影狂妄", url: "assets/characters/vargas/sprites/angry.png" },
            "angry": { id: "angry", label: "👿 狰狞暴怒", url: "assets/characters/vargas/sprites/angry.png" }
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
        title: "石壁上的毁灭预言",
        subtitle: "Prophecy Fragment - Ancient Wall",
        url: "/assets/cg/ancient_mural.png",
    },
    "boss_awaken": {
        id: "boss_awaken",
        title: "远古炎魔苏醒",
        subtitle: "Desire Branch - The Slumbering Fire",
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
        title: "暗影侵蚀",
        subtitle: "The Fallen Guardian",
        url: "/assets/cg/possession.png",
    },
    "redemption_light": {
        id: "redemption_light",
        title: "救赎之光",
        subtitle: "Soul Liberated",
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
        description: "面对被附身的爱莉希雅，你未能找到驱魔的方法。瓦尔加斯彻底占据了她的灵魂，精灵守护者成为新的黑暗载体，迷雾森林陷入永恒的绝望。"
    },
    {
        id: "redemption_end",
        title: "救赎结局·灵魂的觉醒",
        description: "你从祖父的日志夹层中发现了驱魔祷文，并借助护身符的力量唤醒了爱莉希雅深处的自我。黑暗被驱散，她流下感激的泪水，你们共同重建了阿瓦隆的希望。"
    }
];

// 6. 核心物品配置字典
const ITEMS = {
    "log": {
        id: "log",
        name: "祖父的航海日志",
        icon: "📘",
        defaultDescription: "祖父安德鲁留下的破旧日志，记录了他年轻时探索阿瓦隆森林的零星片段。大部分字迹已被水渍模糊。",
        dynamicDescriptions: [
            { flag: "read_ancient_mural", description: "在对照古代壁画后，你终于读懂了日志第三页隐藏的暗号，上面标明了祭坛核心密道的开启方式。" },
            { flag: "boss_defeated", description: "使命已达。这本陪伴你走过生死迷途的日志，如今静静地躺着，诉说着两代人对守护阿瓦隆做出的牺牲。" },
            { flag: "exorcism_ritual", description: "你从日志的夹层中发现了祖父留下的驱魔祷文——那是专门用来破除魔族附身的古老咒语。" }
        ]
    },
    "amulet": {
        id: "amulet",
        name: "神秘传家护身符",
        icon: "📿",
        defaultDescription: "材质不明的古老护身符，核心处镶嵌着一颗黯淡的晶石。直觉告诉你它不仅仅是一件饰品。",
        dynamicDescriptions: [
            { flag: "altar_activated", description: "护身符在核心祭坛前引发了共鸣，晶石已被完全点亮，散发着纯净的绿色荧光，充盈着庇护魔法。" },
            { flag: "exorcism_ritual", description: "护身符感应到了爱莉希雅体内的黑暗，晶石剧烈震颤，仿佛在催促你念出祷文。" }
        ]
    },
    "dagger": {
        id: "dagger",
        name: "古代祭祀匕首",
        icon: "🗡️",
        defaultDescription: "在密道遗迹中寻获的仪式用短刃，虽然刃口有些钝，但雕刻着繁复的充能术式，对某些封印可能有奇效。",
        dynamicDescriptions: []
    },
    "crystal": {
        id: "crystal",
        name: "阿瓦隆核心晶石",
        icon: "💎",
        defaultDescription: "蕴含着庞大森林本源魔力的璀璨晶石。它的温度随着祭坛震动而不断升高。",
        dynamicDescriptions: []
    }
};

// ==================== 物品系统辅助函数（原 itemSystem.js 内容） ====================
// 保持与原有 itemSystem.js 完全一致的功能，仅迁移至此

// 1. 多样化的物品获取/失去/更新动画映射表 (CSS 动画类与文字渲染模板)
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

/**
 * 辅助函数：根据当前游戏 Flag 动态获取物品的最完整介绍
 */
function getDynamicItemDescription(itemId, currentFlags) {
    const item = ITEMS[itemId];
    if (!item) return "一件未在帝国图鉴上登录的未知神秘物件。";
    
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

/**
 * 辅助函数：根据物品ID获取图标
 */
function getItemIcon(itemId) {
    return ITEMS[itemId]?.icon || "🎁";
}

/**
 * 辅助函数：根据物品ID获取名称
 */
function getItemName(itemId) {
    return ITEMS[itemId]?.name || itemId;
}

// 挂载到全局对象，供 Vue 和游戏逻辑使用
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
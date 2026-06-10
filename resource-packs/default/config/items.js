/**
 * resource-packs/default/config/items.js
 *
 * Auto-converted from items.json + item-animation-presets.json
 */
export const ITEMS = {
  "log": {
    "id": "log",
    "name": "祖父的航海日志",
    "icon": "📘",
    "defaultDescription": "祖父安德鲁留下的破旧日志，记录了他年轻时探索阿瓦隆森林的零星片段。大部分字迹已被水渍模糊。",
    "dynamicDescriptions": [
      { "flag": "read_ancient_mural", "description": "在对照古代壁画后，你终于读懂了日志第三页隐藏的暗号，上面标明了祭坛核心密道的开启方式。" },
      { "flag": "boss_defeated", "description": "使命已达。这本陪伴你走过生死迷途的日志，如今静静地躺着，诉说着两代人对守护阿瓦隆做出的牺牲。" },
      { "flag": "exorcism_ritual", "description": "你从日志的夹层中发现了祖父留下的驱魔祷文——那是专门用来破除魔族附身的古老咒语。" }
    ]
  },
  "amulet": {
    "id": "amulet",
    "name": "神秘传家护身符",
    "icon": "📿",
    "defaultDescription": "材质不明的古老护身符，核心处镶嵌着一颗黯淡的晶石。直觉告诉你它不仅仅是一件饰品。",
    "dynamicDescriptions": [
      { "flag": "altar_activated", "description": "护身符在核心祭坛前引发了共鸣，晶石已被完全点亮，散发着纯净的绿色荧光，充盈着庇护魔法。" },
      { "flag": "exorcism_ritual", "description": "护身符感应到了爱莉希雅体内的黑暗，晶石剧烈震颤，仿佛在催促你念出祷文。" }
    ]
  },
  "dagger": {
    "id": "dagger",
    "name": "古代祭祀匕首",
    "icon": "🗡️",
    "defaultDescription": "在密道遗迹中寻获的仪式用短刃，虽然刃口有些钝，但雕刻着繁复的充能术式，对某些封印可能有奇效。",
    "dynamicDescriptions": []
  },
  "crystal": {
    "id": "crystal",
    "name": "阿瓦隆核心晶石",
    "icon": "💎",
    "defaultDescription": "蕴含着庞大森林本源魔力的璀璨晶石。它的温度随着祭坛震动而不断升高。",
    "dynamicDescriptions": []
  }
};

export const ITEM_ANIMATION_PRESETS = {
  "gain": {
    "find": { "class": "fx-item-find", "title": "✨ 寻获物品", "soundEffect": "pickup" },
    "receive": { "class": "fx-item-receive", "title": "🤝 获得赠予", "soundEffect": "gift" },
    "unlock": { "class": "fx-item-unlock", "title": "🔓 封印解除", "soundEffect": "magic" }
  },
  "lose": {
    "use": { "class": "fx-item-use", "title": "⚙️ 消耗物品", "soundEffect": "consume" },
    "destroy": { "class": "fx-item-destroy", "title": "💥 物品损毁", "soundEffect": "break" },
    "handOver": { "class": "fx-item-give", "title": "🤲 交出物品", "soundEffect": "give" }
  },
  "update": {
    "change": { "class": "fx-item-unlock", "title": "🔄 物品发生异变", "soundEffect": "magic" }
  }
};

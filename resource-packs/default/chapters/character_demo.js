/**
 * resource-packs/default/chapters/character_demo.js
 *
 * 角色控制系统全方位展示章 —— 演示增强型 DSL 的所有功能。
 * 通过本章节可以直观体验多角色、位置系统、表情切换、说话状态、
 * 动作动画、视觉特效、滤镜、位置交换、聚集/散开等全部特性。
 *
 * 运行方式：在 index.js 中将入口章节设为 'character_demo' 即可。
 * 或通过编辑器加载此章节后预览。
 */
export const chapter_character_demo = [

  // ===================================================================
  // 场景 1：多重入场 —— 用不同动画和位置同时登场多个角色
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "（舞台幕布缓缓拉开，今日的演出即将开始。让我们来测试角色控制系统的全部功能。）",
    "effects": ["vignette"],
    "characterChanges": [
      { "action": "clearAll" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【基础入场测试】爱莉希雅从左侧滑入，安文从右侧滑入。",
    "characterChanges": [
      {
        "action": "enter",
        "id": "elysia",
        "spriteId": "idle",
        "position": "left",
        "animation": "slide-in-left",
        "order": 1
      },
      {
        "action": "enter",
        "id": "player",
        "spriteId": "idle",
        "position": "right",
        "animation": "slide-in-right",
        "order": 2
      }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "这就是你说的那个从外界来的旅人么？看起来比上次那个要年轻一些。",
    "characterChanges": [
      { "action": "speak", "id": "elysia", "weight": 1.0 },
      { "action": "silence", "id": "player" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "是的，爱莉希雅大人。我从阿瓦隆边界一路走来，跨越了七座山丘和三片沼泽。",
    "characterChanges": [
      { "action": "silence", "id": "elysia" },
      { "action": "speak", "id": "player", "weight": 0.8 }
    ]
  },

  // ===================================================================
  // 场景 2：多角色同时说话 + 表情切换
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【多角色同时说话测试】两人一起开口，注意看说话指示器的波浪动画。",
    "characterChanges": [
      { "action": "speakAll", "ids": ["elysia", "player"], "weights": [1.0, 0.6] }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【表情切换测试】爱莉希雅切换到惊讶表情，安文切换到微笑。",
    "characterChanges": [
      { "action": "update", "id": "elysia", "spriteId": "shock", "animation": "flash" },
      { "action": "update", "id": "player", "spriteId": "idle", "animation": "pulse" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "什么？！你穿过了迷雾沼泽？那地方连森林里的鹿都知道绕道走……",
    "characterChanges": [
      { "action": "speak", "id": "elysia", "weight": 1.0 },
      { "action": "silence", "id": "player" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "我有祖父的护身符指引方向。说起来——你的耳朵刚才动了一下呢。",
    "characterChanges": [
      { "action": "silence", "id": "elysia" },
      { "action": "speak", "id": "player", "weight": 0.7 },
      { "action": "update", "id": "elysia", "spriteId": "sad", "animation": "glow" }
    ]
  },

  // ===================================================================
  // 场景 3：位置移动
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【位置移动测试】爱莉希雅移动到中央位置，安文移动到左侧。注意看滑行动画。",
    "characterChanges": [
      { "action": "silenceAll" },
      { "action": "move", "id": "elysia", "position": "center", "animation": "slide-right" },
      { "action": "move", "id": "player", "position": "left", "animation": "slide-left" }
    ]
  },

  // ===================================================================
  // 场景 4：角色动作
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【动作测试】爱莉希雅挥手，安文点头。留意角色的动画变化。",
    "characterChanges": [
      { "action": "action", "id": "elysia", "actionId": "wave", "duration": 1.2 },
      { "action": "action", "id": "player", "actionId": "nod", "duration": 0.8 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "（向爱莉希雅深深点头致意）我明白，森林的路不好走，但我已经下定决心了。",
    "characterChanges": [
      { "action": "speak", "id": "player", "weight": 0.6 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【更多动作测试】爱莉希雅鞠躬，然后跳起来。",
    "characterChanges": [
      { "action": "silenceAll" },
      { "action": "action", "id": "elysia", "actionId": "bow", "duration": 0.8 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "爱莉希雅跳了一下——精灵果然比人类轻盈许多。",
    "characterChanges": [
      { "action": "action", "id": "elysia", "actionId": "jump", "duration": 0.6 }
    ]
  },

  // ===================================================================
  // 场景 5：视觉特效
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【视觉特效测试】爱莉希雅发光（glow），安文摇晃（shake）。注意观察持续特效与瞬时特效的区别。",
    "characterChanges": [
      { "action": "effect", "id": "elysia", "effect": "glow", "duration": 2.0 },
      { "action": "effect", "id": "player", "effect": "shake", "duration": 0.5 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【浮动与脉冲】爱莉希雅上下浮动（float），安文脉动（pulse）。",
    "characterChanges": [
      { "action": "effect", "id": "elysia", "effect": "float", "duration": 3.0 },
      { "action": "effect", "id": "player", "effect": "pulse", "duration": 2.0 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【颤抖效果】突发危险逼近的感觉——两人都在颤抖。",
    "characterChanges": [
      { "action": "effect", "id": "elysia", "effect": "tremble", "duration": 1.0 },
      { "action": "effect", "id": "player", "effect": "tremble", "duration": 1.0 }
    ]
  },

  // ===================================================================
  // 场景 6：颜色滤镜
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【滤镜测试】爱莉希雅变暗（被阴影笼罩），安文饱和度降低（失神状态）。",
    "characterChanges": [
      { "action": "filter", "id": "elysia", "filters": { "brightness": 0.4, "saturation": 0.5 } },
      { "action": "filter", "id": "player", "filters": { "brightness": 0.7, "saturation": 0.3 } }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【重置滤镜】恢复正常视觉。",
    "characterChanges": [
      { "action": "resetFilter", "id": "elysia" },
      { "action": "resetFilter", "id": "player" }
    ]
  },

  // ===================================================================
  // 场景 7：缩放与透明度
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【缩放测试】爱莉希雅变大（凸显存在感），安文缩小（退让一步）。",
    "characterChanges": [
      { "action": "scale", "id": "elysia", "scale": 1.25 },
      { "action": "scale", "id": "player", "scale": 0.85 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【缩放恢复正常】",
    "characterChanges": [
      { "action": "scale", "id": "elysia", "scale": 1.0 },
      { "action": "scale", "id": "player", "scale": 1.0 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【透明度测试】爱莉希丝变得半透明（如梦似幻），安文逐渐消失。",
    "characterChanges": [
      { "action": "opacity", "id": "elysia", "opacity": 0.5 },
      { "action": "opacity", "id": "player", "opacity": 0.2 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【透明度恢复】",
    "characterChanges": [
      { "action": "opacity", "id": "elysia", "opacity": 1.0 },
      { "action": "opacity", "id": "player", "opacity": 1.0 }
    ]
  },

  // ===================================================================
  // 场景 8：位置交换
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【位置交换测试】爱莉希雅和安文交换位置。看他们如何旋转交换。",
    "characterChanges": [
      { "action": "swap", "id1": "elysia", "id2": "player" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "咦？我怎么到这边来了？",
    "characterChanges": [
      { "action": "speak", "id": "player", "weight": 0.6 },
      { "action": "silence", "id": "elysia" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "空间魔法的小把戏而已。习惯就好。",
    "characterChanges": [
      { "action": "silence", "id": "player" },
      { "action": "speak", "id": "elysia", "weight": 1.0 }
    ]
  },

  // ===================================================================
  // 场景 9：聚集（多角色集合到同一位置）
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【聚集测试】所有人聚集到中央！注意看他们如何从各自位置汇聚到中心。",
    "characterChanges": [
      { "action": "silenceAll" },
      { "action": "move", "id": "elysia", "position": "center-left", "animation": "slide-left" },
      { "action": "move", "id": "player", "position": "center-right", "animation": "slide-right" }
    ]
  },

  // ===================================================================
  // 场景 10：批量操作
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【批量操作测试】一次 batch 指令同时完成多个角色的多种变更。爱莉希雅变开心、发光、放大，安文点头、变亮。",
    "characterChanges": [
      {
        "action": "batch",
        "changes": [
          { "action": "update", "id": "elysia", "spriteId": "happy", "animation": "glow" },
          { "action": "scale", "id": "elysia", "scale": 1.1 },
          { "action": "action", "id": "player", "actionId": "nod", "duration": 0.6 },
          { "action": "filter", "id": "player", "filters": { "brightness": 1.2 } }
        ]
      }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【还原】恢复到正常状态，准备下一幕。",
    "characterChanges": [
      { "action": "batch", "changes": [
        { "action": "update", "id": "elysia", "spriteId": "idle", "animation": "fade-in" },
        { "action": "scale", "id": "elysia", "scale": 1.0 },
        { "action": "resetFilter", "id": "player" },
        { "action": "move", "id": "elysia", "position": "left" },
        { "action": "move", "id": "player", "position": "right" }
      ]}
    ]
  },

  // ===================================================================
  // 场景 11：Z轴顺序调整
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【Z轴顺序测试】将玩家放在爱莉希雅前面（order较大者在上层）。",
    "characterChanges": [
      { "action": "order", "ids": ["elysia", "player"] }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "现在反过来，爱莉希雅在前面。",
    "characterChanges": [
      { "action": "order", "ids": ["player", "elysia"] }
    ]
  },

  // ===================================================================
  // 场景 12：瓦尔加斯乱入 + 退场
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【第三方入场】浓烟翻滚——瓦尔加斯的投影出现在舞台另一侧！",
    "characterChanges": [
      { "action": "order", "ids": ["elysia", "player", "vargas"] },
      {
        "action": "enter",
        "id": "vargas",
        "spriteId": "angry",
        "position": "center",
        "animation": "zoom-in",
        "order": 3,
        "filters": { "brightness": 0.8, "saturation": 1.3 }
      }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "vargas",
    "text": "呵——我闻到了美味灵魂的气息。你们在这里开茶话会么？",
    "characterChanges": [
      { "action": "speak", "id": "vargas", "weight": 1.0 },
      { "action": "silence", "id": "elysia" },
      { "action": "silence", "id": "player" },
      { "action": "effect", "id": "vargas", "effect": "glow", "duration": 2.0 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "瓦尔加斯！你怎么突破封印的？！",
    "characterChanges": [
      { "action": "speak", "id": "elysia", "weight": 1.0 },
      { "action": "silence", "id": "vargas" },
      { "action": "effect", "id": "elysia", "effect": "shake", "duration": 0.5 },
      { "action": "filters", "id": "vargas", "filters": { "brightness": 0.8, "saturation": 1.3 } }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "那就是封印在祭坛之下的魔族领主？！好强的压迫感……",
    "characterChanges": [
      { "action": "silence", "id": "elysia" },
      { "action": "speak", "id": "player", "weight": 0.5 },
      { "action": "filter", "id": "player", "filters": { "brightness": 0.6, "saturation": 0.5 } }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【退场测试】瓦尔加斯狂笑着消散（zoom-out退场），爱莉希雅和安文恢复正常。",
    "characterChanges": [
      { "action": "silenceAll" },
      {
        "action": "leave",
        "id": "vargas",
        "animation": "zoom-out",
        "duration": 0.6
      },
      { "action": "resetFilter", "id": "player" }
    ]
  },

  // ===================================================================
  // 场景 13：散开
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【散开测试】两人散开到舞台两侧，展示位置系统的全面能力。",
    "characterChanges": [
      { "action": "update", "id": "elysia", "spriteId": "determined" },
      { "action": "update", "id": "player", "spriteId": "idle" },
      { "action": "move", "id": "elysia", "position": "left-far", "animation": "slide-left" },
      { "action": "move", "id": "player", "position": "right-far", "animation": "slide-right" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "看来你已经见识过我们的全部实力了。这套舞台系统可以支撑任何你能想象到的演出。",
    "characterChanges": [
      { "action": "speak", "id": "elysia", "weight": 1.0 },
      { "action": "silence", "id": "player" }
    ]
  },

  // ===================================================================
  // 场景 14：不同入场动画展示
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【入场动画合集】各种入场方式展示——弹入、缩放、翻转、下落。",
    "characterChanges": [
      { "action": "clearAll", "animation": "fade-out" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "弹入（bounce-in）：",
    "characterChanges": [
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "bounce-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "翻转入场：",
    "characterChanges": [
      { "action": "clearAll" },
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "flip-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "从天而降：",
    "characterChanges": [
      { "action": "clearAll" },
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "drop-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "飘然而至：",
    "characterChanges": [
      { "action": "clearAll" },
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "float-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "撞撞跌跌地来（适合喜剧角色）：",
    "characterChanges": [
      { "action": "clearAll" },
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "stumble-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "摇摆入场：",
    "characterChanges": [
      { "action": "clearAll" },
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "swing-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【退场动画合集】消失（vanish）：",
    "characterChanges": [
      { "action": "leave", "id": "elysia", "animation": "vanish", "duration": 0.8 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "缩小消失（shrink-out）：",
    "characterChanges": [
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "fade-in" }
    ]
  },
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "",
    "characterChanges": [
      { "action": "leave", "id": "elysia", "animation": "shrink-out", "duration": 0.6 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "翻页消失（flip-out）：",
    "characterChanges": [
      { "action": "enter", "id": "elysia", "spriteId": "idle", "position": "center", "animation": "fade-in" }
    ]
  },
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "",
    "characterChanges": [
      { "action": "leave", "id": "elysia", "animation": "flip-out", "duration": 0.7 }
    ]
  },

  // ===================================================================
  // 场景 15：所有角色退场 → 回到纯净舞台
  // ===================================================================
  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "【全清舞台】所有角色退场，舞台回归空旷。整个角色控制系统演示完毕。",
    "characterChanges": [
      { "action": "enter", "id": "elysia", "spriteId": "happy", "position": "left", "animation": "fade-in" },
      { "action": "enter", "id": "player", "spriteId": "idle", "position": "right", "animation": "fade-in" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "感谢观看。以上便是全新角色控制系统的全部功能。从最简单的入场退场，到复杂的多角色互动、位置变化、视觉特效，一切尽在掌握。",
    "characterChanges": [
      { "action": "speak", "id": "elysia", "weight": 1.0 },
      { "action": "silence", "id": "player" }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": "player",
    "text": "编剧可以尽情发挥想象力了。这一套系统足够支撑任何戏剧性的演出效果。",
    "characterChanges": [
      { "action": "silence", "id": "elysia" },
      { "action": "speak", "id": "player", "weight": 0.7 }
    ]
  },

  {
    "sceneId": "clearing",
    "type": "dialogue",
    "characterId": null,
    "text": "——全剧终——",
    "characterChanges": [
      { "action": "silenceAll" },
      { "action": "clearAll", "animation": "fade-out", "duration": 1.0 }
    ]
  },

  {
    "type": "ending",
    "endingId": "demo_complete"
  }
];

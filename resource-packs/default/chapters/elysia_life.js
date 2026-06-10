/**
 * resource-packs/default/chapters/elysia_life.js
 *
 * Auto-converted from elysia_life.json
 */
export const chapter_elysia_life = [
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "我把自己的——安文的——身体小心地安置在祭坛旁一处安全的石凹中。护身符在他脖子上继续发出微弱的绿光，维持着身体最低限度的生命体征。祖父的笔记里说，只要护身符不离开本体太远，意识随时可以返回。我暂时松了口气。",
    "screenEffect": "snow?density=25",
    "effects": [
      "vignette"
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "踏出祭坛，重新走在森林小径上的感觉完全不同了。爱莉希雅的眼睛——现在是我的眼睛——看到的森林比原先丰富得多。普通的树木上浮动着肉眼不可见的光晕，林间的雾气呈现出一层淡淡的金辉，那是森林自身的魔力在流动。耳朵能捕捉到数十步外松鼠踏过枯叶的声响。连脚底踩在泥土上的触感都比人类时细腻了十倍——我能分辨出覆于泥土表面的每一粒沙砾、每一片薄苔的纹理。",
    "effects": []
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "我穿过森林，走向爱莉希雅在笔记里提到过的林间小屋。那是一间用古老橡木搭建的小巧屋舍，爬满了发光的藤蔓。推开门的瞬间，一股淡淡的草木熏香扑鼻而来——这是她的住处，她的气味，她的生活。房间里面布置得简洁而雅致，墙上挂着几幅手绘的植物图鉴，桌上放着一叠写了一半的巡林记录，窗台上摆着几盆我叫不出名字的发光植物。",
    "effects": []
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "我在一面磨光的铜镜前停下了脚步。镜子里映出的人——是爱莉希雅。银色的长发垂落在肩头，淡绿色的眼眸在昏暗的房间里泛着微光。尖尖的耳朵，小巧的鼻子，柔软的嘴唇。纤细的颈项，圆润的肩头，青色长袍下起伏的曲线。我抬起手，镜中人也抬起手。我微微侧头，她也微微侧头。我试着微笑——镜中人的嘴角上扬了一个微小的弧度，眼神中却带着几分不确定的迷茫。",
    "cgChanges": {
      "action": "enter",
      "id": "elysia_possession",
      "animation": "pulse"
    },
    "effects": [
      "dim"
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "就在这时，小屋外传来了脚步声——不是动物的，而是另一个精灵。一个年轻的声音从门外传来：'爱莉希雅姐姐？你在里面吗？森林东面的封印节点出现了魔力紊乱——长老让我来找你商量对策。'",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "shock",
        "animation": "shake"
      }
    ],
    "effects": [
      "screenShake"
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "我的心跳漏了一拍。这是爱莉希雅的社交圈——她的同族，她的伙伴。如果我现在拒绝见面，反而会引起怀疑。我必须装作她。我走到门边，回忆着她说话的语气和节奏——清冽的、略带疏离但不乏温和的声音。",
    "effects": []
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "'我在这里。'我开口说话——从这具身体第一次发出自主的声音。嗓音从喉咙里流出来的一瞬间，我几乎被自己吓了一跳。那是爱莉希雅的声音——清澈、柔和、带着精灵特有的韵味。'东面的节点？具体是什么情况？'",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "idle",
        "animation": "fadeIn"
      }
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "门外的精灵回答道：'第三和第四符文出现了逆向旋转——长老说是祭坛方向传来的暗影波动所致。瓦尔加斯的封印正在加速崩解，我们可能需要启动紧急预案。'",
    "effects": [
      "dim"
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "elysia",
    "text": "'我明白了。你先回去告诉长老，我处理好手头的事情就过去。还有——'我顿了顿，搜刮着爱莉希雅的记忆碎片——那些隐约浮现在意识边缘的、属于她的知识和情感。'让巡林的队伍远离北面古石阵那一带，那里来了一个人类的访客。'",
    "characterChanges": [
      {
        "id": "elysia",
        "action": "update",
        "spriteId": "determined",
        "animation": "pulse"
      }
    ]
  },
  {
    "sceneId": "forest_path",
    "type": "dialogue",
    "characterId": "player",
    "text": "那个精灵应声离去后，我靠在门板上长长地呼出一口气。第一次用这具身体与其他人交流——而且是爱莉希雅的族人——竟然成功了。但同时，一个沉重的认识也压在了我心上：森林的危机比爱莉希雅告诉我的还要严重。瓦尔加斯的封印不是'弱了'，而是正在崩塌。而此刻，他的意识——至少一部分——正和我一同住在这具精灵的身体里。",
    "effects": [
      "vignette"
    ],
    "screenEffect": "corruption?density=15"
  },
  {
    "type": "jump",
    "jumpChapter": "final_choice"
  }
];

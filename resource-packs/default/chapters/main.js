/**
 * resource-packs/default/chapters/main.js
 *
 * Auto-converted from main.json
 */
export const chapter_main = [
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "深夜的酒馆终于安静了下来。窗外的雨丝斜斜地打在玻璃上，把远处街灯的昏黄光线揉成一片模糊。我叫安文，今年二十四岁，在一家不起眼的旧书店打工。日子过得平平淡淡，直到今晚。",
    "effects": [
      "vignette"
    ],
    "screenEffect": "rain?density=25,speed=40,wind=0.3"
  },
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "房东催了我三次房租，手机里躺着三条未读的消息——一条是大学同学王明发来的聚会邀请，一条是书店老板问我明天能不能替班。我都没回。因为此刻，我手里正捏着祖父留给我的唯一遗物——那本厚重的航海日志。",
    "effects": []
  },
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "祖父安德鲁去世那年我才七岁。记忆里他总坐在老宅的藤椅上，对着窗外喃喃自语，说些我听不懂的话——关于一座被迷雾笼罩的森林，关于住在里面的精灵，关于一枚能改变命运的护身符。大人们都说是老年痴呆的胡话，可我知道不是。",
    "cgChanges": {
      "action": "enter",
      "id": "old_photo",
      "animation": "scaleIn"
    },
    "effects": [
      "dim"
    ]
  },
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "我从日志的封皮夹层里抽出那张泛黄的旧照片。照片上，年轻时的祖父站在一棵参天古树前，身旁是一个身姿纤细、耳廓微尖的少女——她有一头垂至腰际的银色长发，眉眼间带着不属于人间的清冷气质。照片背面写着一行娟秀的字：'赠予我最挚爱的森林挚友——爱莉希雅。'",
    "cgChanges": {
      "action": "leave",
      "animation": "fadeOut"
    }
  },
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "我翻开日志的最后一页，上面是祖父潦草却有力的字迹：'安文，当你读到这些的时候，去阿瓦隆。迷雾森林的入口就在旧城北面的古石阵后。带上护身符，找到爱莉希雅。有些事，只有你才能完成。'护身符——我从领口拉出那条从不离身的项链，晶石在烛火下泛着幽微的绿光。",
    "effects": [],
    "gainItem": "amulet",
    "gainApproach": "receive"
  },
  {
    "sceneId": "tavern_interior",
    "type": "dialogue",
    "characterId": "player",
    "text": "第二天一早，我给王明发了条消息：'我出趟远门，可能要好几天。别担心。'然后背上包，搭上了去旧城北郊的公交车。窗外的城市风景一点一点褪去，高楼大厦变成了矮旧平房，柏油路变成了土路，最后连路都没有了——只剩一片密不透风的老树林。",
    "effects": []
  },
  {
    "type": "jump",
    "jumpChapter": "meet_elysia"
  }
];

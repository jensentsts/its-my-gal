/**
 * resource-packs/default/index.js
 *
 * 默认资源包数据汇总入口 —— 将所有章节和配置聚合成引擎所需的 ROM 数据。
 * 替代 game/index.js 作为标准数据源。
 *
 * 此为静态导入版本，供 app 和 editor 直接使用。
 * ResourceManager 则通过运行时 fetch JSON 加载相同数据。
 */

// ---- 配置 ----
export { GAME_CONFIG }  from './config/game.js';
export { HOME_CONFIG }  from './config/home.js';
export { CHARACTERS }   from './config/characters.js';
export { SCENES }       from './config/scenes.js';
export { CG_LIBRARY }   from './config/cg-library.js';
export { ITEMS, ITEM_ANIMATION_PRESETS } from './config/items.js';
export { ENDINGS }      from './config/endings.js';

// ---- 章节 ----
import { chapter_body_explore }        from './chapters/body_explore.js';
import { chapter_crystal_chamber }     from './chapters/crystal_chamber.js';
import { chapter_crystal_retrieval }   from './chapters/crystal_retrieval.js';
import { chapter_desperate_route }     from './chapters/desperate_route.js';
import { chapter_elysia_life }         from './chapters/elysia_life.js';
import { chapter_exorcism_route }      from './chapters/exorcism_route.js';
import { chapter_final_choice }        from './chapters/final_choice.js';
import { chapter_forest_deep }         from './chapters/forest_deep.js';
import { chapter_forest_explore }      from './chapters/forest_explore.js';
import { chapter_hope_awakening }      from './chapters/hope_awakening.js';
import { chapter_main }                from './chapters/main.js';
import { chapter_meet_elysia }         from './chapters/meet_elysia.js';
import { chapter_possession_event }    from './chapters/possession_event.js';
import { chapter_possession_prelude }  from './chapters/possession_prelude.js';
import { chapter_puppet_contract }     from './chapters/puppet_contract.js';
import { chapter_redemption_route }    from './chapters/redemption_route.js';
import { chapter_ruins_awakening }     from './chapters/ruins_awakening.js';
import { chapter_ruins_exploration }   from './chapters/ruins_exploration.js';
import { chapter_ruins_exploration_bad } from './chapters/ruins_exploration_bad.js';

// ---- 章节简介 ----
export const CHAPTER_DESCRIPTIONS = {
    'body_explore':          '伊希丝探索着新的精灵身体，感受每一寸与原本人类形态截然不同的细腻触感。',
    'crystal_chamber':       '跟随隐藏地图的指引，在森林深处发现一面如镜的水潭——源晶的所在之地。',
    'crystal_retrieval':     '潜入水晶池底触碰源晶，在守护精灵的引导下集中意念，尝试分离一枚碎片。',
    'desperate_route':       '主角握紧仪式匕首冲向被附身的伊希丝，却不知瓦格斯数十年前便已暗中动了手脚。',
    'elysia_life':           '以伊希丝的身体开始森林中的生活——感受草木间的魔力、走进她的小屋、与镜中的自己对望。',
    'exorcism_route':        '将意识抽回自己的身体，翻出祖父日志中的古精灵语驱魔祷文，向黑暗诵读。',
    'final_choice':          '祭坛之前，命运的岔路展开——留在伊希丝体内从内部对抗瓦格斯，或回到自己身体以弱势直面。',
    'forest_deep':           '深入森林深处，除了瓦格斯的黑魔法气息，还能感受到一股古老而纯净的力量在暗处涌动。',
    'forest_explore':        '跟随伊希丝穿行于密林之间，她教会主角如何与自然同行而非与之对抗。',
    'hope_awakening':        '不再逃避和对抗，主角盘膝而坐，吟唱起一段古老的禁忌祷文——瓦格斯第一次露出了恐惧。',
    'main':                  '酒馆深夜，二十四岁的安文翻出祖父留下的航海日志，一段跨越千年的命运由此开启。',
    'meet_elysia':           '穿过古石阵中隐藏的路径，薄雾中一道纤细而发光的身影缓缓现身——月之精灵伊希丝。',
    'possession_event':      '护身符中的魔力爆发，意识如流水般脱离身体，穿越界限——当安文再次睁开眼，看到的是一双纤细的精灵之手。',
    'possession_prelude':    '用言语拖延被附身的伊希丝，暗中翻阅祖父的日志——瓦格斯的真身被封印在祭坛之下。',
    'puppet_contract':       '瓦格斯借用伊希丝的面容，以温柔而蛊惑的语气伸出手——一个触碰，换取力量与顺从。',
    'redemption_route':      '选择留在伊希丝体内，握住护身符沉入意识深处，直面瓦格斯的漆黑阴影。',
    'ruins_awakening':       '急于求成的主角用护身符砸碎源晶，无意中释放了封印千年的远古炎魔。',
    'ruins_exploration':     '伊希丝以古精灵语开启符文石门，走廊壁画徐徐展现——那是千年之前封印之战的画卷。',
    'ruins_exploration_bad': '凝视壁画太久，瓦格斯的低语侵入意识，主角瘫倒在地——遗迹崩塌，伊希丝的呼唤越来越远。',
};

export const STORY_CHAPTERS = {
    'body_explore':          chapter_body_explore,
    'crystal_chamber':       chapter_crystal_chamber,
    'crystal_retrieval':     chapter_crystal_retrieval,
    'desperate_route':       chapter_desperate_route,
    'elysia_life':           chapter_elysia_life,
    'exorcism_route':        chapter_exorcism_route,
    'final_choice':          chapter_final_choice,
    'forest_deep':           chapter_forest_deep,
    'forest_explore':        chapter_forest_explore,
    'hope_awakening':        chapter_hope_awakening,
    'main':                  chapter_main,
    'meet_elysia':           chapter_meet_elysia,
    'possession_event':      chapter_possession_event,
    'possession_prelude':    chapter_possession_prelude,
    'puppet_contract':       chapter_puppet_contract,
    'redemption_route':      chapter_redemption_route,
    'ruins_awakening':       chapter_ruins_awakening,
    'ruins_exploration':     chapter_ruins_exploration,
    'ruins_exploration_bad': chapter_ruins_exploration_bad,
};

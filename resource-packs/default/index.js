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

/**
 * game/index.js
 *
 * 游戏数据汇总入口 —— 将所有章节和配置聚合成引擎所需的 ROM 数据。
 * 这就是"卡带"：更换此文件即可切换为完全不同的故事。
 */

// ---- 配置 ----
export { GAME_CONFIG, HOME_CONFIG } from './config/game-config.js';
export { CHARACTERS }  from './config/characters.js';
export { SCENES }      from './config/scenes.js';
export { CG_LIBRARY }  from './config/cg-library.js';
export { ITEMS, ITEM_ANIMATION_PRESETS, getDynamicItemDescription, getItemIcon, getItemName } from './config/items.js';
export { ENDINGS }     from './config/endings.js';

// ---- 章节 ----
import { chapter_main }                from './chapterssss/prologue.js';
import { chapter_meet_elysia }        from './chapterssss/meet-elysia.js';
import { chapter_forest_explore }     from './chapterssss/forest-explore.js';
import { chapter_ruins_exploration }  from './chapterssss/ruins-exploration.js';
import { chapter_forest_deep }        from './chapterssss/forest-deep.js';
import { chapter_possession_prelude } from './chapterssss/possession-prelude.js';
import { chapter_possession_event }   from './chapterssss/possession-event.js';
import { chapter_body_explore }       from './chapterssss/body-explore.js';
import { chapter_elysia_life }        from './chapterssss/elysia-life.js';
import { chapter_final_choice }       from './chapterssss/final-choice.js';
import { chapter_redemption_route }   from './chapterssss/redemption-route.js';
import { chapter_exorcism_route }     from './chapterssss/exorcism-route.js';
import { chapter_desperate_route }    from './chapterssss/desperate-route.js';

export const STORY_CHAPTERS = {
    'main':                chapter_main,
    'meet_elysia':         chapter_meet_elysia,
    'forest_explore':      chapter_forest_explore,
    'ruins_exploration':   chapter_ruins_exploration,
    'forest_deep':         chapter_forest_deep,
    'possession_prelude':  chapter_possession_prelude,
    'possession_event':    chapter_possession_event,
    'body_explore':        chapter_body_explore,
    'elysia_life':         chapter_elysia_life,
    'final_choice':        chapter_final_choice,
    'redemption_route':    chapter_redemption_route,
    'exorcism_route':      chapter_exorcism_route,
    'desperate_route':     chapter_desperate_route,
};

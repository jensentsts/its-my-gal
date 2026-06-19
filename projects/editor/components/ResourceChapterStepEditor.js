/**
 * components/ResourceChapterStepEditor.js
 *
 * Chapter resource + step editor — used inside the ResourceManagerWindow.
 * Shows chapter info, step list (draggable), and a full step editor for the selected step.
 * The step editor is rendered as a dock-style inner sidebar, reusing the same panel-host
 * mechanism as the global docks (see ui/panel-host.js).
 */
const { defineComponent, inject, ref, toRefs } = Vue;
import { createPanelHost } from '../ui/panel-host.js';

export default defineComponent({
  name: 'ResourceChapterStepEditor',
  template: `
    <div class="chapter-editor-root">
      <div class="section-label">📜 章节信息</div>
      <div class="form-row">
        <label>章节 ID</label>
        <div class="rename-row">
          <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
          <button class="tb-btn tb-sm" @click="renameResource('chapters', selectedResourceId)">↻ 重命名</button>
        </div>
      </div>
      <div class="form-row">
        <label>章节简介</label>
        <textarea v-model="chapterDescriptions[selectedResourceId]" rows="4" placeholder="为这个章节编写简介..."></textarea>
      </div>

      <!-- ═══ 水平拆分布局：步骤列表 | 步骤编辑侧边栏 ═══ -->
      <div class="inner-dock-layout">
        <!-- 左侧：步骤列表 -->
        <div class="inner-dock-left">
          <div class="section-label">
            📝 步骤列表（{{ selectedResource._steps?.length || 0 }} 步）
            <button class="tb-btn tb-sm" @click="resEditAddStep" style="margin-left:8px" title="添加步骤">➕</button>
          </div>
          <div class="resource-chapter-steps inner-list-scroll">
            <div v-for="(step, si) in selectedResource._steps" :key="si"
                 class="resource-step-item"
                 :class="{
                     'res-step-active': resEditStepIndex === si,
                     'res-step-dragging': resStepDrag.dragIndex === si,
                     'res-step-dragover': resStepDrag.dropIndex === si && resStepDrag.dragIndex !== si,
                     'res-step-locked-pos': isStepLocked(selectedResource._steps, si),
                     'res-step-locked': step.locked
                 }"
                 :draggable="!isStepLocked(selectedResource._steps, si) && !step.locked"
                 @dragstart="resStepDragStart($event, si)"
                 @dragover="resStepDragOver($event, si)"
                 @drop="resStepDrop($event, si)"
                 @dragend="resStepDragEnd"
                 @click="resEditStepIndex = si">
              <span class="drag-handle" v-if="!isStepLocked(selectedResource._steps, si) && !step.locked">⠿</span>
              <span class="step-type-badge"
                    :class="step.type === 'ending' || (step.type === 'jump' && step.endingId) ? 'badge-ending' : 'badge-' + (step.type || 'dialogue')">
                {{ stepTypeLabel(step.type, step) }}
              </span>
              <span class="step-text-preview" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ stepTextBrief(step) }}</span>
              <span class="step-idx">{{ si + 1 }}</span>
              <span class="lock-icon" v-if="step.locked" title="此步骤已锁定">🔒</span>
              <span class="lock-icon" v-if="isStepLocked(selectedResource._steps, si) && !step.locked" title="末尾路由步骤，不可移动">🔒</span>
            </div>
            <div class="resource-list-empty" v-if="!selectedResource._steps?.length">暂无步骤，点击上方「➕」添加步骤</div>
          </div>
        </div>

        <!-- 缩放手柄 -->
        <div class="dock-resize-handle dock-resize-handle-h"
             v-if="resEditStep && resourceTab === 'chapters'"
             @mousedown="stepResizeStart"></div>

        <!-- 右侧：步骤编辑面板（dock 风格侧边栏） -->
        <div class="inner-dock-sidebar"
             v-if="resEditStep && resourceTab === 'chapters'"
             :style="{ width: stepSidebarWidth + 'px' }">
          <!-- 标签栏 -->
          <div class="dock-tab-bar">
            <div class="dock-tab active">
              <span>✏️ 步骤 #{{ resEditStepIndex + 1 }}</span>
              <span class="dock-tab-actions">
                <button class="dock-tab-btn" @click="toggleStepLock(resEditStepIndex)" :title="resEditStep?.locked ? '解锁步骤' : '锁定步骤'">
                  {{ resEditStep?.locked ? '🔒' : '🔓' }}
                </button>
                <button class="dock-tab-btn" @click="resEditMoveStep(-1)" :disabled="resEditStepIndex === 0 || isStepEditLocked(resEditStep)" title="上移">▲</button>
                <button class="dock-tab-btn" @click="resEditMoveStep(1)" :disabled="resEditStepIndex >= (selectedResource._steps?.length || 0) - 1 || isStepEditLocked(resEditStep)" title="下移">▼</button>
                <button class="dock-tab-btn dock-tab-btn-close" @click="resEditDeleteStep" :disabled="isStepEditLocked(resEditStep)" title="删除步骤">✕</button>
              </span>
            </div>
          </div>
          <!-- 面板内容 -->
          <div class="dock-content step-editor-body">

            <div class="step-locked-banner" v-if="isStepEditLocked(resEditStep)">🔒 此步骤已锁定，不可编辑</div>

            <div class="form-row">
              <label>类型</label>
              <select v-model="resEditStep.type" :disabled="isStepEditLocked(resEditStep)">
                <option value="dialogue">对话 (dialogue)</option>
                <option value="choice">分支选择 (choice)</option>
                <option value="jump">直接跳转 (jump)</option>
                <option value="ending">结局触发 (ending)</option>
              </select>
            </div>

            <!-- 对话类型 -->
            <template v-if="resEditStep.type === 'dialogue'">
              <div class="form-row">
                <label>场景</label>
                <div class="locate-row">
                  <select v-model="resEditStep.sceneId" class="cc-char-sel">
                    <option value="">(无场景)</option>
                    <option v-for="(sc, sid) in gameScenes" :key="sid" :value="sid">{{ sc.title }}</option>
                  </select>
                  <button class="tb-btn tb-xs" v-if="resEditStep.sceneId" @click.stop="locateTo('resource', resEditStep.sceneId, 'scenes')" title="定位到场景">📍</button>
                </div>
              </div>
              <div class="form-row">
                <label>说话人</label>
                <div class="locate-row">
                  <select v-model="resEditStep.characterId" class="cc-char-sel">
                    <option value="">(旁白/叙述)</option>
                    <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
                  </select>
                  <button class="tb-btn tb-xs" v-if="resEditStep.characterId" @click.stop="locateTo('resource', resEditStep.characterId, 'characters')" title="定位到角色">📍</button>
                </div>
              </div>
              <div class="form-row">
                <label>对话文本</label>
                <template v-if="!resEditStep.texts">
                  <textarea v-model="resEditStep.text" rows="4" placeholder="输入对话或叙述文本..."></textarea>
                  <button class="tb-btn tb-sm" @click="resEditAddBatchTextSegment" style="margin-top:6px;">📚 多段文本</button>
                </template>
                <template v-else>
                  <div class="batch-text-list">
                    <div v-for="(t, ti) in resEditStep.texts" :key="ti" class="batch-text-item">
                      <div class="batch-text-item-header">
                        <span class="batch-text-index">第{{ ti + 1 }}段</span>
                        <button v-if="resEditStep.texts.length > 1" class="step-btn step-btn-del" @click="resEditRemoveBatchTextSegment(ti)">✕</button>
                      </div>
                      <textarea v-model="resEditStep.texts[ti]" rows="3"></textarea>
                    </div>
                    <div class="batch-text-actions">
                      <button class="tb-btn tb-sm" @click="resEditAddBatchTextSegment">➕ 添加</button>
                      <button class="tb-btn tb-sm" @click="resEditDisableBatchText">⬅ 合并</button>
                    </div>
                  </div>
                </template>
              </div>
              <div class="form-row"><label>屏幕特效</label><input type="text" v-model="resEditStep.screenEffect" placeholder="snow?density=30" /></div>
              <div class="form-row">
                <label>CG 变更</label>
                <div class="cg-change-group">
                  <select v-model="resEditStep._cgAction" @change="resEditOnCGChange">
                    <option value="">(无)</option>
                    <option value="enter">进入 CG</option>
                    <option value="leave">离开 CG</option>
                  </select>
                  <select v-if="resEditStep._cgAction === 'enter'" v-model="resEditStep._cgId" @change="resEditOnCGChange">
                    <option value="">选择 CG...</option>
                    <option v-for="(cg, cgid) in gameCgLibrary" :key="cgid" :value="cgid">{{ cg.title }}</option>
                  </select>
                  <button class="tb-btn tb-xs" v-if="resEditStep._cgAction === 'enter' && resEditStep._cgId" @click.stop="locateTo('resource', resEditStep._cgId, 'cg')" title="定位到 CG">📍</button>
                  <input v-if="resEditStep._cgAction" type="text" v-model="resEditStep._cgAnimation" @change="resEditOnCGChange" placeholder="动画" />
                </div>
              </div>
              <div class="form-row">
                <label>角色变更</label>
                <div class="char-changes-list">
                  <div v-for="(cc, cci) in (resEditStep._charChanges || [])" :key="cci" class="char-change-row" :class="'cc-action-' + cc.action">
                    <div class="cc-main-row">
                      <select v-model="cc.action" @change="resEditOnCharChangeField" class="cc-action-sel">
                        <option value="enter">🎭 入场</option>
                        <option value="update">🔄 更新</option>
                        <option value="leave">👋 退场</option>
                        <option value="move">🚶 移动</option>
                        <option value="speak">💬 说话</option>
                        <option value="silence">🔇 沉默</option>
                        <option value="speakAll">🗣️ 全员说</option>
                        <option value="silenceAll">🤫 全沉默</option>
                        <option value="action">💃 动作</option>
                        <option value="effect">✨ 特效</option>
                        <option value="filter">🎨 滤镜</option>
                        <option value="resetFilter">🔄 清滤镜</option>
                        <option value="scale">🔍 缩放</option>
                        <option value="opacity">👻 透明度</option>
                        <option value="swap">🔄 交换</option>
                        <option value="gather">📦 聚集</option>
                        <option value="scatter">💥 散开</option>
                        <option value="order">📋 排序</option>
                        <option value="clearAll">🗑️ 全清</option>
                      </select>
                      <select v-if="['enter','update','leave','move','speak','silence','action','effect','filter','resetFilter','scale','opacity'].includes(cc.action)"
                              v-model="cc.id" @change="resEditOnCharChangeField" class="cc-char-sel">
                        <option value="">选择角色...</option>
                        <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
                      </select>
                      <template v-if="cc.action === 'swap'">
                        <select v-model="cc.id1" @change="resEditOnCharChangeField" class="cc-char-sel"><option value="">角色 A...</option><option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option></select>
                        <span class="cc-sep">↔</span>
                        <select v-model="cc.id2" @change="resEditOnCharChangeField" class="cc-char-sel"><option value="">角色 B...</option><option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option></select>
                      </template>
                      <input v-if="['speakAll','gather','scatter','order'].includes(cc.action)" v-model="cc.ids" list="dl-char-ids" placeholder="输入角色 ID，逗号分隔" class="cc-ids-input" @change="resEditOnCharChangeField">
                      <template v-if="cc.action === 'leave'">
                        <input v-model="cc.animation" list="dl-anims" placeholder="动画" class="cc-anim" @change="resEditOnCharChangeField">
                        <input v-model="cc.duration" type="number" placeholder="持续s" step="0.1" min="0.1" class="cc-xs" @change="resEditOnCharChangeField">
                      </template>
                      <template v-if="cc.action === 'silence'"><span class="cc-static-label">让该角色停止说话</span></template>
                      <template v-if="cc.action === 'silenceAll'"><span class="cc-static-label">停止所有角色说话</span></template>
                      <template v-if="cc.action === 'resetFilter'"><span class="cc-static-label">重置该角色的颜色滤镜</span></template>
                      <button class="step-btn step-btn-del" @click="resEditRemoveCharChange(cci)" title="删除">✕</button>
                    </div>
                    <div class="cc-sub-row" v-if="cc.action !== 'silence' && cc.action !== 'silenceAll' && cc.action !== 'resetFilter'">
                      <template v-if="['enter','update','gather'].includes(cc.action)">
                        <select v-model="cc.spriteId" @change="resEditOnCharChangeField" class="cc-sprite-sel"><option value="">默认立绘</option><option v-for="(sp, sid) in getCharSprites(cc.id)" :key="sid" :value="sid">{{ sp.label }}</option></select>
                      </template>
                      <template v-if="['enter','move','gather'].includes(cc.action)">
                        <select v-model="cc.position" @change="resEditOnCharChangeField" class="cc-pos-sel">
                          <option value="center">居中</option><option value="left">左</option><option value="right">右</option>
                          <option value="left-far">最左</option><option value="center-left">左中</option>
                          <option value="center-right">右中</option><option value="right-far">最右</option>
                        </select>
                      </template>
                      <input v-if="['enter','update','move','speak','action','effect','gather','scatter','clearAll'].includes(cc.action)" v-model="cc.animation" list="dl-anims" placeholder="动画名" class="cc-anim" @change="resEditOnCharChangeField">
                      <template v-if="['action','effect','clearAll'].includes(cc.action)">
                        <label class="cc-label">持续:</label>
                        <input v-model="cc.duration" type="number" step="0.1" min="0.1" placeholder="0.5" class="cc-xs" @change="resEditOnCharChangeField">
                      </template>
                      <template v-if="cc.action === 'action'">
                        <select v-model="cc.actionId" @change="resEditOnCharChangeField" class="cc-sm">
                          <option value="">动作…</option><option value="wave">挥手</option><option value="bow">鞠躬</option><option value="point">指</option>
                          <option value="nod">点头</option><option value="shake-head">摇头</option><option value="sit">坐下</option>
                          <option value="stand">站起</option><option value="jump">跳跃</option><option value="fall">跌倒</option>
                          <option value="turn">转身</option><option value="custom">自定义</option>
                        </select>
                      </template>
                      <template v-if="cc.action === 'effect'">
                        <select v-model="cc.effect" @change="resEditOnCharChangeField" class="cc-sm">
                          <option value="">特效…</option><option value="shake">摇晃</option><option value="flash">闪烁</option>
                          <option value="glow">发光</option><option value="float">浮动</option><option value="pulse">脉动</option>
                          <option value="tremble">颤抖</option><option value="blur">模糊</option><option value="highlight">高亮</option>
                          <option value="shine">闪耀</option><option value="dizzy">眩晕</option>
                        </select>
                      </template>
                      <template v-if="cc.action === 'enter'">
                        <label class="cc-label cc-check"><input type="checkbox" v-model="cc.speak" @change="resEditOnCharChangeField"> 说话</label>
                        <input v-model="cc.groupId" placeholder="分组" class="cc-xs" @change="resEditOnCharChangeField">
                      </template>
                      <template v-if="cc.action === 'speak'">
                        <label class="cc-label">音量:</label>
                        <input type="range" v-model.number="cc.weight" min="0" max="1" step="0.1" class="cc-range" @change="resEditOnCharChangeField">
                        <span class="cc-range-val">{{ cc.weight }}</span>
                      </template>
                      <template v-if="cc.action === 'filter'">
                        <div class="cc-filters-inline">
                          <label class="cc-label">亮度</label>
                          <input type="range" v-model.number="cc.filters.brightness" min="0" max="2" step="0.05" class="cc-range" @change="resEditOnCharChangeField">
                          <span class="cc-range-val">{{ cc.filters.brightness?.toFixed(2) }}</span>
                          <label class="cc-label">饱和度</label>
                          <input type="range" v-model.number="cc.filters.saturation" min="0" max="2" step="0.05" class="cc-range" @change="resEditOnCharChangeField">
                          <span class="cc-range-val">{{ cc.filters.saturation?.toFixed(2) }}</span>
                          <label class="cc-label">对比度</label>
                          <input type="range" v-model.number="cc.filters.contrast" min="0" max="2" step="0.05" class="cc-range" @change="resEditOnCharChangeField">
                          <span class="cc-range-val">{{ cc.filters.contrast?.toFixed(2) }}</span>
                        </div>
                      </template>
                      <template v-if="cc.action === 'scale'">
                        <label class="cc-label">缩放:</label>
                        <input type="range" v-model.number="cc.scale" min="0.1" max="3" step="0.05" class="cc-range" @change="resEditOnCharChangeField">
                        <span class="cc-range-val">{{ cc.scale?.toFixed(2) }}</span>
                      </template>
                      <template v-if="cc.action === 'opacity'">
                        <label class="cc-label">透明度:</label>
                        <input type="range" v-model.number="cc.opacity" min="0" max="1" step="0.05" class="cc-range" @change="resEditOnCharChangeField">
                        <span class="cc-range-val">{{ cc.opacity?.toFixed(2) }}</span>
                      </template>
                      <template v-if="cc.action === 'gather'">
                        <label class="cc-label">间距:</label>
                        <input v-model="cc.spread" type="number" step="0.01" placeholder="0.15" class="cc-xs" @change="resEditOnCharChangeField">
                      </template>
                      <template v-if="['enter','move'].includes(cc.action)">
                        <label class="cc-label">偏移:</label>
                        <input v-model="cc.offsetX" type="number" placeholder="X" class="cc-xs" @change="resEditOnCharChangeField">
                        <input v-model="cc.offsetY" type="number" placeholder="Y" class="cc-xs" @change="resEditOnCharChangeField">
                      </template>
                      <template v-if="cc.action === 'gather'">
                        <select v-model="cc.spriteId" @change="resEditOnCharChangeField" class="cc-sprite-sel"><option value="">默认立绘</option><option v-for="(sp, sid) in getCharSprites(cc.id)" :key="sid" :value="sid">{{ sp.label }}</option></select>
                      </template>
                    </div>
                  </div>
                  <button class="tb-btn tb-sm" @click="resEditAddCharChange">➕ 角色变更</button>
                </div>
              </div>
              <div class="form-row form-row-2col">
                <div class="form-col">
                  <label>获得物品</label>
                  <div class="locate-row">
                    <select v-model="resEditStep.gainItem"><option value="">(无)</option><option v-for="(item, iid) in gameItems" :key="iid" :value="iid">{{ item.name }}</option></select>
                    <button class="tb-btn tb-xs" v-if="resEditStep.gainItem" @click.stop="locateTo('resource', resEditStep.gainItem, 'items')" title="定位到物品">📍</button>
                  </div>
                </div>
                <div class="form-col">
                  <label>获得方式</label>
                  <select v-model="resEditStep.gainApproach" :disabled="!resEditStep.gainItem">
                    <option value="find">寻获</option><option value="receive">赠予</option><option value="unlock">解锁</option>
                  </select>
                </div>
              </div>
              <div class="form-row form-row-2col">
                <div class="form-col"><label>设置 Flag</label><input type="text" v-model="resEditStep.flag" placeholder="flag 名称" /></div>
                <div class="form-col"><label>打字速度 (ms)</label><input type="number" v-model="resEditStep.speed" placeholder="25" min="1" /></div>
              </div>
              <div class="form-row">
                <label>环境特效</label>
                <div class="effects-picker">
                  <label v-for="ef in availableEffects" :key="ef" class="effect-check">
                    <input type="checkbox" :value="ef" :checked="(resEditStep.effects || []).includes(ef)" @change="resEditToggleEffect(ef)" />
                    {{ ef }}
                  </label>
                </div>
              </div>
            </template>

            <!-- 分支选择 -->
            <template v-if="resEditStep.type === 'choice'">
              <div class="form-row"><label>场景</label><select v-model="resEditStep.sceneId" class="cc-char-sel"><option value="">(无场景)</option><option v-for="(sc, sid) in gameScenes" :key="sid" :value="sid">{{ sc.title }}</option></select></div>
              <div class="form-row"><label>分支提示文本</label><textarea v-model="resEditStep.text" rows="2" placeholder="面对眼前的抉择，你选择..."></textarea></div>
              <div class="form-row">
                <label>分支选项</label>
                <div class="choices-editor">
                  <div v-for="(choice, ci) in (resEditStep.choices || [])" :key="ci" class="choice-item-edit">
                    <div class="choice-header"><strong>选项 #{{ ci + 1 }}</strong><button class="step-btn step-btn-del" @click="resEditRemoveChoice(ci)">✕</button></div>
                    <input type="text" v-model="choice.text" placeholder="选项文本" class="choice-text" />
                    <div class="choice-detail-row">
                      <select v-model="choice.jumpChapter" class="choice-jump">
                        <option value="">跳转到...</option>
                        <optgroup label="章节"><option v-for="(_, cid) in chapters" :key="cid" :value="cid">{{ cid }}</option></optgroup>
                        <optgroup label="结局"><option v-for="end in gameEndings" :key="end.id" :value="'_end_' + end.id">🎬 {{ end.title }} ({{ end.id }})</option></optgroup>
                      </select>
                      <input type="text" v-model="choice.flag" placeholder="flag" class="choice-flag" />
                      <button class="tb-btn tb-xs" v-if="choice.jumpChapter" @click.stop="locateTo(choice.jumpChapter.startswith('_end_') ? 'ending' : 'chapter', choice.jumpChapter)" title="定位到">📍</button>
                    </div>
                  </div>
                  <button class="tb-btn tb-sm" @click="resEditAddChoice">➕ 添加选项</button>
                </div>
              </div>
            </template>

            <!-- 跳转 -->
            <template v-if="resEditStep.type === 'jump'">
              <div v-if="!resEditStep._jumpMode">{{ resEditSetDefaultJumpMode(resEditStep) }}</div>
              <div class="form-row">
                <label>跳转类型</label>
                <div class="jump-mode-toggle">
                  <label class="toggle-option" :class="{ active: resEditStep._jumpMode === 'chapter' }">
                    <input type="radio" value="chapter" v-model="resEditStep._jumpMode" @change="resEditStep.endingId = ''" /> ⤵ 跳转到章节
                  </label>
                  <label class="toggle-option" :class="{ active: resEditStep._jumpMode === 'ending' }">
                    <input type="radio" value="ending" v-model="resEditStep._jumpMode" @change="resEditStep.jumpChapter = ''" /> 🎬 触发结局
                  </label>
                </div>
              </div>
              <template v-if="resEditStep._jumpMode === 'chapter'">
                <div class="form-row">
                  <label>目标章节</label>
                  <div class="locate-row">
                    <select v-model="resEditStep.jumpChapter">
                      <option value="">选择目标...</option>
                      <optgroup label="章节"><option v-for="(_, cid) in chapters" :key="cid" :value="cid">{{ cid }}</option></optgroup>
                      <optgroup label="结局（快捷）"><option v-for="end in gameEndings" :key="end.id" :value="'_end_' + end.id">🎬 {{ end.title }} ({{ end.id }})</option></optgroup>
                    </select>
                    <button class="tb-btn tb-xs" v-if="resEditStep.jumpChapter" @click.stop="locateTo(resEditStep.jumpChapter.startswith('_end_') ? 'ending' : 'chapter', resEditStep.jumpChapter)" title="定位到">📍</button>
                  </div>
                </div>
              </template>
              <template v-if="resEditStep._jumpMode === 'ending'">
                <div class="form-row">
                  <label>触发结局</label>
                  <div class="locate-row">
                    <select v-model="resEditStep.endingId"><option value="">选择结局...</option><option v-for="end in gameEndings" :key="end.id" :value="end.id">🎬 {{ end.title }} ({{ end.id }})</option></select>
                    <button class="tb-btn tb-xs" v-if="resEditStep.endingId" @click.stop="locateTo('ending', '_end_' + resEditStep.endingId)" title="定位到结局">📍</button>
                  </div>
                  <div v-if="resEditStep.endingId" class="ending-preview" style="margin-top:6px">
                    <div class="ending-preview-title">{{ (gameEndings.find(e => e.id === resEditStep.endingId) || {}).title }}</div>
                    <div class="ending-preview-desc">{{ (gameEndings.find(e => e.id === resEditStep.endingId) || {}).description }}</div>
                  </div>
                </div>
              </template>
              <div class="form-row form-row-2col">
                <div class="form-col"><label>获得物品</label><select v-model="resEditStep.gainItem"><option value="">(无)</option><option v-for="(item, iid) in gameItems" :key="iid" :value="iid">{{ item.name }}</option></select></div>
                <div class="form-col"><label>获得方式</label><select v-model="resEditStep.gainApproach" :disabled="!resEditStep.gainItem"><option value="find">寻获</option><option value="receive">赠予</option><option value="unlock">解锁</option></select></div>
              </div>
              <div class="form-row"><label>设置 Flag</label><input type="text" v-model="resEditStep.flag" placeholder="flag 名称" /></div>
            </template>

            <!-- 结局触发 -->
            <template v-if="resEditStep.type === 'ending'">
              <div class="form-row">
                <label>触发结局</label>
                <select v-model="resEditStep.endingId"><option value="">选择结局...</option><option v-for="end in gameEndings" :key="end.id" :value="end.id">🎬 {{ end.title }} ({{ end.id }})</option></select>
                <div v-if="resEditStep.endingId" class="ending-preview" style="margin-top:6px">
                  <div class="ending-preview-title">{{ (gameEndings.find(e => e.id === resEditStep.endingId) || {}).title }}</div>
                  <div class="ending-preview-desc">{{ (gameEndings.find(e => e.id === resEditStep.endingId) || {}).description }}</div>
                </div>
              </div>
              <div class="form-row"><label>设置 Flag</label><input type="text" v-model="resEditStep.flag" placeholder="flag 名称" /></div>
            </template>

          </div><!-- /dock-content step-editor-body -->
        </div><!-- /inner-dock-sidebar -->
      </div><!-- /inner-dock-layout -->

      <!-- 删除按钮 -->
      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <button class="tb-btn tb-danger" @click="deleteResource(resourceTab, selectedResourceId)">🗑️ 删除此资源</button>
      </div>
    </div>
  `,
  setup() {
    const editor = inject('editor');

    // ── 窗口内侧边栏：步骤编辑器面板 ──
    // 复用通用 panel-host 机制（与全局 dock 同源）
    const stepEditorHost = createPanelHost();
    const stepEditorWidth = ref(480);

    // 当组件挂载时，注册步骤编辑面板
    stepEditorHost.add({ id: 'step-editor', title: '步骤编辑', icon: '✏️' });

    // 步骤编辑面板宽度拖拽缩放
    function startResizeStepEditor(e) {
      const startX = e.clientX;
      const startW = stepEditorWidth.value;
      function onMove(ev) {
        const w = Math.max(300, Math.min(800, startW + startX - ev.clientX));
        stepEditorWidth.value = w;
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      e.preventDefault();
    }

    // 将侧边栏状态合并到模板上下文
    // 用 toRefs 展开 editor 保持响应性，再混入本地状态
    return {
      ...toRefs(editor),
      stepSidebarHost: stepEditorHost,
      stepSidebarWidth: stepEditorWidth,
      stepResizeStart: startResizeStepEditor,
    };
  }
});

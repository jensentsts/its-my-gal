/**
 * components/StepDetailPanel.js
 *
 * Step editing detail panel — appears adjacent to the tree canvas when a step is selected.
 * Supports step types: dialogue, choice, jump, ending.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'StepDetailPanel',
  template: `
    <div class="step-detail-panel" v-if="editingStep && selectedChapterId" :style="{ width: stepDetailWidth + 'px' }">
      <div class="step-detail-panel-header">
        <span class="section-label">✏️ 步骤 #{{ editingStepIndex + 1 }}</span>
        <div class="step-detail-panel-actions">
          <button class="tb-btn tb-sm" @click="toggleStepLock(editingStepIndex)" :title="editingStep?.locked ? '解锁步骤' : '锁定步骤'">
            {{ editingStep?.locked ? '🔒' : '🔓' }}
          </button>
          <button class="tb-btn tb-sm" @click="moveStep(editingStepIndex, -1)" :disabled="editingStepIndex === 0 || isStepEditLocked(editingStep)" title="上移">▲</button>
          <button class="tb-btn tb-sm" @click="moveStep(editingStepIndex, 1)" :disabled="editingStepIndex >= (editingSteps?.length || 0) - 1 || isStepEditLocked(editingStep)" title="下移">▼</button>
          <button class="tb-btn tb-sm tb-danger" @click="deleteStep(editingStepIndex)" :disabled="isStepEditLocked(editingStep)" title="删除步骤">✕</button>
        </div>
      </div>
      <div class="step-detail-panel-body">
        <div class="step-locked-banner" v-if="isStepEditLocked(editingStep)">🔒 此步骤已锁定，不可编辑</div>

        <div class="form-row">
          <label>类型</label>
          <select v-model="editingStep.type" :disabled="isStepEditLocked(editingStep)">
            <option value="dialogue">对话 (dialogue)</option>
            <option value="choice">分支选择 (choice)</option>
            <option value="jump">直接跳转 (jump)</option>
            <option value="ending">结局触发 (ending)</option>
          </select>
        </div>

        <!-- ═══ 对话类型 ═══ -->
        <template v-if="editingStep.type === 'dialogue'">
          <div class="form-row">
            <label>场景</label>
            <div class="locate-row">
              <select v-model="editingStep.sceneId" class="cc-char-sel">
                <option value="">(无场景)</option>
                <option v-for="(sc, sid) in gameScenes" :key="sid" :value="sid">{{ sc.title }}</option>
              </select>
              <button class="tb-btn tb-xs" v-if="editingStep.sceneId" @click.stop="locateTo('resource', editingStep.sceneId, 'scenes')" title="定位到场景">📍</button>
            </div>
          </div>
          <div class="form-row">
            <label>说话人</label>
            <div class="locate-row">
              <select v-model="editingStep.characterId" class="cc-char-sel">
                <option value="">(旁白/叙述)</option>
                <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
              </select>
              <button class="tb-btn tb-xs" v-if="editingStep.characterId" @click.stop="locateTo('resource', editingStep.characterId, 'characters')" title="定位到角色">📍</button>
            </div>
          </div>
          <div class="form-row">
            <label>对话文本</label>
            <template v-if="!editingStep.texts">
              <textarea v-model="editingStep.text" rows="4" placeholder="输入对话或叙述文本..."></textarea>
              <button class="tb-btn tb-sm" @click="addBatchTextSegment" style="margin-top:6px;">📚 多段文本</button>
            </template>
            <template v-else>
              <div class="batch-text-list">
                <div v-for="(t, ti) in editingStep.texts" :key="ti" class="batch-text-item">
                  <div class="batch-text-item-header">
                    <span class="batch-text-index">第{{ ti + 1 }}段</span>
                    <button v-if="editingStep.texts.length > 1" class="step-btn step-btn-del" @click="removeBatchTextSegment(ti)">✕</button>
                  </div>
                  <textarea v-model="editingStep.texts[ti]" rows="3"></textarea>
                </div>
                <div class="batch-text-actions">
                  <button class="tb-btn tb-sm" @click="addBatchTextSegment">➕ 添加</button>
                  <button class="tb-btn tb-sm" @click="disableBatchText">⬅ 合并</button>
                </div>
              </div>
            </template>
          </div>
          <div class="form-row">
            <label>屏幕特效</label>
            <input type="text" v-model="editingStep.screenEffect" placeholder="snow?density=30" />
          </div>
          <div class="form-row">
            <label>CG 变更</label>
            <div class="cg-change-group">
              <select v-model="editingStep._cgAction" @change="onCGChange">
                <option value="">(无)</option>
                <option value="enter">进入 CG</option>
                <option value="leave">离开 CG</option>
              </select>
              <select v-if="editingStep._cgAction === 'enter'" v-model="editingStep._cgId" @change="onCGChange">
                <option value="">选择 CG...</option>
                <option v-for="(cg, cgid) in gameCgLibrary" :key="cgid" :value="cgid">{{ cg.title }}</option>
              </select>
              <button class="tb-btn tb-xs" v-if="editingStep._cgAction === 'enter' && editingStep._cgId" @click.stop="locateTo('resource', editingStep._cgId, 'cg')" title="定位到 CG">📍</button>
              <input v-if="editingStep._cgAction" type="text" v-model="editingStep._cgAnimation" @change="onCGChange" placeholder="动画" />
            </div>
          </div>
          <div class="form-row">
            <label>角色变更</label>
            <div class="char-changes-list">
              <div v-for="(cc, cci) in (editingStep._charChanges || [])" :key="cci" class="char-change-row" :class="'cc-action-' + cc.action">
                <div class="cc-main-row">
                  <select v-model="cc.action" @change="onCharChangeField" class="cc-action-sel">
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
                          v-model="cc.id" @change="onCharChangeField" class="cc-char-sel">
                    <option value="">选择角色...</option>
                    <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
                  </select>

                  <template v-if="cc.action === 'swap'">
                    <select v-model="cc.id1" @change="onCharChangeField" class="cc-char-sel">
                      <option value="">角色 A...</option>
                      <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
                    </select>
                    <span class="cc-sep">↔</span>
                    <select v-model="cc.id2" @change="onCharChangeField" class="cc-char-sel">
                      <option value="">角色 B...</option>
                      <option v-for="(ch, cid) in gameCharacters" :key="cid" :value="cid">{{ ch.name }}</option>
                    </select>
                  </template>

                  <input v-if="['speakAll','gather','scatter','order'].includes(cc.action)"
                         v-model="cc.ids" list="dl-char-ids" placeholder="输入角色 ID，逗号分隔" class="cc-ids-input" @change="onCharChangeField">

                  <template v-if="cc.action === 'leave'">
                    <input v-model="cc.animation" list="dl-anims" placeholder="动画" class="cc-anim" @change="onCharChangeField">
                    <input v-model="cc.duration" type="number" placeholder="持续s" step="0.1" min="0.1" class="cc-xs" @change="onCharChangeField">
                  </template>
                  <template v-if="cc.action === 'silence'"><span class="cc-static-label">让该角色停止说话</span></template>
                  <template v-if="cc.action === 'silenceAll'"><span class="cc-static-label">停止所有角色说话</span></template>
                  <template v-if="cc.action === 'resetFilter'"><span class="cc-static-label">重置该角色的颜色滤镜</span></template>

                  <button class="step-btn step-btn-del" @click="removeCharChange(cci)" title="删除">✕</button>
                </div>

                <div class="cc-sub-row" v-if="cc.action !== 'silence' && cc.action !== 'silenceAll' && cc.action !== 'resetFilter'">
                  <template v-if="['enter','update','gather'].includes(cc.action)">
                    <select v-model="cc.spriteId" @change="onCharChangeField" class="cc-sprite-sel">
                      <option value="">默认立绘</option>
                      <option v-for="(sp, sid) in getCharSprites(cc.id)" :key="sid" :value="sid">{{ sp.label }}</option>
                    </select>
                  </template>

                  <template v-if="['enter','move','gather'].includes(cc.action)">
                    <select v-model="cc.position" @change="onCharChangeField" class="cc-pos-sel">
                      <option value="center">居中</option>
                      <option value="left">左</option>
                      <option value="right">右</option>
                      <option value="left-far">最左</option>
                      <option value="center-left">左中</option>
                      <option value="center-right">右中</option>
                      <option value="right-far">最右</option>
                    </select>
                  </template>

                  <input v-if="['enter','update','move','speak','action','effect','gather','scatter','clearAll'].includes(cc.action)"
                         v-model="cc.animation" list="dl-anims" placeholder="动画名" class="cc-anim" @change="onCharChangeField">

                  <template v-if="['action','effect','clearAll'].includes(cc.action)">
                    <label class="cc-label">持续:</label>
                    <input v-model="cc.duration" type="number" step="0.1" min="0.1" placeholder="0.5" class="cc-xs" @change="onCharChangeField">
                  </template>

                  <template v-if="cc.action === 'action'">
                    <select v-model="cc.actionId" @change="onCharChangeField" class="cc-sm">
                      <option value="">动作…</option>
                      <option value="wave">挥手</option>
                      <option value="bow">鞠躬</option>
                      <option value="point">指</option>
                      <option value="nod">点头</option>
                      <option value="shake-head">摇头</option>
                      <option value="sit">坐下</option>
                      <option value="stand">站起</option>
                      <option value="jump">跳跃</option>
                      <option value="fall">跌倒</option>
                      <option value="turn">转身</option>
                      <option value="custom">自定义</option>
                    </select>
                  </template>

                  <template v-if="cc.action === 'effect'">
                    <select v-model="cc.effect" @change="onCharChangeField" class="cc-sm">
                      <option value="">特效…</option>
                      <option value="shake">摇晃</option>
                      <option value="flash">闪烁</option>
                      <option value="glow">发光</option>
                      <option value="float">浮动</option>
                      <option value="pulse">脉动</option>
                      <option value="tremble">颤抖</option>
                      <option value="blur">模糊</option>
                      <option value="highlight">高亮</option>
                      <option value="shine">闪耀</option>
                      <option value="dizzy">眩晕</option>
                    </select>
                  </template>

                  <template v-if="cc.action === 'enter'">
                    <label class="cc-label cc-check"><input type="checkbox" v-model="cc.speak" @change="onCharChangeField"> 说话</label>
                    <input v-model="cc.groupId" placeholder="分组" class="cc-xs" @change="onCharChangeField">
                  </template>

                  <template v-if="cc.action === 'speak'">
                    <label class="cc-label">音量:</label>
                    <input type="range" v-model.number="cc.weight" min="0" max="1" step="0.1" class="cc-range" @change="onCharChangeField">
                    <span class="cc-range-val">{{ cc.weight }}</span>
                  </template>

                  <template v-if="cc.action === 'filter'">
                    <div class="cc-filters-inline">
                      <label class="cc-label">亮度</label>
                      <input type="range" v-model.number="cc.filters.brightness" min="0" max="2" step="0.05" class="cc-range" @change="onCharChangeField">
                      <span class="cc-range-val">{{ cc.filters.brightness?.toFixed(2) }}</span>
                      <label class="cc-label">饱和度</label>
                      <input type="range" v-model.number="cc.filters.saturation" min="0" max="2" step="0.05" class="cc-range" @change="onCharChangeField">
                      <span class="cc-range-val">{{ cc.filters.saturation?.toFixed(2) }}</span>
                      <label class="cc-label">对比度</label>
                      <input type="range" v-model.number="cc.filters.contrast" min="0" max="2" step="0.05" class="cc-range" @change="onCharChangeField">
                      <span class="cc-range-val">{{ cc.filters.contrast?.toFixed(2) }}</span>
                    </div>
                  </template>

                  <template v-if="cc.action === 'scale'">
                    <label class="cc-label">缩放:</label>
                    <input type="range" v-model.number="cc.scale" min="0.1" max="3" step="0.05" class="cc-range" @change="onCharChangeField">
                    <span class="cc-range-val">{{ cc.scale?.toFixed(2) }}</span>
                  </template>
                  <template v-if="cc.action === 'opacity'">
                    <label class="cc-label">透明度:</label>
                    <input type="range" v-model.number="cc.opacity" min="0" max="1" step="0.05" class="cc-range" @change="onCharChangeField">
                    <span class="cc-range-val">{{ cc.opacity?.toFixed(2) }}</span>
                  </template>

                  <template v-if="cc.action === 'gather'">
                    <label class="cc-label">间距:</label>
                    <input v-model="cc.spread" type="number" step="0.01" placeholder="0.15" class="cc-xs" @change="onCharChangeField">
                  </template>

                  <template v-if="['enter','move'].includes(cc.action)">
                    <label class="cc-label">偏移:</label>
                    <input v-model="cc.offsetX" type="number" placeholder="X" class="cc-xs" @change="onCharChangeField">
                    <input v-model="cc.offsetY" type="number" placeholder="Y" class="cc-xs" @change="onCharChangeField">
                  </template>

                  <template v-if="cc.action === 'gather'">
                    <select v-model="cc.spriteId" @change="onCharChangeField" class="cc-sprite-sel">
                      <option value="">默认立绘</option>
                      <option v-for="(sp, sid) in getCharSprites(cc.id)" :key="sid" :value="sid">{{ sp.label }}</option>
                    </select>
                  </template>
                </div>
              </div>
              <button class="tb-btn tb-sm" @click="addCharChange">➕ 角色变更</button>
            </div>
          </div>
          <div class="form-row form-row-2col">
            <div class="form-col">
              <label>获得物品</label>
              <div class="locate-row">
                <select v-model="editingStep.gainItem">
                  <option value="">(无)</option>
                  <option v-for="(item, iid) in gameItems" :key="iid" :value="iid">{{ item.name }}</option>
                </select>
                <button class="tb-btn tb-xs" v-if="editingStep.gainItem" @click.stop="locateTo('resource', editingStep.gainItem, 'items')" title="定位到物品">📍</button>
              </div>
            </div>
            <div class="form-col">
              <label>获得方式</label>
              <select v-model="editingStep.gainApproach" :disabled="!editingStep.gainItem">
                <option value="find">寻获</option>
                <option value="receive">赠予</option>
                <option value="unlock">解锁</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-2col">
            <div class="form-col">
              <label>Flag</label>
              <input type="text" v-model="editingStep.flag" placeholder="flag 名称" />
            </div>
            <div class="form-col">
              <label>打字速度 (ms)</label>
              <input type="number" v-model="editingStep.speed" placeholder="25" min="1" />
            </div>
          </div>
          <div class="form-row">
            <label>环境特效</label>
            <div class="effects-picker">
              <label v-for="ef in availableEffects" :key="ef" class="effect-check">
                <input type="checkbox" :value="ef"
                       :checked="(editingStep.effects || []).includes(ef)"
                       @change="toggleEffect(ef)" />
                {{ ef }}
              </label>
            </div>
          </div>
        </template>

        <!-- ═══ 分支选择 ═══ -->
        <template v-if="editingStep.type === 'choice'">
          <div class="form-row">
            <label>场景</label>
            <select v-model="editingStep.sceneId" class="cc-char-sel">
              <option value="">(无场景)</option>
              <option v-for="(sc, sid) in gameScenes" :key="sid" :value="sid">{{ sc.title }}</option>
            </select>
          </div>
          <div class="form-row">
            <label>分支提示文本</label>
            <textarea v-model="editingStep.text" rows="2" placeholder="面对眼前的抉择..."></textarea>
          </div>
          <div class="form-row">
            <label>分支选项</label>
            <div class="choices-editor">
              <div v-for="(choice, ci) in (editingStep.choices || [])" :key="ci" class="choice-item-edit">
                <div class="choice-header">
                  <strong>选项 #{{ ci + 1 }}</strong>
                  <button class="step-btn step-btn-del" @click="removeChoice(ci)">✕</button>
                </div>
                <input type="text" v-model="choice.text" placeholder="选项文本" class="choice-text" />
                <div class="choice-detail-row">
                  <select v-model="choice.jumpChapter" class="choice-jump">
                    <option value="">跳转到...</option>
                    <optgroup label="章节">
                      <option v-for="(_, cid) in chapters" :key="cid" :value="cid">{{ cid }}</option>
                    </optgroup>
                    <optgroup label="结局">
                      <option v-for="end in gameEndings" :key="end.id" :value="'_end_' + end.id">🎬 {{ end.title }} ({{ end.id }})</option>
                    </optgroup>
                  </select>
                  <input type="text" v-model="choice.flag" placeholder="flag" class="choice-flag" />
                  <button class="tb-btn tb-xs" v-if="choice.jumpChapter" @click.stop="locateTo(choice.jumpChapter.startswith('_end_') ? 'ending' : 'chapter', choice.jumpChapter)" title="定位到">📍</button>
                </div>
              </div>
              <button class="tb-btn tb-sm" @click="addChoice">➕ 添加选项</button>
            </div>
          </div>
        </template>

        <!-- ═══ 跳转类型 ═══ -->
        <template v-if="editingStep.type === 'jump'">
          <div v-if="!editingStep._jumpMode">{{ setDefaultJumpMode(editingStep) }}</div>
          <div class="form-row">
            <label>跳转类型</label>
            <div class="jump-mode-toggle">
              <label class="toggle-option" :class="{ active: editingStep._jumpMode === 'chapter' }">
                <input type="radio" value="chapter" v-model="editingStep._jumpMode" @change="editingStep.endingId = ''" />
                ⤵ 跳转到章节
              </label>
              <label class="toggle-option" :class="{ active: editingStep._jumpMode === 'ending' }">
                <input type="radio" value="ending" v-model="editingStep._jumpMode" @change="editingStep.jumpChapter = ''" />
                🎬 触发结局
              </label>
            </div>
          </div>
          <template v-if="editingStep._jumpMode === 'chapter'">
            <div class="form-row">
              <label>目标章节</label>
              <div class="locate-row">
                <select v-model="editingStep.jumpChapter">
                  <option value="">选择目标...</option>
                  <optgroup label="章节">
                    <option v-for="(_, cid) in chapters" :key="cid" :value="cid">{{ cid }}</option>
                  </optgroup>
                  <optgroup label="结局（快捷）">
                    <option v-for="end in gameEndings" :key="end.id" :value="'_end_' + end.id">🎬 {{ end.title }} ({{ end.id }})</option>
                  </optgroup>
                </select>
                <button class="tb-btn tb-xs" v-if="editingStep.jumpChapter" @click.stop="locateTo(editingStep.jumpChapter.startsWith('_end_') ? 'ending' : 'chapter', editingStep.jumpChapter)" title="定位到">📍</button>
              </div>
            </div>
          </template>
          <template v-if="editingStep._jumpMode === 'ending'">
            <div class="form-row">
              <label>触发结局</label>
              <div class="locate-row">
                <select v-model="editingStep.endingId">
                  <option value="">选择结局...</option>
                  <option v-for="end in gameEndings" :key="end.id" :value="end.id">🎬 {{ end.title }} ({{ end.id }})</option>
                </select>
                <button class="tb-btn tb-xs" v-if="editingStep.endingId" @click.stop="locateTo('ending', '_end_' + editingStep.endingId)" title="定位到结局">📍</button>
              </div>
            </div>
          </template>
          <div class="form-row form-row-2col">
            <div class="form-col">
              <label>获得物品</label>
              <select v-model="editingStep.gainItem">
                <option value="">(无)</option>
                <option v-for="(item, iid) in gameItems" :key="iid" :value="iid">{{ item.name }}</option>
              </select>
            </div>
            <div class="form-col">
              <label>获得方式</label>
              <select v-model="editingStep.gainApproach" :disabled="!editingStep.gainItem">
                <option value="find">寻获</option>
                <option value="receive">赠予</option>
                <option value="unlock">解锁</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>Flag</label>
            <input type="text" v-model="editingStep.flag" placeholder="flag 名称" />
          </div>
        </template>

        <!-- ═══ 结局触发 ═══ -->
        <template v-if="editingStep.type === 'ending'">
          <div class="form-row">
            <label>触发结局</label>
            <select v-model="editingStep.endingId">
              <option value="">选择结局...</option>
              <option v-for="end in gameEndings" :key="end.id" :value="end.id">🎬 {{ end.title }} ({{ end.id }})</option>
            </select>
            <div v-if="editingStep.endingId" class="ending-preview" style="margin-top:6px">
              <div class="ending-preview-title">{{ (gameEndings.find(e => e.id === editingStep.endingId) || {}).title }}</div>
              <div class="ending-preview-desc">{{ (gameEndings.find(e => e.id === editingStep.endingId) || {}).description }}</div>
            </div>
          </div>
          <div class="form-row">
            <label>Flag</label>
            <input type="text" v-model="editingStep.flag" placeholder="flag 名称" />
          </div>
        </template>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

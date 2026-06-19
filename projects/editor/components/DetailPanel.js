/**
 * components/DetailPanel.js
 *
 * Right-side editing panel — shows content for selected chapter, ending, or group.
 * Sub-editors: ChapterEditor (step list), EndingEditor, GroupEditor.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'DetailPanel',
  template: `
    <div class="detail-panel" v-if="selectedChapterId || selectedEndingId || selectedGroupId"
         :class="{ 'detail-collapsed': detailPanelCollapsed }"
         :style="{ width: detailPanelWidth + 'px', height: detailPanelHeight || (detailPanelCollapsed ? 'auto' : '100%') }">
      <button class="detail-toggle-btn" @click="detailPanelCollapsed = !detailPanelCollapsed"
              :title="detailPanelCollapsed ? '展开编辑面板' : '收起编辑面板'">
        {{ detailPanelCollapsed ? '◀' : '▶' }}
      </button>

      <!-- ═══ 结局编辑器 ═══ -->
      <template v-if="selectedEndingId">
        <div class="detail-header">
          <h2>
            <span class="detail-icon">🎬</span>
            <span class="ending-edit-title">{{ selectedEndingNode?.label || '结局' }}</span>
          </h2>
          <div class="detail-header-actions">
            <button class="tb-btn tb-sm" @click="locateTo('resource', selectedEndingData?.id || selectedEndingNode?.endingId, 'endings')" title="在资源管理器中定位">📦</button>
            <button class="tb-btn tb-sm tb-danger" @click="deleteChapter" title="删除结局节点">🗑️ 删除</button>
          </div>
        </div>
        <div class="detail-body">
          <div v-if="!selectedEndingData" class="missing-ending-fix">
            <div class="warn-banner">⚠️ 结局「{{ selectedEndingNode?.endingId }}」在结局配置（endings.js）中不存在</div>
            <p class="missing-ending-desc">该结局节点已被章节引用，但未在结局配置中定义对应的数据条目。点击下方按钮自动创建：</p>
            <button class="tb-btn tb-btn-create" @click="createMissingEnding">✅ 自动创建结局数据</button>
          </div>
          <template v-if="selectedEndingData">
            <div class="section-label">🎬 结局信息</div>
            <div class="chapter-info-bar">
              <span v-if="selectedEndingNode">被引用：<strong>{{ selectedEndingNode.incoming }}</strong> 次</span>
            </div>
            <div class="form-row">
              <label>结局 ID</label>
              <div class="rename-row">
                <input type="text" v-model="selectedEndingData._renameId"
                       :placeholder="selectedEndingData?.id || selectedEndingNode?.endingId" />
                <button class="tb-btn tb-sm" @click="renameResource('endings', selectedEndingData?.id || selectedEndingNode?.endingId)">↻ 重命名</button>
              </div>
            </div>
            <div class="form-row">
              <label>结局标题</label>
              <input type="text" v-model="selectedEndingData.title" placeholder="结局标题" />
            </div>
            <div class="form-row">
              <label>结局描述</label>
              <textarea v-model="selectedEndingData.description" rows="4" placeholder="结局描述..."></textarea>
            </div>
          </template>
          <div class="section-label">🔗 来源章节</div>
          <div class="resource-list-items" style="max-height:180px;overflow-y:auto">
            <div v-for="src in endingIncomingChapters" :key="src.id + (src.stepIdx || 0)"
                 class="resource-list-item">
              <span class="resource-item-name">{{ src.id }}</span>
              <span class="resource-item-id" v-if="src.text" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ src.text }}</span>
              <button class="tb-btn tb-xs" @click.stop="locateTo('chapter', src.id)" title="定位到章节">📍</button>
            </div>
            <div class="resource-list-empty" v-if="endingIncomingChapters.length === 0">暂无章节指向此结局</div>
          </div>
        </div>
      </template>

      <!-- ═══ 章节编辑器 ═══ -->
      <template v-if="selectedChapterId">
        <div class="detail-header">
          <h2>
            <span class="detail-icon">📜</span>
            <input class="chapter-id-input" :value="selectedChapterId"
                   @focus="$event.target.value = selectedChapterId; $event.target.select()"
                   @change="editingChapterId = $event.target.value; onChapterIdChange()"
                   @keyup.escape="$event.target.blur()"
                   placeholder="chapter_id" />
          </h2>
          <div class="detail-header-actions">
            <button class="tb-btn tb-sm tb-danger" @click="deleteChapter" title="删除章节">🗑️</button>
            <button class="tb-btn tb-sm" @click="locateTo('resource', selectedChapterId, 'chapters')" title="在资源管理器中定位">📦</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="section-label">📋 章节信息</div>
          <div class="chapter-info-bar">
            <span>步骤数：<strong>{{ editingSteps.length }}</strong></span>
            <span v-if="chapterIncomingCount > 0">被引用：<strong>{{ chapterIncomingCount }}</strong> 次</span>
            <span v-if="chapterOutgoing.length > 0">
              跳转到：
              <span v-for="t in chapterOutgoing" :key="t" class="jump-tag-wrap">
                <strong class="jump-tag" @click="selectNode(t)">{{ t }}</strong>
                <button class="tb-btn tb-xs" @click.stop="locateTo(t.startsWith('_end_') ? 'ending' : 'chapter', t)" title="定位到">📍</button>
              </span>
            </span>
          </div>
          <div class="form-row">
            <label>章节简介</label>
            <textarea v-model="chapterDescriptions[selectedChapterId]"
                      rows="3" placeholder="为这个章节编写简介（显示在树节点上）..."
                      class="chapter-desc-input"></textarea>
          </div>
          <div class="section-label" style="display:flex;align-items:center;justify-content:space-between">
            <span>📝 步骤列表（拖拽排序）</span>
            <button class="tb-btn tb-sm" @click="addStep" title="添加步骤">➕</button>
          </div>
          <div class="step-list" ref="stepList">
            <div v-for="(step, idx) in editingSteps" :key="idx"
                 class="step-card"
                 :class="{
                     'step-dialogue': step.type === 'dialogue',
                     'step-choice': step.type === 'choice',
                     'step-ending': step.type === 'jump' && step.endingId || step.type === 'ending',
                     'step-jump': step.type === 'jump',
                     'step-active': editingStepIndex === idx,
                     'step-dragging': detailStepDrag.dragIndex === idx,
                     'step-dragover': detailStepDrag.dropIndex === idx && detailStepDrag.dragIndex !== idx,
                     'step-locked-pos': isStepLocked(editingSteps, idx),
                     'step-locked': step.locked
                 }"
                 :draggable="!isStepLocked(editingSteps, idx) && !step.locked"
                 @dragstart="detailStepDragStart($event, idx)"
                 @dragover="detailStepDragOver($event, idx)"
                 @drop="detailStepDrop($event, idx)"
                 @dragend="detailStepDragEnd"
                 @click="selectStep(idx)">
              <div class="step-card-header">
                <span class="drag-handle" v-if="!isStepLocked(editingSteps, idx) && !step.locked">⠿</span>
                <span class="step-type-badge"
                      :class="step.type === 'ending' || (step.type === 'jump' && step.endingId) ? 'badge-ending' : 'badge-' + (step.type || 'dialogue')">
                  {{ stepTypeLabel(step.type, step) }}
                </span>
                <span class="step-scene" v-if="step.sceneId">{{ step.sceneId }}</span>
                <span class="step-char" v-if="step.characterId">👤 {{ getCharName(step.characterId) }}</span>
                <div class="step-card-actions">
                  <button class="step-btn step-btn-lock" @click.stop="toggleStepLock(idx)" :title="step.locked ? '解锁步骤' : '锁定步骤'">
                    {{ step.locked ? '🔒' : '🔓' }}
                  </button>
                  <button class="step-btn" @click.stop="moveStep(idx, -1)" :disabled="idx === 0 || step.locked" title="上移">▲</button>
                  <button class="step-btn" @click.stop="moveStep(idx, 1)" :disabled="idx === editingSteps.length - 1 || step.locked" title="下移">▼</button>
                  <button class="step-btn step-btn-del" @click.stop="deleteStep(idx)" :disabled="step.locked" title="删除">✕</button>
                </div>
                <span class="lock-icon" v-if="isStepLocked(editingSteps, idx)" title="末尾路由步骤，不可移动">🔒</span>
              </div>
              <div class="step-card-body">
                <div class="step-text-preview">{{ stepTextBrief(step) }}</div>
                <div class="step-batch-badge" v-if="step.texts && step.texts.length > 1">{{ step.texts.length }}段</div>
              </div>
            </div>
            <div class="step-list-empty" v-if="editingSteps.length === 0">暂无步骤，点击"添加步骤"开始编辑</div>
          </div>
        </div>
      </template>

      <!-- ═══ 分组编辑器 ═══ -->
      <template v-if="selectedGroupId">
        <div class="detail-header">
          <h2>
            <span class="detail-icon">📦</span>
            <span class="group-edit-title">{{ editorGroups[selectedGroupId]?.name || '分组' }}</span>
          </h2>
          <div class="detail-header-actions">
            <button class="tb-btn tb-sm" @click="renameGroup(selectedGroupId)">✏️ 重命名</button>
            <button class="tb-btn tb-sm tb-danger" @click="deleteGroup(selectedGroupId); selectedChapterId = null">🗑️ 删除</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="section-label">📋 分组信息</div>
          <div class="chapter-info-bar">
            <span>节点数：<strong>{{ editorGroups[selectedGroupId]?.nodeIds?.length || 0 }}</strong></span>
            <span>颜色：
              <input type="color" v-model="editorGroups[selectedGroupId].color"
                     style="width:32px;height:24px;vertical-align:middle;border:none;background:none;cursor:pointer" />
            </span>
            <span>背景：
              <input type="range" v-model.number="editorGroups[selectedGroupId].bgOpacity"
                     min="0" max="0.6" step="0.05" style="width:60px;vertical-align:middle" />
            </span>
          </div>
          <div class="section-label">📝 成员节点</div>
          <div class="resource-list-items" style="max-height:200px;overflow-y:auto">
            <div v-for="nid in (editorGroups[selectedGroupId]?.nodeIds || [])" :key="nid"
                 class="resource-list-item" @click="selectNode(nid)">
              <span class="resource-item-name">{{ nid }}</span>
              <button class="tb-icon-btn tb-sm" style="margin-left:auto;font-size:10px"
                      @click.stop="removeNodeFromGroup(selectedGroupId, nid)" title="从分组移除">✕</button>
            </div>
            <div class="resource-list-empty" v-if="!editorGroups[selectedGroupId]?.nodeIds?.length">分组为空</div>
          </div>
        </div>
      </template>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

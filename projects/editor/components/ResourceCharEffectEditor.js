/**
 * components/ResourceCharEffectEditor.js
 *
 * Character-change action editor — used inside the ResourceManagerWindow.
 * Displays action-specific parameter editors for enter/update/leave/move/etc.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'ResourceCharEffectEditor',
  template: `
    <div>
      <div class="section-label">🎭 角色变更预览</div>
      <div class="effect-preview-box" :ref="el => charEffectPreviewRef = el">
        <div class="effect-preview-bg">
          <span v-if="!charEffectPreviewActive">调整下方参数后点击「预览」查看效果</span>
        </div>
      </div>
      <button class="tb-btn tb-sm" @click="toggleCharEffectPreview(selectedResourceId)">
        {{ charEffectPreviewActive ? '⏹ 停止预览' : '▶ 预览角色变更' }}
      </button>

      <div class="section-label" style="margin-top:12px">⚙️ 变更参数</div>

      <div class="form-row">
        <label>动作类型</label>
        <input type="text" :value="selectedResource.action" disabled style="font-family:monospace;font-size:12px" />
      </div>

      <template v-if="selectedResource.action === 'enter'">
        <div class="form-row"><label>入场动画</label>
          <select v-model="selectedResource.animation">
            <option v-for="a in ANIM_ENTER" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-row"><label>目标位置</label>
          <select v-model="selectedResource.position">
            <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'update'">
        <div class="form-row"><label>精灵 ID</label><input type="text" v-model="selectedResource.spriteId" placeholder="default" /></div>
        <div class="settings-note">将角色在舞台上的立绘切换为指定精灵，用于表情/姿态变化。</div>
      </template>

      <template v-if="selectedResource.action === 'leave'">
        <div class="form-row"><label>退场动画</label>
          <select v-model="selectedResource.animation">
            <option v-for="a in ANIM_LEAVE" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-row"><label>持续时长</label>
          <select v-model="selectedResource.duration">
            <option v-for="d in DURATIONS" :key="d" :value="d">{{ d }}s</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'move'">
        <div class="form-row"><label>目标位置</label>
          <select v-model="selectedResource.position">
            <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-row"><label>移动动画</label>
          <select v-model="selectedResource.animation">
            <option v-for="a in ANIM_MOVE" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-row form-row-2col">
          <div class="form-col"><label>偏移 X</label><input type="number" v-model.number="selectedResource.offsetX" placeholder="0" style="width:100%" /></div>
          <div class="form-col"><label>偏移 Y</label><input type="number" v-model.number="selectedResource.offsetY" placeholder="0" style="width:100%" /></div>
        </div>
      </template>

      <template v-if="selectedResource.action === 'speak'">
        <div class="form-row"><label>音量权重</label>
          <input type="range" min="0" max="1" step="0.1" v-model.number="selectedResource.weight" style="flex:1" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">{{ selectedResource.weight || 1 }}</span>
        </div>
        <div class="settings-note">标记角色为"正在说话"，音量越高视觉越突出。</div>
      </template>

      <template v-if="selectedResource.action === 'silence'">
        <div class="settings-note">停止指定角色的说话状态。</div>
      </template>

      <template v-if="selectedResource.action === 'speakAll'">
        <div class="form-row"><label>角色 IDs</label><input type="text" v-model="selectedResource.ids" placeholder="逗号分隔，如 _a,_b" /></div>
        <div class="form-row"><label>权重</label><input type="text" v-model="selectedResource.weights" placeholder="逗号分隔，如 1.0,0.7" /></div>
      </template>

      <template v-if="selectedResource.action === 'silenceAll'">
        <div class="settings-note">停止所有角色的说话状态。</div>
      </template>

      <template v-if="selectedResource.action === 'action'">
        <div class="form-row"><label>角色动作</label>
          <select v-model="selectedResource.actionId">
            <option v-for="a in ACTIONS" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-row"><label>持续时长</label>
          <select v-model="selectedResource.duration">
            <option v-for="d in DURATIONS" :key="d" :value="d">{{ d }}s</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'effect'">
        <div class="form-row"><label>角色特效</label>
          <select v-model="selectedResource.effect">
            <option v-for="e in FX_CHAR" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div class="form-row"><label>持续时长</label>
          <select v-model="selectedResource.duration">
            <option :value="0">0（循环）</option>
            <option :value="0.3">0.3s</option>
            <option :value="0.5">0.5s</option>
            <option :value="0.8">0.8s</option>
            <option :value="1.0">1.0s</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'filter'">
        <div class="form-row"><label>亮度</label>
          <input type="range" min="0" max="2" step="0.05" v-model.number="selectedResource.filters.brightness" style="flex:1" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">{{ (selectedResource.filters && selectedResource.filters.brightness) || 1 }}</span>
        </div>
        <div class="form-row"><label>饱和度</label>
          <input type="range" min="0" max="2" step="0.05" v-model.number="selectedResource.filters.saturation" style="flex:1" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">{{ (selectedResource.filters && selectedResource.filters.saturation) || 1 }}</span>
        </div>
        <div class="form-row"><label>对比度</label>
          <input type="range" min="0" max="2" step="0.05" v-model.number="selectedResource.filters.contrast" style="flex:1" />
          <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">{{ (selectedResource.filters && selectedResource.filters.contrast) || 1 }}</span>
        </div>
      </template>

      <template v-if="selectedResource.action === 'resetFilter'">
        <div class="settings-note">重置指定角色的颜色滤镜到默认值。</div>
      </template>

      <template v-if="selectedResource.action === 'scale'">
        <div class="form-row"><label>缩放比例</label>
          <select v-model="selectedResource.scale">
            <option v-for="s in [0.3,0.5,0.7,0.8,1.0,1.2,1.3,1.5,2.0]" :key="s" :value="s">{{ s }}×</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'opacity'">
        <div class="form-row"><label>透明度值</label>
          <select v-model="selectedResource.opacity">
            <option v-for="o in [0.0,0.1,0.25,0.5,0.75,0.9,1.0]" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'swap'">
        <div class="form-row form-row-2col">
          <div class="form-col"><label>角色 A</label><input type="text" v-model="selectedResource.id1" placeholder="char_1" /></div>
          <div class="form-col"><label>角色 B</label><input type="text" v-model="selectedResource.id2" placeholder="char_2" /></div>
        </div>
        <div class="settings-note">交换两个角色的位置，双方同时播放 swap 动画。</div>
      </template>

      <template v-if="selectedResource.action === 'gather'">
        <div class="form-row"><label>角色 IDs</label><input type="text" v-model="selectedResource.ids" placeholder="逗号分隔" /></div>
        <div class="form-row"><label>聚集位置</label>
          <select v-model="selectedResource.position">
            <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-row"><label>间距 (spread)</label><input type="number" v-model.number="selectedResource.spread" min="0.05" max="0.5" step="0.01" /></div>
        <div class="form-row"><label>入场动画</label>
          <select v-model="selectedResource.animation">
            <option value="slide-in-up">slide-in-up</option>
            <option value="fade-in">fade-in</option>
            <option value="bounce-in">bounce-in</option>
            <option value="zoom-in">zoom-in</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'scatter'">
        <div class="form-row"><label>角色 IDs</label><input type="text" v-model="selectedResource.ids" placeholder="逗号分隔" /></div>
        <div class="form-row"><label>散开动画</label>
          <select v-model="selectedResource.animation">
            <option value="slide-out-right">slide-out-right</option>
            <option value="slide-out-left">slide-out-left</option>
            <option value="fade-out">fade-out</option>
          </select>
        </div>
      </template>

      <template v-if="selectedResource.action === 'order'">
        <div class="form-row"><label>角色 IDs（按层级顺序）</label><input type="text" v-model="selectedResource.ids" placeholder="逗号分隔" /></div>
        <div class="settings-note">重新排列角色的 Z-order 层级，在前的在上层。</div>
      </template>

      <template v-if="selectedResource.action === 'clearAll'">
        <div class="form-row"><label>退场动画</label>
          <select v-model="selectedResource.animation">
            <option value="fade-out">fade-out</option>
            <option value="shrink-out">shrink-out</option>
            <option value="vanish">vanish</option>
            <option v-for="a in ANIM_LEAVE" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-row"><label>持续时长</label>
          <select v-model="selectedResource.duration">
            <option v-for="d in DURATIONS" :key="d" :value="d">{{ d }}s</option>
          </select>
        </div>
      </template>

      <div class="section-label">📋 说明</div>
      <div class="settings-note">
        <strong>{{ selectedResource.name || selectedResourceId }}</strong>
        <span v-if="selectedResource.action === 'enter'">—— 让角色以 <em>{{ selectedResource.animation }}</em> 动画入场到 <em>{{ selectedResource.position }}</em> 位置。</span>
        <span v-if="selectedResource.action === 'update'">—— 切换角色立绘为 <em>{{ selectedResource.spriteId || '默认' }}</em>。</span>
        <span v-if="selectedResource.action === 'leave'">—— 让角色以 <em>{{ selectedResource.animation }}</em> 动画退场，持续 <em>{{ selectedResource.duration }}s</em>。</span>
        <span v-if="selectedResource.action === 'move'">—— 让角色移到 <em>{{ selectedResource.position }}</em>，使用 <em>{{ selectedResource.animation }}</em> 动画。</span>
        <span v-if="selectedResource.action === 'speak'">—— 标记角色为"说话"，音量权重 <em>{{ selectedResource.weight || 1 }}</em>。</span>
        <span v-if="selectedResource.action === 'silence'">—— 停止角色说话，恢复普通层级。</span>
        <span v-if="selectedResource.action === 'speakAll'">—— 让多个角色同时说话。</span>
        <span v-if="selectedResource.action === 'silenceAll'">—— 停止所有角色说话。</span>
        <span v-if="selectedResource.action === 'action'">—— 让角色执行 <em>{{ selectedResource.actionId }}</em> 动作{{ selectedResource.duration > 0 ? '，持续' + selectedResource.duration + 's' : '' }}。</span>
        <span v-if="selectedResource.action === 'effect'">—— 施加 <em>{{ selectedResource.effect }}</em> 特效{{ selectedResource.duration > 0 ? '，持续' + selectedResource.duration + 's' : '（循环）' }}。</span>
        <span v-if="selectedResource.action === 'filter'">—— 调整颜色滤镜（亮度/饱和度/对比度）。</span>
        <span v-if="selectedResource.action === 'resetFilter'">—— 清除角色颜色滤镜。</span>
        <span v-if="selectedResource.action === 'scale'">—— 将角色缩放到 <em>{{ selectedResource.scale }}×</em>。</span>
        <span v-if="selectedResource.action === 'opacity'">—— 将角色透明度设为 <em>{{ selectedResource.opacity }}</em>。</span>
        <span v-if="selectedResource.action === 'swap'">—— 交换两个角色的位置。</span>
        <span v-if="selectedResource.action === 'gather'">—— 将角色聚集到 <em>{{ selectedResource.position }}</em>。</span>
        <span v-if="selectedResource.action === 'scatter'">—— 将角色分散到预设位置。</span>
        <span v-if="selectedResource.action === 'order'">—— 重新排列角色层级顺序。</span>
        <span v-if="selectedResource.action === 'clearAll'">—— 清空舞台上所有角色。</span>
      </div>

      <div v-if="customCharEffects[selectedResourceId]" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color)">
        <button class="tb-btn tb-danger tb-sm" @click="deleteResource('charEffects', selectedResourceId)">🗑️ 删除此角色变更</button>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

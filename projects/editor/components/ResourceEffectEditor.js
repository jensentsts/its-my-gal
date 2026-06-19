/**
 * components/ResourceEffectEditor.js
 *
 * Screen-effect editor — used inside the ResourceManagerWindow.
 * Supports builtin, template (emoji), and custom (JS+CSS) effect types.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'ResourceEffectEditor',
  template: `
    <div>
      <div class="section-label">✨ 特效预览与信息</div>
      <div class="effect-preview-box" :ref="el => effectPreviewRef = el">
        <div class="effect-preview-bg">
          <span v-if="!effectPreviewActive">点击下方「预览」查看效果</span>
        </div>
      </div>
      <button class="tb-btn tb-sm" @click="toggleEffectPreview(selectedResourceId)">
        {{ effectPreviewActive ? '⏹ 停止预览' : '▶ 预览特效' }}
      </button>

      <template v-if="customEffects[selectedResourceId]">
        <div class="section-label">⚙️ 参数编辑</div>
        <div class="form-row"><label>特效名称</label><input type="text" v-model="customEffects[selectedResourceId].name" /></div>
        <div class="form-row"><label>图标 (emoji)</label><input type="text" v-model="customEffects[selectedResourceId].icon" /></div>
        <div class="form-row"><label>特效类别</label>
          <select v-model="customEffects[selectedResourceId].effectType">
            <option value="builtin">内置特效（雨/雪/火焰等）</option>
            <option value="template">模板 + Emoji 特效</option>
            <option value="custom">独立 JS + CSS 特效</option>
          </select>
        </div>

        <template v-if="customEffects[selectedResourceId]?.effectType === 'builtin'">
          <div class="form-row"><label>内置类型</label>
            <select v-model="customEffects[selectedResourceId].type">
              <option value="rain">🌧️ 雨</option>
              <option value="snow">❄️ 雪</option>
              <option value="sakura">🌸 樱花</option>
              <option value="fire">🔥 火焰</option>
              <option value="stardust">✨ 星尘</option>
              <option value="bloodmoon">🩸 血月</option>
              <option value="corruption">🌑 腐蚀</option>
            </select>
          </div>
          <div class="form-row"><label>密度</label><input type="number" v-model.number="customEffects[selectedResourceId].density" min="1" max="100" /></div>
          <div class="form-row"><label>速度</label><input type="number" v-model.number="customEffects[selectedResourceId].speed" min="1" max="200" /></div>
          <div class="settings-note">内置特效参数说明：<br><strong>rain/snow/sakura</strong>: density, speed, wind, sizeMin, sizeMax<br><strong>fire</strong>: density, intensity, scale<br><strong>stardust/bloodmoon/corruption</strong>: density</div>
        </template>

        <template v-if="customEffects[selectedResourceId]?.effectType === 'template'">
          <div class="form-row"><label>Emoji</label><input type="text" v-model="customEffects[selectedResourceId].emoji" placeholder="💖" /></div>
          <div class="form-row"><label>动画模板</label>
            <select v-model="customEffects[selectedResourceId].animation">
              <option value="fall">下落 (fall)</option>
              <option value="rise">上升 (rise)</option>
              <option value="float">漂浮 (float)</option>
              <option value="explode">爆炸 (explode)</option>
            </select>
          </div>
          <div class="form-row"><label>密度</label><input type="number" v-model.number="customEffects[selectedResourceId].density" min="1" max="100" /></div>
          <div class="form-row"><label>速度</label><input type="number" v-model.number="customEffects[selectedResourceId].speed" min="1" max="200" /></div>
          <div class="form-row"><label>最小尺寸</label><input type="number" v-model.number="customEffects[selectedResourceId].sizeMin" min="6" max="60" /></div>
          <div class="form-row"><label>最大尺寸</label><input type="number" v-model.number="customEffects[selectedResourceId].sizeMax" min="6" max="60" /></div>
          <div class="form-row"><label>颜色（可选）</label><input type="text" v-model="customEffects[selectedResourceId].color" placeholder="如 #ff69b4" /></div>
        </template>

        <template v-if="customEffects[selectedResourceId]?.effectType === 'custom'">
          <div class="form-row"><label>JS 路径</label><input type="text" v-model="customEffects[selectedResourceId].jsPath" placeholder="effects/my-effect/effect.js" /></div>
          <div class="form-row"><label>CSS 路径（可选）</label><input type="text" v-model="customEffects[selectedResourceId].cssPath" placeholder="effects/my-effect/effect.css" /></div>
          <div class="settings-note">JS 特效需暴露默认模块：<br><code>{ spawn(container, config), getInterval(config), onStart?, onStop? }</code></div>
        </template>
      </template>

      <div class="effect-builtin-info" v-if="!customEffects[selectedResourceId]">
        <div class="info-name">{{ getEffectIcon(selectedResourceId) }} {{ selectedResourceId }}</div>
        <div class="info-meta">
          <div>类型：内置特效</div>
          <div>该特效为引擎默认提供，支持在步骤的「环境特效」中直接使用。</div>
          <div>如需自定义参数，请点击左侧「➕ 添加」创建自定义特效配置。</div>
        </div>
      </div>

      <div v-if="customEffects[selectedResourceId]" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color)">
        <button class="tb-btn tb-danger tb-sm" @click="deleteResource('effects', selectedResourceId)">🗑️ 删除此特效</button>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

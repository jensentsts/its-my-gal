/**
 * components/SettingsPanel.js
 *
 * Settings overlay — keyboard bindings + game settings tabs.
 */
const { defineComponent, inject } = Vue;
export default defineComponent({
  name: 'SettingsPanel',
  template: `
    <div class="sub-panel settings-panel" v-if="showSettings" :style="panelBackgroundStyle">
      <div class="panel-header">
        <h2>⚙️ 设置</h2>
        <div class="settings-tabs">
          <button :class="{ active: settingsTab === 'keyboard' }"
                  @click="settingsTab = 'keyboard'">🎮 按键设置</button>
          <button :class="{ active: settingsTab === 'game' }"
                  @click="settingsTab = 'game'">⚡ 游戏设置</button>
        </div>
        <button class="close-btn" @click="closeSettings">返回主视图</button>
      </div>

      <div class="settings-content" v-if="settingsTab === 'keyboard'" @click="cancelRebind">
        <div class="settings-scroll-area">
          <div class="settings-section" v-for="(group, ctx) in keybindings.getActionsByGroup()" :key="ctx">
            <h3 class="settings-section-title">{{ group.label }}</h3>
            <div class="keybinding-row" v-for="action in group.actions" :key="action.id">
              <span class="kb-label">{{ action.label }}</span>
              <button class="kb-key-btn"
                      :class="{ capturing: capturingActionId === action.id }"
                      @click.stop="capturingActionId === action.id ? cancelRebind() : rebindAction(action.id)">
                <span v-if="capturingActionId === action.id">{{ capturedPreview || '按下按键…' }} <span class="kb-cancel-hint">再次点击取消</span></span>
                <span v-else>{{ keybindings.formatKey(keybindings.getBinding(action.id)) }}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="settings-section-actions">
          <button class="reset-btn" @click="resetKeybindings()">🔄 重置为默认按键</button>
        </div>
      </div>

      <div class="settings-content" v-if="settingsTab === 'game'" @click="cancelRebind">
        <div class="settings-scroll-area">
          <div class="settings-section">
            <h3 class="settings-section-title">✍️ 文字速度</h3>
            <p class="settings-section-desc">控制剧情文本的显示速度，数值越小越快。</p>
            <div class="setting-slider-row">
              <input type="range"
                     :min="textSpeedPresets[0].value"
                     :max="textSpeedPresets[textSpeedPresets.length-1].value"
                     :value="textSpeed"
                     step="1"
                     @input="updateTextSpeed(parseInt($event.target.value))" />
              <span class="setting-value-label">{{ textSpeed }}ms</span>
            </div>
            <div class="setting-preset-row">
              <button v-for="preset in textSpeedPresets" :key="preset.value"
                      :class="{ active: textSpeed === preset.value }"
                      @click="updateTextSpeed(preset.value)">
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="settings-section-actions">
          <button class="reset-btn" @click="resetSettings()">🔄 恢复默认设置</button>
        </div>
      </div>
    </div>
  `,
  setup() { return inject('game'); }
});

/**
 * components/ResourceManagerWindow.js
 *
 * Floating resource manager window — tabbed resource browser + editor.
 * Tabs: characters, scenes, cg, items, endings, charEffects, effects, chapters.
 *
 * Sub-editos for charEffects, effects, and chapters are in separate files
 * and registered globally.
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'ResourceManagerWindow',
  template: `
    <div class="editor-window" :class="{ 'window-is-maximized': windows.resourceManager?.maximized }"
         v-if="windows.resourceManager?.visible && !isDocked('resourceManager')" :style="getWindowStyle('resourceManager')"
         @mousedown="focusWindow('resourceManager')">
      <div class="window-resize-overlay">
        <div class="wr-edge-n" @mousedown.stop="startWindowResize($event, 'resourceManager', 'n')"></div>
        <div class="wr-edge-s" @mousedown.stop="startWindowResize($event, 'resourceManager', 's')"></div>
        <div class="wr-edge-w" @mousedown.stop="startWindowResize($event, 'resourceManager', 'w')"></div>
        <div class="wr-edge-e" @mousedown.stop="startWindowResize($event, 'resourceManager', 'e')"></div>
        <div class="wr-corner-nw" @mousedown.stop="startWindowResize($event, 'resourceManager', 'nw')"></div>
        <div class="wr-corner-ne" @mousedown.stop="startWindowResize($event, 'resourceManager', 'ne')"></div>
        <div class="wr-corner-sw" @mousedown.stop="startWindowResize($event, 'resourceManager', 'sw')"></div>
        <div class="wr-corner-se" @mousedown.stop="startWindowResize($event, 'resourceManager', 'se')"></div>
      </div>
      <div class="window-header" @mousedown.stop="startWindowDrag($event, 'resourceManager')">
        <span class="window-header-title">{{ windows.resourceManager?.icon }} {{ windows.resourceManager?.title }}</span>
        <div class="window-header-actions">
          <button class="window-btn window-btn-maximize" @click.stop="toggleMaximize('resourceManager')"
                  :title="windows.resourceManager?.maximized ? '还原' : '全屏'">
            {{ windows.resourceManager?.maximized ? '⤡' : '⤢' }}
          </button>
          <button class="window-btn window-btn-close" @click.stop="closeWindow('resourceManager')" title="关闭">✕</button>
        </div>
      </div>
      <div class="window-body">
        <div class="resource-body">
          <!-- 标签栏 -->
          <div class="resource-tabs">
            <div class="resource-tab" :class="{ active: resourceTab === 'chapters' }"
                 @click="resourceTab = 'chapters'; selectedResourceId = null">📜 章节</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'characters' }"
                 @click="resourceTab = 'characters'; selectedResourceId = null">👤 角色</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'scenes' }"
                 @click="resourceTab = 'scenes'; selectedResourceId = null">🏞️ 场景</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'cg' }"
                 @click="resourceTab = 'cg'; selectedResourceId = null">🖼️ CG 图鉴</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'items' }"
                 @click="resourceTab = 'items'; selectedResourceId = null">🎒 物品</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'endings' }"
                 @click="resourceTab = 'endings'; selectedResourceId = null">🎬 结局</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'charEffects' }"
                 @click="resourceTab = 'charEffects'; selectedResourceId = null">🎭 角色变更</div>
            <div class="resource-tab" :class="{ active: resourceTab === 'effects' }"
                 @click="resourceTab = 'effects'; selectedResourceId = null">✨ 特效</div>
          </div>

          <!-- 内容区域 -->
          <div class="resource-tab-content">
            <div class="resource-layout">
              <!-- 左侧列表 -->
              <div class="resource-list-panel" :style="{ width: resourceListWidth + 'px' }">
                <div class="resource-list-header">
                  <button class="tb-btn tb-sm" @click="addResource(resourceTab)" v-if="resourceTab !== 'charEffects'">➕ 添加</button>
                </div>
                <div class="resource-list-items">
                  <div v-for="item in resourceList" :key="item.id || item._idx"
                       class="resource-list-item"
                       :class="{ active: selectedResourceId === item.id }"
                       @click="selectResource(resourceTab, item.id)">
                    <span class="resource-item-icon">{{ item.icon || resourceMeta[resourceTab].icon }}</span>
                    <span class="resource-item-name">{{ item.name || item.title || item.id }}</span>
                    <span class="resource-item-id">{{ item._isBuiltin ? '内置' : item.id }}</span>
                  </div>
                  <div class="resource-list-empty" v-if="resourceList.length === 0">暂无数据，点击"添加"创建</div>
                </div>
              </div>

              <!-- 左右分栏拖拽手柄 -->
              <div class="resize-handle-vertical" @mousedown="startResourceListResize($event)"></div>

              <!-- 右侧编辑器区域 -->
              <div class="resource-editor" v-if="selectedResource || ((resourceTab === 'effects' || resourceTab === 'charEffects') && selectedResourceId)">

                <!-- ═══ 角色编辑器 ═══ -->
                <template v-if="resourceTab === 'characters'">
                  <div class="section-label">👤 角色属性</div>
                  <div class="form-row">
                    <label>角色 ID</label>
                    <div class="rename-row">
                      <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
                      <button class="tb-btn tb-sm" @click="renameResource('characters', selectedResourceId)">↻ 重命名</button>
                    </div>
                  </div>
                  <div class="form-row"><label>名称</label><input type="text" v-model="selectedResource.name" /></div>
                  <div class="form-row form-row-2col">
                    <div class="form-col">
                      <label>显示颜色</label>
                      <input type="color" v-model="selectedResource.color" style="height: 36px;" />
                    </div>
                    <div class="form-col">
                      <label>默认语速 (ms)</label>
                      <input type="number" v-model.number="selectedResource.defaultSpeed" min="1" max="200" />
                    </div>
                  </div>
                  <div class="form-row form-row-2col">
                    <div class="form-col"><label>种族</label><input type="text" v-model="selectedResource.race" /></div>
                    <div class="form-col"><label>性别</label><input type="text" v-model="selectedResource.gender" /></div>
                  </div>
                  <div class="form-row"><label>角色定位</label><input type="text" v-model="selectedResource.role" /></div>
                  <div class="form-row"><label>角色描述</label><textarea v-model="selectedResource.description" rows="3"></textarea></div>
                  <div class="section-label">🖼️ 立绘差分管理</div>
                  <div class="sprite-gallery">
                    <div v-for="(sp, sid) in (selectedResource.sprites || {})" :key="sid"
                         class="sprite-card" :class="{ 'sprite-card-active': selectedSpriteId === sid }"
                         @click="selectedSpriteId = sid" :title="sp.url || '无图片'">
                      <div class="sprite-card-img">
                        <img v-if="sp.url" :src="sp.url" @error="e => e.target.style.display='none'" />
                        <div v-else class="sprite-card-noimg">?</div>
                      </div>
                      <div class="sprite-card-label">{{ sp.label || sid }}</div>
                      <button class="sprite-card-del" @click.stop="delete selectedResource.sprites[sid]; if(selectedSpriteId===sid)selectedSpriteId=null">✕</button>
                    </div>
                    <div class="sprite-card sprite-card-add" @click="addSprite(selectedResource)">
                      <div class="sprite-card-img">➕</div>
                      <div class="sprite-card-label">添加</div>
                    </div>
                  </div>
                  <div v-if="selectedSpriteId && selectedResource.sprites[selectedSpriteId]" class="sprite-detail">
                    <div class="res-preview-dropzone sprite-preview-dropzone"
                         @dragover.prevent @drop.prevent="onSpriteDrop($event, selectedResource.sprites[selectedSpriteId])"
                         @click="triggerResourceFile(selectedResource.sprites[selectedSpriteId])"
                         :title="selectedResource.sprites[selectedSpriteId].url || '点击或拖放图片'">
                      <img v-if="selectedResource.sprites[selectedSpriteId].url"
                           :src="selectedResource.sprites[selectedSpriteId].url" class="res-preview-img"
                           @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }" />
                      <div class="res-preview-placeholder" v-if="!selectedResource.sprites[selectedSpriteId].url" style="display:flex">
                        <span>🖼️</span><span>点击或拖放立绘图片</span>
                      </div>
                    </div>
                    <div class="sprite-detail-fields">
                      <input type="text" v-model="selectedResource.sprites[selectedSpriteId].id" placeholder="立绘 ID" class="sprite-field-id" />
                      <input type="text" v-model="selectedResource.sprites[selectedSpriteId].label" placeholder="标签（如：默认、微笑、愤怒）" class="sprite-field-label" />
                      <input type="text" v-model="selectedResource.sprites[selectedSpriteId].url" placeholder="图片路径/URL" class="sprite-field-url" />
                    </div>
                  </div>
                  <div class="section-label">🖼️ 头像管理</div>
                  <div class="sprite-gallery">
                    <div v-for="(entry, idx) in avatarList" :key="idx"
                         class="sprite-card" :class="{ 'sprite-card-active': selectedAvatarIdx === idx }"
                         @click="selectedAvatarIdx = idx" :title="entry.url || '无图片'">
                      <div class="sprite-card-img">
                        <img v-if="entry.url" :src="entry.url" @error="e => e.target.style.display='none'" />
                        <div v-else class="sprite-card-noimg">🖼️</div>
                      </div>
                      <div class="sprite-card-label">{{ entry.id || '未命名' }}</div>
                      <button class="sprite-card-del" @click.stop="avatarList.splice(idx, 1); if(selectedAvatarIdx===idx)selectedAvatarIdx=-1">✕</button>
                    </div>
                    <div class="sprite-card sprite-card-add" @click="avatarList.push({ id: 'avatar_' + Date.now().toString(36), url: '' })">
                      <div class="sprite-card-img">➕</div>
                      <div class="sprite-card-label">添加头像</div>
                    </div>
                  </div>
                  <div v-if="selectedAvatarIdx >= 0 && avatarList[selectedAvatarIdx]" class="sprite-detail">
                    <div class="res-preview-dropzone sprite-preview-dropzone"
                         @dragover.prevent @drop.prevent="onResourceDrop($event, avatarList[selectedAvatarIdx])"
                         @click="triggerResourceFile(avatarList[selectedAvatarIdx])"
                         :title="avatarList[selectedAvatarIdx].url || '点击或拖放图片'">
                      <img v-if="avatarList[selectedAvatarIdx].url"
                           :src="avatarList[selectedAvatarIdx].url" class="res-preview-img"
                           @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }" />
                      <div class="res-preview-placeholder" v-if="!avatarList[selectedAvatarIdx].url" style="display:flex">
                        <span>🖼️</span><span>点击或拖放头像图片</span>
                      </div>
                    </div>
                    <div class="sprite-detail-fields">
                      <input type="text" v-model="avatarList[selectedAvatarIdx].id" placeholder="头像 ID" class="sprite-field-id" />
                      <input type="text" v-model="avatarList[selectedAvatarIdx].url" placeholder="图片路径/URL" class="sprite-field-url" />
                    </div>
                  </div>
                </template>

                <!-- ═══ 场景编辑器 ═══ -->
                <template v-if="resourceTab === 'scenes'">
                  <div class="res-preview-dropzone"
                       @dragover.prevent @drop.prevent="onResourceDrop($event, selectedResource)"
                       @click="triggerResourceFile(selectedResource)"
                       :title="selectedResource.url || '点击或拖放图片到此处'">
                    <img v-if="selectedResource.url" :src="selectedResource.url" class="res-preview-img"
                         @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }" />
                    <div class="res-preview-placeholder" v-if="!selectedResource.url || false">
                      <span>🏞️</span><span>点击或拖放背景图片</span>
                    </div>
                    <div class="res-preview-path" v-if="selectedResource.url">{{ selectedResource.url }}</div>
                  </div>
                  <div class="form-row"><label>图片路径/URL</label><input type="text" v-model="selectedResource.url" /></div>
                  <div class="form-row form-row-2col">
                    <div class="form-col">
                      <label>场景 ID</label>
                      <div class="rename-row">
                        <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
                        <button class="tb-btn tb-sm" @click="renameResource('scenes', selectedResourceId)">↻</button>
                      </div>
                    </div>
                    <div class="form-col"><label>标题</label><input type="text" v-model="selectedResource.title" /></div>
                  </div>
                  <div class="form-row"><label>备用背景色</label><input type="text" v-model="selectedResource.bgPlaceholder" placeholder="#111111" /></div>
                </template>

                <!-- ═══ CG 编辑器 ═══ -->
                <template v-if="resourceTab === 'cg'">
                  <div class="res-preview-dropzone"
                       @dragover.prevent @drop.prevent="onResourceDrop($event, selectedResource)"
                       @click="triggerResourceFile(selectedResource)"
                       :title="selectedResource.url || '点击或拖放图片到此处'">
                    <img v-if="selectedResource.url" :src="selectedResource.url" class="res-preview-img"
                         @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }" />
                    <div class="res-preview-placeholder" v-if="!selectedResource.url || false" style="display:flex">
                      <span>🖼️</span><span>点击或拖放 CG 图片</span>
                    </div>
                    <div class="res-preview-path" v-if="selectedResource.url">{{ selectedResource.url }}</div>
                  </div>
                  <div class="form-row"><label>图片路径/URL</label><input type="text" v-model="selectedResource.url" /></div>
                  <div class="form-row form-row-2col">
                    <div class="form-col">
                      <label>CG ID</label>
                      <div class="rename-row">
                        <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
                        <button class="tb-btn tb-sm" @click="renameResource('cg', selectedResourceId)">↻</button>
                      </div>
                    </div>
                    <div class="form-col"><label>标题</label><input type="text" v-model="selectedResource.title" /></div>
                  </div>
                  <div class="form-row"><label>副标题</label><input type="text" v-model="selectedResource.subtitle" /></div>
                </template>

                <!-- ═══ 物品编辑器 ═══ -->
                <template v-if="resourceTab === 'items'">
                  <div class="section-label">🎒 物品属性</div>
                  <div class="form-row">
                    <label>物品 ID</label>
                    <div class="rename-row">
                      <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
                      <button class="tb-btn tb-sm" @click="renameResource('items', selectedResourceId)">↻ 重命名</button>
                    </div>
                  </div>
                  <div class="form-row"><label>名称</label><input type="text" v-model="selectedResource.name" /></div>
                  <div class="form-row">
                    <label>图标</label>
                    <div class="item-icon-row"><input type="text" v-model="selectedResource.icon" placeholder="emoji 图标（如 🎒）" /></div>
                  </div>
                  <div class="form-row">
                    <label>物品图片</label>
                    <div class="res-preview-dropzone item-image-dropzone"
                         @dragover.prevent @drop.prevent="onResourceDrop($event, selectedResource)"
                         @click="triggerResourceFile(selectedResource)"
                         :title="selectedResource.image || '点击或拖放图片'">
                      <img v-if="selectedResource.image" :src="selectedResource.image" class="res-preview-img"
                           @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }" />
                      <div class="res-preview-placeholder" v-if="!selectedResource.image" style="display:flex">
                        <span>🖼️</span><span>点击或拖放物品图片</span>
                      </div>
                    </div>
                    <input type="text" v-model="selectedResource.image" placeholder="图片 URL（可选）" style="margin-top:4px" />
                  </div>
                  <div class="form-row"><label>描述</label><textarea v-model="selectedResource.description" rows="3"></textarea></div>
                </template>

                <!-- ═══ 结局编辑器 ═══ -->
                <template v-if="resourceTab === 'endings'">
                  <div class="section-label">🎬 结局属性</div>
                  <div class="form-row">
                    <label>结局 ID</label>
                    <div class="rename-row">
                      <input type="text" v-model="selectedResource._renameId" :placeholder="selectedResourceId" />
                      <button class="tb-btn tb-sm" @click="renameResource('endings', selectedResourceId)">↻ 重命名</button>
                    </div>
                  </div>
                  <div class="form-row"><label>标题</label><input type="text" v-model="selectedResource.title" /></div>
                  <div class="form-row"><label>描述</label><textarea v-model="selectedResource.description" rows="4"></textarea></div>
                </template>

                <!-- ═══ 角色变更编辑器 ═══ -->
                <resource-char-effect-editor v-if="resourceTab === 'charEffects'"></resource-char-effect-editor>

                <!-- ═══ 特效编辑器 ═══ -->
                <resource-effect-editor v-if="resourceTab === 'effects'"></resource-effect-editor>

                <!-- ═══ 章节编辑器（资源管理器中） ═══ -->
                <resource-chapter-step-editor v-if="resourceTab === 'chapters'"></resource-chapter-step-editor>

              </div>

              <!-- 未选择资源 -->
              <div class="resource-editor resource-editor-empty" v-if="!selectedResource && !((resourceTab === 'effects' || resourceTab === 'charEffects') && selectedResourceId)">
                从左侧列表选择资源以编辑
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    return inject('editor');
  }
});

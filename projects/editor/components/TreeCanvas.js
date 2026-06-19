/**
 * components/TreeCanvas.js
 *
 * The main story-tree canvas:
 *   - SVG connection layer (edges between nodes)
 *   - Node layer (draggable, selectable tree nodes)
 *   - Canvas pan/zoom, box selection
 *   - Context menu, zoom controls, empty state, floating buttons
 */
const { defineComponent, inject } = Vue;

export default defineComponent({
  name: 'TreeCanvas',
  template: `
    <div class="tree-panel"
         @wheel.prevent="handleWheel"
         @mousedown="onCanvasMouseDown"
         @mousemove="onCanvasMouseMove"
         @mouseup="onCanvasMouseUp"
         @contextmenu.prevent="onCanvasContextMenu"
         @click="closeContextMenu"
         ref="treePanel">

      <div class="tree-world" :style="worldStyle">

        <!-- SVG 连线层 -->
        <svg class="tree-svg">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="#4a6a4a" />
            </marker>
            <marker id="arrowHeadActive" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="#8acf8a" />
            </marker>
            <marker id="arrowHeadEnding" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="#c05050" />
            </marker>
          </defs>
          <!-- 分组矩形 -->
          <g v-for="(grp, gid) in editorGroups" :key="'grp_'+gid"
             class="group-rect"
             @click.stop="selectGroup(gid)"
             @contextmenu.stop="onGroupContextMenu($event, gid)">
            <rect :x="grp.x" :y="grp.y" :width="grp.w" :height="grp.h" rx="12"
                  :fill="grp.bgColor || '#2a4a2a'" :opacity="grp.bgOpacity || 0.25"
                  :stroke="selectedGroupId === gid ? '#8acf8a' : (grp.color || '#5a8a5a')"
                  :stroke-width="selectedGroupId === gid ? 3 : 2"
                  :stroke-dasharray="selectedGroupId === gid ? 'none' : '8,4'" />
            <text :x="grp.x + 8" :y="grp.y + 20"
                  fill="#aaa" font-size="12" font-weight="600"
                  class="group-label-text">{{ grp.name || gid }}</text>
          </g>
          <!-- 连线 -->
          <g v-for="edge in treeEdges" :key="edge.key"
             class="edge-group"
             @click.stop="onEdgeClick(edge)"
             @mousedown.stop="onEdgeMouseDown($event, edge)">
            <path :d="edge.path"
                  stroke="transparent" stroke-width="16" fill="none"
                  class="edge-hitarea" />
            <path :d="edge.path"
                  :stroke="selectedEdge?.key === edge.key ? '#ffcc44' : (edge.isEnding ? '#c05050' : (edge.active ? '#8acf8a' : '#4a6a4a'))"
                  :stroke-width="selectedEdge?.key === edge.key ? 4 : (edge.active ? 3 : 2)"
                  fill="none"
                  :marker-end="selectedEdge?.key === edge.key ? 'url(#arrowHeadActive)' : (edge.isEnding ? 'url(#arrowHeadEnding)' : (edge.active ? 'url(#arrowHeadActive)' : 'url(#arrowHead)'))"
                  :style="{ opacity: edge.active || selectedEdge?.key === edge.key ? 1 : 0.75 }"
                  class="edge-visual" />
            <circle v-if="edge.active"
                    :cx="edge.endX" :cy="edge.endY"
                    r="6" fill="#8acf8a" stroke="#2a4a2a" stroke-width="1.5"
                    class="edge-drag-handle"
                    @mousedown.stop="onEdgeHandleMouseDown($event, edge)" />
          </g>
          <!-- 端口拖拽临时曲线 -->
          <path v-if="portDragging.active" :d="portDragCurve"
                stroke="#8acf8a" stroke-width="2" fill="none"
                stroke-dasharray="6,3" opacity="0.8" />
        </svg>

        <!-- 节点层 -->
        <div class="tree-nodes-layer">
          <div v-for="node in treeNodes" :key="node.id"
               class="tree-node"
               :class="{
                   'node-root': node.isRoot,
                   'node-leaf': node.isLeaf,
                   'node-ending': node.isEnding,
                   'node-chapter': node.type === 'chapter',
                   'node-entry': node.entryPoint,
                   'node-selected': (node.type === 'chapter' && selectedChapterId === node.id) || (node.type === 'ending' && selectedEndingId === node.id),
                   'node-box-selected': selectedNodeIds[node.id],
                   'node-hover': hoveredNodeId === node.id
               }"
               :style="{
                   left: node.x + 'px', top: node.y + 'px',
                   width: (node.width || 200) + 'px',
                   height: (node.height || 90) + 'px',
                   background: node.style.bgColor || '',
                   borderColor: node.style.color || '',
               }"
               @mousedown.stop="onNodeMouseDown($event, node)"
               @click.stop="selectNode(node.id)"
               @mouseenter="hoveredNodeId = node.id"
               @mouseleave="hoveredNodeId = null"
               @dblclick.stop="zoomToNode(node)"
               @contextmenu.stop="onNodeContextMenu($event, node)">
            <!-- 顶部入口端口 -->
            <div v-if="node.topPorts && node.topPorts.length > 0" class="node-top-ports">
              <div v-for="(tp, ti) in node.topPorts" :key="'t'+ti"
                   class="node-top-port"
                   :class="{ 'port-ending': tp.isEnding, 'port-multi': tp.multiSource, 'port-unlinked': !tp.fromId }"
                   :style="{ left: (tp.rpX - 7) + 'px', top: (tp.rpY - 7) + 'px' }"
                   :title="!tp.fromId ? '⬇ 无入度，可从此处拖入连线' : (tp.isEnding ? '🎬 ' : '← ') + (tp.multiSource ? (tp.sourceCount + ' 个来源') : tp.fromId)"
                   @click.stop="tp.fromId ? selectNode(tp.fromId) : null"></div>
            </div>
            <!-- 节点内容区 -->
            <div class="node-content">
              <div class="node-header">
                <span class="node-icon">{{ node.style.icon || (node.isEnding ? '🎬' : node.isRoot ? '🏁' : node.isLeaf ? '🏷️' : '📜') }}</span>
                <span class="node-title">{{ node.label }}</span>
                <span v-if="node.entryPoint" class="entry-badge" title="入口节点">🚪</span>
                <span v-if="node.isEnding" class="node-ending-label" title="结局节点">🎬</span>
              </div>
              <div class="node-meta">
                <span class="node-step-count" v-if="!node.isEnding">{{ node.stepCount }} 步</span>
                <span class="node-out-count" v-if="node.outgoing > 0 && !node.isEnding">{{ node.outgoing }} 出口</span>
                <span class="node-in-count" v-if="node.incoming > 0">{{ node.incoming }} 入口</span>
              </div>
              <div class="node-description" v-if="node.description && !node.isEnding" :title="node.description">{{ node.description }}</div>
            </div>
            <!-- 底部出口端口 -->
            <div v-if="node.bottomPorts && node.bottomPorts.length > 0" class="node-bottom-ports">
              <div v-for="(bp, bi) in node.bottomPorts" :key="'b'+bi"
                   class="node-bottom-port"
                   :class="{ 'port-ending': bp.isEnding, 'port-unlinked': !bp.hasTarget }"
                   :style="{ left: (bp.rpX - 7) + 'px', top: (bp.rpY - 7) + 'px' }"
                   :title="bp.tooltipText || ('→ ' + bp.targetId)"
                   @mousedown.stop="startPortDrag($event, node.id, bi, bp)"
                   @click.stop="jumpToPortTarget(bp)"></div>
            </div>
            <!-- 缩放手柄 -->
            <div v-if="hoveredNodeId === node.id || selectedChapterId === node.id"
                 class="node-resize-handle node-resize-se"
                 @mousedown.stop="startNodeResize($event, node, 'se')"></div>
            <div v-if="hoveredNodeId === node.id || selectedChapterId === node.id"
                 class="node-resize-handle node-resize-e"
                 @mousedown.stop="startNodeResize($event, node, 'e')"></div>
          </div>
        </div>

      </div><!-- /tree-world -->

      <!-- 框选矩形 -->
      <div class="tree-selection-box" v-if="selection.active" :style="selectionBoxStyle"></div>

      <!-- 右键菜单 -->
      <div class="tree-context-menu" v-if="contextMenu.show"
           :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px', zIndex: contextMenu.zIndex }"
           @click.stop>
        <div class="context-menu-item" v-if="contextMenu.nodeId" @click="contextZoomToNode">🔍 聚焦此节点</div>
        <div class="context-menu-item" v-if="contextMenu.nodeId" @click="contextCopyId">📋 复制 ID</div>
        <div class="context-menu-item" v-if="contextMenu.nodeId && getNodeType(contextMenu.nodeId) === 'chapter'" @click="contextDuplicateChapter">📄 复制章节</div>
        <div class="context-menu-item" v-if="contextMenu.nodeId && getNodeType(contextMenu.nodeId) === 'chapter'" @click="addStepFromContext">➕ 添加步骤</div>
        <div class="context-menu-item" v-if="contextMenu.nodeId && getNodeType(contextMenu.nodeId) === 'ending'" @click="contextEditEnding">✏️ 编辑结局</div>
        <div class="context-menu-separator" v-if="contextMenu.nodeId"></div>
        <div class="context-menu-item" v-if="contextMenu.nodeId" @click="contextDeleteChapter">🗑️ 删除节点</div>
        <div class="context-menu-item" v-if="!contextMenu.nodeId" @click="addChapterAtPos(contextMenu.worldX, contextMenu.worldY)">➕ 在此新建章节</div>
        <div class="context-menu-item" v-if="!contextMenu.nodeId" @click="addEndingNodeAtPos(contextMenu.worldX, contextMenu.worldY)">🎬 在此新建结局</div>
        <div class="context-menu-item" v-if="contextMenu.nodeId"
             @click="setEntryPoint(contextMenu.nodeId); closeContextMenu()">
          {{ isEntryPoint(contextMenu.nodeId) ? '🚫 取消入口标记' : '🚪 设为入口节点' }}
        </div>
        <div class="context-menu-separator" v-if="contextMenu.nodeId"></div>
        <div class="context-menu-item" v-if="contextMenu.nodeId && Object.keys(selectedNodeIds).length >= 2"
              @click="createGroupFromSelection(); closeContextMenu()">📦 从选中创建分组</div>
        <div v-if="contextMenu.nodeId && Object.keys(editorGroups).length > 0"
             class="context-menu-submenu-wrap">
          <div class="context-menu-item context-submenu-trigger">📂 加入分组 ▶</div>
          <div class="context-submenu">
            <div v-for="(grp, gid) in editorGroups" :key="gid"
                 class="context-menu-item"
                 @click="addNodeToGroup(gid, contextMenu.nodeId); closeContextMenu()">{{ grp.name || gid }}</div>
          </div>
        </div>
        <div v-if="contextMenu.nodeId && getNodeGroups(contextMenu.nodeId).length > 0"
             class="context-menu-submenu-wrap">
          <div class="context-menu-item context-submenu-trigger">🚫 从分组移除 ▶</div>
          <div class="context-submenu">
            <div v-for="ng in getNodeGroups(contextMenu.nodeId)" :key="ng.id"
                 class="context-menu-item"
                 @click="removeNodeFromGroup(ng.id, contextMenu.nodeId); closeContextMenu()">{{ ng.name || ng.id }}</div>
          </div>
        </div>
        <div class="context-menu-separator" v-if="contextMenu.nodeId && Object.keys(editorGroups).length > 0"></div>
        <div class="context-menu-item" v-if="contextMenu.groupId" @click="selectGroup(contextMenu.groupId); closeContextMenu()">🔍 选中此分组</div>
        <div class="context-menu-item" v-if="contextMenu.groupId" @click="renameGroup(contextMenu.groupId); closeContextMenu()">✏️ 重命名分组</div>
        <div class="context-menu-item" v-if="contextMenu.groupId" @click="deleteGroup(contextMenu.groupId); closeContextMenu()">🗑️ 删除分组</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" @click="resetView">🏠 重置视图</div>
        <div class="context-menu-item" @click="autoLayout">🔄 自动布局</div>
        <div class="context-menu-item" @click="closeContextMenu">❌ 关闭菜单</div>
      </div>

      <!-- 空状态 -->
      <div class="tree-empty" v-if="treeNodes.length === 0">
        <div class="empty-icon">📂</div>
        <div>当前资源包中无任何剧情章节</div>
        <div class="empty-hint">在画布上单击右键，选择「创建章节」开始编辑</div>
        <button class="tb-btn" @click="addChapter">创建第一个章节</button>
      </div>

      <!-- 缩放控件 -->
      <div class="zoom-controls">
        <button class="zoom-btn" @click="zoomOut" title="缩小 (-)">−</button>
        <span class="zoom-value" @click.stop="showZoomInput = !showZoomInput" title="点击设置缩放比例">
          <span v-if="!showZoomInput">{{ Math.round(viewScale * 100) }}%</span>
          <input v-else type="number" v-model.number="zoomPercent"
                 @blur="applyZoomPercent" @keyup.enter="applyZoomPercent"
                 @click.stop min="10" max="300" class="zoom-percent-input" />
        </span>
        <button class="zoom-btn" @click="zoomIn" title="放大 (+)">+</button>
        <button class="zoom-btn zoom-btn-reset" @click="resetView" title="重置视图 (Ctrl+0)">⊡</button>
      </div>

      <!-- 浮动按钮 -->
      <div class="floating-bottom-left">
        <button class="floating-btn" @click="autoLayout" title="自动布局">🔄</button>
        <button class="floating-add-btn" @click="addChapter" title="新建章节 (Ctrl+N)">＋</button>
      </div>

    </div>
  `,
  setup() {
    return inject('editor');
  }
});

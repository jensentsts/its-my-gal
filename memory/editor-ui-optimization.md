---
name: editor-ui-optimization
description: 编辑器 UI 优化：入口单选、角色变更行紧凑布局、ID字段搜索式输入补全
metadata:
  type: reference
---

# 编辑器 UI 优化

## 变更内容

### 1. 入口节点 → 单选（Radio）
- `toggleEntryPoint` → `setEntryPoint`：点击新入口自动清除旧选择
- 至少保留一个入口，不允许全部取消
- UI 指示器从 `🚪` 改为 `🔘 ○`（单选样式）

### 2. 角色变更行 → 紧凑双行布局
每行改为至多两行：
- **首行 (`.cc-main-row`)**: [动作▼] [角色ID搜索框] [核心参数] [✕]
- **子行 (`.cc-sub-row`)**: 按 action 类型显示专属参数（滤镜滑块/动作选择/位置等）
- 所有 hint 文本和"例:"提示全部移除

### 3. ID 字段 → 可输入搜索式下拉
用 `<input list="dl-xxx">` + `<datalist>` 替代所有纯 `<select>`：
- `dl-char-ids` — 角色选择/说话人/角色变更ID
- `dl-scene-ids` — 场景选择
- `dl-cg-ids` — CG 选择
- `dl-item-ids` — 物品选择
- `dl-anims` — 动画名（包含所有入场/退场/特效/动作）
- `dl-positions` — 7个预设位置

用户可以直接输入文字搜索（按名称/ID匹配），也可以从下拉列表点选。

### 4. CSS 优化
- 新增紧凑输入框尺寸：`.cc-xs` (52px), `.cc-sm` (80px), `.cc-search-input` (flex 1 1 100px)
- 滤镜滑块紧凑排：`.cc-filters-inline`
- 删除旧版 flex 与新版冲突的规则
- 窄屏自动换行

## 修改的文件
- `editor/editor.html` — datalist 定义 + 替换所有 ID 选择器 + 角色变更行重写
- `editor/editor-app.js` — `setEntryPoint`（单选逻辑）
- `editor/editor-styles.css` — 新布局样式 + 冲突清理
- `editor/editor-actions.js` — `setEntryPoint`（备用入口，未实际加载）

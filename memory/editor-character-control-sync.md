---
name: editor-character-control-sync
description: 编辑器角色变更编辑面板全面升级——从3种action扩展到17种，与引擎DSL完全对齐
metadata:
  type: reference
---

# 编辑器角色变更面板同步

## 概述
将引擎新增的 17 种角色变更 action 全部同步到编辑器的步骤编辑界面，使编剧在编辑器中可以直接使用所有新功能。

## 修改的文件

### [editor/editor.html](../../editor/editor.html)
两处角色变更编辑器（主步骤面板 + 资源管理器步骤面板）同时升级，每行根据 action 类型动态显示不同字段：

- **动作选择器**: enter / update / leave / move / speak / silence / speakAll / silenceAll / action / effect / filter / resetFilter / scale / opacity / swap / gather / scatter / order / clearAll
- **条件字段渲染**:
  - 单角色: id 下拉框（enter/update/leave/move/speak/silence/action/effect/filter/resetFilter/scale/opacity）
  - 双角色: id1 ↔ id2 对（swap）
  - 多角色: ids 逗号分隔输入（speakAll/gather/scatter/order）
  - 立绘选择: spriteId（enter/update/gather）
  - 位置选择: 7档预设 + X/Y偏移（enter/move/gather）
  - 动画名: 带提示文本（enter/update/leave/move/speak/action/effect/gather/scatter/clearAll）
  - 持续时间: 秒数输入（leave/action/effect/clearAll）
  - 动作类型: wave/bow/nod/jump 等（action）
  - 特效类型: shake/glow/float/pulse 等（effect）
  - 滤镜: 亮度/饱和度/对比度滑块（filter）
  - 说话权重: 滑块（speak）
  - 缩放/透明度: 滑块（scale/opacity）
  - enter附加: 入场即说话勾选 + 分组ID

### [editor/editor-actions.js](../../editor/editor-actions.js)
- `syncCharChangesToStep()`: 完整字段白名单映射 + ids/weights 字符串→数组转换
- `onCharChangeField()`: action 切换时自动初始化 filters/spread/weight 默认值

### [editor/editor-app.js](../../editor/editor-app.js)
- `syncCharChangesToStep()` + `resEditSyncCharChanges()`: 同上完整字段映射
- `onCharChangeField()` + `resEditOnCharChangeField()`: 默认值初始化
- `initCharChanges()`: 加载时数组→字符串反向转换（ids 数组→逗号分隔文本）
- 新增 `CHAR_CHANGE_FIELDS` 白名单常量

### [editor/utils.js](../../editor/utils.js)
- `initCharChanges()`: 数组→字符串转换（兼容编辑器原有步骤切换逻辑）

### [editor/editor-styles.css](../../editor/editor-styles.css)
- 新增 `.cc-line` / `.cc-action-sel` / `.cc-hint` / `.cc-num` 等 20+ 样式类
- 每个 action 类型不同色的左边框（enter=绿, leave=红, effect=紫 等）
- 范围滑块、复选框、滤镜行的紧凑布局

## 同步点
- 主步骤面板 + 资源管理器面板两套编辑界面完全同步
- 字段白名单 `CHAR_CHANGE_FIELDS` 在所有三个 sync 函数间保持一致
- `_charChanges` ↔ `characterChanges` 双向转换：数组↔逗号分隔字符串
- 新增字段出现在 `_charChanges` 中不会被过滤，自动传递到最终 `characterChanges`

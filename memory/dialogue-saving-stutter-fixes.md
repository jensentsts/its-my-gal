---
name: dialogue-saving-stutter-fixes
description: 推进剧情时对话卡顿和存档不存的修复记录
metadata:
  type: feedback
---

# 对话卡顿与存档故障修复

修复了用户报告的两个问题。

## 问题1：推进剧情时对话卡顿

**根因**：
- 打字机使用 `setInterval(speed)`，`speed` 默认 25ms（40fps），与浏览器渲染帧不同步，每个 tick 触发 Vue 响应式更新造成帧抖动
- `syncState()` 被调用两次（`step:enter` 事件 + `advanceStory()` 显式调用），每次做 10+ 个大型对象的响应式赋值
- `historyLogs` 无限增长，每次 `syncState()` spread 全量数组

**修复**：
- 打字机改用 `requestAnimationFrame` + 时间增量控制，确保与浏览器帧对齐，最低 16ms（~60fps） — `engine/core/engine.js:_startTypewriter`
- `_clearTypingTimer` 同时支持 `cancelAnimationFrame` 和 `clearInterval` 兼容
- `syncState()` 添加 `_syncGuard` 去重守卫，同一微任务内的重复调用直接被丢弃 — `app/composables/use-engine.js:syncState`
- `historyLogs` 内存优化：仅保留最近 30 条日志的完整 `snap`（用于回滚），更旧的日志释放 `snap` 字段 — `engine/core/engine.js:_executeStep`

## 问题2：存档存不上

**根因**：
- 每个 `historyLog` 的 `snap` 字段用 `JSON.parse(JSON.stringify(this._state))` 深克隆——这是**递归结构**：第 N 条日志的 `snap` 包含了前 N-1 条日志的全部 snap
- `save()` 时 `snapshot()` 深克隆出这个膨胀数据，`JSON.stringify` 后超出 localStorage 配额（5MB）
- `SaveManager._writeSlots` 静默吃掉异常，无用户反馈

**修复**：
- `engine.save()` 存档时剥离 `historyLogs[].snap`，打断递归链条 — `engine/core/engine.js:save`
- 存档时 `historyLogs` 截断到最近 50 条 — `engine/core/engine.js:save`
- `SaveManager._writeSlots` 添加 `QuotaExceededError` 处理：自动压缩到最近 5 个槽位 — `engine/storage/save-manager.js:_writeSlots`
- `engine.save()` 添加 try-catch，失败时向上传递错误

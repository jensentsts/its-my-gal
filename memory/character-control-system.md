---
name: character-control-system
description: 增强型角色控制系统——引擎核心+UI渲染层重构，支持多角色、定位、说话指示器、动作动画、滤镜、特效等
metadata:
  type: reference
---

# 增强型角色控制系统

## 概述
对 GalEngine 的角色控制系统进行了全面升级，从"单角色简单显示"进化到"支持多角色、多状态、多互动的专业视觉小说角色舞台"。

## 修改的文件

### [engine/core/state.js](../../engine/core/state.js)
- 新增 `patchStageCharacter(charId, patch)` — 合并式更新角色字段
- 新增 `clearStageCharacters()` — 清空舞台
- 新增 `swapStageCharacters(id1, id2)` — 交换两个角色的位置
- 新增 `setSpeaking(charId, isSpeaking, weight)` — 设置说话状态
- 新增 `silenceAll()` — 全员沉默
- 增强 `_sanitizeStageCharacters()` — 序列化时安全处理所有新字段
- 增强 `_truncateLongFields()` — 校验所有增强字段的合法性
- 所有字段: `position`, `order`, `isSpeaking`, `speechWeight`, `scale`, `opacity`, `visible`, `animation`, `groupId`, `offsetX`, `offsetY`, `filters`, `_leaving`

### [engine/core/engine.js](../../engine/core/engine.js)
- 新增 `_normalizeAnimation(anim)` — 动画名称标准化（兼容旧格式 `fadeIn` → `fade-in`）
- 重写 `_processCharacterChanges(changes)` → `_applyCharacterChange(ch)` — 完整的 DSL 处理引擎
- 支持的所有 action 类型:
  - **enter** — 入场（支持 position, animation, scale, filters 等全部参数）
  - **leave** — 退场（动画播放后自动删除）
  - **update** — 更新精灵/表情
  - **move** — 位置移动（自动推导动画方向）
  - **speak / silence / silenceAll / speakAll** — 说话状态控制
  - **action** — 角色动作（wave, bow, nod, jump 等）
  - **effect** — 视觉特效（shake, glow, flash, float, pulse 等）
  - **filter / resetFilter** — 颜色滤镜（brightness, saturation, contrast）
  - **scale** — 缩放
  - **opacity** — 透明度
  - **swap** — 位置交换
  - **gather** — 聚集到同一位置（带 spread 微调偏移）
  - **scatter** — 散开到预设位置
  - **order** — Z 轴顺序
  - **clearAll** — 全员退场
  - **batch** — 批量执行多条子变更

### [app/styles/game.css](../../app/styles/game.css)
- 完全重写角色舞台样式，新增:
  - **说话指示器** — 三线波浪动画
  - **角色名称标签** — 多角色时浮动显示
  - **12种入场动画** — fade, slide-in-left/right/up/down, bounce, zoom, flip, drop, float, stumble, swing
  - **10种退场动画** — fade-out, slide-out-left/right/up/down, zoom-out, bounce-out, flip-out, shrink-out, vanish
  - **10种动作动画** — wave, bow, point, nod, shake-head, sit, stand, jump, fall, turn
  - **10种特效动画** — shake, flash, glow, float, pulse, tremble, blur, highlight, shine, dizzy
  - **位置交换动画** — swap (3D 旋转交换)
  - **说话角色高亮** — character-speaking 提升亮度和 z-index

### [index.html](../../index.html)
- 重写角色渲染模板:
  - 使用 `sortedStageCharacters` 按 z-order 排序
  - 说话指示器渲染
  - 角色名称标签
  - 通过 `getCharacterClasses()` 动态生成 CSS 类
  - 通过 `getCharacterStyle()` 动态计算位置/变换/滤镜样式

### [app/app.js](../../app/app.js)
- 新增 `sortedStageCharacters` computed — 按 order 排序的角色列表
- 新增 `getCharacterClasses(state)` — 根据角色状态生成 CSS 类
- 新增 `getCharacterStyle(state)` — 根据角色状态计算内联样式
- 新增 `POSITION_MAP` — 7个预设位置的 left/transform 映射

### [resource-packs/default/chapters/character_demo.js](../../resource-packs/default/chapters/character_demo.js)
- 新建全方位展示章节，演示所有 DSL 功能

## 位置系统
```
left-far (2%) | left (12%) | center-left (28%) | center (50%) | center-right (72%) | right (88%) | right-far (98%)
```
所有位置通过 CSS `left` + `transform: translateX()` 精确定位，支持 `offsetX`/`offsetY` 微调。

## 优化点

### 1. 角色已存在时不重复播放入场动画
- `enter` action 检测角色是否已在舞台 (`existing && existing.visible !== false`)
- 存在时仅静默更新属性（sprite/position等），跳过 `fade-in` 等入场动画
- 位置变化时自动切换为 `move` 动画而非入场动画
- 彻底消除章节切换时角色"闪入"的视觉问题

### 2. 章节切换自动清台
- 新增 `_clearStageForChapterChange()` — 章节跳转前清空舞台
- 清理所有残留的 `_leaving` 定时器，防止过期回调污染新章节
- 新章节通过自己的 `characterChanges` 重新建场，保证入场动画正确播放
- 覆盖 `advance()` / `selectChoice()` / `_executeStep()` 所有跳转路径
- `load()` / `rollbackToLog()` 在 `restore` 前也清理定时器

### 3. 说话角色自动提升 z-order
- 新增 `_getNextOrder()` — 获取当前最高 order + 1
- 新增 `_resolveSpeakingOrder(charId, isSpeaking)` — 说话时提升 order，记录原始值
- `speak` / `speakAll` action 自动调用 `_resolveSpeakingOrder`
- `silence` / `silenceAll` action 自动恢复原始 order
- CSS 中 `.character-speaking` 额外使用 `z-index: 25 !important` 保证顶层显示

### 4. 退场定时器安全追踪
- `leave` 和 `clearAll` 的 `setTimeout` 引用保存到 `_stageLeaveTimers[]`
- 章节切换/读档/回溯时先清理所有滞留定时器
- 防止过期回调在角色已被移除后再次写入脏数据

## 定位修复：两层 DOM 架构

### 问题根因
CSS 动画 keyframes 设置 `transform` 属性会**覆盖**内联 `transform` 定位。旧版将所有定位 + 动画放在同一个 `.stage-character` 元素上，导致：
- `fade-in` 动画的 `transform: translateY(0)` 覆盖了定位的 `translateX(-50%)`
- 所有入场/退场/特效动画都导致角色位置偏移
- 角色在动画播放期间"跳"到错误位置

### 修复方案：定位层 + 动画层分离

```
.stage-character (外层)         ← 仅定位：left + translateX(-50%)
  └─ .character-anim-layer (内层) ← 动画/滤镜/状态类
       ├─ .speech-indicator
       ├─ <img> 角色立绘
       └─ .char-name-tag
```

- 外层 `getCharacterPositionStyle()` → `left`, `transform: translateX(-50%)`, `zIndex`
- 内层 `getCharacterAnimationClasses()` → `fade-in`, `shake`, `character-speaking` 等
- 内层 `getCharacterAnimStyle()` → `filter`, `opacity`, `scale`

### 位置映射优化
- 全部使用 `translateX(-50%)` 统一居中锚定（之前 hybrid 左/右锚定不一致）
- 均匀分布 7 个预设位置：12%, 24%, 37%, 50%, 63%, 76%, 88%
- 外层角色不溢出屏幕边界

## 修复：CSS forwards 导致的角色消失 + 动画后偏移

### 问题根因
1. CSS `animation-fill-mode: forwards` 让动画的最终 keyframe（含 `transform`）持续锁定元素，导致 `forwards` 的 transform 永久覆盖内联样式
2. 动画 class 从不被清除 → `transform: translateX(0) rotate(0)` 锁定内层 → 后续 `scale(1.2)` / `filter` 等内联样式永久失效
3. 单个角色在不同步骤中叠加多个动画时，`forwards` 的残留 transform 会累积冲突

### 修复方案

**两层 DOM + animationend 自动清理 + 无 forwards 动画**

1. **animationend 监听**：在 `.character-anim-layer` 上监听 `@animationend`，匹配 `TRANSIENT_KEYFRAMES` 集合中的瞬时动画名后，自动清除 `state.animation = ''`
2. **移除所有 forwards**：入场/退场/移动/动作/单次特效的 CSS 全部去掉 `forwards`，让动画结束后自然回归内联样式
3. **循环动画不受影响**：`glow`/`float`/`pulse`/`dizzy` 等 `infinite` 动画从不触发 `animationend`，无需清理

### 涉及的 keyframe 名称
所有 `char*` 前缀的瞬时动画 keyframe 全部纳入清理：
`charFadeIn`, `charFadeOut`, `charSlideInLeft/Right/Up/Down`, `charSlideOutLeft/Right/Up/Down`, `charBounceIn/Out`, `charZoomIn/Out`, `charFlipIn/Out`, `charDropIn`, `charFloatIn`, `charStumbleIn`, `charSwingIn`, `charShrinkOut`, `charVanish`, `charSwap`, `charSlideLeft/Right`, `charFlipMove`

## 关键设计决策
1. **向后兼容**: 通过 `_normalizeAnimation()` 映射旧版动画名称
2. **非破坏性**: 旧版 DSL `{ action: 'enter', id: 'elysia', spriteId: 'idle' }` 自动获得默认值
3. **可扩展**: 所有角色字段通过合并方式更新（patch），新增字段不破坏现有数据
4. **序列化安全**: `_sanitizeStageCharacters()` 确保存档/读档时只保留安全字段

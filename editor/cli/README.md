# CLI 模块

此目录预留用于未来 CLI 命令模块拆分（当 cli.js 增长过大时）。

目前的 CLI 是单文件结构：`editor/cli.js`

按功能拆分的候选方案：
- `cli/validate.js` — 数据验证
- `cli/list.js` — 资源列举
- `cli/export.js` — 数据导出
- `cli/analyze.js` — 剧情分析

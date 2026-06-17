# 剧情树节点编辑器 CLI

## 快速开始

```bash
# 信息概览
node editor/cli.js info

# 数据验证
node editor/cli.js validate

# 列出章节
node editor/cli.js list chapters

# 导出 JSON
node editor/cli.js export json --pretty --output data.json

# 剧情统计
node editor/cli.js analyze stats

# 交叉引用分析
node editor/cli.js analyze crossref

# 分支分析（含零出度/孤立章节检测）
node editor/cli.js analyze branches

# 详细帮助
node editor/cli.js help
```

## npm scripts

```bash
npm run cli        # node editor/cli.js
npm run validate   # node editor/cli.js validate
npm run list       # node editor/cli.js list
npm run export     # node editor/cli.js export
```

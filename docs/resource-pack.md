# 资源包系统

## 概述

资源包（Resource Pack）系统将游戏数据打包为标准化格式，支持运行时加载、切换和分发。引擎可以从目录或 ZIP 文件中加载资源包。

## 资源包目录结构

```
{packName}/
├── pack.json                     # 资源包清单（必需）
├── config/                       # 配置文件目录
│   ├── game.json                 # 游戏全局配置
│   ├── home.json                 # 首页配置
│   ├── characters.json           # 角色库
│   ├── scenes.json               # 场景库
│   ├── cg-library.json           # CG 图鉴库
│   ├── items.json                # 物品库
│   ├── endings.json              # 结局定义
│   └── item-animation-presets.json # 物品动画预设（可选）
├── chapters/                     # 章节数据
│   ├── main.json
│   ├── meet_elysia.json
│   └── ...                       # 与 game/chapters/ 一一对应
└── assets/                       # 静态资源
    ├── scenes/
    ├── characters/
    └── cg/
```

## pack.json 清单格式

```json
{
    "name": "default",
    "title": "幻象物语：阿瓦隆之觉醒",
    "version": "1.0.0",
    "author": "",
    "description": "",
    "format": "1.0.0",
    "configs": {
        "game": "config/game.json",
        "home": "config/home.json",
        "characters": "config/characters.json",
        "scenes": "config/scenes.json",
        "cgLibrary": "config/cg-library.json",
        "items": "config/items.json",
        "endings": "config/endings.json"
    },
    "chapters": {
        "main": "chapters/main.json",
        "meet_elysia": "chapters/meet_elysia.json",
        ...
    }
}
```

## 打包工具 (`scripts/pack.py`)

Python 脚本，将 `game/` 目录的 JS 模块自动转换为标准资源包格式。

### 使用方式

```bash
# 构建到默认目录 (resource-packs/default/)
python scripts/pack.py

# 指定输出目录
python scripts/pack.py --output ./my-pack

# 同时生成 ZIP 压缩包
python scripts/pack.py --zip

# 自定义包名
python scripts/pack.py --name my-story

# 仅检查，不写入
python scripts/pack.py --dry-run

# 不复制资源文件
python scripts/pack.py --no-assets
```

### 打包过程

1. **提取配置** — 解析 `game/config/` 下各 JS 文件的 `export const` 到 JSON
2. **提取物品** — 特殊处理 `items.js`（含函数）
3. **提取章节** — 扫描 `game/chapters/` 下所有 JS 文件
4. **生成清单** — 构建 `pack.json`
5. **写入文件** — 输出到目标目录
6. **复制资产** — 将 `assets/` 复制到资源包
7. **创建 ZIP**（可选）— 打包为 ZIP 压缩包

### JS → JSON 解析器

`pack.py` 内嵌了一个自定义 JS 解析器（`extract_js_export`），支持：
- 对象字面量 `{...}`
- 数组字面量 `[...]`
- 模板字符串 `` `...` ``
- 嵌套结构
- 尾随逗号
- 单行/多行注释
- 跳无法解析的值（函数、标识符等）

## 运行时加载

引擎通过 `ResourceManager` (`engine/resource/resource-manager.js`) 加载资源包。

### 加载方式

```js
// 从目录路径加载（通过 HTTP fetch）
const data = await resourceManager.loadPack('resource-packs/default');

// 从 ZIP 文件导入
const data = await resourceManager.importPack(zipFile);
```

### 加载流程

```
loadPack(path)
  → 读取 pack.json 清单
  → 校验包结构 (validatePackStructure)
  → 加载所有 config JSON 文件
  → 加载所有 chapter JSON 文件
  → 格式化为引擎兼容数据结构 (getData)
  → 返回 { STORY_CHAPTERS, CHARACTERS, SCENES, ITEMS, ... }
```

### 验证器 (`engine/resource/pack-validator.js`)

提供两个验证函数：
- `validatePackStructure(manifest)` — 验证清单结构的必填字段、版本格式、configs/chapters 完整性
- `validatePackData(data)` — 验证数据内容的完整性（检查角色、场景引用、步骤数据等）

## 文件引用

- **引擎加载端**：[engine/resource/resource-manager.js](../engine/resource/resource-manager.js)
- **验证器**：[engine/resource/pack-validator.js](../engine/resource/pack-validator.js)
- **打包脚本**：[scripts/pack.py](../scripts/pack.py)
- **物品辅助函数**：[engine/resource/item-helpers.js](../engine/resource/item-helpers.js)

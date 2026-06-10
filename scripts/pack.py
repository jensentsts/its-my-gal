#!/usr/bin/env python3
"""
pack.py - Galgame Resource Pack Builder

Converts the game/ JS module data into standard resource pack format.

Usage:
    python scripts/pack.py                          # Build to resource-packs/default/
    python scripts/pack.py --output ./my-pack       # Custom output directory
    python scripts/pack.py --zip                    # Also generate ZIP archive
    python scripts/pack.py --name my-story          # Custom pack name

Resource pack directory structure:
    {packName}/
    ├── pack.json              # Pack manifest
    ├── config/
    │   ├── game.json          # Game global config
    │   ├── home.json          # Home screen config
    │   ├── characters.json    # Character library
    │   ├── scenes.json        # Scene library
    │   ├── cg-library.json    # CG gallery library
    │   ├── items.json         # Item library
    │   └── endings.json       # Ending definitions
    ├── chapters/
    │   ├── main.json
    │   └── ...                # Other chapters
    └── assets/                # Static image assets
        ├── scenes/
        ├── characters/
        └── cg/
"""

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# ──────────────────────────────────────────────────────────────────────
#  配置
# ──────────────────────────────────────────────────────────────────────

# 项目根目录（脚本所在目录的上一级）
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# game/ 目录
GAME_DIR = PROJECT_ROOT / 'game'

# 配置文件映射: { 输出JSON文件名: (源JS文件路径, 导出变量名) }
CONFIG_MAP = {
    'game.json':        ('config/game-config.js',  'GAME_CONFIG'),
    'home.json':        ('config/game-config.js',  'HOME_CONFIG'),
    'characters.json':  ('config/characters.js',   'CHARACTERS'),
    'scenes.json':      ('config/scenes.js',       'SCENES'),
    'cg-library.json':  ('config/cg-library.js',   'CG_LIBRARY'),
    'endings.json':     ('config/endings.js',       'ENDINGS'),
}

# items.js 需要特殊处理（包含函数）
ITEMS_SOURCE = 'config/items.js'

# 章节文件（自动扫描）
CHAPTERS_DIR = GAME_DIR / 'chapters'

# 资源目录
ASSETS_DIR = PROJECT_ROOT / 'assets'

# 默认输出目录
DEFAULT_OUTPUT = PROJECT_ROOT / 'resource-packs' / 'default'

# 资源包格式版本
FORMAT_VERSION = '1.0.0'


# ──────────────────────────────────────────────────────────────────────
#  JS → JSON 解析器
# ──────────────────────────────────────────────────────────────────────

def extract_js_export(filepath: Path, var_name: str) -> object:
    """
    从 JS 文件中提取 export const VAR_NAME = ...; 的值并返回 Python 对象。

    支持:
      - 对象字面量 { ... }
      - 数组字面量 [ ... ]
      - 模板字符串 `...`
      - 嵌套结构
      - 尾随逗号
      - 单行 // 注释和多行 /* */ 注释
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()

    # 移除多行注释
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.DOTALL)
    # 移除单行注释（保留字符串内和 URL 中的 //）
    source = re.sub(r'(?<!["\'\`:/])//[^\n]*', '', source)

    # 匹配 export const VAR_NAME = ...;
    # 使用非贪婪匹配找到变量后的值
    pattern = rf'export\s+const\s+{var_name}\s*=\s*'
    match = re.search(pattern, source)
    if not match:
        raise ValueError(f'在 {filepath} 中未找到 export const {var_name}')

    start_pos = match.end()
    return _parse_js_value(source, start_pos)


def extract_all_exports(filepath: Path) -> dict:
    """提取 JS 文件中所有 export const 声明，返回 {变量名: 值}"""
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()

    # 移除注释（保留字符串内和 URL 中的 //）
    cleaned = re.sub(r'/\*.*?\*/', '', source, flags=re.DOTALL)
    cleaned = re.sub(r'(?<!["\'\`:/])//[^\n]*', '', cleaned)

    results = {}
    # 匹配所有 export const NAME = ...
    pattern = r'export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*'
    for m in re.finditer(pattern, cleaned):
        var_name = m.group(1)
        start_pos = m.end()
        try:
            value = _parse_js_value(cleaned, start_pos)
            results[var_name] = value
        except ValueError:
            continue

    return results


def _parse_js_value(source: str, start: int) -> object:
    """从 source[start:] 解析一个 JS 值"""
    i = start
    # 跳过空白
    while i < len(source) and source[i] in ' \t\n\r':
        i += 1

    if i >= len(source):
        raise ValueError('意外的文件结尾')

    ch = source[i]

    if ch == '{':
        return _parse_js_object(source, i)
    elif ch == '[':
        return _parse_js_array(source, i)
    elif ch in ('"', "'", '`'):
        return _parse_js_string(source, i)
    elif ch == '-' or ch.isdigit():
        return _parse_js_number(source, i)
    elif source[i:i+4] == 'true':
        return True
    elif source[i:i+5] == 'false':
        return False
    elif source[i:i+4] == 'null':
        return None
    else:
        # 可能是标识符引用，我们返回字符串标记
        # 对于这个项目，主要关注字面量
        raise ValueError(f'无法解析的 JS 值，位置 {i}: {source[i:i+30]}...')


def _parse_js_object(source: str, start: int) -> dict:
    """解析 JS 对象字面量 { ... }"""
    result = {}
    i = start + 1  # 跳过 {

    while i < len(source):
        # 跳过空白和换行
        while i < len(source) and source[i] in ' \t\n\r,':  # 跳过逗号（尾随逗号）
            # 逗号后的空白
            i += 1

        if i >= len(source):
            break

        if source[i] == '}':
            return result

        # 解析 key
        if source[i] in ('"', "'"):
            key = _parse_js_string(source, i)
            # 找到字符串结束位置
            i = _find_string_end(source, i) + 1
        elif source[i] == '`':
            key = _parse_js_string(source, i)
            i = _find_template_end(source, i) + 1
        else:
            # 无引号 key
            j = i
            while j < len(source) and (source[j].isalnum() or source[j] in '_$'):
                j += 1
            key = source[i:j]
            i = j

        # 跳过空白
        while i < len(source) and source[i] in ' \t\n\r':
            i += 1

        if i >= len(source):
            break

        # 跳过 :
        if source[i] == ':':
            i += 1
        else:
            # 可能是简写属性或语法错误，跳过
            continue

        # 跳过空白
        while i < len(source) and source[i] in ' \t\n\r':
            i += 1

        # 解析 value
        if i >= len(source):
            break

        ch = source[i]
        if ch == '{':
            value = _parse_js_object(source, i)
            result[key] = value
            i = _find_brace_end(source, i) + 1
        elif ch == '[':
            value = _parse_js_array(source, i)
            result[key] = value
            i = _find_bracket_end(source, i) + 1
        elif ch in ('"', "'"):
            value = _parse_js_string(source, i)
            result[key] = value
            i = _find_string_end(source, i) + 1
        elif ch == '`':
            value = _parse_js_string(source, i)
            result[key] = value
            i = _find_template_end(source, i) + 1
        elif ch == '-' or ch.isdigit():
            value = _parse_js_number(source, i)
            result[key] = value
            # 数字后移动到 , } 或空白
            while i < len(source) and source[i] not in ',}\n\r':
                i += 1
        elif source[i:i+4] == 'true':
            result[key] = True
            i += 4
        elif source[i:i+5] == 'false':
            result[key] = False
            i += 5
        elif source[i:i+4] == 'null':
            result[key] = None
            i += 4
        else:
            # 可能是函数、标识符等，跳过这个值
            # 向前找到 , 或 } (考虑嵌套)
            depth = 0
            while i < len(source):
                if source[i] in '{[':
                    depth += 1
                elif source[i] in '}]':
                    if depth == 0:
                        break
                    depth -= 1
                elif source[i] == ',' and depth == 0:
                    break
                i += 1

    return result


def _parse_js_array(source: str, start: int) -> list:
    """解析 JS 数组字面量 [ ... ]"""
    result = []
    i = start + 1  # 跳过 [

    while i < len(source):
        # 跳过空白和换行
        while i < len(source) and source[i] in ' \t\n\r,':
            i += 1

        if i >= len(source):
            break

        if source[i] == ']':
            return result

        ch = source[i]
        if ch == '{':
            value = _parse_js_object(source, i)
            result.append(value)
            i = _find_brace_end(source, i) + 1
        elif ch == '[':
            value = _parse_js_array(source, i)
            result.append(value)
            i = _find_bracket_end(source, i) + 1
        elif ch in ('"', "'"):
            value = _parse_js_string(source, i)
            result.append(value)
            i = _find_string_end(source, i) + 1
        elif ch == '`':
            value = _parse_js_string(source, i)
            result.append(value)
            i = _find_template_end(source, i) + 1
        elif ch == '-' or ch.isdigit():
            value = _parse_js_number(source, i)
            result.append(value)
            while i < len(source) and source[i] not in ',]\n\r':
                i += 1
        elif source[i:i+4] == 'true':
            result.append(True)
            i += 4
        elif source[i:i+5] == 'false':
            result.append(False)
            i += 5
        elif source[i:i+4] == 'null':
            result.append(None)
            i += 4
        else:
            # 跳过无法识别的值
            i += 1

    return result


def _parse_js_string(source: str, start: int) -> str:
    """解析 JS 字符串 (单引号、双引号或模板字符串)"""
    if start >= len(source):
        return ''

    quote = source[start]
    if quote in ('"', "'"):
        i = start + 1
        result = []
        while i < len(source):
            if source[i] == '\\':
                i += 1
                if i < len(source):
                    escape_char = source[i]
                    if escape_char == 'n':
                        result.append('\n')
                    elif escape_char == 't':
                        result.append('\t')
                    elif escape_char == 'r':
                        result.append('\r')
                    elif escape_char == '\\':
                        result.append('\\')
                    elif escape_char == quote:
                        result.append(quote)
                    elif escape_char == 'u':
                        # Unicode escape \uXXXX
                        hex_str = source[i+1:i+5]
                        result.append(chr(int(hex_str, 16)))
                        i += 4
                    else:
                        result.append(escape_char)
                i += 1
            elif source[i] == quote:
                return ''.join(result)
            else:
                result.append(source[i])
                i += 1
        return ''.join(result)
    elif quote == '`':
        # 模板字符串 — 简单处理（暂不处理 ${} 插值）
        i = start + 1
        result = []
        while i < len(source):
            if source[i] == '\\':
                i += 1
                if i < len(source):
                    result.append(source[i])
                i += 1
            elif source[i] == '`':
                return ''.join(result)
            elif source[i] == '$' and i + 1 < len(source) and source[i+1] == '{':
                # 模板插值 — 跳过
                depth = 1
                i += 2
                while i < len(source) and depth > 0:
                    if source[i] == '{':
                        depth += 1
                    elif source[i] == '}':
                        depth -= 1
                    i += 1
                result.append('${...}')
            else:
                result.append(source[i])
                i += 1
        return ''.join(result)
    return ''


def _parse_js_number(source: str, start: int):
    """解析 JS 数字"""
    i = start
    if i < len(source) and source[i] == '-':
        i += 1
    while i < len(source) and (source[i].isdigit() or source[i] == '.'):
        i += 1
    num_str = source[start:i]
    if '.' in num_str:
        return float(num_str)
    return int(num_str)


def _find_string_end(source: str, start: int) -> int:
    """找到字符串的结束引号位置"""
    quote = source[start]
    i = start + 1
    while i < len(source):
        if source[i] == '\\':
            i += 2
            continue
        if source[i] == quote:
            return i
        i += 1
    return len(source) - 1


def _find_template_end(source: str, start: int) -> int:
    """找到模板字符串的结束位置"""
    i = start + 1
    while i < len(source):
        if source[i] == '\\':
            i += 2
            continue
        if source[i] == '`':
            return i
        i += 1
    return len(source) - 1


def _find_brace_end(source: str, start: int) -> int:
    """找到匹配的 }"""
    depth = 0
    i = start
    while i < len(source):
        if source[i] == '{':
            depth += 1
        elif source[i] == '}':
            depth -= 1
            if depth == 0:
                return i
        elif source[i] in ('"', "'"):
            i = _find_string_end(source, i)
        elif source[i] == '`':
            i = _find_template_end(source, i)
        i += 1
    return len(source) - 1


def _find_bracket_end(source: str, start: int) -> int:
    """找到匹配的 ]"""
    depth = 0
    i = start
    while i < len(source):
        if source[i] == '[':
            depth += 1
        elif source[i] == ']':
            depth -= 1
            if depth == 0:
                return i
        elif source[i] in ('"', "'"):
            i = _find_string_end(source, i)
        elif source[i] == '`':
            i = _find_template_end(source, i)
        i += 1
    return len(source) - 1


# ──────────────────────────────────────────────────────────────────────
#  资源包构建
# ──────────────────────────────────────────────────────────────────────

def extract_items_config(filepath: Path) -> dict:
    """从 items.js 中提取 ITEMS 和 ITEM_ANIMATION_PRESETS"""
    exports = extract_all_exports(filepath)
    return {
        'items': exports.get('ITEMS', {}),
        'itemAnimationPresets': exports.get('ITEM_ANIMATION_PRESETS', {}),
    }


def extract_chapters(chapters_dir: Path) -> dict:
    """
    扫描 chapters/ 目录，提取所有章节数据。
    每个 JS 文件导出 chapter_xxx = [...]
    """
    chapters = {}
    if not chapters_dir.exists():
        print(f'  ⚠ 章节目录不存在: {chapters_dir}')
        return chapters

    for js_file in sorted(chapters_dir.glob('*.js')):
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                source = f.read()

            # 查找 export const chapter_XXX = [
            match = re.search(r'export\s+const\s+(\w+)\s*=\s*\[', source)
            if not match:
                print(f'  ⚠ 无法解析章节文件: {js_file.name}')
                continue

            var_name = match.group(1)
            # 章节 ID: chapter_main → main, chapter_meet_elysia → meet_elysia
            ch_id = var_name.replace('chapter_', '', 1)

            # 提取数组内容
            data = extract_js_export(js_file, var_name)
            if isinstance(data, list):
                chapters[ch_id] = data
                print(f'  ✓ 章节: {ch_id} ({len(data)} 步骤)')
            else:
                print(f'  ⚠ 章节 {ch_id} 数据格式异常，期望数组')
        except Exception as e:
            print(f'  ✗ 章节加载失败 {js_file.name}: {e}')

    return chapters


def build_pack_manifest(pack_name: str, configs: dict, chapters: dict,
                        meta: dict = None) -> dict:
    """生成 pack.json 清单"""
    manifest = {
        'name': pack_name,
        'title': meta.get('title', pack_name) if meta else pack_name,
        'version': meta.get('version', '1.0.0') if meta else '1.0.0',
        'author': meta.get('author', '') if meta else '',
        'description': meta.get('description', '') if meta else '',
        'format': FORMAT_VERSION,
        'configs': {
            'game': 'config/game.json',
            'home': 'config/home.json',
            'characters': 'config/characters.json',
            'scenes': 'config/scenes.json',
            'cgLibrary': 'config/cg-library.json',
            'items': 'config/items.json',
            'endings': 'config/endings.json',
        },
        'chapters': {
            ch_id: f'chapters/{ch_id}.json'
            for ch_id in sorted(chapters.keys())
        },
    }
    return manifest


def write_json(filepath: Path, data):
    """写入 JSON 文件，使用中文友好的格式"""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def copy_assets(src_dir: Path, dst_dir: Path) -> int:
    """复制资源目录，返回复制的文件数"""
    if not src_dir.exists():
        print(f'  ⚠ 资源目录不存在: {src_dir}')
        return 0

    count = 0
    for src_file in src_dir.rglob('*'):
        if src_file.is_file():
            rel_path = src_file.relative_to(src_dir)
            dst_file = dst_dir / rel_path
            dst_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, dst_file)
            count += 1

    return count


def create_zip(output_dir: Path, zip_path: Path):
    """将资源包目录打包为 ZIP 文件"""
    import zipfile

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(output_dir.rglob('*')):
            if file_path.is_file():
                arcname = file_path.relative_to(output_dir.parent)
                zf.write(file_path, arcname)

    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f'\n📦 ZIP 已创建: {zip_path} ({size_mb:.2f} MB)')


def main():
    parser = argparse.ArgumentParser(
        description='Galgame 资源包打包工具 — 将 game/ 目录打包为标准资源包格式'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='输出目录路径 (默认: resource-packs/default/)'
    )
    parser.add_argument(
        '--name', '-n',
        type=str,
        default='default',
        help='资源包名称 (默认: default)'
    )
    parser.add_argument(
        '--title', '-t',
        type=str,
        default=None,
        help='资源包标题 (默认: 从 GAME_CONFIG 读取)'
    )
    parser.add_argument(
        '--author', '-a',
        type=str,
        default='',
        help='作者名称'
    )
    parser.add_argument(
        '--version', '-v',
        type=str,
        default='1.0.0',
        help='版本号 (默认: 1.0.0)'
    )
    parser.add_argument(
        '--zip',
        action='store_true',
        help='同时生成 ZIP 压缩包'
    )
    parser.add_argument(
        '--no-assets',
        action='store_true',
        help='不复制资源文件'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='仅检查，不实际写入文件'
    )

    args = parser.parse_args()

    # 确定输出目录
    if args.output:
        output_dir = Path(args.output).resolve()
    else:
        output_dir = DEFAULT_OUTPUT

    pack_name = args.name

    print('=' * 60)
    print('🎮 Galgame 资源包打包工具')
    print('=' * 60)
    print(f'  项目根目录: {PROJECT_ROOT}')
    print(f'  输出目录:   {output_dir}')
    print(f'  包名:       {pack_name}')
    print()

    # ── 1. 加载游戏配置获取标题 ──────────────────────────────────────
    print('📋 正在提取游戏配置...')
    game_config = {}
    pack_title = args.title

    try:
        game_config = extract_js_export(
            GAME_DIR / 'config/game-config.js', 'GAME_CONFIG'
        )
        if not pack_title:
            pack_title = game_config.get('title', pack_name)
    except Exception as e:
        print(f'  ⚠ 无法读取游戏配置: {e}')

    print(f'  游戏标题: {pack_title}')
    print()

    # ── 2. 提取所有配置文件 ──────────────────────────────────────────
    print('📋 正在提取配置文件...')

    config_data = {'game': game_config}

    for json_name, (js_path, var_name) in CONFIG_MAP.items():
        full_path = GAME_DIR / js_path
        if not full_path.exists():
            print(f'  ⚠ 配置文件不存在: {js_path}')
            continue

        try:
            if json_name == 'game.json':
                continue  # 已在上一步处理

            data = extract_js_export(full_path, var_name)
            config_key = json_name.replace('.json', '')

            # home.json 从 game-config.js 的 HOME_CONFIG 导出
            if json_name == 'home.json':
                config_data['home'] = data
            elif json_name == 'cg-library.json':
                config_data['cgLibrary'] = data
            else:
                config_data[config_key] = data

            # 显示提取数量
            if isinstance(data, dict):
                print(f'  ✓ {json_name}: {len(data)} 项')
            elif isinstance(data, list):
                print(f'  ✓ {json_name}: {len(data)} 项')
            else:
                print(f'  ✓ {json_name}: 已提取')
        except Exception as e:
            print(f'  ✗ {json_name} 提取失败: {e}')

    # ── 3. 提取 items.js（特殊处理）──────────────────────────────────
    print()
    print('📋 正在提取物品配置...')
    items_path = GAME_DIR / ITEMS_SOURCE
    try:
        items_data = extract_items_config(items_path)
        # 合并 ITEMS 和 ITEM_ANIMATION_PRESETS 到单个文件
        config_data['items'] = items_data['items']
        config_data['itemAnimationPresets'] = items_data['itemAnimationPresets']
        print(f'  ✓ items: {len(items_data["items"])} 个物品')
        print(f'  ✓ itemAnimationPresets: {len(items_data["itemAnimationPresets"])} 种动画模式')
    except Exception as e:
        print(f'  ✗ items 提取失败: {e}')
        config_data['items'] = {}
        config_data['itemAnimationPresets'] = {}

    # ── 4. 提取章节 ──────────────────────────────────────────────────
    print()
    print('📋 正在提取故事章节...')
    chapters = extract_chapters(CHAPTERS_DIR)
    print(f'  总计: {len(chapters)} 个章节')

    if not chapters:
        print('  ⚠ 警告: 未提取到任何章节数据！')

    # ── 5. 生成清单 ──────────────────────────────────────────────────
    print()
    print('📋 正在生成资源包清单...')
    manifest = build_pack_manifest(pack_name, config_data, chapters, {
        'title': pack_title,
        'version': args.version,
        'author': args.author,
    })
    print(f'  ✓ pack.json 已生成')

    # ── 6. 写入文件 ──────────────────────────────────────────────────
    if args.dry_run:
        print()
        print('🔍 --dry-run 模式，未写入任何文件')
        print(f'  将生成 {len(chapters) + len(config_data) + 1} 个文件')
        return 0

    print()
    print('💾 正在写入资源包文件...')

    # 清理并创建输出目录
    if output_dir.exists():
        print(f'  🗑 清理已有目录: {output_dir}')
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 写入 pack.json
    write_json(output_dir / 'pack.json', manifest)

    # 写入配置文件
    config_dir = output_dir / 'config'
    config_files = {
        'game.json': config_data.get('game', {}),
        'home.json': config_data.get('home', {}),
        'characters.json': config_data.get('characters', {}),
        'scenes.json': config_data.get('scenes', {}),
        'cg-library.json': config_data.get('cgLibrary', {}),
        'items.json': config_data.get('items', {}),
        'endings.json': config_data.get('endings', []),
    }
    # 物品动画预设合并到 items.json 中
    if config_data.get('itemAnimationPresets'):
        config_files['item-animation-presets.json'] = config_data['itemAnimationPresets']

    for filename, data in config_files.items():
        write_json(config_dir / filename, data)
        print(f'  ✓ config/{filename}')

    # 写入章节文件
    chapters_dir = output_dir / 'chapters'
    for ch_id, steps in chapters.items():
        write_json(chapters_dir / f'{ch_id}.json', steps)
        print(f'  ✓ chapters/{ch_id}.json')

    # ── 7. 复制资源文件 ──────────────────────────────────────────────
    if not args.no_assets:
        print()
        print('🖼️  正在复制资源文件...')
        assets_dst = output_dir / 'assets'
        count = copy_assets(ASSETS_DIR, assets_dst)
        print(f'  ✓ 已复制 {count} 个资源文件')

    # ── 8. 创建 ZIP（可选）───────────────────────────────────────────
    if args.zip:
        zip_path = output_dir.parent / f'{pack_name}.zip'
        create_zip(output_dir, zip_path)

    # ── 9. 完成 ──────────────────────────────────────────────────────
    print()
    print('=' * 60)
    print('✅ 资源包构建完成！')
    print(f'  位置: {output_dir}')
    print(f'  章节: {len(chapters)} 个')
    print(f'  配置: {len(config_files)} 个文件')
    if not args.no_assets:
        print(f'  资源: {count} 个文件')
    print('=' * 60)

    return 0


if __name__ == '__main__':
    sys.exit(main())

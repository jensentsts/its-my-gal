/**
 * cli/commands/help.js
 *
 * `help` command — display usage information.
 */
import { color, header } from '../style.js';

export function cmdHelp() {
  const b = (t) => color('bold', color('cyan', t));

  console.log(`
${color('bold', '剧情树节点编辑器 CLI')}
${color('gray', '用法: node editor/cli.js <command> [options]')}

${b('命令:')}
  ${b('info')}      [stats|chapters|resources]  项目信息
  ${b('validate')}                              数据完整性验证
  ${b('resource')}  <add|delete|set|get|list|rename> 资源管理
  ${b('export')}    <json|js>                   导出数据
  ${b('analyze')}   <branches|crossref>         分析剧情

${b('选项:')}
  -p, --pretty               美化输出（JSON 缩进）
  -o, --output  <file>       输出到文件
  -s, --silent               静默模式
  -v, --verbose              详细输出
  -S, --save                 保存修改到 JSON
  -i, --interactive          交互模式

${b('使用')} ${color('gray', 'node editor/cli.js <command> --help  查看各命令详细用法')}
`);
}

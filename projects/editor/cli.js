#!/usr/bin/env node
/**
 * editor/cli.js
 *
 * 剧情树节点编辑器 CLI 入口
 *
 * 拆分说明：
 *   命令处理已拆分为 cli/ 目录下的模块：
 *     cli/style.js           终端色彩与输出格式
 *     cli/utils.js           深度路径访问、资源元信息、步骤计数、数据保存
 *     cli/commands/info.js   项目信息（overview / stats / chapters / resources）
 *     cli/commands/validate.js   数据完整性验证
 *     cli/commands/export.js     导出（JSON / JS 模块）
 *     cli/commands/analyze.js    剧情分析（分支 / 交叉引用）
 *     cli/commands/resource.js   资源管理（增删改查列重命名）
 *     cli/commands/help.js       帮助信息
 *     cli/interactive.js         交互模式（含 Tab 补全）
 *
 * 用法:
 *   node editor/cli.js <command> [options]
 */
import { color } from './cli/style.js';
import { cmdInfo } from './cli/commands/info.js';
import { cmdValidate } from './cli/commands/validate.js';
import { cmdExport } from './cli/commands/export.js';
import { cmdAnalyze } from './cli/commands/analyze.js';
import { cmdResource } from './cli/commands/resource.js';
import { cmdHelp } from './cli/commands/help.js';
import { cmdInteractive } from './cli/interactive.js';

function main() {
  const args = process.argv.slice(2);

  const opts = {
    pretty: false,
    output: null,
    silent: false,
    verbose: false,
    save: false,
    interactive: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-p': case '--pretty': opts.pretty = true; break;
      case '-o': case '--output': opts.output = args[++i]; break;
      case '-s': case '--silent': opts.silent = true; break;
      case '-v': case '--verbose': opts.verbose = true; break;
      case '-S': case '--save': opts.save = true; break;
      case '-i': case '--interactive': opts.interactive = true; break;
      default: positional.push(args[i]);
    }
  }

  if (opts.interactive || positional.length === 0) {
    cmdInteractive();
    return;
  }

  const command = positional[0];

  try {
    switch (command) {
      case 'info':
        cmdInfo(positional[1], opts);
        break;
      case 'validate':
        cmdValidate();
        break;
      case 'export':
        if (!positional[1]) {
          console.log(`  ${color('red', '请指定导出格式')}: json, js\n`);
          cmdHelp();
          process.exitCode = 1;
        } else {
          cmdExport(positional[1], opts);
        }
        break;
      case 'analyze':
        if (!positional[1]) {
          console.log(`  ${color('red', '请指定分析类型')}: branches, crossref\n`);
          cmdHelp();
          process.exitCode = 1;
        } else {
          cmdAnalyze(positional[1], opts);
        }
        break;
      case 'resource':
        cmdResource(positional.slice(1), opts);
        break;
      case 'help': default:
        cmdHelp();
        break;
    }
  } catch (e) {
    console.error(`\n  ${color('red', '发生错误:')} ${e.message}`);
    if (opts.verbose) console.error(e);
    process.exitCode = 1;
  }
}

main();

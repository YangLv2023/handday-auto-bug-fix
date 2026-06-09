#!/usr/bin/env node

/**
 * @handday-neil/auto-bug-fix CLI 入口
 *
 * 用法:
 *   npx @handday-neil/auto-bug-fix install     安装技能到 ~/.qoder/skills/
 *   npx @handday-neil/auto-bug-fix uninstall   卸载技能
 *   npx @handday-neil/auto-bug-fix status      查看安装状态
 */

const { install, uninstall, status } = require('../index');

const args = process.argv.slice(2);
const command = args[0] || 'install';

switch (command) {
  case 'install':
    install();
    break;

  case 'uninstall':
    uninstall();
    break;

  case 'status':
    status();
    break;

  case '--version':
  case '-v': {
    const pkg = require('../package.json');
    console.log(pkg.version);
    break;
  }

  case '--help':
  case '-h':
    console.log(`
@handday-neil/auto-bug-fix - 全自动Bug修复技能安装工具

命令:
  install       安装技能到 ~/.qoder/skills/（默认）
  uninstall     卸载技能
  status        查看安装状态与文件完整性
  --version     显示版本号
  --help        显示帮助

示例:
  npx @handday-neil/auto-bug-fix                # 默认安装
  npx @handday-neil/auto-bug-fix install        # 安装
  npx @handday-neil/auto-bug-fix status         # 查看状态
  npx @handday-neil/auto-bug-fix uninstall      # 卸载
  npm install -g @handday-neil/auto-bug-fix     # 全局安装后使用 handday-auto-bug-fix 命令
`);
    break;

  default:
    console.error(`未知命令: ${command}`);
    console.error(`使用 --help 查看帮助`);
    process.exit(1);
}

#!/usr/bin/env node

/**
 * @handday-neil/auto-bug-fix CLI 入口
 *
 * 用法:
 *   npx @handday-neil/auto-bug-fix install                          安装技能到所有支持的环境（qoder + workbuddy）
 *   npx @handday-neil/auto-bug-fix install --target qoder            仅安装到 Qoder（~/.qoder/skills/）
 *   npx @handday-neil/auto-bug-fix install --target workbuddy        仅安装到 Workbuddy（~/.workbuddy/skills/）
 *   npx @handday-neil/auto-bug-fix uninstall                         卸载技能（所有环境）
 *   npx @handday-neil/auto-bug-fix uninstall --target workbuddy      仅从 Workbuddy 卸载
 *   npx @handday-neil/auto-bug-fix status                            查看所有环境的安装状态
 *   npx @handday-neil/auto-bug-fix status --target qoder             仅查看 Qoder 的安装状态
 */

const { install, uninstall, status } = require('../index');

const args = process.argv.slice(2);
const command = args[0] || 'install';

// 解析 --target 参数
function parseTarget(args) {
  const targetIdx = args.indexOf('--target');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    return args[targetIdx + 1];
  }
  // 支持 --target=qoder 形式
  const targetEq = args.find(a => a.startsWith('--target='));
  if (targetEq) {
    return targetEq.split('=')[1];
  }
  return undefined;
}

// 去掉 --target 参数后获取位置参数
const positionalArgs = args.filter(a => !a.startsWith('--target'));
const actualCommand = positionalArgs[0] || 'install';
const target = parseTarget(args);

switch (actualCommand) {
  case 'install':
    install(target);
    break;

  case 'uninstall':
    uninstall(target);
    break;

  case 'status':
    status(target);
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
  install                          安装技能（默认安装到所有支持的环境）
  uninstall                        卸载技能（默认从所有环境卸载）
  status                           查看安装状态与文件完整性
  --version                        显示版本号
  --help                           显示帮助

选项:
  --target <qoder|workbuddy|all>   指定目标环境（默认: all）
    qoder                           仅操作 Qoder（~/.qoder/skills/）
    workbuddy                       仅操作 Workbuddy（~/.workbuddy/skills/ + ~/.workbuddy/agents/）
    all                             操作所有支持的环境（默认）

环境说明:
  Qoder      主 skill 安装到 ~/.qoder/skills/handday-auto-bug-fix/
             agents 和子 skill 作为备份存储，由 Step 0 运行时自动初始化
  Workbuddy  主 skill 安装到 ~/.workbuddy/skills/handday-auto-bug-fix/
             agents 额外直接安装到 ~/.workbuddy/agents/（立即可用）
             子 skill 额外直接安装到 ~/.workbuddy/skills/<name>/（立即可用）
             安装后执行 /reload-plugins 生效，无需重启

示例:
  npx @handday-neil/auto-bug-fix                                    # 安装到所有环境
  npx @handday-neil/auto-bug-fix install                            # 安装到所有环境
  npx @handday-neil/auto-bug-fix install --target qoder             # 仅安装到 Qoder
  npx @handday-neil/auto-bug-fix install --target workbuddy         # 仅安装到 Workbuddy
  npx @handday-neil/auto-bug-fix status                             # 查看所有环境状态
  npx @handday-neil/auto-bug-fix status --target workbuddy          # 仅查看 Workbuddy 状态
  npx @handday-neil/auto-bug-fix uninstall --target qoder           # 仅从 Qoder 卸载
  npm install -g @handday-neil/auto-bug-fix                         # 全局安装后使用 handday-auto-bug-fix 命令
`);
    break;

  default:
    console.error(`未知命令: ${actualCommand}`);
    console.error(`使用 --help 查看帮助`);
    process.exit(1);
}

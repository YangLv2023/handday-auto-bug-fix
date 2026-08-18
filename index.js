/**
 * @handday-neil/auto-bug-fix 安装核心逻辑
 *
 * 将本包内的 skill 文件复制到目标环境的 skills 目录
 * 支持 Qoder（~/.qoder/skills/）和 Workbuddy（~/.workbuddy/skills/）两种环境
 * 默认同时安装到两个环境，可通过 --target 参数指定单一目标
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'handday-auto-bug-fix';

// 支持的安装目标
const TARGETS = {
  QODER: 'qoder',
  WORKBUDDY: 'workbuddy',
};
const ALL_TARGETS = [TARGETS.QODER, TARGETS.WORKBUDDY];

// 需要复制的文件清单（相对于包根目录）
const SKILL_FILES = [
  'SKILL.md',
  'README.md',
  '.env.example',
];

const AGENTS_FILES = [
  path.join('agents', 'frontend-bug-fixer.md'),
  path.join('agents', 'senior-java-expert.md'),
  path.join('agents', 'tencent-cloud-troubleshooter.md'),
  path.join('agents', 'manifest.json'),
];

const SUB_SKILL_WORKORDER_FILES = [
  path.join('skills', 'handday-workorder', 'SKILL.md'),
  path.join('skills', 'handday-workorder', 'api-reference.md'),
];

const SUB_SKILL_TCCLI_SETUP_FILES = [
  path.join('skills', 'tccli-setup', 'SKILL.md'),
  path.join('skills', 'tccli-setup', 'reference.md'),
];

const SUB_SKILL_TCCLI_LOG_QUERY_FILES = [
  path.join('skills', 'tccli-log-query', 'SKILL.md'),
  path.join('skills', 'tccli-log-query', 'api-reference.md'),
];

const SUB_SKILL_CHROME_DEVTOOLS_FILES = [
  path.join('skills', 'chrome-devtools', 'SKILL.md'),
];

const ALL_FILES = [
  ...SKILL_FILES,
  ...AGENTS_FILES,
  ...SUB_SKILL_WORKORDER_FILES,
  ...SUB_SKILL_TCCLI_SETUP_FILES,
  ...SUB_SKILL_TCCLI_LOG_QUERY_FILES,
  ...SUB_SKILL_CHROME_DEVTOOLS_FILES,
];

// subagent 模板文件（用于 workbuddy 直接安装到 agents 目录）
const AGENT_TEMPLATES = [
  { src: path.join('agents', 'frontend-bug-fixer.md'),         dest: 'frontend-bug-fixer.md' },
  { src: path.join('agents', 'senior-java-expert.md'),         dest: 'senior-java-expert.md' },
  { src: path.join('agents', 'tencent-cloud-troubleshooter.md'), dest: 'tencent-cloud-troubleshooter.md' },
];

// 子 skill 目录（用于 workbuddy 直接安装到 skills 目录）
const SUB_SKILL_DIRS = [
  { name: 'handday-workorder',  files: SUB_SKILL_WORKORDER_FILES },
  { name: 'tccli-setup',        files: SUB_SKILL_TCCLI_SETUP_FILES },
  { name: 'tccli-log-query',    files: SUB_SKILL_TCCLI_LOG_QUERY_FILES },
  { name: 'chrome-devtools',    files: SUB_SKILL_CHROME_DEVTOOLS_FILES },
];

/** 获取包安装位置（即本文件所在目录） */
function getSourceDir() {
  return __dirname;
}

/**
 * 获取目标环境的目录配置
 * @param {string} target - 'qoder' | 'workbuddy'
 * @returns {{ skillDir: string, agentsDir: string|null, subSkillsBaseDir: string|null, home: string }}
 */
function getTargetDirs(target) {
  const home = os.homedir();
  switch (target) {
    case TARGETS.QODER:
      // Qoder：所有文件统一放在 skill 目录下，agents 和子 skill 由 Step 0 运行时初始化
      return {
        skillDir: path.join(home, '.qoder', 'skills', SKILL_NAME),
        agentsDir: null,
        subSkillsBaseDir: null,
        home,
      };
    case TARGETS.WORKBUDDY:
      // Workbuddy：主 skill 放在 skills 目录，agents 直接放在 agents 目录，子 skill 直接放在 skills 目录
      return {
        skillDir: path.join(home, '.workbuddy', 'skills', SKILL_NAME),
        agentsDir: path.join(home, '.workbuddy', 'agents'),
        subSkillsBaseDir: path.join(home, '.workbuddy', 'skills'),
        home,
      };
    default:
      throw new Error(`未知的目标环境: ${target}（支持: qoder, workbuddy）`);
  }
}

/** 递归创建目录 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** 复制单个文件 */
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/** 打印带颜色的状态 */
function logOk(msg)   { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function logSkip(msg) { console.log(`  \x1b[33m-\x1b[0m ${msg} (不存在，跳过)`); }
function logInfo(msg) { console.log(`  \x1b[36mi\x1b[0m ${msg}`); }

/**
 * 解析目标环境参数
 * @param {string|undefined} targetArg - 'qoder' | 'workbuddy' | 'all' | undefined
 * @returns {string[]} 目标环境数组
 */
function resolveTargets(targetArg) {
  if (!targetArg || targetArg === 'all') {
    return ALL_TARGETS;
  }
  const target = targetArg.toLowerCase();
  if (!ALL_TARGETS.includes(target)) {
    throw new Error(`未知的目标环境: ${targetArg}（支持: qoder, workbuddy, all）`);
  }
  return [target];
}

/**
 * 安装到单个目标环境
 * @param {string} target - 'qoder' | 'workbuddy'
 * @param {string} sourceDir - 包根目录
 * @returns {{ copied: number, skipped: number, targetDir: string }}
 */
function installToTarget(target, sourceDir) {
  const { skillDir, agentsDir, subSkillsBaseDir } = getTargetDirs(target);
  const targetLabel = target === TARGETS.QODER ? 'Qoder' : 'Workbuddy';

  console.log(`\n\x1b[1m[${targetLabel}]\x1b[0m 安装中...`);
  logInfo(`目标目录: ${skillDir}`);

  ensureDir(skillDir);

  let copied = 0;
  let skipped = 0;

  // 1. 复制所有文件到主 skill 目录（与 qoder 一致的结构，作为备份）
  for (const file of ALL_FILES) {
    const src = path.join(sourceDir, file);
    const dest = path.join(skillDir, file);

    if (fs.existsSync(src)) {
      copyFile(src, dest);
      logOk(file);
      copied++;
    } else {
      logSkip(file);
      skipped++;
    }
  }

  // 2. 复制 package.json 到目标，方便 status 读取版本
  const pkgPath = path.join(sourceDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    copyFile(pkgPath, path.join(skillDir, 'package.json'));
  }

  // 3. Workbuddy 专属：直接安装 agents 到 ~/.workbuddy/agents/
  if (agentsDir) {
    ensureDir(agentsDir);
    console.log(`\n  \x1b[36m→\x1b[0m 安装 agents 到 ${agentsDir}`);
    for (const agent of AGENT_TEMPLATES) {
      const src = path.join(sourceDir, agent.src);
      const dest = path.join(agentsDir, agent.dest);
      if (fs.existsSync(src)) {
        copyFile(src, dest);
        logOk(`agents/${agent.dest}`);
        copied++;
      } else {
        logSkip(`agents/${agent.dest}`);
        skipped++;
      }
    }
  }

  // 4. Workbuddy 专属：直接安装子 skill 到 ~/.workbuddy/skills/<name>/
  if (subSkillsBaseDir) {
    console.log(`\n  \x1b[36m→\x1b[0m 安装子 skill 到 ${subSkillsBaseDir}`);
    for (const subSkill of SUB_SKILL_DIRS) {
      const subSkillDir = path.join(subSkillsBaseDir, subSkill.name);
      ensureDir(subSkillDir);
      for (const file of subSkill.files) {
        const src = path.join(sourceDir, file);
        // file 路径形如 skills/<name>/<filename>，提取最后两段
        const relativePath = path.join(subSkill.name, path.basename(file));
        const dest = path.join(subSkillsBaseDir, relativePath);
        if (fs.existsSync(src)) {
          copyFile(src, dest);
          logOk(`skills/${relativePath}`);
          copied++;
        } else {
          logSkip(`skills/${relativePath}`);
          skipped++;
        }
      }
    }
  }

  console.log(`\x1b[1m[${targetLabel}]\x1b[0m \x1b[32m安装完成\x1b[0m（复制 ${copied} 个文件${skipped > 0 ? `，跳过 ${skipped} 个` : ''}）`);

  return { copied, skipped, targetDir: skillDir };
}

/**
 * 执行安装
 * @param {string|undefined} targetArg - 目标环境参数
 */
function install(targetArg) {
  const sourceDir = getSourceDir();
  const targets = resolveTargets(targetArg);

  // 读取版本
  const pkgPath = path.join(sourceDir, 'package.json');
  let version = 'unknown';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      version = pkg.version;
    } catch (_) {}
  }

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 安装中...`);
  logInfo(`源目录: ${sourceDir}`);
  logInfo(`版本: ${version}`);
  logInfo(`目标环境: ${targets.join(', ')}\n`);

  const results = [];
  for (const target of targets) {
    results.push({ target, ...installToTarget(target, sourceDir) });
  }

  // 汇总
  const totalCopied = results.reduce((sum, r) => sum + r.copied, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m \x1b[32m安装完成！\x1b[0m`);
  console.log(`  版本: ${version}`);
  console.log(`  已复制: ${totalCopied} 个文件`);
  if (totalSkipped > 0) console.log(`  已跳过: ${totalSkipped} 个文件`);

  for (const r of results) {
    const label = r.target === TARGETS.QODER ? 'Qoder' : 'Workbuddy';
    console.log(`  [${label}] ${r.targetDir}`);
  }

  // 提示
  const tips = [];
  if (targets.includes(TARGETS.QODER)) {
    tips.push('Qoder: 重启编辑器后即可使用 /handday-auto-bug-fix 命令');
  }
  if (targets.includes(TARGETS.WORKBUDDY)) {
    tips.push('Workbuddy: 执行 /reload-plugins 后即可使用，无需重启');
  }
  tips.push('配置模板: skill 目录下的 .env.example 可复制为待排查项目根目录的 .env 并填入真实值（缺失时 agent 会主动询问）');
  if (tips.length > 0) {
    console.log(`\n  \x1b[33m提示:\x1b[0m`);
    for (const tip of tips) {
      console.log(`    - ${tip}`);
    }
  }
  console.log('');
}

/**
 * 从单个目标环境卸载
 * @param {string} target - 'qoder' | 'workbuddy'
 */
function uninstallFromTarget(target) {
  const { skillDir, agentsDir, subSkillsBaseDir } = getTargetDirs(target);
  const targetLabel = target === TARGETS.QODER ? 'Qoder' : 'Workbuddy';

  console.log(`\n\x1b[1m[${targetLabel}]\x1b[0m 卸载中...`);

  // 删除主 skill 目录
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
    logOk(`已删除: ${skillDir}`);
  } else {
    logSkip(`${skillDir} 不存在`);
  }

  // Workbuddy 专属：删除直接安装的 agents
  if (agentsDir) {
    for (const agent of AGENT_TEMPLATES) {
      const agentFile = path.join(agentsDir, agent.dest);
      if (fs.existsSync(agentFile)) {
        fs.rmSync(agentFile, { force: true });
        logOk(`已删除: ${agentFile}`);
      }
    }
  }

  // Workbuddy 专属：删除直接安装的子 skill
  if (subSkillsBaseDir) {
    for (const subSkill of SUB_SKILL_DIRS) {
      const subSkillDir = path.join(subSkillsBaseDir, subSkill.name);
      if (fs.existsSync(subSkillDir)) {
        fs.rmSync(subSkillDir, { recursive: true, force: true });
        logOk(`已删除: ${subSkillDir}`);
      }
    }
  }

  console.log(`\x1b[1m[${targetLabel}]\x1b[0m \x1b[32m卸载完成\x1b[0m`);
}

/**
 * 卸载
 * @param {string|undefined} targetArg - 目标环境参数
 */
function uninstall(targetArg) {
  const targets = resolveTargets(targetArg);

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 卸载中...`);
  logInfo(`目标环境: ${targets.join(', ')}\n`);

  for (const target of targets) {
    uninstallFromTarget(target);
  }
  console.log('');
}

/**
 * 查看单个目标的安装状态
 * @param {string} target - 'qoder' | 'workbuddy'
 */
function statusForTarget(target) {
  const { skillDir, agentsDir, subSkillsBaseDir } = getTargetDirs(target);
  const targetLabel = target === TARGETS.QODER ? 'Qoder' : 'Workbuddy';
  const skillFile = path.join(skillDir, 'SKILL.md');
  const pkgFile = path.join(skillDir, 'package.json');

  const installed = fs.existsSync(skillFile);

  console.log(`\n\x1b[1m[${targetLabel}]\x1b[0m 安装状态`);
  console.log(`  状态: ${installed ? '\x1b[32m✓ 已安装\x1b[0m' : '\x1b[31m✗ 未安装\x1b[0m'}`);

  if (installed) {
    console.log(`  位置: ${skillDir}`);

    if (fs.existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        console.log(`  版本: ${pkg.version}`);
      } catch (_) {}
    }

    // 检查各依赖文件完整性
    console.log(`\n  文件完整性:`);
    for (const file of ALL_FILES) {
      const exists = fs.existsSync(path.join(skillDir, file));
      console.log(`    ${exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${file}`);
    }

    // Workbuddy 专属：检查直接安装的 agents
    if (agentsDir) {
      console.log(`\n  Agents 直装检查 (${agentsDir}):`);
      for (const agent of AGENT_TEMPLATES) {
        const exists = fs.existsSync(path.join(agentsDir, agent.dest));
        console.log(`    ${exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${agent.dest}`);
      }
    }

    // Workbuddy 专属：检查直接安装的子 skill
    if (subSkillsBaseDir) {
      console.log(`\n  子 Skill 直装检查 (${subSkillsBaseDir}):`);
      for (const subSkill of SUB_SKILL_DIRS) {
        const subSkillFile = path.join(subSkillsBaseDir, subSkill.name, 'SKILL.md');
        const exists = fs.existsSync(subSkillFile);
        console.log(`    ${exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${subSkill.name}/SKILL.md`);
      }
    }
  }
}

/**
 * 查看安装状态
 * @param {string|undefined} targetArg - 目标环境参数
 */
function status(targetArg) {
  const targets = resolveTargets(targetArg);

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 安装状态`);
  logInfo(`目标环境: ${targets.join(', ')}`);

  for (const target of targets) {
    statusForTarget(target);
  }
  console.log('');
}

module.exports = { install, uninstall, status, getSourceDir, getTargetDirs, resolveTargets, TARGETS };


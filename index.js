/**
 * @handday-neil/auto-bug-fix 安装核心逻辑
 *
 * 将本包内的 skill 文件复制到 ~/.qoder/skills/handday-auto-bug-fix/
 * 供 Qoder / Cursor / Claude Code 等编辑器识别并加载
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'handday-auto-bug-fix';

// 需要复制的文件清单（相对于包根目录）
const SKILL_FILES = [
  'SKILL.md',
  'README.md',
];

const AGENTS_FILES = [
  path.join('agents', 'frontend-bug-fixer.md'),
  path.join('agents', 'senior-java-expert.md'),
  path.join('agents', 'manifest.json'),
];

const SUB_SKILL_WORKORDER_FILES = [
  path.join('skills', 'handday-workorder', 'SKILL.md'),
  path.join('skills', 'handday-workorder', 'api-reference.md'),
];

const ALL_FILES = [...SKILL_FILES, ...AGENTS_FILES, ...SUB_SKILL_WORKORDER_FILES];

/** 获取包安装位置（即本文件所在目录） */
function getSourceDir() {
  return __dirname;
}

/** 获取目标 skill 目录 */
function getTargetDir() {
  return path.join(os.homedir(), '.qoder', 'skills', SKILL_NAME);
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
 * 执行安装：将包内所有 skill 文件复制到 ~/.qoder/skills/handday-auto-bug-fix/
 */
function install() {
  const sourceDir = getSourceDir();
  const targetDir = getTargetDir();

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 安装中...\n`);
  logInfo(`源目录: ${sourceDir}`);
  logInfo(`目标目录: ${targetDir}\n`);

  ensureDir(targetDir);

  let copied = 0;
  let skipped = 0;

  for (const file of ALL_FILES) {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);

    if (fs.existsSync(src)) {
      copyFile(src, dest);
      logOk(file);
      copied++;
    } else {
      logSkip(file);
      skipped++;
    }
  }

  // 读取并显示安装的版本
  const pkgPath = path.join(sourceDir, 'package.json');
  let version = 'unknown';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      version = pkg.version;
    } catch (_) {}
  }

  // 把 package.json 也复制到目标，方便 status 读取版本
  if (fs.existsSync(pkgPath)) {
    copyFile(pkgPath, path.join(targetDir, 'package.json'));
  }

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m \x1b[32m安装完成！\x1b[0m`);
  console.log(`  版本: ${version}`);
  console.log(`  已复制: ${copied} 个文件`);
  if (skipped > 0) console.log(`  已跳过: ${skipped} 个文件`);
  console.log(`  位置: ${targetDir}`);
  console.log(`\n  \x1b[33m提示: 重启编辑器后即可使用 /handday-auto-bug-fix 命令\x1b[0m\n`);
}

/**
 * 卸载：删除 ~/.qoder/skills/handday-auto-bug-fix/ 目录
 */
function uninstall() {
  const targetDir = getTargetDir();

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m \x1b[32m已卸载\x1b[0m`);
    console.log(`  已删除: ${targetDir}\n`);
  } else {
    console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 技能未安装，无需卸载\n`);
  }
}

/**
 * 查看安装状态
 */
function status() {
  const targetDir = getTargetDir();
  const skillFile = path.join(targetDir, 'SKILL.md');
  const pkgFile = path.join(targetDir, 'package.json');

  const installed = fs.existsSync(skillFile);

  console.log(`\n\x1b[1m@handday-neil/auto-bug-fix\x1b[0m 安装状态`);
  console.log(`  状态: ${installed ? '\x1b[32m✓ 已安装\x1b[0m' : '\x1b[31m✗ 未安装\x1b[0m'}`);

  if (installed) {
    console.log(`  位置: ${targetDir}`);

    if (fs.existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        console.log(`  版本: ${pkg.version}`);
      } catch (_) {}
    }

    // 检查各依赖文件完整性
    console.log(`\n  文件完整性:`);
    for (const file of ALL_FILES) {
      const exists = fs.existsSync(path.join(targetDir, file));
      console.log(`    ${exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${file}`);
    }
  }
  console.log('');
}

module.exports = { install, uninstall, status, getSourceDir, getTargetDir };


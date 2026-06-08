# Handday Auto Bug Fix

> Qoder 全自动 Bug 诊断与修复 Skill —— 多 Agent 协作编排，从 Bug 采集到修复审查一站式完成。

## 简介

`handday-auto-bug-fix` 是一个面向 [Qoder](https://qoder.ai) 的高级 Skill，采用 **多 Agent 协作模式**，实现 Bug 的全自动处理：

- **PM（主 Agent）**：流程编排、任务分配、协调各 Agent、最终汇报
- **前端专家（`frontend-bug-fixer` subagent）**：页面定位、接口追踪、前端问题分析与修复
- **后端专家（`senior-java-expert` subagent）**：Java 代码定位、根因分析、修复实施
- **工单采集（`handday-workorder` 子 Skill）**：自动从 handday OS 平台采集工单信息

## 核心功能

| 功能 | 说明 |
|------|------|
| 多来源 Bug 采集 | 支持工单（GD编号）、禅道 Bug 链接、用户文字/截图描述 |
| 智能归属判定 | 自动判断前端 / 后端 / 接口联调问题，精准分派 |
| 多 Agent 协作排查 | 前后端专家可多轮交互，直到根因明确 |
| 自动修复实施 | 用户确认后自动执行代码修改 + 编译验证 |
| 代码审查 | 修复后自动调用 `code-review` 进行代码审查 |
| 环境自初始化 | 首次运行自动检查并安装所有依赖（subagent + 子 Skill） |

## 工作流程

```
用户输入 Bug → 环境初始化 → 信息采集 → 分派分析 → 协作排查 → 汇报方案 → 用户确认 → 修复实施 → 代码审查
```

## 目录结构

```
handday-auto-bug-fix/
├── SKILL.md                              # 主 Skill 定义（流程编排逻辑）
├── README.md                             # 本文件
├── agents/                               # Subagent 模板（备份）
│   ├── manifest.json                     # 依赖清单 & 初始化状态
│   ├── frontend-bug-fixer.md             # 前端专家 subagent 配置
│   └── senior-java-expert.md             # 后端专家 subagent 配置
└── skills/                               # 子 Skill 模板（备份）
    └── handday-workorder/
        ├── SKILL.md                      # 工单查询 Skill 定义
        └── api-reference.md              # handday OS API 参考文档
```

## 前置条件

### 必需

- **Qoder IDE**（VS Code / JetBrains 插件）
- **Chrome DevTools MCP Server**：工单采集需要通过浏览器自动化访问 handday OS 平台
- **Node.js**：用于运行 CodeGraph 代码检索工具

### 推荐

- **CodeGraph**（`@colbymchenry/codegraph`）：结构性代码检索，后端排查核心工具
  ```bash
  npm install -g @colbymchenry/codegraph
  ```
- 项目级 `.qoder/rules/` 中配置 CodeGraph 使用规则

## 安装

### 方式一：直接复制（推荐）

将整个 `handday-auto-bug-fix` 目录复制到 Qoder 的 Skills 目录：

**用户级安装**（对所有项目生效）：

```powershell
# Windows
Copy-Item -Recurse "handday-auto-bug-fix" "$env:USERPROFILE\.qoder\skills\handday-auto-bug-fix"
```

```bash
# macOS / Linux
cp -r handday-auto-bug-fix ~/.qoder/skills/handday-auto-bug-fix
```

**项目级安装**（仅对当前项目生效）：

```powershell
# Windows
Copy-Item -Recurse "handday-auto-bug-fix" ".qoder\skills\handday-auto-bug-fix"
```

```bash
# macOS / Linux
cp -r handday-auto-bug-fix .qoder/skills/handday-auto-bug-fix
```

### 方式二：Git Clone

```bash
# 用户级
cd ~/.qoder/skills
git clone <本仓库地址> handday-auto-bug-fix

# 项目级
cd .qoder/skills
git clone <本仓库地址> handday-auto-bug-fix
```

### 安装后验证

安装完成后，在 Qoder 中输入以下触发词验证 Skill 是否被识别：

```
bug、报错、异常、fix、修复、错误、问题排查、堆栈、500、NPE、接口报错、工单bug、禅道bug
```

Skill 首次运行时会自动执行 **Step 0 环境初始化**：
1. 读取 `agents/manifest.json` 获取依赖清单
2. 检查 `frontend-bug-fixer` 和 `senior-java-expert` 两个 subagent 是否已存在，缺失则自动创建
3. 检查 `handday-workorder` 子 Skill 是否已存在，缺失则自动从备份安装
4. `code-review` 为 Qoder 内置 Skill，无需安装

## 使用方式

### 基本用法

在 Qoder 对话中直接描述 Bug 即可触发：

```
# 通过工单号
帮我看看 GD2026052314140082 这个工单

# 通过禅道链接
这个 bug 修一下：https://chandao.facehand.cn/bug-view-12345.html

# 通过文字描述
出单的时候报 NPE 了，堆栈如下：...

# 通过截图
[粘贴错误截图] 这个问题帮我排查一下
```

### 触发关键词

Skill 会在检测到以下关键词时自动激活：

`bug` · `报错` · `异常` · `fix` · `修复` · `错误` · `问题排查` · `堆栈` · `500` · `NPE` · `接口报错` · `工单bug` · `禅道bug`

## 依赖说明

| 依赖 | 类型 | 用途 | 安装方式 |
|------|------|------|---------|
| `frontend-bug-fixer` | Subagent | 前端问题排查与修复 | 自动从 `agents/` 模板创建 |
| `senior-java-expert` | Subagent | 后端 Java 代码排查与修复 | 自动从 `agents/` 模板创建 |
| `handday-workorder` | 子 Skill | 工单信息采集（浏览器自动化） | 自动从 `skills/` 备份安装 |
| `code-review` | 内置 Skill | 修复后代码审查 | Qoder 自带，无需安装 |

依赖的安装状态记录在 `agents/manifest.json` 的 `initStatus` 字段中，已安装的依赖不会重复安装。

## 项目适配

本 Skill 当前针对 **handday** 项目进行了深度定制：

- 后端代码目录：`e:\workspace\handday-all`（多模块微服务）
- 前端代码目录：`E:\workspace\handday-web`（Vue 前端项目）
- 技术栈：Spring Boot + Java 8 + Spring Cloud + Nacos + MyBatis
- 代码检索：CodeGraph（68 万+ 节点索引）
- 工单平台：os.handday.com

如需在其他项目中使用，需修改 `SKILL.md` 中的：
1. 前端项目约束（目录路径、分支策略）
2. CodeGraph 配置（项目路径、索引范围）
3. `senior-java-expert.md` 中的项目技术与结构认知

## License

MIT

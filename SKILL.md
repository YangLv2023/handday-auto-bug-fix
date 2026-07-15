---
name: handday-auto-bug-fix
description: 全自动Bug诊断与修复编排器。采用多Agent协作模式（PM + 信息接收员 + 前端专家 + 后端专家 + 腾讯云日志专家），接收bug链接/图片/描述后自动完成信息采集→[可选]环境日志抓取→分析定位→修复→代码审查→Commit整理全流程。支持工单和禅道两种bug来源，给出链接或单号即可自动识别执行。日志抓取支持生产环境（上海）和测试环境（成都）双环境：工单来源默认查生产，禅道来源默认查测试，直接给traceId时主动向用户确认环境。当存在traceId或明显异常信息时，可自动决策是否先通过腾讯云日志专家进行日志抓取辅助定位；当确认为业务异常时，可协调前后端专家输出业务异常解释报告。触发词：bug、报错、异常、fix、修复、错误、问题排查、堆栈、500、NPE、接口报错、工单bug、禅道bug。
---

# 全自动 Bug 修复 - 多Agent协作编排

## 角色定义

| 角色 | 执行者 | 职责 |
|------|--------|------|
| **PM（你自己）** | 主Agent | 流程编排、任务分配、协调各Agent、最终汇报 |
| **Bug信息接收员** | 主Agent内联执行 | 提取bug信息、判断前后端归属、与用户交互补充信息 |
| **前端专家** | `frontend-bug-fixer` subagent | 页面定位、接口追踪、前端问题分析 |
| **后端专家** | `senior-java-expert` subagent | Java代码定位、根因分析、修复实施 |
| **腾讯云日志专家** | `tencent-cloud-troubleshooter` subagent | CLS日志检索、APM链路追踪，输出日志排查结果交由PM决策（可选启用） |

> **依赖说明**：subagent 配置模板存放在 `agents/` 子目录，子 skill 备份存放在 `skills/` 子目录。完整依赖清单（含 `requiredSubagents` 和 `requiredSkills`，每项标注 `scope` 使用范围）→ 详见 [agents/manifest.json](agents/manifest.json)。
>
> **skill 使用范围分类**：
> - **PM 可用子 skill**：`handday-workorder`（工单采集）、`code-review`（代码审查）— PM 可直接调用
> - **subagent 专属依赖 skill（🚫 PM 不可直接使用）**：`tccli-log-query`（仅供 `tencent-cloud-troubleshooter` subagent 加载）、`tccli-setup`（PM 仅引导用户使用 `/tccli-setup` 命令，不直接加载）、`chrome-devtools`（供 `frontend-bug-fixer` 和 `handday-workorder` 浏览器自动化）
>
> ⚠️ **关键区分**：`tccli-log-query` 虽然作为备份存储在主 skill 的 `skills/` 目录中并安装到用户级 skills 目录，但它是 **`tencent-cloud-troubleshooter` subagent 的内部依赖**，不是 PM 的可用工具。PM 不得直接加载或使用该 skill。
>
> 新环境首次运行时，[Step 0](#step-0-环境初始化与依赖检查subagent--子-skill必须最先执行) 会自动检查并从备份初始化缺失的 subagent / 子 skill，无需手动安装。
>
> **安装后须知**：`tccli-setup`、`tccli-log-query` 子 skill 和 `tencent-cloud-troubleshooter` 子 agent 会随 Step 0 自动检查并安装。已存在则跳过。
>
> **多环境支持**：同时支持 Qoder（`~/.qoder/`）和 Workbuddy（`~/.workbuddy/`）两种环境。npm 安装器默认同时安装到两个环境，也可通过 `--target qoder` 或 `--target workbuddy` 指定单一目标。Workbuddy 安装后需执行 `/reload-plugins` 生效。

---

## 🚫 PM 铁律（不可违反 — 优先于所有流程步骤）

> **PM（你自己）是编排者，不是执行者。以下操作坚决禁止由 PM 直接执行：**

1. **🚫 禁止 PM 直接执行 tccli 命令** — 所有 CLS 日志检索（SearchLog、DescribeLogHistogram、DescribeLogContext）、APM 链路查询（DescribeGeneralSpanList 等）、TCCLI 环境检查和认证，必须通过派发 `tencent-cloud-troubleshooter` subagent 执行。
2. **🚫 禁止 PM 直接加载 `tccli-log-query` skill** — 该 skill 是 `tencent-cloud-troubleshooter` subagent 的内部依赖，不是 PM 的可用工具。PM 只负责将检索键（traceId/corpId）、环境、查询目的传递给 subagent，由 subagent 加载该 skill 并执行查询。
3. **🚫 禁止 PM 亲自排查代码** — 代码搜索、定位、分析由 `frontend-bug-fixer` 和 `senior-java-expert` subagent 执行，PM 只做编排调度和信息整合。
4. **🚫 禁止 PM 越级操作** — PM 不执行任何本应由 subagent 执行的操作，包括但不限于：执行 tccli 命令、直接搜索代码库定位 bug、直接修改代码文件。

> **违反以上任一条均视为流程错误。** 当 PM 检测到自身有"直接查日志"或"直接执行命令"的冲动时，应立即停止并转为派发 subagent。

---

## 环境配置加载

> **所有内部系统地址、云资源配置（TopicId、Region 等）均从项目根目录 `.env` 文件读取，禁止在文档中硬编码。**
>
> `.env` 已排除在 Git 追踪之外（见 `.gitignore`）。模板见 `.env.example`。
>
> **加载时机**：PM 在 Step 1 识别 Bug 来源时，先读取 `.env` 获取 `$WORKORDER_BASE_URL` 和 `$ZENTAO_BASE_URL`，用于匹配用户输入中的链接来源。
>
> **缺失处理**：如 `.env` 文件不存在或某项为空，**必须主动询问用户**提供对应值。

---

## 适用场景与触发条件

### 什么时候使用本 Skill

当用户提供了以下任一形式的 Bug 信息时，**自动识别并执行本 Skill**，无需用户额外说明：

| 输入形式 | 识别特征 | 对应来源 |
|----------|---------|---------|
| **工单单号** | `GD` 开头的编号（如 `GD2026052314140082`） | 工单 |
| **工单链接** | 包含 `$WORKORDER_BASE_URL` 域名的 URL | 工单 |
| **禅道Bug编号** | 纯数字编号（如 `12345`），或用户明确说"禅道Bug" | 禅道 |
| **禅道Bug链接** | 包含 `$ZENTAO_BASE_URL`/bug-view-{id}.html 的 URL | 禅道 |
| **Bug描述/截图** | 纯文字描述、错误截图、堆栈信息 | 用户描述 |

> **核心原则**：用户只需给出**链接或单号**即可触发全流程。PM 自动识别来源类型，采集信息后进入排查。不需要用户手动指定"用这个skill"。

### 什么时候不使用本 Skill

- 纯功能开发需求（非 Bug 修复）
- 代码审查请求（直接用 `/code-review`）
- 通用代码咨询/架构讨论

---

## 前端项目约束

**前端代码目录**：`E:\workspace\handday-web`

### 工作区校验（前端排查前置）

派发前端专家任务**之前**，必须先校验工作区是否存在有效的前端项目：

1. 检查目录 `E:\workspace\handday-web` 是否存在
2. 检查该目录下是否存在有效前端项目文件（任一即可）：`package.json`、`vue.config.js`、`src/` 目录

**若目录不存在或不含有效前端项目文件**，立即暂停流程并提示用户（不得继续派发前端专家）：

```
⚠️ 前端工作区校验未通过

1. 当前目录 E:\workspace\handday-web 下未发现有效的前端项目。
2. 请在该目录下执行 git clone 将前端项目克隆到本地，例如：
   cd E:\workspace\handday-web
   git clone <前端项目仓库地址> .
3. 克隆完成后请通知我，我将继续执行前端排查流程。
```

校验通过后方可进入前端专家派发。

### 权限规则

| 允许 | 禁止 |
|------|------|
| 在该目录下搜索、读取任何文件 | 添加任何新文档/文件 |
| 切换分支（git checkout / git switch） | git commit / git push |
| 拉取远程分支（git fetch / git pull） | 修改 .gitignore 或配置文件 |
| 查看 git log / git blame | 任何形式的提交操作 |

### 分支与版本

- 派发前端专家任务时，prompt 中**必须注明**当前工作目录为 `E:\workspace\handday-web`
- 如排查过程中发现代码版本与bug描述不符（如功能不存在、接口已变更），立即暂停并询问用户提供对应版本分支名称
- 获取分支名后执行 `git fetch origin && git checkout [分支名]` 切换后继续排查
- 前端目录**仅用于问题排查定位**，不在此目录做任何修复改动

---

## 代码检索工具：CodeGraph（结构性检索必须优先使用）

> **强制规则**：本项目根目录 `e:\workspace\handday-all` 配置了 CodeGraph。**所有结构性代码检索（查符号、定位方法、调用关系、影响分析）必须优先使用 `codegraph` 命令**，而不是 grep/glob 字面搜索。仅纯文本/文档搜索才用普通文件搜索。后端专家排查 Java 代码时同样必须遵守。

### 它是什么

- 全局 nodejs 命令 `codegraph`（npm 包 `@colbymchenry/codegraph`），直接在项目根目录终端运行
- 已对本项目建立索引（Java 为主，68万+节点、88万+边），支持跨微服务符号检索

### 核心命令（按使用频率）

| 命令 | 用途 | 示例 |
|------|------|------|
| `codegraph query <符号>` | 搜索符号（类/方法/字段），一次命中重载、内部类、跨服务 | `codegraph query "getCurrentSaleStockAllQty" -l 5` |
| `codegraph impact <符号>` | 分析改动某符号会影响哪些代码（含接口+实现+类） | `codegraph impact "generateBatchKey" -d 2` |
| `codegraph callers <符号>` | 查找调用该符号的所有方法 | `codegraph callers "splitOrderOut" -l 20` |
| `codegraph callees <符号>` | 查找该符号调用了哪些方法 | `codegraph callees "splitOrderOut"` |
| `codegraph files` | 查看索引内的项目文件结构 | `codegraph files --filter billservice --format tree` |
| `codegraph status` | 查看索引统计与待同步变更 | `codegraph status` |
| `codegraph sync` | 同步自上次索引以来的代码变更 | `codegraph sync` |

### 常用参数

- `-l, --limit <n>`：限制结果数量
- `-k, --kind <kind>`：按类型过滤（`method` / `class` / `field` / `interface` / `enum` 等）
- `-j, --json`：JSON 输出，含 `qualifiedName`、`filePath`、`startLine/endLine`、`signature`、`docstring`、`visibility` 等完整元数据
- `-d, --depth <n>`：impact 的遍历深度
- `-p, --path <path>`：指定项目路径（默认当前目录）

### 标准排查姿势

```
1. codegraph query "<方法名>"        → 拿到精确文件路径 + 行号（替代 grep 找符号）
2. Read 该文件对应行段              → 看具体实现
3. codegraph callers/callees <符号>  → 理清上下游调用链
4. codegraph impact <符号>          → 评估修复影响范围
```

### 已知局限（重要）

- **`callers` / `callees` 对「接口方法」和「Spring 注入 bean 的实例方法」解析不全，常返回空**（即使 `codegraph sync` 后仍为空）。
  - 实测：静态工具方法（如 `BatchKeyUtil.generateBatchKey`）的 callers 可正常命中；但通过接口（如 `WarehouseStockService.getCurrentSaleStockAllQty`）或注入 bean（如 `skuStockBatchManager.splitOrderOut`）调用的方法，callers 多为空。
  - 应对：改用 `codegraph impact <符号>`（能同时列出接口+实现+类，比 callers 可靠），或退回 `codegraph query` + `Read` + 人工确认调用链。
- 排查前可先 `codegraph status` 看 Pending Changes，必要时 `codegraph sync`（daemon 通常已自动同步，多数情况显示 Already up to date）。
- 命令在 PowerShell 中运行，**不要使用 `| head` 等 Unix 管道**（PowerShell 不支持）。

---

## 整体流程

```
前置步骤：工作目录校验 → Step 0: 环境初始化 → 用户输入Bug → Step 1: 信息采集 → Step 1.5: 环境日志抓取（可选）→ Step 2: 分派分析 → Step 3: 协作排查 → Step 4: 汇报方案 → Step 5: 修复实施 → Step 6: 代码审查 → Step 7: Git Commit 整理输出
```

---

## 前置步骤：工作目录校验（Step 0 之前必须执行）

> 在执行任何环境初始化和 Bug 排查动作前，PM **必须**先完成本步骤，确认当前工作目录为有效的代码项目目录。这是进入 Step 0 的前置条件。

### 校验规则

使用 Bash（`Get-ChildItem` 或 `Test-Path`）检查当前工作目录是否存在以下任一标志性文件/目录：

| 项目类型 | 标志文件/目录 | 说明 |
|----------|-------------|------|
| **Java 多模块 Maven 项目** | `pom.xml` | 后端核心业务代码根 |
| **前端项目** | `package.json` + `src/` 目录 | 前端页面代码根 |
| **Git 仓库** | `.git` 目录 | 任何受版本控制的项目 |

满足以上任一条件即视为"有效的代码项目目录"。

### 校验流程

1. **PM 使用 Bash 工具**检查当前工作目录是否存在上述任意标志性文件/目录
2. **校验通过** → 继续执行 Step 0
3. **校验未通过** → 暂停流程，让用户自行填写代码项目所在目录的完整路径：

```
⚠️ 当前工作目录下未检测到有效的代码项目，请提供代码项目所在目录的完整路径。

提供后我将切换到对应目录继续排查流程。
```

4. **用户提供路径后** → 使用 Bash `Set-Location`（`cd`）切换到用户指定的目录
5. **切换完成后** → 进入 Step 0 环境初始化

### 注意事项

- 本步骤仅校验「当前会话的工作目录」是否合适，**不改变** Step 0 依赖初始化逻辑
- 切换目录后，Step 0 的环境初始化仍按原逻辑执行
- **不要**复制/移动任何代码文件，仅切换工作目录
- 当从前端排查转到后端排查（或反之）时，PM 应检查当前目录是否需要切换

---

## Step 0: 环境初始化与依赖检查（subagent + 子 skill + 前置 skill，必须最先执行）

> 在执行任何 Bug 排查动作前，PM **必须**先完成本步骤，确保所依赖的 **subagent**、**子 skill** 以及**前置 skill**（如 `chrome-devtools`）在当前环境就绪。已就绪则跳过安装，**不重复安装**。

### 0.1 读取依赖清单

读取 skill 目录下的 `agents/manifest.json`，获取 `requiredSubagents` 与 `requiredSkills` 两份清单。

> 完整清单含 3 个 subagent（`frontend-bug-fixer`、`senior-java-expert`、`tencent-cloud-troubleshooter`）和 5 个子 skill/前置 skill（`handday-workorder`、`chrome-devtools`、`tccli-setup`、`tccli-log-query`、`code-review`）。→ 详见 [agents/manifest.json](agents/manifest.json)。

### 0.2 检查依赖是否已存在

对每个 subagent 和 `user` 类型子 skill/前置 skill，按优先级检查 Qoder 和 Workbuddy 两种环境路径（项目级 + 用户级）：

- **subagent**：`<项目根>/.qoder/agents/` → `~/.qoder/agents/` → `<项目根>/.workbuddy/agents/` → `~/.workbuddy/agents/`
- **子 skill/前置 skill**：`<项目根>/.qoder/skills/<name>/SKILL.md` → `~/.qoder/skills/<name>/SKILL.md` → `<项目根>/.workbuddy/skills/<name>/SKILL.md` → `~/.workbuddy/skills/<name>/SKILL.md`
- `builtin` 类型子 skill（如 `code-review`）：内置自带，无需安装

任一位置存在即视为**已就绪**，跳过创建/安装。

### 0.3 缺失时按环境自动创建/安装

| 环境 | subagent 创建方式 | 子 skill 安装方式 |
|------|-------------------|------------------|
| **Qoder** | 调用 `/create-subagent`，以 `agents/<name>.md` 模板写入 `~/.qoder/agents/<name>.md` | 将 `skills/<name>/` 全部文件复制到 `~/.qoder/skills/<name>/` |
| **Workbuddy** | 模板内容直接复制到 `~/.workbuddy/agents/<name>.md`，后执行 `/reload-plugins` | 将 `skills/<name>/` 全部文件复制到 `~/.workbuddy/skills/<name>/`，后执行 `/reload-plugins` |
| **其他编辑器** | 写入编辑器约定的 agents 目录，无统一目录时回退到 `~/.qoder/agents/` | 复制到编辑器约定的 skills 目录，无统一目录时回退到 `~/.qoder/skills/` |

> 模板和备份是单一事实来源。`agents/` 下的模板复制为 subagent，`skills/<name>/` 下的备份整目录复制为子 skill。

### 0.4 记录初始化状态并校验

完成检查/创建/安装后，回写 `agents/manifest.json` 的 `initStatus`（`present`/`source`/`checkedAt`）。下次运行时已 `present:true` 的项直接跳过。

仅当所有 `required:true` 的依赖均就绪，方可进入 Step 1。若某必需依赖创建/安装失败，暂停并提示用户手动处理。

> **TCCLI 工具说明**：`tccli-setup` 和 `tccli-log-query` 子 skill 安装的是**技能配置文件**，而非 TCCLI 命令行工具本身。TCCLI 的实际安装和认证配置在 Step 1.5 日志抓取时由 `tencent-cloud-troubleshooter` 运行时检查。因此 TCCLI 未安装**不阻塞**主流程启动，仅影响可选的日志抓取步骤。

---

## Step 1: Bug信息采集（PM + 接收员）

PM 接到用户输入后，立即进入信息采集模式：

### 1.1 识别Bug来源

| 来源类型 | 识别特征 | 采集方式 |
|----------|---------|---------|
| **工单** | 包含 "GD" 开头编号或 `$WORKORDER_BASE_URL` 链接 | 使用 `/handday-workorder` skill 获取工单详情和图片 |
| **禅道Bug** | 包含 `$ZENTAO_BASE_URL`/bug-view-{id}.html | 通过浏览器打开页面提取信息（见禅道采集流程） |
| **用户描述** | 纯文字/截图/错误信息 | 直接解析提取 |

### 1.2 工单信息采集

直接调用 `/handday-workorder` skill 查询工单，获取：
- 工单标题、描述、截图
- 问题类型、优先级
- **corpId（客户企业编号）** — 尽量提取，当日志检索无 traceId 时作为补充检索键（需搭配其他条件组合检索）
- 回复记录中的补充信息

### 1.3 禅道Bug采集

1. 通过 Browser subagent 打开禅道链接
2. **如遇登录页**：暂停流程，提示用户完成登录后继续
3. 登录后提取：Bug标题、重现步骤、相关截图、指派人、所属模块
4. 提取页面中的关键字段（影响版本、严重程度等）

### 1.4 信息充分性判断

采集完成后，检查是否具备以下最低信息：

```
必备信息清单：
- [ ] 问题现象（用户看到了什么）
- [ ] 触发场景（在哪个页面/什么操作下发生）
- [ ] 期望行为 vs 实际行为
- [ ] 后端Git分支（必须！排查前必须确认）
可选但重要：
- [ ] 错误截图/堆栈
- [ ] 影响范围（所有用户/特定条件）
- [ ] 复现路径
- [ ] 前端分支（可后续按需询问）
```

**信息不足时**：立即向用户提出需要补充的具体问题，等待补录后继续。

### 1.5 后端分支确认（必须）

**排查开始前，必须向用户确认后端代码所在的Git分支。**

- 这是进入 Step 2 分派分析的**前置条件**，未确认分支不得开始排查
- 确认后，后端专家将在指定分支上进行代码定位
- 如用户提供的分支在本地不存在，执行 `git fetch origin && git checkout [分支名]`

### 1.6 前端分支处理（按需）

前端分支**不要求排查前必须提供**，但在以下情况需向用户询问：
- 前端专家在 `E:\workspace\handday-web` 中找不到对应的页面/接口调用
- 代码版本明显与bug描述不符（功能不存在、接口路径已变更）
- 需要对比特定版本的前端逻辑

### 1.7 前后端归属预判

根据采集到的信息，初步判断：

| 判断依据 | 归属 |
|----------|------|
| 有后端异常堆栈 / 接口500 / 数据错误 | → 后端 |
| 页面渲染异常 / JS报错 / 交互失效 / 样式问题 | → 前端 |
| 接口返回正确但展示错误 | → 前端 |
| 无法确定 / 接口联调类问题 | → 先交前端定位 |

---

## Step 1.5: 环境日志抓取（可选 — 由 PM 自动决策）

> **本步骤为可选步骤**。PM 需根据 Step 1 采集到的信息，自动权衡是否需要先进行环境日志抓取，再进入前端→后端代码排查。日志抓取支持生产环境（上海）和测试环境（成都）双环境，根据 Bug 来源自动选择。大多数情况下工单不会直接暴露 traceId 或业务异常可能不产生堆栈日志，因此本步骤**非必须**，由 PM 智能判断。

### 1.5.1 触发条件检测

PM 在 Step 1 采集到的 Bug 描述、问题信息、图片、回复中，检测以下信号：

| 信号类型 | 特征 | 示例 |
|----------|------|------|
| **traceId** | `sm` 开头的一串码（32位左右），可能跟在"访问失败"等提示后面 | `sm93f1cf4db8c946028e5fbc71caa0a261` |
| **明显异常信息打印** | 异常堆栈、ERROR日志、错误码、接口报错截图 | `NullPointerException at com.handday...` |
| **指掌编号（corpId）** | 工单中存在的客户企业编号，无 traceId 时作为补充检索键 | `corpId: 123456` |

> **检索键优先级**：traceId 优先，corpId 补充。→ 详细规则详见 tccli-log-query/SKILL.md Step 2。工单采集时两者都应提取。

### 1.5.1.5 环境选择

> **根据 Bug 来源自动选择日志查询环境，避免无谓检索。**

| Bug 来源 | 识别特征 | 默认环境 | 是否需要向用户确认 |
|----------|---------|---------|-------------------|
| **工单** | GD编号 / `$WORKORDER_BASE_URL` 链接 | 生产环境（`$CLS_PROD_REGION`） | 否，直接查询 |
| **禅道** | `$ZENTAO_BASE_URL` 链接 / 纯数字Bug编号 | 测试环境（`$CLS_TEST_REGION`） | 否，直接查询 |
| **直接提供 traceId** | 用户直接给出 traceId，无工单/禅道来源 | — | **是，必须确认** |

> **环境选择铁律**：禁止两边都查、禁止跳过确认、环境不可更改。→ 详细规则详见 tccli-log-query/SKILL.md Step 0.5。

### 1.5.2 决策逻辑

PM 根据以下决策树判断是否启用日志抓取：

```
检测到 traceId、corpId 或明显异常信息？
├── 是 → 进一步判断：
│   ├── 信息已足够直接进入代码排查？→ 跳过日志抓取，直接进入 Step 2
│   └── 需要更多环境上下文辅助定位？→ 启用日志抓取（进入 1.5.3）
└── 否 → 跳过日志抓取，直接进入 Step 2
```

**决策考量因素**：
- **倾向启用日志抓取**：工单描述模糊但存在 traceId 或 corpId；异常信息不完整需要更多上下文；问题偶发难以从代码直接复现
- **倾向跳过日志抓取**：问题描述清晰且代码可直接定位；纯前端展示问题；已明确是功能需求而非异常

> **关键原则**：本步骤是可选的增强环节。如果信息已足够进入代码排查，不要为了"走流程"而强行查日志。反之，如果存在 traceId 但代码排查方向不明确，优先通过日志抓取获取线索。

### 1.5.3 派发腾讯云日志专家

> 🚫 **铁律：PM 不得自行执行日志查询。** 以下操作必须通过派发 `tencent-cloud-troubleshooter` subagent 完成，PM 不得直接加载 `tccli-log-query` skill 或执行任何 tccli 命令：
> - CLS 日志检索（SearchLog、DescribeLogHistogram、DescribeLogContext）
> - APM 链路查询（DescribeGeneralSpanList、DescribeGeneralOTSpanList、DescribeGeneralMetricData 等）
> - TCCLI 环境检查和认证（`tccli --version`、凭据文件检查、`tccli auth login`）
>
> **正确做法**：PM 将检索键、环境、查询目的组装为派发 prompt，交给 `tencent-cloud-troubleshooter` subagent 执行，等待其返回诊断报告。

当决策启用日志抓取时，PM 派发 `tencent-cloud-troubleshooter` subagent，prompt 中必须包含：

1. **检索键**（traceId 优先，无 traceId 时用 corpId 尽量传入；→ 优先级规则详见 tccli-log-query/SKILL.md Step 2）
2. **异常信息摘要**（已知的异常类型、错误码、报错信息）
3. **时间范围**（如工单中有提及问题发生时间）
4. **查询目的**：明确告知日志专家需要获取什么信息

**派发指令模板**：

```
请协助查询[生产/测试]环境日志，以下为已知信息：
- 查询环境: [生产(ap-shanghai) / 测试(ap-chengdu)]
  （工单来源→生产，禅道来源→测试，直接提供traceId→已向用户确认）
- 检索键:
  - traceId: [如有]
  - corpId: [如无 traceId 则尽量获取]
- 异常信息: [已知的异常摘要]
- 时间范围: [如知道则提供，否则默认15天]
- 查询目的: [如：确认异常根因/获取完整调用链/查看业务参数流转等]

请执行CLS日志检索和APM链路追踪（仅 traceId 场景支持 APM），返回结构化日志排查结果（含日志证据、链路证据、异常线索总结）。日志专家仅负责日志检索与结果交付，不负责代码层面的根因分析与修复建议。
```

### 1.5.4 日志结果处理

`tencent-cloud-troubleshooter` 返回日志排查结果后，PM 根据结果决定后续路径：

| 日志排查结果 | 后续路径 |
|----------|---------|
| **日志中发现异常线索**（NPE/逻辑错误/SQL异常等堆栈或错误信息） | 携带日志证据进入 Step 2 分派分析，日志信息作为排查线索补充给前后端专家 |
| **确认为业务异常**（非代码缺陷，而是业务规则触发的预期提示） | 进入 **Step 1.5.5 业务异常分析流程** |
| **日志查无结果**（过期/未打印） | 不阻塞流程，继续进入 Step 2 代码排查 |
| **环境未就绪**（TCCLI未安装/未配置） | 引导用户使用 `/tccli-setup` 技能完成配置后重试，或跳过日志抓取直接进入 Step 2 |

### 1.5.5 业务异常分析流程

> 当日志诊断结果显示本次为**业务异常**（非代码 Bug，而是业务规则触发的预期提示）时，工单客户可能只是想了解**为何会提示此业务异常**，或对系统不熟悉不能理解该业务异常的含义。

此时 PM 协调前后端专家通过代码协助定位业务逻辑，**不一定需要修复代码**，而是输出业务异常解释报告：

1. **派发后端专家**：根据日志中的接口信息和异常提示，定位触发该业务异常的代码位置（校验逻辑、业务规则判断等），理解触发条件和业务含义
2. **派发前端专家**（如需要）：定位该异常提示在前端的展示逻辑，确认用户操作路径和参数传递
3. **PM 汇总报告**：整合前后端定位结果，输出业务异常解释报告（格式见下文）

**业务异常解释报告格式**：

```
【业务异常解释报告】

## 异常概述
- 工单来源：[工单GDxxx]
- 异常提示：[用户看到的提示信息]
- 异常类型：业务规则校验异常（非代码缺陷）

## 触发原因
- 触发条件：[什么条件下会触发此提示]
- 业务规则：[该规则的业务含义和设计目的]

## 客户操作分析
- 操作路径：[客户在系统中的操作流程]
- 参数传递：[客户提交的关键参数及其值]
- 数据流转：[参数从前端→接口→后端校验的完整流转过程]

## 为何触发
- 具体原因：[结合客户操作参数和业务规则，说明为什么本次操作触发了此异常]
- 正确操作方式：[客户应如何正确操作以避免此提示]

## 结论
- 本次异常为系统正常业务校验逻辑触发，非代码缺陷
- [如需调整业务规则，建议提交需求工单]
- [如属客户操作不当，建议客服指导客户正确操作]
```

> **关键原则**：业务异常不等于代码 Bug。当确认是业务规则正常触发时，不强行修改代码，而是给出清晰的业务解释和正确操作指导。只有当业务规则本身有误或不合理时，才进入修复流程。

---

## Step 2: 分派分析（PM调度）

信息采集（及可选的日志抓取）完成后，PM 输出结构化摘要并分派：

```
【Bug信息摘要】
- 来源：[工单GDxxx / 禅道Bug#xxx / 用户描述]
- 现象：[一句话描述]
- 触发场景：[页面 + 操作]
- 初步归属：[前端 / 后端 / 待定]
- 关键线索：[堆栈/截图/错误码等]
- corpId：[客户企业编号，从工单提取，无则填"N/A"]
- 日志排查结果：[如执行了Step 1.5，填写日志抓取关键结论；未执行则填"N/A"]
```

### 分派规则

- **明确后端问题**：直接派发给 `senior-java-expert`
- **明确前端问题**：派发给 `frontend-bug-fixer`
- **不确定**：先派发给 `frontend-bug-fixer` 做页面和接口定位

### 分派指令模板

派发给 subagent 时，prompt 必须包含：
1. Bug完整信息摘要
2. 已知线索和排查方向
3. **日志排查结果**（如执行了 Step 1.5，将日志专家返回的关键日志、异常堆栈、调用链等线索一并传递）
4. 明确的交付要求（定位到代码行 + 根因 + 修复方案）

---

## Step 3: 协作排查

### 3.1 前端专家工作内容

派发给 `frontend-bug-fixer` subagent，prompt 中必须包含：
- **工作目录**：`E:\workspace\handday-web`
- **权限声明**：仅允许读取和搜索，禁止新增文件和提交
- **如版本不符**：暂停并回报PM，由PM向用户确认分支

要求交付：
- 根据问题描述定位具体页面组件（.vue文件路径）
- 找到触发问题的 API 调用（接口URL、请求方法、参数结构）
- 判断是否为纯前端问题
- 如果是后端问题，输出定位到的接口信息供后端使用

### 3.2 后端专家工作内容

派发给 `senior-java-expert` subagent，要求：
- **必须优先使用 `codegraph` 命令**做符号定位与调用链分析（见上文「代码检索工具：CodeGraph」），prompt 中需明确告知该约束
- 根据接口URL定位 Controller → Service → Mapper 调用链
- 分析异常根因或逻辑缺陷
- 确认影响范围（可用 `codegraph impact <符号>`）
- 给出精确的修复方案（改哪个文件、哪行、怎么改）

### 3.3 协作交互

当一方 agent 需要另一方支持时：
- 前端发现是接口问题 → PM 将前端定位结果转交后端专家
- 后端需要确认前端传参 → PM 将问题转交前端确认
- 可多轮交互，直到根因明确

### 3.4 排查结论为"无 Bug"的处理（禁止硬解）

当 subagent 排查后明确回报"未发现代码缺陷，当前行为符合预期"时，PM **禁止**要求 subagent 强行构造修复方案，应按以下流程处理：

1. **要求 subagent 输出排查证据**：包括检查了哪些文件/方法、为什么认为当前逻辑正确、可能的其他原因（如环境、数据、操作路径差异）
2. **PM 汇总后向用户如实反馈**，使用以下模板：

```
【排查结论：未发现代码缺陷】

## 排查过程
- 检查范围：[列出检查的文件/方法/调用链]
- 排查结论：[subagent 的详细结论]

## 当前代码行为分析
- 代码逻辑说明：[为什么当前行为是"正确的"]
- 可能的差异原因：[环境差异/数据差异/操作路径差异/版本差异等]

## 建议
- [建议用户核实的方向，如：确认复现步骤、检查环境配置、确认数据状态等]
- [如有必要，建议关闭工单或标记为"无法复现"]

---
是否还有其他信息需要补充排查？
```

3. **禁止硬解**：当排查结论为"无 Bug"时，**绝对不允许**为了"完成任务"而编造修复方案或修改正常代码
4. 如用户坚持认为有 Bug，PM 应请求更多上下文（日志、录屏、精确复现步骤），而非让 agent 强行修复

---

## Step 4: 汇报方案（PM）

排查完成后，PM 向用户输出完整报告：

```
【Bug排查报告】

## 问题概述
- 来源：[工单/禅道/用户反馈]
- 现象：[详细描述]

## 根因分析
- 问题类型：[NPE/逻辑错误/SQL问题/前端渲染/...]
- 根因说明：[为什么会出错]
- 代码位置：[文件路径#方法名:行号]

## 修复方案
- 修改文件：[文件列表]
- 具体改动：[每个文件要改什么]
- 影响范围：[其他受影响功能]

## 风险评估
- 回归风险：[高/中/低]
- 需要关注：[可能的副作用]

---
是否按照以上方案进行修复？(Y/N)
```

**必须等待用户确认后才执行修复。**

---

## Step 5: 修复实施

用户确认后：

1. **后端修复**：派发给 `senior-java-expert` 执行代码修改
2. **前端修复**（如需要）：派发给 `frontend-bug-fixer` 执行修改
3. **编译验证**：修改后运行 `mvn compile -pl [模块] -am` 确认编译通过

---

## Step 6: 代码审查

修复完成后，**自动**调用 `/code-review` skill 进行代码审查：
- 审查修改是否合理
- 检查是否引入新问题
- 确认代码风格一致性

审查通过后，进入 Step 7。

---

## Step 7: Git Commit 整理输出（必须执行）

> 修复完成且代码审查通过后，PM **必须**为用户整理一份完整的 Git Commit 信息并提供给用户。这是流程的**最后一步**，不得跳过。

### 7.1 收集 Commit 所需要素

从整个排查修复流程中提取以下信息：

| 要素 | 来源 | 说明 |
|------|------|------|
| **问题来源** | Step 1 采集 | 工单编号 / 禅道Bug编号 / 用户反馈 |
| **问题根因** | Step 3 排查 | 一句话说明根因（是什么、在哪里、为什么） |
| **解决方案** | Step 5 修复 | 改了什么文件、做了什么改动 |
| **影响范围** | Step 3/4 分析 | 涉及的模块/功能 |

### 7.2 生成 Commit Message

按以下格式融合生成简洁的 Commit Message：

```
fix: [一句话描述修复的问题]

问题来源: [工单GDxxx / 禅道Bug#xxx / 用户反馈]
问题根因: [简述根因，如：XX方法在YY条件下未做空值校验导致NPE]
解决方案: [简述修复方式，如：增加空值判断，补充默认值处理]
```

**示例**：

```
fix: 采购入库单批量生单时库存数量未校验导致NPE

问题来源: 工单GD2026052314140082
问题根因: BatchKeyUtil.generateBatchKey 在skuStock为空时直接调用getSize()未做空值判断
解决方案: 增加skuStock空值校验，为空时跳过该批次并记录警告日志
```

### 7.3 输出给用户

将生成的 Commit Message 以代码块形式提供给用户，并附上修改文件清单：

```
【Git Commit 信息】

建议的 Commit Message：

fix: 采购入库单批量生单时库存数量未校验导致NPE

问题来源: 工单GD2026052314140082
问题根因: BatchKeyUtil.generateBatchKey 在skuStock为空时直接调用getSize()未做空值判断
解决方案: 增加skuStock空值校验，为空时跳过该批次并记录警告日志

修改文件清单：
- billservice/.../BatchKeyUtil.java（第XX行：增加空值校验）
- billservice/.../StockBatchManager.java（第XX行：补充跳过逻辑）

---
请确认 Commit Message 是否需要调整，确认后可执行 git commit。
```

> **注意**：PM 仅**提供** Commit Message 文本，**不自动执行** `git commit`。由用户确认后自行提交或指示 PM 执行。

---

## 异常处理

| 异常场景 | 处理方式 |
|----------|---------|
| 链接需要登录 | 暂停流程，提示用户登录，等待确认后继续 |
| 信息严重不足 | 列出缺失项，请求用户补充 |
| 前后端均无法定位 | 向用户请求更多上下文（日志、复现步骤） |
| **排查后未发现 Bug** | **输出排查证据与"无缺陷"结论，禁止硬解，建议用户核实复现条件（见 3.4）** |
| 修复编译失败 | 回退修改，重新分析方案 |
| 代码审查不通过 | 根据审查意见修正后重新审查 |
| **TCCLI 未安装/未配置** | 引导用户使用 `/tccli-setup` 技能完成安装配置，或跳过日志抓取直接进入代码排查 |
| **日志抓取查无结果** | 不阻塞流程，继续进入 Step 2 代码排查，不因日志过期/未打印而卡住 |
| **确认为业务异常** | 按 Step 1.5.5 业务异常分析流程处理，输出业务异常解释报告，不强行修复代码 |

---

## 禅道Bug采集流程（待积累）

> 禅道Bug的自动化采集流程需要根据实际操作经验持续完善。
> 当前基本流程：
> 1. Browser subagent 打开禅道链接
> 2. 检测登录状态，未登录则提示用户
> 3. 登录后通过页面快照提取bug信息
> 4. 解析标题、步骤、截图等关键字段

---

## 关键原则

1. **🚫 PM 不亲自排查代码也不亲自查日志** — PM 只做编排调度和信息整合，代码排查派发给前后端专家 subagent，日志查询派发给 `tencent-cloud-troubleshooter` subagent。禁止 PM 直接执行 tccli 命令或加载 `tccli-log-query` skill（详见上方「PM 铁律」）
2. **信息不够不动手** — 宁可多问一句，不盲目排查
3. **先定位后修复** — 必须确认根因才能动手
4. **修复需用户授权** — 方案报告后等待确认
5. **修复必审查** — 改完代码必须 code-review
6. **链接单号即触发** — 给出工单/禅道链接或单号即可自动识别并执行全流程
7. **无 Bug 不硬解** — 排查后未发现问题时如实反馈，禁止编造修复方案（详见 Step 3.4）
8. **修复必出Commit** — 修复完成后必须整理输出 Git Commit 信息
9. **日志抓取按需启用** — 存在traceId/corpId/异常信息时PM自动权衡是否先抓日志（检索键优先级详见 tccli-log-query/SKILL.md Step 2）
10. **环境感知** — 工单→生产，禅道→测试，直接给traceId→必须向用户确认（详见 Step 1.5.1.5）
11. **业务异常≠代码Bug** — 确认为业务规则正常触发时输出业务解释报告而非强行修代码（详见 Step 1.5.5）
12. **日志专家只交付日志结果** — `tencent-cloud-troubleshooter` 仅负责日志检索与链路追踪，输出结构化日志排查结果交由PM决策，不负责代码层面的根因分析与修复建议。根因分析与修复由PM协调前后端代码专家完成。

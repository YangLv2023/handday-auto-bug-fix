---
name: handday-auto-bug-fix
description: 全自动Bug诊断与修复编排器。采用多Agent协作模式（PM + 信息接收员 + 前端专家 + 后端专家），接收bug链接/图片/描述后自动完成信息采集→分析定位→修复→代码审查全流程。支持工单和禅道两种bug来源。触发词：bug、报错、异常、fix、修复、错误、问题排查、堆栈、500、NPE、接口报错、工单bug、禅道bug。
---

# 全自动 Bug 修复 - 多Agent协作编排

## 角色定义

| 角色 | 执行者 | 职责 |
|------|--------|------|
| **PM（你自己）** | 主Agent | 流程编排、任务分配、协调各Agent、最终汇报 |
| **Bug信息接收员** | 主Agent内联执行 | 提取bug信息、判断前后端归属、与用户交互补充信息 |
| **前端专家** | `frontend-bug-fixer` subagent | 页面定位、接口追踪、前端问题分析 |
| **后端专家** | `senior-java-expert` subagent | Java代码定位、根因分析、修复实施 |

> **依赖说明**：
> - **subagent**：`frontend-bug-fixer`、`senior-java-expert`，配置模板随 skill 存放在 `agents/` 子目录。
> - **子 skill**：`handday-workorder`（用户级，备份在 `skills/` 子目录）、`code-review`（内置自带）。
>
> 新环境首次运行时，[Step 0](#step-0-环境初始化与依赖检查subagent--子-skill必须最先执行) 会自动检查并从备份初始化缺失的 subagent / 子 skill，无需手动安装。

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
Step 0: 环境初始化 → 用户输入Bug → Step 1: 信息采集 → Step 2: 分派分析 → Step 3: 协作排查 → Step 4: 汇报方案 → Step 5: 修复实施 → Step 6: 代码审查
```

---

## Step 0: 环境初始化与依赖检查（subagent + 子 skill，必须最先执行）

> 在执行任何 Bug 排查动作前，PM **必须**先完成本步骤，确保所依赖的 **subagent** 与 **子 skill** 在当前环境就绪。已就绪则跳过安装，**不重复安装**。

### 0.1 读取依赖清单

读取 skill 目录下的 `agents/manifest.json`，获取 `requiredSubagents` 与 `requiredSkills` 两份清单。当前依赖：

**subagent（备份在 `agents/`）**

| subagent | 角色 | 模板路径 |
|----------|------|---------|
| `frontend-bug-fixer` | 前端专家 | `agents/frontend-bug-fixer.md` |
| `senior-java-expert` | 后端专家 | `agents/senior-java-expert.md` |

**子 skill（备份在 `skills/`）**

| 子 skill | 角色 | 类型 | 备份路径 |
|----------|------|------|---------|
| `handday-workorder` | 工单信息采集 | user（需备份/安装） | `skills/handday-workorder/` |
| `code-review` | 代码审查 | builtin（内置自带） | 无需备份 |

### 0.2 检查 subagent 是否已存在

对每个 subagent，按优先级检查是否存在同名 `.md` 配置：

1. 项目级：`<项目根>/.qoder/agents/<name>.md`
2. 用户级：`~/.qoder/agents/<name>.md`（Windows 为 `C:\Users\<用户>\.qoder\agents\<name>.md`）

任一位置存在即视为**已就绪**，跳过创建，并在 `manifest.json` 的 `initStatus` 中回写 `present:true, source:"present"`。

### 0.3 subagent 不存在时按环境自动创建

若两个位置都不存在，则按当前编辑器环境触发创建流程（用户级目录 `~/.qoder/agents/` 为默认安装位置）：

| 环境 | 创建方式 |
|------|---------|
| **Qoder** | 调用 `/create-subagent` 命令，并以 `agents/<name>.md` 模板内容作为该 subagent 的配置（frontmatter + system prompt 直接复用模板） |
| **其他编辑器（如 Cursor/VSCode 等）** | 按该编辑器的 subagent/custom-agent 规范创建：将模板内容写入其约定的 agents 配置目录（无统一目录时，回退写入 `~/.qoder/agents/<name>.md`），保持 frontmatter 与正文一致 |

> 创建的本质：把 `agents/` 子目录下的模板**复制/落地**到环境的 agents 目录。模板是单一事实来源（single source of truth）。

### 0.4 检查子 skill 是否已存在

对 `requiredSkills` 中 `type` 为 `user` 的子 skill（如 `handday-workorder`），按优先级检查是否存在同名 skill 目录及其 `SKILL.md`：

1. 项目级：`<项目根>/.qoder/skills/<name>/SKILL.md`
2. 用户级：`~/.qoder/skills/<name>/SKILL.md`（Windows 为 `C:\Users\<用户>\.qoder\skills\<name>\SKILL.md`）

- 任一位置存在即视为**已就绪**，跳过安装。
- 对 `type` 为 `builtin` 的子 skill（如 `code-review`）：内置自带，**无需安装**，仅确认其在当前 skill 列表中可调用即可，`initStatus.source` 记为 `builtin`。

### 0.5 子 skill 缺失时从备份自动安装

若某 `user` 类型子 skill 两个位置都不存在，则从本 skill 的 `skills/<name>/` 备份安装（用户级 `~/.qoder/skills/` 为默认安装位置）：

| 环境 | 安装方式 |
|------|---------|
| **Qoder** | 将备份目录 `skills/<name>/` 下的全部文件（见 manifest `files`，如 `SKILL.md`、`api-reference.md`）完整复制到 `~/.qoder/skills/<name>/`，保持目录结构与文件名一致 |
| **其他编辑器** | 复制到该编辑器约定的 skills 目录；无统一目录时回退到 `~/.qoder/skills/<name>/` |

> 安装的本质：把 `skills/<name>/` 备份**整目录复制**到环境的 skills 目录。备份是单一事实来源，必须包含 manifest `files` 列出的所有文件。

### 0.6 记录初始化状态（避免重复安装）

完成检查/创建/安装后，回写 `agents/manifest.json` 的 `initStatus`：

```json
"frontend-bug-fixer": { "present": true, "source": "created",   "checkedAt": "<时间>" },
"handday-workorder":  { "present": true, "source": "installed", "checkedAt": "<时间>" },
"code-review":        { "present": true, "source": "builtin",   "checkedAt": "<时间>" }
```

- `source` 取值：`present`（环境已有）/ `created`（subagent 本次新建）/ `installed`（子 skill 本次从备份安装）/ `builtin`（内置自带）/ `template`（仅备份就绪待装）
- 下次运行先看 `initStatus`：已 `present:true` 的项直接跳过，不再检查与安装

### 0.7 校验通过后进入主流程

仅当所有 `required:true` 的 subagent 与子 skill 均就绪，方可进入 Step 1。若某必需依赖创建/安装失败，暂停并提示用户手动处理后再继续。

---

## Step 1: Bug信息采集（PM + 接收员）

PM 接到用户输入后，立即进入信息采集模式：

### 1.1 识别Bug来源

| 来源类型 | 识别特征 | 采集方式 |
|----------|---------|---------|
| **工单** | 包含 "GD" 开头编号或 os.handday.com 链接 | 使用 `/handday-workorder` skill 获取工单详情和图片 |
| **禅道Bug** | 包含 chandao.facehand.cn/bug-view-{id}.html | 通过浏览器打开页面提取信息（见禅道采集流程） |
| **用户描述** | 纯文字/截图/错误信息 | 直接解析提取 |

### 1.2 工单信息采集

直接调用 `/handday-workorder` skill 查询工单，获取：
- 工单标题、描述、截图
- 问题类型、优先级
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

## Step 2: 分派分析（PM调度）

信息采集完成后，PM 输出结构化摘要并分派：

```
【Bug信息摘要】
- 来源：[工单GDxxx / 禅道Bug#xxx / 用户描述]
- 现象：[一句话描述]
- 触发场景：[页面 + 操作]
- 初步归属：[前端 / 后端 / 待定]
- 关键线索：[堆栈/截图/错误码等]
```

### 分派规则

- **明确后端问题**：直接派发给 `senior-java-expert`
- **明确前端问题**：派发给 `frontend-bug-fixer`
- **不确定**：先派发给 `frontend-bug-fixer` 做页面和接口定位

### 分派指令模板

派发给 subagent 时，prompt 必须包含：
1. Bug完整信息摘要
2. 已知线索和排查方向
3. 明确的交付要求（定位到代码行 + 根因 + 修复方案）

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

审查通过后，输出最终完成报告。

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

1. **PM不亲自排查代码** —— 只做编排调度和信息整合
2. **信息不够不动手** —— 宁可多问一句，不盲目排查
3. **先定位后修复** —— 必须确认根因才能动手
4. **修复需用户授权** —— 方案报告后等待确认
5. **修复必审查** —— 改完代码必须 code-review
6. **无 Bug 不硬解** —— 排查后未发现问题时，如实反馈，禁止编造修复方案

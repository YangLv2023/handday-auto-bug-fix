---
name: tccli-log-query
description: Query Tencent Cloud CLS logs and APM traces via TCCLI for problem diagnosis. Supports both production (ap-shanghai) and test (ap-chengdu) environments. Supports log search (SearchLog), log histogram (DescribeLogHistogram), log context (DescribeLogContext), APM metric data (DescribeGeneralMetricData), OT span list (DescribeGeneralOTSpanList), span list (DescribeGeneralSpanList), and application config (DescribeApmApplicationConfig). Use when debugging exceptions, analyzing production/test issues, tracing errors by traceId, investigating service crashes, or querying logs from workorder/bug reports. 触发词：查日志、检索日志、日志查询、链路查询、traceId查询、trace追踪、生产问题排查、测试环境问题排查、服务崩溃分析、异常排查、工单问题定位、禅道bug排查、cls SearchLog、apm查询。
---

# TCCLI 日志检索与链路查询

通过腾讯云 CLI (TCCLI) 检索 CLS 日志和查询 APM 链路，用于问题诊断和生产故障分析。

> **⚠️ 路由规则（加载前必须判断）**：
>
> 本 skill **仅限 `tencent-cloud-troubleshooter` subagent 加载和执行**。在加载本 skill 之前，必须先判断当前角色：
>
> | 当前角色 | 是否允许加载本 skill | 正确做法 |
> |----------|---------------------|---------|
> | `tencent-cloud-troubleshooter` subagent | ✅ 允许 | 直接加载并执行本 skill |
> | PM（主编排 Agent） | 🚫 **禁止** | 立即停止加载，改为派发 `tencent-cloud-troubleshooter` subagent，或加载 `handday-auto-bug-fix` 进入完整编排流程 |
> | 其他 subagent | 🚫 **禁止** | 立即停止加载，将日志查询需求交由 PM 协调派发 `tencent-cloud-troubleshooter` subagent |
>
> **如果你不是 `tencent-cloud-troubleshooter` subagent，请立即停止，不要继续加载本 skill。**

> **归属声明**：本 skill 是 `tencent-cloud-troubleshooter` subagent 的**专属内部依赖 skill**，不是 PM 或其他 subagent 的可用工具。
> - 在 `handday-auto-bug-fix` 编排流程中：仅 `tencent-cloud-troubleshooter` subagent 有权加载和使用本 skill。PM（主编排 Agent）不得直接加载或执行本 skill 中的任何命令，必须通过派发 subagent 完成。
> - 即使用户独立触发日志查询（未通过 handday-auto-bug-fix 流程），PM 也应派发 `tencent-cloud-troubleshooter` subagent 执行查询，不应直接加载本 skill。

## 铁律（不可违反）

> **本 skill 仅限只读查询操作，坚决不允许执行任何对云资源的增、删、改操作。**
>
> - **核心查询命令**（均带 `--cli-unfold-argument` 参数展开）：
>   - `tccli cls SearchLog` — 检索日志
>   - `tccli cls DescribeLogHistogram` — 日志数量直方图
>   - `tccli cls DescribeLogContext` — 日志上下文
>   - `tccli apm DescribeGeneralMetricData` — APM 指标数据
>   - `tccli apm DescribeGeneralOTSpanList` — OT 调用链列表
>   - `tccli apm DescribeGeneralSpanList` — 调用链列表
>   - `tccli apm DescribeApmApplicationConfig` — 应用配置查询
> - **可扩展范围**：不局限于上述7个命令，当问题排查需要更多信息时，可执行与这些命令性质相同的**只读查询**操作。包括但不限于：
>   - 获取查询所需的前置信息（如 `cls DescribeTopics` 查日志主题列表、`cls DescribeLogsets` 查日志集列表、`apm DescribeApmInstances` 查 APM 实例列表等）
>   - 获取相关联的只读查询（如 `cls DescribeIndex` 查索引配置、`apm DescribeServiceOverview` 查服务概览等）
>   - 任何以 `Search`、`Describe`、`Query`、`Get`、`List` 开头的只读查询命令
> - **坚决禁止**：执行任何**增、删、改**操作，无论用户是否明确要求，均不得代为执行。包括但不限于 Create/Modify/Delete/Run/Start/Stop/Terminate/Upload/Merge/Split/Open/Close 等写操作
> - **正确做法**：聚焦于"通过日志和链路数据发现问题线索"，执行一切必要的只读查询来获取问题线索，绝不触碰写操作
>
> **环境选择铁律**：详见 Step 0.5
>
> **APM Region 铁律**：所有 APM 命令**必须显式指定 `--region`**，严禁依赖 TCCLI 默认地域。APM 返回 `TotalCount: 0` 时，第一优先排查项就是 `--region` 是否正确。
> - 生产环境 APM：`--region ap-shanghai`
> - 测试环境 APM：`--region ap-chengdu`

---

## 环境配置加载（前置步骤）

> **所有敏感配置值（TopicId、LogsetId、Region、内部系统地址）均从项目根目录 `.env` 文件读取，禁止在文档中硬编码。**
>
> `.env` 文件已排除在 Git 追踪之外（见 `.gitignore`）。模板见 `.env.example`。

### 加载方式

执行任何查询前，先读取项目根目录的 `.env` 文件：

```bash
# 读取 .env 文件（如存在）
cat <project-root>/.env
```

解析出以下环境变量：

| 环境变量 | 说明 |
|----------|------|
| `CLS_PROD_TOPIC_ID` | 生产环境日志主题 ID |
| `CLS_PROD_LOGSET_ID` | 生产环境日志集 ID |
| `CLS_PROD_REGION` | 生产环境地域（默认 ap-shanghai） |
| `CLS_TEST_TOPIC_ID` | 测试环境日志主题 ID |
| `CLS_TEST_LOGSET_ID` | 测试环境日志集 ID |
| `CLS_TEST_REGION` | 测试环境地域（默认 ap-chengdu） |
| `WORKORDER_BASE_URL` | 工单系统地址 |
| `ZENTAO_BASE_URL` | 禅道系统地址 |

> **缺失处理**：如 `.env` 文件不存在或某项为空，**必须主动询问用户**提供对应值，不得猜测或使用硬编码默认值。

---

## 工作流程

```
Step 0: 需求澄清 → Step 0.5: 环境选择 → Step 1: 环境检查 → Step 2: 收集问题线索 → Step 3: 构建查询 → Step 4: 执行查询 → Step 5: 分析结果
```

---

## Step 0: 需求澄清

> **当用户需求模糊时，必须先要求用户明确查询意图，再执行后续步骤。**

### 判断标准

用户触发本 skill 时，先判断需求是否清晰：

| 用户表述 | 判断结果 | 处理方式 |
|----------|---------|---------|
| 明确提到"查日志"、"看日志"、"检索日志" | 意图明确：查询日志 | 直接进入 Step 1 |
| 明确提到"查链路"、"查trace"、"看调用链" | 意图明确：查询链路 | 直接进入 Step 1 |
| 明确提到 traceId 且要求同时查日志和链路 | 意图明确：两者都查 | 直接进入 Step 1 |
| 只说"排查问题"、"看看什么情况"、"帮我查一下" | **意图模糊** | 必须澄清 |
| 只给了 bug 描述/工单但未说明要查什么 | **意图模糊** | 必须澄清 |

### 澄清话术

当意图模糊时，向用户说明并要求选择：

> 「请问您需要我执行哪种查询？
> 1. **查询日志** — 通过 CLS 检索日志，获取报错信息、异常堆栈、关键业务日志等有用信息
> 2. **查询链路** — 通过 APM 查询调用链，分析请求耗时、服务调用关系、Span 详情
>
> 如果不确定，建议先查日志获取有用信息，再查链路进行深入分析。请提供 **traceId**（必填）或 **corpId**（无 traceId 时尽量提供）以便查询。」

### 澄清后处理

| 用户选择 | 后续动作 |
|----------|---------|
| 查询日志 | 重点走 CLS 查询路径（SearchLog → DescribeLogHistogram → DescribeLogContext） |
| 查询链路 | 重点走 APM 查询路径（DescribeGeneralSpanList → DescribeGeneralOTSpanList → DescribeGeneralMetricData） |
| 两者都查 | 先查日志获取信息线索，再查链路进行深入分析 |
| 仍未明确 | 默认先查询日志（更快速获取问题线索），有需要再查链路 |

> **注意**：无论选择哪种，**traceId 为首选检索键**。有 traceId 时以 traceId 检索（不需要 corpId）；无 traceId 时需尽量获取 corpId 作为补充检索键（corpId 通常需搭配 level、message、throwable 等条件组合检索，不宜单独使用）。若用户两者都未提供，需在澄清时一并要求，尽可能获取 corpId。

---

## Step 0.5: 环境选择

> **根据 Bug 来源自动选择查询环境，避免无谓检索。**

### 环境配置

> 以下值均从 `.env` 文件读取，变量名见「环境配置加载」章节。

| 配置项 | 生产环境 | 测试环境 |
|--------|---------|----------|
| 地域 | `$CLS_PROD_REGION` | `$CLS_TEST_REGION` |
| 日志集 ID | `$CLS_PROD_LOGSET_ID` | `$CLS_TEST_LOGSET_ID` |
| 日志主题 ID (TopicId) | `$CLS_PROD_TOPIC_ID` | `$CLS_TEST_TOPIC_ID` |

### 选择规则

根据 Bug 来源自动判断查询环境：

| Bug 来源 | 识别特征 | 默认环境 | 是否需要向用户确认 |
|----------|---------|---------|-------------------|
| **工单** | GD编号 / `$WORKORDER_BASE_URL` 链接 | 生产环境（`$CLS_PROD_REGION`） | 否，直接查询 |
| **禅道** | `$ZENTAO_BASE_URL` 链接 / 纯数字Bug编号 | 测试环境（`$CLS_TEST_REGION`） | 否，直接查询 |
| **直接提供 traceId** | 用户直接给出 traceId | — | **是，必须确认** |

> **环境选择铁律（不可违反）**：
> 1. **禁止两边都查** — 每次查询只能选择一个环境执行，严禁同时或先后查询生产+测试两个环境。不得以"我先两边都查一下"、"两个环境都试试"等理由绕过此规则。
> 2. **禁止跳过确认** — 当 Bug 来源为"直接提供 traceId"时，在用户明确回复确认环境之前，**严禁执行任何 tccli 查询命令**（包括 SearchLog、DescribeLogHistogram、DescribeLogContext 等）。必须等待用户选择后，才按选择的环境执行查询。
> 3. **环境不可更改** — 一旦根据规则确定环境（或用户确认环境），后续所有查询命令必须使用该环境的 region 和 TopicId，中途不得切换或追加另一个环境。

### 确认话术

当需要向用户确认环境时：

> 「请问这个 traceId 属于哪个环境？
> 1. **生产环境** — `$CLS_PROD_REGION`
> 2. **测试环境** — `$CLS_TEST_REGION`
>
> 请确认后我将执行对应环境的日志检索。」

---

## Step 1: 环境检查

执行查询前，必须确认 TCCLI 已安装且已配置认证。

### 检查命令

**Windows (PowerShell)**:
```powershell
tccli --version
Test-Path "$env:USERPROFILE\.tccli\default.credential"
```

**Linux/macOS**:
```bash
tccli --version
ls ~/.tccli/default.credential
```

### 判断逻辑

| 检查结果 | 处理方式 |
|----------|---------|
| tccli 已安装且凭据文件存在 | 进入 Step 2 |
| tccli 未安装或凭据文件不存在 | 提示用户执行 `/tccli-setup` 技能完成安装和配置，配置完成后再继续 |
| 凭据文件存在但查询报认证错误 | → 详见下方「认证异常自动恢复」 |

> **注意**：如环境未就绪，不要自行安装或配置，引导用户使用 `/tccli-setup` 技能。

### 认证异常自动恢复

查询过程中遇到以下认证异常时，**必须自动执行恢复流程**，不得仅提示用户手动处理：

#### Token 失效重认证流程

> **触发条件**：AuthFailure、token过期、密钥失效。必须先删除旧凭据文件再重新登录，禁止在旧文件上直接覆盖。

```powershell
# ① 删除旧凭据文件（Windows）
Remove-Item "$env:USERPROFILE\.tccli\default.credential" -Force -ErrorAction SilentlyContinue
# Linux: rm -f ~/.tccli/default.credential

# ② 重新登录授权
tccli auth login

# ③ 验证新凭据（Windows）
Test-Path "$env:USERPROFILE\.tccli\default.credential"
```

> 完整流程详见 `/tccli-setup` 技能。

#### SecretId 读取 Bug 绕过方案

> **TCCLI 已知 Bug**：浏览器授权登录（`tccli auth login`）成功后，凭据文件已写入，但后续命令读取凭据失败，报「SecretId 不存在」。触发条件：登录成功 + 凭据文件存在 + 命令报 SecretId 不存在。

**步骤一：从凭据文件提取密钥**

```powershell
# Windows (PowerShell)
$cred = Get-Content "$env:USERPROFILE\.tccli\default.credential" | ConvertFrom-Json
$secretId = $cred.secretId
$secretKey = $cred.secretKey
$token = $cred.token
```

```bash
# Linux/macOS
secretId=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['secretId'])")
secretKey=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['secretKey'])")
token=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['token'])")
```

**步骤二：后续所有命令通过参数传递密钥**

触发此 Bug 后，**当前会话剩余的所有 tccli 命令**均追加 `--secretId`、`--secretKey`、`--token` 参数：

```powershell
# 示例
tccli cls SearchLog --cli-unfold-argument `
    --secretId $secretId `
    --secretKey $secretKey `
    --token $token `
    --region <环境对应Region> `
    --TopicId <TopicId> --From <From> --To <To> --QueryString 'traceId:xxx'
```

> **关键规则**：三参数缺一不可（即使 token 为空也需传递 `--token ""`）；密钥值从 `default.credential` 文件读取，不以明文写在文档中。完整说明详见 `/tccli-setup` 技能。

> 恢复后重试之前失败的查询命令。

---

## Step 2: 收集问题线索

从用户提供的信息中提取查询关键要素：

| 信息来源 | 提取要素 | 查询策略 |
|----------|---------|---------|
| 异常堆栈 | 异常类型、类名、方法名 | 结合 traceId 检索 CLS 日志 |
| 工单/Bug描述 | traceId、corpId、报错时间 | 有 traceId 用 traceId，无 traceId 用 corpId 检索 |
| traceId | 完整 traceId | **首选检索键**，有 traceId 时优先使用，用于 CLS 日志检索和 APM Span 链路查询 |
| 错误码 | HTTP状态码、业务错误码 | 结合 traceId 过滤检索 |
| 服务崩溃 | 崩溃时间、服务名、OOM/异常退出 | 结合 traceId 按时间范围检索 |

### 关键要素清单

构建查询前需确认：
- **检索键优先级**：
  - **首选：traceId** — 有 traceId 时以 traceId 为唯一检索键，不需要 corpId（traceId 已精确到单次请求）
  - **补充：corpId** — 无 traceId 时尽量获取 corpId 作为补充检索键，按客户企业范围缩小日志范围。corpId **不是必须项**，但尽量传入以提高检索精度；已知信息中没有时，主动向用户获取
  - **corpId 搭配原则**：corpId 通常**不单独使用**，需搭配 `level`、`message`、`throwable`、时间范围等条件组合检索
  - **两者都没有时**：需向用户索要，优先获取 traceId，其次获取 corpId
- **时间范围**：默认查询15天，最大不超过30天（问题发生的大致时间精确到分钟级最佳）
- **附加过滤条件**：可根据情况组合使用 `level`、`message`、`throwable` 字段
  - **level**：必须同时覆盖 `ERROR` 和 `WARN`（`level:ERROR OR level:WARN`）。WARN 级别日志不可遗漏——许多异常在被捕获后以 WARN 级别记录，仅检索 `level:ERROR` 会漏掉这些关键线索
  - **message**：**关键字段**，可能包含完整异常堆栈信息，应作为重点检索和分析对象
  - **throwable**：异常类型字段，用于精确过滤特定异常
- **TopicId（按环境选择）**：根据 Step 0.5 选择的环境确定。
- **InstanceId**：APM 业务系统 ID（APM 查询必填，需根据实际环境确认）

> **重要**：CLS 日志查询的主题和地域根据 Step 0.5 选择的环境确定，TopicId 和 Region 均从 `.env` 文件读取。不查询其他日志主题。
>
> **APM 链路查询限制**：APM 链路查询（DescribeGeneralSpanList 等）**仅支持 traceId 检索**，不支持 corpId。当只有 corpId 无 traceId 时，仅执行 CLS 日志检索，跳过 APM 链路查询。

---

## Step 3: 构建查询

> **环境参数映射**：以下命令示例以生产环境为例，TopicId 和 Region 从 `.env` 读取。测试环境替换为 `$CLS_TEST_REGION` 和 `$CLS_TEST_TOPIC_ID`（详见 Step 0.5）。
>
> **Windows 编码**：每条 tccli 命令前设置 `$env:PYTHONUTF8="1"`。
>
> **时间戳精度**：CLS 用毫秒，APM 用秒，切勿混淆。

### 3.1 CLS 日志检索

#### SearchLog — 检索日志（核心命令）

```bash
$env:PYTHONUTF8="1"; tccli cls SearchLog --cli-unfold-argument `
    --region $CLS_PROD_REGION `
    --TopicId $CLS_PROD_TOPIC_ID `
    --From <起始时间戳毫秒> `
    --To <结束时间戳毫秒> `
    --QueryString 'traceId:<traceId值>' `
    --Limit 100 --Sort desc
```

**检索语法（CQL）**：
- 有 traceId：`traceId:abc123`（唯一检索键，不需要 corpId）
- 无 traceId 有 corpId：`corpId:123456 AND (level:ERROR OR level:WARN)`（需搭配其他条件，不宜单独使用）
- 组合过滤：`traceId:abc123 AND (level:ERROR OR level:WARN) AND throwable:NullPointerException`
- message 检索：`traceId:abc123 AND message:"异常关键词"` — message 字段可能包含完整异常堆栈，是重要检索维度
- 支持 `level`、`message`、`throwable` 等字段组合，使用 `AND`/`OR` 进行逻辑连接

> 查询时间范围默认15天，最大不超过30天。

#### 其他 CLS 命令

| 命令 | 用途 | 关键参数 |
|------|------|---------|
| `DescribeLogHistogram` | 日志分布趋势 | `--Interval`（毫秒）、`--Query`、`--SyntaxRule 1` |
| `DescribeLogContext` | 日志上下文 | `--BTime`、`--PkgId`、`--PkgLogId`（来自 SearchLog 返回） |

> 详细参数和示例 → 详见 [api-reference.md](api-reference.md)

### 3.2 APM 链路查询

#### DescribeGeneralSpanList — 按 TraceId 查询调用链（核心命令）

```bash
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralSpanList --region $CLS_PROD_REGION --cli-unfold-argument `
    --InstanceId <APM实例ID> `
    --StartTime <起始时间戳秒> `
    --EndTime <结束时间戳秒> `
    --Filters.0.Key traceID --Filters.0.Type = --Filters.0.Value <traceId值> `
    --Limit 100
```

#### 其他 APM 命令

| 命令 | 用途 | 注意事项 |
|------|------|---------|
| `DescribeGeneralOTSpanList` | OT 调用链查询 | Spans 字段需 Base64 解码 + gzip 解压 + UTF-8 转字符串 |
| `DescribeGeneralMetricData` | 指标数据查询 | 常用 ViewName: `service_metric`/`db_metric`；Period: 0=汇总, 1=时间序列 |
| `DescribeApmApplicationConfig` | 应用配置查询 | 返回探针配置、熔断阈值等 |

> 详细参数和示例 → 详见 [api-reference.md](api-reference.md)

> **APM 链路查询限制**：仅支持 traceId 检索，不支持 corpId。当只有 corpId 无 traceId 时，仅执行 CLS 日志检索。

---

## Step 4: 执行查询

### Windows 编码处理

**Windows 环境下必须设置 UTF-8 编码**，否则 tccli 输出中文会乱码：

```powershell
$env:PYTHONUTF8="1"
```

在每条 tccli 命令前加上此设置，或在会话开始时统一设置。

### PowerShell 输出重定向编码

PowerShell 的 `>` 重定向符输出的是 **UTF-16 LE** 编码文件（带 BOM `0xFF 0xFE`）。后续用 Python `json.load()` 读取时如果不指定 `encoding='utf-16'` 会报 `UnicodeDecodeError`。

**推荐做法**：用 `| Out-File -Encoding utf8` 替代 `>` 重定向：

```powershell
# ❌ 错误：> 重定向输出 UTF-16 LE
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralSpanList --region ap-shanghai --cli-unfold-argument ... > output.json

# ✅ 正确：Out-File 指定 UTF-8
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralSpanList --region ap-shanghai --cli-unfold-argument ... | Out-File -Encoding utf8 output.json
```

如已用 `>` 重定向，Python 读取时需指定编码：

```python
with open('output.json', 'r', encoding='utf-16') as f:
    data = json.load(f)
```

### 时间戳转换

CLS 时间戳为**毫秒**，APM 时间戳为**秒**，注意区分：

```powershell
# 当前时间戳（秒）
[int](Get-Date -UFormat %s)

# 当前时间戳（毫秒）
[int64]([datetime]::UtcNow - [datetime]'1970-01-01').TotalMilliseconds

# 指定时间转毫秒时间戳
[int64]([datetime]"2024-01-15 10:30:00" - [datetime]'1970-01-01').TotalMilliseconds

# 默认查询15天范围的起始时间戳（毫秒）
$now = [int64]([datetime]::UtcNow - [datetime]'1970-01-01').TotalMilliseconds
$from = $now - 15 * 24 * 60 * 60 * 1000  # 15天前
```

### 查询重试限制（防循环）

> **铁律：最多尝试5次不同查询，无论成功或失败都必须返回结果并结束循环。**
>
> 日志可能因过期失效或未打印而查不到，**查不到是可接受的**，切不可无限重试浪费资源。

#### 查询策略（按检索键分场景）

> **日志级别范围铁律**：查询时必须同时覆盖 ERROR 和 WARN 级别。WARN 日志不可遗漏——许多异常在被捕获后以 WARN 级别记录（如 `catch` 块中 `log.warn(e)` 而非 `log.error(e)`），且 `message` 字段可能包含完整异常堆栈。仅检索 `level:ERROR` 会漏掉这些关键线索。

**场景A：有 traceId 时（以 traceId 为唯一检索键）**

```
第1次：traceId AND (level:ERROR OR level:WARN) → 检索 ERROR 和 WARN 级别日志
第2次：traceId AND (level:ERROR OR level:WARN) AND throwable:异常类型 → 加异常类型精确过滤
第3次：traceId AND message:关键词 → 按 message 内容检索（message 可能含异常堆栈）
第4次：traceId → 放宽 level 条件，查全部级别
第5次：traceId → 仅用 traceId 检索，放宽所有附加条件
```

**场景B：无 traceId 但有 corpId 时（corpId 为补充检索键，需搭配其他条件）**

```
第1次：corpId AND (level:ERROR OR level:WARN) → 按客户企业 + ERROR/WARN 级别检索
第2次：corpId AND (level:ERROR OR level:WARN) AND throwable:异常类型 → 加异常类型精确过滤
第3次：corpId AND message:关键词 → 按 message 内容检索（message 可能含异常堆栈）
第4次：corpId → 放宽 level 条件，查全部级别（corpId 单独使用作为最后手段）
第5次：corpId + 时间范围缩小 → 缩小时间范围到问题发生时段检索
```

> **corpId 使用要点**：corpId 通常是缩小客户企业范围的补充条件，不宜单独作为唯一检索项。前几次查询应尽量搭配 level、throwable、message 等条件，最后才放宽到仅用 corpId。

#### 执行规则

1. 每次查询使用不同的条件组合，逐步放宽过滤条件
2. 5次查询后有结果则返回；无结果也**必须停止并告知用户**
3. **坚决禁止**无限循环、反复尝试相同条件
4. 查询失败（接口报错、超时）同样计入5次限制，不额外增加重试
5. 返回结果时说明：已尝试了哪些查询条件，最终是否获取到日志

#### 查询为空时的处理

查询返回空结果可能原因：
- 日志已过期（超过存储周期，默认7天）
- 日志未打印（应用未输出该 traceId 的日志）
- traceId 不正确或格式有误

> 遇到空结果时，直接进入下一次查询或结束，不要在同一条件下反复重试。

### 分页查询

SearchLog 返回 `Context` 字段，透传可获取后续日志（最多1万条，过期1小时）：

```bash
# 第二次查询，透传 Context
$env:PYTHONUTF8="1"; tccli cls SearchLog --cli-unfold-argument `
    --region <环境对应地域> `
    --TopicId <环境对应TopicId> `
    --From <From> --To <To> `
    --QueryString 'traceId:<traceId值>' --Context <上次返回的Context>
```

---

## Step 5: 分析结果

### 日志分析要点

| 分析场景 | 关注字段 | 方法 |
|----------|---------|------|
| 异常根因 | Results.Content 中的异常堆栈 | 搜索 ERROR/WARN/Exception 关键词 |
| message 字段分析 | message 中的异常堆栈信息 | message 可能包含完整堆栈，需重点检查，不可忽略 |
| WARN 日志分析 | WARN 级别日志中的异常信息 | WARN 可能记录了被捕获的异常，需检查 throwable 和 message |
| 时间线 | DescribeLogHistogram 分布 | 观察错误集中时间段 |
| 上下文关联 | DescribeLogContext 前后日志 | 查看异常前后系统状态 |
| 调用链断裂 | SpanList 中 duration 异常的 Span | 按 duration 降序排列 |
| 慢请求 | MetricData duration_avg | 对比正常时段指标 |
| 服务崩溃 | ERROR/WARN 日志 + OOM/OutOfMemory | 按崩溃时间点检索 |

### 常见问题排查模式

**模式一：traceId 追踪**
1. 用 traceId 查 `DescribeGeneralSpanList` 获取完整调用链
2. 找到耗时最长或报错的 Span
3. 用 Span 时间戳查对应 CLS 日志确认根因

**模式二：异常时间排查**
1. 用 `DescribeLogHistogram` 确认错误日志集中时间段
2. 用 `SearchLog` 检索该时段 ERROR/WARN 日志
3. 用 `DescribeLogContext` 查看关键日志上下文

**模式三：服务性能下降**
1. 用 `DescribeGeneralMetricData` 查看 request_count/duration_avg 趋势
2. 对比正常时段与异常时段指标
3. 用 `DescribeApmApplicationConfig` 确认探针配置是否变更

---

## 异常处理

| 异常场景 | 处理方式 |
|----------|---------|
| 认证失败 / SecretId 读取 Bug | → 详见 Step 1「认证异常自动恢复」 |
| CLS 查询地域错误 | 确保与 Step 0.5 选择的环境一致 |
| 返回空结果 | 进入下一次查询（计入5次限制），不无限重试 |
| InstanceId 无效 | 通过 `apm DescribeApmInstances` 只读查询获取 |
| 查询超时 | 缩小时间范围或减少 Limit 值后重试（计入5次限制） |
| 5次查询均无结果 | 告知用户日志可能已过期或未打印，返回查询条件摘要 |
| Windows 中文乱码 | 确认已设置 `$env:PYTHONUTF8="1"` |
| 配额超限 | 降低查询频率，单主题并发不超过15 |
| **APM 查询返回 TotalCount: 0（即使无 Filter）** | ①检查 `--region` → ②检查 `--InstanceId` 是否带 `apm-` 前缀 → ③用 `tccli apm DescribeGeneralSpanList help --detail` 查看参数格式 → ④检查 `tccli configure list` 确认当前 region 默认值 → ⑤用 `DescribeApmInstances` 确认实例存在 |

### 查询失败自救口诀

当查询持续返回空结果或报错时，按以下顺序排查：

1. **先查 help**：`tccli apm <接口名> help --detail` — 看参数格式、示例、必填项
2. **再查 region**：`tccli configure list` — 确认默认 region 是否匹配目标环境
3. **后查实例**：`tccli apm DescribeApmInstances` — 确认实例存在且有权限
4. **最后排查**：缩小时间范围、去掉所有 Filter 测试基础连通性

### APM 返回 TotalCount: 0 的排错速查

| 检查项 | 命令 | 判断 |
|--------|------|------|
| Region 是否正确 | `tccli configure list` 查看默认 region | 默认可能是 ap-guangzhou，APM 需显式指定 |
| 实例是否存在 | `tccli apm DescribeApmInstances --region <目标region>` | 确认 InstanceId 带 `apm-` 前缀 |
| 时间范围是否覆盖 | 从控制台 URL 获取 from/to 参数 | 毫秒转秒：除以 1000 |
| 权限是否足够 | `DescribeApmInstances` 能返回但 SpanList 返回 0 | 可能是子账号权限不足 |

---

## 关键原则

1. **需求澄清** — 用户需求模糊时必须先要求明确：查日志还是查链路（详见 Step 0）
2. **只读查询** — 执行一切必要的只读查询，坚决不执行任何增删改操作（详见铁律）
3. **检索键优先级** — traceId 优先，corpId 补充（详见 Step 2）
4. **环境选择** — 按来源选定环境，禁止两边都查（详见 Step 0.5）
5. **重试上限** — 最多5次不同查询，禁止无限循环（详见 Step 4）
6. **环境依赖** — TCCLI 未就绪时引导用户使用 `/tccli-setup` 技能；认证异常自动恢复（详见 Step 1）
7. **时间约束** — 默认查询15天范围，最大不超过30天
8. **编码优先** — Windows 下每条 tccli 命令前必须设置 `$env:PYTHONUTF8="1"` 避免中文乱码
9. **时间精度** — CLS 用毫秒时间戳，APM 用秒时间戳，切勿混淆

---

## 参考文档

- 详细的命令参数和示例，参见 [api-reference.md](api-reference.md)
- TCCLI 安装配置，使用 `/tccli-setup` 技能
- CLS 检索语法：[检索条件语法规则](https://cloud.tencent.com/document/product/614/47044)
- APM 指标协议：[APM 指标协议标准](https://cloud.tencent.com/document/product/248/101681)

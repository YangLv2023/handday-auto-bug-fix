---
name: tccli-setup
description: Guide users through installing, configuring, and authenticating Tencent Cloud CLI (TCCLI). Covers pip/source/Homebrew installation, browser-based authorization login (recommended, no SecretKey needed), interactive and command-line configuration (optional), multi-account profiles, environment variables, and help usage. Use when user mentions TCCLI, 腾讯云CLI, 腾讯云命令行工具, tccli install, tccli configure, tccli auth login, or needs to set up Tencent Cloud command-line access. 触发词：tccli、腾讯云CLI、腾讯云命令行、tccli安装、tccli配置、tccli登录。
---

# TCCLI 安装与配置引导

引导用户完成腾讯云命令行工具（TCCLI）的安装、配置和帮助查看。

## 铁律（不可违反）

> **安装或配置完成后，坚决不允许执行任何云资源操作命令（包括增、删、改、查）。**
>
> - **允许**：执行安装命令（`pip install tccli`）、配置命令（`tccli configure`）、授权登录命令（`tccli auth login`/`tccli auth logout`）、版本检查（`tccli --version`）、帮助命令（`tccli help` 及其子命令）、配置查看（`tccli configure list`）
> - **坚决禁止**：执行任何云资源操作命令（包括但不限于 `tccli cvm DescribeInstances`、`tccli cvm RunInstances`、`tccli cbs DescribeDisks` 等所有调用云 API 的操作），无论用户是否明确要求，均不得代为执行
> - **正确做法**：提供命令让用户自行在其终端中执行，仅提供引导和说明

---

## 工作流程

```
Step 1: 环境检查 → Step 2: 安装 TCCLI → Step 3: 配置认证 → Step 4: 验证配置 → Step 5: 帮助引导
```

### 判断起点

用户触发本 skill 时，先判断当前所处阶段：

| 用户表述 | 起始步骤 |
|----------|---------|
| "安装tccli" / "怎么装" / "还没装" | Step 1 |
| "配置tccli" / "登录" / "认证" / "已安装需要配置" / "没有SecretKey" | Step 3（先执行 Step 1 快速检查） |
| "tccli怎么用" / "查看帮助" / "有哪些命令" | Step 5 |

---

## Step 1: 环境检查

安装前必须确认 Python 和 pip 环境。

### 检查命令

根据用户操作系统选择：

**Windows (PowerShell)**:
```powershell
python --version
pip --version
```

**Linux/macOS**:
```bash
python3 --version
pip3 --version
```

### 判断逻辑

| 检查结果 | 处理方式 |
|----------|---------|
| Python >= 2.7 且 pip 可用 | 进入 Step 2 |
| Python 未安装或版本过低 | 提示用户安装 Python 2.7+ 和 pip，给出 [Python 官网](https://www.python.org/) 和 [pip 官网](https://pypi.org/project/pip/) 链接 |
| pip 未安装 | 提示用户安装 pip |

> **注意**：如用户系统已有 Python 3.x，使用 `python3` / `pip3` 命令。TCCLI 同时支持 Python 2.7 和 3.x。

---

## Step 2: 安装 TCCLI

提供三种安装方式，**推荐 pip 安装**。

### 方式一：pip 安装（推荐）

所有平台通用：

```bash
pip install tccli
```

> Linux/macOS 如遇权限问题，使用 `sudo pip install tccli` 或 `pip install --user tccli`。

**从旧版本升级**（3.0.252.3 以下）：
```bash
pip uninstall tccli jmespath
pip install tccli
```

### 方式二：源码安装

```bash
git clone https://github.com/TencentCloud/tencentcloud-cli.git
cd tencentcloud-cli
python setup.py install
```

### 方式三：Homebrew 安装（仅 macOS）

```bash
brew tap tencentcloud/tccli
brew install tccli
```

更新：`brew upgrade`

### 安装验证

```bash
tccli --version
```

成功则输出版本号，进入 Step 3。失败则排查 PATH 环境变量。

---

## Step 3: 配置认证

安装成功后，引导用户完成认证配置。提供两种认证方式，**推荐浏览器授权登录**（无需手动获取 SecretKey）。

> **方式选择**：向用户说明两种方式的区别，由用户自行选择：
>
> | 方式 | 说明 | 适用场景 |
> |------|------|---------|
> | **方式一：浏览器授权登录（推荐）** | 通过浏览器扫码/登录自动获取凭证，无需手动获取 SecretKey | 无法直接获取 SecretKey、首次配置、日常使用 |
> | **方式二：手动配置密钥（可选）** | 手动填写 SecretId 和 SecretKey | 已有密钥、脚本自动化、多账户管理 |
>
> **引导话术**：「配置认证有两种方式：推荐使用浏览器授权登录，无需手动获取密钥；如果您已有 SecretId 和 SecretKey，也可以选择手动配置。请问您想用哪种方式？」

---

### 方式一：浏览器授权登录（推荐）

通过 `tccli auth login` 命令，TCCLI 会自动打开浏览器引导用户完成腾讯云登录授权，**无需手动获取 SecretId 和 SecretKey**。凭证会自动写入 `~/.tccli/default.credential` 文件。

#### 步骤一：执行登录命令

引导用户执行：

```bash
tccli auth login
```

- TCCLI 会自动打开默认浏览器，跳转到腾讯云登录页面
- 用户根据页面提示完成登录（扫码或账密登录）
- 如浏览器未自动打开，终端会打印登录链接，用户可手动复制到浏览器打开

#### 步骤二：完成授权

- 登录成功后，浏览器会显示登录成功落地页
- 同时终端会打印提示信息：

```plaintext
登录成功, 密钥凭证已被写入: ~/.tccli/default.credential
```

#### 无浏览器环境（可选）

如用户所在机器没有浏览器（如远程服务器），可使用另一台机器登录：

```bash
tccli auth login --browser no
```

- 终端会打印登录链接和验证码输入提示
- 将链接复制到有浏览器的机器上完成登录
- 将浏览器中显示的验证码粘贴回终端，按回车完成登录

#### 多账户登录（可选）

```bash
# 登录到指定账户 user1
tccli auth login --profile user1
```

凭证会写入 `~/.tccli/user1.credential`。

#### 退出登录

```bash
# 退出默认账户
tccli auth logout

# 退出指定账户
tccli auth logout --profile user1
```

#### 浏览器授权方式的优势

- **无需手动获取密钥** — 不需要去控制台查找和复制 SecretId/SecretKey
- **安全性更高** — 凭证由系统直接写入，不经过剪贴板/命令行，减少泄露风险
- **体验更流畅** — 浏览器登录后即完成，无需逐项填写配置

---

### 方式二：手动配置密钥（可选）

如用户已有 SecretId 和 SecretKey，可手动配置。

#### 前置提醒

配置前需要用户准备好：
- **SecretId** 和 **SecretKey**：前往 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取
- **地域（region）**：如 `ap-guangzhou`，参考 [地域列表](https://cloud.tencent.com/document/api/213/15692)

> **安全提示**：SecretKey 是敏感信息，提醒用户不要将其提交到代码仓库或公开分享。

#### 交互模式

引导用户执行：
```bash
tccli configure
```

系统会依次提示输入：
1. `secretId` — 云 API 密钥 SecretId
2. `secretKey` — 云 API 密钥 SecretKey
3. `region` — 默认地域（如 `ap-guangzhou`）
4. `output` — 输出格式，可选 `json`/`table`/`text`，默认 `json`

#### 命令行模式（适合脚本/自动化）

```bash
tccli configure set secretId <用户的SecretId>
tccli configure set secretKey <用户的SecretKey>
tccli configure set region ap-guangzhou
tccli configure set output json
```

#### 环境变量（适合临时使用）

**Linux/macOS**:
```bash
export TENCENTCLOUD_SECRET_ID=用户的SecretId
export TENCENTCLOUD_SECRET_KEY=用户的SecretKey
export TENCENTCLOUD_REGION=ap-guangzhou
```

**Windows (PowerShell)**:
```powershell
$env:TENCENTCLOUD_SECRET_ID="用户的SecretId"
$env:TENCENTCLOUD_SECRET_KEY="用户的SecretKey"
$env:TENCENTCLOUD_REGION="ap-guangzhou"
```

> **优先级**：命令行参数 > 配置文件 > 环境变量

---

### 凭据存储说明

无论使用哪种认证方式，凭据均存储在 `~/.tccli/` 目录下（Windows 为 `C:\Users\<用户名>\.tccli\`）：

| 文件 | 内容 | 说明 |
|------|------|------|
| `default.credential` | SecretId / SecretKey | 认证凭据（两种方式均写入此文件） |
| `default.configure` | region / output / endpoint | 产品配置 |

> **注意**：`tccli configure list` 默认**不显示** credential 中的密钥内容（安全设计）。如需确认凭据是否已写入，直接检查 `default.credential` 文件是否存在。

### 多账户配置（可选）

两种认证方式均支持多账户：

```bash
# 浏览器授权方式 - 登录到指定账户
tccli auth login --profile test

# 手动配置方式 - 交互式配置指定账户
tccli configure --profile test
```

使用指定账户调用：
```bash
tccli cvm DescribeZones --profile test
```

### CAM 角色认证（可选）

通过 CAM 角色认证（无需 SecretId/SecretKey）：
```bash
tccli configure set role-arn qcs::cam::uin/***********/**** role-session-name ****
```

实例绑定了角色的场景，可直接使用：
```bash
tccli cvm DescribeZones --use-cvm-role
```

---

## Step 4: 验证配置

配置完成后，根据使用的认证方式进行验证：

### 浏览器授权登录方式验证

检查凭据文件是否已生成：

**Windows (PowerShell)**:
```powershell
Test-Path "$env:USERPROFILE\.tccli\default.credential"
```

**Linux/macOS**:
```bash
ls -la ~/.tccli/default.credential
```

如文件存在且终端曾打印「登录成功, 密钥凭证已被写入」提示，即表示认证成功。

### 手动配置方式验证

```bash
tccli configure list
```

确认输出中 `region`、`output` 已正确设置。

> **注意**：`tccli configure list` 默认**不显示** credential 中的 `secretId`/`secretKey`（安全设计）。两种方式均需通过检查 `default.credential` 文件是否存在来确认凭据是否写入。

> **铁律提醒**：此步骤仅查看配置信息，不执行任何云资源操作命令。

---

## Step 5: 帮助引导

配置完成后，引导用户了解 TCCLI 的功能和使用方法。

### 查看帮助信息

```bash
# 查看所有支持的产品
tccli help

# 查看某产品（如 CVM）支持的接口
tccli cvm help

# 查看某接口（如 CBS DescribeDisks）的参数说明
tccli cbs DescribeDisks help
```

### 查看详细帮助

添加 `--detail` 选项获取更详细的信息：

```bash
# 产品的详细接口列表
tccli cvm help --detail

# 接口的入参、出参详细信息及示例
tccli cbs DescribeDisks help --detail
```

### 引导建议

向用户说明：
- 可在 [API 中心](https://cloud.tencent.com/document/api) 查看各产品 API 文档
- 常用产品示例：`tccli cvm help`（云服务器）、`tccli cbs help`（云硬盘）、`tccli vpc help`（私有网络）
- 如用户需要执行具体云资源命令，提供命令让用户自行执行，不代为执行

---

## 异常处理

| 异常场景 | 处理方式 |
|----------|---------|
| pip 未安装 | 引导安装 pip，给出 [pip 安装指南](https://pypi.org/project/pip/) |
| 权限不足 (Linux/macOS) | 建议使用 `sudo` 或 `--user` 参数 |
| `tccli` 命令未找到 | 检查 PATH 环境变量，确认 pip 安装目录在 PATH 中 |
| 配置文件损坏 | 删除 `~/.tccli/` 目录后重新执行 `tccli configure` 或 `tccli auth login` |
| SecretId/Key 无效 | 提示用户检查密钥是否正确，确认未多余空格 |
| 浏览器登录未自动打开 | 引导用户手动复制终端打印的登录链接到浏览器 |
| 无浏览器环境 | 引导使用 `tccli auth login --browser no`，在另一台机器完成登录 |
| 登录凭证过期/失效 | **必须先删除旧凭据文件，再重新登录**（见下方「Token 失效重认证流程」） |
| 登录成功但命令报 SecretId 不存在 | **TCCLI 凭据读取 Bug**：登录成功 + 凭据文件存在 + 命令报 SecretId 不存在。执行「SecretId 读取 Bug 绕过方案」（见下方） |

---

## SecretId 读取 Bug 绕过方案

> **TCCLI 已知 Bug**：浏览器授权登录（`tccli auth login`）成功后，`default.credential` 文件已正确写入密钥信息，但后续 tccli 命令读取凭据文件时可能失败，报「SecretId 不存在，请输入正确的密钥」。这是 TCCLI 自身的凭据读取 Bug，非用户配置问题。
>
> **触发条件**：`tccli auth login` 登录成功 + 凭据文件存在 + 命令执行报 SecretId 不存在/缺失错误。
>
> **绕过方案**：从 `default.credential` 文件中提取密钥信息，通过命令参数直接传递，绕过凭据文件读取环节。

### 步骤一：从凭据文件提取密钥

**Windows (PowerShell)**:
```powershell
$cred = Get-Content "$env:USERPROFILE\.tccli\default.credential" | ConvertFrom-Json
$secretId = $cred.secretId
$secretKey = $cred.secretKey
$token = $cred.token
```

**Linux/macOS**:
```bash
secretId=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['secretId'])")
secretKey=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['secretKey'])")
token=$(python3 -c "import json; print(json.load(open('$HOME/.tccli/default.credential'))['token'])")
```

### 步骤二：后续所有命令通过参数传递密钥

触发此 Bug 后，**后续会话中所有 tccli 命令**均在命令中追加 `--secretId`、`--secretKey`、`--token` 参数：

```powershell
# 示例
tccli cls SearchLog --cli-unfold-argument `
    --secretId $secretId `
    --secretKey $secretKey `
    --token $token `
    --region ap-shanghai `
    --TopicId <TopicId> ` --From <From> --To <To> --QueryString 'traceId:xxx'
```

> **关键规则**：
> 1. 触发 Bug 后，**当前会话剩余的所有 tccli 命令**都必须带 `--secretId`、`--secretKey`、`--token` 参数
> 2. 三个参数缺一不可（即使 token 为空也需传递 `--token ""`）
> 3. 密钥值从 `default.credential` 文件读取，不以明文写在文档中
> 4. 此方案仅在使用浏览器授权登录后触发 Bug 时启用；正常情况下不需带密钥参数

---

## Token 失效重认证流程（必须遵守）

> **当检测到 token 过期、认证失败、密钥失效等情况时，必须先删除旧凭据文件，再执行重新登录。禁止在旧凭据文件上直接覆盖登录，否则可能导致密钥信息写入不全、反复认证失败。**

### 步骤一：删除旧凭据文件

**Windows (PowerShell)**:
```powershell
Remove-Item "$env:USERPROFILE\.tccli\default.credential" -Force -ErrorAction SilentlyContinue
```

**Linux/macOS**:
```bash
rm -f ~/.tccli/default.credential
```

### 步骤二：重新登录授权

```bash
tccli auth login
```

浏览器自动打开后完成腾讯云登录，等待终端打印「登录成功, 密钥凭证已被写入」。

### 步骤三：验证新凭据

**Windows (PowerShell)**:
```powershell
Test-Path "$env:USERPROFILE\.tccli\default.credential"
```

**Linux/macOS**:
```bash
ls -la ~/.tccli/default.credential
```

> **关键原则**：旧凭据文件残留的失效 token 会干扰新登录流程（tccli 可能复用旧文件句柄或部分覆盖），**先删后登录**可确保凭据文件完全由新 token 写入，杜绝写入不全问题。

---

## 关键原则

1. **引导而非代执行** — 提供命令让用户自行执行，坚决不代为执行任何云资源操作命令
2. **安装配置后不碰云资源** — 铁律：安装和配置完成后，坚决不允许执行任何云资源操作命令（增删改查均禁止），无论用户是否要求
3. **帮助可随时查看** — `tccli help` 系列命令是安全的，可自由使用
4. **敏感信息保护** — SecretKey 是敏感信息，提醒用户妥善保管；浏览器授权方式不经过命令行传递密钥，更安全
5. **跨平台适配** — 根据用户操作系统提供对应命令格式
6. **优先推荐浏览器授权** — 认证配置时优先推荐 `tccli auth login`，无需手动获取 SecretKey；已有密钥的用户可选手动配置
7. **Token 失效先删后登录** — 认证失败/过期时，必须先删除旧 `default.credential` 文件再执行 `tccli auth login`，防止旧文件干扰导致密钥写入不全
8. **SecretId 读取 Bug 绕过** — 登录成功后命令报 SecretId 不存在时，从 `default.credential` 提取密钥，后续所有命令带 `--secretId`/`--secretKey`/`--token` 参数绕过凭据读取 Bug

---

## 参考文档

详细的安装、配置和帮助信息，参见 [reference.md](reference.md)。

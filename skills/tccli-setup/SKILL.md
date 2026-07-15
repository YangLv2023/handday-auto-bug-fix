---
name: tccli-setup
description: Guide users through installing, configuring, and authenticating Tencent Cloud CLI (TCCLI). Covers pip/source/Homebrew installation, browser-based authorization login (recommended, no SecretKey needed), interactive and command-line configuration (optional), multi-account profiles, environment variables, and help usage. Use when user mentions TCCLI, 腾讯云CLI, 腾讯云命令行工具, tccli install, tccli configure, tccli auth login, or needs to set up Tencent Cloud command-line access. 触发词：tccli、腾讯云CLI、腾讯云命令行、tccli安装、tccli配置、tccli登录。
---

# TCCLI 安装与配置引导

引导用户完成腾讯云命令行工具（TCCLI）的安装、配置和帮助查看。

## 铁律（不可违反）

> **安装或配置完成后，坚决不允许执行任何云资源操作命令（包括增、删、改、查）。**
>
> - **允许**：安装命令、配置命令、授权登录命令、版本检查、帮助命令、配置查看
> - **坚决禁止**：执行任何云资源操作命令（包括但不限于 `tccli cvm DescribeInstances` 等所有调用云 API 的操作），无论用户是否明确要求
> - **正确做法**：提供命令让用户自行在其终端中执行，仅提供引导和说明

---

## 工作流程

```
Step 1: 环境检查 → Step 2: 安装 TCCLI → Step 3: 配置认证 → Step 4: 验证配置 → Step 5: 帮助引导
```

### 判断起点

| 用户表述 | 起始步骤 |
|----------|---------|
| "安装tccli" / "怎么装" / "还没装" | Step 1 |
| "配置tccli" / "登录" / "认证" / "已安装需要配置" / "没有SecretKey" | Step 3（先执行 Step 1 快速检查） |
| "tccli怎么用" / "查看帮助" / "有哪些命令" | Step 5 |

---

## Step 1: 环境检查

安装前确认 Python 和 pip 环境：

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

| 检查结果 | 处理方式 |
|----------|---------|
| Python >= 2.7 且 pip 可用 | 进入 Step 2 |
| Python 未安装或版本过低 | 提示安装 Python 2.7+ 和 pip |
| pip 未安装 | 提示安装 pip |

---

## Step 2: 安装 TCCLI

### 方式一：pip 安装（推荐，所有平台通用）

```bash
pip install tccli
```

> Linux/macOS 如遇权限问题：`sudo pip install tccli` 或 `pip install --user tccli`
>
> 从 3.0.252.3 以下版本升级：`pip uninstall tccli jmespath && pip install tccli`

### 方式二/三：源码安装 / Homebrew 安装

 详见 [reference.md](reference.md)「一、安装 TCCLI」

### 安装验证

```bash
tccli --version
```

成功则输出版本号，进入 Step 3。失败则排查 PATH 环境变量。

---

## Step 3: 配置认证

提供两种认证方式，**推荐浏览器授权登录**（无需手动获取 SecretKey）。

| 方式 | 命令 | 是否需要 SecretKey | 适用场景 |
|------|------|-------------------|---------|
| **浏览器授权登录（推荐）** | `tccli auth login` | 否，浏览器自动获取 | 无法获取密钥、首次配置、日常使用 |
| **手动配置密钥（可选）** | `tccli configure` | 是，需手动填写 | 已有密钥、脚本自动化、多账户管理 |

> **引导话术**：「配置认证有两种方式：推荐使用浏览器授权登录，无需手动获取密钥；如果您已有 SecretId 和 SecretKey，也可以选择手动配置。请问您想用哪种方式？」

### 方式一：浏览器授权登录（推荐）

```bash
tccli auth login
```

- TCCLI 自动打开浏览器，跳转到腾讯云登录页面
- 用户完成登录（扫码或账密），终端打印「登录成功, 密钥凭证已被写入: ~/.tccli/default.credential」
- 无浏览器环境：`tccli auth login --browser no`（在另一台机器完成登录）
- 多账户：`tccli auth login --profile user1`（凭证写入 `~/.tccli/user1.credential`）
- 退出：`tccli auth logout`（或 `tccli auth logout --profile user1`）

> 更多细节（手动配置密钥、环境变量、多账户配置、CAM 角色认证等）→ 详见 [reference.md](reference.md)「二、配置 TCCLI」

### 凭据存储说明

| 文件 | 内容 | 说明 |
|------|------|------|
| `default.credential` | SecretId / SecretKey / token | 认证凭据（两种方式均写入此文件） |
| `default.configure` | region / output / endpoint | 产品配置 |

> `tccli configure list` 默认不显示 credential 中的密钥内容。如需确认凭据是否写入，检查 `default.credential` 文件是否存在。

---

## Step 4: 验证配置

**浏览器授权登录方式**：检查凭据文件是否存在

```powershell
# Windows
Test-Path "$env:USERPROFILE\.tccli\default.credential"
# Linux/macOS
ls -la ~/.tccli/default.credential
```

**手动配置方式**：

```bash
tccli configure list
```

> **铁律提醒**：此步骤仅查看配置信息，不执行任何云资源操作命令。

---

## Step 5: 帮助引导

```bash
tccli help              # 查看所有支持的产品
tccli cvm help           # 查看某产品支持的接口
tccli cbs DescribeDisks help  # 查看某接口的参数说明
tccli cvm help --detail  # 详细帮助（含示例）
```

> 更多帮助信息和常用产品速查 → 详见 [reference.md](reference.md)「三、帮助信息」

---

## 异常处理

| 异常场景 | 处理方式 |
|---------|---------|
| pip 未安装 | 引导安装 pip |
| 权限不足 (Linux/macOS) | 使用 `sudo` 或 `--user` 参数 |
| `tccli` 命令未找到 | 检查 PATH 环境变量 |
| 配置文件损坏 | 删除 `~/.tccli/` 目录后重新配置 |
| SecretId/Key 无效 | 提示用户检查密钥是否正确 |
| 浏览器登录未自动打开 | 引导用户手动复制终端打印的登录链接 |
| 无浏览器环境 | 引导使用 `tccli auth login --browser no` |
| 登录凭证过期/失效 | → 执行下方「Token 失效重认证流程」 |
| 登录成功但命令报 SecretId 不存在 | → 执行下方「SecretId 读取 Bug 绕过方案」 |

---

## Token 失效重认证流程（必须遵守）

> **当检测到 token 过期、认证失败、密钥失效等情况时，必须先删除旧凭据文件，再执行重新登录。禁止在旧凭据文件上直接覆盖登录，否则可能导致密钥信息写入不全、反复认证失败。**

### 步骤一：删除旧凭据文件

```powershell
# Windows
Remove-Item "$env:USERPROFILE\.tccli\default.credential" -Force -ErrorAction SilentlyContinue
# Linux/macOS
rm -f ~/.tccli/default.credential
```

### 步骤二：重新登录授权

```bash
tccli auth login
```

浏览器自动打开后完成腾讯云登录，等待终端打印「登录成功, 密钥凭证已被写入」。

### 步骤三：验证新凭据

```powershell
# Windows
Test-Path "$env:USERPROFILE\.tccli\default.credential"
# Linux/macOS
ls -la ~/.tccli/default.credential
```

> **关键原则**：旧凭据文件残留的失效 token 会干扰新登录流程，**先删后登录**确保凭据文件完全由新 token 写入，杜绝写入不全问题。

---

## SecretId 读取 Bug 绕过方案

> **TCCLI 已知 Bug**：浏览器授权登录（`tccli auth login`）成功后，`default.credential` 文件已正确写入密钥信息，但后续 tccli 命令读取凭据文件时可能失败，报「SecretId 不存在，请输入正确的密钥」。这是 TCCLI 自身的凭据读取 Bug，非用户配置问题。
>
> **触发条件**：`tccli auth login` 登录成功 + 凭据文件存在 + 命令执行报 SecretId 不存在/缺失错误。

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

> **关键规则**：三参数缺一不可（即使 token 为空也需传递 `--token ""`）；密钥值从 `default.credential` 文件读取，不以明文写在文档中；仅在使用浏览器授权登录后触发 Bug 时启用。

---

## 关键原则

1. **引导而非代执行** — 提供命令让用户自行执行，坚决不代为执行任何云资源操作命令
2. **安装配置后不碰云资源** — 铁律：增删改查均禁止
3. **优先推荐浏览器授权** — 无需手动获取 SecretKey
4. **Token 失效先删后登录** — 必须先删除旧 `default.credential` 再重新登录（详见上方流程）
5. **SecretId 读取 Bug 绕过** — 登录成功但报 SecretId 不存在时，提取密钥通过参数传递（详见上方方案）

---

## 参考文档

详细的安装、配置和帮助信息，参见 [reference.md](reference.md)。

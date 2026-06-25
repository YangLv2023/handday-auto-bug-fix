# TCCLI 详细参考文档

本文件基于腾讯云官方文档整理，包含安装、配置和帮助信息的完整内容。

---

## 一、安装 TCCLI

### 前提条件

- Python 版本必须为 2.7 及以上版本
- 已安装 pip 工具
- TCCLI 依赖 TencentCloudApi Python SDK，安装时会自动管理依赖

### 安装方式

#### 1. pip 安装（推荐）

Windows、macOS、Linux 通用：

```bash
pip install tccli
```

> Linux/macOS 如需权限：`sudo pip install tccli`

**从 3.0.252.3 以下版本升级**：
```bash
pip uninstall tccli jmespath
pip install tccli
```

#### 2. 源码安装

```bash
git clone https://github.com/TencentCloud/tencentcloud-cli.git
cd tencentcloud-cli
python setup.py install
```

#### 3. Homebrew 安装（仅 macOS）

```bash
brew tap tencentcloud/tccli
brew install tccli
```

更新 TCCLI：`brew upgrade`

### 验证安装

```bash
tccli --version
```

### CloudShell 快速使用

腾讯云 CloudShell 已预装 TCCLI，可直接使用：
- 通过控制台：云服务器控制台 → 工具 → CloudShell
- 通过 API Explorer：选择接口 → 代码示例 → 调试代码

---

## 二、配置 TCCLI

TCCLI 提供两种认证方式，推荐使用浏览器授权登录。

### 认证方式对比

| 方式 | 命令 | 是否需要 SecretKey | 适用场景 |
|------|------|-------------------|---------|
| 浏览器授权登录（推荐） | `tccli auth login` | 否，浏览器自动获取 | 无法获取密钥、首次配置、日常使用 |
| 手动配置密钥（可选） | `tccli configure` | 是，需手动填写 | 已有密钥、脚本自动化、多账户管理 |

---

### 浏览器授权登录（推荐）

通过浏览器完成腾讯云登录授权，TCCLI 自动获取并写入凭证，无需手动获取 SecretId 和 SecretKey。

#### 前提条件

- 已安装 TCCLI
- 本机有可用的浏览器（或可通过另一台机器完成登录）

#### 方式一：使用本机浏览器登录

```bash
tccli auth login
```

- TCCLI 自动打开默认浏览器，跳转到腾讯云登录页面
- 根据页面提示完成登录（扫码或账密登录）
- 如浏览器未自动打开，终端会打印登录链接，可手动复制到浏览器

登录成功后：
- 浏览器显示登录成功落地页
- 终端打印：`登录成功, 密钥凭证已被写入: ~/.tccli/default.credential`

#### 方式二：本机无浏览器，使用另一台机器登录

```bash
tccli auth login --browser no
```

流程：
1. 终端打印登录链接和验证码输入提示
2. 将链接复制到有浏览器的机器上完成登录授权
3. 授权完成后，浏览器页面显示验证码
4. 将验证码粘贴回终端，按回车完成登录

成功后终端打印：`登录成功, 密钥凭证已被写入: ...`

#### 多账户登录

```bash
# 登录到指定账户 user1
tccli auth login --profile user1
# 凭证写入 ~/.tccli/user1.credential
```

#### 退出登录

```bash
# 退出默认账户
tccli auth logout

# 退出指定账户 user1
tccli auth logout --profile user1
```

#### 验证登录是否成功

```bash
# 检查凭据文件是否存在
ls ~/.tccli/default.credential   # Linux/macOS
Test-Path "$env:USERPROFILE\.tccli\default.credential"  # Windows PowerShell
```

或执行测试命令（注意：此为云资源操作命令，**应由用户自行执行验证**）：
```bash
tccli cvm DescribeRegions
```

---

### 手动配置密钥（可选）

如已有 SecretId 和 SecretKey，可手动配置。

#### 配置项说明

| 配置项 | 说明 | 获取方式 |
|--------|------|---------|
| secretId | 云 API 密钥 SecretId | [API 密钥管理](https://console.cloud.tencent.com/cam/capi) |
| secretKey | 云 API 密钥 SecretKey | [API 密钥管理](https://console.cloud.tencent.com/cam/capi) |
| region | 云产品地域（如 ap-guangzhou） | [地域列表](https://cloud.tencent.com/document/api/213/15692) |
| output | 输出格式：json / table / text | 默认 json |

### 交互模式

```bash
tccli configure
```

依次提示输入 secretId、secretKey、region、output。

### 命令行模式

适合自动化脚本场景：

```bash
# set 子命令 - 设置单个或多个配置
tccli configure set secretId **************
tccli configure set region ap-guangzhou output json

# get 子命令 - 获取配置
tccli configure get secretKey

# list 子命令 - 打印所有配置
tccli configure list
```

### 多账户支持

```bash
# 交互模式中指定账户名
tccli configure --profile test

# set/get/list 指定账户
tccli configure set region ap-guangzhou output json --profile test
tccli configure get secretKey --profile test
tccli configure list --profile test

# remove 子命令删除账户配置（不指定则删除 default）
tccli configure remove --profile test

# 调用接口时指定账户
tccli cvm DescribeZones --profile test
```

通过环境变量指定默认 profile：
```bash
export TCCLI_PROFILE=test
```

### 配置文件

执行 `tccli configure` 后，在 `~/.tccli/` 目录下生成：

**default.configure**（产品版本、endpoint、输出格式、地域）:
```json
{
  "cvm": {
    "endpoint": "cvm.tencentcloudapi.com",
    "version": "2017-03-12"
  },
  "output": "json",
  "region": "ap-guangzhou"
}
```

**default.credential**（密钥信息）:
```json
{
  "secretId": "**************",
  "secretKey": "**************"
}
```

指定 `--profile test` 时生成 `test.configure` 和 `test.credential`。

修改配置：直接编辑文件或使用 `tccli configure set cvm.version 2017-03-12`。

### 环境变量配置

#### 临时配置（当前终端会话）

**Linux/macOS**:
```bash
export TENCENTCLOUD_SECRET_ID=您的SecretId
export TENCENTCLOUD_SECRET_KEY=您的SecretKey
export TENCENTCLOUD_REGION=ap-guangzhou
```

**Windows (CMD)**:
```cmd
set TENCENTCLOUD_SECRET_ID=您的SecretId
set TENCENTCLOUD_SECRET_KEY=您的SecretKey
set TENCENTCLOUD_REGION=ap-guangzhou
```

**Windows (PowerShell)**:
```powershell
$env:TENCENTCLOUD_SECRET_ID="您的SecretId"
$env:TENCENTCLOUD_SECRET_KEY="您的SecretKey"
$env:TENCENTCLOUD_REGION="ap-guangzhou"
```

#### 永久配置

**Linux/macOS**:
```bash
echo 'export TENCENTCLOUD_SECRET_ID=您的SecretId' >> ~/.bashrc
echo 'export TENCENTCLOUD_SECRET_KEY=您的SecretKey' >> ~/.bashrc
echo 'export TENCENTCLOUD_REGION=ap-guangzhou' >> ~/.bashrc
source ~/.bashrc
```

**Windows**:
1. 右键"此电脑" → 属性
2. 高级系统设置 → 环境变量
3. 系统变量区域 → 新建
4. 依次添加 `TENCENTCLOUD_SECRET_ID`、`TENCENTCLOUD_SECRET_KEY`、`TENCENTCLOUD_REGION`

#### 验证环境变量

**Linux/macOS**:
```bash
echo $TENCENTCLOUD_SECRET_ID
echo $TENCENTCLOUD_SECRET_KEY
echo $TENCENTCLOUD_REGION
```

**Windows (CMD)**:
```cmd
echo %TENCENTCLOUD_SECRET_ID%
echo %TENCENTCLOUD_SECRET_KEY%
echo %TENCENTCLOUD_REGION%
```

> **优先级**：命令 > 配置文件 > 环境变量

### CAM 角色认证

```bash
# 非交互模式配置 CAM 角色
tccli configure set role-arn qcs::cam::uin/***********/**** role-session-name ****

# 查看 CAM 角色配置
tccli configure get role-arn
tccli configure list

# 环境变量方式
export TENCENTCLOUD_ROLE_ARN=qcs::cam::uin/***********/****
export TENCENTCLOUD_ROLE_SESSION_NAME=****

# 命令行直接指定
tccli cvm DescribeZones --role-arn qcs::cam::uin/***********/**** --role-session-name ****

# 使用实例角色（仅限已绑定角色的实例）
tccli cvm DescribeZones --use-cvm-role
```

---

## 三、帮助信息

### 基本帮助

```bash
# 查看支持的所有产品
tccli help

# 查看某产品支持的接口（以 CVM 为例）
tccli cvm help

# 查看某接口的参数说明（以 CBS DescribeDisks 为例）
tccli cbs DescribeDisks help
```

### 详细帮助（--detail）

```bash
# 产品的详细接口列表
tccli help --detail

# CVM 支持接口的详细信息
tccli cvm help --detail

# 接口入参、出参详细信息及使用示例
tccli cbs DescribeDisks help --detail
```

### 常用产品速查

| 产品 | 命令 | 说明 |
|------|------|------|
| 云服务器 | `tccli cvm help` | CVM 实例管理 |
| 云硬盘 | `tccli cbs help` | CBS 磁盘管理 |
| 私有网络 | `tccli vpc help` | VPC 网络管理 |
| 对象存储 | `tccli cos help` | COS 存储管理 |
| 云数据库 | `tccli cdb help` | CDB 数据库管理 |

完整产品列表可在 [API 中心](https://cloud.tencent.com/document/api) 查看。

# TCCLI 日志检索与链路查询 — API 参考

本文档提供 CLS 日志服务和 APM 应用性能监控相关查询命令的详细参数说明。

> **CLS 固定配置**：日志集 `hdsaas-log-group`（ID: `91b588b7-222b-41f8-b8c0-acedc86f84da`），日志主题 `hdsaas-log-topic`（ID: `797014ec-3f76-471b-abd8-a1bba1ec5cfb`），地域 `ap-shanghai`。所有 CLS 命令必须加 `--region ap-shanghai` 并使用此 TopicId。

---

## 目录

- [CLS 日志服务](#cls-日志服务)
  - [SearchLog — 检索日志](#searchlog--检索日志)
  - [DescribeLogHistogram — 日志直方图](#describeloghistogram--日志直方图)
  - [DescribeLogContext — 日志上下文](#describelogcontext--日志上下文)
- [APM 应用性能监控](#apm-应用性能监控)
  - [DescribeGeneralMetricData — 指标数据查询](#describegeneralmetricdata--指标数据查询)
  - [DescribeGeneralOTSpanList — OT调用链列表](#describegeneralotspanlist--ot调用链列表)
  - [DescribeGeneralSpanList — 调用链列表](#describegeneralspanlist--调用链列表)
  - [DescribeApmApplicationConfig — 应用配置查询](#describeapmapplicationconfig--应用配置查询)
- [通用选项](#通用选项)
- [帮助命令速查](#帮助命令速查)

---

## CLS 日志服务

### SearchLog — 检索日志

检索分析日志，支持全文检索、键值检索和 SQL 分析。

#### 语法

```bash
tccli cls SearchLog --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--From` | Integer | 是 | 起始时间，Unix 时间戳（**毫秒**） |
| `--To` | Integer | 是 | 结束时间，Unix 时间戳（**毫秒**） |
| `--TopicId` | String | 否 | 日志主题 ID（单主题检索时使用，与 Topics 互斥） |
| `--Topics` | Array | 否 | 多日志主题列表（最多50个，与 TopicId 互斥） |
| `--QueryString` | String | 否 | 检索分析语句，最大12KB。空字符串或 `*` 查全部 |
| `--QuerySyntax` | Integer | 否 | 0=Lucene语法，1=CQL语法（默认，推荐） |
| `--Sort` | String | 否 | `asc`/`desc`，默认 `desc`（仅非SQL时有效） |
| `--Limit` | Integer | 否 | 返回日志条数，默认100，最大1000 |
| `--Offset` | Integer | 否 | 偏移量（仅单主题、非SQL、不能与Context同用） |
| `--Context` | String | 否 | 透传上次返回的Context获取更多日志（最多1万条，1小时有效） |
| `--SamplingRate` | Float | 否 | 统计分析采样率，0=自动采样 |

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `Results` | Array | 日志内容列表 |
| `Context` | String | 透传获取后续日志 |
| `AnalysisRecords` | Array | SQL分析结果（UseNewAnalysis=true时） |
| `AnalysisResults` | Array | SQL分析结果（UseNewAnalysis=false时） |
| `ListOver` | Boolean | 日志是否全部返回 |

#### Results 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `Time` | String | 日志时间 |
| `TopicId` | String | 日志主题 ID |
| `PkgId` | String | 日志包序号 |
| `PkgLogId` | Integer | 日志包内序号 |
| `Content` | String | 日志内容 |
| `FileName` | String | 日志文件路径 |
| `Source` | String | 日志来源设备 |
| `HostName` | String | 来源主机名 |

#### 示例

```bash
# 检索 ERROR 级别日志
$env:PYTHONUTF8="1"; tccli cls SearchLog --cli-unfold-argument `
    --region ap-shanghai `
    --TopicId 797014ec-3f76-471b-abd8-a1bba1ec5cfb `
    --From 1685086740862 `
    --To 1685087640862 `
    --QueryString 'level:ERROR' `
    --QuerySyntax 1 `
    --Limit 100 `
    --Sort desc

# SQL 分析：统计各级别日志数量
$env:PYTHONUTF8="1"; tccli cls SearchLog --cli-unfold-argument `
    --region ap-shanghai `
    --TopicId 797014ec-3f76-471b-abd8-a1bba1ec5cfb `
    --From 1685086740862 `
    --To 1685087640862 `
    --QueryString '* | SELECT level, count(*) as cnt GROUP BY level' `
    --QuerySyntax 1
```

---

### DescribeLogHistogram — 日志直方图

构建日志数量直方图，用于查看日志分布趋势。

#### 语法

```bash
tccli cls DescribeLogHistogram --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--From` | Integer | 是 | 起始时间，Unix 时间戳（**毫秒**） |
| `--To` | Integer | 是 | 结束时间，Unix 时间戳（**毫秒**） |
| `--Query` | String | 是 | 检索分析语句，空字符串查全部 |
| `--TopicId` | String | 否 | 日志主题 ID |
| `--Interval` | Integer | 否 | 时间间隔（毫秒），限制：(To-From)/Interval <= 200 |
| `--SyntaxRule` | Integer | 否 | 0=Lucene语法，1=CQL语法（默认0） |

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `Interval` | Integer | 统计周期（毫秒） |
| `TotalCount` | Integer | 命中日志总条数 |
| `HistogramInfos` | Array | 周期内统计详情 |
| └ `Count` | Integer | 周期内日志条数 |
| └ `BTime` | Integer | 按 Interval 取整后的时间戳（毫秒） |

#### 示例

```bash
# 查看最近1小时错误日志分布（30秒粒度）
$env:PYTHONUTF8="1"; tccli cls DescribeLogHistogram --cli-unfold-argument `
    --region ap-shanghai `
    --From 1685086740862 `
    --To 1685087640862 `
    --Interval 30000 `
    --TopicId 797014ec-3f76-471b-abd8-a1bba1ec5cfb `
    --Query 'level:ERROR' `
    --SyntaxRule 1
```

---

### DescribeLogContext — 日志上下文

搜索指定日志前后文，定位问题全貌。

#### 语法

```bash
tccli cls DescribeLogContext --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--TopicId` | String | 是 | 日志主题 ID |
| `--BTime` | String | 是 | 日志时间，格式 `YYYY-mm-dd HH:MM:SS.FFF`（UTC+8） |
| `--PkgId` | String | 是 | 日志包序号（来自 SearchLog 返回） |
| `--PkgLogId` | Integer | 是 | 日志包内序号（来自 SearchLog 返回） |
| `--PrevLogs` | Integer | 否 | 前N条日志，默认10 |
| `--NextLogs` | Integer | 否 | 后N条日志，默认10 |
| `--Query` | String | 否 | 过滤条件，最大12KB，不支持SQL |
| `--From` | Integer | 否 | 上下文检索起始时间（毫秒时间戳） |
| `--To` | Integer | 否 | 上下文检索结束时间（毫秒时间戳） |

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `LogContextInfos` | Array | 日志上下文信息集合 |
| `PrevOver` | Boolean | 上文是否已返回完成 |
| `NextOver` | Boolean | 下文是否已返回完成 |

#### 示例

```bash
# 查看某条日志前后各10条
$env:PYTHONUTF8="1"; tccli cls DescribeLogContext --cli-unfold-argument `
    --region ap-shanghai `
    --TopicId 797014ec-3f76-471b-abd8-a1bba1ec5cfb `
    --BTime '2024-01-15 14:25:00.000' `
    --PkgId 528C1318606EFEB8-1A7 `
    --PkgLogId 65536 `
    --PrevLogs 10 `
    --NextLogs 10
```

---

## APM 应用性能监控

### DescribeGeneralMetricData — 指标数据查询

获取 APM 指标数据，支持灵活的过滤和聚合。

#### 语法

```bash
tccli apm DescribeGeneralMetricData --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--InstanceId` | String | 是 | APM 业务系统 ID |
| `--ViewName` | String | 是 | 视图名称（如 `service_metric`、`db_metric`） |
| `--Metrics` | Array | 是 | 指标名称列表（如 `request_count`、`duration_avg`） |
| `--Filters` | Array | 是 | 过滤条件列表 |
| `--StartTime` | Integer | 否 | 起始时间戳（**秒**） |
| `--EndTime` | Integer | 否 | 结束时间戳（**秒**） |
| `--Period` | Integer | 否 | 0=汇总统计，1=时间序列聚合 |
| `--GroupBy` | Array | 否 | 聚合维度列表 |
| `--OrderBy` | Object | 否 | 排序（Key=指标名，Value=asc/desc） |

#### Filters 结构

```
--Filters.0.Key <过滤维度名>
--Filters.0.Value <过滤值>
```

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `Records` | Array | 指标结果集 |
| └ `MetricName` | String | 指标名 |
| └ `MetricNameCN` | String | 指标中文名 |
| └ `TimeSerial` | Array | 时间序列（Period=1时） |
| └ `DataSerial` | Array | 数据序列 |
| └ `Tags` | Array | 维度列表 |
| └ `MetricUnit` | String | 指标单位 |

#### 常用视图和指标

| ViewName | 常用 Metrics | 说明 |
|----------|-------------|------|
| `service_metric` | `request_count`, `duration_avg`, `error_rate` | 服务监控 |
| `db_metric` | `db_call_count`, `db_duration_avg` | 数据库视图 |

#### 示例

```bash
# 查询服务请求数趋势（按时间切片）
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralMetricData --cli-unfold-argument `
    --InstanceId apm-instanceKey `
    --ViewName service_metric `
    --Metrics request_count `
    --Filters.0.Key span.kind --Filters.0.Value server `
    --Filters.1.Key service.name --Filters.1.Value apm-test `
    --StartTime 1768377000 `
    --EndTime 1768377900 `
    --Period 1

# 查询接口汇总统计（不按时间切片）
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralMetricData --cli-unfold-argument `
    --InstanceId apm-instanceKey `
    --ViewName service_metric `
    --Metrics request_count `
    --Filters.0.Key span.kind --Filters.0.Value server `
    --Filters.1.Key service.name --Filters.1.Value apm-test `
    --GroupBy operation `
    --StartTime 1768377000 `
    --EndTime 1768377900 `
    --Period 0
```

---

### DescribeGeneralOTSpanList — OT调用链列表

通用查询 OpenTelemetry 调用链列表。

#### 语法

```bash
tccli apm DescribeGeneralOTSpanList --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--InstanceId` | String | 是 | APM 业务系统 ID |
| `--StartTime` | Integer | 是 | 开始时间戳（**秒**） |
| `--EndTime` | Integer | 是 | 结束时间戳（**秒**） |
| `--Filters` | Array | 否 | 过滤参数（支持 service.name 等） |
| `--OrderBy` | Object | 否 | 排序（Key: startTime/endTime/duration，Value: asc/desc） |
| `--BusinessName` | String | 否 | 业务自身服务名，控制台用户填 `taw` |
| `--Limit` | Integer | 否 | 单页个数，默认10000，范围0~10000 |
| `--Offset` | Integer | 否 | 分页偏移 |

#### Filters 结构

```
--Filters.0.Type <过滤方式: = != in>
--Filters.0.Key <过滤维度名>
--Filters.0.Value <过滤值，in方式用逗号分隔>
```

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `TotalCount` | Integer | 总数量 |
| `Spans` | String | 压缩后的链路数据（Base64+gzip） |
| `RequestId` | String | 请求 ID |

#### Spans 解码步骤

返回的 Spans 字段经过压缩，需三步转换：
1. Base64 解码 → 压缩字节数组
2. gzip 解压 → 原始字节数组
3. UTF-8 转字符串 → 原始文本

#### 示例

```bash
# 查询某服务最近10分钟的OT调用链
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralOTSpanList --cli-unfold-argument `
    --InstanceId apm-CVfliqa8U `
    --StartTime 1739864668 `
    --EndTime 1739865268 `
    --Filters.0.Key service.name `
    --Filters.0.Type = `
    --Filters.0.Value order-service `
    --Limit 10
```

---

### DescribeGeneralSpanList — 调用链列表

通用查询调用链列表，支持按 TraceId 查询。

#### 语法

```bash
tccli apm DescribeGeneralSpanList --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--InstanceId` | String | 是 | APM 业务系统 ID |
| `--StartTime` | Integer | 是 | 开始时间戳（**秒**） |
| `--EndTime` | Integer | 是 | 结束时间戳（**秒**） |
| `--Filters` | Array | 否 | 过滤参数（支持 traceID、service.name 等） |
| `--OrderBy` | Object | 否 | 排序（Key: startTime/endTime/duration，Value: asc/desc） |
| `--BusinessName` | String | 否 | 业务自身服务名，控制台用户填 `taw` |
| `--Limit` | Integer | 否 | 单页个数，默认1000，范围1~1000 |
| `--Offset` | Integer | 否 | 分页偏移 |

#### Filters 结构

```
--Filters.0.Type <过滤方式: = != in>
--Filters.0.Key <过滤维度名>
--Filters.0.Value <过滤值，in方式用逗号分隔>
```

#### 输出参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `TotalCount` | Integer | 总数量 |
| `Spans` | Array | Span 列表（JSON，无需解码） |

#### Spans 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `TraceID` | String | Trace ID |
| `OperationName` | String | Span 名称 |
| `StartTime` | Integer | 产生时间戳（微秒） |
| `StartTimeMillis` | Integer | 产生时间戳（毫秒） |
| `Duration` | Integer | 持续耗时（微秒） |
| `SpanID` | String | Span ID |
| `ParentSpanID` | String | 父 Span ID |
| `Tags` | Array | 标签列表 |
| `Logs` | Array | 日志列表 |
| `References` | Array | 关联关系（含 TraceID 和 SpanID） |

#### 示例

```bash
# 按 TraceId 查询调用链
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralSpanList --cli-unfold-argument `
    --InstanceId apm-52Dpv13GR `
    --StartTime 1742374000 `
    --EndTime 1742374331 `
    --Filters.0.Key traceID `
    --Filters.0.Type = `
    --Filters.0.Value 663727c6d5d4436dd1fcaa509d0f4dc0 `
    --Limit 100

# 批量查询多个 TraceId
$env:PYTHONUTF8="1"; tccli apm DescribeGeneralSpanList --cli-unfold-argument `
    --InstanceId apm-52Dpv13GR `
    --StartTime 1742374000 `
    --EndTime 1742374331 `
    --Filters.0.Key traceID `
    --Filters.0.Type in `
    --Filters.0.Value "traceId1,traceId2,traceId3" `
    --Limit 100
```

---

### DescribeApmApplicationConfig — 应用配置查询

查询 APM 应用配置信息，包括探针配置、日志关联、熔断阈值等。

#### 语法

```bash
tccli apm DescribeApmApplicationConfig --cli-unfold-argument --param...
```

#### 输入参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `--InstanceId` | String | 是 | APM 实例 ID |
| `--ServiceName` | String | 是 | 服务名称 |

#### 输出参数

主要返回字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `AgentEnable` | Boolean | 探针是否启用 |
| `Components` | String | 组件信息 |
| `EnableLogConfig` | Boolean | 是否开启日志配置 |
| `LogTopicID` | String | 关联的 CLS 日志主题 ID |
| `LogRegion` | String | 日志地域 |
| `LogIndexType` | Integer | CLS 索引类型（0=全文，1=键值） |
| `LogTraceIdKey` | String | traceId 的索引 key |
| `DisableMemoryUsed` | Integer | 探针熔断内存阈值 |
| `DisableCpuUsed` | Integer | 探针熔断 CPU 阈值 |
| `ErrRateThreshold` | Integer | 错误率阈值（%） |
| `ResponseDurationWarningThreshold` | Integer | 响应时间预警阈值（ms） |
| `TraceRateLimit` | Integer | 采样限流 |
| `TraceSquash` | Boolean | 是否合并 Trace |

#### 示例

```bash
# 查询应用配置
$env:PYTHONUTF8="1"; tccli apm DescribeApmApplicationConfig --cli-unfold-argument `
    --InstanceId apm-eDyXPD6FF `
    --ServiceName java-order-service
```

---

## 通用选项

以下选项适用于所有命令：

| 选项 | 说明 |
|------|------|
| `--cli-unfold-argument` | 复杂类型参数用点号展开（必加） |
| `--region` | 指定地域（如 `ap-guangzhou`） |
| `--profile` | 指定配置账户名 |
| `--endpoint` | 指定接入点域名 |
| `--language` | 输出语言（zh-CN/en-US） |
| `--version` | 指定 API 版本 |

### 常用地域

| 地域 | 值 |
|------|-----|
| 华南地区（广州） | `ap-guangzhou` |
| 华东地区（上海） | `ap-shanghai` |
| 华北地区（北京） | `ap-beijing` |
| 西南地区（成都） | `ap-chengdu` |

---

## 帮助命令速查

以下命令均为只读安全命令，可随时执行：

```bash
# 查看 cls 产品支持的接口
tccli cls help

# 查看 apm 产品支持的接口
tccli apm help

# 查看某接口的参数说明
tccli cls SearchLog help

# 查看接口详细帮助（含示例）
$env:PYTHONUTF8="1"; tccli cls SearchLog help --detail

# 查看配置信息
tccli configure list

# 查看版本
tccli --version
```

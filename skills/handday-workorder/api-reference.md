# Handday OS API Reference

## Workorder Pagelist API

### Endpoint
`POST /biz/workorder/pagelist?access_token={JWT_TOKEN}`

### Request Body Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | int | Page number | 1 |
| limit | int | Items per page | 50 |
| title | string | Title or workorder code search | "GD2026052314140082" |
| orderByDate | string | Sort order | "" |
| customer | string | Customer name | "昆明翔然" |
| corpId | string | Company ID | "150002000" |
| industryName | string | Industry name | "五金建材" |
| industryIdAss | string | Industry ID | "" |
| orderType | string | Order type | "5"(渠道) |
| agentName | string | Agent name | "" |
| agentId | string | Agent ID | "" |
| provinceIdAss | string | Province ID | "51"(四川) |
| cityName | string | City name | "" |
| cityIdAss | string | City ID | "" |
| workorderStatusAss | string | Workorder status filter | "3"(开发处理中) |
| questionTypeAss | string | Question type filter | "1"(BUG) |
| urgencyTypeAss | string | Urgency filter | "" |
| QuestionTypeNull | string | Filter null question type | "" |
| level | string | Urgency level | "2"(常规紧急) |
| isIteration | string | Is iteration | "" |
| priority | string | Priority | "0"(P0) |
| selfStatus | string | Self-evaluation status | "" |
| selfStatusResult | string | Self-evaluation result | "" |
| productIdAss | string | Product ID | "9100006"(进销存) |
| productModuleNames | string | Product module names | "" |
| productModuleIdAss | string | Product module ID | "1202"(采购) |
| employeeName | string | Submitter name | "杨小华" |
| employeeId | string | Submitter ID | "" |
| handUserName | string | Handler name | "" |
| handUserId | string | Handler ID | "" |
| handUserIdStr | string | Handler ID string | "" |
| overdueTag | string | Overdue tag | "" |
| exploitPersonName | string | Developer name | "" |
| exploitPersonId | string | Developer ID | "" |
| testPersonName | string | Tester name | "" |
| testPersonId | string | Tester ID | "" |
| createStartDate | string | Create start date | "2026-05-26" |
| createEndDate | string | Create end date | "2026-05-26" |
| estimateStartTime | string | Estimated start | "" |
| estimateEndTime | string | Estimated end | "" |
| billOfLadingTagName | string | Bill of lading tag | "" |
| tag | string | Tag | "" |
| zenTaoNum | string | Zentao number | "" |
| demandClass | string | Demand classification | "" |
| workOrderPort | string | Workorder port | "" |
| workOrderManHour | string | Workorder man-hours | "" |
| otherCondition | string | Other conditions | "" |

### Response Structure
```json
{
  "count": 77294,
  "totalRow": null,
  "code": 0,
  "msg": "success",
  "data": [...]
}
```

### Workorder Object Fields

| Field | Description |
|-------|-------------|
| id | Unique ID |
| title | Title |
| workCode | Workorder code (GD2026...) |
| desc | Description (HTML, may contain images) |
| desNoHtml | Description (plain text) |
| status / statusName | Status code / name |
| questionType / questionTypeName | Question type code / name |
| level / levelName | Urgency level code / name |
| priority / priorityName | Priority code / name |
| progress | Progress percentage |
| productId / productName | Product ID / name |
| productModuleId / productModuleName | Module ID / name |
| productModulePath | Module path |
| corpId / corpIdName | Customer company ID |
| customerName | Customer name |
| agentId / agentName | Agent ID / name |
| agentType | Agent type |
| agentActiveLevelName | Agent level (A/B/C) |
| employeeId / employeeName | Submitter ID / name |
| createType | Creation type (指掌/代理) |
| handUserNames | Current handlers (array {name, id}) |
| exploitPersonNames | Developers (array) |
| testPersonNames | Testers (array) |
| messageReceiverNames | Message receivers (array) |
| receiveNames | Receivers (array) |
| provinceId / provinceName | Province |
| cityId / cityName | City |
| industryId / industryName | Industry |
| orderType / orderTypeName | Order type |
| finishTime | Completion time |
| estimateTime / estimateTimeStr | Estimated time |
| createTime / modifyTime | Create / modify timestamps |
| isMother | Is parent workorder |
| isStar | Is starred |
| isIteration / isIterationName | Is iteration |
| urgencyType / urgencyTypeName | Urgency type |
| handleType / handleTypeName | Handle type |
| masterType / masterTypeName | Master type |
| demandClass / demandClassName | Demand classification |
| workOrderPortAss / workOrderPortAssName | Platform port (PC端/H5端/PDA端) |
| workOrderPortAssList | Port list |
| workOrderManHour / workOrderManHourName | Man-hours |
| zenTaoNum | Zentao number |
| tags / labels | Tags |
| specificOperation | Specific operation |
| cruxMatter | Key matter |
| errorResult | Error result |
| correctResult | Correct result |
| billOfLadingTag / billOfLadingTags | Bill of lading tags |
| holisticAnalysis | Holistic analysis |
| isKeynote | Is keynote |
| contactPerson / contactNumber | Contact info |
| relevanceMsgPushId / relevanceMsgPushTitle | Related push message |

## Workorder Reply Details API

### Endpoint
`GET /biz/workorder/getreportdetails?access_token={JWT_TOKEN}&id={workorderId}`

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Workorder ID from pagelist (e.g., "DZgWNf3e4AA~") |

### Response Structure
```json
{
  "code": 0,
  "msg": "success",
  "data": [{ "id": "", "workId": 979560708513390592, "desc": "", "operaterId": "", "operaterName": "张安会", "createTime": "2026-05-27T09:37:19", "createTimeStr": "2026-05-27 09:37", "remark": "<p>reply HTML content with images</p>", "isDelete": false, "files": [], "repeatType": 0 }]
}
```

### Reply Object Fields
| Field | Description |
|-------|-------------|
| id | Reply record ID |
| workId | Numeric workorder ID (snowflake) |
| desc | System change description (e.g., status change log) |
| operaterId | Operator user ID |
| operaterName | Operator display name |
| createTime / createTimeStr | Timestamp / formatted time |
| remark | Reply content (HTML, may contain <img> with COS URLs) |
| isDelete | Soft delete flag |
| files | Attached file list |
| repeatType | 0=normal reply, 1=system status change log |

### Image extraction from remark
Same regex as desc: `/<img[^>]+src="([^"]+)"/g`
Also check `data-original` attribute for lazy-loaded images.

---

## Workorder Detail API

### Endpoint
`GET /biz/workorder/getbyid?access_token={JWT_TOKEN}&id={workorderId}`

### Important Notes
- URL is **lowercase** `getbyid`, NOT `getById`
- The `id` parameter comes from pagelist response's `id` field
- Returns full workorder detail object

---

## Enum Mappings

### workorderStatus
0=新提交, 1=二线处理中, 2=产品处理中, 3=开发处理中, 4=已处理待确认, 5=已解决, 6=已修改待内测, 7=无效工单, 8=拒绝, 9=暂不考虑, 11=待再次评估

### questionType
1=BUG, 2=新需求, 3=使用问题, 4=BUG转需求, 5=申请, 6=性能

### workflowLevel / level
1=一般, 2=常规紧急, 3=非常紧急, 4=首要紧急

### priority
0=P0(一天), 1=P1(三天), 2=P2(一周), 3=P3(迭代)

### orderType
1=代理销售, 3=网销, 4=成都分公司, 5=渠道, 6=客户成功, 7=代理销售, 9=合肥分公司, 10=杭州分公司, 12=金蝶代理商, 13=推广代理商

### productId (known)
9100006=进销存

### Province ID (common)
11=北京, 31=上海, 32=江苏, 33=浙江, 44=广东, 45=广西, 50=重庆, 51=四川

## Default Empty Request Body
```json
{
  "page": 1, "limit": 50,
  "title": "", "orderByDate": "", "customer": "", "corpId": "",
  "industryName": "", "industryIdAss": "", "orderType": "",
  "agentName": "", "agentId": "", "provinceIdAss": "",
  "cityName": "", "cityIdAss": "", "workorderStatusAss": "",
  "questionTypeAss": "", "urgencyTypeAss": "", "QuestionTypeNull": "",
  "level": "", "isIteration": "", "priority": "",
  "selfStatus": "", "selfStatusResult": "", "productIdAss": "",
  "productModuleNames": "", "productModuleIdAss": "",
  "employeeName": "", "employeeId": "", "handUserName": "",
  "handUserId": "", "handUserIdStr": "", "overdueTag": "",
  "exploitPersonName": "", "exploitPersonId": "",
  "testPersonName": "", "testPersonId": "",
  "createStartDate": "", "createEndDate": "",
  "estimateStartTime": "", "estimateEndTime": "",
  "billOfLadingTagName": "", "tag": "", "zenTaoNum": "",
  "demandClass": "", "workOrderPort": "", "workOrderManHour": "",
  "otherCondition": ""
}
```

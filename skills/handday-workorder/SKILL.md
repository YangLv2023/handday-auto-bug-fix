---
name: handday-workorder
description: Query handday OS platform data including workorders, orders, customers, and agents via browser automation. Use when user asks about workorders (工单), ticket status, workorder details, platform data queries, or anything related to os.handday.com operations system.
---

# Handday Workorder & Platform Query

Query data from handday OS platform (os.handday.com) via Chrome DevTools MCP browser automation.

## Prerequisites

- Chrome DevTools MCP server must be configured and connected
- User must be logged in (or willing to scan QR code)

## Authentication

### Check Login State
```
1. list_pages → check current page
2. navigate_page → url: https://os.handday.com/biz#/biz/tool/workorder-list
3. If redirects to /biz/login → user needs to login (see QR Login Flow below)
4. If shows 工单管理 → already authenticated
```

### QR Login Flow
```
1. Kill stale Chrome: run_in_terminal → taskkill /F /IM chrome.exe
2. navigate_page → url: https://os.handday.com/biz#/biz/tool/workorder-list
3. wait_for → text: ["企业微信登录", "当前二维码已过期"]
4. take_snapshot → check if "当前二维码已过期" appears
5. If expired: click the "刷新" link, then wait_for → text: ["企业微信登录"]
6. take_screenshot → filePath: output/qr-login-new.png (use NEW filename to avoid stale cache)
7. take_snapshot → verify no "当前二维码已过期" text (confirm QR is fresh)
8. read_file → show QR code to user for scanning
9. Wait for user to confirm login
```

**Important**: Always kill Chrome before login to avoid stale page state.
Always use a new screenshot filename to prevent serving a cached/expired image.

### Token Location
Auth token is stored in: `sessionStorage.getItem('zztxbiz')` → JSON.parse → `.access_token`

## API Calling Pattern

Use `evaluate_script` with `function` parameter to call APIs:

```javascript
async () => {
  const zztxbiz = JSON.parse(sessionStorage.getItem('zztxbiz'));
  const token = zztxbiz.access_token;
  const resp = await fetch('/biz/{endpoint}?access_token=' + token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* request body */ })
  });
  const data = await resp.json();
  // process and return data
  return data;
}
```

## Core API Endpoints

### Workorder Pagelist (Primary)
- **URL**: `POST /biz/workorder/pagelist?access_token={token}`
- **Key parameters**: See [api-reference.md](api-reference.md)

### Dictionary Data
- **URL**: `POST /biz/dict/dict?access_token={token}`
- Returns all enum values (workorderStatus, questionType, priority, etc.)

### Province Enum
- **URL**: `POST /biz/enumvalue/getProvinceIdenum?access_token={token}`
- Returns 31 provinces mapping

### Menu & Permissions
- **URL**: `GET /biz/menu?access_token={token}`
- Returns menu tree and button-level permissions

### Articles/Announcements
- **URL**: `GET /biz/article/articletop9?access_token={token}`

### Workorder Detail (with replies)
- **URL**: `GET /biz/workorder/getbyid?access_token={token}&id={workorderId}`
- Returns full workorder detail
- **workorderId** is the `id` field from pagelist response (NOT workCode)
- Note: URL is lowercase `getbyid`, NOT `getById`

### Workorder Reply/Report Details
- **URL**: `GET /biz/workorder/getreportdetails?access_token={token}&id={workorderId}`
- Returns array of reply records with: operaterName, createTimeStr, desc, remark (HTML), files
- **remark** field contains HTML with reply content and images
- Same `id` as workorder detail

### Workorder Gray Release Check
- **URL**: `POST /biz/workorder/IsGray?access_token={token}`

### Permission Check
- **URL**: `POST /biz/common/checkright?access_token={token}`

### WeChat Login
- **URL**: `GET /biz/user/Wx_Login?wxUserId={id}&isLog=true&isMobile=false`

## Complete Workorder Query Workflow

**MANDATORY**: When querying a workorder by code, you MUST always fetch BOTH basic info AND replies, AND display all images. NEVER skip any step.

> **corpId 字段重要性**：`corpId`（客户企业编号）是腾讯云日志检索的关键字段。当工单中无 traceId 但有 corpId 时，corpId 是日志检索的唯一主键，**必须**从工单数据中提取并返回。

### Step 1: Get basic info + reply details (single evaluate_script call)

Use this exact template - it fetches pagelist AND getreportdetails AND extracts all images in ONE call:

```javascript
async () => {
  const zztxbiz = JSON.parse(sessionStorage.getItem('zztxbiz'));
  const token = zztxbiz.access_token;
  // 1. Get basic info from pagelist
  const listResp = await fetch('/biz/workorder/pagelist?access_token=' + token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page:1, limit:1, title:'{WORKORDER_CODE}',
      orderByDate:'',customer:'',corpId:'',industryName:'',industryIdAss:'',
      orderType:'',agentName:'',agentId:'',provinceIdAss:'',cityName:'',
      cityIdAss:'',workorderStatusAss:'',questionTypeAss:'',urgencyTypeAss:'',
      QuestionTypeNull:'',level:'',isIteration:'',priority:'',
      selfStatus:'',selfStatusResult:'',productIdAss:'',productModuleNames:'',
      productModuleIdAss:'',employeeName:'',employeeId:'',handUserName:'',
      handUserId:'',handUserIdStr:'',overdueTag:'',exploitPersonName:'',
      exploitPersonId:'',testPersonName:'',testPersonId:'',
      createStartDate:'',createEndDate:'',estimateStartTime:'',estimateEndTime:'',
      billOfLadingTagName:'',tag:'',zenTaoNum:'',demandClass:'',
      workOrderPort:'',workOrderManHour:'',otherCondition:''
    })
  });
  const listData = await listResp.json();
  if (!listData.data || listData.data.length === 0) return { error: 'workorder not found' };
  const d = listData.data[0];

  // 2. Extract images from desc HTML
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const descImages = [];
  let m;
  while ((m = imgRegex.exec(d.desc)) !== null) descImages.push(m[1]);

  // 3. Get reply details
  const replyResp = await fetch('/biz/workorder/getreportdetails?access_token=' + token + '&id=' + encodeURIComponent(d.id));
  const replyData = await replyResp.json();
  const replies = [];
  const replyImages = [];
  if (replyData.code === 0 && replyData.data) {
    for (const r of replyData.data) {
      const remarkImgs = [];
      let rm;
      const remarkRegex = /<img[^>]+(?:src|data-original)="([^"]+)"/g;
      while ((rm = remarkRegex.exec(r.remark || '')) !== null) remarkImgs.push(rm[1]);
      replyImages.push(...remarkImgs);
      replies.push({
        operaterName: r.operaterName,
        createTime: r.createTimeStr,
        desc: r.desc,
        remarkNoHtml: r.remark ? r.remark.replace(/<[^>]+>/g, '').replace(/&nbsp;/g,' ').trim() : '',
        repeatType: r.repeatType,
        images: remarkImgs
      });
    }
  }

  return {
    basic: {
      workCode: d.workCode, title: d.title, status: d.statusName,
      questionType: d.questionTypeName, level: d.levelName, priority: d.priorityName,
      progress: d.progress, product: d.productName, module: d.productModuleName,
      corpId: d.corpId, corpIdName: d.corpIdName,
      customerName: d.customerName, agentName: d.agentName, agentLevel: d.agentActiveLevelName,
      employeeName: d.employeeName, createType: d.createType,
      handUserNames: d.handUserNames ? d.handUserNames.map(u=>u.name) : [],
      exploitPersonNames: d.exploitPersonNames ? d.exploitPersonNames.map(u=>u.name) : [],
      province: d.provinceName, city: d.cityName, industry: d.industryName,
      orderType: d.orderTypeName, createTime: d.createTime, modifyTime: d.modifyTime,
      workOrderPort: d.workOrderPortAssName, zenTaoNum: d.zenTaoNum,
      descNoHtml: d.desNoHtml ? d.desNoHtml.substring(0,500) : ''
    },
    descImageUrls: descImages,
    replies: replies,
    replyImageUrls: replyImages,
    allImageUrls: [...descImages, ...replyImages]
  };
}
```

### Step 2: Download ALL images via PowerShell
For EVERY image URL in `allImageUrls`, download via PowerShell:
```powershell
$url = "{COS_IMAGE_URL}"
$headers = @{ "Referer" = "https://os.handday.com/" }
Invoke-WebRequest -Uri $url -Headers $headers -OutFile "output/wo-{n}.png"
```

### Step 3: Display ALL downloaded images
For EACH downloaded image, use `read_file` to display it inline:
```
read_file → file_path: output/wo-{n}.png
```
Then embed in markdown: `![description](output/wo-{n}.png)`

### Step 4: Format and display complete result
Include ALL of the following in your response:
- Basic info table
- ALL desc images with captions
- Reply records table (operaterName, time, content)
- ALL reply images with captions

**NEVER** skip replies. **NEVER** skip images. If there are 0 replies, explicitly state "暂无回复".

## Common Query Templates

### Today's Workorders
```json
{ "page": 1, "limit": 50, "createStartDate": "2026-05-26", "createEndDate": "2026-05-26", /* all other fields: "" */ }
```

### By Status
Set `workorderStatusAss`: 0=新提交, 1=二线处理中, 2=产品处理中, 3=开发处理中, 4=已处理待确认, 5=已解决

### By Workorder Code
Set `title` to the workorder code (e.g., "GD2026052314140082")

### By Question Type
Set `questionTypeAss`: 1=BUG, 2=新需求, 3=使用问题, 4=BUG转需求, 5=申请, 6=性能

### By Priority
Set `priority`: 0=P0(一天), 1=P1(三天), 2=P2(一周), 3=P3(迭代)

### By Product
Set `productIdAss`: e.g., 9100006=进销存

## Image Display

Workorder descriptions and replies may contain images (COS-hosted). COS has anti-leech (Referer) and CORS restrictions.

**CRITICAL RULE**: NEVER try to display COS image URLs directly in markdown. They WILL NOT render. You MUST download them first.

### Step 1: Extract image URLs
From HTML desc/remark fields using regex: `/<img[^>]+src="([^"]+)"/g`
Also check `data-original` attribute for lazy-loaded images in replies.

### Step 2: Download images via PowerShell (MANDATORY - always do this)
```powershell
$url = "{COS_IMAGE_URL}"
$headers = @{ "Referer" = "https://os.handday.com/" }
Invoke-WebRequest -Uri $url -Headers $headers -OutFile "output/wo-img{n}.png"
```
Then: `read_file` → display the downloaded image to user.

### Step 3: Fallback - Browser Screenshot (ONLY if PowerShell fails)
```powershell
# Only use if Invoke-WebRequest fails
1. navigate_page → url: {image_url}
2. take_screenshot → filePath: output/wo-img{n}.png, fullPage: true
3. read_file → display to user
```

### What does NOT work
- ❌ Direct markdown image embedding of COS URLs → anti-leech Referer check blocks
- ❌ Browser fetch() with CORS → no Access-Control-Allow-Origin header on COS
- ❌ Canvas drawImage + toDataURL → CORS taints the canvas
- ❌ Same screenshot filename for QR codes → may serve stale/cached image

## Troubleshooting

### Chrome Instance Conflict
Error: "The browser is already running"
Fix: `taskkill /F /IM chrome.exe` then retry list_pages

### Token Verification Failed
Error: "Token验证失败请重新登陆"
Cause: Token expired or session lost
Fix: Re-navigate to login page, user must re-scan QR code

### QR Code Expired
Detection: `take_snapshot` shows "当前二维码已过期" text
Fix: Click the "刷新" link in snapshot, wait for new QR code

### Empty API Response
Cause: data.data is undefined → likely token issue
Fix: Verify token from sessionStorage, re-login if needed

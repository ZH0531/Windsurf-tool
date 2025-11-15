# API 配置说明

本应用已重构为秘钥激活系统。要使秘钥功能正常工作，需要配置正确的 API 端点。

## 配置 API 端点

有两种方式配置 API 端点：

### 方式 1：修改代码（推荐）

编辑文件 `modules/keyManager.js`，修改第 9-21 行的 API 配置：

```javascript
const API_CONFIG = {
  // 查询秘钥剩余时间的 API 端点
  CHECK_KEY_URL: 'https://your-api-domain.com/api/check-key',
  
  // 使用秘钥发起请求的 API 端点
  USE_KEY_URL: 'https://your-api-domain.com/api/use-key',
  
  // 超时时间（毫秒）
  TIMEOUT: 10000
};
```

将 `your-api-domain.com` 替换为你的实际 API 域名和路径。

### 方式 2：通过配置文件

应用会从配置文件 `%AppData%/PaperCrane-Windsurf/config.json` 读取 API URL。

你可以手动编辑此文件添加：

```json
{
  "apiCheckKeyUrl": "https://your-api-domain.com/api/check-key",
  "apiUseKeyUrl": "https://your-api-domain.com/api/use-key"
}
```

## API 接口规范

### 1. 查询秘钥状态接口

**请求方式：** POST

**请求地址：** `CHECK_KEY_URL`

**请求体：**
```json
{
  "key": "用户的秘钥字符串"
}
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "expiresAt": "2024-12-31T23:59:59.000Z",  // ISO 8601 格式的过期时间
    "remainingTime": "30天12小时",              // 可选：格式化的剩余时间字符串
    "status": "active",                        // 可选：秘钥状态
    ...其他字段
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "秘钥无效或已过期"
}
```

### 2. 使用秘钥请求接口

**请求方式：** POST

**请求地址：** `USE_KEY_URL`

**请求体：**
```json
{
  "key": "用户的秘钥字符串",
  ...其他参数
}
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    // 根据你的业务需求返回相应数据
  }
}
```

## 关键功能说明

### 1. 管理员权限
- Windows 系统启动时会自动检测是否以管理员权限运行
- 如果没有，会弹窗提示用户以管理员权限重启
- 用户可以选择取消，但某些功能（如注册表操作）可能受限

### 2. 秘钥管理
- 用户在主页输入秘钥并保存
- 秘钥保存在本地：`%AppData%/PaperCrane-Windsurf/activation-key.json`
- 点击刷新按钮可查询秘钥剩余时间
- 显示"无限额度"（硬编码，可根据需求修改）

### 3. 账号历史
- 每次切换账号时自动添加到历史记录
- 历史记录保存在：`%AppData%/PaperCrane-Windsurf/account-history.json`
- 支持功能：
  - 一键切换到历史账号
  - 标记账号为"已使用"（列表变绿）
  - 删除历史账号
  - 查看使用次数和最后使用时间

### 4. 账号管理页面
- **手动输入**：打开模态框输入 Token、邮箱、标签
- **一键切换**：自动切换到第一个未标记的历史账号
- **重置设备码**：重置设备 ID（需要管理员权限）

## 文件结构

```
PaperCrane-Windsurf/
├── modules/
│   ├── adminChecker.js          # 管理员权限检测
│   ├── keyManager.js            # 秘钥管理（⭐修改API配置）
│   ├── accountHistoryManager.js # 账号历史管理
│   ├── configManager.js         # 配置管理
│   ├── deviceManager.js         # 设备管理
│   ├── processMonitor.js        # 进程监控
│   └── sessionManager.js        # 会话管理
├── renderer/
│   ├── index.html              # 主界面
│   ├── renderer.js             # 前端逻辑
│   └── style.css               # 样式
├── main.js                     # 主进程
├── preload.js                  # 预加载脚本
└── package.json

数据文件（运行时生成）：
%AppData%/PaperCrane-Windsurf/
├── config.json                 # 应用配置
├── activation-key.json         # 激活秘钥
└── account-history.json        # 账号历史
```

## 使用流程

1. **启动应用**
   - 自动检测管理员权限
   - 加载保存的秘钥和历史记录

2. **激活秘钥**
   - 在主页输入秘钥
   - 点击"保存"按钮
   - 点击刷新图标查询剩余时间

3. **切换账号**
   - 方式1：点击"手动输入"，在弹窗中输入账号信息
   - 方式2：点击"一键切换"，自动使用下一个未标记账号
   - 方式3：在历史列表中点击某个账号的切换按钮

4. **管理历史**
   - 查看所有历史账号
   - 标记已使用的账号（变绿）
   - 删除不需要的账号

## 开发和构建

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 构建 Windows 应用
npm run build:win

# 构建所有平台
npm run build
```

## 注意事项

1. **API 端点必须配置**：默认的 `your-api-domain.com` 无法使用，必须替换为实际的 API 地址
2. **HTTPS 推荐**：生产环境建议使用 HTTPS 确保数据安全
3. **错误处理**：应用已包含完善的错误处理和用户提示
4. **管理员权限**：Windows 用户建议以管理员权限运行以获得完整功能
5. **数据备份**：账号历史和秘钥保存在本地，建议定期备份

## 自定义修改

如需修改界面文本、颜色或布局：
- **文本内容**：编辑 `renderer/index.html`
- **样式和颜色**：编辑 `renderer/style.css`
- **业务逻辑**：编辑 `renderer/renderer.js` 或 `main.js`

## 技术支持

如有问题，请检查：
1. 日志页面中的错误信息
2. 浏览器开发者工具控制台（如启用）
3. API 接口返回的错误信息

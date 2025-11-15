# 快速开始指南

## 重构内容总览

✅ 已将应用从传统账号切换工具重构为**秘钥激活系统**，包含以下核心功能：

### 🎯 主要改动

1. **强制管理员权限（Windows）**
   - 启动时自动检测管理员权限
   - 未检测到时弹窗提示以管理员权限重启
   - 用户可选择继续（功能受限）

2. **秘钥激活系统**
   - 主页添加秘钥输入框和保存功能
   - 显示秘钥状态、剩余时间、使用额度（无限）
   - 右上角刷新按钮可向服务器查询秘钥状态

3. **账号管理页面重构**
   - 原"切换账号"页改为"账号管理"
   - 三个快捷按钮：
     - **手动输入**：打开模态框输入账号
     - **一键切换**：自动切换到下一个未标记账号
     - **重置设备码**：重置设备ID

4. **历史账号列表**
   - 显示所有历史账号（自动保存）
   - 每个账号显示：邮箱、标签、使用次数、最后使用时间
   - 每行右侧操作按钮：
     - **切换**：切换到此账号
     - **标记**：标记为已使用（变绿色）
     - **删除**：删除此历史记录

5. **保持简约风格**
   - 沿用原有的简洁设计
   - 合理的间距和排版
   - 响应式设计

## 🚀 立即使用

### 步骤 1：配置 API 端点

**重要**：必须先配置 API 端点才能使用秘钥功能！

编辑 `modules/keyManager.js` 文件的第 9-21 行：

```javascript
const API_CONFIG = {
  // 查询秘钥剩余时间的 API 端点
  CHECK_KEY_URL: 'https://你的域名.com/api/check-key',
  
  // 使用秘钥发起请求的 API 端点  
  USE_KEY_URL: 'https://你的域名.com/api/use-key',
  
  // 超时时间（毫秒）
  TIMEOUT: 10000
};
```

### 步骤 2：运行应用

```bash
# 安装依赖（首次运行）
npm install

# 开发模式运行
npm start

# 或构建生产版本
npm run build:win
```

### 步骤 3：激活秘钥

1. 启动应用后，在主页找到"激活秘钥"卡片
2. 输入你的秘钥
3. 点击"保存"按钮
4. 点击右上角刷新图标查询剩余时间

### 步骤 4：管理账号

1. 点击左侧导航"账号管理"
2. 使用三种方式切换账号：
   - **手动输入**：适合添加新账号
   - **一键切换**：快速切换到下一个未用账号
   - **历史列表**：选择特定账号切换

## 📂 文件说明

### 新增模块
- `modules/adminChecker.js` - 管理员权限检测
- `modules/keyManager.js` - 秘钥管理（⭐需要配置API）
- `modules/accountHistoryManager.js` - 账号历史管理

### 修改文件
- `main.js` - 添加了秘钥和历史相关的IPC处理
- `preload.js` - 暴露新的API给渲染进程
- `renderer/index.html` - 重构了主页和账号管理页面
- `renderer/renderer.js` - 完全重写，添加新功能逻辑
- `renderer/style.css` - 添加了新UI组件的样式
- `modules/configManager.js` - 扩展支持API配置

### 数据文件（自动生成）
位于 `%AppData%/PaperCrane-Windsurf/`：
- `config.json` - 应用配置
- `activation-key.json` - 保存的秘钥
- `account-history.json` - 账号历史记录

## 🎨 界面预览

### 主页
- 激活秘钥卡片（输入框 + 保存按钮 + 刷新按钮）
- 秘钥状态信息（状态、剩余时间、额度）
- 账号信息（Windsurf运行状态、当前账号、Token）
- 安装目录检测
- 快捷操作（重置设备码、关闭/启动Windsurf）

### 账号管理
- 三个快捷按钮（手动输入、一键切换、重置设备码）
- 历史账号列表
  - 统计信息（总数、已用）
  - 每个账号的详细信息和操作按钮
  - 已标记账号显示为绿色

## 🔧 API 接口要求

### 查询秘钥状态 API

**POST** `CHECK_KEY_URL`

请求：
```json
{
  "key": "用户秘钥"
}
```

成功响应：
```json
{
  "success": true,
  "data": {
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "status": "active"
  }
}
```

失败响应：
```json
{
  "success": false,
  "message": "秘钥无效"
}
```

### 使用秘钥请求 API

**POST** `USE_KEY_URL`

请求：
```json
{
  "key": "用户秘钥",
  // ...其他参数
}
```

响应格式根据你的业务需求定义。

详细的API规范请查看 `API_CONFIG.md`。

## ⚙️ 配置项

### 修改额度显示
编辑 `renderer/index.html` 第 68-70 行：
```html
<div class="key-info-row">
  <span class="key-info-label">使用额度：</span>
  <span class="key-info-value">无限额度</span> <!-- 在这里修改 -->
</div>
```

### 修改默认标签
编辑 `modules/configManager.js` 第 33 行。

### 调整刷新间隔
编辑 `renderer/renderer.js` 第 880 行：
```javascript
setInterval(updateWindsurfStatus, 3000); // 3000 = 3秒
```

## 🐛 故障排查

### 秘钥查询失败
1. 检查 `modules/keyManager.js` 中的API URL是否正确
2. 确认API服务器正在运行
3. 查看日志页面的错误信息

### 管理员权限问题
1. 右键应用图标，选择"以管理员身份运行"
2. 或在属性中设置始终以管理员权限运行

### 历史账号列表为空
- 历史账号是在切换时自动添加的
- 手动输入并切换一次账号即可生成历史记录

### 切换账号失败
1. 确保 Windsurf 路径已正确检测
2. 检查是否有足够的管理员权限
3. 查看日志页面的详细错误信息

## 📝 待办事项（可选）

如需进一步扩展，可以考虑：

- [ ] 添加秘钥续费功能
- [ ] 支持多秘钥管理
- [ ] 账号分组功能
- [ ] 导入/导出历史账号
- [ ] 更详细的使用统计

## 📄 许可证

MIT License

## 📞 技术支持

遇到问题请查看：
1. 日志页面（应用内）
2. `API_CONFIG.md` - API配置详解
3. GitHub Issues（如果开源）

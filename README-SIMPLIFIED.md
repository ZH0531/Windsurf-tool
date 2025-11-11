# Windsurf Switcher - 简化版

🎐 简化版的 Windsurf 账号管理工具，去除了所有加密解密功能。

## ✨ 特性

- ✅ **简单直接** - 只处理明文配置，无需加密解密
- 🔍 **自动检测** - 自动检测 Windsurf 安装目录
- 💡 **状态监控** - 实时显示 Windsurf 运行状态（状态灯）
- 📝 **账号管理** - 轻松切换 Token 和邮箱
- 🎯 **设备管理** - 自动重置设备标识符
- 💾 **配置保存** - 自动保存配置到本地

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动应用

```bash
npm start
```

### 构建应用

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📖 使用说明

### 1. 检测 Windsurf 路径

应用启动后会自动检测 Windsurf 的安装路径。如果检测失败，可以点击"手动选择"按钮选择正确的路径。

### 2. 查看运行状态

顶部会显示 Windsurf 的运行状态：
- 🟢 **绿色** - 正在运行
- ⚪ **灰色** - 未运行
- 🟡 **黄色** - 无法检测

### 3. 查看当前账号

应用会显示当前配置的账号信息：
- **邮箱** - 完整显示（不打码）
- **标签** - 显示名称（默认 PaperCrane）
- **Token** - 中间部分打码显示
- **Session ID** - 完整显示

### 4. 切换账号

填写以下信息：
- **Token** - 你的 API Key（格式：sk-ws-...）
- **邮箱** - 你的邮箱地址
- **显示标签** - 自定义显示名称（默认：PaperCrane）

点击"切换账号"按钮，应用会：
1. 写入新的 Token 和邮箱到配置文件
2. 自动重新生成所有 ID（installationId、sessionId）
3. 自动重置设备码
4. 保存配置到本地

⚠️ **注意：切换账号后需要重启 Windsurf 才能生效！**

### 5. 重置设备码

如果需要单独重置设备码，可以点击"重置设备码"按钮。这会重新生成以下标识符：
- `telemetry.machineId`
- `telemetry.macMachineId`
- `telemetry.devDeviceId`
- `telemetry.sqmId`

### 6. 创建备份

在修改配置前，建议先创建备份。点击"创建备份"按钮会备份以下文件：
- `state.vscdb` - 主配置数据库
- `storage.json` - 设备标识符配置

## 🔧 技术细节

### 配置存储位置

应用会将配置保存到：
- **Windows**: `%APPDATA%\Windsurf-Switcher\config.json`
- **macOS**: `~/Library/Application Support/Windsurf-Switcher/config.json`
- **Linux**: `~/.config/Windsurf-Switcher/config.json`

### 修改的配置文件

应用会修改 Windsurf 的以下配置：
1. **state.vscdb** - 数据库中的 `codeium.windsurf` 键
   - `windsurf_auth.sessions` - 账号信息（明文 JSON）
   - `codeium.installationId` - 安装 ID

2. **storage.json** - 设备标识符
   - `telemetry.machineId`
   - `telemetry.macMachineId`
   - `telemetry.devDeviceId`
   - `telemetry.sqmId`

### 数据格式

`codeium.windsurf` 键存储的数据格式：

```json
{
  "codeium.installationId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "codeium.hasOneTimeUpdatedUnspecifiedMode": true,
  "windsurf_auth.sessions": "[{\"accessToken\":\"sk-ws-...\",\"account\":{\"id\":\"your@email.com\",\"label\":\"PaperCrane\"},\"id\":\"session-id\",\"scopes\":[]}]"
}
```

## 🎯 与原版的区别

| 功能 | 原版 | 简化版 |
|------|------|--------|
| 加密解密 | ✅ 使用 safeStorage | ❌ 去除 |
| API 调用 | ✅ 支持 refresh_token | ❌ 去除 |
| 配置方式 | 复杂 | 简单直接 |
| Token 输入 | 通过 API 获取 | 直接输入 |
| 状态监控 | ❌ 无 | ✅ 实时监控 |
| 路径检测 | 手动 | 自动检测 |
| 配置保存 | ❌ 无 | ✅ 本地保存 |

## ⚠️ 注意事项

1. **明文存储** - 简化版去除了加密功能，Token 以明文形式存储在 Windsurf 配置中
2. **需要重启** - 修改配置后必须重启 Windsurf 才能生效
3. **备份重要** - 修改前建议先创建备份
4. **路径正确** - 确保检测到的 Windsurf 路径正确

## 📝 日志说明

应用底部的日志窗口会显示所有操作信息：
- 🔵 **蓝色** - 普通信息
- 🟢 **绿色** - 成功操作
- 🔴 **红色** - 错误信息
- 🟡 **黄色** - 警告信息

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

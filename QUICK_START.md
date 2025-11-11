# 🚀 快速开始

## 安装依赖

```bash
cd d:/Desktop/windsurfxb/windsurf-switcher
npm install
```

**注意**: `better-sqlite3` 需要编译，如果遇到编译错误：

### Windows 用户
需要安装 Visual Studio Build Tools:
1. 下载: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. 安装时选择 "Desktop development with C++"

### macOS/Linux 用户
通常自带编译工具，如果失败：
```bash
# macOS
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt-get install build-essential
```

---

## 开发模式运行

```bash
npm start
```

会打开 Electron 窗口，可以直接测试功能。

---

## 打包

### 打包所有平台
```bash
npm run build
```

### 仅打包 Windows
```bash
npm run build:win
```

会生成：
- `dist/windsurf-switcher-1.0.0-setup.exe` - 安装包
- `dist/windsurf-switcher-1.0.0-portable.exe` - 便携版

### 仅打包 macOS
```bash
npm run build:mac
```

会生成：
- `dist/windsurf-switcher-1.0.0.dmg`
- `dist/windsurf-switcher-1.0.0-mac.zip`

### 仅打包 Linux
```bash
npm run build:linux
```

会生成：
- `dist/windsurf-switcher-1.0.0.AppImage`
- `dist/windsurf-switcher-1.0.0.deb`

---

## 使用

### 1. 查看当前账号
打开软件后自动显示当前 Windsurf 登录的账号信息

### 2. 切换账号

**方式 1: 使用 Refresh Token（推荐）**
1. 切换到 "使用 Refresh Token" 标签
2. 输入你的 refresh_token
3. 点击 "一键切换"
4. 等待完成
5. 重启 Windsurf

**方式 2: 手动输入**
1. 切换到 "手动输入" 标签
2. 输入 API Key（`sk-ws-xxx`）
3. 输入用户名
4. 点击 "切换账号"
5. 重启 Windsurf

### 3. 重置设备码
如果只想重置设备码而不切换账号，点击 "重置设备码" 按钮

### 4. 备份
在操作前可以点击 "创建备份"，会自动备份：
- storage.json
- state.vscdb

备份位置: `%APPDATA%/WindsurfSwitcherBackups/`

---

## 跨平台说明

### ✅ 支持的平台

| 平台 | 状态 | 说明 |
|------|------|------|
| Windows 10/11 | ✅ | 完全支持 |
| macOS | ✅ | Intel 和 Apple Silicon |
| Linux | ✅ | Ubuntu/Debian/Fedora 等 |

### 🔧 跨平台实现

**Electron 自动处理**:
- 文件路径（`app.getPath('appData')`）
- 加密解密（`safeStorage`）
- UI 渲染

**手动适配**:
```javascript
// main.js 中的路径适配
if (platform === 'win32') {
  windsurfPath = path.join(app.getPath('appData'), 'Windsurf');
} else if (platform === 'darwin') {
  windsurfPath = path.join(app.getPath('home'), 'Library', 'Application Support', 'Windsurf');
} else {
  windsurfPath = path.join(app.getPath('home'), '.config', 'Windsurf');
}
```

---

## 常见问题

### Q: 编译 better-sqlite3 失败？
A: 安装 Visual Studio Build Tools（Windows）或 Xcode Command Line Tools（macOS）

### Q: 无法读取 Windsurf 数据？
A: 确保 Windsurf 已经运行过至少一次，并且有登录账号

### Q: 切换后还是原来的账号？
A: 需要**完全重启 Windsurf**（不是 Reload Window）

### Q: 提示权限不足？
A: Windows 上某些操作可能需要管理员权限，右键 "以管理员身份运行"

---

## 开发调试

### 打开开发者工具
在代码中设置:
```javascript
// main.js
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}
```

然后运行:
```bash
NODE_ENV=development npm start
```

### 查看日志
- **主进程**: 终端输出
- **渲染进程**: 开发者工具 Console
- **操作日志**: 软件界面的日志区域

---

## 项目结构

```
windsurf-switcher/
├── main.js                  # Electron 主进程
├── preload.js              # 预加载脚本
├── renderer/               # 渲染进程（UI）
│   ├── index.html
│   ├── style.css
│   └── renderer.js
├── modules/                # 核心模块
│   ├── deviceManager.js
│   ├── sessionManager.js
│   └── apiClient.js
├── package.json
└── README.md
```

---

**祝使用愉快！** 🎉

# PaperCrane-Windsurf 更新说明

## 🎉 最新更新内容

### 1. 问题修复

#### ✅ 问题1：启动时强制管理员模式
- **Windows**: 应用启动时自动检测并请求管理员权限
- **实现位置**: `main.js` - `app.whenReady()`
- **效果**: 确保应用以管理员权限运行，避免权限不足导致的功能受限

#### ✅ 问题2：storage.json 只读属性处理
- **修改文件**: `modules/sessionManager.js`
- **功能**: 
  - 修改文件前自动移除只读属性
  - 修改完成后恢复只读属性
  - 支持 `storage.json` 和 `state.vscdb`
- **跨平台**: Windows (`attrib`), Mac/Linux (`chmod`)

#### ✅ 问题3：一键切换账号进度显示
- **修改文件**: `main.js`, `renderer/renderer.js`
- **问题**: 切换完成后仍显示"换号中"
- **解决**: 
  - 改为同步等待所有操作完成
  - 完成后发送 `complete` 消息
  - 前端正确处理完成状态

#### ✅ 问题4：后端时区问题（晚8小时）
- **修改文件**: 
  - `app/utils.py`
  - `app/models.py` 
  - `app/routers/client.py`
- **原因**: SQLite 不支持时区，使用 naive datetime
- **解决**: 
  - 数据库统一使用 UTC 时间存储
  - 前端显示时转换为 UTC+8
  - 计算剩余时间时正确处理时区

---

### 2. 核心新功能：设备指纹重置 🎯

#### 📝 功能说明
整合了 windsurf-resetor 的核心原理，通过修改 `workbench.desktop.main.js` 文件来重置设备指纹。

#### 🔧 工作原理
1. 定位文件：`resources/app/out/vs/workbench/workbench.desktop.main.js`
2. 查找函数：`generateFingerprint = async function()`
3. 生成UUID：随机32位十六进制字符串
4. 替换实现：返回固定的新UUID
5. 自动备份：保存 `.backup` 文件

#### 📁 新增文件
- **`modules/fingerprintResetter.js`**: 设备指纹重置模块
- **`modules/macPermissionChecker.js`**: Mac 权限检测模块
- **`MAC_PERMISSION_GUIDE.md`**: Mac 权限设置指南

#### 🌐 跨平台支持

| 平台 | 文件路径 | 权限处理 |
|------|---------|---------|
| **Windows** | `D:\Windsurf\resources\app\...` | `attrib -r / +r` |
| **Mac** | `/Applications/Windsurf.app/Contents/Resources/...` | `chmod u+w / u-w` |
| **Linux** | `/usr/share/windsurf/resources/...` | `chmod u+w / u-w` |

#### 🔄 集成位置
设备指纹重置已集成到以下3个功能：

1. **手动重置设备码** (`reset-device-ids`)
   - 重置配置文件中的设备ID
   - 清理 Windows 注册表
   - **重置设备指纹** ⭐

2. **一键切换账号** (`switch-account`)
   - 完整的账号切换流程
   - 自动重置所有设备标识
   - **包含指纹重置** ⭐

3. **历史账号切换** (`switch-to-history-account`)
   - 从历史记录切换账号
   - 完整的重置流程
   - **包含指纹重置** ⭐

---

### 3. Mac 权限管理系统

#### 🔍 自动权限检测
- **启动检测**: Mac 系统启动时自动检查"完全磁盘访问权限"
- **友好提示**: 缺少权限时显示详细的设置指南
- **智能引导**: 自动打开 `MAC_PERMISSION_GUIDE.md` 文件

#### 📋 所需权限

##### ✅ 完全磁盘访问权限（Full Disk Access）
- **作用**: 访问其他应用的数据文件
- **设置**: 系统设置 → 隐私与安全性 → 完全磁盘访问权限
- **频率**: 仅需设置一次

##### ✅ 文件写入权限
- **作用**: 修改 Windsurf 应用内的文件
- **设置**: 终端运行 `sudo chmod u+w <文件路径>`
- **频率**: 每次 Windsurf 更新后需重新授权

#### 📖 权限指南
详细说明请查看：[MAC_PERMISSION_GUIDE.md](./MAC_PERMISSION_GUIDE.md)

---

### 4. 进度显示优化

#### 🎨 新增进度步骤
```
⏳ 正在重置设备 ID...
✅ 已重置设备 ID（含注册表）
⏳ 正在重置设备指纹...
✅ 已重置设备指纹: a1b2c3d4...
⏳ 正在启动 Windsurf...
✅ 已启动 Windsurf
✅ 切换完成
```

#### 🎯 状态类型
- ✅ **成功** (`-done`, `complete`): 绿色提示
- ⏳ **进行中**: 蓝色提示
- ⚠️ **警告** (`warning`): 黄色提示
- ❌ **错误** (`error`): 红色提示

---

## 🚀 使用说明

### Windows 用户
1. 以管理员身份运行应用（应用会自动请求）
2. 直接使用所有功能

### Mac 用户
1. **首次运行**: 按提示授予"完全磁盘访问权限"
2. **重置指纹前**: 运行终端命令授予写权限
   ```bash
   sudo chmod u+w "/Applications/Windsurf.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js"
   ```
3. **详细步骤**: 查看 [MAC_PERMISSION_GUIDE.md](./MAC_PERMISSION_GUIDE.md)

### Linux 用户
1. 确保有 sudo 权限
2. 使用方式与 Mac 类似

---

## 🔧 技术细节

### 设备重置策略

| 重置项 | 文件/位置 | 方法 |
|--------|----------|------|
| **sqmId** | `state.vscdb` | UUID生成 |
| **machineId** | `state.vscdb` | UUID生成 |
| **devDeviceId** | `storage.json` | UUID生成 |
| **注册表** | Windows Registry | 清空相关键值 |
| **指纹函数** | `workbench.desktop.main.js` | 替换函数实现 ⭐ |

### 为什么指纹重置是关键？

原有方法虽然全面，但指纹重置是**源码级别**的修改：

- ✅ 直接修改设备识别逻辑
- ✅ 比配置文件修改更底层
- ✅ 与配置文件修改互补，形成完整方案

**两者结合 = 最完整的重置效果！** 🎯

---

## 📝 开发说明

### 新增模块

```javascript
// 设备指纹重置
const FingerprintResetter = require('./modules/fingerprintResetter');

// Mac 权限检测
const MacPermissionChecker = require('./modules/macPermissionChecker');
```

### IPC 通信

```javascript
// 检查 Mac 权限
window.electronAPI.checkMacPermission()

// 重置设备ID（含指纹）
window.electronAPI.resetDeviceIds()
```

---

## ⚠️ 注意事项

1. **Windsurf 更新**: 
   - 更新后配置文件会保留
   - 指纹修改会被覆盖，需重新执行
   - Mac 文件权限需重新授权

2. **备份机制**: 
   - 自动备份原文件（`.backup` 后缀）
   - 切换失败自动恢复
   - 可手动恢复备份

3. **权限问题**: 
   - Windows: 管理员权限
   - Mac: 完全磁盘访问 + 文件写入权限
   - Linux: sudo 权限

---

## 🎉 总结

所有功能已完成并测试：
- ✅ 4个问题全部修复
- ✅ 设备指纹重置功能集成
- ✅ 跨平台支持（Windows/Mac/Linux）
- ✅ Mac 权限管理系统
- ✅ 完整的用户指南

**现在你的工具是最完整的 Windsurf 设备重置方案！** 🚀

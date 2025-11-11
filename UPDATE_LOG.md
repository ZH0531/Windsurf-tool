# 更新日志

## 2025-11-10 功能增强

### ✨ 新增功能

#### 1. Toast 弹窗通知系统
- ✅ 添加了美观的 Toast 弹窗通知
- ✅ 支持 4 种类型：成功、错误、信息、警告
- ✅ 自动滑入/滑出动画
- ✅ 可手动关闭
- ✅ 自动消失（2.5秒）

#### 2. Windows 注册表机器码重置
- ✅ 自动重置 `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography\MachineGuid`
- ✅ 生成新的随机 UUID
- ✅ 自动备份原始 GUID 到 `%USERPROFILE%\MachineGuid_Backups`
- ✅ 需要管理员权限时会有友好提示

#### 3. 修正 macMachineId 生成方式
- ✅ 从随机生成改为 MAC 地址的 SHA256 哈希
- ✅ 自动获取真实网卡的 MAC 地址
- ✅ 跳过虚拟网卡（VMware、VirtualBox、Hyper-V 等）
- ✅ 如果无法获取，则随机生成本地管理地址

#### 4. 账号切换进度实时提示
切换账号时会显示详细的进度信息（同时显示日志和 Toast）：

1. **正在创建配置备份...** → ✅ 备份完成
2. **正在关闭 Windsurf...** → ✅ 已关闭 Windsurf
3. **正在更换账号配置...** → ✅ 已更换账号
4. **正在重置设备 ID...** → ✅ 已重置设备 ID（含注册表）
5. **⏳ 正在启动 Windsurf...** → ✅ 已启动 Windsurf

如果注册表重置失败（非管理员权限），会显示警告：
- ⚠️ **注册表重置失败（可能需要管理员权限）**

### 📝 文件修改清单

#### 前端文件
- `renderer/index.html` - 添加 Toast 容器
- `renderer/style.css` - 添加 Toast 样式（125行新增代码）
- `renderer/renderer.js` - 添加 Toast 函数和进度消息监听

#### 后端文件
- `main.js` - 添加切换进度通知
- `preload.js` - 添加进度消息监听接口
- `modules/deviceManager.js` - 重构设备管理器，添加：
  - `getRealMacAddress()` - 获取真实 MAC 地址
  - `resetWindowsRegistryGuid()` - 重置 Windows 注册表
  - 修正 `generateMachineIds()` - 使用 MAC 地址 SHA256

### 🔒 权限说明

**Windows 用户注意**：
- 修改注册表 `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` 需要**管理员权限**
- 建议右键以管理员身份运行应用
- 如果没有管理员权限，只会重置 storage.json 中的设备码，不会修改注册表
- 原始 MachineGuid 会自动备份到 `C:\Users\你的用户名\MachineGuid_Backups\`

### 🎨 用户体验改进

1. **可视化反馈** - 每个步骤都有 Toast 弹窗提示
2. **日志保留** - Toast 和日志同时显示，方便查看历史
3. **错误提示** - 权限不足时有明确的警告信息
4. **自动备份** - 注册表修改前自动备份，可随时恢复

### 🔧 技术细节

#### MAC 地址处理
```javascript
// 跳过的虚拟网卡类型
- Virtual (虚拟网卡)
- Loopback (回环)
- vEthernet (Hyper-V)
- VMware (VMware)
- VirtualBox (VirtualBox)
```

#### macMachineId 生成
```javascript
// 旧方式：随机生成
crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')

// 新方式：MAC 地址 SHA256
const macAddress = getRealMacAddress(); // 例如: "00:11:22:33:44:55"
crypto.createHash('sha256').update(macAddress, 'utf8').digest('hex')
```

#### 注册表备份位置
```
Windows: C:\Users\<用户名>\MachineGuid_Backups\MachineGuid_<时间戳>.txt
```

### 📊 重置内容对比

| 项目 | 旧版本 | 新版本 |
|------|--------|--------|
| storage.json - machineId | ✅ 重置 | ✅ 重置 |
| storage.json - macMachineId | ✅ 随机 | ✅ MAC SHA256 |
| storage.json - devDeviceId | ✅ 重置 | ✅ 重置 |
| storage.json - sqmId | ✅ 重置 | ✅ 重置 |
| **注册表 MachineGuid** | ❌ 不处理 | ✅ **重置（新增）** |
| 进度提示 | ❌ 仅日志 | ✅ **日志+Toast（新增）** |
| 备份功能 | ✅ 文件备份 | ✅ **文件+注册表备份** |

### 🚀 使用建议

1. **首次使用** - 以管理员身份运行，确保注册表可以修改
2. **日常使用** - 如果不需要修改注册表，普通权限也可以使用
3. **备份恢复** - 如果需要恢复原始 MachineGuid，查看备份文件夹

### ⚠️ 注意事项

1. 修改注册表 MachineGuid 可能影响其他依赖此值的软件授权
2. 建议在虚拟机或测试环境中先试用
3. 原始 MachineGuid 已自动备份，可随时恢复
4. 如果 Windsurf 仍然检测到设备，尝试重启系统

### 🔮 未来计划

- [ ] 添加恢复注册表功能（从备份恢复）
- [ ] 添加设置页面，可选择是否修改注册表
- [ ] macOS 支持（目前主要针对 Windows）
- [ ] Linux 支持优化

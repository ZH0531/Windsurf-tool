# Mac 系统权限授权指南

## 问题说明

Mac 系统下修改 Windsurf 应用文件需要**两种权限**：
1. ✅ **完全磁盘访问权限** - 访问其他应用的文件（必需）
2. ✅ **文件写入权限** - 修改应用内的文件（必需）

## 第一步：授予"完全磁盘访问权限"（最重要！）⭐

### macOS Ventura 及以上（macOS 13+）

1. 打开 **系统设置**（System Settings）
2. 点击左侧 **"隐私与安全性"**（Privacy & Security）
3. 点击右侧 **"完全磁盘访问权限"**（Full Disk Access）
4. 点击右下角 **"+"** 按钮
5. 找到 **PaperCrane-Windsurf** 应用，点击"打开"
6. 输入密码授权
7. **重启应用**使设置生效

### macOS Monterey 及更早版本（macOS 12 及以下）

1. 打开 **系统偏好设置** → **安全性与隐私** → **隐私**
2. 左侧选择 **"完全磁盘访问权限"**
3. 点击左下角 🔒 **解锁**（输入密码）
4. 点击 **"+"** 添加按钮
5. 添加 **PaperCrane-Windsurf** 应用
6. **重启应用**或电脑

### 为什么需要这个权限？

✅ 访问 Windsurf 的配置目录：`~/Library/Application Support/Windsurf/`
✅ 读取和修改其他应用的数据文件
✅ 访问受保护的系统目录

---

## 第二步：授予文件写入权限

### 解决方案

### 方案 1：临时授权（推荐，每次重置前执行）

打开终端（Terminal），运行以下命令：

```bash
# 授予写权限
sudo chmod u+w "/Applications/Windsurf.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js"
```

输入你的 Mac 密码后即可。

### 方案 2：一键授权脚本

创建一个脚本文件 `grant_permission.sh`：

```bash
#!/bin/bash
echo "正在授予 Windsurf 文件写权限..."
sudo chmod u+w "/Applications/Windsurf.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js"
echo "授权完成！现在可以使用重置功能了。"
```

然后运行：

```bash
chmod +x grant_permission.sh
./grant_permission.sh
```

### 方案 3：以管理员身份运行应用

```bash
# 使用 sudo 运行应用（不推荐，可能导致其他权限问题）
sudo /Applications/PaperCrane-Windsurf.app/Contents/MacOS/PaperCrane-Windsurf
```

⚠️ **注意**：以 sudo 运行可能导致配置文件权限混乱，不推荐。

## 为什么需要权限？

Windsurf 安装在系统应用目录（`/Applications`）下，默认只有系统和管理员有写权限。
我们需要修改应用内的 `workbench.desktop.main.js` 文件来重置设备指纹。

## 自动化方案（进阶）

可以使用 AppleScript 在应用内部请求权限：

```applescript
do shell script "chmod u+w '/Applications/Windsurf.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js'" with administrator privileges
```

但这需要集成到 Electron 应用中。

## 安全性说明

- ✅ 修改的是你自己电脑上的应用文件
- ✅ 只修改设备指纹函数，不影响其他功能
- ✅ 会自动备份原文件（`.backup` 后缀）
- ✅ 可以随时恢复备份

## 额外：如果应用提示"已损坏"（仅从网上下载时）

如果你从网上下载了打包好的应用，打开时提示"已损坏"或"无法验证开发者"，运行：

```bash
# 清除隔离属性
xattr -cr /Applications/PaperCrane-Windsurf.app
```

⚠️ **注意**：自己编译的应用不需要这一步！

---

## 常见问题

**Q: 两种权限都必须设置吗？**
A: 是的！
- "完全磁盘访问权限"让应用能访问 Windsurf 的配置文件
- "文件写入权限"让应用能修改 Windsurf 的源码文件

**Q: 每次重置都需要授权吗？**
A: 
- "完全磁盘访问权限"：只需设置一次
- "文件写入权限"：每次 Windsurf 更新后需要重新授权

**Q: 有没有一劳永逸的方法？**
A: "完全磁盘访问权限"已经是一劳永逸的了。文件写入权限必须每次授权是 macOS 的安全机制。

**Q: Windows 需要这样操作吗？**
A: Windows 只需要以管理员身份运行应用即可，应用会自动请求权限。

**Q: 为什么不能直接请求权限？**
A: macOS 对修改 `/Applications` 下的文件有严格限制，必须用户手动授权。Electron 应用无法自动获取这个权限。

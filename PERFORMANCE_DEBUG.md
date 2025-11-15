# 性能调试指南

## 如何查看启动性能日志

为了定位启动慢的问题，已经在代码中添加了详细的性能日志。

### Windows 系统查看日志

1. **以命令行方式运行应用**：
   ```powershell
   cd dist\win-unpacked
   .\PaperCrane-Windsurf.exe
   ```

2. **或者运行便携版**：
   ```powershell
   cd dist
   .\PaperCrane-Windsurf 1.0.0.exe
   ```

3. **在命令行窗口中查看输出的性能日志**，格式如下：
   ```
   [0ms] 开始加载主进程
   [50ms] Electron 核心模块加载完成
   [100ms] DeviceManager 加载完成
   [150ms] SessionManager 加载完成
   ...
   [2000ms] 渲染进程准备完成，显示窗口
   ```

### 关键性能指标

- **主进程模块加载**：应该在 200ms 以内完成所有模块加载
- **app.whenReady**：通常在 500-1000ms 触发
- **窗口创建**：应该在 1000ms 以内完成
- **渲染进程 DOMContentLoaded**：应该在 1500ms 以内触发
- **最终显示窗口**：应该在 3000ms 以内完成

### 常见瓶颈

1. **模块加载慢** - 如果 DeviceManager/SessionManager 加载超过 1 秒
2. **磁盘 I/O 慢** - ConfigManager/KeyManager 初始化慢
3. **渲染进程慢** - DOMContentLoaded 延迟触发
4. **资源加载慢** - lucide.min.js 或其他资源加载失败

### 下一步

运行应用后，将完整的日志发送给我，我将根据日志定位具体的性能瓶颈。

/**
 * PaperCrane-Windsurf 续杯工具
 * 支持 safeStorage 加密存储
 */

// 性能监控：记录启动时间
 
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

// ⚠️ 重要：在 app.ready 之前设置 userData 路径，确保与 Windsurf 同源
// 这样才能使用 safeStorage 解密 Windsurf 的加密数据
const platform = process.platform;
let windsurfUserDataPath;

if (process.env.WINDSURF_USER_DATA) {
  windsurfUserDataPath = process.env.WINDSURF_USER_DATA;
} else {
  if (platform === 'win32') {
    windsurfUserDataPath = path.join(app.getPath('appData'), 'Windsurf');
  } else if (platform === 'darwin') {
    windsurfUserDataPath = path.join(app.getPath('home'), 'Library', 'Application Support', 'Windsurf');
  } else {
    windsurfUserDataPath = path.join(app.getPath('home'), '.config', 'Windsurf');
  }
}

// 设置 userData 路径为 Windsurf 的路径
app.setPath('userData', windsurfUserDataPath);
console.log('🔐 已设置 userData 路径为 Windsurf 路径:', windsurfUserDataPath);

// 导入核心模块
const DeviceManager = require('./modules/deviceManager');
const SessionManager = require('./modules/sessionManager');
const ProcessMonitor = require('./modules/processMonitor');
const ConfigManager = require('./modules/configManager');
const KeyManager = require('./modules/keyManager');
const AccountHistoryManager = require('./modules/accountHistoryManager');
const AdminChecker = require('./modules/adminChecker');
const MacPermissionChecker = require('./modules/macPermissionChecker');
const SecureStorageManager = require('./modules/secureStorageManager');

let mainWindow;
let windsurfPath; // Windsurf 安装路径
let configManager; // 配置管理器
let processMonitor; // 进程监控器
let keyManager; // 秘钥管理器
let accountHistoryManager; // 账号历史管理器
let secureStorageManager; // 安全存储管理器

// 检测 Windsurf 可执行文件路径
function detectWindsurfExecutable() {
  const platform = process.platform;
  const possiblePaths = [];
  
  if (platform === 'win32') {
    // Windows 常见安装路径
    const drives = ['C:', 'D:', 'E:', 'F:']; // 常见盘符
    const installDirs = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Windsurf'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Windsurf'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Windsurf'),
      'Windsurf', // 根目录
      path.join('Program Files', 'Windsurf'),
      path.join('Program Files (x86)', 'Windsurf')
    ];
    
    // 添加 C 盘标准路径
    installDirs.forEach(dir => {
      possiblePaths.push(path.join(dir, 'Windsurf.exe'));
    });
    
    // 遍历其他盘符
    drives.forEach(drive => {
      possiblePaths.push(
        path.join(drive, '\\', 'Windsurf', 'Windsurf.exe'),
        path.join(drive, '\\', 'Program Files', 'Windsurf', 'Windsurf.exe'),
        path.join(drive, '\\', 'Program Files (x86)', 'Windsurf', 'Windsurf.exe')
      );
    });
    
  } else if (platform === 'darwin') {
    // macOS
    possiblePaths.push(
      '/Applications/Windsurf.app',
      '/Applications/Windsurf.app/Contents/MacOS/Windsurf',
      path.join(app.getPath('home'), 'Applications', 'Windsurf.app'),
      path.join(app.getPath('home'), 'Applications', 'Windsurf.app', 'Contents', 'MacOS', 'Windsurf'),
      '/usr/local/bin/windsurf',
      '/opt/homebrew/bin/windsurf'
    );
  } else {
    // Linux
    possiblePaths.push(
      '/usr/bin/windsurf',
      '/usr/local/bin/windsurf',
      '/opt/windsurf/windsurf',
      '/snap/bin/windsurf',
      path.join(app.getPath('home'), '.local', 'bin', 'windsurf'),
      path.join(app.getPath('home'), 'windsurf', 'windsurf')
    );
  }
  
  // 检查哪个路径存在
  console.log(`🔍 正在检测 ${possiblePaths.length} 个可能的路径...`);
  
  for (const exePath of possiblePaths) {
    if (exePath && fs.existsSync(exePath)) {
      console.log('✅ 找到 Windsurf:', exePath);
      return exePath;
    }
  }
  
  console.log('⚠️ 未在预设路径中找到 Windsurf，请手动选择');
  console.log('💡 提示：检测了以下位置:', possiblePaths.slice(0, 5).join(', '), '...');
  
  return null;
}

// 获取 Windsurf 数据目录路径
function getWindsurfDataPath() {
  const platform = process.platform;
  
  // 1. 先从配置中读取
  if (configManager) {
    const savedPath = configManager.getWindsurfPath();
    if (savedPath && fs.existsSync(savedPath)) {
      return savedPath;
    }
  }

  // 2. 检查环境变量
  if (process.env.WINDSURF_USER_DATA) {
    return process.env.WINDSURF_USER_DATA;
  }

  // 3. 使用标准路径
  if (platform === 'win32') {
    return path.join(app.getPath('appData'), 'Windsurf');
  } else if (platform === 'darwin') {
    return path.join(app.getPath('home'), 'Library', 'Application Support', 'Windsurf');
  } else {
    return path.join(app.getPath('home'), '.config', 'Windsurf');
  }
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 625,
    show: false,
    useContentSize: true,
    backgroundColor: '#fafbfc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      backgroundThrottling: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'PaperCrane-Windsurf',
    autoHideMenuBar: true
  });

  // 禁用菜单栏
  mainWindow.setMenu(null);

  mainWindow.loadFile('renderer/index.html');

  // 错误监听（生产环境也保留以便排查）
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription);
    // 即使加载失败也显示窗口，让用户看到错误
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  // 正常显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 超时保护：3秒后强制显示（防止 ready-to-show 未触发）
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('超时强制显示窗口');
      mainWindow.show();
    }
  }, 3000);
}

// ===== IPC 处理器 =====

// 获取当前账号信息
ipcMain.handle('get-current-account', async () => {
  try {
    if (!windsurfPath) {
      return { success: false, message: '未找到 Windsurf 路径' };
    }

    const appDataPath = path.join(app.getPath('appData'), 'PaperCrane-Windsurf');
    const sessionManager = new SessionManager(windsurfPath, appDataPath);
    const result = await sessionManager.readPlainSessions();
    
    if (!result || !result.sessions || result.sessions.length === 0) {
      return { 
        success: false, 
        message: '未找到账号信息，请先配置账号'
      };
    }

    const session = result.sessions[0];
    
    return {
      success: true,
      data: {
        email: session.account?.id || 'Unknown',
        label: session.account?.label || 'Unknown',
        token: session.accessToken,
        sessionId: session.id
      }
    };
  } catch (error) {
    console.error('读取账号失败:', error);
    return { 
      success: false, 
      message: error.message
    };
  }
});

// 重置设备码
ipcMain.handle('reset-device-ids', async () => {
  try {
    // Windows 下检查管理员权限（但不强制请求）
    let isAdmin = false;
    if (process.platform === 'win32') {
      isAdmin = await AdminChecker.isAdmin();
      if (!isAdmin) {
        console.log('⚠️ 未以管理员权限运行，注册表重置功能将受限');
      }
    }
    
    // 1. 重置配置文件中的设备ID
    const deviceManager = new DeviceManager(windsurfPath);
    const deviceIds = deviceManager.resetDeviceIds();
    
    // 2. 不再重置设备指纹，只返回设备 ID 相关信息
    return { 
      success: true, 
      data: {
        ...deviceIds,
        fingerprint: null,
        fingerprintMessage: '设备指纹重置功能已禁用',
        fingerprintIntegrityPatched: false
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 按需扫描 Windsurf 可执行文件（可能较慢）
ipcMain.handle('scan-windsurf-exe', async () => {
  try {
    const exePath = detectWindsurfExecutable();
    if (exePath) {
      configManager.setWindsurfExePath(exePath);
      return { success: true, data: { exePath } };
    }
    return { success: false, message: '未检测到 Windsurf 可执行文件' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 检测 Windsurf 是否正在运行
ipcMain.handle('check-windsurf-running', async () => {
  try {
    const isRunning = await processMonitor.isWindsurfRunning();
    return { 
      success: true, 
      data: { isRunning } 
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 检查 Mac 完全磁盘访问权限
ipcMain.handle('check-mac-permission', async () => {
  try {
    if (process.platform !== 'darwin') {
      return { 
        success: true, 
        data: { 
          platform: 'not-mac',
          message: '当前系统不是 macOS'
        } 
      };
    }

    const result = await MacPermissionChecker.checkFullDiskAccess();
    return { 
      success: true, 
      data: result
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 检测 Windsurf 安装目录
ipcMain.handle('detect-windsurf-path', async () => {
  try {
    // 快速返回：不做同步扫描，优先使用已保存的可执行路径
    const dataPath = getWindsurfDataPath();
    const dbPath = path.join(dataPath, 'User', 'globalStorage', 'state.vscdb');
    const dbExists = fs.existsSync(dbPath);

    if (dbExists) {
      configManager.setWindsurfPath(dataPath);
      windsurfPath = dataPath;
    }

    const savedExePath = configManager.getWindsurfExePath();
    const savedExeExists = !!(savedExePath && fs.existsSync(savedExePath));

    return {
      success: true,
      data: {
        exePath: savedExeExists ? savedExePath : '未检测到',
        exeExists: savedExeExists,
        dataPath,
        dbPath,
        dbExists
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 获取检测路径列表（调试用）
ipcMain.handle('get-search-paths', async () => {
  try {
    const platform = process.platform;
    const searchPaths = [];
    
    if (platform === 'win32') {
      const drives = ['C:', 'D:', 'E:', 'F:'];
      drives.forEach(drive => {
        searchPaths.push(
          `${drive}\\Windsurf\\Windsurf.exe`,
          `${drive}\\Program Files\\Windsurf\\Windsurf.exe`,
          `${drive}\\Program Files (x86)\\Windsurf\\Windsurf.exe`
        );
      });
      searchPaths.push(`${process.env.LOCALAPPDATA}\\Programs\\Windsurf\\Windsurf.exe`);
    } else if (platform === 'darwin') {
      searchPaths.push(
        '/Applications/Windsurf.app',
        '~/Applications/Windsurf.app',
        '/usr/local/bin/windsurf'
      );
    } else {
      searchPaths.push(
        '/usr/bin/windsurf',
        '/usr/local/bin/windsurf',
        '~/.local/bin/windsurf'
      );
    }
    
    return {
      success: true,
      data: { paths: searchPaths }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 手动选择 Windsurf 可执行文件
ipcMain.handle('select-windsurf-path', async () => {
  try {
    const platform = process.platform;
    const filters = [];
    
    if (platform === 'win32') {
      filters.push({ name: 'Windsurf', extensions: ['exe'] });
    } else if (platform === 'darwin') {
      filters.push({ name: 'Windsurf', extensions: ['app'] });
    }
    
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: '选择 Windsurf 可执行文件',
      filters: filters.length > 0 ? filters : undefined
    });
    
    if (result.canceled) {
      return { success: false, message: '已取消' };
    }
    
    const exePath = result.filePaths[0];
    
    // 验证是否是 Windsurf
    const fileName = path.basename(exePath).toLowerCase();
    if (!fileName.includes('windsurf')) {
      return { 
        success: false, 
        message: '选择的文件不是 Windsurf 可执行文件'
      };
    }
    
    // 保存可执行文件路径
    configManager.setWindsurfExePath(exePath);
    
    // 获取数据目录（仍然使用标准路径）
    const dataPath = getWindsurfDataPath();
    const dbPath = path.join(dataPath, 'User', 'globalStorage', 'state.vscdb');
    const dbExists = fs.existsSync(dbPath);
    
    if (dbExists) {
      configManager.setWindsurfPath(dataPath);
      windsurfPath = dataPath;
    }
    
    return {
      success: true,
      data: { 
        exePath: exePath,
        dataPath: dataPath,
        dbExists: dbExists
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 关闭 Windsurf
ipcMain.handle('kill-windsurf', async () => {
  try {
    const result = await processMonitor.killWindsurf();
    if (result.killed) {
      const message = result.wasRunning ? 'Windsurf 已关闭' : 'Windsurf 未在运行';
      return { success: true, message };
    } else {
      return { success: false, message: '关闭失败' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 启动 Windsurf
ipcMain.handle('launch-windsurf', async () => {
  try {
    // 优先使用用户手动选择的路径
    let exePath = configManager.getWindsurfExePath();
    
    // 如果没有，尝试自动检测
    if (!exePath) {
      exePath = detectWindsurfExecutable();
    }
    
    if (!exePath) {
      return { success: false, message: '未找到 Windsurf 可执行文件，请先手动选择' };
    }
    
    const success = await processMonitor.launchWindsurf(exePath);
    return { success, message: success ? 'Windsurf 已启动' : '启动失败' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// ===== 秘钥管理 IPC 处理器 =====

// 保存秘钥
ipcMain.handle('save-key', async (event, key) => {
  try {
    if (!key || !key.trim()) {
      return { success: false, message: '秘钥不能为空' };
    }

    const success = keyManager.saveKey(key.trim());
    if (success) {
      return { success: true, message: '秘钥已保存' };
    } else {
      return { success: false, message: '保存失败' };
    }
  } catch (error) {
    console.error('保存秘钥失败:', error);
    return { success: false, message: error.message };
  }
});

// 获取秘钥信息
ipcMain.handle('get-key-info', async () => {
  try {
    const keyInfo = keyManager.getKeyInfo();
    return { success: true, data: keyInfo };
  } catch (error) {
    console.error('获取秘钥信息失败:', error);
    return { success: false, message: error.message };
  }
});

// 查询秘钥状态（剩余时间等）
ipcMain.handle('check-key-status', async () => {
  try {
    return await keyManager.checkKeyStatus();
  } catch (error) {
    console.error('查询秘钥状态失败:', error);
    return { success: false, message: error.message };
  }
});

// 获取账号（仅从服务器获取并记录到历史，不进行切换或重置）
ipcMain.handle('get-account', async () => {
  try {
    const result = await keyManager.getAccount();

    // 如果获取成功且包含邮箱和 API Key，则写入历史记录
    if (result && result.success && result.data) {
      const { email, api_key, password } = result.data;
      if (email && api_key) {
        const label = password || 'PaperCrane';
        try {
          accountHistoryManager.addAccount({
            token: api_key,
            email,
            label
          });
        } catch (historyError) {
          console.error('写入账号历史失败:', historyError);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('获取账号失败:', error);
    return { success: false, message: error.message };
  }
});

// ===== 账号历史管理 IPC 处理器 =====

// 获取所有历史账号
ipcMain.handle('get-account-history', async () => {
  try {
    const accounts = accountHistoryManager.getAllAccounts();
    const stats = accountHistoryManager.getStats();
    return { 
      success: true, 
      data: { 
        accounts, 
        stats 
      } 
    };
  } catch (error) {
    console.error('获取历史账号失败:', error);
    return { success: false, message: error.message };
  }
});

// 标记/取消标记账号
ipcMain.handle('mark-account', async (event, { id, marked }) => {
  try {
    const success = accountHistoryManager.markAccount(id, marked);
    if (success) {
      return { success: true, message: marked ? '已标记为已使用' : '已取消标记' };
    } else {
      return { success: false, message: '账号不存在' };
    }
  } catch (error) {
    console.error('标记账号失败:', error);
    return { success: false, message: error.message };
  }
});

// 删除历史账号
ipcMain.handle('delete-account', async (event, id) => {
  try {
    const success = accountHistoryManager.deleteAccount(id);
    if (success) {
      return { success: true, message: '账号已删除' };
    } else {
      return { success: false, message: '账号不存在' };
    }
  } catch (error) {
    console.error('删除账号失败:', error);
    return { success: false, message: error.message };
  }
});

// 切换到历史账号
ipcMain.handle('switch-to-history-account', async (event, id) => {
  try {
    const account = accountHistoryManager.getAccountById(id);
    if (!account) {
      return { success: false, message: '账号不存在' };
    }

    // 复用现有的切换账号代码逻辑
    if (!windsurfPath) {
      return { success: false, message: '未找到 Windsurf 路径' };
    }

    const appDataPath = path.join(app.getPath('appData'), 'PaperCrane-Windsurf');
    const sessionManager = new SessionManager(windsurfPath, appDataPath);
    
    // 创建备份
    let backupPath = null;
    try {
      event.sender.send('switch-progress', { step: 'backup', message: '正在创建配置备份...' });
      backupPath = sessionManager.createBackup();
      event.sender.send('switch-progress', { step: 'backup-done', message: '✅ 备份完成' });
    } catch (backupError) {
      event.sender.send('switch-progress', { step: 'error', message: '❌ 备份失败' });
      return { success: false, message: '备份失败，已取消切换: ' + backupError.message };
    }

    // 关闭 Windsurf
    const isRunning = await processMonitor.isWindsurfRunning();
    let closed = false;
    if (isRunning) {
      event.sender.send('switch-progress', { step: 'kill', message: '正在关闭 Windsurf...' });
      const killResult = await processMonitor.killWindsurf();
      
      if (!killResult.wasRunning) {
        // 本来就没有进程在运行
        closed = true;
        event.sender.send('switch-progress', { step: 'kill-done', message: '✅ 已关闭 Windsurf' });
      } else if (killResult.killed) {
        // 轮询确认完全关闭（最多等待 3 秒）
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const stillRunning = await processMonitor.isWindsurfRunning();
          if (!stillRunning) { closed = true; break; }
        }
        if (closed) {
          event.sender.send('switch-progress', { step: 'kill-done', message: '✅ 已关闭 Windsurf' });
        } else {
          event.sender.send('switch-progress', { step: 'warning', message: '⚠️ Windsurf 可能未完全关闭，但将继续切换' });
        }
      } else {
        event.sender.send('switch-progress', { step: 'warning', message: '⚠️ 关闭 Windsurf 失败，但将继续切换' });
      }
    }

    // 尝试切换账号
    try {
      event.sender.send('switch-progress', { step: 'switch', message: '正在更换账号配置...' });
      // 同时写入明文和加密 sessions
      const result = await sessionManager.writeAllSessions(account.token, account.email, account.label);
      event.sender.send('switch-progress', { step: 'switch-done', message: '✅ 已更换账号（含加密）' });
      
      event.sender.send('switch-progress', { step: 'reset-device', message: '⏳ 正在重置设备 ID...' });
      const deviceManager = new DeviceManager(windsurfPath);
      const deviceIds = deviceManager.resetDeviceIds();
      
      if (deviceIds.registryReset) {
        event.sender.send('switch-progress', { step: 'reset-device-done', message: '✅ 已重置设备 ID（含注册表）' });
      } else {
        event.sender.send('switch-progress', { step: 'reset-device-done', message: '✅ 已重置设备 ID' });
      }
      
      // 跳过设备指纹重置功能
      event.sender.send('switch-progress', { 
        step: 'reset-fingerprint-skipped', 
        message: 'ℹ️ 已跳过设备指纹重置（功能已禁用）' 
      });
      
      // 更新最后使用时间
      accountHistoryManager.updateLastUsed(id);
      configManager.setLastEmail(account.email);
      
      // 如果之前在运行且确认已关闭，自动重启（防止残留或用户手动关闭导致误重启）
      if (isRunning && closed) {
        event.sender.send('switch-progress', { step: 'launch', message: '⏳ 正在启动 Windsurf...' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let exePath = configManager.getWindsurfExePath();
        if (!exePath) {
          exePath = detectWindsurfExecutable();
        }
        if (exePath) {
          const launched = await processMonitor.launchWindsurf(exePath);
          if (launched) {
            let started = false;
            const maxAttempts = 20;
            for (let i = 0; i < maxAttempts; i++) {
              await new Promise(resolve => setTimeout(resolve, 500));
              started = await processMonitor.isWindsurfRunning();
              if (started) break;
            }
            
            if (started) {
              event.sender.send('switch-progress', { step: 'launch-done', message: '✅ 已启动 Windsurf' });
            } else {
              event.sender.send('switch-progress', { step: 'warning', message: '⚠️ 启动命令已执行，请等待 Windsurf 完全启动' });
            }
          } else {
            event.sender.send('switch-progress', { step: 'error', message: '❌ 启动失败' });
          }
        } else {
          event.sender.send('switch-progress', { step: 'error', message: '❌ 未找到 Windsurf 可执行文件' });
        }
      }
      
      // 发送完成消息
      event.sender.send('switch-progress', { step: 'complete', message: '✅ 切换完成' });
      
      return {
        success: true,
        data: { 
          email: account.email, 
          label: account.label,
          deviceIds,
          wasRunning: isRunning
        }
      };
    } catch (switchError) {
      // 切换失败，恢复备份
      if (backupPath) {
        sessionManager.restoreBackup(backupPath);
      }
      
      if (isRunning) {
        setTimeout(async () => {
          let exePath = configManager.getWindsurfExePath();
          if (!exePath) {
            exePath = detectWindsurfExecutable();
          }
          if (exePath) {
            await processMonitor.launchWindsurf(exePath);
          }
        }, 1000);
      }
      
      return { success: false, message: '切换失败，已恢复到备份: ' + switchError.message };
    }
  } catch (error) {
    console.error('切换到历史账号失败:', error);
    return { success: false, message: error.message };
  }
});

// ===== App 生命周期 =====

app.whenReady().then(async () => {
  
  // 记录管理员权限状态（非阻塞，不影响首屏）
  if (process.platform === 'win32') {
    AdminChecker.isAdmin()
      .then((isAdmin) => {
        if (isAdmin) {
          console.log('✅ 已以管理员权限运行');
        } else {
          console.log('ℹ️ 未以管理员权限运行（部分功能需要时会提示）');
        }
      })
      .catch(() => {});
  }

  // 初始化配置管理器
  const appDataPath = path.join(app.getPath('appData'), 'PaperCrane-Windsurf');
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  configManager = new ConfigManager(appDataPath);
  processMonitor = new ProcessMonitor();
  keyManager = new KeyManager(appDataPath);
  accountHistoryManager = new AccountHistoryManager(appDataPath);
  
  // 初始化安全存储管理器（使用 Windsurf 的路径）
  secureStorageManager = new SecureStorageManager(windsurfUserDataPath);
  console.log('🔐 安全存储管理器已初始化');
  
  // KeyManager 已经使用了正确的 BASE_URL (http://localhost:8000/api/client)
  // 无需额外配置
  
  // 设置 Windsurf 数据路径
  windsurfPath = getWindsurfDataPath();
  console.log('✅ Windsurf 数据路径:', windsurfPath);
  console.log('✅ 应用配置路径:', appDataPath);
  
  createWindow();

  // Mac 系统检查"完全磁盘访问权限"
  if (process.platform === 'darwin') {
    setTimeout(async () => {
      const result = await MacPermissionChecker.checkFullDiskAccess();
      
      if (!result.hasPermission && !result.warning) {
        console.log('⚠️ Mac 系统缺少"完全磁盘访问权限"');
        
        // 显示权限提示对话框
        const dialogConfig = MacPermissionChecker.getPermissionWarningDialog();
        const { response } = await dialog.showMessageBox(mainWindow, dialogConfig);
        
        if (response === 0) {
          // 用户点击"查看详细说明"
          // 打开权限指南文件
          const guideFile = path.join(__dirname, 'MAC_PERMISSION_GUIDE.md');
          require('electron').shell.openPath(guideFile);
        }
      } else if (result.hasPermission) {
        console.log('✅ Mac 完全磁盘访问权限已授予');
      }
    }, 500);
  }

  // 启动阶段不再自动扫描可执行文件，改为由渲染进程按需触发

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

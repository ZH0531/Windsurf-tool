/**
 * PaperCrane-Windsurf 续杯工具
 * 只处理明文配置，去掉加密解密
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 导入核心模块
const DeviceManager = require('./modules/deviceManager');
const SessionManager = require('./modules/sessionManager');
const ProcessMonitor = require('./modules/processMonitor');
const ConfigManager = require('./modules/configManager');

let mainWindow;
let windsurfPath; // Windsurf 安装路径
let configManager; // 配置管理器
let processMonitor; // 进程监控器

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false // 禁用开发者工具
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'PaperCrane-Windsurf'
  });

  // 禁用菜单栏
  mainWindow.setMenu(null);

  mainWindow.loadFile('renderer/index.html');
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

// 手动切换账号（输入 token 和邮箱）
ipcMain.handle('switch-account', async (event, { token, email, label }) => {
  try {
    if (!windsurfPath) {
      return { success: false, message: '未找到 Windsurf 路径' };
    }

    if (!token || !email) {
      return { success: false, message: 'Token 和邮箱不能为空' };
    }

    const appDataPath = path.join(app.getPath('appData'), 'PaperCrane-Windsurf');
    const sessionManager = new SessionManager(windsurfPath, appDataPath);
    
    // 先创建备份
    let backupPath = null;
    try {
      event.sender.send('switch-progress', { step: 'backup', message: '正在创建配置备份...' });
      backupPath = sessionManager.createBackup();
      console.log('✅ 备份完成:', backupPath);
      event.sender.send('switch-progress', { step: 'backup-done', message: '✅ 备份完成' });
    } catch (backupError) {
      console.error('备份失败:', backupError);
      event.sender.send('switch-progress', { step: 'error', message: '❌ 备份失败' });
      return { 
        success: false, 
        message: '备份失败，已取消切换: ' + backupError.message 
      };
    }

    // 关闭 Windsurf
    const isRunning = await processMonitor.isWindsurfRunning();
    if (isRunning) {
      event.sender.send('switch-progress', { step: 'kill', message: '正在关闭 Windsurf...' });
      await processMonitor.killWindsurf();
      // 等待进程完全关闭
      await new Promise(resolve => setTimeout(resolve, 1000));
      event.sender.send('switch-progress', { step: 'kill-done', message: '✅ 已关闭 Windsurf' });
    }

    // 尝试切换账号
    try {
      event.sender.send('switch-progress', { step: 'switch', message: '正在更换账号配置...' });
      const result = await sessionManager.writePlainSessions(token, email, label || configManager.getLabel());
      event.sender.send('switch-progress', { step: 'switch-done', message: '✅ 已更换账号' });
      
      event.sender.send('switch-progress', { step: 'reset-device', message: '正在重置设备 ID...' });
      const deviceManager = new DeviceManager(windsurfPath);
      const deviceIds = deviceManager.resetDeviceIds();
      
      // 发送详细的重置结果
      if (deviceIds.registryReset) {
        event.sender.send('switch-progress', { step: 'reset-device-done', message: '✅ 已重置设备 ID（含注册表）' });
      } else {
        event.sender.send('switch-progress', { step: 'reset-device-done', message: '✅ 已重置设备 ID' });
        if (process.platform === 'win32') {
          event.sender.send('switch-progress', { step: 'warning', message: '⚠️ 注册表重置失败（可能需要管理员权限）' });
        }
      }
      
      // 保存到配置
      configManager.setLastEmail(email);
      
      // 如果之前在运行，自动重启
      if (isRunning) {
        event.sender.send('switch-progress', { step: 'launch', message: '⏳ 正在启动 Windsurf...' });
        // 等待一下再启动
        setTimeout(async () => {
          let exePath = configManager.getWindsurfExePath();
          if (!exePath) {
            exePath = detectWindsurfExecutable();
          }
          if (exePath) {
            const launched = await processMonitor.launchWindsurf(exePath);
            if (launched) {
              // 等待进程真正启动（最多等待3秒）
              let started = false;
              for (let i = 0; i < 6; i++) {
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
        }, 1500);
      }
      
      return {
        success: true,
        data: { 
          email, 
          label: label || configManager.getLabel(),
          deviceIds,
          sessionId: result.sessionId,
          wasRunning: isRunning
        }
      };
    } catch (switchError) {
      // 切换失败，恢复备份
      console.error('切换账号失败，正在恢复备份...', switchError);
      try {
        if (backupPath) {
          sessionManager.restoreBackup(backupPath);
          console.log('✅ 已恢复到备份');
        }
      } catch (restoreError) {
        console.error('恢复备份失败:', restoreError);
      }
      
      // 重启 Windsurf 如果之前在运行
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
      
      return { 
        success: false, 
        message: '切换失败，已恢复到备份: ' + switchError.message 
      };
    }
  } catch (error) {
    console.error('切换账号出错:', error);
    return { success: false, message: error.message };
  }
});

// 重置设备码
ipcMain.handle('reset-device-ids', async () => {
  try {
    const deviceManager = new DeviceManager(windsurfPath);
    const deviceIds = deviceManager.resetDeviceIds();
    
    return { success: true, data: deviceIds };
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

// 检测 Windsurf 安装目录
ipcMain.handle('detect-windsurf-path', async () => {
  try {
    // 先检测可执行文件
    const exePath = detectWindsurfExecutable();
    
    // 再检测数据目录
    const dataPath = getWindsurfDataPath();
    const dbPath = path.join(dataPath, 'User', 'globalStorage', 'state.vscdb');
    const dbExists = fs.existsSync(dbPath);
    
    if (dbExists) {
      // 保存数据目录到配置
      configManager.setWindsurfPath(dataPath);
      windsurfPath = dataPath;
    }
    
    return {
      success: true,
      data: {
        exePath: exePath || '未检测到',
        exeExists: !!exePath,
        dataPath: dataPath,
        dbPath: dbPath,
        dbExists: dbExists
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

// 获取配置
ipcMain.handle('get-config', async () => {
  try {
    return {
      success: true,
      data: configManager.getAllConfig()
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 更新标签
ipcMain.handle('update-label', async (event, label) => {
  try {
    configManager.setLabel(label);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 关闭 Windsurf
ipcMain.handle('kill-windsurf', async () => {
  try {
    const success = await processMonitor.killWindsurf();
    return { success, message: success ? 'Windsurf 已关闭' : '关闭失败' };
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

// 获取系统信息
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    windsurfPath: windsurfPath || '未检测到'
  };
});

// ===== App 生命周期 =====

app.whenReady().then(() => {
  // 初始化配置管理器
  const appDataPath = path.join(app.getPath('appData'), 'PaperCrane-Windsurf');
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  configManager = new ConfigManager(appDataPath);
  processMonitor = new ProcessMonitor();
  
  // 设置 Windsurf 数据路径
  windsurfPath = getWindsurfDataPath();
  console.log('✅ Windsurf 数据路径:', windsurfPath);
  console.log('✅ 应用配置路径:', appDataPath);
  
  // 检测可执行文件
  const exePath = detectWindsurfExecutable();
  if (exePath) {
    console.log('✅ Windsurf 可执行文件:', exePath);
  } else {
    console.log('⚠️ 未检测到 Windsurf 可执行文件');
  }
  
  createWindow();

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

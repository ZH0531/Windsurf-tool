/**
 * Preload Script - 简化版
 * 桥接主进程和渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取当前账号
  getCurrentAccount: () => ipcRenderer.invoke('get-current-account'),
  
  // 切换账号
  switchAccount: (data) => ipcRenderer.invoke('switch-account', data),
  
  // 重置设备码
  resetDeviceIds: () => ipcRenderer.invoke('reset-device-ids'),
  
  // 获取系统信息
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // 检测 Windsurf 是否运行
  checkWindsurfRunning: () => ipcRenderer.invoke('check-windsurf-running'),
  
  // 检测 Windsurf 路径
  detectWindsurfPath: () => ipcRenderer.invoke('detect-windsurf-path'),
  
  // 手动选择 Windsurf 路径
  selectWindsurfPath: () => ipcRenderer.invoke('select-windsurf-path'),
  
  // 获取配置
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // 更新标签
  updateLabel: (label) => ipcRenderer.invoke('update-label', label),
  
  // 关闭 Windsurf
  killWindsurf: () => ipcRenderer.invoke('kill-windsurf'),
  
  // 启动 Windsurf
  launchWindsurf: () => ipcRenderer.invoke('launch-windsurf'),
  
  // 监听切换账号进度消息
  onSwitchProgress: (callback) => {
    ipcRenderer.on('switch-progress', (event, data) => callback(data));
  }
});

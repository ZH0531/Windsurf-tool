/**
 * 管理员权限检测器
 * 检测和请求 Windows 管理员权限
 */

const { exec } = require('child_process');
const { dialog } = require('electron');

class AdminChecker {
  /**
   * 检测当前是否以管理员权限运行
   * @returns {Promise<boolean>}
   */
  static async isAdmin() {
    if (process.platform !== 'win32') {
      // 非 Windows 系统，返回 true
      return true;
    }

    return new Promise((resolve) => {
      exec('net session', (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * 请求管理员权限（重启应用）
   */
  static async requestAdmin(extraArgs = []) {
    const { app } = require('electron');
    
    if (process.platform !== 'win32') {
      return false;
    }

    try {
      // 提示用户需要管理员权限
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: '需要管理员权限',
        message: '此应用需要以管理员权限运行',
        detail: '点击"确定"将以管理员权限重新启动应用',
        buttons: ['确定', '取消'],
        defaultId: 0,
        cancelId: 1
      });

      if (result.response === 0) {
        // 用户点击了确定
        const { spawn } = require('child_process');
        const path = require('path');
        
        // 使用 PowerShell 以管理员权限启动
        const appPath = process.execPath;
        const args = (Array.isArray(extraArgs) && extraArgs.length > 0) ? extraArgs : process.argv.slice(1);
        
        // 构建 PowerShell 命令，正确处理路径和参数转义
        // 使用单引号包裹路径避免转义问题，对于参数使用逗号分隔的数组格式
        let psCommand;
        if (args.length > 0) {
          // 转义参数中的单引号和特殊字符
          const escapedArgs = args.map(arg => {
            // 替换单引号为两个单引号（PowerShell 转义方式）
            return `'${arg.replace(/'/g, "''")}'`;
          }).join(',');
          psCommand = `Start-Process -FilePath '${appPath.replace(/'/g, "''")}' -ArgumentList ${escapedArgs} -Verb RunAs`;
        } else {
          psCommand = `Start-Process -FilePath '${appPath.replace(/'/g, "''")}' -Verb RunAs`;
        }
        
        console.log('PowerShell 命令:', psCommand);
        
        // 启动新进程
        const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], {
          detached: true,
          stdio: 'ignore',
          shell: false
        });
        
        // 确保子进程独立运行
        child.unref();
        
        // 延迟退出，给新进程一点时间启动
        setTimeout(() => {
          app.quit();
        }, 500);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('请求管理员权限失败:', error);
      return false;
    }
  }
}

module.exports = AdminChecker;

/**
 * 进程监控器
 * 检测 Windsurf 是否正在运行
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class ProcessMonitor {
  constructor() {
    this.platform = process.platform;
  }

  /**
   * 检测 Windsurf 是否正在运行
   */
  async isWindsurfRunning() {
    try {
      if (this.platform === 'win32') {
        // Windows: 使用 tasklist 精确匹配 Windsurf.exe,排除 PaperCrane
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq Windsurf.exe"');
        const lines = stdout.toLowerCase().split('\n');
        // 检查是否有 windsurf.exe 进程,但排除包含 papercrane 的
        for (const line of lines) {
          if (line.includes('windsurf.exe') && !line.includes('papercrane')) {
            return true;
          }
        }
        return false;
      } else if (this.platform === 'darwin') {
        // macOS: 使用 ps,排除 papercrane 进程
        try {
          const { stdout } = await execPromise('ps aux | grep -i windsurf | grep -v grep | grep -v -i papercrane');
          return stdout.trim().length > 0;
        } catch (error) {
          // grep 没有找到匹配时会返回错误码,这是正常情况
          return false;
        }
      } else {
        // Linux: 使用 ps,排除 papercrane 进程
        try {
          const { stdout } = await execPromise('ps aux | grep -i windsurf | grep -v grep | grep -v -i papercrane');
          return stdout.trim().length > 0;
        } catch (error) {
          // grep 没有找到匹配时会返回错误码,这是正常情况
          return false;
        }
      }
    } catch (error) {
      console.error('检测进程失败:', error);
      return false;
    }
  }

  /**
   * 获取 Windsurf 进程列表
   */
  async getWindsurfProcesses() {
    try {
      if (this.platform === 'win32') {
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq Windsurf.exe"');
        const lines = stdout.split('\n').filter(line => {
          const lower = line.toLowerCase();
          return lower.includes('windsurf.exe') && !lower.includes('papercrane');
        });
        return lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            name: parts[0],
            pid: parts[1],
            memory: parts[4]
          };
        });
      } else {
        try {
          const { stdout } = await execPromise('ps aux | grep -i windsurf | grep -v grep | grep -v -i papercrane');
          const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
          return lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              user: parts[0],
              pid: parts[1],
              cpu: parts[2],
              memory: parts[3],
              command: parts.slice(10).join(' ')
            };
          });
        } catch (error) {
          // grep 没有找到匹配时会返回错误码
          return [];
        }
      }
    } catch (error) {
      console.error('获取进程列表失败:', error);
      return [];
    }
  }

  /**
   * 关闭 Windsurf 进程
   */
  async killWindsurf() {
    try {
      if (this.platform === 'win32') {
        // Windows: 使用 taskkill
        await execPromise('taskkill /F /IM Windsurf.exe');
        return true;
      } else if (this.platform === 'darwin') {
        // macOS: 使用 killall
        await execPromise('killall Windsurf');
        return true;
      } else {
        // Linux: 使用 killall
        await execPromise('killall windsurf');
        return true;
      }
    } catch (error) {
      console.error('关闭 Windsurf 失败:', error);
      return false;
    }
  }

  /**
   * 启动 Windsurf
   * @param {string} exePath - Windsurf 可执行文件路径
   */
  async launchWindsurf(exePath) {
    try {
      if (!exePath) {
        throw new Error('未指定 Windsurf 路径');
      }

      if (this.platform === 'win32') {
        // Windows: 使用 start
        await execPromise(`start "" "${exePath}"`);
      } else if (this.platform === 'darwin') {
        // macOS: 使用 open
        await execPromise(`open "${exePath}"`);
      } else {
        // Linux: 直接执行
        await execPromise(`"${exePath}" &`);
      }
      return true;
    } catch (error) {
      console.error('启动 Windsurf 失败:', error);
      return false;
    }
  }
}

module.exports = ProcessMonitor;

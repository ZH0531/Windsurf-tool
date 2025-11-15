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
        // 不再使用 PowerShell 模糊匹配，避免误判其他进程
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
   * 关闭 Windsurf 进程
   * @returns {Promise<{killed: boolean, wasRunning: boolean}>} 返回是否成功关闭和是否原本在运行
   */
  async killWindsurf() {
    try {
      if (this.platform === 'win32') {
        // Windows: 使用 taskkill，捕获输出判断是否有进程被关闭
        const { stdout, stderr } = await execPromise('taskkill /F /IM Windsurf.exe');
        const output = (stdout + stderr).toLowerCase();
        // 如果输出包含"成功"或"已终止"，说明有进程被关闭
        if (output.includes('成功') || output.includes('已终止') || output.includes('success') || output.includes('terminated')) {
          return { killed: true, wasRunning: true };
        }
        // 如果包含"找不到"或"not found"，说明没有该进程
        if (output.includes('找不到') || output.includes('not found') || output.includes('not running')) {
          return { killed: true, wasRunning: false };
        }
        return { killed: true, wasRunning: true };
      } else if (this.platform === 'darwin') {
        // macOS: 使用 killall
        await execPromise('killall Windsurf');
        return { killed: true, wasRunning: true };
      } else {
        // Linux: 使用 killall
        await execPromise('killall windsurf');
        return { killed: true, wasRunning: true };
      }
    } catch (error) {
      console.error('关闭 Windsurf 失败:', error);
      const errorMsg = error.message.toLowerCase();
      // 如果错误是"找不到进程"，说明本来就没运行
      if (errorMsg.includes('找不到') || errorMsg.includes('not found') || errorMsg.includes('no such process')) {
        return { killed: true, wasRunning: false };
      }
      return { killed: false, wasRunning: true };
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

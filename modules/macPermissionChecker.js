const fs = require('fs');
const path = require('path');
const os = require('os');

class MacPermissionChecker {
  /**
   * 检查是否有完全磁盘访问权限（Full Disk Access）
   * 通过尝试访问受保护的目录来检测
   * @returns {Promise<Object>} { hasPermission, message }
   */
  static async checkFullDiskAccess() {
    // 仅在 Mac 系统上检查
    if (process.platform !== 'darwin') {
      return { hasPermission: true, message: 'Not macOS' };
    }

    try {
      // 尝试访问 Windsurf 的配置目录
      const windsurfConfigPath = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Windsurf',
        'User',
        'globalStorage'
      );

      // 尝试读取目录，如果没有权限会抛出错误
      const stats = fs.statSync(windsurfConfigPath);
      
      // 尝试读取 state.vscdb 文件
      const dbPath = path.join(windsurfConfigPath, 'state.vscdb');
      if (fs.existsSync(dbPath)) {
        // 尝试打开文件读取
        fs.accessSync(dbPath, fs.constants.R_OK);
      }

      return { 
        hasPermission: true, 
        message: '已有完全磁盘访问权限' 
      };

    } catch (error) {
      // EACCES 或 EPERM 表示权限不足
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return { 
          hasPermission: false, 
          message: '缺少完全磁盘访问权限',
          errorCode: error.code
        };
      }
      
      // 如果是文件不存在，可能是 Windsurf 未安装
      if (error.code === 'ENOENT') {
        return { 
          hasPermission: true, 
          message: 'Windsurf 配置目录不存在（可能未安装）',
          warning: true
        };
      }

      // 其他错误
      return { 
        hasPermission: false, 
        message: `检测失败: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * 获取权限设置指南
   * @returns {string} 指南文本
   */
  static getPermissionGuide() {
    const macVersion = this.getMacOSVersion();
    
    if (macVersion >= 13) {
      // macOS Ventura 及以上
      return `检测到您使用的是 macOS ${macVersion}，需要授予"完全磁盘访问权限"：

1. 打开"系统设置"
2. 点击左侧"隐私与安全性"
3. 点击右侧"完全磁盘访问权限"
4. 点击右下角"+"按钮
5. 找到"PaperCrane-Windsurf"应用，点击"打开"
6. 输入密码授权
7. 重启本应用
`;
    } else {
      // macOS Monterey 及更早版本
      return `需要授予"完全磁盘访问权限"：

1. 打开"系统偏好设置" → "安全性与隐私" → "隐私"
2. 左侧选择"完全磁盘访问权限"
3. 点击左下角🔒解锁（输入密码）
4. 点击"+"添加按钮
5. 添加"PaperCrane-Windsurf"应用
6. 重启本应用
`;
    }
  }

  /**
   * 获取 macOS 版本号
   * @returns {number} 主版本号
   */
  static getMacOSVersion() {
    if (process.platform !== 'darwin') {
      return 0;
    }

    try {
      const release = os.release();
      // Darwin 版本映射到 macOS 版本
      // 例如：Darwin 22.x.x = macOS 13 (Ventura)
      const darwinVersion = parseInt(release.split('.')[0]);
      
      // Darwin 版本号 - 9 = macOS 主版本号
      // Darwin 22 -> macOS 13
      // Darwin 21 -> macOS 12
      const macosVersion = darwinVersion - 9;
      
      return macosVersion;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 显示权限警告（返回对话框配置）
   * @returns {Object} 对话框配置
   */
  static getPermissionWarningDialog() {
    return {
      type: 'warning',
      title: '需要授予权限',
      message: 'Mac 系统需要"完全磁盘访问权限"才能正常使用',
      detail: this.getPermissionGuide(),
      buttons: ['查看详细说明', '稍后设置'],
      defaultId: 0,
      cancelId: 1
    };
  }
}

module.exports = MacPermissionChecker;

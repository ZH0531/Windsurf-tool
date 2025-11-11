/**
 * 配置管理器
 * 管理应用配置，包括 Windsurf 路径等
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.configPath = path.join(appDataPath, 'config.json');
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }

    // 返回默认配置
    return {
      windsurfPath: null,
      windsurfExePath: null, // 可执行文件路径
      label: 'PaperCrane', // 默认标签
      lastEmail: null,
      lastUpdated: null
    };
  }

  /**
   * 保存配置
   */
  saveConfig() {
    try {
      // 确保目录存在
      if (!fs.existsSync(this.appDataPath)) {
        fs.mkdirSync(this.appDataPath, { recursive: true });
      }

      this.config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ 配置已保存');
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }

  /**
   * 获取 Windsurf 路径
   */
  getWindsurfPath() {
    return this.config.windsurfPath;
  }

  /**
   * 设置 Windsurf 路径
   */
  setWindsurfPath(windsurfPath) {
    this.config.windsurfPath = windsurfPath;
    return this.saveConfig();
  }

  /**
   * 获取标签
   */
  getLabel() {
    return this.config.label || 'PaperCrane';
  }

  /**
   * 设置标签
   */
  setLabel(label) {
    this.config.label = label;
    return this.saveConfig();
  }

  /**
   * 获取上次使用的邮箱
   */
  getLastEmail() {
    return this.config.lastEmail;
  }

  /**
   * 设置上次使用的邮箱
   */
  setLastEmail(email) {
    this.config.lastEmail = email;
    return this.saveConfig();
  }

  /**
   * 获取可执行文件路径
   */
  getWindsurfExePath() {
    return this.config.windsurfExePath;
  }

  /**
   * 设置可执行文件路径
   */
  setWindsurfExePath(exePath) {
    this.config.windsurfExePath = exePath;
    return this.saveConfig();
  }

  /**
   * 获取所有配置
   */
  getAllConfig() {
    return { ...this.config };
  }
}

module.exports = ConfigManager;

/**
 * 秘钥管理器
 * 管理激活秘钥和查询剩余时间
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置 API 端点 - 可在此处统一修改
const API_CONFIG = {
  // Base URL - 生产环境使用域名
  BASE_URL: 'https://windsurf.zh8888.top/api/client',
  
  // 超时时间（毫秒）
  TIMEOUT: 10000
};

class KeyManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.keyFilePath = path.join(appDataPath, 'activation-key.json');
    this.keyData = this.loadKey();
  }

  /**
   * 加载保存的秘钥
   */
  loadKey() {
    try {
      if (fs.existsSync(this.keyFilePath)) {
        const data = fs.readFileSync(this.keyFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载秘钥失败:', error);
    }

    return {
      key: null,
      savedAt: null,
      lastChecked: null,
      expiresAt: null
    };
  }

  /**
   * 保存秘钥到本地
   */
  saveKey(key) {
    try {
      if (!fs.existsSync(this.appDataPath)) {
        fs.mkdirSync(this.appDataPath, { recursive: true });
      }

      this.keyData = {
        key: key,
        savedAt: new Date().toISOString(),
        lastChecked: null,
        expiresAt: null
      };

      fs.writeFileSync(this.keyFilePath, JSON.stringify(this.keyData, null, 2));
      console.log('✅ 秘钥已保存');
      return true;
    } catch (error) {
      console.error('保存秘钥失败:', error);
      return false;
    }
  }

  /**
   * 获取当前秘钥
   */
  getKey() {
    return this.keyData.key;
  }

  /**
   * 检查秘钥是否已保存
   */
  hasKey() {
    return !!this.keyData.key;
  }

  /**
   * 查询秘钥状态
   * @returns {Promise<Object>} 包含剩余时间等信息
   */
  async checkKeyStatus() {
    if (!this.keyData.key) {
      return {
        success: false,
        message: '未设置秘钥'
      };
    }

    try {
      const response = await axios.get(
        API_CONFIG.BASE_URL + '/key/status',
        {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'X-API-Key': this.keyData.key
          }
        }
      );

      // 更新最后检查时间
      this.keyData.lastChecked = new Date().toISOString();
      
      if (response.data && response.data.expires_at) {
        this.keyData.expiresAt = response.data.expires_at;
      }
      
      this.saveKeyData();

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('查询秘钥状态失败:', error);
      
      let message = '查询失败';
      if (error.response) {
        message = error.response.data?.detail || error.response.data?.message || `服务器错误 (${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        message = '请求超时';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = '无法连接到服务器';
      }

      return {
        success: false,
        message: message,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * 获取账号
   * @returns {Promise<Object>} 包含账号信息
   */
  async getAccount() {
    if (!this.keyData.key) {
      return {
        success: false,
        message: '未设置秘钥'
      };
    }

    try {
      const response = await axios.post(
        API_CONFIG.BASE_URL + '/account/get',
        {},
        {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'X-API-Key': this.keyData.key
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('获取账号失败:', error);
      
      let message = '获取账号失败';
      if (error.response) {
        message = error.response.data?.detail || error.response.data?.message || `服务器错误 (${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        message = '请求超时';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = '无法连接到服务器';
      }

      return {
        success: false,
        message: message,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * 使用秘钥发起请求
   * @param {Object} params 额外参数
   * @returns {Promise<Object>}
   */
  async useKey(params = {}) {
    if (!this.keyData.key) {
      return {
        success: false,
        message: '未设置秘钥'
      };
    }

    try {
      const response = await axios.post(
        API_CONFIG.BASE_URL + '/key/use',
        {
          key: this.keyData.key,
          ...params
        },
        {
          timeout: API_CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('使用秘钥请求失败:', error);
      
      let message = '请求失败';
      if (error.response) {
        message = error.response.data?.message || `服务器错误 (${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        message = '请求超时';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = '无法连接到服务器';
      }

      return {
        success: false,
        message: message
      };
    }
  }

  /**
   * 保存秘钥数据（不修改秘钥本身）
   */
  saveKeyData() {
    try {
      fs.writeFileSync(this.keyFilePath, JSON.stringify(this.keyData, null, 2));
      return true;
    } catch (error) {
      console.error('保存秘钥数据失败:', error);
      return false;
    }
  }

  /**
   * 清除秘钥
   */
  clearKey() {
    this.keyData = {
      key: null,
      savedAt: null,
      lastChecked: null,
      expiresAt: null
    };
    
    try {
      if (fs.existsSync(this.keyFilePath)) {
        fs.unlinkSync(this.keyFilePath);
      }
      return true;
    } catch (error) {
      console.error('清除秘钥失败:', error);
      return false;
    }
  }

  /**
   * 获取秘钥信息
   */
  getKeyInfo() {
    return {
      hasKey: this.hasKey(),
      key: this.keyData.key,
      savedAt: this.keyData.savedAt,
      lastChecked: this.keyData.lastChecked,
      expiresAt: this.keyData.expiresAt
    };
  }

  /**
   * 更新 API 配置（静态方法）
   * @param {Object} config 
   */
  static updateAPIConfig(config) {
    if (config.BASE_URL) {
      API_CONFIG.BASE_URL = config.BASE_URL;
    }
    if (config.TIMEOUT) {
      API_CONFIG.TIMEOUT = config.TIMEOUT;
    }
  }

  /**
   * 获取当前 API 配置（静态方法）
   */
  static getAPIConfig() {
    return { ...API_CONFIG };
  }
}

module.exports = KeyManager;

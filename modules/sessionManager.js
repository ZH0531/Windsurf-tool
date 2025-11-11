/**
 * Session 管理器 - 简化版
 * 只处理明文 session 数据 (codeium.windsurf key)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor(windsurfPath, appDataPath) {
    this.windsurfPath = windsurfPath || this.getWindsurfPath();
    this.appDataPath = appDataPath; // 应用数据路径
    this.dbPath = this.getDbPath();
    this.plainSessionKey = 'codeium.windsurf'; // 明文 session key
  }

  /**
   * 获取 Windsurf 用户数据路径
   */
  getWindsurfPath() {
    const platform = process.platform;
    let windsurfPath;

    if (process.env.WINDSURF_USER_DATA) {
      windsurfPath = process.env.WINDSURF_USER_DATA;
    } else {
      if (platform === 'win32') {
        windsurfPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Windsurf');
      } else if (platform === 'darwin') {
        windsurfPath = path.join(require('os').homedir(), 'Library', 'Application Support', 'Windsurf');
      } else {
        windsurfPath = path.join(require('os').homedir(), '.config', 'Windsurf');
      }
    }
    
    return windsurfPath;
  }

  /**
   * 获取 state.vscdb 路径
   */
  getDbPath() {
    return path.join(this.windsurfPath, 'User', 'globalStorage', 'state.vscdb');
  }

  /**
   * 检查数据库是否存在
   */
  checkDbExists() {
    return fs.existsSync(this.dbPath);
  }

  /**
   * 读取明文 sessions (codeium.windsurf key)
   * 这个key存储的是明文JSON，不需要解密
   */
  async readPlainSessions() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('未找到 state.vscdb');
      }

      const filebuffer = fs.readFileSync(this.dbPath);
      const SQL = await initSqlJs();
      const db = new SQL.Database(filebuffer);

      // 读取明文 session key
      const results = db.exec(`SELECT value FROM ItemTable WHERE key = ?`, [this.plainSessionKey]);
      db.close();

      if (!results || results.length === 0 || results[0].values.length === 0) {
        console.log('未找到明文 sessions 数据');
        return null;
      }

      const value = results[0].values[0][0];
      
      if (!value) {
        console.log('明文 Sessions 数据为空');
        return null;
      }

      // 这是一个 JSON 对象，里面包含各种配置
      const plainData = JSON.parse(value);
      
      console.log('✅ 读取明文 sessions 成功');
      console.log('数据内容:', plainData);
      
      // 如果有 windsurf_auth.sessions 字段，解析它
      if (plainData['windsurf_auth.sessions']) {
        const sessions = JSON.parse(plainData['windsurf_auth.sessions']);
        console.log('Sessions 数组:', sessions);
        return {
          raw: plainData,
          sessions: sessions
        };
      }
      
      return {
        raw: plainData,
        sessions: null
      };
    } catch (error) {
      console.error('读取明文 sessions 失败:', error.message);
      throw error;
    }
  }

  /**
   * 写入明文 sessions (codeium.windsurf key)
   * @param {string} token - API Token
   * @param {string} email - 邮箱（用于 account.id）
   * @param {string} label - 显示标签（默认为 "PaperCrane"）
   */
  async writePlainSessions(token, email, label = 'PaperCrane') {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('未找到 state.vscdb');
      }

      // 构建 sessions 数据 - ID 使用邮箱，label 使用传入的标签
      const sessionId = uuidv4();
      const sessions = [{
        accessToken: token,
        account: {
          id: email,
          label: label
        },
        id: sessionId,
        scopes: []
      }];

      // 读取现有数据
      const filebuffer = fs.readFileSync(this.dbPath);
      const SQL = await initSqlJs();
      const db = new SQL.Database(filebuffer);

      // 读取现有的明文数据
      const results = db.exec(`SELECT value FROM ItemTable WHERE key = ?`, [this.plainSessionKey]);
      let plainData = {};
      
      if (results && results.length > 0 && results[0].values.length > 0) {
        const existingValue = results[0].values[0][0];
        if (existingValue) {
          plainData = JSON.parse(existingValue);
        }
      }

      // 更新 windsurf_auth.sessions 字段
      plainData['windsurf_auth.sessions'] = JSON.stringify(sessions);
      
      // 重新生成所有 ID
      plainData['codeium.installationId'] = uuidv4();
      if (!plainData['codeium.hasOneTimeUpdatedUnspecifiedMode']) {
        plainData['codeium.hasOneTimeUpdatedUnspecifiedMode'] = true;
      }

      // 写入数据库
      const plainDataStr = JSON.stringify(plainData);
      db.run('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)', [
        this.plainSessionKey,
        plainDataStr
      ]);

      // 保存到文件
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      db.close();

      console.log('✅ Sessions 已写入');
      console.log('   邮箱:', email);
      console.log('   标签:', label);
      console.log('   Token 长度:', token.length);
      
      return {
        success: true,
        sessionId,
        installationId: plainData['codeium.installationId']
      };
    } catch (error) {
      console.error('写入 sessions 失败:', error);
      throw error;
    }
  }

  /**
   * 创建备份
   */
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      // 使用应用数据目录下的 backups 文件夹
      const backupDir = this.appDataPath ? path.join(this.appDataPath, 'backups') : path.join(this.windsurfPath, '..', 'PaperCrane-Windsurf', 'backups');
      fs.mkdirSync(backupDir, { recursive: true });

      const backupPath = path.join(backupDir, `backup_${timestamp}`);
      fs.mkdirSync(backupPath, { recursive: true });

      // 备份 storage.json
      const storagePath = path.join(this.windsurfPath, 'User', 'globalStorage', 'storage.json');
      if (fs.existsSync(storagePath)) {
        fs.copyFileSync(storagePath, path.join(backupPath, 'storage.json'));
      }

      // 备份 state.vscdb
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, path.join(backupPath, 'state.vscdb'));
      }

      console.log('✅ 备份完成:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('备份失败:', error);
      throw error;
    }
  }

  /**
   * 从备份恢复
   */
  restoreBackup(backupPath) {
    try {
      // 恢复 storage.json
      const storageBackup = path.join(backupPath, 'storage.json');
      const storagePath = path.join(this.windsurfPath, 'User', 'globalStorage', 'storage.json');
      if (fs.existsSync(storageBackup)) {
        fs.copyFileSync(storageBackup, storagePath);
      }

      // 恢复 state.vscdb
      const dbBackup = path.join(backupPath, 'state.vscdb');
      if (fs.existsSync(dbBackup)) {
        fs.copyFileSync(dbBackup, this.dbPath);
      }

      console.log('✅ 从备份恢复成功:', backupPath);
      return true;
    } catch (error) {
      console.error('恢复备份失败:', error);
      throw error;
    }
  }
}

module.exports = SessionManager;

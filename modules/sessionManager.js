/**
 * Session 管理器
 * 处理明文和加密 session 数据
 */

function initSqlJsLazy() { return require('sql.js'); }
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const { safeStorage } = require('electron');

class SessionManager {
  constructor(windsurfPath, appDataPath) {
    this.windsurfPath = windsurfPath || this.getWindsurfPath();
    this.appDataPath = appDataPath; // 应用数据路径
    this.dbPath = this.getDbPath();
    this.plainSessionKey = 'codeium.windsurf'; // 明文 session key
    this.encryptedSessionKey = 'secret://{"extensionId":"codeium.windsurf","key":"windsurf_auth.sessions"}'; // 加密 session key
  }

  /**
   * 移除文件只读属性（Windows）
   */
  removeReadOnly(filePath) {
    if (process.platform !== 'win32' || !fs.existsSync(filePath)) {
      return;
    }
    
    try {
      // 使用 attrib 命令移除只读属性
      execSync(`attrib -R "${filePath}"`, { windowsHide: true });
      console.log(`✅ 已移除文件只读属性: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`移除只读属性失败: ${error.message}`);
    }
  }

  /**
   * 设置文件只读属性（Windows）
   */
  setReadOnly(filePath) {
    if (process.platform !== 'win32' || !fs.existsSync(filePath)) {
      return;
    }
    
    try {
      // 使用 attrib 命令设置只读属性
      execSync(`attrib +R "${filePath}"`, { windowsHide: true });
      console.log(`✅ 已设置文件只读属性: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`设置只读属性失败: ${error.message}`);
    }
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
      const SQL = await initSqlJsLazy()();
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

      // 移除 storage.json 的只读属性
      const storagePath = path.join(this.windsurfPath, 'User', 'globalStorage', 'storage.json');
      this.removeReadOnly(storagePath);
      // 移除数据库文件的只读属性
      this.removeReadOnly(this.dbPath);

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
      const SQL = await initSqlJsLazy()();
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

      // 注意：不再恢复只读属性，避免下次写入失败

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
        // 临时移除只读属性以便复制
        this.removeReadOnly(storagePath);
        fs.copyFileSync(storagePath, path.join(backupPath, 'storage.json'));
        // 恢复只读属性
        this.setReadOnly(storagePath);
      }

      // 备份 state.vscdb
      if (fs.existsSync(this.dbPath)) {
        // 临时移除只读属性以便复制
        this.removeReadOnly(this.dbPath);
        fs.copyFileSync(this.dbPath, path.join(backupPath, 'state.vscdb'));
        // 恢复只读属性
        this.setReadOnly(this.dbPath);
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
        // 移除目标文件的只读属性
        this.removeReadOnly(storagePath);
        fs.copyFileSync(storageBackup, storagePath);
        // 恢复只读属性
        this.setReadOnly(storagePath);
      }

      // 恢复 state.vscdb
      const dbBackup = path.join(backupPath, 'state.vscdb');
      if (fs.existsSync(dbBackup)) {
        // 移除目标文件的只读属性
        this.removeReadOnly(this.dbPath);
        fs.copyFileSync(dbBackup, this.dbPath);
        // 恢复只读属性
        this.setReadOnly(this.dbPath);
      }

      console.log('✅ 从备份恢复成功:', backupPath);
      return true;
    } catch (error) {
      console.error('恢复备份失败:', error);
      throw error;
    }
  }

  /**
   * 读取加密的 sessions (secret:// key)
   * 使用 safeStorage 解密
   */
  async readEncryptedSessions() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('未找到 state.vscdb');
      }

      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('safeStorage 加密功能不可用');
      }

      console.log('\n🔓 === 开始读取加密 sessions ===');

      const filebuffer = fs.readFileSync(this.dbPath);
      const SQL = await initSqlJsLazy()();
      const db = new SQL.Database(filebuffer);

      // 读取加密的 session key
      const results = db.exec(`SELECT value FROM ItemTable WHERE key = ?`, [this.encryptedSessionKey]);
      db.close();

      if (!results || results.length === 0 || results[0].values.length === 0) {
        console.log('⚠️ 未找到加密 sessions 数据');
        return null;
      }

      const value = results[0].values[0][0];
      console.log('📖 读取到加密数据，长度:', value.length);

      // 解析 Buffer 对象
      const bufferObj = JSON.parse(value);
      const buffer = Buffer.from(bufferObj.data);
      console.log('🔄 转换为 Buffer，长度:', buffer.length);
      console.log('   Buffer 前20字节:', buffer.slice(0, 20).toString('hex'));

      // 解密
      console.log('🔓 开始解密...');
      const decryptedString = safeStorage.decryptString(buffer);
      console.log('✅ 解密成功，字符串长度:', decryptedString.length);
      console.log('   解密后前100字符:', decryptedString.substring(0, 100));

      // 解析 JSON
      const sessions = JSON.parse(decryptedString);
      console.log('📦 解析 JSON 成功，sessions 数量:', sessions.length);
      console.log('🔓 === 读取加密 sessions 完成 ===\n');

      return { sessions };
    } catch (error) {
      console.error('❌ 读取加密 sessions 失败:', error.message);
      throw error;
    }
  }

  /**
   * 写入加密的 sessions (secret:// key)
   * 使用 safeStorage 加密
   * @param {string} token - API Token
   * @param {string} email - 邮箱
   * @param {string} label - 显示标签（密码或 "PaperCrane"）
   */
  async writeEncryptedSessions(token, email, label) {
    try {
      if (!fs.existsSync(this.dbPath)) {
        throw new Error('未找到 state.vscdb');
      }

      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('safeStorage 加密功能不可用');
      }

      console.log('\n🔐 === 开始写入加密 sessions ===');

      // 移除数据库文件的只读属性
      this.removeReadOnly(this.dbPath);

      // 先尝试读取并解密原有数据（验证）
      try {
        const existingSessions = await this.readEncryptedSessions();
        if (existingSessions && existingSessions.sessions) {
          console.log('✅ 原有加密数据解密验证成功，sessions 数量:', existingSessions.sessions.length);
          if (existingSessions.sessions.length > 0) {
            console.log('   示例账号 email:', existingSessions.sessions[0].account?.id || 'N/A');
          }
        }
      } catch (readError) {
        console.log('⚠️ 读取原有加密数据失败（可能是首次加密）:', readError.message);
      }

      // 构建 sessions 数据
      const sessionId = uuidv4();
      const sessions = [{
        id: sessionId,
        accessToken: token,
        account: {
          id: email,
          label: label
        },
        scopes: []
      }];

      console.log('📝 准备加密的 sessions:');
      console.log('   数量:', sessions.length);
      console.log('   email:', email);
      console.log('   label:', label);
      console.log('   token 长度:', token.length);

      // 将 sessions 转换为 JSON 字符串
      const jsonString = JSON.stringify(sessions);
      console.log('📝 JSON 字符串长度:', jsonString.length);
      console.log('   JSON 前100字符:', jsonString.substring(0, 100));

      // 使用 safeStorage 加密
      console.log('🔒 开始加密...');
      const encryptedBuffer = safeStorage.encryptString(jsonString);
      console.log('✅ 加密完成');
      console.log('   加密后的 Buffer 长度:', encryptedBuffer.length);
      console.log('   加密后的 Buffer 前20字节:', encryptedBuffer.slice(0, 20).toString('hex'));

      // 转换为可存储的格式
      const storageData = {
        type: 'Buffer',
        data: Array.from(encryptedBuffer)
      };
      const storageDataStr = JSON.stringify(storageData);
      console.log('💾 存储数据长度:', storageDataStr.length);

      // 读取数据库
      const filebuffer = fs.readFileSync(this.dbPath);
      const SQL = await initSqlJsLazy()();
      const db = new SQL.Database(filebuffer);

      // 写入加密数据到数据库
      db.run('INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)', [
        this.encryptedSessionKey,
        storageDataStr
      ]);

      // 保存到文件
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      db.close();

      console.log('💾 已写入加密数据到数据库');

      // 立即验证：读取并解密
      console.log('\n🔍 === 验证加密结果 ===');
      try {
        const verifyDecrypted = await this.readEncryptedSessions();
        if (verifyDecrypted && verifyDecrypted.sessions) {
          console.log('✅ 加密数据解密验证成功');
          console.log('   sessions 数量:', verifyDecrypted.sessions.length);
          if (verifyDecrypted.sessions.length > 0) {
            console.log('   验证账号 email:', verifyDecrypted.sessions[0].account?.id || 'N/A');
            console.log('   验证账号 label:', verifyDecrypted.sessions[0].account?.label || 'N/A');
            console.log('   验证账号 token 长度:', verifyDecrypted.sessions[0].accessToken?.length || 0);
          }
          console.log('🎉 加密和解密流程验证完成\n');
        }
      } catch (verifyError) {
        console.error('❌ 加密数据验证失败:', verifyError.message);
        throw new Error('加密验证失败: ' + verifyError.message);
      }

      return {
        success: true,
        sessionId
      };
    } catch (error) {
      console.error('❌ 写入加密 sessions 失败:', error);
      throw error;
    }
  }

  /**
   * 同时写入明文和加密的 sessions
   * @param {string} token - API Token
   * @param {string} email - 邮箱
   * @param {string} label - 显示标签
   */
  async writeAllSessions(token, email, label = 'PaperCrane') {
    try {
      console.log('\n📝 === 开始写入所有 sessions ===');
      console.log('   email:', email);
      console.log('   label:', label);

      // 1. 写入明文 sessions (保持兼容性)
      console.log('\n1️⃣ 写入明文 sessions...');
      const plainResult = await this.writePlainSessions(token, email, label);
      console.log('✅ 明文 sessions 写入完成');

      // 2. 写入加密 sessions
      console.log('\n2️⃣ 写入加密 sessions...');
      const encryptedResult = await this.writeEncryptedSessions(token, email, label);
      console.log('✅ 加密 sessions 写入完成');

      console.log('\n🎉 === 所有 sessions 写入完成 ===\n');

      return {
        success: true,
        sessionId: plainResult.sessionId,
        installationId: plainResult.installationId
      };
    } catch (error) {
      console.error('❌ 写入所有 sessions 失败:', error);
      throw error;
    }
  }
}

module.exports = SessionManager;

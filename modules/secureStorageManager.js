/**
 * 安全存储管理器
 * 使用 Electron safeStorage 加密和解密敏感数据
 */

const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

class SecureStorageManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.storageFilePath = path.join(appDataPath, 'encrypted-accounts.json');
    
    console.log('🔐 SecureStorageManager 初始化');
    console.log('   存储路径:', this.storageFilePath);
  }

  /**
   * 检查加密是否可用
   */
  isEncryptionAvailable() {
    const available = safeStorage.isEncryptionAvailable();
    console.log('🔐 加密功能可用:', available);
    return available;
  }

  /**
   * 加密账号数据
   * @param {Array} accounts - 账号数组
   * @returns {Object} 包含加密后的 Buffer 对象
   */
  encryptAccounts(accounts) {
    try {
      if (!this.isEncryptionAvailable()) {
        throw new Error('safeStorage 加密功能不可用');
      }

      console.log('\n🔐 === 开始加密账号数据 ===');
      console.log('📝 加密前的账号数量:', accounts.length);
      
      // 先读取原有数据并尝试解密（用于日志验证）
      if (fs.existsSync(this.storageFilePath)) {
        console.log('📖 检测到已有加密文件，先读取并解密...');
        try {
          const existingData = this.decryptAccounts();
          console.log('✅ 原有数据解密成功，账号数量:', existingData.length);
          if (existingData.length > 0) {
            console.log('   示例账号 email:', existingData[0].account?.id || 'N/A');
          }
        } catch (decryptError) {
          console.log('⚠️ 原有数据解密失败（可能是首次加密）:', decryptError.message);
        }
      }

      // 将账号数组转换为 JSON 字符串
      const jsonString = JSON.stringify(accounts);
      console.log('📝 JSON 字符串长度:', jsonString.length);
      console.log('📝 JSON 前100字符:', jsonString.substring(0, 100));

      // 使用 safeStorage 加密
      const encryptedBuffer = safeStorage.encryptString(jsonString);
      console.log('🔒 加密完成');
      console.log('   加密后的 Buffer 长度:', encryptedBuffer.length);
      console.log('   加密后的 Buffer 前20字节:', encryptedBuffer.slice(0, 20).toString('hex'));

      // 转换为可存储的格式
      const storageData = {
        type: 'Buffer',
        data: Array.from(encryptedBuffer)
      };

      // 保存到文件
      if (!fs.existsSync(this.appDataPath)) {
        fs.mkdirSync(this.appDataPath, { recursive: true });
      }

      fs.writeFileSync(this.storageFilePath, JSON.stringify(storageData, null, 2));
      console.log('💾 已保存到文件:', this.storageFilePath);

      // 立即尝试解密验证
      console.log('\n🔍 === 验证加密结果 ===');
      try {
        const verifyDecrypted = this.decryptAccounts();
        console.log('✅ 解密验证成功，账号数量:', verifyDecrypted.length);
        if (verifyDecrypted.length > 0) {
          console.log('   示例账号 email:', verifyDecrypted[0].account?.id || 'N/A');
          console.log('   示例账号 label:', verifyDecrypted[0].account?.label || 'N/A');
          console.log('   示例账号 token 长度:', verifyDecrypted[0].accessToken?.length || 0);
        }
        console.log('🎉 加密和解密流程验证完成\n');
      } catch (verifyError) {
        console.error('❌ 解密验证失败:', verifyError.message);
        throw new Error('加密验证失败: ' + verifyError.message);
      }

      return {
        success: true,
        bufferLength: encryptedBuffer.length
      };
    } catch (error) {
      console.error('❌ 加密失败:', error);
      throw error;
    }
  }

  /**
   * 解密账号数据
   * @returns {Array} 解密后的账号数组
   */
  decryptAccounts() {
    try {
      if (!this.isEncryptionAvailable()) {
        throw new Error('safeStorage 加密功能不可用');
      }

      if (!fs.existsSync(this.storageFilePath)) {
        console.log('ℹ️ 加密文件不存在，返回空数组');
        return [];
      }

      console.log('\n🔓 === 开始解密账号数据 ===');
      console.log('📖 读取文件:', this.storageFilePath);

      // 读取文件
      const fileContent = fs.readFileSync(this.storageFilePath, 'utf-8');
      const bufferObj = JSON.parse(fileContent);
      
      console.log('📝 Buffer 对象类型:', bufferObj.type);
      console.log('📝 Buffer 数据长度:', bufferObj.data.length);

      // 转换回 Buffer
      const buffer = Buffer.from(bufferObj.data);
      console.log('🔄 转换为 Buffer，长度:', buffer.length);
      console.log('   Buffer 前20字节:', buffer.slice(0, 20).toString('hex'));

      // 解密
      console.log('🔓 开始解密...');
      const decryptedString = safeStorage.decryptString(buffer);
      console.log('✅ 解密成功');
      console.log('   解密后字符串长度:', decryptedString.length);
      console.log('   解密后前100字符:', decryptedString.substring(0, 100));

      // 解析 JSON
      const accounts = JSON.parse(decryptedString);
      console.log('📦 解析 JSON 成功，账号数量:', accounts.length);
      console.log('🔓 === 解密完成 ===\n');

      return accounts;
    } catch (error) {
      console.error('❌ 解密失败:', error);
      throw error;
    }
  }

  /**
   * 添加或更新账号
   * @param {Object} newAccount - 新账号信息
   */
  addOrUpdateAccount(newAccount) {
    try {
      console.log('\n➕ 添加/更新账号:', newAccount.account?.id || 'N/A');

      // 读取现有账号
      let accounts = [];
      try {
        accounts = this.decryptAccounts();
      } catch (error) {
        console.log('⚠️ 无法读取现有账号（可能是首次添加）');
      }

      // 检查是否已存在
      const existingIndex = accounts.findIndex(
        acc => acc.account?.id === newAccount.account?.id
      );

      if (existingIndex >= 0) {
        console.log('📝 更新现有账号');
        accounts[existingIndex] = newAccount;
      } else {
        console.log('➕ 添加新账号');
        accounts.push(newAccount);
      }

      // 加密保存
      return this.encryptAccounts(accounts);
    } catch (error) {
      console.error('❌ 添加/更新账号失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有账号
   */
  getAllAccounts() {
    try {
      return this.decryptAccounts();
    } catch (error) {
      console.error('❌ 获取账号列表失败:', error);
      return [];
    }
  }

  /**
   * 删除账号
   * @param {string} email - 账号邮箱
   */
  deleteAccount(email) {
    try {
      console.log('\n🗑️ 删除账号:', email);

      const accounts = this.decryptAccounts();
      const filteredAccounts = accounts.filter(
        acc => acc.account?.id !== email
      );

      if (filteredAccounts.length === accounts.length) {
        console.log('⚠️ 未找到要删除的账号');
        return { success: false, message: '账号不存在' };
      }

      this.encryptAccounts(filteredAccounts);
      console.log('✅ 账号已删除');
      
      return { success: true };
    } catch (error) {
      console.error('❌ 删除账号失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有账号
   */
  clearAll() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        fs.unlinkSync(this.storageFilePath);
        console.log('✅ 已清空所有加密账号');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ 清空账号失败:', error);
      throw error;
    }
  }
}

module.exports = SecureStorageManager;

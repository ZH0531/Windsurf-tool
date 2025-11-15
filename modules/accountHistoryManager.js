/**
 * 账号历史管理器
 * 管理历史账号列表、标记状态等
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AccountHistoryManager {
  constructor(appDataPath) {
    this.appDataPath = appDataPath;
    this.historyFilePath = path.join(appDataPath, 'account-history.json');
    this.history = this.loadHistory();
  }

  /**
   * 加载历史记录
   */
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const data = fs.readFileSync(this.historyFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }

    return {
      accounts: [],
      lastUpdated: null
    };
  }

  /**
   * 保存历史记录
   */
  saveHistory() {
    try {
      if (!fs.existsSync(this.appDataPath)) {
        fs.mkdirSync(this.appDataPath, { recursive: true });
      }

      this.history.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.history, null, 2));
      console.log('✅ 历史记录已保存');
      return true;
    } catch (error) {
      console.error('保存历史记录失败:', error);
      return false;
    }
  }

  /**
   * 添加账号到历史
   * @param {Object} account - { token, email, label }
   * @returns {Object} 添加的账号对象（包含 id）
   */
  addAccount(account) {
    const { token, email, label } = account;

    // 检查是否已存在（通过 email 判断）
    const existingIndex = this.history.accounts.findIndex(
      acc => acc.email === email
    );

    let accountData;

    if (existingIndex !== -1) {
      // 更新已存在的账号
      accountData = {
        ...this.history.accounts[existingIndex],
        token: token,
        label: label || this.history.accounts[existingIndex].label,
        lastUsed: new Date().toISOString(),
        usedCount: (this.history.accounts[existingIndex].usedCount || 0) + 1
      };
      this.history.accounts[existingIndex] = accountData;
    } else {
      // 添加新账号
      accountData = {
        id: uuidv4(),
        token: token,
        email: email,
        label: label || 'PaperCrane',
        addedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        marked: false, // 是否标记为已使用
        usedCount: 1
      };
      this.history.accounts.unshift(accountData); // 添加到列表开头
    }

    this.saveHistory();
    return accountData;
  }

  /**
   * 获取所有账号历史
   * @returns {Array} 账号列表
   */
  getAllAccounts() {
    return [...this.history.accounts];
  }

  /**
   * 根据 ID 获取账号
   * @param {string} id 
   * @returns {Object|null}
   */
  getAccountById(id) {
    return this.history.accounts.find(acc => acc.id === id) || null;
  }

  /**
   * 根据 email 获取账号
   * @param {string} email 
   * @returns {Object|null}
   */
  getAccountByEmail(email) {
    return this.history.accounts.find(acc => acc.email === email) || null;
  }

  /**
   * 标记/取消标记账号为已使用
   * @param {string} id 账号 ID
   * @param {boolean} marked 是否标记
   * @returns {boolean} 是否成功
   */
  markAccount(id, marked = true) {
    const accountIndex = this.history.accounts.findIndex(acc => acc.id === id);
    
    if (accountIndex === -1) {
      return false;
    }

    this.history.accounts[accountIndex].marked = marked;
    this.saveHistory();
    return true;
  }

  /**
   * 删除账号
   * @param {string} id 账号 ID
   * @returns {boolean} 是否成功
   */
  deleteAccount(id) {
    const accountIndex = this.history.accounts.findIndex(acc => acc.id === id);
    
    if (accountIndex === -1) {
      return false;
    }

    this.history.accounts.splice(accountIndex, 1);
    this.saveHistory();
    return true;
  }

  /**
   * 更新账号最后使用时间
   * @param {string} id 账号 ID
   */
  updateLastUsed(id) {
    const accountIndex = this.history.accounts.findIndex(acc => acc.id === id);
    
    if (accountIndex !== -1) {
      this.history.accounts[accountIndex].lastUsed = new Date().toISOString();
      this.history.accounts[accountIndex].usedCount = 
        (this.history.accounts[accountIndex].usedCount || 0) + 1;
      this.saveHistory();
    }
  }

  /**
   * 清空所有历史记录
   */
  clearAll() {
    this.history.accounts = [];
    this.saveHistory();
  }

  /**
   * 获取历史统计
   */
  getStats() {
    return {
      total: this.history.accounts.length,
      marked: this.history.accounts.filter(acc => acc.marked).length,
      unmarked: this.history.accounts.filter(acc => !acc.marked).length
    };
  }
}

module.exports = AccountHistoryManager;

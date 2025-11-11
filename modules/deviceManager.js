/**
 * 设备管理器
 * 负责生成和更新设备标识符
 */

const { app } = require('electron');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class DeviceManager {
  constructor(windsurfPath) {
    this.windsurfPath = windsurfPath || this.getWindsurfPath();
    this.storagePath = this.getStoragePath();
  }

  /**
   * 获取 Windsurf 用户数据路径
   */
  getWindsurfPath() {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(require('os').homedir(), 'AppData', 'Roaming', 'Windsurf');
    } else if (platform === 'darwin') {
      return path.join(require('os').homedir(), 'Library', 'Application Support', 'Windsurf');
    } else {
      return path.join(require('os').homedir(), '.config', 'Windsurf');
    }
  }

  /**
   * 获取 storage.json 路径
   */
  getStoragePath() {
    return path.join(this.windsurfPath, 'User', 'globalStorage', 'storage.json');
  }

  /**
   * 获取真实的 MAC 地址
   */
  getRealMacAddress() {
    try {
      const networkInterfaces = os.networkInterfaces();
      
      // 优先查找非虚拟网卡的 MAC 地址
      for (const name of Object.keys(networkInterfaces)) {
        // 跳过虚拟网卡和回环接口
        if (name.includes('Virtual') || name.includes('Loopback') || 
            name.includes('vEthernet') || name.includes('VMware') ||
            name.includes('VirtualBox')) {
          continue;
        }
        
        const interfaces = networkInterfaces[name];
        for (const iface of interfaces) {
          // 找到第一个有效的 MAC 地址
          if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac;
          }
        }
      }
      
      // 如果没找到，随机生成一个
      const bytes = crypto.randomBytes(6);
      bytes[0] = (bytes[0] & 0xfe) | 0x02; // 设置为本地管理地址
      return bytes.toString('hex').match(/.{2}/g).join(':');
    } catch (error) {
      console.error('获取 MAC 地址失败:', error);
      // 随机生成
      const bytes = crypto.randomBytes(6);
      bytes[0] = (bytes[0] & 0xfe) | 0x02;
      return bytes.toString('hex').match(/.{2}/g).join(':');
    }
  }

  /**
   * 生成设备标识符
   */
  generateMachineIds() {
    // 获取真实的 MAC 地址并生成 SHA256 哈希
    const macAddress = this.getRealMacAddress();
    const macHash = crypto
      .createHash('sha256')
      .update(macAddress, 'utf8')
      .digest('hex');
    
    return {
      'telemetry.machineId': crypto
        .createHash('sha256')
        .update(crypto.randomBytes(32))
        .digest('hex'),

      'telemetry.macMachineId': macHash,

      'telemetry.devDeviceId': uuidv4(),

      'telemetry.sqmId': '{' + uuidv4().toUpperCase() + '}'
    };
  }

  /**
   * 读取当前设备码
   */
  getCurrentDeviceIds() {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return null;
      }

      const storage = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));

      return {
        machineId: storage['telemetry.machineId'],
        macMachineId: storage['telemetry.macMachineId'],
        devDeviceId: storage['telemetry.devDeviceId'],
        sqmId: storage['telemetry.sqmId']
      };
    } catch (error) {
      console.error('读取设备码失败:', error);
      return null;
    }
  }

  /**
   * 重置 Windows 注册表 MachineGuid
   */
  resetWindowsRegistryGuid() {
    if (process.platform !== 'win32') {
      console.log('⏭️ 非 Windows 系统，跳过注册表重置');
      return null;
    }

    try {
      const regPath = 'HKLM\\SOFTWARE\\Microsoft\\Cryptography';
      const valueName = 'MachineGuid';
      
      // 读取当前值作为备份
      let oldGuid = null;
      try {
        const result = execSync(`reg query "${regPath}" /v ${valueName}`, { encoding: 'utf-8' });
        const match = result.match(/MachineGuid\s+REG_SZ\s+([a-f0-9-]+)/i);
        if (match) {
          oldGuid = match[1];
          console.log('📦 备份原始 MachineGuid:', oldGuid);
          
          // 保存备份
          const backupDir = path.join(os.homedir(), 'MachineGuid_Backups');
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupFile = path.join(backupDir, `MachineGuid_${timestamp}.txt`);
          fs.writeFileSync(backupFile, oldGuid, 'utf-8');
          console.log('✅ 备份已保存到:', backupFile);
        }
      } catch (readError) {
        console.warn('⚠️ 无法读取原始 MachineGuid:', readError.message);
      }
      
      // 生成新的 GUID
      const newGuid = uuidv4();
      
      // 写入注册表（需要管理员权限）
      try {
        execSync(`reg add "${regPath}" /v ${valueName} /t REG_SZ /d "${newGuid}" /f`, { 
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        console.log('✅ 注册表 MachineGuid 已重置:', newGuid);
        return { oldGuid, newGuid };
      } catch (writeError) {
        console.error('❌ 写入注册表失败（可能需要管理员权限）:', writeError.message);
        throw new Error('需要管理员权限来修改注册表');
      }
    } catch (error) {
      console.error('重置注册表 MachineGuid 失败:', error);
      throw error;
    }
  }

  /**
   * 重置设备码
   */
  resetDeviceIds() {
    try {
      // 1. 重置注册表 MachineGuid (仅 Windows)
      let registryResult = null;
      if (process.platform === 'win32') {
        try {
          registryResult = this.resetWindowsRegistryGuid();
        } catch (regError) {
          console.warn('⚠️ 注册表重置失败:', regError.message);
          // 继续执行，不中断
        }
      }

      // 2. 检查 storage.json 文件是否存在
      if (!fs.existsSync(this.storagePath)) {
        throw new Error(`未找到 storage.json: ${this.storagePath}`);
      }

      // 3. 读取现有配置
      const storage = JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));

      // 4. 生成新设备码
      const newIds = this.generateMachineIds();

      // 5. 更新这4个字段
      storage['telemetry.machineId'] = newIds['telemetry.machineId'];
      storage['telemetry.macMachineId'] = newIds['telemetry.macMachineId'];
      storage['telemetry.devDeviceId'] = newIds['telemetry.devDeviceId'];
      storage['telemetry.sqmId'] = newIds['telemetry.sqmId'];

      // 6. 写入（保持原有格式）
      fs.writeFileSync(this.storagePath, JSON.stringify(storage, null, 4));

      console.log('✅ storage.json 设备码已重置');
      
      return {
        ...newIds,
        registryReset: registryResult !== null
      };
    } catch (error) {
      console.error('重置设备码失败:', error);
      throw error;
    }
  }
}

module.exports = DeviceManager;

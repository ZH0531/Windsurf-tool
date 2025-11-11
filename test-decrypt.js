/**
 * 测试解密功能
 * 用于验证 userData 路径设置是否正确
 */

const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// 设置 Windsurf userData 路径
function setupWindsurfPath() {
  const platform = process.platform;
  let windsurfPath;

  if (process.env.WINDSURF_USER_DATA) {
    windsurfPath = process.env.WINDSURF_USER_DATA;
  } else {
    if (platform === 'win32') {
      windsurfPath = path.join(app.getPath('appData'), 'Windsurf');
    } else if (platform === 'darwin') {
      windsurfPath = path.join(app.getPath('home'), 'Library', 'Application Support', 'Windsurf');
    } else {
      windsurfPath = path.join(app.getPath('home'), '.config', 'Windsurf');
    }
  }

  app.setPath('userData', windsurfPath);
  return windsurfPath;
}

// 🔑 在 app ready 之前设置路径
console.log('=== 测试解密功能 ===');
console.log('1. 原始 userData 路径:', app.getPath('userData'));
const windsurfPath = setupWindsurfPath();
console.log('2. 设置后的 userData 路径:', app.getPath('userData'));

app.whenReady().then(async () => {
  console.log('3. app ready 后的 userData 路径:', app.getPath('userData'));
  
  // 检查 safeStorage 是否可用
  if (!safeStorage.isEncryptionAvailable()) {
    console.error('❌ safeStorage 加密不可用');
    app.quit();
    return;
  }
  console.log('✅ safeStorage 可用');

  // 读取数据库
  const dbPath = path.join(windsurfPath, 'User', 'globalStorage', 'state.vscdb');
  console.log('4. 数据库路径:', dbPath);
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ 未找到数据库文件');
    app.quit();
    return;
  }
  console.log('✅ 数据库文件存在');

  try {
    const filebuffer = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(filebuffer);

    // 列出所有 auth 相关的 key
    console.log('\n5. 数据库中的 auth 相关 keys:');
    const allKeysResults = db.exec(`SELECT key FROM ItemTable WHERE key LIKE '%auth%'`);
    if (allKeysResults && allKeysResults.length > 0) {
      allKeysResults[0].values.forEach(row => {
        console.log('   -', row[0]);
      });
    }

    // 尝试读取 session
    const sessionKey = 'secret://{"extensionId":"codeium.windsurf","key":"windsurf_auth.sessions"}';
    console.log('\n6. 尝试读取 session key:', sessionKey);
    
    const results = db.exec(`SELECT value FROM ItemTable WHERE key = ?`, [sessionKey]);
    db.close();

    if (!results || results.length === 0 || results[0].values.length === 0) {
      console.error('❌ 未找到 session 数据');
      app.quit();
      return;
    }

    const value = results[0].values[0][0];
    console.log('✅ 读取到数据，长度:', value.length);
    console.log('   数据前100字符:', value.substring(0, 100));

    // 解析并解密
    const bufferObj = JSON.parse(value);
    const buffer = Buffer.from(bufferObj.data);
    console.log('7. Buffer 长度:', buffer.length);
    console.log('   Buffer 前20字节:', buffer.slice(0, 20).toString('hex'));

    console.log('\n8. 开始解密...');
    const decrypted = safeStorage.decryptString(buffer);
    console.log('✅ 解密成功！');
    console.log('   解密后的长度:', decrypted.length);
    console.log('   解密后的内容:', decrypted.substring(0, 200));

    const sessions = JSON.parse(decrypted);
    console.log('\n9. Sessions 信息:');
    console.log('   Sessions 数量:', sessions.length);
    if (sessions.length > 0) {
      console.log('   用户名:', sessions[0].account?.label || 'N/A');
      console.log('   Token 长度:', sessions[0].accessToken?.length || 0);
    }

    console.log('\n✅ 测试完成！解密功能正常。');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   完整错误:', error);
  }

  app.quit();
});

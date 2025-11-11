/**
 * PaperCrane-Windsurf - 渲染进程 UI 逻辑
 */

// Toast 通知
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // 图标映射
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    info: 'info',
    warning: 'alert-triangle'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${icons[type] || 'info'}"></i>
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">
      <i data-lucide="x"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // 渲染图标
  lucide.createIcons();
  
  // 关闭按钮
  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    }, 300);
  };
  
  closeBtn.addEventListener('click', removeToast);
  
  // 自动关闭
  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
  
  return toast;
}

// 自定义弹窗
function showModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add('show');
    
    const handleConfirm = () => {
      modal.classList.remove('show');
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      modal.classList.remove('show');
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// 日志函数
function log(message, type = 'info') {
  const logOutput = document.getElementById('log-output');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  logOutput.appendChild(entry);
  logOutput.scrollTop = logOutput.scrollHeight;
}

// 显示当前账号（带打码）
async function displayCurrentAccount() {
  const emailSpan = document.getElementById('current-email');
  const tokenSpan = document.getElementById('current-token');
  
  emailSpan.textContent = '加载中...';
  tokenSpan.textContent = '加载中...';

  const result = await window.electronAPI.getCurrentAccount();

  if (result.success) {
    const { email, label, token, sessionId } = result.data;
    
    // Token 中间打码
    const maskedToken = maskToken(token);
    
    emailSpan.textContent = email;
    tokenSpan.textContent = maskedToken;
    
    log(`当前账号: ${email}`, 'success');
  } else {
    emailSpan.textContent = '未登录';
    tokenSpan.textContent = '无';
    log(result.message, 'error');
  }
}

// Token 打码函数
function maskToken(token) {
  if (!token || token.length < 20) return token;
  
  const start = token.substring(0, 15);
  const end = token.substring(token.length - 10);
  const middle = '*'.repeat(20);
  
  return `${start}${middle}${end}`;
}

// 更新 Windsurf 状态
async function updateWindsurfStatus() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  const result = await window.electronAPI.checkWindsurfRunning();
  
  if (result.success) {
    if (result.data.isRunning) {
      statusDot.className = 'status-dot running';
      statusText.textContent = '正在运行';
    } else {
      statusDot.className = 'status-dot stopped';
      statusText.textContent = '未运行';
    }
  } else {
    statusDot.className = 'status-dot unknown';
    statusText.textContent = '无法检测';
  }
}

// 检测 Windsurf 路径
async function detectWindsurfPath() {
  const pathSpan = document.getElementById('windsurf-path');
  pathSpan.textContent = '检测中...';
  pathSpan.className = 'path-text';
  
  log('正在检测 Windsurf 安装路径...', 'info');
  
  const result = await window.electronAPI.detectWindsurfPath();
  
  if (result.success) {
    const { exePath, exeExists, dbExists } = result.data;
    
    if (exeExists) {
      pathSpan.textContent = exePath;
      log(`✅ 检测到 Windsurf: ${exePath}`, 'success');
      
      if (!dbExists) {
        log(`⚠️ 数据库不存在，请先运行一次 Windsurf`, 'warning');
      }
    } else {
      pathSpan.textContent = '未找到（请手动选择）';
      log(`❌ 未检测到 Windsurf 可执行文件`, 'error');
    }
  } else {
    pathSpan.textContent = '检测失败';
    log(`❌ 检测失败: ${result.message}`, 'error');
  }
}

// 手动选择路径
async function selectWindsurfPath() {
  log('请选择 Windsurf 可执行文件...', 'info');
  
  const result = await window.electronAPI.selectWindsurfPath();
  
  if (result.success) {
    const pathSpan = document.getElementById('windsurf-path');
    const { exePath, dbExists } = result.data;
    
    pathSpan.textContent = exePath;
    log(`✅ 已选择 Windsurf: ${exePath}`, 'success');
    log('路径已保存到本地配置', 'info');
    
    if (!dbExists) {
      log(`⚠️ 数据库不存在，请先运行一次 Windsurf`, 'warning');
    }
  } else if (result.message !== '已取消') {
    log(result.message, 'error');
  }
}

// 切换账号
async function switchAccount() {
  const token = document.getElementById('token-input').value.trim();
  const email = document.getElementById('email-input').value.trim();
  const label = document.getElementById('label-input').value.trim() || 'PaperCrane';

  if (!token) {
    log('❌ 请输入 Token', 'error');
    return;
  }
  
  if (!email) {
    log('❌ 请输入邮箱', 'error');
    return;
  }

  const btn = document.getElementById('switch-btn');
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span>切换中...</span>';

  log('开始切换账号...', 'info');
  log(`邮箱: ${email}`, 'info');
  log(`标签: ${label}`, 'info');

  const result = await window.electronAPI.switchAccount({ token, email, label });

  btn.disabled = false;
  btn.innerHTML = originalHTML;
  lucide.createIcons();

  if (result.success) {
    log(`✅ 切换成功！`, 'success');
    log(`邮箱: ${result.data.email}`, 'success');
    log(`标签: ${result.data.label}`, 'success');
    
    if (!result.data.wasRunning) {
      log('💡 下次启动 Windsurf 时生效', 'info');
      // 立即更新状态
      setTimeout(updateWindsurfStatus, 500);
    } else {
      // 延迟刷新状态,给启动过程足够时间
      setTimeout(() => {
        updateWindsurfStatus();
      }, 3000);
    }
    
    // 清空 token 输入框，保留邮箱和标签
    document.getElementById('token-input').value = '';
    
    // 刷新显示
    setTimeout(displayCurrentAccount, 500);
  } else {
    log(`❌ 切换失败: ${result.message}`, 'error');
  }
}

// 重置设备码
async function resetDeviceIds() {
  const confirmed = await showModal('确认重置', '确定要重置设备码吗？重置后需要重启 Windsurf。');
  if (!confirmed) return;

  const btn = document.getElementById('reset-device-btn');
  btn.disabled = true;
  btn.textContent = '重置中...';

  log('重置设备码...', 'info');

  const result = await window.electronAPI.resetDeviceIds();

  btn.disabled = false;
  btn.textContent = '重置设备码';

  if (result.success) {
    log('✅ 设备码已重置', 'success');
    const data = result.data['telemetry.machineId'] || result.data;
    log(`machineId: ${data.substring ? data.substring(0, 20) + '...' : '已生成'}`, 'info');
  } else {
    log(`❌ 重置失败: ${result.message}`, 'error');
  }
}

// 加载配置
async function loadConfig() {
  const result = await window.electronAPI.getConfig();
  if (result.success) {
    const config = result.data;
    
    // 设置标签输入框的值
    if (config.label) {
      document.getElementById('label-input').value = config.label;
    }
    
    // 设置邮箱输入框的值（如果有上次使用的邮箱）
    if (config.lastEmail) {
      document.getElementById('email-input').value = config.lastEmail;
    }
  }
}

// 关闭 Windsurf
async function killWindsurf() {
  const btn = document.getElementById('kill-windsurf-btn');
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span>关闭中...</span>';

  log('正在关闭 Windsurf...', 'info');

  const result = await window.electronAPI.killWindsurf();

  btn.disabled = false;
  btn.innerHTML = originalHTML;
  lucide.createIcons();

  if (result.success) {
    log('✅ Windsurf 已关闭', 'success');
    // 等待更长时间确保进程完全关闭
    setTimeout(updateWindsurfStatus, 1500);
  } else {
    log(`❌ 关闭失败: ${result.message}`, 'error');
    setTimeout(updateWindsurfStatus, 500);
  }
}

// 启动 Windsurf
async function launchWindsurf() {
  const btn = document.getElementById('launch-windsurf-btn');
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span>启动中...</span>';

  log('正在启动 Windsurf...', 'info');

  const result = await window.electronAPI.launchWindsurf();

  btn.disabled = false;
  btn.innerHTML = originalHTML;
  lucide.createIcons();

  if (result.success) {
    log('✅ Windsurf 启动命令已执行', 'success');
    // 等待更长时间让进程真正启动
    setTimeout(updateWindsurfStatus, 2500);
  } else {
    log(`❌ 启动失败: ${result.message}`, 'error');
    setTimeout(updateWindsurfStatus, 500);
  }
}

// 导航处理
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = item.getAttribute('data-page');
      
      // 更新导航按钮状态
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // 切换页面
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(`page-${targetPage}`).classList.add('active');
      
      // 重新渲染图标
      lucide.createIcons();
    });
  });
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
  log('🎐 PaperCrane-Windsurf 已启动', 'success');
  
  // 监听切换账号进度消息
  window.electronAPI.onSwitchProgress((data) => {
    const { step, message } = data;
    
    // 根据步骤类型选择日志级别和 Toast 类型
    let logType = 'info';
    let toastType = 'info';
    
    if (step === 'error') {
      logType = 'error';
      toastType = 'error';
    } else if (step === 'warning') {
      logType = 'warning';
      toastType = 'warning';
    } else if (step.endsWith('-done')) {
      logType = 'success';
      toastType = 'success';
    }
    
    // 显示日志
    log(message, logType);
    
    // 显示 Toast 通知
    showToast(message, toastType, 2500);
  });
  
  // 初始化导航
  initNavigation();
  
  // 初始化
  detectWindsurfPath();
  updateWindsurfStatus();
  displayCurrentAccount();
  loadConfig();
  
  // 定时更新 Windsurf 状态（每 3 秒）
  setInterval(updateWindsurfStatus, 3000);
  
  // 绑定事件
  document.getElementById('refresh-btn').addEventListener('click', () => {
    displayCurrentAccount();
    updateWindsurfStatus();
  });
  document.getElementById('detect-path-btn').addEventListener('click', detectWindsurfPath);
  document.getElementById('select-path-btn').addEventListener('click', selectWindsurfPath);
  document.getElementById('switch-btn').addEventListener('click', switchAccount);
  document.getElementById('reset-device-btn').addEventListener('click', resetDeviceIds);
  document.getElementById('kill-windsurf-btn').addEventListener('click', killWindsurf);
  document.getElementById('launch-windsurf-btn').addEventListener('click', launchWindsurf);
  
  // Enter 键提交
  document.getElementById('token-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') switchAccount();
  });
  document.getElementById('email-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') switchAccount();
  });
  document.getElementById('label-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') switchAccount();
  });
});

/**
 * FPS Buddy - UI 组件模块
 */

const UI = {
  /**
   * 创建模态框
   * @param {Object} options - 配置选项
   */
  modal(options) {
    const { title, content, buttons = [], onClose = null, onAction = null, className = '' } = options;

    // 遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box ${className}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close btn-icon btn-ghost" aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">${content}</div>
        ${buttons.length ? `<div class="modal-actions">${buttons.map(b => `
          <button class="btn ${b.class || ''}" data-action="${b.action}">${b.label}</button>
        `).join('')}</div>` : ''}
      </div>
    `;

    // 添加样式
    this.injectModalStyles();

    document.body.appendChild(overlay);

    // 存储当前 overlay 引用
    UI._currentOverlay = overlay;

    // 事件绑定
    const close = () => {
      overlay.remove();
      UI._currentOverlay = null;
      onClose && onClose();
    };

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    buttons.forEach(btn => {
      const el = overlay.querySelector(`[data-action="${btn.action}"]`);
      if (el) {
        el.addEventListener('click', () => {
          if (btn.handler) {
            btn.handler();
          }
          if (onAction) {
            onAction(btn.action);
          } else {
            close();
          }
        });
      }
    });

    return { overlay, close };
  },

  /**
   * 关闭当前模态框
   */
  closeModal() {
    if (UI._currentOverlay) {
      UI._currentOverlay.remove();
      UI._currentOverlay = null;
    }
  },

  /**
   * 注入模态框样式
   */
  injectModalStyles() {
    if (document.getElementById('modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }
      .modal-box {
        background: #292A2B;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        width: 90%;
        max-width: 560px;
        max-height: 90vh;
        overflow: auto;
        animation: slideUp 0.3s ease;
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .modal-title {
        font-size: 20px;
        font-weight: 700;
      }
      .modal-close {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .modal-close:hover {
        background: rgba(255,255,255,0.1);
      }
      .modal-content {
        padding: 24px;
      }
      .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * 显示提示消息
   * @param {string} message - 消息内容
   * @param {string} type - 类型 (success/error/info)
   * @param {number} duration - 显示时长(ms)
   */
  toast(message, type = 'info', duration = 2000) {
    const colors = {
      success: '#2ed573',
      error: '#ff4757',
      info: '#ffa502'
    };

    const toast = document.createElement('div');
    toast.className = 'fps-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: ${colors[type]};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 2000;
      transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 显示动画
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // 隐藏动画
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-100px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * 显示加载中
   * @param {string} message - 加载提示
   */
  loading(message = '加载中...') {
    const overlay = document.createElement('div');
    overlay.className = 'fps-loading';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;
    overlay.innerHTML = `
      <div style="width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #ff4757; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="color: white; margin-top: 16px; font-size: 14px;">${message}</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(overlay);
    return () => overlay.remove();
  },

  /**
   * 创建练习报告弹窗
   * @param {Object} data - 练习数据
   * @param {Function} onAction - 回调函数
   */
  showReport(data, onAction) {
    const level = data.level;
    const levelConfig = Config.LEVELS[level];

    const content = `
      <div class="report-container">
        <div class="report-header">
          <div class="report-level" style="color: ${levelConfig.color}">
            ${levelConfig.name}
          </div>
          <p class="report-desc">${levelConfig.description}</p>
        </div>

        <div class="report-stats">
          <div class="stat-item">
            <div class="stat-value">${data.accuracy.toFixed(1)}%</div>
            <div class="stat-label">命中率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.avgReactionTime.toFixed(0)}<span class="stat-unit">ms</span></div>
            <div class="stat-label">平均反应</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.fastestReaction.toFixed(0)}<span class="stat-unit">ms</span></div>
            <div class="stat-label">最快反应</div>
          </div>
        </div>

        <div class="report-details">
          <div class="detail-row">
            <span>命中</span>
            <span class="text-success">${data.hits}</span>
          </div>
          <div class="detail-row">
            <span>未命中</span>
            <span class="text-error">${data.misses}</span>
          </div>
          <div class="detail-row">
            <span>练习时长</span>
            <span>${Math.floor(data.duration / 60)}分${data.duration % 60}秒</span>
          </div>
          <div class="detail-row">
            <span>反应时间范围</span>
            <span>${data.fastestReaction.toFixed(0)}ms - ${data.slowestReaction.toFixed(0)}ms</span>
          </div>
        </div>
      </div>
    `;

    this.injectReportStyles();

    return this.modal({
      title: '练习报告',
      content,
      className: 'report-modal',
      buttons: [
        { label: '重新练习', action: 'retry', class: 'btn-primary', handler: () => onAction('retry') },
        { label: '返回首页', action: 'home', class: 'btn-secondary', handler: () => onAction('home') }
      ]
    });
  },

  /**
   * 注入报告样式
   */
  injectReportStyles() {
    if (document.getElementById('report-styles')) return;

    const style = document.createElement('style');
    style.id = 'report-styles';
    style.textContent = `
      .report-container {
        text-align: center;
      }
      .report-header {
        margin-bottom: 24px;
      }
      .report-level {
        font-size: 36px;
        font-weight: 800;
        margin-bottom: 8px;
      }
      .report-desc {
        color: #a4a4a4;
        font-size: 14px;
        line-height: 1.5;
      }
      .report-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      .stat-item {
        background: rgba(255,255,255,0.05);
        padding: 16px;
        border-radius: 4px;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .stat-unit {
        font-size: 14px;
        font-weight: 400;
        opacity: 0.7;
      }
      .stat-label {
        font-size: 12px;
        color: #a4a4a4;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .report-details {
        background: rgba(255,255,255,0.03);
        border-radius: 4px;
        padding: 16px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .text-success { color: #2ed573; }
      .text-error { color: #ff4757; }
    `;
    document.head.appendChild(style);
  },

  /**
   * 显示设置面板
   * @param {Object} settings - 当前设置
   * @param {Function} onSave - 保存回调
   */
  showSettings(settings, onSave) {
    // 复制设置用于编辑
    const editSettings = { ...settings };

    const content = `
      <div class="settings-layout">
        <div class="settings-form">
          <div class="setting-group">
            <label class="setting-label">练习时长</label>
            <div class="setting-options" data-group="practiceDuration">
              ${Config.DURATION_OPTIONS.map(opt => `
                <button class="setting-btn ${editSettings.practiceDuration === opt.value ? 'active' : ''}"
                        data-key="practiceDuration" data-value="${opt.value}">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label">准星样式</label>
            <div class="setting-options" data-group="crosshairStyle">
              ${Object.entries(Config.CROSSHAIR_STYLES).map(([key, val]) => `
                <button class="setting-btn ${editSettings.crosshairStyle === key ? 'active' : ''}"
                        data-key="crosshairStyle" data-value="${key}">
                  ${val.name}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label">准星颜色</label>
            <div class="color-row">
              <input type="color" class="setting-color" data-key="crosshairColor" value="${editSettings.crosshairColor}">
              <span class="color-hex">${editSettings.crosshairColor.toUpperCase()}</span>
            </div>
          </div>

          <div class="setting-group">
            <label class="setting-label">灵敏度</label>
            <div class="setting-range-row">
              <input type="range" class="setting-range" data-key="sensitivity"
                     min="0.5" max="2" step="0.1" value="${editSettings.sensitivity}">
              <span class="setting-value">${editSettings.sensitivity.toFixed(1)}x</span>
            </div>
          </div>

          <div class="setting-footer">
            <p class="setting-tip">这是一款，专门为上了年纪、和作者一样反应速度下降的朋友准备的，可以上班时练枪的在线应用，如果感到有用，就请我喝杯奶茶吧！</p>
            <button class="donate-btn" id="donateBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
              </svg>
              请作者喝奶茶
            </button>
          </div>
        </div>

        <div class="settings-preview">
          <label class="preview-label">预览</label>
          <div class="preview-area">
            <canvas id="previewCanvas" width="120" height="120"></canvas>
          </div>
        </div>
      </div>
    `;

    this.injectSettingsStyles();

    const { overlay, close } = this.modal({
      title: '设置',
      content,
      className: 'settings-modal',
      buttons: [
        { label: '保存', action: 'save', class: 'btn-primary btn-save', handler: () => onSave(editSettings) },
        { label: '取消', action: 'cancel', class: 'btn-secondary' }
      ]
    });

    // 绘制准星预览
    const drawPreview = () => {
      const canvas = overlay.querySelector('#previewCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 120, 120);
      const cx = 60, cy = 60;
      const size = 40;

      const style = Config.CROSSHAIR_STYLES[editSettings.crosshairStyle];
      if (style && style.render) {
        style.render(ctx, cx, cy, size, editSettings.crosshairColor);
      }
    };

    // 绑定设置事件 - 按分组处理
    const groups = overlay.querySelectorAll('[data-group]');
    groups.forEach(group => {
      const groupKey = group.dataset.group;
      const btns = group.querySelectorAll('.setting-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          // 只移除同组按钮的 active
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          editSettings[groupKey] = btn.dataset.value;
          drawPreview();
        });
      });
    });

    const colorInput = overlay.querySelector('.setting-color');
    const colorHex = overlay.querySelector('.color-hex');
    colorInput.addEventListener('input', (e) => {
      editSettings[e.target.dataset.key] = e.target.value;
      if (colorHex) colorHex.textContent = e.target.value.toUpperCase();
      drawPreview();
    });

    const rangeInput = overlay.querySelector('.setting-range');
    const rangeValue = overlay.querySelector('.setting-value');
    rangeInput.addEventListener('input', (e) => {
      editSettings[e.target.dataset.key] = parseFloat(e.target.value);
      rangeValue.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });

    // 请作者喝奶茶按钮
    const donateBtn = overlay.querySelector('#donateBtn');
    if (donateBtn) {
      donateBtn.addEventListener('click', () => {
        this.showDonateModal();
      });
    }

    // 初始绘制
    requestAnimationFrame(drawPreview);

    return { overlay, close };
  },

  /**
   * 显示请喝奶茶弹窗
   */
  showDonateModal() {
    const content = `
      <div class="donate-content">
        <img src="images/IMG_0977.JPG" alt="请作者喝奶茶" class="donate-image">
      </div>
    `;

    return this.modal({
      title: '感谢支持',
      content,
      className: 'donate-modal',
      buttons: [
        { label: '关闭', action: 'close', class: 'btn-secondary' }
      ]
    });
  },

  /**
   * 注入设置样式
   */
  injectSettingsStyles() {
    if (document.getElementById('settings-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-styles';
    style.textContent = `
      .settings-layout {
        display: flex;
        gap: 32px;
      }
      .settings-form {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .setting-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .setting-label {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255,255,255,0.6);
      }
      .setting-options {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .setting-btn {
        padding: 10px 16px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .setting-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
      }
      .setting-btn.active {
        background: #1CFFC6;
        border-color: #1CFFC6;
        color: #000000;
      }
      .color-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .setting-color {
        width: 48px;
        height: 36px;
        padding: 0;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        cursor: pointer;
        background: none;
      }
      .color-hex {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        font-family: monospace;
      }
      .setting-range-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .setting-range {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        outline: none;
      }
      .setting-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: #1CFFC6;
        border-radius: 50%;
        cursor: pointer;
      }
      .setting-value {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
        min-width: 40px;
        text-align: right;
      }
      .settings-preview {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .preview-label {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255,255,255,0.6);
      }
      .preview-area {
        width: 120px;
        height: 120px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #previewCanvas {
        display: block;
      }
      .btn-save {
        background: #1CFFC6 !important;
        color: #000000 !important;
      }
      .btn-save:hover {
        background: #2effd4 !important;
      }
      .setting-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .setting-tip {
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        line-height: 1.6;
      }
      .donate-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .donate-btn:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.2);
        color: rgba(255,255,255,0.9);
      }
      .donate-btn svg {
        stroke: currentColor;
      }
      .donate-content {
        text-align: center;
      }
      .donate-image {
        max-width: 100%;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }
};

// 导出
window.UI = UI;

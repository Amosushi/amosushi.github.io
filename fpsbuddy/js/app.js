/**
 * FPS Buddy - 主入口
 */

(function() {
  'use strict';

  // 获取URL参数
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // 获取元素
  const $ = (selector) => document.querySelector(selector);

  // 初始化
  function init() {
    // 绑定模式选择事件
    bindModeCards();
    // 绑定底部导航
    bindNavButtons();
    // 检查首次访问
    checkFirstVisit();
    // 检查URL参数
    handleQueryParams();
  }

  // 绑定模式卡片点击
  function bindModeCards() {
    const cards = document.querySelectorAll('.mode-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        startTraining(mode);
      });
    });
  }

  // 绑定导航按钮
  function bindNavButtons() {
    // 个人中心
    $('#profileBtn').addEventListener('click', () => {
      window.location.href = 'profile.html';
    });

    // 设置
    $('#settingsBtn').addEventListener('click', () => {
      showSettingsModal();
    });
  }

  // 检查首次访问
  function checkFirstVisit() {
    if (Storage.isFirstVisit()) {
      showGuide();
      Storage.markVisited();
    }
  }

  // 显示引导
  function showGuide() {
    const template = $('#guideTemplate');
    const clone = template.content.cloneNode(true);

    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    // 绑定开始按钮
    overlay.querySelector('#startGuide').addEventListener('click', () => {
      overlay.remove();
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  // 显示设置弹窗
  function showSettingsModal() {
    const settings = Storage.getSettings();
    UI.showSettings(settings, (newSettings) => {
      Storage.saveSettings(newSettings);
      UI.toast('设置已保存', 'success');
    });
  }

  // 开始训练
  function startTraining(mode) {
    const url = new URL('training.html', window.location.href);
    url.searchParams.set('mode', mode);
    window.location.href = url.toString();
  }

  // 处理URL参数
  function handleQueryParams() {
    const mode = getQueryParam('mode');
    if (mode) {
      // 可以显示模式提示
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

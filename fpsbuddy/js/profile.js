/**
 * FPS Buddy - 个人中心
 */

(function() {
  'use strict';

  // 初始化
  function init() {
    loadStats();
    loadBadges();
    loadRecords();
    bindEvents();
  }

  // 加载统计数据
  function loadStats() {
    const achievements = Storage.getAchievements();
    const records = Storage.getRecords();

    // 练习次数
    document.getElementById('totalSessions').textContent = achievements.totalSessions || 0;

    // 累计时长
    const totalMinutes = Math.round((achievements.totalPracticeTime || 0) / 60);
    document.getElementById('totalTime').textContent = totalMinutes;

    // 最高命中率
    document.getElementById('bestAccuracy').textContent =
      (achievements.bestAccuracy || 0).toFixed(1) + '%';

    // 最快反应
    const fastest = achievements.fastestReaction;
    document.getElementById('fastestReaction').textContent =
      fastest && fastest < Infinity ? fastest.toFixed(0) + 'ms' : '--';
  }

  // 加载勋章
  function loadBadges() {
    const achievements = Storage.getAchievements();
    const badgesGrid = document.getElementById('badgesGrid');
    const unlockedBadges = achievements.badges || [];

    let html = '';
    for (const [id, badge] of Object.entries(Config.BADGES)) {
      const isUnlocked = unlockedBadges.includes(id);
      const imgSrc = badge.image || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>');
      html += `
        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <img class="badge-image" src="${imgSrc}" alt="${badge.name}">
          <div class="badge-name">${badge.name}</div>
          <div class="badge-desc">${badge.desc || ''}</div>
        </div>
      `;
    }
    badgesGrid.innerHTML = html;
  }

  // 加载记录
  function loadRecords(filter = 'all') {
    const records = Storage.getRecords();
    const recordsList = document.getElementById('recordsList');

    // 筛选
    const filtered = filter === 'all'
      ? records
      : records.filter(r => r.mode === filter);

    if (filtered.length === 0) {
      recordsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>还没有练习记录</p>
          <p class="text-muted">开始你的第一次练习吧！</p>
        </div>
      `;
      return;
    }

    const modeNames = {
      serious: '认真练枪',
      casual: '摸鱼练枪',
      infinite: '无限模式',
      challenge: '挑战模式'
    };

    let html = '';
    for (const record of filtered.slice(0, 20)) {
      const date = new Date(record.timestamp);
      const timeStr = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const levelColor = Config.LEVELS[record.level]?.color || '#fff';

      html += `
        <div class="record-item">
          <div class="record-mode ${record.mode}">${modeNames[record.mode]}</div>
          <div class="record-info">
            <div class="record-stat">
              <div class="record-stat-value">${record.accuracy.toFixed(1)}%</div>
              <div class="record-stat-label">命中率</div>
            </div>
            <div class="record-stat">
              <div class="record-stat-value" style="color: ${levelColor}">${record.avgReactionTime.toFixed(0)}</div>
              <div class="record-stat-label">平均ms</div>
            </div>
          </div>
          <div class="record-time">${timeStr}</div>
        </div>
      `;
    }
    recordsList.innerHTML = html;
  }

  // 绑定事件
  function bindEvents() {
    // 清除数据
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearData);
    }
  }

  // 导出数据
  function exportData() {
    const data = Storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fpsbuddy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    UI.toast('数据已导出', 'success');
  }

  // 清除数据
  function clearData() {
    UI.modal({
      title: '确认清除',
      content: '<p>确定要清除所有练习数据吗？此操作不可恢复。</p>',
      buttons: [
        { label: '取消', action: 'cancel', class: 'btn-secondary' },
        { label: '确定清除', action: 'confirm', class: 'btn-primary', handler: () => {
          Storage.clearAll();
          init();
          UI.toast('数据已清除', 'success');
        }}
      ]
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

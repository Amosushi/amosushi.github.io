/**
 * FPS Buddy - 练枪核心逻辑
 */

(function() {
  'use strict';

  // ============================================
  // 游戏状态
  // ============================================
  const Game = {
    isRunning: false,
    isPaused: false,
    mode: 'serious',
    settings: {},
    selectedVenue: 0,

    // 场地图片
    venueBackgrounds: [null, null, null],
    venueEnemyImages: [null, null, null],
    casualBackgrounds: [null, null, null],
    infiniteBackground: null,
    selectedCasualVenue: 0,

    // 时间
    startTime: 0,
    elapsedTime: 0,
    duration: 60,

    // 统计
    hits: 0,
    misses: 0,
    reactionTimes: [],

    // 敌人
    enemies: [],
    enemyIdCounter: 0,

    // 画布
    canvas: null,
    ctx: null,

    // 鼠标位置
    mouseX: 0,
    mouseY: 0,

    // 动画帧
    animationId: null,

    reset() {
      this.isRunning = false;
      this.isPaused = false;
      this.elapsedTime = 0;
      this.hits = 0;
      this.misses = 0;
      this.reactionTimes = [];
      this.enemies = [];
      this.combo = 0;
      this.maxCombo = 0;
      this.enemyIdCounter = 0;
    },

    generateEnemyId() {
      return 'enemy_' + (++this.enemyIdCounter);
    }
  };

  // ============================================
  // 初始化
  // ============================================

  function init() {
    // 获取URL参数
    const mode = new URLSearchParams(window.location.search).get('mode') || 'serious';
    Game.mode = mode;

    // 加载设置
    Game.settings = Storage.getSettings();
    Game.duration = Game.settings.practiceDuration || 60;

    // 初始化画布
    initCanvas();

    // 加载场地图片
    loadVenueImages();

    // 绑定事件
    bindEvents();

    // 根据模式显示不同界面
    showModeScreen();
  }

  function showModeScreen() {
    // 隐藏所有模式界面
    document.getElementById('seriousModeScreen').classList.add('hidden');
    document.getElementById('casualModeScreen').classList.add('hidden');

    // 无限模式不需要准备界面，直接开始
    if (Game.mode === 'infinite') {
      Game.isInfinite = true;
      Game.duration = Infinity; // 无限时间
      startGame();
      return;
    }

    // 显示对应模式的界面
    if (Game.mode === 'serious') {
      document.getElementById('seriousModeScreen').classList.remove('hidden');
    } else if (Game.mode === 'casual') {
      document.getElementById('casualModeScreen').classList.remove('hidden');
    }

    document.getElementById('startScreen').classList.remove('hidden');
    Game.isRunning = false;
  }

  function initCanvas() {
    Game.canvas = document.getElementById('gameCanvas');
    Game.ctx = Game.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    Game.canvas.width = window.innerWidth;
    Game.canvas.height = window.innerHeight;
  }

  function loadVenueImages() {
    // 认真模式场地
    Game.venueBackgrounds[0] = new Image();
    Game.venueBackgrounds[0].src = 'images/zombieBG.png';
    Game.venueEnemyImages[0] = new Image();
    Game.venueEnemyImages[0].src = 'images/zombie.png';

    Game.venueBackgrounds[1] = new Image();
    Game.venueBackgrounds[1].src = 'images/guiltystreet.png';
    Game.venueEnemyImages[1] = new Image();
    Game.venueEnemyImages[1].src = 'images/gangster.png';

    Game.venueBackgrounds[2] = new Image();
    Game.venueBackgrounds[2].src = 'images/ufo.png';
    Game.venueEnemyImages[2] = new Image();
    Game.venueEnemyImages[2].src = 'images/alien.png';

    // 摸鱼模式场地
    Game.casualBackgrounds = [null, null, null];
    Game.casualBackgrounds[0] = new Image();
    Game.casualBackgrounds[0].src = 'images/fake1.png';
    // fake2 已删除
    Game.casualBackgrounds[1] = new Image();
    Game.casualBackgrounds[1].src = 'images/fake3.png';
    // 第三张为自定义上传图片，初始为 null

    // 无限模式背景
    Game.infiniteBackground = new Image();
    Game.infiniteBackground.src = 'images/readyBG.png';
  }

  // 重置场地选择
  function resetVenueSelection() {
    document.querySelectorAll('.venue-card').forEach(c => c.classList.remove('selected'));
  }

  // ============================================
  // 事件绑定
  // ============================================

  function bindEvents() {
    // 鼠标移动
    document.addEventListener('mousemove', (e) => {
      Game.mouseX = e.clientX;
      Game.mouseY = e.clientY;
    });

    // 点击射击
    Game.canvas.addEventListener('click', handleShoot);

    // 空格暂停
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && Game.isRunning) {
        e.preventDefault();
        togglePause();
      }
    });

    // 场地选择 - 认真模式
    const seriousVenueCards = document.querySelectorAll('#seriousVenueSelector .venue-card');
    seriousVenueCards.forEach(card => {
      card.addEventListener('click', () => {
        seriousVenueCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Game.selectedVenue = parseInt(card.dataset.venue);
      });
    });

    // 上传卡片处理
    const uploadCard = document.getElementById('uploadCard');
    const uploadInput = document.getElementById('uploadInput');

    uploadCard.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadInput.click();
    });

    // 场地选择 - 摸鱼模式
    const casualVenueCards = document.querySelectorAll('#casualVenueSelector .venue-card');
    casualVenueCards.forEach(card => {
      if (card === uploadCard) return; // 上传卡片单独处理
      card.addEventListener('click', () => {
        casualVenueCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Game.selectedCasualVenue = parseInt(card.dataset.venue);
      });
    });

    // 文件选择处理
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        // 创建图片对象
        Game.casualBackgrounds[2] = new Image();
        Game.casualBackgrounds[2].onload = () => {
          // 更新预览
          const preview = document.getElementById('uploadPreview');
          preview.src = dataUrl;
          preview.style.display = 'block';
          uploadCard.classList.add('has-image');
          // 选中卡片
          casualVenueCards.forEach(c => c.classList.remove('selected'));
          uploadCard.classList.add('selected');
          Game.selectedCasualVenue = 2;
        };
        Game.casualBackgrounds[2].src = dataUrl;
      };
      reader.readAsDataURL(file);
      // 清空 input，允许重复选择同一文件
      e.target.value = '';
    });

    // 开始按钮 - 通用的
    const startBtns = document.querySelectorAll('.start-btn');
    startBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        Game.mode = mode;
        startGame();
      });
    });

    // 暂停菜单按钮
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('endBtn').addEventListener('click', endGame);
    document.getElementById('backBtn').addEventListener('click', goHome);
  }

  // ============================================
  // 游戏控制
  // ============================================

  function showStartScreen() {
    document.getElementById('startScreen').classList.remove('hidden');
    document.body.classList.remove('show-crosshair');
    Game.isRunning = false;
  }

  function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.body.classList.add('show-crosshair');

    Game.reset();
    Game.isRunning = true;
    Game.startTime = performance.now();

    gameLoop();
  }

  function gameLoop() {
    if (!Game.isRunning || Game.isPaused) return;

    const now = performance.now();
    Game.elapsedTime = (now - Game.startTime) / 1000;

    // 无限模式不结束，其他模式检查时间
    if (!Game.isInfinite && Game.elapsedTime >= Game.duration) {
      endGame();
      return;
    }

    spawnEnemy();
    updateEnemies();
    render();
    updateHUD();

    Game.animationId = requestAnimationFrame(gameLoop);
  }

  // ============================================
  // 敌人管理
  // ============================================

  function spawnEnemy() {
    let spawnRate;
    if (Game.mode === 'casual') {
      spawnRate = Config.SPAWN_RATES.medium * 1.5;
    } else if (Game.mode === 'infinite') {
      const speedMultiplier = 1 + (Game.elapsedTime / 60) * 0.5;
      spawnRate = Config.SPAWN_RATES.medium / speedMultiplier;
    } else {
      spawnRate = Config.SPAWN_RATES[Game.settings.enemySpawnRate] || Config.SPAWN_RATES.medium;
    }

    const density = Config.ENEMY_DENSITY[Game.settings.enemyDensity] || 1;
    const lastSpawn = Game.enemies.length > 0 ? Game.enemies[Game.enemies.length - 1].spawnTime : 0;
    const maxEnemies = density * 3;

    if (Game.enemies.length < maxEnemies && performance.now() - lastSpawn > spawnRate) {
      Game.enemies.push(createEnemy());
    }
  }

  function createEnemy() {
    // 无限模式：光点敌人（放大1倍）
    if (Game.isInfinite) {
      const size = 16; // 原来是8，现在16
      const padding = size + 20;
      const maxX = Game.canvas.width - padding;
      const maxY = Game.canvas.height - padding;

      const x = padding + Math.random() * (maxX - padding);
      const y = padding + Math.random() * (maxY - padding);

      return {
        id: Game.generateEnemyId(),
        x, y, size,
        spawnTime: performance.now(),
        lifetime: 2000,
        hit: false,
        color: '#ffffff',
        borderColor: '#ffffff',
        isDot: true
      };
    }

    const size = Game.mode === 'casual'
      ? (Game.settings.dotSize || 12)
      : (Config.ENEMY_STYLES[Game.settings.enemyStyle]?.size || 50);

    const padding = size + 20;
    const maxX = Game.canvas.width - padding;
    const maxY = Game.canvas.height - padding;

    let x, y;
    do {
      x = padding + Math.random() * (maxX - padding);
      y = padding + Math.random() * (maxY - padding);
    } while (y < 100 || y > Game.canvas.height - 100);

    const lifetime = Game.mode === 'casual'
      ? 3000
      : (Config.ENEMY_LIFETIME[Game.settings.enemySpawnRate] || Config.ENEMY_LIFETIME.medium);

    return {
      id: Game.generateEnemyId(),
      x, y, size,
      spawnTime: performance.now(),
      lifetime,
      hit: false,
      color: Game.mode === 'casual'
        ? (Game.settings.dotColor || '#ffffff')
        : (Config.ENEMY_STYLES[Game.settings.enemyStyle]?.color || '#ff4757'),
      borderColor: Game.mode === 'casual'
        ? (Game.settings.dotColor || '#ffffff')
        : (Config.ENEMY_STYLES[Game.settings.enemyStyle]?.borderColor || '#ff6b7a')
    };
  }

  function updateEnemies() {
    const now = performance.now();
    Game.enemies = Game.enemies.filter(enemy => {
      if (enemy.hit) return false;
      if (now - enemy.spawnTime > enemy.lifetime) {
        Game.misses++;
        return false;
      }
      return true;
    });
  }

  // ============================================
  // 射击
  // ============================================

  function handleShoot(e) {
    if (!Game.isRunning || Game.isPaused) return;

    const clickX = e.clientX;
    const clickY = e.clientY;

    let hitEnemy = null;
    let minDistance = Infinity;

    for (const enemy of Game.enemies) {
      if (enemy.hit) continue;
      const dx = clickX - enemy.x;
      const dy = clickY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < enemy.size && distance < minDistance) {
        minDistance = distance;
        hitEnemy = enemy;
      }
    }

    if (hitEnemy) {
      const reactionTime = performance.now() - hitEnemy.spawnTime;
      hitEnemy.hit = true;
      Game.hits++;
      Game.reactionTimes.push(reactionTime);
      showHitEffect(clickX, clickY, reactionTime);
    } else {
      Game.misses++;
      showMissEffect(clickX, clickY);
    }
  }

  // ============================================
  // 渲染
  // ============================================

  function render() {
    const ctx = Game.ctx;
    ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
    drawBackground();
    drawEnemies();
    drawCrosshair();
  }

  function drawBackground() {
    const ctx = Game.ctx;

    // 无限模式：使用 readyBG.png
    if (Game.isInfinite && Game.infiniteBackground && Game.infiniteBackground.complete) {
      ctx.drawImage(Game.infiniteBackground, 0, 0, Game.canvas.width, Game.canvas.height);
      return;
    }

    // 摸鱼模式：使用 fake1/2/3.png
    if (Game.mode === 'casual' && Game.casualBackgrounds) {
      const bgImg = Game.casualBackgrounds[Game.selectedCasualVenue];
      if (bgImg && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, Game.canvas.width, Game.canvas.height);
        return;
      }
    }

    // 认真模式：使用场地背景
    const bgImg = Game.venueBackgrounds[Game.selectedVenue];
    if (bgImg && bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, Game.canvas.width, Game.canvas.height);
    } else {
      // 默认背景
      const bgConfig = Config.BACKGROUNDS.serious[Game.settings.seriousBackground] ||
        Config.BACKGROUNDS.serious.arena;
      ctx.fillStyle = bgConfig.color;
      ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

      // 网格
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < Game.canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, Game.canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < Game.canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(Game.canvas.width, y);
        ctx.stroke();
      }
    }
  }

  function drawEnemies() {
    const ctx = Game.ctx;
    const now = performance.now();

    // 认真模式敌人图片
    const enemyImg = Game.mode === 'serious' ? Game.venueEnemyImages[Game.selectedVenue] : null;
    const useEnemyImage = enemyImg && enemyImg.complete;

    for (const enemy of Game.enemies) {
      if (enemy.hit) continue;

      const age = now - enemy.spawnTime;
      const lifeRatio = 1 - age / enemy.lifetime;

      let alpha = 1;
      if (lifeRatio < 0.3) {
        alpha = 0.5 + Math.sin(age * 0.02) * 0.5;
      }

      ctx.globalAlpha = alpha;

      // 无限模式：纯白发光光点（放大1倍）
      if (enemy.isDot) {
        const dotSize = enemy.size * 2; // 16px 中心点
        const glowSize = dotSize * 3; // 48px 外发光

        const gradient = ctx.createRadialGradient(
          enemy.x, enemy.y, 0,
          enemy.x, enemy.y, glowSize
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      // 摸鱼模式：黑色半透明圆圈（放大1倍）
      else if (Game.mode === 'casual') {
        const size = (Game.settings.dotSize || 16) * 2; // 32px
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // 认真模式：敌人图片或默认样式
      else if (useEnemyImage) {
        ctx.drawImage(
          enemyImg,
          enemy.x - enemy.size / 2,
          enemy.y - enemy.size / 2,
          enemy.size,
          enemy.size
        );
      } else {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.strokeStyle = enemy.borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }

  function drawCrosshair() {
    const ctx = Game.ctx;
    const style = Config.CROSSHAIR_STYLES[Game.settings.crosshairStyle];
    const color = Game.settings.crosshairColor;
    const size = Game.settings.crosshairSize;

    if (style) {
      style.render(ctx, Game.mouseX, Game.mouseY, size, color);
    }
  }

  // ============================================
  // HUD
  // ============================================

  function updateHUD() {
    updateTimer();
    document.getElementById('hitsCount').textContent = Game.hits;
    document.getElementById('missesCount').textContent = Game.misses;
  }

  function updateTimer() {
    const timerEl = document.getElementById('timer');

    // 无限模式显示 ∞
    if (Game.isInfinite) {
      timerEl.textContent = '∞';
      timerEl.classList.remove('warning', 'danger');
      return;
    }

    const remaining = Math.max(0, Game.duration - Game.elapsedTime);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);

    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    timerEl.classList.remove('warning', 'danger');
    if (remaining <= 10) {
      timerEl.classList.add('danger');
    } else if (remaining <= 30) {
      timerEl.classList.add('warning');
    }
  }

  // ============================================
  // 效果
  // ============================================

  function showHitEffect(x, y, reactionTime) {
    const container = document.getElementById('effectsContainer');
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    effect.innerHTML = `
      <div class="hit-marker"></div>
      <div class="hit-score">${reactionTime.toFixed(0)}ms</div>
    `;
    container.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
  }

  function showMissEffect(x, y) {
    const container = document.getElementById('effectsContainer');
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    effect.innerHTML = `
      <div class="hit-marker" style="border-color: #ff4757; width: 20px; height: 20px;"></div>
    `;
    container.appendChild(effect);
    setTimeout(() => effect.remove(), 300);
  }

  // ============================================
  // 暂停/结束
  // ============================================

  function togglePause() {
    Game.isPaused = !Game.isPaused;
    document.getElementById('pauseMenu').classList.toggle('active', Game.isPaused);
    document.body.classList.toggle('paused', Game.isPaused);

    // 无限模式下隐藏重新设置按钮
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.style.display = Game.isInfinite ? 'none' : 'flex';
    }

    if (!Game.isPaused) {
      document.body.classList.remove('paused');
      Game.startTime = performance.now() - Game.elapsedTime * 1000;
      gameLoop();
    }
  }

  function restartGame() {
    document.getElementById('pauseMenu').classList.remove('active');
    document.getElementById('startScreen').classList.remove('hidden');
    Game.reset();
  }

  function endGame() {
    Game.isRunning = false;
    cancelAnimationFrame(Game.animationId);

    const result = Evaluation.evaluate({
      hits: Game.hits,
      misses: Game.misses,
      reactionTimes: Game.reactionTimes,
      duration: Math.floor(Game.elapsedTime)
    });

    saveRecord(result);
    showReport(result);
  }

  function saveRecord(result) {
    const record = {
      id: Date.now().toString(),
      mode: Game.mode,
      timestamp: Date.now(),
      ...result
    };

    Storage.addRecord(record);
    updateAchievements(result);
  }

  function updateAchievements(result) {
    const achievements = Storage.getAchievements();
    const newBadges = Evaluation.checkBadges(result, achievements);

    achievements.totalSessions = (achievements.totalSessions || 0) + 1;
    achievements.totalPracticeTime = (achievements.totalPracticeTime || 0) + result.duration;
    achievements.bestAccuracy = Math.max(achievements.bestAccuracy || 0, result.accuracy);
    achievements.fastestReaction = Math.min(
      achievements.fastestReaction || Infinity,
      result.fastestReaction
    );
    achievements.longestPractice = Math.max(
      achievements.longestPractice || 0,
      result.duration
    );

    achievements.badges = [...new Set([...achievements.badges, ...newBadges])];
    Storage.updateAchievements(achievements);

    if (newBadges.length > 0) {
      setTimeout(() => showBadgeUnlock(newBadges), 1000);
    }
  }

  function showBadgeUnlock(badgeIds) {
    const badgeNames = badgeIds.map(id => Config.BADGES[id]).filter(Boolean);

    const { close } = UI.modal({
      title: '新成就解锁！',
      content: `
        <div class="badges-unlock">
          ${badgeNames.map(b => `
            <div class="badge-item">
              <img src="${b.image}" alt="${b.name}" class="badge-icon-img">
              <span class="badge-name">${b.name}</span>
            </div>
          `).join('')}
        </div>
      `,
      buttons: [
        { label: '查看成就', action: 'achievements', class: 'btn-secondary' },
        { label: '太棒了！', action: 'close', class: 'btn-primary' }
      ],
      onAction: (action) => {
        if (action === 'achievements') {
          window.location.href = 'profile.html';
        } else if (action === 'close') {
          close();
        }
      }
    });
  }

  function showReport(result) {
    UI.showReport(result, (action) => {
      if (action === 'retry') {
        document.getElementById('startScreen').classList.remove('hidden');
        Game.reset();
      } else {
        goHome();
      }
    });
  }

  function goHome() {
    window.location.href = 'index.html';
  }

  // ============================================
  // 启动
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

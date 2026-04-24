/**
 * ENDLESS RUN — Game Engine
 * 架构：纯 Canvas 2D，无依赖
 * 美术：占位色块（等待替换为真实切图）
 */

// ─────────────────────────────────────────────
//  工具：屏幕切换
// ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─────────────────────────────────────────────
//  配置常量
// ─────────────────────────────────────────────
const CONFIG = {
  gravity:       1800,       // px/s²
  jumpForce:    -680,        // px/s  (向上)
  get groundY()  { return canvas.height * 0.76; }, // 动态：画布高度 76% 处为地面
  initSpeed:     320,        // px/s  初始地面滚动速度
  speedIncr:     12,         // px/s  每秒加速
  maxSpeed:      900,        // px/s  最高速度
  obstacleMin:   900,        // ms    最小障碍间隔
  obstacleMax:   2200,       // ms    最大障碍间隔
  get playerX()  { return canvas.width * 0.2; },   // 动态：画布宽度 20% 处
  fps:           60,

  // 角色尺寸
  charW: 140,
  charH: 175,

  // 碰撞盒收缩（让碰撞更宽容）
  hitShrinkX: 28,
  hitShrinkY: 28,

  // 视差滚动系数（1 = 与背景同速，>1 = 比背景快 = 靠近玩家）
  parallaxGround: 1.1,
};

// ─────────────────────────────────────────────
//  成就系统
// ─────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 0, dist:   50, name: 'The Magician'      },
  { id: 1, dist:  100, name: 'The High Priestess'},
  { id: 2, dist:  300, name: 'The Empress'       },
  { id: 3, dist:  600, name: 'The Emperor'       },
  { id: 4, dist: 1000, name: 'The Chariot'        },
  { id: 5, dist: 2000, name: 'Strength'          },
  { id: 6, dist: 3000, name: 'Temperance'        },
  { id: 7, dist: 4000, name: 'The World'          },
];

// 已解锁成就集合（id → true）
let unlockedAchs = new Set(
  JSON.parse(localStorage.getItem('endlessrun_achs') || '[]')
);

function saveAchievements() {
  localStorage.setItem('endlessrun_achs', JSON.stringify([...unlockedAchs]));
}

function checkAchievements(dist) {
  // 记录本次游戏新解锁的成就
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (dist >= ach.dist && !unlockedAchs.has(ach.id)) {
      unlockedAchs.add(ach.id);
      newlyUnlocked.push(ach);
    }
  }
  if (newlyUnlocked.length > 0) {
    saveAchievements();
  }
  return newlyUnlocked;
}

// ─────────────────────────────────────────────
//  颜色占位主题
// ─────────────────────────────────────────────
const COLORS = {
  sky:        '#1a1a2e',
  ground:     '#1CFFC6',
  groundSub:  'rgba(28,255,198,0.15)',
  player:     '#1CFFC6',
  playerDead: '#ff4d6d',
  obstacle1:  '#ff4d6d',
  obstacle2:  '#ffd166',
  obstacle3:  '#a855f7',
  bgLine:     'rgba(255,255,255,0.04)',
  star:       'rgba(255,255,255,0.6)',
  dust:       'rgba(255,255,255,0.4)',
};

// ─────────────────────────────────────────────
//  全局状态
// ─────────────────────────────────────────────
let gameState = 'home'; // 'home' | 'playing' | 'dead'
let musicEnabled = true;

// 背景音乐
const bgm = new Audio('assets/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.5;

// 死亡音效
const sfxDeath = new Audio('assets/gameover.wav');
sfxDeath.volume = 0.7;

// ─────────────────────────────────────────────
//  Canvas 初始化
// ─────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
// 立即设置 canvas 尺寸（此时 player 尚未声明，不访问它）
resizeCanvas();

// resize 时额外同步角色 Y（player 在后面声明，但 addEventListener 回调是异步触发的，此时 player 已存在）
window.addEventListener('resize', () => {
  resizeCanvas();
  if (player.onGround) {
    player.y = CONFIG.groundY - CONFIG.charH;
  }
  // playerX 是 getter，直接从 CONFIG 取
  player.x = CONFIG.playerX;
});

// ─────────────────────────────────────────────
//  背景图片（无缝横向滚动）
// ─────────────────────────────────────────────
const bgImg = new Image();
bgImg.src = 'assets/snakeBG.webp?v=' + Date.now(); // 强制刷新缓存

// 地面切图（比背景滚动稍快，产生近大远小视差）
const groundImg = new Image();
groundImg.src = 'assets/ground.webp?v=' + Date.now();

// 跑步动画帧（run-1.webp ~ run-6.webp，共6帧）
const runFrames = [];
for (let i = 1; i <= 6; i++) {
  const img = new Image();
  img.src = `assets/run-${i}.webp?v=${Date.now()}`;
  runFrames.push(img);
}

// 待机动画帧（idle-1.webp ~ idle-3.webp，共3帧）
const idleFrames = [];
for (let i = 1; i <= 3; i++) {
  const img = new Image();
  img.src = `assets/idle-${i}.webp?v=${Date.now()}`;
  idleFrames.push(img);
}

// 跳跃（单帧）
const jumpFrame = new Image();
jumpFrame.src = `assets/jump.webp?v=${Date.now()}`;

// 死亡（单帧）
const deadFrame = new Image();
deadFrame.src = `assets/death.webp?v=${Date.now()}`;

function drawBgImage(c, w, h, offset) {
  if (!bgImg.complete || !bgImg.naturalWidth) return;
  const imgW = bgImg.naturalWidth;
  const imgH = bgImg.naturalHeight;
  // 高度撑满到地面线，宽度按同比例
  const scale = CONFIG.groundY / imgH;
  const tileW = imgW * scale;  // 单张铺满高度后的宽度

  // offset 增大 → 图片左移 → 取模保证无缝
  const rawShift = offset % tileW;
  // 保证 rawShift 在 [0, tileW) 范围内（处理负数取模）
  const shift = ((rawShift % tileW) + tileW) % tileW;

  // 需要画几张完整图块才能覆盖 canvas 宽度（多画一张防缝隙）
  const copies = Math.ceil(w / tileW) + 2;

  for (let i = 0; i < copies; i++) {
    // 每块向左多画 1px，重叠掉拼接缝隙
    const destX = i * tileW - shift - 1;
    c.drawImage(
      bgImg,
      0, 0, imgW, imgH,   // 源：整张图片
      destX, 0, tileW + 2, CONFIG.groundY  // 目标：宽高各多 1px，重叠缝隙
    );
  }
}

// ─────────────────────────────────────────────
//  尘埃粒子系统（跑步时脚下）
// ─────────────────────────────────────────────
const dustParticles = [];
function spawnDust(x, y) {
  for (let i = 0; i < 3; i++) {
    dustParticles.push({
      x, y,
      vx: -(Math.random() * 60 + 20),
      vy: -(Math.random() * 40 + 10),
      life: 1,
      r: Math.random() * 4 + 2,
    });
  }
}
function updateDust(dt) {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const p = dustParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
    p.life -= dt * 2.5;
    if (p.life <= 0) dustParticles.splice(i, 1);
  }
}
function drawDust() {
  for (const p of dustParticles) {
    ctx.save();
    ctx.globalAlpha = p.life * 0.6;
    ctx.fillStyle = COLORS.dust;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  背景图层（平行滚动占位）
// ─────────────────────────────────────────────
const bgLayers = [
  { offset: 0, speed: 1, draw: drawBgImage }, // offset 直接就是 px 偏移量
];

// ─────────────────────────────────────────────
//  地面
// ─────────────────────────────────────────────
let groundOffset = 0;
function drawGround(w, h) {
  if (!groundImg.complete || !groundImg.naturalWidth) return;
  const gy = CONFIG.groundY;
  const imgW = groundImg.naturalWidth;
  const imgH = groundImg.naturalHeight;

  // 地面高度（从地面线到画布底部），按比例缩放地面图
  const groundH = h - gy;
  const scale = groundH / imgH;
  const tileW = imgW * scale;

  // 地面滚动比背景稍快（近大远小视差）
  // groundOffset 负向累积 → 取负让 shift 随 offset 变负而增大 → 图块左移
  const rawShift = -groundOffset * CONFIG.parallaxGround;
  const shift = ((rawShift % tileW) + tileW) % tileW;

  // 横向平铺，从 shift 位置开始（向左滚动）
  const copies = Math.ceil(w / tileW) + 2;
  for (let i = 0; i < copies; i++) {
    const destX = i * tileW - shift - 1;
    ctx.drawImage(
      groundImg,
      0, 0, imgW, imgH,        // 源：整张
      destX, gy, tileW + 2, groundH  // 目标：从地面线开始铺满到底
    );
  }
}

// ─────────────────────────────────────────────
//  角色动画帧（占位色块绘制）
// ─────────────────────────────────────────────
/**
 * 当你有切图时，将下面各 drawChar* 函数换成 ctx.drawImage(img, x, y, w, h) 即可。
 * 切图约定：
 *   assets/run_0.png ~ run_5.png  (6帧)
 *   assets/jump_0.png ~ jump_3.png (4帧)
 *   assets/idle_0.png ~ idle_3.png (4帧)
 *   assets/dead_0.png ~ dead_3.png (4帧)
 */
function drawCharPlaceholder(c, x, y, w, h, color, label) {
  c.save();
  // 身体
  c.fillStyle = color;
  c.shadowBlur = 16;
  c.shadowColor = color;
  const bx = x + w * 0.2, bw = w * 0.6;
  const headH = h * 0.3, bodyH = h * 0.4, legH = h * 0.3;
  // 头
  c.beginPath();
  c.roundRect(bx, y, bw, headH, 6);
  c.fill();
  // 躯干
  c.fillStyle = color;
  c.fillRect(bx + bw * 0.15, y + headH, bw * 0.7, bodyH);
  // 腿（动态）
  c.fillStyle = color;
  c.fillRect(bx + bw * 0.1, y + headH + bodyH, bw * 0.3, legH);
  c.fillRect(bx + bw * 0.55, y + headH + bodyH, bw * 0.3, legH);
  c.shadowBlur = 0;
  // 标签（开发用）
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.font = '10px monospace';
  c.fillText(label, x + 4, y + h - 4);
  c.restore();
}

// ─────────────────────────────────────────────
//  角色状态机
// ─────────────────────────────────────────────
const player = {
  x: CONFIG.playerX,
  y: CONFIG.groundY - CONFIG.charH,
  vy: 0,
  state: 'idle',   // 'idle' | 'run' | 'jump' | 'dead'
  frame: 0,
  frameTimer: 0,
  frameDurations: {
    idle: 180,  // ms/帧
    run:  100,
    jump: 120,
    dead: 160,
  },
  frameCounts: {
    idle: 3,
    run:  6,
    jump: 1,
    dead: 1,
  },
  onGround: true,
  dustTimer: 0,

  reset() {
    this.x  = CONFIG.playerX;
    this.y  = CONFIG.groundY - CONFIG.charH;
    this.vy = 0;
    this.state = 'run';
    this.frame = 0;
    this.frameTimer = 0;
    this.onGround = true;
  },

  update(dt) {
    // 重力
    if (!this.onGround) {
      this.vy += CONFIG.gravity * dt;
      this.y  += this.vy * dt;
      if (this.y >= CONFIG.groundY - CONFIG.charH) {
        this.y = CONFIG.groundY - CONFIG.charH;
        this.vy = 0;
        this.onGround = true;
        if (this.state === 'jump') this.setState('run');
      }
    }

    // 帧动画推进
    this.frameTimer += dt * 1000;
    if (this.frameTimer >= this.frameDurations[this.state]) {
      this.frameTimer = 0;
      const count = this.frameCounts[this.state];
      if (this.state === 'dead') {
        this.frame = Math.min(this.frame + 1, count - 1); // 死亡不循环
      } else {
        this.frame = (this.frame + 1) % count;
      }
    }

    // 尘埃
    if (this.state === 'run' && this.onGround) {
      this.dustTimer += dt * 1000;
      if (this.dustTimer > 120) {
        this.dustTimer = 0;
        spawnDust(this.x + CONFIG.charW * 0.18, CONFIG.groundY + 2);
      }
    }
  },

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.frame = 0;
    this.frameTimer = 0;
  },

  jump() {
    if (!this.onGround || this.state === 'dead') return;
    this.vy = CONFIG.jumpForce;
    this.onGround = false;
    this.setState('jump');
  },

  draw(c, px, py) {
    const w = CONFIG.charW, h = CONFIG.charH;
    const label = `${this.state}[${this.frame}]`;

    // 根据状态选择帧
    let sprite = null;
    if (this.state === 'run') {
      sprite = runFrames[this.frame];
    } else if (this.state === 'idle') {
      sprite = idleFrames[this.frame];
    } else if (this.state === 'jump') {
      sprite = jumpFrame;
    } else if (this.state === 'dead') {
      sprite = deadFrame;
    }

    if (sprite && sprite.complete && sprite.naturalWidth) {
      c.drawImage(sprite, px, py, w, h);
      return;
    }

    // 图片未加载完成时降级为占位色块
    const colors = { idle: '#1CFFC6', run: '#1CFFC6', jump: '#80ffe8', dead: '#ff4d6d' };
    drawCharPlaceholder(c, px, py, w, h, colors[this.state] || '#1CFFC6', label);
  },

  hitBox() {
    const sx = CONFIG.hitShrinkX, sy = CONFIG.hitShrinkY;
    return {
      x: this.x + sx,
      y: this.y + sy,
      w: CONFIG.charW - sx * 2,
      h: CONFIG.charH - sy * 2,
    };
  }
};

// ─────────────────────────────────────────────
//  障碍物图集（e-1~e-4 → 石块/尖刺/箱子/柱子）
// ─────────────────────────────────────────────
const obstacleSprites = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `assets/e-${i}.webp?v=${Date.now()}`;
  obstacleSprites.push(img);
}

const OBSTACLE_TYPES = [
  { w: 52, h: 80,  spriteIdx: 0, color: COLORS.obstacle1, label: '石块' },
  { w: 40, h: 120, spriteIdx: 1, color: COLORS.obstacle2, label: '尖刺' },
  { w: 80, h: 55,  spriteIdx: 2, color: COLORS.obstacle3, label: '箱子' },
  { w: 28, h: 105, spriteIdx: 3, color: COLORS.obstacle1, label: '柱子' },
];

let obstacles = [];
let nextObstacleIn = 1200; // ms

function spawnObstacle(canvasW) {
  const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  obstacles.push({
    x: canvasW + 20,
    y: CONFIG.groundY - type.h,
    w: type.w,
    h: type.h,
    color: type.color,
    label: type.label,
    spriteIdx: type.spriteIdx,
  });
  // 随游戏速度缩短间隔（难度增幅减弱）
  const spd = Math.min(gameSpeed, CONFIG.maxSpeed);
  const factor = 1 - (spd - CONFIG.initSpeed) / (CONFIG.maxSpeed - CONFIG.initSpeed) * 0.2;
  const base = CONFIG.obstacleMin + Math.random() * (CONFIG.obstacleMax - CONFIG.obstacleMin);
  // 20% 概率出现紧密排列（高难度），剩余 80% 正常随机
  if (Math.random() < 0.2) {
    nextObstacleIn = base * 0.78 * factor; // 稍紧，约八成间隔
  } else {
    nextObstacleIn = base * factor;
  }
}

function updateObstacles(dt, canvasW, speed) {
  nextObstacleIn -= dt * 1000;
  if (nextObstacleIn <= 0) spawnObstacle(canvasW);

  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= speed * dt;
    if (obstacles[i].x + obstacles[i].w < -20) obstacles.splice(i, 1);
  }
}

function drawObstacles() {
  for (const ob of obstacles) {
    const sprite = obstacleSprites[ob.spriteIdx];
    if (sprite && sprite.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, ob.x, ob.y, ob.w, ob.h);
    } else {
      // 图未加载时降级为色块
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = ob.color;
      ctx.fillStyle = ob.color;
      ctx.beginPath();
      ctx.roundRect(ob.x, ob.y, ob.w, ob.h, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

// ─────────────────────────────────────────────
//  碰撞检测
// ─────────────────────────────────────────────
function checkCollision() {
  const p = player.hitBox();
  for (const ob of obstacles) {
    if (
      p.x < ob.x + ob.w &&
      p.x + p.w > ob.x &&
      p.y < ob.y + ob.h &&
      p.y + p.h > ob.y
    ) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
//  游戏数据
// ─────────────────────────────────────────────
let gameSpeed    = CONFIG.initSpeed;
let distancePx   = 0;
let distanceM    = 0;
let gameTime     = 0;
let bestDist     = parseInt(
  (localStorage.getItem('bestDist') || '0').toString().replace(/m$/, ''), 10
);

document.getElementById('best-dist').textContent = bestDist;
document.getElementById('gameover-best-dist').textContent = bestDist;

// ─────────────────────────────────────────────
//  游戏主循环
// ─────────────────────────────────────────────
let lastTime = 0;
let rafId = null;

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05); // 最大 delta 50ms 防卡顿
  lastTime = ts;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // --- 背景 ---
  for (const layer of bgLayers) {
    layer.draw(ctx, W, H, layer.offset);
  }

  // --- 地面 ---
  drawGround(W, H);

  if (gameState === 'playing') {
    // 推进速度
    gameSpeed = Math.min(CONFIG.initSpeed + gameTime * CONFIG.speedIncr, CONFIG.maxSpeed);
    gameTime += dt;

    // 距离
    distancePx += gameSpeed * dt;
    distanceM = Math.floor(distancePx / 40); // 40px ≈ 1m
    document.getElementById('dist-display').textContent = distanceM + ' m';

    // 背景图片滚动（与地面同速）
    groundOffset -= gameSpeed * dt;
    for (const layer of bgLayers) layer.offset += gameSpeed * dt;

    // 障碍物
    updateObstacles(dt, W, gameSpeed * CONFIG.parallaxGround);

    // 角色
    player.update(dt);
    updateDust(dt);

    // 碰撞
    if (checkCollision()) {
      triggerDeath();
    }

    drawObstacles();
    drawDust();
  } else if (gameState === 'home') {
    // 首页：背景和地面完全静止，只有角色待机动画
    player.state = 'idle';
    player.onGround = true;
    player.y = CONFIG.groundY - CONFIG.charH;
    player.update(dt); // 推进 idle 帧动画
  } else {
    // 死亡：完全冻结
  }

  // 角色始终绘制
  player.draw(ctx, player.x, player.y);

  rafId = requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────
//  首页 Idle 动画（主 canvas 统一渲染）
//  idle 状态的动画帧推进由 gameLoop 统一管理
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  游戏控制函数
// ─────────────────────────────────────────────
function startGame() {
  gameState   = 'playing';
  gameSpeed   = CONFIG.initSpeed;
  distancePx  = 0;
  distanceM   = 0;
  gameTime    = 0;
  obstacles   = [];
  nextObstacleIn = 1200;
  groundOffset = 0;
  for (const layer of bgLayers) layer.offset = 0;
  dustParticles.length = 0;

  player.reset();
  showScreen('screen-game');

  // 播放背景音乐
  bgm.currentTime = 0;
  if (musicEnabled) bgm.play();

  if (!rafId) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  }
}

function triggerDeath() {
  if (gameState === 'dead') return;
  gameState = 'dead';
  player.setState('dead');
  bgm.pause();
  sfxDeath.currentTime = 0;
  sfxDeath.play();

  // 检查并解锁成就
  checkAchievements(distanceM);

  // 更新最高记录
  if (distanceM > bestDist) {
    bestDist = distanceM;
    localStorage.setItem('bestDist', bestDist);
    document.getElementById('best-dist').textContent = bestDist;
  }

  // 延迟显示 GameOver（等死亡动画）
  setTimeout(() => {
    document.getElementById('final-dist').textContent = distanceM + ' m';
    document.getElementById('gameover-best-dist').textContent = bestDist + ' m';
    showScreen('screen-gameover');
  }, 900);
}

function goHome() {
  gameState = 'home';
  obstacles = [];
  dustParticles.length = 0;
  bgm.pause();

  // 重置角色为站立待机状态
  player.state = 'idle';
  player.onGround = true;
  player.y = CONFIG.groundY - CONFIG.charH;
  player.frame = 0;
  player.frameTimer = 0;
  player.vy = 0;

  showScreen('screen-home');
  document.getElementById('best-dist').textContent = bestDist;
}

// ─────────────────────────────────────────────
//  输入处理
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'playing') player.jump();
    if (gameState === 'home') startGame();
  }
  // ESC 关闭画廊/全屏卡片
  if (e.code === 'Escape') {
    if (document.getElementById('screen-card-full').classList.contains('active')) {
      closeCardFull();
    } else if (document.getElementById('screen-gallery').classList.contains('active')) {
      closeGallery();
    }
  }
});

// 触屏支持
document.getElementById('game-canvas').addEventListener('touchstart', e => {
  e.preventDefault();
  if (gameState === 'playing') player.jump();
}, { passive: false });
document.getElementById('game-canvas').addEventListener('click', () => {
  if (gameState === 'playing') player.jump();
});

// ─────────────────────────────────────────────
//  成就画廊
// ─────────────────────────────────────────────
// 锁图标 SVG
const LOCK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</svg>`;

function openGallery() {
  renderGallery();
  showScreen('screen-gallery');
}

function closeGallery() {
  showScreen('screen-home');
}

function openCardFull(ach) {
  const img = document.getElementById('card-full-img');
  img.src = `assets/taro-${ach.id + 1}.webp?v=${Date.now()}`;
  img.alt = ach.name;
  document.getElementById('card-full-name').textContent = ach.name;
  document.getElementById('card-full-dist').textContent = `${ach.dist} m`;
  showScreen('screen-card-full');
}

function closeCardFull() {
  showScreen('screen-gallery');
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  for (const ach of ACHIEVEMENTS) {
    const isUnlocked = unlockedAchs.has(ach.id);

    const card = document.createElement('div');
    card.className = 'achievement-card ' + (isUnlocked ? 'unlocked' : 'locked');

    // 图片区域
    const imgWrap = document.createElement('div');
    imgWrap.className = 'ach-img-wrap';

    if (isUnlocked) {
      const img = document.createElement('img');
      img.className = 'ach-img';
      img.src = `assets/taro-${ach.id + 1}.webp?v=${Date.now()}`;
      img.onerror = () => { img.style.display = 'none'; };
      imgWrap.appendChild(img);
      card.style.cursor = 'pointer';
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'ach-placeholder';
      placeholder.innerHTML = LOCK_SVG;
      imgWrap.appendChild(placeholder);
    }
    card.appendChild(imgWrap);

    // 文字区域
    const info = document.createElement('div');
    info.className = 'ach-info';
    info.innerHTML = `<div class="ach-name">${ach.name}</div><div class="ach-dist">${ach.dist} m</div>`;
    card.appendChild(info);

    // 3D 视差倾斜
    card.addEventListener('mousemove', e => {
      if (!unlockedAchs.has(ach.id)) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `rotateY(${dx * 12}deg) rotateX(${-dy * 8}deg) scale(1.03)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    // 点击全屏展示（仅已解锁）
    if (isUnlocked) {
      card.addEventListener('click', () => openCardFull(ach));
    }

    grid.appendChild(card);
  }
}

// ─────────────────────────────────────────────
//  UI 按钮绑定
// ─────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-home').addEventListener('click', goHome);
document.getElementById('btn-gallery').addEventListener('click', openGallery);
document.getElementById('btn-gallery-close').addEventListener('click', closeGallery);

function toggleMusic() {
  musicEnabled = !musicEnabled;
  document.getElementById('music-label').textContent = musicEnabled ? 'Sound On' : 'Sound Off';
  document.getElementById('music-label-go').textContent = musicEnabled ? 'Sound On' : 'Sound Off';
  const svg = document.getElementById('music-icon-svg');
  const svgGo = document.getElementById('music-icon-svg-go');
  const onSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  const offSvg = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  if (svg) svg.innerHTML = musicEnabled ? onSvg : offSvg;
  if (svgGo) svgGo.innerHTML = musicEnabled ? onSvg : offSvg;
  if (musicEnabled) {
    bgm.play();
  } else {
    bgm.pause();
  }
}

document.getElementById('btn-music').addEventListener('click', toggleMusic);
document.getElementById('btn-music-go').addEventListener('click', toggleMusic);

// 画廊关闭 + ESC 关闭
document.getElementById('btn-gallery-close').addEventListener('click', closeGallery);
document.getElementById('screen-gallery').addEventListener('click', e => {
  if (e.target.id === 'screen-gallery') closeGallery();
});

// 卡片全屏关闭 + ESC 关闭
document.getElementById('btn-card-close').addEventListener('click', closeCardFull);
document.getElementById('screen-card-full').addEventListener('click', e => {
  if (e.target.id === 'screen-card-full') closeCardFull();
});

// ─────────────────────────────────────────────
//  启动主循环（首页背景也需要它）
// ─────────────────────────────────────────────
lastTime = performance.now();
rafId = requestAnimationFrame(gameLoop);
showScreen('screen-home');

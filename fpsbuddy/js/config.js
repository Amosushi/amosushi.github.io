/**
 * FPS Buddy - 全局配置
 */

const Config = {
  // 评价等级标准
  LEVELS: {
    beginner: {
      name: '入门级',
      minAccuracy: 50,
      maxReaction: 300,
      color: '#a4a4a4',
      description: '适合FPS新手，反应速度较慢，瞄准精度一般，需加强基础练习'
    },
    intermediate: {
      name: '进阶级',
      minAccuracy: 70,
      maxReaction: 300,
      minReaction: 250,
      color: '#2ed573',
      description: '具备基础反应能力，瞄准精度较好，可应对简单游戏场景'
    },
    professional: {
      name: '专业级',
      minAccuracy: 85,
      maxReaction: 250,
      minReaction: 200,
      color: '#ffa502',
      description: '反应速度和瞄准精度较强，可应对复杂游戏场景，接近电竞入门水平'
    },
    master: {
      name: '大师级',
      minAccuracy: 90,
      maxReaction: 200,
      color: '#ff4757',
      description: '反应速度极快，瞄准精度极高，具备电竞级反应能力'
    }
  },

  // 敌人样式配置
  ENEMY_STYLES: {
    humanoid: {
      name: '人形靶',
      size: 50,
      color: '#ff4757',
      borderColor: '#ff6b7a'
    },
    simple: {
      name: '简化人形',
      size: 45,
      color: '#ffa502',
      borderColor: '#ffb732'
    },
    silhouette: {
      name: '游戏剪影',
      size: 55,
      color: '#2ed573',
      borderColor: '#5ae092'
    }
  },

  // 准星样式
  CROSSHAIR_STYLES: {
    circle: {
      name: '圆形',
      render: (ctx, x, y, size, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    cross: {
      name: '十字',
      render: (ctx, x, y, size, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // 横线
        ctx.moveTo(x - size / 2, y);
        ctx.lineTo(x + size / 2, y);
        // 竖线
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x, y + size / 2);
        ctx.stroke();
      }
    },
    dot: {
      name: '点',
      render: (ctx, x, y, size, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    crossDot: {
      name: '十字+点',
      render: (ctx, x, y, size, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // 横线（中间断开留出点的位置）
        ctx.moveTo(x - size / 2, y);
        ctx.lineTo(x - 6, y);
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + size / 2, y);
        // 竖线（中间断开留出点的位置）
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x, y - 6);
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + size / 2);
        ctx.stroke();
        // 中心点
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    circleDot: {
      name: '圆形+点',
      render: (ctx, x, y, size, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        // 中心点
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  // 刷新速度配置（毫秒）
  SPAWN_RATES: {
    slow: 1500,
    medium: 1000,
    fast: 600
  },

  // 敌人停留时间
  ENEMY_LIFETIME: {
    slow: 2000,
    medium: 1500,
    fast: 1000
  },

  // 敌人密度配置
  ENEMY_DENSITY: {
    sparse: 1,
    medium: 2,
    dense: 3
  },

  // 练习时长选项（秒）
  DURATION_OPTIONS: [
    { label: '1分钟', value: 60 },
    { label: '3分钟', value: 180 },
    { label: '5分钟', value: 300 }
  ],

  // 挑战关卡配置
  CHALLENGE_LEVELS: [
    { id: 'beginner', name: '入门', target: 20, accuracy: 50, time: 60, reward: '入门强者' },
    { id: 'elementary', name: '初级', target: 25, accuracy: 60, time: 60, reward: '初露锋芒' },
    { id: 'intermediate', name: '中级', target: 30, accuracy: 70, time: 60, reward: '中级射手' },
    { id: 'advanced', name: '高级', target: 35, accuracy: 80, time: 60, reward: '高级猎手' },
    { id: 'master', name: '大师', target: 40, accuracy: 85, time: 60, reward: '大师级反应' }
  ],

  // 背景配置
  BACKGROUNDS: {
    serious: {
      arena: { name: '竞技场', color: '#1a1a2e' },
      dark: { name: '暗色专注', color: '#0d0d0d' },
      dynamic: { name: '动态背景', color: '#1a1a2e', animated: true }
    },
    casual: {
      document: { name: '文档模式', color: '#f5f5f5', textColor: '#333' },
      code: { name: '代码模式', color: '#1e1e1e', textColor: '#d4d4d4' },
      minimal: { name: '简约', color: '#e8e8e8' }
    }
  },

  // 勋章定义
  BADGES: {
    first_practice: {
      name: '首次练习',
      desc: '完成第一次练习',
      image: 'images/medal01.png'
    },
    ten_sessions: {
      name: '十次练习',
      desc: '累计完成10次练习',
      image: 'images/medal02.png'
    },
    speed_demon: {
      name: '速度恶魔',
      desc: '在认真模式下反应时间低于200ms',
      image: 'images/medal03.png'
    },
    sharpshooter: {
      name: '神射手',
      desc: '单次练习命中率超过90%',
      image: 'images/medal04.png'
    },
    master: {
      name: '大师级反应',
      desc: '单次练习平均反应时间低于150ms',
      image: 'images/medal05.png'
    },
    consistent: {
      name: '稳定发挥',
      desc: '连续5次练习命中率超过70%',
      image: 'images/medal06.png'
    },
    speedster: {
      name: '极速玩家',
      desc: '在任意模式下反应时间低于150ms',
      image: 'images/medal07.png'
    }
  }
};

// 导出
window.Config = Config;

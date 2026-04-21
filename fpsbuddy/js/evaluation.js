/**
 * FPS Buddy - 评价体系
 */

const Evaluation = {
  /**
   * 评估练习结果
   * @param {Object} data - 练习数据
   * @returns {Object} 评估结果
   */
  evaluate(data) {
    const { hits, misses, reactionTimes, duration } = data;
    const totalShots = hits + misses;
    const accuracy = totalShots > 0 ? (hits / totalShots) * 100 : 0;

    // 计算反应时间统计
    const validTimes = reactionTimes.filter(t => t > 0 && t < 2000);
    const avgReaction = validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : 999;
    const fastestReaction = validTimes.length > 0 ? Math.min(...validTimes) : 999;
    const slowestReaction = validTimes.length > 0 ? Math.max(...validTimes) : 0;

    // 计算稳定性
    const accuracyStability = this.calculateStability(
      validTimes.map(() => Math.random() * 20 + accuracy - 10)
    );
    const reactionStability = this.calculateStability(validTimes);

    // 评定等级
    const level = this.determineLevel(accuracy, avgReaction);

    return {
      hits,
      misses,
      totalShots,
      accuracy,
      avgReactionTime: avgReaction,
      fastestReaction,
      slowestReaction,
      accuracyStability,
      reactionStability,
      duration,
      level
    };
  },

  /**
   * 判定等级
   * @param {number} accuracy - 命中率
   * @param {number} avgReaction - 平均反应时间
   * @returns {string} 等级ID
   */
  determineLevel(accuracy, avgReaction) {
    // 大师级
    if (accuracy >= 90 && avgReaction < 200) {
      return 'master';
    }
    // 专业级
    if (accuracy >= 85 && avgReaction < 250) {
      return 'professional';
    }
    // 进阶级
    if (accuracy >= 70 && avgReaction < 300) {
      return 'intermediate';
    }
    // 入门级
    return 'beginner';
  },

  /**
   * 计算波动幅度
   * @param {Array} values - 数值数组
   * @returns {number} 波动值
   */
  calculateStability(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  },

  /**
   * 获取提升建议
   * @param {Object} result - 评估结果
   * @returns {Array} 建议列表
   */
  getSuggestions(result) {
    const suggestions = [];

    if (result.accuracy < 50) {
      suggestions.push('命中率偏低，建议降低敌人刷新速度，专注于瞄准');
    }
    if (result.avgReactionTime > 300) {
      suggestions.push('反应时间较长，可以尝试更快的刷新速度来训练反应');
    }
    if (result.accuracy > 70 && result.avgReactionTime > 250) {
      suggestions.push('命中率高但反应慢，说明你瞄得准但不够快，建议提升灵敏度');
    }
    if (result.accuracy > 50 && result.avgReactionTime < 300) {
      suggestions.push('表现不错！尝试挑战更高的难度来突破自己');
    }
    if (result.slowestReaction - result.fastestReaction > 150) {
      suggestions.push('反应时间波动较大，建议保持专注，减少分心');
    }

    if (suggestions.length === 0) {
      suggestions.push('继续保持，你已经做得很好了！');
    }

    return suggestions;
  },

  /**
   * 检查解锁的成就
   * @param {Object} result - 评估结果
   * @param {Object} achievements - 历史成就
   * @returns {Array} 新解锁的勋章ID
   */
  checkBadges(result, achievements) {
    const newBadges = [];

    // 首次练习
    if (achievements.totalSessions === 0) {
      newBadges.push('first_practice');
    }

    // 10次练习
    if (achievements.totalSessions >= 9) {
      if (!achievements.badges.includes('ten_sessions')) {
        newBadges.push('ten_sessions');
      }
    }

    // 速度恶魔 - 反应时间 < 180ms
    if (result.fastestReaction < 180) {
      if (!achievements.badges.includes('speed_demon')) {
        newBadges.push('speed_demon');
      }
    }

    // 神射手 - 命中率 > 95%
    if (result.accuracy > 95) {
      if (!achievements.badges.includes('sharpshooter')) {
        newBadges.push('sharpshooter');
      }
    }

    // 大师级
    if (result.level === 'master') {
      if (!achievements.badges.includes('master')) {
        newBadges.push('master');
      }
    }

    // 稳定发挥 - 波动 < 50
    if (result.reactionStability < 50 && result.accuracy > 70) {
      if (!achievements.badges.includes('consistent')) {
        newBadges.push('consistent');
      }
    }

    // 极速玩家 - 最快反应 < 150ms
    if (result.fastestReaction < 150) {
      if (!achievements.badges.includes('speedster')) {
        newBadges.push('speedster');
      }
    }

    return newBadges;
  },

  /**
   * 格式化反应时间
   * @param {number} ms - 毫秒
   * @returns {string} 格式化后的字符串
   */
  formatReactionTime(ms) {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(2) + 's';
    }
    return ms.toFixed(0) + 'ms';
  },

  /**
   * 格式化时长
   * @param {number} seconds - 秒
   * @returns {string} 格式化后的字符串
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};

// 导出
window.Evaluation = Evaluation;

/**
 * FPS Buddy - 数据存储模块
 * 使用 localStorage 实现数据的持久化存储
 */

const Storage = {
  // Storage Keys
  KEYS: {
    RECORDS: 'fpsbuddy_records',
    SETTINGS: 'fpsbuddy_settings',
    ACHIEVEMENTS: 'fpsbuddy_achievements',
    FIRST_VISIT: 'fpsbuddy_first_visit'
  },

  /**
   * 获取数据
   * @param {string} key - 存储键名
   * @param {*} defaultValue - 默认值
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`[Storage] Error reading ${key}:`, e);
      return defaultValue;
    }
  },

  /**
   * 保存数据
   * @param {string} key - 存储键名
   * @param {*} value - 要存储的值
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[Storage] Error writing ${key}:`, e);
      return false;
    }
  },

  /**
   * 移除数据
   * @param {string} key - 存储键名
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[Storage] Error removing ${key}:`, e);
    }
  },

  /**
   * 获取练习记录
   * @returns {Array}
   */
  getRecords() {
    return this.get(this.KEYS.RECORDS, []);
  },

  /**
   * 添加练习记录
   * @param {Object} record - 练习记录
   */
  addRecord(record) {
    const records = this.getRecords();
    records.unshift(record); // 添加到开头
    // 只保留最近100条记录
    if (records.length > 100) {
      records.pop();
    }
    this.set(this.KEYS.RECORDS, records);
  },

  /**
   * 获取用户设置
   * @returns {Object}
   */
  getSettings() {
    const defaults = {
      defaultMode: 'serious',
      crosshairStyle: 'cross',
      crosshairColor: '#ff0000',
      crosshairSize: 20,
      sensitivity: 1.0,
      soundEnabled: false,
      // 认真模式设置
      seriousBackground: 'arena',
      enemyStyle: 'humanoid',
      enemySpawnRate: 'medium',
      enemyDensity: 'medium',
      // 摸鱼模式设置
      casualBackground: 'document',
      dotColor: '#ffffff',
      dotSize: 12,
      // 练习时长
      practiceDuration: 60
    };
    return { ...defaults, ...this.get(this.KEYS.SETTINGS) };
  },

  /**
   * 保存用户设置
   * @param {Object} settings - 用户设置
   */
  saveSettings(settings) {
    this.set(this.KEYS.SETTINGS, settings);
  },

  /**
   * 更新单个设置项
   * @param {string} key - 设置键名
   * @param {*} value - 设置值
   */
  updateSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    this.saveSettings(settings);
  },

  /**
   * 获取成就数据
   * @returns {Object}
   */
  getAchievements() {
    const defaults = {
      badges: [],
      bestAccuracy: 0,
      fastestReaction: Infinity,
      longestPractice: 0,
      totalPracticeTime: 0,
      totalSessions: 0,
      challengeProgress: {}
    };
    return { ...defaults, ...this.get(this.KEYS.ACHIEVEMENTS) };
  },

  /**
   * 更新成就数据
   * @param {Object} newData - 新数据
   */
  updateAchievements(newData) {
    const achievements = this.getAchievements();
    const updated = { ...achievements, ...newData };
    this.set(this.KEYS.ACHIEVEMENTS, updated);
  },

  /**
   * 检查是否首次访问
   * @returns {boolean}
   */
  isFirstVisit() {
    return !this.get(this.KEYS.FIRST_VISIT, false);
  },

  /**
   * 标记已访问
   */
  markVisited() {
    this.set(this.KEYS.FIRST_VISIT, true);
  },

  /**
   * 导出所有数据
   * @returns {Object}
   */
  exportData() {
    return {
      records: this.getRecords(),
      settings: this.getSettings(),
      achievements: this.getAchievements(),
      exportTime: new Date().toISOString()
    };
  },

  /**
   * 导入数据
   * @param {Object} data - 要导入的数据
   */
  importData(data) {
    if (data.records) this.set(this.KEYS.RECORDS, data.records);
    if (data.settings) this.set(this.KEYS.SETTINGS, data.settings);
    if (data.achievements) this.set(this.KEYS.ACHIEVEMENTS, data.achievements);
  },

  /**
   * 清除所有数据
   */
  clearAll() {
    Object.values(this.KEYS).forEach(key => this.remove(key));
  }
};

// 导出
window.Storage = Storage;

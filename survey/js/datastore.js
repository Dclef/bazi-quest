/**
 * DataStore — HTTP API 数据持久层
 * 通过站点同源 /api 或自定义 API 地址读写问卷数据。
 */

const DataStore = {
  CACHE_KEY: 'bazi_stats_cache',
  CACHE_TTL: 5 * 60 * 1000,
  PENDING_UPLOAD_KEY: 'bazi_pending_upload',
  LOCAL_FALLBACK_KEY: 'bazi_survey_records_fallback',
  DEFAULT_TIMEOUT_MS: 15000,

  _getApiConfig() {
    const runtimeConfig = window.SURVEY_CONFIG || {};
    const apiConfig = runtimeConfig.api || {};
    const baseUrl = String(apiConfig.baseUrl || '').trim();

    return {
      enabled: Boolean(baseUrl),
      baseUrl,
      timeoutMs: Number(apiConfig.timeoutMs) || this.DEFAULT_TIMEOUT_MS
    };
  },

  async _request(pathname, options = {}) {
    const config = this._getApiConfig();
    if (!config.enabled) {
      throw new Error('未配置 API 地址');
    }

    const controller = typeof AbortController === 'function'
      ? new AbortController()
      : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), config.timeoutMs)
      : 0;

    const url = this._joinUrl(config.baseUrl, pathname);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller ? controller.signal : undefined
      });

      const payload = await this._readJsonResponse(response);
      if (!response.ok || (payload && payload.success === false)) {
        throw new Error((payload && payload.message) || `请求失败: ${response.status}`);
      }

      if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data;
      }

      return payload || null;
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  },

  /**
   * 从四柱生成唯一 baziKey
   * 格式: "甲子-乙丑-丙寅-丁卯"
   */
  generateBaziKey(pillars) {
    return [
      pillars.year.pillar,
      pillars.month.pillar,
      pillars.day.pillar,
      pillars.hour.pillar
    ].join('-');
  },

  /**
   * 生成幂等提交 ID，避免补传时重复写入
   */
  createSubmitId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  },

  /**
   * 计算各维度得分
   */
  calcDimScores(answers, questionList = QUESTIONS) {
    const dimKeys = Object.keys(DIMENSIONS);
    const scores = {};
    dimKeys.forEach(dk => {
      const qs = questionList.filter(q => q.dimension === dk);
      if (qs.length === 0) return;

      let total = 0, count = 0;
      qs.forEach(q => {
        if (answers[q.id] !== undefined) {
          total += answers[q.id];
          count++;
        }
      });
      if (count === 0) return;

      const avg = total / count;
      scores[dk] = Math.round(((avg - 1) / 4) * 100);
    });
    return scores;
  },

  /**
   * 保存一条提交记录到 HTTP API
   */
  async save(record) {
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      this._saveToLocal(record);
      this._clearCache();
      console.warn('⚠️ API 未启用，已改为本地存储');
      return record.submitId || '';
    }

    try {
      const payload = {
        submitId: record.submitId || '',
        baziKey: record.baziKey,
        questionIds: record.questionIds || Object.keys(record.answers || {}),
        bazi: this._buildBaziPayload(record.bazi),
        answers: record.answers || {},
        dimScores: record.dimScores || {},
        timestamp: this._getTimestampValue(record.timestamp) || Date.now()
      };

      const response = await this._request('/submit', {
        method: 'POST',
        body: payload
      });
      const submitId = response && response.submitId
        ? response.submitId
        : (record.submitId || '');
      console.log('✅ 数据已保存到 HTTP API, ID:', submitId);
      this._clearCache();
      return submitId;
    } catch (err) {
      console.error('❌ HTTP API 保存失败:', err);
      this._saveToLocal(record);
      throw err;
    }
  },

  /**
   * 暂存待上传记录，结果页加载后再补传
   */
  queuePendingUpload(record) {
    try {
      localStorage.setItem(this.PENDING_UPLOAD_KEY, JSON.stringify(record));
    } catch (err) {
      console.warn('待上传记录写入本地失败:', err);
    }
  },

  getPendingUpload() {
    try {
      const raw = localStorage.getItem(this.PENDING_UPLOAD_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clearPendingUpload() {
    localStorage.removeItem(this.PENDING_UPLOAD_KEY);
  },

  /**
   * 在结果页后台补传待上传记录
   */
  async flushPendingUpload() {
    const pending = this.getPendingUpload();
    if (!pending) {
      return { status: 'empty' };
    }

    try {
      const id = await this.save(pending);
      this.clearPendingUpload();
      return { status: 'uploaded', id };
    } catch (err) {
      console.warn('⏳ 后台补传失败，保留待上传记录以便后续重试:', err);
      return { status: 'failed', error: err };
    }
  },

  /**
   * 获取全部记录
   */
  async getAll() {
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return this._sortRecordsByTime(this._getLocalRecords());
    }

    try {
      const response = await this._request('/stats');
      const records = Array.isArray(response && response.records) ? response.records : [];
      return this._sortRecordsByTime(records.map(record => this._normalizeRecord(record)));
    } catch (err) {
      console.error('HTTP API 读取失败:', err);
      return this._sortRecordsByTime(this._getLocalRecords());
    }
  },

  /**
   * 按八字 key 查询同八字记录
   */
  async getByBazi(baziKey) {
    const localRecords = this._getLocalRecords()
      .filter(record => record.baziKey === baziKey);
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return this._sortRecordsByTime(localRecords);
    }

    try {
      const response = await this._request(`/bazi?key=${encodeURIComponent(baziKey)}`);
      const records = Array.isArray(response && response.records) ? response.records : [];
      return this._sortRecordsByTime(records.map(record => this._normalizeRecord(record)));
    } catch (err) {
      console.error('HTTP API 按八字查询失败:', err);
      return this._sortRecordsByTime(localRecords);
    }
  },

  /**
   * 获取全局统计摘要（带缓存）
   */
  async getGlobalStats() {
    // Check cache
    const cached = this._getCache();
    if (cached) return cached;

    try {
      const records = await this.getAll();
      const stats = {
        totalCount: records.length,
        baziGroups: {},
        questionStats: {},
        dimAverages: {},
        updatedAt: Date.now()
      };

      // 按八字分组
      records.forEach(r => {
        if (!stats.baziGroups[r.baziKey]) {
          stats.baziGroups[r.baziKey] = { count: 0, records: [] };
        }
        stats.baziGroups[r.baziKey].count++;
        stats.baziGroups[r.baziKey].records.push(r);
      });

      // 各题统计
      QUESTIONS.forEach(q => {
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
        records.forEach(r => {
          if (r.answers && r.answers[q.id] !== undefined) {
            dist[r.answers[q.id]]++;
            dist.total++;
          }
        });
        stats.questionStats[q.id] = dist;
      });

      // 各维度均分
      const dimKeys = Object.keys(DIMENSIONS);
      dimKeys.forEach(dk => {
        let sum = 0, cnt = 0;
        records.forEach(r => {
          if (r.dimScores && r.dimScores[dk] !== undefined) {
            sum += r.dimScores[dk];
            cnt++;
          }
        });
        stats.dimAverages[dk] = cnt > 0 ? Math.round(sum / cnt) : 0;
      });

      this._setCache(stats);
      return stats;
    } catch (err) {
      console.error('统计计算失败:', err);
      return { totalCount: 0, baziGroups: {}, questionStats: {}, dimAverages: {} };
    }
  },

  /**
   * 获取统计总数 (轻量查询)
   */
  async getTotalCount() {
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return this._getLocalRecords().length;
    }

    try {
      const response = await this._request('/stats');
      if (response && typeof response.totalCount === 'number') {
        return response.totalCount;
      }
      const records = Array.isArray(response && response.records) ? response.records : [];
      return records.length;
    } catch (err) {
      console.warn('HTTP API 统计总数失败，已退回本地统计:', err);
      return this._getLocalRecords().length;
    }
  },

  // ===== Private Helpers =====

  _buildBaziPayload(bazi) {
    const source = bazi && typeof bazi === 'object' ? bazi : {};
    return {
      pillars: this._serializePillars(source.pillars || {}),
      dayMaster: source.dayMaster,
      dayMasterWuXing: source.dayMasterWuXing,
      pattern: source.pattern,
      strength: source.strength,
      gender: source.gender
    };
  },

  _normalizeRecord(record) {
    if (!record || typeof record !== 'object') {
      return {};
    }

    return {
      ...record,
      id: record.id || record.submitId || '',
      submitId: record.submitId || record.id || '',
      timestamp: this._getTimestampValue(record.timestamp) || 0
    };
  },

  _serializePillars(pillars) {
    const result = {};
    ['year', 'month', 'day', 'hour'].forEach(pos => {
      const p = pillars[pos];
      result[pos] = {
        gan: p.gan,
        zhi: p.zhi,
        pillar: p.pillar,
        wuXing: p.wuXing,
        naYin: p.naYin,
        shiShenGan: p.shiShenGan,
        shiShenZhi: p.shiShenZhi || [],
        diShi: p.diShi,
        hideGan: (p.hideGan || []).map ? p.hideGan : [],
        shenSha: p.shenSha || []
      };
    });
    return result;
  },

  _joinUrl(baseUrl, pathname) {
    const normalizedBase = baseUrl.endsWith('/')
      ? baseUrl.slice(0, -1)
      : baseUrl;
    const normalizedPath = pathname.startsWith('/')
      ? pathname
      : `/${pathname}`;
    return `${normalizedBase}${normalizedPath}`;
  },

  async _readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`接口返回的不是合法 JSON: ${text.slice(0, 120)}`);
    }
  },

  _saveToLocal(record) {
    const arr = this._getLocalRecords();
    const next = {
      ...record,
      timestamp: this._getTimestampValue(record.timestamp) || Date.now()
    };
    const idx = record.submitId
      ? arr.findIndex(item => item.submitId && item.submitId === record.submitId)
      : -1;

    if (idx >= 0) {
      arr[idx] = next;
    } else {
      arr.push(next);
    }

    localStorage.setItem(this.LOCAL_FALLBACK_KEY, JSON.stringify(arr));
    console.log('💾 数据已保存到本地 (离线备份)');
  },

  _getLocalRecords() {
    try {
      const raw = localStorage.getItem(this.LOCAL_FALLBACK_KEY);
      const records = raw ? JSON.parse(raw) : [];
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  },

  _getTimestampValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (value && typeof value === 'object') {
      if (typeof value.toMillis === 'function') {
        return value.toMillis();
      }
      if (typeof value.toDate === 'function') {
        return value.toDate().getTime();
      }
    }
    return 0;
  },

  _sortRecordsByTime(records) {
    return (records || []).slice().sort((a, b) => {
      return this._getTimestampValue(b && b.timestamp) - this._getTimestampValue(a && a.timestamp);
    });
  },

  _getCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.updatedAt > this.CACHE_TTL) return null;
      return cached;
    } catch { return null; }
  },

  _setCache(stats) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(stats));
    } catch { /* ignore */ }
  },

  _clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  }
};

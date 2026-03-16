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

      let total = 0;
      let count = 0;
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
   * 默认保持旧行为，直接返回全部记录。
   */
  async getByBazi(baziKey, options = {}) {
    const key = String(baziKey || '').trim();
    if (!key) {
      return [];
    }

    if (options.page || options.pageSize) {
      const pageData = await this.getByBaziPage(
        key,
        options.page || 1,
        options.pageSize || 50
      );
      return options.includeMeta ? pageData : pageData.records;
    }

    const localRecords = this._getLocalRecords()
      .filter(record => record.baziKey === key);
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return this._sortRecordsByTime(localRecords);
    }

    try {
      const response = await this._request(`/bazi?key=${encodeURIComponent(key)}`);
      const records = Array.isArray(response && response.records) ? response.records : [];
      return this._sortRecordsByTime(records.map(record => this._normalizeRecord(record)));
    } catch (err) {
      console.error('HTTP API 按八字查询失败:', err);
      return this._sortRecordsByTime(localRecords);
    }
  },

  /**
   * 按八字 key 分页查询记录
   */
  async getByBaziPage(baziKey, page = 1, pageSize = 50) {
    const key = String(baziKey || '').trim();
    const safePage = this._normalizePositiveInt(page, 1, { max: 1000000 });
    const safePageSize = this._normalizePositiveInt(pageSize, 50, { max: 100 });
    const localPage = this._buildBaziRecordsPageFromRecords(
      this._getLocalRecords(),
      key,
      safePage,
      safePageSize
    );

    if (!key) {
      return localPage;
    }

    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return localPage;
    }

    try {
      const response = await this._request(
        `/bazi?key=${encodeURIComponent(key)}&page=${safePage}&pageSize=${safePageSize}`
      );
      return this._normalizeBaziRecordsPage(response, key, safePage, safePageSize);
    } catch (err) {
      console.error('HTTP API 八字分页查询失败:', err);
      return localPage;
    }
  },

  /**
   * 获取统计摘要
   */
  async getStatsSummary() {
    const localSummary = this._buildStatsSummary(this._getLocalRecords());
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return localSummary;
    }

    try {
      const response = await this._request('/stats/summary');
      return this._normalizeStatsSummary(response);
    } catch (err) {
      console.error('HTTP API 统计摘要失败:', err);
      return localSummary;
    }
  },

  /**
   * 获取八字分组分页列表
   */
  async getBaziGroupPage(page = 1, pageSize = 12) {
    const safePage = this._normalizePositiveInt(page, 1, { max: 1000000 });
    const safePageSize = this._normalizePositiveInt(pageSize, 12, { max: 50 });
    const localPage = this._buildBaziGroupPageFromRecords(
      this._getLocalRecords(),
      safePage,
      safePageSize
    );
    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return localPage;
    }

    try {
      const response = await this._request(
        `/stats/groups?page=${safePage}&pageSize=${safePageSize}`
      );
      return this._normalizeBaziGroupPage(response, safePage, safePageSize);
    } catch (err) {
      console.error('HTTP API 分组分页失败:', err);
      return localPage;
    }
  },

  /**
   * 获取单个八字分组的聚合详情
   */
  async getBaziGroupDetail(baziKey) {
    const key = String(baziKey || '').trim();
    const localDetail = this._buildBaziGroupDetailFromRecords(
      this._getLocalRecords(),
      key
    );
    if (!key) {
      return localDetail;
    }

    const apiConfig = this._getApiConfig();
    if (!apiConfig.enabled) {
      return localDetail;
    }

    try {
      const response = await this._request(
        `/stats/group-detail?key=${encodeURIComponent(key)}`
      );
      return this._normalizeBaziGroupDetail(response, key);
    } catch (err) {
      console.error('HTTP API 分组详情失败:', err);
      return localDetail;
    }
  },

  /**
   * 获取全局统计摘要（带缓存）
   * 结果页仍保留全量记录统计，避免改动现有对比逻辑。
   */
  async getGlobalStats() {
    const cached = this._getCache();
    if (cached) return cached;

    try {
      const records = await this.getAll();
      const summary = this._buildStatsSummary(records);
      const stats = {
        totalCount: summary.totalCount,
        baziGroups: {},
        questionStats: summary.questionStats,
        dimAverages: summary.dimAverages,
        updatedAt: Date.now()
      };

      records.forEach(record => {
        if (!record.baziKey) return;
        if (!stats.baziGroups[record.baziKey]) {
          stats.baziGroups[record.baziKey] = { count: 0, records: [] };
        }
        stats.baziGroups[record.baziKey].count++;
        stats.baziGroups[record.baziKey].records.push(record);
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
      const response = await this._request('/stats/summary');
      return Number(response && response.totalCount) || 0;
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
      baziKey: record.baziKey || '',
      questionIds: Array.isArray(record.questionIds) ? record.questionIds : [],
      bazi: record.bazi && typeof record.bazi === 'object' ? record.bazi : {},
      answers: record.answers && typeof record.answers === 'object' ? record.answers : {},
      dimScores: record.dimScores && typeof record.dimScores === 'object' ? record.dimScores : {},
      timestamp: this._getTimestampValue(record.timestamp) || 0
    };
  },

  _normalizeStatsSummary(summary) {
    const questionStats = summary && typeof summary.questionStats === 'object'
      ? summary.questionStats
      : {};
    const dimAverages = summary && typeof summary.dimAverages === 'object'
      ? summary.dimAverages
      : {};

    return {
      totalCount: Number(summary && summary.totalCount) || 0,
      baziGroupCount: Number(summary && summary.baziGroupCount) || 0,
      questionStats,
      dimAverages,
      overallHit: Number(summary && summary.overallHit) || this._calcOverallHit(questionStats),
      updatedAt: this._getTimestampValue(summary && summary.updatedAt) || Date.now()
    };
  },

  _normalizeBaziGroupPage(payload, fallbackPage, fallbackPageSize) {
    const groups = Array.isArray(payload && payload.groups)
      ? payload.groups.map(group => ({
          baziKey: String(group && group.baziKey || '').trim(),
          count: Number(group && group.count) || 0,
          avgMatchRate: Number(group && group.avgMatchRate) || 0
        }))
      : [];
    const pageSize = Number(payload && payload.pageSize) || fallbackPageSize;
    const totalCount = Number(payload && payload.totalCount) || 0;
    const totalPages = Number(payload && payload.totalPages)
      || (totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0);
    const page = Number(payload && payload.page)
      || (totalPages > 0 ? Math.min(fallbackPage, totalPages) : fallbackPage);

    return {
      page,
      pageSize,
      totalCount,
      totalPages,
      groups,
      updatedAt: this._getTimestampValue(payload && payload.updatedAt) || Date.now()
    };
  },

  _normalizeBaziGroupDetail(payload, baziKey) {
    const key = String(payload && payload.baziKey || baziKey || '').trim();
    const questionStats = payload && typeof payload.questionStats === 'object'
      ? payload.questionStats
      : {};
    const dimAverages = payload && typeof payload.dimAverages === 'object'
      ? payload.dimAverages
      : {};

    return {
      baziKey: key,
      totalCount: Number(payload && payload.totalCount) || 0,
      avgMatchRate: Number(payload && payload.avgMatchRate) || this._calcOverallHit(questionStats),
      questionStats,
      dimAverages,
      updatedAt: this._getTimestampValue(payload && payload.updatedAt) || Date.now()
    };
  },

  _normalizeBaziRecordsPage(payload, baziKey, fallbackPage, fallbackPageSize) {
    const records = Array.isArray(payload && payload.records)
      ? payload.records.map(record => this._normalizeRecord(record))
      : [];
    const totalCount = Number(payload && payload.totalCount) || records.length;
    const pageSize = Number(payload && payload.pageSize) || fallbackPageSize;
    const totalPages = Number(payload && payload.totalPages)
      || (totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0);
    const page = Number(payload && payload.page)
      || (totalPages > 0 ? Math.min(fallbackPage, totalPages) : fallbackPage);

    return {
      baziKey: String(payload && payload.baziKey || baziKey || '').trim(),
      totalCount,
      page,
      pageSize,
      totalPages,
      records
    };
  },

  _buildStatsSummary(records) {
    const normalizedRecords = this._sortRecordsByTime(
      (records || []).map(record => this._normalizeRecord(record))
    );
    const questionStats = this._buildQuestionStats(normalizedRecords);
    const dimAverages = this._buildDimAverages(normalizedRecords);
    const baziKeys = new Set(
      normalizedRecords
        .map(record => record.baziKey)
        .filter(Boolean)
    );

    return {
      totalCount: normalizedRecords.length,
      baziGroupCount: baziKeys.size,
      questionStats,
      dimAverages,
      overallHit: this._calcOverallHit(questionStats),
      updatedAt: Date.now()
    };
  },

  _buildQuestionStats(records) {
    const questionStats = {};

    (records || []).forEach(record => {
      const answers = record && typeof record.answers === 'object' ? record.answers : {};
      Object.entries(answers).forEach(([questionId, rawValue]) => {
        const value = Number(rawValue);
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          return;
        }
        if (!questionStats[questionId]) {
          questionStats[questionId] = this._createEmptyQuestionDistribution();
        }
        questionStats[questionId][value] += 1;
        questionStats[questionId].total += 1;
      });
    });

    return questionStats;
  },

  _buildDimAverages(records) {
    const totals = {};
    const counts = {};

    (records || []).forEach(record => {
      const dimScores = record && typeof record.dimScores === 'object' ? record.dimScores : {};
      Object.entries(dimScores).forEach(([dimKey, rawValue]) => {
        const value = Number(rawValue);
        if (!Number.isFinite(value)) {
          return;
        }
        totals[dimKey] = (totals[dimKey] || 0) + value;
        counts[dimKey] = (counts[dimKey] || 0) + 1;
      });
    });

    const dimAverages = {};
    Object.keys(totals).forEach(dimKey => {
      dimAverages[dimKey] = counts[dimKey] > 0
        ? Math.round(totals[dimKey] / counts[dimKey])
        : 0;
    });

    return dimAverages;
  },

  _calcOverallHit(questionStats) {
    let totalRate = 0;
    let counted = 0;

    Object.values(questionStats || {}).forEach(dist => {
      const total = Number(dist && dist.total) || 0;
      if (total <= 0) {
        return;
      }
      const hitCount = (Number(dist[4]) || 0) + (Number(dist[5]) || 0);
      totalRate += Math.round((hitCount / total) * 100);
      counted++;
    });

    return counted > 0 ? Math.round(totalRate / counted) : 0;
  },

  _buildBaziGroupPageFromRecords(records, page, pageSize) {
    const groups = {};

    this._sortRecordsByTime(records).forEach(record => {
      const normalized = this._normalizeRecord(record);
      if (!normalized.baziKey) return;

      if (!groups[normalized.baziKey]) {
        groups[normalized.baziKey] = {
          baziKey: normalized.baziKey,
          count: 0,
          latestTimestamp: 0,
          records: []
        };
      }

      groups[normalized.baziKey].count++;
      groups[normalized.baziKey].records.push(normalized);
      groups[normalized.baziKey].latestTimestamp = Math.max(
        groups[normalized.baziKey].latestTimestamp,
        this._getTimestampValue(normalized.timestamp)
      );
    });

    const list = Object.values(groups)
      .map(group => {
        const detail = this._buildBaziGroupDetailFromRecords(group.records, group.baziKey);
        return {
          baziKey: group.baziKey,
          count: group.count,
          avgMatchRate: detail.avgMatchRate,
          latestTimestamp: group.latestTimestamp
        };
      })
      .sort((a, b) => b.count - a.count || b.latestTimestamp - a.latestTimestamp);

    const totalCount = list.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const offset = (safePage - 1) * pageSize;

    return {
      page: safePage,
      pageSize,
      totalCount,
      totalPages,
      groups: list.slice(offset, offset + pageSize).map(({ latestTimestamp, ...group }) => group),
      updatedAt: Date.now()
    };
  },

  _buildBaziGroupDetailFromRecords(records, baziKey) {
    const key = String(baziKey || '').trim();
    const matchedRecords = this._sortRecordsByTime(records)
      .map(record => this._normalizeRecord(record))
      .filter(record => record.baziKey === key);
    const summary = this._buildStatsSummary(matchedRecords);

    return {
      baziKey: key,
      totalCount: matchedRecords.length,
      avgMatchRate: summary.overallHit,
      questionStats: summary.questionStats,
      dimAverages: summary.dimAverages,
      updatedAt: Date.now()
    };
  },

  _buildBaziRecordsPageFromRecords(records, baziKey, page, pageSize) {
    const key = String(baziKey || '').trim();
    const matchedRecords = this._sortRecordsByTime(records)
      .map(record => this._normalizeRecord(record))
      .filter(record => record.baziKey === key);
    const totalCount = matchedRecords.length;
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const offset = (safePage - 1) * pageSize;

    return {
      baziKey: key,
      totalCount,
      page: safePage,
      pageSize,
      totalPages,
      records: matchedRecords.slice(offset, offset + pageSize)
    };
  },

  _createEmptyQuestionDistribution() {
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
  },

  _normalizePositiveInt(value, fallback, options = {}) {
    const { min = 1, max = 100 } = options;
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed < min) {
      return fallback;
    }
    return Math.min(parsed, max);
  },

  _serializePillars(pillars) {
    const result = {};
    ['year', 'month', 'day', 'hour'].forEach(pos => {
      const p = pillars[pos] || {};
      result[pos] = {
        gan: p.gan,
        zhi: p.zhi,
        pillar: p.pillar,
        wuXing: p.wuXing,
        naYin: p.naYin,
        shiShenGan: p.shiShenGan,
        shiShenZhi: Array.isArray(p.shiShenZhi) ? p.shiShenZhi : [],
        diShi: p.diShi,
        hideGan: Array.isArray(p.hideGan) ? p.hideGan : [],
        shenSha: Array.isArray(p.shenSha) ? p.shenSha : []
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
      return Array.isArray(records) ? records.map(record => this._normalizeRecord(record)) : [];
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
    } catch {
      return null;
    }
  },

  _setCache(stats) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  },

  _clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  }
};

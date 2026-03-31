/**
 * BirthplaceService
 * 负责出生地搜索、时区标签与中国历史夏令时提示。
 */

const BirthplaceService = {
  getData() {
    const data = window.BAZI_BIRTHPLACE_DATA || {};
    return {
      domesticFlat: Array.isArray(data.domesticFlat) ? data.domesticFlat : [],
      overseasFlat: Array.isArray(data.overseasFlat) ? data.overseasFlat : [],
      chinaDstRules: data.chinaDstRules && typeof data.chinaDstRules === 'object'
        ? data.chinaDstRules
        : {}
    };
  },

  search(query, options = {}) {
    const keyword = this.normalizeKeyword(query);
    if (!keyword) return [];

    const {
      limit = 12,
      includeDomestic = true,
      includeOverseas = true
    } = options;

    const data = this.getData();
    const pool = [
      ...(includeDomestic ? data.domesticFlat : []),
      ...(includeOverseas ? data.overseasFlat : [])
    ];

    return pool
      .map(item => this.scoreItem(item, keyword))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length)
      .slice(0, limit)
      .map(entry => entry.item);
  },

  scoreItem(item, keyword) {
    const haystack = this.normalizeKeyword(item.searchText || item.label || '');
    if (!haystack) return { item, score: 0 };

    if (haystack === keyword) return { item, score: 1000 };
    if (haystack.startsWith(keyword)) return { item, score: 900 };

    const label = this.normalizeKeyword(item.label || '');
    if (label.startsWith(keyword)) return { item, score: 800 };

    const idx = haystack.indexOf(keyword);
    if (idx === -1) return { item, score: 0 };

    return { item, score: Math.max(100, 700 - idx) };
  },

  normalizeKeyword(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[-_]/g, '');
  },

  getByLabel(label) {
    const target = String(label || '').trim();
    if (!target) return null;

    const data = this.getData();
    return [...data.domesticFlat, ...data.overseasFlat].find(item => item.label === target) || null;
  },

  getTimezoneLabel(offsetHours) {
    const offset = Number(offsetHours);
    if (!Number.isFinite(offset)) {
      return '东八区标准时（120°E / 北京时间）';
    }

    const sign = offset >= 0 ? '+' : '-';
    const totalMinutes = Math.round(Math.abs(offset) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const meridian = offset * 15;
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}（中央经线 ${this.formatLongitude(meridian)}）`;
  },

  formatLongitude(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    const direction = num >= 0 ? '东经' : '西经';
    return `${direction}${Math.abs(num).toFixed(2)}`;
  },

  formatLatitude(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    const direction = num >= 0 ? '北纬' : '南纬';
    return `${direction}${Math.abs(num).toFixed(2)}`;
  },

  getChinaDstSuggestion(location, birthDateTime) {
    if (!location || !birthDateTime) {
      return { status: 'unknown', message: '选择出生地和日期后可提示是否处于历史夏令时。' };
    }

    const ruleKey = this.mapChinaRuleKey(location.regionType);
    if (!ruleKey) {
      return { status: 'unknown', message: '当前地区未接入自动夏令时判断，请按出生证或户籍记录手动确认。' };
    }

    const parts = this.parseDateTimeValue(birthDateTime);
    if (!parts) {
      return { status: 'unknown', message: '出生时间格式无效，无法判断历史夏令时。' };
    }

    const data = this.getData();
    const rules = Array.isArray(data.chinaDstRules[ruleKey]) ? data.chinaDstRules[ruleKey] : [];
    if (rules.length === 0) {
      return { status: 'unknown', message: '当前地区没有可用的历史夏令时规则。' };
    }

    const active = rules.some(rule => this.isRuleActive(rule, parts));
    if (active) {
      return {
        status: 'on',
        message: `按 ${ruleKey} 历史规则，这个日期处于夏令时。若填写的是当地钟表时间，建议勾选“夏令时”。`
      };
    }

    return {
      status: 'off',
      message: `按 ${ruleKey} 历史规则，这个日期不在夏令时区间内。`
    };
  },

  mapChinaRuleKey(regionType) {
    if (regionType === 'mainland') return '大陆';
    if (regionType === 'hongkong') return '香港';
    if (regionType === 'macau') return '澳门';
    if (regionType === 'taiwan') return '台湾';
    return '';
  },

  parseDateTimeValue(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) return null;
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5])
    };
  },

  isRuleActive(rule, parts) {
    const text = String(rule || '').trim();
    const match = text.match(/^(\d{4})-(\d{4}|\*)\s+(.+)$/);
    if (!match) return false;

    const startYear = Number(match[1]);
    const endYear = match[2] === '*' ? Number.MAX_SAFE_INTEGER : Number(match[2]);
    if (parts.year < startYear || parts.year > endYear) {
      return false;
    }

    const rangeText = match[3].trim();
    if (rangeText === '*') {
      return true;
    }

    return rangeText.split(',').some(range => this.isDateWithinRange(range.trim(), parts));
  },

  isDateWithinRange(range, parts) {
    if (!range) return false;

    if (range === '*') {
      return true;
    }

    const direct = range.match(/^(\d{1,2})\/(\d{1,2})-(\d{1,2})\/(\d{1,2}|\*)$/);
    if (direct) {
      const start = Number(direct[1]) * 100 + Number(direct[2]);
      if (direct[3] === '*') {
        const current = parts.month * 100 + parts.day;
        return current >= start;
      }

      const end = Number(direct[3]) * 100 + Number(direct[4]);
      const current = parts.month * 100 + parts.day;
      if (start <= end) {
        return current >= start && current <= end;
      }
      return current >= start || current <= end;
    }

    const endOpen = range.match(/^\*-(\d{1,2})\/(\d{1,2})$/);
    if (endOpen) {
      const end = Number(endOpen[1]) * 100 + Number(endOpen[2]);
      const current = parts.month * 100 + parts.day;
      return current <= end;
    }

    return false;
  }
};

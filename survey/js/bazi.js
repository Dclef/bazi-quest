/**
 * 八字排盘模块
 * 封装 lunar-javascript 的 EightChar 相关 API
 * 提供四柱、十神、五行、地势、刑冲合害分析
 */

const BaziCalculator = {
  DEFAULT_TIMEZONE_OFFSET_HOURS: 8,
  DEFAULT_CENTRAL_MERIDIAN: 120,

  /**
   * 根据出生信息计算八字
   * 支持：
   * 1. 旧签名：calculate(year, month, day, hour, minute, gender)
   * 2. 新签名：calculate({ birthDateTime, gender, birthAddress, longitude, latitude, useDaylightSaving, useTrueSolarTime, useZiHourSplit })
   * @returns {Object} 八字信息对象
   */
  calculate(input, month, day, hour, minute, gender) {
    const normalizedInput = this.normalizeInput(input, month, day, hour, minute, gender);
    const timeProfile = this.buildTimeProfile(normalizedInput);
    const calcTime = timeProfile.calculationTime;
    const solar = Solar.fromYmdHms(
      calcTime.year,
      calcTime.month,
      calcTime.day,
      calcTime.hour,
      calcTime.minute,
      0
    );
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    eightChar.setSect(timeProfile.sect);

    const pillars = {
      year: {
        gan: eightChar.getYearGan(),
        zhi: eightChar.getYearZhi(),
        pillar: eightChar.getYear(),
        hideGan: eightChar.getYearHideGan(),
        wuXing: eightChar.getYearWuXing(),
        naYin: eightChar.getYearNaYin(),
        shiShenGan: eightChar.getYearShiShenGan(),
        shiShenZhi: eightChar.getYearShiShenZhi(),
        diShi: eightChar.getYearDiShi(),
        xunKong: eightChar.getYearXunKong()
      },
      month: {
        gan: eightChar.getMonthGan(),
        zhi: eightChar.getMonthZhi(),
        pillar: eightChar.getMonth(),
        hideGan: eightChar.getMonthHideGan(),
        wuXing: eightChar.getMonthWuXing(),
        naYin: eightChar.getMonthNaYin(),
        shiShenGan: eightChar.getMonthShiShenGan(),
        shiShenZhi: eightChar.getMonthShiShenZhi(),
        diShi: eightChar.getMonthDiShi(),
        xunKong: eightChar.getMonthXunKong()
      },
      day: {
        gan: eightChar.getDayGan(),
        zhi: eightChar.getDayZhi(),
        pillar: eightChar.getDay(),
        hideGan: eightChar.getDayHideGan(),
        wuXing: eightChar.getDayWuXing(),
        naYin: eightChar.getDayNaYin(),
        shiShenGan: eightChar.getDayShiShenGan(),
        shiShenZhi: eightChar.getDayShiShenZhi(),
        diShi: eightChar.getDayDiShi(),
        xunKong: eightChar.getDayXunKong()
      },
      hour: {
        gan: eightChar.getTimeGan(),
        zhi: eightChar.getTimeZhi(),
        pillar: eightChar.getTime(),
        hideGan: eightChar.getTimeHideGan(),
        wuXing: eightChar.getTimeWuXing(),
        naYin: eightChar.getTimeNaYin(),
        shiShenGan: eightChar.getTimeShiShenGan(),
        shiShenZhi: eightChar.getTimeShiShenZhi(),
        diShi: eightChar.getTimeDiShi(),
        xunKong: eightChar.getTimeXunKong()
      }
    };

    ['year', 'month', 'day', 'hour'].forEach(pos => {
      try {
        pillars[pos].selfSitting = eightChar.getDiShi(pillars[pos].zhi) || '';
      } catch (error) {
        pillars[pos].selfSitting = '';
      }
      pillars[pos].shenSha = [];
    });

    try {
      pillars.year.shenSha = lunar.getYearPositionShenSha ? lunar.getYearPositionShenSha() : ['太极贵人'];
      pillars.month.shenSha = lunar.getMonthPositionShenSha ? lunar.getMonthPositionShenSha() : ['月德贵人'];
      pillars.day.shenSha = lunar.getDayPositionShenSha ? lunar.getDayPositionShenSha() : ['天乙贵人'];
      pillars.hour.shenSha = lunar.getTimePositionShenSha ? lunar.getTimePositionShenSha() : ['将星'];
    } catch (error) {
      // ignore
    }

    const dayMaster = eightChar.getDayGan();
    const dayMasterWuXing = this.getGanWuXing(dayMaster);
    const shiShenStats = this.countShiShen(pillars);
    const monthZhiMainShiShen = pillars.month.shiShenZhi[0] || '';
    const pattern = this.determinePattern(monthZhiMainShiShen);
    const wuXingStats = this.countWuXing(pillars);
    const zhiList = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.hour.zhi];
    const zhiRelations = this.analyzeZhiRelations(zhiList);
    const ganList = [pillars.year.gan, pillars.month.gan, pillars.day.gan, pillars.hour.gan];
    const ganRelations = this.analyzeGanRelations(ganList);
    const strength = this.judgeStrength(pillars, dayMaster, dayMasterWuXing, wuXingStats, shiShenStats);

    let daYunList = [];
    try {
      const yun = eightChar.getYun(normalizedInput.gender, timeProfile.sect);
      const daYunArr = yun.getDaYun();
      daYunList = daYunArr.map((dy, i) => ({
        index: i,
        startYear: dy.getStartYear(),
        startAge: dy.getStartAge(),
        ganZhi: dy.getGanZhi()
      }));
    } catch (e) {
      console.warn('大运计算出错:', e);
    }

    return {
      solar: { ...calcTime },
      solarInput: { ...timeProfile.civilTime },
      lunar: {
        year: lunar.getYear(),
        month: lunar.getMonth(),
        day: lunar.getDay(),
        yearInGanZhi: lunar.getYearInGanZhiExact(),
        monthInChinese: lunar.getMonthInChinese ? lunar.getMonthInChinese() : '',
        dayInChinese: lunar.getDayInChinese ? lunar.getDayInChinese() : ''
      },
      gender: normalizedInput.gender,
      birthInput: normalizedInput,
      timeProfile,
      pillars,
      dayMaster,
      dayMasterWuXing,
      shiShenStats,
      pattern,
      wuXingStats,
      zhiRelations,
      ganRelations,
      strength,
      daYun: daYunList
    };
  },

  normalizeInput(input, month, day, hour, minute, gender) {
    if (typeof input === 'number') {
      return {
        civilTime: {
          year: input,
          month,
          day,
          hour,
          minute: Number.isFinite(minute) ? minute : 0
        },
        gender: Number(gender),
        birthAddress: '',
        longitude: null,
        latitude: null,
        useDaylightSaving: false,
        useTrueSolarTime: false,
        useZiHourSplit: false,
        timezoneOffsetHours: this.DEFAULT_TIMEZONE_OFFSET_HOURS,
        locationSource: 'unknown'
      };
    }

    const payload = input && typeof input === 'object' ? input : {};
    return {
      civilTime: payload.civilTime || null,
      birthDateTime: String(payload.birthDateTime || '').trim(),
      gender: Number(payload.gender),
      birthAddress: String(payload.birthAddress || '').trim(),
      longitude: this._normalizeCoordinate(payload.longitude, -180, 180),
      latitude: this._normalizeCoordinate(payload.latitude, -90, 90),
      useDaylightSaving: Boolean(payload.useDaylightSaving),
      useTrueSolarTime: Boolean(payload.useTrueSolarTime),
      useZiHourSplit: Boolean(payload.useZiHourSplit),
      timezoneOffsetHours: Number.isFinite(Number(payload.timezoneOffsetHours))
        ? Number(payload.timezoneOffsetHours)
        : this.DEFAULT_TIMEZONE_OFFSET_HOURS,
      locationSource: String(payload.locationSource || '').trim() || 'unknown'
    };
  },

  buildTimeProfile(input) {
    const civilTime = input.civilTime || this._parseDateTimeInput(input.birthDateTime);
    if (!civilTime) {
      throw new Error('请填写完整且有效的出生时间。');
    }

    const currentYear = new Date().getFullYear();
    if (civilTime.year < 1900 || civilTime.year > currentYear) {
      throw new Error(`出生年份超出范围：1900-${currentYear}。`);
    }

    const civilDate = this._partsToUtcDate(civilTime);
    const daylightSavingMinutes = input.useDaylightSaving ? -60 : 0;
    const standardDate = this._shiftUtcDateByMinutes(civilDate, daylightSavingMinutes);
    const standardTime = this._utcDateToParts(standardDate);

    const timezoneOffsetHours = Number.isFinite(input.timezoneOffsetHours)
      ? input.timezoneOffsetHours
      : this.DEFAULT_TIMEZONE_OFFSET_HOURS;
    const timezoneMeridian = timezoneOffsetHours * 15;

    let longitudeCorrectionMinutes = 0;
    let equationOfTimeMinutes = 0;
    let trueSolarCorrectionMinutes = 0;
    let calculationDate = standardDate;

    if (input.useTrueSolarTime) {
      if (!Number.isFinite(input.longitude)) {
        throw new Error('启用真太阳时时，请填写经度或输入可匹配到坐标的出生地址。');
      }

      longitudeCorrectionMinutes = (input.longitude - timezoneMeridian) * 4;
      equationOfTimeMinutes = this._calculateEquationOfTimeMinutes(standardTime);
      trueSolarCorrectionMinutes = longitudeCorrectionMinutes + equationOfTimeMinutes;
      calculationDate = this._shiftUtcDateByMinutes(standardDate, trueSolarCorrectionMinutes);
    }

    const calculationTime = this._utcDateToParts(calculationDate);
    const location = {
      address: input.birthAddress || '',
      longitude: Number.isFinite(input.longitude) ? input.longitude : null,
      latitude: Number.isFinite(input.latitude) ? input.latitude : null,
      source: input.locationSource || (Number.isFinite(input.longitude) ? 'manual' : 'unknown')
    };

    return {
      civilTime,
      standardTime,
      trueSolarTime: input.useTrueSolarTime ? calculationTime : null,
      calculationTime,
      calculationMode: input.useTrueSolarTime ? 'trueSolar' : 'standard',
      useDaylightSaving: Boolean(input.useDaylightSaving),
      useTrueSolarTime: Boolean(input.useTrueSolarTime),
      useZiHourSplit: Boolean(input.useZiHourSplit),
      sect: input.useZiHourSplit ? 1 : 2,
      sectLabel: input.useZiHourSplit
        ? '子初换日（23:00-23:59 按次日）'
        : '子正换日（00:00 后换日）',
      timezoneOffsetHours,
      timezoneLabel: this._formatTimezoneLabel(timezoneOffsetHours),
      timezoneMeridian,
      location,
      correctionMinutes: {
        daylightSaving: daylightSavingMinutes,
        longitude: input.useTrueSolarTime ? longitudeCorrectionMinutes : 0,
        equationOfTime: input.useTrueSolarTime ? equationOfTimeMinutes : 0,
        trueSolar: input.useTrueSolarTime ? trueSolarCorrectionMinutes : 0,
        total: daylightSavingMinutes + (input.useTrueSolarTime ? trueSolarCorrectionMinutes : 0)
      }
    };
  },

  _parseDateTimeInput(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) return null;

    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5])
    };

    const date = this._partsToUtcDate(parts);
    const normalized = this._utcDateToParts(date);
    const isValid = Object.keys(parts).every(key => parts[key] === normalized[key]);
    return isValid ? parts : null;
  },

  _partsToUtcDate(parts) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0));
  },

  _utcDateToParts(date) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes()
    };
  },

  _shiftUtcDateByMinutes(date, minutes) {
    return new Date(date.getTime() + Math.round(minutes * 60 * 1000));
  },

  _normalizeCoordinate(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < min || num > max) {
      return null;
    }
    return num;
  },

  _formatTimezoneLabel(offsetHours) {
    const sign = offsetHours >= 0 ? '+' : '-';
    const totalMinutes = Math.round(Math.abs(offsetHours) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  },

  _calculateEquationOfTimeMinutes(parts) {
    const start = Date.UTC(parts.year, 0, 0);
    const current = Date.UTC(parts.year, parts.month - 1, parts.day);
    const dayOfYear = Math.floor((current - start) / 86400000);
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + ((parts.hour - 12) / 24) + (parts.minute / 1440));

    return 229.18 * (
      0.000075
      + 0.001868 * Math.cos(gamma)
      - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma)
      - 0.040849 * Math.sin(2 * gamma)
    );
  },

  /**
   * 分析天干关系 (五合, 相冲)
   * 返回格式: { name: '甲己合', type: '五合', indices: [0, 1] }
   */
  analyzeGanRelations(ganList) {
    const result = { 五合: [], 相冲: [] };
    const hePairs = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']];
    const chongPairs = [['甲','庚'],['乙','辛'],['丙','壬'],['丁','癸']];

    for (let i = 0; i < ganList.length; i++) {
      for (let j = i + 1; j < ganList.length; j++) {
        const pair = [ganList[i], ganList[j]].sort();
        hePairs.forEach(hp => {
          if (pair[0] === hp[0] && pair[1] === hp[1] || pair[0] === hp[1] && pair[1] === hp[0]) {
             result['五合'].push({ name: `${ganList[i]}${ganList[j]}合`, type: '合', indices: [i, j] });
          }
        });
        chongPairs.forEach(cp => {
          if (pair[0] === cp[0] && pair[1] === cp[1] || pair[0] === cp[1] && pair[1] === cp[0]) {
             result['相冲'].push({ name: `${ganList[i]}${ganList[j]}冲`, type: '冲', indices: [i, j] });
          }
        });
      }
    }
    return result;
  },

  /**
   * 天干对应五行
   */
  getGanWuXing(gan) {
    const map = {
      '甲': '木', '乙': '木',
      '丙': '火', '丁': '火',
      '戊': '土', '己': '土',
      '庚': '金', '辛': '金',
      '壬': '水', '癸': '水'
    };
    return map[gan] || '';
  },

  /**
   * 统计十神出现次数
   */
  countShiShen(pillars) {
    const stats = {};
    const allShiShen = [];

    ['year', 'month', 'day', 'hour'].forEach(pos => {
      const p = pillars[pos];
      if (p.shiShenGan && p.shiShenGan !== '日主') {
        allShiShen.push({ name: p.shiShenGan, position: pos, type: 'gan' });
      }
      if (p.shiShenZhi) {
        p.shiShenZhi.forEach((ss, i) => {
          allShiShen.push({ name: ss, position: pos, type: 'zhi', rank: i });
        });
      }
    });

    allShiShen.forEach(ss => {
      if (!stats[ss.name]) {
        stats[ss.name] = { count: 0, positions: [] };
      }
      stats[ss.name].count++;
      stats[ss.name].positions.push(ss.position);
    });

    return stats;
  },

  /**
   * 统计五行
   */
  countWuXing(pillars) {
    const stats = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    ['year', 'month', 'day', 'hour'].forEach(pos => {
      const wx = pillars[pos].wuXing;
      if (wx && wx.length >= 2) {
        const ganWx = wx[0];
        const zhiWx = wx[1];
        if (stats[ganWx] !== undefined) stats[ganWx]++;
        if (stats[zhiWx] !== undefined) stats[zhiWx]++;
      }
    });
    return stats;
  },

  /**
   * 根据月令十神判定格局
   */
  determinePattern(monthMainShiShen) {
    const patternMap = {
      '正官': '正官格', '七杀': '七杀格',
      '正印': '正印格', '偏印': '偏印格',
      '正财': '正财格', '偏财': '偏财格',
      '食神': '食神格', '伤官': '伤官格',
      '比肩': '建禄格', '劫财': '月劫格'
    };
    return patternMap[monthMainShiShen] || '未定';
  },

  /**
   * 分析地支刑冲合害关系
   * 返回格式: { 六冲: [{name: '子午冲', type: '冲', indices: [0, 2]}], ... }
   */
  analyzeZhiRelations(zhiList) {
    const result = { 六冲: [], 六合: [], 三合: [], 三刑: [], 六害: [], 三会: [], 暗合: [] };

    // 辅助函数：查找某字在zhiList中的所有索引
    const getIndices = (chars) => {
      let idxs = [];
      chars.forEach(c => {
         zhiList.forEach((z, i) => {
           if (z === c && !idxs.includes(i)) idxs.push(i);
         });
      });
      return idxs.sort((a,b)=>a-b);
    };

    // 六冲
    const chongPairs = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
    for (let i = 0; i < zhiList.length; i++) {
      for (let j = i + 1; j < zhiList.length; j++) {
        const pair = [zhiList[i], zhiList[j]].sort();
        chongPairs.forEach(cp => {
          if (pair[0] === cp[0] && pair[1] === cp[1]) {
            result['六冲'].push({ name: `${zhiList[i]}${zhiList[j]}冲`, type: '冲', indices: [i, j] });
          }
        });
      }
    }

    // 六合
    const hePairs = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
    for (let i = 0; i < zhiList.length; i++) {
      for (let j = i + 1; j < zhiList.length; j++) {
        const pair = [zhiList[i], zhiList[j]].sort();
        hePairs.forEach(hp => {
          const sorted = [...hp].sort();
          if (pair[0] === sorted[0] && pair[1] === sorted[1]) {
            result['六合'].push({ name: `${zhiList[i]}${zhiList[j]}合`, type: '合', indices: [i, j] });
          }
        });
      }
    }

    // 六害
    const haiPairs = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
    for (let i = 0; i < zhiList.length; i++) {
      for (let j = i + 1; j < zhiList.length; j++) {
        const pair = [zhiList[i], zhiList[j]].sort();
        haiPairs.forEach(hp => {
          const sorted = [...hp].sort();
          if (pair[0] === sorted[0] && pair[1] === sorted[1]) {
            result['六害'].push({ name: `${zhiList[i]}${zhiList[j]}害`, type: '害', indices: [i, j] });
          }
        });
      }
    }

    // 暗合 (寅丑, 午亥, 卯申)
    const anhePairs = [['寅','丑'],['午','亥'],['卯','申'],['子','巳']];
    for (let i = 0; i < zhiList.length; i++) {
      for (let j = i + 1; j < zhiList.length; j++) {
        const pair = [zhiList[i], zhiList[j]].sort();
        anhePairs.forEach(ap => {
          const sorted = [...ap].sort();
          if (pair[0] === sorted[0] && pair[1] === sorted[1]) {
            result['暗合'].push({ name: `${zhiList[i]}${zhiList[j]}暗合`, type: '暗合', indices: [i, j] });
          }
        });
      }
    }

    // 三合 (检查是否有三合中的至少两个)
    const sanHe = [
      { members: ['寅','午','戌'], element: '火' },
      { members: ['巳','酉','丑'], element: '金' },
      { members: ['申','子','辰'], element: '水' },
      { members: ['亥','卯','未'], element: '木' }
    ];
    sanHe.forEach(sh => {
      const found = sh.members.filter(m => zhiList.includes(m));
      if (found.length >= 2) {
        const name = `${found.join('')}${found.length === 3 ? '三合' : '半合'}${sh.element}局`;
        const indices = getIndices(found);
        result['三合'].push({ name, type: found.length === 3 ? '三合' : '半合', indices });
      }
    });

    // 三会
    const sanHui = [
      { members: ['亥','子','丑'], element: '水' },
      { members: ['寅','卯','辰'], element: '木' },
      { members: ['巳','午','未'], element: '火' },
      { members: ['申','酉','戌'], element: '金' }
    ];
    sanHui.forEach(sh => {
      const found = sh.members.filter(m => zhiList.includes(m));
      if (found.length >= 3) {
        const indices = getIndices(found);
        result['三会'].push({ name: `${found.join('')}三会${sh.element}局`, type: '三会', indices });
      }
    });

    // 三刑
    const xingGroups = [
      { members: ['寅','巳','申'], name: '无恩之刑' },
      { members: ['丑','戌','未'], name: '恃势之刑' },
      { members: ['子','卯'], name: '无礼之刑' }
    ];
    xingGroups.forEach(xg => {
      const found = xg.members.filter(m => zhiList.includes(m));
      if (found.length >= 2) {
        const extName = xg.name; // user might want to see the name
        result['三刑'].push({ name: `${found.join('')}相刑`, type: '刑', indices: getIndices(found) });
      }
    });
    // 自刑
    const selfXing = ['辰','午','酉','亥'];
    selfXing.forEach(sx => {
      // Find all indices of sx
      let idxs = [];
      zhiList.forEach((z, i) => { if (z === sx) idxs.push(i); });
      if (idxs.length >= 2) {
        // Pairs of self-xing
        for (let i = 0; i < idxs.length; i++) {
          for (let j = i + 1; j < idxs.length; j++) {
             result['三刑'].push({ name: `${sx}${sx}自刑`, type: '刑', indices: [idxs[i], idxs[j]] });
          }
        }
      }
    });

    return result;
  },

  /**
   * 身强身弱简易判断
   * 基于：月令得时、四柱印比数量、地势（长生十二神）
   */
  judgeStrength(pillars, dayMaster, dayMasterWuXing, wuXingStats, shiShenStats) {
    let score = 0;

    // 1. 月令得时判断 (占权重最大)
    const monthZhi = pillars.month.zhi;
    const monthWuXingMap = {
      '寅': '木', '卯': '木',
      '巳': '火', '午': '火',
      '申': '金', '酉': '金',
      '亥': '水', '子': '水',
      '辰': '土', '戌': '土', '丑': '土', '未': '土'
    };
    const monthElement = monthWuXingMap[monthZhi] || '';

    // 生我者 & 同我者 得令
    const shengWo = { '金': '土', '木': '水', '水': '金', '火': '木', '土': '火' };
    if (monthElement === dayMasterWuXing) score += 30; // 同类得令
    else if (monthElement === shengWo[dayMasterWuXing]) score += 20; // 印星得令

    // 2. 天干印比计数
    const printStars = ['正印', '偏印', '比肩', '劫财'];
    printStars.forEach(ps => {
      if (shiShenStats[ps]) {
        score += shiShenStats[ps].count * 8;
      }
    });

    // 3. 克泄耗减分
    const drainStars = ['正官', '七杀', '正财', '偏财', '食神', '伤官'];
    drainStars.forEach(ds => {
      if (shiShenStats[ds]) {
        score -= shiShenStats[ds].count * 6;
      }
    });

    // 4. 日柱地势
    const dayDiShi = pillars.day.diShi;
    const strongDiShi = ['长生', '沐浴', '冠带', '临官', '帝旺'];
    const weakDiShi = ['衰', '病', '死', '墓', '绝'];
    if (strongDiShi.includes(dayDiShi)) score += 15;
    if (weakDiShi.includes(dayDiShi)) score -= 10;

    // 5. 日支自坐分析
    const dayZhiShiShen = pillars.day.shiShenZhi;
    if (dayZhiShiShen) {
      dayZhiShiShen.forEach(ss => {
        if (['比肩', '劫财', '正印', '偏印'].includes(ss)) score += 5;
        if (['正官', '七杀', '正财', '偏财'].includes(ss)) score -= 4;
      });
    }

    let level, description;
    if (score >= 40) { level = '身强'; description = '日主得令得地，印比有力'; }
    else if (score >= 20) { level = '偏强'; description = '日主有一定根基'; }
    else if (score >= -10) { level = '中和'; description = '日主不强不弱'; }
    else if (score >= -30) { level = '偏弱'; description = '日主失令或克泄过多'; }
    else { level = '身弱'; description = '日主无根无气，克泄交加'; }

    return { score, level, description };
  }
};

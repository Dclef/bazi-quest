/**
 * StatsEngine — 统计分析引擎
 * 从数据记录中计算口诀命中率、选项分布、维度对比等
 */

const StatsEngine = {
  HIT_THRESHOLD: 4, // 选 4 或 5 分视为 "符合/命中"

  /**
   * 某题的选项分布（百分比）
   * @returns {{ 1: number, 2: number, 3: number, 4: number, 5: number, total: number }}
   */
  questionDistribution(records, questionId) {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
    records.forEach(r => {
      if (r.answers && r.answers[questionId] !== undefined) {
        dist[r.answers[questionId]]++;
        dist.total++;
      }
    });
    return dist;
  },

  /**
   * 某题的命中率: 选 4/5 分的人占比
   * @returns {{ hitCount: number, total: number, rate: number }}
   */
  formulaHitRate(records, questionId) {
    const dist = this.questionDistribution(records, questionId);
    const hitCount = (dist[4] || 0) + (dist[5] || 0);
    return {
      hitCount,
      total: dist.total,
      rate: dist.total > 0 ? Math.round((hitCount / dist.total) * 100) : 0
    };
  },

  /**
   * 使用预聚合题目统计直接计算命中率
   * @returns {{ hitCount: number, total: number, rate: number }}
   */
  formulaHitRateFromQuestionStats(questionStats, questionId) {
    const dist = questionStats && questionStats[questionId]
      ? questionStats[questionId]
      : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
    const hitCount = (Number(dist[4]) || 0) + (Number(dist[5]) || 0);
    const total = Number(dist.total) || 0;
    return {
      hitCount,
      total,
      rate: total > 0 ? Math.round((hitCount / total) * 100) : 0
    };
  },

  /**
   * 某维度在一组记录中的平均得分 (0-100)
   */
  dimensionAverage(records, dimension) {
    let sum = 0, cnt = 0;
    records.forEach(r => {
      if (r.dimScores && r.dimScores[dimension] !== undefined) {
        sum += r.dimScores[dimension];
        cnt++;
      }
    });
    return cnt > 0 ? Math.round(sum / cnt) : 0;
  },

  /**
   * 全部口诀的平均命中率
   */
  overallMatchRate(records) {
    if (records.length === 0) return 0;
    let totalRate = 0;
    let counted = 0;
    QUESTIONS.forEach(q => {
      const hit = this.formulaHitRate(records, q.id);
       if (hit.total === 0) return;
      totalRate += hit.rate;
      counted++;
    });
    return counted > 0 ? Math.round(totalRate / counted) : 0;
  },

  /**
   * 使用预聚合题目统计计算全部口诀平均命中率
   */
  overallMatchRateFromQuestionStats(questionStats) {
    if (!questionStats || typeof questionStats !== 'object') return 0;
    let totalRate = 0;
    let counted = 0;
    QUESTIONS.forEach(q => {
      const hit = this.formulaHitRateFromQuestionStats(questionStats, q.id);
      if (hit.total === 0) return;
      totalRate += hit.rate;
      counted++;
    });
    return counted > 0 ? Math.round(totalRate / counted) : 0;
  },

  /**
   * 获取所有口诀、按命中率排序
   * @returns {Array<{question, hitRate, hitCount, total}>}
   */
  formulaRanking(records) {
    return QUESTIONS.map(q => {
      const hit = this.formulaHitRate(records, q.id);
      return {
        question: q,
        hitRate: hit.rate,
        hitCount: hit.hitCount,
        total: hit.total
      };
    }).filter(item => item.total > 0)
      .sort((a, b) => b.hitRate - a.hitRate);
  },

  /**
   * 使用预聚合题目统计生成口诀排行
   * @returns {Array<{question, hitRate, hitCount, total}>}
   */
  formulaRankingFromQuestionStats(questionStats) {
    return QUESTIONS.map(q => {
      const hit = this.formulaHitRateFromQuestionStats(questionStats, q.id);
      return {
        question: q,
        hitRate: hit.rate,
        hitCount: hit.hitCount,
        total: hit.total
      };
    }).filter(item => item.total > 0)
      .sort((a, b) => b.hitRate - a.hitRate);
  },

  /**
   * 按八字分组的概要
   */
  baziGroupSummary(records) {
    const groups = {};
    records.forEach(r => {
      if (!r.baziKey) return;
      if (!groups[r.baziKey]) {
        groups[r.baziKey] = {
          baziKey: r.baziKey,
          bazi: r.bazi,
          records: [],
          count: 0
        };
      }
      groups[r.baziKey].records.push(r);
      groups[r.baziKey].count++;
    });

    // 计算每组的平均得分和命中率
    Object.values(groups).forEach(g => {
      g.avgMatchRate = this.overallMatchRate(g.records);
      g.dimAverages = {};
      Object.keys(DIMENSIONS).forEach(dk => {
        g.dimAverages[dk] = this.dimensionAverage(g.records, dk);
      });
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  },

  /**
   * 命中率级别/颜色
   */
  hitRateLevel(rate) {
    if (rate >= 70) return { level: '高', color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' };
    if (rate >= 40) return { level: '中', color: '#f39c12', bg: 'rgba(243,156,18,0.1)' };
    return { level: '低', color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' };
  },

  /**
   * 两条记录之间答案差异对比
   */
  compareAnswers(record1, record2) {
    const diffs = [];
    QUESTIONS.forEach(q => {
      const a1 = record1.answers?.[q.id];
      const a2 = record2.answers?.[q.id];
      if (a1 !== undefined && a2 !== undefined && a1 !== a2) {
        diffs.push({
          question: q,
          answer1: a1,
          answer2: a2,
          diff: Math.abs(a1 - a2)
        });
      }
    });
    return diffs.sort((a, b) => b.diff - a.diff);
  }
};

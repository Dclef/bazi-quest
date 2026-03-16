/**
 * 统计仪表盘页面逻辑
 * 口诀排行 · 八字分组 · 维度分析
 */
(function () {
  'use strict';

  const dimKeys = Object.keys(DIMENSIONS);
  const dimColors = ['#6bb3f0', '#d4af37', '#2ecc71', '#f39c12', '#e74c3c', '#1abc9c', '#9b59b6'];

  // ===== Tab Switching =====
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.stats-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab' + capitalize(tab.dataset.tab)).classList.add('active');
    });
  });

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ===== Search =====
  document.getElementById('btnSearch').addEventListener('click', doSearch);
  document.getElementById('baziSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });

  async function doSearch() {
    const key = document.getElementById('baziSearch').value.trim();
    const resultEl = document.getElementById('searchResult');

    if (!key) {
      resultEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">请输入八字四柱</p>';
      return;
    }

    resultEl.innerHTML = '<p style="color: var(--text-muted);">搜索中...</p>';

    try {
      const records = await DataStore.getByBazi(key);
      if (records.length === 0) {
        resultEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">未找到「${key}」的相关记录</p>`;
        return;
      }

      resultEl.innerHTML = renderBaziGroupDetail(key, records);
    } catch (err) {
      resultEl.innerHTML = '<p style="color: var(--danger);">搜索出错</p>';
    }
  }

  // ===== Load Data =====
  loadStats();

  async function loadStats() {
    try {
      const records = await DataStore.getAll();

      document.getElementById('statsLoading').style.display = 'none';

      if (records.length === 0) {
        document.getElementById('statsEmpty').style.display = 'block';
        return;
      }

      document.getElementById('statsContent').style.display = 'block';

      renderOverview(records);
      renderFormulaRanking(records);
      renderBaziGroups(records);
      renderDimAnalysis(records);
    } catch (err) {
      console.error('加载统计失败:', err);
      document.getElementById('statsLoading').innerHTML =
        '<p style="color: var(--danger);">统计数据加载失败，请刷新页面重试</p>';
    }
  }

  // ===== Overview Cards =====
  function renderOverview(records) {
    const totalCount = records.length;
    const groups = StatsEngine.baziGroupSummary(records);
    const baziCount = groups.length;
    const overallHit = StatsEngine.overallMatchRate(records);

    // Find best and worst formula
    const ranking = StatsEngine.formulaRanking(records);
    const best = ranking[0];
    const worst = ranking[ranking.length - 1];

    document.getElementById('statsOverview').innerHTML = `
      <div class="stats-ov-card">
        <div class="stats-ov-icon">👥</div>
        <div class="stats-ov-value">${totalCount}</div>
        <div class="stats-ov-label">总提交数</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🔮</div>
        <div class="stats-ov-value">${baziCount}</div>
        <div class="stats-ov-label">八字组合</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🎯</div>
        <div class="stats-ov-value">${overallHit}%</div>
        <div class="stats-ov-label">平均命中率</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🏆</div>
        <div class="stats-ov-value">${best ? best.hitRate + '%' : '—'}</div>
        <div class="stats-ov-label">最高命中</div>
      </div>`;
  }

  // ===== Formula Ranking Tab =====
  function renderFormulaRanking(records) {
    const ranking = StatsEngine.formulaRanking(records);
    const table = document.getElementById('formulaTable');

    let html = `
      <div class="ft-header">
        <span class="ft-rank">#</span>
        <span class="ft-formula">口诀</span>
        <span class="ft-dim">维度</span>
        <span class="ft-bar">命中率</span>
        <span class="ft-rate">比例</span>
      </div>`;

    ranking.forEach((item, idx) => {
      const dim = DIMENSIONS[item.question.dimension];
      const level = StatsEngine.hitRateLevel(item.hitRate);

      html += `
        <div class="ft-row">
          <span class="ft-rank">${idx + 1}</span>
          <span class="ft-formula">
            <div class="ft-formula-text">${item.question.formula}</div>
            <div class="ft-question-text">${item.question.text}</div>
            ${item.question.source ? `<div class="ft-question-text">来源：${item.question.source}</div>` : ''}
          </span>
          <span class="ft-dim">
            <span class="ft-dim-badge" style="background: ${dim.color}15; color: ${dim.color};">${dim.icon} ${dim.name}</span>
          </span>
          <span class="ft-bar">
            <div class="hit-rate-bar-wrap">
              <div class="hit-rate-bar" style="width: ${item.hitRate}%; background: ${level.color};"></div>
            </div>
          </span>
          <span class="ft-rate" style="color: ${level.color}; font-weight: 700;">${item.hitRate}%</span>
        </div>`;
    });

    table.innerHTML = html;
  }

  // ===== Bazi Groups Tab =====
  function renderBaziGroups(records) {
    const groups = StatsEngine.baziGroupSummary(records);
    const container = document.getElementById('baziGroups');

    if (groups.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">暂无分组数据</p>';
      return;
    }

    let html = '';
    groups.forEach(group => {
      const bazi = group.bazi;
      const pillarsText = group.baziKey;
      const matchLevel = StatsEngine.hitRateLevel(group.avgMatchRate);

      html += `
        <div class="bazi-group-card">
          <div class="bgc-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="bgc-bazi">
              <span class="bgc-pillars">${pillarsText}</span>
              <span class="bgc-count">${group.count} 人</span>
            </div>
            <div class="bgc-meta">
              <span class="bgc-match" style="color: ${matchLevel.color};">命中率 ${group.avgMatchRate}%</span>
              <span class="bgc-expand-icon">▼</span>
            </div>
          </div>
          <div class="bgc-detail">
            ${renderBaziGroupDetail(group.baziKey, group.records)}
          </div>
        </div>`;
    });

    container.innerHTML = html;
  }

  function renderBaziGroupDetail(baziKey, records) {
    let html = '<div class="bgc-dim-grid">';

    dimKeys.forEach((dk, idx) => {
      const dim = DIMENSIONS[dk];
      const color = dimColors[idx % dimColors.length];
      const avg = StatsEngine.dimensionAverage(records, dk);

      html += `
        <div class="bgc-dim-item">
          <div class="bgc-dim-name">${dim.icon} ${dim.name}</div>
          <div class="bgc-dim-bar">
            <div class="bgc-dim-fill" style="width: ${avg}%; background: ${color};"></div>
          </div>
          <span class="bgc-dim-val">${avg}%</span>
        </div>`;
    });

    html += '</div>';

    // Show individual question hit rates for this group
    html += '<div class="bgc-formulas">';
    html += '<h4 style="font-size: 0.85rem; margin: 16px 0 8px; color: var(--text-secondary);">口诀命中详情</h4>';

    const ranking = StatsEngine.formulaRanking(records);
    ranking.slice(0, 10).forEach(item => {
      const level = StatsEngine.hitRateLevel(item.hitRate);
      html += `
        <div class="bgc-formula-row">
          <span class="bgc-formula-text">${item.question.formula}</span>
          <span class="bgc-formula-rate" style="color: ${level.color};">${item.hitRate}%</span>
        </div>`;
    });

    if (ranking.length > 10) {
      html += `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 0;">…还有 ${ranking.length - 10} 条口诀</div>`;
    }
    html += '</div>';

    return html;
  }

  // ===== Dimension Analysis Tab =====
  function renderDimAnalysis(records) {
    const container = document.getElementById('dimAnalysis');
    let html = '<div class="dim-analysis-grid">';

    dimKeys.forEach((dk, idx) => {
      const dim = DIMENSIONS[dk];
      const color = dimColors[idx % dimColors.length];
      const avg = StatsEngine.dimensionAverage(records, dk);
      const qs = QUESTIONS.filter(q => q.dimension === dk);

      // Per-question stats
      let qHtml = '';
      qs.forEach(q => {
        const hit = StatsEngine.formulaHitRate(records, q.id);
        if (hit.total === 0) return;
        const level = StatsEngine.hitRateLevel(hit.rate);
        qHtml += `
          <div class="da-q-row">
            <div class="da-q-text">${q.text}</div>
            <div class="da-q-formula" style="color: #b8982c;">${q.formula}</div>
            ${q.source ? `<div class="da-q-formula" style="color: var(--text-muted);">来源：${q.source}</div>` : ''}
            <div class="da-q-bar-wrap">
              <div class="hit-rate-bar-wrap" style="flex: 1;">
                <div class="hit-rate-bar" style="width: ${hit.rate}%; background: ${level.color};"></div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: ${level.color}; min-width: 40px; text-align: right;">${hit.rate}%</span>
            </div>
          </div>`;
      });

      if (!qHtml) {
        qHtml = '<div class="da-q-row">暂无统计数据</div>';
      }

      html += `
        <div class="da-card">
          <div class="da-card-header" style="border-left: 4px solid ${color};">
            <div class="da-card-title">${dim.icon} ${dim.name}</div>
            <div class="da-card-avg" style="color: ${color};">均分 ${avg}%</div>
          </div>
          <div class="da-card-questions">${qHtml}</div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }
})();

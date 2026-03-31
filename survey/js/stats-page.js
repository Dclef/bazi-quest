/**
 * 统计仪表盘页面逻辑
 * 口诀排行 · 八字分组分页 · 维度分析
 */
(function () {
  'use strict';

  const dimKeys = Object.keys(DIMENSIONS);
  const dimColors = ['#6bb3f0', '#d4af37', '#2ecc71', '#f39c12', '#e74c3c', '#1abc9c', '#9b59b6'];
  const GROUP_PAGE_SIZE = 12;
  const groupDetailCache = new Map();

  let groupPageRequestToken = 0;

  const groupsContainer = document.getElementById('baziGroups');
  const searchResultEl = document.getElementById('searchResult');

  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.stats-tab-content').forEach(content => content.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab' + capitalize(tab.dataset.tab)).classList.add('active');
    });
  });

  document.getElementById('btnSearch').addEventListener('click', doSearch);
  document.getElementById('baziSearch').addEventListener('keydown', event => {
    if (event.key === 'Enter') doSearch();
  });

  if (groupsContainer) {
    groupsContainer.addEventListener('click', event => {
      const pagerButton = event.target.closest('[data-action="group-page"]');
      if (pagerButton) {
        const page = Number(pagerButton.dataset.page) || 1;
        if (!pagerButton.disabled) {
          loadGroupPage(page);
        }
        return;
      }

      const header = event.target.closest('[data-action="toggle-group"]');
      if (!header) return;

      const card = header.closest('.bazi-group-card');
      const baziKey = header.dataset.baziKey || '';
      if (!card || !baziKey) return;

      toggleGroupCard(card, baziKey);
    });
  }

  loadStats();

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async function doSearch() {
    const key = document.getElementById('baziSearch').value.trim();

    if (!key) {
      searchResultEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">请输入八字四柱</p>';
      return;
    }

    searchResultEl.innerHTML = '<p class="stats-inline-status">搜索中...</p>';

    try {
      const detail = await DataStore.getBaziGroupDetail(key);
      if (detail.totalCount === 0) {
        searchResultEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">未找到「${escapeHtml(key)}」的相关记录</p>`;
        return;
      }

      searchResultEl.innerHTML = renderSearchResult(detail);
    } catch (err) {
      searchResultEl.innerHTML = '<p style="color: var(--danger);">搜索出错</p>';
    }
  }

  async function loadStats() {
    try {
      const [summary, groupPage] = await Promise.all([
        DataStore.getStatsSummary(),
        DataStore.getBaziGroupPage(1, GROUP_PAGE_SIZE)
      ]);

      document.getElementById('statsLoading').style.display = 'none';

      if (summary.totalCount === 0) {
        document.getElementById('statsEmpty').style.display = 'block';
        return;
      }

      document.getElementById('statsContent').style.display = 'block';

      renderOverview(summary);
      renderFormulaRanking(summary.questionStats);
      renderBaziGroupsPage(groupPage);
      renderDimAnalysis(summary.questionStats, summary.dimAverages);
    } catch (err) {
      console.error('加载统计失败:', err);
      document.getElementById('statsLoading').innerHTML =
        '<p style="color: var(--danger);">统计数据加载失败，请刷新页面重试</p>';
    }
  }

  async function loadGroupPage(page) {
    const requestToken = ++groupPageRequestToken;
    groupsContainer.innerHTML = '<div class="stats-inline-status">正在加载当前页分组...</div>';

    try {
      const groupPage = await DataStore.getBaziGroupPage(page, GROUP_PAGE_SIZE);
      if (requestToken !== groupPageRequestToken) {
        return;
      }
      renderBaziGroupsPage(groupPage);
    } catch (err) {
      if (requestToken !== groupPageRequestToken) {
        return;
      }
      console.error('加载分组分页失败:', err);
      groupsContainer.innerHTML = '<p style="color: var(--danger);">分组数据加载失败，请稍后重试</p>';
    }
  }

  async function toggleGroupCard(card, baziKey) {
    const detailEl = card.querySelector('.bgc-detail');
    if (!detailEl) return;

    if (card.classList.contains('expanded')) {
      card.classList.remove('expanded');
      return;
    }

    card.classList.add('expanded');

    if (card.dataset.loaded === 'true') {
      return;
    }

    if (card.dataset.loading === 'true') {
      return;
    }

    const cachedDetail = groupDetailCache.get(baziKey);
    if (cachedDetail) {
      detailEl.innerHTML = renderBaziGroupDetail(cachedDetail);
      card.dataset.loaded = 'true';
      return;
    }

    card.dataset.loading = 'true';
    detailEl.innerHTML = '<div class="bgc-detail-loading">正在加载分组详情...</div>';

    try {
      const detail = await DataStore.getBaziGroupDetail(baziKey);
      groupDetailCache.set(baziKey, detail);
      detailEl.innerHTML = renderBaziGroupDetail(detail);
      card.dataset.loaded = 'true';
    } catch (err) {
      console.error('加载分组详情失败:', err);
      detailEl.innerHTML = '<p style="color: var(--danger);">分组详情加载失败</p>';
    } finally {
      delete card.dataset.loading;
    }
  }

  function renderOverview(summary) {
    const ranking = StatsEngine.formulaRankingFromQuestionStats(summary.questionStats);
    const best = ranking[0];

    document.getElementById('statsOverview').innerHTML = `
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🔮</div>
        <div class="stats-ov-value">${summary.baziGroupCount}</div>
        <div class="stats-ov-label">八字种类</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🎯</div>
        <div class="stats-ov-value">${summary.overallHit}%</div>
        <div class="stats-ov-label">平均命中率</div>
      </div>
      <div class="stats-ov-card">
        <div class="stats-ov-icon">🏆</div>
        <div class="stats-ov-value">${best ? `${best.hitRate}%` : '—'}</div>
        <div class="stats-ov-label">最高命中</div>
      </div>`;
  }

  function renderFormulaRanking(questionStats) {
    const ranking = StatsEngine.formulaRankingFromQuestionStats(questionStats);
    const table = document.getElementById('formulaTable');

    if (ranking.length === 0) {
      table.innerHTML = '<div style="padding: 24px; color: var(--text-muted);">暂无口诀排行数据</div>';
      return;
    }

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
            <div class="ft-formula-text">${escapeHtml(item.question.formula)}</div>
            <div class="ft-question-text">${escapeHtml(item.question.text)}</div>
            ${item.question.source ? `<div class="ft-question-text">来源：${escapeHtml(item.question.source)}</div>` : ''}
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

  function renderBaziGroupsPage(pageData) {
    const groups = Array.isArray(pageData.groups) ? pageData.groups : [];

    if (groups.length === 0) {
      groupsContainer.innerHTML = '<p style="color: var(--text-muted);">暂无分组数据</p>';
      return;
    }

    let html = `
      <div class="stats-list-meta">
        <div class="stats-list-note">这里只展示已覆盖的八字种类；展开卡片后查看该八字的聚合命中情况。</div>
        <div class="stats-list-count">第 ${pageData.page} / ${Math.max(pageData.totalPages, 1)} 页</div>
      </div>`;

    groups.forEach(group => {
      const matchLevel = StatsEngine.hitRateLevel(group.avgMatchRate);
      const safeKey = escapeHtml(group.baziKey);

      html += `
        <div class="bazi-group-card" data-bazi-key="${safeKey}" data-loaded="false">
          <div class="bgc-header" data-action="toggle-group" data-bazi-key="${safeKey}">
            <div class="bgc-bazi">
              <span class="bgc-pillars">${safeKey}</span>
            </div>
            <div class="bgc-meta">
              <span class="bgc-match" style="color: ${matchLevel.color};">命中率 ${group.avgMatchRate}%</span>
              <span class="bgc-expand-icon">▼</span>
            </div>
          </div>
          <div class="bgc-detail">
            <div class="bgc-detail-hint">点击展开后加载该分组的维度均分与口诀命中详情</div>
          </div>
        </div>`;
    });

    html += renderGroupsPager(pageData);
    groupsContainer.innerHTML = html;
  }

  function renderGroupsPager(pageData) {
    const totalPages = Math.max(pageData.totalPages || 0, 1);
    const prevPage = Math.max((pageData.page || 1) - 1, 1);
    const nextPage = Math.min((pageData.page || 1) + 1, totalPages);

    return `
      <div class="stats-pager">
        <div class="stats-pager-info">当前每页 ${pageData.pageSize} 组</div>
        <div class="stats-pager-actions">
          <button
            type="button"
            class="btn btn-secondary stats-pager-btn"
            data-action="group-page"
            data-page="${prevPage}"
            ${(pageData.page || 1) <= 1 ? 'disabled' : ''}
          >上一页</button>
          <button
            type="button"
            class="btn btn-secondary stats-pager-btn"
            data-action="group-page"
            data-page="${nextPage}"
            ${(pageData.page || 1) >= totalPages ? 'disabled' : ''}
          >下一页</button>
        </div>
      </div>`;
  }

  function renderBaziGroupDetail(detail) {
    if (!detail || detail.totalCount === 0) {
      return '<div class="bgc-detail-empty">暂无该分组的统计详情</div>';
    }

    let html = `
      <div class="bgc-detail-summary">
        该八字聚合命中率 ${detail.avgMatchRate}%
      </div>
      <div class="bgc-dim-grid">`;

    dimKeys.forEach((dimKey, idx) => {
      const dim = DIMENSIONS[dimKey];
      const color = dimColors[idx % dimColors.length];
      const avg = Number(detail.dimAverages && detail.dimAverages[dimKey]) || 0;

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

    const ranking = StatsEngine.formulaRankingFromQuestionStats(detail.questionStats);
    html += '<div class="bgc-formulas">';
    html += '<h4 style="font-size: 0.85rem; margin: 16px 0 8px; color: var(--text-secondary);">口诀命中详情</h4>';

    ranking.slice(0, 10).forEach(item => {
      const level = StatsEngine.hitRateLevel(item.hitRate);
      html += `
        <div class="bgc-formula-row">
          <span class="bgc-formula-text">${escapeHtml(item.question.formula)}</span>
          <span class="bgc-formula-rate" style="color: ${level.color};">${item.hitRate}%</span>
        </div>`;
    });

    if (ranking.length === 0) {
      html += '<div class="bgc-detail-empty">暂无可展示的口诀命中数据</div>';
    } else if (ranking.length > 10) {
      html += `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 8px 0;">…还有 ${ranking.length - 10} 条口诀</div>`;
    }

    html += '</div>';
    return html;
  }

  function renderSearchResult(detail) {
    const matchLevel = StatsEngine.hitRateLevel(detail.avgMatchRate);
    const safeKey = escapeHtml(detail.baziKey);

    return `
      <div class="bazi-group-card expanded">
        <div class="bgc-header" style="cursor: default;">
          <div class="bgc-bazi">
            <span class="bgc-pillars">${safeKey}</span>
          </div>
          <div class="bgc-meta">
            <span class="bgc-match" style="color: ${matchLevel.color};">命中率 ${detail.avgMatchRate}%</span>
          </div>
        </div>
        <div class="bgc-detail">
          ${renderBaziGroupDetail(detail)}
        </div>
      </div>`;
  }

  function renderDimAnalysis(questionStats, dimAverages) {
    const container = document.getElementById('dimAnalysis');
    let html = '<div class="dim-analysis-grid">';

    dimKeys.forEach((dimKey, idx) => {
      const dim = DIMENSIONS[dimKey];
      const color = dimColors[idx % dimColors.length];
      const avg = Number(dimAverages && dimAverages[dimKey]) || 0;
      const questions = QUESTIONS.filter(question => question.dimension === dimKey);

      let questionHtml = '';
      questions.forEach(question => {
        const hit = StatsEngine.formulaHitRateFromQuestionStats(questionStats, question.id);
        if (hit.total === 0) return;
        const level = StatsEngine.hitRateLevel(hit.rate);

        questionHtml += `
          <div class="da-q-row">
            <div class="da-q-text">${escapeHtml(question.text)}</div>
            <div class="da-q-formula" style="color: #b8982c;">${escapeHtml(question.formula)}</div>
            ${question.source ? `<div class="da-q-formula" style="color: var(--text-muted);">来源：${escapeHtml(question.source)}</div>` : ''}
            <div class="da-q-bar-wrap">
              <div class="hit-rate-bar-wrap" style="flex: 1;">
                <div class="hit-rate-bar" style="width: ${hit.rate}%; background: ${level.color};"></div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: ${level.color}; min-width: 40px; text-align: right;">${hit.rate}%</span>
            </div>
          </div>`;
      });

      if (!questionHtml) {
        questionHtml = '<div class="da-q-row">暂无统计数据</div>';
      }

      html += `
        <div class="da-card">
          <div class="da-card-header" style="border-left: 4px solid ${color};">
            <div class="da-card-title">${dim.icon} ${dim.name}</div>
            <div class="da-card-avg" style="color: ${color};">均分 ${avg}%</div>
          </div>
          <div class="da-card-questions">${questionHtml}</div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();

/**
 * 结果页逻辑 — 增强版
 * 个人得分 + 社区统计百分比 + 同八字对比 + 口诀命中摘要
 */
(function () {
  'use strict';

  const raw = localStorage.getItem('bazi_survey_data');
  if (!raw) {
    document.getElementById('noData').style.display = 'block';
    return;
  }

  const data = JSON.parse(raw);
  document.getElementById('resultContent').style.display = 'block';

  // ===== Score Calculation =====
  const activeQuestions = Array.isArray(data.questionIds) && data.questionIds.length > 0
    ? QuestionEngine.getQuestionsByIds(data.questionIds)
    : QUESTIONS.filter(q => data.answers[q.id] !== undefined);
  const activeDimKeys = Object.keys(DIMENSIONS).filter(dk => {
    return activeQuestions.some(q => q.dimension === dk);
  });
  const dimScores = data.dimScores && Object.keys(data.dimScores).length > 0
    ? data.dimScores
    : DataStore.calcDimScores(data.answers, activeQuestions);

  const totalValues = Object.values(dimScores);
  const totalScore = totalValues.length > 0
    ? Math.round(totalValues.reduce((a, b) => a + b, 0) / totalValues.length)
    : 0;
  document.getElementById('totalScore').textContent = totalScore;

  // 结果页先渲染，云端上传在后台补传
  window.setTimeout(() => {
    syncPendingSubmission();
  }, 0);

  // ===== Bazi Summary =====
  if (data.bazi && data.bazi.pillars) {
    document.getElementById('resultBazi').innerHTML = BaziRenderer.renderTable(data.bazi);
    
    // Create or update smart diagram container
    let sdContainer = document.getElementById('resultSmartDiagram');
    if (!sdContainer) {
      sdContainer = document.createElement('div');
      sdContainer.id = 'resultSmartDiagram';
      document.getElementById('resultBazi').parentNode.insertBefore(sdContainer, document.getElementById('resultBazi').nextSibling);
    }
    sdContainer.innerHTML = BaziRenderer.renderSmartDiagram(data.bazi);

    document.getElementById('rPattern').textContent = data.bazi.pattern || '—';
    document.getElementById('rDayMaster').textContent = `${data.bazi.dayMaster}${data.bazi.dayMasterWuXing}`;
    document.getElementById('rStrength').textContent = data.bazi.strength
      ? `${data.bazi.strength.level}（${data.bazi.strength.description}）`
      : '—';
  }

  // ===== Radar Chart =====
  drawRadar();

  function drawRadar() {
    const canvas = document.getElementById('radarCanvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 420;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 160;
    const radarDimKeys = activeDimKeys.length > 0 ? activeDimKeys : Object.keys(dimScores);
    const n = radarDimKeys.length;
    if (n === 0) return;

    const angleStep = (Math.PI * 2) / n;

    // Background rings
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 5; ring++) {
      const r = (radius / 5) * ring;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Axis lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '13px "Noto Sans SC"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const lx = cx + (radius + 30) * Math.cos(angle);
      const ly = cy + (radius + 30) * Math.sin(angle);
      const dim = DIMENSIONS[radarDimKeys[i]];
      ctx.fillText(`${dim.icon} ${dim.name}`, lx, ly);
    }

    // Data polygon
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const score = (dimScores[radarDimKeys[i]] || 0) / 100;
      const px = cx + radius * score * Math.cos(angle);
      const py = cy + radius * score * Math.sin(angle);
      points.push({ x: px, y: py });
    }

    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(220, 90%, 56%)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Center score
    ctx.fillStyle = 'hsl(220, 90%, 56%)';
    ctx.font = 'bold 28px "Noto Sans SC"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(totalScore, cx, cy - 8);
    ctx.fillStyle = '#888';
    ctx.font = '12px "Noto Sans SC"';
    ctx.fillText('综合指数', cx, cy + 16);
  }

  // ===== Dimension Cards (with community stats placeholder) =====
  const dimGrid = document.getElementById('dimGrid');
  const dimColors = ['#6bb3f0', '#d4af37', '#2ecc71', '#f39c12', '#e74c3c', '#1abc9c', '#9b59b6'];

  activeDimKeys.forEach((dk, idx) => {
    const dim = DIMENSIONS[dk];
    const score = dimScores[dk];
    const qs = activeQuestions.filter(q => q.dimension === dk);
    const color = dimColors[idx % dimColors.length];

    let formulaHtml = '';
    qs.forEach(q => {
      const ans = data.answers[q.id];
      const ansLabel = ans !== undefined ? `${ans}/5` : '未答';
      formulaHtml += `
        <li style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 0;">
          <div style="display: flex; width: 100%; align-items: flex-start;">
            <span style="flex: 1; margin-right: 12px; line-height: 1.4;">${q.text}</span>
            <span style="color: ${color}; margin-left: auto; flex-shrink: 0; font-weight: bold; background: ${color}15; padding: 2px 8px; border-radius: 12px;">${ansLabel}</span>
          </div>
          <div style="display: flex; width: 100%; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="font-size: 0.75rem; color: #b8982c; background: rgba(212, 175, 55, 0.1); padding: 4px 8px; border-radius: 6px; display: inline-block; border: 1px solid rgba(212, 175, 55, 0.2);">
              <strong style="margin-right: 4px;">🎯 口诀:</strong> ${q.formula}
            </div>
            ${q.source ? `
            <div style="font-size: 0.72rem; color: var(--text-secondary); background: rgba(0, 0, 0, 0.04); padding: 4px 8px; border-radius: 6px;">
              来源: ${q.source}
            </div>` : ''}
            <div class="community-stat-slot" id="cstat_${q.id}" style="font-size: 0.75rem; color: var(--text-muted);">
              <span class="loading-dot">⏳</span>
            </div>
          </div>
        </li>`;
    });

    dimGrid.innerHTML += `
      <div class="dimension-card">
        <div class="dimension-card-header">
          <div class="dimension-name">${dim.icon} ${dim.name}</div>
          <div class="dimension-score">${score}%</div>
        </div>
        <div class="dimension-bar">
          <div class="dimension-bar-fill" style="width: ${score}%; background: linear-gradient(90deg, ${color}88, ${color});"></div>
        </div>
        <ul class="dimension-formulas">${formulaHtml}</ul>
      </div>`;
  });

  // ===== Export =====
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bazi_survey_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ===== Load Community Stats (async) =====
  loadCommunityStats();

  async function syncPendingSubmission() {
    try {
      const result = await DataStore.flushPendingUpload();
      if (result.status === 'uploaded') {
        await loadCommunityStats();
      }
    } catch (err) {
      console.warn('后台同步提交失败:', err);
    }
  }

  async function loadCommunityStats() {
    try {
      const banner = document.getElementById('communityBanner');
      banner.style.display = 'flex';

      // Get global stats
      const stats = await DataStore.getGlobalStats();

      if (stats.totalCount === 0) {
        document.getElementById('communityText').textContent = '暂无社区数据，您是第一位参与者！';
        return;
      }

      // Update banner
      document.getElementById('communityText').textContent =
        `已有 ${stats.totalCount} 人参与测试 · 覆盖 ${Object.keys(stats.baziGroups).length} 种八字组合`;

      const allRecords = Object.values(stats.baziGroups).flatMap(group => group.records || []);
      renderSimilarityPanel(allRecords);

      // Update each question with community percentage
      activeQuestions.forEach(q => {
        const slot = document.getElementById(`cstat_${q.id}`);
        if (!slot) return;

        const qStats = stats.questionStats[q.id];
        if (!qStats || qStats.total === 0) {
          slot.innerHTML = '<span style="color: var(--text-muted);">暂无社区数据</span>';
          return;
        }

        const hitCount = (qStats[4] || 0) + (qStats[5] || 0);
        const hitRate = Math.round((hitCount / qStats.total) * 100);
        const levelInfo = StatsEngine.hitRateLevel(hitRate);

        slot.innerHTML = `
          <span class="community-badge" style="background: ${levelInfo.bg}; color: ${levelInfo.color}; border: 1px solid ${levelInfo.color}30;">
            📊 ${hitRate}% 认为符合 (${qStats.total}人)
          </span>`;
      });

      // Formula Hit Summary Card
      renderFormulaHitSummary(stats);

      // Same Bazi Comparison
      if (data.baziKey) {
        const sameBaziRecords = await DataStore.getByBazi(data.baziKey);
        if (sameBaziRecords.length > 1) {
          renderSameBaziComparison(sameBaziRecords);
        }
      }
    } catch (err) {
      console.error('加载社区数据失败:', err);
      document.getElementById('communityText').textContent = '社区数据加载失败，显示个人结果';
    }
  }

  function renderFormulaHitSummary(stats) {
    const card = document.getElementById('formulaHitCard');
    const grid = document.getElementById('formulaHitGrid');

    // Get top 5 and bottom 5 by hit rate
    const ranking = [];
    QUESTIONS.forEach(q => {
      const qStats = stats.questionStats[q.id];
      if (!qStats || qStats.total === 0) return;
      const hitCount = (qStats[4] || 0) + (qStats[5] || 0);
      const hitRate = Math.round((hitCount / qStats.total) * 100);
      ranking.push({ question: q, hitRate, total: qStats.total });
    });

    if (ranking.length === 0) return;
    ranking.sort((a, b) => b.hitRate - a.hitRate);

    card.style.display = 'block';

    const top5 = ranking.slice(0, 5);
    const bottom5 = ranking.slice(-5).reverse();

    let html = `
      <div class="hit-summary-row">
        <div class="hit-summary-col">
          <h4 style="font-size: 0.9rem; color: #2ecc71; margin-bottom: 12px;">🏆 命中率最高 Top 5</h4>`;
    top5.forEach(item => {
      html += `
          <div class="hit-item">
            <div class="hit-item-text">${item.question.formula}</div>
            <div class="hit-rate-bar-wrap">
              <div class="hit-rate-bar" style="width: ${item.hitRate}%; background: #2ecc71;"></div>
            </div>
            <span class="hit-rate-value" style="color: #2ecc71;">${item.hitRate}%</span>
          </div>`;
    });

    html += `
        </div>
        <div class="hit-summary-col">
          <h4 style="font-size: 0.9rem; color: #e74c3c; margin-bottom: 12px;">⚠️ 命中率最低 Bottom 5</h4>`;
    bottom5.forEach(item => {
      html += `
          <div class="hit-item">
            <div class="hit-item-text">${item.question.formula}</div>
            <div class="hit-rate-bar-wrap">
              <div class="hit-rate-bar" style="width: ${item.hitRate}%; background: #e74c3c;"></div>
            </div>
            <span class="hit-rate-value" style="color: #e74c3c;">${item.hitRate}%</span>
          </div>`;
    });

    html += `</div></div>`;
    grid.innerHTML = html;
  }

  function renderSimilarityPanel(records) {
    const panel = document.getElementById('similarityPanel');
    const intro = document.getElementById('similarityIntro');
    const content = document.getElementById('similarityContent');
    const activeQuestionIds = activeQuestions.map(q => q.id);

    if (!panel || !intro || !content || activeQuestionIds.length === 0 || !Array.isArray(records) || records.length === 0) {
      return;
    }

    const minOverlap = Math.max(4, Math.min(8, Math.ceil(activeQuestionIds.length * 0.25)));
    const comparisons = records
      .map(record => compareAnswerSimilarity(data.answers, record.answers || {}, activeQuestionIds))
      .filter(item => item.overlapCount >= minOverlap)
      .sort((a, b) => b.similarity - a.similarity || b.overlapCount - a.overlapCount);

    if (comparisons.length === 0) return;

    const highCount = comparisons.filter(item => item.similarity >= 80).length;
    const mediumCount = comparisons.filter(item => item.similarity >= 65 && item.similarity < 80).length;
    const best = comparisons[0];
    const highRate = Math.round((highCount / comparisons.length) * 100);

    panel.style.display = 'block';
    intro.textContent = `基于社区中 ${comparisons.length} 份可比较回答计算，需至少重叠 ${minOverlap} 题；统计口径包含你刚提交的这份回答。`;
    content.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 14px; padding: 18px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">高度相似</div>
          <div style="font-size: 2rem; font-weight: 800; color: var(--primary); line-height: 1;">${highCount}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px;">相似度 ≥ 80%</div>
        </div>
        <div style="background: rgba(46, 204, 113, 0.08); border: 1px solid rgba(46, 204, 113, 0.15); border-radius: 14px; padding: 18px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">中度相似</div>
          <div style="font-size: 2rem; font-weight: 800; color: #2ecc71; line-height: 1;">${mediumCount}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px;">相似度 65% - 79%</div>
        </div>
        <div style="background: rgba(243, 156, 18, 0.08); border: 1px solid rgba(243, 156, 18, 0.15); border-radius: 14px; padding: 18px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">最高相似度</div>
          <div style="font-size: 2rem; font-weight: 800; color: #f39c12; line-height: 1;">${best.similarity}%</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px;">基于 ${best.overlapCount} 题重叠回答</div>
        </div>
      </div>
      <div style="margin-top: 16px; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
        社区中约 <strong style="color: var(--primary);">${highRate}%</strong> 的可比较回答，和你的整体答题风格较接近。
      </div>`;
  }

  function compareAnswerSimilarity(baseAnswers, otherAnswers, questionIds) {
    let overlapCount = 0;
    let exactCount = 0;
    let similaritySum = 0;

    questionIds.forEach(questionId => {
      const baseValue = baseAnswers?.[questionId];
      const otherValue = otherAnswers?.[questionId];
      if (baseValue === undefined || otherValue === undefined) return;

      overlapCount++;
      const diff = Math.abs(baseValue - otherValue);
      if (diff === 0) exactCount++;
      similaritySum += (4 - diff) / 4;
    });

    return {
      overlapCount,
      exactCount,
      similarity: overlapCount > 0 ? Math.round((similaritySum / overlapCount) * 100) : 0
    };
  }

  function renderSameBaziComparison(records) {
    const panel = document.getElementById('comparePanel');
    const content = document.getElementById('compareContent');

    panel.style.display = 'block';
    document.getElementById('sameBaziCount').textContent = `${records.length}人`;

    // Show dimension score comparison
    let html = '<div class="compare-grid">';

    activeDimKeys.forEach((dk, idx) => {
      const dim = DIMENSIONS[dk];
      const color = dimColors[idx % dimColors.length];

      // Get all scores for this dimension
      const scores = records
        .filter(r => r.dimScores && r.dimScores[dk] !== undefined)
        .map(r => r.dimScores[dk]);

      if (scores.length === 0) return;

      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const myScore = dimScores[dk];

      html += `
        <div class="compare-dim-card">
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;">${dim.icon} ${dim.name}</div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--text-secondary);">
            <span>你: <strong style="color: ${color};">${myScore}%</strong></span>
            <span>均值: <strong>${avg}%</strong></span>
            <span>范围: ${min}%-${max}%</span>
          </div>
          <div class="compare-bar-wrap" style="margin-top: 8px;">
            <div class="compare-bar-bg"></div>
            <div class="compare-bar-range" style="left: ${min}%; width: ${max - min}%; background: ${color}30;"></div>
            <div class="compare-bar-avg" style="left: ${avg}%;"></div>
            <div class="compare-bar-me" style="left: ${myScore}%; background: ${color};"></div>
          </div>
        </div>`;
    });

    html += '</div>';
    content.innerHTML = html;
  }
})();

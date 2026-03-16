/**
 * 问卷流转逻辑
 */
(function () {
  'use strict';

  // State
  let baziResult = null;
  let answers = {};
  let currentDimIdx = 0;
  let isSubmitting = false;
  let activeQuestions = QUESTIONS.slice();
  let activeDimKeys = Object.keys(DIMENSIONS);

  // DOM
  const stepBirth = document.getElementById('stepBirth');
  const stepBazi = document.getElementById('stepBazi');
  const stepQuestions = document.getElementById('stepQuestions');
  const progressWrap = document.getElementById('progressWrap');

  // ===== Step 1: Birth Info =====
  document.getElementById('btnCalculate').addEventListener('click', () => {
    const year = parseInt(document.getElementById('birthYear').value);
    const month = parseInt(document.getElementById('birthMonth').value);
    const day = parseInt(document.getElementById('birthDay').value);
    const hour = parseInt(document.getElementById('birthHour').value);
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const errEl = document.getElementById('birthError');

    if (!year || !month || !day || isNaN(hour) || !genderEl) {
      errEl.textContent = '请完整填写所有出生信息';
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
      return;
    }
    if (year < 1920 || year > 2025) {
      errEl.textContent = '出生年份超出范围（1920-2025）';
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    try {
      baziResult = BaziCalculator.calculate(year, month, day, hour, 0, parseInt(genderEl.value));
      prepareQuestionSet();
      renderBaziDisplay();
      showStep('bazi');
    } catch (e) {
      errEl.textContent = '排盘计算出错: ' + e.message;
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
    }
  });

  // ===== Step 2: Confirm Bazi =====
  function renderBaziDisplay() {
    document.getElementById('baziDisplay').innerHTML = BaziRenderer.renderTable(baziResult);
    
    // Create or update smart diagram container
    let sdContainer = document.getElementById('baziSmartDiagram');
    if (!sdContainer) {
      sdContainer = document.createElement('div');
      sdContainer.id = 'baziSmartDiagram';
      document.getElementById('baziDisplay').parentNode.insertBefore(sdContainer, document.getElementById('baziDisplay').nextSibling);
    }
    sdContainer.innerHTML = BaziRenderer.renderSmartDiagram(baziResult);

    // Extra info (格局/日主/身强弱 are now in the table, but keep the card below for relations)
    document.getElementById('baziPattern').textContent = baziResult.pattern;
    document.getElementById('baziDayMaster').textContent = `${baziResult.dayMaster}${baziResult.dayMasterWuXing}`;
    document.getElementById('baziStrength').textContent = `${baziResult.strength.level}（${baziResult.strength.description}）`;

    // Relations text
    const relWrap = document.getElementById('baziRelationsWrap');
    const rels = baziResult.zhiRelations;
    const ganRels = baziResult.ganRelations || {};
    const relItems = [];
    Object.keys(rels).forEach(key => {
      if (rels[key].length > 0) {
        // Map objects back to strings
        const names = rels[key].map(r => typeof r === 'string' ? r : r.name);
        relItems.push(`<strong style="color: var(--primary);">${key}：</strong>${names.join('、')}`);
      }
    });
    Object.keys(ganRels).forEach(key => {
      if (ganRels[key].length > 0) {
        const names = ganRels[key].map(r => typeof r === 'string' ? r : r.name);
        relItems.push(`<strong style="color: var(--primary);">${key}：</strong>${names.join('、')}`);
      }
    });
    relWrap.innerHTML = relItems.length > 0
      ? relItems.join('<br>')
      : '<span style="color: var(--text-muted);">无明显刑冲合害</span>';
  }

  document.getElementById('btnBackBirth').addEventListener('click', () => showStep('birth'));
  document.getElementById('btnStartQuiz').addEventListener('click', () => {
    if (!baziResult || activeQuestions.length === 0) {
      const errEl = document.getElementById('birthError');
      errEl.textContent = '当前八字暂无适配题目，请更换样本或补充题库';
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
      return;
    }
    currentDimIdx = 0;
    renderDimension();
    showStep('questions');
    progressWrap.style.display = 'block';
  });

  function prepareQuestionSet() {
    activeQuestions = QuestionEngine.getApplicableQuestions(baziResult);
    activeDimKeys = Object.keys(DIMENSIONS).filter(dk => {
      return activeQuestions.some(q => q.dimension === dk);
    });
    currentDimIdx = 0;
  }

  // ===== Step 3: Questions =====
  function renderDimension() {
    const dimKey = activeDimKeys[currentDimIdx];
    const dim = DIMENSIONS[dimKey];
    const qs = activeQuestions.filter(q => q.dimension === dimKey);
    const container = document.getElementById('questionContainer');

    let html = `<div class="step-title">${dim.icon} ${dim.name}</div>
                <div class="step-desc">第 ${currentDimIdx + 1} / ${activeDimKeys.length} 维度 · 共 ${qs.length} 题</div>
                <div class="step-desc">拿不准时可选“一般 / 不确定 / 不适用”</div>`;

    qs.forEach((q, i) => {
      const answered = answers[q.id] !== undefined;
      html += `
        <div class="question-card ${answered ? 'answered' : ''}" id="qcard_${q.id}">
          <div class="question-header">
            <span class="question-num">${i + 1}</span>
            <div>
              <div class="question-text">${q.text}</div>
            </div>
          </div>
          <div class="likert">
            ${LIKERT_OPTIONS.map(opt => `
              <div class="likert-option">
                <input type="radio" name="${q.id}" id="${q.id}_${opt.value}" value="${opt.value}"
                  ${answers[q.id] === opt.value ? 'checked' : ''}>
                <label for="${q.id}_${opt.value}">${opt.label}</label>
              </div>
            `).join('')}
          </div>
        </div>`;
    });

    container.innerHTML = html;

    // Bind events
    qs.forEach(q => {
      LIKERT_OPTIONS.forEach(opt => {
        const el = document.getElementById(`${q.id}_${opt.value}`);
        if (el) {
          el.addEventListener('change', () => {
            answers[q.id] = parseInt(opt.value, 10);
            document.getElementById(`qcard_${q.id}`).classList.add('answered');
            updateProgress();
          });
        }
      });
    });
    updateProgress();
    updateNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    const totalQ = activeQuestions.length || 1;
    const answered = Object.keys(answers).length;
    const pct = Math.round((answered / totalQ) * 100);
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressDimension').textContent =
      `${DIMENSIONS[activeDimKeys[currentDimIdx]].icon} ${DIMENSIONS[activeDimKeys[currentDimIdx]].name}`;
  }

  function updateNav() {
    const info = document.getElementById('quizNavInfo');
    const dimKey = activeDimKeys[currentDimIdx];
    const dimQs = activeQuestions.filter(q => q.dimension === dimKey);
    const dimAnswered = dimQs.filter(q => answers[q.id] !== undefined).length;
    info.textContent = `已答 ${dimAnswered} / ${dimQs.length}`;

    document.getElementById('btnPrevDim').style.visibility = currentDimIdx === 0 ? 'hidden' : 'visible';

    const nextBtn = document.getElementById('btnNextDim');
    if (currentDimIdx === activeDimKeys.length - 1) {
      nextBtn.textContent = '查看结果 →';
    } else {
      nextBtn.textContent = '下一维度 →';
    }
  }

  document.getElementById('btnPrevDim').addEventListener('click', () => {
    if (isSubmitting) return;
    if (currentDimIdx > 0) {
      currentDimIdx--;
      renderDimension();
    }
  });

  document.getElementById('btnNextDim').addEventListener('click', async () => {
    if (isSubmitting) return;

    // Check if current dimension is fully answered
    const dimKey = activeDimKeys[currentDimIdx];
    const dimQs = activeQuestions.filter(q => q.dimension === dimKey);
    const unanswered = dimQs.filter(q => answers[q.id] === undefined);

    if (unanswered.length > 0) {
      // Highlight unanswered
      unanswered.forEach(q => {
        const card = document.getElementById(`qcard_${q.id}`);
        if (card) {
          card.style.borderColor = 'rgba(231, 76, 60, 0.5)';
          card.style.animation = 'pulse 0.5s ease';
          setTimeout(() => {
            card.style.borderColor = '';
            card.style.animation = '';
          }, 1500);
        }
      });
      // Scroll to first unanswered
      const firstCard = document.getElementById(`qcard_${unanswered[0].id}`);
      if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (currentDimIdx < activeDimKeys.length - 1) {
      currentDimIdx++;
      renderDimension();
    } else {
      // All done → save & go to result
      await saveAndNavigate();
    }
  });

  async function saveAndNavigate() {
    if (isSubmitting) return;
    isSubmitting = true;

    const navInfoEl = document.getElementById('quizNavInfo');
    const prevBtn = document.getElementById('btnPrevDim');
    const nextBtn = document.getElementById('btnNextDim');
    const birthErrorEl = document.getElementById('birthError');

    prevBtn.disabled = true;
    nextBtn.disabled = true;
    navInfoEl.textContent = '正在生成结果...';
    birthErrorEl.textContent = '正在生成结果...';
    birthErrorEl.style.color = 'var(--text-muted)';
    birthErrorEl.style.display = 'block';

    const baziKey = DataStore.generateBaziKey(baziResult.pillars);
    const dimScores = DataStore.calcDimScores(answers, activeQuestions);
    const submitId = DataStore.createSubmitId();

    const data = {
      submitId,
      timestamp: new Date().toISOString(),
      bazi: baziResult,
      baziKey: baziKey,
      questionIds: activeQuestions.map(q => q.id),
      answers: answers,
      dimScores: dimScores
    };
    localStorage.setItem('bazi_survey_data', JSON.stringify(data));
    DataStore.queuePendingUpload({
      submitId,
      baziKey: baziKey,
      bazi: baziResult,
      questionIds: activeQuestions.map(q => q.id),
      answers: answers,
      dimScores: dimScores
    });

    navInfoEl.textContent = '结果已生成，正在跳转...';
    birthErrorEl.textContent = '结果已生成，云端数据将在结果页后台同步';

    window.location.href = 'result.html';
  }

  // ===== Step Control =====
  function showStep(step) {
    stepBirth.classList.remove('active');
    stepBazi.classList.remove('active');
    stepQuestions.classList.remove('active');

    if (step === 'birth') {
      stepBirth.classList.add('active');
      progressWrap.style.display = 'none';
    } else if (step === 'bazi') {
      stepBazi.classList.add('active');
      progressWrap.style.display = 'none';
    } else if (step === 'questions') {
      stepQuestions.classList.add('active');
      progressWrap.style.display = 'block';
    }
  }
})();

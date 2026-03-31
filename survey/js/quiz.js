/**
 * 问卷流程
 */
(function () {
  'use strict';

  let baziResult = null;
  let answers = {};
  let currentDimIdx = 0;
  let isSubmitting = false;
  let activeQuestions = QUESTIONS.slice();
  let activeDimKeys = Object.keys(DIMENSIONS);
  let coordSource = 'unknown';
  let selectedBirthplace = null;
  let searchResults = [];

  const stepBirth = document.getElementById('stepBirth');
  const stepBazi = document.getElementById('stepBazi');
  const stepQuestions = document.getElementById('stepQuestions');
  const progressWrap = document.getElementById('progressWrap');
  const birthDateTimeInput = document.getElementById('birthDateTime');
  const birthAddressInput = document.getElementById('birthAddress');
  const birthLongitudeInput = document.getElementById('birthLongitude');
  const birthLatitudeInput = document.getElementById('birthLatitude');
  const birthAddressHint = document.getElementById('birthAddressHint');
  const birthPreview = document.getElementById('birthPreview');
  const birthAddressSuggest = document.getElementById('birthAddressSuggest');
  const timezoneBaseLabel = document.getElementById('timezoneBaseLabel');
  const timezoneBaseHint = document.getElementById('timezoneBaseHint');

  hydrateLocationDatalist();
  bindBirthFormEvents();

  document.getElementById('btnCalculate').addEventListener('click', () => {
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const errEl = document.getElementById('birthError');

    if (!birthDateTimeInput.value || !genderEl) {
      errEl.textContent = '请完整填写出生时间与性别。';
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
      return;
    }

    try {
      const formState = getBirthFormState();
      baziResult = BaziCalculator.calculate({
        ...formState,
        gender: parseInt(genderEl.value, 10)
      });
      errEl.style.display = 'none';
      prepareQuestionSet();
      renderBaziDisplay();
      showStep('bazi');
    } catch (error) {
      errEl.textContent = '排盘计算出错：' + error.message;
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
    }
  });

  document.getElementById('btnBackBirth').addEventListener('click', () => showStep('birth'));
  document.getElementById('btnStartQuiz').addEventListener('click', () => {
    if (!baziResult || activeQuestions.length === 0) {
      const errEl = document.getElementById('birthError');
      errEl.textContent = '当前八字暂无适配题目，请更换样本或补充题库。';
      errEl.style.color = 'var(--danger)';
      errEl.style.display = 'block';
      return;
    }

    currentDimIdx = 0;
    renderDimension();
    showStep('questions');
    progressWrap.style.display = 'block';
  });

  function hydrateLocationDatalist() {
    const datalist = document.getElementById('locationPresets');
    const data = BirthplaceService.getData();
    const options = [...data.domesticFlat, ...data.overseasFlat]
      .slice(0, 800)
      .map(item => `<option value="${item.label}"></option>`)
      .join('');
    datalist.innerHTML = options;
  }

  function bindBirthFormEvents() {
    [
      birthDateTimeInput,
      birthLongitudeInput,
      birthLatitudeInput,
      document.getElementById('useDaylightSaving'),
      document.getElementById('useTrueSolarTime'),
      document.getElementById('useZiHourSplit')
    ].forEach(el => {
      el.addEventListener('input', handleBirthFormChange);
      el.addEventListener('change', handleBirthFormChange);
    });

    document.querySelectorAll('input[name="gender"]').forEach(el => {
      el.addEventListener('change', handleBirthFormChange);
    });

    birthAddressInput.addEventListener('input', handleAddressInput);
    birthAddressInput.addEventListener('focus', handleAddressInput);
    birthAddressInput.addEventListener('blur', () => {
      window.setTimeout(hideAddressSuggestions, 150);
    });

    birthAddressSuggest.addEventListener('mousedown', event => {
      const option = event.target.closest('[data-birthplace-id]');
      if (!option) return;
      event.preventDefault();
      const item = searchResults.find(entry => entry.id === option.dataset.birthplaceId);
      if (item) {
        applyBirthplace(item);
      }
    });

    document.addEventListener('click', event => {
      if (event.target === birthAddressInput || birthAddressSuggest.contains(event.target)) {
        return;
      }
      hideAddressSuggestions();
    });

    birthLongitudeInput.addEventListener('input', () => {
      coordSource = 'manual';
      handleBirthFormChange();
    });

    birthLatitudeInput.addEventListener('input', () => {
      coordSource = 'manual';
      handleBirthFormChange();
    });

    updateBirthplaceDerivedState();
    renderBirthPreview();
  }

  function handleAddressInput() {
    updateBirthplaceDerivedState();
    renderAddressSuggestions();
    renderBirthPreview();
  }

  function updateBirthplaceDerivedState() {
    const exact = BirthplaceService.getByLabel(birthAddressInput.value.trim());
    if (exact) {
      selectedBirthplace = exact;
      if (coordSource !== 'manual') {
        syncCoordinatesFromSelection(exact);
      }
    } else if (selectedBirthplace && selectedBirthplace.label !== birthAddressInput.value.trim()) {
      selectedBirthplace = null;
      if (coordSource === 'dataset') {
        coordSource = 'unknown';
      }
    }

    updateLocationDerivedInfo();
  }

  function renderAddressSuggestions() {
    const query = birthAddressInput.value.trim();
    if (!query) {
      hideAddressSuggestions();
      return;
    }

    searchResults = BirthplaceService.search(query, { limit: 10 });
    if (searchResults.length === 0) {
      birthAddressSuggest.innerHTML = '<div class="search-suggest-empty">未找到相关地区，可手动填写经纬度。</div>';
      birthAddressSuggest.style.display = 'block';
      return;
    }

    birthAddressSuggest.innerHTML = searchResults.map(item => `
      <button type="button" class="search-suggest-item" data-birthplace-id="${item.id}">
        <span class="search-suggest-main">${item.label}</span>
        <span class="search-suggest-meta">${BirthplaceService.getTimezoneLabel(item.timezoneOffsetHours)}</span>
      </button>
    `).join('');
    birthAddressSuggest.style.display = 'block';
  }

  function hideAddressSuggestions() {
    birthAddressSuggest.style.display = 'none';
  }

  function applyBirthplace(item) {
    selectedBirthplace = item;
    birthAddressInput.value = item.label;
    coordSource = 'dataset';
    syncCoordinatesFromSelection(item);
    updateLocationDerivedInfo();
    hideAddressSuggestions();
    renderBirthPreview();
  }

  function syncCoordinatesFromSelection(item) {
    birthLongitudeInput.value = Number.isFinite(item.longitude) ? Number(item.longitude).toFixed(4) : '';
    birthLatitudeInput.value = Number.isFinite(item.latitude) ? Number(item.latitude).toFixed(4) : '';
  }

  function updateLocationDerivedInfo() {
    const location = selectedBirthplace;
    const timezoneOffsetHours = location && Number.isFinite(location.timezoneOffsetHours)
      ? location.timezoneOffsetHours
      : 8;

    timezoneBaseLabel.textContent = BirthplaceService.getTimezoneLabel(timezoneOffsetHours);

    if (location) {
      const coordText = Number.isFinite(location.latitude)
        ? `${BirthplaceService.formatLongitude(location.longitude)} / ${BirthplaceService.formatLatitude(location.latitude)}`
        : BirthplaceService.formatLongitude(location.longitude);
      birthAddressHint.textContent = `已匹配出生地：${location.label} · 坐标 ${coordText}`;
      timezoneBaseHint.textContent = location.type === 'overseas'
        ? '海外地区按所选城市时区处理；真太阳时仍按经度校正。'
        : '中国地区默认按东八区标准时处理；勾选真太阳时后会再按经度校正。';
    } else if (birthAddressInput.value.trim()) {
      birthAddressHint.textContent = '当前地址未命中出生地库，可继续搜索或手动填写经纬度。';
      timezoneBaseHint.textContent = '未识别到出生地时，默认按东八区标准时处理。';
    } else {
      birthAddressHint.textContent = '支持全国区县、港澳台及常见海外城市搜索；也可以手动填写坐标。';
      timezoneBaseHint.textContent = '当前会根据所选出生地自动带出时区；中国地区默认按东八区标准时处理。';
    }
  }

  function getBirthFormState() {
    const timezoneOffsetHours = selectedBirthplace && Number.isFinite(selectedBirthplace.timezoneOffsetHours)
      ? Number(selectedBirthplace.timezoneOffsetHours)
      : 8;

    return {
      birthDateTime: birthDateTimeInput.value,
      birthAddress: birthAddressInput.value.trim(),
      longitude: birthLongitudeInput.value === '' ? null : Number(birthLongitudeInput.value),
      latitude: birthLatitudeInput.value === '' ? null : Number(birthLatitudeInput.value),
      useDaylightSaving: document.getElementById('useDaylightSaving').checked,
      useTrueSolarTime: document.getElementById('useTrueSolarTime').checked,
      useZiHourSplit: document.getElementById('useZiHourSplit').checked,
      timezoneOffsetHours,
      locationSource: coordSource === 'manual' ? 'manual' : (selectedBirthplace ? 'dataset' : coordSource),
      regionType: selectedBirthplace ? selectedBirthplace.regionType : 'unknown',
      birthplace: selectedBirthplace
    };
  }

  function renderBirthPreview() {
    const birthDateTime = birthDateTimeInput.value;
    if (!birthDateTime) {
      birthPreview.innerHTML = '<div class="birth-preview-empty">填写出生时间后，这里会显示录入时间、标准时、真太阳时和当前排盘口径。</div>';
      return;
    }

    try {
      const formState = getBirthFormState();
      const timeProfile = BaziCalculator.buildTimeProfile(formState);
      const dstSuggestion = BirthplaceService.getChinaDstSuggestion(selectedBirthplace, birthDateTime);
      const hintHtml = BaziRenderer.renderBirthMeta({ timeProfile, dstSuggestion });

      birthPreview.innerHTML = `
        <div class="birth-preview-title">当前排盘口径预览</div>
        <div class="birth-meta-grid">${hintHtml}</div>
      `;
    } catch (error) {
      birthPreview.innerHTML = `
        <div class="birth-preview-title">当前排盘口径预览</div>
        <div class="birth-preview-empty">${error.message}</div>
      `;
    }
  }

  function handleBirthFormChange() {
    updateBirthplaceDerivedState();
    renderBirthPreview();
  }

  function renderBaziDisplay() {
    document.getElementById('baziDisplay').innerHTML = BaziRenderer.renderTable(baziResult);

    let sdContainer = document.getElementById('baziSmartDiagram');
    if (!sdContainer) {
      sdContainer = document.createElement('div');
      sdContainer.id = 'baziSmartDiagram';
      document.getElementById('baziDisplay').parentNode.insertBefore(sdContainer, document.getElementById('baziDisplay').nextSibling);
    }
    sdContainer.innerHTML = BaziRenderer.renderSmartDiagram(baziResult);

    document.getElementById('baziTimeMeta').innerHTML = BaziRenderer.renderBirthMeta(baziResult);
    document.getElementById('baziPattern').textContent = baziResult.pattern;
    document.getElementById('baziDayMaster').textContent = `${baziResult.dayMaster}${baziResult.dayMasterWuXing}`;
    document.getElementById('baziStrength').textContent = `${baziResult.strength.level}（${baziResult.strength.description}）`;

    const relWrap = document.getElementById('baziRelationsWrap');
    const rels = baziResult.zhiRelations;
    const ganRels = baziResult.ganRelations || {};
    const relItems = [];

    Object.keys(rels).forEach(key => {
      if (rels[key].length > 0) {
        const names = rels[key].map(item => typeof item === 'string' ? item : item.name);
        relItems.push(`<strong style="color: var(--primary);">${key}：</strong>${names.join('、')}`);
      }
    });

    Object.keys(ganRels).forEach(key => {
      if (ganRels[key].length > 0) {
        const names = ganRels[key].map(item => typeof item === 'string' ? item : item.name);
        relItems.push(`<strong style="color: var(--primary);">${key}：</strong>${names.join('、')}`);
      }
    });

    relWrap.innerHTML = relItems.length > 0
      ? relItems.join('<br>')
      : '<span style="color: var(--text-muted);">无明显刑冲合害</span>';
  }

  function prepareQuestionSet() {
    activeQuestions = QuestionEngine.getApplicableQuestions(baziResult);
    activeDimKeys = Object.keys(DIMENSIONS).filter(dimKey => {
      return activeQuestions.some(question => question.dimension === dimKey);
    });
    currentDimIdx = 0;
  }

  function renderDimension() {
    const dimKey = activeDimKeys[currentDimIdx];
    const dim = DIMENSIONS[dimKey];
    const qs = activeQuestions.filter(question => question.dimension === dimKey);
    const container = document.getElementById('questionContainer');

    let html = `
      <div class="step-title">${dim.icon} ${dim.name}</div>
      <div class="step-desc">第 ${currentDimIdx + 1} / ${activeDimKeys.length} 维度 · 共 ${qs.length} 题</div>
      <div class="step-desc">拿不准时可选“一般 / 不确定 / 不适用”。</div>
    `;

    qs.forEach((question, index) => {
      const answered = answers[question.id] !== undefined;
      html += `
        <div class="question-card ${answered ? 'answered' : ''}" id="qcard_${question.id}">
          <div class="question-header">
            <span class="question-num">${index + 1}</span>
            <div>
              <div class="question-text">${question.text}</div>
            </div>
          </div>
          <div class="likert">
            ${LIKERT_OPTIONS.map(option => `
              <div class="likert-option">
                <input
                  type="radio"
                  name="${question.id}"
                  id="${question.id}_${option.value}"
                  value="${option.value}"
                  ${answers[question.id] === option.value ? 'checked' : ''}
                >
                <label for="${question.id}_${option.value}">${option.label}</label>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    qs.forEach(question => {
      LIKERT_OPTIONS.forEach(option => {
        const el = document.getElementById(`${question.id}_${option.value}`);
        if (!el) return;
        el.addEventListener('change', () => {
          answers[question.id] = parseInt(option.value, 10);
          document.getElementById(`qcard_${question.id}`).classList.add('answered');
          updateProgress();
        });
      });
    });

    updateProgress();
    updateNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress() {
    const totalQ = activeQuestions.length || 1;
    const answeredCount = Object.keys(answers).length;
    const pct = Math.round((answeredCount / totalQ) * 100);
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressDimension').textContent =
      `${DIMENSIONS[activeDimKeys[currentDimIdx]].icon} ${DIMENSIONS[activeDimKeys[currentDimIdx]].name}`;
  }

  function updateNav() {
    const info = document.getElementById('quizNavInfo');
    const dimKey = activeDimKeys[currentDimIdx];
    const dimQuestions = activeQuestions.filter(question => question.dimension === dimKey);
    const dimAnswered = dimQuestions.filter(question => answers[question.id] !== undefined).length;
    info.textContent = `已答 ${dimAnswered} / ${dimQuestions.length}`;

    document.getElementById('btnPrevDim').style.visibility = currentDimIdx === 0 ? 'hidden' : 'visible';

    const nextBtn = document.getElementById('btnNextDim');
    nextBtn.textContent = currentDimIdx === activeDimKeys.length - 1
      ? '查看结果 →'
      : '下一维度 →';
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

    const dimKey = activeDimKeys[currentDimIdx];
    const dimQuestions = activeQuestions.filter(question => question.dimension === dimKey);
    const unanswered = dimQuestions.filter(question => answers[question.id] === undefined);

    if (unanswered.length > 0) {
      unanswered.forEach(question => {
        const card = document.getElementById(`qcard_${question.id}`);
        if (!card) return;
        card.style.borderColor = 'rgba(231, 76, 60, 0.5)';
        card.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
          card.style.borderColor = '';
          card.style.animation = '';
        }, 1500);
      });

      const firstCard = document.getElementById(`qcard_${unanswered[0].id}`);
      if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (currentDimIdx < activeDimKeys.length - 1) {
      currentDimIdx++;
      renderDimension();
      return;
    }

    await saveAndNavigate();
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
      baziKey,
      questionIds: activeQuestions.map(question => question.id),
      answers,
      dimScores
    };

    localStorage.setItem('bazi_survey_data', JSON.stringify(data));

    DataStore.queuePendingUpload({
      submitId,
      baziKey,
      bazi: baziResult,
      questionIds: activeQuestions.map(question => question.id),
      answers,
      dimScores
    });

    navInfoEl.textContent = '结果已生成，正在跳转...';
    birthErrorEl.textContent = '结果已生成，云端数据会在结果页后台同步。';
    window.location.href = 'result.html';
  }

  function showStep(step) {
    stepBirth.classList.remove('active');
    stepBazi.classList.remove('active');
    stepQuestions.classList.remove('active');

    if (step === 'birth') {
      stepBirth.classList.add('active');
      progressWrap.style.display = 'none';
      return;
    }

    if (step === 'bazi') {
      stepBazi.classList.add('active');
      progressWrap.style.display = 'none';
      return;
    }

    stepQuestions.classList.add('active');
    progressWrap.style.display = 'block';
  }
})();

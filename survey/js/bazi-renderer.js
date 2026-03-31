/**
 * BaziRenderer — 专业八字排盘 UI 渲染器
 */

const BaziRenderer = {
  // 五行配色
  WX_COLORS: {
    '木': { color: '#2d8c2d', icon: '🌳' }, // 绿色
    '火': { color: '#e03f3f', icon: '🔥' }, // 红色
    '土': { color: '#b38b4d', icon: '⛰️' }, // 褐色
    '金': { color: '#d4af37', icon: '💰' }, // 金色
    '水': { color: '#3b82f6', icon: '💧' }  // 蓝色
  },

  // 干分支文字映射
  GAN_WX_NAME: {
    '甲': '甲木', '乙': '乙木', '丙': '丙火', '丁': '丁火',
    '戊': '戊土', '己': '己土', '庚': '庚金', '辛': '辛金',
    '壬': '壬水', '癸': '癸水'
  },

  GAN_WX: {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火',
    '戊': '土', '己': '土', '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
  },

  ZHI_WX: {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水'
  },

  getWxColor(char) {
    const wx = this.GAN_WX[char] || this.ZHI_WX[char] || '';
    return this.WX_COLORS[wx] || { color: 'inherit', icon: '' };
  },

  colorize(char) {
    const wxc = this.getWxColor(char);
    return `<span style="color: ${wxc.color}; font-family: 'Noto Sans SC', sans-serif;">${char}</span>`;
  },

  // 将 "丙" 映射为红色 "丙火"
  colorizeFull(char) {
    const wxc = this.getWxColor(char);
    const fullName = this.GAN_WX_NAME[char] || char;
    return `<span style="color: ${wxc.color}; font-weight: 500;">${fullName}</span>`;
  },

  formatDateTime(parts) {
    if (!parts) return '--';
    const year = String(parts.year || '').padStart(4, '0');
    const month = String(parts.month || '').padStart(2, '0');
    const day = String(parts.day || '').padStart(2, '0');
    const hour = String(parts.hour || 0).padStart(2, '0');
    const minute = String(parts.minute || 0).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  formatOffsetMinutes(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value)) return '--';
    const sign = value >= 0 ? '+' : '-';
    return `${sign}${Math.abs(Math.round(value))} 分钟`;
  },

  formatCoordinate(value, positiveLabel, negativeLabel) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '--';
    return `${num >= 0 ? positiveLabel : negativeLabel}${Math.abs(num).toFixed(2)}`;
  },

  renderBirthMeta(baziData) {
    const timeProfile = baziData && baziData.timeProfile ? baziData.timeProfile : null;
    if (!timeProfile) return '';

    const location = timeProfile.location || {};
    const dstSuggestion = baziData && baziData.dstSuggestion ? baziData.dstSuggestion : null;
    const dstStatusClass = dstSuggestion && dstSuggestion.status
      ? `birth-meta-status-${dstSuggestion.status}`
      : 'birth-meta-status-unknown';

    const items = [
      {
        label: '录入时间',
        value: this.formatDateTime(timeProfile.civilTime),
        desc: '出生时当地钟表时间'
      },
      {
        label: '标准时',
        value: this.formatDateTime(timeProfile.standardTime),
        desc: timeProfile.useDaylightSaving
          ? `已按夏令时回拨 ${Math.abs(timeProfile.correctionMinutes.daylightSaving)} 分钟`
          : `基准 ${timeProfile.timezoneLabel}`
      },
      {
        label: '排盘时间',
        value: this.formatDateTime(timeProfile.calculationTime),
        desc: timeProfile.useTrueSolarTime
          ? `真太阳时校正 ${this.formatOffsetMinutes(timeProfile.correctionMinutes.trueSolar)}`
          : '当前按标准时排盘'
      },
      {
        label: '出生地',
        value: location.address || '未指定出生地',
        desc: Number.isFinite(location.longitude)
          ? `${this.formatCoordinate(location.longitude, '东经', '西经')} / ${this.formatCoordinate(location.latitude, '北纬', '南纬')}`
          : '未提供经纬度'
      },
      {
        label: '子时换日',
        value: timeProfile.sectLabel,
        desc: timeProfile.useZiHourSplit ? '23:00 起按次日' : '00:00 后换日'
      }
    ];

    if (dstSuggestion) {
      items.push({
        label: '夏令时提示',
        value: `<span class="birth-meta-status ${dstStatusClass}">${dstSuggestion.status === 'on' ? '建议勾选' : dstSuggestion.status === 'off' ? '通常不勾选' : '请手动确认'}</span>`,
        desc: dstSuggestion.message
      });
    }

    return items.map(item => `
      <div class="birth-meta-card">
        <div class="birth-meta-label">${item.label}</div>
        <div class="birth-meta-value">${item.value}</div>
        <div class="birth-meta-desc">${item.desc}</div>
      </div>
    `).join('');
  },

  renderTable(baziData, options = {}) {
    if (!baziData || !baziData.pillars) return '<p>八字数据无效</p>';

    const p = baziData.pillars;
    const positions = ['year', 'month', 'day', 'hour'];
    const labels = ['年柱', '月柱', '日柱', '时柱'];

    // Header 阴阳历字符串
    let topInfoHtml = '';
    if (baziData.solar && baziData.lunar) {
      const g = baziData.bazi && baziData.bazi.gender || baziData.gender;
      const genderStr = g === 1 ? '乾造' : g === 0 ? '坤造' : '';
      
      const solarInfo = `${baziData.solar.year}年${String(baziData.solar.month).padStart(2,'0')}月${String(baziData.solar.day).padStart(2,'0')}日 ${String(baziData.solar.hour).padStart(2,'0')}:${String(baziData.solar.minute || 0).padStart(2,'0')}`;
      const lunarInfo = `${baziData.lunar.yearInGanZhi || baziData.lunar.year}年${baziData.lunar.monthInChinese || ''}月${baziData.lunar.dayInChinese || ''} ${p.hour.zhi}时`;

      topInfoHtml = `
        <div class="bz-times">
          <div class="bz-time-row">
            <span class="bz-time-label">阴历：</span>
            <span>${lunarInfo} <span class="bz-gender">(${genderStr})</span></span>
          </div>
          <div class="bz-time-row">
            <span class="bz-time-label">阳历：</span>
            <span>${solarInfo}</span>
          </div>
        </div>
      `;
    }

    // Header row (with black/brown gradient and circle badge)
    let html = `
      <div class="bz-table">
        <div class="bz-header-bar">
          <div class="bz-header-left">
            <div class="bz-circle-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke-dasharray="2 3"/></svg>
            </div>
            <div class="bz-name">${options.name || '我的八字'}</div>
          </div>
          ${topInfoHtml}
          <div class="bz-info-btn">日主: ${this.colorize(baziData.dayMaster)} · ${baziData.pattern || '未分格'}</div>
        </div>
        <table class="bz-grid">
          <thead>
            <tr class="bz-row bz-row-header">
              <th class="bz-label" style="background: transparent;">日期</th>
              ${labels.map(l => `<th class="bz-cell bz-cell-header">${l}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

    // Row 1: 主星 (十神天干)
    html += `<tr class="bz-row">
      <td class="bz-label">主星</td>`;
    positions.forEach((pos) => {
      const pillar = p[pos];
      // 参考图日柱显示为 "日主" 但天干对应颜色, 这里统用蓝色并标主星名, 日柱为"元男/元女" 或 "日主"
      const cg = baziData.bazi && baziData.bazi.gender || baziData.gender;
      const dayStr = cg === 1 ? '元男' : cg === 0 ? '元女' : '日主';
      const ss = pos === 'day' ? dayStr : (pillar.shiShenGan || '—');
      // 主星字色是统一的主题蓝
      html += `<td class="bz-cell bz-cell-shishen">${ss}</td>`;
    });
    html += `</tr>`;

    // Row 2: 天干
    html += `<tr class="bz-row bz-row-ganzhi">
      <td class="bz-label">天干</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      const wxc = this.getWxColor(pillar.gan);
      html += `<td class="bz-cell bz-cell-gan" style="color: ${wxc.color};">
        <span class="bz-char-big">${pillar.gan}</span>
        <span class="bz-wx-icon">${wxc.icon}</span>
      </td>`;
    });
    html += `</tr>`;

    // Row 3: 地支
    html += `<tr class="bz-row bz-row-ganzhi">
      <td class="bz-label">地支</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      const wxc = this.getWxColor(pillar.zhi);
      html += `<td class="bz-cell bz-cell-zhi" style="color: ${wxc.color};">
        <span class="bz-char-big">${pillar.zhi}</span>
        <span class="bz-wx-icon">${wxc.icon}</span>
      </td>`;
    });
    html += `</tr>`;

    // Row 4: 藏干 (垂直排列并带五行)
    html += `<tr class="bz-row">
      <td class="bz-label">藏干</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      const hideGans = pillar.hideGan || [];
      if (hideGans.length === 0) {
        html += `<td class="bz-cell bz-cell-hide">—</td>`;
      } else {
        const items = hideGans.map(g => {
          const char = typeof g === 'string' ? g : g;
          return this.colorizeFull(char); // 渲染成 "丙火"
        });
        html += `<td class="bz-cell bz-cell-hide">${items.join('<br>')}</td>`;
      }
    });
    html += `</tr>`;

    // Row 5: 副星 (垂直排列)
    html += `<tr class="bz-row">
      <td class="bz-label">副星</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      const shiShenZhi = pillar.shiShenZhi || [];
      html += `<td class="bz-cell bz-cell-shishen-sub">${shiShenZhi.join('<br>') || '—'}</td>`;
    });
    html += `</tr>`;

    // Row 6: 星运
    html += `<tr class="bz-row">
      <td class="bz-label">星运</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      html += `<td class="bz-cell">${pillar.diShi || '—'}</td>`;
    });
    html += `</tr>`;

    // Row 7: 自坐
    html += `<tr class="bz-row">
      <td class="bz-label">自坐</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      html += `<td class="bz-cell">${pillar.selfSitting || '—'}</td>`;
    });
    html += `</tr>`;

    // Row 8: 空亡
    html += `<tr class="bz-row">
      <td class="bz-label">空亡</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      html += `<td class="bz-cell bz-cell-small">${pillar.xunKong || '—'}</td>`;
    });
    html += `</tr>`;

    // Row 9: 纳音
    html += `<tr class="bz-row">
      <td class="bz-label">纳音</td>`;
    positions.forEach(pos => {
      const pillar = p[pos];
      const naYin = pillar.naYin || '—';
      html += `<td class="bz-cell bz-cell-nayin">${naYin}</td>`;
    });
    html += `</tr>`;

    html += `</tbody></table></div>`;
    return html;
  },

  /**
   * 渲染智能四柱关系图示
   */
  renderSmartDiagram(baziData) {
    if (!baziData || !baziData.pillars) return '';
    const p = baziData.pillars;
    const positions = ['year', 'month', 'day', 'hour'];
    const labels = ['年柱', '月柱', '日柱', '时柱'];

    // Collect all relations that have indices
    const ganRels = [];
    const ganRelData = baziData.ganRelations || {};
    Object.keys(ganRelData).forEach(key => {
      ganRelData[key].forEach(rel => {
        if (rel.indices && rel.indices.length >= 2) ganRels.push(rel);
      });
    });

    const zhiRels = [];
    const zhiRelData = baziData.zhiRelations || {};
    Object.keys(zhiRelData).forEach(key => {
      zhiRelData[key].forEach(rel => {
        if (rel.indices && rel.indices.length >= 2) zhiRels.push(rel);
      });
    });

    // Generate tracks HTML
    const generateTracks = (rels, chars, type) => {
      if (rels.length === 0) return '';
      let tracksHtml = '';
      
      rels.forEach(rel => {
        const startIdx = rel.indices[0];
        const endIdx = rel.indices[rel.indices.length - 1]; // for 三合/三会, connect first to last
        
        // Calculate left offset and width
        // 4 columns, each is 25% width. Center of column is at 12.5%, 37.5%, 62.5%, 87.5%
        const leftPercent = 12.5 + (startIdx * 25);
        const widthPercent = (endIdx - startIdx) * 25;
        
        // Define color based on relation type
        let colorClass = 'rel-neutral'; // default
        if (rel.type && rel.type.includes('合')) colorClass = 'rel-good';
        if (rel.type && (rel.type.includes('冲') || rel.type.includes('刑') || rel.type.includes('害'))) colorClass = 'rel-bad';

        // Nodes definition (circles)
        let nodesHtml = '';
        rel.indices.forEach(idx => {
          const char = chars[idx];
          const relativeLeft = ((idx - startIdx) * 25) / widthPercent * 100;
          nodesHtml += `<div class="bz-smart-node" style="left: ${relativeLeft}%">${char}</div>`;
        });

        tracksHtml += `
          <div class="bz-smart-track">
            <div class="bz-smart-line-wrap" style="left: ${leftPercent}%; width: ${widthPercent}%;">
              <div class="bz-smart-line ${colorClass}"></div>
              ${nodesHtml}
              <div class="bz-smart-label ${colorClass}">${rel.type}</div>
            </div>
          </div>
        `;
      });
      return tracksHtml;
    };

    const gans = positions.map(pos => p[pos].gan);
    const zhis = positions.map(pos => p[pos].zhi);

    let html = `
      <div class="bz-smart-diagram">
        <div class="bz-sd-header">智能四柱图示</div>
        
        <div class="bz-sd-grid">
          <div class="bz-sd-labels">
            ${labels.map(l => `<div class="bz-sd-col-title">${l}</div>`).join('')}
          </div>
          
          <div class="bz-sd-chars bz-sd-chars-gan">
            ${gans.map(g => `<div class="bz-sd-char" style="color: ${this.getWxColor(g).color}">${g}</div>`).join('')}
          </div>
          <div class="bz-sd-tracks-gan">
            ${generateTracks(ganRels, gans, 'gan') || '<div class="bz-sd-empty">天干无明显合冲</div>'}
          </div>

          <div class="bz-sd-chars bz-sd-chars-zhi">
            ${zhis.map(z => `<div class="bz-sd-char" style="color: ${this.getWxColor(z).color}">${z}</div>`).join('')}
          </div>
          <div class="bz-sd-tracks-zhi">
            ${generateTracks(zhiRels, zhis, 'zhi') || '<div class="bz-sd-empty">地支无明显刑冲合害</div>'}
          </div>
        </div>
      </div>
    `;

    return html;
  }
};

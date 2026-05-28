// B3/B4 商家信号筛选 dashboard V2 前端
'use strict';

const CB = Math.floor(Date.now() / 60000);  // cache-buster: 分钟时间戳
const fetchJson = (p) => fetch(`${p}?v=${CB}`, { cache: 'no-store' }).then(r => r.json());

const SHOP_SEARCH = (name) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(name)}&type=51`;
const CANGQIONG_LINK = (sid) => `https://canghai.devops.xiaohongshu.com/seller-portrait?sid=${sid}`;

let state = {
  meta: null,
  sellers: [],
  categories: null,
  signalsDict: null,
  currentGrade: 'S',
  filters: { am: '', quadrant: '', cat: '', layer: '', growth: '', critical: '', search: '' },
};

const Q_CLASS = {
  '🌟 优等生': 'q-excellent',
  '⚡ 黑马': 'q-horse',
  '🐢 慢热': 'q-slow',
  '· 中间态': 'q-mid',
  '⚠️ 待观察': 'q-watch',
};

function fmtWan(v) {
  if (v == null || isNaN(v)) return '--';
  return (v / 10000).toFixed(1) + '万';
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return '--';
  return (v * 100).toFixed(1) + '%';
}
function fmtNum(v) {
  if (v == null || isNaN(v)) return '--';
  return Math.round(v).toLocaleString();
}
function escHTML(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// === Tabs ===
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'sellers') {
        setTimeout(() => {
          document.querySelectorAll('.sc-radar').forEach(el => {
            const inst = echarts.getInstanceByDom(el);
            if (inst) inst.resize();
          });
        }, 50);
      }
    });
  });
}

// === Topbar meta ===
function renderTopbar() {
  document.getElementById('snapshot').textContent = `📅 ${state.meta.gmv_period}`;
  document.getElementById('pool-info').textContent =
    `池总数 ${state.meta.pool_total}（B3 ${state.meta.n_b3} / B4 ${state.meta.n_b4}）`;
  document.getElementById('version').textContent = `${state.meta.version} · ${state.meta.generated_at}`;
}

// === Tab 1: 赛道清单 ===
function renderTracks() {
  const growthDiv = document.getElementById('growth-list');
  const declineDiv = document.getElementById('decline-list');

  growthDiv.innerHTML = state.categories.growth.map(c => trackCardHTML(c, 'growth')).join('') ||
    '<div class="hint">暂无环比 ≥+10% 的赛道</div>';

  declineDiv.innerHTML = state.categories.decline_horse.map(c => trackCardHTML(c, 'decline')).join('') ||
    '<div class="hint">暂无衰退中带黑马的赛道</div>';

  document.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', () => openTrackDetail(card.dataset.cat));
  });
}

function trackCardHTML(c, type) {
  const qoqClass = c.qoq >= 0 ? 'up' : 'down';
  const qoqStr = (Math.abs(c.qoq) > 500)
    ? (c.qoq >= 0 ? '↑ 异常(基数极小)' : '↓ 异常(基数极小)')
    : (c.qoq >= 0 ? '+' : '') + c.qoq.toFixed(1) + '%';
  const top20 = c.is_top20 ? '<span class="top20-badge">✨</span>' : '';
  const horseInfo = c.pool_horse > 0 ? `<b>${c.pool_horse}</b>个黑马 / ` : '';
  return `
  <div class="track-card" data-cat="${escHTML(c.cat)}">
    <div class="track-card-head">
      <span class="track-name">${top20}${escHTML(c.cat)}</span>
      <span class="track-qoq ${qoqClass}">${qoqStr}</span>
    </div>
    <div class="track-stats">
      <span>GMV <b>${c.gmv_2m.toFixed(0)}万</b></span>
      <span>池内商家 <b>${c.pool_total}</b></span>
      <span>${horseInfo}<b>${c.pool_s}</b>个 S 档</span>
      <span>CR5 <b>${c.cr5 ? c.cr5.toFixed(0) + '%' : '--'}</b></span>
    </div>
    <div class="track-recommend">💡 ${escHTML(c.recommend)}</div>
  </div>`;
}

function openTrackDetail(cat) {
  const c = state.categories.all.find(x => x.cat === cat);
  if (!c) return;
  const sellersInCat = state.sellers.filter(s => s.cat3 === cat);
  const topSellers = [...sellersInCat].sort((a, b) => b.gmv_30d - a.gmv_30d).slice(0, 12);

  const horseCount = sellersInCat.filter(s => s.quadrant.startsWith('⚡')).length;
  const sCount = sellersInCat.filter(s => s.grade === 'S').length;

  document.getElementById('track-detail-content').innerHTML = `
    <h2>${c.is_top20 ? '✨' : ''}${escHTML(c.cat)}</h2>
    <div style="color:#6b7280;font-size:12px;margin:6px 0 16px">${escHTML(c.recommend)}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      <div style="background:#f1f5f9;padding:10px;border-radius:6px">
        <div style="font-size:11px;color:#6b7280">当期 GMV</div>
        <div style="font-size:18px;font-weight:600;color:#2563eb">${c.gmv_2m.toFixed(0)}万</div>
      </div>
      <div style="background:#f1f5f9;padding:10px;border-radius:6px">
        <div style="font-size:11px;color:#6b7280">环比</div>
        <div style="font-size:18px;font-weight:600;color:${c.qoq >= 0 ? '#dc2626' : '#16a34a'}">${Math.abs(c.qoq) > 500 ? (c.qoq >= 0 ? '↑ 异常' : '↓ 异常') : ((c.qoq >= 0 ? '+' : '') + c.qoq.toFixed(1) + '%')}</div>
      </div>
      <div style="background:#f1f5f9;padding:10px;border-radius:6px">
        <div style="font-size:11px;color:#6b7280">B3/B4 池</div>
        <div style="font-size:18px;font-weight:600">${c.pool_total}</div>
      </div>
      <div style="background:#f1f5f9;padding:10px;border-radius:6px">
        <div style="font-size:11px;color:#6b7280">黑马 / S 档</div>
        <div style="font-size:18px;font-weight:600">${horseCount} / ${sCount}</div>
      </div>
    </div>
    <h3 style="font-size:14px;margin-bottom:6px">Top GMV 商家（前 12）</h3>
    <table class="track-detail-table">
      <thead><tr><th>商家</th><th>AM</th><th>层</th><th>象限</th><th>档</th><th style="text-align:right">GMV(30d)</th></tr></thead>
      <tbody>
      ${topSellers.map(s => `
        <tr>
          <td><a href="${SHOP_SEARCH(s.name)}" target="_blank">${escHTML(s.name)} ↗</a>${s.gmv_near_b5 ? ' <span title="GMV ≥40万临界商家">⚠️</span>' : ''}</td>
          <td>${escHTML(s.am)}</td>
          <td>${s.layer}</td>
          <td><span class="sc-quadrant ${Q_CLASS[s.quadrant] || ''}">${s.quadrant}</span></td>
          <td><b>${s.grade}</b></td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${fmtWan(s.gmv_30d)}</td>
        </tr>
      `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('track-detail').style.display = 'block';
}

function closeTrackDetail() {
  document.getElementById('track-detail').style.display = 'none';
}
window.closeTrackDetail = closeTrackDetail;

// === Tab 2: 商家 ===
function initSellersTab() {
  document.querySelectorAll('.grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentGrade = btn.dataset.grade;
      renderSellerCards();
    });
  });
  document.getElementById('cnt-s').textContent = state.meta.n_s;
  document.getElementById('cnt-a').textContent = state.meta.n_a;
  document.getElementById('cnt-b').textContent = state.meta.n_b;

  const amSel = document.getElementById('filter-am');
  state.meta.am_list.forEach(am => {
    amSel.innerHTML += `<option value="${escHTML(am)}">${escHTML(am)}</option>`;
  });
  const catSel = document.getElementById('filter-cat');
  state.meta.cat_list.forEach(c => {
    catSel.innerHTML += `<option value="${escHTML(c)}">${escHTML(c)}</option>`;
  });

  ['filter-am', 'filter-quadrant', 'filter-cat', 'filter-layer', 'filter-growth', 'filter-critical', 'filter-search'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      state.filters.am = document.getElementById('filter-am').value;
      state.filters.quadrant = document.getElementById('filter-quadrant').value;
      state.filters.cat = document.getElementById('filter-cat').value;
      state.filters.layer = document.getElementById('filter-layer').value;
      state.filters.growth = document.getElementById('filter-growth').value;
      state.filters.critical = document.getElementById('filter-critical').value;
      state.filters.search = document.getElementById('filter-search').value.toLowerCase();
      renderSellerCards();
    });
  });
}

function renderSellerCards() {
  const f = state.filters;
  let list = state.sellers.filter(s => s.grade === state.currentGrade);
  if (f.am) list = list.filter(s => s.am === f.am);
  if (f.quadrant) list = list.filter(s => s.quadrant === f.quadrant);
  if (f.cat) list = list.filter(s => s.cat3 === f.cat);
  if (f.layer) list = list.filter(s => s.layer === f.layer);
  if (f.growth === '1') list = list.filter(s => s.in_growth_track === 1);
  else if (f.growth === 'top20') list = list.filter(s => s.in_top20_track === 1);
  if (f.critical === '1') list = list.filter(s => s.gmv_near_b5 === 1);
  else if (f.critical === '0') list = list.filter(s => s.gmv_near_b5 === 0);
  if (f.search) list = list.filter(s => s.name.toLowerCase().includes(f.search));

  // 排序：按 combo 降序
  list.sort((a, b) => b.combo - a.combo);
  const baseTotal = state.sellers.filter(s => s.grade === state.currentGrade).length;
  document.getElementById('filter-result-cnt').textContent = list.length;
  document.getElementById('filter-total-cnt').textContent = baseTotal;

  const LIMIT = state.currentGrade === 'S' ? 100 : (state.currentGrade === 'A' ? 80 : 60);
  const truncated = list.length > LIMIT;
  list = list.slice(0, LIMIT);

  const container = document.getElementById('seller-cards');
  container.innerHTML = list.map(sellerCardHTML).join('') ||
    '<div class="hint" style="padding:30px;text-align:center;grid-column:1/-1">无匹配商家</div>';

  if (truncated) {
    container.innerHTML += `<div style="grid-column:1/-1;text-align:center;padding:14px;color:#6b7280;font-size:12px">显示前 ${LIMIT} 个；缩小筛选范围可看完整。</div>`;
  }

  // 渲染 4 维雷达图
  list.forEach(s => {
    const el = document.getElementById(`radar-${s.sid}`);
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption({
      radar: {
        indicator: [
          { name: '🏗️底盘', max: 100 },
          { name: '🚀动能', max: 100 },
          { name: '🎬场域纯', max: 100 },
          { name: '🎬场域约束', max: 100 },
        ],
        radius: '60%',
        center: ['50%', '52%'],
        splitNumber: 2,
        axisName: { color: '#475569', fontSize: 9 },
        splitArea: { areaStyle: { color: ['#fafafa', '#fff'] } },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: [s.fund, s.mom, s.field_pure, s.field_cons],
          symbol: 'circle',
          symbolSize: 4,
          areaStyle: { color: 'rgba(37,99,235,0.22)' },
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
        }],
      }],
    });
  });
}

function sellerCardHTML(s) {
  const trackBadges = [];
  if (s.in_growth_track) trackBadges.push('<span class="sc-tag tag-growth">📈 增长赛道</span>');
  if (s.in_top20_track && !s.in_growth_track) trackBadges.push('<span class="sc-tag tag-top20">✨ Top20赛道</span>');
  const criticalIcon = s.gmv_near_b5
    ? `<span class="critical-icon" title="GMV ≥40万 临界商家：模型预测力较弱，建议结合常规跟进">⚠️</span>` : '';

  return `
  <div class="seller-card">
    <div class="sc-head">
      <div class="sc-name-block">
        <h3 class="sc-name">
          <a href="${SHOP_SEARCH(s.name)}" target="_blank">${escHTML(s.name)} ↗</a>
          ${criticalIcon}
        </h3>
        <div class="sc-meta">
          <span class="am-tag">${escHTML(s.am)}</span>
          <span>${escHTML(s.cat3)}</span>
        </div>
      </div>
      <div class="sc-gmv">
        ${fmtWan(s.gmv_30d)}
        <div><span class="layer-pill">${s.layer}</span></div>
      </div>
    </div>
    <div class="sc-quad-line">
      <span class="sc-quadrant ${Q_CLASS[s.quadrant] || ''}">${s.quadrant}</span>
      <span class="combo-kpi" title="组合分 = 0.4×场域约束 + 0.6×动能">组合分 <b>${s.combo.toFixed(1)}</b></span>
    </div>
    <div id="radar-${s.sid}" class="sc-radar"></div>
    <div class="sc-signal">💡 ${escHTML(s.key_signal)}</div>
    <div class="sc-tags">
      ${trackBadges.join('')}
      <a class="sc-tag tag-link" href="${CANGQIONG_LINK(s.sid)}" target="_blank">🔗 跳转苍穹</a>
    </div>
  </div>`;
}

// === Tab 3: 信号字典 + 模型说明 (V2 大改) ===
function renderDict() {
  const d = state.signalsDict;
  const container = document.getElementById('dict-content');
  let html = `
    <div class="dict-section">
      <h3>📅 数据快照</h3>
      <p style="color:#6b7280;font-size:12px">${escHTML(d.snapshot)}</p>
      <p style="color:#6b7280;font-size:12px">版本：${escHTML(d.version)}</p>
    </div>
  `;

  // V2 公式总览
  if (d.formula_overview) {
    const fo = d.formula_overview;
    html += `
    <div class="dict-section formula-overview">
      <h3>${escHTML(fo.title)}</h3>
      <div class="formula-tree">`;
    fo.components.forEach(c => {
      html += `
        <div class="formula-card">
          <div class="fc-name">${escHTML(c.name)}</div>
          <div class="fc-formula">${escHTML(c.formula)}</div>
          <div class="fc-purpose">🎯 ${escHTML(c.purpose)}</div>
          <div class="fc-why">💡 ${escHTML(c.why_design)}</div>
        </div>`;
    });
    html += `</div>`;
    if (fo.combo_formula) {
      html += `
        <div class="combo-formula-card">
          <div class="fc-name">${escHTML(fo.combo_formula.name)}</div>
          <div class="fc-formula" style="font-size:14px">${escHTML(fo.combo_formula.formula)}</div>
          <div class="fc-why">💡 ${escHTML(fo.combo_formula.why_design)}</div>
        </div>`;
    }
    html += `</div>`;
  }

  // 维度信号详情
  d.dimensions.forEach(dim => {
    html += `
    <div class="dict-section">
      <h3>${escHTML(dim.name)}</h3>
      <p style="color:#6b7280;font-size:12px;margin:4px 0">${escHTML(dim.purpose)}</p>
      <div class="formula">公式：${escHTML(dim.formula)}</div>
      <table>
        <thead><tr><th>信号</th><th>取数字段</th><th>阈值</th><th>说明</th></tr></thead>
        <tbody>
        ${dim.signals.map(s => `<tr>
          <td><b>${escHTML(s.name)}</b></td><td>${escHTML(s.field)}</td><td>${escHTML(s.threshold)}</td><td>${escHTML(s.note)}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  });

  // 四象限规则
  html += `
    <div class="dict-section">
      <h3>📐 四象限分类规则</h3>
      <p style="color:#6b7280;font-size:12px">坐标轴：${escHTML(d.quadrant_rules.axes)}</p>
      <p style="color:#6b7280;font-size:12px">阈值：${escHTML(d.quadrant_rules.thresholds)}</p>
      <div class="quadrant-grid">
        ${d.quadrant_rules.rules.map(r => `
          <div class="quad-card">
            <div class="qc-name">${escHTML(r.name)}</div>
            <div class="qc-rule">${escHTML(r.rule)}</div>
            <div class="qc-play">${escHTML(r.playbook)}</div>
          </div>
        `).join('')}
      </div>
    </div>`;

  // S/A/B 分级
  html += `
    <div class="dict-section">
      <h3>🎖️ S/A/B 分级规则 <span style="font-size:12px;color:#6b7280">(${escHTML(d.grade_rules.scheme || '')})</span></h3>
      <div class="grade-card-list">
        ${['S', 'A', 'B'].map(g => {
          const r = d.grade_rules[g];
          return `<div class="grade-card ${g.toLowerCase()}">
            <div class="gc-name">${g}</div>
            <div class="gc-count">${r.count} 商家</div>
            <div>
              <div class="gc-rule">${escHTML(r.rule)}</div>
              <div class="gc-aud">${escHTML(r.audience)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // GMV 临界商家说明
  if (d.gmv_near_b5_note) {
    const n = d.gmv_near_b5_note;
    html += `
    <div class="dict-section warning-section">
      <h3>${escHTML(n.title)}</h3>
      <p><b>定义：</b>${escHTML(n.what)}</p>
      <p><b>为什么标记：</b>${escHTML(n.why_flag)}</p>
      <p><b>UI 标识：</b>${escHTML(n.ui_marker)}</p>
    </div>`;
  }

  // 6 个月回测复验
  if (d.backtest_summary) {
    const b = d.backtest_summary;
    html += `
    <div class="dict-section backtest-section">
      <h3>${escHTML(b.title)}</h3>
      <p style="color:#6b7280;font-size:12px">${escHTML(b.method)}</p>
      <div class="backtest-headline">${escHTML(b.headline)}</div>

      <h4 style="margin-top:16px;font-size:14px">📊 主表（分组 × GMV 分层）</h4>
      <table class="backtest-table">
        <thead><tr><th>分组</th><th>n</th><th>跳档率</th><th>对照-同区间</th><th>净提升</th><th>p 值</th><th>显著</th></tr></thead>
        <tbody>
        ${b.key_rows.map(r => {
          const sig = r.p < 0.05 ? '✅' : (r.p < 0.1 ? '·' : '');
          const liftStr = r.lift_pct == null ? 'N/A' : (r.lift_pct >= 0 ? '+' : '') + r.lift_pct.toFixed(0) + '%';
          return `<tr>
            <td>${escHTML(r.label)}</td>
            <td>${r.n}</td>
            <td>${r.rate.toFixed(1)}%</td>
            <td>${r.ctl_rate.toFixed(1)}%</td>
            <td><b>${liftStr}</b></td>
            <td>${r.p.toFixed(4)}</td>
            <td>${sig}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>

      <h4 style="margin-top:16px;font-size:14px">🆚 V1 vs V2 对比</h4>
      <table class="backtest-table">
        <thead><tr><th>指标</th><th>V1</th><th>V2</th><th>V2 优劣</th></tr></thead>
        <tbody>
        ${b.v1_vs_v2.map(r => `<tr>
          <td>${escHTML(r['指标'])}</td>
          <td>${escHTML(r.V1)}</td>
          <td><b>${escHTML(r.V2)}</b></td>
          <td>${escHTML(r['V2 优劣'])}</td>
        </tr>`).join('')}
        </tbody>
      </table>

      <p style="margin-top:14px;color:#374151"><b>📝 解读：</b>${escHTML(b.interpretation)}</p>
    </div>`;
  }

  // 仅展示标签
  html += `
    <div class="dict-section">
      <h3>🏷️ 仅展示标签（不入打分）</h3>
      <p style="color:#6b7280;font-size:12px">${escHTML(d.no_score_note)}</p>
      <div class="sc-tags" style="margin-top:10px">
        ${d.no_score_tags.map(t => {
          let cls = 'sc-tag';
          if (t.startsWith('✨')) cls += ' tag-top20';
          else if (t === '📈 增长赛道') cls += ' tag-growth';
          else if (t === '📉 衰退赛道') cls += ' tag-decline';
          else if (t.includes('NPL')) cls += ' tag-npl';
          else if (t.includes('临界')) cls += ' tag-critical';
          return `<span class="${cls}">${escHTML(t)}</span>`;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// === Boot ===
async function boot() {
  initTabs();
  const [meta, sellers, categories, signalsDict] = await Promise.all([
    fetchJson('data/meta.json'),
    fetchJson('data/sellers.json'),
    fetchJson('data/categories.json'),
    fetchJson('data/signals_dict.json'),
  ]);
  state.meta = meta;
  state.sellers = sellers;
  state.categories = categories;
  state.signalsDict = signalsDict;

  renderTopbar();
  renderTracks();
  initSellersTab();
  renderSellerCards();
  renderDict();
}

boot().catch(err => {
  console.error(err);
  document.body.innerHTML += `<div style="background:#fee;color:#900;padding:20px;font-family:monospace">${err.message}</div>`;
});

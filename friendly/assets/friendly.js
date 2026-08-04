/* 友好商家监控看板 */
let D = null, TAB = 'overview';
const $ = id => document.getElementById(id);
const wan = v => (v / 10000).toFixed(v >= 1000000 ? 0 : 1) + '万';
const num = v => (v || 0).toLocaleString('zh-CN');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shopUrl = id => `https://cangqiong.xiaohongshu.com/shop/detail?sellerId=${id}`;

function impFmt(v) {
  if (!v) return '0';
  if (v >= 100000000) return (v / 100000000).toFixed(1) + '亿';
  if (v >= 10000) return (v / 10000).toFixed(0) + '万';
  return num(v);
}

fetch('data/index.json?v=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
  .then(r => r.json())
  .then(d => { D = d; init(); })
  .catch(e => { $('app').innerHTML = `<div class="empty">数据加载失败：${esc(e.message)}</div>`; });

function init() {
  const o = D.overview;
  $('subtitle').textContent = `名下 ${o.total} 家商家 · 友好 ${o.quality} 家（${o.rate}%） · 休食行业 GPM 门槛 ${o.gpmStd}`;
  $('meta').innerHTML = `合规分项快照 ${o.snapDay}（T-1 日更） · GPM 与经营口径 ${o.snapMon} 月（月更，每月 1 日刷新名单） · 数据源 友好商家打标表 + 月度宽表`;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); TAB = t.dataset.tab; render();
  });
  ['f-cat', 'f-b', 'f-tier', 'f-miss', 'f-gap'].forEach(i => $(i).onchange = render);
  $('f-kw').oninput = render;
  render();
}

function fillSel(id, vals, cur) {
  const s = $(id), keep = cur !== undefined ? cur : s.value;
  s.innerHTML = '<option value="">全部</option>' + vals.map(v => `<option value="${esc(v)}"${v === keep ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

function applyFilter(list, opts) {
  const cat = $('f-cat').value, b = $('f-b').value, kw = $('f-kw').value.trim().toLowerCase();
  const tier = $('f-tier').value, miss = $('f-miss').value, gap = $('f-gap').value;
  return list.filter(r => {
    if (cat && r.cat !== cat) return false;
    if (b && r.b !== b) return false;
    if (kw && !r.name.toLowerCase().includes(kw)) return false;
    if (opts.tier && tier && r.tier !== tier) return false;
    if (opts.miss && miss && !(r.miss || []).includes(miss)) return false;
    if (opts.gap && gap && r.gap !== gap) return false;
    return true;
  });
}

function setupFilters(list, opts) {
  $('filters').style.display = opts.show === false ? 'none' : 'flex';
  if (opts.show === false) return;
  $('w-tier').style.display = opts.tier ? 'flex' : 'none';
  $('w-miss').style.display = opts.miss ? 'flex' : 'none';
  $('w-gap').style.display = opts.gap ? 'flex' : 'none';
  fillSel('f-cat', [...new Set(list.map(r => r.cat))].sort());
  fillSel('f-b', ['B6', 'B5', 'B4', 'B3', 'B2', 'B1', '无成交'].filter(b => list.some(r => r.b === b)));
  if (opts.miss) fillSel('f-miss', [...new Set(list.flatMap(r => r.miss || []))]);
  if (opts.gap) fillSel('f-gap', [...new Set(list.map(r => r.gap))]);
}

function render() {
  const fn = { overview: vOverview, quality: vQuality, near: vNear, bigmv: vBigmv, rule: vRule }[TAB];
  $('app').innerHTML = fn();
  document.querySelectorAll('tr.row-click').forEach(tr => tr.onclick = () => {
    const nx = tr.nextElementSibling;
    if (nx && nx.classList.contains('sub-row')) { nx.remove(); return; }
    document.querySelectorAll('tr.sub-row').forEach(x => x.remove());
    const id = tr.dataset.id, src = tr.dataset.src;
    const rec = (D[src] || []).find(x => x.id === id);
    if (!rec) return;
    const row = document.createElement('tr');
    row.className = 'sub-row';
    row.innerHTML = `<td colspan="${tr.children.length}">${detailPanel(rec)}</td>`;
    tr.after(row);
  });
}

/* ============ 总览 ============ */
function vOverview() {
  const o = D.overview;
  setupFilters([], { show: false });
  const rt = o.riskTier;
  const dist = o.missDist.map(m => {
    const mx = Math.max(...o.missDist.map(x => x.cnt));
    const cls = m.n === 1 ? 'g' : m.n === 2 ? 'o' : 'r';
    const top = Object.entries(m.items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}${v}`).join(' / ');
    return `<div class="dist-row"><div class="dist-label">缺 ${m.n} 项</div>
      <div class="dist-bar-wrap"><div class="dist-bar ${cls}" style="width:${m.cnt / mx * 100}%"></div></div>
      <div class="dist-val">${m.cnt} 家 · ${wan(m.gmv)}</div></div>
      <div class="muted" style="margin:-4px 0 6px 128px;font-size:11px">${esc(top)}</div>`;
  }).join('');

  const bl = o.bLevel.map(b => `<tr>
    <td>${b.b}</td>
    <td class="num">${b.q}</td><td class="num">${b.nq}</td>
    <td class="num"><b style="color:${b.rate >= 25 ? '#389e0d' : b.rate >= 10 ? '#d46b08' : '#cf1322'}">${b.rate}%</b></td>
    <td class="num">${wan(b.qgmv)}</td><td class="num">${wan(b.nqgmv)}</td>
    <td class="num">${b.qgpm || '-'}</td><td class="num">${b.nqgpm || '-'}</td>
  </tr>`).join('');

  const car = (arr, t) => `<div class="mini-head">${t}</div>` + arr.map(c =>
    `<div class="dist-row"><div class="dist-label">${c.k}</div>
     <div class="dist-bar-wrap"><div class="dist-bar" style="width:${c.p}%"></div></div>
     <div class="dist-val">${wan(c.v)} · ${c.p}%</div></div>`).join('');

  const nearBy = Object.entries(o.nearBy).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="pill">只缺 ${k}：<b>${v}</b> 家</span>`).join('');
  const bigGap = Object.entries(o.bigGap).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="pill">${k}：<b>${v}</b> 家</span>`).join('');

  return `
  <div class="section">
    <div class="section-title">名下友好商家总览 <span class="badge">${o.snapDay} 快照</span></div>
    <div class="section-sub">合规分项为 T-1 日更；GPM / 经营意愿为 ${o.snapMon} 月口径，名单每月 1 日按上月表现重刷。</div>
    <div class="kpi-row">
      <div class="kpi blue"><div class="kpi-label">友好商家</div><div class="kpi-val blue">${o.quality}</div><div class="kpi-sub">占名下 ${o.total} 家的 ${o.rate}%</div></div>
      <div class="kpi ok"><div class="kpi-label">友好商家 GMV</div><div class="kpi-val ok">${wan(o.qGmv)}</div><div class="kpi-sub">占名下总 GMV ${o.gmvShare}%</div></div>
      <div class="kpi warn"><div class="kpi-label">失格预警</div><div class="kpi-val warn">${rt.danger + rt.warn}</div><div class="kpi-sub">${rt.danger} 家高危 · ${rt.warn} 家单项预警</div></div>
      <div class="kpi"><div class="kpi-label">临门一脚池</div><div class="kpi-val">${o.nearCnt}</div><div class="kpi-sub">仅缺 1 项 · ${wan(o.nearGmv)} GMV</div></div>
      <div class="kpi danger"><div class="kpi-label">高GMV非友好</div><div class="kpi-val danger">${o.bigCnt}</div><div class="kpi-sub">B4+ 未达标 · ${wan(o.bigGmv)} GMV</div></div>
    </div>
  </div>

  <div class="section">
    <div class="callout info">
      <b>核心判断：</b>你名下 <b>没有一家</b>商家卡在店铺分、商品分、违规、高价店、冻结这些资质项上——临门一脚池 ${o.nearCnt} 家里，${o.nearBy['GPM'] || 0} 家只缺 GPM、${o.nearBy['月DGMV'] || 0} 家只缺月 DGMV 1 万门槛。
      这意味着你的做功方向高度收敛：<b>不是补资质，而是提流量效率</b>。B4+ 非友好 ${o.bigCnt} 家全部卡在 GPM 上，合计 ${wan(o.bigGmv)} GMV 已经在手，差的只是把曝光换成成交的能力。
    </div>
  </div>

  <div class="grid2">
    <div class="section">
      <div class="section-title">非友好商家缺口分布</div>
      <div class="section-sub">缺 5 项以上的 ${o.zombie} 家基本无成交，属僵尸店，日常做功可忽略</div>
      ${dist}
    </div>
    <div class="section">
      <div class="section-title">B4+ 载体结构对比</div>
      <div class="section-sub">同为 B4 以上，友好 ${o.qb4Cnt} 家 vs 非友好 ${o.bigCnt} 家的 DGMV 来源</div>
      ${car(D.overview.carrierQ, '✅ 友好商家')}
      ${car(D.overview.carrierNQ, '⚠️ 非友好商家')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">分层友好率</div>
    <div class="section-sub">GPM 取各层中位数（均值会被小曝光商家的极值拉爆，不可用）</div>
    <div class="table-wrap"><table>
      <thead><tr><th>B等级</th><th class="num">友好</th><th class="num">非友好</th><th class="num">友好率</th>
      <th class="num">友好GMV</th><th class="num">非友好GMV</th><th class="num">友好GPM中位</th><th class="num">非友好GPM中位</th></tr></thead>
      <tbody>${bl}</tbody></table></div>
  </div>

  <div class="section">
    <div class="section-title">两个待办池</div>
    <div class="section-sub">临门一脚：仅差 1 项即可准入 · 高GMV非友好：规模已有、效率待补</div>
    <div class="mini-head">临门一脚 ${o.nearCnt} 家 · ${wan(o.nearGmv)}</div>
    <div>${nearBy}</div>
    <div class="mini-head">高GMV非友好 ${o.bigCnt} 家 · ${wan(o.bigGmv)}（按 GPM 距门槛的距离分档）</div>
    <div>${bigGap}</div>
  </div>`;
}

/* ============ 现有友好商家 ============ */
function vQuality() {
  setupFilters(D.quality, { tier: true });
  const list = applyFilter(D.quality, { tier: true });
  const o = D.overview;
  $('filter-hint').textContent = `显示 ${list.length} / ${D.quality.length} 家`;
  const tierName = { danger: '🔴 高危', warn: '🟠 预警', watch: '🟡 关注', safe: '⚪ 稳健' };
  const rows = list.map(r => `<tr class="row-click" data-id="${r.id}" data-src="quality">
    <td class="shop">${esc(r.name)}${r.wl ? ' <span class="tag wl">白名单</span>' : ''}</td>
    <td><span class="tag t-${r.tier}">${tierName[r.tier]}</span></td>
    <td>${r.b}</td>
    <td class="num">${wan(r.gmv)}</td>
    <td class="num" style="color:${r.gpm < o.gpmStd * 1.1 ? '#cf1322' : r.gpm < o.gpmStd * 1.3 ? '#d46b08' : '#389e0d'}">${num(Math.round(r.gpm))}</td>
    <td class="num">${r.shop}</td><td class="num">${r.goods}</td>
    <td class="num">${r.pun}</td>
    <td class="muted">${r.risks.length ? r.risks.map(x => x.k).join('、') : '无'}</td>
  </tr>`).join('');

  return `<div class="section">
    <div class="section-title">现有友好商家失格监控 <span class="badge">${D.quality.length} 家</span></div>
    <div class="section-sub">名单每月 1 日按上月表现重刷，月中预警才来得及做功。点击行展开分项余量与经营动作。</div>
    <div class="callout warn">
      <b>预警口径：</b>任一分项逼近门槛即标记。GPM &lt; 门槛 1.1 倍、月 DGMV &lt; 1.5 万、店铺分/商品分低于门槛 +0.2、近30天严重违规 ≥4 条，视为高危项；两项高危即 🔴。
      当前 ${o.riskTier.danger} 家高危、${o.riskTier.warn} 家单项预警，主要压力来自 GPM。
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>风险档</th><th>B等级</th><th class="num">月GMV</th><th class="num">GPM</th>
      <th class="num">店铺分</th><th class="num">商品分</th><th class="num">违规</th><th>风险项</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ============ 临门一脚 ============ */
function vNear() {
  setupFilters(D.near, { miss: true });
  const list = applyFilter(D.near, { miss: true });
  const o = D.overview;
  $('filter-hint').textContent = `显示 ${list.length} / ${D.near.length} 家 · 合计 ${wan(list.reduce((s, r) => s + r.gmv, 0))}`;
  const rows = list.map(r => {
    const need = r.miss.includes('GPM')
      ? `GPM ${Math.round(r.gpm)} → 需 ${o.gpmStd}（还差 ${Math.round(o.gpmStd - r.gpm)}）`
      : r.miss.includes('月DGMV') ? `月 DGMV ${wan(r.gmv)} → 需 1 万` : r.miss.join('、');
    return `<tr class="row-click" data-id="${r.id}" data-src="near">
      <td class="shop">${esc(r.name)}</td>
      <td>${r.b}</td>
      <td class="muted">${esc(r.cat)}</td>
      <td class="num">${wan(r.gmv)}</td>
      <td class="num">${num(Math.round(r.gpm))}</td>
      <td class="num">${impFmt(r.imp)}</td>
      <td>${r.miss.map(m => `<span class="tag miss">${m}</span>`).join('')}</td>
      <td class="muted">${esc(need)}</td>
    </tr>`;
  }).join('');

  return `<div class="section">
    <div class="section-title">临门一脚池 <span class="badge">仅缺 1 项 · ${D.near.length} 家</span></div>
    <div class="section-sub">八项判定里只差最后一项，是转化率最高的做功对象。点击行看曝光结构与经营动作明细。</div>
    <div class="callout info">
      <b>怎么用：</b>只缺 <b>GPM</b> 的 ${o.nearBy['GPM'] || 0} 家（${wan(D.near.filter(r => r.miss.includes('GPM')).reduce((s, r) => s + r.gmv, 0))}），看曝光够不够——曝光已经不小的，问题在转化承接（客单、货盘、直播承接）；曝光很小的，得先解决内容和直播供给。
      只缺 <b>月 DGMV</b> 的 ${o.nearBy['月DGMV'] || 0} 家 GPM 已达标，差的只是 1 万的绝对量，一场直播或一次活动就能过线，性价比最高。
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>B等级</th><th>主营类目</th><th class="num">月GMV</th><th class="num">GPM</th>
      <th class="num">月曝光</th><th>缺失项</th><th>差距</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ============ 高GMV非友好 ============ */
function vBigmv() {
  setupFilters(D.bigmv, { gap: true });
  const list = applyFilter(D.bigmv, { gap: true });
  const o = D.overview;
  $('filter-hint').textContent = `显示 ${list.length} / ${D.bigmv.length} 家 · 合计 ${wan(list.reduce((s, r) => s + r.gmv, 0))}`;
  const gapCls = { '临门一脚': 'gap-1', '中度缺口': 'gap-2', '重度缺口': 'gap-3', '结构性缺口': 'gap-4', '无曝光': 'gap-4' };
  const diagCls = { '曝光充足·转化不足': 'diag-a', '曝光不足·需先起量': 'diag-b', '无曝光': 'diag-c' };
  const rows = list.map(r => `<tr class="row-click" data-id="${r.id}" data-src="bigmv">
    <td class="shop">${esc(r.name)}</td>
    <td>${r.b}</td>
    <td class="num">${wan(r.gmv)}</td>
    <td class="num">${num(Math.round(r.gpm))}</td>
    <td class="num">${r.ratio}%</td>
    <td><span class="tag ${gapCls[r.gap] || ''}">${r.gap}</span></td>
    <td class="num">${impFmt(r.imp)}</td>
    <td class="num">${r.impx ? r.impx + '×' : '-'}</td>
    <td><span class="tag ${diagCls[r.diag] || ''}">${r.diag}</span></td>
    <td class="num">${r.price ? '¥' + r.price : '-'}</td>
    <td class="num">${r.rebuy}%</td>
  </tr>`).join('');

  return `<div class="section">
    <div class="section-title">高 GMV 非友好商家 <span class="badge danger">B4+ · ${D.bigmv.length} 家 · ${wan(o.bigGmv)}</span></div>
    <div class="section-sub">规模已经做出来，但流量效率不达标。「曝光倍数」= 该商家月曝光 ÷ 同层友好商家曝光中位数（${impFmt(o.medQImp)}）。</div>
    <div class="callout danger">
      <b>关键反差：</b>这 ${o.bigCnt} 家的曝光中位数 ${impFmt(o.medNQImp)}，是同层友好商家（${impFmt(o.medQImp)}）的 <b>${(o.medNQImp / o.medQImp).toFixed(1)} 倍</b>，
      但 GMV 中位只有 ${wan(o.medNQGmv)}，反而<b>低于</b>友好商家的 ${wan(o.medQGmv)}——
      拿到的流量更多，成交却更少，问题明确出在承接而不是曝光。
      ${o.bigDiag['曝光充足·转化不足'] || 0} 家属于「曝光充足·转化不足」，做功重点是客单价、货盘结构和直播承接，而不是继续要量。
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>B等级</th><th class="num">月GMV</th><th class="num">GPM</th><th class="num">达门槛</th>
      <th>缺口档</th><th class="num">月曝光</th><th class="num">曝光倍数</th><th>诊断</th><th class="num">客单价</th><th class="num">90d复购</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ============ 明细面板 ============ */
function detailPanel(r) {
  const o = D.overview;
  const risks = (r.risks || []).length
    ? r.risks.map(x => `<div class="risk-line ${x.lv}">• ${esc(x.txt)}</div>`).join('')
    : '<div class="risk-line">• 各分项均有安全余量</div>';
  const dtot = (r.dlive + r.dnote + r.dcard + r.cps + r.ad) || 1;
  const carr = [['店播', r.dlive], ['商笔', r.dnote], ['商卡', r.dcard], ['K播', r.cps], ['广告', r.ad]]
    .filter(x => x[1] > 0).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<div class="dist-row"><div class="dist-label">${k}</div>
      <div class="dist-bar-wrap"><div class="dist-bar" style="width:${v / dtot * 100}%"></div></div>
      <div class="dist-val">${wan(v)} · ${(v / dtot * 100).toFixed(0)}%</div></div>`).join('')
    || '<div class="muted">本月无载体成交</div>';

  const gpmGap = r.gpm < o.gpmStd
    ? `<div class="callout warn" style="margin:0 0 10px">GPM ${Math.round(r.gpm)}，距门槛 ${o.gpmStd} 还差 <b>${Math.round(o.gpmStd - r.gpm)}</b>。
       按当前曝光 ${impFmt(r.imp)} 测算，月 GMV 需从 ${wan(r.gmv)} 提到 <b>${wan(r.imp * o.gpmStd / 1000)}</b>（+${r.gmv ? Math.round((r.imp * o.gpmStd / 1000 / r.gmv - 1) * 100) : '∞'}%）；
       或维持 GMV 不变、把无效曝光压到 <b>${impFmt(r.gmv / o.gpmStd * 1000)}</b> 以内。</div>`
    : `<div class="callout info" style="margin:0 0 10px">GPM ${Math.round(r.gpm)}，已达门槛 ${o.gpmStd} 的 ${Math.round(r.gpm / o.gpmStd * 100)}%。</div>`;

  return `<div class="panel">
    <div class="panel-title">${esc(r.name)} · ${esc(r.cat)}${r.cat2 ? ' / ' + esc(r.cat2) : ''} · ${r.b}
      <a href="${shopUrl(r.id)}" target="_blank" style="font-weight:400;font-size:12px;margin-left:8px">苍穹后台 ↗</a></div>
    ${gpmGap}
    <div class="grid2">
      <div>
        <div class="mini-head">八项判定分项</div>
        <table class="inner"><tbody>
          <tr><td>全域 GPM</td><td class="num">${num(Math.round(r.gpm))}</td><td class="num muted">门槛 ${o.gpmStd}</td><td>${r.gpm > o.gpmStd ? '✅' : '❌'}</td></tr>
          <tr><td>月 DGMV</td><td class="num">${wan(r.gmv)}</td><td class="num muted">门槛 1万</td><td>${r.gmv > o.gmvStd ? '✅' : '❌'}</td></tr>
          <tr><td>店铺分</td><td class="num">${r.shop}</td><td class="num muted">门槛 4.2</td><td>${r.miss.includes('店铺分') ? '❌' : '✅'}</td></tr>
          <tr><td>商品分</td><td class="num">${r.goods}</td><td class="num muted">门槛 4.2</td><td>${r.miss.includes('商品分') ? '❌' : '✅'}</td></tr>
          <tr><td>近30天严重违规</td><td class="num">${r.pun}</td><td class="num muted">上限 5</td><td>${r.miss.includes('严重违规') ? '❌' : '✅'}</td></tr>
          <tr><td>非高价店</td><td class="num">-</td><td class="num muted">-</td><td>${r.miss.includes('高价店') ? '❌' : '✅'}</td></tr>
          <tr><td>非冻结</td><td class="num">-</td><td class="num muted">-</td><td>${r.miss.includes('冻结') ? '❌' : '✅'}</td></tr>
          <tr><td>经营意愿</td><td class="num">-</td><td class="num muted">任一&gt;0</td><td>${r.miss.includes('经营意愿') ? '❌' : '✅'}</td></tr>
        </tbody></table>
        <div class="mini-head">失格风险 / 缺口</div>
        ${risks}
      </div>
      <div>
        <div class="mini-head">GPM 分子分母</div>
        <table class="inner"><tbody>
          <tr><td>月曝光合计</td><td class="num">${impFmt(r.imp)}</td></tr>
          <tr><td>月 GMV</td><td class="num">${wan(r.gmv)}</td></tr>
          <tr><td>客单价</td><td class="num">${r.price ? '¥' + r.price : '-'}</td></tr>
          <tr><td>90天复购率</td><td class="num">${r.rebuy}%</td></tr>
          <tr><td>近30天 DGMV</td><td class="num">${wan(r.dgmv30)}</td></tr>
        </tbody></table>
        <div class="mini-head">经营动作（月度）</div>
        <table class="inner"><tbody>
          <tr><td>笔记发布</td><td class="num">${r.note} 篇（商品笔记 ${r.gnote}）</td></tr>
          <tr><td>店播</td><td class="num">${r.liven} 场 / ${r.liveh} 小时</td></tr>
          <tr><td>群聊活跃</td><td class="num">${r.grp} 天</td></tr>
          <tr><td>广告 DGMV</td><td class="num">${wan(r.ad)}</td></tr>
          <tr><td>买手 DGMV</td><td class="num">${wan(r.cps)}</td></tr>
        </tbody></table>
        <div class="mini-head">载体结构</div>
        ${carr}
      </div>
    </div>
  </div>`;
}

/* ============ 口径说明 ============ */
function vRule() {
  setupFilters([], { show: false });
  const o = D.overview;
  return `<div class="section">
    <div class="section-title">友好商家判定口径（2.0 版 · 202606 生效）</div>
    <div class="rule-block">
      <h4>八项判定，全部满足才是友好商家</h4>
      <ul>
        <li><b>用户运营能力</b>：全域 GPM &gt; 行业标准，<b>且</b> 月 DGMV &gt; 1 万</li>
        <li><b>商品与服务质量</b>：非高价店、非冻结账号、店铺分 ≥ 4.2、商品分 ≥ 4.2、近30天严重违规 ≤ 5 条</li>
        <li><b>平台经营意愿</b>：笔记发布数 / 店播时长 / 群聊活跃天数 / 广告 DGMV / 买手 DGMV，任一 &gt; 0</li>
      </ul>

      <h4>休食的 GPM 门槛为什么是 ${o.gpmStd}</h4>
      2.0 版把行业分成三类。休食属于 <b>🟡 发展行业</b>——行业仍在摸索平台经营方法，用行业内相对标准刻画，即取 GPM 分位值。
      休食归在 P75 分位组，门槛 <code>${o.gpmStd}</code>。同组的还有美妆个护 230、服配内睡 190、家用 140、消费电子 160、图书 90、教育 100。
      成熟行业（女装、文玩、户外等）走绝对标准值，宠物家饰等走 P50。分位值以季度为单位刷新。

      <h4>GPM 怎么算</h4>
      <code>GPM = 月 GMV ÷（公域四渠道曝光 + K播直播间商品曝光 + 买手笔记曝光）× 1000</code>。
      公域四渠道指 MF双列 / MF内流 / 搜索双列 / 搜索内流（含广告）。
      所以提 GPM 有两条路：把成交做上去，或者把跑空的曝光压下来——低价高频发笔记冲曝光反而会拉低 GPM，2.0 版剔除的商家里很大一批就是这种。

      <h4>什么时候刷新</h4>
      <ul>
        <li><b>名单</b>：每自然月 1 日，按上一自然月 GPM 表现准入或剔除</li>
        <li><b>合规</b>：识别即剔除，T+1 生效——这项不等月初，随时可能掉出去</li>
        <li><b>行业标准值</b>：季度刷新一次</li>
      </ul>

      <h4>白名单机制</h4>
      避免站外头商因未掌握平台方法被漏掉，全平台设 400 个额度，由行业提报。
      但底线标准仍在：严重违规 &gt; 5、高价店、店铺分 &lt; 4.2，或属禁入行业（酒旅 / 虚拟 / 二奢），提报也不生效。
      你名下当前有 <b>${o.wl}</b> 家白名单商家。

      <h4>本看板的口径边界</h4>
      <ul>
        <li>合规分项（店铺分、商品分、违规数、高价店、冻结）来自日更表，快照日 <b>${o.snapDay}</b>，其中分数与违规数本身是 T+2 数据</li>
        <li>GPM、GMV、曝光、经营动作来自月更宽表，口径月份 <b>${o.snapMon}</b>，7 月数据要等 8 月初刷新</li>
        <li>看板复现了官方八项判定逻辑，与官方 <code>is_quality_seller</code> 标记完全一致（37 家友好商家八项 100% 达标）</li>
        <li>GPM 一律用中位数展示。均值会被曝光极小的商家拉爆（个别值上万），不可用</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">数据来源</div>
    <div class="src-card">
      <b>友好商家打标表</b>　<code>redcdm.dm_ecm_seller_quality_tag_df</code>（dtm=${o.snapDay.replace(/-/g, '')}，T-1 日更）<br>
      <b>友好商家月度宽表</b>　<code>redcdm.dm_ecm_seller_quality_tag_df_mid2</code>（dtm=${o.snapMon.replace('-', '')}01，月更）<br>
      <b>AM 归属</b>　<code>reddw.dw_trd_seller_base_metrics_day</code> 的 seller_am_name（日更，比名册快照准）<br>
      <b>口径依据</b>　<a href="https://docs.xiaohongshu.com/doc/1570892df32297b19e8ce37d22108733" target="_blank">小红书 友好商家定义 20260622</a>
    </div>
  </div>`;
}

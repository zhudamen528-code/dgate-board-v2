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
  ['f-cat', 'f-b', 'f-tier', 'f-miss', 'f-gap', 'f-bucket', 'f-sev', 'f-prio', 'f-path'].forEach(i => $(i).onchange = render);
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
  $('w-bucket').style.display = opts.bucket ? 'flex' : 'none';
  $('w-sev').style.display = opts.sev ? 'flex' : 'none';
  $('w-prio').style.display = opts.prio ? 'flex' : 'none';
  $('w-path').style.display = opts.path ? 'flex' : 'none';
  fillSel('f-cat', [...new Set(list.map(r => r.cat))].sort());
  fillSel('f-b', ['B6', 'B5', 'B4', 'B3', 'B2', 'B1', '无成交'].filter(b => list.some(r => r.b === b)));
  if (opts.miss) fillSel('f-miss', [...new Set(list.flatMap(r => r.miss || []))]);
  if (opts.gap) fillSel('f-gap', [...new Set(list.map(r => r.gap))]);
  if (opts.path) fillSel('f-path', [...new Set(list.map(r => r.path))]);
}

function render() {
  const fn = { overview: vOverview, grow: vGrow, uplift: vUplift, quality: vQuality,
               near: vNear, bigmv: vBigmv, comp: vComp, rule: vRule }[TAB];
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
  const bkOrder = ['≥80%（一步之遥）', '60-80%', '40-60%', '20-40%', '<20%（差距大）'];
  const nearBk = bkOrder.filter(k => o.nearBucket[k])
    .map(k => `<span class="pill">${k}：<b>${o.nearBucket[k]}</b> 家</span>`).join('');
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
      <div class="kpi danger"><div class="kpi-label">合规异常</div><div class="kpi-val danger">${o.compActive}</div><div class="kpi-sub">有成交需处理 · 全盘 ${o.compCnt} 家贴线</div></div>
    </div>
  </div>

  <div class="section">
    <div class="callout info">
      <b>核心判断：</b>临门一脚池 ${o.nearCnt} 家里，${o.nearBy['GPM'] || 0} 家只缺 GPM、${o.nearBy['月DGMV'] || 0} 家只缺月 DGMV 1 万门槛——<b>没有一家是单纯卡在合规上的</b>，
      所以「只缺 1 项」这个池子里看不到合规项。你的主战场是流量效率：B4+ 非友好 ${o.bigCnt} 家全部卡在 GPM 上，合计 ${wan(o.bigGmv)} GMV 已经在手，差的只是把曝光换成成交的能力。
    </div>
    <div class="callout danger">
      <b>但合规问题另算：</b>全盘有 <b>${o.compCnt}</b> 家存在合规异常或贴线（商品分 ${o.compBy['商品分'] || 0} / 店铺分 ${o.compBy['店铺分'] || 0} / 严重违规 ${o.compBy['严重违规'] || 0} / 冻结 ${o.compBy['冻结'] || 0}），
      它们大多同时还缺 GPM 和 GMV，缺项数 ≥2，所以不在临门一脚池里。其中 <b>${o.compActive} 家近 30 天有实际成交</b>（${wan(o.compActiveGmv)}）需要你介入——
      合规是唯一「识别即剔除、T+1 生效」的项，不等月初。详见「合规专项」Tab。
    </div>
  </div>

  <div class="section">
    <div class="section-title">GPM 的分母只统计两类曝光 —— 这是做功抓手</div>
    <div class="section-sub">从生产任务 SQL 核实的口径，对指导商家经营直接有用</div>
    <div class="callout danger">
      <b>GPM = 月 GMV ÷（公域四渠道曝光 + K播商品曝光）× 1000。</b>
      分子是<b>全店成交</b>，分母<b>只算这两类曝光</b>——店播、商卡、私域、搜索承接的成交<b>只进分子不进分母</b>，在这些场做成交 GPM 纯涨；
      而商品笔记曝光全额进分母，低价高频发笔记是直接在稀释 GPM。
      K 播曝光虽进分母但量级极小（你名下仅占 ${(o.impMix.nqKli / (o.impMix.nqPub + o.impMix.nqKli) * 100).toFixed(1)}%），做 K 播近似等于净增分子。
      详见「GPM 口径」Tab。
    </div>
    <div class="grid2">
      <div>
        <div class="mini-head">① 友好商家怎么做大（${o.growCnt} 家）</div>
        <div class="muted" style="font-size:13px;line-height:1.8">
          看每个场域的经营效率与勤奋度，对标友好 B4+ 中位数：客单 ¥${o.bench.price} · 复购 ${o.bench.rebuy}% ·
          每篇笔记带曝光 ${(o.bench.impPerNote / 10000).toFixed(1)} 万 · 每篇带 GMV ¥${num(o.bench.gmvPerNote)}。
          做大靠两件事：补空白场域（店播/K播未开的）、提单位动作效率。
        </div>
      </div>
      <div>
        <div class="mini-head">② 非友好怎么变友好（${(o.upliftTier.P0 || 0) + (o.upliftTier.P1 || 0)} 家值得跟）</div>
        <div class="muted" style="font-size:13px;line-height:1.8">
          P0 优先攻坚 <b>${o.upliftTier.P0 || 0}</b> 家（${wan(o.upliftTierGmv.P0 || 0)}）· P1 重点跟进 <b>${o.upliftTier.P1 || 0}</b> 家（${wan(o.upliftTierGmv.P1 || 0)}）。
          主路径分布：提客单 ${o.upliftPath['提客单'] || 0} 家 · 补转化承接 ${o.upliftPath['补转化承接'] || 0} 家 · 压低效曝光 ${o.upliftPath['压低效曝光'] || 0} 家。
        </div>
      </div>
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
    <div class="mini-head">临门一脚 ${o.nearCnt} 家 · ${wan(o.nearGmv)}（按缺失项）</div>
    <div>${nearBy}</div>
    <div class="mini-head">按距门槛的达标度分档 —— 越靠前越快能过线</div>
    <div>${nearBk}</div>
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
  setupFilters(D.near, { miss: true, bucket: true });
  let list = applyFilter(D.near, { miss: true });
  const bk = $('f-bucket') ? $('f-bucket').value : '';
  if (bk) list = list.filter(r => bucketOf(r) === bk);
  const o = D.overview;
  $('filter-hint').textContent = `显示 ${list.length} / ${D.near.length} 家 · 合计 ${wan(list.reduce((s, r) => s + r.gmv, 0))}`;

  const rows = list.map(r => {
    const pct = Math.min(r.gappct, 100);
    const cls = r.gappct >= 80 ? 'ok' : r.gappct >= 50 ? 'warn' : '';
    const need = r.gapunit === 'GPM'
      ? `GPM ${Math.round(r.gpm)} → ${o.gpmStd}，差 <b>${r.gapv}</b>`
      : r.gapunit === '月DGMV' ? `月 DGMV ${wan(r.gmv)} → 1 万，差 <b>¥${num(r.gapv)}</b>`
        : r.miss.join('、');
    return `<tr class="row-click" data-id="${r.id}" data-src="near">
      <td class="shop">${esc(r.name)}</td>
      <td>${r.b}</td>
      <td class="muted">${esc(r.cat)}</td>
      <td>${r.miss.map(m => `<span class="tag miss">${m}</span>`).join('')}</td>
      <td class="num"><b style="color:${r.gappct >= 80 ? '#389e0d' : r.gappct >= 50 ? '#d46b08' : '#cf1322'}">${r.gappct}%</b></td>
      <td style="min-width:90px"><div class="bar-wrap"><div class="bar ${cls}" style="width:${pct}%"></div></div></td>
      <td class="muted">${need}</td>
      <td class="num">${wan(r.gmv)}</td>
      <td class="num">${num(Math.round(r.gpm))}</td>
      <td class="num">${impFmt(r.imp)}</td>
    </tr>`;
  }).join('');

  const bkOrder = ['≥80%（一步之遥）', '60-80%', '40-60%', '20-40%', '<20%（差距大）'];
  const bkPills = bkOrder.filter(k => o.nearBucket[k]).map(k =>
    `<span class="pill">${k}：<b>${o.nearBucket[k]}</b> 家</span>`).join('');

  return `<div class="section">
    <div class="section-title">临门一脚池 <span class="badge">仅缺 1 项 · ${D.near.length} 家</span></div>
    <div class="section-sub">已按<b>距门槛的差距从小到大</b>排序，越靠前越快能过线。「达标度」= 当前值 ÷ 门槛值。</div>
    <div class="callout info">
      <b>怎么用：</b>从上往下打。达标度 ≥80% 的 <b>${o.nearBucket['≥80%（一步之遥）'] || 0}</b> 家是一步之遥——
      像 Clean Circle 的海外店 GPM 只差 1.2 就过线、隆兴大米差 11.4，本月稍微推一把就能进；
      而排在后面达标度不足 20% 的 ${o.nearBucket['<20%（差距大）'] || 0} 家虽然也"只缺一项"，但那一项差得远，不值得优先投入。
      只缺 <b>月 DGMV</b> 的 ${o.nearBy['月DGMV'] || 0} 家 GPM 已达标，差的只是 1 万的绝对量，一场直播或一次活动即可。
    </div>
    <div style="margin-bottom:12px">${bkPills}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>B等级</th><th>主营类目</th><th>缺失项</th>
      <th class="num">达标度</th><th>进度</th><th>还差多少</th><th class="num">月GMV</th><th class="num">GPM</th><th class="num">月曝光</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

function bucketOf(r) {
  return r.gappct >= 80 ? '≥80%（一步之遥）' : r.gappct >= 60 ? '60-80%'
    : r.gappct >= 40 ? '40-60%' : r.gappct >= 20 ? '20-40%' : '<20%（差距大）';
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
  const o = D.overview, bch = o.bench || {};
  // grow / uplift 走场域专用面板
  if (r.acts || r.path) return fieldPanel(r);
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

/* ============ ① 友好商家做大 ============ */
function vGrow() {
  const G = D.grow || [], o = D.overview, bch = o.bench || {};
  setupFilters(G, {});
  const list = applyFilter(G, {});
  $('filter-hint').textContent = `显示 ${list.length} / ${G.length} 家`;

  const cmp = (v, base, rev) => {
    if (!base) return '';
    const x = v / base;
    const good = rev ? x <= 1 : x >= 1;
    return `<span style="color:${good ? '#389e0d' : x >= 0.6 ? '#d46b08' : '#cf1322'}">${v > 0 ? (x * 100).toFixed(0) + '%' : '-'}</span>`;
  };

  const rows = list.map(r => `<tr class="row-click" data-id="${r.id}" data-src="grow">
    <td class="shop">${esc(r.name)}</td>
    <td>${r.b}</td>
    <td class="num">${wan(r.gmv)}</td>
    <td class="num">${num(Math.round(r.gpm))}</td>
    <td><span class="tag diag-a">${r.main} ${r.mainP}%</span></td>
    <td class="num">${r.note}</td>
    <td class="num">${r.liveh || '-'}</td>
    <td class="num">${r.impPerNote ? (r.impPerNote / 10000).toFixed(1) + '万' : '-'}<br><span class="muted">${cmp(r.impPerNote, bch.impPerNote)}</span></td>
    <td class="num">${r.gmvPerNote ? '¥' + num(r.gmvPerNote) : '-'}<br><span class="muted">${cmp(r.gmvPerNote, bch.gmvPerNote)}</span></td>
    <td class="num">¥${r.price}<br><span class="muted">${cmp(r.price, bch.price)}</span></td>
    <td class="num">${r.rebuy}%<br><span class="muted">${cmp(r.rebuy, bch.rebuy)}</span></td>
    <td>${r.acts.slice(0, 2).map(a => `<span class="tag t-warn">${a.k}</span>`).join(' ')}</td>
  </tr>`).join('');

  const blankStat = {};
  G.forEach(r => (r.blank || []).forEach(k => blankStat[k] = (blankStat[k] || 0) + 1));
  const blankPills = Object.entries(blankStat).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="pill">${k}未开：<b>${v}</b> 家</span>`).join('');

  return `<div class="section">
    <div class="section-title">① 友好商家怎么做大 <span class="badge">${G.length} 家</span></div>
    <div class="section-sub">已经在名单里，接下来看每个场域的<b>经营效率</b>（单位动作能换多少曝光和成交）和<b>勤奋度</b>（做了多少动作）。对标锚 = 友好 B4+ ${bch.n} 家的中位数。</div>

    <div class="callout info">
      <b>友好 B4+ 基准盘：</b>客单价 ¥${bch.price} · 90天复购 ${bch.rebuy}% · 每篇笔记带曝光 ${(bch.impPerNote / 10000).toFixed(1)} 万 · 每篇笔记带 GMV ¥${num(bch.gmvPerNote)} · 月发笔记 ${bch.note} 篇 · GPM ${bch.gpm}。
      表里每个效率指标下方的百分比就是「该商家 ÷ 这个基准」，绿色达标、红色明显偏低。
    </div>
    <div class="callout warn">
      <b>做大的两条线：</b>一是<b>补空白场域</b>——${blankPills || '无'}。K 播和店播的曝光在 GPM 分母里权重极低（详见「GPM 口径」Tab），在这两个场做出成交，等于净增分子不增分母，是提 GPM 最划算的动作。
      二是<b>提单位效率</b>——同样发 100 篇笔记，有人换来 12 万曝光/篇、有人只有 2 万，差距在内容质量不在数量。
    </div>

    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>B等级</th><th class="num">月GMV</th><th class="num">GPM</th><th>主场域</th>
      <th class="num">笔记</th><th class="num">播时长</th><th class="num">曝光/篇<br><span class="muted">vs基准</span></th>
      <th class="num">GMV/篇<br><span class="muted">vs基准</span></th><th class="num">客单<br><span class="muted">vs基准</span></th>
      <th class="num">复购<br><span class="muted">vs基准</span></th><th>建议动作</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="12" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ============ ② 非友好转友好 ============ */
function vUplift() {
  const U = D.uplift || [], o = D.overview, bch = o.bench || {};
  setupFilters(U, { prio: true, path: true });
  let list = applyFilter(U, {});
  const pr = $('f-prio').value, pa = $('f-path').value;
  if (pr) list = list.filter(r => r.tier === pr);
  if (pa) list = list.filter(r => r.path === pa);
  $('filter-hint').textContent = `显示 ${list.length} / ${U.length} 家 · 合计 ${wan(list.reduce((s, r) => s + r.gmv, 0))}`;

  const tierCls = { P0: 't-danger', P1: 't-warn', P2: 't-watch', P3: 'gen' };
  const pathCls = { '提客单': 'diag-b', '压低效曝光': 'diag-a', '补转化承接': 'diag-c', '先起量': 'gen', '已达 GPM': 't-safe' };

  const rows = list.map(r => `<tr class="row-click" data-id="${r.id}" data-src="uplift">
    <td><span class="tag ${tierCls[r.tier]}">${r.tier}</span></td>
    <td class="shop">${esc(r.name)}</td>
    <td>${r.b}</td>
    <td class="num">${wan(r.gmv)}</td>
    <td class="num">${num(Math.round(r.gpm))}</td>
    <td class="num"><b style="color:${r.gpmRatio >= 70 ? '#389e0d' : r.gpmRatio >= 40 ? '#d46b08' : '#cf1322'}">${r.gpmRatio}%</b></td>
    <td><span class="tag ${pathCls[r.path] || 'gen'}">${r.path}</span></td>
    <td class="num">${r.needGmv ? wan(r.needGmv) : '-'}${r.gmvUpPct != null ? `<br><span class="muted">+${r.gmvUpPct}%</span>` : ''}</td>
    <td class="num">${r.maxImp ? impFmt(r.maxImp) : '-'}${r.impCutPct ? `<br><span class="muted">压 ${r.impCutPct}%</span>` : ''}</td>
    <td class="num">${r.note}</td>
    <td class="num">¥${r.price}</td>
    <td class="num">${impFmt(r.imp)}</td>
  </tr>`).join('');

  const tg = o.upliftTierGmv || {};
  const tierPills = ['P0', 'P1', 'P2', 'P3'].filter(t => o.upliftTier[t]).map(t =>
    `<span class="pill">${t}：<b>${o.upliftTier[t]}</b> 家 · ${wan(tg[t] || 0)}</span>`).join('');
  const pathPills = Object.entries(o.upliftPath || {}).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="pill">${k}：<b>${v}</b> 家</span>`).join('');

  return `<div class="section">
    <div class="section-title">② 非友好商家怎么变友好 <span class="badge">${U.length} 家有 6 月经营数据</span></div>
    <div class="section-sub">绝大多数卡在 GPM。这里把 GPM 拆成分子分母两条数学路径，并按「达标度 × 体量」给优先级。</div>

    <div class="callout danger">
      <b>先看 P0 的 ${o.upliftTier.P0 || 0} 家（${wan(tg.P0 || 0)}）</b>——GPM 已过门槛 70%、月 GMV 又在 10 万以上，是本月最该攻的。
      比如 Clean Circle 的海外店 GPM 169、只差 1 分，GMV 涨 1% 就过线；疆之隅 GPM 138，GMV 涨 23% 或曝光压掉 19% 都行。
    </div>
    <div class="callout info">
      <b>GPM = 月 GMV ÷（公域四渠道曝光 + K播商品曝光）× 1000。</b>所以只有两条路：
      <b>抬分子</b>（在现有曝光下多做成交，表里「需 GMV 到」列给了具体数字）或 <b>压分母</b>（砍掉不产出的低效曝光，「曝光需压到」列给上限）。
      注意店播和商卡的曝光<b>根本不进分母</b>——在这两个场做成交是纯赚，这是最被低估的一条路。
    </div>

    <div class="mini-head">优先级分布</div>
    <div>${tierPills}</div>
    <div class="mini-head">主路径分布（按最短板判定）</div>
    <div>${pathPills}</div>

    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>优先级</th><th>店铺</th><th>B等级</th><th class="num">月GMV</th><th class="num">GPM</th>
      <th class="num">达标度</th><th>主路径</th><th class="num">需GMV到</th><th class="num">或曝光压到</th>
      <th class="num">笔记</th><th class="num">客单</th><th class="num">月曝光</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="12" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
  </div>`;
}

/* ---- 场域诊断面板（grow / uplift 共用）---- */
function fieldPanel(r) {
  const o = D.overview, bch = o.bench || {};
  const den = r.imp || 1;
  const cmpRow = (label, v, base, unit, rev) => {
    if (!base) return `<tr><td>${label}</td><td class="num">${unit === '¥' ? '¥' + num(v) : v + (unit || '')}</td><td class="num muted">-</td><td>-</td></tr>`;
    const x = base ? v / base : 0;
    const good = rev ? (v > 0 && x <= 1) : x >= 1;
    const col = v <= 0 ? '#8b8fa3' : good ? '#389e0d' : x >= 0.6 ? '#d46b08' : '#cf1322';
    return `<tr><td>${label}</td><td class="num">${unit === '¥' ? '¥' + num(v) : v + (unit || '')}</td>
      <td class="num muted">${unit === '¥' ? '¥' + num(base) : base + (unit || '')}</td>
      <td class="num" style="color:${col}">${v > 0 ? (x * 100).toFixed(0) + '%' : '-'}</td></tr>`;
  };

  // 分母构成
  const denRows = `
    <tr><td>公域四渠道曝光<span class="tag miss" style="margin-left:6px">计入分母</span></td><td class="num">${impFmt(r.pub)}</td><td class="num">${(r.pub / den * 100).toFixed(1)}%</td></tr>
    <tr><td>K播商品曝光<span class="tag miss" style="margin-left:6px">计入分母</span></td><td class="num">${impFmt(r.kli)}</td><td class="num">${(r.kli / den * 100).toFixed(1)}%</td></tr>
    <tr><td class="muted">店播 / 商卡 / 私域曝光<span class="tag t-safe" style="margin-left:6px">不计分母</span></td><td class="num muted">—</td><td class="num muted">0%</td></tr>`;

  // 载体成交
  const dtot = (r.dlive + r.dnote + r.dcard + r.dk) || 1;
  const carr = [['店播', r.dlive, '不进分母'], ['商品笔记', r.dnote, '进分母'],
                ['商卡/其他', r.dcard, '不进分母'], ['K播', r.dk, '进分母(权重低)']]
    .map(([k, v, tip]) => `<div class="dist-row"><div class="dist-label">${k}</div>
      <div class="dist-bar-wrap"><div class="dist-bar ${tip.startsWith('不') ? 'g' : ''}" style="width:${v / dtot * 100}%"></div></div>
      <div class="dist-val">${wan(v)} · ${(v / dtot * 100).toFixed(0)}% <span class="muted">${tip}</span></div></div>`).join('');

  const acts = (r.acts || []).map(a =>
    `<div class="risk-line mid">• <b>${esc(a.k)}</b>：${esc(a.txt)}</div>`).join('');

  const pathBox = r.path ? `<div class="callout ${r.gpmRatio >= 70 ? 'warn' : 'danger'}" style="margin:0 0 10px">
      <b>${r.tier} · 主路径：${r.path}</b>　${esc(r.why || '')}<br>
      当前 GPM ${Math.round(r.gpm)}（门槛 ${o.gpmStd} 的 ${r.gpmRatio}%）。
      ${r.needGmv ? `保持曝光不变，月 GMV 要做到 <b>${wan(r.needGmv)}</b>（${r.gmvUpPct != null ? '+' + r.gmvUpPct + '%' : '—'}）；` : ''}
      ${r.maxImp ? `或保持 GMV 不变，把曝光压到 <b>${impFmt(r.maxImp)}</b> 以内（砍掉 ${r.impCutPct}%）。` : ''}
      <br><b>第三条路：</b>在<b>店播 / 商卡</b>做成交——这两个场的曝光不进 GPM 分母，成交却计入分子，是唯一不推高分母就能抬 GPM 的场域。
    </div>` : '';

  return `<div class="panel">
    <div class="panel-title">${esc(r.name)} · ${esc(r.cat)} · ${r.b}
      <a href="${shopUrl(r.id)}" target="_blank" style="font-weight:400;font-size:12px;margin-left:8px">苍穹后台 ↗</a></div>
    ${pathBox}
    <div class="grid2">
      <div>
        <div class="mini-head">GPM 分母构成（哪些曝光在拖累）</div>
        <table class="inner"><thead><tr><th>曝光来源</th><th class="num">曝光量</th><th class="num">占比</th></tr></thead>
        <tbody>${denRows}</tbody></table>

        <div class="mini-head">场域成交结构（分子从哪来）</div>
        ${carr}
      </div>
      <div>
        <div class="mini-head">经营效率 vs 友好B4+基准</div>
        <table class="inner"><thead><tr><th>指标</th><th class="num">本店</th><th class="num">基准</th><th class="num">达成</th></tr></thead>
        <tbody>
          ${cmpRow('每篇笔记带曝光', Math.round(r.impPerNote / 1000) / 10, Math.round(bch.impPerNote / 1000) / 10, '万')}
          ${cmpRow('每篇笔记带GMV', r.gmvPerNote, bch.gmvPerNote, '¥')}
          ${cmpRow('客单价', r.price, bch.price, '¥')}
          ${cmpRow('90天复购率', r.rebuy, bch.rebuy, '%')}
          ${cmpRow('GPM', Math.round(r.gpm), o.gpmStd, '')}
        </tbody></table>

        <div class="mini-head">勤奋度（本月动作量）</div>
        <table class="inner"><tbody>
          <tr><td>笔记发布</td><td class="num">${r.note} 篇<span class="muted">（商品笔记 ${r.gnote}）</span></td><td class="num muted">基准 ${bch.note} 篇</td></tr>
          <tr><td>店播</td><td class="num">${r.liven} 场 / ${r.liveh} 小时</td><td class="num muted">${r.gmvPerLiveH ? '每小时 ¥' + num(r.gmvPerLiveH) : '未开播'}</td></tr>
          <tr><td>群聊活跃</td><td class="num">${r.grp} 天</td><td class="num muted">私域不进分母</td></tr>
          <tr><td>千帆后台活跃</td><td class="num">${r.act} 天</td><td class="num muted">经营意愿信号</td></tr>
          <tr><td>广告 DGMV</td><td class="num">${wan(r.dad)}</td><td class="num muted">广告曝光计入分母</td></tr>
        </tbody></table>

        ${acts ? `<div class="mini-head">建议动作</div>${acts}` : ''}
      </div>
    </div>
  </div>`;
}

/* ============ 合规专项 ============ */
function vComp() {
  const C = D.compliance || [];
  setupFilters(C, { sev: true });
  let list = applyFilter(C, {});
  const sv = $('f-sev').value;
  if (sv) list = list.filter(r => r.sev === sv);
  const o = D.overview;
  $('filter-hint').textContent = `显示 ${list.length} / ${C.length} 家`;

  const sevTag = { critical: '<span class="tag t-danger">🔴 友好·有风险</span>',
                   active: '<span class="tag t-warn">🟠 有成交</span>',
                   idle: '<span class="tag gen">⚪ 无成交</span>' };
  const rows = list.map(r => {
    const issues = [];
    r.comp.forEach(k => issues.push(`<span class="tag miss">${k}超限</span>`));
    if (r.nearPun) issues.push(`<span class="tag t-watch">违规 ${r.pun}/${r.punStd} 逼近</span>`);
    if (r.nearScore) issues.push(`<span class="tag t-watch">分数贴线</span>`);
    return `<tr class="row-click" data-id="${r.id}" data-src="compliance">
      <td class="shop">${esc(r.name)}${r.q ? ' <span class="tag t-safe">友好</span>' : ''}</td>
      <td>${sevTag[r.sev]}</td>
      <td>${r.b}</td>
      <td class="num">${wan(r.dgmv30)}</td>
      <td class="num" style="color:${r.pun > r.punStd ? '#cf1322' : r.pun >= 3 ? '#d46b08' : '#6b7280'}">${r.pun}<span class="muted">/${r.punStd}</span></td>
      <td class="num" style="color:${r.shop < r.shopStd ? '#cf1322' : r.shop < r.shopStd + 0.2 ? '#d46b08' : '#6b7280'}">${r.shop || '-'}</td>
      <td class="num" style="color:${r.goods < r.goodsStd ? '#cf1322' : r.goods < r.goodsStd + 0.2 ? '#d46b08' : '#6b7280'}">${r.goods || '-'}</td>
      <td>${issues.join(' ')}</td>
      <td class="num">${r.missn}</td>
    </tr>`;
  }).join('');

  const by = Object.entries(o.compBy || {}).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="pill">${k}超限：<b>${v}</b> 家</span>`).join('');

  return `<div class="section">
    <div class="section-title">合规专项 <span class="badge danger">${C.length} 家有合规问题或贴线</span></div>
    <div class="section-sub">合规是唯一「识别即剔除、T+1 生效」的判定项，不等月初刷新。这里收全部合规异常，不管它同时还缺几项。</div>
    <div class="callout warn">
      <b>为什么临门一脚里看不到合规项：</b>那个池子按定义只收「只缺 1 项」的商家，而合规出问题的商家通常同时还缺 GPM、GMV，缺项数 ≥2，就被排到后面去了——不是你名下没有合规问题，是它们被那个筛选逻辑挡住了。这个 Tab 专门补上。
    </div>
    <div class="callout danger">
      <b>眼下要盯的：</b>全盘 ${o.compCnt} 家存在合规异常或贴线，其中 <b>${o.compActive} 家近 30 天有实际成交</b>（合计 ${wan(o.compActiveGmv)}），是真正需要沟通的。剩下的基本是无成交的僵尸店。
      最急的一家是 <b>小熊早安旗舰店</b>——已是友好商家，但近 30 天严重违规已达 5 条顶格，再加一条就 T+1 直接剔除。
      另外阿珍的手作铺（6 条）、食验室（6 条）已经超限，茶颜悦色（3 条）在逼近。
    </div>
    <div style="margin-bottom:12px">${by}</div>
    <div class="table-wrap"><table>
      <thead><tr><th>店铺</th><th>状态</th><th>B等级</th><th class="num">近30天GMV</th>
      <th class="num">违规/上限</th><th class="num">店铺分</th><th class="num">商品分</th><th>问题</th><th class="num">总缺项</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="empty">无匹配数据</td></tr>'}</tbody></table></div>
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

      <h4>GPM 怎么算 —— 这里藏着经营指导的关键</h4>
      <code>GPM = 月 GMV ÷（公域四渠道曝光 + K播直播间商品曝光）× 1000</code>
      <div class="callout danger" style="margin:10px 0">
        <b>不同场域在 GPM 里的权重完全不同，这是最该讲给商家听的一点。</b>
        分子是<b>全店成交</b>（所有场域都算），分母却<b>只统计两类曝光</b>。也就是说：
        <ul style="margin:6px 0 0 20px">
          <li><b>店播、商卡、私域、搜索承接的成交 → 只进分子，不进分母</b>。在这些场每做 1 万成交，GPM 纯涨，没有任何代价。</li>
          <li><b>商品笔记的曝光 → 全额进分母</b>。发笔记冲曝光但不转化，是在直接稀释 GPM。</li>
          <li><b>K 播曝光 → 进分母，但量级极小</b>。你名下全部商家的 K 播曝光只占分母 2.9%，友好商家占 3.3%——K 播做成交几乎等同于"净增分子"。</li>
          <li><b>买手笔记曝光 → 已被移除，不进分母</b>（生产口径 2026-06 迭代时注释掉了这段）。</li>
          <li><b>广告曝光 → 计入分母，不剔除</b>。投流拉曝光如果 ROI 不够，同样会拉低 GPM。</li>
        </ul>
      </div>
      <b>分母的准确构成</b>（来自生产任务 SQL）：
      <ul>
        <li><b>公域四渠道</b>：MF双列 / MF内流 / 搜索双列 / 搜索内流，取自流量追踪表，含广告。载体范围限定为商品笔记、购物笔记、直播卡、笔记呼吸灯、任意门这五类。</li>
        <li><b>K播商品曝光</b>：K 播直播间内的商品曝光数。</li>
      </ul>
      <b>分子</b>：当月全部有效订单的 deal_gmv，不分场域、不分是否买手带货。

      <h4>由此推导的三条经营建议</h4>
      <ul>
        <li><b>低价高频发笔记是 GPM 杀手。</b>笔记曝光全额进分母，客单价低意味着同样曝光换来的 GMV 少。友好商家 2.0 版剔除的一大批商家就是这个画像——月均发 147 篇、货单价不足 50 元。</li>
        <li><b>把成交往店播和商卡引，是唯一"不推高分母"的抬升方式。</b>同样一笔成交，走商品笔记会同时推高分母，走店播只涨分子。</li>
        <li><b>曝光不是越多越好。</b>如果一部分内容只带来曝光不带来成交，砍掉它反而能提 GPM。看板里「曝光需压到」列给的就是这个上限。</li>
      </ul>

      <h4>行业标准值怎么定</h4>
      2.0 版把行业分成三类。休食属于 <b>🟡 发展行业</b>——用行业内相对标准刻画，取 GPM 分位值，休食在 P75 分位组，标准值 <code>${o.gpmStd}</code>（已从标准值表 <code>ods_ecm_redoc2hive_friendly_seller_gpm_standard_value_df</code> 核实）。
      同组还有美妆个护 230、服配内睡 190、家用 140、消费电子 160、图书 90、教育 100。成熟行业（女装、文玩、户外等）走绝对标准值，宠物家饰等走 P50。
      判定时<b>二级类目标准优先，行业级兜底</b>，两个都 JOIN 不到则直接判不达标。标准值季度刷新。

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

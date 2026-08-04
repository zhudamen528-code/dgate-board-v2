/* 休食组友好商家违规监控 */
const S = {};
let TAB = 'overview';
const F = { am: '', tier: '', kw: '' };
const EXP = new Set();   // 展开的行 key: 'am:xxx' / 'shop:xxx'

const TIER_LABEL = {
  disqualified: '🔴 已失格', critical: '🟠 临界', watch: '🟡 关注', safe: '⚪ 安全'
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('zh-CN');
const wan = n => (!n || isNaN(n)) ? '—' : (n >= 10000 ? (n / 10000).toFixed(1) + '万' : Math.round(n));

/* 苍穹 CRM 直链 */
const crmShop = sid => `https://crm.xiaohongshu.com/eccrm/merchant-detail/${sid}?isSellerId=true&type=basicInfo&crm_assign_my_tag=1`;
const crmItem = iid => `https://crm.xiaohongshu.com/crm/hawk/item/item/detail?itemId=${iid}`;
const crmNote = nid => `https://crm.xiaohongshu.com/crm/hawk/hawk/note/detail?discoveryId=${nid}&sellerNote=SellerDailyNote`;
const cNote = nid => `https://www.xiaohongshu.com/explore/${encodeURIComponent(nid)}`;

/* 违规对象 → 展示类型 + 可复制的对象 ID（AM 拿 ID 去苍穹/后台搜具体原因） */
function entityLink(r) {
  const t = r.entity || '—', id = r.entity_id || '';
  if (!id) return esc(t);
  const short = id.length > 12 ? id.slice(0, 6) + '…' + id.slice(-4) : id;
  let jump = '';
  if (t === '商品') jump = `<a href="${crmItem(id)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="jump" title="苍穹商品详情">↗</a>`;
  else if (t === '笔记') jump = `<a href="${crmNote(id)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="jump" title="苍穹·单篇笔记分析">↗</a>`;
  else if (t === '店铺') jump = `<a href="${crmShop(id)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="jump" title="苍穹店铺详情">↗</a>`;
  return `<span class="ent"><span class="ent-t">${esc(t)}</span>`
    + `<code class="eid" data-id="${esc(id)}" title="点击复制完整 ID：${esc(id)}">${esc(short)}</code>`
    + `<span class="copy" data-id="${esc(id)}" title="复制对象 ID">⧉</span>${jump}</span>`;
}

/* 点击复制对象 ID */
function bindCopy() {
  document.querySelectorAll('.copy-all').forEach(el => {
    el.onclick = ev => {
      ev.stopPropagation();
      const txt = el.dataset.ids || '';
      const done = () => {
        const old = el.textContent;
        el.textContent = '已复制 ✓';
        setTimeout(() => { el.textContent = old; }, 1100);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(done).catch(() => fallback(txt, done));
      } else fallback(txt, done);
    };
  });
  document.querySelectorAll('.eid,.copy').forEach(el => {
    el.onclick = ev => {
      ev.stopPropagation();
      const id = el.dataset.id;
      const done = () => {
        const old = el.textContent;
        el.textContent = '已复制';
        el.classList.add('copied');
        setTimeout(() => { el.textContent = old; el.classList.remove('copied'); }, 900);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(id).then(done).catch(() => fallback(id, done));
      } else fallback(id, done);
    };
  });
  function fallback(txt, cb) {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { }
    document.body.removeChild(ta);
  }
}
function shopLink(sid, name, cls) {
  if (!sid) return `<span class="${cls || 'shop'}">${esc(name)}</span>`;
  return `<a class="${cls || 'shop'} crm-link" href="${crmShop(sid)}" target="_blank" rel="noopener"
    onclick="event.stopPropagation()" title="在苍穹打开店铺详情">${esc(name)}<span class="ext">↗</span></a>`;
}

async function load() {
  const names = ['summary', 'shops', 'am', 'detail_new', 'detail_active', 'domains'];
  const res = await Promise.all(names.map(n => fetch(`data/${n}.json?t=${Date.now()}`).then(r => r.json()).catch(() => null)));
  names.forEach((n, i) => S[n] = res[i]);
  initHeader(); initFilters(); bindTabs(); render();
}

function initHeader() {
  const s = S.summary || {};
  document.getElementById('subtitle').textContent =
    `${s.roster_total || 0} 家友好商家 · ${s.am_count || 0} 位 AM · 数据日期 ${s.day || '—'}`;
  document.getElementById('meta').innerHTML =
    `红线口径：<b>生效中严重违规 ≥ ${s.red_line} 条即失格</b>（按违规单 parent_uid 去重）｜临界预警线 ${s.warn_line} 条｜生成于 ${esc(s.generated_at || '')}`
    + `<br>用法：<b>点店铺名</b>跳苍穹商家详情；<b>点违规对象 ID 可复制</b>，到苍穹或违规后台搜该 ID 查看具体违规原因与证据；ID 后的 ↗ 直接打开对应详情页。`;
}

function initFilters() {
  const sel = document.getElementById('f-am');
  (S.am || []).forEach(a => {
    const o = document.createElement('option');
    o.value = a.am; o.textContent = `${a.am}（${a.shops}家）`;
    sel.appendChild(o);
  });
  sel.onchange = e => { F.am = e.target.value; render(); };
  document.getElementById('f-tier').onchange = e => { F.tier = e.target.value; render(); };
  document.getElementById('f-kw').oninput = e => { F.kw = e.target.value.trim(); render(); };
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); TAB = t.dataset.tab; render();
  });
}

function shopFilter(list) {
  return list.filter(s =>
    (!F.am || s.am === F.am) &&
    (!F.tier || s.tier === F.tier) &&
    (!F.kw || (s.shop_name || '').includes(F.kw)));
}
function rowFilter(list) {
  const tierMap = {};
  (S.shops || []).forEach(s => tierMap[s.seller_id] = s.tier);
  return list.filter(r =>
    (!F.am || r.am === F.am) &&
    (!F.tier || tierMap[r.seller_id] === F.tier) &&
    (!F.kw || (r.shop_name || '').includes(F.kw)));
}

function render() {
  document.getElementById('filters').style.display = TAB === 'overview' ? 'none' : 'flex';
  const app = document.getElementById('app');
  const fn = { overview: vOverview, am: vAM, redline: vRedline, new: vNew, active: vActive }[TAB];
  app.innerHTML = fn ? fn() : '';
  const hint = document.getElementById('filter-hint');
  if (hint) hint.textContent = (F.am || F.tier || F.kw) ? '已筛选' : '未筛选 · 展示全组';
  bindExpand();
  bindCopy();
}

function bindExpand() {
  document.querySelectorAll('tr.row-click').forEach(tr => {
    tr.onclick = ev => {
      if (ev.target.closest('a')) return;
      const k = tr.dataset.exp;
      if (!k) return;
      EXP.has(k) ? EXP.delete(k) : EXP.add(k);
      render();
    };
  });
}

/* ── 总览 ── */
function vOverview() {
  const s = S.summary || {}, t = s.tier || {};
  const shops = S.shops || [];
  const dq = shops.filter(x => x.tier === 'disqualified');
  const cr = shops.filter(x => x.tier === 'critical');
  const wt = shops.filter(x => x.tier === 'watch');

  let alert = '';
  if (dq.length) {
    alert += `<div class="callout danger"><b>🔴 ${dq.length} 家已越过友好商家红线</b>（生效中严重违规 ≥ ${s.red_line} 条），资格已不达标，需 AM 立即介入整改或走退出流程：<br>` +
      dq.map(x => `· <b>${esc(x.shop_name)}</b> ${x.sev_active} 条 — ${esc(x.am)}`).join('<br>') + '</div>';
  }
  if (cr.length) {
    alert += `<div class="callout warn"><b>🟠 ${cr.length} 家逼近红线</b>（${s.warn_line}-${s.red_line - 1} 条），再新增 ${cr.map(x => x.gap).join('/')} 条即失格，这批是本周最该沟通的：<br>` +
      cr.map(x => `· <b>${esc(x.shop_name)}</b> ${x.sev_active} 条，距红线还差 ${x.gap} 条 — ${esc(x.am)}`).join('<br>') + '</div>';
  }
  if (!dq.length && !cr.length) alert = `<div class="callout info">✅ 当前无商家越线或逼近红线，全组友好商家资格健康。</div>`;

  const newSevTip = s.new_severe > 0
    ? `<div class="callout danger"><b>⚠️ 昨日新增 ${s.new_severe} 条严重违规</b>，涉及 ${s.new_severe_shops} 家商家，直接消耗红线额度，请优先处理「昨日新增」页。</div>`
    : `<div class="callout info">昨日<b>无新增严重违规</b>，新增的 ${fmt(s.new_orders)} 条均为一般违规或社区处置，不占用红线额度。</div>`;

  return `
  <div class="section">
    <div class="section-title">红线达标情况 <span class="badge">按生效中严重违规分档</span></div>
    <div class="section-sub">友好商家资格要求：处罚中的严重违规少于 ${s.red_line} 条。下方为 ${fmt(s.roster_total)} 家的分档结果。</div>
    <div class="kpi-row">
      <div class="kpi danger"><div class="kpi-label">🔴 已失格 ≥${s.red_line}条</div><div class="kpi-val danger">${t.disqualified || 0}</div><div class="kpi-sub">资格不达标</div></div>
      <div class="kpi warn"><div class="kpi-label">🟠 临界 ${s.warn_line}-${s.red_line - 1}条</div><div class="kpi-val warn">${t.critical || 0}</div><div class="kpi-sub">再犯即出局</div></div>
      <div class="kpi"><div class="kpi-label">🟡 关注 1-${s.warn_line - 1}条</div><div class="kpi-val">${t.watch || 0}</div><div class="kpi-sub">有严重违规在身</div></div>
      <div class="kpi ok"><div class="kpi-label">⚪ 安全 0条</div><div class="kpi-val ok">${t.safe || 0}</div><div class="kpi-sub">无生效中严重违规</div></div>
    </div>
  </div>
  ${alert}
  <div class="section">
    <div class="section-title">两个口径速览 <span class="badge">数据日期 ${esc(s.day)}</span></div>
    <div class="section-sub">「昨日新增」看当天发生了什么；「生效中」看商家身上此刻还挂着什么处罚。均按违规单去重。</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">昨日新增违规单</div><div class="kpi-val">${fmt(s.new_orders)}</div><div class="kpi-sub">涉及 ${s.new_shops} 家商家</div></div>
      <div class="kpi ${s.new_severe ? 'danger' : ''}"><div class="kpi-label">其中严重违规</div><div class="kpi-val ${s.new_severe ? 'danger' : 'ok'}">${fmt(s.new_severe)}</div><div class="kpi-sub">${s.new_severe ? s.new_severe_shops + ' 家消耗红线额度' : '未消耗红线额度'}</div></div>
      <div class="kpi danger"><div class="kpi-label">生效中严重违规</div><div class="kpi-val danger">${fmt(s.sev_active_orders)}</div><div class="kpi-sub">涉及 ${s.sev_active_shops} 家 · 红线判定依据</div></div>
      <div class="kpi warn"><div class="kpi-label">生效中影响流量</div><div class="kpi-val warn">${fmt(s.aff_active_orders)}</div><div class="kpi-sub">${s.aff_active_shops} 家 · 一般违规但正在限流</div></div>
    </div>
  </div>
  ${newSevTip}
  <div class="section">
    <div class="section-title">分 AM 商家清单 <span class="badge">按风险排序</span></div>
    <div class="section-sub">每位 AM 名下<b>有生效中严重违规</b>的商家直接列出，无需点击。安全商家已折叠，可展开查看。</div>
    ${amGroupedShops()}
  </div>`;
}

/* 总览：按 AM 分组，直接铺开名下有风险的商家 */
function amGroupedShops() {
  const s = S.summary || {};
  const byAm = {};
  (S.shops || []).forEach(x => (byAm[x.am] = byAm[x.am] || []).push(x));
  const order = (S.am || []).map(a => a.am);
  Object.keys(byAm).forEach(a => { if (!order.includes(a)) order.push(a); });

  return order.map(am => {
    const list = byAm[am] || [];
    const risky = list.filter(x => x.tier !== 'safe')
      .sort((a, b) => b.sev_active - a.sev_active || b.dgmv_30d - a.dgmv_30d);
    const safe = list.filter(x => x.tier === 'safe');
    const stat = (S.am || []).find(a => a.am === am) || {};
    const chips = [
      stat.disqualified ? `<span class="chip d">🔴 失格 ${stat.disqualified}</span>` : '',
      stat.critical ? `<span class="chip c">🟠 临界 ${stat.critical}</span>` : '',
      stat.watch ? `<span class="chip w">🟡 关注 ${stat.watch}</span>` : '',
      `<span class="chip s">⚪ 安全 ${stat.safe || safe.length}</span>`,
      stat.new_total ? `<span class="chip n">昨日新增 ${stat.new_total} 条</span>` : '',
    ].filter(Boolean).join('');

    const rows = risky.map(x => {
      const key = 'shop:' + x.seller_id;
      const open = EXP.has(key);
      const cells = [
        `<span class="clickable">${open ? '▾' : '▸'}</span> ${shopLink(x.seller_id, x.shop_name)}`,
        `<span class="tag t-${x.tier}">${TIER_LABEL[x.tier]}</span>`,
        `<span class="num">${x.sev_active}</span>`,
        `<span class="num">${x.tier === 'disqualified' ? '已超 ' + (x.sev_active - s.red_line + 1) : x.gap + ' 条'}</span>`,
        `<span class="num">${x.new_total || '—'}</span>`,
        `<span class="num">${x.aff_active || '—'}</span>`,
        esc(x.b_level || '—'),
        `<span class="num">${wan(x.dgmv_30d)}</span>`,
      ];
      let h = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      if (open) h += `<tr class="sub-row"><td colspan="8">${shopViolationPanel(x.seller_id, x.shop_name)}</td></tr>`;
      return h;
    }).join('');

    const safeKey = 'safe:' + am;
    const safeOpen = EXP.has(safeKey);
    const safeBlock = safe.length ? `
      <div class="safe-toggle row-click" data-exp="${esc(safeKey)}">${safeOpen ? '▾' : '▸'} ⚪ 安全商家 ${safe.length} 家（无生效中严重违规）</div>
      ${safeOpen ? `<div class="safe-list">${safe.sort((a, b) => b.dgmv_30d - a.dgmv_30d)
        .map(x => `${shopLink(x.seller_id, x.shop_name, 'safe-chip')}`).join('')}</div>` : ''}` : '';

    return `<div class="am-block">
      <div class="am-head"><span class="am-name">${esc(am)}</span>
        <span class="am-count">${list.length} 家友好商家</span>${chips}</div>
      ${risky.length ? `<table class="inner"><thead><tr>
        <th>商家</th><th>档位</th><th>生效中严重</th><th>距红线</th><th>昨日新增</th><th>生效中限流</th><th>B等级</th><th>近30天DGMV</th>
      </tr></thead><tbody>${rows}</tbody></table>`
        : '<div class="all-clear">✅ 名下无商家存在生效中严重违规</div>'}
      ${safeBlock}
    </div>`;
  }).join('');
}

/* 简版商家表（可下钻），用于总览/失格/临界等小列表 */
function shopMiniTable(list) {
  const head = ['商家', 'AM', '生效中严重违规', '距红线', '昨日新增', '近30天DGMV'];
  const body = list.map(x => {
    const key = 'shop:' + x.seller_id;
    const open = EXP.has(key);
    const cells = [
      `<span class="clickable">${open ? '▾' : '▸'}</span> ${shopLink(x.seller_id, x.shop_name)}`,
      esc(x.am),
      `<span class="num">${x.sev_active}</span>`,
      `<span class="num">${x.tier === 'disqualified' ? '已超 ' + (x.sev_active - S.summary.red_line + 1) : x.gap + ' 条'}</span>`,
      `<span class="num">${x.new_total || '—'}</span>`,
      `<span class="num">${wan(x.dgmv_30d)}</span>`,
    ];
    let html = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    if (open) html += `<tr class="sub-row"><td colspan="${head.length}">${shopViolationPanel(x.seller_id, x.shop_name)}</td></tr>`;
    return html;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ── 红线台账 ── */
function vRedline() {
  const s = S.summary || {};
  const list = shopFilter(S.shops || []);
  const head = ['商家', 'AM', '档位', '生效中严重违规', '红线进度', '距红线', '昨日新增', '生效中限流', 'B等级', '近30天DGMV', '建联'];
  const body = list.map(x => {
    const pct = Math.min(100, Math.round(x.sev_active / s.red_line * 100));
    const cls = x.tier === 'disqualified' ? '' : (x.tier === 'critical' ? 'warn' : 'ok');
    const key = 'shop:' + x.seller_id;
    const open = EXP.has(key);
    const cells = [
      `<span class="clickable">${open ? '▾' : '▸'}</span> ${shopLink(x.seller_id, x.shop_name)}`,
      esc(x.am),
      `<span class="tag t-${x.tier}">${TIER_LABEL[x.tier]}</span>`,
      `<span class="num">${x.sev_active}</span>`,
      `<div class="bar-wrap"><div class="bar ${cls}" style="width:${pct}%"></div></div>`,
      `<span class="num">${x.tier === 'disqualified' ? '已超 ' + (x.sev_active - s.red_line + 1) : x.gap}</span>`,
      `<span class="num">${x.new_total || '—'}</span>`,
      `<span class="num">${x.aff_active || '—'}</span>`,
      esc(x.b_level || '—'),
      `<span class="num">${wan(x.dgmv_30d)}</span>`,
      x.linked ? '已建联' : '<span class="muted">未建联</span>',
    ];
    let html = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    if (open) html += `<tr class="sub-row"><td colspan="${head.length}">${shopViolationPanel(x.seller_id, x.shop_name)}</td></tr>`;
    return html;
  }).join('');
  return `<div class="section">
    <div class="section-title">红线台账 <span class="badge">${list.length} / ${fmt(s.roster_total)} 家</span></div>
    <div class="section-sub">全量友好商家的红线达标明细。「距红线」= 还能再承受多少条严重违规；已失格的显示超出条数。<b>点击商家展开违规明细</b>。</div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>` : '<div class="empty">无匹配商家</div>'}
  </div>`;
}

/* ── 昨日新增 ── */
function vNew() {
  const s = S.summary || {};
  const list = rowFilter(S.detail_new || []);
  const sev = list.filter(r => r.severe);
  const dom = (S.domains || {}).new || [];
  return `
  <div class="section">
    <div class="section-title">昨日新增违规 <span class="badge">${esc(s.day)}</span> ${sev.length ? `<span class="badge danger">含 ${sev.length} 条严重</span>` : ''}</div>
    <div class="section-sub">口径：处罚时间 = ${esc(s.day)} 当天产生的违规单。<b>严重违规会直接消耗红线额度</b>，一般违规不计入红线但反映经营质量。</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">新增违规单</div><div class="kpi-val">${list.length}</div></div>
      <div class="kpi ${sev.length ? 'danger' : 'ok'}"><div class="kpi-label">其中严重违规</div><div class="kpi-val ${sev.length ? 'danger' : 'ok'}">${sev.length}</div></div>
      <div class="kpi"><div class="kpi-label">涉及商家</div><div class="kpi-val">${new Set(list.map(r => r.seller_id)).size}</div></div>
      <div class="kpi"><div class="kpi-label">影响流量的</div><div class="kpi-val">${list.filter(r => r.affect.length).length}</div></div>
    </div>
  </div>
  ${dom.length ? `<div class="section"><div class="section-title">新增违规风险域分布</div>${tbl(['风险域', '违规单数'], dom.map(d => [esc(d.domain), `<span class="num">${d.cnt}</span>`]))}</div>` : ''}
  <div class="section">
    <div class="section-title">新增明细 <span class="badge">${list.length} 条</span></div>
    <div class="section-sub">已按严重违规优先排序。白盒=商家后台可见，黑盒=商家看不到，AM 主动告知价值最高。</div>
    ${detailTable(list, true)}
  </div>`;
}

/* ── 生效中 ── */
function vActive() {
  const s = S.summary || {};
  const all = rowFilter(S.detail_active || []);
  const sev = all.filter(r => r.severe);
  const aff = all.filter(r => !r.severe);
  return `
  <div class="section">
    <div class="section-title">生效中违规 <span class="badge">处罚中 status=正在处罚中</span></div>
    <div class="section-sub">商家此刻身上还挂着的处罚。<b>严重违规</b>是红线判定依据（全量）；<b>影响流量</b>是近 90 天内仍在压商笔/直播/搜索/推荐的一般违规，不计红线但直接影响生意。</div>
    <div class="kpi-row">
      <div class="kpi danger"><div class="kpi-label">生效中严重违规</div><div class="kpi-val danger">${sev.length}</div><div class="kpi-sub">${new Set(sev.map(r => r.seller_id)).size} 家 · 计入红线</div></div>
      <div class="kpi warn"><div class="kpi-label">生效中影响流量</div><div class="kpi-val warn">${aff.length}</div><div class="kpi-sub">${new Set(aff.map(r => r.seller_id)).size} 家 · 近90天</div></div>
      <div class="kpi"><div class="kpi-label">其中黑盒</div><div class="kpi-val">${all.filter(r => r.box === '黑盒').length}</div><div class="kpi-sub">商家后台看不到</div></div>
      <div class="kpi"><div class="kpi-label">重复违规≥3次</div><div class="kpi-val">${all.filter(r => r.repeat >= 3).length}</div><div class="kpi-sub">屡教不改标签</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">🔴 生效中严重违规明细 <span class="badge danger">${sev.length} 条 · 红线依据</span></div>
    <div class="section-sub">这些是判定友好商家资格的全部依据，每一条都需要推动整改或申诉才能消除。</div>
    ${sev.length ? detailTable(sev, true) : '<div class="empty">无</div>'}
  </div>
  <div class="section">
    <div class="section-title">🟠 生效中影响流量（一般违规·近90天） <span class="badge">${aff.length} 条</span></div>
    <div class="section-sub">不计入红线，但正在实际压制流量。商家常反馈「最近流量没了」，根因多在这里。</div>
    ${aff.length ? detailTable(aff.slice(0, 800), true) : '<div class="empty">无</div>'}
    ${aff.length > 800 ? `<div class="muted" style="margin-top:8px">仅展示前 800 条，使用上方筛选器缩小范围。</div>` : ''}
  </div>`;
}

/* ── AM 视角 ── */
function vAM() {
  const s = S.summary || {};
  const list = (S.am || []).filter(a => !F.am || a.am === F.am);
  return `<div class="section">
    <div class="section-title">AM 视角 <span class="badge">${list.length} 位</span></div>
    <div class="section-sub">按名下商家的红线风险排序。<b>点击任意 AM 展开名下商家明细</b>，再点商家可看具体违规条目。</div>
    ${amTable(list, true)}
  </div>`;
}

/* AM 表格：expandable=true 时可点击下钻 */
function amTable(list, expandable) {
  const head = ['AM', '友好商家数', '🔴 已失格', '🟠 临界', '🟡 关注', '⚪ 安全', '生效中严重违规', '昨日新增'];
  const body = list.map(a => {
    const key = 'am:' + a.am;
    const open = EXP.has(key);
    const cells = [
      `<span class="clickable">${open ? '▾' : '▸'} <span class="shop">${esc(a.am)}</span></span>`,
      `<span class="num">${a.shops}</span>`,
      `<span class="num" style="${a.disqualified ? 'color:#cf1322;font-weight:600' : ''}">${a.disqualified || '—'}</span>`,
      `<span class="num" style="${a.critical ? 'color:#d46b08;font-weight:600' : ''}">${a.critical || '—'}</span>`,
      `<span class="num">${a.watch || '—'}</span>`,
      `<span class="num">${a.safe}</span>`,
      `<span class="num">${a.sev_active || '—'}</span>`,
      `<span class="num">${a.new_total || '—'}</span>`,
    ];
    let html = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    if (open) html += `<tr class="sub-row"><td colspan="${head.length}">${amShopPanel(a.am)}</td></tr>`;
    return html;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* AM 下钻：名下商家明细 */
function amShopPanel(am) {
  const list = (S.shops || []).filter(x => x.am === am);
  if (!list.length) return '<div class="empty">该 AM 名下无友好商家</div>';
  const risky = list.filter(x => x.tier !== 'safe');
  const safe = list.filter(x => x.tier === 'safe');
  const rows = risky.concat(safe).map(x => {
    const key = 'shop:' + x.seller_id;
    const open = EXP.has(key);
    const cells = [
      `<span class="clickable">${open ? '▾' : '▸'}</span> ${shopLink(x.seller_id, x.shop_name)}`,
      `<span class="tag t-${x.tier}">${TIER_LABEL[x.tier]}</span>`,
      `<span class="num">${x.sev_active || '—'}</span>`,
      `<span class="num">${x.tier === 'disqualified' ? '已超' + (x.sev_active - (S.summary.red_line) + 1) : x.gap}</span>`,
      `<span class="num">${x.new_total || '—'}</span>`,
      `<span class="num">${x.aff_active || '—'}</span>`,
      esc(x.b_level || '—'),
      `<span class="num">${wan(x.dgmv_30d)}</span>`,
      x.linked ? '已建联' : '<span class="muted">未建联</span>',
    ];
    let html = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    if (open) html += `<tr class="sub-row2"><td colspan="9">${shopViolationPanel(x.seller_id, x.shop_name)}</td></tr>`;
    return html;
  }).join('');
  return `<div class="panel">
    <div class="panel-title">${esc(am)} 名下 ${list.length} 家友好商家 · ${risky.length} 家有生效中严重违规</div>
    <table class="inner"><thead><tr>
      <th>商家</th><th>档位</th><th>生效中严重</th><th>距红线</th><th>昨日新增</th><th>生效中限流</th><th>B等级</th><th>近30天DGMV</th><th>建联</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* 商家下钻：具体违规条目 */
function shopViolationPanel(sid, name) {
  const sev = (S.detail_active || []).filter(r => r.seller_id === sid && r.severe);
  const aff = (S.detail_active || []).filter(r => r.seller_id === sid && !r.severe);
  const nw = (S.detail_new || []).filter(r => r.seller_id === sid);
  const mini = rows => rows.length ? tbl(
    ['程度', '风险域', '子风险域', '对象', '可见性', '影响场域', '重复', '处罚日期'],
    rows.map(r => [
      r.severe ? '<span class="tag sev">严重</span>' : `<span class="tag gen">${esc((r.level || '').replace('社区处置-暂无违规程度', '社区'))}</span>`,
      esc(r.domain), `<span class="muted">${esc(r.sub_domain)}</span>`, entityLink(r),
      `<span class="tag ${r.box === '白盒' ? 'white' : 'black'}">${r.box}</span>`,
      r.affect.length ? r.affect.map(a => `<span class="tag aff">${a}</span>`).join('') : '<span class="muted">—</span>',
      `<span class="num">${r.repeat || '—'}</span>`,
      `<span class="muted">${esc(r.date)}</span>`,
    ])) : '<div class="empty">无</div>';
  const allIds = [...sev, ...nw, ...aff].map(r => r.entity_id).filter(Boolean);
  const uniqIds = [...new Set(allIds)];
  return `<div class="panel2">
    <div class="panel-title">${shopLink(sid, name)} · 违规明细
      <a class="crm-btn" href="${crmShop(sid)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">苍穹店铺详情 ↗</a>
      ${uniqIds.length ? `<span class="crm-btn copy-all" data-ids="${esc(uniqIds.join('\n'))}" title="复制该商家全部违规对象 ID，逐个到苍穹搜索查看原因">复制全部对象ID（${uniqIds.length}）⧉</span>` : ''}
    </div>
    <div class="panel-tip">💡 违规的具体原因与证据需到苍穹/违规后台按<b>对象 ID</b> 搜索查看；本表提供 ID 与风险域定位。</div>
    <div class="mini-head">🔴 生效中严重违规（计入红线）<span class="badge danger">${sev.length}</span></div>
    ${mini(sev.slice(0, 200))}
    <div class="mini-head">📌 昨日新增<span class="badge">${nw.length}</span></div>
    ${mini(nw.slice(0, 200))}
    <div class="mini-head">🟠 生效中影响流量（近90天·一般违规）<span class="badge">${aff.length}</span></div>
    ${mini(aff.slice(0, 200))}
  </div>`;
}

function detailTable(rows, drill) {
  if (!rows.length) return '<div class="empty">无数据</div>';
  const head = ['商家', 'AM', '程度', '风险域', '子风险域', '对象', '可见性', '影响场域', '重复', '处罚日期'];
  const body = rows.map((r, idx) => {
    const cells = [
      drill ? `<span class="clickable">▸</span> ${shopLink(r.seller_id, r.shop_name)}` : shopLink(r.seller_id, r.shop_name),
      `<span class="muted">${esc(r.am)}</span>`,
      r.severe ? '<span class="tag sev">严重</span>' : `<span class="tag gen">${esc((r.level || '').replace('社区处置-暂无违规程度', '社区'))}</span>`,
      esc(r.domain), `<span class="muted">${esc(r.sub_domain)}</span>`, entityLink(r),
      `<span class="tag ${r.box === '白盒' ? 'white' : 'black'}">${r.box}</span>`,
      r.affect.length ? r.affect.map(a => `<span class="tag aff">${a}</span>`).join('') : '<span class="muted">—</span>',
      `<span class="num">${r.repeat || '—'}</span>`,
      `<span class="muted">${esc(r.date)}</span>`,
    ];
    if (!drill) return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    const key = 'drow:' + r.seller_id + ':' + idx;
    const open = EXP.has(key);
    cells[0] = cells[0].replace('>▸<', open ? '>▾<' : '>▸<');
    let html = `<tr class="row-click" data-exp="${esc(key)}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    if (open) html += `<tr class="sub-row"><td colspan="${head.length}">${shopViolationPanel(r.seller_id, r.shop_name)}</td></tr>`;
    return html;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function tbl(head, rows) {
  return `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

load().catch(e => {
  document.getElementById('app').innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
});

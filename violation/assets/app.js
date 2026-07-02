// 违规预警 v2 单页 4 区
const CB = '?v=' + Date.now();
let DATA = {};

async function fetchJson(name) {
  const r = await fetch(`data/${name}${CB}`, { cache: 'no-store' });
  return await r.json();
}

async function init() {
  try {
    const [summary, domains, heavy, avoid, detailNew, meta] = await Promise.all([
      fetchJson('_summary.json'),
      fetchJson('_domains.json'),
      fetchJson('_heavy_sellers.json'),
      fetchJson('_avoid.json'),
      fetchJson('_detail_new.json'),
      fetchJson('_meta.json'),
    ]);
    DATA = { summary, domains, heavy, avoid, detailNew, meta };
    renderHeader();
    render();
    initTabs();
  } catch (e) {
    document.getElementById('main').innerHTML = `<div class="loading">加载失败: ${e.message}</div>`;
    console.error(e);
  }
}

function renderHeader() {
  document.getElementById('board-title').textContent = `🚨 ${DATA.summary.am_short}的违规预警`;
  const partDate = DATA.meta.partition_date || DATA.summary.yest_date;
  const punishDate = DATA.summary.yest_date;
  document.getElementById('board-subtitle').textContent =
    partDate === punishDate
      ? `${DATA.summary.am} · 数据日期 ${partDate}`
      : `${DATA.summary.am} · 已刷新至 ${partDate} 分区 · 最新处罚日 ${punishDate}`;
  document.getElementById('meta').innerHTML = `🔄 ${DATA.meta.generated_at} · 📊 ${DATA.meta.data_source} · ⚠️ 仅显示你 AM 名下违规`;
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = e => {
      e.preventDefault();
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const id = t.getAttribute('href').substring(1);
      document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function l1Class(d) {
  if (!d) return '';
  if (d.includes('问题账号')) return 'l-problem';
  if (d.includes('内容画风') || d.includes('内容生态')) return 'l-content';
  if (d.includes('违规营销') || d.includes('虚假宣传')) return 'l-marketing';
  if (d.includes('医疗') || d.includes('医美')) return 'l-medical';
  if (d.includes('作弊') || d.includes('反作弊')) return 'l-fraud';
  return '';
}

function actionPills(action) {
  if (!action) return '';
  const parts = action.split(/[，,;；]/).map(s => s.trim()).filter(Boolean);
  return parts.map(p => {
    const heavy = ['下架','清退','封禁','重度','100%','沉底','禁言'].some(k => p.includes(k));
    return `<span class="action-pill ${heavy?'heavy':''}">${esc(p)}</span>`;
  }).join(' ');
}

function cangqiongShopUrl(sid) {
  return sid ? `https://crm.xiaohongshu.com/eccrm/merchant-detail/${sid}?isSellerId=true&type=basicInfo` : '#';
}

// 根据违规实体类型智能选择跳转链接
// - 有 seller_id 且 shop_name 不以"用户("开头 → 苍穹商家详情（真实店铺）
// - 有 user_id 或 shop_name 以"用户("开头 → 小红书用户主页（直播/笔记账号）
// - 都没有 → 不跳
function shopLink(r) {
  const isUserId = r.shop_name && r.shop_name.startsWith('用户(');
  if (r.seller_id && !isUserId) {
    return `https://crm.xiaohongshu.com/eccrm/merchant-detail/${r.seller_id}?isSellerId=true&type=basicInfo`;
  }
  const uid = r.user_id || (isUserId ? r.seller_id : '') || r.shop_id_key;
  if (uid) return `https://www.xiaohongshu.com/user/profile/${uid}`;
  return '#';
}
function noteUrl(nid) {
  return nid ? `https://www.xiaohongshu.com/explore/${nid}` : '#';
}

function render() {
  const s = DATA.summary;
  const main = document.getElementById('main');

  // === Tab 1: 当天新增 ===
  const tabNew = renderTabNew();
  // === Tab 2: 持续中 ===
  const tabActive = renderTabActive();
  // === Tab 3: 重点商家 ===
  const tabHeavy = renderTabHeavy();
  // === Tab 4: 规避指南 ===
  const tabAvoid = renderTabAvoid();

  main.innerHTML = tabNew + tabActive + tabHeavy + tabAvoid;

  // 渲染 echarts
  setTimeout(() => {
    document.querySelectorAll('.chart-container[data-chart]').forEach(el => {
      const chart = echarts.init(el);
      chart.setOption(JSON.parse(el.dataset.chart));
      window.addEventListener('resize', () => chart.resize());
    });
  }, 50);
}

function renderTabNew() {
  const s = DATA.summary;
  const detail = DATA.detailNew;
  const totalDomains = Object.entries(detail);

  // KPI
  let kpi = `
    <div class="section" id="tab-new">
      <div class="section-title">📥 当天新增违规 <span class="badge danger">${s.yest_date}</span></div>
      <div class="section-subtitle">仅看"处罚时间=昨日"的真正新增处罚，与苍穹后台对齐</div>
      <div class="hero-kpi-row">
        <div class="kpi-card danger">
          <div class="kpi-label">昨日新增违规</div>
          <div class="kpi-value danger">${s.new_total}</div>
        </div>
        <div class="kpi-card ${s.new_severe>0?'danger':''}">
          <div class="kpi-label">重度违规</div>
          <div class="kpi-value ${s.new_severe>0?'danger':''}">${s.new_severe}</div>
          <div class="kpi-sub">${s.new_total>0?Math.round(s.new_severe/s.new_total*100):0}% 占比</div>
        </div>
        <div class="kpi-card warn">
          <div class="kpi-label">涉及商家</div>
          <div class="kpi-value warn">${s.new_sellers}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">涉及买手</div>
          <div class="kpi-value">${s.new_buyers}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">黑盒 / 白盒</div>
          <div class="kpi-value" style="font-size:18px">${s.new_black} / ${s.new_white}</div>
        </div>
      </div>
    </div>`;

  // 风险域排名（按 new count）
  const maxNew = totalDomains[0] ? totalDomains[0][1].length : 1;
  const rank = totalDomains.slice(0, 12).map(([d, rows], i) => {
    const severe = rows.filter(r => r.is_severe).length;
    return `<div class="rank-item">
      <span class="rank-num top${i<3?i+1:''}">${i+1}</span>
      <span class="rank-name">${esc(d)}</span>
      <span class="rank-meta">${severe?`<span class="level-severe">${severe}重</span>`:''}</span>
      <span class="rank-bar"><span class="rank-bar-fill" style="width:${rows.length/maxNew*100}%"></span></span>
      <span class="rank-count">${rows.length}</span>
    </div>`;
  }).join('');

  // 完整明细按风险域分组
  let detailHtml = '';
  for (const [domain, rows] of totalDomains) {
    if (rows.length === 0) continue;
    detailHtml += `
      <h4 style="margin:14px 0 8px;font-size:13px;color:#1f2330">
        <span class="tag-domain">${esc(domain)}</span>
        <span style="font-weight:400;color:#8b8fa3;font-size:12px"> ${rows.length} 起</span>
      </h4>
      <table class="detail"><thead><tr>
        <th style="width:170px">店铺/买手</th><th style="width:60px">类型</th><th>违规标签</th>
        <th style="width:140px">处置动作</th><th style="width:80px">重复违规</th><th style="width:60px">黑/白盒</th>
      </tr></thead><tbody>`;
    for (const r of rows.slice(0, 20)) {
      const buyerMark = r.is_buyer ? `<span class="buyer-mark">[买手 ${esc(r.buyer_nickname||'')}]</span>` : '';
      const entityLink = r.entity_label === '笔记' && r.entity_id
        ? `<a href="${noteUrl(r.entity_id)}" target="_blank">${r.entity_label}</a>`
        : `<span class="entity-label">${r.entity_label}</span>`;
      detailHtml += `<tr ${r.is_severe?'class="severe-row"':''}>
        <td>
          <div class="cell-shop"><a href="${shopLink(r)}" target="_blank">${esc(r.shop_name)}</a></div>
          <div class="cell-meta">${buyerMark}</div>
        </td>
        <td>${entityLink}</td>
        <td>
          <span class="tag-pill">${esc(r.tag||'(无)')}</span>
          ${r.sub_domain?`<div class="cell-meta">${esc(r.sub_domain)}</div>`:''}
        </td>
        <td>${actionPills(r.action)}</td>
        <td>${r.repeat_count>0?`<span class="level-severe">${r.repeat_count}次</span>`:'-'}</td>
        <td>${r.punish_type}</td>
      </tr>`;
    }
    if (rows.length > 20) {
      detailHtml += `<tr><td colspan="6" style="text-align:center;color:#8b8fa3;font-size:11px;padding:6px">… 其余 ${rows.length - 20} 条同类违规</td></tr>`;
    }
    detailHtml += '</tbody></table>';
  }

  let rankSection = `
    <div class="section">
      <div class="section-title">📊 当天新增 - 风险域分布</div>
      <div class="rank-list">${rank}</div>
    </div>`;

  let detailSection = `
    <div class="section">
      <div class="section-title">📋 当天新增完整明细 <span class="badge">按风险域分组</span></div>
      <div class="section-subtitle">每个风险域最多展示 20 条，重度违规已高亮</div>
      ${detailHtml}
    </div>`;

  return kpi + rankSection + detailSection;
}

function renderTabActive() {
  const s = DATA.summary;
  const d = DATA.domains;

  let kpi = `
    <div class="section" id="tab-active">
      <div class="section-title">🔄 持续中违规 <span class="badge">截止 ${s.yest_date} 仍在处罚中</span></div>
      <div class="section-subtitle">所有未撤销/未到期的处罚，反映"积压问题"全貌</div>
      <div class="hero-kpi-row">
        <div class="kpi-card warn">
          <div class="kpi-label">持续中总数</div>
          <div class="kpi-value warn">${s.active_total}</div>
        </div>
        <div class="kpi-card danger">
          <div class="kpi-label">重度违规</div>
          <div class="kpi-value danger">${s.active_severe}</div>
          <div class="kpi-sub">${Math.round(s.active_severe/s.active_total*100)}%</div>
        </div>
        <div class="kpi-card danger">
          <div class="kpi-label">重复违规≥5次</div>
          <div class="kpi-value danger">${s.active_high_repeat}</div>
          <div class="kpi-sub">屡教不改</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">涉及商家</div>
          <div class="kpi-value">${s.active_sellers}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">涉及买手</div>
          <div class="kpi-value">${s.active_buyers_count}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">黑盒 / 白盒</div>
          <div class="kpi-value" style="font-size:18px">${s.active_black} / ${s.active_white}</div>
        </div>
      </div>
    </div>`;

  // 持续中 vs 新增风险域对比
  const allDomains = [...new Set([...d.active.map(x=>x[0]), ...d.new.map(x=>x[0])])];
  const activeMap = Object.fromEntries(d.active);
  const newMap = Object.fromEntries(d.new);
  const sorted = allDomains.sort((a,b)=> (activeMap[b]||0) - (activeMap[a]||0)).slice(0, 15);
  const maxActive = Math.max(...d.active.map(x=>x[1]), 1);

  const compareRows = sorted.map(dom => {
    const a = activeMap[dom] || 0;
    const n = newMap[dom] || 0;
    return `<div class="split-row">
      <span class="name">${esc(dom)}</span>
      <span class="active-num">${a}</span>
      <span class="rank-bar"><span class="rank-bar-fill" style="width:${a/maxActive*100}%;background:#5b8def"></span></span>
      <span class="new-num">+${n}</span>
    </div>`;
  }).join('');

  // 持续中 Top 标签
  const maxTag = d.top_tags_active[0] ? d.top_tags_active[0][1] : 1;
  const tagRank = d.top_tags_active.slice(0, 12).map(([t, c], i) => `
    <div class="rank-item">
      <span class="rank-num top${i<3?i+1:''}">${i+1}</span>
      <span class="rank-name">${esc(t||'(无标签)')}</span>
      <span class="rank-bar"><span class="rank-bar-fill" style="width:${c/maxTag*100}%"></span></span>
      <span class="rank-count">${c}</span>
    </div>`).join('');

  // 持续中 Top 处置动作
  const maxAct = d.top_actions_active[0] ? d.top_actions_active[0][1] : 1;
  const actRank = d.top_actions_active.slice(0, 10).map(([a, c], i) => `
    <div class="rank-item">
      <span class="rank-num top${i<3?i+1:''}">${i+1}</span>
      <span class="rank-name">${esc(a||'(无)')}</span>
      <span class="rank-bar"><span class="rank-bar-fill" style="width:${c/maxAct*100}%;background:#8d9aff"></span></span>
      <span class="rank-count">${c}</span>
    </div>`).join('');

  return kpi + `
    <div class="section">
      <div class="section-title">📊 风险域分布 <span class="badge">持续中 vs 当天新增对比</span></div>
      <div class="section-subtitle">蓝色=持续中累计 · 红色=昨日新增（看哪些类型在持续累积）</div>
      ${compareRows}
    </div>
    <div class="section">
      <div class="section-title">🏷️ 持续中 - 高频违规标签 Top12</div>
      <div class="rank-list">${tagRank}</div>
    </div>
    <div class="section">
      <div class="section-title">⚙️ 持续中 - 处置动作 Top10</div>
      <div class="section-subtitle">看哪些处罚类型最多 - 反映违规严重程度</div>
      <div class="rank-list">${actRank}</div>
    </div>
  `;
}

function renderTabHeavy() {
  const h = DATA.heavy;

  const renderHeavyItem = (s, type) => {
    let badges = '';
    if (type === 'today') badges += `<span class="badge today">昨日 ${s.count} 起</span>`;
    if (type === 'repeat') badges += `<span class="badge repeat">重复 ${s.high_repeat}</span>`;
    if (type === 'burst') badges += `<span class="badge burst">🔥 爆发</span>`;
    if (s.severe > 0) badges += `<span class="badge severe">${s.severe}重</span>`;
    if (s.new_today > 0 && type !== 'today') badges += `<span class="badge today">昨日+${s.new_today}</span>`;
    const topDomains = s.top_domains.map(d => `${d[0]}(${d[1]})`).join(' · ');
    return `<div class="heavy-item">
      <div class="name">
        <a href="${shopLink({seller_id: s.seller_id, user_id: s.shop_name.startsWith('用户(') ? s.seller_id : '', shop_id_key: s.seller_id})}" target="_blank">${esc(s.shop_name)}</a>
        ${badges}
      </div>
      <div class="stats">持续中 ${s.count} 起 · ${topDomains}</div>
    </div>`;
  };

  return `
    <div class="section" id="tab-heavy">
      <div class="section-title">🎯 重点商家 <span class="badge">优先沟通</span></div>
      <div class="section-subtitle">从 4 个维度筛选重点商家，建议从"昨日爆发"和"屡教不改"开始约谈</div>
      <div class="heavy-grid">
        <div class="heavy-section">
          <h3>🔥 昨日爆发商家 <span class="desc">新增≥5起</span></h3>
          ${h.new_burst.length === 0 ? '<div class="cell-meta">昨日无单店爆发</div>' : h.new_burst.map(s => renderHeavyItem(s, 'burst')).join('')}
        </div>
        <div class="heavy-section">
          <h3>🔁 屡教不改商家 <span class="desc">重复违规≥5次</span></h3>
          ${h.high_repeat.length === 0 ? '<div class="cell-meta">无重复违规</div>' : h.high_repeat.slice(0, 10).map(s => renderHeavyItem(s, 'repeat')).join('')}
        </div>
        <div class="heavy-section">
          <h3>📊 累计违规 Top10 <span class="desc">持续中总数最多</span></h3>
          ${h.top_active.slice(0, 10).map(s => renderHeavyItem(s, 'top')).join('')}
        </div>
        <div class="heavy-section">
          <h3>🚨 重度违规集中 <span class="desc">重度处罚最多</span></h3>
          ${h.severe.slice(0, 10).map(s => renderHeavyItem(s, 'severe')).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderTabAvoid() {
  const avoid = DATA.avoid;
  return `
    <div class="section" id="tab-avoid">
      <div class="section-title">💡 违规根因 & 规避指南</div>
      <div class="section-subtitle">基于你名下持续中违规分析，从高到低排序。与商家沟通时可直接引用这些条目</div>
      <div class="avoid-list">
        ${avoid.map(g => `
          <div class="avoid-item ${l1Class(g.risk_domain)}">
            <div class="avoid-header">
              <span class="avoid-title">${esc(g.risk_domain)}</span>
              <span class="avoid-meta">持续 ${g.active_count} 起 (${g.active_pct}%) · 昨日新增 ${g.new_count}</span>
            </div>
            <div class="avoid-risk">⚠️ 风险点：${esc(g.risk||'-')}</div>
            ${g.tips && g.tips.length ? `<ul class="avoid-tips">${g.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<div class="cell-meta">暂无标准模板</div>'}
            <div class="avoid-subdomains">
              ${g.top_sub_domains.length ? `子风险：${g.top_sub_domains.map(t=>`${esc(t[0])} (${t[1]})`).join('、')}` : ''}
              ${g.top_sellers.length ? ` · 集中商家：${g.top_sellers.map(t=>esc(t[0])).join('、')}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

init();

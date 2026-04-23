// 大门业绩看板 2.0 - 渲染逻辑（真实数据版）
(function () {
  const M = window.MOCK;
  const COLORS = {
    kbo:  '#ff5577',
    dbo:  '#58a6ff',
    note: '#d2a8ff',
    cart: '#fb950b', // 商卡
    other:'#6e7681',
    primary: '#ff2442',
    text: '#e6edf3',
    dim:  '#8b949e',
    grid: '#2d333b',
  };
  // 场域 → 颜色 映射
  const fieldColor = (name) => {
    if (name.includes('K播')) return COLORS.kbo;
    if (name.includes('店播')) return COLORS.dbo;
    if (name.includes('商品笔记') || name.includes('普通笔记') || name.includes('购物笔记') || name.includes('品合笔记') || name.includes('晒单笔记')) return COLORS.note;
    if (name.includes('商卡')) return COLORS.cart;
    return COLORS.other;
  };

  // ---- 工具 ----
  const fmtNum = (n) => {
    if (n == null || isNaN(n)) return '-';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n >= 1e8) return sign + (n / 1e8).toFixed(2) + ' 亿';
    if (n >= 1e4) return sign + (n / 1e4).toFixed(1) + ' 万';
    if (n >= 1)   return sign + n.toLocaleString('en-US', {maximumFractionDigits: 0});
    return sign + n.toFixed(2);
  };
  const fmtPct = (v, withSign = true) => {
    if (v == null || isNaN(v)) return '-';
    const sign = withSign && v > 0 ? '+' : '';
    return `${sign}${(v * 100).toFixed(1)}%`;
  };
  const chipClass = (v) => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  const chipArrow = (v) => v > 0 ? '↑' : v < 0 ? '↓' : '—';
  const rankBadge = (r) => {
    const cls = r === 1 ? 'top1' : r === 2 ? 'top2' : r === 3 ? 'top3' : '';
    return `<span class="rank-badge ${cls}">${r}</span>`;
  };

  // ECharts 通用 theme
  const baseOpt = () => ({
    backgroundColor: 'transparent',
    textStyle: { color: COLORS.text, fontFamily: 'inherit' },
    grid: { left: 8, right: 16, top: 32, bottom: 28, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(28, 35, 45, 0.96)',
      borderColor: COLORS.grid,
      textStyle: { color: COLORS.text, fontSize: 12 },
      axisPointer: { lineStyle: { color: COLORS.grid } },
    },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: COLORS.grid } },
      axisLabel: { color: COLORS.dim, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: COLORS.dim, fontSize: 11, formatter: (v) => fmtNum(v) },
      splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
    },
  });

  // ============ Tab 1: 今日实时 ============
  function renderTab1() {
    const t = M.today;
    const y = t.yesterday;
    // 取主力 3 个场域用于 KPI
    const kbo  = (y.kbo  && y.kbo.gmv)  || 0;
    const dbo  = (y.dbo  && y.dbo.gmv)  || 0;
    const note = (y.note && y.note.gmv) || 0;
    const root = document.getElementById('tab1');
    root.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">🔴 今日累计 DGMV <span class="live-dot" style="background:#ff2442"></span></div>
          <div class="kpi-value">${fmtNum(t.dgmv_total)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">截至 ${t.updatedAt}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot kbo"></span>今日 K播 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_kbo)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">${t.dgmv_kbo === 0 ? '今日暂无 K播 成交' : `占比 ${fmtPct(t.dgmv_kbo / Math.max(t.dgmv_total, 1), false)}`}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot dbo"></span>今日 店播 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_dbo)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">${t.dgmv_dbo === 0 ? '今日暂无 店播 成交' : `占比 ${fmtPct(t.dgmv_dbo / Math.max(t.dgmv_total, 1), false)}`}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot note"></span>今日 商品笔记 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_note)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">${t.dgmv_note === 0 ? '今日暂无 笔记 成交' : `占比 ${fmtPct(t.dgmv_note / Math.max(t.dgmv_total, 1), false)}`}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">📅 昨日 DGMV 全场域分布 <span class="card-sub">含环比 · 9 个场域</span></div>
          </div>
          <div class="kpi-grid" style="grid-template-columns: 1fr; margin-bottom: 16px">
            <div class="kpi-card primary">
              <div class="kpi-label">昨日总 DGMV</div>
              <div class="kpi-value">${fmtNum(y.total)}<span class="unit">元</span></div>
              <div class="kpi-foot">
                <span class="chip ${chipClass(y.total_chain)}">${chipArrow(y.total_chain)} ${fmtPct(y.total_chain)}</span>
                <span class="text-dim">环比前一日</span>
              </div>
            </div>
          </div>
          <div id="chart-yesterday-pie" class="chart short"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📊 昨日各场域 DGMV + 环比</div>
          </div>
          ${renderFieldTable(y.breakdown)}
        </div>
      </div>
    `;

    // 昨日全场域饼图
    const c1 = echarts.init(document.getElementById('chart-yesterday-pie'));
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(28,35,45,0.96)',
        borderColor: COLORS.grid,
        textStyle: { color: COLORS.text },
        formatter: (p) => `<b>${p.name}</b><br/>DGMV：${fmtNum(p.value)} 元<br/>占比：${p.percent}%`,
      },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '50%'],
        label: { show: true, color: COLORS.text, fontSize: 11, formatter: '{b}\n{d}%' },
        labelLine: { lineStyle: { color: COLORS.dim } },
        itemStyle: { borderColor: '#1c232d', borderWidth: 2 },
        data: y.breakdown.map(r => ({
          name: r.field,
          value: r.gmv,
          itemStyle: { color: fieldColor(r.field) },
        })),
      }],
    });
    window.addEventListener('resize', () => c1.resize());
  }

  function renderFieldTable(rows) {
    return `
      <table class="table">
        <thead><tr><th>场域</th><th class="num">DGMV</th><th class="num">环比</th><th class="num">占比</th></tr></thead>
        <tbody>
          ${(() => {
            const total = rows.reduce((s, r) => s + r.gmv, 0);
            return rows.map(r => `
              <tr>
                <td><span class="dot" style="background:${fieldColor(r.field)}"></span>${r.field}</td>
                <td class="num">${fmtNum(r.gmv)}</td>
                <td class="num"><span class="chip ${chipClass(r.chain)}">${chipArrow(r.chain)} ${fmtPct(Math.abs(r.chain), false)}</span></td>
                <td class="num text-dim">${fmtPct(r.gmv / total, false)}</td>
              </tr>
            `).join('');
          })()}
        </tbody>
      </table>`;
  }

  // ============ Tab 2: 趋势 & 异动 ============
  function renderTab2() {
    const tr = M.trend;
    const root = document.getElementById('tab2');
    root.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">📈 近 14 天 DGMV 日趋势 <span class="card-sub">${tr.dates14[0]} ~ ${tr.dates14[tr.dates14.length-1]}</span></div>
        </div>
        <div id="chart-trend14" class="chart tall"></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🚀 商家突增 Top10 <span class="card-sub">近 7 天 vs 上 7 天 · 环比变化率</span></div>
          </div>
          ${renderSellerTable(tr.sellerSurge, true)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📉 商家突降 Top10 <span class="card-sub">近 7 天 vs 上 7 天 · 环比变化率</span></div>
          </div>
          ${renderSellerTable(tr.sellerDrop, false)}
        </div>
      </div>
    `;

    // 14 天趋势
    const c1 = echarts.init(document.getElementById('chart-trend14'));
    const opt1 = baseOpt();
    const avgGmv = tr.dgmv14.reduce((s, v) => s + v, 0) / tr.dgmv14.length;
    c1.setOption({
      ...opt1,
      tooltip: { ...opt1.tooltip, valueFormatter: (v) => fmtNum(v) + ' 元' },
      xAxis: { ...opt1.xAxis, data: tr.dates14 },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        itemStyle: { color: COLORS.primary },
        lineStyle: { width: 2.5, color: COLORS.primary },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 36, 66, 0.35)' },
              { offset: 1, color: 'rgba(255, 36, 66, 0.02)' },
            ],
          },
        },
        markLine: {
          symbol: 'none',
          lineStyle: { color: 'rgba(255,255,255,0.4)', type: 'dashed' },
          label: { color: COLORS.dim, fontSize: 11, formatter: `均值 ${fmtNum(avgGmv)}` },
          data: [{ yAxis: avgGmv }],
        },
        label: { show: true, position: 'top', color: COLORS.text, fontSize: 10, formatter: (p) => fmtNum(p.value) },
        data: tr.dgmv14,
      }],
    });
    window.addEventListener('resize', () => c1.resize());
  }

  function renderSellerTable(rows, isUp) {
    if (!rows || rows.length === 0) {
      return `<div style="padding:24px;text-align:center;color:var(--text-dim)">暂无数据</div>`;
    }
    return `
      <table class="table">
        <thead><tr><th width="40">#</th><th>商家</th><th class="num">近 7 天 DGMV</th><th class="num">环比</th></tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td>${rankBadge(i + 1)}</td>
              <td>${r.name}</td>
              <td class="num">${fmtNum(r.gmv)}</td>
              <td class="num"><span class="chip ${isUp ? 'up' : 'down'}">${chipArrow(r.chain)} ${fmtPct(Math.abs(r.chain), false)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // ============ Tab 3: 商家健康 ============
  function renderTab3() {
    const sh = M.sellerHealth;
    const root = document.getElementById('tab3');

    root.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">🏪 名下商家总数</div>
          <div class="kpi-value">${M.meta.sellerCount}<span class="unit">家</span></div>
          <div class="kpi-foot text-dim">${M.meta.department}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">✨ 近 7 天动销商家</div>
          <div class="kpi-value">${sh.activeSellerCount}<span class="unit">家</span></div>
          <div class="kpi-foot text-dim">动销率 ${fmtPct(sh.activeSellerCount / M.meta.sellerCount, false)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">🆕 本月新商 GMV</div>
          <div class="kpi-value">${fmtNum(sh.newSellerTotal)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">${sh.newSellerCount} 个新商</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">⚠️ 未动销商家</div>
          <div class="kpi-value">${M.meta.sellerCount - sh.activeSellerCount}<span class="unit">家</span></div>
          <div class="kpi-foot text-dim">占比 ${fmtPct((M.meta.sellerCount - sh.activeSellerCount) / M.meta.sellerCount, false)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">🏆 商家 DGMV 排行 Top15 <span class="card-sub">近 7 天 · 含同比</span></div>
        </div>
        <div id="chart-top15" class="chart tall"></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🆕 本月新商 GMV Top15 <span class="card-sub">按本月 GMV 排序</span></div>
          </div>
          <table class="table">
            <thead><tr><th width="40">#</th><th>商家</th><th class="num">本月 GMV</th></tr></thead>
            <tbody>
              ${sh.newSellerThisMonth.map((s, i) => `
                <tr>
                  <td>${rankBadge(i+1)}</td>
                  <td>${s.name}</td>
                  <td class="num">${fmtNum(s.gmv)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📊 商家活跃分布 <span class="card-sub">动销 / 未动销</span></div>
          </div>
          <div id="chart-active" class="chart"></div>
        </div>
      </div>
    `;

    // Top15 横向条形图
    const c1 = echarts.init(document.getElementById('chart-top15'));
    const data = sh.top15.slice().reverse();
    const opt1 = baseOpt();
    c1.setOption({
      ...opt1,
      grid: { ...opt1.grid, left: 200, right: 100 },
      tooltip: { ...opt1.tooltip, formatter: (p) => {
        const row = sh.top15[sh.top15.length - 1 - p[0].dataIndex];
        return `<b>${row.name}</b><br/>近7天 DGMV：${fmtNum(row.gmv)} 元<br/>同比：<span style="color:${row.chain>0?'#2ea043':'#f85149'}">${fmtPct(row.chain)}</span> (${row.change>0?'+':''}${fmtNum(row.change)})`;
      }},
      yAxis: {
        type: 'category',
        data: data.map(r => r.name),
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisLabel: { color: COLORS.dim, fontSize: 11, width: 180, overflow: 'truncate' },
        axisTick: { show: false },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: COLORS.dim, fontSize: 11, formatter: (v) => fmtNum(v) },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
      },
      series: [{
        type: 'bar',
        barWidth: '55%',
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (p) => {
            const yoyChain = data[p.dataIndex].chain;
            return yoyChain >= 0 ? COLORS.primary : '#9d4150';
          },
        },
        data: data.map(r => r.gmv),
        label: {
          show: true,
          position: 'right',
          color: COLORS.text,
          fontSize: 11,
          formatter: (p) => {
            const row = data[p.dataIndex];
            const arrow = row.chain > 0 ? '↑' : row.chain < 0 ? '↓' : '—';
            return `${fmtNum(p.value)}  ${arrow}${fmtPct(Math.abs(row.chain), false)}`;
          },
        },
      }],
    });

    // 活跃分布
    const c2 = echarts.init(document.getElementById('chart-active'));
    c2.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(28,35,45,0.96)', borderColor: COLORS.grid, textStyle: { color: COLORS.text } },
      legend: { bottom: 0, textStyle: { color: COLORS.dim } },
      series: [{
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: true, color: COLORS.text, fontSize: 12, formatter: '{b}\n{d}%' },
        itemStyle: { borderColor: '#1c232d', borderWidth: 2 },
        data: [
          { name: '动销商家',  value: sh.activeSellerCount, itemStyle: { color: COLORS.primary } },
          { name: '未动销商家', value: M.meta.sellerCount - sh.activeSellerCount, itemStyle: { color: '#3a4252' } },
        ],
      }],
    });

    [c1, c2].forEach(c => window.addEventListener('resize', () => c.resize()));
  }

  // ============ Tab 4: 场域分析 ============
  function renderTab4() {
    const f = M.fieldAnalysis;
    const root = document.getElementById('tab4');
    const hasBuyer = (f.topBuyerKbo && f.topBuyerKbo.length > 0);
    root.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🎯 昨日全场域 DGMV 分布 <span class="card-sub">9 个场域 · 含环比</span></div>
          </div>
          <div id="chart-yest-field" class="chart tall"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📊 昨日各场域 GMV + 环比柱状对比</div>
          </div>
          <div id="chart-yest-bar" class="chart tall"></div>
        </div>
      </div>

      ${hasBuyer ? `
      <div class="grid-3">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot kbo"></span>K播主力买手 Top5</div>
          </div>
          ${renderBuyerTable(f.topBuyerKbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot dbo"></span>店播主力账号 Top5</div>
          </div>
          ${renderBuyerTable(f.topBuyerDbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot note"></span>商品笔记达人 Top5</div>
          </div>
          ${renderBuyerTable(f.topBuyerNote)}
        </div>
      </div>` : `
      <div class="card" style="border-color:rgba(210,153,34,.4);background:rgba(210,153,34,.04)">
        <div class="card-head">
          <div class="card-title text-warning">⏳ 主力买手 Top5（待补充）</div>
        </div>
        <div style="padding:8px 4px;color:var(--text-dim);font-size:13px;line-height:1.7">
          <b>当前看板的图表 chart_CCoZcLITD7 只有商家维度，无买手账号维度。</b><br/>
          需要从数据集 1922「人货场成交分析」按"买手账号 / 直播间昵称"维度新建查询取数。<br/>
          已计划用 NL 取数补充，本期先空缺。
        </div>
      </div>`}

      <div class="grid-3">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 K播昨日爆品 Top10 <span class="card-sub">载体大类=直播</span></div>
          </div>
          ${renderHotTable(f.hotSpuKbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 商卡昨日爆品 Top10 <span class="card-sub">载体大类=商卡</span></div>
          </div>
          ${renderHotTable(f.hotSpuDbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 笔记昨日爆品 Top10 <span class="card-sub">载体大类=笔记</span></div>
          </div>
          ${renderHotTable(f.hotSpuNote)}
        </div>
      </div>
    `;

    // 昨日全场域饼图
    const c1 = echarts.init(document.getElementById('chart-yest-field'));
    c1.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(28,35,45,0.96)',
        borderColor: COLORS.grid,
        textStyle: { color: COLORS.text },
        formatter: (p) => {
          const r = f.yesterdayByField[p.dataIndex];
          return `<b>${r.field}</b><br/>DGMV：${fmtNum(r.gmv)} 元<br/>环比：<span style="color:${r.chain>0?'#2ea043':'#f85149'}">${fmtPct(r.chain)}</span><br/>占比：${p.percent}%`;
        },
      },
      legend: { bottom: 0, textStyle: { color: COLORS.dim, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '42%'],
        label: { show: true, color: COLORS.text, fontSize: 11, formatter: '{b}\n{d}%' },
        labelLine: { lineStyle: { color: COLORS.dim } },
        itemStyle: { borderColor: '#1c232d', borderWidth: 2 },
        data: f.yesterdayByField.map(r => ({
          name: r.field,
          value: r.gmv,
          itemStyle: { color: fieldColor(r.field) },
        })),
      }],
    });

    // 各场域 + 环比 柱状图
    const c2 = echarts.init(document.getElementById('chart-yest-bar'));
    const opt2 = baseOpt();
    c2.setOption({
      ...opt2,
      grid: { ...opt2.grid, left: 8, right: 16, top: 60 },
      tooltip: { ...opt2.tooltip, valueFormatter: (v) => fmtNum(v) + ' 元' },
      xAxis: {
        ...opt2.xAxis,
        data: f.yesterdayByField.map(r => r.field),
        axisLabel: { ...opt2.xAxis.axisLabel, rotate: 30, fontSize: 11 },
      },
      series: [{
        type: 'bar',
        barWidth: '52%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (p) => fieldColor(f.yesterdayByField[p.dataIndex].field),
        },
        label: {
          show: true, position: 'top', color: COLORS.text, fontSize: 11,
          formatter: (p) => {
            const c = f.yesterdayByField[p.dataIndex].chain;
            return `${fmtNum(p.value)}\n${fmtPct(c)}`;
          },
        },
        data: f.yesterdayByField.map(r => r.gmv),
      }],
    });

    [c1, c2].forEach(c => window.addEventListener('resize', () => c.resize()));
  }

  function renderBuyerTable(rows) {
    if (!rows || rows.length === 0) {
      return `<div style="padding:16px;text-align:center;color:var(--text-dim)">暂无数据</div>`;
    }
    return `
      <table class="table">
        <thead><tr><th width="36">#</th><th>买手 / 账号</th><th class="num">DGMV</th><th class="num">商家</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${rankBadge(r.rank)}</td>
              <td>${r.name}</td>
              <td class="num">${fmtNum(r.gmv)}</td>
              <td class="num text-dim">${r.sellerCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  function renderHotTable(rows) {
    if (!rows || rows.length === 0) {
      return `<div style="padding:16px;text-align:center;color:var(--text-dim)">暂无数据</div>`;
    }
    return `
      <table class="table">
        <thead><tr><th width="36">#</th><th>商品 / 商家</th><th class="num">DGMV</th><th class="num">环比</th></tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td>${rankBadge(i+1)}</td>
              <td>
                <div style="font-size:13px;line-height:1.4;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.name||'').replace(/"/g,'&quot;')}">${r.name}</div>
                <div class="text-dim" style="font-size:11px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.seller||'').replace(/"/g,'&quot;')}">${r.seller}</div>
              </td>
              <td class="num">${fmtNum(r.gmv)}</td>
              <td class="num">${r.chain ? `<span class="chip ${chipClass(r.chain)}">${chipArrow(r.chain)} ${fmtPct(Math.abs(r.chain), false)}</span>` : '<span class="text-dim">—</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // ============ Tab 5: 双月类目进度 ============
  function renderTab5() {
    const b = M.bimonthly;
    const root = document.getElementById('tab5');

    if (b.pending || !b.categories || b.categories.length === 0) {
      root.innerHTML = `
        <div class="card" style="border-color:rgba(210,153,34,.4);background:rgba(210,153,34,.04)">
          <div class="card-head">
            <div class="card-title text-warning">⏳ 双月类目进度（待补充）</div>
          </div>
          <div style="padding:8px 4px;color:var(--text-dim);font-size:13px;line-height:1.8">
            <p>当前周期：<b>${b.period || '2026-03 / 2026-04'}</b></p>
            <p style="margin-top:12px">本模块需要的数据：</p>
            <ul style="margin-top:8px;padding-left:24px">
              <li><b>双月目标 GMV</b>（按三级类目拆分）— 需要从休食组目标管理系统/Excel 导入</li>
              <li><b>实际累计 GMV</b>（按三级类目拆分）— 从数据集 1922 NL 取数</li>
            </ul>
            <p style="margin-top:12px">当前看板的图表中没有"三级类目目标 vs 实际"的数据，<b>需要你提供本双月类目目标</b>，然后我接 NL 取数补全实际值。</p>
            <p style="margin-top:16px;color:var(--text)">📞 请提供：本双月（3-4 月）休食组各三级类目目标清单（CSV / 表格 / 文档均可）</p>
          </div>
        </div>
      `;
      return;
    }

    // ... 有数据时的渲染（暂保留）
    const overall = b.overall;
    const cats = b.categories.slice().sort((a, b) => b.leadGap - a.leadGap);
    root.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">📅 双月周期</div>
          <div class="kpi-value" style="font-size:20px">${b.period}</div>
          <div class="kpi-foot text-dim">已过 ${b.daysPassed} / ${b.daysTotal} 天 · 时间进度 ${fmtPct(b.progressDate, false)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">🎯 双月目标 GMV</div>
          <div class="kpi-value">${fmtNum(overall.target)}<span class="unit">元</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">💰 当前 GMV</div>
          <div class="kpi-value">${fmtNum(overall.actual)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">完成度 <b style="color:${overall.progress >= b.progressDate ? '#2ea043' : '#d29922'}">${fmtPct(overall.progress, false)}</b></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">📊 整体进度差</div>
          <div class="kpi-value" style="color:${overall.progress >= b.progressDate ? '#2ea043' : '#d29922'}">${fmtPct(overall.progress - b.progressDate)}</div>
          <div class="kpi-foot text-dim">完成度 - 时间进度</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-title">🏷️ 三级类目进度</div>
        </div>
        <table class="table">
          <thead><tr><th>类目</th><th class="num">目标</th><th class="num">实际</th><th>进度</th><th class="num">完成度</th></tr></thead>
          <tbody>
            ${cats.map(c => `
              <tr>
                <td>${c.name}</td>
                <td class="num">${fmtNum(c.target)}</td>
                <td class="num">${fmtNum(c.actual)}</td>
                <td><div class="bar"><div class="bar-fill" style="width:${Math.min(c.progress, 1)*100}%"></div></div></td>
                <td class="num"><b>${fmtPct(c.progress, false)}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============ Tab 切换 ============
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }

  // ============ 初始化 ============
  function init() {
    document.getElementById('owner-name').textContent = `${M.meta.ownerName}（${M.meta.ownerAlias}）`;
    document.getElementById('owner-dept').textContent = M.meta.department;
    document.getElementById('updated-at').textContent = M.meta.updatedAt;
    // 数据来源标记
    const srcEl = document.getElementById('data-source');
    if (srcEl) {
      srcEl.textContent = M.meta.dataSource === 'real' ? '✅ 真实数据' : 'DEMO · Mock 数据';
      srcEl.style.color = M.meta.dataSource === 'real' ? '#2ea043' : '';
    }

    renderTab1();
    renderTab2();
    renderTab3();
    renderTab4();
    renderTab5();

    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => switchTab(t.dataset.tab));
    });

    switchTab('tab1');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

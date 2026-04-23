// 大门业绩看板 2.0 - 渲染逻辑
(function () {
  const M = window.MOCK;
  const COLORS = {
    kbo:  '#ff5577',
    dbo:  '#58a6ff',
    note: '#d2a8ff',
    primary: '#ff2442',
    text: '#e6edf3',
    dim:  '#8b949e',
    grid: '#2d333b',
  };

  // ---- 工具 ----
  const fmtNum = (n) => {
    if (n == null) return '-';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n >= 1e8) return sign + (n / 1e8).toFixed(2) + ' 亿';
    if (n >= 1e4) return sign + (n / 1e4).toFixed(1) + ' 万';
    return sign + n.toLocaleString('en-US');
  };
  const fmtPct = (v, withSign = true) => {
    if (v == null) return '-';
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
    const root = document.getElementById('tab1');
    root.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">🔴 今日累计 DGMV <span class="live-dot" style="background:#ff2442"></span></div>
          <div class="kpi-value">${fmtNum(t.dgmv_total)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">截至 ${t.updatedAt}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot kbo"></span>K播 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_kbo)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">占比 ${fmtPct(t.dgmv_kbo / t.dgmv_total, false)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot dbo"></span>店播 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_dbo)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">占比 ${fmtPct(t.dgmv_dbo / t.dgmv_total, false)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label"><span class="dot note"></span>商品笔记 DGMV</div>
          <div class="kpi-value">${fmtNum(t.dgmv_note)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">占比 ${fmtPct(t.dgmv_note / t.dgmv_total, false)}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">📈 今日 DGMV 小时趋势 <span class="card-sub">实时累计</span></div>
          </div>
          <div id="chart-today-hourly" class="chart"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📅 昨日 DGMV 分场域 <span class="card-sub">2026-04-22 · 含环比</span></div>
          </div>
          <div class="kpi-grid" style="margin-bottom:16px">
            <div class="kpi-card">
              <div class="kpi-label">昨日总 DGMV</div>
              <div class="kpi-value">${fmtNum(y.total)}<span class="unit">元</span></div>
              <div class="kpi-foot"><span class="chip ${chipClass(y.total_chain)}">${chipArrow(y.total_chain)} ${fmtPct(y.total_chain)}</span><span class="text-dim">环比前一日</span></div>
            </div>
          </div>
          <div id="chart-yesterday-field" class="chart short"></div>
        </div>
      </div>
    `;

    // 今日小时趋势
    const c1 = echarts.init(document.getElementById('chart-today-hourly'));
    const opt1 = baseOpt();
    c1.setOption({
      ...opt1,
      xAxis: { ...opt1.xAxis, data: t.hourly.map(h => h.hour) },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
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
        data: t.hourly.map(h => h.dgmv),
      }],
    });

    // 昨日分场域
    const c2 = echarts.init(document.getElementById('chart-yesterday-field'));
    const opt2 = baseOpt();
    c2.setOption({
      ...opt2,
      tooltip: { ...opt2.tooltip, trigger: 'item' },
      xAxis: { ...opt2.xAxis, data: ['K播', '店播', '商品笔记'] },
      series: [{
        type: 'bar',
        barWidth: '38%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params) => [COLORS.kbo, COLORS.dbo, COLORS.note][params.dataIndex],
        },
        label: {
          show: true, position: 'top', color: COLORS.text, fontSize: 11,
          formatter: (params) => fmtNum(params.value),
        },
        data: [y.kbo, y.dbo, y.note],
      }],
    });
    [c1, c2].forEach(c => window.addEventListener('resize', () => c.resize()));
  }

  // ============ Tab 2: 趋势 & 异动 ============
  function renderTab2() {
    const tr = M.trend;
    const root = document.getElementById('tab2');
    root.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">📈 近 14 天 DGMV 日趋势 <span class="card-sub">按场域堆叠</span></div>
        </div>
        <div id="chart-trend14" class="chart tall"></div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">📊 近 7 天 vs 上 7 天 <span class="card-sub">三场域对比</span></div>
          </div>
          <div id="chart-compare7d" class="chart"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">🏷️ 品类突增 / 突降 <span class="card-sub">三级类目 · 近 7 天 vs 上 7 天</span></div>
          </div>
          <div id="chart-category" class="chart"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🚀 商家突增 Top10 <span class="card-sub">近 7 天 vs 上 7 天</span></div>
          </div>
          ${renderSellerTable(tr.sellerSurge, true)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📉 商家突降 Top10 <span class="card-sub">近 7 天 vs 上 7 天</span></div>
          </div>
          ${renderSellerTable(tr.sellerDrop, false)}
        </div>
      </div>
    `;

    // 14 天堆叠
    const c1 = echarts.init(document.getElementById('chart-trend14'));
    const opt1 = baseOpt();
    c1.setOption({
      ...opt1,
      legend: { data: ['K播', '店播', '商品笔记'], textStyle: { color: COLORS.dim }, top: 0, right: 8 },
      tooltip: { ...opt1.tooltip, valueFormatter: (v) => fmtNum(v) + ' 元' },
      grid: { ...opt1.grid, top: 40 },
      xAxis: { ...opt1.xAxis, data: tr.dates14 },
      series: [
        { name: 'K播',     type: 'bar', stack: 'a', barWidth: '50%', itemStyle: { color: COLORS.kbo }, data: tr.dgmv14.kbo },
        { name: '店播',    type: 'bar', stack: 'a', itemStyle: { color: COLORS.dbo }, data: tr.dgmv14.dbo },
        { name: '商品笔记', type: 'bar', stack: 'a', itemStyle: { color: COLORS.note, borderRadius: [4, 4, 0, 0] }, data: tr.dgmv14.note },
      ],
    });

    // 7d vs 上7d
    const c2 = echarts.init(document.getElementById('chart-compare7d'));
    const opt2 = baseOpt();
    c2.setOption({
      ...opt2,
      legend: { data: ['上 7 天', '近 7 天'], textStyle: { color: COLORS.dim }, top: 0, right: 8 },
      tooltip: { ...opt2.tooltip, valueFormatter: (v) => fmtNum(v) + ' 元' },
      grid: { ...opt2.grid, top: 40 },
      xAxis: { ...opt2.xAxis, data: tr.compare7d.map(d => d.field) },
      series: [
        { name: '上 7 天', type: 'bar', barWidth: '28%', itemStyle: { color: '#3a4252', borderRadius: [4,4,0,0] }, data: tr.compare7d.map(d => d.prev7) },
        { name: '近 7 天', type: 'bar', barWidth: '28%', itemStyle: { color: COLORS.primary, borderRadius: [4,4,0,0] }, data: tr.compare7d.map(d => d.last7),
          label: { show: true, position: 'top', color: COLORS.text, fontSize: 11,
            formatter: (p) => `${fmtPct(tr.compare7d[p.dataIndex].chain)}` } },
      ],
    });

    // 品类突增突降
    const c3 = echarts.init(document.getElementById('chart-category'));
    const opt3 = baseOpt();
    const cats = [...tr.categorySurge.slice().reverse(), ...tr.categoryDrop];
    c3.setOption({
      ...opt3,
      grid: { ...opt3.grid, left: 120 },
      tooltip: { ...opt3.tooltip, trigger: 'item', formatter: (p) => `${p.name}<br/>环比 <b>${fmtPct(p.value / 100)}</b>` },
      yAxis: {
        type: 'category',
        data: cats.map(c => c.cat),
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisLabel: { color: COLORS.dim, fontSize: 11 },
        axisTick: { show: false },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: COLORS.dim, fontSize: 11, formatter: (v) => v + '%' },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
      },
      series: [{
        type: 'bar',
        data: cats.map(c => ({
          value: +(c.chain * 100).toFixed(1),
          itemStyle: { color: c.chain > 0 ? '#2ea043' : '#f85149', borderRadius: [0, 4, 4, 0] },
        })),
        barWidth: '60%',
        label: { show: true, position: 'right', color: COLORS.text, fontSize: 11, formatter: (p) => `${p.value > 0 ? '+' : ''}${p.value}%` },
      }],
    });

    [c1, c2, c3].forEach(c => window.addEventListener('resize', () => c.resize()));
  }

  function renderSellerTable(rows, isUp) {
    return `
      <table class="table">
        <thead><tr><th width="40">#</th><th>商家</th><th class="num">近 7 天 DGMV</th><th class="num">环比</th></tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td>${rankBadge(i + 1)}</td>
              <td>${r.name}</td>
              <td class="num">${fmtNum(r.last7)}</td>
              <td class="num"><span class="chip ${isUp ? 'up' : 'down'}">${chipArrow(r.chain)} ${fmtPct(r.chain)}</span></td>
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
          <div class="kpi-foot">
            <span class="chip ${chipClass(sh.activeSellerChain)}">${chipArrow(sh.activeSellerChain)} ${fmtPct(sh.activeSellerChain)}</span>
            <span class="text-dim">动销率 ${fmtPct(sh.activeSellerCount / M.meta.sellerCount, false)}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">🆕 本月新商 GMV</div>
          <div class="kpi-value">${fmtNum(sh.newSellerTotal)}<span class="unit">元</span></div>
          <div class="kpi-foot text-dim">${sh.newSellerThisMonth.length} 个新商</div>
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
            <div class="card-title">🆕 本月新商 GMV 明细 <span class="card-sub">按首次动销时间排序</span></div>
          </div>
          <table class="table">
            <thead><tr><th>商家</th><th>首次动销</th><th class="num">本月 GMV</th></tr></thead>
            <tbody>
              ${sh.newSellerThisMonth.map(s => `
                <tr>
                  <td>${s.name}</td>
                  <td class="text-dim">${s.firstActive}</td>
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
      grid: { ...opt1.grid, left: 130, right: 80 },
      tooltip: { ...opt1.tooltip, formatter: (p) => {
        const row = sh.top15[sh.top15.length - 1 - p[0].dataIndex];
        return `<b>${row.name}</b><br/>近7天 DGMV：${fmtNum(row.gmv)} 元<br/>同比：<span style="color:${row.yoyChain>0?'#2ea043':'#f85149'}">${fmtPct(row.yoyChain)}</span> (${row.yoyChange>0?'+':''}${fmtNum(row.yoyChange)})`;
      }},
      yAxis: {
        type: 'category',
        data: data.map(r => r.name),
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisLabel: { color: COLORS.dim, fontSize: 11 },
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
            const yoyChain = data[p.dataIndex].yoyChain;
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
            const yoy = data[p.dataIndex].yoyChain;
            const arrow = yoy > 0 ? '↑' : yoy < 0 ? '↓' : '—';
            return `${fmtNum(p.value)}  ${arrow}${fmtPct(Math.abs(yoy), false)}`;
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
    root.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🎯 昨日分场域 DGMV <span class="card-sub">含环比 · ${M.meta.updatedAt.split(' ')[0]}</span></div>
          </div>
          <div id="chart-yest-field" class="chart"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">📊 近 7 天分场域汇总 <span class="card-sub">含环比</span></div>
          </div>
          <div id="chart-7d-field" class="chart"></div>
        </div>
      </div>

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
      </div>

      <div class="grid-3">
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 K播昨日爆品 Top10</div>
          </div>
          ${renderHotTable(f.hotSpuKbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 店播昨日爆品 Top10</div>
          </div>
          ${renderHotTable(f.hotSpuDbo)}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">🔥 商品笔记昨日爆品 Top10</div>
          </div>
          ${renderHotTable(f.hotSpuNote)}
        </div>
      </div>
    `;

    // 昨日分场域
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
          return `<b>${r.field}</b><br/>DGMV：${fmtNum(r.gmv)} 元<br/>环比：<span style="color:${r.chain>0?'#2ea043':'#f85149'}">${fmtPct(r.chain)}</span><br/>占比：${fmtPct(r.share, false)}`;
        },
      },
      legend: { bottom: 0, textStyle: { color: COLORS.dim } },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '45%'],
        label: { show: true, color: COLORS.text, fontSize: 12, formatter: '{b}\n{d}%' },
        itemStyle: { borderColor: '#1c232d', borderWidth: 2 },
        data: f.yesterdayByField.map(r => ({
          name: r.field,
          value: r.gmv,
          itemStyle: { color: { kbo: COLORS.kbo, dbo: COLORS.dbo, note: COLORS.note }[r.field === 'K播' ? 'kbo' : r.field === '店播' ? 'dbo' : 'note'] },
        })),
      }],
    });

    // 近7天分场域 - 条形对比
    const c2 = echarts.init(document.getElementById('chart-7d-field'));
    const opt2 = baseOpt();
    c2.setOption({
      ...opt2,
      tooltip: { ...opt2.tooltip, valueFormatter: (v) => fmtNum(v) + ' 元' },
      xAxis: { ...opt2.xAxis, data: f.last7ByField.map(r => r.field) },
      series: [{
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (p) => [COLORS.kbo, COLORS.dbo, COLORS.note][p.dataIndex],
        },
        label: {
          show: true, position: 'top', color: COLORS.text, fontSize: 11,
          formatter: (p) => {
            const c = f.last7ByField[p.dataIndex].chain;
            return `${fmtNum(p.value)}\n${fmtPct(c)}`;
          },
        },
        data: f.last7ByField.map(r => r.gmv),
      }],
    });

    [c1, c2].forEach(c => window.addEventListener('resize', () => c.resize()));
  }

  function renderBuyerTable(rows) {
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
    return `
      <table class="table">
        <thead><tr><th width="36">#</th><th>商品 / 商家</th><th class="num">DGMV</th><th class="num">环比</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${rankBadge(r.rank)}</td>
              <td>
                <div style="font-size:13px">${r.name}</div>
                <div class="text-dim" style="font-size:11px">${r.seller}</div>
              </td>
              <td class="num">${fmtNum(r.gmv)}</td>
              <td class="num"><span class="chip ${chipClass(r.chain)}">${chipArrow(r.chain)} ${fmtPct(Math.abs(r.chain), false)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // ============ Tab 5: 双月类目进度 ============
  function renderTab5() {
    const b = M.bimonthly;
    const root = document.getElementById('tab5');
    const overall = b.overall;

    // 按 leadGap 排序：领先 → 落后
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
          <div class="kpi-foot text-dim">休食组目标</div>
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
          <div class="card-title">🏷️ 三级类目进度详情 <span class="card-sub">按领先/落后排序 · 浅色虚线为时间进度（${fmtPct(b.progressDate, false)}）</span></div>
        </div>
        <table class="table" style="font-size:13px">
          <thead>
            <tr>
              <th>三级类目</th>
              <th class="num" width="120">目标</th>
              <th class="num" width="120">当前 GMV</th>
              <th width="280">进度条</th>
              <th class="num" width="90">完成度</th>
              <th class="num" width="90">vs 时间进度</th>
            </tr>
          </thead>
          <tbody>
            ${cats.map(c => {
              const status = c.leadGap >= 0.02 ? 'good' : c.leadGap >= -0.05 ? '' : c.leadGap >= -0.15 ? 'warn' : 'bad';
              const tag = c.leadGap >= 0.02 ? '<span class="chip up">领先</span>' :
                          c.leadGap >= -0.05 ? '<span class="chip flat">同步</span>' :
                          c.leadGap >= -0.15 ? '<span class="chip" style="color:#d29922;background:rgba(210,153,34,.12)">落后</span>' :
                                               '<span class="chip down">滞后</span>';
              return `
                <tr>
                  <td>${c.name}</td>
                  <td class="num">${fmtNum(c.target)}</td>
                  <td class="num">${fmtNum(c.actual)}</td>
                  <td>
                    <div style="position:relative">
                      <div class="bar"><div class="bar-fill ${status}" style="width:${Math.min(c.progress, 1) * 100}%"></div></div>
                      <div style="position:absolute;left:${b.progressDate * 100}%;top:-3px;width:1px;height:12px;background:rgba(255,255,255,0.5)"></div>
                    </div>
                  </td>
                  <td class="num"><b>${fmtPct(c.progress, false)}</b></td>
                  <td class="num">${tag} <span class="text-dim" style="font-size:11px">${fmtPct(c.leadGap)}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">📊 类目完成度 vs 时间进度 <span class="card-sub">参考线为时间进度 ${fmtPct(b.progressDate, false)}</span></div>
        </div>
        <div id="chart-cat-progress" class="chart tall"></div>
      </div>
    `;

    const c1 = echarts.init(document.getElementById('chart-cat-progress'));
    const opt1 = baseOpt();
    const sorted = cats.slice().reverse();
    c1.setOption({
      ...opt1,
      grid: { ...opt1.grid, left: 180, right: 30 },
      tooltip: { ...opt1.tooltip, trigger: 'item', formatter: (p) => `${p.name}<br/>完成度：<b>${p.value}%</b><br/>差异：${fmtPct(sorted[p.dataIndex].leadGap)}` },
      yAxis: {
        type: 'category',
        data: sorted.map(c => c.name),
        axisLine: { lineStyle: { color: COLORS.grid } },
        axisLabel: { color: COLORS.dim, fontSize: 11 },
        axisTick: { show: false },
      },
      xAxis: {
        type: 'value', max: 100, min: 0,
        axisLine: { show: false },
        axisLabel: { color: COLORS.dim, fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
      },
      series: [{
        type: 'bar',
        barWidth: '55%',
        data: sorted.map(c => ({
          value: +(c.progress * 100).toFixed(1),
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: c.leadGap >= 0.02 ? '#2ea043' : c.leadGap >= -0.05 ? '#58a6ff' : c.leadGap >= -0.15 ? '#d29922' : '#f85149',
          },
        })),
        label: { show: true, position: 'right', color: COLORS.text, fontSize: 11, formatter: '{c}%' },
        markLine: {
          symbol: 'none',
          lineStyle: { color: 'rgba(255,255,255,0.5)', type: 'dashed', width: 1.5 },
          label: { color: COLORS.dim, fontSize: 11, formatter: '时间进度 {c}%' },
          data: [{ xAxis: +(b.progressDate * 100).toFixed(1) }],
        },
      }],
    });
    window.addEventListener('resize', () => c1.resize());
  }

  // ============ Tab 切换 ============
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === name));
    // 触发 echarts 重绘
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }

  // ============ 初始化 ============
  function init() {
    // 填充 header meta
    document.getElementById('owner-name').textContent = `${M.meta.ownerName}（${M.meta.ownerAlias}）`;
    document.getElementById('owner-dept').textContent = M.meta.department;
    document.getElementById('updated-at').textContent = M.meta.updatedAt;

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

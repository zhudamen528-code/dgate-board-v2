/* 休食组业绩看板 — 前端逻辑 */

const STATE = {
  index: null,
  currentPeriod: "yesterday",
  currentTab: "tab1_team_overview",
  cache: {},  // `${period}/${chartId}` -> data
  charts: {}, // chart_id -> echarts instance (current view)
};

const EL = {
  meta: document.getElementById("generated-at"),
  periodButtons: document.getElementById("period-buttons"),
  periodInfo: document.getElementById("period-info"),
  tabBar: document.getElementById("tab-bar"),
  main: document.getElementById("main-content"),
};

// ------------- utils -------------
function fmtNumber(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v !== "number") return v;
  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(2) + "亿";
  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(2) + "万";
  if (Math.abs(v) >= 1) return v.toLocaleString("zh-CN", {maximumFractionDigits: 2});
  return v.toFixed(4);
}
function fmtPct(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v !== "number") return v;
  const sign = v > 0 ? "+" : "";
  return sign + (v * 100).toFixed(2) + "%";
}
function isNumericCol(col) {
  // 启发式：列名包含 GMV / 数 / 数量 / UV / CTR / CES / 时长 / 率 / 量
  return /GMV|数|UV|CTR|CES|时长|率|量|金额|场次|单|秒/i.test(col);
}
function isPctCol(col) {
  return /变化率|环比|同比|占比|率|比例/i.test(col) && !/利率|税率/.test(col);
}

async function fetchData(period, chartId) {
  const key = `${period}/${chartId}`;
  if (STATE.cache[key]) return STATE.cache[key];
  try {
    const resp = await fetch(`data/${period}/${chartId}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    STATE.cache[key] = data;
    return data;
  } catch (e) {
    console.warn("fetch fail", key, e);
    return null;
  }
}

// ------------- init -------------
async function init() {
  const resp = await fetch("data/index.json");
  STATE.index = await resp.json();
  EL.meta.textContent = `数据更新：${STATE.index.generated_at}`;
  renderPeriodButtons();
  renderTabBar();
  await renderActiveTab();
}

function renderPeriodButtons() {
  EL.periodButtons.innerHTML = "";
  STATE.index.periods.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.label;
    btn.dataset.period = p.key;
    if (p.key === "yoy_bimonth") btn.classList.add("yoy-btn");
    if (p.key === STATE.currentPeriod) btn.classList.add("active");
    btn.onclick = async () => {
      STATE.currentPeriod = p.key;
      document.body.classList.toggle("period-yoy", p.key === "yoy_bimonth");
      EL.periodButtons.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updatePeriodInfo();
      await renderActiveTab();
    };
    EL.periodButtons.appendChild(btn);
  });
  updatePeriodInfo();
}
function updatePeriodInfo() {
  const p = STATE.index.periods.find(x => x.key === STATE.currentPeriod);
  if (!p) return;
  EL.periodInfo.innerHTML = `时间窗：<b>${p.start} ~ ${p.end}</b>`;
}

function renderTabBar() {
  EL.tabBar.innerHTML = "";
  STATE.index.tabs.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t.name;
    btn.dataset.tab = t.key;
    if (t.key === STATE.currentTab) btn.classList.add("active");
    btn.onclick = async () => {
      STATE.currentTab = t.key;
      EL.tabBar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await renderActiveTab();
    };
    EL.tabBar.appendChild(btn);
  });
}

// ------------- rendering -------------
async function renderActiveTab() {
  EL.main.innerHTML = `<div class="loading">加载中…</div>`;
  const tab = STATE.index.tabs.find(t => t.key === STATE.currentTab);
  if (!tab) return;

  // 提前 fetch 全部 chart 当前 period 的数据
  const datas = await Promise.all(tab.charts.map(c => fetchData(STATE.currentPeriod, c.id)));

  EL.main.innerHTML = "";

  // KPI 概览（仅 tab1）
  if (tab.key === "tab1_team_overview") {
    EL.main.appendChild(buildTeamKpis(datas[0])); // t1_yesterday_perf 总计行
  }

  tab.charts.forEach((c, i) => {
    const data = datas[i];
    EL.main.appendChild(renderChartCard(c, data));
  });
}

function buildTeamKpis(yperfData) {
  const wrap = document.createElement("div");
  wrap.className = "kpi-row";
  if (!yperfData || !yperfData.rows || !yperfData.rows.length) {
    wrap.innerHTML = `<div class="kpi-card"><div class="label">无数据</div></div>`;
    return wrap;
  }
  // 找"总计"行
  const cols = yperfData.columns;
  const idxDim = 0;
  const idxGmv = cols.findIndex(c => /^DGMV\s*$/i.test(c));
  const idxRate = cols.findIndex(c => /环比/.test(c));
  const totalRow = yperfData.rows.find(r => r[idxDim] === "总计") || yperfData.rows[0];
  const items = [
    {label: `期间 DGMV (${STATE.currentPeriod})`, value: fmtNumber(totalRow[idxGmv]), delta: totalRow[idxRate]},
    {label: "场域数", value: yperfData.rows.length - 1},
    {label: "图表对应时段", value: STATE.index.periods.find(p => p.key === STATE.currentPeriod).label},
  ];
  items.forEach(it => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    let deltaHtml = "";
    if (it.delta !== undefined && it.delta !== null && typeof it.delta === "number") {
      const cls = it.delta >= 0 ? "up" : "down";
      const arrow = it.delta >= 0 ? "▲" : "▼";
      deltaHtml = `<div class="delta ${cls}">${arrow} ${fmtPct(Math.abs(it.delta))} 环比</div>`;
    }
    card.innerHTML = `
      <div class="label">${it.label}</div>
      <div class="value">${it.value}</div>
      ${deltaHtml}
    `;
    wrap.appendChild(card);
  });
  return wrap;
}

function renderChartCard(chartDef, data) {
  const card = document.createElement("section");
  card.className = "chart-card";

  const header = document.createElement("div");
  header.className = "chart-header";
  header.innerHTML = `
    <div class="chart-title">${chartDef.name}</div>
    <div class="chart-meta">
      <span>原图：<a href="${chartDef.source_url}" target="_blank">${data ? data.chart_name : chartDef.id}</a></span>
      ${data ? `<span>共 ${data.total_rows} 行</span>` : ""}
    </div>
  `;
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "chart-body";
  if (!data || !data.rows || !data.rows.length) {
    body.innerHTML = `<div class="empty">该时段无数据 ${data && data.rewrite_status ? '· '+data.rewrite_status : ''}</div>`;
  } else {
    renderTableOrChart(body, data, chartDef);
  }
  card.appendChild(body);

  // 筛选条件
  if (data && data.filters && data.filters.length) {
    const filters = document.createElement("div");
    filters.className = "filters";
    filters.textContent = "图表口径：" + data.filters.join("；");
    card.appendChild(filters);
  }
  return card;
}

function renderTableOrChart(container, data, chartDef) {
  // 默认渲染策略：
  //  - 纯透视(2~6 行)：渲染为柱状图 + 表格
  //  - 多行：表格优先
  //  - 时间趋势(列含"日期"/"分区")：折线图
  const cols = data.columns;
  const rows = data.rows;
  const dimCol = cols[0] || "";
  const isTimeSeries = /日期|分区|时间/.test(dimCol);

  if (isTimeSeries && rows.length > 1 && rows.length <= 100) {
    container.appendChild(renderEcharts(data, "line"));
  } else if (rows.length <= 12 && cols.length >= 2 && /GMV|数|额|场次|时长/.test(cols[1] || "")) {
    container.appendChild(renderEcharts(data, "bar"));
  }
  container.appendChild(renderTable(data));
}

function renderTable(data) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const cols = data.columns;
  const rows = data.rows;
  let html = `<table class="data-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>`;
  rows.slice(0, 200).forEach(r => {
    html += "<tr>" + r.map((v, i) => {
      const col = cols[i] || "";
      const isNum = typeof v === "number";
      const isPct = isPctCol(col);
      let cls = isNum ? "num" : "";
      let display;
      if (v === null || v === undefined) display = "-";
      else if (isPct && isNum) {
        display = fmtPct(v);
        if (v > 0) cls += " up";
        else if (v < 0) cls += " down";
      } else if (isNum) display = fmtNumber(v);
      else display = v;
      return `<td class="${cls}">${display}</td>`;
    }).join("") + "</tr>";
  });
  html += "</tbody></table>";
  wrap.innerHTML = html;
  if (rows.length > 200) {
    const info = document.createElement("div");
    info.className = "table-info";
    info.textContent = `表格仅显示前 200 行（共 ${data.total_rows} 行，BI 原始数据可点上方"原图"链接查看）`;
    wrap.appendChild(info);
  }
  return wrap;
}

function renderEcharts(data, type) {
  const box = document.createElement("div");
  box.className = "echarts-box";
  // 等待 DOM 挂载后初始化
  setTimeout(() => {
    const chart = echarts.init(box);
    const cols = data.columns;
    const rows = data.rows.filter(r => r[0] !== "总计");
    const dimVals = rows.map(r => r[0]);
    // 找数值列：跳过第一列(维度) + 跳过百分比列 + 取第一个数值列
    const metricIdx = cols.findIndex((c, i) => i > 0 && !isPctCol(c) && rows.some(r => typeof r[i] === "number"));
    if (metricIdx < 0) return;
    const series = rows.map(r => r[metricIdx]);
    chart.setOption({
      tooltip: {trigger: "axis", formatter: function(params) {
        return params.map(p => `${p.name}: <b>${fmtNumber(p.value)}</b>`).join("<br>");
      }},
      grid: {left: 60, right: 30, top: 30, bottom: 50, containLabel: true},
      xAxis: {type: "category", data: dimVals, axisLabel: {rotate: dimVals.length > 6 ? 25 : 0, fontSize: 11}},
      yAxis: {type: "value", axisLabel: {formatter: v => fmtNumber(v)}},
      series: [{
        type: type,
        data: series,
        smooth: type === "line",
        itemStyle: {color: "#ff5f6d"},
        lineStyle: type === "line" ? {color: "#ff5f6d", width: 3} : undefined,
        areaStyle: type === "line" ? {color: "rgba(255,95,109,0.1)"} : undefined,
        label: type === "bar" ? {show: true, position: "top", formatter: p => fmtNumber(p.value), fontSize: 10} : undefined,
      }],
    });
    window.addEventListener("resize", () => chart.resize());
  }, 0);
  return box;
}

init();

# 大门业绩看板 2.0

> 小红书电商三部 · 五组（休食）· AM 大门（朱锦程）业绩看板  
> 第一版：纯前端 Mock Demo（无真实数据），用于验证布局与交互

## 看板内容

5 个 Tab：

1. **🔴 今日实时** — 今日累计 DGMV、K播/店播/商笔分场域、小时趋势、昨日 DGMV 环比
2. **📈 趋势 & 异动** — 近 14 天 DGMV 趋势、近 7 天 vs 上 7 天三场域对比、商家突增/突降 Top10、品类突增/突降
3. **🏪 商家健康** — Top15 商家排行、动销/未动销分布、本月新商 GMV 明细
4. **🎯 场域分析** — 昨日/近 7 天分场域、K播/店播/商品笔记主力买手 Top5、三场域昨日爆品 Top10
5. **📦 双月类目进度** — 2026-03/04 双月三级类目进度（领先/同步/落后/滞后状态）

## 技术栈

- 纯静态 HTML + 原生 JS
- [ECharts 5.5.1](https://echarts.apache.org/) (CDN 引入，无打包)
- Tailwind 风格的 CSS Variables，深色主题
- 单文件部署，无构建步骤

## 本地预览

```bash
cd dgate-board-v2
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

或直接双击 `index.html` 在浏览器中打开。

## 部署到 GitHub Pages

> 本看板包含商业数据，仓库**必须为 private**。GitHub Pages 的 private 仓库支持需要 GitHub Pro / Team / Enterprise 账号。

1. 在 GitHub 创建一个 **private 仓库**（例：`dgate-board-v2`）
2. 推送代码：
   ```bash
   cd dgate-board-v2
   git init
   git add .
   git commit -m "init: 大门业绩看板 2.0 mock 版"
   git branch -M main
   git remote add origin git@github.com:<your-username>/dgate-board-v2.git
   git push -u origin main
   ```
3. 在仓库设置中启用 Pages：`Settings → Pages → Source: Deploy from branch → main / (root)`
4. 等几十秒后，访问 `https://<your-username>.github.io/dgate-board-v2/`

## 数据接入路线（下一阶段）

当前 `data/mock.js` 是离线模拟数据。接真实数据有两种方式：

| 方案 | 说明 | 适用 |
| --- | --- | --- |
| A. 定时任务出 JSON | 用 OpenClaw 定时调用 RedBI API 拉数据，写入 `data/data.json`，前端 fetch 加载 | 推荐 |
| B. iframe 嵌入 | 直接 iframe 嵌入 RedBI 图表 URL | 快但样式不统一 |

底层数据集：
- 数据集 1922「人货场成交分析」— DGMV / K播 / 店播 / 商笔
- 数据集 18995「实时订单渠道归因明细」— 今日实时

## 文件结构

```
dgate-board-v2/
├── index.html          # 入口
├── assets/
│   ├── style.css       # 视觉样式
│   └── app.js          # 渲染逻辑
├── data/
│   └── mock.js         # Mock 数据（替换为真实数据时改这里）
└── README.md
```

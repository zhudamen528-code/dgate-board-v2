// 大门业绩看板 2.0 - Mock 数据
// 用于第一版 demo，后续替换为 RedBI 真实数据
// 数据基准日：2026-04-22（昨日），看板更新日：2026-04-23

window.MOCK = (() => {
  // 工具：生成日期序列
  const dateSeq = (n, endDate = '2026-04-22') => {
    const arr = [];
    const end = new Date(endDate);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      arr.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return arr;
  };

  // ---------- Tab 1: 今日实时 ----------
  const today = {
    updatedAt: '2026-04-23 20:30',
    dgmv_total: 1284560,        // 今日累计 DGMV（元）
    dgmv_kbo: 612300,            // K播
    dgmv_dbo: 348900,            // 店播
    dgmv_note: 323360,           // 商品笔记
    yesterday: {
      total: 2156780,
      kbo: 1024500,
      dbo: 583200,
      note: 549080,
      total_chain: 0.124,        // 环比 +12.4%
      kbo_chain: 0.087,
      dbo_chain: 0.156,
      note_chain: 0.213,
    },
    // 今日小时趋势（0-20点已有数据）
    hourly: Array.from({ length: 21 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      dgmv: Math.round(30000 + Math.sin(h / 24 * Math.PI * 2) * 25000 + Math.random() * 15000 + h * 2000),
    })),
  };

  // ---------- Tab 2: 趋势 & 异动 ----------
  const trend = {
    // 近14天 DGMV 日趋势（按场域堆叠）
    dates14: dateSeq(14),
    dgmv14: {
      kbo:  [856, 923, 1045, 987, 1102, 1156, 1089, 1023, 956, 1078, 1124, 1067, 1098, 1024].map(v => v * 1000),
      dbo:  [432, 456, 489, 467, 501, 523, 498, 478, 445, 489, 512, 487, 498, 583].map(v => v * 1000),
      note: [389, 412, 445, 423, 467, 489, 456, 434, 401, 445, 467, 423, 445, 549].map(v => v * 1000),
    },
    // 近7天 vs 上7天 三场域对比
    compare7d: [
      { field: 'K播',     last7: 7456000, prev7: 6823000, chain: 0.093 },
      { field: '店播',    last7: 3389000, prev7: 3156000, chain: 0.074 },
      { field: '商品笔记', last7: 3145000, prev7: 2987000, chain: 0.053 },
    ],
    // 商家突增突降（近7天 vs 上7天）- 突增 Top10
    sellerSurge: [
      { name: '休闲零食旗舰店',  last7: 458600, prev7: 218300, chain: 1.101, change: 240300 },
      { name: '坚果世家',        last7: 389400, prev7: 198700, chain: 0.960, change: 190700 },
      { name: '糖五朵官方',      last7: 612300, prev7: 356800, chain: 0.716, change: 255500 },
      { name: '蜜饯小铺',        last7: 234500, prev7: 145600, chain: 0.611, change:  88900 },
      { name: '能量棒工厂',      last7: 178900, prev7: 112400, chain: 0.591, change:  66500 },
      { name: '鱿鱼丝大王',      last7: 156700, prev7: 102300, chain: 0.532, change:  54400 },
      { name: '海苔乐园',        last7: 198400, prev7: 134800, chain: 0.471, change:  63600 },
      { name: '辣条研究所',      last7: 287300, prev7: 198600, chain: 0.447, change:  88700 },
      { name: '果干坊',          last7: 145600, prev7: 102800, chain: 0.416, change:  42800 },
      { name: '巧克力工坊',      last7: 234100, prev7: 167400, chain: 0.398, change:  66700 },
    ],
    // 突降 Top10
    sellerDrop: [
      { name: '老字号糕点',      last7: 123400, prev7: 312600, chain: -0.605, change: -189200 },
      { name: '蛋黄酥小镇',      last7:  87600, prev7: 198400, chain: -0.558, change: -110800 },
      { name: '传统茶点',        last7:  67800, prev7: 145600, chain: -0.534, change:  -77800 },
      { name: '酱菜世家',        last7:  98700, prev7: 198300, chain: -0.502, change:  -99600 },
      { name: '咸味零食铺',      last7: 145600, prev7: 287400, chain: -0.493, change: -141800 },
      { name: '果脯老店',        last7:  76800, prev7: 134500, chain: -0.429, change:  -57700 },
      { name: '豆制品专营',      last7: 112300, prev7: 189700, chain: -0.408, change:  -77400 },
      { name: '糖葫芦串',        last7:  56700, prev7:  92400, chain: -0.386, change:  -35700 },
      { name: '蜂蜜小作坊',      last7: 134500, prev7: 215600, chain: -0.376, change:  -81100 },
      { name: '风味小食',        last7: 167800, prev7: 264300, chain: -0.365, change:  -96500 },
    ],
    // 品类突增突降（三级类目）
    categorySurge: [
      { cat: '坚果炒货 / 综合果仁', last7: 1245600, prev7:  823400, chain: 0.513 },
      { cat: '休闲零食 / 辣条', last7:  856700, prev7:  612300, chain: 0.399 },
      { cat: '蜜饯果干 / 进口果干', last7:  423500, prev7:  312800, chain: 0.354 },
      { cat: '海味即食 / 鱿鱼制品', last7:  287400, prev7:  214600, chain: 0.339 },
      { cat: '糖果巧克力 / 黑巧',   last7:  198300, prev7:  148700, chain: 0.334 },
    ],
    categoryDrop: [
      { cat: '糕点点心 / 中式糕点', last7:  234500, prev7:  478600, chain: -0.510 },
      { cat: '调味酱料 / 传统酱菜', last7:  145600, prev7:  287300, chain: -0.493 },
      { cat: '茶饮冲调 / 速溶茶',   last7:  178900, prev7:  312400, chain: -0.427 },
      { cat: '豆制品 / 豆干',       last7:  223400, prev7:  378600, chain: -0.410 },
      { cat: '蜂产品 / 纯蜂蜜',     last7:  167800, prev7:  267900, chain: -0.374 },
    ],
  };

  // ---------- Tab 3: 商家健康 ----------
  const sellerHealth = {
    // 近7天商家 DGMV Top15（含同比）
    top15: [
      { rank: 1,  name: '糖五朵官方',         gmv: 1245600, yoyChain: 0.234, yoyChange: 236500 },
      { rank: 2,  name: '坚果世家',           gmv:  987300, yoyChain: 0.156, yoyChange: 133200 },
      { rank: 3,  name: '休闲零食旗舰店',     gmv:  856700, yoyChain: 0.089, yoyChange:  70100 },
      { rank: 4,  name: '辣条研究所',         gmv:  723400, yoyChain: 0.345, yoyChange: 185900 },
      { rank: 5,  name: '蜜饯小铺',           gmv:  612300, yoyChain: -0.045, yoyChange: -28900 },
      { rank: 6,  name: '海苔乐园',           gmv:  578900, yoyChain: 0.198, yoyChange:  95800 },
      { rank: 7,  name: '果干坊',             gmv:  523400, yoyChain: 0.123, yoyChange:  57300 },
      { rank: 8,  name: '巧克力工坊',         gmv:  489700, yoyChain: 0.078, yoyChange:  35400 },
      { rank: 9,  name: '能量棒工厂',         gmv:  467800, yoyChain: 0.412, yoyChange: 136700 },
      { rank: 10, name: '鱿鱼丝大王',         gmv:  423500, yoyChain: 0.067, yoyChange:  26500 },
      { rank: 11, name: '糕点小镇',           gmv:  398700, yoyChain: -0.123, yoyChange: -55800 },
      { rank: 12, name: '坚果优选',           gmv:  376500, yoyChain: 0.234, yoyChange:  71400 },
      { rank: 13, name: '果脯天地',           gmv:  354200, yoyChain: 0.045, yoyChange:  15200 },
      { rank: 14, name: '零食大集合',         gmv:  328900, yoyChain: 0.189, yoyChange:  52300 },
      { rank: 15, name: '蜂蜜世家',           gmv:  312400, yoyChain: 0.067, yoyChange:  19600 },
    ],
    // 近7天动销商家总数
    activeSellerCount: 247,
    activeSellerCountPrev7: 231,
    activeSellerChain: 0.069,
    // 本月新商 GMV（首次动销时间在 2026 年内的）
    newSellerThisMonth: [
      { name: '小铺Z',   firstActive: '2026-04-03', gmv:  87600 },
      { name: '坚果A',   firstActive: '2026-04-08', gmv:  76500 },
      { name: '果干B',   firstActive: '2026-04-12', gmv:  65400 },
      { name: '辣条C',   firstActive: '2026-04-15', gmv:  54300 },
      { name: '蜜饯D',   firstActive: '2026-04-18', gmv:  43200 },
      { name: '糕点E',   firstActive: '2026-04-20', gmv:  32100 },
      { name: '糖果F',   firstActive: '2026-04-21', gmv:  21500 },
      { name: '海苔G',   firstActive: '2026-04-22', gmv:  18700 },
    ],
    newSellerTotal: 399300,
  };

  // ---------- Tab 4: 场域分析 ----------
  const fieldAnalysis = {
    // 昨日分场域 DGMV + 环比
    yesterdayByField: [
      { field: 'K播',      gmv: 1024500, chain: 0.087, share: 0.475 },
      { field: '店播',     gmv:  583200, chain: 0.156, share: 0.270 },
      { field: '商品笔记', gmv:  549080, chain: 0.213, share: 0.255 },
    ],
    // 近7天分场域汇总
    last7ByField: [
      { field: 'K播',      gmv: 7456000, chain: 0.093 },
      { field: '店播',     gmv: 3389000, chain: 0.074 },
      { field: '商品笔记', gmv: 3145000, chain: 0.053 },
    ],
    // 主力买手 Top5 - K播
    topBuyerKbo: [
      { rank: 1, name: '蛋黄派',     gmv: 234500, sellerCount: 12 },
      { rank: 2, name: '小辣椒',     gmv: 198700, sellerCount:  9 },
      { rank: 3, name: '麦麦',       gmv: 167800, sellerCount:  8 },
      { rank: 4, name: '柚子君',     gmv: 145600, sellerCount:  7 },
      { rank: 5, name: '阿甜',       gmv: 123400, sellerCount:  6 },
    ],
    // 主力买手 Top5 - 店播
    topBuyerDbo: [
      { rank: 1, name: '糖五朵店播间', gmv: 178900, sellerCount: 1 },
      { rank: 2, name: '坚果世家店播', gmv: 145600, sellerCount: 1 },
      { rank: 3, name: '辣条所店播',   gmv: 112300, sellerCount: 1 },
      { rank: 4, name: '蜜饯铺店播',   gmv:  87600, sellerCount: 1 },
      { rank: 5, name: '海苔园店播',   gmv:  76500, sellerCount: 1 },
    ],
    // 主力买手 Top5 - 商品笔记达人
    topBuyerNote: [
      { rank: 1, name: '零食测评菌',   gmv: 98700, sellerCount: 8 },
      { rank: 2, name: '深夜放毒',     gmv: 87600, sellerCount: 6 },
      { rank: 3, name: '吃货日记',     gmv: 76500, sellerCount: 5 },
      { rank: 4, name: '甜品研究员',   gmv: 65400, sellerCount: 4 },
      { rank: 5, name: '减脂零食控',   gmv: 54300, sellerCount: 4 },
    ],
    // 昨日爆品榜（按场域分组，每场域 Top10）
    hotSpuKbo: [
      { rank: 1,  name: '糖五朵综合果仁 500g',  seller: '糖五朵官方',   gmv: 156700, chain: 0.234 },
      { rank: 2,  name: '坚果大礼包 1kg',       seller: '坚果世家',     gmv: 134500, chain: 0.187 },
      { rank: 3,  name: '麻辣牛肉干 200g',      seller: '辣条研究所',   gmv: 112300, chain: 0.345 },
      { rank: 4,  name: '芒果干 300g',          seller: '果干坊',       gmv:  98700, chain: 0.123 },
      { rank: 5,  name: '芝士鳕鱼肠 24根',      seller: '海味专营',     gmv:  87600, chain: 0.456 },
      { rank: 6,  name: '黑巧克力 100g x6',     seller: '巧克力工坊',   gmv:  76500, chain: 0.089 },
      { rank: 7,  name: '海苔脆 12袋',          seller: '海苔乐园',     gmv:  65400, chain: 0.234 },
      { rank: 8,  name: '蛋白棒 12根',          seller: '能量棒工厂',   gmv:  54300, chain: 0.567 },
      { rank: 9,  name: '蜜饯组合 8种',         seller: '蜜饯小铺',     gmv:  43200, chain: -0.078 },
      { rank: 10, name: '鱿鱼丝 250g',          seller: '鱿鱼丝大王',   gmv:  32100, chain: 0.123 },
    ],
    hotSpuDbo: [
      { rank: 1,  name: '休闲零食大礼包',       seller: '休闲零食旗舰店', gmv: 89600, chain: 0.156 },
      { rank: 2,  name: '果干综合装 6种',       seller: '果干坊',         gmv: 76500, chain: 0.234 },
      { rank: 3,  name: '坚果小包装 30包',      seller: '坚果世家',       gmv: 65400, chain: 0.089 },
      { rank: 4,  name: '辣条混合装',           seller: '辣条研究所',     gmv: 54300, chain: 0.345 },
      { rank: 5,  name: '蜜饯零食组合',         seller: '蜜饯小铺',       gmv: 43200, chain: -0.045 },
      { rank: 6,  name: '海苔饼干',             seller: '海苔乐园',       gmv: 38700, chain: 0.178 },
      { rank: 7,  name: '能量棒礼盒',           seller: '能量棒工厂',     gmv: 32100, chain: 0.412 },
      { rank: 8,  name: '巧克力豆 200g',        seller: '巧克力工坊',     gmv: 28900, chain: 0.067 },
      { rank: 9,  name: '果脯礼盒',             seller: '果脯天地',       gmv: 23400, chain: -0.123 },
      { rank: 10, name: '糖果什锦',             seller: '糖果F',          gmv: 19800, chain: 0.234 },
    ],
    hotSpuNote: [
      { rank: 1,  name: '糖五朵网红坚果',       seller: '糖五朵官方',     gmv: 78900, chain: 0.456 },
      { rank: 2,  name: '减脂魔芋丝',           seller: '能量棒工厂',     gmv: 65400, chain: 0.345 },
      { rank: 3,  name: '低卡饼干',             seller: '能量棒工厂',     gmv: 54300, chain: 0.234 },
      { rank: 4,  name: '夜宵速食套装',         seller: '休闲零食旗舰店', gmv: 43200, chain: 0.156 },
      { rank: 5,  name: '办公室零食盒',         seller: '零食大集合',     gmv: 38700, chain: 0.089 },
      { rank: 6,  name: '健身能量棒',           seller: '能量棒工厂',     gmv: 32100, chain: 0.567 },
      { rank: 7,  name: '儿童零食组合',         seller: '糖果F',          gmv: 28900, chain: 0.234 },
      { rank: 8,  name: '怀旧小零食',           seller: '老字号糕点',     gmv: 23400, chain: -0.234 },
      { rank: 9,  name: '健康果干',             seller: '果干坊',         gmv: 19800, chain: 0.123 },
      { rank: 10, name: '宿舍零食大礼包',       seller: '零食大集合',     gmv: 16700, chain: 0.345 },
    ],
  };

  // ---------- Tab 5: 本双月三级类目进度 ----------
  // 双月：3-4 月（2026-03-01 ~ 2026-04-30）
  const bimonthly = {
    period: '2026-03 / 2026-04',
    daysTotal: 61,
    daysPassed: 53,         // 截至 4-22
    progressDate: 0.869,
    overall: { target: 65000000, actual: 52345600, progress: 0.805 },
    categories: [
      { name: '坚果炒货 / 综合果仁', target: 8500000, actual: 7234500, progress: 0.851, leadGap: -0.018 },
      { name: '休闲零食 / 辣条',     target: 6800000, actual: 6123400, progress: 0.901, leadGap:  0.032 },
      { name: '蜜饯果干 / 进口果干', target: 5500000, actual: 4567800, progress: 0.831, leadGap: -0.038 },
      { name: '海味即食 / 鱿鱼制品', target: 4800000, actual: 4234500, progress: 0.882, leadGap:  0.013 },
      { name: '糖果巧克力 / 黑巧',   target: 4200000, actual: 3567800, progress: 0.849, leadGap: -0.020 },
      { name: '糕点点心 / 中式糕点', target: 5800000, actual: 3987600, progress: 0.687, leadGap: -0.182 },
      { name: '调味酱料 / 传统酱菜', target: 3200000, actual: 2123400, progress: 0.663, leadGap: -0.206 },
      { name: '茶饮冲调 / 速溶茶',   target: 4500000, actual: 3456700, progress: 0.768, leadGap: -0.101 },
      { name: '豆制品 / 豆干',       target: 3800000, actual: 2876500, progress: 0.757, leadGap: -0.112 },
      { name: '蜂产品 / 纯蜂蜜',     target: 3500000, actual: 2987600, progress: 0.854, leadGap: -0.015 },
      { name: '坚果炒货 / 单一坚果', target: 6200000, actual: 5645600, progress: 0.911, leadGap:  0.042 },
      { name: '海味即食 / 鱼制品',   target: 3500000, actual: 2987600, progress: 0.854, leadGap: -0.015 },
      { name: '糖果巧克力 / 软糖',   target: 2800000, actual: 2154300, progress: 0.769, leadGap: -0.100 },
      { name: '休闲零食 / 膨化食品', target: 1900000, actual: 1398600, progress: 0.736, leadGap: -0.133 },
    ],
  };

  return {
    meta: {
      ownerName: '大门',
      ownerAlias: '朱锦程',
      department: '五组（休食）',
      sellerCount: 367,
      updatedAt: '2026-04-23 20:30',
    },
    today,
    trend,
    sellerHealth,
    fieldAnalysis,
    bimonthly,
  };
})();

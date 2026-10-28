import { createEmptyData, normalizeData } from './data.js';

export const DEMO_STORAGE_KEY = 'vcl.personal-workbench.demo.v1';
const DAY = 86400000;
const MARKER = 'demo-v1:';

export function isDemoLocation(location) {
  return new URLSearchParams(location?.search || '').get('demo') === '1';
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new TypeError('无效的演示日期');
  const time = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== day) throw new TypeError('无效的演示日期');
  return time;
}

function shifted(day, delta) {
  return new Date(dayNumber(day) + delta * DAY).toISOString().slice(0, 10);
}

function monthAt(day, offset = 0) {
  const d = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}

export function createDemoData(day = localDay()) {
  const base = dayNumber(day);
  const date = offset => shifted(day, offset);
  const timestamp = offset => base + offset * DAY;
  const data = createEmptyData();
  data.meta = { updatedAt: base, device: MARKER + day };
  data.settings = { displayName: 'Jiaxuan', weatherCity: 'wuhan', quotesEnabled: false };
  data.todos = [
    ['对照评测集复查知识库回答引用', 'high', 0, false],
    ['补齐知识库助手 PRD 的权限与失败状态', 'high', 0, false],
    ['整理 3 条用户反馈，更新需求优先级', 'mid', 0, false],
    ['读完一篇智能体工具调用资料并记笔记', 'low', 0, false],
    ['核对本周原型验收清单', 'mid', 0, true],
    ['准备下一轮访谈提纲', 'mid', 1, false],
    ['复盘引用缺失的失败样例', 'high', -1, true],
    ['整理本月工具订阅开支', 'low', 2, false],
    ['收集信息面板的阅读反馈', 'low', null, false],
  ].map(([title, priority, offset, done], i) => ({ id: `demo-task-${i}`, title, priority, done, date: offset === null ? '' : date(offset), createdAt: timestamp(-5 + i / 100) }));
  data.events = [
    { id: 'demo-event-1', date: day, title: '10:00 · 知识库助手原型走查', note: '示例日程：核对上传、检索、引用与无答案四个关键状态。' },
    { id: 'demo-event-2', date: day, title: '15:00 · 本周需求优先级讨论', note: '示例日程：带上反馈分类与影响范围，确认下一轮最小交付。' },
    { id: 'demo-event-3', date: date(1), title: '14:30 · 用户访谈与问题回访', note: '示例日程：验证检索过程和引用是否容易理解。' },
    { id: 'demo-event-4', date: date(3), title: '周度学习复盘', note: '回顾评测集、失败案例与产品观察笔记。' },
  ];
  const noteItems = [
    ['知识库助手｜需求与验收', ['产品', '知识库'], '<p><b>用户问题</b></p><p>资料分散，找到答案后仍需要回到原文核对。</p><p><b>本轮范围</b></p><ul><li>上传可检索文档，回答附来源和原文片段。</li><li>无依据时明确说明，不生成看似可信的引用。</li><li>检索结果受文档权限限制。</li></ul><p><b>验收</b></p><p>正确性、引用可追溯性、无答案处理、首个结果耗时分别记录；先做小样本评测再扩展。</p>'],
    ['RAG 评测｜先定义失败，再优化答案', ['学习', '评测'], '<p>把问题分为事实查询、多文档归纳、权限受限和资料缺失四类。</p><p>每个样例保留预期依据、允许回答的范围、检索结果和人工结论。不要用一项综合分掩盖引用错误。</p><p><b>待验证：</b>更长的上下文是否提升正确率，还是仅增加延迟与无关内容？</p>'],
    ['用户反馈｜让引用成为可操作入口', ['反馈', '交互'], '<p>示例反馈整理：</p><ul><li>回答虽有文档名，但无法定位对应段落。</li><li>资料过期时，用户不知道结论是否仍然适用。</li><li>检索无结果时，希望知道可以补充哪些资料。</li></ul><p>候选改动：引用附更新时间和片段；无结果状态提供补充资料入口。下一轮验证是否减少人工核对步骤。</p>'],
    ['本周产品观察｜工具权限与任务交接', ['观察', 'Agent'], '<p>观察重点不是“能调用多少工具”，而是：谁授权、何时确认、失败如何恢复、任务结束如何交接。</p><p>对外部公告分别记录发布内容与个人判断；尚在预览的能力不能写成已全面上线。</p>'],
    ['个人工作流｜收集、决策、回看', ['方法', '效率'], '<p>新信息先进入灵感库；形成明确动作后转为待办；有背景和证据的内容进入笔记；每周用工作日志回看进展。</p><p>少建一个收集入口，多给一条信息明确的下一步。</p>'],
  ];
  data.notes = noteItems.map(([title, tags, body], i) => ({ id: `demo-note-${i}`, title, tags, body, updatedAt: timestamp(-i) }));
  data.inspirations = [
    ['把回答中的引用做成“原文片段＋更新时间”，先验证能否减少用户核对成本。', ['知识库', '交互']],
    ['任务失败也要留下可接手的状态，不要只有一条“出错了”。', ['Agent', '可靠性']],
    ['资讯卡片区分“官方发布”和“我的观察”，避免把解读混成事实。', ['信息设计']],
    ['每次复盘只选一个最影响流程的问题进入下周计划。', ['效率']],
  ].map(([text, tags], i) => ({ id: `demo-idea-${i}`, text, tags, createdAt: timestamp(-i) }));
  data.prompts = [
    { id: 'demo-prompt-1', title: '把用户反馈整理为可验证需求', content: '请只依据以下反馈，输出：原始问题、使用场景、影响、证据、待验证假设和最小改动。区分事实与推断；缺失信息写为问题，不补造用户结论。\n\n反馈：' },
    { id: 'demo-prompt-2', title: '评审 AI 功能的异常与权限边界', content: '检查以下 AI 功能方案：输入缺失、检索无结果、来源过期、权限不足、模型超时、重复执行与用户取消。为每种状态给出用户可理解的反馈、恢复动作和验收用例。\n\n方案：' },
    { id: 'demo-prompt-3', title: '从公开公告提取产品观察', content: '阅读下面的官方公告。分别列出：已发布能力、可用范围与限制、尚未证实的推断、值得验证的产品问题。保留来源和发布日期，不把宣传用语当作效果证据。\n\n公告：' },
  ];
  data.learning = {
    plans: [
      { id: 'demo-learn-1', name: 'RAG 与检索评测', goal: '整理 20 个问题和对应依据，覆盖无答案与过期文档。', progress: 65 },
      { id: 'demo-learn-2', name: 'Agent 工具调用与权限', goal: '梳理授权、重试、幂等和人工确认的产品边界。', progress: 40 },
      { id: 'demo-learn-3', name: '原型交互与可用性检查', goal: '完成一轮桌面和手机的关键流程走查。', progress: 100 },
    ],
    checkins: [-1, -2, -3, -5, -7, -8, -10, -12, -14].map(date),
  };
  data.work = {
    plans: [
      ['建立知识库问答评测集', '覆盖事实查询、归纳与无答案；以可追溯依据为验收条件。', true, 0],
      ['完成知识库助手交互原型', '重点检查引用展开、上传失败与权限不足。', true, 0],
      ['完成一轮反馈整理与需求取舍', '整理问题、证据和优先级，不提前假定用户需要更多功能。', false, 0],
      ['验证失败恢复与人工接手流程', '记录重试边界、日志与任务交接信息。', false, 0],
      ['整理月度学习与项目复盘', '回看计划变化和仍需验证的假设。', false, 0],
      ['扩充回归评测与版本对照', '从本轮失败样例出发，比较结果而不是只看平均分。', false, 1],
    ].map(([title, note, done, offset], i) => ({ id: `demo-work-${i}`, month: monthAt(day, offset), title, note, done, createdAt: timestamp(-8 + i / 100) })),
    logs: [
      ['核对原型与评测结果', '完成上传状态与引用入口的走查。', '整理演示访谈反馈，准备下一轮问题。', '补齐权限不足和来源过期的验收用例。'],
      ['整理引用缺失样例', '将失败样例按检索、来源和生成三个环节分类。', '核对文档更新时间的展示位置。', '验证无依据回答是否稳定拒答。'],
      ['完成首轮交互原型', '连通文档上传、提问、引用展开的最短流程。', '对齐本轮最小交付与非目标。', '为超时和用户取消补充恢复入口。'],
      ['建立需求与证据清单', '把需求拆为问题、依据、改动和验收。', '整理示例反馈，避免直接把建议当成需求。', '补充结果可追溯性的评测方法。'],
    ].map(([focus, install, civil, sub], i) => ({ id: `demo-log-${i}`, date: date(-i), focus, install, civil, sub, other: '示例工作记录，可自由修改。', content: '', createdAt: timestamp(-i), updatedAt: timestamp(-i) })),
    focus: { [monthAt(day)]: '知识库助手：让答案有依据，让失败可恢复。' },
  };
  data.ledger = [];
  const expenses = [['餐饮', 42], ['交通', 12], ['学习', 89], ['订阅', 138], ['日用', 65], ['餐饮', 36]];
  for (let m = -5; m <= 0; m++) {
    const month = monthAt(day, m);
    data.ledger.push({ id: `demo-income-${m}`, type: 'in', amount: 7200 + (m + 5) * 180, category: '项目收入', note: '模拟收入，非个人真实记录', date: `${month}-01` });
    expenses.forEach(([category, amount], i) => data.ledger.push({ id: `demo-expense-${m}-${i}`, type: 'out', amount: amount + (m + 5) * 3, category, note: '模拟开支', date: `${month}-${String(Math.min(Number(day.slice(8)), i + 1)).padStart(2, '0')}` }));
  }
  data.stocks = {
    trades: [
      { id: 'demo-trade-1', code: 'sh510300', side: 'buy', price: 4, qty: 1000, date: date(-15), note: '模拟买入，仅用于演示成本计算', createdAt: timestamp(-15) },
      { id: 'demo-trade-2', code: 'sh510300', side: 'sell', price: 4.12, qty: 200, date: date(-5), note: '模拟卖出，不是真实交易', createdAt: timestamp(-5) },
      { id: 'demo-trade-3', code: 'sz159915', side: 'buy', price: 2.5, qty: 600, date: date(-8), note: '模拟买入，不构成投资建议', createdAt: timestamp(-8) },
    ],
    watchlist: [{ code: 'sh510300' }, { code: 'sz159915' }],
    notes: [
      { id: 'demo-invest-note', code: '', title: '模拟记录｜先记交易理由，再看结果', body: '此处交易与参考价格均为模拟，演示平均成本法和记录流程；不代表真实资产、市场报价或投资建议。', updatedAt: base },
    ],
  };
  return normalizeData(data);
}

// Only the demo timeline moves. Public snapshots live in a different module.
export function alignDemoDates(input, day = localDay()) {
  dayNumber(day);
  const data = normalizeData(input);
  const anchor = data.meta.device.startsWith(MARKER) ? data.meta.device.slice(MARKER.length) : null;
  if (!anchor || anchor === day) return data;
  const delta = (dayNumber(day) - dayNumber(anchor)) / DAY;
  for (const items of [data.todos, data.events, data.work.logs, data.stocks.trades]) {
    for (const item of items) if (item.date) item.date = shifted(item.date, delta);
  }
  data.learning.checkins = data.learning.checkins.map(d => shifted(d, delta));
  const monthDelta = (Number(day.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(day.slice(5, 7)) - Number(anchor.slice(5, 7));
  for (const item of data.ledger) {
    const month = monthAt(item.date, monthDelta);
    const lastDay = new Date(Date.parse(`${month}-01T12:00:00Z`) + 32 * DAY);
    lastDay.setUTCDate(0);
    const limit = month === day.slice(0, 7) ? Number(day.slice(8)) : lastDay.getUTCDate();
    item.date = `${month}-${String(Math.min(Number(item.date.slice(8)), limit)).padStart(2, '0')}`;
  }
  for (const item of data.work.plans) item.month = monthAt(item.month + '-01', monthDelta);
  data.work.focus = Object.fromEntries(Object.entries(data.work.focus).map(([m, value]) => [monthAt(m + '-01', monthDelta), value]));
  for (const items of [data.todos, data.notes, data.inspirations, data.work.plans, data.work.logs, data.stocks.trades, data.stocks.notes]) {
    for (const item of items) for (const key of ['createdAt', 'updatedAt']) if (item[key]) item[key] = Math.max(0, item[key] + delta * DAY);
  }
  data.meta.device = MARKER + day;
  return normalizeData(data);
}

export const DEMO_QUOTES = {
  sh510300: { code: 'sh510300', name: '沪深300 ETF（模拟）', market: 'a', price: 4.18, prev: 4.12, chg: 0.06, pct: 1.46, high: 4.2, low: 4.1, vol: 12500, simulated: true },
  sz159915: { code: 'sz159915', name: '创业板 ETF（模拟）', market: 'a', price: 2.46, prev: 2.5, chg: -0.04, pct: -1.6, high: 2.52, low: 2.44, vol: 8400, simulated: true },
};

// ============ 首页 Dashboard ============
import { el, icon, cardTitle, todayStr, thisWeekDates, fmtMoney, fmtPct, WEEK_CN } from '../util.js';
import { store, isDemo } from '../store.js';
import { publicSnapshot } from '../public-snapshot.js';
import { fetchQuotes } from '../quotes.js';
import { calcPositions } from './stocks.js';

function go(id) { document.dispatchEvent(new CustomEvent('wb:nav', { detail: id })); }

const ENTRIES = [
  { id: 'todos', icon: 'todo', name: '待办日程', desc: '待办清单与日程安排' },
  { id: 'work', icon: 'briefcase', name: '工作情况', desc: '月工作计划与日完成' },
  { id: 'notes', icon: 'note', name: '笔记', desc: '标题正文标签搜索' },
  { id: 'ideas', icon: 'bulb', name: '灵感库', desc: '一句话灵感快记' },
  { id: 'ai', icon: 'ai', name: 'AI 工具', desc: '常用工具与提示词' },
  { id: 'ledger', icon: 'coin', name: '记账理财', desc: '收支记录与图表' },
  { id: 'learning', icon: 'book', name: '学习管理', desc: '计划进度与每日打卡' },
  { id: 'info', icon: 'grid', name: '信息面板', desc: '天气 / 热榜 / 常用网址' },
  { id: 'stocks', icon: 'chart', name: '股票记录', desc: '交易流水与持仓盈亏' },
];

function greet() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

// ---------- 焦点 1：今日 ----------
function todayCard() {
  const d = store.data;
  const today = todayStr();
  const pending = d.todos.filter(t => !t.done && (t.date === today || !t.date));
  const todos = pending.slice(0, 5);
  const events = d.events.filter(e => e.date === today);
  const body = el('div', { class: 'focus-rows' });
  if (!todos.length && !events.length) {
    body.append(el('div', { class: 'muted tiny', style: 'padding:14px 4px' }, '今天暂无安排'));
  } else {
    events.forEach(ev => body.append(el('div', { class: 'focus-row' },
      el('span', { class: 'tag' }, '日程'), el('span', { class: 't' }, ev.title))));
    todos.forEach(t => body.append(el('div', { class: 'focus-row' },
      el('span', { class: 'prio ' + (t.priority || 'mid') }), el('span', { class: 't' }, t.title))));
  }
  return el('div', { class: 'card hoverable focus-card', onclick: () => go('todos'), style: 'cursor:pointer' },
    el('div', { class: 'card-title' }, icon('todo', 17), '今日概览', el('span', { class: 'right tiny muted' }, '管理 →')),
    el('div', { style: 'display:flex;gap:22px' },
      el('div', {}, el('div', { class: 'big num', 'data-testid': 'today-todos', style: 'color:var(--accent)' }, String(pending.length)), el('div', { class: 'tiny muted' }, '待办事项')),
      el('div', {}, el('div', { class: 'big num', style: 'color:var(--accent2)' }, String(events.length)), el('div', { class: 'tiny muted' }, '今日日程'))),
    body);
}

function projectCard() {
  const plans = store.data.work.plans.filter(p => p.month === todayStr().slice(0, 7));
  const completed = plans.filter(p => p.done).length;
  const progress = plans.length ? Math.round(completed / plans.length * 100) : 0;
  return el('div', { class: 'card focus-card' },
    cardTitle('briefcase', '本月项目', el('button', { class: 'icon-btn', title: '查看工作计划', onclick: () => go('work') }, icon('link', 14))),
    el('div', { class: 'project-name' }, '知识库问答助手'),
    el('div', { class: 'project-progress' }, el('span', { class: 'big num', 'data-testid': 'project-progress' }, `${progress}%`), el('span', { class: 'tiny muted' }, `${completed} / ${plans.length} 项计划完成`)),
    el('div', { class: 'progress' }, el('i', { style: `width:${progress}%` })),
    el('div', { class: 'project-next muted tiny' }, plans.find(p => !p.done)?.title || '本月计划已完成'));
}

function readingBand() {
  const articles = publicSnapshot.articles.slice(0, 2);
  return el('section', { class: 'reading-band', 'aria-label': 'AI 资讯摘要' },
    el('div', { class: 'reading-heading' }, el('h2', {}, '值得留意'),
      el('span', { class: 'tiny muted' }, `${publicSnapshot.collectedOn} 采集 · 资料快照`),
      el('button', { class: 'btn btn-sm', onclick: () => go('info') }, '全部资讯', icon('link', 14))),
    el('div', { class: 'reading-grid' }, articles.map(a => el('article', {},
      el('div', { class: 'tiny muted' }, `${a.source} · ${a.publishedOn}`),
      el('a', { class: 'reading-title', href: a.url, target: '_blank', rel: 'noopener noreferrer' }, a.title),
      el('p', { class: 'muted' }, a.summary)))));
}

// ---------- 焦点 2：投资 ----------
function stocksCard() {
  const d = store.data;
  const positions = calcPositions(d.stocks.trades).filter(p => p.qty > 0);
  const codes = [...new Set([...positions.map(p => p.code), ...d.stocks.watchlist.slice(0, 4).map(w => w.code)])];
  const card = el('div', { class: 'card hoverable focus-card', style: 'cursor:pointer', onclick: () => go('stocks') },
    el('div', { class: 'card-title' }, icon('chart', 17), '投资概览', el('span', { class: 'right tiny muted' }, '详情 →')),
    el('div', { class: 'quote-body muted tiny', style: 'padding:6px 0' }, '正在刷新行情…'));

  const body = card.querySelector('.quote-body');
  if (!codes.length) {
    body.innerHTML = '';
    body.append(el('div', { class: 'muted tiny', style: 'padding:12px 4px' }, '暂无持仓与自选 → 去「股票记录」添加'));
    return card;
  }
  fetchQuotes(codes).then(({ quotes, offline }) => {
    body.innerHTML = ''; body.classList.remove('muted', 'tiny');
    let float = 0;
    const hasPrice = positions.every(p=>quotes[p.code]?.price!=null);
    for (const p of positions) {
      const q = quotes[p.code];
      if (q && q.price != null) { float += (q.price - p.cost) * p.qty; }
    }
    const allPositions = calcPositions(store.data.stocks.trades);
    const incomplete = allPositions.some(p => p.incomplete);
    const realized = allPositions.reduce((a, p) => a + p.realized, 0);
    const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
    body.append(
      el('div', { style: 'display:flex;align-items:baseline;gap:12px;flex-wrap:wrap' },
        el('div', {},
          el('div', { class: 'tiny muted' }, '浮动盈亏' + (!store.data.settings.quotesEnabled?'（行情未开启）':offline?'（缓存行情）':'')),
          el('div', { class: 'big num ' + cls(float) }, positions.length ? (hasPrice ? fmtMoney(float, true) : '—') : '¥0.00')),
        incomplete ? el('div', { class: 'tiny muted' }, '买卖记录不完整，已实现盈亏暂不汇总')
          : realized ? el('div', { class: 'tiny muted' }, '已实现 ', el('span', { class: 'num ' + cls(realized), style: 'font-weight:700' }, fmtMoney(realized, true))) : null),
      el('div', { class: 'focus-rows', style: 'margin-top:12px' },
        d.stocks.watchlist.slice(0, 4).map(w => {
          const q = quotes[w.code];
          if (!q) return el('div', { class: 'focus-row' }, el('span', { class: 't muted' }, w.code), el('span', { class: 'tiny muted' }, '暂无数据'));
          const c = q.pct > 0 ? 'up' : q.pct < 0 ? 'down' : '';
          return el('div', { class: 'focus-row' },
            el('span', { class: 't' }, q.name),
            el('span', { class: 'num', style: 'font-weight:600' }, q.price != null ? q.price.toFixed(2) : '--'),
            el('span', { class: 'num ' + c, style: 'font-weight:600;width:70px;text-align:right' }, fmtPct(q.pct)));
        })));
  });
  return card;
}

// ---------- 焦点 3：学习打卡 ----------
function learningCard() {
  const d = store.data;
  const week = thisWeekDates();
  const set = new Set(d.learning.checkins);
  const today = todayStr();
  const doneCount = week.filter(k => set.has(k)).length;
  const activePlan = d.learning.plans.find(p => p.progress < 100);

  return el('div', { class: 'card hoverable focus-card', style: 'cursor:pointer', onclick: () => go('learning') },
    el('div', { class: 'card-title' }, icon('book', 17), '学习打卡', el('span', { class: 'right tiny muted' }, '去打卡 →')),
    el('div', { style: 'display:flex;align-items:baseline;gap:8px' },
      el('div', { class: 'big num', style: 'color:var(--accent2)' }, `${doneCount}/7`),
      el('span', { class: 'tiny muted' }, '本周已打卡', set.has(today) ? ' · 今天已打卡' : ' · 今天还未打卡')),
    el('div', { class: 'week-dots' }, week.map((k, i) => {
      const wd = WEEK_CN[(i + 1) % 7];
      return el('div', { class: 'wd' + (set.has(k) ? ' on' : ''), title: k }, wd, el('span', { class: 'num', style: 'font-size:9px' }, k.slice(8)));
    })),
    activePlan
      ? el('div', { style: 'margin-top:6px' },
          el('div', { class: 'tiny muted', style: 'margin-bottom:5px' }, `进行中：${activePlan.name} · ${activePlan.progress}%`),
          el('div', { class: 'progress' }, el('i', { style: `width:${activePlan.progress}%` })))
      : el('div', { class: 'tiny muted', style: 'margin-top:10px' }, d.learning.plans.length ? '所有计划都完成了' : '还没有学习计划'));
}

export function render(root) {
  const now = new Date();
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK_CN[now.getDay()]}`;

  root.append(
    el('div', { class: 'hero' },
      el('div', {},
        el('h1', {}, greet() + (store.data.settings.displayName ? '，' + store.data.settings.displayName : '')),
        el('div', { class: 'date' }, dateStr)),
      el('button', { class: 'btn', onclick: () => go('todos') }, icon('plus', 15), '安排今天')),

    el('div', { class: 'focus-grid' }, todayCard(), isDemo ? projectCard() : stocksCard(), learningCard()),
    isDemo ? readingBand() : null,

    el('div', { class: 'card-title', style: 'margin:6px 0 12px;font-size:14px;color:var(--text-2)' }, icon('grid', 16), '全部模块'),
    el('div', { class: 'entry-grid' }, ENTRIES.map(e => el('button', { class: 'entry-card', onclick: () => go(e.id) },
      el('span', { class: 'ic' }, icon(e.icon, 19)),
      el('span', { class: 'nm' }, e.name),
      el('span', { class: 'ds' }, e.desc))))
  );
}

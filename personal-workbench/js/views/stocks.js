// ============ 股票记录（交易 / 持仓 / 自选 / 投资笔记） ============
// 盈亏以正负号和文字区分，外观沿用全局黑白主题。
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, fmtMoney, fmtPct, fmtDateTime, toast, richToHtml } from '../util.js';
import { store, isDemo } from '../store.js';
import { fetchQuotes, normCode } from '../quotes.js';

let tab = 'trades';
let timer = null;
let lastQuotes = {};   // code -> quote|null
let lastOffline = false;

const pnlClass = v => v == null ? 'muted' : v > 0 ? 'up' : v < 0 ? 'down' : 'muted';

/** 平均成本法计算持仓 */
export function calcPositions(trades) {
  const map = new Map();
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
  for (const t of sorted) {
    if (!map.has(t.code)) map.set(t.code, { code: t.code, qty: 0, cost: 0, realized: 0, incomplete:false });
    const p = map.get(t.code);
    if (t.side === 'buy') {
      const total = p.cost * p.qty + t.price * t.qty;
      p.qty += t.qty;
      p.cost = p.qty > 0 ? total / p.qty : 0;
    } else {
      const matched = Math.min(p.qty,t.qty);
      if(matched<t.qty) p.incomplete=true;
      p.realized += (t.price - p.cost) * matched;
      p.qty -= matched;
      if (p.qty <= 0) { p.qty = 0; }
    }
  }
  return [...map.values()];
}

// ---------------- 交易记录 ----------------
function tradeModal(edit) {
  formModal(edit ? '编辑交易' : '录入交易', [
    { key: 'code', label: '证券代码', required: true, placeholder: '如 600519 / sh600519 / hk00700 / usAAPL.OQ' },
    { key: 'side', label: '方向', type: 'select', options: [['buy', '买入'], ['sell', '卖出']] },
    { key: 'price', label: '价格', type: 'number', required: true, min: '0', step: '0.001' },
    { key: 'qty', label: '数量（股）', type: 'number', required: true, min: '1', max:'1000000000', step: '1' },
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'note', label: '备注', placeholder: '可选' },
  ], edit || { side: 'buy', date: todayStr() }, '保存', v => {
    if (!v) return;
    v.code = normCode(v.code);
    if (!v.code) { toast('代码格式不对', 'err'); return false; }
    store.update(d => {
      if (edit) Object.assign(d.stocks.trades.find(t => t.id === edit.id), v);
      else d.stocks.trades.unshift({ id: 'st' + Math.random().toString(36).slice(2, 9), createdAt: Date.now(), ...v });
    });
    toast('已记录', 'ok');
  });
}

function renderTrades(box) {
  const trades = [...store.data.stocks.trades].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  box.innerHTML = '';
  box.append(
    el('div', { style: 'display:flex;justify-content:flex-end;margin-bottom:12px' },
      el('button', { class: 'btn btn-primary', onclick: () => tradeModal() }, '+ 录入交易')),
    trades.length
      ? el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
        el('thead', {}, el('tr', {}, ['日期', '代码', '方向', '价格', '数量', '金额', '备注', ''].map(h => el('th', {}, h)))),
        el('tbody', {}, trades.map(t => el('tr', {},
          el('td', { class: 'num muted' }, t.date),
          el('td', { class: 'num', style: 'font-weight:600' }, t.code),
          el('td', {}, el('span', { class: t.side === 'buy' ? 'side-buy' : 'side-sell' }, t.side === 'buy' ? '买入' : '卖出')),
          el('td', { class: 'num' }, fmtMoney(t.price)),
          el('td', { class: 'num' }, String(t.qty)),
          el('td', { class: 'num muted' }, fmtMoney(t.price * t.qty)),
          el('td', { class: 'muted' }, t.note || '—'),
          el('td', { style: 'white-space:nowrap' },
            el('button', { class: 'icon-btn', title: '编辑', onclick: () => tradeModal(t) }, icon('edit', 14)),
            el('button', {
              class: 'icon-btn danger', title: '删除',
              onclick: async () => { if (await confirmBox('删除这条交易记录？')) store.update(dd => { dd.stocks.trades = dd.stocks.trades.filter(x => x.id !== t.id); }); }
            }, icon('trash', 14))))))))
      : emptyState('chart', '还没有交易记录', '点「+ 录入交易」记下第一笔买卖'));
}

// ---------------- 持仓盈亏 ----------------
async function renderPositions(box) {
  const positions = calcPositions(store.data.stocks.trades);
  const holding = positions.filter(p => p.qty > 0);
  const codes = positions.map(p => p.code);
  box.innerHTML = '<div class="muted tiny" style="padding:10px 0">正在刷新行情…</div>';

  let quotes = lastQuotes, offline = lastOffline;
  if (codes.length) {
    const r = await fetchQuotes(codes);
    quotes = { ...lastQuotes, ...r.quotes }; lastQuotes = quotes; offline = r.offline; lastOffline = r.offline;
  }

  let totalFloat = 0, totalRealized = 0, totalCost = 0;
  for (const p of positions) {
    totalRealized += p.realized;
    if (p.qty > 0) {
      totalCost += p.cost * p.qty;
      const q = quotes[p.code];
      if (q && q.price != null) totalFloat += (q.price - p.cost) * p.qty;
    }
  }

  box.innerHTML = '';
  if (!positions.length) { box.append(emptyState('chart', '暂无持仓', '先在「交易记录」里录入买卖')); return; }

  const hasAllPrices=holding.every(p=>quotes[p.code]?.price!=null);
  const complete=positions.every(p=>!p.incomplete);
  box.append(
    el('div', { class: 'pos-total' },
      el('div', { class: 'it' }, el('div', { class: 'lb' }, '浮动盈亏'), el('div', { class: 'vl num ' + pnlClass(totalFloat) }, hasAllPrices?fmtMoney(totalFloat, true):'—')),
      el('div', { class: 'it' }, el('div', { class: 'lb' }, '已实现盈亏'), el('div', { class: 'vl num ' + pnlClass(totalRealized) }, complete?fmtMoney(totalRealized, true):'记录不完整')),
      el('div', { class: 'it' }, el('div', { class: 'lb' }, '总盈亏'), el('div', { class: 'vl num ' + pnlClass(totalFloat + totalRealized) }, hasAllPrices&&complete?fmtMoney(totalFloat + totalRealized, true):'—')),
      el('div', { class: 'it' }, el('div', { class: 'lb' }, '持仓成本'), el('div', { class: 'vl num' }, fmtMoney(totalCost))),
      el('div', { style: 'margin-left:auto;display:flex;align-items:center;gap:10px' },
        offline ? el('span', { class: 'offline-badge' }, store.data.settings.quotesEnabled?'行情不可用 · 有缓存时显示缓存':'行情查询未开启') : null,
        el('button', { class: 'btn btn-sm', onclick: () => renderPositions(box) }, icon('refresh', 14), isDemo ? '重新计算' : '刷新'))),
    el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, ['代码 / 名称', '持仓', '成本价', '现价', '浮动盈亏', '盈亏%', '已实现'].map(h => el('th', {}, h)))),
      el('tbody', {}, positions.map(p => {
        const q = quotes[p.code];
        const last = q && q.price != null ? q.price : null;
        const float = p.qty > 0 && last != null ? (last - p.cost) * p.qty : null;
        const pct = p.qty > 0 && last != null && p.cost > 0 ? (last - p.cost) / p.cost * 100 : null;
        return el('tr', {},
          el('td', {}, el('div', { style: 'font-weight:600' }, q ? q.name : p.code), el('div', { class: 'tiny muted num' }, p.code)),
          el('td', { class: 'num' }, p.qty > 0 ? String(p.qty) : '已清仓'),
          el('td', { class: 'num' }, p.qty > 0 ? fmtMoney(p.cost) : '—'),
          el('td', { class: 'num' }, last != null ? fmtMoney(last) : el('span', { class: 'muted tiny' }, '暂无数据')),
          el('td', { class: 'num ' + pnlClass(float) }, float != null ? fmtMoney(float, true) : '—'),
          el('td', { class: 'num ' + pnlClass(pct) }, pct != null ? fmtPct(pct) : '—'),
          el('td', { class: 'num ' + pnlClass(p.realized) }, p.incomplete?'缺少买入记录':fmtMoney(p.realized, true)));
      })))));
}

// ---------------- 自选股行情 ----------------
function watchModal() {
  formModal('添加自选股', [
    { key: 'code', label: '证券代码', required: true, placeholder: '如 600519 / hk00700 / usAAPL.OQ' },
  ], {}, '保存', v => {
    if (!v) return;
    const code = normCode(v.code);
    if (!code) { toast('代码格式不对', 'err'); return false; }
    if (store.data.stocks.watchlist.some(w => w.code === code)) { toast('已在自选列表中'); return false; }
    store.update(d => d.stocks.watchlist.push({ code }));
  });
}

async function refreshWatch(box, { silent } = {}) {
  const list = store.data.stocks.watchlist;
  if (!list.length) {
    box.innerHTML = '';
    box.append(emptyState('chart', '自选是空的', '点「+ 加自选」关注股票 / 指数'));
    return;
  }
  if (!silent) box.innerHTML = '<div class="muted tiny" style="padding:10px 0">正在刷新行情…</div>';
  const r = await fetchQuotes(list.map(w => w.code));
  lastQuotes = { ...lastQuotes, ...r.quotes }; lastOffline = r.offline;

  box.innerHTML = '';
  box.append(
    el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap' },
      el('button', { class: 'btn btn-primary btn-sm', onclick: watchModal }, '+ 加自选'),
      el('button', { class: 'btn btn-sm', onclick: () => refreshWatch(box) }, icon('refresh', 14), isDemo ? '重新计算' : '刷新'),
      el('span', { class: 'tiny muted' }, isDemo ? '固定模拟参考价 · 非市场行情' : '每 30 秒自动刷新（页面不可见时暂停）'),
      r.offline ? el('span', { class: 'offline-badge' }, store.data.settings.quotesEnabled?'行情不可用 · 有缓存时显示缓存':'行情查询未开启') : null),
    el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, ['名称', '代码', '现价', '涨跌幅', '涨跌额', '最高', '最低', '成交量', ''].map(h => el('th', {}, h)))),
      el('tbody', {}, list.map(w => {
        const q = r.quotes[w.code] || lastQuotes[w.code];
        if (!q) return el('tr', {},
          el('td', { class: 'muted' }, '—'),
          el('td', { class: 'num' }, w.code),
          el('td', { colspan: '6' }, el('span', { class: 'muted tiny' }, '暂无数据')),
          el('td', {}, el('button', {
            class: 'icon-btn danger', title: '移除',
            onclick: async () => { if (await confirmBox(`把 ${w.code} 移出自选？`)) store.update(dd => { dd.stocks.watchlist = dd.stocks.watchlist.filter(x => x.code !== w.code); }); }
          }, icon('trash', 14))));
        const cls = pnlClass(q.pct);
        return el('tr', {},
          el('td', { style: 'font-weight:600' }, q.name, q.cached ? el('span', { class: 'tiny', style: 'color:var(--warn);margin-left:5px' }, '缓存') : null),
          el('td', { class: 'num muted' }, w.code),
          el('td', { class: 'num ' + cls, style: 'font-weight:700;font-size:15px' }, q.price != null ? q.price.toFixed(q.market === 'a' && q.price > 100 ? 2 : 2) : '—'),
          el('td', { class: 'num ' + cls, style: 'font-weight:600' }, fmtPct(q.pct)),
          el('td', { class: 'num ' + cls }, q.chg != null ? (q.chg > 0 ? '+' : '') + q.chg.toFixed(2) : '—'),
          el('td', { class: 'num muted' }, q.high != null ? q.high.toFixed(2) : '—'),
          el('td', { class: 'num muted' }, q.low != null ? q.low.toFixed(2) : '—'),
          el('td', { class: 'num muted' }, q.vol != null ? (q.vol > 10000 ? (q.vol / 10000).toFixed(1) + '万手' : q.vol + '手') : '—'),
          el('td', {}, el('button', {
            class: 'icon-btn danger', title: '移除',
            onclick: async () => { if (await confirmBox(`把「${q.name}」移出自选？`)) store.update(dd => { dd.stocks.watchlist = dd.stocks.watchlist.filter(x => x.code !== w.code); }); }
          }, icon('trash', 14))));
      })))));
}

// ---------------- 投资笔记 ----------------
function stockNoteModal(edit) {
  formModal(edit ? '编辑投资笔记' : '写投资笔记', [
    { key: 'code', label: '关联代码（可选）', placeholder: '如 sh600519，可留空' },
    { key: 'title', label: '标题', required: true, placeholder: '例如：茅台三季报看法' },
    { key: 'body', label: '内容', type: 'textarea', rows: 6, placeholder: '记录你的分析与判断…' },
  ], edit, '保存', v => {
    if (!v) return;
    v.code = v.code ? normCode(v.code) : '';
    store.update(d => {
      if (edit) Object.assign(d.stocks.notes.find(n => n.id === edit.id), v, { updatedAt: Date.now() });
      else d.stocks.notes.unshift({ id: 'sn' + Math.random().toString(36).slice(2, 9), updatedAt: Date.now(), ...v });
    });
    toast('已保存', 'ok');
  });
}

function renderStockNotes(box) {
  const notes = [...store.data.stocks.notes].sort((a, b) => b.updatedAt - a.updatedAt);
  box.innerHTML = '';
  box.append(
    el('div', { style: 'display:flex;justify-content:flex-end;margin-bottom:12px' },
      el('button', { class: 'btn btn-primary', onclick: () => stockNoteModal() }, '+ 写笔记')),
    notes.length
      ? el('div', {}, notes.map(n => el('div', { class: 'plan-item' },
        el('div', { style: 'display:flex;align-items:center;gap:10px' },
          n.code ? el('span', { class: 'tag num' }, n.code) : null,
          el('span', { style: 'font-weight:600' }, n.title),
          el('span', { class: 'tiny muted num', style: 'margin-left:auto' }, fmtDateTime(n.updatedAt)),
          el('button', { class: 'icon-btn', title: '编辑', onclick: () => stockNoteModal(n) }, icon('edit', 14)),
          el('button', {
            class: 'icon-btn danger', title: '删除',
            onclick: async () => { if (await confirmBox(`删除笔记「${n.title}」？`)) store.update(dd => { dd.stocks.notes = dd.stocks.notes.filter(x => x.id !== n.id); }); }
          }, icon('trash', 14))),
        n.body ? el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:8px;white-space:pre-wrap', html: richToHtml(n.body) }) : null)))
      : emptyState('note', '还没有投资笔记', '记录每一笔交易背后的逻辑'));
}

// ---------------- 视图入口 ----------------
export function render(root) {
  const content = el('div', {});
  root.append(
    viewHead('股票记录', '交易流水 · 持仓盈亏 · 自选行情 · 投资笔记'),
    isDemo ? el('p', { class: 'module-notice' }, '模拟交易与参考价 · 非真实资产或市场行情 · 不构成投资建议') : null,
    el('div', { class: 'tabs stock-tabs' },
      ...[['trades', '交易记录'], ['positions', '持仓盈亏'], ['watch', '自选股行情'], ['notes', '投资笔记']].map(([k, label]) =>
        el('button', {
          class: 'tab' + (tab === k ? ' active' : ''),
          onclick: () => { tab = k; rerender(); }
        }, label))),
    el('div', { class: 'card' }, content));

  function rerender() {
    stopPolling();
    root.innerHTML = '';
    render(root);
  }
  function renderInto() {
    content.innerHTML = '';
    if (tab === 'trades') renderTrades(content);
    else if (tab === 'positions') renderPositions(content);
    else if (tab === 'notes') renderStockNotes(content);
    else refreshWatch(content), startPolling();
  }
  function startPolling() {
    stopPolling();
    if (isDemo) return;
    timer = setInterval(() => { if (!document.hidden) refreshWatch(content, { silent: true }); }, 30000);
  }

  renderInto();

  // 供 app.js 在离开视图时调用
  return stopPolling;
}

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null; }
}

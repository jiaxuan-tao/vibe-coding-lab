// ============ 记账理财 ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, fmtMoney, toast } from '../util.js';
import { store, isDemo } from '../store.js';
import { donutChart, barChart } from '../charts.js';

const OUT_CATS = ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '教育', '其他'];
const IN_CATS = ['工资', '兼职', '投资', '红包', '其他'];

function monthKey(dateStr) { return (dateStr || '').slice(0, 7); }

function recordModal(edit) {
  const today = todayStr();
  const typeRef = { v: edit ? edit.type : 'out' };
  formModal(edit ? '编辑记录' : '记一笔', [
    { key: 'type', label: '类型', type: 'select', options: [['out', '支出'], ['in', '收入']] },
    { key: 'amount', label: '金额（元）', type: 'number', required: true, min: '0', step: '0.01', placeholder: '0.00' },
    { key: 'category', label: '类别（支出常用：餐饮/交通/购物…）', required: true, placeholder: edit ? '' : (typeRef.v === 'out' ? '餐饮' : '工资') },
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'note', label: '备注', placeholder: '可选' },
  ], edit || { type: 'out', date: today }, '保存', v => {
    if (!v) return;
    if (v.amount == null || v.amount <= 0) { toast('金额需要大于 0', 'err'); return false; }
    store.update(d => {
      if (edit) Object.assign(d.ledger.find(r => r.id === edit.id), v);
      else d.ledger.unshift({ id: 'l' + Math.random().toString(36).slice(2, 9), ...v });
    });
    toast('已记账', 'ok');
  });
}

export function render(root) {
  const d = store.data;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ---- 本月汇总 ----
  let mIn = 0, mOut = 0;
  const catOut = Object.create(null);
  for (const r of d.ledger) {
    if (monthKey(r.date) !== thisMonth) continue;
    if (r.type === 'in') mIn += r.amount;
    else { mOut += r.amount; catOut[r.category] = (catOut[r.category] || 0) + r.amount; }
  }

  // ---- 近 6 个月 ----
  const months = [], arrIn = [], arrOut = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    months.push(`${dt.getMonth() + 1}月`);
    let si = 0, so = 0;
    for (const r of d.ledger) {
      if (monthKey(r.date) !== k) continue;
      if (r.type === 'in') si += r.amount; else so += r.amount;
    }
    arrIn.push(si); arrOut.push(so);
  }

  // ---- 最近记录 ----
  const recent = [...d.ledger].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 30);

  const donut = donutChart(Object.entries(catOut).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), { centerLabel: '本月支出' });

  root.append(
    viewHead('记账理财', '记清楚每一笔，钱花哪儿了一目了然',
      el('button', { class: 'btn btn-primary', onclick: () => recordModal() }, '+ 记一笔')),

    el('div', { class: 'stat-cards' },
      el('div', { class: 'stat-card' }, el('div', { class: 'lb' }, '本月收入'), el('div', { class: 'vl num', style: 'color:var(--success)' }, '¥' + fmtMoney(mIn))),
      el('div', { class: 'stat-card' }, el('div', { class: 'lb' }, '本月支出'), el('div', { class: 'vl num', style: 'color:var(--info)' }, '¥' + fmtMoney(mOut))),
      el('div', { class: 'stat-card' }, el('div', { class: 'lb' }, '本月结余'), el('div', { class: 'vl num', style: `color:${mIn - mOut >= 0 ? 'var(--text)' : 'var(--danger)'}` }, fmtMoney(mIn - mOut, true)))),

    el('div', { class: 'grid grid-2' },
      el('div', { class: 'card' },
        cardTitle('coin', '支出分类 · 本月'),
        Object.keys(catOut).length
          ? el('div', { style: 'display:flex;gap:22px;align-items:center;flex-wrap:wrap' },
              el('div', { class: 'chart-wrap', style: 'flex:0 0 auto' }, donut.svg),
              el('div', { style: 'flex:1;min-width:150px' }, donut.legend))
          : emptyState('coin', '本月还没有支出记录', '点右上角「+ 记一笔」开始')),
      el('div', { class: 'card' },
        cardTitle('chart', '近 6 个月收支', el('span', { class: 'tiny' },
          el('span', { 'data-legend': 'income', style: 'color:var(--success)' }, '■ 收入'), '　', el('span', { 'data-legend': 'expense', style: 'color:var(--info)' }, '■ 支出'))),
        el('div', { class: 'chart-wrap' }, barChart(months, arrIn, arrOut)))),

    el('div', { style: 'height:16px' }),
    el('div', { class: 'card' },
      cardTitle('note', '最近记录', el('span', { class: 'tiny muted' }, `共 ${d.ledger.length} 条，显示最近 ${recent.length} 条`)),
      recent.length
        ? el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, ['日期', '类型', '类别', '金额', '备注', ''].map(h => el('th', {}, h)))),
            el('tbody', {}, recent.map(r => el('tr', {},
              el('td', { class: 'num muted' }, r.date),
              el('td', {}, el('span', { class: 'tag ' + (r.type === 'in' ? 'green' : 'blue') }, r.type === 'in' ? '收入' : '支出')),
              el('td', {}, r.category),
              el('td', { class: 'num', style: `font-weight:600;color:${r.type === 'in' ? 'var(--success)' : 'var(--info)'}` }, (r.type === 'in' ? '+' : '-') + fmtMoney(r.amount)),
              el('td', { class: 'muted' }, r.note || '—'),
              el('td', { style: 'white-space:nowrap' },
                el('button', { class: 'icon-btn', title: '编辑', onclick: () => recordModal(r) }, icon('edit', 14)),
                el('button', {
                  class: 'icon-btn danger', title: '删除',
                  onclick: async () => { if (await confirmBox(`删除这条${r.type === 'in' ? '收入' : '支出'}记录？`)) store.update(dd => { dd.ledger = dd.ledger.filter(x => x.id !== r.id); }); }
                }, icon('trash', 14))))))))
        : emptyState('coin', '还没有任何收支记录', '点右上角「+ 记一笔」，今天就开始记账'))
  );
  if (isDemo) root.querySelector('.view-head')?.after(el('p', { class: 'module-notice' }, '模拟收支 · 非个人真实账目'));
}

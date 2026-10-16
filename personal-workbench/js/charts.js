// ============ 手绘 SVG 图表（无外部依赖） ============
import { el } from './util.js';

export const PALETTE = ['#303030', '#777777', '#aaaaaa', '#555555', '#cccccc', '#888888', '#444444', '#bbbbbb', '#666666', '#999999'];

/**
 * 环形图。segs: [{label, value}]
 * 返回 {svg, legend} 两个元素
 */
export function donutChart(segs, { size = 170, thick = 24, centerLabel = '' } = {}) {
  const data = segs.filter(s => s.value > 0);
  const total = data.reduce((a, s) => a + s.value, 0);
  const r = (size - thick) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', '100%');
  svg.style.maxWidth = size + 'px';

  // 底环
  const bg = document.createElementNS(ns, 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'rgba(255,255,255,.06)');
  bg.setAttribute('stroke-width', thick);
  svg.append(bg);

  if (total > 0) {
    let offset = 0;
    data.forEach((s, i) => {
      const frac = s.value / total;
      const len = Math.max(frac * C - 2, 0.5);
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', PALETTE[i % PALETTE.length]);
      c.setAttribute('stroke-width', thick);
      c.setAttribute('stroke-dasharray', `${len} ${C - len}`);
      c.setAttribute('stroke-dashoffset', -offset);
      c.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
      const t = document.createElementNS(ns, 'title');
      t.textContent = `${s.label} ¥${s.value.toFixed(2)}（${(frac * 100).toFixed(1)}%）`;
      c.append(t);
      svg.append(c);
      offset += frac * C;
    });
  }

  const t1 = document.createElementNS(ns, 'text');
  t1.setAttribute('x', cx); t1.setAttribute('y', cy - 2);
  t1.setAttribute('text-anchor', 'middle');
  t1.setAttribute('fill', 'var(--text-3)');
  t1.setAttribute('font-size', '11');
  t1.textContent = centerLabel;
  const t2 = document.createElementNS(ns, 'text');
  t2.setAttribute('x', cx); t2.setAttribute('y', cy + 18);
  t2.setAttribute('text-anchor', 'middle');
  t2.setAttribute('fill', 'var(--text)');
  t2.setAttribute('font-size', '15');
  t2.setAttribute('font-weight', '700');
  t2.textContent = total > 0 ? '¥' + total.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '暂无';
  svg.append(t1, t2);

  const legend = el('div', { class: 'legend' },
    data.map((s, i) => el('div', { class: 'li' },
      el('span', { class: 'sw', style: `background:${PALETTE[i % PALETTE.length]}` }),
      el('span', { class: 'muted' }, s.label),
      el('span', { class: 'num', style: 'margin-left:auto;font-weight:600' }, '¥' + s.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })),
      el('span', { class: 'muted tiny num', style: 'width:44px;text-align:right' }, (s.value / total * 100).toFixed(0) + '%')
    ))
  );
  return { svg, legend, total };
}

/**
 * 分组柱状图（近 6 个月收入 vs 支出）
 * months: ['3月',...]  income: []  expense: []
 */
export function barChart(months, income, expense) {
  const W = 560, H = 220, padL = 8, padB = 26, padT = 14;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');

  const max = Math.max(1, ...income, ...expense) * 1.15;
  const innerW = W - padL * 2, innerH = H - padT - padB;
  const groupW = innerW / months.length;
  const barW = Math.min(groupW / 3.2, 26);

  const mk = (tag, attrs) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };

  // 基线
  svg.append(mk('line', { x1: padL, y1: H - padB, x2: W - padL, y2: H - padB, stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1 }));

  months.forEach((m, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const iv = income[i] || 0, ev = expense[i] || 0;
    const ih = iv / max * innerH, eh = ev / max * innerH;

    const r1 = mk('rect', { x: gx - barW - 2, y: H - padB - ih, width: barW, height: Math.max(ih, 0.5), rx: 3, fill: 'var(--text)', opacity: iv ? 1 : 0.15 });
    r1.append(mk('title', {})); r1.querySelector('title').textContent = `${m} 收入 ¥${iv.toFixed(0)}`;
    const r2 = mk('rect', { x: gx + 2, y: H - padB - eh, width: barW, height: Math.max(eh, 0.5), rx: 3, fill: 'var(--text-3)', opacity: ev ? 1 : 0.15 });
    r2.append(mk('title', {})); r2.querySelector('title').textContent = `${m} 支出 ¥${ev.toFixed(0)}`;
    svg.append(r1, r2);

    const tx = mk('text', { x: gx, y: H - 8, 'text-anchor': 'middle', fill: 'var(--text-3)', 'font-size': 11 });
    tx.textContent = m;
    svg.append(tx);
  });

  return svg;
}

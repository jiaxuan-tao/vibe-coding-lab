// ============ 工作情况：月工作计划 + 日工作完成情况 ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, fmtDateTime, toast, uid, WEEK_CN, richText, stripHtml, richToHtml } from '../util.js';
import { store } from '../store.js';
import { exportExcelBook, pickExcelBook, asText, asMonth, asDate, asDone } from '../excel.js';

const XLSX_BTN = 'display:inline-flex;align-items:center;gap:5px';

// 工作完成情况的四个分类（参照工作日志格式）
const CATS = [
  ['install', '项目推进'],
  ['civil', '协作沟通'],
  ['sub', '待跟进'],
  ['other', '其他'],
];

const pad = n => String(n).padStart(2, '0');
function monthStr(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }

let tab = 'plans';           // plans | logs
let curMonth = monthStr();   // 计划 tab 当前查看的月份 YYYY-MM
let logMonth = monthStr();   // 日志 tab 当前浏览的月份 YYYY-MM
let logQuery = '';           // 日志搜索关键词（非空时搜索全部记录）

// Failed writes outlive an editor instance, but never a confirmed data import.
const logDrafts = new Map();
store.onChange(source => { if (source === 'import') logDrafts.clear(); });
window.addEventListener('beforeunload', event => {
  if (!logDrafts.size) return;
  event.preventDefault();
  event.returnValue = '';
});

function logField(log, key) {
  return key === 'other' ? (log?.other || log?.content || '') : (log?.[key] || '');
}

function draftValue(value) {
  return stripHtml(value).trim() ? value.trim() : '';
}

function monthLabel(m) { const [y, mm] = m.split('-'); return `${y} 年 ${Number(mm)} 月`; }
function shiftMonth(m, delta) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1 + delta, 1);
  return monthStr(d);
}
function dateLabel(ds) {
  const d = new Date(ds + 'T00:00:00');
  return `${ds} 星期${WEEK_CN[d.getDay()]}`;
}

// ---------------- Excel 导出 / 导入 ----------------
async function exportPlans() {
  try {
    const plans = [...store.data.work.plans].sort((a, b) => a.month.localeCompare(b.month) || a.createdAt - b.createdAt);
    const focus = store.data.work.focus || {};
    if (!plans.length && !Object.keys(focus).length) { toast('还没有计划可导出', 'err'); return; }
    const aoa = [['月份', '计划内容', '备注', '是否完成', '创建时间']];
    plans.forEach(p => aoa.push([p.month, stripHtml(p.title), stripHtml(p.note), p.done ? '已完成' : '未完成', fmtDateTime(p.createdAt)]));
    const focusAoa = [['月份', '当月重点工作']];
    Object.keys(focus).sort().forEach(m => { if (focus[m]) focusAoa.push([m, focus[m]]); });
    await exportExcelBook(`月工作计划-${todayStr()}.xlsx`, [
      { name: '月工作计划', aoa, widths: [10, 42, 42, 10, 18] },
      { name: '当月重点工作', aoa: focusAoa, widths: [10, 60] },
    ]);
    toast(`已导出 ${plans.length} 条计划`);
  } catch (e) { toast(e.message || '导出失败', 'err'); }
}

async function importPlans() {
  try {
    const sheets = await pickExcelBook();
    if (!sheets) return;
    const planSheet = sheets.find(s => s.name.includes('计划')) || sheets[0];
    const focusSheet = sheets.find(s => s.name.includes('重点'));
    const data = planSheet.rows.filter(r => r.some(c => asText(c) !== ''));
    if (data.length < 2 && !focusSheet) { toast('表格里没有可导入的数据', 'err'); return; }
    let added = 0, updated = 0, skipped = 0, focusCnt = 0;
    store.update(d => {
      if (data.length >= 2) {
        const head = data[0].map(asText);
        const colOf = (...names) => head.findIndex(h => names.some(n => h.includes(n)));
        const cMonth = colOf('月份', '月度'), cTitle = colOf('计划', '内容', '目标'), cNote = colOf('备注', '说明'), cDone = colOf('完成');
        if (cTitle < 0) { toast('没认出「计划内容」列，请确认第一行是表头', 'err'); return; }
        data.slice(1).forEach(r => {
          const title = asText(r[cTitle]);
          if (!title) { skipped++; return; }
          const m = (cMonth >= 0 ? asMonth(r[cMonth]) : null) || curMonth;
          const note = cNote >= 0 ? asText(r[cNote]) : '';
          const doneCell = cDone >= 0 ? asText(r[cDone]) : '';
          const hit = d.work.plans.find(p => p.month === m && p.title === title);
          if (hit) {
            if (note) hit.note = note;
            if (doneCell) hit.done = asDone(r[cDone]);
            updated++;
          } else {
            d.work.plans.push({ id: uid(), month: m, title, note, done: doneCell ? asDone(doneCell) : false, createdAt: Date.now() });
            added++;
          }
        });
      }
      if (focusSheet && focusSheet.rows.length >= 2) {
        const head = focusSheet.rows[0].map(asText);
        const cM = head.findIndex(h => h.includes('月份'));
        const cF = head.findIndex(h => h.includes('重点'));
        if (cF >= 0) {
          d.work.focus = d.work.focus || {};
          focusSheet.rows.slice(1).forEach(r => {
            const text = asText(r[cF]);
            const m = (cM >= 0 ? asMonth(r[cM]) : null) || curMonth;
            if (text) { d.work.focus[m] = text; focusCnt++; }
          });
        }
      }
    });
    toast(`导入完成：新增 ${added} 条` + (updated ? `，更新 ${updated} 条` : '') + (focusCnt ? `，重点工作 ${focusCnt} 条` : '') + (skipped ? `，跳过 ${skipped} 行` : ''));
  } catch (e) { toast(e.message || '导入失败', 'err'); }
}

async function exportLogs() {
  try {
    const logs = [...store.data.work.logs].sort((a, b) => a.date.localeCompare(b.date));
    if (!logs.length) { toast('还没有记录可导出', 'err'); return; }
    const aoa = [['日期', '当日重点工作', '项目推进', '协作沟通', '待跟进', '其他', '更新时间']];
    logs.forEach(l => aoa.push([l.date, stripHtml(l.focus), stripHtml(l.install), stripHtml(l.civil), stripHtml(l.sub), stripHtml(l.other || l.content), fmtDateTime(l.updatedAt)]));
    await exportExcelBook(`日工作完成情况-${todayStr()}.xlsx`, [
      { name: '日工作完成情况', aoa, widths: [12, 24, 30, 30, 30, 30, 18] },
    ]);
    toast(`已导出 ${logs.length} 条记录`);
  } catch (e) { toast(e.message || '导出失败', 'err'); }
}

async function importLogs() {
  try {
    const sheets = await pickExcelBook();
    if (!sheets) return;
    const rows = sheets.find(s => s.name.includes('完成'))?.rows || sheets[0].rows;
    const data = rows.filter(r => r.some(c => asText(c) !== ''));
    if (data.length < 2) { toast('表格里没有可导入的数据', 'err'); return; }
    const head = data[0].map(asText);
    const colOf = (...names) => head.findIndex(h => names.some(n => h.includes(n)));
    const cDate = colOf('日期'), cFocus = colOf('重点');
    const cInstall = colOf('项目推进', '安装'), cCivil = colOf('协作沟通', '土建', '业主'), cSub = colOf('待跟进', '分包');
    const cOther = colOf('其他'), cLegacy = colOf('完成情况', '内容', '记录');
    if (cDate < 0 || [cInstall, cCivil, cSub, cOther, cLegacy].every(c => c < 0)) {
      toast('没认出「日期」或分类内容列，请确认第一行是表头', 'err'); return;
    }
    let added = 0, updated = 0, skipped = 0;
    store.update(d => {
      data.slice(1).forEach(r => {
        const date = asDate(r[cDate]);
        const get = i => (i >= 0 ? asText(r[i]) : '');
        const fields = {
          focus: get(cFocus), install: get(cInstall), civil: get(cCivil),
          sub: get(cSub), other: get(cOther) || get(cLegacy),
        };
        if (!date || !Object.values(fields).some(Boolean)) { skipped++; return; }
        const hit = d.work.logs.find(l => l.date === date);
        if (hit) { Object.assign(hit, fields, { content: '', updatedAt: Date.now() }); updated++; }
        else { d.work.logs.push({ id: uid(), date, content: '', ...fields, createdAt: Date.now(), updatedAt: Date.now() }); added++; }
      });
    });
    toast(`导入完成：新增 ${added} 条` + (updated ? `，覆盖 ${updated} 条` : '') + (skipped ? `，跳过 ${skipped} 行` : ''));
  } catch (e) { toast(e.message || '导入失败', 'err'); }
}

// ---------------- 月工作计划 ----------------
function planModal(existing) {
  formModal(existing ? '编辑月计划' : '新建月计划', [
    { key: 'title', label: '计划内容', required: true, placeholder: '这个月要达成什么？' },
    { key: 'note', label: '备注', type: 'textarea', rows: 3, placeholder: '可选：具体拆解、衡量标准…' },
  ], existing || {}, '保存', v => {
    store.update(d => {
      if (existing) Object.assign(d.work.plans.find(p => p.id === existing.id), v);
      else d.work.plans.push({ id: uid(), month: curMonth, title: v.title, note: v.note, done: false, createdAt: Date.now() });
    });
    toast(existing ? '计划已更新' : '已加入本月计划');
  });
}

function renderPlans(box) {
  const plans = store.data.work.plans.filter(p => p.month === curMonth);
  const doneCnt = plans.filter(p => p.done).length;
  const pct = plans.length ? Math.round(doneCnt / plans.length * 100) : 0;

  // 当月重点工作输入框
  const focusTa = richText({ placeholder: '这个月最重要的工作是什么？', value: (store.data.work.focus || {})[curMonth] || '', rows: 2 });

  box.innerHTML = '';
  box.append(...[
    // 月份切换 + 新建
    el('div', { class: 'work-toolbar' },
      el('div', { class: 'work-month' },
        el('button', { class: 'btn btn-sm', onclick: () => { curMonth = shiftMonth(curMonth, -1); renderPlans(box); } }, '‹'),
        el('span', { class: 'work-month-label' }, monthLabel(curMonth)),
        el('button', { class: 'btn btn-sm', onclick: () => { curMonth = shiftMonth(curMonth, 1); renderPlans(box); } }, '›'),
        curMonth !== monthStr() ? el('button', { class: 'btn btn-sm', onclick: () => { curMonth = monthStr(); renderPlans(box); } }, '回本月') : null),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end' },
        el('button', { class: 'btn btn-sm', style: XLSX_BTN, onclick: exportPlans }, icon('down', 14), '导出 Excel'),
        el('button', { class: 'btn btn-sm', style: XLSX_BTN, onclick: importPlans }, icon('up', 14), '导入 Excel'),
        el('button', { class: 'btn btn-primary', onclick: () => planModal() }, '+ 新建计划'))),

    // 当月重点工作
    el('div', { class: 'card work-today' },
      cardTitle('bulb', '当月重点工作'),
      focusTa,
      el('div', { style: 'margin-top:10px' },
        el('button', {
          class: 'btn btn-primary btn-sm', onclick: () => {
            store.update(d => {
              d.work.focus = d.work.focus || {};
              d.work.focus[curMonth] = focusTa.value.trim();
            });
            toast(monthLabel(curMonth) + '重点工作已保存');
          }
        }, '保存重点工作'))),

    // 完成进度
    plans.length ? el('div', { class: 'card work-progress' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' },
        el('span', { class: 'tiny muted' }, '本月完成度'),
        el('span', { class: 'num', style: 'font-weight:700;color:var(--accent)' }, `${doneCnt} / ${plans.length}　${pct}%`)),
      el('div', { class: 'work-bar' }, el('div', { class: 'work-bar-fill', style: `width:${pct}%` }))) : null,

    // 计划列表
    plans.length
      ? el('div', { class: 'work-list' }, plans.map(p =>
        el('div', { class: 'card work-row' + (p.done ? ' is-done' : '') },
          el('button', {
            class: 'work-check' + (p.done ? ' on' : ''), title: p.done ? '标记为未完成' : '标记为完成',
            onclick: () => store.update(d => { const x = d.work.plans.find(i => i.id === p.id); x.done = !x.done; })
          }, p.done ? icon('check', 13) : null),
          el('div', { class: 'work-main' },
            el('div', { class: 'work-title' }, p.title),
            p.note ? el('div', { class: 'muted tiny', style: 'margin-top:4px;white-space:pre-wrap', html: richToHtml(p.note) }) : null),
          el('div', { class: 'work-ops' },
            el('button', { class: 'btn btn-sm', onclick: () => planModal(p) }, icon('edit', 14)),
            el('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmBox(`删除计划「${p.title}」？`)) store.update(d => { d.work.plans = d.work.plans.filter(i => i.id !== p.id); }); } }, icon('trash', 14))))))
      : emptyState('cal', `${monthLabel(curMonth)}还没有计划`, '点右上角「+ 新建计划」给这个月定个目标'),
  ].filter(Boolean));
}

// ---------------- 日工作完成情况 ----------------
function saveLog(date, fields, { id, source = 'local' } = {}) {
  store.update(d => {
    const hit = d.work.logs.find(l => id ? l.id === id : l.date === date);
    if (id && !hit) throw new Error('这条工作记录已变化，请重新打开后编辑。');
    if (d.work.logs.some(l => l.date === date && l.id !== hit?.id)) {
      throw new Error(`${date} 已有工作记录，请选择其他日期。`);
    }
    if (hit) Object.assign(hit, { other: hit.other || hit.content || '' }, fields, { date, content: '', updatedAt: Date.now() });
    else d.work.logs.push({ id: uid(), date, content: '', ...fields, createdAt: Date.now(), updatedAt: Date.now() });
  }, { source });
}

function logModal(existing) {
  formModal(existing ? '编辑工作记录' : '补记工作完成情况', [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'focus', label: '当日重点工作', placeholder: '可选：今天最重要的事' },
    ...CATS.map(([k, label]) => ({ key: k, label, type: 'textarea', rows: 2, placeholder: '可选' })),
  ], existing
    ? { ...existing, other: existing.other || existing.content || '' }
    : { date: todayStr() }, '保存', v => {
    const fields = { focus: v.focus || '', install: v.install || '', civil: v.civil || '', sub: v.sub || '', other: v.other || '' };
    if (!Object.values(fields).some(value => stripHtml(value).trim())) { toast('至少填写一项内容', 'err'); return false; }
    if (store.data.work.logs.some(l => l.date === v.date && l.id !== existing?.id)) {
      toast(`${v.date} 已有工作记录，请选择其他日期。`, 'err');
      return false;
    }
    saveLog(v.date, fields, { id: existing?.id });
    toast('已保存');
  });
}

// 一条记录的展示内容（重点工作 + 四分类，兼容旧格式的 content）
function logBody(l) {
  const parts = [];
  if (l.focus) {
    parts.push(el('div', { style: 'margin-top:6px;padding:8px 10px;border-left:3px solid var(--accent);background:rgba(var(--accent-rgb),.08);border-radius:6px;font-size:13.5px', html: richToHtml('★ 当日重点：' + l.focus) }));
  }
  const filled = CATS.filter(([k]) => l[k]);
  if (filled.length) {
    parts.push(el('div', { class: 'work-cols' }, filled.map(([k, label]) =>
      el('div', { class: 'work-col' },
        el('div', { class: 'work-col-h' }, label),
        el('div', { class: 'work-col-b', html: richToHtml(l[k]) })))));
  } else if (l.content) {
    parts.push(el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:6px;white-space:pre-wrap' }, l.content));
  }
  return parts;
}

// 把分类文本拆成事项条目（去掉“要求完成时间”等噪音行）
function splitItems(text) {
  return stripHtml(text || '').split(/[\n；;]+/).map(s => s.trim())
    .filter(s => s.length >= 2 && !/：$/.test(s) && !/^要求完成时间/.test(s) && !/^考核/.test(s));
}

// 根据日工作完成情况自动整理月度总结（控制在 300 字左右）
function genSummary(m) {
  const logs = store.data.work.logs.filter(l => l.date.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
  if (!logs.length) return '';
  const focus = (store.data.work.focus || {})[m] || '';
  const plans = store.data.work.plans.filter(p => p.month === m);
  const doneCnt = plans.filter(p => p.done).length;
  let out = `本月共 ${logs.length} 天有工作记录。`;
  if (focus) out += `当月重点工作：${stripHtml(focus)}。`;
  if (plans.length) out += `月工作计划 ${plans.length} 项，完成 ${doneCnt} 项。`;
  // 各分类事项按日期先后去重收集
  const catItems = CATS.map(([k, label]) => {
    const seen = new Set(); const items = [];
    logs.forEach(l => splitItems(l[k] || (k === 'other' ? l.content : '')).forEach(it => {
      if (!seen.has(it)) { seen.add(it); items.push(it); }
    }));
    return [label, items];
  }).filter(([, items]) => items.length);
  // 逐条追加，总量向 300 字收敛
  for (const [label, items] of catItems) {
    let para = `${label}：`; let added = 0;
    for (const it of items) {
      const next = para + (added ? '；' : '') + it;
      if (out.length + next.length + 1 > 300 && added > 0) break; // 超 300 字且至少有一条就停
      para = next; added++;
      if (out.length + para.length + 1 > 360) break; // 单条很长时兜底截断
    }
    if (added) out += para + '。';
  }
  // 硬上限：超过 330 字时截断收尾，保证在 300 字左右
  if (out.length > 330) out = out.slice(0, 328).replace(/[；;，,。、：:…]+$/, '') + '…';
  return out;
}

function summaryModal() {
  const text = genSummary(logMonth);
  if (!text) { toast(monthLabel(logMonth) + '还没有工作记录，无法生成总结', 'err'); return; }
  formModal(`${monthLabel(logMonth)}工作总结（约 ${text.length} 字）`, [
    { key: 'summary', label: '内容可直接修改，点「复制」后粘贴到需要的地方', type: 'textarea', rows: 12 },
  ], { summary: text }, '复制').then(v => {
    if (!v) return;
    const done = () => toast('已复制到剪贴板 ✓');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(v.summary).then(done).catch(() => toast('复制失败，请手动全选复制', 'err'));
    else toast('请手动全选复制', 'err');
  });
}

function renderLogs(box) {
  const today = todayStr();
  const todayLog = store.data.work.logs.find(l => l.date === today);
  let snapshot = store.data;
  let active = true;
  let saveTimer = null;
  const cancelSave = () => { clearTimeout(saveTimer); saveTimer = null; };
  const deactivate = () => { active = false; cancelSave(); };
  const off = store.onChange(source => { if (source === 'import') deactivate(); });
  const initialValue = key => logDrafts.get(today)?.[key] ?? logField(todayLog, key);
  const openLog = existing => {
    if (!doSave(false)) return;
    logModal(existing ? store.data.work.logs.find(l => l.id === existing.id) : undefined);
  };

  // 往日记录列表：按月份浏览 / 关键词全局搜索（独立重绘，搜索时不丢输入焦点）
  const listBox = el('div', {});
  const logCard = l => el('div', { class: 'card work-row' },
    el('div', { class: 'work-main' },
      el('div', { class: 'work-title', style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
        dateLabel(l.date),
        l.date === today ? el('span', { class: 'tag' }, '今天') : null),
      ...logBody(l)),
    el('div', { class: 'work-ops' },
      el('button', { class: 'btn btn-sm', onclick: () => openLog(l) }, icon('edit', 14)),
      el('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (!doSave(false)) return; if (await confirmBox(`删除 ${l.date} 的记录？`)) { store.update(d => { d.work.logs = d.work.logs.filter(i => i.id !== l.id); }); paintList(); } } }, icon('trash', 14))));

  function paintList() {
    const all = [...store.data.work.logs].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
    const q = logQuery.toLowerCase();
    const match = l => [l.date, l.focus, ...CATS.map(([k]) => l[k]), l.content].some(s => stripHtml(s || '').toLowerCase().includes(q));
    const shown = q ? all.filter(match) : all.filter(l => l.date.startsWith(logMonth));
    listBox.innerHTML = '';
    if (!shown.length) {
      listBox.append(emptyState('note',
        q ? `没有找到包含「${logQuery}」的记录` : `${monthLabel(logMonth)}没有工作记录`,
        q ? '换个关键词试试' : '可以点「补记以往日期」补录，或切换月份查看'));
      return;
    }
    const cap = shown.slice(0, 200);
    listBox.append(
      el('div', { class: 'tiny muted', style: 'margin:2px 2px 8px' },
        q ? `找到 ${shown.length} 条记录` + (shown.length > 200 ? '，显示前 200 条' : '') : `${monthLabel(logMonth)}共 ${shown.length} 条记录`),
      el('div', { class: 'work-list' }, cap.map(logCard)));
  }

  const searchIn = el('input', { class: 'input', type: 'search', placeholder: '查找往日记录：输入关键词或日期，搜索全部记录…' });
  searchIn.value = logQuery;
  searchIn.oninput = () => { logQuery = searchIn.value.trim(); paintList(); };

  // 今日快记：当日重点工作 + 四分类（输入停顿 1.2s 自动保存，无需手动点保存）
  const saveStatus = el('span', { class: 'tiny muted', style: 'margin-left:auto;align-self:center' },
    logDrafts.has(today) ? '有未保存的草稿，请重试保存' : todayLog ? '' : '输入停顿后自动保存');
  function doSave(manual) {
    cancelSave();
    if (!active) return true;
    // A store replacement has already committed before app cleanup runs. Never
    // flush the old editor into that newer snapshot (especially a restored backup).
    if (store.data !== snapshot) { deactivate(); return true; }
    const fields = logDrafts.get(today);
    if (!fields) return true;
    if (!store.data.work.logs.some(l => l.date === today) && !Object.values(fields).some(value => stripHtml(value).trim())) {
      logDrafts.delete(today);
      if (manual) { toast('先写点内容再保存', 'err'); focusIn.focus(); }
      return !manual;
    }
    try {
      saveLog(today, fields, { source: 'work-draft' });
    } catch (error) {
      saveStatus.textContent = '保存失败，草稿尚未保存';
      toast(error.message || '保存失败，请重试', 'err');
      return false;
    }
    snapshot = store.data;
    logDrafts.delete(today);
    const t = new Date(), pad2 = n => String(n).padStart(2, '0');
    saveStatus.textContent = `${manual ? '已保存' : '已自动保存'} ${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`;
    saveBtn.textContent = '更新今天的记录';
    paintList();
    if (manual) toast('今天的工作已记录 ✓');
    return true;
  }
  const autoSave = key => {
    if (!active) return;
    const input = key === 'focus' ? focusIn : catInputs.find(input => input.k === key).ta;
    const fields = { ...logDrafts.get(today) };
    const value = draftValue(input.value);
    const saved = store.data.work.logs.find(log => log.date === today);
    if (value === draftValue(logField(saved, key))) delete fields[key];
    else fields[key] = value;
    if (Object.keys(fields).length) logDrafts.set(today, fields);
    else logDrafts.delete(today);
    cancelSave();
    if (logDrafts.has(today)) saveTimer = setTimeout(() => doSave(false), 1200);
  };
  const focusIn = richText({ placeholder: '当日重点工作（选填）', value: initialValue('focus'), rows: 1, single: true, onInput: () => autoSave('focus') });
  const catInputs = CATS.map(([k, label]) => {
    const ta = richText({ placeholder: label + '…', value: initialValue(k), rows: 2, onInput: () => autoSave(k) });
    return { k, label, ta };
  });
  const saveBtn = el('button', { class: 'btn btn-primary', onclick: () => doSave(true) },
    todayLog ? '更新今天的记录' : '保存今天的记录');

  box.innerHTML = '';
  box.append(
    el('div', { class: 'card work-today' },
      cardTitle('edit', '今天 · ' + dateLabel(today)),
      focusIn,
      el('div', { class: 'work-cols', style: 'margin-top:10px' }, catInputs.map(({ label, ta }) =>
        el('div', {},
          el('div', { class: 'tiny muted', style: 'margin-bottom:4px' }, label),
          ta))),
      el('div', { style: 'display:flex;gap:10px;margin-top:12px;flex-wrap:wrap' },
        saveBtn,
        el('button', { class: 'btn', onclick: () => openLog() }, '补记以往日期'),
        el('button', { class: 'btn btn-sm', style: XLSX_BTN, onclick: exportLogs }, icon('down', 14), '导出 Excel'),
        el('button', { class: 'btn btn-sm', style: XLSX_BTN, onclick: () => { if (doSave(false)) importLogs(); } }, icon('up', 14), '导入 Excel'),
        saveStatus)),

    // 往日记录：月份切换 + 月度总结 + 搜索
    el('div', { class: 'card' },
      el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
        el('div', { class: 'work-month' },
          el('button', { class: 'btn btn-sm', onclick: () => { logMonth = shiftMonth(logMonth, -1); paintList(); } }, '‹'),
          el('span', { class: 'work-month-label' }, monthLabel(logMonth)),
          el('button', { class: 'btn btn-sm', onclick: () => { logMonth = shiftMonth(logMonth, 1); paintList(); } }, '›'),
          logMonth !== monthStr() ? el('button', { class: 'btn btn-sm', onclick: () => { logMonth = monthStr(); paintList(); } }, '回本月') : null),
        el('div', { style: 'margin-left:auto' },
          el('button', { class: 'btn btn-sm btn-primary', onclick: summaryModal }, '月度总结'))),
      el('div', { style: 'margin-top:10px' }, searchIn)),
    listBox);
  paintList();
  return () => {
    doSave(false);
    deactivate();
    off();
  };
}

// ---------------- 视图入口 ----------------
export function render(root) {
  const content = el('div', {});
  let cleanup = null;
  const dispose = () => { const previous = cleanup; cleanup = null; previous?.(); };
  const paint = () => {
    dispose();
    cleanup = tab === 'plans' ? renderPlans(content) : renderLogs(content);
  };
  root.append(
    viewHead('工作情况', '月工作计划 · 日工作完成情况'),
    el('div', { class: 'tabs stock-tabs' },
      ...[['plans', '月工作计划'], ['logs', '日工作完成情况']].map(([k, label]) =>
        el('button', {
          class: 'tab' + (tab === k ? ' active' : ''),
          onclick: (e) => {
            tab = k;
            e.currentTarget.parentElement.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === e.currentTarget));
            paint();
          }
        }, label))),
    content);
  paint();
  return dispose;
}

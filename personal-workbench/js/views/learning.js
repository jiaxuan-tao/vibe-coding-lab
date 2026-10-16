// ============ 学习管理（计划 + 每日打卡热力图） ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, toast, WEEK_CN } from '../util.js';
import { store } from '../store.js';

function planModal(edit) {
  formModal(edit ? '编辑学习计划' : '新建学习计划', [
    { key: 'name', label: '计划名称', required: true, placeholder: '例如：学完 Python 入门课' },
    { key: 'goal', label: '目标描述', placeholder: '例如：30 天内看完 20 节课' },
  ], edit, '保存', v => {
    if (!v) return;
    store.update(d => {
      if (edit) Object.assign(d.learning.plans.find(p => p.id === edit.id), v);
      else d.learning.plans.push({ id: 'lp' + Math.random().toString(36).slice(2, 9), progress: 0, ...v });
    });
    toast('已保存', 'ok');
  });
}

function monthCalendar(checkins) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // 周一开头
  const today = todayStr();
  const set = new Set(checkins);

  const cells = ['一', '二', '三', '四', '五', '六', '日'].map(w => el('div', { class: 'hd' }, w));
  for (let i = 0; i < startDow; i++) cells.push(el('div', {}));
  for (let dd = 1; dd <= days; dd++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    cells.push(el('div', { class: 'dy' + (set.has(key) ? ' on' : '') + (key === today ? ' today' : '') }, String(dd)));
  }
  return el('div', { class: 'heat' }, cells);
}

export function render(root) {
  const d = store.data;
  const today = todayStr();
  const checkedToday = d.learning.checkins.includes(today);

  // 连续打卡
  let streak = 0;
  {
    const set = new Set(d.learning.checkins);
    const cur = new Date();
    if (!set.has(todayStr(cur))) cur.setDate(cur.getDate() - 1);
    while (set.has(todayStr(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  }

  root.append(
    viewHead('学习管理', '定计划、追进度、每天打卡',
      el('button', { class: 'btn btn-primary', onclick: () => planModal() }, '+ 新建计划')),

    el('div', { class: 'grid grid-2' },
      // ---- 学习计划 ----
      el('div', { class: 'card' },
        cardTitle('book', '学习计划', el('span', { class: 'tiny muted' }, `${d.learning.plans.length} 个`)),
        d.learning.plans.length
          ? el('div', {}, d.learning.plans.map(p => el('div', { class: 'plan-item' },
            el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:6px' },
              el('span', { style: 'font-weight:600' }, p.name),
              el('span', { class: 'num', style: 'margin-left:auto;font-weight:700;color:var(--accent)' }, p.progress + '%'),
              el('button', { class: 'icon-btn', title: '编辑', onclick: () => planModal(p) }, icon('edit', 14)),
              el('button', {
                class: 'icon-btn danger', title: '删除',
                onclick: async () => { if (await confirmBox(`删除计划「${p.name}」？`)) store.update(dd => { dd.learning.plans = dd.learning.plans.filter(x => x.id !== p.id); }); }
              }, icon('trash', 14))),
            p.goal ? el('div', { class: 'tiny muted', style: 'margin-bottom:9px' }, p.goal) : null,
            el('div', { class: 'progress' }, el('i', { style: `width:${p.progress}%` })),
            el('div', { style: 'display:flex;gap:8px;margin-top:10px' },
              el('button', {
                class: 'btn btn-sm', onclick: () => store.update(dd => {
                  const x = dd.learning.plans.find(i => i.id === p.id); x.progress = Math.max(0, x.progress - 10);
                })
              }, '-10%'),
              el('button', {
                class: 'btn btn-sm btn-green', onclick: () => {
                  let completed = false;
                  store.update(dd => {
                    const x = dd.learning.plans.find(i => i.id === p.id);
                    completed = x.progress < 100 && x.progress + 10 >= 100;
                    x.progress = Math.min(100, x.progress + 10);
                  });
                  if (completed) toast('计划完成！', 'ok');
                }
              }, '+10% 进度')))))
          : emptyState('book', '还没有学习计划', '点右上角「+ 新建计划」定一个小目标')),

      // ---- 打卡 ----
      el('div', { class: 'card' },
        cardTitle('check', '每日打卡', el('span', { class: 'tiny muted' }, `连续 ${streak} 天 · 累计 ${d.learning.checkins.length} 天`)),
        el('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap' },
          el('button', {
            class: 'btn ' + (checkedToday ? '' : 'btn-green'), disabled: checkedToday ? '' : null,
            style: 'padding:10px 22px;font-size:14px',
            onclick: () => {
              if (checkedToday) return;
              store.update(dd => dd.learning.checkins.push(today));
              toast('打卡成功，继续保持！💪', 'ok');
            }
          }, icon('check', 16), checkedToday ? '今天已打卡' : '今日打卡'),
          el('span', { class: 'tiny muted' }, checkedToday ? '明天再来～' : '点击按钮完成今天的学习打卡')),
        el('div', { class: 'tiny muted', style: 'margin-bottom:8px' }, '本月打卡情况'),
        monthCalendar(d.learning.checkins)))
  );
}

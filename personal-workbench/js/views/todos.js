// ============ 待办 + 日程 ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, toast } from '../util.js';
import { store } from '../store.js';

let filter = 'today'; // today | all

const PRIO_LABEL = { high: '高', mid: '中', low: '低' };

function addTodoModal(edit) {
  formModal(edit ? '编辑待办' : '新建待办', [
    { key: 'title', label: '事项', required: true, placeholder: '要做什么？' },
    { key: 'priority', label: '优先级', type: 'select', options: [['high', '高'], ['mid', '中'], ['low', '低']] },
    { key: 'date', label: '日期（留空为不限）', type: 'date' },
  ], edit || { priority: 'mid', date: todayStr() }, '保存', v => {
    if (!v) return;
    store.update(d => {
      if (edit) Object.assign(d.todos.find(t => t.id === edit.id), v);
      else d.todos.unshift({ id: 't' + Math.random().toString(36).slice(2, 9), done: false, createdAt: Date.now(), ...v });
    });
    toast(edit ? '已保存' : '已添加', 'ok');
  });
}

function todoList(d) {
  const today = todayStr();
  let list = [...d.todos];
  if (filter === 'today') list = list.filter(t => t.date === today || (!t.date && !t.done));
  list.sort((a, b) => (a.done - b.done) || ({ high: 0, mid: 1, low: 2 }[a.priority] - { high: 0, mid: 1, low: 2 }[b.priority]) || b.createdAt - a.createdAt);

  if (!list.length) return emptyState('todo', filter === 'today' ? '今天没有待办' : '还没有待办', '点右上角「+ 新建待办」添加第一条');

  return el('div', {}, list.map(t => el('div', { class: 'todo-item' + (t.done ? ' done' : '') },
    el('button', {
      class: 'td-check', title: t.done ? '取消完成' : '完成',
      onclick: () => store.update(dd => { const x = dd.todos.find(i => i.id === t.id); x.done = !x.done; })
    }, icon('check', 13)),
    el('span', { class: 'prio ' + (t.priority || 'mid'), title: '优先级：' + PRIO_LABEL[t.priority || 'mid'] }),
    el('div', { class: 'grow' },
      el('div', { class: 'td-title' }, t.title),
      t.date ? el('div', { class: 'tiny muted num' }, t.date, t.date === today ? ' · 今天' : '') : null),
    el('span', { class: 'tag ' + (t.priority === 'high' ? 'red' : t.priority === 'mid' ? 'amber' : 'gray') }, PRIO_LABEL[t.priority || 'mid']),
    el('button', { class: 'icon-btn', title: '编辑', onclick: () => addTodoModal(t) }, icon('edit', 15)),
    el('button', {
      class: 'icon-btn danger', title: '删除',
      onclick: async () => { if (await confirmBox(`删除待办「${t.title}」？`)) store.update(dd => { dd.todos = dd.todos.filter(i => i.id !== t.id); }); }
    }, icon('trash', 15)),
  )));
}

function eventList(d) {
  const list = [...d.events].sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return emptyState('cal', '还没有日程安排', '点「+ 新建日程」记录重要日子');
  const today = todayStr();
  return el('div', {}, list.map(ev => el('div', { class: 'todo-item' },
    el('div', { style: 'min-width:96px' },
      el('div', { class: 'num', style: 'font-weight:600;font-size:13px;color:' + (ev.date === today ? 'var(--accent)' : 'var(--text)') }, ev.date),
      ev.date === today ? el('span', { class: 'tag', style: 'margin-top:2px' }, '今天') : null),
    el('div', { class: 'grow' },
      el('div', { style: 'font-weight:600;font-size:14px' }, ev.title),
      ev.note ? el('div', { class: 'tiny muted' }, ev.note) : null),
    el('button', { class: 'icon-btn', title: '编辑', onclick: () => eventModal(ev) }, icon('edit', 15)),
    el('button', {
      class: 'icon-btn danger', title: '删除',
      onclick: async () => { if (await confirmBox(`删除日程「${ev.title}」？`)) store.update(dd => { dd.events = dd.events.filter(i => i.id !== ev.id); }); }
    }, icon('trash', 15)),
  )));
}

function eventModal(edit) {
  formModal(edit ? '编辑日程' : '新建日程', [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'title', label: '事项', required: true, placeholder: '例如：体检 / 朋友生日' },
    { key: 'note', label: '备注', placeholder: '可选' },
  ], edit || { date: todayStr() }, '保存', v => {
    if (!v) return;
    store.update(d => {
      if (edit) Object.assign(d.events.find(t => t.id === edit.id), v);
      else d.events.push({ id: 'e' + Math.random().toString(36).slice(2, 9), ...v });
    });
    toast('已保存', 'ok');
  });
}

export function render(root) {
  const d = store.data;
  root.append(
    viewHead('待办 · 日程', '把今天要做的事安排明白',
      el('button', { class: 'btn', onclick: () => eventModal() }, '+ 新建日程'),
      el('button', { class: 'btn btn-primary', onclick: () => addTodoModal() }, '+ 新建待办')),
    el('div', { class: 'grid grid-2' },
      el('div', { class: 'card' },
        cardTitle('todo', '待办清单', el('span', { class: 'tabs', style: 'margin:0' },
          el('button', { class: 'tab' + (filter === 'today' ? ' active' : ''), onclick: () => { filter = 'today'; rerender(root); } }, '今天'),
          el('button', { class: 'tab' + (filter === 'all' ? ' active' : ''), onclick: () => { filter = 'all'; rerender(root); } }, '全部'))),
        todoList(d)),
      el('div', { class: 'card' },
        cardTitle('cal', '日程安排'),
        eventList(d)),
    )
  );
}

function rerender(root) { root.innerHTML = ''; render(root); }

// ============ 应用外壳：导航 / 路由 / 视图调度 ============
import { el, icon, closeModal, setTheme, menuModal, toast, confirmBox, THEME_STORAGE_KEY } from './util.js';
import { store, isDemo } from './store.js';
import { createDemoData } from './demo.js';
import { serializeBackup } from './data.js';

// 启动即应用本机保存的外观主题（渲染前执行，避免闪色）
setTheme((() => { try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; } })());

import * as dashboard from './views/dashboard.js';
import * as todos from './views/todos.js';
import * as work from './views/work.js';
import * as notes from './views/notes.js';
import * as ideas from './views/ideas.js';
import * as ai from './views/ai.js';
import * as ledger from './views/ledger.js';
import * as learning from './views/learning.js';
import * as info from './views/info.js';
import * as stocks from './views/stocks.js';
import * as settings from './views/settings.js';

const VIEWS = [
  { id: 'dashboard', name: '首页', icon: 'home', mod: dashboard },
  { id: 'todos', name: '待办日程', icon: 'todo', mod: todos },
  { id: 'work', name: '工作情况', icon: 'briefcase', mod: work },
  { id: 'notes', name: '笔记', icon: 'note', mod: notes },
  { id: 'ideas', name: '灵感库', icon: 'bulb', mod: ideas },
  { id: 'ai', name: 'AI 工具', icon: 'ai', mod: ai },
  { id: 'ledger', name: '记账理财', icon: 'coin', mod: ledger },
  { id: 'learning', name: '学习管理', icon: 'book', mod: learning },
  { id: 'info', name: '信息面板', icon: 'grid', mod: info },
  { id: 'stocks', name: '股票记录', icon: 'chart', mod: stocks },
  { id: 'settings', name: '设置', icon: 'gear', mod: settings },
];

const viewEl = document.getElementById('view');
const navEl = document.getElementById('nav');
const tabbarEl = document.getElementById('tabbar');

let currentId = null;
let cleanup = null;

function changeSpace(demo) {
  const url = new URL(location.href);
  if (demo) url.searchParams.set('demo', '1'); else url.searchParams.delete('demo');
  url.hash = '/dashboard';
  location.assign(url.href);
}

const workspaceBar = el('div', { id: 'workspace-bar', class: 'workspace-bar' },
  el('div', { class: 'workspace-label' },
    el('span', { class: 'workspace-dot', 'aria-hidden': 'true' }),
    el('strong', {}, isDemo ? '演示模式' : '个人空间'),
    isDemo ? el('span', { class: 'tiny muted workspace-detail' }, '示例记录 · 公开信息快照') : null),
  el('div', { class: 'workspace-actions' },
    isDemo ? el('button', { class: 'btn btn-sm', onclick: async () => {
      if (!await confirmBox('只重置演示空间中的编辑。个人空间的数据保持不变。', '重置演示数据')) return;
      store.importBackup(serializeBackup(createDemoData()));
      go('dashboard');
      toast('演示数据已重置', 'ok');
    } }, icon('refresh', 14), '重置演示') : null,
    el('button', { class: 'btn btn-sm' + (isDemo ? '' : ' btn-primary'), onclick: () => changeSpace(!isDemo) },
      isDemo ? '退出演示' : '体验演示')));
viewEl.before(workspaceBar);

// ---------- 构建导航 ----------
for (const v of VIEWS) {
  navEl.append(el('button', { class: 'nav-item', dataset: { id: v.id }, onclick: () => go(v.id) }, icon(v.icon), v.name));
  if (['dashboard', 'todos', 'notes'].includes(v.id)) tabbarEl.append(el('button', { class: 'nav-item', dataset: { id: v.id }, onclick: () => go(v.id) }, icon(v.icon, 19), v.id === 'todos' ? '待办' : v.name));
}
tabbarEl.append(el('button', { class:'nav-item', dataset:{id:'more'}, onclick: () => menuModal('全部模块', VIEWS.filter(v => !['dashboard','todos','notes'].includes(v.id)).map(v => ({label:v.name,icon:v.icon,action:()=>go(v.id)}))) }, icon('grid',19), '更多'));

function paintNav() {
  document.querySelectorAll('.nav-item').forEach(b => {
    const active = b.dataset.id === currentId || (b.dataset.id === 'more' && !['dashboard','todos','notes'].includes(currentId));
    b.classList.toggle('active', active);
    if(active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
}

function go(id) {
  if (!VIEWS.some(v => v.id === id)) id = 'dashboard';
  if (location.hash !== '#/' + id) location.hash = '#/' + id;
  else renderView(id);
}

function renderView(id, { preserveModal = false } = {}) {
  if (!VIEWS.some(v=>v.id===id)) {id='dashboard';history.replaceState(null,'','#/dashboard');}
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  if (!preserveModal) closeModal();
  currentId = id;
  paintNav();
  viewEl.innerHTML = '';
  const v = VIEWS.find(x => x.id === id);
  const r = v.mod.render(viewEl);
  cleanup = typeof r === 'function' ? r : null;
  viewEl.scrollTop = 0;
  if (store.loadError) {
    const warning = el('div', {class:'load-warning',role:'alert'}, el('p',{},'本机数据未能读取。原始内容未被覆盖，请先到设置导出原始数据，再尝试恢复备份。'),el('button',{class:'btn btn-sm',onclick:()=>go('settings')},'查看数据设置'));
    viewEl.prepend(warning);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\//, '') || 'dashboard';
  if (id !== currentId) renderView(id);
});
document.addEventListener('wb:nav', e => go(e.detail));

// ---------- 数据变化时重绘当前视图 ----------
store.onChange(source => {
  if (!currentId) return;
  if (source==='work-draft') return;
  renderView(currentId,{preserveModal:true});
});

// ---------- 本机保存状态 ----------
const chips = [document.getElementById('saveChip'), document.getElementById('saveChipM')];
chips.forEach(c => c && c.addEventListener('click', () => go('settings')));
function paintSave() {
  const {state} = store.status;
  chips.forEach(c => { if (!c) return; c.dataset.state=state; c.replaceChildren(el('span',{class:'dot'}),state==='error'?'保存异常':isDemo?'演示空间':'本机保存'); });
}
store.onStatus(paintSave);
function handleStorageError(error, event) {
  if (error?.name !== 'StorageWriteError') return;
  event.preventDefault();
  toast(error.message || '保存失败，请先导出备份并检查浏览器存储空间', 'err');
}
window.addEventListener('error', e => handleStorageError(e.error, e));
window.addEventListener('unhandledrejection', e => handleStorageError(e.reason, e));

// ---------- 启动 ----------
paintSave();
const first = location.hash.replace(/^#\//, '') || 'dashboard';
renderView(VIEWS.some(v => v.id === first) ? first : 'dashboard');
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {}));

// ============ 通用工具 ============
import { validateNumber, isValidDate } from './validation.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** DOM 构建器：el('div', {class:'x', onclick:fn}, child...) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  if (tag === 'button') {
    node.type = 'button';
    if (attrs.title && !attrs['aria-label']) node.setAttribute('aria-label', attrs.title);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/** 内联 SVG 图标库（stroke 风格，currentColor） */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  todo: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
  note: '<path d="M5 3h11l4 4v14H5z"/><path d="M9 12h7M9 16h5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  ai: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15.5 9.2c-.6-1-1.9-1.5-3.5-1.5-2 0-3.2 1-3.2 2.3 0 3.3 7 1.6 7 4.7 0 1.4-1.5 2.4-3.8 2.4-1.8 0-3-.7-3.6-1.7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M9 7h6"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 14 4-5 3 3 5-7"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.1 5.1l1.9 1.9M17 17l1.9 1.9M18.9 5.1 17 7M7 17l-1.9 1.9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  cloud: '<path d="M7 18a5 5 0 0 1-.9-9.9A6 6 0 0 1 17.7 9 4.5 4.5 0 0 1 17 18z"/>',
  down: '<path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 19h16"/>',
  up: '<path d="M12 15V3m0 0 5 5m-5-5-5 5"/><path d="M4 19h16"/>',
};
export function icon(name, size) {
  const s = size || 18;
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
  return span.firstChild;
}

// ---------- ID / 日期 / 数字 ----------
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function debounce(fn, ms) {
  let t = null;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}
const pad = n => String(n).padStart(2, '0');
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtHM(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
export function fmtMoney(n, sign = false) {
  if (n == null || !Number.isFinite(n)) return '--';
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sign) return (n > 0 ? '+' : n < 0 ? '-' : '') + s;
  return (n < 0 ? '-' : '') + s;
}
export function fmtPct(n) {
  if (n == null || !Number.isFinite(n)) return '--';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}
/** 本周（周一~周日）日期字符串数组 */
export function thisWeekDates() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 周一=0
  const mon = new Date(now); mon.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return todayStr(d);
  });
}

// ---------- Toast ----------
export function toast(msg, type = '') {
  const root = $('#toast-root');
  const t = el('div', { class: 'toast' + (type ? ' ' + type : '') }, msg);
  root.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, 2400);
}

// ---------- 弹窗 ----------
let activeCleanup = null;
export function closeModal() { if (activeCleanup) { const c = activeCleanup; activeCleanup = null; c(null); } }

function openModal({ title, body, actions = [], beforeClose = null }) {
  closeModal();
  const root = $('#modal-root');
  const previousFocus = document.activeElement;
  return new Promise(resolve => {
    let closed = false;
    const cleanup = val => {
      if (closed) return;
      closed = true;
      mask.remove(); document.removeEventListener('keydown', onKey);
      document.getElementById('app').inert = false;
      if (previousFocus?.isConnected) previousFocus.focus();
      activeCleanup = null; resolve(val);
    };
    // 遮罩 / Esc 关闭前可拦截（beforeClose 返回 false 则保持打开，防误触丢数据）
    const tryClose = async () => {
      if (beforeClose) { const r = await beforeClose(); if (r === false) return; }
      cleanup(null);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); tryClose(); }
      if (e.key === 'Tab') {
        const focusable = [...mask.querySelectorAll('button:not(:disabled), input, select, textarea, [contenteditable="true"], [tabindex="0"]')];
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    activeCleanup = cleanup;
    const btns = actions.map(a => el('button', {
      class: 'btn ' + (a.class || ''),
      onclick: async () => {
        if (a.onClick) { const r = await a.onClick(); if (r === false) return; cleanup(a.value !== undefined ? a.value : true); }
        else cleanup(a.value !== undefined ? a.value : true);
      }
    }, a.label));
    const mask = el('div', { class: 'modal-mask', onclick: e => { if (e.target === mask) tryClose(); } },
      el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        el('h3', {}, title),
        body,
        btns.length ? el('div', { class: 'modal-actions' }, btns) : null
      )
    );
    document.getElementById('app').inert = true;
    root.append(mask);
    mask.querySelector('input, select, [contenteditable="true"], button')?.focus();
  });
}

/**
 * 表单弹窗。fields: [{key,label,type,options,placeholder,required,min,max,step,rows}]
 * type: text | textarea | number | date | select | password
 * resolve(values) 或 null（取消）。校验失败时弹窗保持打开。
 */
export function formModal(title, fields, initial = {}, okLabel = '保存', onSubmit = null) {
  initial ||= {};
  let pendingValues = null;
  const inputs = {};
  const body = el('div', {});
  for (const f of fields) {
    let inp;
    const val = initial[f.key] ?? '';
    if (f.type === 'select') {
      inp = el('select', { class: 'input' },
        (f.options || []).map(o => {
          const [v, label] = Array.isArray(o) ? o : [o, o];
          return el('option', { value: v, selected: String(val) === String(v) ? '' : null }, label);
        }));
    } else if (f.type === 'textarea') {
      // 多行文本升级为富文本（字色 + 段色），旧纯文本数据自动兼容
      inp = richText({ placeholder: f.placeholder || '', value: val, rows: f.rows || 4 });
    } else {
      inp = el('input', {
        class: 'input', type: f.type || 'text', value: val,
        placeholder: f.placeholder || '',
        min: f.min ?? null, max: f.max ?? null, step: f.step ?? null,
      });
    }
    const labelId = 'field-' + uid();
    const editable = inp.querySelector?.('[contenteditable]') || inp;
    editable.id = labelId;
    editable.setAttribute('aria-label', f.label);
    if (f.required) editable.setAttribute('aria-required', 'true');
    inputs[f.key] = inp;
    body.append(el('div', { class: 'field' },
      el('label', { for: labelId }, f.label, f.required ? el('span', { class: 'req' }, ' *') : null), inp));
  }
  // 防误触：遮罩/Esc 关闭时若有未保存修改，需再次确认
  const initialStr = fields.map(f => String(inputs[f.key] ? inputs[f.key].value : '')).join('');
  let giveUpArmed = false;
  return new Promise(resolve => {
    openModal({
      title, body,
      beforeClose: () => {
        const now = fields.map(f => String(inputs[f.key].value ?? '')).join('');
        if (now === initialStr) return true;
        if (giveUpArmed) return true;
        giveUpArmed = true;
        toast('检测到未保存的修改：再点一次遮罩或按 Esc 确认放弃', 'err');
        return false;
      },
      actions: [
        { label: '取消', value: null },
        {
          label: okLabel, class: 'btn-primary',
          onClick: async () => {
            const out = {};
            for (const f of fields) {
              const raw = inputs[f.key].value.trim();
              if (f.required && !(f.type === 'textarea' ? stripHtml(raw) : raw)) { toast(`请填写「${f.label}」`, 'err'); inputs[f.key].focus(); return false; }
              if (raw.length > 100000) { toast('内容过长，请缩短后重试', 'err'); return false; }
              if (f.type === 'date' && raw && !isValidDate(raw)) { toast('请选择有效日期', 'err'); inputs[f.key].focus(); return false; }
              if (f.type === 'number') {
                if (raw === '') { if (f.required) return false; out[f.key] = null; }
                else {
                  const n = Number(raw);
                  if (!validateNumber(raw, f)) { toast(`「${f.label}」超出范围或精度不正确`, 'err'); inputs[f.key].focus(); return false; }
                  out[f.key] = n;
                }
              } else out[f.key] = f.type === 'textarea' ? sanitizeHtml(raw) : raw;
            }
            // 手动 resolve 并保持弹窗由 openModal 的默认流程关闭：
            // 返回非 false 值让 openModal cleanup，并把它 resolve 的值转成 out
            if (onSubmit) {
              try { if (await onSubmit(out) === false) return false; }
              catch(error) { toast(error?.name==='StorageWriteError'?error.message:'未保存：'+error.message, 'err'); return false; }
            }
            pendingValues = out;
            return true;
          },
          value: undefined // 让 cleanup 用 true，随后在外层替换
        }
      ]
    }).then(v => resolve(v ? pendingValues : null));
  });
}

export function confirmBox(msg, okLabel = '确认删除') {
  return openModal({
    title: '请确认',
    body: el('div', { class: 'muted', html: undefined }, msg),
    actions: [
      { label: '取消', value: false },
      { label: okLabel, class: 'btn-danger', value: true },
    ]
  });
}

export function menuModal(title, items) {
  const body = el('div', { class: 'menu-grid' }, items.map(item => el('button', {
    class: 'btn', onclick: () => { closeModal(); item.action(); }
  }, icon(item.icon), item.label)));
  return openModal({ title, body, actions: [{ label: '关闭', value: null }] });
}

// ---------- 常用小组件 ----------
export function emptyState(iconName, text, hint) {
  return el('div', { class: 'empty' },
    el('span', { class: 'em-icon', style: 'color:var(--text-3)' }, iconName ? icon(iconName, 26) : null),
    text,
    hint ? el('div', { class: 'em-hint' }, hint) : null
  );
}

export function viewHead(title, sub, ...actions) {
  return el('div', { class: 'view-head' },
    el('div', {}, el('h1', {}, title), sub ? el('div', { class: 'sub' }, sub) : null),
    actions.length ? el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, actions) : null
  );
}

export function cardTitle(iconName, text, right) {
  return el('div', { class: 'card-title' },
    iconName ? icon(iconName, 17) : null, text,
    right ? el('span', { class: 'right' }, right) : null);
}


// ---------- 外观主题（设置页「外观设置」切换；保存在本机 localStorage，默认翡翠绿） ----------
export function setTheme(id) {
  if (!['light', 'dark'].includes(id)) id = 'light';
  document.documentElement.dataset.theme = id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', id === 'dark' ? '#212121' : '#ffffff');
  try { localStorage.setItem('vcl.personal-workbench.theme', id); } catch {}
}

// ==================== 富文本：字体颜色 + 段落底色 ====================
// 全平台所有多行/内容输入框统一走 richText()；旧纯文本数据照常显示，导出/搜索自动剥标签。

/** 色板：8 色，供字体颜色与段落底色共用 */
export const RICH_COLORS = [
  ['#303030', '深灰'], ['#666666', '中灰'], ['#aaaaaa', '浅灰'], ['#eeeeee', '雾白'],
];

/** HTML → 纯文本（导出 Excel / 搜索 / 月度总结 / 复制 用） */
export function stripHtml(html) {
  const d = document.createElement('template');
  d.innerHTML = String(html || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:div|p|li)>/gi, '\n');
  return (d.content.textContent || '').replace(/ /g, ' ').trim();
}

/** 存储的 HTML 白名单清理：只保留排版标签与颜色样式，防脚本注入 */
export function sanitizeHtml(html) {
  const d = document.createElement('template');
  d.innerHTML = String(html || '');
  const ALLOWED = /^(DIV|P|BR|B|STRONG|I|EM|U|SPAN|BLOCKQUOTE|UL|OL|LI)$/;
  const kill = [];
  d.content.querySelectorAll('script,style,iframe,object,embed,svg,math,template').forEach(n => n.remove());
  d.content.querySelectorAll('*').forEach(n => {
    if (!ALLOWED.test(n.tagName)) { kill.push(n); return; }
    [...n.attributes].forEach(a => {
      if (a.name === 'style') {
        const st = n.style;
        const color = st.color, bg = st.backgroundColor;
        n.removeAttribute('style');
        if (color && /^rgb\((\d+),\s*\1,\s*\1\)$/.test(color)) n.style.color = color;
        if (bg && /^rgb\((\d+),\s*\1,\s*\1\)$/.test(bg)) n.style.backgroundColor = bg;
      } else n.removeAttribute(a.name);
    });
  });
  kill.forEach(n => n.replaceWith(document.createTextNode(n.textContent)));
  return d.innerHTML;
}

/** 显示/入组件前的统一入口：旧纯文本转 <br> 换行；HTML 走白名单清理 */
export function richToHtml(v) {
  if (!v) return '';
  v = String(v);
  if (!v.includes('<')) {
    const esc = v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.replace(/\n/g, '<br>');
  }
  return sanitizeHtml(v).replace(/\n/g, '<br>');
}

/** 光标所在的块级元素（段落底色用） */
function currentBlock(ed) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;
  let node = sel.getRangeAt(0).startContainer;
  if (node.nodeType === 3) node = node.parentNode;
  let block = node;
  while (block && block !== ed && !(block.nodeType === 1 && /^(DIV|P|LI|BLOCKQUOTE|H[1-6])$/.test(block.tagName))) block = block.parentNode;
  return (block && block !== ed) ? block : null;
}

/**
 * 富文本输入组件（字色 + 段色）。
 * 用法：const rt = richText({ placeholder, value, rows, single, onEnter });
 *   - rt.value 读/写 HTML；rt.focus() 聚焦编辑器；rt 可直接 append 到表单。
 *   - 字色：选中文字 → 点色块；段色：光标放段落里点色块 = 整段铺底色，选中文字则只标选中部分。
 */
export function richText({ placeholder = '', value = '', rows = 3, single = false, onEnter = null, onInput = null } = {}) {
  const ed = el('div', { class: 'rich-ed input', dataset: { ph: placeholder }, 'aria-label': placeholder || '正文' });
  ed.contentEditable = 'true';
  ed.setAttribute('role', 'textbox');
  ed.innerHTML = richToHtml(value);
  ed.style.minHeight = Math.max(38, rows * 26 + 12) + 'px';
  if (single) ed.dataset.single = '1';

  const applyFore = (c) => {
    ed.focus();
    document.execCommand('styleWithCSS', false, true);
    if (c) document.execCommand('foreColor', false, c);
    else document.execCommand('removeFormat', false);
  };
  const applyBack = (c) => {
    ed.focus();
    const sel = window.getSelection();
    if (sel.rangeCount && !sel.getRangeAt(0).collapsed) {
      // 有选中文字：只给选中部分铺底色（高亮）
      document.execCommand('styleWithCSS', false, true);
      if (!document.execCommand('hiliteColor', false, c || 'transparent')) {
        document.execCommand('backcolor', false, c || 'transparent');
      }
      return;
    }
    const block = currentBlock(ed);
    if (block) block.style.backgroundColor = c; // 空串即清除
    else if (c) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('hiliteColor', false, c);
    }
  };

  const swatch = (c, name, back) => el('button', {
    class: 'rich-sw' + (back ? ' rich-sw-bd' : ''),
    type: 'button',
    title: back ? `${name}底：光标放段落里点 = 整段铺底；选中文字则只标选中部分` : `${name}：选中文字后点我`,
    style: back ? `border-color:${c}` : `background:${c}`,
    onclick: () => {
      back ? applyBack(c) : applyFore(c);
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });
  const clearBtn = (back) => el('button', {
    class: 'rich-x', type: 'button',
    title: back ? '清除光标所在段落的底色' : '清除选中文字的字色',
    onclick: () => {
      back ? applyBack('') : applyFore('');
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    },
  }, '✕');

  const bar = el('div', { class: 'rich-bar' },
    el('span', { class: 'rich-lab' }, '字色'),
    ...RICH_COLORS.map(([c, n]) => swatch(c, n, false)),
    clearBtn(false),
    el('span', { class: 'rich-sep' }),
    el('span', { class: 'rich-lab' }, '段色'),
    ...RICH_COLORS.map(([c, n]) => swatch(c, n, true)),
    clearBtn(true),
  );

  ed.addEventListener('keydown', (e) => {
    if (single && e.key === 'Enter') { e.preventDefault(); if (onEnter) onEnter(); }
  });
  if (onInput) ed.addEventListener('input', onInput);
  // 粘贴一律按纯文本插入，避免带入外部样式
  ed.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  const wrap = el('div', { class: 'rich-wrap' }, bar, ed);
  Object.defineProperty(wrap, 'value', {
    get: () => ed.innerHTML,
    set: (v) => { ed.innerHTML = richToHtml(v); },
  });
  wrap.focus = () => ed.focus();
  return wrap;
}

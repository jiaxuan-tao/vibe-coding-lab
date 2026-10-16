// ============ 笔记（列表 + 编辑器 两栏） ============
import { el, icon, confirmBox, emptyState, viewHead, fmtDateTime, toast, richText, stripHtml } from '../util.js';
import { store } from '../store.js';

let selectedId = null;
let keyword = '';
const drafts = new Map();
store.onChange(source=>{if(source==='import') drafts.clear();});
window.addEventListener('beforeunload',event=>{
  if(drafts.size) { event.preventDefault(); event.returnValue=''; }
});

export function render(root) {
  const d = store.data;
  const kw = keyword.trim().toLowerCase();
  let list = [...d.notes].sort((a, b) => b.updatedAt - a.updatedAt);
  if (kw) list = list.filter(n => (n.title + stripHtml(n.body) + (n.tags || []).join(',')).toLowerCase().includes(kw));

  if (selectedId && !d.notes.find(n => n.id === selectedId)) selectedId = null;
  if (!selectedId && list.length) selectedId = list[0].id;
  const cur = d.notes.find(n => n.id === selectedId);

  // ---- 左侧列表 ----
  const listEl = el('div', { class: 'card' },
    el('input', {
      class: 'input', placeholder: '搜索标题 / 内容 / 标签…', value: keyword,
      oninput: e => { keyword = e.target.value; const r = root; rerender(r); const inp = r.querySelector('input'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }),
    el('div', { style: 'height:12px' }),
    list.length
      ? el('div', { class: 'note-list' }, list.map(n => el('div', {
        class: 'note-item' + (n.id === selectedId ? ' active' : ''),
        onclick: () => { selectedId = n.id; rerender(root); }
      },
        el('div', { class: 'nt' }, n.title || '（无标题）'),
        el('div', { class: 'np' }, stripHtml(n.body).slice(0, 40) || '无内容'),
        el('div', { style: 'display:flex;gap:5px;margin-top:6px;flex-wrap:wrap' },
          (n.tags || []).map(t => el('span', { class: 'tag gray' }, '#' + t)),
          el('span', { class: 'tiny muted', style: 'margin-left:auto' }, fmtDateTime(n.updatedAt).slice(5))))))
      : emptyState('note', kw ? '没有匹配的笔记' : '还没有笔记', kw ? '' : '点右上角「+ 新建笔记」开始记录')
  );

  // ---- 右侧编辑器 ----
  let editor;
  if (!cur) {
    editor = el('div', { class: 'card' }, emptyState('edit', '选择左侧一篇笔记，或新建一篇', ''));
  } else {
    const draft=drafts.get(cur.id);
    const titleInp = el('input', { class: 'input', maxlength:'1000', style: 'font-weight:600;font-size:16px', placeholder: '标题', value: draft?.title??cur.title });
    const tagsInp = el('input', { class: 'input', maxlength:'1000', placeholder: '标签，用逗号分隔（如：工作, 想法）', value: draft?.tags??(cur.tags || []).join(', ') });
    const remember=()=>drafts.set(cur.id,{title:titleInp.value,body:bodyInp.value,tags:tagsInp.value});
    const bodyInp = richText({ placeholder: '正文…', value: draft?.body??cur.body, rows: 14, onInput:remember });
    titleInp.addEventListener('input',remember);
    tagsInp.addEventListener('input',remember);
    editor = el('div', { class: 'card' },
      el('div', { class: 'field' }, el('label', {}, '标题'), titleInp),
      el('div', { class: 'field' }, el('label', {}, '标签'), tagsInp),
      el('div', { class: 'field' }, el('label', {}, '正文'), bodyInp),
      el('div', { style: 'display:flex;gap:10px;justify-content:flex-end' },
        el('button', {
          class: 'btn btn-danger',
          onclick: async () => {
            if (await confirmBox(`删除笔记「${cur.title || '无标题'}」？`)) {
              store.update(dd => { dd.notes = dd.notes.filter(n => n.id !== cur.id); });
              drafts.delete(cur.id);
              selectedId = null; toast('已删除', 'ok');
            }
          }
        }, icon('trash', 15), '删除'),
        el('button', {
          class: 'btn btn-primary',
          onclick: () => {
            const tags = tagsInp.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
            store.update(dd => {
              const n = dd.notes.find(x => x.id === cur.id);
              Object.assign(n, { title: titleInp.value.trim(), body: bodyInp.value, tags, updatedAt: Date.now() });
            });
            drafts.delete(cur.id);
            toast('笔记已保存', 'ok');
          }
        }, '保存笔记'),
      )
    );
  }

  root.append(
    viewHead('笔记', '标题 + 正文 + 标签，支持搜索',
      el('button', {
        class: 'btn btn-primary',
        onclick: () => {
          const id = 'n' + Math.random().toString(36).slice(2, 9);
          const previous=selectedId;
          selectedId = id;
          try { store.update(dd => dd.notes.unshift({ id, title: '', body: '', tags: [], updatedAt: Date.now() })); }
          catch(error) { selectedId=previous;throw error; }
        }
      }, '+ 新建笔记')),
    el('div', { class: 'notes-layout' }, listEl, editor)
  );
}

function rerender(root) { root.innerHTML = ''; render(root); }

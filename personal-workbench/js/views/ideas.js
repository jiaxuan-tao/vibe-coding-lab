// ============ 灵感库（一句话快速记录，卡片流） ============
import { el, icon, confirmBox, emptyState, viewHead, fmtDateTime, toast, richText, stripHtml, richToHtml } from '../util.js';
import { store } from '../store.js';

export function render(root) {
  const d = store.data;
  const tagInp = el('input', { class: 'input', style: 'max-width:220px', placeholder: '标签（可选，逗号分隔）' });
  let textInp;
  const submit = () => {
    const text = stripHtml(textInp.value);
    if (!text) { toast('先写点什么吧', 'err'); textInp.focus(); return; }
    if (text.length > 200) { toast('灵感太长，控制在 200 字以内', 'err'); return; }
    const tags = tagInp.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    store.update(dd => dd.inspirations.unshift({ id: 'i' + Math.random().toString(36).slice(2, 9), text: textInp.value.trim(), tags, createdAt: Date.now() }));
    toast('灵感已收藏 ✨', 'ok');
    textInp.value = '';
  };
  textInp = richText({ placeholder: '一句话灵感，想到就记…（选中文字可变色，回车保存）', single: true, rows: 1, onEnter: submit });

  const list = [...d.inspirations].sort((a, b) => b.createdAt - a.createdAt);

  root.append(
    viewHead('灵感库', '一闪而过的想法，立刻抓住'),
    el('div', { class: 'card idea-input-card' },
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        el('div', { class: 'grow', style: 'min-width:200px' }, textInp),
        tagInp,
        el('button', { class: 'btn btn-green', onclick: submit }, icon('bulb', 15), '记下来'))),
    list.length
      ? el('div', { class: 'idea-grid' }, list.map(idea => el('div', { class: 'idea-card' },
        el('div', { class: 'tx', html: richToHtml(idea.text) }),
        el('div', { class: 'meta' },
          (idea.tags || []).map(t => el('span', { class: 'tag green' }, '#' + t)),
          el('span', { class: 'num', style: 'margin-left:auto' }, fmtDateTime(idea.createdAt)),
          el('button', {
            class: 'icon-btn danger', title: '删除',
            onclick: async () => { if (await confirmBox('删除这条灵感？')) store.update(dd => { dd.inspirations = dd.inspirations.filter(x => x.id !== idea.id); }); }
          }, icon('trash', 14))))))
      : emptyState('bulb', '灵感库还是空的', '在上方输入框写下第一条灵感，回车即可保存')
  );
}

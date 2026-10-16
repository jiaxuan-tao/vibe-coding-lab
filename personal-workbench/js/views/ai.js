// ============ AI 助手入口 + 提示词收藏夹 ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, toast, stripHtml, richToHtml } from '../util.js';
import { store } from '../store.js';

const AIS = [
  { name: 'Kimi', url: 'https://kimi.com', desc: '长文本与搜索问答', bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', letter: 'K' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', desc: '推理与代码能力强', bg: 'linear-gradient(135deg,#0ea5e9,#22d3ee)', letter: 'D' },
  { name: '豆包', url: 'https://www.doubao.com', desc: '字节跳动 AI 助手', bg: 'linear-gradient(135deg,#10b981,#34d399)', letter: '豆' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', desc: 'OpenAI 旗舰助手', bg: 'linear-gradient(135deg,#059669,#10b981)', letter: 'G' },
];

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('已复制到剪贴板', 'ok'); }
  catch {
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }, text);
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板', 'ok'); }
    catch { toast('复制失败，请手动复制', 'err'); }
    ta.remove();
  }
}

function promptModal(edit) {
  formModal(edit ? '编辑提示词' : '收藏提示词', [
    { key: 'title', label: '标题', required: true, placeholder: '例如：周报生成器' },
    { key: 'content', label: '提示词内容', type: 'textarea', rows: 6, required: true, placeholder: '粘贴你常用的提示词…' },
  ], edit, '保存', v => {
    if (!v) return;
    store.update(d => {
      if (edit) Object.assign(d.prompts.find(p => p.id === edit.id), v);
      else d.prompts.unshift({ id: 'p' + Math.random().toString(36).slice(2, 9), ...v });
    });
    toast('已保存', 'ok');
  });
}

export function render(root) {
  const d = store.data;
  root.append(
    viewHead('AI 工具', '常用工具 · 提示词收藏',
      el('button', { class: 'btn btn-primary', onclick: () => promptModal() }, '+ 收藏提示词')),

    el('div', { class: 'ai-grid' }, AIS.map(a => el('a', { class: 'ai-card', href: a.url, target: '_blank', rel: 'noopener' },
      el('span', { class: 'logo', style: `background:${a.bg};color:#fff` }, a.letter),
      el('div', {},
        el('div', { class: 'nm' }, a.name, ' ', el('span', { class: 'tiny muted' }, '↗')),
        el('div', { class: 'ds' }, a.desc))))),

    el('div', { class: 'card' },
      cardTitle('ai', '提示词收藏夹', el('span', { class: 'tiny muted' }, `${d.prompts.length} 条`)),
      d.prompts.length
        ? el('div', {}, d.prompts.map(p => el('div', { class: 'prompt-item' },
          el('div', { class: 'grow', style: 'min-width:0' },
            el('div', { class: 'pt' }, p.title),
            el('div', { class: 'pp', title: stripHtml(p.content), html: richToHtml(p.content) })),
          el('button', { class: 'btn btn-sm', onclick: () => copyText(stripHtml(p.content)) }, icon('copy', 14), '复制'),
          el('button', { class: 'icon-btn', title: '编辑', onclick: () => promptModal(p) }, icon('edit', 15)),
          el('button', {
            class: 'icon-btn danger', title: '删除',
            onclick: async () => { if (await confirmBox(`删除提示词「${p.title}」？`)) store.update(dd => { dd.prompts = dd.prompts.filter(x => x.id !== p.id); }); }
          }, icon('trash', 15)))))
        : emptyState('copy', '还没有收藏提示词', '把好用的提示词存进来，用的时候一键复制'))
  );
}

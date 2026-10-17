import { extraZh } from './i18n-extra';

export type Locale = 'zh-CN' | 'en';
export const LOCALE_KEY = 'vcl.text-compare.locale.v1';
const listeners = new Set<() => void>();
function storedLocale(): Locale {
  try { return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'zh-CN'; }
  catch { return 'zh-CN'; }
}
let locale: Locale = typeof window === 'undefined' ? 'en' : storedLocale();

const zh: Record<string, string> = {
  ...extraZh,
  'Text Compare': '文本对比台',
  'Text Compare home': '文本对比台首页',
  'Comparison tools': '对比工具',
  'Layout': '对比视图',
  'Side by side': '左右对比',
  'Unified': '统一视图',
  'Data': '结构对比',
  'Compare JSON, CSV or TSV by structure': '按结构对比 JSON、CSV 或 TSV',
  'Syntax highlighting': '语法高亮',
  'Language': '代码语言',
  'Interface language': '界面语言',
  'Options': '对比设置',
  'What counts as a difference': '差异判定',
  'Ignore upper/lower case': '忽略大小写',
  'Ignore blank lines': '忽略空行',
  'Compare all whitespace': '比较所有空白字符',
  'Ignore spaces at line ends': '忽略行尾空白',
  'Ignore all whitespace': '忽略所有空白字符',
  'Ignore text that matches': '忽略匹配内容',
  'Your own patterns, one regular expression per line': '自定义正则表达式，每行一条',
  'e.g. build-\\d+': '例如 build-\\d+',
  'Highlight changes by': '差异高亮粒度',
  'Whole words': '按词',
  'Single characters': '按字符',
  'Show moved blocks': '标记移动的段落',
  'Display': '显示',
  'Document mode, for prose': '文档模式',
  'Hide unchanged lines': '折叠相同行',
  'Wrap long lines': '自动换行',
  'Merge arrows copy right to left': '合并方向：修改稿 → 原文',
  'Privacy': '隐私',
  'Keep a history of my comparisons': '保留对比历史',
  'Reopen my last text on this device': '在此设备恢复上次文本',
  'Changes': '差异导航',
  'Previous change (Shift+F7)': '上一处差异（Shift+F7）',
  'Next change (F7)': '下一处差异（F7）',
  'Previous change': '上一处差异',
  'Next change': '下一处差异',
  'Library': '对比记录',
  'Saved comparisons and history': '已保存的对比与历史记录',
  'Save': '保存',
  'Save this comparison (Ctrl+S)': '保存当前对比（Ctrl+S）',
  'Tools': '文本工具',
  'Swap sides': '交换左右内容',
  'Format JSON and sort keys': '格式化 JSON 并排序键名',
  'Remove spaces at line ends': '移除行尾空白',
  'Sort lines on both sides': '两侧按行排序',
  'Clear both sides': '清空两侧',
  'Export': '导出',
  'Download report (HTML)': '下载对比报告（HTML）',
  'Print or save report as PDF': '打印 / 保存为 PDF',
  'Copy diff': '复制差异',
  'Download .patch': '下载 .patch 补丁',
  'Download original': '下载原文',
  'Download changed': '下载修改稿',
  'Copy link': '分享',
  'Theme': '外观',
  'Help': '帮助',
  'Shortcuts and about (?)': '帮助与快捷键（?）',
  'Original': '原文',
  'Changed': '修改稿',
  'Original name': '原文名称',
  'Changed name': '修改稿名称',
  'Open file': '导入',
  'Paste': '粘贴',
  'Clear': '清空',
  'Structured comparison': '结构化内容对比',
  'Image comparison': '图片对比',
  'Image view': '图片视图',
  'Slider': '滑动对比',
  'Overlay': '叠加',
  'Difference': '差异图',
  'Changed image': '修改后图片',
  'Back to text': '返回文本',
  'Change map': '差异分布',
  'Drop to open as original': '作为原文打开',
  'Drop to open as changed': '作为修改稿打开',
  'Source code': '查看源码',
  'Vibe Coding Lab': '轻量项目实验室',
  'Close': '关闭',
  'Done': '完成',
  'Copy this': '手动复制',
  'Your browser blocked automatic copying. Select the text below and copy it.': '浏览器未允许自动复制，请选中下方内容手动复制。',
  'Keyboard': '快捷键',
  'Tips': '使用提示',
  'Find and replace in a side': '在当前编辑区查找和替换',
  'Undo an edit or merge': '撤销编辑或合并',
  'Save the comparison to your library': '保存到对比记录',
  'Show this help': '打开帮助',
  'Compare two texts and see exactly what changed. The comparison runs in your browser, and this site has no ads.': '对比两份内容中的增删与修改，所有计算在当前浏览器中完成。',
  'Text you paste and files you open (Word, Excel, PDF, images) are read in your browser. Comparing never sends them anywhere.': '粘贴的文字与导入的 Word、Excel、PDF 和图片均在浏览器本地读取，不上传内容。',
  'History and saves stay in this browser. You can turn history off above, under Options.': '历史记录和保存内容仅存在当前浏览器，可在对比设置中关闭历史记录。',
  'Copy link puts the text inside the link itself, in the part after the #, which is never sent to a server.': '分享链接的 # 后包含完整对比内容，并非加密；拿到链接的人可以读取，请勿分享敏感信息。',
  'There are no accounts, no analytics and no tracking.': '无需账号，不接入统计或追踪。',
  'Drop two files at once to compare them straight away. Word, Excel, PDF and image files work too.': '可同时拖入两个文件开始对比，支持 Word、Excel、PDF 和图片。',
  'Blocks that moved are shown in violet with a tag that jumps to where they went.': '移动的段落会单独标记，可点击标记跳转到对应位置。',
  "The Data tab compares JSON and CSV by structure, so reordered keys or rows don't count as changes.": '结构对比适用于 JSON 和 CSV，可识别键名排序等结构变化。',
  'Export a report to send someone, or print it as a PDF redline.': '可导出 HTML 报告，或通过打印保存为 PDF。',
  'Both sides are editable. Use the arrows between them to copy a block across.': '两侧都可以编辑，使用中间的箭头合并指定差异。',
  'Options can ignore case, whitespace and blank lines.': '可设置忽略大小写、空白字符和空行。',
  'Save a comparison with': '保存对比：',
  'and find it later in the Library, along with your recent history.': '，之后可在对比记录中查看保存内容与最近历史。',
  'Share comparison': '分享当前对比',
  'This link contains the full text and filenames, not encrypted. Anyone with it can read them. Do not share confidential content.': '链接包含完整原文、修改稿和文件名，并未加密。任何拿到链接的人都能读取，请勿分享机密或个人敏感内容。',
  'Cancel': '取消',
  'Copy share link': '复制分享链接',
  'No changes': '无差异',
  '{current} of {count}': '第 {current} / {count} 处',
  '{count} changes': '{count} 处差异',
  'No comparison yet': '尚无对比内容',
  'Comparing images': '图片对比',
  'with your ignore options': '已应用忽略规则',
  'The two sides are identical': '两侧内容相同',
  'Lines only in the changed text': '修改稿新增的行',
  'Lines only in the original text': '原文中删除的行',
  '{count} blocks changed': '{count} 处修改',
  'Blocks that were moved, not rewritten': '移动但未重写的段落',
  '{count} moved': '{count} 处移动',
  '{value} of lines are unchanged': '{value} 的行保持不变',
  '{value} the same': '相似度 {value}',
  '{count} lines': '{count} 行',
  "Not a valid pattern, so it's skipped: {errors}": '以下正则无效，已跳过：{errors}',
  'Side by side needs a wider screen.': '当前屏幕使用统一视图，左右对比需要更宽的屏幕。',
  'Auto-detect': '自动识别',
  'Plain text': '纯文本',
  'Common': '常用语言',
  'All languages': '所有语言',
  'Auto ({language})': '自动（{language}）',
  'Your text will be kept in this browser until you turn this off.': '已开启文本恢复。关闭此选项即可移除当前浏览器保存的草稿。',
  'Saved text removed from this browser.': '已移除当前浏览器中的恢复草稿。',
  "That's a large text, so comparing may take a moment.": '文本较大，对比可能需要一些时间。',
  'Add some text first.': '请先添加对比内容。',
  'Sides swapped': '已交换两侧内容',
  "The {sides} text isn't valid JSON, so nothing was formatted.": '{sides}不是有效的 JSON，未修改任何内容。',
  'original': '原文',
  'changed': '修改稿',
  ' and ': '和',
  'JSON formatted with sorted keys': '已格式化 JSON 并排序键名',
  'Removed spaces at line ends': '已移除行尾空白',
  'Sorted lines on both sides': '已对两侧按行排序',
  'Nothing to copy: the two sides are identical.': '两侧内容相同，没有可复制的差异。',
  'Diff copied': '已复制差异',
  'Nothing to download: the two sides are identical.': '两侧内容相同，没有可下载的差异。',
  "Images can't go in a link. Links carry text only.": '分享链接仅支持文本，不包含图片。',
  'Add some text first, then copy a link to it.': '请先添加内容，再生成分享链接。',
  'This text is too large to fit in a link. Download a report or .patch instead.': '内容过大，无法生成分享链接，请导出报告或 .patch 补丁。',
  'Link copied ({size} KB). Some apps cut off links this long.': '已复制链接（{size} KB），部分应用可能截断过长链接。',
  'Link copied. The text travels inside the link; nothing is stored on a server.': '已复制链接，内容包含在链接中，未存储到服务器。',
  'Reading {name}…': '正在读取 {name}…',
  "That image couldn't be opened.": '无法打开这张图片。',
  'Document mode is on, so paragraphs wrap and changes show by word.': '已开启文档模式，段落自动换行并按词显示差异。',
  'Your browser blocked reading the clipboard. Click in the side and press Ctrl+V instead.': '浏览器未允许读取剪贴板，请在编辑区使用粘贴快捷键。',
  'Only the first two files were opened.': '仅打开前两个文件。',
  'Theme: follows your system': '外观：跟随系统',
  'Theme: light': '外观：浅色',
  'Theme: dark': '外观：深色',
  'Following your system theme': '外观已跟随系统',
  'Light theme': '浅色外观',
  'Dark theme': '深色外观',
  'Opened the shared comparison': '已打开分享的对比',
  'Untitled comparison': '未命名对比',
  "This link is damaged or was made by a newer version, so it couldn't be opened.": '链接已损坏或来自不兼容的版本，无法打开。',
  '{name} could not be opened.': '无法打开 {name}。',
  'Dates & times': '日期与时间',
  'Dates and times': '日期与时间',
  'GUIDs / UUIDs': 'GUID / UUID',
  'Hex values': '十六进制值',
  'Hex values like 0x1F': '十六进制值（如 0x1F）',
  'Numbers': '数字',
  'All numbers': '所有数字',
  'Made by': '原作者',
};

export function getLocale(): Locale { return locale; }
export function t(message: string, values: Record<string, string | number> = {}): string {
  const translated = locale === 'zh-CN' ? (zh[message] ?? message) : message;
  return translated.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
export function setLocale(next: Locale): void {
  if (next !== 'zh-CN' && next !== 'en') return;
  if (next === locale) return;
  locale = next;
  try { localStorage.setItem(LOCALE_KEY, next); } catch { /* usable without storage */ }
  for (const listener of listeners) listener();
}
export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Capture only the initial static shell, before any user document is rendered. */
export function localizeStatic(root: HTMLElement): () => void {
  const nodes: { node: Text; source: string }[] = [];
  const attrs: { node: Element; attr: string; source: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('script, style, textarea, [data-no-translate]')) continue;
    if (node.textContent?.trim()) nodes.push({ node, source: node.textContent });
  }
  for (const node of [root, ...root.querySelectorAll('*')]) {
    for (const attr of ['title', 'aria-label', 'placeholder']) {
      if (node.hasAttribute(attr)) attrs.push({ node, attr, source: node.getAttribute(attr)! });
    }
  }
  const apply = () => {
    document.documentElement.lang = locale;
    document.title = t('Text Compare');
    for (const { node, source } of nodes) {
      if (node.isConnected) node.textContent = source.replace(/\S[\s\S]*\S|\S/, (text) => t(text.replace(/\s+/g, ' ')));
    }
    for (const { node, attr, source } of attrs) if (node.isConnected) node.setAttribute(attr, t(source));
  };
  apply();
  onLocaleChange(apply);
  return apply;
}

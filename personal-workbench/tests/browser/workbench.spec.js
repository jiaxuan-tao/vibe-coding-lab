import { test as base, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DATA_KEY = 'vcl.personal-workbench.data.v1';
const THEME_KEY = 'vcl.personal-workbench.theme';
const DAY = '2026-10-16';
const MONTH = '2026-10';
const ROUTES = [
  ['dashboard', '首页', /好/],
  ['todos', '待办日程', '待办 · 日程'],
  ['work', '工作情况', '工作情况'],
  ['notes', '笔记', '笔记'],
  ['ideas', '灵感库', '灵感库'],
  ['ai', 'AI 工具', 'AI 工具'],
  ['ledger', '记账理财', '记账理财'],
  ['learning', '学习管理', '学习管理'],
  ['info', '信息面板', '信息面板'],
  ['stocks', '股票记录', '股票记录'],
  ['settings', '设置', '设置'],
];
const WEATHER = {
  current: { temperature_2m: 23, relative_humidity_2m: 60, weather_code: 0, wind_speed_10m: 7 },
  daily: {
    time: [DAY, '2026-10-17', '2026-10-18'], weather_code: [0, 2, 3],
    temperature_2m_min: [16, 17, 18], temperature_2m_max: [25, 26, 24],
  },
};
const NEWS = { data: [
  { title: '虚构测试新闻：公共图书馆开放', link: 'https://example.com/library' },
  { title: '不安全新闻链接', link: 'javascript:alert(1)' },
] };

// Every test gets a fresh browser context and deterministic public data. Unknown
// external traffic is blocked AND reported, not silently treated as success.
const test = base.extend({
  networkGuard: [async ({ context, baseURL }, use) => {
    const appOrigin = new URL(baseURL).origin;
    const forbidden = [];
    const pageErrors = [];
    context.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
    context.on('request', request => {
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return;
      const sameOrigin = url.origin === appOrigin;
      if (url.hostname === 'api.github.com' || (!sameOrigin && request.resourceType() === 'script')
        || url.hostname === 'qt.gtimg.cn') forbidden.push(request.url());
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === appOrigin) return route.continue();
      if (url.hostname === 'api.open-meteo.com') return route.fulfill({ json: WEATHER });
      if (url.hostname === '60s.viki.moe') return route.fulfill({ json: NEWS });
      forbidden.push(route.request().url());
      return route.abort('blockedbyclient');
    });
    await use({ forbidden, pageErrors });
    expect(forbidden, 'No GitHub API, remote scripts, quotes, cloud or inference requests').toEqual([]);
    expect(pageErrors, 'No uncaught browser errors, including every visited route').toEqual([]);
  }, { auto: true }],
});

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${DAY}T12:00:00+08:00`));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await expect(page.locator('#view h1')).toBeVisible();
});

async function go(page, id) {
  await page.evaluate(route => { location.hash = `#/${route}`; }, id);
  await expect(page).toHaveURL(new RegExp(`#/${id}$`));
  const heading = ROUTES.find(route => route[0] === id)[2];
  await expect(page.locator('#view').getByRole('heading', { level: 1, name: heading })).toBeVisible();
}

async function rawData(page) {
  return page.evaluate(key => localStorage.getItem(key), DATA_KEY);
}

async function data(page) {
  return page.evaluate(async () => (await import('./js/store.js')).store.data);
}

async function saveDialog(page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function confirmDelete(page) {
  await page.getByRole('dialog', { name: '请确认' }).getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function addTodo(page, title) {
  await page.getByRole('button', { name: '+ 新建待办', exact: true }).click();
  await page.getByRole('dialog').getByLabel('事项', { exact: true }).fill(title);
  await saveDialog(page);
  await expect(page.locator('.todo-item').filter({ hasText: title })).toBeVisible();
}

async function backup(page, overrides = {}) {
  return page.evaluate(async overrides => {
    const { createEmptyData, parseBackup } = await import('./js/data.js');
    const text = JSON.stringify({ format: 'vibe-personal-workbench', version: 1,
      data: { ...createEmptyData(), ...overrides } });
    parseBackup(text);
    return text;
  }, overrides);
}

async function uploadBackup(page, content) {
  await go(page, 'settings');
  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'fictitious-workbench-backup.json', mimeType: 'application/json', buffer: Buffer.from(content),
  });
}

async function restore(page, content) {
  await uploadBackup(page, content);
  const dialog = page.getByRole('dialog', { name: '请确认' });
  await expect(dialog).toContainText('替换本机现有内容');
  await dialog.getByRole('button', { name: '替换并恢复' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#toast-root')).toContainText('备份已恢复');
}

function sampleCollections(prefix = '虚构样本') {
  return {
    todos: [{ id: 'test-todo', title: `${prefix}：整理读书清单`, done: false, priority: 'high', date: DAY, createdAt: 1 }],
    events: [{ id: 'test-event', title: `${prefix}：阅读交流`, date: DAY, note: '仅用于演示' }],
    notes: [{ id: 'test-note', title: `${prefix}笔记`, body: '<p>测试正文</p>', tags: ['演示'], updatedAt: 1 }],
    inspirations: [{ id: 'test-idea', text: `${prefix}灵感`, tags: ['演示'], createdAt: 1 }],
    prompts: [{ id: 'test-prompt', title: `${prefix}提示词`, content: '整理以下虚构信息' }],
    ledger: [{ id: 'test-ledger', type: 'out', amount: 12.5, category: '书籍', note: `${prefix}账目`, date: DAY }],
    learning: { plans: [{ id: 'test-plan', name: `${prefix}学习`, goal: '读完一章', progress: 30 }], checkins: [DAY] },
    work: {
      plans: [{ id: 'test-workplan', month: MONTH, title: `${prefix}月计划`, note: '', done: false, createdAt: 1 }],
      logs: [{ id: 'test-log', date: DAY, focus: `${prefix}工作记录`, install: '完成测试', civil: '', sub: '', other: '', content: '', createdAt: 1, updatedAt: 1 }],
      focus: { [MONTH]: `${prefix}月重点` },
    },
    stocks: {
      trades: [{ id: 'test-trade', code: 'sh600000', side: 'buy', price: 10, qty: 100, date: DAY, note: '虚构交易，不构成建议', createdAt: 1 }],
      watchlist: [{ code: 'sh600000' }],
      notes: [{ id: 'test-stocknote', code: 'sh600000', title: `${prefix}研究`, body: '虚构记录', updatedAt: 1 }],
    },
    settings: { displayName: '演示用户', weatherCity: 'shanghai', quotesEnabled: false },
  };
}

for (const [id, label, heading] of ROUTES) {
  test(`navigation: ${id} renders without page errors and survives reload`, async ({ page }) => {
    await page.locator('#nav').getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
    await expect(page.locator('#view').getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator(`#nav [data-id="${id}"]`)).toHaveAttribute('aria-current', 'page');
    await page.reload();
    await expect(page.locator('#view').getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
}

test('tasks: add, edit, complete, cancel deletion and delete persistently', async ({ page }) => {
  await go(page, 'todos');
  await addTodo(page, '虚构待办初稿');
  let row = page.locator('.todo-item').filter({ hasText: '虚构待办初稿' });
  await row.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('dialog').getByLabel('事项', { exact: true }).fill('虚构待办修订');
  await page.getByRole('dialog').getByLabel('优先级', { exact: true }).selectOption('high');
  await saveDialog(page);
  row = page.locator('.todo-item').filter({ hasText: '虚构待办修订' });
  await row.getByRole('button', { name: '完成', exact: true }).click();
  await expect(row).toHaveClass(/done/);
  await page.reload();
  await expect(row).toHaveClass(/done/);
  expect((await data(page)).todos[0]).toMatchObject({ title: '虚构待办修订', done: true, priority: 'high', date: DAY });
  await row.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '删除', exact: true }).click();
  await confirmDelete(page);
  await page.reload();
  await expect(row).toHaveCount(0);
  expect((await data(page)).todos).toEqual([]);
});

test('events: add and delete through confirmation', async ({ page }) => {
  await go(page, 'todos');
  await page.getByRole('button', { name: '+ 新建日程', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('日期', { exact: true }).fill(DAY);
  await dialog.getByLabel('事项', { exact: true }).fill('虚构读书活动');
  await dialog.getByLabel('备注', { exact: true }).fill('演示备注');
  await saveDialog(page);
  await page.reload();
  const row = page.locator('.todo-item').filter({ hasText: '虚构读书活动' });
  await expect(row).toContainText('演示备注');
  expect((await data(page)).events).toHaveLength(1);
  await row.getByRole('button', { name: '删除', exact: true }).click();
  await confirmDelete(page);
  await page.reload();
  await expect(row).toHaveCount(0);
  expect((await data(page)).events).toEqual([]);
});

async function writeNote(page, title, body, tags) {
  await page.getByPlaceholder('标题', { exact: true }).fill(title);
  await page.getByPlaceholder('标签，用逗号分隔（如：工作, 想法）').fill(tags);
  await page.getByRole('textbox', { name: /^正文/ }).fill(body);
  await page.getByRole('button', { name: '保存笔记', exact: true }).click();
  await expect(page.locator('.note-item').filter({ hasText: title })).toBeVisible();
}

test('notes: new, explicit save, body/tag search and reload persistence', async ({ page }) => {
  await go(page, 'notes');
  await page.getByRole('button', { name: '+ 新建笔记', exact: true }).click();
  await writeNote(page, '虚构阅读笔记', '独特正文关键词：月光书架', '学习, 回归标签');
  await page.reload();
  await expect(page.getByPlaceholder('标题', { exact: true })).toHaveValue('虚构阅读笔记');
  await expect(page.getByRole('textbox', { name: /^正文/ })).toContainText('月光书架');
  const search = page.getByPlaceholder('搜索标题 / 内容 / 标签…');
  for (const keyword of ['虚构阅读', '月光书架', '回归标签']) {
    await search.fill(keyword);
    await expect(page.locator('.note-item')).toHaveCount(1);
  }
  await search.fill('不存在的检索词');
  await expect(page.locator('.note-item')).toHaveCount(0);
  await expect(page.locator('#view')).toContainText('没有匹配的笔记');
  await search.fill('');
  expect((await data(page)).notes[0]).toMatchObject({ title: '虚构阅读笔记', tags: ['学习', '回归标签'] });
});

test('notes: second new note selects a blank editor without overwriting the first', async ({ page }) => {
  await go(page, 'notes');
  await page.getByRole('button', { name: '+ 新建笔记', exact: true }).click();
  await writeNote(page, '第一篇虚构笔记', '第一篇正文', '第一篇');
  await page.getByRole('button', { name: '+ 新建笔记', exact: true }).click();
  await expect(page.getByPlaceholder('标题', { exact: true }), 'New note must be selected before editing').toHaveValue('');
  await expect(page.getByRole('textbox', { name: /^正文/ })).toBeEmpty();
  await writeNote(page, '第二篇虚构笔记', '第二篇正文', '第二篇');
  await page.reload();
  const notes = (await data(page)).notes;
  expect(notes).toHaveLength(2);
  expect(notes.map(note => note.title).sort()).toEqual(['第一篇虚构笔记', '第二篇虚构笔记'].sort());
  expect(notes.find(note => note.title === '第一篇虚构笔记').body).toContain('第一篇正文');
});

test('inspiration: add rich-text idea and tags persist locally', async ({ page }) => {
  await go(page, 'ideas');
  await page.getByRole('textbox', { name: /^一句话灵感/ }).fill('虚构灵感：为阅读建立索引');
  await page.getByPlaceholder('标签（可选，逗号分隔）').fill('阅读, 灵感');
  await page.getByRole('button', { name: '记下来', exact: true }).click();
  await page.reload();
  await expect(page.locator('.idea-card')).toContainText('虚构灵感：为阅读建立索引');
  expect((await data(page)).inspirations[0].tags).toEqual(['阅读', '灵感']);
});

test('prompts: add a reusable prompt without calling any AI service', async ({ page }) => {
  await go(page, 'ai');
  await page.getByRole('button', { name: '+ 收藏提示词', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('标题', { exact: true }).fill('虚构阅读整理模板');
  await dialog.getByRole('textbox', { name: '提示词内容', exact: true }).fill('请将以下虚构阅读记录整理为清单。');
  await saveDialog(page);
  await page.reload();
  await expect(page.locator('.prompt-item')).toContainText('虚构阅读整理模板');
  expect((await data(page)).prompts[0].content).toContain('虚构阅读记录');
});

test('learning: plan, bounded progress and one check-in per day persist', async ({ page }) => {
  await go(page, 'learning');
  await page.getByRole('button', { name: '+ 新建计划', exact: true }).click();
  await page.getByRole('dialog').getByLabel('计划名称', { exact: true }).fill('虚构学习计划');
  await page.getByRole('dialog').getByLabel('目标描述', { exact: true }).fill('阅读测试章节');
  await saveDialog(page);
  await page.getByRole('button', { name: '-10%', exact: true }).click();
  expect((await data(page)).learning.plans[0].progress).toBe(0);
  for (let index = 0; index < 11; index++) await page.getByRole('button', { name: '+10% 进度', exact: true }).click();
  await expect(page.locator('.plan-item')).toContainText('100%');
  await page.getByRole('button', { name: '今日打卡', exact: true }).click();
  await expect(page.getByRole('button', { name: '今天已打卡', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: '今天已打卡', exact: true })).toBeDisabled();
  expect((await data(page)).learning).toMatchObject({ plans: [{ name: '虚构学习计划', progress: 100 }], checkins: [DAY] });
});

for (const [name, value] of [['blank', ''], ['negative', '-1'], ['zero', '0'], ['fractional cent', '1.001'], ['too large', '1000000000001'], ['infinite exponent', '1e309']]) {
  test(`ledger: rejects ${name} amount without writing a record`, async ({ page }) => {
    await go(page, 'ledger');
    const before = await rawData(page);
    await page.getByRole('button', { name: '+ 记一笔', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('金额（元）', { exact: true }).fill(value);
    await dialog.getByLabel('类别（支出常用：餐饮/交通/购物…）', { exact: true }).fill('测试书籍');
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.locator('#toast-root .err')).toBeVisible();
    expect((await data(page)).ledger).toEqual([]);
    expect(await rawData(page)).toBe(before);
  });
}

test('ledger: valid decimal amount produces an exact numeric entry and summary', async ({ page }) => {
  await go(page, 'ledger');
  await page.getByRole('button', { name: '+ 记一笔', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('金额（元）', { exact: true }).fill('12.34');
  await dialog.getByLabel('类别（支出常用：餐饮/交通/购物…）', { exact: true }).fill('测试书籍');
  await dialog.getByLabel('备注', { exact: true }).fill('虚构购书记录');
  await saveDialog(page);
  await page.reload();
  await expect(page.locator('tbody tr')).toContainText('12.34');
  await expect(page.locator('.stat-card').filter({ hasText: '本月支出' })).toContainText('12.34');
  expect((await data(page)).ledger[0]).toMatchObject({ amount: 12.34, type: 'out', category: '测试书籍', date: DAY });
});

test('work: monthly focus and plan completion persist in the selected month', async ({ page }) => {
  await go(page, 'work');
  await page.getByRole('textbox', { name: '这个月最重要的工作是什么？', exact: true }).fill('虚构月重点：完成阅读索引');
  await page.getByRole('button', { name: '保存重点工作', exact: true }).click();
  await page.getByRole('button', { name: '+ 新建计划', exact: true }).click();
  await page.getByRole('dialog').getByLabel('计划内容', { exact: true }).fill('虚构十月计划');
  await page.getByRole('dialog').getByRole('textbox', { name: '备注', exact: true }).fill('演示拆解');
  await saveDialog(page);
  const row = page.locator('.work-row').filter({ hasText: '虚构十月计划' });
  await row.getByRole('button', { name: '标记为完成', exact: true }).click();
  await expect(row).toHaveClass(/is-done/);
  await page.getByRole('button', { name: '›', exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: '回本月', exact: true }).click();
  await page.reload();
  await expect(row).toHaveClass(/is-done/);
  const work = (await data(page)).work;
  expect(work.plans[0]).toMatchObject({ month: MONTH, title: '虚构十月计划', done: true });
  expect(work.focus[MONTH]).toContain('完成阅读索引');
});

test('worklogs: today manual save, update and search survive reload', async ({ page }) => {
  await go(page, 'work');
  await page.getByRole('button', { name: '日工作完成情况', exact: true }).click();
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构今日重点');
  await page.getByRole('textbox', { name: '项目推进…', exact: true }).fill('虚构完成阅读索引');
  await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
  await expect(page.locator('.work-list')).toContainText('虚构完成阅读索引');
  await page.getByRole('textbox', { name: '项目推进…', exact: true }).fill('虚构索引修订版本');
  await page.getByRole('button', { name: '更新今天的记录', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '日工作完成情况', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '项目推进…', exact: true })).toContainText('虚构索引修订版本');
  const search = page.getByPlaceholder('查找往日记录：输入关键词或日期，搜索全部记录…');
  await search.fill('索引修订');
  await expect(page.locator('.work-list .work-row')).toHaveCount(1);
  await search.fill('没有这种工作记录');
  await expect(page.locator('.work-list .work-row')).toHaveCount(0);
  const logs = (await data(page)).work.logs;
  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({ date: DAY });
  expect(logs[0].install).toContain('虚构索引修订版本');
});

test('worklogs: rich-text input autosaves without clicking save', async ({ page }) => {
  await go(page, 'work');
  await page.getByRole('button', { name: '日工作完成情况', exact: true }).click();
  await page.getByRole('textbox', { name: '协作沟通…', exact: true }).fill('虚构自动保存日志');
  await expect.poll(async () => (await data(page)).work.logs[0]?.civil).toContain('虚构自动保存日志');
  await page.reload();
  await page.getByRole('button', { name: '日工作完成情况', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '协作沟通…', exact: true })).toContainText('虚构自动保存日志');
});

test('settings: display name and weather city persist and affect their views', async ({ page }) => {
  await go(page, 'settings');
  await expect(page.getByLabel('查询公开行情')).not.toBeChecked();
  await page.getByLabel('称呼', { exact: true }).fill('虚构演示者');
  await page.getByLabel('天气城市', { exact: true }).selectOption('shanghai');
  await page.getByRole('button', { name: '保存偏好', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('称呼', { exact: true })).toHaveValue('虚构演示者');
  await expect(page.getByLabel('天气城市', { exact: true })).toHaveValue('shanghai');
  await go(page, 'dashboard');
  await expect(page.locator('#view h1')).toContainText('虚构演示者');
  await go(page, 'info');
  await expect(page.locator('.weather-now')).toContainText('上海');
  await expect(page.locator('.weather-now')).toContainText('23°');
});

for (const [theme, label] of [['light', '浅色'], ['dark', '深色']]) {
  test(`theme: ${theme} is grayscale, accessible and persistent`, async ({ page }) => {
    await go(page, 'settings');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(key => localStorage.getItem(key), THEME_KEY)).toBe(theme);
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { background: style.backgroundColor, text: style.color, scheme: style.colorScheme };
    });
    expect(colors.scheme).toBe(theme);
    for (const value of [colors.background, colors.text]) {
      const channels = value.match(/\d+/g).slice(0, 3).map(Number);
      expect(new Set(channels).size, `Expected neutral RGB channels: ${value}`).toBe(1);
    }
    const bg = Number(colors.background.match(/\d+/)[0]);
    const fg = Number(colors.text.match(/\d+/)[0]);
    const luminance = n => { const s = n / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    expect((Math.max(luminance(bg), luminance(fg)) + 0.05) / (Math.min(luminance(bg), luminance(fg)) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
}

test('backup: exported download is the complete versioned envelope', async ({ page }) => {
  const content = await backup(page, sampleCollections());
  await restore(page, content);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`personal-workbench-${DAY}.json`);
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported).toEqual(JSON.parse(await rawData(page)));
  expect(exported).toMatchObject({ format: 'vibe-personal-workbench', version: 1 });
  expect(exported.data).toEqual(JSON.parse(content).data);
});

test('backup: import fully replaces every collection and survives reload', async ({ page }) => {
  await restore(page, await backup(page, sampleCollections('旧虚构数据')));
  const incoming = await backup(page, {
    notes: [{ id: 'replacement', title: '唯一恢复笔记', body: '虚构恢复内容', tags: [], updatedAt: 2 }],
    settings: { displayName: '恢复演示', quotesEnabled: false },
  });
  await restore(page, incoming);
  expect(await data(page)).toEqual(JSON.parse(incoming).data);
  await page.reload();
  expect(await data(page)).toEqual(JSON.parse(incoming).data);
  await go(page, 'notes');
  await expect(page.locator('.note-item')).toHaveCount(1);
  await expect(page.locator('.note-item')).toContainText('唯一恢复笔记');
});

test('backup: cancelling replacement preserves exact bytes and allows the same file again', async ({ page }) => {
  await restore(page, await backup(page, sampleCollections('保留虚构数据')));
  const before = await rawData(page);
  const incoming = await backup(page);
  await uploadBackup(page, incoming);
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  expect(await rawData(page)).toBe(before);
  await expect(page.getByLabel('选择备份文件')).toHaveValue('');
  await restore(page, incoming);
  expect(await data(page)).toEqual(JSON.parse(incoming).data);
});

for (const [name, invalid] of [
  ['malformed JSON', '{not-json'],
  ['unsupported version', JSON.stringify({ format: 'vibe-personal-workbench', version: 99, data: {} })],
  ['unknown cloud setting', JSON.stringify({ settings: { githubToken: 'fictitious-not-a-token' } })],
  ['negative ledger number', JSON.stringify({ ledger: [{ id: 'bad', type: 'out', amount: -1, category: '测试', date: DAY }] })],
  ['duplicate IDs', JSON.stringify({ todos: [{ id: 'duplicate', title: '甲' }, { id: 'duplicate', title: '乙' }] })],
  ['prototype pollution', '{"__proto__":{"polluted":true}}'],
]) {
  test(`backup: rejects ${name} without modifying existing data`, async ({ page }) => {
    await go(page, 'todos');
    await addTodo(page, '必须保留的虚构数据');
    const before = await rawData(page);
    await uploadBackup(page, invalid);
    await expect(page.locator('#toast-root .err')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await rawData(page)).toBe(before);
    expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();
    await page.reload();
    expect(await rawData(page)).toBe(before);
    expect((await data(page)).todos[0].title).toBe('必须保留的虚构数据');
  });
}

test('backup: corrupted local bytes stay untouched and raw export supports recovery', async ({ page }) => {
  const corrupt = '{"format":"vibe-personal-workbench","version":1,"data":BROKEN';
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: DATA_KEY, value: corrupt });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('原始内容未被覆盖');
  await go(page, 'todos');
  await page.getByRole('button', { name: '+ 新建待办', exact: true }).click();
  await page.getByRole('dialog').getByLabel('事项', { exact: true }).fill('不得覆盖损坏数据');
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('事项', { exact: true })).toHaveValue('不得覆盖损坏数据');
  await expect(page.locator('#toast-root .err')).toContainText('已阻止修改');
  expect(await rawData(page)).toBe(corrupt);
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await go(page, 'settings');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出原始数据', exact: true }).click();
  expect(await readFile(await (await pending).path(), 'utf8')).toBe(corrupt);
  await restore(page, await backup(page));
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect((await data(page)).todos).toEqual([]);
});

test('security: hostile backup HTML is sanitized in every rich-text surface', async ({ page }) => {
  const hostile = '<p onclick="window.__xss=1">安全文本<strong>允许加粗</strong></p>'
    + '<img src="https://example.invalid/tracker" onerror="window.__xss=2">'
    + '<script>window.__xss=3</script><svg onload="window.__xss=4"></svg>'
    + '<a href="javascript:window.__xss=5">恶意链接</a>'
    + '<iframe srcdoc="<script>parent.__xss=6</script>"></iframe>';
  const fixture = sampleCollections('安全虚构数据');
  fixture.notes[0].body = hostile;
  fixture.inspirations[0].text = hostile;
  fixture.prompts[0].content = hostile;
  fixture.work.plans[0].note = hostile;
  fixture.work.logs[0].install = hostile;
  fixture.work.focus[MONTH] = hostile;
  fixture.stocks.notes[0].body = hostile;
  await restore(page, await backup(page, fixture));
  for (const route of ['notes', 'ideas', 'ai', 'work', 'stocks']) {
    await go(page, route);
    if (route === 'stocks') await page.getByRole('button', { name: '投资笔记', exact: true }).click();
    await expect(page.locator('#view')).toContainText('安全文本');
    expect(await page.locator('#view').evaluate(root => [...root.querySelectorAll('*')].flatMap(node => {
      const issues = [];
      if (['SCRIPT', 'IMG', 'IFRAME', 'SVG', 'OBJECT', 'EMBED'].includes(node.tagName)
        && !node.closest('button') && node.tagName !== 'SVG') issues.push(node.outerHTML);
      for (const attr of node.attributes) if (/^on/i.test(attr.name) || /javascript:|vbscript:|data:text\/html/i.test(attr.value)) issues.push(attr.name + '=' + attr.value);
      return issues;
    })), `Unsafe DOM on ${route}`).toEqual([]);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  }
  await go(page, 'notes');
  await page.getByRole('button', { name: '保存笔记', exact: true }).click();
  const savedBody = (await data(page)).notes[0].body;
  expect(savedBody).toContain('<strong>允许加粗</strong>');
  expect(savedBody).not.toMatch(/<script|<img|<iframe|<svg|onclick|onerror|javascript:/i);
});

test('public data: deterministic weather and news filter unsafe URLs', async ({ page }) => {
  await go(page, 'settings');
  await page.getByLabel('天气城市', { exact: true }).selectOption('shanghai');
  await page.getByRole('button', { name: '保存偏好', exact: true }).click();
  const weatherRequest = page.waitForRequest('https://api.open-meteo.com/**');
  await go(page, 'info');
  expect(new URL((await weatherRequest).url()).searchParams.get('latitude')).toBe('31.23');
  await expect(page.locator('.weather-now')).toContainText('23°');
  await expect(page.locator('.forecast .fc')).toHaveCount(3);
  await expect(page.getByRole('link', { name: '虚构测试新闻：公共图书馆开放' })).toHaveAttribute('href', 'https://example.com/library');
  await expect(page.getByRole('link', { name: '不安全新闻链接' })).toHaveCount(0);
});

test('public data: aborted weather and every news source show usable fallbacks', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', route => route.abort('failed'));
  const newsRequests = [];
  await page.route('https://60s.viki.moe/**', route => { newsRequests.push(route.request().url()); return route.abort('failed'); });
  await go(page, 'settings');
  await page.getByLabel('天气城市', { exact: true }).selectOption('shanghai');
  await page.getByRole('button', { name: '保存偏好', exact: true }).click();
  await go(page, 'info');
  await expect(page.locator('#view')).toContainText('天气暂时加载失败');
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible();
  await expect(page.locator('#view')).toContainText('热榜暂时拉取失败');
  await expect(page.getByRole('link', { name: /财联社/ })).toBeVisible();
  expect(newsRequests).toHaveLength(3);
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: WEATHER }));
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.weather-now')).toContainText('23°');
});

test('privacy: quotes disabled by default, no token/cloud fields or remote scripts', async ({ page }) => {
  expect((await data(page)).settings.quotesEnabled).toBe(false);
  await go(page, 'stocks');
  for (const name of ['交易记录', '持仓盈亏', '自选股行情', '投资笔记']) {
    await page.getByRole('button', { name, exact: true }).click();
  }
  await go(page, 'settings');
  await expect(page.getByLabel('查询公开行情')).not.toBeChecked();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /token|api.?key|密钥/i })).toHaveCount(0);
  const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
  const origin = new URL(page.url()).origin;
  expect(scripts.every(src => new URL(src).origin === origin)).toBe(true);
  expect(Object.keys((await data(page)).settings)).toEqual(['quotesEnabled']);
});

async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth, document: document.documentElement.scrollWidth,
    view: document.getElementById('view').scrollWidth,
    viewClient: document.getElementById('view').clientWidth,
  }));
  expect.soft(sizes.body, `${label}: body horizontal overflow`).toBeLessThanOrEqual(sizes.viewport);
  expect.soft(sizes.document, `${label}: document horizontal overflow`).toBeLessThanOrEqual(sizes.viewport);
  expect.soft(sizes.view, `${label}: content must fit the view, not just be clipped by body`).toBeLessThanOrEqual(sizes.viewClient);
}

async function dialogInsideViewport(page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const size = page.viewportSize();
  expect.soft(box.x).toBeGreaterThanOrEqual(0);
  expect.soft(box.y).toBeGreaterThanOrEqual(0);
  expect.soft(box.x + box.width).toBeLessThanOrEqual(size.width);
  expect.soft(box.y + box.height).toBeLessThanOrEqual(size.height);
}

for (const width of [320, 390, 768]) {
  test(`responsive: ${width}px more menu, all routes and form dialog stay visible without overflow`, async ({ page }) => {
    await restore(page, await backup(page, sampleCollections()));
    await page.setViewportSize({ width, height: 844 });
    for (const [id, label] of ROUTES) {
      if (['dashboard', 'todos', 'notes'].includes(id)) {
        await page.locator('#tabbar').getByRole('button', { name: id === 'todos' ? '待办' : label, exact: true }).click();
      } else {
        await page.locator('#tabbar').getByRole('button', { name: '更多', exact: true }).click();
        await dialogInsideViewport(page);
        await page.getByRole('dialog', { name: '全部模块' }).getByRole('button', { name: label, exact: true }).click();
      }
      await expect(page).toHaveURL(new RegExp(`#/${id}$`));
      await expect(page.locator('#view h1')).toBeVisible();
      await noOverflow(page, `${width}px ${id}`);
    }
    await page.locator('#tabbar').getByRole('button', { name: '待办', exact: true }).click();
    await page.getByRole('button', { name: '+ 新建待办', exact: true }).click();
    await dialogInsideViewport(page);
    await expect(page.getByRole('dialog').getByLabel('事项', { exact: true })).toBeInViewport();
    await expect(page.getByRole('dialog').getByRole('button', { name: '保存', exact: true })).toBeInViewport();
    await noOverflow(page, `${width}px task dialog`);
  });
}

test('screenshots: desktop and mobile contain fictitious sample data only', async ({ page }) => {
  await restore(page, await backup(page, sampleCollections()));
  await go(page, 'dashboard');
  await expect(page.locator('#view h1')).toContainText('演示用户');
  await expect(page.locator('#toast-root .toast')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const imageDirectory = fileURLToPath(new URL('../../docs/images/', import.meta.url));
  await mkdir(imageDirectory, { recursive: true });
  await page.screenshot({ path: imageDirectory + 'desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#tabbar')).toBeVisible();
  await noOverflow(page, 'mobile screenshot');
  await page.screenshot({ path: imageDirectory + 'mobile.png', fullPage: true, animations: 'disabled' });
});

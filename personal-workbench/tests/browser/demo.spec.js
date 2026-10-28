import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PERSONAL = 'vcl.personal-workbench.data.v1';
const DEMO = 'vcl.personal-workbench.demo.v1';
const DAY = '2026-10-29';
const PRIVATE = '  {"todos":[{"id":"private","title":"不可被覆盖的私人安排","date":"2026-10-29"}],"settings":{"displayName":"私人称呼"}}\n';

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.clock.setFixedTime(new Date(DAY + 'T12:00:00+08:00'));
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
  await page.addInitScript(({ key, raw }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, raw); }, { key: PERSONAL, raw: PRIVATE });
});

async function openDemo(page) {
  await page.goto('./');
  await page.getByRole('button', { name: '体验演示', exact: true }).click();
  await expect(page).toHaveURL(/\?demo=1#\/dashboard$/);
  await expect(page.locator('#workspace-bar')).toContainText('演示模式');
}

async function go(page, id) {
  await page.evaluate(id => { location.hash = '#/' + id; }, id);
  await expect(page).toHaveURL(new RegExp(`#/${id}$`));
}

test('explicit entry, editing, reload, exit and reset never change personal bytes', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('#view')).toContainText('知识库');
  await go(page, 'todos');
  const row = page.locator('.todo-item').filter({ hasText: '对照评测集复查知识库回答引用' });
  await row.getByRole('button', { name: '完成', exact: true }).click();
  await expect(row).toHaveClass(/done/);
  const disk = await page.evaluate(key => localStorage.getItem(key), DEMO);
  expect(disk).toBeTruthy();
  await page.reload();
  await expect(row).toHaveClass(/done/);
  await page.getByRole('button', { name: '退出演示', exact: true }).click();
  await expect(page).not.toHaveURL(/demo=1/);
  await expect(page.locator('#view')).toContainText('私人称呼');
  expect(await page.evaluate(key => localStorage.getItem(key), PERSONAL)).toBe(PRIVATE);
  await page.getByRole('button', { name: '体验演示', exact: true }).click();
  await go(page, 'todos');
  await expect(row).toHaveClass(/done/);
  await page.getByRole('button', { name: '重置演示', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), DEMO)).toBe(disk);
  await page.getByRole('button', { name: '重置演示', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '重置演示数据', exact: true }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await go(page, 'todos');
  await expect(row).not.toHaveClass(/done/);
  expect(await page.evaluate(key => localStorage.getItem(key), PERSONAL)).toBe(PRIVATE);
});

test('today count, project progress and saved notes stay linked', async ({ page }) => {
  await openDemo(page);
  const counter = page.locator('[data-testid="today-todos"]');
  const before = Number(await counter.textContent());
  await go(page, 'todos');
  await page.locator('.todo-item').filter({ hasText: '对照评测集复查知识库回答引用' }).getByRole('button', { name: '完成', exact: true }).click();
  await go(page, 'dashboard');
  await expect(counter).toHaveText(String(before - 1));
  await go(page, 'work');
  await page.locator('.work-row').filter({ hasText: '完成一轮反馈整理与需求取舍' }).getByRole('button', { name: '标记为完成', exact: true }).click();
  await go(page, 'dashboard');
  await expect(page.locator('[data-testid="project-progress"]')).toHaveText('60%');
  await go(page, 'notes');
  await page.getByPlaceholder('标题', { exact: true }).fill('现场修改后的知识库笔记');
  await page.getByRole('textbox', { name: /^正文/ }).fill('可保存的演示修改，不影响个人空间。');
  await page.getByRole('button', { name: '保存笔记', exact: true }).click();
  await page.reload();
  await expect(page.getByPlaceholder('标题', { exact: true })).toHaveValue('现场修改后的知识库笔记');
  expect(await page.evaluate(key => localStorage.getItem(key), PERSONAL)).toBe(PRIVATE);
});

test('demo backup has an explicit filename and restores only demo contents', async ({ page }) => {
  await page.goto('./?demo=1#/settings');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const file = await promise;
  expect(file.suggestedFilename()).toBe('personal-workbench-demo-2026-10-29.json');
  const text = await readFile(await file.path(), 'utf8');
  expect(JSON.parse(text).data.settings.weatherCity).toBe('wuhan');
  await page.getByLabel('选择备份文件').setInputFiles({ name: 'demo-backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.getByRole('dialog')).toContainText('不影响个人空间');
  await page.getByRole('dialog').getByRole('button', { name: '替换并恢复', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), PERSONAL)).toBe(PRIVATE);
});

test('demo theme changes do not overwrite the personal appearance', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('vcl.personal-workbench.theme', 'light'));
  await page.goto('./?demo=1#/settings');
  await page.getByRole('button', { name: '深色', exact: true }).click();
  await page.getByRole('button', { name: '退出演示', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('vcl.personal-workbench.theme'))).toBe('light');
  await page.getByRole('button', { name: '体验演示', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const width of [320, 390, 768, 1440]) {
  test(`demo responsive: ${width}px all populated modules fit the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('./?demo=1');
    for (const route of ['dashboard', 'todos', 'work', 'notes', 'ideas', 'ai', 'ledger', 'learning', 'info', 'stocks', 'settings']) {
      await go(page, route);
      await expect(page.locator('#view h1')).toBeVisible();
      const overflow = await page.evaluate(() => {
        const view = document.getElementById('view');
        return { document: document.documentElement.scrollWidth > innerWidth + 1, view: view.scrollWidth > view.clientWidth + 1 };
      });
      expect(overflow, route).toEqual({ document: false, view: false });
      if (['dashboard', 'info'].includes(route) && [390, 1440].includes(width)) {
        const dir = new URL('../../docs/images/', import.meta.url);
        await mkdir(dir, { recursive: true });
        await page.screenshot({ path: fileURLToPath(new URL(`demo-${route}-${width}.png`, dir)), animations: 'disabled' });
      }
    }
    await go(page, 'settings');
    await page.getByRole('button', { name: '深色', exact: true }).click();
    await go(page, 'dashboard');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    if (width === 1440) await page.screenshot({ path: fileURLToPath(new URL('../../docs/images/demo-dark-1440.png', import.meta.url)), animations: 'disabled' });
  });
}

test('all modules render seeded contents without external calls, including factual snapshots and simulated finance', async ({ page, context, baseURL }) => {
  const errors = [], remote = [];
  page.on('pageerror', e => errors.push(e.message));
  context.on('request', r => { if (new URL(r.url()).origin !== new URL(baseURL).origin) remote.push(r.url()); });
  await page.goto('./?demo=1');
  for (const [id, text] of [
    ['todos', '对照评测集'], ['work', '知识库'], ['notes', '知识库'], ['ideas', '引用'],
    ['ai', '提示词'], ['learning', 'RAG'], ['ledger', '模拟'], ['stocks', '模拟'],
    ['info', '武汉'], ['settings', '武汉'],
  ]) {
    await go(page, id);
    await expect(page.locator('#view')).toContainText(text);
  }
  await go(page, 'info');
  await expect(page.locator('#view')).toContainText('资料快照');
  await expect(page.locator('#view')).toContainText('2026-10-29');
  expect(await page.locator('.snapshot-article a').count()).toBeGreaterThanOrEqual(4);
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
});

test('a persisted demo rolls to tomorrow without resetting edits or moving snapshot dates', async ({ page }) => {
  await page.goto('./?demo=1');
  await page.evaluate(async () => { (await import('./js/store.js')).store.update(d => { d.todos[0].title = '跨日保留编辑'; }); });
  await page.clock.setFixedTime(new Date('2026-10-30T12:00:00+08:00'));
  await page.reload();
  await expect(page.locator('#view')).toContainText('跨日保留编辑');
  const data = await page.evaluate(async () => (await import('./js/store.js')).store.data);
  expect(data.todos[0].date).toBe('2026-10-30');
  await go(page, 'info');
  await expect(page.locator('#view')).toContainText('2026-10-29');
  await expect(page.locator('#view')).not.toContainText('实时热榜');
});

test('a long-open demo aligns before a new-day write and a previous-day backup import', async ({ page }) => {
  await page.goto('./?demo=1');
  await page.evaluate(async () => { (await import('./js/store.js')).store.update(() => {}); });
  const oldBackup = await page.evaluate(async () => (await import('./js/store.js')).store.exportBackup());
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00+08:00'));
  await page.evaluate(async () => {
    (await import('./js/store.js')).store.update(d => d.todos.push({ id: 'midnight-task', title: '跨月当天新建', date: '2026-11-01' }));
  });
  await page.reload();
  let data = await page.evaluate(async () => (await import('./js/store.js')).store.data);
  expect(data.todos.find(t => t.id === 'midnight-task').date).toBe('2026-11-01');
  await page.evaluate(async text => { (await import('./js/store.js')).store.importBackup(text); }, oldBackup);
  data = await page.evaluate(async () => (await import('./js/store.js')).store.data);
  expect(data.todos[0].date).toBe('2026-11-01');
  await go(page, 'dashboard');
  await expect(page.locator('[data-testid="today-todos"]')).toHaveText('5');
  expect(await page.evaluate(key => localStorage.getItem(key), PERSONAL)).toBe(PRIVATE);
});

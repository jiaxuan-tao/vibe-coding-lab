import { test as base, expect } from '@playwright/test';

const DAY = '2026-10-16';
const DATA_KEY = 'vcl.personal-workbench.data.v1';

const test = base.extend({
  guards: [async ({ page, context, baseURL }, use) => {
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === new URL(baseURL).origin) return route.continue();
      external.push(route.request().url());
      return route.abort('blockedbyclient');
    });
    await use();
    expect(errors, 'No uncaught browser errors').toEqual([]);
    expect(external, 'No unexpected third-party requests').toEqual([]);
  }, { auto: true }],
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(`${DAY}T12:00:00+08:00`) });
  await page.clock.pauseAt(new Date(`${DAY}T12:00:01+08:00`));
  await page.goto('./#/work');
  await expect(page.getByRole('heading', { name: '工作情况', exact: true })).toBeVisible();
});

async function logsTab(page) {
  await page.getByRole('button', { name: '日工作完成情况', exact: true }).click();
}

async function logs(page) {
  return page.evaluate(async () => (await import('./js/store.js')).store.data.work.logs);
}

async function seedLogs(page, entries) {
  await page.evaluate(async entries => {
    const { store } = await import('./js/store.js');
    store.update(data => { data.work.logs = entries.map(entry => ({
      focus: '', install: '', civil: '', sub: '', other: '', content: '', createdAt: 1, updatedAt: 1, ...entry,
    })); });
  }, entries);
}

async function editLog(page, text) {
  await page.locator('.work-list .work-row').filter({ hasText: text }).locator('.work-ops button').first().click();
  await expect(page.getByRole('dialog', { name: '编辑工作记录' })).toBeVisible();
}

async function submit(page) {
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
}

async function blockStorage(page) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    window.__restoreWorkTestStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Fictitious quota failure', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, DATA_KEY);
}

async function unblockStorage(page) {
  await page.evaluate(() => window.__restoreWorkTestStorage());
}

async function warnsBeforeUnload(page) {
  return page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })));
}

async function leaveWork(page, destination) {
  if (destination === 'tab') {
    await page.getByRole('button', { name: '月工作计划', exact: true }).click();
  } else {
    await page.locator('#nav').getByRole('button', { name: '设置', exact: true }).click();
    await expect(page.getByRole('heading', { name: '设置', exact: true })).toBeVisible();
  }
}

async function returnToLogs(page, destination) {
  if (destination === 'route') {
    await page.locator('#nav').getByRole('button', { name: '工作情况', exact: true }).click();
    await expect(page.getByRole('heading', { name: '工作情况', exact: true })).toBeVisible();
  }
  const tab = page.getByRole('button', { name: '日工作完成情况', exact: true });
  if (!(await tab.getAttribute('class')).split(/\s+/).includes('active')) await tab.click();
}

test('drafts: switching tabs flushes A and cancels the old timer before editing B', async ({ page }) => {
  await logsTab(page);
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构重点 A');
  await page.clock.runFor(200);
  await page.getByRole('button', { name: '月工作计划', exact: true }).click();
  await logsTab(page);
  await page.getByRole('textbox', { name: '协作沟通…', exact: true }).fill('虚构协作 B');
  await page.clock.runFor(1400);
  expect(await logs(page)).toHaveLength(1);
  expect((await logs(page))[0].focus).toContain('虚构重点 A');
  expect((await logs(page))[0].civil).toContain('虚构协作 B');
  await page.reload();
  await logsTab(page);
  await expect(page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true })).toContainText('虚构重点 A');
  await expect(page.getByRole('textbox', { name: '协作沟通…', exact: true })).toContainText('虚构协作 B');
});

test('drafts: route cleanup saves immediately and has no delayed writes', async ({ page }) => {
  await logsTab(page);
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构离开前草稿');
  await page.locator('#nav').getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByRole('heading', { name: '设置', exact: true })).toBeVisible();
  expect((await logs(page))[0]?.focus).toContain('虚构离开前草稿');
  const saved = await page.evaluate(key => localStorage.getItem(key), DATA_KEY);
  await page.clock.runFor(5000);
  expect(await page.evaluate(key => localStorage.getItem(key), DATA_KEY)).toBe(saved);
});

test('drafts: autosave updates the local list and status without replacing the editor', async ({ page }) => {
  await logsTab(page);
  const editor = page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true });
  await editor.evaluate(node => { node.dataset.regressionIdentity = 'original-editor'; });
  await editor.fill('虚构自动保存可见记录');
  await page.clock.runFor(1300);
  await expect(page.locator('.work-list')).toContainText('虚构自动保存可见记录');
  await expect(editor).toHaveAttribute('data-regression-identity', 'original-editor');
  await expect(editor).toBeFocused();
  await expect(page.getByRole('button', { name: '更新今天的记录', exact: true })).toBeVisible();
  await expect(page.locator('#view')).toContainText('已自动保存');
});

test('drafts: manual save keeps the editor and does not leave a second pending write', async ({ page }) => {
  await logsTab(page);
  const editor = page.getByRole('textbox', { name: '协作沟通…', exact: true });
  await editor.evaluate(node => { node.dataset.regressionIdentity = 'original-editor'; });
  await editor.fill('虚构手动保存内容');
  await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
  await expect(editor).toHaveAttribute('data-regression-identity', 'original-editor');
  await expect(page.locator('.work-list')).toContainText('虚构手动保存内容');
  const saved = await page.evaluate(key => localStorage.getItem(key), DATA_KEY);
  await page.clock.runFor(2000);
  expect(await page.evaluate(key => localStorage.getItem(key), DATA_KEY)).toBe(saved);
});

test('drafts: an old timer cannot overwrite a backup imported after leaving work', async ({ page }) => {
  const replacement = await page.evaluate(async day => {
    const { createEmptyData, serializeBackup } = await import('./js/data.js');
    const data = createEmptyData();
    data.work.logs.push({ id: 'restored-log', date: day, focus: '虚构恢复记录', install: '', civil: '', sub: '', other: '', content: '', createdAt: 2, updatedAt: 2 });
    return serializeBackup(data);
  }, DAY);
  await logsTab(page);
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('不得复活的旧草稿');
  await page.locator('#nav').getByRole('button', { name: '设置', exact: true }).click();
  await page.getByLabel('选择备份文件').setInputFiles({ name: 'fictitious.json', mimeType: 'application/json', buffer: Buffer.from(replacement) });
  await page.getByRole('dialog').getByRole('button', { name: '替换并恢复', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(5000);
  expect(await page.evaluate(async () => (await import('./js/store.js')).store.data)).toEqual(JSON.parse(replacement).data);
  await page.reload();
  expect((await logs(page))[0]).toMatchObject({ id: 'restored-log', focus: '虚构恢复记录' });
});

test('drafts: replacement while a rich editor is focused invalidates the old draft', async ({ page }) => {
  await logsTab(page);
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('不得污染替换数据');
  // Synthetic replacement exercises the store notification before route cleanup.
  await page.evaluate(async () => {
    const { store } = await import('./js/store.js');
    const { createEmptyData, serializeBackup } = await import('./js/data.js');
    store.importBackup(serializeBackup(createEmptyData()));
  });
  await page.clock.runFor(5000);
  expect(await logs(page)).toEqual([]);
});

test('logs: changing to a free date updates the original ID instead of adding a record', async ({ page }) => {
  await seedLogs(page, [{ id: 'original-id', date: '2026-10-14', focus: '虚构可改日期记录' }]);
  await logsTab(page);
  await editLog(page, '虚构可改日期记录');
  await page.getByRole('dialog').getByLabel('日期', { exact: true }).fill('2026-10-15');
  await submit(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await logs(page)).toHaveLength(1);
  expect((await logs(page))[0]).toMatchObject({ id: 'original-id', date: '2026-10-15', focus: '虚构可改日期记录', createdAt: 1 });
  await page.reload();
  expect((await logs(page))[0]).toMatchObject({ id: 'original-id', date: '2026-10-15' });
});

test('logs: occupied target date is rejected, both records stay unchanged and the dialog remains editable', async ({ page }) => {
  await seedLogs(page, [
    { id: 'original-id', date: '2026-10-14', focus: '虚构第一条记录' },
    { id: 'occupied-id', date: '2026-10-15', focus: '虚构第二条记录' },
  ]);
  await logsTab(page);
  const before = await logs(page);
  await editLog(page, '虚构第一条记录');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('日期', { exact: true }).fill('2026-10-15');
  await submit(page);
  await expect(dialog).toBeVisible();
  await expect(page.locator('#toast-root .err')).toContainText('已有工作记录');
  await expect(dialog.getByLabel('日期', { exact: true })).toHaveValue('2026-10-15');
  expect(await logs(page)).toEqual(before);
  await dialog.getByLabel('日期', { exact: true }).fill('2026-10-13');
  await submit(page);
  await expect(dialog).toHaveCount(0);
  expect((await logs(page)).find(log => log.id === 'original-id').date).toBe('2026-10-13');
  expect((await logs(page)).find(log => log.id === 'occupied-id')).toEqual(before.find(log => log.id === 'occupied-id'));
});

test('logs: an empty modal stays open after validation failure', async ({ page }) => {
  await logsTab(page);
  await page.getByRole('button', { name: '补记以往日期', exact: true }).click();
  await submit(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#toast-root .err')).toContainText('至少填写一项内容');
  expect(await logs(page)).toEqual([]);
});

test('logs: storage failure retains the modal draft and retry saves the original ID', async ({ page }) => {
  await seedLogs(page, [{ id: 'original-id', date: '2026-10-14', focus: '虚构存储失败测试' }]);
  await logsTab(page);
  await editLog(page, '虚构存储失败测试');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('当日重点工作', { exact: true }).fill('虚构重试后记录');
  await blockStorage(page);
  await submit(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('当日重点工作', { exact: true })).toHaveValue('虚构重试后记录');
  await expect(page.locator('#toast-root .err')).toBeVisible();
  expect((await logs(page))[0].focus).toBe('虚构存储失败测试');
  await unblockStorage(page);
  await submit(page);
  await expect(dialog).toHaveCount(0);
  expect((await logs(page))[0]).toMatchObject({ id: 'original-id', focus: '虚构重试后记录' });
});

for (const existing of [false, true]) {
  test(`plans: ${existing ? 'edit' : 'new'} storage failure retains its modal draft until retry succeeds`, async ({ page }) => {
    await page.getByRole('button', { name: '+ 新建计划', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('计划内容', { exact: true }).fill('虚构月计划');
    if (existing) {
      await submit(page);
      await expect(dialog).toHaveCount(0);
      await page.locator('.work-row').filter({ hasText: '虚构月计划' }).locator('.work-ops button').first().click();
      dialog = page.getByRole('dialog');
      await dialog.getByLabel('计划内容', { exact: true }).fill('虚构月计划修订');
    }
    await blockStorage(page);
    await submit(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('计划内容', { exact: true })).toHaveValue(existing ? '虚构月计划修订' : '虚构月计划');
    await expect(page.locator('#toast-root .err')).toBeVisible();
    await unblockStorage(page);
    await submit(page);
    await expect(dialog).toHaveCount(0);
    const plans = await page.evaluate(async () => (await import('./js/store.js')).store.data.work.plans);
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toBe(existing ? '虚构月计划修订' : '虚构月计划');
  });
}

test('drafts: failed autosave remains dirty and a manual retry succeeds', async ({ page }) => {
  await logsTab(page);
  await page.getByRole('textbox', { name: '协作沟通…', exact: true }).fill('虚构自动保存重试');
  await blockStorage(page);
  await page.clock.runFor(1300);
  expect(await logs(page)).toEqual([]);
  await expect(page.getByRole('textbox', { name: '协作沟通…', exact: true })).toContainText('虚构自动保存重试');
  await unblockStorage(page);
  await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
  expect((await logs(page))[0].civil).toContain('虚构自动保存重试');
});

test('drafts: deleting a historical record first flushes the current editor', async ({ page }) => {
  await seedLogs(page, [{ id: 'historical', date: '2026-10-14', focus: '虚构待删除历史记录' }]);
  await logsTab(page);
  await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构尚未计时保存的今日草稿');
  await page.locator('.work-list .work-row').filter({ hasText: '虚构待删除历史记录' }).locator('.work-ops button').last().click();
  await page.getByRole('dialog').getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(5000);
  expect(await logs(page)).toHaveLength(1);
  expect((await logs(page))[0]).toMatchObject({ date: DAY });
  expect((await logs(page))[0].focus).toContain('虚构尚未计时保存的今日草稿');
});

test('drafts: typing and clearing a new blank draft does not block the log modal', async ({ page }) => {
  await logsTab(page);
  const editor = page.getByRole('textbox', { name: '协作沟通…', exact: true });
  await editor.fill('随后清除的虚构草稿');
  await editor.fill('');
  await page.getByRole('button', { name: '补记以往日期', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '补记工作完成情况' })).toBeVisible();
  expect(await logs(page)).toEqual([]);
});

for (const destination of ['tab', 'route']) {
  for (const autosaveFirst of [false, true]) {
    test(`draft recovery: quota failure on ${autosaveFirst ? 'autosave' : 'cleanup'} survives ${destination} navigation and retries`, async ({ page }) => {
      await logsTab(page);
      await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构失败后仍需保留的重点');
      await page.getByRole('textbox', { name: '协作沟通…', exact: true }).fill('虚构失败后仍需保留的协作');
      await blockStorage(page);
      if (autosaveFirst) await page.clock.runFor(1300);
      await leaveWork(page, destination);
      expect(await logs(page)).toEqual([]);
      await page.clock.runFor(5000);
      await returnToLogs(page, destination);
      await expect(page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true })).toContainText('虚构失败后仍需保留的重点');
      await expect(page.getByRole('textbox', { name: '协作沟通…', exact: true })).toContainText('虚构失败后仍需保留的协作');
      expect(await warnsBeforeUnload(page)).toBe(true);
      await unblockStorage(page);
      await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
      expect(await logs(page)).toHaveLength(1);
      expect((await logs(page))[0].focus).toContain('虚构失败后仍需保留的重点');
      expect((await logs(page))[0].civil).toContain('虚构失败后仍需保留的协作');
      expect(await warnsBeforeUnload(page)).toBe(false);
      await page.reload();
      expect((await logs(page))[0].civil).toContain('虚构失败后仍需保留的协作');
    });
  }
}

test('draft recovery: beforeunload warns for active unsaved input and clears only after saving or undoing it', async ({ page }) => {
  await logsTab(page);
  expect(await warnsBeforeUnload(page)).toBe(false);
  const editor = page.getByRole('textbox', { name: '协作沟通…', exact: true });
  await editor.fill('虚构未保存警告');
  expect(await warnsBeforeUnload(page)).toBe(true);
  await editor.fill('');
  expect(await warnsBeforeUnload(page)).toBe(false);
  await editor.fill('虚构实际保存');
  await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
  expect(await warnsBeforeUnload(page)).toBe(false);
});

for (const confirm of [false, true]) {
  test(`draft recovery: ${confirm ? 'confirmed' : 'cancelled'} import ${confirm ? 'discards' : 'preserves'} the failed detached draft`, async ({ page }) => {
    const replacement = await page.evaluate(async () => {
      const { createEmptyData, serializeBackup } = await import('./js/data.js');
      return serializeBackup(createEmptyData());
    });
    await logsTab(page);
    await page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true }).fill('虚构恢复前的失败草稿');
    await blockStorage(page);
    await leaveWork(page, 'route');
    await unblockStorage(page);
    await page.getByLabel('选择备份文件').setInputFiles({ name: 'fictitious.json', mimeType: 'application/json', buffer: Buffer.from(replacement) });
    await page.getByRole('dialog').getByRole('button', { name: confirm ? '替换并恢复' : '取消', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await warnsBeforeUnload(page)).toBe(!confirm);
    await returnToLogs(page, 'route');
    const editor = page.getByRole('textbox', { name: '当日重点工作（选填）', exact: true });
    if (confirm) {
      await expect(editor).toBeEmpty();
      await page.clock.runFor(5000);
      expect(await logs(page)).toEqual([]);
    } else {
      await expect(editor).toContainText('虚构恢复前的失败草稿');
      await page.getByRole('button', { name: '保存今天的记录', exact: true }).click();
      expect((await logs(page))[0].focus).toContain('虚构恢复前的失败草稿');
    }
  });
}

test('draft recovery: clearing the last input after a failed save does not block navigation or leave a warning', async ({ page }) => {
  await logsTab(page);
  const editor = page.getByRole('textbox', { name: '协作沟通…', exact: true });
  await editor.fill('虚构随后清空的失败草稿');
  await blockStorage(page);
  await page.clock.runFor(1300);
  await editor.fill('');
  expect(await warnsBeforeUnload(page)).toBe(false);
  await leaveWork(page, 'tab');
  await returnToLogs(page, 'tab');
  await expect(editor).toBeEmpty();
  await page.getByRole('button', { name: '补记以往日期', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '补记工作完成情况' })).toBeVisible();
  expect(await logs(page)).toEqual([]);
});

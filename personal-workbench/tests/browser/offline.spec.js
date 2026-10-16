import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('offline: local workflows survive reload and activation preserves other app caches', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.evaluate(async () => {
    const unrelated = await caches.open('vcl-another-project-fixture');
    await unrelated.put('./unrelated-fixture', new Response('keep this cache'));
    await caches.open('vcl-personal-workbench-obsolete-fixture');
    const registration = await navigator.serviceWorker.register('./sw.js?offline-update-test=1', {scope:'./'});
    const worker = registration.installing || registration.waiting || registration.active;
    if (worker.state !== 'activated') {
      await new Promise((resolve,reject) => worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
        if (worker.state === 'redundant') reject(new Error('Offline update failed'));
      }));
    }
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
    if (!registration.active) throw new Error('No active offline worker');
  });
  await page.goto('./#/todos');
  await page.getByRole('button', { name: '+ 新建待办', exact: true }).click();
  await page.getByLabel('事项', { exact: true }).fill('虚构离线待办');
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.todo-item')).toContainText('虚构离线待办');
  await page.getByRole('button', { name: '+ 新建待办', exact: true }).click();
  await page.getByLabel('事项', { exact: true }).fill('虚构离线新增');
  await page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).click();
  await page.reload();
  await expect(page.locator('.todo-item')).toHaveCount(2);
  expect(await page.evaluate(async () => {
    const cache = await caches.open('vcl-another-project-fixture');
    return (await cache.match('./unrelated-fixture'))?.text();
  })).toBe('keep this cache');
  expect(await page.evaluate(()=>caches.has('vcl-personal-workbench-obsolete-fixture'))).toBe(false);
  expect(errors).toEqual([]);
});

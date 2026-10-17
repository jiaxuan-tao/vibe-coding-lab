import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const target = new URL(process.env.TARGET_URL || 'http://127.0.0.1:5192/');
const browser = await chromium.launch({headless: process.env.CI === 'true'});
const checks = [];
try {
  const context = await browser.newContext({viewport:{width:1440,height:900}, permissions:['clipboard-read','clipboard-write']});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(target.href);
  await page.locator('#ui-locale').waitFor();
  assert.equal((await page.locator('.brand').textContent()).trim(), '文本对比台');
  checks.push('Chinese default');
  await page.locator('.cm-content').nth(0).fill('原文 Options\n预算 100 元');
  await page.locator('.cm-content').nth(1).fill('修改稿 Original\n预算 200 元');
  await page.locator('.cm-changedText').first().waitFor();
  checks.push('Chinese difference rendering');
  await page.locator('#ui-locale').selectOption('en');
  assert.match(await page.locator('#options-btn').textContent(), /Options/);
  assert.match(await page.locator('.cm-content').nth(0).textContent(), /原文 Options/);
  checks.push('Bilingual switch preserves text');
  await page.locator('#export-btn').click();
  const pending = page.waitForEvent('download');
  await page.locator('[data-action=report]').click();
  const report = await readFile(await (await pending).path(), 'utf8');
  assert.match(report, /lang="en"/);
  assert.match(report, /预算/);
  checks.push('HTML report download');
  await page.locator('#share').click();
  await page.locator('#share-dialog').waitFor();
  await page.locator('#share-dialog button[value=confirm]').click();
  await page.locator('.toast').filter({hasText:'Link copied'}).waitFor();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const shared = await context.newPage();
  await shared.goto(link);
  assert.match(await shared.locator('.cm-content').nth(1).textContent(), /200 元/);
  assert.equal(new URL(shared.url()).hash, '');
  await shared.close();
  checks.push('Share acknowledgement and restoration');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  checks.push('Mobile layout');
  const registration = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(registration, target.href);
  checks.push('Scoped service worker');
  for (const file of ['LICENSE','NOTICE','licenses/THIRD_PARTY-LICENSES.txt']) {
    assert.equal((await page.request.get(new URL(file,target).href)).ok(),true);
  }
  assert.match(await page.locator('.site-footer').textContent(), /James Patton/);
  checks.push('License and source attribution');
  await page.goto(new URL('json-compare/',target).href);
  assert.equal(await page.locator('#lang').inputValue(), 'JSON');
  checks.push('Nested entry assets');
  await page.goto(target.href);
  await context.setOffline(true);
  await page.reload();
  await page.locator('#options-btn').waitFor();
  checks.push('Offline reload');
  assert.deepEqual(errors, []);
  checks.push('No browser exceptions');
  console.log(JSON.stringify({target:target.href,passed:checks.length,checks},null,2));
} finally {
  await browser.close();
}

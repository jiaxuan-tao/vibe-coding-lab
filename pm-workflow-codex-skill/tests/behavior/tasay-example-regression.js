const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!playwrightModule) {
  throw new Error('Set PLAYWRIGHT_MODULE to the local Playwright package path.');
}
const { chromium } = require(playwrightModule);
const root = path.resolve(__dirname, '../..');
const base = path.join(root, 'examples/tasay-anniversary-modal/纪念日新增弹窗');
const prototypeUrl = pathToFileURL(path.join(base, '原型/纪念日新增弹窗-prototype.html')).href;
const checklistUrl = pathToFileURL(path.join(base, '验收清单/纪念日新增弹窗-验收清单.html')).href;
const prdPath = path.join(base, '需求文档/纪念日新增弹窗-PRD.html');

(async () => {
  const prdSource = fs.readFileSync(prdPath, 'utf8');
  assert(prdSource.includes('../../scripts/prototype-export-client.js'), 'PRD should use shared runtime client');
  assert(prdSource.includes('snapshotPrototypeViaServer'), 'PRD should inline iframe snapshots when copying');
  assert(prdSource.includes('showSaveFilePicker'), 'PRD should implement native file save');
  assert(prdSource.includes("document.execCommand('copy')"), 'PRD should include clipboard fallback');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());

  async function openState(state) {
    await page.goto(`${prototypeUrl}#${state}`);
    const active = page.locator('.device-wrapper.active');
    await active.waitFor();
    assert.equal(await active.getAttribute('data-page'), state);
    const device = active.locator('.device');
    assert.equal(await device.getAttribute('id'), state, `${state}: device id should match URL hash`);
    return device;
  }

  async function expectSuccess(device, expectedName) {
    await page.waitForTimeout(500);
    assert.equal(await device.locator('.overlay').count(), 0, `${expectedName}: modal should close`);
    assert.equal(await device.locator('.record b', { hasText: expectedName }).count(), 1, `${expectedName}: list should refresh`);
  }

  try {
    let device = await openState('form');
    await device.locator('.close').click();
    assert.equal(await device.locator('.overlay').count(), 0, 'close button should close current modal');
    await device.locator('.add-btn').click();
    await device.locator('.secondary').click();
    assert.equal(await device.locator('.overlay').count(), 0, 'cancel should close current modal');

    device = await openState('name-empty');
    await device.locator('[data-field="name"]').fill('补填名称');
    await device.locator('[data-role="save"]').click();
    await expectSuccess(device, '补填名称');

    device = await openState('date-empty');
    await device.locator('[data-field="date"]').fill('2026-10-02');
    await device.locator('[data-role="save"]').click();
    await expectSuccess(device, '年度纪念日');

    device = await openState('date-invalid');
    await device.locator('[data-field="date"]').fill('2026-10-03');
    await device.locator('[data-role="save"]').click();
    await expectSuccess(device, '年度纪念日');

    device = await openState('api-failure');
    await device.locator('[data-role="save"]').click();
    await expectSuccess(device, '年度纪念日');

    device = await openState('form');
    await device.locator('[data-field="name"]').fill('重试纪念日');
    await device.locator('[data-field="date"]').fill('2026-10-04');
    await device.locator('[data-role="simulate-failure"]').check();
    await device.locator('[data-role="save"]').click();
    await page.waitForTimeout(500);
    assert.equal(await device.locator('.overlay').count(), 1, 'failure should keep modal open');
    assert.equal(await device.locator('[data-field="name"]').inputValue(), '重试纪念日');
    assert.equal(await device.locator('[data-field="date"]').inputValue(), '2026-10-04');
    assert.equal(await device.locator('[data-role="api-error"].show').count(), 1, 'failure message should be visible');
    await device.locator('[data-role="simulate-failure"]').uncheck();
    await device.locator('[data-role="save"]').click();
    await expectSuccess(device, '重试纪念日');

    device = await openState('success');
    assert.equal(await device.locator('.overlay').count(), 0, 'success entry should have no modal');
    assert.equal(await device.locator('.history-note').count(), 1, 'success entry should show completion note');

    await page.goto(prototypeUrl);
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicateIds, [], 'prototype should not repeat ids across tiled states');

    await page.goto(checklistUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('.status').first().click();
    await page.locator('[data-filter="pass"]').click();
    assert.equal(await page.locator('.item:not([hidden])').count(), 1, 'pass filter should show one item');
    assert.equal(await page.locator('.item[hidden]').count(), 10, 'pass filter should hide ten items');
    assert.equal(await page.locator('.item[hidden]').first().isVisible(), false, 'hidden checklist item should not render');
    await page.locator('[data-filter="pending"]').click();
    assert.equal(await page.locator('.item:not([hidden])').count(), 10, 'pending filter should show remaining items');

    assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join('; ')}`);
    console.log('PASS: all 6 prototype entries, close/cancel, validation recovery, failure retry, success, unique ids, and checklist filters');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

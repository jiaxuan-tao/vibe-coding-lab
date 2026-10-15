import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('.crop-row')).toHaveCount(5);
});

test('all seasons and ranking modes calculate real data and preserve settings', async ({ page }) => {
  await expect(page.locator('#result-count')).toHaveText('共 20 种');
  const first = await page.locator('.crop-row').first().textContent();
  await expect(page.locator('.crop-row').first().locator('.bar-fill')).toHaveAttribute('style', /width:100%/);
  await expect(page.locator('#crop-detail')).not.toContainText('价格为 0');
  await page.locator('#planted').fill('30');
  await page.locator('#planted').blur();
  await expect(page.locator('#result-context')).toContainText('30 块');
  await expect(page.locator('.crop-row').first()).not.toHaveText(first);
  await page.locator('[data-season="3"]').click();
  await expect(page.locator('.crop-row')).toHaveCount(2);
  await page.locator('[data-season="4"]').click();
  await expect(page.locator('#duration')).toBeVisible();
  await expect(page.locator('#current-day')).toBeHidden();
  await expect(page.locator('#result-count')).toHaveText('共 45 种');
  for (let metric = 0; metric <= 3; metric++) {
    await page.locator(`[data-metric="${metric}"]`).click();
    await expect(page.locator(`[data-metric="${metric}"]`)).toHaveAttribute('aria-pressed', 'true');
    if (metric >= 2) await expect(page.locator('.crop-value').first()).toContainText('%');
  }
  await page.reload();
  await expect(page.locator('#duration')).toBeVisible();
  await expect(page.locator('#planted')).toHaveValue('30');
  await expect(page.locator('[data-metric="3"]')).toHaveAttribute('aria-pressed', 'true');
});

test('six sale methods, fertilizer and profession dependencies are working', async ({ page }) => {
  await page.locator('#advanced summary').click();
  for (const value of ['0', '1', '2', '3', '4', '5']) {
    await page.locator('#produce').selectOption(value);
    await expect(page.locator('.crop-row')).toHaveCount(5);
    await expect(page.locator('#crop-results')).not.toContainText('NaN');
  }
  await page.locator('#produce').selectOption('2');
  await page.locator('#equipment').fill('10');
  await page.locator('#equipment').blur();
  await page.locator('#aging').selectOption('3');
  await page.locator('#fertilizer').selectOption('4');
  await expect(page.locator('#fertilizer-source')).toBeVisible();
  await expect(page.locator('#tiller')).toBeDisabled();
  await page.locator('#level').selectOption('10');
  await page.locator('#tiller').check();
  await page.locator('#profession').selectOption('2');
  await page.locator('#level').selectOption('0');
  await expect(page.locator('#tiller')).not.toBeChecked();
  await expect(page.locator('#profession')).toHaveValue('0');
  await expect(page.locator('#profession')).toBeDisabled();
});

test('empty source, invalid numeric input and reset recover cleanly', async ({ page }) => {
  await page.locator('#advanced summary').click();
  for (const source of ['pierre', 'joja', 'special']) await page.locator(`#seed-${source}`).uncheck();
  await expect(page.locator('.empty-state')).toContainText('还没有可比较的作物');
  await expect(page.locator('#crop-detail')).toBeHidden();
  await page.locator('#planted').fill('-5');
  await page.locator('#planted').blur();
  await expect(page.locator('#planted')).toHaveValue('1');
  await page.locator('#reset').click();
  await expect(page.locator('#planted')).toHaveValue('60');
  await expect(page.locator('.crop-row')).toHaveCount(5);
  await expect(page.locator('#advanced')).not.toHaveAttribute('open', '');
});

test('list view, all crops, details and explanations are accessible', async ({ page }) => {
  await page.locator('[data-view="table"]').click();
  await expect(page.locator('.result-table tbody tr')).toHaveCount(5);
  await page.locator('#show-all').click();
  await expect(page.locator('.result-table tbody tr')).toHaveCount(20);
  await page.locator('.result-table button').nth(7).click();
  await expect(page.locator('#crop-detail')).toContainText('销售收入');
  await page.locator('#help').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});

test('prediction remains stable for view toggles and changes only on recalculation', async ({ page }) => {
  await page.locator('#advanced summary').click();
  await page.locator('#prediction').check();
  const values = await page.locator('.crop-value').allTextContents();
  await page.locator('[data-view="table"]').click();
  await page.locator('[data-view="chart"]').click();
  expect(await page.locator('.crop-value').allTextContents()).toEqual(values);
  await page.locator('#recalculate').click();
  expect(await page.locator('.crop-value').allTextContents()).not.toEqual(values);
});

test('heavy prediction runs off main thread and cancelled work cannot replace a new season', async ({ page }) => {
  await page.locator('[data-season="4"]').click();
  await page.locator('#planted').fill('10000');
  await page.locator('#planted').blur();
  await page.locator('#duration').fill('1120');
  await page.locator('#duration').blur();
  await page.locator('#advanced summary').click();
  await page.locator('#prediction').check();
  await expect(page.locator('#crop-results')).toHaveAttribute('aria-busy', 'true');
  await page.locator('[data-season="3"]').click();
  await expect(page.locator('#result-count')).toHaveText('共 2 种');
  await expect(page.locator('#crop-results')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#result-context')).toContainText('冬季');
  await page.locator('#reset').click();
  await expect(page.locator('.crop-row')).toHaveCount(5);
});

test('large values fit on a narrow phone and show the full amount in details', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.locator('#planted').fill('10000');
  await page.locator('#planted').blur();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const value of await page.locator('.crop-value').all()) {
    expect(await value.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  await page.locator('.crop-row').first().click();
  await expect(page.locator('#detail-sheet-content')).toContainText('g');
  const metrics = page.locator('#detail-sheet-content .detail-metrics');
  expect(await metrics.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  for (const value of await metrics.locator('dd').all()) {
    expect(await value.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
});

test('coffee details distinguish cups from consumed beans', async ({ page }) => {
  await page.locator('#produce').selectOption('2');
  await page.locator('#advanced summary').click();
  await page.locator('#equipment').fill('1');
  await page.locator('#equipment').blur();
  await page.locator('#buy-seed').uncheck();
  await page.locator('#extra').check();
  await page.locator('#show-all').click();
  await page.locator('.crop-row[data-crop="coffeebean"]').click();
  await expect(page.locator('#crop-detail')).toContainText('出售数量 9 杯');
  await expect(page.locator('#crop-detail')).toContainText('加工消耗 45 份原料');
});

test('mill mode exposes raw fallback without irrelevant machine controls, including reload', async ({ page }) => {
  await page.locator('#advanced summary').click();
  await page.locator('#produce').selectOption('2');
  await page.locator('#sell-raw').uncheck();
  await page.locator('#produce').selectOption('5');
  await expect(page.locator('#sell-raw')).toBeVisible();
  await expect(page.locator('#sell-raw')).not.toBeChecked();
  await expect(page.locator('#equipment')).toBeHidden();
  await page.reload();
  await page.locator('#advanced summary').click();
  await expect(page.locator('#sell-raw')).toBeVisible();
  await expect(page.locator('#sell-raw')).not.toBeChecked();
  await page.locator('#sell-raw').check();
  await expect(page.locator('#crop-results')).not.toContainText('NaN');
});

test('ordinary five- and six-digit values fit their amount column on mobile and tablet', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    for (const planted of ['60', '600', '1200']) {
      await page.locator('#planted').fill(planted);
      await page.locator('#planted').blur();
      for (const value of await page.locator('.crop-value').all()) {
        expect(await value.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${width}/${planted}/${await value.textContent()}`).toBe(true);
      }
    }
  }
});

for (const size of [{ width: 1536, height: 1024 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 667 }]) {
  test(`layout, local assets and non-black text at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const failed = [];
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.reload();
    await expect(page.locator('.crop-row')).toHaveCount(5);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (size.width >= 1280) {
      const frame = await page.locator('.ledger-frame').boundingBox();
      expect(frame.y + frame.height).toBeLessThanOrEqual(size.height - 20);
    }
    expect(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().width && el.childNodes.length && getComputedStyle(el).color === 'rgb(0, 0, 0)').length)).toBe(0);
    const visibleRows = page.locator('.crop-row');
    for (let i = 0; i < 5; i++) {
      const row = await visibleRows.nth(i).boundingBox();
      const name = await visibleRows.nth(i).locator('.crop-name').boundingBox();
      const value = await visibleRows.nth(i).locator('.crop-value').boundingBox();
      expect(name.x + name.width).toBeLessThanOrEqual(value.x);
      expect(row.x + row.width).toBeLessThanOrEqual(size.width);
    }
    if (size.width <= 760) {
      await visibleRows.nth(1).click();
      await expect(page.locator('#detail-dialog')).toBeVisible();
      await expect(page.locator('#detail-sheet-content')).toContainText('净利润');
      await page.locator('[data-close="detail-dialog"]').click();
      await expect(page.locator('#detail-dialog')).toBeHidden();
    }
    await page.screenshot({ path: `test-results/layout-${size.width}.png`, fullPage: true });
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
}

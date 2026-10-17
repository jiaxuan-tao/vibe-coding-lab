import {expect, test, type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function enter(page: Page, a = '需求一：支持中文\n预算：100元', b = '需求一：支持中英文\n预算：200元') {
  await page.locator('.cm-content').nth(0).fill(a);
  await page.locator('.cm-content').nth(1).fill(b);
  await expect(page.locator('#summary .stat').first()).toBeVisible();
}

test('Chinese default and instant bilingual switch preserve text and names', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('.brand')).toHaveText('文本对比台');
  await expect(page.locator('#options-btn')).toContainText('对比设置');
  await enter(page, 'Options\n原文 😀', 'Original\n修改稿 🧑‍💻');
  await page.locator('#name-a').fill('Options');
  await page.locator('#ui-locale').selectOption('en');
  await expect(page.locator('#options-btn')).toContainText('Options');
  await expect(page.locator('.cm-content').nth(0)).toContainText('原文 😀');
  await expect(page.locator('#name-a')).toHaveValue('Options');
  await page.locator('#ui-locale').selectOption('zh-CN');
  await expect(page.locator('.cm-content').nth(1)).toContainText('Original');
  await expect(page.locator('.cm-content').nth(0)).toHaveAttribute('aria-label', '原文内容');
  await expect(page.locator('#name-a')).toHaveValue('Options');
});

test('English choice and theme survive reload', async ({page}) => {
  await page.goto('/');
  await page.locator('#ui-locale').selectOption('en');
  await page.locator('#theme').click();
  await page.locator('#theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('ignore options, errors and JSON structured comparison are Chinese', async ({page}) => {
  await page.goto('/');
  await enter(page, 'Hello', 'hello');
  await page.locator('#options-btn').click();
  await expect(page.locator('#options-panel')).toContainText('忽略大小写');
  await page.locator('#opt-case').check();
  await expect(page.locator('#summary')).toContainText('两侧内容相同');
  await page.locator('#opt-patterns').fill('[');
  await expect(page.locator('#patterns-error')).toContainText('正则无效');
  await page.keyboard.press('Escape');
  await enter(page, '{"price":100,"name":"便签"}', '{"price":200,"name":"便签"}');
  await page.locator('[data-view=data]').click();
  await expect(page.locator('#data-panel')).toContainText('price');
  await expect(page.locator('#data-panel')).toContainText('200');
});

test('saves, reopens, renames and deletes a Chinese comparison without translating user title', async ({page}) => {
  await page.goto('/');
  await enter(page);
  await page.locator('#save-btn').click();
  await page.locator('.modal-dialog input').fill('Options');
  await page.locator('.modal-dialog button[type=submit]').click();
  await expect(page.locator('.toast')).toContainText('已保存');
  await page.locator('#library-btn').click();
  await expect(page.locator('.item-title').first()).toHaveText('Options');
  await page.locator('.item-actions button[title="重命名"]').first().click();
  await page.locator('.modal-dialog input').fill('需求版本对比');
  await page.locator('.modal-dialog button[type=submit]').click();
  await expect(page.locator('.item-title').first()).toHaveText('需求版本对比');
  await page.reload();
  await page.locator('#library-btn').click();
  await page.locator('.item-open').first().click();
  await expect(page.locator('.cm-content').nth(1)).toContainText('200元');
  await page.locator('.item-actions button[title="删除"]').first().click();
  await expect(page.locator('.library-empty')).toContainText('尚无保存记录');
});

test('exports Chinese and English HTML reports with user content intact', async ({page}) => {
  await page.goto('/');
  await enter(page);
  for (const locale of ['zh-CN','en']) {
    await page.locator('#ui-locale').selectOption(locale);
    await page.locator('#export-btn').click();
    const pending = page.waitForEvent('download');
    await page.locator('[data-action=report]').click();
    const download = await pending;
    const html = await readFile((await download.path())!, 'utf8');
    expect(html).toContain(`lang="${locale}"`);
    expect(html).toContain(locale === 'zh-CN' ? '新增' : 'added');
    expect(html).toContain('预算');
  }
});

test('share requires acknowledgement and restores both versions', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.goto('/');
  await enter(page);
  await page.locator('#share').click();
  await expect(page.locator('#share-dialog')).toContainText('并未加密');
  await page.locator('#share-dialog button[value=cancel]').click();
  await expect(page.locator('#share-dialog')).not.toBeVisible();
  await page.locator('#share').click();
  await page.locator('#share-dialog button[value=confirm]').click();
  await expect(page.locator('.toast')).toContainText('已复制链接');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const fresh = await context.newPage();
  await fresh.goto(url);
  await expect(fresh.locator('.cm-content').nth(0)).toContainText('100元');
  await expect(fresh.locator('.cm-content').nth(1)).toContainText('200元');
  expect(fresh.url()).not.toContain('#v1:');
});

test('unsupported file errors are localized', async ({page}) => {
  await page.goto('/');
  await page.locator('#file-a').setInputFiles({name: '旧格式.doc',mimeType:'application/msword',buffer:Buffer.from('not word')});
  await expect(page.locator('.toast')).toContainText('不支持此格式');
});

test('mobile merge buttons have their own row instead of covering original text', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('#file-a').setInputFiles({name:'原文.txt',mimeType:'text/plain',buffer:Buffer.from('这是一段很长的中文原文，需要完整展示，不能被合并按钮遮挡。')});
  await page.locator('.cm-content').fill('这是修改后的内容');
  const original = page.locator('.cm-deletedChunk').first();
  await expect(original).toBeVisible();
  const controls = await original.locator('.cm-chunkButtons').boundingBox();
  const line = await original.locator('.cm-deletedLine').boundingBox();
  expect(controls!.y+controls!.height).toBeLessThanOrEqual(line!.y+1);
});

for (const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[320,568]]) {
  test(`layout and settings fit ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('/');
    await expect(page.locator('#editor')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const editor = await page.locator('#editor').boundingBox();
    expect(editor!.height).toBeGreaterThan(100);
    const footer = await page.locator('.site-footer').boundingBox();
    expect(footer!.y+footer!.height).toBeLessThanOrEqual(height+2);
    await page.locator('#options-btn').click();
    const menu = await page.locator('#options-panel').boundingBox();
    const toolbar = await page.locator('.topbar').boundingBox();
    if (width <= 1200) expect(menu!.y).toBeGreaterThanOrEqual(toolbar!.y+toolbar!.height);
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x+menu!.width).toBeLessThanOrEqual(width+1);
    expect(menu!.y+menu!.height).toBeLessThanOrEqual(height+1);
  });
}

test('service worker preserves sibling cache and supports offline reload', async ({page,context}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await caches.open('personal-workbench-sentinel');
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('.brand')).toHaveText('文本对比台');
  expect(await page.evaluate(async () => (await caches.keys()).includes('personal-workbench-sentinel'))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#options-btn')).toContainText('对比设置');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('default shell uses the new monochrome theme', async () => {
  const html = await read('index.html');
  assert.match(html, /data-theme="light"/);
  assert.match(html, /monochrome\.css/);
});

test('settings and startup have no cloud credential/sync UI', async () => {
  const settings = await read('js/views/settings.js');
  const app = await read('js/app.js');
  assert.doesNotMatch(settings, /getToken|setToken|pullOnBoot|pushNow|GitHub Personal Access Token/);
  assert.doesNotMatch(app, /pullOnBoot|onSync|store\.sync/);
  assert.match(settings, /importBackup/);
});

test('quotes never execute remote JavaScript', async () => {
  assert.doesNotMatch(await read('js/quotes.js'), /createElement\(['"]script['"]\)|eval\(|new Function/);
});

test('theme storage is scoped to this project', async () => {
  const util = await read('js/util.js');
  assert.match(util, /vcl\.personal-workbench\.theme/);
  assert.doesNotMatch(util, /getItem\('wb-theme'\)|setItem\('wb-theme'/);
});

test('service worker cannot delete or serve another project cache', async () => {
  const worker = await read('sw.js');
  assert.match(worker, /startsWith\(PREFIX\)/);
  assert.match(worker, /url\.pathname\.startsWith\(scopePath\)/);
  assert.doesNotMatch(worker, /github\.js|workbench-v17/);
});

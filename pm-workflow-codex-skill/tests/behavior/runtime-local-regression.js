const assert = require('assert');
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!playwrightModule) throw new Error('Set PLAYWRIGHT_MODULE to an existing local Playwright package.');
const { chromium } = require(playwrightModule);
const root = path.resolve(__dirname, '../..');
const python = process.env.PYTHON || 'python3';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function run(command, args) {
  const result = childProcess.spawnSync(command, args, { encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} failed\n${result.stdout}\n${result.stderr}`);
}

function startServer(project, readOnly) {
  const proc = childProcess.spawn(python, [path.join(__dirname, 'runtime-server-wrapper.py')], {
    env: {
      ...process.env,
      PROTOTYPE_PROJECT_DIR: project,
      PM_READ_ONLY: readOnly ? '1' : '0',
      PYTHONDONTWRITEBYTECODE: '1',
      PM_TEST_BROWSER_CHANNEL: process.env.PM_TEST_BROWSER_CHANNEL || 'chrome',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', chunk => { output += chunk; });
  proc.stderr.on('data', chunk => { output += chunk; });
  proc.output = () => output;
  return proc;
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => proc.once('exit', resolve)),
    sleep(3000).then(() => proc.kill('SIGKILL')),
  ]);
}

function readConfig(project) {
  return JSON.parse(fs.readFileSync(path.join(project, '.pm-workflow/runtime.json'), 'utf8'));
}

async function waitForHealth(project, expectedReadOnly, proc) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const config = readConfig(project);
    try {
      const response = await fetch(`http://127.0.0.1:${config.port}/api/health`);
      const health = await response.json();
      assert.equal(health.project_id, config.project_id);
      assert.equal(health.read_only, expectedReadOnly);
      return { config, health, baseUrl: `http://127.0.0.1:${config.port}` };
    } catch (error) {
      lastError = error;
      if (proc.exitCode !== null) throw new Error(`service exited ${proc.exitCode}: ${proc.output()}`);
      await sleep(100);
    }
  }
  throw lastError || new Error(`health timeout: ${proc.output()}`);
}

async function jsonRequest(baseUrl, config, route, payload, token = config.token, projectId = config.project_id) {
  const response = await fetch(baseUrl + route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PM-Project': projectId,
      'X-PM-Token': token,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return { response, data };
}

async function exportScreenshots(baseUrl, config, artifactPath, expectedCount) {
  const started = await jsonRequest(baseUrl, config, '/api/screenshot', {
    path: '/' + artifactPath,
    viewport: { width: 1440, height: 900 },
  });
  assert.equal(started.response.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.started, true);
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const response = await fetch(baseUrl + '/api/status', {
      headers: { 'X-PM-Project': config.project_id, 'X-PM-Token': config.token },
    });
    const state = await response.json();
    assert.equal(response.status, 200, JSON.stringify(state));
    if (state.done) {
      assert.equal(state.error, null, JSON.stringify(state));
      assert.equal(state.success_count, expectedCount, JSON.stringify(state));
      assert.equal(state.files.length, expectedCount);
      return state;
    }
    await sleep(100);
  }
  throw new Error(`screenshot timeout for ${artifactPath}`);
}

function assertPng(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.length > 1000, `${file} should contain a rendered PNG`);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
}

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-workflow-runtime-'));
  const project = path.join(temp, 'project');
  let service;
  let browser;
  try {
    const skillHashBefore = sha256(fs.readFileSync(path.join(root, 'SKILL.md')));
    run(python, [path.join(root, 'scripts/initialize.py'), '--project', project, '--no-launcher']);
    fs.cpSync(
      path.join(root, 'examples/tasay-anniversary-modal/纪念日新增弹窗'),
      path.join(project, '纪念日新增弹窗'),
      { recursive: true },
    );
    const prdRel = '纪念日新增弹窗/需求文档/纪念日新增弹窗-PRD.html';
    const fixture = path.join(project, prdRel);

    service = startServer(project, true);
    let state = await waitForHealth(project, true, service);
    let result = await jsonRequest(state.baseUrl, state.config, '/api/revision', { path: '/' + prdRel });
    assert.equal(result.response.status, 403, 'read-only service must reject writes');
    await stopServer(service);

    service = startServer(project, false);
    state = await waitForHealth(project, false, service);
    const { config, baseUrl } = state;
    result = await jsonRequest(baseUrl, config, '/api/revision', { path: '/' + prdRel }, 'wrong-token');
    assert.equal(result.response.status, 403, 'wrong project token must be rejected');
    result = await jsonRequest(
      baseUrl, config, '/api/revision',
      { path: '/' + prdRel },
      config.token, 'wrong-project',
    );
    assert.equal(result.response.status, 403, 'wrong project id must be rejected');

    result = await jsonRequest(baseUrl, config, '/api/revision', { path: '/etc/passwd' });
    assert.equal(result.response.status, 400, 'paths outside the project must be rejected');

    fs.writeFileSync(path.join(project, 'root.html'), '<!doctype html><title>root</title>');
    result = await jsonRequest(baseUrl, config, '/api/revision', { path: '/root.html' });
    assert.equal(result.response.status, 400, 'project root is not a writable artifact directory');
    assert.match(result.data.error, /不允许保存/);

    result = await jsonRequest(baseUrl, config, '/api/revision', { path: '/' + prdRel });
    assert.equal(result.response.status, 200);
    const before = fs.readFileSync(fixture);
    const updated = before.toString('utf8') + '\n<!-- isolated save -->\n';
    const revision = result.data.revision;
    result = await jsonRequest(baseUrl, config, '/api/save-html', {
      path: '/' + prdRel, content: updated, revision,
    });
    assert.equal(result.response.status, 200, JSON.stringify(result.data));
    assert.equal(fs.readFileSync(fixture, 'utf8'), updated);
    assert(fs.existsSync(path.join(project, result.data.backup)));
    assert.deepEqual(fs.readFileSync(path.join(project, result.data.backup)), before);
    result = await jsonRequest(baseUrl, config, '/api/save-html', {
      path: '/' + prdRel, content: updated, revision,
    });
    assert.equal(result.response.status, 409, 'stale revision must not overwrite newer content');

    const prototypeRel = '纪念日新增弹窗/原型/纪念日新增弹窗-prototype.html';
    const prototypeExport = await exportScreenshots(baseUrl, config, prototypeRel, 6);
    const realProject = fs.realpathSync(project);
    prototypeExport.files.forEach(file => {
      assert.equal(path.dirname(file), path.join(realProject, '纪念日新增弹窗/原型截图'));
      assertPng(file);
    });
    const flowRel = '纪念日新增弹窗/流程图/纪念日新增弹窗-flow.html';
    const flowExport = await exportScreenshots(baseUrl, config, flowRel, 1);
    assert.equal(path.dirname(flowExport.files[0]), path.join(realProject, '纪念日新增弹窗/流程图截图'));
    assertPng(flowExport.files[0]);
    const prdSource = fs.readFileSync(fixture, 'utf8');
    const actualPrototypeSrcs = Array.from(
      prdSource.matchAll(/<iframe class="prototype-iframe" src="([^"]+)"/g),
      match => match[1],
    );
    assert.equal(actualPrototypeSrcs.length, 6);
    for (const actualSrc of actualPrototypeSrcs) {
      const pageId = actualSrc.split('#')[1];
      result = await jsonRequest(baseUrl, config, '/api/snapshot', {
        src: actualSrc,
        base: '/' + prdRel,
        scale: 2,
        viewport: { width: 1440, height: 900 },
      });
      assert.equal(result.response.status, 200, `${pageId}: ${JSON.stringify(result.data)}`);
      assert.equal(result.data.ok, true);
      assert.equal(result.data.page_id, pageId);
      assert.match(result.data.dataUrl, /^data:image\/png;base64,/);
    }

    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({ acceptDownloads: true });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:', 'file:'].includes(url.protocol)) {
        return route.continue();
      }
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      Object.defineProperty(window, 'ClipboardItem', { configurable: true, value: undefined });
      delete window.showSaveFilePicker;
    });
    await page.goto(`${baseUrl}/${encodePath(prdRel)}`);
    await page.evaluate(() => {
      document.addEventListener('copy', () => {
        const selection = window.getSelection();
        const holder = document.createElement('div');
        if (selection && selection.rangeCount) holder.appendChild(selection.getRangeAt(0).cloneContents());
        window.__copyCapture = {
          text: selection ? selection.toString() : '',
          iframeCount: holder.querySelectorAll('iframe').length,
          dataImageCount: Array.from(holder.querySelectorAll('img')).filter(img => /^data:image\//.test(img.src)).length,
        };
      }, { once: true });
    });
    await page.locator('.copy-all-fab').click();
    await page.waitForFunction(() => document.querySelector('.copy-toast').textContent.includes('已复制全文（含 7 张图）'));
    const copied = await page.evaluate(() => window.__copyCapture);
    assert(copied, 'real execCommand copy event should fire');
    assert(copied.text.includes('纪念日新增弹窗'));
    assert.equal(copied.iframeCount, 0);
    assert.equal(copied.dataImageCount, 7);

    await page.evaluate(() => {
      window.__nativeSave = { chunks: [], closed: false };
      window.showSaveFilePicker = async () => ({ createWritable: async () => ({
        write: async chunk => window.__nativeSave.chunks.push(String(chunk)),
        close: async () => { window.__nativeSave.closed = true; },
      }) });
    });
    await page.locator('.save-btn').click();
    await page.waitForFunction(() => window.__nativeSave.closed);
    const nativeSave = await page.evaluate(() => window.__nativeSave.chunks.join(''));
    assert(nativeSave.includes('<!DOCTYPE html>'));
    assert(nativeSave.includes('纪念日新增弹窗 · 产品需求文档'));

    await page.evaluate(() => { delete window.showSaveFilePicker; });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.save-btn').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), '纪念日新增弹窗-PRD.html');
    const downloaded = path.join(temp, 'downloaded-PRD.html');
    await download.saveAs(downloaded);
    const downloadedHtml = fs.readFileSync(downloaded, 'utf8');
    assert(downloadedHtml.includes('<!DOCTYPE html>'));
    assert(downloadedHtml.includes('纪念日新增弹窗 · 产品需求文档'));
    assert.match(await page.locator('#saveNote').textContent(), /已下载 PRD 副本/);

    await page.locator('#dualPaneToggle').click();
    await page.locator('#pageSelect').selectOption('success');
    await page.waitForFunction(() => document.getElementById('prototypeFrame').src.endsWith('#success'));
    const frame = page.frameLocator('#prototypeFrame');
    await frame.locator('.device-wrapper.active[data-page="success"]').waitFor();
    await frame.locator('body').evaluate(() => showPage('api-failure'));
    await page.waitForFunction(() => document.getElementById('pageSelect').value === 'api-failure');

    await page.goto('about:blank');
    await page.goto(`${baseUrl}/${encodePath(prdRel)}#preview=date-invalid`);
    await page.waitForFunction(() => document.body.classList.contains('dual-pane'));
    assert.equal(await page.locator('#pageSelect').inputValue(), 'date-invalid');
    await page.waitForFunction(() => document.getElementById('prototypeFrame').src.endsWith('#date-invalid'));

    await page.goto(`${baseUrl}/${encodePath(prototypeRel)}#form`);
    await page.locator('.device-wrapper.active .device').waitFor();

    await page.goto(`${baseUrl}/${encodePath(flowRel)}`);
    await page.locator('.chart-container').waitFor();

    assert.equal(sha256(fs.readFileSync(path.join(root, 'SKILL.md'))), skillHashBefore);
    assert.deepEqual(browserErrors, [], `browser errors: ${browserErrors.join('; ')}`);

    await stopServer(service);
    service = null;
    await page.goto(pathToFileURL(fixture).href);
    await page.evaluate(() => {
      document.addEventListener('copy', () => { window.__offlineCopyEvent = true; }, { once: true });
    });
    await page.locator('.copy-all-fab').click();
    await page.waitForFunction(() => document.querySelector('.copy-toast').textContent.includes('导出服务未启动，已按纯文本复制（原型图缺失）'));
    assert.equal(await page.evaluate(() => window.__offlineCopyEvent), true);
    console.log(`PASS runtime local validation: ${project}`);
    console.log('PASS health read-only, identity/path/revision save, fallbacks, preview sync, and /api/screenshot PNG exports');
  } finally {
    if (browser) await browser.close();
    await stopServer(service);
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

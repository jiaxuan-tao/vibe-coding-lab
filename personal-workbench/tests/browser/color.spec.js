import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const routes = ['dashboard', 'todos', 'work', 'notes', 'ideas', 'ai', 'ledger', 'learning', 'info', 'stocks', 'settings'];
const isNeutral = value => new Set(value.match(/\d+/g).slice(0, 3).map(Number)).size === 1;
const contrast = (a, b) => {
  const lum = value => value.match(/\d+/g).slice(0, 3).map(Number).map(n => {
    const x = n / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  return (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
};

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.clock.setFixedTime(new Date('2026-10-29T12:00:00+08:00'));
  await context.route('**/*', r => new URL(r.request().url()).origin === new URL(baseURL).origin ? r.continue() : r.abort());
  await page.goto('./?demo=1#/dashboard');
});

async function go(page, route) {
  await page.evaluate(id => { location.hash = '#/' + id; }, route);
  await expect(page.locator(`#nav [data-id="${route}"]`)).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#view h1')).toBeVisible();
}

for (const theme of ['light', 'dark']) {
  test(`semantic colors: ${theme} neutral shell, distinct states and readable status text`, async ({ page }) => {
    await page.evaluate(async theme => (await import('./js/util.js')).setTheme(theme), theme);
    const result = await page.evaluate(() => {
      const read = node => { const s = getComputedStyle(node); return { color: s.color, bg: s.backgroundColor }; };
      const states = ['info', 'success', 'warning', 'danger'].map(name => {
        const n = document.createElement('span');
        n.style.cssText = `color:var(--${name});background:var(--${name}-soft)`;
        document.body.append(n); const value = read(n); n.remove(); return value;
      });
      const n = document.createElement('button'); n.className = 'btn btn-primary'; document.body.append(n);
      const primary = read(n); n.remove();
      return { states, primary, body: read(document.body), progress: getComputedStyle(document.querySelector('.project-progress + .progress i')).backgroundColor,
        checked: getComputedStyle(document.querySelector('.week-dots .on')).backgroundColor };
    });
    expect(isNeutral(result.body.bg)).toBe(true);
    expect(isNeutral(result.body.color)).toBe(true);
    expect(isNeutral(result.primary.bg)).toBe(true);
    expect(contrast(result.primary.color, result.primary.bg)).toBeGreaterThanOrEqual(4.5);
    expect(new Set(result.states.map(s => s.color)).size).toBe(4);
    for (const state of result.states) {
      expect(isNeutral(state.color)).toBe(false);
      expect(contrast(state.color, state.bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(result.progress).toBe(result.states[0].color);
    expect(isNeutral(result.checked)).toBe(false);
    await go(page, 'todos');
    const high = page.locator('.todo-item').filter({ hasText: '对照评测集' }).locator('.tag');
    expect(await high.evaluate(n => getComputedStyle(n).color)).toBe(result.states[2].color);
    await page.locator('.todo-item').filter({ hasText: '对照评测集' }).getByRole('button', { name: '完成', exact: true }).click();
    const done = page.locator('.todo-item.done .td-check').first();
    const doneColors = await done.evaluate(n => ({ fg: getComputedStyle(n).color, bg: getComputedStyle(n).backgroundColor }));
    expect(contrast(doneColors.fg, doneColors.bg)).toBeGreaterThanOrEqual(4.5);
    const tagColors = await page.locator('.todo-item.done .tag').first().evaluate(n => ({ fg: getComputedStyle(n).color, bg: getComputedStyle(n).backgroundColor }));
    expect.soft(contrast(tagColors.fg, tagColors.bg)).toBeGreaterThanOrEqual(4.5);
    await go(page, 'learning');
    const green = page.getByRole('button', { name: '今日打卡', exact: true });
    await green.hover();
    await green.evaluate(n => Promise.all(n.getAnimations().map(a => a.finished)));
    const hover = await green.evaluate(n => {
      const s = getComputedStyle(n);
      return { fg: s.color, bg: s.backgroundColor, opacity: s.opacity };
    });
    expect(hover.opacity).toBe('1');
    expect(contrast(hover.fg, hover.bg)).toBeGreaterThanOrEqual(4.5);
  });
}

test('built-in views and success feedback contain no emoji; weather uses line icons', async ({ page }) => {
  for (const route of routes) {
    await go(page, route);
    expect(await page.locator('#view').innerText(), route).not.toMatch(/[\p{Emoji_Presentation}\uFE0F]/u);
  }
  await go(page, 'info');
  await expect(page.locator('.weather-now .ic svg')).toHaveCount(1);
  await expect(page.locator('.forecast svg')).toHaveCount(3);
  await go(page, 'learning');
  await page.getByRole('button', { name: '今日打卡', exact: true }).click();
  expect(await page.locator('#toast-root').innerText()).not.toMatch(/[\p{Emoji_Presentation}\uFE0F]/u);
});

test('chart colors follow labels, not ranking; income and expense match their legend', async ({ page }) => {
  await go(page, 'ledger');
  const colors = await page.evaluate(async () => {
    const { donutChart } = await import('./js/charts.js');
    const a = donutChart([{ label: '餐饮', value: 100 }, { label: '交通', value: 20 }]);
    const b = donutChart([{ label: '交通', value: 100 }, { label: '餐饮', value: 20 }]);
    const strokes = chart => [...chart.svg.querySelectorAll('circle')].slice(1).map(n => n.getAttribute('stroke'));
    return [strokes(a), strokes(b)];
  });
  expect(colors[0][0]).toBe(colors[1][1]);
  expect(colors[0][1]).toBe(colors[1][0]);
  expect(colors[0][0]).not.toBe(colors[0][1]);
  const categoryColors = await page.evaluate(async () => {
    const { categoryColor } = await import('./js/charts.js');
    return ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '教育', '其他', '学习', '订阅', '日用'].map(categoryColor);
  });
  expect(new Set(categoryColors).size).toBe(categoryColors.length);
  const series = await page.evaluate(() => {
    const color = node => getComputedStyle(node).fill;
    const income = document.querySelector('rect[data-series="income"]');
    const expense = document.querySelector('rect[data-series="expense"]');
    const legend = [...document.querySelectorAll('[data-legend]')].map(n => getComputedStyle(n).color);
    return { income: income && color(income), expense: expense && color(expense), legend };
  });
  expect(series.income).toBeTruthy();
  expect(series.expense).not.toBe(series.income);
  expect(series.legend).toEqual([series.income, series.expense]);
});

test('overdue unfinished tasks use a textual warning; completed past tasks are not overdue', async ({ page }) => {
  await page.evaluate(async () => (await import('./js/store.js')).store.update(d => {
    d.todos.push({ id: 'color-overdue', title: '未完成的逾期待办', date: '2026-10-28', done: false });
  }));
  await go(page, 'todos');
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await expect(page.locator('.todo-item').filter({ hasText: '未完成的逾期待办' })).toContainText('已逾期');
  await expect(page.locator('.todo-item').filter({ hasText: '复盘引用缺失的失败样例' })).not.toContainText('已逾期');
});

test('color screenshots: dashboard, ledger and information in both themes and viewport sizes', async ({ page }) => {
  const folder = new URL('../../docs/images/', import.meta.url); await mkdir(folder, { recursive: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(async t => (await import('./js/util.js')).setTheme(t), theme);
      for (const route of ['dashboard', 'ledger', 'info']) {
        await go(page, route);
        await page.screenshot({ path: fileURLToPath(new URL(`color-${route}-${theme}-${width}.png`, folder)), animations: 'disabled', fullPage: true });
      }
    }
  }
});

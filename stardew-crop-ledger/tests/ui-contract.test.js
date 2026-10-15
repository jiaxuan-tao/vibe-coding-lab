import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('all original calculation controls are represented in the redesigned UI', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8').catch(() => '');
  for (const id of ['seasons', 'current-day', 'duration', 'planted', 'budget', 'produce', 'fertilizer', 'level', 'advanced', 'equipment', 'aging', 'cross-season', 'seed-pierre', 'seed-joja', 'seed-special', 'buy-seed', 'buy-fert', 'replant', 'nextyear', 'fertilizer-source', 'tiller', 'profession', 'foraging-level', 'gatherer', 'botanist', 'food', 'prediction', 'recalculate', 'extra', 'disable-links', 'crop-results', 'crop-detail', 'reset', 'help-dialog']) {
    assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
  }
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /type="module" src="app.js"/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
});

test('type and icons use warm colors, never pure black', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8').catch(() => '');
  assert.doesNotMatch(css, /(?:#000(?:000)?\b|color:\s*black\b|rgb\(0,\s*0,\s*0\))/i);
  assert.match(css, /--ink:\s*#5[0-9a-f]{5}/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /letter-spacing:\s*0/);
});

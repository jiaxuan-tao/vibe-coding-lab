import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeData } from '../js/data.js';

const demo = await import('../js/demo.js').catch(() => ({}));

test('demo exposes a separate explicit URL mode and date-aware data factory', () => {
  assert.equal(typeof demo.createDemoData, 'function');
  assert.equal(typeof demo.alignDemoDates, 'function');
  assert.equal(typeof demo.isDemoLocation, 'function');
  assert.equal(demo.isDemoLocation({ search: '?demo=1' }), true);
  for (const search of ['', '?demo=0', '?demo=true', '?notdemo=1']) {
    assert.equal(demo.isDemoLocation({ search }), false);
  }
  assert.equal(demo.isDemoLocation(), false);
});

test('all demo modules contain valid coherent editable data, with Wuhan and no cloud settings', () => {
  assert.equal(typeof demo.createDemoData, 'function');
  const data = demo.createDemoData('2026-10-29');
  assert.deepEqual(normalizeData(data), data);
  for (const key of ['todos', 'events', 'notes', 'inspirations', 'prompts', 'ledger']) {
    assert.ok(data[key].length >= 3, key);
  }
  assert.ok(data.work.plans.length >= 4);
  assert.ok(data.work.logs.length >= 3);
  assert.ok(data.learning.plans.length >= 3);
  assert.ok(data.stocks.trades.length >= 3);
  assert.equal(data.settings.weatherCity, 'wuhan');
  assert.equal(data.settings.quotesEnabled, false);
  assert.ok(data.todos.filter(t => !t.done && t.date === '2026-10-29').length >= 3);
  assert.ok(data.events.some(t => t.date === '2026-10-29'));
  assert.ok(data.notes.some(n => n.title.includes('知识库')));
  assert.ok(data.stocks.trades.every(t => t.note.includes('模拟')));
});

test('date rollover keeps edits, identifiers, completion and un-dated tasks, including month/year edges', () => {
  assert.equal(typeof demo.createDemoData, 'function');
  for (const [from, to] of [['2026-10-29', '2026-10-30'], ['2026-10-31', '2026-11-01'], ['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29']]) {
    const original = demo.createDemoData(from);
    const today = original.todos.find(t => t.date === from);
    today.title = '保留自定义编辑'; today.done = true;
    const aligned = demo.alignDemoDates(original, to);
    assert.deepEqual(normalizeData(aligned), aligned);
    assert.equal(aligned.todos.find(t => t.id === today.id).date, to);
    assert.equal(aligned.todos.find(t => t.id === today.id).title, '保留自定义编辑');
    assert.equal(aligned.todos.find(t => t.id === today.id).done, true);
    assert.equal(original.todos.find(t => t.id === today.id).date, from);
    assert.ok(aligned.todos.some(t => t.date === ''));
    assert.ok(aligned.work.plans.some(p => p.month === to.slice(0, 7)));
    assert.ok(aligned.ledger.some(r => r.date.startsWith(to.slice(0, 7)) && r.type === 'in'));
    assert.ok(aligned.ledger.some(r => r.date.startsWith(to.slice(0, 7)) && r.type === 'out'));
    assert.equal(demo.alignDemoDates(aligned, to).meta.device, aligned.meta.device);
  }
});

test('date adaptation never moves an unmarked personal/imported backup and rejects invalid dates', () => {
  assert.equal(typeof demo.alignDemoDates, 'function');
  const personal = normalizeData({ todos: [{ id: 'real', title: '真实安排', date: '2026-01-01' }] });
  assert.deepEqual(demo.alignDemoDates(personal, '2026-10-29'), personal);
  for (const date of ['2026-02-30', 'not-a-date', '2026-13-01']) {
    assert.throws(() => demo.createDemoData(date), TypeError);
  }
});

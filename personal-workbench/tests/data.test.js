import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyData, normalizeData, parseBackup, serializeBackup } from '../js/data.js';

function fixture() {
  return {
    meta: { updatedAt: 123, device: 'legacy-device' },
    todos: [{ id: 't1', title: 'Task', done: false, priority: 'mid', date: '', createdAt: 1 }],
    events: [{ id: 'e1', title: 'Meeting', date: '2024-02-29', note: '' }],
    notes: [{ id: 'n1', title: '', body: '<img src=x onerror=alert(1)>', tags: ['tag'], updatedAt: 2 }],
    inspirations: [{ id: 'i1', text: 'Idea', tags: [], createdAt: 3 }],
    prompts: [{ id: 'p1', title: 'Prompt', content: '<b>Literal markup</b>' }],
    ledger: [{ id: 'l1', type: 'out', amount: 12.5, category: 'Custom', note: '', date: '2026-10-16' }],
    learning: { plans: [{ id: 'lp1', name: 'Learn', goal: '', progress: 30 }], checkins: ['2024-02-29'] },
    work: {
      plans: [{ id: 'wp1', month: '2026-10', title: 'Plan', note: '', done: true, createdAt: 4 }],
      logs: [{ id: 'wl1', date: '2026-10-16', focus: 'Focus', install: 'Install', civil: 'Civil', sub: 'Sub', other: 'Other', content: 'Legacy', createdAt: 5, updatedAt: 6 }],
      focus: { '2026-10': '<b>Monthly focus</b>' },
    },
    stocks: {
      trades: [{ id: 'st1', code: 'usAAPL', side: 'buy', price: 10.2, qty: 100, date: '2026-10-16', note: '', createdAt: 7 }],
      watchlist: [{ code: 'sh000001' }],
      notes: [{ id: 'sn1', code: '', title: 'Stock note', body: 'Body', updatedAt: 8 }],
    },
    settings: { displayName: 'Local user', weatherCity: 'kunming', quotesEnabled: false },
  };
}

test('empty data has independent collections and the three upstream indexes', () => {
  const a = createEmptyData();
  assert.deepEqual(a.stocks.watchlist, [{ code: 'sh000001' }, { code: 'sz399001' }, { code: 'sz399006' }]);
  assert.equal(a.meta.updatedAt, 0);
  a.todos.push({});
  a.stocks.watchlist[0].code = 'changed';
  assert.equal(createEmptyData().todos.length, 0);
  assert.equal(createEmptyData().stocks.watchlist[0].code, 'sh000001');
  assert.deepEqual(normalizeData({}), createEmptyData());
});

test('all legitimate upstream fields round-trip without interpreting HTML strings', () => {
  const input = fixture();
  const result = normalizeData(input);
  assert.deepEqual(result, input);
  result.notes[0].tags.push('new');
  assert.deepEqual(input.notes[0].tags, ['tag']);
  const backup = serializeBackup(input);
  assert.deepEqual(JSON.parse(backup), { format: 'vibe-personal-workbench', version: 1, data: input });
  assert.deepEqual(parseBackup(backup), input);
  assert.deepEqual(parseBackup(JSON.stringify(input)), input);
});

test('older partial modules receive defaults but explicit empty watchlists stay empty', () => {
  const result = normalizeData({ work: { logs: [{ id: 'old', date: '2026-10-16', content: 'Legacy' }] }, stocks: { watchlist: [] } });
  assert.equal(result.work.logs[0].content, 'Legacy');
  assert.deepEqual(result.work.plans, []);
  assert.deepEqual(result.work.focus, {});
  assert.deepEqual(result.stocks.watchlist, []);
});

test('online quotes default off, allow a boolean opt-in, and preserve safe local settings', () => {
  assert.equal(createEmptyData().settings.quotesEnabled, false);
  assert.deepEqual(normalizeData({ settings: {} }).settings, { quotesEnabled: false });
  assert.deepEqual(normalizeData({ settings: { displayName: '', weatherCity: 'beijing', quotesEnabled: true } }).settings,
    { displayName: '', weatherCity: 'beijing', quotesEnabled: true });
  for (const value of ['true', 1, null, {}]) {
    assert.throws(() => normalizeData({ settings: { quotesEnabled: value } }), TypeError);
  }
});

for (const value of [null, [], 'text', 1, true, new Date(), Object.create({ todos: [] })]) {
  test(`rejects non-plain root ${String(value)}`, () => assert.throws(() => normalizeData(value), TypeError));
}

for (const key of ['todos', 'events', 'notes', 'inspirations', 'prompts', 'ledger']) {
  test(`rejects invalid array/record shapes in ${key}`, () => {
    assert.throws(() => normalizeData({ [key]: {} }), TypeError);
    assert.throws(() => normalizeData({ [key]: [null] }), TypeError);
    assert.throws(() => normalizeData({ [key]: new Array(1) }), TypeError);
  });
}

for (const [module, keys] of Object.entries({ learning: ['plans', 'checkins'], work: ['plans', 'logs'], stocks: ['trades', 'watchlist', 'notes'] })) {
  for (const key of keys) {
    test(`rejects invalid nested array ${module}.${key}`, () => {
      assert.throws(() => normalizeData({ [module]: { [key]: {} } }), TypeError);
      assert.throws(() => normalizeData({ [module]: { [key]: [null] } }), TypeError);
    });
  }
}

test('rejects unknown fields, credentials, unsafe keys, prototypes, symbols, and accessors', () => {
  for (const raw of [
    { unknown: [] }, { settings: { token: 'secret' } }, { settings: { githubToken: 'secret' } },
    { meta: { updatedAt: 1, extra: true } },
    { todos: [{ id: 'x', title: 'Task', extra: 'hidden' }] },
    JSON.parse('{"__proto__":{"polluted":true}}'),
    JSON.parse('{"settings":{"constructor":{"prototype":{"polluted":true}}}}'),
    JSON.parse('{"work":{"focus":{"__proto__":"x"}}}'),
    { settings: new Date() }, { [Symbol('hidden')]: 'x' },
  ]) assert.throws(() => normalizeData(raw), TypeError);
  let called = false;
  const raw = Object.defineProperty({}, 'todos', { get() { called = true; return []; } });
  assert.throws(() => normalizeData(raw), TypeError);
  assert.equal(called, false);
  assert.equal({}.polluted, undefined);
});

test('requires record identity and required content fields', () => {
  const input = fixture();
  for (const collection of [input.todos, input.events, input.notes, input.inspirations, input.prompts, input.ledger, input.learning.plans, input.work.plans, input.work.logs, input.stocks.trades, input.stocks.notes]) {
    delete collection[0].id;
    assert.throws(() => normalizeData(input), TypeError);
    collection[0].id = 'restored';
  }
  assert.throws(() => normalizeData({ todos: [{ id: 't' }] }), TypeError);
  assert.throws(() => normalizeData({ todos: [{ id: '', title: 'Task' }] }), TypeError);
});

test('rejects duplicate IDs within every record collection and duplicate keyed entries', () => {
  for (const path of ['todos', 'events', 'notes', 'inspirations', 'prompts', 'ledger', 'learning.plans', 'work.plans', 'work.logs', 'stocks.trades', 'stocks.notes']) {
    const input = fixture();
    const array = path.split('.').reduce((value, key) => value[key], input);
    array.push({ ...array[0] });
    assert.throws(() => normalizeData(input), TypeError, path);
  }
  assert.throws(() => normalizeData({ learning: { checkins: ['2026-10-16', '2026-10-16'] } }), TypeError);
  assert.throws(() => normalizeData({ stocks: { watchlist: [{ code: 'a' }, { code: 'a' }] } }), TypeError);
});

test('validates finite nonnegative numeric amounts, prices, quantities, timestamps, and bounded progress', () => {
  for (const value of [-1, NaN, Infinity, -Infinity, '10', null]) {
    for (const [path, key] of [['ledger', 'amount'], ['stocks.trades', 'price'], ['stocks.trades', 'qty'], ['learning.plans', 'progress'], ['todos', 'createdAt']]) {
      const input = fixture();
      path.split('.').reduce((v, k) => v[k], input)[0][key] = value;
      assert.throws(() => normalizeData(input), TypeError, `${path}.${key}`);
    }
    assert.throws(() => normalizeData({ meta: { updatedAt: value } }), TypeError);
  }
  const input = fixture();
  input.learning.plans[0].progress = 101;
  assert.throws(() => normalizeData(input), TypeError);
  input.learning.plans[0].progress = 100;
  input.ledger[0].amount = 0;
  input.stocks.trades[0].price = 0;
  input.stocks.trades[0].qty = 0;
  assert.doesNotThrow(() => normalizeData(input));
});

test('validates calendar dates and month keys without date rollover', () => {
  for (const date of ['2023-02-29', '2024-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '0000-01-01', '2026-1-01', '2026-01-01T00:00:00Z', '']) {
    for (const path of ['events', 'ledger', 'work.logs', 'stocks.trades']) {
      const input = fixture();
      path.split('.').reduce((v, k) => v[k], input)[0].date = date;
      assert.throws(() => normalizeData(input), TypeError);
    }
    if (date) {
      const input = fixture(); input.todos[0].date = date;
      assert.throws(() => normalizeData(input), TypeError);
    }
    assert.throws(() => normalizeData({ learning: { checkins: [date] } }), TypeError);
  }
  for (const month of ['2026-13', '2026-00', '2026-1', '0000-01', '2026-01-01']) {
    const input = fixture(); input.work.plans[0].month = month;
    assert.throws(() => normalizeData(input), TypeError);
    assert.throws(() => normalizeData({ work: { focus: { [month]: 'Focus' } } }), TypeError);
  }
});

test('validates enums, booleans, text types, and tag element types', () => {
  for (const [path, key, value] of [['todos', 'priority', 'urgent'], ['todos', 'done', 1], ['ledger', 'type', 'income'], ['stocks.trades', 'side', 'hold'], ['notes', 'body', {}], ['notes', 'tags', [1]], ['work.plans', 'done', 'false']]) {
    const input = fixture(); path.split('.').reduce((v, k) => v[k], input)[0][key] = value;
    assert.throws(() => normalizeData(input), TypeError);
  }
  assert.throws(() => normalizeData({ settings: { displayName: 1 } }), TypeError);
});

test('enforces documented collection and text limits', () => {
  assert.throws(() => normalizeData({ todos: Array.from({ length: 10001 }, (_, n) => ({ id: `t${n}`, title: 'Task' })) }), TypeError);
  const input = fixture();
  input.notes[0].body = 'x'.repeat(200001);
  assert.throws(() => normalizeData(input), TypeError);
  input.notes[0].body = '';
  input.notes[0].tags = Array.from({ length: 101 }, () => 'tag');
  assert.throws(() => normalizeData(input), TypeError);
  input.notes[0].tags = [];
  input.todos[0].title = 'x'.repeat(1001);
  assert.throws(() => normalizeData(input), TypeError);
  assert.throws(() => normalizeData({ settings: { displayName: 'x'.repeat(201) } }), TypeError);
});

test('rejects malformed backups, unsupported envelopes, and UTF-8 payloads above 5 MiB', () => {
  for (const text of ['', '{', 'null', '[]', '1', '"text"', '{"format":"other","version":1,"data":{}}', '{"format":"vibe-personal-workbench","version":2,"data":{}}', '{"format":"vibe-personal-workbench","version":1}', '{"format":"vibe-personal-workbench","version":1,"data":{},"token":"secret"}']) {
    assert.throws(() => parseBackup(text), TypeError);
  }
  assert.throws(() => parseBackup({}), TypeError);
  assert.throws(() => parseBackup(' '.repeat(5 * 1024 * 1024 + 1)), TypeError);
  assert.throws(() => parseBackup(`{"notes":[],"settings":{"displayName":"${'\u4e2d'.repeat(1800000)}"}}`), TypeError);
  const large = createEmptyData();
  large.notes = Array.from({ length: 30 }, (_, n) => ({ id: `n${n}`, title: '', body: 'x'.repeat(200000), tags: [], updatedAt: 0 }));
  assert.throws(() => serializeBackup(large), TypeError);
});

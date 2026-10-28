import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, store, StorageWriteError, STORAGE_KEY } from '../js/store.js';
import { createEmptyData, parseBackup, serializeBackup } from '../js/data.js';
import { createDemoData, alignDemoDates } from '../js/demo.js';

function storageWith(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    reads: [], writes: [], failWrite: false,
    getItem(key) { this.reads.push(key); return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.failWrite) throw new Error('Quota exceeded');
      this.writes.push([key, value]); values.set(key, value);
    },
    removeItem(key) { values.delete(key); },
    raw(key = STORAGE_KEY) { return values.get(key); },
  };
}

function addTodo(d) { d.todos.push({ id: 't1', title: 'Task', done: false, priority: 'mid', date: '', createdAt: 1 }); }

test('a configured demo store reads and writes only its own key, leaving personal bytes unchanged', () => {
  const key = 'vcl.personal-workbench.demo.v1';
  const personal = '  {"settings":{"displayName":"私人空间"}}\n';
  const storage = storageWith({ [STORAGE_KEY]: personal });
  const initialData = createEmptyData(); addTodo(initialData);
  const local = createStore({ storage, storageKey: key, initialData });
  assert.equal(local.data.todos.length, 1);
  assert.deepEqual(storage.reads, [key]);
  assert.equal(storage.writes.length, 0);
  local.update(d => { d.todos[0].done = true; });
  assert.deepEqual(storage.writes.map(([k]) => k), [key]);
  assert.equal(storage.raw(), personal);
  const reloaded = createStore({ storage, storageKey: key, initialData });
  assert.equal(reloaded.data.todos[0].done, true);
  reloaded.importBackup('{}');
  assert.equal(storage.raw(), personal);
});

test('prepareData adapts loaded demo content without startup writes or bypassing conflict checks', () => {
  const key = 'vcl.personal-workbench.demo.v1';
  const storage = storageWith({ [key]: '{}' });
  const local = createStore({ storage, storageKey: key, prepareData: d => { if (!d.todos.length) addTodo(d); return d; } });
  assert.equal(local.data.todos.length, 1);
  assert.equal(storage.writes.length, 0);
  storage.setItem(key, '{"settings":{"displayName":"其他页面"}}');
  assert.throws(() => local.update(() => {}), StorageWriteError);
});

test('a page editing across midnight aligns existing demo records before adding newly dated records', () => {
  let day = '2026-10-31';
  const storage = storageWith();
  const local = createStore({ storage, storageKey: 'demo', initialData: createDemoData(day), prepareData: d => alignDemoDates(d, day) });
  day = '2026-11-01';
  local.update(d => {
    d.todos.push({ id: 'new-day', title: '跨日后新增', date: day });
    d.work.plans.push({ id: 'new-month', title: '跨月后新增', month: '2026-11' });
  });
  assert.equal(local.data.meta.device, 'demo-v1:2026-11-01');
  const reloaded = createStore({ storage, storageKey: 'demo', prepareData: d => alignDemoDates(d, day) });
  assert.equal(reloaded.data.todos.find(t => t.id === 'new-day').date, day);
  assert.equal(reloaded.data.work.plans.find(t => t.id === 'new-month').month, '2026-11');
});

test('old demo backups align at import time, not on a later reload', () => {
  const local = createStore({ storage: storageWith(), storageKey: 'demo', prepareData: d => alignDemoDates(d, '2026-11-01') });
  local.importBackup(serializeBackup(createDemoData('2026-10-29')));
  assert.equal(local.data.meta.device, 'demo-v1:2026-11-01');
  assert.ok(local.data.todos.some(t => t.date === '2026-11-01'));
  assert.ok(local.data.work.plans.some(t => t.month === '2026-11'));
});

test('singleton imports without browser globals and reports unavailable storage honestly', () => {
  assert.ok(store.data);
  assert.equal(store.status.state, 'error');
  assert.ok(store.loadError);
  const local = createStore({ storage: null });
  assert.equal(local.status.state, 'error');
  assert.throws(() => local.update(addTodo), StorageWriteError);
  assert.deepEqual(local.data.todos, []);
});

test('only reads its own namespace and performs no startup writes or old-key migration', () => {
  assert.equal(STORAGE_KEY, 'vcl.personal-workbench.data.v1');
  const storage = storageWith({ 'workbench.data.v1': '{"todos":["private"]}', 'workbench.gh.token': 'secret' });
  const local = createStore({ storage });
  assert.deepEqual(storage.reads, [STORAGE_KEY]);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(local.data, createEmptyData());
  assert.equal(local.status.state, 'saved');
  assert.equal(local.loadError, null);
  assert.equal('getToken' in local, false);
  assert.equal('pushNow' in local, false);
  assert.equal('sync' in local, false);
});

test('successful update writes before publishing and reports source and timestamp', () => {
  const storage = storageWith();
  const local = createStore({ storage, now: () => 1234 });
  const previous = local.data;
  const changes = [], statuses = [];
  local.onStatus(status => statuses.push(status));
  local.onChange(source => {
    assert.equal(parseBackup(storage.raw()).todos[0].title, local.data.todos[0].title);
    changes.push(source);
  });
  assert.equal(local.update(addTodo, { source: 'test' }), true);
  assert.equal(previous.todos.length, 0);
  assert.notEqual(local.data, previous);
  assert.equal(local.data.meta.updatedAt, 1234);
  assert.deepEqual(changes, ['test']);
  assert.equal(statuses.at(-1).state, 'saved');
  assert.equal(local.status.state, 'saved');
  assert.deepEqual(storage.writes.map(([key]) => key), [STORAGE_KEY]);
});

test('quota/write failure throws typed error and keeps prior snapshot, disk, and change listeners untouched', () => {
  const storage = storageWith();
  const local = createStore({ storage });
  local.update(addTodo);
  const previous = local.data, disk = storage.raw();
  let changed = 0;
  const statuses = [];
  local.onChange(() => changed++);
  local.onStatus(status => statuses.push(status));
  storage.failWrite = true;
  assert.throws(() => local.update(d => { d.todos[0].title = 'Unsaved'; }), error => {
    assert.ok(error instanceof StorageWriteError);
    assert.equal(error.name, 'StorageWriteError');
    assert.match(error.cause.message, /Quota/);
    return true;
  });
  assert.equal(local.data, previous);
  assert.equal(storage.raw(), disk);
  assert.equal(changed, 0);
  assert.equal(local.status.state, 'error');
  assert.ok(local.status.message);
  assert.equal(statuses.at(-1).state, 'error');
  storage.failWrite = false;
  assert.equal(local.update(d => { d.todos[0].title = 'Saved again'; }), true);
  assert.equal(local.status.state, 'saved');
});

test('mutator exceptions and invalid drafts never write or publish', () => {
  const storage = storageWith();
  const local = createStore({ storage });
  const previous = local.data;
  const failure = new Error('Mutator failed');
  assert.throws(() => local.update(d => { addTodo(d); throw failure; }), error => error === failure);
  assert.throws(() => local.update(d => { d.ledger.push({ id: 'bad', amount: NaN }); }), TypeError);
  assert.throws(() => local.update(async d => { addTodo(d); }), TypeError);
  assert.equal(local.data, previous);
  assert.equal(storage.writes.length, 0);
});

test('published snapshots and captured drafts cannot bypass the transactional update', () => {
  const local = createStore({ storage: storageWith() });
  let draft;
  local.update(d => { draft = d; addTodo(d); });
  draft.todos[0].title = 'Changed outside transaction';
  assert.equal(local.data.todos[0].title, 'Task');
  assert.throws(() => { local.data.todos[0].title = 'Direct mutation'; }, TypeError);
  assert.throws(() => { local.data = createEmptyData(); }, TypeError);
});

test('loads both bare data and versioned backups while preserving meta.updatedAt', () => {
  const input = createEmptyData(); input.meta.updatedAt = 2468; addTodo(input);
  for (const raw of [JSON.stringify(input), serializeBackup(input)]) {
    const storage = storageWith({ [STORAGE_KEY]: raw });
    const local = createStore({ storage });
    assert.equal(local.data.meta.updatedAt, 2468);
    assert.equal(local.data.todos[0].title, 'Task');
    assert.equal(storage.writes.length, 0);
    assert.equal(local.loadError, null);
  }
});

test('corrupt and invalid stored data remain byte-for-byte intact and expose loadError', () => {
  for (const raw of ['{broken', '', 'null', '{"todos":{}}', '{"settings":{"token":"secret"}}']) {
    const storage = storageWith({ [STORAGE_KEY]: raw });
    const local = createStore({ storage });
    assert.deepEqual(local.data, createEmptyData());
    assert.ok(local.loadError instanceof Error);
    assert.equal(local.status.state, 'error');
    assert.equal(storage.raw(), raw);
    assert.equal(storage.writes.length, 0);
  }
});

test('exposes the exact initial local text as a readonly recovery snapshot, including empty text', () => {
  for (const raw of ['{broken\n  ', '', '\ufeff{invalid}', '  {"todos":{}}\n']) {
    const storage = storageWith({ [STORAGE_KEY]: raw });
    const local = createStore({ storage });
    assert.equal(local.rawLocalData, raw);
    assert.throws(() => { local.rawLocalData = 'replacement'; }, TypeError);
    assert.equal(storage.raw(), raw);
    assert.equal(storage.writes.length, 0);
  }
  assert.equal(createStore({ storage: storageWith() }).rawLocalData, null);
  assert.equal(createStore({ storage: null }).rawLocalData, null);
  const valid = '  {}\n';
  assert.equal(createStore({ storage: storageWith({ [STORAGE_KEY]: valid }) }).rawLocalData, valid);
});

test('unresolved loadError blocks update before calling the mutator or changing disk/state', () => {
  const raw = '{broken\n';
  const storage = storageWith({ [STORAGE_KEY]: raw });
  const local = createStore({ storage });
  const previous = local.data, loadError = local.loadError;
  let called = false;
  const changes = [], statuses = [];
  local.onChange(source => changes.push(source));
  local.onStatus(status => statuses.push(status));
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.throws(() => local.update(d => { called = true; addTodo(d); }), error => {
      assert.ok(error instanceof StorageWriteError);
      assert.equal(error.cause, loadError);
      return true;
    });
  }
  assert.equal(called, false);
  assert.equal(local.data, previous);
  assert.equal(local.loadError, loadError);
  assert.equal(local.rawLocalData, raw);
  assert.equal(storage.raw(), raw);
  assert.deepEqual(storage.writes, []);
  assert.deepEqual(changes, []);
  assert.equal(statuses.length, 2);
  assert.ok(statuses.every(status => status.state === 'error'));
});

test('only a successful explicit import recovers a loadError and enables normal updates', () => {
  const raw = '{broken';
  const storage = storageWith({ [STORAGE_KEY]: raw });
  const local = createStore({ storage });
  const loadError = local.loadError, previous = local.data;
  assert.throws(() => local.importBackup('{invalid'), TypeError);
  assert.equal(local.loadError, loadError);
  assert.throws(() => local.update(addTodo), StorageWriteError);
  storage.failWrite = true;
  assert.throws(() => local.importBackup('{}'), StorageWriteError);
  assert.equal(local.loadError, loadError);
  assert.equal(local.data, previous);
  assert.equal(storage.raw(), raw);
  assert.throws(() => local.update(addTodo), StorageWriteError);
  storage.failWrite = false;
  assert.equal(local.importBackup('{}'), true);
  assert.equal(local.loadError, null);
  assert.equal(local.status.state, 'saved');
  assert.equal(local.rawLocalData, raw);
  assert.equal(local.update(addTodo), true);
  assert.equal(local.data.todos[0].title, 'Task');
});

test('an unreadable initial store requires a fresh known baseline before explicit recovery', () => {
  const raw = '{broken';
  const storage = storageWith({ [STORAGE_KEY]: raw });
  const getItem = storage.getItem;
  storage.getItem = () => { throw new Error('Access denied'); };
  const local = createStore({ storage });
  assert.equal(local.rawLocalData, null);
  assert.throws(() => local.update(addTodo), StorageWriteError);
  assert.equal(storage.raw(), raw);
  assert.equal(storage.writes.length, 0);
  storage.getItem = getItem;
  assert.throws(() => local.importBackup('{}'), StorageWriteError);
  assert.ok(local.loadError);
  assert.equal(storage.raw(), raw);
  assert.equal(storage.writes.length, 0);
  const refreshed = createStore({ storage });
  assert.equal(refreshed.importBackup('{}'), true);
  assert.equal(refreshed.loadError, null);
  assert.equal(refreshed.update(addTodo), true);
});

test('a stale second instance cannot overwrite another instance or refresh its editor snapshot', () => {
  const storage = storageWith();
  const first = createStore({ storage, now: () => 7 });
  const stale = createStore({ storage, now: () => 7 });
  const previous = stale.data;
  const changes = [], statuses = [];
  stale.onChange(source => changes.push(source));
  stale.onStatus(status => statuses.push(status));
  first.update(addTodo);
  const raw = storage.raw(), writes = storage.writes.length;
  let draft;
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.throws(() => stale.update(d => {
      draft = d;
      d.todos.push({ id: 'second', title: 'Unsaved editor content' });
    }), error => {
      assert.ok(error instanceof StorageWriteError);
      assert.match(error.message, /保留.*刷新.*重试/);
      assert.doesNotMatch(error.message, /[a-z]/i);
      return true;
    });
  }
  assert.equal(stale.data, previous);
  assert.equal(draft.todos[0].title, 'Unsaved editor content');
  assert.equal(stale.data.todos.length, 0);
  assert.equal(stale.loadError, null);
  assert.equal(stale.rawLocalData, null);
  assert.equal(storage.raw(), raw);
  assert.equal(storage.writes.length, writes);
  assert.deepEqual(changes, []);
  assert.equal(statuses.length, 2);
  assert.ok(statuses.every(status => status.state === 'error'));
  assert.equal(parseBackup(raw).todos[0].id, 't1');
});

test('compares exact persisted values even when timestamps and data versions are unchanged', () => {
  const input = createEmptyData(); input.meta.updatedAt = 7;
  const storage = storageWith({ [STORAGE_KEY]: JSON.stringify(input) });
  const first = createStore({ storage, now: () => 7 });
  const second = createStore({ storage, now: () => 7 });
  first.update(addTodo);
  assert.equal(first.data.meta.updatedAt, second.data.meta.updatedAt);
  assert.throws(() => second.update(d => { d.settings.displayName = 'Stale'; }), StorageWriteError);
  assert.equal(parseBackup(storage.raw()).todos[0].id, 't1');
});

test('own successful writes advance the baseline, but quota failures do not', () => {
  const storage = storageWith({ [STORAGE_KEY]: '  {}\n' });
  const local = createStore({ storage });
  assert.equal(local.update(addTodo), true);
  assert.equal(local.update(d => { d.todos[0].title = 'Second save'; }), true);
  const raw = storage.raw();
  storage.failWrite = true;
  assert.throws(() => local.update(d => { d.todos[0].title = 'Failed save'; }), StorageWriteError);
  assert.equal(storage.raw(), raw);
  storage.failWrite = false;
  assert.equal(local.update(d => { d.todos[0].title = 'Retry'; }), true);
  assert.equal(local.rawLocalData, '  {}\n');
  assert.equal(local.importBackup('{}'), true);
  assert.equal(local.update(addTodo), true);
});

test('a deleted or differently encoded persisted value is a conflict, not an empty baseline', () => {
  for (const replacement of [null, ' {}\n']) {
    const storage = storageWith({ [STORAGE_KEY]: '{}' });
    const local = createStore({ storage });
    if (replacement === null) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, replacement);
    const writes = storage.writes.length;
    const previous = local.data;
    assert.throws(() => local.update(addTodo), StorageWriteError);
    assert.equal(local.data, previous);
    assert.equal(storage.raw() ?? null, replacement);
    assert.equal(storage.writes.length, writes);
  }
});

test('checks the baseline after the mutator, immediately before writing', () => {
  const storage = storageWith();
  const first = createStore({ storage });
  const second = createStore({ storage });
  assert.throws(() => second.update(d => {
    d.settings.displayName = 'Unsaved';
    first.update(addTodo);
  }), StorageWriteError);
  assert.equal(storage.writes.length, 1);
  assert.equal(parseBackup(storage.raw()).todos[0].id, 't1');
  assert.equal(second.data.settings.displayName, undefined);
});

test('a reentrant own commit cannot make an older outer draft look current', () => {
  const storage = storageWith();
  const local = createStore({ storage });
  assert.throws(() => local.update(d => {
    d.settings.displayName = 'Older outer draft';
    local.update(addTodo);
  }), StorageWriteError);
  assert.equal(storage.writes.length, 1);
  assert.equal(local.data.todos[0].id, 't1');
  assert.equal(local.data.settings.displayName, undefined);
  assert.equal(parseBackup(storage.raw()).todos[0].id, 't1');
});

test('explicit import also rejects a concurrent change and requires refresh before retry', () => {
  for (const initial of [null, '{broken']) {
    const storage = storageWith(initial === null ? {} : { [STORAGE_KEY]: initial });
    const first = createStore({ storage });
    const stale = createStore({ storage });
    const previous = stale.data, loadError = stale.loadError;
    const changes = [];
    stale.onChange(source => changes.push(source));
    first.importBackup('{}');
    first.update(addTodo);
    const raw = storage.raw(), writes = storage.writes.length;
    assert.throws(() => stale.importBackup('{}'), error => {
      assert.ok(error instanceof StorageWriteError);
      assert.match(error.message, /保留.*刷新.*重试/);
      return true;
    });
    assert.equal(stale.data, previous);
    assert.equal(stale.loadError, loadError);
    assert.equal(stale.rawLocalData, initial);
    assert.equal(storage.raw(), raw);
    assert.equal(storage.writes.length, writes);
    assert.deepEqual(changes, []);
    const refreshed = createStore({ storage });
    assert.equal(refreshed.importBackup('{}'), true);
    assert.deepEqual(parseBackup(storage.raw()).todos, []);
  }
});

test('a failed pre-write read throws StorageWriteError without writing or losing its baseline', () => {
  const storage = storageWith();
  const local = createStore({ storage });
  local.update(addTodo);
  const previous = local.data, raw = storage.raw(), writes = storage.writes.length;
  const getItem = storage.getItem;
  storage.getItem = () => { throw new Error('Read denied'); };
  assert.throws(() => local.update(d => { d.todos[0].title = 'Unsaved'; }), error => {
    assert.ok(error instanceof StorageWriteError);
    assert.match(error.cause.message, /Read denied/);
    return true;
  });
  assert.equal(local.data, previous);
  assert.equal(storage.raw(), raw);
  assert.equal(storage.writes.length, writes);
  storage.getItem = getItem;
  assert.equal(local.update(d => { d.todos[0].title = 'Retry'; }), true);
});

test('default status and write-error UI messages use Chinese without exposing raw English causes', () => {
  const local = createStore({ storage: storageWith() });
  assert.equal(local.status.message, '数据仅保存在本机。');
  local.update(() => {});
  assert.equal(local.status.message, '已保存到本机。');
  const error = new StorageWriteError();
  assert.equal(error.message, '本地保存失败，修改未保存，原有数据未被覆盖。');
  const failing = storageWith();
  const blocked = createStore({ storage: failing });
  failing.failWrite = true;
  assert.throws(() => blocked.update(addTodo), thrown => thrown.message === error.message);
  assert.equal(blocked.status.message, error.message);
  for (const storage of [null, storageWith({ [STORAGE_KEY]: '{broken' })]) {
    const warning = createStore({ storage });
    assert.match(warning.status.message, /[\u4e00-\u9fff]/);
    assert.doesNotMatch(warning.status.message, /[a-z]/i);
    assert.throws(() => warning.update(addTodo), thrown => {
      assert.ok(thrown instanceof StorageWriteError);
      assert.match(thrown.message, /[\u4e00-\u9fff]/);
      assert.doesNotMatch(thrown.message, /[a-z]/i);
      assert.equal(warning.status.message, thrown.message);
      return true;
    });
  }
});

test('unreadable storage and throwing global localStorage access do not crash initialization', () => {
  const local = createStore({ storage: { getItem() { throw new Error('Access denied'); }, setItem() { throw new Error('Access denied'); } } });
  assert.ok(local.loadError);
  assert.equal(local.status.state, 'error');
  assert.throws(() => local.update(addTodo), StorageWriteError);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    const denied = createStore();
    assert.equal(denied.status.state, 'error');
    assert.ok(denied.loadError);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('even non-Error storage exceptions become load warnings without crashing', () => {
  for (const failure of [null, undefined, 'denied', { reason: 'denied' }]) {
    const local = createStore({ storage: {
      getItem() { throw failure; },
      setItem() { throw failure; },
    } });
    assert.equal(local.status.state, 'error');
    assert.ok(local.loadError instanceof Error);
    assert.throws(() => local.update(addTodo), StorageWriteError);
  }
});

test('import is full replacement, preserves backup timestamp, and publishes only after persistence', () => {
  const storage = storageWith();
  const local = createStore({ storage, now: () => 9999 });
  local.update(addTodo);
  const replacement = createEmptyData(); replacement.meta.updatedAt = 42;
  replacement.prompts.push({ id: 'p', title: 'Imported', content: '<script>literal</script>' });
  const events = [];
  local.onChange(source => events.push(source));
  assert.equal(local.importBackup(serializeBackup(replacement)), true);
  assert.deepEqual(local.data, replacement);
  assert.deepEqual(parseBackup(storage.raw()), replacement);
  assert.deepEqual(events, ['import']);
  assert.deepEqual(parseBackup(local.exportBackup()), replacement);
  assert.equal(JSON.parse(local.exportBackup()).format, 'vibe-personal-workbench');
});

test('invalid or unwritable imports are atomic and do not erase existing data', () => {
  const storage = storageWith();
  const local = createStore({ storage }); local.update(addTodo);
  const previous = local.data, raw = storage.raw();
  assert.throws(() => local.importBackup('{"todos":"invalid"}'), TypeError);
  assert.equal(local.data, previous);
  assert.equal(storage.raw(), raw);
  storage.failWrite = true;
  assert.throws(() => local.importBackup('{}'), StorageWriteError);
  assert.equal(local.data, previous);
  assert.equal(storage.raw(), raw);
});

test('change/status subscriptions unsubscribe and listener errors do not undo a committed write', () => {
  const local = createStore({ storage: storageWith() });
  const sources = [], statuses = [];
  const unsubscribe = local.onChange(source => sources.push(source));
  const unsubscribeStatus = local.onStatus(status => statuses.push(status.state));
  local.onChange(() => { throw new Error('Consumer failure'); });
  local.onStatus(() => { throw new Error('Consumer failure'); });
  assert.equal(local.update(() => {}), true);
  local.emitChange('manual');
  assert.deepEqual(sources, ['local', 'manual']);
  assert.deepEqual(statuses, ['saved']);
  unsubscribe(); unsubscribeStatus();
  assert.equal(local.update(() => {}), true);
  assert.deepEqual(sources, ['local', 'manual']);
  assert.deepEqual(statuses, ['saved']);
});

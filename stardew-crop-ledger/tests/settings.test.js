import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, computationOptions, loadState, saveState } from '../settings.js';

test('date translates to remaining days, greenhouse uses its own duration', () => {
  const s = createState();
  s.currentDay = 14;
  assert.equal(computationOptions(s).days, 15);
  s.options.crossSeason = true;
  assert.equal(computationOptions(s).days, 43);
  s.options.season = 4;
  s.duration = 112;
  assert.equal(computationOptions(s).days, 112);
});

test('corrupt or unavailable storage never prevents using calculator', () => {
  assert.deepEqual(loadState({ getItem: () => '{invalid' }), createState());
  assert.deepEqual(loadState({ getItem: () => { throw Error('denied'); } }), createState());
  assert.equal(saveState(createState(), { setItem: () => { throw Error('full'); } }), false);
});

test('restore sanitizes invalid days, enums and independent nested preferences', () => {
  const loaded = loadState({ getItem: () => JSON.stringify({ currentDay: 999, duration: -1, view: 'wrong', options: { planted: -20, season: 999, seeds: null } }) });
  assert.equal(loaded.currentDay, 28);
  assert.equal(loaded.duration, 1);
  assert.equal(loaded.view, 'chart');
  assert.ok(loaded.options.planted >= 1);
  assert.ok(loaded.options.season >= 0 && loaded.options.season <= 4);
  const a = createState(), b = createState();
  a.options.seeds.pierre = false;
  assert.equal(b.options.seeds.pierre, true);
});

test('saved settings round trip without losing selected mode or advanced choices', () => {
  let json;
  const storage = { setItem: (_, value) => { json = value; }, getItem: () => json };
  const state = createState();
  state.currentDay = 6;
  state.options.produce = 2;
  state.view = 'table';
  assert.equal(saveState(state, storage), true);
  const restored = loadState(storage);
  assert.equal(restored.currentDay, 6);
  assert.equal(restored.options.produce, 2);
  assert.equal(restored.view, 'table');
});

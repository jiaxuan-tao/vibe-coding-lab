import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const engine = await import('../engine.js').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const { calculate, normalizeOptions, DEFAULT_OPTIONS, CROP_NAMES } = engine;
const read = name => fs.readFileSync(new URL(`../vendor/${name}`, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const originalSource = name => read(name).replace(/export \{[^}]+\};/g, '').replace(/^import .*;\n*/gm, '');

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function reference(options) {
  const context = vm.createContext({ Math: Object.assign(Object.create(Math), { random: randomFor(options.predictionSeed) }) });
  for (const name of ['crops.js', 'data.js', 'upstream-predictions.js', 'upstream-core.js']) {
    vm.runInContext(originalSource(name), context);
  }
  context.options = plain(options);
  vm.runInContext('fetchCrops(); valueCrops(); sortCrops();', context);
  return { rows: structuredClone(context.cropList), context };
}

function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `nonfinite: ${value}`);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}

function compatibilityReasons(crop, options) {
  const field = { 1: 'jarType', 2: 'kegType', 4: 'dehydratorType', 5: 'millType' }[options.produce];
  const processed = field && crop.produce[field] != null;
  const reasons = [];
  if (processed && options.predictionModel && options.produce !== 5) reasons.push('E1/E2/E4 predicted processing');
  if (options.replant) reasons.push('E3 reserved seed ledger');
  if (crop.isWildseed && options.skills.botanist) reasons.push('E5 iridium-only Botanist');
  if (options.produce === 2 && crop.produce.kegType === 'Coffee') reasons.push('E6 five-bean batches');
  if (processed && options.sellExcess && options.fertilizer === 5) reasons.push('gold-quality subtraction');
  if (processed && options.sellExcess && !options.predictionModel && crop.produce.extraPerc * crop.planted % 1 !== 0)
    reasons.push('fractional remainder was previously dropped');
  const goldChance = 0.2 * ((options.level + options.foodLevel) / 10) +
    0.2 * (options.fertilizer === 5 ? 3 : options.fertilizer === 2 ? 2 : options.fertilizer === 1 ? 1 : 0) *
    ((options.level + options.foodLevel + 2) / 12) + 0.01;
  if (!crop.isWildseed && goldChance > 1) reasons.push('quality event probability capped at one');
  return reasons;
}

function checkCompatibility(input, stats) {
  const options = normalizeOptions(input);
  const legacy = reference(options).rows;
  const actual = calculate(input);
  assert.equal(actual.length, legacy.length);
  for (const crop of actual) {
    const old = legacy.find(value => value.id === crop.id);
    for (const key of ['id', 'name', 'img', 'url', 'seeds', 'growth', 'isWildseed', 'planted', 'harvests',
      'seedLoss', 'fertLoss', 'netExpenses', 'averageSeedLoss', 'averageFertLoss', 'drawSeedLoss', 'drawFertLoss']) {
      assert.deepEqual(crop[key], old[key], `${crop.key}/${key}`);
    }
    const staticProduce = value => Object.fromEntries(Object.entries(value).filter(([key]) =>
      !['regular', 'silver', 'gold', 'iridium', 'extraProduced'].includes(key)));
    assert.deepEqual(staticProduce(crop.produce), staticProduce(old.produce));
    const fields = ['profit', 'averageProfit', 'totalReturnOnInvestment', 'averageReturnOnInvestment', 'drawProfit'];
    const changed = fields.some(key => Math.abs(crop[key] - old[key]) > 1e-8 * Math.max(1, Math.abs(old[key])));
    if (changed) {
      const reasons = compatibilityReasons(crop, options);
      assert.ok(reasons.length, `unclassified economic deviation ${crop.key}: ${JSON.stringify(input)}`);
      stats.changed++;
    } else stats.unchanged++;
    const m = crop.profitData.material;
    const balance = m.seedReserved + m.processedInput + m.rawSold + m.unsold;
    assert.ok(Math.abs(m.totalProduced - balance) < 1e-7);
    for (const amount of [m.seedReserved, m.processedInput, m.rawSold, m.unsold]) assert.ok(amount >= 0);
    finiteTree(crop);
  }
}

test('minimal source snapshots and MIT license match pinned upstream commit', () => {
  const hashes = {
    'crops.js': 'd378420b4b1176364a99ba63c50851bf04fe884af1097c524da730d8905ce798',
    'data.js': '171379b12de9606a0386cc1e6af6138db807fbafe2292178758d01ede0b1b81e',
    'upstream-predictions.js': '83abeb7e47b4ba4daab31f20ffffa4e633b52065470b3d423367323d19512347',
    'upstream-core.js': '3e30c34a17d64530408b46d1b43174813a08363233d4cc0f1103a7317706b6ab',
    'LICENSE.txt': '4f73340d714f17267b22e2e5bcfe7e0990e0fd0618559068f41125f2402d6c1e',
  };
  for (const [file, hash] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(originalSource(file).trimEnd()).digest('hex'), hash, file);
  }
});

test('exports the browser engine contract with useful defaults', () => {
  assert.equal(typeof calculate, 'function');
  assert.equal(typeof normalizeOptions, 'function');
  assert.equal(DEFAULT_OPTIONS.season, 1);
  assert.equal(DEFAULT_OPTIONS.planted, 60);
  assert.equal(DEFAULT_OPTIONS.days, 28);
  assert.equal(DEFAULT_OPTIONS.fertilizer, 0);
  assert.equal(DEFAULT_OPTIONS.buySeed, true);
  assert.equal(DEFAULT_OPTIONS.buyFert, true);
  assert.equal(DEFAULT_OPTIONS.average, 0);
  assert.deepEqual(normalizeOptions(), DEFAULT_OPTIONS);
});

test('57 original scenarios keep unchanged economics and classify corrected branches against untouched oracle', t => {
  const cases = [];
  for (let season = 0; season <= 4; season++) {
    for (let produce = 0; produce <= 5; produce++) {
      cases.push({ season, produce, days: season === 4 ? 112 : 28 });
    }
  }
  for (let fertilizer = 0; fertilizer <= 6; fertilizer++) {
    cases.push({ fertilizer, fertilizerSource: 1, level: 10, skills: { till: true, agri: true } });
  }
  for (let average = 0; average <= 3; average++) {
    cases.push({ average }, { average, buySeed: false, buyFert: false });
  }
  cases.push(
    { season: 0, crossSeason: true, days: 56, replant: true, nextyear: true },
    { season: 1, crossSeason: true, days: 40, level: 7, foodIndex: 6 },
    { season: 2, crossSeason: true, days: 56 },
    { season: 3, crossSeason: true, days: 56 },
    { maxSeedMoney: 300, seeds: { pierre: false, joja: true, special: false } },
    { seeds: { pierre: false, joja: false, special: true }, buySeed: false },
    { season: 3, foragingLevel: 10, skills: { gatherer: true, botanist: true } },
    { season: 0, replant: true, nextyear: true, planted: 80 },
    { season: 4, produce: 2, equipment: 8, aging: 3, level: 10, skills: { till: true, arti: true } },
    { season: 4, produce: 4, byHarvest: true, equipment: 4 },
    { season: 4, produce: 4, byHarvest: false, equipment: 4 },
    { season: 4, produce: 5, sellRaw: true },
  );
  const stats = { unchanged: 0, changed: 0 };
  for (const input of cases) checkCompatibility(input, stats);
  assert.ok(stats.unchanged > 0 && stats.changed > 0);
  t.diagnostic(`57 scenarios: ${stats.unchanged} unchanged crop economics; ${stats.changed} classified corrections`);
});

test('predictions are reproducible and six original scenarios classify corrected processing branches', t => {
  const stats = { unchanged: 0, changed: 0 };
  for (let produce = 0; produce <= 5; produce++) {
    const input = { season: 4, produce, days: 56, planted: 20, predictionModel: true, predictionSeed: 12345, equipment: 3, byHarvest: true };
    assert.deepEqual(calculate(input), calculate(input));
    checkCompatibility(input, stats);
  }
  const input = { predictionModel: true, planted: 100 };
  assert.notDeepEqual(calculate({ ...input, predictionSeed: 1 }), calculate({ ...input, predictionSeed: 2 }));
  t.diagnostic(`6 scenarios: ${stats.unchanged} unchanged crop economics; ${stats.changed} classified corrections`);
});

test('normalization clamps every number, parses booleans, and enforces profession dependencies', () => {
  const normalized = normalizeOptions({
    season: 999, produce: -1, planted: -20, days: 0, fertilizer: 100, equipment: '8.9',
    maxSeedMoney: Infinity, average: NaN, level: -10, foragingLevel: -2,
    aging: -2, fertilizerSource: 999, foodIndex: 999, foodLevel: -100,
    buySeed: 'false', buyFert: 'true', predictionModel: '0', predictionSeed: -1,
    seeds: { pierre: 'false', joja: '1', special: 0 },
    skills: { till: true, agri: true, arti: true, gatherer: true, botanist: true },
    nextyear: true,
  });
  assert.equal(normalized.season, 4);
  assert.equal(normalized.produce, 0);
  assert.equal(normalized.planted, 0);
  assert.equal(normalized.days, 1);
  assert.equal(normalized.equipment, 8);
  assert.equal(normalized.buySeed, false);
  assert.equal(normalized.buyFert, true);
  assert.equal(normalized.predictionModel, false);
  assert.equal(normalized.nextyear, false);
  assert.deepEqual(normalized.skills, { till: false, agri: false, arti: false, gatherer: false, botanist: false });
  assert.deepEqual(normalized.seeds, { pierre: false, joja: true, special: false });
  const skills = normalizeOptions({ level: 10, foragingLevel: 10, skills: { till: true, agri: true, arti: true, gatherer: true, botanist: true } }).skills;
  assert.equal(skills.agri && skills.arti, false);
  assert.equal(skills.botanist, true);
  assert.equal(normalizeOptions({ foodIndex: 6 }).foodLevel, 3);
  assert.equal(normalizeOptions({ days: 56, crossSeason: true }).days, 56);
  assert.equal(normalizeOptions({ days: 56 }).days, 28);
  finiteTree(normalized);
});

test('malformed and zero inputs never produce NaN or Infinity', () => {
  for (const input of [null, [], 'bad', { planted: 0 }, { days: 0 }, { days: Infinity },
    { seeds: null, skills: null }, { seeds: { pierre: false, joja: false, special: false } },
    { season: 4, days: Number.MAX_VALUE, planted: Number.MAX_VALUE, maxSeedMoney: Number.MAX_VALUE },
    { season: 0, planted: 2, maxSeedMoney: 1, replant: true, nextyear: true },
    { planted: Symbol('invalid'), buySeed: {} },
  ]) finiteTree(calculate(input));
  assert.deepEqual(calculate({ seeds: { pierre: false, joja: false, special: false } }), []);
});

test('calls and returned nested objects are isolated from input, defaults, and source data', () => {
  const input = { season: 3, foragingLevel: 10, skills: { gatherer: true } };
  const before = plain(input);
  const expected = calculate(input);
  const changed = calculate(input);
  changed[0].produce.price = -999;
  changed[0].seeds.special = -999;
  changed[0].growth.initial = -999;
  changed[0].profitData.profit = -999;
  calculate({ season: 1, predictionModel: true });
  assert.deepEqual(calculate(input), expected);
  assert.deepEqual(input, before);
  assert.ok(Object.isFrozen(DEFAULT_OPTIONS));
  assert.ok(Object.isFrozen(DEFAULT_OPTIONS.skills));
});

test('stable crop keys and Chinese names cover all seasonal and greenhouse crops', () => {
  for (let season = 0; season <= 4; season++) {
    const rows = calculate({ season });
    assert.equal(new Set(rows.map(crop => crop.key)).size, rows.length);
    for (const [index, crop] of rows.entries()) {
      assert.equal(crop.img, `${crop.key}.png`);
      assert.ok(CROP_NAMES[crop.key]);
      if (index) assert.ok(rows[index - 1].drawProfit >= crop.drawProfit);
    }
  }
  const crop = calculate().find(crop => crop.key === 'blueberry');
  assert.equal(crop.id, 1);
  assert.equal(crop.harvests, 4);
  assert.equal(crop.planted, 60);
  assert.equal(crop.seedLoss, -4800);
});

test('gold subtraction regression keeps the immutable oracle and independently asserts corrected hops income', () => {
  const input = { season: 1, produce: 2, planted: 60, fertilizer: 5, level: 10, equipment: 59, sellExcess: true };
  const options = normalizeOptions(input);
  const original = reference(options);
  assert.deepEqual(plain(vm.runInContext('removeCropQuality(8, 1, 2, 3, 4)', original.context)), [0, 0, 3, 2]);
  const crop = calculate(input).find(value => value.key === 'hops');
  assert.equal(crop.profit, 298150);
  assert.equal(crop.produce.gold, 0);
  assert.ok(Math.abs(crop.produce.iridium - 17) < 1e-10);
  assert.notEqual(crop.profit, original.rows.find(value => value.name === 'Hops').profit);
});

test('240 combined scenarios compare unchanged economics, classify deviations, and conserve materials', t => {
  const stats = { unchanged: 0, changed: 0 };
  const random = randomFor(8675309);
  const choose = max => Math.floor(random() * max);
  for (let scenario = 0; scenario < 240; scenario++) {
    const input = {
      season: choose(5), produce: choose(6), average: choose(4), fertilizer: choose(7),
      fertilizerSource: choose(2), aging: choose(4), planted: choose(80),
      level: choose(14), foragingLevel: choose(14), foodIndex: choose(7),
      crossSeason: !!choose(2), days: 1 + choose(112),
      replant: !!choose(2), nextyear: !!choose(2), buySeed: !!choose(2), buyFert: !!choose(2),
      sellRaw: !!choose(2), sellExcess: !!choose(2), byHarvest: !!choose(2),
      equipment: choose(10), maxSeedMoney: choose(2) ? 50 + choose(2000) : 0,
      seeds: { pierre: !!choose(2), joja: !!choose(2), special: !!choose(2) },
      skills: { till: true, agri: !!choose(2), arti: !!choose(2), gatherer: true, botanist: !!choose(2) },
      predictionModel: !!choose(2), predictionSeed: choose(4294967296),
    };
    checkCompatibility(input, stats);
  }
  assert.ok(stats.unchanged > 0 && stats.changed > 0);
  t.diagnostic(`240 scenarios: ${stats.unchanged} unchanged crop economics; ${stats.changed} classified corrections`);
});

test('zero plots, exact harvest boundaries, food, cost toggles, and growth acceleration', () => {
  const crop = (input, key) => calculate(input).find(value => value.key === key);
  for (const value of calculate({ planted: 0 })) {
    assert.equal(value.profit, 0);
    assert.equal(value.planted, 0);
  }
  assert.equal(crop({ season: 0, days: 4 }, 'parsnip').harvests, 0);
  assert.equal(crop({ season: 0, days: 5 }, 'parsnip').harvests, 1);
  assert.equal(crop({ season: 0, days: 28 }, 'tealeaves').harvests, 7);
  assert.ok(crop({ foodIndex: 6 }, 'blueberry').profit > crop({}, 'blueberry').profit);
  assert.equal(crop({ buySeed: false }, 'blueberry').profit - crop({}, 'blueberry').profit, 4800);
  assert.ok(crop({ fertilizer: 6 }, 'blueberry').harvests > crop({}, 'blueberry').harvests);
  assert.ok(crop({ crossSeason: true, days: 56 }, 'corn').harvests > crop({}, 'corn').harvests);
  assert.equal(crop({ crossSeason: true, days: 56 }, 'blueberry').harvests, crop({}, 'blueberry').harvests);
});

test('normalization is idempotent and prediction worst-case bounds are finite', () => {
  const options = normalizeOptions({ season: 4, days: Number.MAX_VALUE, planted: Number.MAX_VALUE, predictionModel: true, replant: true, foodIndex: 6 });
  assert.equal(options.days, 1120);
  assert.equal(options.planted, 10000);
  assert.deepEqual(normalizeOptions(options), options);
  finiteTree(calculate(options));
  for (const field of Object.keys(DEFAULT_OPTIONS).filter(key => typeof DEFAULT_OPTIONS[key] === 'number')) {
    for (const value of [NaN, Infinity, -Infinity, -999, '', 'junk', null, {}, Symbol('bad')]) {
      finiteTree(normalizeOptions({ [field]: value }));
    }
  }
});

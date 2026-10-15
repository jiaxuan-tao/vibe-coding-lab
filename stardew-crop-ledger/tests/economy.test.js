import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, normalizeOptions } from '../engine.js';

const row = (input, key) => calculate(input).find(crop => crop.key === key);
const revenue = crop => crop.profit - crop.netExpenses;
const sumQuality = crop => ['regular', 'silver', 'gold', 'iridium'].reduce((sum, key) => sum + crop.produce[key], 0);
function near(actual, expected, label = '') {
  assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
}
function conserved(crop) {
  const m = crop.profitData.material;
  assert.ok(m, `${crop.key}: missing material ledger`);
  for (const key of ['totalProduced', 'seedReserved', 'processedInput', 'rawSold', 'unsold']) {
    assert.ok(Number.isFinite(m[key]) && m[key] >= 0, `${crop.key}: ${key}=${m[key]}`);
  }
  near(m.totalProduced, m.seedReserved + m.processedInput + m.rawSold + m.unsold, `${crop.key}: balance`);
  near(sumQuality(crop), m.rawSold, `${crop.key}: quality sold`);
  near(m.byHarvest.reduce((sum, item) => sum + item.produced, 0), m.totalProduced);
  near(m.byHarvest.reduce((sum, item) => sum + item.seedReserved, 0), m.seedReserved);
  near(m.byHarvest.reduce((sum, item) => sum + item.processedInput, 0), m.processedInput);
  for (const item of m.byHarvest) {
    assert.ok(item.seedReserved >= 0 && item.processedInput >= 0);
    assert.ok(item.seedReserved + item.processedInput <= item.produced + 1e-8);
  }
  near(crop.profitData.revenue, revenue(crop));
}

test('E1: prediction processes all hops harvests instead of a single harvest', () => {
  const crop = row({ produce: 2, predictionModel: true }, 'hops');
  assert.equal(crop.harvests, 17);
  assert.equal(crop.profitData.quantitySold, 1020);
  assert.equal(revenue(crop), 306000);
  assert.equal(crop.profit, 302400);
});

test('E1/E3: zero harvest means zero goods and zero revenue in all six modes', () => {
  for (const predictionModel of [false, true]) for (let produce = 0; produce < 6; produce++) {
    for (const crop of calculate({ season: 4, days: 1, produce, predictionModel, replant: true,
      nextyear: true, sellRaw: true, sellExcess: true, equipment: 1 })) {
      assert.equal(crop.harvests, 0);
      assert.equal(crop.profitData.quantitySold, 0, `${produce}/${crop.key}`);
      assert.equal(revenue(crop), 0, `${produce}/${crop.key}`);
      assert.equal(crop.profit, crop.netExpenses);
      conserved(crop);
    }
  }
});

test('E2: fixed multiple produce is present in every predicted harvest and processing mode', () => {
  for (const [key, total, harvests, jarPrice, kegPrice, driedPrice] of [
    ['blueberry', 720, 4, 150, 150, 400], ['cranberries', 600, 5, 200, 225, 587.5],
  ]) for (const [produce, sold, price] of [[1, total, jarPrice], [2, total, kegPrice], [4, total / 5, driedPrice]]) {
    const crop = row({ season: key === 'cranberries' ? 2 : 1, produce, predictionModel: true, byHarvest: true }, key);
    assert.equal(crop.harvests, harvests);
    assert.equal(crop.profitData.quantitySold, sold);
    assert.equal(revenue(crop), sold * price);
    conserved(crop);
  }
});

test('E3: the final parsnip harvest is not reserved for nonexistent replanting', () => {
  const crop = row({ season: 0, produce: 1, replant: true }, 'parsnip');
  assert.equal(crop.harvests, 6);
  assert.equal(crop.profitData.quantitySold, 210);
  assert.equal(crop.profit, 24000);
  conserved(crop);
  assert.equal(crop.profitData.material.seedReserved, 150);
  assert.equal(crop.profitData.material.byHarvest.at(-1).seedReserved, 0);
});

test('E3: seed and processed quality are consumed once, leaving 204 raw parsnips', () => {
  const crop = row({ season: 0, produce: 1, replant: true, equipment: 1, sellExcess: true }, 'parsnip');
  assert.equal(crop.profitData.quantitySold, 6);
  assert.equal(crop.profitData.excessProduce, 204);
  near(sumQuality(crop), 204);
  near(crop.profit, 6778.224);
  conserved(crop);
});

test('E3: next-year hops reserves actual produce without creating or selling reserved seeds', () => {
  const crop = row({ produce: 2, equipment: 1, replant: true, nextyear: true, sellExcess: true }, 'hops');
  assert.equal(crop.profitData.quantitySold, 17);
  assert.equal(crop.profitData.excessProduce, 973);
  near(sumQuality(crop), 973);
  conserved(crop);
  assert.equal(crop.profitData.material.seedReserved, 30);
});

test('E4: predicted potatoes have 290 produce, 90 reserved, at most 200 processed', () => {
  for (const equipment of [0, 10000]) {
    const crop = row({ season: 0, produce: 1, replant: true, predictionModel: true, equipment }, 'potato');
    assert.equal(crop.profitData.quantitySold, 200);
    assert.equal(crop.profit, 39000);
    conserved(crop);
    assert.equal(crop.profitData.material.totalProduced, 290);
    assert.equal(crop.profitData.material.seedReserved, 90);
  }
});

test('E4/Q1: zero and nonbinding equipment are equivalent in all six sale modes', () => {
  for (let produce = 0; produce < 6; produce++) for (const predictionModel of [false, true]) {
    for (const byHarvest of [false, true]) for (const nextyear of [false, true]) {
      for (const season of [0, 1, 2, 4]) {
        const base = { season, crossSeason: true, days: 56, produce, predictionModel, predictionSeed: 33, byHarvest,
          planted: 12, replant: true, nextyear, sellRaw: true, sellExcess: true };
        assert.deepEqual(calculate({ ...base, equipment: 0 }), calculate({ ...base, equipment: 10000 }));
      }
    }
  }
});

test('E5: Botanist average wild seeds contain only iridium and match hand-computed revenue', () => {
  for (const [season, key, price, expected] of [
    [0, 'springseeds', 45, 19440], [1, 'summerseeds', 70, 30240],
    [2, 'fallseeds', 57.5, 24840], [3, 'winterseeds', 95, 41040],
  ]) {
    const crop = row({ season, foragingLevel: 10, buySeed: false, skills: { gatherer: true, botanist: true } }, key);
    assert.equal(crop.harvests, 3);
    assert.equal(crop.profitData.quantitySold, 216);
    assert.equal(crop.profit, expected);
    assert.equal(crop.produce.iridium, 216);
    assert.equal(crop.produce.regular + crop.produce.silver + crop.produce.gold, 0);
    assert.equal(crop.profitData.iridium, 1);
    assert.equal(crop.profitData.regular + crop.profitData.silver + crop.profitData.gold, 0);
    assert.equal(revenue(crop), 216 * price * 2);
    conserved(crop);
  }
});

test('E5: Botanist predicted Gatherer extra produce also stays iridium', () => {
  const crop = row({ season: 3, foragingLevel: 10, buySeed: false, predictionModel: true,
    skills: { gatherer: true, botanist: true } }, 'winterseeds');
  assert.equal(crop.produce.regular + crop.produce.silver + crop.produce.gold, 0);
  assert.equal(crop.produce.iridium, crop.profitData.quantitySold);
  assert.equal(revenue(crop), crop.profitData.quantitySold * 190);
  conserved(crop);
});

test('E6: one coffee keg processes five beans per cup per harvest, at 150 per cup', () => {
  for (const predictionModel of [false, true]) {
    const crop = row({ produce: 2, buySeed: false, equipment: 1, predictionModel }, 'coffeebean');
    assert.equal(crop.harvests, 9);
    assert.equal(crop.profitData.quantitySold, 9);
    assert.equal(crop.profit, 1350);
    assert.equal(crop.profitData.excessProduce, 2115);
    conserved(crop);
    assert.equal(crop.profitData.material.processedInput, 45);
    assert.equal(row({ produce: 2, buySeed: false, predictionModel }, 'coffeebean').profit, 64800);
  }
});

test('Q1: independent raw, jar, keg, seeds, dehydrator, and mill golden quantities/prices', () => {
  const cases = [
    [{ season: 0, days: 5, planted: 10, buySeed: false }, 'parsnip', 10, 353.284, 0],
    [{ season: 0, days: 5, planted: 10, buySeed: false, produce: 1 }, 'parsnip', 10, 1200, 10],
    [{ season: 0, days: 5, planted: 10, buySeed: false, produce: 2 }, 'parsnip', 10, 787.5, 10],
    [{ season: 0, days: 5, planted: 10, buySeed: false, produce: 3 }, 'parsnip', 20, 200, 10],
    [{ season: 1, planted: 10, buySeed: false, produce: 4, byHarvest: true }, 'blueberry', 24, 9600, 120],
    [{ season: 2, days: 7, planted: 10, buySeed: false, produce: 5 }, 'beet', 30, 1500, 10],
  ];
  for (const [input, key, quantity, income, processed] of cases) {
    const crop = row(input, key);
    near(crop.profitData.quantitySold, quantity);
    near(revenue(crop), income);
    conserved(crop);
    near(crop.profitData.material.processedInput, processed);
  }
});

test('Q1: odd plots, low budget, no raw fallback, five-input remainder and next-year all conserve', () => {
  for (let produce = 0; produce < 6; produce++) for (const predictionModel of [false, true]) {
    for (const planted of [0, 1, 3, 12]) for (const nextyear of [false, true]) {
      for (const crop of calculate({ season: 0, days: 28, produce, predictionModel, planted,
        maxSeedMoney: 40, replant: true, nextyear, equipment: 1, byHarvest: true, sellExcess: true })) conserved(crop);
    }
  }
});

test('Q1: legal maximum buff and fertilizer probabilities cannot create quality mass', () => {
  for (const crop of calculate({ season: 4, fertilizer: 5, level: 13, foodLevel: 3, buySeed: false })) {
    near(['regular', 'silver', 'gold', 'iridium'].reduce((sum, quality) => sum + crop.profitData[quality], 0), 1);
    conserved(crop);
  }
  assert.deepEqual(normalizeOptions({ season: -1, produce: 9, days: -1, planted: '3.9' }).seeds,
    { pierre: true, joja: true, special: true });
  assert.equal(normalizeOptions({ planted: '3.9' }).planted, 3);
});

test('Q1: dehydrator pooled vs per-harvest batches reserve seeds before grouping five inputs', () => {
  const base = { season: 1, produce: 4, planted: 1, buySeed: false, predictionModel: true, replant: true, nextyear: true };
  const perHarvest = row({ ...base, byHarvest: true }, 'blueberry');
  const pooled = row({ ...base, byHarvest: false }, 'blueberry');
  assert.equal(perHarvest.profitData.material.totalProduced, 12);
  assert.equal(perHarvest.profitData.material.seedReserved, 0.5);
  assert.equal(perHarvest.profitData.quantitySold, 0);
  assert.equal(perHarvest.profitData.excessProduce, 11.5);
  assert.equal(pooled.profitData.quantitySold, 2);
  assert.equal(pooled.profitData.material.processedInput, 10);
  assert.equal(pooled.profitData.excessProduce, 1.5);
  conserved(perHarvest);
  conserved(pooled);
});

test('Q1: fractional mean raw quantities and seed output retain exact mass rather than display floors', () => {
  const raw = row({ produce: 0, planted: 1, buySeed: false }, 'hotpepper');
  const seeds = row({ produce: 3, planted: 1, buySeed: false }, 'hotpepper');
  near(raw.profitData.quantitySold, 8.24);
  near(seeds.profitData.quantitySold, 16.48);
  near(seeds.profit, 329.6);
  conserved(raw);
  conserved(seeds);
});

test('Q1: no fallback means unsold inventory, and excess toggle sells only actual remaining quality', () => {
  const unavailable = row({ produce: 2 }, 'poppy');
  assert.equal(unavailable.profitData.quantitySold, 0);
  assert.equal(revenue(unavailable), 0);
  assert.equal(unavailable.profitData.material.unsold, 180);
  conserved(unavailable);
  const base = { season: 0, produce: 1, planted: 60, replant: true, equipment: 1 };
  const kept = row(base, 'parsnip');
  const sold = row({ ...base, sellExcess: true }, 'parsnip');
  assert.equal(kept.profitData.material.unsold, 204);
  assert.equal(sold.profitData.material.rawSold, 204);
  near(sold.profit - kept.profit, 7258.224);
  conserved(kept);
  conserved(sold);
});

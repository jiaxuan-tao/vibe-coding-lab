import { crops } from './vendor/crops.js';
import { calculateCore } from './vendor/calculation-core.js';

export const DEFAULT_OPTIONS = Object.freeze({
  produce: 0, equipment: 0, sellRaw: false, sellExcess: false, byHarvest: false,
  aging: 0, planted: 60, maxSeedMoney: 0, days: 28, fertilizer: 0,
  fertilizerSource: 0, level: 0, foragingLevel: 0, season: 1,
  buySeed: true, buyFert: true, replant: false, nextyear: false, average: 0,
  crossSeason: false, foodIndex: 0, foodLevel: 0, extra: false, disableLinks: false,
  predictionModel: false, predictionSeed: 1,
  seeds: Object.freeze({ pierre: true, joja: true, special: true }),
  skills: Object.freeze({ till: false, agri: false, arti: false, gatherer: false, botanist: false }),
});

export const SEASON_NAMES = Object.freeze(['春季', '夏季', '秋季', '冬季', '温室']);
export const FERTILIZER_NAMES = Object.freeze([
  '无肥料', '初级肥料', '高级肥料', '生长激素', '高级生长激素', '顶级肥料', '顶级生长激素',
]);
export const CROP_NAMES = Object.freeze({
  carrot: '胡萝卜', summersquash: '金皮西葫芦', broccoli: '西兰花', powdermelon: '霜瓜',
  amaranth: '苋菜', grape: '葡萄', hops: '啤酒花', pineapple: '菠萝',
  sweetgemberry: '宝石甜莓', coffeebean: '咖啡豆', tealeaves: '茶叶',
  sunflower: '向日葵', fairyrose: '玫瑰仙子', bluejazz: '蓝爵', tulip: '郁金香',
  poppy: '虞美人', summerspangle: '夏日亮片', parsnip: '防风草', greenbean: '青豆',
  cauliflower: '花椰菜', potato: '土豆', garlic: '蒜', taroroot: '芋头', kale: '甘蓝菜',
  unmilledrice: '未碾米', rhubarb: '大黄', melon: '甜瓜', tomato: '西红柿',
  blueberry: '蓝莓', hotpepper: '辣椒', wheat: '小麦', radish: '萝卜',
  redcabbage: '红叶卷心菜', starfruit: '杨桃', corn: '玉米', eggplant: '茄子',
  artichoke: '洋蓟', pumpkin: '南瓜', bokchoy: '小白菜', yam: '山药',
  cranberries: '蔓越莓', beet: '甜菜', ancientfruit: '上古水果', cactusfruit: '仙人掌果子',
  strawberry: '草莓', springseeds: '春季种子', summerseeds: '夏季种子',
  fallseeds: '秋季种子', winterseeds: '冬季种子',
});

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const foodLevels = [0, 1, 1, 2, 2, 2, 3];
const keyByName = new Map(Object.entries(crops).map(([key, crop]) => [crop.name, key]));

function integer(value, fallback, min, max) {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback;
}

function boolean(value, fallback) {
  if (value === true || value === 1 || value === 'true' || value === '1') return true;
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  return fallback;
}

export function normalizeOptions(input) {
  const source = object(input);
  const normalized = { ...DEFAULT_OPTIONS, seeds: {}, skills: {} };
  for (const [key, value] of Object.entries(DEFAULT_OPTIONS)) {
    if (typeof value === 'boolean') normalized[key] = boolean(source[key], value);
  }
  const ranges = {
    season: [0, 4], produce: [0, 5], equipment: [0, 10000], planted: [0, 10000],
    maxSeedMoney: [0, 1e12], fertilizer: [0, 6], fertilizerSource: [0, 1],
    aging: [0, 3], average: [0, 3], level: [0, 13], foragingLevel: [0, 13],
    foodIndex: [0, 6], predictionSeed: [0, 4294967295],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    normalized[key] = integer(source[key], DEFAULT_OPTIONS[key], min, max);
  }
  const maxDays = normalized.season === 4 ? 1120 : normalized.crossSeason ? 56 : 28;
  normalized.days = integer(source.days, DEFAULT_OPTIONS.days, 1, maxDays);
  normalized.foodLevel = integer(source.foodLevel, foodLevels[normalized.foodIndex], 0, 3);
  for (const group of ['seeds', 'skills']) {
    const values = object(source[group]);
    for (const [key, fallback] of Object.entries(DEFAULT_OPTIONS[group])) {
      normalized[group][key] = boolean(values[key], fallback);
    }
  }
  normalized.skills.till &&= normalized.level >= 5;
  const advancedFarming = normalized.level >= 10 && normalized.skills.till;
  normalized.skills.agri &&= advancedFarming;
  normalized.skills.arti &&= advancedFarming && !normalized.skills.agri;
  normalized.skills.gatherer &&= normalized.foragingLevel >= 5;
  normalized.skills.botanist &&= normalized.foragingLevel >= 10 && normalized.skills.gatherer;
  normalized.nextyear &&= normalized.replant && normalized.season !== 4;
  return normalized;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function calculate(input) {
  const options = normalizeOptions(input);
  return calculateCore(options, seededRandom(options.predictionSeed)).map(crop => ({
    ...crop, key: keyByName.get(crop.name),
  }));
}

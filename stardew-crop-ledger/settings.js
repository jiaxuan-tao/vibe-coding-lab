import { DEFAULT_OPTIONS, normalizeOptions } from './engine.js';

const KEY = 'stardew-crop-ledger:v1';
const clamp = (value, fallback, min, max) => Number.isFinite(Number(value)) && value !== null && value !== ''
  ? Math.min(max, Math.max(min, Math.trunc(Number(value)))) : fallback;

export function createState() {
  return {
    options: normalizeOptions({ ...DEFAULT_OPTIONS, extra: false, sellRaw: true, sellExcess: true }),
    currentDay: 1, duration: 112, view: 'chart', selectedKey: null, showAll: false,
  };
}

export function computationOptions(state) {
  return normalizeOptions({
    ...state.options,
    days: state.options.season === 4 ? state.duration : (state.options.crossSeason ? 57 : 29) - state.currentDay,
  });
}

export function loadState(storage) {
  const defaults = createState();
  try {
    const value = JSON.parse(storage.getItem(KEY));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
    const options = normalizeOptions(value.options);
    options.planted = Math.max(1, options.planted);
    options.maxSeedMoney = Math.min(100000000, options.maxSeedMoney);
    return {
      options, currentDay: clamp(value.currentDay, 1, 1, 28),
      duration: clamp(value.duration, 112, 1, 1120),
      view: value.view === 'table' ? 'table' : 'chart',
      selectedKey: typeof value.selectedKey === 'string' ? value.selectedKey : null,
      showAll: value.showAll === true,
    };
  } catch {
    return defaults;
  }
}

export function saveState(state, storage) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

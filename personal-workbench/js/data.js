// Limits apply to each collection/string; the complete UTF-8 backup is capped too.
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 10000;
const FORMAT = 'vibe-personal-workbench';
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function invalid(path, reason) {
  throw new TypeError(`${path}: ${reason}`);
}

function plainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    invalid(path, 'expected a plain object');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) {
      invalid(path, 'unsafe or unsupported key');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!own(descriptor, 'value') || !descriptor.enumerable) invalid(`${path}.${key}`, 'expected a JSON data field');
  }
}

function record(value, schema, defaults, path) {
  plainObject(value, path);
  for (const key of Object.keys(value)) {
    if (!own(schema, key)) invalid(`${path}.${key}`, 'unknown field');
  }
  const result = {};
  for (const [key, validate] of Object.entries(schema)) {
    if (!own(value, key) && !own(defaults, key)) invalid(`${path}.${key}`, 'required field');
    result[key] = validate(own(value, key) ? value[key] : defaults[key], `${path}.${key}`);
  }
  return result;
}

const text = (max = 200000, required = false) => (value, path) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    invalid(path, `expected ${required ? 'nonempty ' : ''}text up to ${max} characters`);
  }
  return value;
};
const title = text(1000);
const body = text();
const id = text(128, true);
const code = text(64, true);
const number = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid(path, 'expected a finite nonnegative number');
  return value;
};
const boolean = (value, path) => {
  if (typeof value !== 'boolean') invalid(path, 'expected a boolean');
  return value;
};
const enumeration = (...values) => (value, path) => {
  if (!values.includes(value)) invalid(path, `expected one of ${values.join(', ')}`);
  return value;
};
const progress = (value, path) => {
  number(value, path);
  if (value > 100) invalid(path, 'progress must be between 0 and 100');
  return value;
};

function month(value, path) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) invalid(path, 'expected a valid YYYY-MM month');
  return value;
}

function date(value, path) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) invalid(path, 'expected a valid YYYY-MM-DD date');
  const [year, m, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[m - 1]) invalid(path, 'invalid calendar date');
  return value;
}
const optionalDate = (value, path) => value === '' ? '' : date(value, path);

function list(validate, uniqueKey, max = MAX_ITEMS) {
  return (value, path) => {
    if (!Array.isArray(value) || value.length > max) invalid(path, `expected an array of at most ${max} items`);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).length !== value.length + 1) invalid(path, 'expected a dense JSON array');
    const seen = new Set();
    const result = [];
    for (let index = 0; index < value.length; index++) {
      const descriptor = descriptors[index];
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) invalid(path, 'expected a dense JSON array');
      const item = validate(descriptor.value, `${path}[${index}]`);
      if (uniqueKey) {
        const key = uniqueKey(item);
        if (seen.has(key)) invalid(path, `duplicate identifier ${key}`);
        seen.add(key);
      }
      result.push(item);
    }
    return result;
  };
}

const shape = (schema, defaults = {}) => (value, path) => record(value, schema, defaults, path);
const tags = list(text(200), null, 100);
const records = (schema, defaults) => list(shape({ id, ...schema }, defaults), item => item.id);

const todos = records({ title, done: boolean, priority: enumeration('high', 'mid', 'low'), date: optionalDate, createdAt: number }, { done: false, priority: 'mid', date: '', createdAt: 0 });
const events = records({ date, title, note: body }, { note: '' });
const notes = records({ title, body, tags, updatedAt: number }, { body: '', tags: [], updatedAt: 0 });
const inspirations = records({ text: body, tags, createdAt: number }, { tags: [], createdAt: 0 });
const prompts = records({ title, content: body });
const ledger = records({ type: enumeration('in', 'out'), amount: number, category: title, note: body, date }, { note: '' });
const learning = shape({
  plans: records({ name: title, goal: body, progress }, { goal: '', progress: 0 }),
  checkins: list(date, value => value),
}, { plans: [], checkins: [] });
const stocks = shape({
  trades: records({ code, side: enumeration('buy', 'sell'), price: number, qty: number, date, note: body, createdAt: number }, { note: '', createdAt: 0 }),
  watchlist: list(shape({ code }), item => item.code),
  notes: records({ code: text(64), title, body, updatedAt: number }, { code: '', body: '', updatedAt: 0 }),
}, { trades: [], watchlist: [{ code: 'sh000001' }, { code: 'sz399001' }, { code: 'sz399006' }], notes: [] });

function monthlyFocus(value, path) {
  plainObject(value, path);
  const entries = Object.entries(value);
  if (entries.length > MAX_ITEMS) invalid(path, `expected at most ${MAX_ITEMS} entries`);
  const result = {};
  for (const [key, content] of entries) {
    month(key, `${path}.${key}`);
    result[key] = body(content, `${path}.${key}`);
  }
  return result;
}

const work = shape({
  plans: records({ month, title, note: body, done: boolean, createdAt: number }, { note: '', done: false, createdAt: 0 }),
  logs: records({ date, focus: body, install: body, civil: body, sub: body, other: body, content: body, createdAt: number, updatedAt: number }, { focus: '', install: '', civil: '', sub: '', other: '', content: '', createdAt: 0, updatedAt: 0 }),
  focus: monthlyFocus,
}, { plans: [], logs: [], focus: {} });

function settings(value, path) {
  plainObject(value, path);
  const schema = { displayName: text(200), weatherCity: text(200), quotesEnabled: boolean };
  const result = { quotesEnabled: false };
  for (const key of Object.keys(value)) {
    if (!own(schema, key)) invalid(`${path}.${key}`, 'unknown setting');
    result[key] = schema[key](value[key], `${path}.${key}`);
  }
  return result;
}

export function createEmptyData() {
  return {
    meta: { updatedAt: 0, device: '' },
    todos: [], events: [], notes: [], inspirations: [], prompts: [], ledger: [],
    learning: { plans: [], checkins: [] },
    work: { plans: [], logs: [], focus: {} },
    stocks: { trades: [], watchlist: [{ code: 'sh000001' }, { code: 'sz399001' }, { code: 'sz399006' }], notes: [] },
    settings: { quotesEnabled: false },
  };
}

function checkSize(text) {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    invalid('backup', 'maximum size is 5 MiB');
  }
  return text;
}

export function normalizeData(raw) {
  const result = record(raw, {
    meta: shape({ updatedAt: number, device: text(200) }, { updatedAt: 0, device: '' }),
    todos, events, notes, inspirations, prompts, ledger, learning, work, stocks, settings,
  }, createEmptyData(), 'data');
  checkSize(JSON.stringify(result));
  return result;
}

export function parseBackup(text) {
  if (typeof text !== 'string') invalid('backup', 'expected JSON text');
  checkSize(text);
  let raw;
  try { raw = JSON.parse(text); }
  catch (cause) { throw new TypeError('backup: invalid JSON', { cause }); }
  plainObject(raw, 'backup');
  if (own(raw, 'format') || own(raw, 'version') || own(raw, 'data')) {
    const envelope = record(raw, {
      format: enumeration(FORMAT), version: enumeration(1), data: normalizeData,
    }, {}, 'backup');
    return envelope.data;
  }
  return normalizeData(raw);
}

export function serializeBackup(data) {
  return checkSize(JSON.stringify({ format: FORMAT, version: 1, data: normalizeData(data) }, null, 2));
}

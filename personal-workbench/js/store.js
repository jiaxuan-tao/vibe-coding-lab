import { createEmptyData, normalizeData, parseBackup, serializeBackup } from './data.js';

export const STORAGE_KEY = 'vcl.personal-workbench.data.v1';

export class StorageWriteError extends Error {
  constructor(message = '本地保存失败，修改未保存，原有数据未被覆盖。', options) {
    super(message, options);
    this.name = 'StorageWriteError';
  }
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function notify(listeners, value) {
  for (const callback of [...listeners]) {
    // A consumer exception must not turn a committed write into an apparent failure.
    try { callback(value); } catch {}
  }
}

export function createStore(options = {}) {
  let storage;
  let data = freeze(createEmptyData());
  let loadError = null;
  let rawLocalData = null;
  // undefined means no successful read; null means the key was confirmed absent.
  let lastSeenRaw;
  let status = Object.freeze({ state: 'saved', message: '数据仅保存在本机。' });
  const changes = new Set();
  const statuses = new Set();
  const now = options.now ?? Date.now;

  try {
    storage = Object.prototype.hasOwnProperty.call(options, 'storage') ? options.storage : globalThis.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new Error('本地存储不可用。');
    }
    // Keep the initial bytes even after recovery, so they can be exported verbatim.
    rawLocalData = storage.getItem(STORAGE_KEY);
    lastSeenRaw = rawLocalData;
    if (rawLocalData !== null) data = freeze(parseBackup(rawLocalData));
  } catch (error) {
    loadError = error instanceof Error ? error : new Error('本地存储读取失败。', { cause: error });
    status = Object.freeze({
      state: 'error',
      message: rawLocalData === null
        ? '无法读取本地存储，已暂停修改。请检查浏览器存储权限。'
        : '本地数据读取失败，原始内容未被覆盖。请先导出原始数据，再确认导入有效备份。',
    });
  }

  function setStatus(state, message) {
    status = Object.freeze({ state, message });
    notify(statuses, status);
  }

  function subscribe(listeners, callback) {
    if (typeof callback !== 'function') throw new TypeError('Expected a listener function.');
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function commit(candidate, source, expectedRaw) {
    const next = freeze(normalizeData(candidate));
    const serialized = serializeBackup(next);
    try {
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new Error('本地存储不可用。');
      if (expectedRaw === undefined) {
        throw new StorageWriteError('无法确认本地数据版本，已阻止覆盖。请先保留未保存内容，恢复存储访问并刷新页面后重试。', { cause: loadError });
      }
      // Optimistic check only: localStorage has no atomic compare-and-set, so a
      // simultaneous writer can still interleave between this read and setItem.
      if (storage.getItem(STORAGE_KEY) !== expectedRaw) {
        throw new StorageWriteError('本地数据已在其他页面或操作中更新，已阻止覆盖。请先保留当前未保存内容，再刷新页面读取最新数据后重试。');
      }
      storage.setItem(STORAGE_KEY, serialized);
    } catch (cause) {
      const error = cause instanceof StorageWriteError ? cause : new StorageWriteError(undefined, { cause });
      setStatus('error', error.message);
      throw error;
    }
    lastSeenRaw = serialized;
    data = next;
    loadError = null;
    setStatus('saved', '已保存到本机。');
    notify(changes, source);
    return true;
  }

  return {
    get data() { return data; },
    get status() { return status; },
    get loadError() { return loadError; },
    get rawLocalData() { return rawLocalData; },
    onChange(callback) { return subscribe(changes, callback); },
    onStatus(callback) { return subscribe(statuses, callback); },
    emitChange(source) { notify(changes, source); },
    update(mutator, opts = {}) {
      if (loadError) {
        const error = new StorageWriteError('本地数据读取异常尚未解决，已阻止修改。请在设置中确认恢复或导入有效备份。', { cause: loadError });
        setStatus('error', error.message);
        throw error;
      }
      if (typeof mutator !== 'function') throw new TypeError('Expected a synchronous mutator function.');
      const expectedRaw = lastSeenRaw;
      const draft = normalizeData(data);
      const result = mutator(draft);
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        throw new TypeError('Mutators must be synchronous.');
      }
      draft.meta.updatedAt = now();
      return commit(draft, opts.source || 'local', expectedRaw);
    },
    importBackup(text) {
      const expectedRaw = lastSeenRaw;
      return commit(parseBackup(text), 'import', expectedRaw);
    },
    exportBackup() { return serializeBackup(data); },
  };
}

export const store = createStore();

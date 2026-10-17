// Minimal promise wrapper around IndexedDB for the library store.
import { t, getLocale } from "../i18n";

function storageError(error: Error | null): Error {
  if (getLocale() === "en" && error) return error;
  if (error?.name === "QuotaExceededError") return new Error(t("Browser storage is full. Delete saved comparisons and try again."));
  if (error?.name === "AbortError") return new Error(t("The browser storage operation was interrupted. Try again."));
  return new Error(t("Couldn't access browser storage. Check your browser's storage permissions."));
}

const DB_NAME = "vcl-text-compare-library-v1";
const VERSION = 1;
export type StoreName = "items";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      reject(req.error);
    };
  }).catch((error: unknown) => {
    dbPromise = null;
    throw storageError(error instanceof Error ? error : null);
  });
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(storageError(tx.error));
        tx.onabort = () => reject(storageError(tx.error));
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: IDBValidKey) => run<T | undefined>(store, "readonly", (s) => s.get(key)),
  all: <T>(store: StoreName) => run<T[]>(store, "readonly", (s) => s.getAll()),
  put: (store: StoreName, value: unknown, key?: IDBValidKey) => run(store, "readwrite", (s) => s.put(value, key)),
  delete: (store: StoreName, key: IDBValidKey) => run(store, "readwrite", (s) => s.delete(key)),
  clear: (store: StoreName) => run(store, "readwrite", (s) => s.clear()),
};

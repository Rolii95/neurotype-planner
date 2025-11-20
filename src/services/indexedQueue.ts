// Minimal IndexedDB-backed queue for offline items (tasks, mood logs, activities)
// Records: { id, type, payload, created_at, retries }

const DB_NAME = 'neurotype_planner_offline_db';
const STORE_NAME = 'offline_queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(mode: IDBTransactionMode, cb: (store: IDBObjectStore) => IDBRequest | Promise<IDBRequest | T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = cb(store);
      tx.oncomplete = () => resolve((result as any).__result);
      tx.onerror = () => reject(tx.error || new Error('Transaction error'));
      // If cb returned a request, attach handlers to resolve early
      if ((result as IDBRequest).onsuccess !== undefined) {
        (result as IDBRequest).onsuccess = function (this: IDBRequest) {
          (result as any).__result = (this as IDBRequest).result;
        };
        (result as IDBRequest).onerror = function (this: IDBRequest) {
          (result as any).__result = undefined;
        };
      }
    } catch (e) {
      reject(e);
    }
  });
}

export async function enqueueOffline(type: string, payload: any) {
  const id = crypto.randomUUID();
  const record = { id, type, payload, created_at: new Date().toISOString(), retries: 0 };
  const db = await openDB();
  return new Promise<string>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOffline(type?: string) {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items: any[] = [];
    let req: IDBRequest;
    if (type) {
      const idx = store.index('type');
      req = idx.openCursor(IDBKeyRange.only(type));
    } else {
      req = store.openCursor();
    }
    req.onsuccess = function (this: IDBRequest) {
      const cursor = (this as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        items.push(cursor.value);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve(items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeOffline(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function incrementRetries(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = function (this: IDBRequest) {
      const rec = (this as IDBRequest).result;
      if (!rec) return resolve();
      rec.retries = (rec.retries || 0) + 1;
      const putReq = store.put(rec);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function clearOffline(type?: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (type) {
      const idx = store.index('type');
      const req = idx.openKeyCursor(IDBKeyRange.only(type));
      req.onsuccess = function (this: IDBRequest) {
        const c = (this as IDBRequest).result as IDBCursorWithValue | null;
        if (c) {
          store.delete(c.primaryKey as string);
          c.continue();
        }
      };
    } else {
      store.clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

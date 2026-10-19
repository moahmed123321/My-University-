// IndexedDB local-first storage for Uni Manager
const DB_NAME = "uni_manager_offline_v1";
const DB_VERSION = 1;

export const STORES = [
  "courses",
  "lectures",
  "exams",
  "tasks",
  "assignments",
  "topics",
  "notes",
  "materials",
  "outbox",
  "meta",
];

let dbPromise = null;

export function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function openDb() {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Entity stores with "id" as primary key
      const entityStores = [
        "courses",
        "lectures",
        "exams",
        "tasks",
        "assignments",
        "topics",
        "notes",
        "materials",
      ];

      entityStores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("course_id", "course_id", { unique: false });
        }
      });

      // Outbox queue for pending offline mutations
      if (!db.objectStoreNames.contains("outbox")) {
        const outboxStore = db.createObjectStore("outbox", {
          keyPath: "outboxId",
          autoIncrement: true,
        });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
        outboxStore.createIndex("table", "table", { unique: false });
      }

      // Metadata store (key-value pair)
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      console.warn("[IndexedDB] Database upgrade blocked.");
    };
  });

  return dbPromise;
}

export async function dbGetAll(storeName, filterFn = null) {
  const db = await openDb();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        let results = req.result || [];
        if (filterFn && typeof filterFn === "function") {
          results = results.filter(filterFn);
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbGet(storeName, id) {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbPut(storeName, record) {
  const db = await openDb();
  if (!db) return record;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbPutMany(storeName, records) {
  const db = await openDb();
  if (!db || !records || records.length === 0) return records;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      records.forEach((record) => {
        store.put(record);
      });

      tx.oncomplete = () => resolve(records);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbDelete(storeName, id) {
  const db = await openDb();
  if (!db) return true;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbClear(storeName) {
  const db = await openDb();
  if (!db) return true;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------- Outbox Mutation Queue -----------------

export async function enqueueOutbox({ table, action, id, payload }) {
  const db = await openDb();
  if (!db) return null;

  const entry = {
    table,
    action, // "insert" | "update" | "delete"
    id,
    payload,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("outbox", "readwrite");
      const store = tx.objectStore("outbox");
      const req = store.add(entry);

      req.onsuccess = () => {
        entry.outboxId = req.result;
        resolve(entry);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getOutbox() {
  const db = await openDb();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("outbox", "readonly");
      const store = tx.objectStore("outbox");
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function removeOutbox(outboxId) {
  const db = await openDb();
  if (!db) return true;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("outbox", "readwrite");
      const store = tx.objectStore("outbox");
      const req = store.delete(outboxId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function countTable(storeName) {
  const db = await openDb();
  if (!db) return 0;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------- Metadata helpers -----------------

export async function getMeta(key) {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("meta", "readonly");
      const store = tx.objectStore("meta");
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function setMeta(key, value) {
  const db = await openDb();
  if (!db) return value;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction("meta", "readwrite");
      const store = tx.objectStore("meta");
      const req = store.put({ key, value, updatedAt: Date.now() });

      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Client-side UUID generator using modern crypto API
export function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


// Bi-directional synchronization engine between IndexedDB and Supabase
import { supabase } from "./supabase";
import {
  dbGetAll,
  dbPutMany,
  dbClear,
  getOutbox,
  removeOutbox,
  getMeta,
  setMeta,
  countTable,
  isBrowser,
} from "./offlineDb";

const ENTITY_TABLES = [
  "courses",
  "lectures",
  "exams",
  "tasks",
  "assignments",
  "topics",
  "notes",
  "materials",
];

let isSyncing = false;
let listenersInitialized = false;

// Broadcast status to UI components
export function broadcastSyncStatus(detail) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("uni:sync-status", { detail }));
}

export function broadcastDataUpdated() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("uni:data-updated"));
}

export async function getSyncState() {
  if (!isBrowser()) {
    return { isOnline: true, isSyncing: false, pendingCount: 0, lastSynced: null };
  }

  const outbox = await getOutbox();
  const lastSynced = await getMeta("last_synced_at");
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  return {
    isOnline,
    isSyncing,
    pendingCount: outbox.length,
    lastSynced,
  };
}

// Upload pending local mutations to Supabase
async function flushOutbox(userId) {
  const pending = await getOutbox();
  if (!pending.length) return 0;

  for (const item of pending) {
    try {
      const { table, action, id, payload } = item;

      if (action === "insert") {
        const rowData = { ...payload };
        if (!rowData.user_id && userId) {
          rowData.user_id = userId;
        }
        const { error } = await supabase.from(table).upsert(rowData);
        if (!error) {
          await removeOutbox(item.outboxId);
        } else {
          console.warn(`[Sync] Failed to insert ${table}:`, error.message);
        }
      } else if (action === "update") {
        const { error } = await supabase.from(table).update(payload).eq("id", id);
        if (!error) {
          await removeOutbox(item.outboxId);
        } else {
          console.warn(`[Sync] Failed to update ${table}:`, error.message);
        }
      } else if (action === "delete") {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (!error) {
          await removeOutbox(item.outboxId);
        } else {
          console.warn(`[Sync] Failed to delete ${table}:`, error.message);
        }
      }
    } catch (err) {
      console.warn("[Sync] Error replaying outbox entry:", err);
    }
  }

  const remaining = await getOutbox();
  return remaining.length;
}

// Download canonical data from Supabase into local IndexedDB
export async function downloadCloudData(userId) {
  if (!userId) return;

  const queries = ENTITY_TABLES.map((t) =>
    supabase.from(t).select("*").then(({ data, error }) => ({ table: t, data: data || [], error }))
  );

  const results = await Promise.all(queries);

  for (const { table, data, error } of results) {
    if (!error && Array.isArray(data)) {
      // Clear and re-populate the table with clean remote state
      await dbClear(table);
      if (data.length > 0) {
        await dbPutMany(table, data);
      }
    }
  }

  const now = new Date().toISOString();
  await setMeta("last_synced_at", now);
}

// Main sync routine
export async function syncNow(forceFullDownload = false) {
  if (!isBrowser()) return;
  if (isSyncing) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const state = await getSyncState();
    broadcastSyncStatus({ ...state, state: "offline" });
    return;
  }

  isSyncing = true;
  broadcastSyncStatus({ isOnline: true, isSyncing: true, state: "syncing" });

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    const userId = session?.user?.id;

    if (!userId) {
      isSyncing = false;
      const state = await getSyncState();
      broadcastSyncStatus({ ...state, state: "idle" });
      return;
    }

    // 1. Upload pending local outbox changes to Supabase
    const pendingRemaining = await flushOutbox(userId);

    // 2. Download latest cloud data to ensure IndexedDB matches server
    await downloadCloudData(userId);

    // 3. Mark success and notify views
    const lastSynced = new Date().toISOString();
    await setMeta("last_synced_at", lastSynced);

    isSyncing = false;
    broadcastSyncStatus({
      isOnline: true,
      isSyncing: false,
      pendingCount: pendingRemaining,
      lastSynced,
      state: "synced",
    });
    broadcastDataUpdated();
  } catch (err) {
    console.warn("[Sync] Sync failed:", err);
    isSyncing = false;
    const state = await getSyncState();
    broadcastSyncStatus({ ...state, state: "error" });
  }
}

// Register browser connectivity listeners
export function initSyncListeners() {
  if (!isBrowser() || listenersInitialized) return;
  listenersInitialized = true;

  window.addEventListener("online", () => {
    console.log("[Sync] Device came online. Initiating sync...");
    syncNow();
  });

  window.addEventListener("offline", async () => {
    console.log("[Sync] Device went offline.");
    const state = await getSyncState();
    broadcastSyncStatus({ ...state, state: "offline" });
  });

  // Optional: auto-sync when tab gains focus if connected
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      syncNow();
    }
  });

  // Run initial sync after a short delay on startup
  setTimeout(() => {
    if (navigator.onLine) {
      syncNow();
    }
  }, 1500);
}


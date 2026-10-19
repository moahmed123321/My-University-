// Local-first database mutation and query helpers
import { supabase } from "./supabase";
import {
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
  enqueueOutbox,
  removeOutbox,
  generateUUID,
  isBrowser,
} from "./offlineDb";
import { broadcastDataUpdated, broadcastSyncStatus, getSyncState } from "./syncManager";

// Helper to get active user ID from cached session
async function getActiveUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

// Insert a new row (offline-first with immediate local store and outbox queue)
export async function insertRow(table, values) {
  const id = values.id || generateUUID();
  const userId = values.user_id || (await getActiveUserId());
  const now = new Date().toISOString();

  const record = {
    ...values,
    id,
    user_id: userId,
    created_at: values.created_at || now,
  };

  // 1. Immediately write to IndexedDB
  await dbPut(table, record);

  // 2. Queue in outbox
  const outboxEntry = await enqueueOutbox({
    table,
    action: "insert",
    id,
    payload: record,
  });

  broadcastDataUpdated();
  const syncState = await getSyncState();
  broadcastSyncStatus(syncState);

  // 3. If online, attempt immediate cloud sync
  if (typeof navigator !== "undefined" && navigator.onLine && outboxEntry) {
    supabase
      .from(table)
      .upsert(record)
      .then(async ({ error }) => {
        if (!error && outboxEntry.outboxId) {
          await removeOutbox(outboxEntry.outboxId);
          const state = await getSyncState();
          broadcastSyncStatus(state);
        }
      })
      .catch((err) => {
        console.warn(`[OfflineDB] Background insert failed for ${table}:`, err);
      });
  }

  return { data: record, error: null };
}

// Update a row (offline-first with immediate local store and outbox queue)
export async function updateRow(table, id, values) {
  // 1. Update in local IndexedDB
  const existing = (await dbGet(table, id)) || {};
  const updated = { ...existing, ...values, id };
  await dbPut(table, updated);

  // 2. Queue in outbox
  const outboxEntry = await enqueueOutbox({
    table,
    action: "update",
    id,
    payload: values,
  });

  broadcastDataUpdated();
  const syncState = await getSyncState();
  broadcastSyncStatus(syncState);

  // 3. If online, attempt immediate cloud sync
  if (typeof navigator !== "undefined" && navigator.onLine && outboxEntry) {
    supabase
      .from(table)
      .update(values)
      .eq("id", id)
      .then(async ({ error }) => {
        if (!error && outboxEntry.outboxId) {
          await removeOutbox(outboxEntry.outboxId);
          const state = await getSyncState();
          broadcastSyncStatus(state);
        }
      })
      .catch((err) => {
        console.warn(`[OfflineDB] Background update failed for ${table}:`, err);
      });
  }

  return { data: updated, error: null };
}

// Delete a row (offline-first with immediate local store and outbox queue)
export async function removeRow(table, id, message = "Delete this item?") {
  if (message && !window.confirm(message)) return false;

  // 1. Immediately delete from local IndexedDB
  await dbDelete(table, id);

  // 2. Queue in outbox
  const outboxEntry = await enqueueOutbox({
    table,
    action: "delete",
    id,
    payload: { id },
  });

  broadcastDataUpdated();
  const syncState = await getSyncState();
  broadcastSyncStatus(syncState);

  // 3. If online, attempt immediate cloud sync
  if (typeof navigator !== "undefined" && navigator.onLine && outboxEntry) {
    supabase
      .from(table)
      .delete()
      .eq("id", id)
      .then(async ({ error }) => {
        if (!error && outboxEntry.outboxId) {
          await removeOutbox(outboxEntry.outboxId);
          const state = await getSyncState();
          broadcastSyncStatus(state);
        }
      })
      .catch((err) => {
        console.warn(`[OfflineDB] Background delete failed for ${table}:`, err);
      });
  }

  return true;
}

// Toggle done flag on tasks or assignments
export async function toggleDone(table, row) {
  const newDone = !row.done;
  return updateRow(table, row.id, { done: newDone });
}

// Stale-While-Revalidate helper to load table data:
// Immediately returns local IndexedDB data, and optionally syncs with Supabase in background
export async function getTableData(table, filterFn = null) {
  if (!isBrowser()) return [];
  return dbGetAll(table, filterFn);
}

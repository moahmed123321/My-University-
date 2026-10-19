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

export const TABLE_ALLOWED_COLUMNS = {
  courses: ["id", "user_id", "name", "code", "professor", "color", "created_at"],
  lectures: ["id", "user_id", "course_id", "kind", "day_of_week", "start_time", "end_time", "room"],
  exams: ["id", "user_id", "course_id", "exam_date", "exam_time", "room"],
  tasks: ["id", "user_id", "course_id", "title", "due_date", "done", "created_at"],
  assignments: ["id", "user_id", "course_id", "title", "due_date", "done", "created_at"],
  topics: ["id", "user_id", "course_id", "title", "created_at"],
  notes: ["id", "user_id", "course_id", "title", "content", "created_at"],
  materials: ["id", "user_id", "course_id", "title", "url", "created_at"],
  course_notes: ["id", "user_id", "course_id", "parent_id", "type", "title", "content", "created_at", "updated_at"],
};

export function sanitizeRecord(table, values = {}, userId = null) {
  const allowed = TABLE_ALLOWED_COLUMNS[table];
  const cleaned = {};

  for (const key of Object.keys(values)) {
    if (!allowed || allowed.includes(key)) {
      cleaned[key] = values[key];
    }
  }

  // Ensure type correctness for lectures day_of_week
  if (table === "lectures" && cleaned.day_of_week !== undefined && cleaned.day_of_week !== null) {
    cleaned.day_of_week = Number(cleaned.day_of_week);
  }

  // Ensure user_id is properly handled
  if (!cleaned.user_id && userId) {
    cleaned.user_id = userId;
  }
  if (!cleaned.user_id) {
    delete cleaned.user_id;
  }

  // Add created_at only for tables that support it
  if (allowed && allowed.includes("created_at") && !cleaned.created_at) {
    cleaned.created_at = new Date().toISOString();
  }

  return cleaned;
}

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

  const record = sanitizeRecord(table, { ...values, id }, userId);

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
    try {
      const { error } = await supabase.from(table).upsert(record);
      if (!error && outboxEntry.outboxId) {
        await removeOutbox(outboxEntry.outboxId);
        const state = await getSyncState();
        broadcastSyncStatus(state);
      } else if (error) {
        console.warn(`[OfflineDB] Immediate insert failed for ${table}:`, error.message);
      }
    } catch (err) {
      console.warn(`[OfflineDB] Immediate insert exception for ${table}:`, err);
    }
  }

  return { data: record, error: null };
}

// Update a row (offline-first with immediate local store and outbox queue)
export async function updateRow(table, id, values) {
  const userId = await getActiveUserId();

  // 1. Update in local IndexedDB
  const existing = (await dbGet(table, id)) || {};
  const updated = sanitizeRecord(table, { ...existing, ...values, id }, userId);
  await dbPut(table, updated);

  const cleanUpdatePayload = sanitizeRecord(table, values, userId);

  // 2. Queue in outbox
  const outboxEntry = await enqueueOutbox({
    table,
    action: "update",
    id,
    payload: cleanUpdatePayload,
  });

  broadcastDataUpdated();
  const syncState = await getSyncState();
  broadcastSyncStatus(syncState);

  // 3. If online, attempt immediate cloud sync
  if (typeof navigator !== "undefined" && navigator.onLine && outboxEntry) {
    try {
      const { error } = await supabase.from(table).update(cleanUpdatePayload).eq("id", id);
      if (!error && outboxEntry.outboxId) {
        await removeOutbox(outboxEntry.outboxId);
        const state = await getSyncState();
        broadcastSyncStatus(state);
      } else if (error) {
        console.warn(`[OfflineDB] Immediate update failed for ${table}:`, error.message);
      }
    } catch (err) {
      console.warn(`[OfflineDB] Immediate update exception for ${table}:`, err);
    }
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

import { supabase } from "./supabase";

export async function toggleDone(table, row) {
  const { error } = await supabase.from(table).update({ done: !row.done }).eq("id", row.id);
  if (error) alert(error.message);
}

export async function removeRow(table, id, message = "Delete this item?") {
  if (!window.confirm(message)) return false;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    alert(error.message);
    return false;
  }
  return true;
}

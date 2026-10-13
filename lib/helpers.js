// day_of_week in the database: 0 = Sunday ... 6 = Saturday
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Order shown in the week table (starts on Saturday).
// Want Monday first? Change to [1, 2, 3, 4, 5, 6, 0]
export const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

// Today's date as YYYY-MM-DD in your local time
export function isoDate(d = new Date()) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

export function fmtTime(t) {
  return t ? t.slice(0, 5) : "";
}

export function fmtDate(d) {
  if (!d) return "-";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function linkType(url = "") {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "Google Drive";
  if (u.includes("onedrive") || u.includes("sharepoint")) return "OneDrive";
  return "Link";
}

// Not-done items first (by due date), done items last
export function sortItems(rows) {
  return [...rows].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

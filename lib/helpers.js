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
  if (!t) return "";

  const str = String(t).trim();
  if (/(am|pm)/i.test(str)) return str;

  const parts = str.split(":");
  if (parts.length < 2) return str;

  let hour = parseInt(parts[0], 10);
  const minute = parts[1].slice(0, 2);

  if (isNaN(hour)) return str;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

export function fmtDate(d) {
  if (!d) return "-";
  let dt;
  if (typeof d === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-").map(Number);
      dt = new Date(y, m - 1, day);
    } else {
      dt = new Date(d);
    }
  } else if (d instanceof Date) {
    dt = d;
  } else {
    dt = new Date(d);
  }
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
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

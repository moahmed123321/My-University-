"use client";

const LECTURE_COLORS_KEY = "uni_lecture_colors";

export const LECTURE_COLOR_PRESETS = [
  "#2563eb", // Royal Blue
  "#7c3aed", // Violet
  "#0891b2", // Cyan
  "#059669", // Emerald
  "#d97706", // Amber
  "#c8102e", // Crimson / Red
  "#db2777", // Pink / Magenta
  "#475569", // Slate
  "#ea580c", // Orange
  "#4f46e5", // Indigo
  "#0d9488", // Teal
  "#854d0e", // Bronze
];

export function getStoredLectureColors() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LECTURE_COLORS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setStoredLectureColor(lectureId, color) {
  if (typeof window === "undefined" || !lectureId) return;
  try {
    const map = getStoredLectureColors();
    map[lectureId] = color;
    localStorage.setItem(LECTURE_COLORS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save lecture color:", e);
  }
}

export function deleteStoredLectureColor(lectureId) {
  if (typeof window === "undefined" || !lectureId) return;
  try {
    const map = getStoredLectureColors();
    delete map[lectureId];
    localStorage.setItem(LECTURE_COLORS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to delete lecture color:", e);
  }
}

export function getLectureColor(lecture, fallbackCourseColor = null) {
  if (!lecture) return fallbackCourseColor || LECTURE_COLOR_PRESETS[0];
  
  // 1. Direct lecture color (if column ever added)
  if (lecture.color) return lecture.color;

  // 2. Check localStorage saved custom colors
  if (typeof window !== "undefined") {
    const map = getStoredLectureColors();
    if (map[lecture.id]) return map[lecture.id];
  }

  // 3. Check course color
  if (lecture.courses?.color) return lecture.courses.color;
  if (fallbackCourseColor) return fallbackCourseColor;

  // 4. Fallback hash color
  const id = lecture.course_id || lecture.id || "";
  const n = Number(id);
  const i = Number.isFinite(n)
    ? n
    : String(id)
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);
  return LECTURE_COLOR_PRESETS[Math.abs(i) % LECTURE_COLOR_PRESETS.length];
}

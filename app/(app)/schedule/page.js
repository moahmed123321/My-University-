"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_NAMES, DAY_ORDER, fmtTime, fmtDate, isoDate } from "@/lib/helpers";
import { removeRow } from "@/lib/db";
import { Empty } from "@/components/ui";
import AddModal from "@/components/AddModal";
import EditLectureModal from "@/components/EditLectureModal";
import {
  CalendarDays,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- Design Tokens & Color Helpers ---------- */
const BRAND = "#c8102e";
const INFO = "#2563eb"; // Labs
const WARN = "#d97706"; // Tutorials / Sections
const COURSE_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#059669", // emerald
  "#d97706", // amber
  "#c8102e", // crimson
  "#db2777", // pink
  "#475569", // slate
];

const courseColor = (id, fallbackColor) => {
  if (fallbackColor) return fallbackColor;
  const n = Number(id);
  const i = Number.isFinite(n)
    ? n
    : String(id || "")
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);
  return COURSE_COLORS[Math.abs(i) % COURSE_COLORS.length];
};

const kindColor = (kind, courseCol) => {
  const k = String(kind || "").toLowerCase();
  if (k.startsWith("lab")) return INFO;
  if (k.startsWith("tut") || k.startsWith("sec")) return WARN;
  return courseCol || BRAND;
};

const mix = (c, pct, base = "hsl(var(--card))") =>
  `color-mix(in srgb, ${c} ${pct}%, ${base})`;

const daysUntil = (d) =>
  Math.round((new Date(d + "T00:00") - new Date(isoDate() + "T00:00")) / 864e5);

const relLabel = (n) => {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n > 1) return `In ${n} days`;
  return n === -1 ? "Yesterday" : `${-n} days ago`;
};

// 12-hour hour label (e.g. "8 AM", "12 PM", "3 PM")
function formatHourLabel(h) {
  if (h === 0 || h === 24) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// 12-hour formatted time (e.g. "10:30 AM")
function formatDisplayTime(t) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ? mStr.slice(0, 2) : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

const HOUR_HEIGHT = 64; // px per hour (approx 1.06 px per minute)

/* ---------- Google Calendar Overlapping Events Layout Algorithm ---------- */
function computeDayLayout(events, startHour) {
  if (!events || events.length === 0) return [];

  // 1. Convert start_time and end_time to minutes
  const parsed = events.map((ev) => {
    const [sH, sM] = (ev.start_time || "08:00").split(":").map(Number);
    const startMin = sH * 60 + (sM || 0);
    let endMin;
    if (ev.end_time) {
      const [eH, eM] = ev.end_time.split(":").map(Number);
      endMin = eH * 60 + (eM || 0);
    } else {
      endMin = startMin + 90; // Default 1.5h
    }
    if (endMin <= startMin) endMin = startMin + 60;
    return {
      ...ev,
      startMin,
      endMin,
      duration: endMin - startMin,
    };
  });

  // 2. Sort by start time, then longer duration first
  parsed.sort((a, b) => a.startMin - b.startMin || b.duration - a.duration);

  // 3. Cluster mutually overlapping events together
  const clusters = [];
  let currentCluster = [];
  let clusterEnd = -1;

  for (const ev of parsed) {
    if (currentCluster.length === 0 || ev.startMin < clusterEnd) {
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = ev.endMin;
    }
  }
  if (currentCluster.length) clusters.push(currentCluster);

  // 4. In each cluster, assign columns (side-by-side like Google Calendar)
  const result = [];
  for (const cluster of clusters) {
    const columns = []; // tracks end time of each column
    for (const ev of cluster) {
      let placedCol = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= ev.startMin) {
          columns[i] = ev.endMin;
          placedCol = i;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columns.length;
        columns.push(ev.endMin);
      }
      ev.colIndex = placedCol;
    }

    const totalCols = columns.length;
    for (const ev of cluster) {
      const top = ((ev.startMin - startHour * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT, 32);
      const widthPct = 100 / totalCols;
      const leftPct = ev.colIndex * widthPct;

      result.push({
        ...ev,
        top,
        height,
        leftPct,
        widthPct,
      });
    }
  }

  return result;
}

/* ---------- Event Card Component (Google Calendar Style) ---------- */
function GoogleCalendarEvent({
  lecture,
  onClick,
  onDelete,
}) {
  const cColor = courseColor(lecture.course_id, lecture.courses?.color);
  const kColor = kindColor(lecture.kind, cColor);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(lecture);
      }}
      className="group absolute z-10 cursor-pointer overflow-hidden rounded-lg p-2 text-xs transition-all hover:z-20 hover:shadow-md"
      style={{
        top: `${lecture.top}px`,
        height: `${lecture.height}px`,
        left: `calc(${lecture.leftPct}% + 2px)`,
        width: `calc(${lecture.widthPct}% - 4px)`,
        backgroundColor: mix(kColor, 14, "hsl(var(--card))"),
        borderLeft: `4px solid ${kColor}`,
        borderTop: `1px solid ${mix(kColor, 30, "hsl(var(--border))")}`,
        borderRight: `1px solid ${mix(kColor, 30, "hsl(var(--border))")}`,
        borderBottom: `1px solid ${mix(kColor, 30, "hsl(var(--border))")}`,
      }}
      title={`${lecture.courses?.name} (${lecture.kind || "Lecture"}) - Click to edit`}
    >
      <div className="flex items-start justify-between gap-1 leading-tight">
        <b className="truncate font-semibold text-foreground text-[12px]">
          {lecture.courses?.name}
        </b>
        <button
          type="button"
          aria-label="Delete lecture"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(lecture.id);
          }}
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background/80 hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground tabular-nums">
        <span>
          {fmtTime(lecture.start_time)}
          {lecture.end_time ? ` – ${fmtTime(lecture.end_time)}` : ""}
        </span>
        {lecture.kind && (
          <span
            className="rounded px-1 py-0.2 text-[9.5px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: mix(kColor, 20),
              color: kColor,
            }}
          >
            {lecture.kind}
          </span>
        )}
      </div>

      {lecture.room && lecture.height >= 50 && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/90">
          <MapPin className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate">{lecture.room}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Exam Card Component ---------- */
function ExamCard({ x, past, onDelete }) {
  const c = courseColor(x.course_id, x.courses?.color);
  const n = daysUntil(x.exam_date);
  const urgent = !past && n <= 1;
  const soon = !past && n > 1 && n <= 5;
  const pillColor = urgent ? "#b91c1c" : soon ? WARN : null;

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md",
        past && "opacity-60"
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h3
          className="text-[15px] font-semibold"
          style={{ color: mix(c, 45, "hsl(var(--foreground))") }}
        >
          {x.courses?.name}
        </h3>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={
            pillColor
              ? { background: mix(pillColor, 12), color: pillColor }
              : {
                  background: "hsl(var(--muted))",
                  color: "hsl(var(--muted-foreground))",
                }
          }
        >
          {fmtDate(x.exam_date)}
        </span>
      </div>

      <div className="flex items-center gap-2 font-medium text-sm">
        <i
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: c }}
        />
        {x.courses?.code || x.courses?.name}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
        <span>{fmtTime(x.exam_time) || "Time TBA"}</span>
        {x.room && (
          <>
            <span>·</span>
            <MapPin className="h-3 w-3 text-muted-foreground/70" />
            <span>{x.room}</span>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-xs font-medium text-muted-foreground">{relLabel(n)}</span>
        <button
          onClick={onDelete}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ---------- Main Schedule Page Component ---------- */
export default function SchedulePage() {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("week"); // "week" | "exams"
  const [modal, setModal] = useState(null); // "lecture" | "exam" | null
  const [modalDefaults, setModalDefaults] = useState({});
  const [editingLecture, setEditingLecture] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, +1 = next week, etc.

  // Current time tracker for live red indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  const gridContainerRef = useRef(null);

  const load = useCallback(async () => {
    const [c, l, e] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase
        .from("lectures")
        .select("*, courses(id, name, code, color)")
        .order("start_time"),
      supabase
        .from("exams")
        .select("*, courses(id, name, code, color)")
        .order("exam_date"),
    ]);
    setCourses(c.data || []);
    setLectures(l.data || []);
    setExams(e.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "exams" || t === "week") setTab(t);
    } catch {}
  }, [load]);

  // Live timer for current time indicator (updates every minute)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const changeTab = (t) => {
    setTab(t);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", t);
      window.history.replaceState(null, "", u);
    } catch {}
  };

  const todayDow = new Date().getDay();
  const today = isoDate();

  // Compute earliest and latest hours needed
  const { startHour, endHour, hours } = useMemo(() => {
    let minH = 8;
    let maxH = 19; // 7 PM

    lectures.forEach((l) => {
      if (l.start_time) {
        const h = parseInt(l.start_time.split(":")[0], 10);
        if (!isNaN(h)) minH = Math.min(minH, h);
      }
      if (l.end_time) {
        const h = parseInt(l.end_time.split(":")[0], 10);
        if (!isNaN(h)) maxH = Math.max(maxH, h + 1);
      }
    });

    minH = Math.max(minH, 6); // Cap earliest at 6 AM
    maxH = Math.min(maxH, 23); // Cap latest at 11 PM
    if (maxH <= minH) maxH = minH + 10;

    const list = [];
    for (let h = minH; h <= maxH; h++) {
      list.push(h);
    }

    return { startHour: minH, endHour: maxH, hours: list };
  }, [lectures]);

  // Scroll to 8 AM or earliest class on first render
  useEffect(() => {
    if (!loading && tab === "week" && gridContainerRef.current) {
      const scrollTarget = Math.max((startHour - 7) * HOUR_HEIGHT, 0);
      gridContainerRef.current.scrollTop = scrollTarget;
    }
  }, [loading, tab, startHour]);

  // Compute dates for the current view week (starts Saturday by DAY_ORDER)
  const weekDates = useMemo(() => {
    const now = new Date();
    // Adjust by weekOffset
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);
    const baseDay = base.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Find the Saturday of this week
    const diffToSat = (baseDay + 1) % 7;
    const sat = new Date(base);
    sat.setDate(base.getDate() - diffToSat);

    return DAY_ORDER.map((d, index) => {
      const dayDate = new Date(sat);
      dayDate.setDate(sat.getDate() + index);
      return {
        dayIndex: d,
        date: dayDate,
        dateNumber: dayDate.getDate(),
        monthName: dayDate.toLocaleDateString("en-US", { month: "short" }),
        isToday: weekOffset === 0 && d === todayDow,
      };
    });
  }, [weekOffset, todayDow]);

  const weekRangeLabel = useMemo(() => {
    if (!weekDates.length) return "";
    const first = weekDates[0].date;
    const last = weekDates[weekDates.length - 1].date;
    const fM = first.toLocaleDateString("en-US", { month: "short" });
    const lM = last.toLocaleDateString("en-US", { month: "short" });
    const year = first.getFullYear();
    if (fM === lM) {
      return `${fM} ${first.getDate()} – ${last.getDate()}, ${year}`;
    }
    return `${fM} ${first.getDate()} – ${lM} ${last.getDate()}, ${year}`;
  }, [weekDates]);

  // Layout all lectures grouped by day of week
  const dayPositionedLectures = useMemo(() => {
    const map = {};
    DAY_ORDER.forEach((d) => {
      const dayLectures = lectures.filter((l) => l.day_of_week === d);
      map[d] = computeDayLayout(dayLectures, startHour);
    });
    return map;
  }, [lectures, startHour]);

  // Current time position in px
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentTimeTop = ((currentMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const isCurrentTimeVisible =
    currentMinutes >= startHour * 60 && currentMinutes <= (endHour + 1) * 60;

  // Handle cell click to add event at that specific day and hour
  function handleCellClick(day, hour) {
    const sH = String(hour).padStart(2, "0");
    const eH = String(Math.min(hour + 1, 23)).padStart(2, "0");
    setModalDefaults({
      day_of_week: String(day),
      start_time: `${sH}:00`,
      end_time: `${eH}:30`,
    });
    setModal("lecture");
  }

  const del = async (table, id) => {
    if (confirm("Are you sure you want to delete this event?")) {
      if (await removeRow(table, id)) load();
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Google Calendar Header Controls ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: + Create Event Button & Date Title */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Google Calendar Style "+ Create" Button */}
          <div className="relative">
            <button
              onClick={() => {
                setModalDefaults({});
                setModal(tab === "exams" ? "exam" : "lecture");
              }}
              className="inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:bg-muted hover:shadow-md"
            >
              {/* Google 4-color inspired Plus */}
              <svg width="20" height="20" viewBox="0 0 36 36">
                <path fill="#4285F4" d="M16 16v14h4V16h14v-4H20V-2h-4v14H2v4z" />
                <path fill="#34A853" d="M30 16H20l-4-4h14z" />
                <path fill="#FBBC05" d="M6 16h10l4 4H6z" />
                <path fill="#EA4335" d="M20 6V-2h-4v8z" />
              </svg>
              <span>{tab === "exams" ? "Add Exam" : "Add Lecture"}</span>
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Today
          </button>

          {/* Prev / Next Week Navigation */}
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Week Date Display */}
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              {weekRangeLabel}
            </span>
            {weekOffset !== 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {weekOffset > 0 ? `+${weekOffset}w` : `${weekOffset}w`}
              </span>
            )}
          </div>
        </div>

        {/* Right: View Tabs & Action */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted p-1">
            <button
              onClick={() => changeTab("week")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                tab === "week"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Week View
            </button>
            <button
              onClick={() => changeTab("exams")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                tab === "exams"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Exams ({exams.length})
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading your calendar schedule...
        </p>
      ) : tab === "week" ? (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Scrollable Google Calendar Grid */}
          <div
            ref={gridContainerRef}
            className="relative max-h-[calc(100vh-210px)] min-h-[660px] overflow-y-auto overflow-x-auto"
          >
            <div className="min-w-[880px]">
              {/* Sticky Top Header: Days of the Week */}
              <div className="sticky top-0 z-30 flex border-b bg-card/95 backdrop-blur">
                {/* Top-left gutter cell (Timezone / GMT indicator) */}
                <div className="w-16 shrink-0 border-r border-border/60 p-2.5 text-center text-[10px] font-semibold text-muted-foreground">
                  GMT+3
                </div>

                {/* 7 Day Headers */}
                <div className="grid flex-1 grid-cols-7 divide-x divide-border/60">
                  {weekDates.map((d) => (
                    <div
                      key={d.dayIndex}
                      className={cn(
                        "flex flex-col items-center justify-center py-2.5 transition-colors",
                        d.isToday && "bg-primary/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-wider",
                          d.isToday ? "font-bold text-primary" : "text-muted-foreground"
                        )}
                      >
                        {DAY_NAMES[d.dayIndex].slice(0, 3)}
                      </span>

                      {/* Google Calendar Date Bubble */}
                      <div
                        className={cn(
                          "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                          d.isToday
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground hover:bg-muted/70"
                        )}
                      >
                        {d.dateNumber}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Body: Time Gutter & Days Columns */}
              <div
                className="relative flex"
                style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
              >
                {/* Left Time Gutter */}
                <div className="relative w-16 shrink-0 border-r border-border/60 select-none">
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute right-2 -translate-y-2.5 text-[11px] font-medium text-muted-foreground tabular-nums"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    >
                      {formatHourLabel(h)}
                    </div>
                  ))}
                </div>

                {/* 7 Day Columns Grid */}
                <div className="relative grid flex-1 grid-cols-7 divide-x divide-border/60">
                  {DAY_ORDER.map((d) => {
                    const isToday = weekOffset === 0 && d === todayDow;
                    const dayLectures = dayPositionedLectures[d] || [];

                    return (
                      <div
                        key={d}
                        className={cn(
                          "relative h-full transition-colors",
                          isToday && "bg-primary/[0.015]"
                        )}
                      >
                        {/* Hour horizontal grid lines & clickable cells */}
                        {hours.map((h, i) => (
                          <div
                            key={h}
                            onClick={() => handleCellClick(d, h)}
                            className="group absolute left-0 right-0 border-t border-border/50 transition-colors hover:bg-primary/[0.04] cursor-pointer"
                            style={{
                              top: `${i * HOUR_HEIGHT}px`,
                              height: `${HOUR_HEIGHT}px`,
                            }}
                            title={`Click to add lecture at ${formatHourLabel(h)} on ${DAY_NAMES[d]}`}
                          >
                            {/* Half-hour dotted divider */}
                            <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border/20 pointer-events-none" />

                            {/* Hover prompt */}
                            <span className="absolute right-2 top-2 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              + Add
                            </span>
                          </div>
                        ))}

                        {/* Live Red Current Time Indicator */}
                        {isToday && isCurrentTimeVisible && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                            style={{ top: `${currentTimeTop}px` }}
                          >
                            {/* Red dot */}
                            <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-600 shadow-xs" />
                            {/* Red line */}
                            <div className="h-[2px] flex-1 bg-red-600 shadow-xs" />
                          </div>
                        )}

                        {/* Positioned Lecture Event Blocks */}
                        {dayLectures.map((l) => (
                          <GoogleCalendarEvent
                            key={l.id}
                            lecture={l}
                            onClick={(lec) => setEditingLecture(lec)}
                            onDelete={(id) => del("lectures", id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : sortedExams.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-xs">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-semibold text-foreground">No exams scheduled</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add upcoming midterm and final exams to keep track of your dates.
          </p>
          <button
            onClick={() => {
              setModalDefaults({});
              setModal("exam");
            }}
            className="btn-primary mt-4 inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Exam
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedExams.map((x) => (
            <ExamCard
              key={x.id}
              x={x}
              past={x.exam_date < today}
              onDelete={() => del("exams", x.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Add Modal (Pre-filled on Cell Click) ─── */}
      {modal && (
        <AddModal
          type={modal}
          courses={courses}
          initialValues={modalDefaults}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* ─── Edit Lecture Modal (On Event Click) ─── */}
      {editingLecture && (
        <EditLectureModal
          lecture={editingLecture}
          courses={courses}
          onClose={() => setEditingLecture(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}
    </div>
  );
}

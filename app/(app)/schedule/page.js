"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_NAMES, DAY_ORDER, fmtTime, isoDate } from "@/lib/helpers";
import { removeRow, updateRow } from "@/lib/db";
import { dbGetAll, dbPutMany } from "@/lib/offlineDb";
import AddModal from "@/components/AddModal";
import EditLectureModal from "@/components/EditLectureModal";
import EditExamModal from "@/components/EditExamModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getLectureColor,
  LECTURE_COLOR_PRESETS,
} from "@/lib/lectureColors";
import {
  CalendarDays,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Trash2,
  GraduationCap,
  GripVertical,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mix = (c, pct, base = "hsl(var(--card))") =>
  `color-mix(in srgb, ${c} ${pct}%, ${base})`;

// 12-hour hour label (e.g. "8 AM", "12 PM", "3 PM")
function formatHourLabel(h) {
  const num = Number(h);
  if (isNaN(num)) return String(h);
  if (num === 0 || num === 24) return "12 AM";
  if (num < 12) return `${num} AM`;
  if (num === 12) return "12 PM";
  return `${num - 12} PM`;
}

function formatMinutesToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}:00`;
}

const HOUR_HEIGHT = 64; // px per hour (approx 1.06 px per minute)

/* ---------- Google Calendar Overlapping Events Layout Algorithm ---------- */
function computeDayLayout(events, startHour) {
  if (!events || events.length === 0) return [];

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

  parsed.sort((a, b) => a.startMin - b.startMin || b.duration - a.duration);

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

  const result = [];
  for (const cluster of clusters) {
    const columns = [];
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
      const height = Math.max(((ev.endMin - ev.startMin) / 60) * HOUR_HEIGHT, 34);
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

/* ---------- Google Calendar Event Component with Mouse Drag-and-Drop ---------- */
function GoogleCalendarEvent({
  lecture,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
}) {
  const customColor = getLectureColor(lecture, lecture.courses?.color);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lecture)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick(lecture);
      }}
      className={cn(
        "group absolute z-10 cursor-grab active:cursor-grabbing overflow-hidden rounded-lg p-2 text-xs transition-shadow hover:z-20 hover:shadow-lg select-none",
        isDragging && "opacity-40 ring-2 ring-primary scale-[0.98]"
      )}
      style={{
        top: `${lecture.top}px`,
        height: `${lecture.height}px`,
        left: `calc(${lecture.leftPct}% + 2px)`,
        width: `calc(${lecture.widthPct}% - 4px)`,
        backgroundColor: mix(customColor, 15, "hsl(var(--card))"),
        borderLeft: `4px solid ${customColor}`,
        borderTop: `1px solid ${mix(customColor, 35, "hsl(var(--border))")}`,
        borderRight: `1px solid ${mix(customColor, 35, "hsl(var(--border))")}`,
        borderBottom: `1px solid ${mix(customColor, 35, "hsl(var(--border))")}`,
      }}
      title={`${lecture.courses?.name} (${lecture.kind || "Lecture"}) · Drag to move time/day`}
    >
      <div className="flex items-start justify-between gap-1 leading-tight">
        <div className="flex items-center gap-1 min-w-0">
          <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          <b className="truncate font-bold text-foreground text-[12px]">
            {lecture.courses?.name}
          </b>
        </div>
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
            className="rounded px-1 py-0.2 text-[9.5px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: mix(customColor, 22),
              color: customColor,
            }}
          >
            {lecture.kind}
          </span>
        )}
      </div>

      {(lecture.courses?.professor || lecture.room) && lecture.height >= 48 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/90">
          {lecture.courses?.professor && (
            <div className="flex items-center gap-1 min-w-0" title={`Instructor: ${lecture.courses.professor}`}>
              <User className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{lecture.courses.professor}</span>
            </div>
          )}
          {lecture.room && (
            <div className="flex items-center gap-1 min-w-0" title={`Room: ${lecture.room}`}>
              <MapPin className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{lecture.room}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Unique Official Exam Card in Schedule Grid (Cover Style) ---------- */
function ScheduleExamCoverEvent({ exam, top, height, onClick }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(exam);
      }}
      className="group absolute left-1 right-1 z-15 cursor-pointer overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900 text-white shadow-md transition-all hover:z-25 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      title={`EXAM: ${exam.courses?.name} · Click to edit or delete`}
    >
      {/* Unique Cover Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-700/80 bg-slate-950 px-2 py-1 dark:bg-black/60">
        <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-amber-300">
          <GraduationCap className="h-3 w-3 text-amber-400" />
          OFFICIAL EXAM
        </span>
        {exam.exam_time && (
          <span className="text-[10px] font-bold tabular-nums text-slate-300">
            {fmtTime(exam.exam_time)}
          </span>
        )}
      </div>

      {/* Unique Cover Body */}
      <div className="p-2 leading-tight">
        <b className="block truncate text-xs font-bold text-white">
          {exam.courses?.name}
        </b>
        {exam.courses?.code && (
          <span className="text-[10px] text-slate-400 font-medium">
            {exam.courses?.code}
          </span>
        )}
        {exam.room && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-200/90 font-medium">
            <MapPin className="h-2.5 w-2.5 text-amber-400 shrink-0" />
            <span className="truncate">{exam.room}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Standard Add Button with Dropdown (Lecture is default) ---------- */
function AddActionButton({ onSelect, className }) {
  return (
    <div className={cn("inline-flex items-center rounded-xl bg-primary text-primary-foreground shadow-xs", className)}>
      {/* Primary Click: Adds Lecture directly by default */}
      <button
        type="button"
        onClick={() => onSelect("lecture")}
        className="inline-flex items-center gap-1.5 rounded-l-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        title="Add Lecture (Default)"
      >
        <Plus className="h-4 w-4" />
        <span>Add</span>
      </button>

      <div className="h-4 w-px bg-primary-foreground/30" />

      {/* Dropdown Menu for options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-r-xl px-2 py-2 text-primary-foreground transition hover:bg-primary/90"
            aria-label="Add options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={() => onSelect("lecture")}>
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-semibold text-xs">Lecture (Default)</span>
              <span className="text-[10px] text-muted-foreground">Timetable class</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSelect("lecture")}>
            <CalendarDays className="mr-2 h-4 w-4 text-blue-500" />
            <div className="flex flex-col text-left">
              <span className="font-semibold text-xs">Schedule / Section</span>
              <span className="text-[10px] text-muted-foreground">Lab or tutorial</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSelect("exam")}>
            <GraduationCap className="mr-2 h-4 w-4 text-amber-500" />
            <div className="flex flex-col text-left">
              <span className="font-semibold text-xs">Exam</span>
              <span className="text-[10px] text-muted-foreground">Midterm or final</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ---------- Main Schedule Page Component ---------- */
export default function SchedulePage() {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "lecture" | "exam" | null
  const [modalDefaults, setModalDefaults] = useState({});
  const [editingLecture, setEditingLecture] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Drag and Drop State
  const [draggedLecture, setDraggedLecture] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null); // { day, minutes }

  const [currentTime, setCurrentTime] = useState(new Date());
  const gridContainerRef = useRef(null);

  const load = useCallback(async () => {
    // 1. Immediately read from local IndexedDB
    try {
      const [localC, localL, localE] = await Promise.all([
        dbGetAll("courses"),
        dbGetAll("lectures"),
        dbGetAll("exams"),
      ]);

      if (localC.length || localL.length || localE.length) {
        const cMap = new Map(localC.map((c) => [c.id, c]));
        const joinedL = localL.map((l) => ({ ...l, courses: cMap.get(l.course_id) || null }));
        const joinedE = localE.map((e) => ({ ...e, courses: cMap.get(e.course_id) || null }));

        setCourses([...localC].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setLectures([...joinedL].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));
        setExams([...joinedE].sort((a, b) => (a.exam_date || "").localeCompare(b.exam_date || "")));
        setLoading(false);
      }
    } catch (e) {
      console.warn("[Schedule] Error reading local db:", e);
    }

    // 2. Fetch fresh from Supabase if online
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      const [c, l, e] = await Promise.all([
        supabase.from("courses").select("*").order("name"),
        supabase
          .from("lectures")
          .select("*, courses(id, name, code, color, professor)")
          .order("start_time"),
        supabase
          .from("exams")
          .select("*, courses(id, name, code, color)")
          .order("exam_date"),
      ]);

      if (c.data) {
        setCourses(c.data);
        dbPutMany("courses", c.data);
      }
      if (l.data) {
        setLectures(l.data);
        dbPutMany("lectures", l.data.map(({ courses, ...rest }) => rest));
      }
      if (e.data) {
        setExams(e.data);
        dbPutMany("exams", e.data.map(({ courses, ...rest }) => rest));
      }
    } catch (err) {
      console.warn("[Schedule] Network fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener("uni:data-updated", handleUpdate);
    return () => window.removeEventListener("uni:data-updated", handleUpdate);
  }, [load]);

  // Live timer for current time indicator (updates every minute)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

    exams.forEach((ex) => {
      if (ex.exam_time) {
        const h = parseInt(ex.exam_time.split(":")[0], 10);
        if (!isNaN(h)) {
          minH = Math.min(minH, h);
          maxH = Math.max(maxH, h + 2);
        }
      }
    });

    minH = Math.max(minH, 6);
    maxH = Math.min(maxH, 23);
    if (maxH <= minH) maxH = minH + 10;

    const list = [];
    for (let h = minH; h <= maxH; h++) {
      list.push(h);
    }

    return { startHour: minH, endHour: maxH, hours: list };
  }, [lectures, exams]);

  // Scroll to 8 AM on load
  useEffect(() => {
    if (!loading && gridContainerRef.current) {
      const scrollTarget = Math.max((startHour - 7) * HOUR_HEIGHT, 0);
      gridContainerRef.current.scrollTop = scrollTarget;
    }
  }, [loading, startHour]);

  // Compute dates for the current view week (starts Saturday by DAY_ORDER)
  const weekDates = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);
    const baseDay = base.getDay();
    
    // Find the Saturday of this week
    const diffToSat = (baseDay + 1) % 7;
    const sat = new Date(base);
    sat.setDate(base.getDate() - diffToSat);

    return DAY_ORDER.map((d, index) => {
      const dayDate = new Date(sat);
      dayDate.setDate(sat.getDate() + index);
      const iso = isoDate(dayDate);
      return {
        dayIndex: d,
        date: dayDate,
        isoDate: iso,
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

  // Map exams to the schedule grid by date
  const dayExams = useMemo(() => {
    const map = {};
    DAY_ORDER.forEach((d) => {
      const dateObj = weekDates.find((w) => w.dayIndex === d);
      if (!dateObj) return;
      const matching = exams.filter((ex) => ex.exam_date === dateObj.isoDate);
      map[d] = matching.map((ex) => {
        let startMin = 9 * 60; // default 9 AM
        if (ex.exam_time) {
          const [h, m] = ex.exam_time.split(":").map(Number);
          startMin = h * 60 + (m || 0);
        }
        const top = ((startMin - startHour * 60) / 60) * HOUR_HEIGHT;
        const height = Math.max((120 / 60) * HOUR_HEIGHT, 68); // 2 hours duration
        return {
          ...ex,
          top,
          height,
        };
      });
    });
    return map;
  }, [exams, weekDates, startHour]);

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

  // Mouse Drag and Drop Handlers
  function handleDragStart(e, lecture) {
    setDraggedLecture(lecture);
    e.dataTransfer.setData("text/plain", lecture.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedLecture(null);
    setDragOverInfo(null);
  }

  function handleDayDragOver(e, day) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesFromStart = Math.round(((offsetY / HOUR_HEIGHT) * 60) / 15) * 15;
    const targetMin = Math.max(startHour * 60, Math.min(endHour * 60, startHour * 60 + minutesFromStart));
    setDragOverInfo({ day, minutes: targetMin });
  }

  async function handleDayDrop(e, day) {
    e.preventDefault();
    if (!draggedLecture) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesFromStart = Math.round(((offsetY / HOUR_HEIGHT) * 60) / 15) * 15;
    const targetStartMin = Math.max(startHour * 60, Math.min(endHour * 60, startHour * 60 + minutesFromStart));
    
    // Calculate new times preserving duration
    const [origSH, origSM] = (draggedLecture.start_time || "08:00").split(":").map(Number);
    const origStart = origSH * 60 + (origSM || 0);
    let origEnd = origStart + 90;
    if (draggedLecture.end_time) {
      const [origEH, origEM] = draggedLecture.end_time.split(":").map(Number);
      origEnd = origEH * 60 + (origEM || 0);
    }
    const duration = Math.max(origEnd - origStart, 30);
    const targetEndMin = Math.min(23 * 60 + 59, targetStartMin + duration);

    const newStart = formatMinutesToTime(targetStartMin);
    const newEnd = formatMinutesToTime(targetEndMin);

    // Optimistic UI update
    setLectures((prev) =>
      prev.map((l) =>
        l.id === draggedLecture.id
          ? { ...l, day_of_week: day, start_time: newStart, end_time: newEnd }
          : l
      )
    );

    setDraggedLecture(null);
    setDragOverInfo(null);

    // Persist changes locally and to cloud
    await updateRow("lectures", draggedLecture.id, {
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
    });
  }

  const del = async (table, id) => {
    if (confirm("Are you sure you want to delete this event?")) {
      if (await removeRow(table, id)) load();
    }
  };

  function openAddModal(type = "lecture") {
    setModalDefaults({});
    setModal(type);
  }

  return (
    <div className="space-y-4">
      {/* ─── Top Navigation & Controls ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Add Button & Week Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Top Add Button with Dropdown (Lecture is default) */}
          <AddActionButton onSelect={openAddModal} />

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

      </div>

      {/* ─── Main Schedule View ─── */}
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading your calendar schedule...
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Scrollable Google Calendar Grid */}
          <div
            ref={gridContainerRef}
            className="relative max-h-[calc(100vh-220px)] min-h-[660px] overflow-y-auto overflow-x-auto"
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
                    const examsOnThisDay = dayExams[d] || [];

                    const isHoveredTarget = dragOverInfo && dragOverInfo.day === d;
                    const ghostTop = isHoveredTarget
                      ? ((dragOverInfo.minutes - startHour * 60) / 60) * HOUR_HEIGHT
                      : 0;

                    return (
                      <div
                        key={d}
                        onDragOver={(e) => handleDayDragOver(e, d)}
                        onDrop={(e) => handleDayDrop(e, d)}
                        className={cn(
                          "relative h-full transition-colors",
                          isToday && "bg-primary/[0.015]",
                          isHoveredTarget && "bg-primary/[0.06]"
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

                            <span className="absolute right-2 top-2 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              + Add
                            </span>
                          </div>
                        ))}

                        {/* Drag Ghost Preview */}
                        {isHoveredTarget && draggedLecture && (
                          <div
                            className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-2 border-dashed border-primary bg-primary/20 transition-all"
                            style={{
                              top: `${ghostTop}px`,
                              height: `${draggedLecture.height}px`,
                            }}
                          >
                            <span className="p-2 text-[11px] font-bold text-primary block">
                              Move {draggedLecture.courses?.name} here
                            </span>
                          </div>
                        )}

                        {/* Live Red Current Time Indicator */}
                        {isToday && isCurrentTimeVisible && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
                            style={{ top: `${currentTimeTop}px` }}
                          >
                            <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-600 shadow-xs" />
                            <div className="h-[2px] flex-1 bg-red-600 shadow-xs" />
                          </div>
                        )}

                        {/* Unique Official Exams Shown on the Schedule Grid */}
                        {examsOnThisDay.map((ex) => (
                          <ScheduleExamCoverEvent
                            key={ex.id}
                            exam={ex}
                            top={ex.top}
                            height={ex.height}
                            onClick={(item) => setEditingExam(item)}
                          />
                        ))}

                        {/* Positioned Lecture Event Blocks */}
                        {dayLectures.map((l) => (
                          <GoogleCalendarEvent
                            key={l.id}
                            lecture={l}
                            isDragging={draggedLecture?.id === l.id}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
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
      )}

      {/* ─── Add Modal ─── */}
      {modal && (
        <AddModal
          type={modal}
          courses={courses}
          initialValues={modalDefaults}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* ─── Edit Lecture Modal (With Color Picker) ─── */}
      {editingLecture && (
        <EditLectureModal
          lecture={editingLecture}
          courses={courses}
          onClose={() => setEditingLecture(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}

      {/* ─── Edit Exam Modal ─── */}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          courses={courses}
          onClose={() => setEditingExam(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}
    </div>
  );
}

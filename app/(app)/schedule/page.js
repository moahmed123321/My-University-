"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_NAMES, DAY_ORDER, fmtTime, fmtDate, isoDate } from "@/lib/helpers";
import { removeRow } from "@/lib/db";
import { Empty } from "@/components/ui";
import AddModal from "@/components/AddModal";

/* ---------- design tokens (taken from the My University app) ---------- */
const BRAND = "#832021";
const INFO = "#3b6ea5"; // labs
const WARN = "#b7791f"; // tutorials
const COURSE_COLORS = [
  "#7c5cbf",
  "#3b6ea5",
  "#c9822b",
  "#2f7d4f",
  "#b24a7a",
  "#2a8a8a",
];

// Same course -> same colour everywhere on the page.
const courseColor = (id) => {
  const n = Number(id);
  const i = Number.isFinite(n)
    ? n
    : String(id || "")
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);
  return COURSE_COLORS[Math.abs(i) % COURSE_COLORS.length];
};

// Lecture = brand red, Lab = blue, Tutorial = amber (as in the app's .ev blocks).
const kindColor = (kind) => {
  const k = String(kind || "").toLowerCase();
  if (k.startsWith("lab")) return INFO;
  if (k.startsWith("tut")) return WARN;
  return BRAND;
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

/* ---------- small pieces ---------- */
function Tabs({ value, onChange }) {
  const items = [
    ["week", "Weekly schedule"],
    ["exams", "Exams"],
  ];
  return (
    <div
      role="tablist"
      className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1"
    >
      {items.map(([k, label]) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={
            "whitespace-nowrap rounded-[9px] px-3.5 py-1.5 text-sm font-medium transition-colors " +
            (value === k
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EventBlock({ l, onDelete }) {
  const c = kindColor(l.kind);
  const isSpecial = c !== BRAND; // labs / tutorials get the tinted gradient look
  return (
    <div
      className="group relative mb-2 overflow-hidden rounded-lg px-2.5 py-1.5 text-xs last:mb-0"
      style={{
        borderLeft: `3px solid ${c}`,
        background: isSpecial
          ? `linear-gradient(135deg, ${mix(c, 26)}, ${mix(c, 9)})`
          : "hsl(var(--muted))",
        border: isSpecial
          ? `1px solid ${mix(c, 45, "hsl(var(--border))")}`
          : undefined,
        borderLeftWidth: 3,
        borderLeftColor: c,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <b className="font-semibold leading-snug">{l.courses?.name}</b>
        <button
          aria-label="Delete lecture"
          title="Delete"
          onClick={onDelete}
          className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      <div className="text-muted-foreground">
        {l.kind || "Lecture"}
        {l.room ? ` · ${l.room}` : ""}
      </div>
    </div>
  );
}

function ExamCard({ x, past, onDelete }) {
  const c = courseColor(x.course_id);
  const n = daysUntil(x.exam_date);
  const urgent = !past && n <= 1;
  const soon = !past && n > 1 && n <= 5;
  const pillColor = urgent ? "#b91c1c" : soon ? WARN : null;
  return (
    <div
      className={
        "group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md " +
        (past ? "opacity-60" : "")
      }
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

      <div className="flex items-center gap-2 font-medium">
        <i
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: c }}
        />
        {x.courses?.code || x.courses?.name}
      </div>
      <div className="mt-0.5 text-[13px] text-muted-foreground">
        {fmtTime(x.exam_time) || "Time TBA"} · {x.room || "Room TBA"}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{relLabel(n)}</span>
        <button
          onClick={onDelete}
          className="rounded-lg px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function SchedulePage() {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "lecture" | "exam" | null
  const [tab, setTab] = useState("week"); // "week" | "exams"

  const load = useCallback(async () => {
    const [c, l, e] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase
        .from("lectures")
        .select("*, courses(name, code)")
        .order("start_time"),
      supabase
        .from("exams")
        .select("*, courses(name, code)")
        .order("exam_date"),
    ]);
    setCourses(c.data || []);
    setLectures(l.data || []);
    setExams(e.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // lets the sidebar deep-link: /schedule?tab=exams
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "exams" || t === "week") setTab(t);
    } catch {}
  }, [load]);

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

  // One grid row per distinct time slot (start - end), earliest first.
  const slots = useMemo(() => {
    const map = new Map();
    lectures.forEach((l) => {
      const key = `${l.start_time}|${l.end_time || ""}`;
      if (!map.has(key))
        map.set(key, { key, start: l.start_time, end: l.end_time });
    });
    return [...map.values()].sort((a, b) =>
      String(a.start).localeCompare(String(b.start)),
    );
  }, [lectures]);

  // Upcoming exams first (soonest on top), then past ones.
  const sortedExams = useMemo(() => {
    const up = exams.filter((x) => x.exam_date >= today);
    const past = exams.filter((x) => x.exam_date < today).reverse();
    return [...up, ...past];
  }, [exams, today]);

  const del = async (table, id) => {
    if (await removeRow(table, id)) load();
  };

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your weekly timetable and upcoming exams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "exams" ? (
            <button
              onClick={() => setModal("exam")}
              className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-px hover:brightness-110"
              style={{
                background: `linear-gradient(180deg, #9a2a2c, ${BRAND})`,
                borderColor: BRAND,
              }}
            >
              + Add exam
            </button>
          ) : (
            <>
              <button
                onClick={() => setModal("exam")}
                className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                + Exam
              </button>
              <button
                onClick={() => setModal("lecture")}
                className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-px hover:brightness-110"
                style={{
                  background: `linear-gradient(180deg, #9a2a2c, ${BRAND})`,
                  borderColor: BRAND,
                }}
              >
                + Add schedule
              </button>
            </>
          )}
        </div>
      </div>

      <Tabs value={tab} onChange={changeTab} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tab === "week" ? (
        slots.length === 0 ? (
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <Empty>
              No classes yet. Use “Add schedule” to create your timetable.
            </Empty>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 border-b bg-card px-4 py-2.5 text-start text-[13px] font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        Time
                      </span>
                    </th>
                    {DAY_ORDER.map((d) => (
                      <th
                        key={d}
                        className={
                          "sticky top-0 border-b bg-card px-2.5 py-2.5 text-start text-[13px] font-semibold " +
                          (d === todayDow
                            ? "text-primary"
                            : "text-muted-foreground")
                        }
                        style={
                          d === todayDow
                            ? { boxShadow: `inset 0 -2px 0 ${BRAND}` }
                            : undefined
                        }
                      >
                        {DAY_NAMES[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s.key}>
                      <td className="whitespace-nowrap border-b px-4 py-3 align-middle text-[13px] font-semibold text-muted-foreground">
                        <span>{fmtTime(s.start)}</span>
                        {s.end ? (
                          <>
                            <i className="mx-1 not-italic">–</i>
                            <span>{fmtTime(s.end)}</span>
                          </>
                        ) : null}
                      </td>
                      {DAY_ORDER.map((d) => {
                        const rows = lectures.filter(
                          (l) =>
                            l.day_of_week === d &&
                            `${l.start_time}|${l.end_time || ""}` === s.key,
                        );
                        return (
                          <td
                            key={d}
                            className="min-w-[120px] border-b px-2.5 py-2 align-top"
                            style={
                              d === todayDow
                                ? { background: mix(BRAND, 4) }
                                : undefined
                            }
                          >
                            {rows.map((l) => (
                              <EventBlock
                                key={l.id}
                                l={l}
                                onDelete={() => del("lectures", l.id)}
                              />
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : sortedExams.length === 0 ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <Empty>No exams added yet.</Empty>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
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

      {modal && (
        <AddModal
          type={modal}
          courses={courses}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

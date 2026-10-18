"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DAY_NAMES, DAY_ORDER, fmtTime } from "@/lib/helpers";
import AddModal from "@/components/AddModal";
import { FocusButton } from "@/components/PomodoroTimer";
import { getLectureColor } from "@/lib/lectureColors";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * CONFIG: Learning + Assignments cards.
 * I don't know these table/column names in your database, so they are
 * all in one place. If the table is missing the cards just show an
 * empty state, nothing breaks.
 * ------------------------------------------------------------------ */
const TASKS = { table: "tasks", title: "title", done: "done" };
const ASSIGNMENTS = {
  table: "assignments",
  title: "title",
  due: "due_date",
  done: "done",
};
// Tables used by the new "Add ..." forms (rename to match your database).
const TOPICS = {
  table: "topics",
  name: "title",
  course: "course_id",
};
const NOTES = { table: "notes", name: "title", course: "course_id" };
const NEW_ASSIGN_COURSE_COL = "course_id"; // course column on the assignments table
const SCHEDULE_HREF = "/schedule";
const TASKS_HREF = "/tasks";

/* ---------- tokens (same palette as the My University app) ---------- */
const COURSE_COLORS = [
  "#7c5cbf",
  "#3b6ea5",
  "#c9822b",
  "#2f7d4f",
  "#b24a7a",
  "#2a8a8a",
];
const OK = "#2f7d4f";
const INFO = "#3b6ea5";
const WARN = "#b7791f";
const BRAND = "hsl(var(--primary))";
const DANGER = "hsl(var(--destructive))";

const courseColor = (id) => {
  const n = Number(id);
  const i = Number.isFinite(n)
    ? n
    : String(id || "")
        .split("")
        .reduce((a, c) => a + c.charCodeAt(0), 0);
  return COURSE_COLORS[Math.abs(i) % COURSE_COLORS.length];
};
const mix = (c, pct, base = "hsl(var(--card))") =>
  `color-mix(in srgb, ${c} ${pct}%, ${base})`;
const toMin = (t) =>
  t ? +String(t).slice(0, 2) * 60 + +String(t).slice(3, 5) : 0;
const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBetween = (iso) => {
  const t = new Date();
  const a = new Date(iso + "T00:00");
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((a - b) / 864e5);
};

/* ---------- icons ---------- */
const Icon = ({ name, size = 16 }) => {
  const p = {
    cal: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    cap: (
      <>
        <path d="M2 9l10-5 10 5-10 5z" />
        <path d="M6 11v5c3 2.5 9 2.5 12 0v-5" />
      </>
    ),
    file: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    prev: <path d="M15 6l-6 6 6 6" />,
    next: <path d="M9 6l6 6-6 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
  }[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p}
    </svg>
  );
};

function SectionHead({ icon, title, sub }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-primary"
        style={{ background: mix("hsl(var(--primary))", 10, "transparent") }}
      >
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        {sub ? (
          <div className="text-[13px] text-muted-foreground">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

function Pill({ children, style, className = "" }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold " +
        className
      }
      style={style}
    >
      {children}
    </span>
  );
}

const GhostBtn = (props) => (
  <button
    {...props}
    className={
      "rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground " +
      (props.className || "")
    }
  />
);

/* ---------- Quick Add menu ---------- */
function QuickAdd({ onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:brightness-110 active:scale-[.97]"
        style={{
          background: "linear-gradient(135deg, #a02d30, #6b1a1c)",
          boxShadow: "0 10px 22px -10px #a02d30e6",
        }}
      >
        <i
          className="grid h-[22px] w-[22px] place-items-center rounded-full"
          style={{ background: "#ffffff38" }}
        >
          <Icon name="plus" size={12} />
        </i>
        Quick Add
        <span
          className={
            "h-[7px] w-[7px] border-b-2 border-r-2 border-current transition-transform " +
            (open
              ? "translate-y-[2px] rotate-[225deg]"
              : "-translate-y-[2px] rotate-45")
          }
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex min-w-[200px] flex-col gap-0.5 rounded-2xl border bg-card p-1.5 shadow-lg"
        >
          {[
            ["note", "Add Note"],
            ["assignment", "Add Assignment"],
          ].map(([k, label]) => (
            <button
              key={k}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(k);
              }}
              className="rounded-[9px] px-3.5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- timeline row ---------- */
const DOT = 18; // px from the top of a row to the centre of the dot

function TimelineRow({ l, i, n, isToday, nowMin, upNext }) {
  const c = getLectureColor(l, l.courses?.color);
  const s = toMin(l.start_time);
  const e = l.end_time ? toMin(l.end_time) : s + 60;
  const now = isToday && s <= nowMin && nowMin < e;
  const past = isToday && e <= nowMin;
  const first = i === 0;
  const last = i === n - 1;
  const instructor = l.courses?.professor || l.courses?.instructor;
  const isExam = l.itemType === "exam";

  return (
    <div
      className="grid grid-cols-[48px_12px_minmax(0,1fr)] gap-2 py-1.5 sm:grid-cols-[62px_14px_minmax(0,1fr)] sm:gap-3 min-w-0 w-full"
      style={{ "--c": c }}
    >
      {/* ─── Left side: Time ─── */}
      <div
        className={cn(
          "pt-2 text-right leading-tight select-none min-w-0 shrink-0",
          past && "opacity-50"
        )}
      >
        <span
          className={cn(
            "block text-[12px] sm:text-[13.5px] font-bold tabular-nums tracking-tight",
            now ? "text-primary font-extrabold" : "text-foreground"
          )}
        >
          {fmtTime(l.start_time)}
        </span>
        {l.end_time && (
          <span className="block text-[10.5px] sm:text-[11.5px] font-medium text-muted-foreground/80 tabular-nums mt-0.5">
            {fmtTime(l.end_time)}
          </span>
        )}
      </div>

      {/* ─── Rail + Dot ─── */}
      <div className="relative shrink-0">
        {!(first && last) && (
          <span
            className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-border/60"
            style={{
              top: first ? DOT : 0,
              bottom: last ? `calc(100% - ${DOT}px)` : 0,
            }}
          />
        )}
        {now && (
          <span
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full"
            style={{
              top: DOT,
              width: 14,
              height: 14,
              background: OK,
              opacity: 0.35,
            }}
          />
        )}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform"
          style={
            now
              ? {
                  top: DOT,
                  width: 12,
                  height: 12,
                  background: OK,
                  border: "2px solid hsl(var(--card))",
                  boxShadow: `0 0 0 2px ${OK}`,
                }
              : {
                  top: DOT,
                  width: 10,
                  height: 10,
                  background: past ? mix(c, 45) : c,
                  border: "2px solid hsl(var(--card))",
                }
          }
        />
      </div>

      {/* ─── Right side: Card ─── */}
      <div
        className="min-w-0 w-full overflow-hidden rounded-2xl p-3 sm:p-3.5 transition-all shadow-xs"
        style={{
          background: mix(c, now ? 14 : 7),
          border: `1px solid ${mix(c, now ? 45 : 22, "hsl(var(--border))")}`,
          borderLeft: `4px solid ${c}`,
          opacity: past ? 0.7 : 1,
        }}
      >
        {/* Top: Title & Status Badge */}
        <div className="flex items-start justify-between gap-2 min-w-0 w-full">
          <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-foreground leading-snug min-w-0 flex-1 break-words">
            {l.courses?.name}
          </h3>

          <div className="shrink-0 whitespace-nowrap">
            {isExam ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                🎓 Exam
              </span>
            ) : now ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                style={{
                  background: mix(BRAND, 15),
                  color: BRAND,
                  border: `1px solid ${mix(BRAND, 30)}`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: BRAND }} />
                Now
              </span>
            ) : upNext ? (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
                style={{
                  background: mix(INFO, 15),
                  color: INFO,
                  border: `1px solid ${mix(INFO, 30)}`,
                }}
              >
                Up next
              </span>
            ) : null}
          </div>
        </div>

        {/* Bottom: Structure (Instructor) & Place (Room) */}
        {(instructor || l.room || (l.kind && l.kind !== "Lecture" && !isExam)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground min-w-0 w-full">
            {instructor && (
              <div className="flex items-center gap-1.5 font-medium min-w-0 max-w-full" title={`Instructor: ${instructor}`}>
                <Icon name="user" size={12} className="shrink-0 text-muted-foreground/75" />
                <span className="break-words">{instructor}</span>
              </div>
            )}
            {instructor && l.room && (
              <span className="text-muted-foreground/40 font-normal">·</span>
            )}
            {l.room && (
              <div className="flex items-center gap-1.5 font-medium min-w-0 max-w-full" title={`Place: ${l.room}`}>
                <Icon name="pin" size={12} className="shrink-0 text-muted-foreground/75" />
                <span className="break-words">{l.room}</span>
              </div>
            )}
            {l.kind && l.kind !== "Lecture" && !isExam && (
              <>
                {(instructor || l.room) && (
                  <span className="text-muted-foreground/40 font-normal">·</span>
                )}
                <span className="rounded px-1.5 py-0.2 text-[9.5px] font-bold uppercase tracking-wider bg-muted text-muted-foreground shrink-0">
                  {l.kind}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- list rows (Learning / Assignments) ---------- */
function CheckRow({ done, onToggle, title, children }) {
  return (
    <div
      className={
        "relative flex items-center gap-3 border-t py-3 first:border-t-0 " +
        (done ? "-mx-3 rounded-[10px] px-3" : "")
      }
      style={done ? { background: mix(OK, 8, "transparent") } : undefined}
    >
      {done && (
        <span
          className="absolute inset-y-2 left-0 w-[3px] rounded"
          style={{ background: OK }}
        />
      )}
      <button
        aria-label={done ? "Mark as not done" : "Mark as done"}
        onClick={onToggle}
        className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] bg-card text-white transition-colors hover:border-[#2f7d4f]"
        style={
          done
            ? {
                background: OK,
                borderColor: OK,
                boxShadow: `0 0 0 3px ${mix(OK, 22, "transparent")}`,
              }
            : undefined
        }
      >
        {done ? <Icon name="check" size={13} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={
            "truncate font-medium " +
            (done ? "text-muted-foreground line-through" : "")
          }
        >
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function DuePill({ iso, done }) {
  if (done) return null;
  if (!iso)
    return (
      <span className="text-[12.5px] text-muted-foreground">No due date</span>
    );
  const n = daysBetween(iso);
  const color =
    n < 0 || n <= 1 ? DANGER : n <= 5 ? WARN : "hsl(var(--muted-foreground))";
  const date = new Date(iso + "T00:00").toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
  const rel =
    n === 0
      ? "Today"
      : n === 1
        ? "Tomorrow"
        : n < 0
          ? `${-n} ${-n === 1 ? "day" : "days"} overdue`
          : `${n} days left`;
  return (
    <span className="flex shrink-0 flex-col items-end leading-tight">
      <b className="text-sm font-bold">
        <em className="mr-1 font-medium not-italic text-muted-foreground">
          Due
        </em>
        {date}
      </b>
      <small className="text-xs font-semibold" style={{ color }}>
        {rel}
      </small>
    </span>
  );
}

/* ---------- Add Recent Topic / Note / Assignment ---------- */
const FORMS = {
  topic: {
    title: "Add Recent Topic",
    nameLabel: "Topic name",
    cta: "Add topic",
    ok: "Topic added",
  },
  note: {
    title: "Add Note",
    nameLabel: "Title / Address",
    cta: "Add note",
    ok: "Note added",
  },
  assignment: {
    title: "New Assignment",
    nameLabel: "Assignment name",
    cta: "Add assignment",
    ok: "Assignment added",
  },
};

function QuickModal({
  type,
  courses,
  defaultCourseId,
  liveCourseId,
  onClose,
  onSaved,
}) {
  const f = FORMS[type];
  const todayIso = isoOf(new Date());
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [course, setCourse] = useState(
    String(defaultCourseId ?? courses[0]?.id ?? ""),
  );
  const [date, setDate] = useState(
    type === "assignment" ? isoOf(new Date(Date.now() + 7 * 864e5)) : todayIso,
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Please enter a title.");
    setSaving(true);
    setErr("");
    let row;
    if (type === "topic")
      row = {
        table: TOPICS.table,
        data: {
          [TOPICS.name]: name.trim(),
          [TOPICS.course]: course,
        },
      };
    else if (type === "note")
      row = {
        table: NOTES.table,
        data: {
          [NOTES.name]: name.trim(),
          [NOTES.course]: course,
          content: content.trim() || null,
        },
      };
    else
      row = {
        table: ASSIGNMENTS.table,
        data: {
          [ASSIGNMENTS.title]: name.trim(),
          [NEW_ASSIGN_COURSE_COL]: course,
          [ASSIGNMENTS.due]: date || null,
          [ASSIGNMENTS.done]: false,
        },
      };
    const { error } = await supabase.from(row.table).insert(row.data);
    setSaving(false);
    if (error) return setErr(error.message);
    const targetCourse = courses.find((c) => String(c.id) === String(course));
    onSaved(
      type === "note" && targetCourse
        ? `Note added to ${targetCourse.name}`
        : f.ok,
    );
  };

  const liveName = courses.find(
    (c) => String(c.id) === String(liveCourseId),
  )?.name;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={f.title}
        className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{f.title}</h2>

        {courses.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Create your first course to start organizing.
          </p>
        ) : (
          <>
            <label className="block space-y-1.5 text-sm font-medium">
              Course
              <select
                className="input"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {type === "topic" &&
              liveName &&
              String(course) === String(liveCourseId) ? (
                <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                  <i
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: OK }}
                  />
                  Picked automatically: {liveName}
                </span>
              ) : null}
            </label>

            <label className="block space-y-1.5 text-sm font-medium">
              {f.nameLabel}
              <input
                autoFocus
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "note" ? "Title / Address (e.g. Chapter summary, Formula...)" : ""}
              />
            </label>

            {type === "note" && (
              <label className="block space-y-1.5 text-sm font-medium">
                Description
                <textarea
                  className="input min-h-[110px] resize-y py-2 text-sm leading-relaxed"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write note description here... It will go directly to the selected course's notes list."
                />
              </label>
            )}

            {type === "assignment" && (
              <label className="block space-y-1.5 text-sm font-medium">
                Due date
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
          </>
        )}

        {err ? <p className="text-sm text-destructive">{err}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          {courses.length > 0 && (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : f.cta}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ---------- page ---------- */
export default function OverviewPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assigns, setAssigns] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [off, setOff] = useState(0); // day offset from today
  const [modal, setModal] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    const [c, l, t, a, e] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase
        .from("lectures")
        .select("*, courses(id, name, code, color, professor)")
        .order("start_time"),
      supabase.from(TASKS.table).select("*").limit(50),
      supabase.from(ASSIGNMENTS.table).select("*").limit(50),
      supabase
        .from("exams")
        .select("*, courses(id, name, code, color, professor)")
        .order("exam_date"),
    ]);
    setCourses(c.data || []);
    setLectures(l.data || []);
    setTasks(t.error ? [] : t.data || []);
    setAssigns(a.error ? [] : a.data || []);
    setExams(e.error ? [] : e.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const sel = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + off);
    return d;
  }, [now, off]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = off === 0;

  const dayRows = useMemo(() => {
    const selIso = isoOf(sel);
    const dayLectures = lectures
      .filter((l) => l.day_of_week === sel.getDay())
      .map((l) => ({ ...l, itemType: "lecture" }));
    const dayExams = exams
      .filter((x) => x.exam_date === selIso)
      .map((x) => ({
        ...x,
        itemType: "exam",
        kind: "Exam",
        start_time: x.exam_time || "09:00:00",
        end_time: x.exam_time
          ? `${String(Math.min(parseInt(x.exam_time.split(":")[0], 10) + 2, 23)).padStart(2, "0")}:${x.exam_time.split(":")[1] || "00"}`
          : "11:00:00",
      }));
    return [...dayLectures, ...dayExams].sort((a, b) =>
      String(a.start_time).localeCompare(String(b.start_time)),
    );
  }, [lectures, exams, sel]);
  const upNextId = isToday
    ? dayRows.find((l) => toMin(l.start_time) > nowMin)?.id
    : null;

  // week strip follows your DAY_ORDER; the selected day sits in its slot
  const strip = useMemo(() => {
    const idx = DAY_ORDER.indexOf(sel.getDay());
    return DAY_ORDER.map((dow, h) => {
      const d = new Date(sel);
      d.setDate(d.getDate() + (h - idx));
      return { dow, d, o: off + (h - idx) };
    });
  }, [sel, off]);

  // Course of the lecture happening right now (else the last one that ended today).
  const { liveCourseId, defaultCourseId } = useMemo(() => {
    const today = lectures.filter((l) => l.day_of_week === now.getDay());
    const live = today.find(
      (l) =>
        toMin(l.start_time) <= nowMin &&
        nowMin < (l.end_time ? toMin(l.end_time) : toMin(l.start_time) + 60),
    );
    const ended = today
      .filter(
        (l) =>
          (l.end_time ? toMin(l.end_time) : toMin(l.start_time) + 60) <= nowMin,
      )
      .sort((a, b) =>
        String(b.start_time).localeCompare(String(a.start_time)),
      )[0];
    return {
      liveCourseId: live?.course_id ?? null,
      defaultCourseId: live?.course_id ?? ended?.course_id ?? null,
    };
  }, [lectures, now, nowMin]);

  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };
  const subtitle = `${sel.toLocaleDateString("en-GB", { weekday: "long" })}, ${sel.getDate()} ${sel.toLocaleDateString("en-GB", { month: "long" })}, ${sel.getFullYear()}`;

  const toggle = async (cfg, rows, setRows, row) => {
    const v = !row[cfg.done];
    setRows(rows.map((r) => (r.id === row.id ? { ...r, [cfg.done]: v } : r))); // optimistic
    const { error } = await supabase
      .from(cfg.table)
      .update({ [cfg.done]: v })
      .eq("id", row.id);
    if (error) load();
  };

  const sortedAssigns = useMemo(
    () =>
      [...assigns].sort((a, b) => {
        if (!!a[ASSIGNMENTS.done] !== !!b[ASSIGNMENTS.done])
          return a[ASSIGNMENTS.done] ? 1 : -1;
        return String(a[ASSIGNMENTS.due] || "9999").localeCompare(
          String(b[ASSIGNMENTS.due] || "9999"),
        );
      }),
    [assigns],
  );
  const sortedTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) =>
          !!a[TASKS.done] === !!b[TASKS.done] ? 0 : a[TASKS.done] ? 1 : -1,
        )
        .slice(0, 4),
    [tasks],
  );

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="m-0 text-2xl font-bold tracking-tight">Overview</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModal("topic")}
            className="inline-flex items-center gap-2 rounded-full border bg-card py-2 pl-2 pr-3.5 text-sm font-semibold transition hover:-translate-y-px hover:bg-muted active:scale-[.97]"
            style={{
              borderColor: mix(INFO, 38, "hsl(var(--border))"),
              background: mix(INFO, 10),
              color: mix(INFO, 60, "hsl(var(--foreground))"),
            }}
          >
            <i
              className="grid h-[22px] w-[22px] place-items-center rounded-full text-white"
              style={{ background: INFO }}
            >
              <Icon name="plus" size={12} />
            </i>
            Add Recent Topic
          </button>
          <QuickAdd onPick={setModal} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-5">
          {/* today's schedule */}
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3.5 pt-4 sm:px-5 sm:pt-5">
              <SectionHead
                icon="cal"
                title={isToday ? "Today’s schedule" : "Schedule"}
                sub={subtitle}
              />
              <div className="flex items-center gap-2">
                <span className="inline-flex min-w-[78px] justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {dayRows.length === 0
                    ? "No classes"
                    : `${dayRows.length} ${dayRows.length === 1 ? "class" : "classes"}`}
                </span>
                <GhostBtn
                  className={isToday ? "invisible" : ""}
                  tabIndex={isToday ? -1 : 0}
                  aria-hidden={isToday}
                  onClick={() => setOff(0)}
                >
                  Today
                </GhostBtn>
                <div className="inline-flex overflow-hidden rounded-xl border bg-card">
                  <button
                    aria-label="Previous day"
                    onClick={() => setOff((o) => o - 1)}
                    className="grid h-[34px] w-[34px] place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon name="prev" />
                  </button>
                  <button
                    aria-label="Next day"
                    onClick={() => setOff((o) => o + 1)}
                    className="grid h-[34px] w-[34px] place-items-center border-l text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon name="next" />
                  </button>
                </div>
              </div>
            </div>

            {/* week strip */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-3 sm:gap-1.5 sm:px-5 sm:pb-4">
              {strip.map(({ dow, d, o }) => {
                const on = o === off;
                const td = o === 0;
                return (
                  <button
                    key={dow}
                    aria-label={`${DAY_NAMES[dow]} ${d.getDate()}`}
                    aria-pressed={on}
                    onClick={() => setOff(o)}
                    className={
                      "grid justify-items-center gap-0.5 rounded-xl border py-2 text-xs transition-colors " +
                      (on
                        ? "font-semibold text-primary"
                        : "border-transparent text-muted-foreground hover:bg-muted") +
                      (!on && td ? " !border-border" : "")
                    }
                    style={
                      on
                        ? {
                            background: mix(
                              "hsl(var(--primary))",
                              8,
                              "transparent",
                            ),
                            borderColor: mix(
                              "hsl(var(--primary))",
                              22,
                              "hsl(var(--border))",
                            ),
                          }
                        : undefined
                    }
                  >
                    <span>{String(DAY_NAMES[dow]).slice(0, 3)}</span>
                    <b
                      className={
                        "text-[15px] font-semibold " +
                        (on ? "" : "text-foreground")
                      }
                    >
                      {d.getDate()}
                    </b>
                  </button>
                );
              })}
            </div>

            {/* timeline */}
            <div className="border-t px-2.5 py-3 sm:px-5 min-w-0 w-full overflow-hidden">
              {dayRows.length === 0 ? (
                <div className="px-3 py-7 text-center text-muted-foreground">
                  <b className="mb-1 block text-foreground">
                    {isToday ? "No classes today" : "No classes this day"}
                  </b>
                  Enjoy the free time or plan a study session.
                </div>
              ) : (
                dayRows.map((l, i) => (
                  <TimelineRow
                    key={l.id}
                    l={l}
                    i={i}
                    n={dayRows.length}
                    isToday={isToday}
                    nowMin={nowMin}
                    upNext={l.id === upNextId}
                  />
                ))
              )}
            </div>

            <div className="flex items-center justify-end border-t bg-muted px-4 py-2 sm:px-5">
              <GhostBtn onClick={() => router.push(SCHEDULE_HREF)}>
                Open schedule
              </GhostBtn>
            </div>
          </section>

          {/* learning + assignments */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <SectionHead icon="cap" title="Learning" />
                <GhostBtn onClick={() => router.push(TASKS_HREF)}>
                  View all
                </GhostBtn>
              </div>
              {sortedTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No learning tasks yet.
                </p>
              ) : (
                sortedTasks.map((t) => (
                  <CheckRow
                    key={t.id}
                    done={!!t[TASKS.done]}
                    title={t[TASKS.title]}
                    onToggle={() => toggle(TASKS, tasks, setTasks, t)}
                  >
                    {!t[TASKS.done] && (
                      <FocusButton taskId={t.id} taskTitle={t[TASKS.title]} table={TASKS.table} />
                    )}
                  </CheckRow>
                ))
              )}
            </section>

            <section className="order-first rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:order-none">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <SectionHead icon="file" title="Assignments" />
                <GhostBtn onClick={() => router.push(TASKS_HREF)}>
                  View all
                </GhostBtn>
              </div>
              {sortedAssigns.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No assignments yet.
                </p>
              ) : (
                sortedAssigns.map((a) => (
                  <CheckRow
                    key={a.id}
                    done={!!a[ASSIGNMENTS.done]}
                    title={a[ASSIGNMENTS.title]}
                    onToggle={() => toggle(ASSIGNMENTS, assigns, setAssigns, a)}
                  >
                    {!a[ASSIGNMENTS.done] && (
                      <FocusButton taskId={a.id} taskTitle={a[ASSIGNMENTS.title]} table={ASSIGNMENTS.table} />
                    )}
                    <DuePill
                      iso={a[ASSIGNMENTS.due]}
                      done={!!a[ASSIGNMENTS.done]}
                    />
                  </CheckRow>
                ))
              )}
            </section>
          </div>
        </div>
      )}

      {modal && (modal === "lecture" || modal === "exam") && (
        <AddModal
          type={modal}
          courses={courses}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      {modal && FORMS[modal] && (
        <QuickModal
          type={modal}
          courses={courses}
          defaultCourseId={defaultCourseId}
          liveCourseId={liveCourseId}
          onClose={() => setModal(null)}
          onSaved={(m) => {
            setModal(null);
            load();
            flash(m);
          }}
        />
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

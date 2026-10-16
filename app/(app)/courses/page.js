"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddModal from "@/components/AddModal";
import EditCourseModal from "@/components/EditCourseModal";
import { ArrowRight, BookOpen, Pencil, Plus } from "lucide-react";

// Used only for the "N upcoming" badge. If this table/columns don't exist
// the badge is simply hidden.
const TASKS = { table: "tasks", course: "course_id", done: "done" };

// Same palette as the rest of the app, used when a course has no colour set.
const COURSE_COLORS = [
  "#7c5cbf",
  "#3b6ea5",
  "#c9822b",
  "#2f7d4f",
  "#b24a7a",
  "#2a8a8a",
];
const courseColor = (c) => {
  if (c.color) return c.color;
  const n = Number(c.id);
  const i = Number.isFinite(n)
    ? n
    : String(c.id || "")
        .split("")
        .reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return COURSE_COLORS[Math.abs(i) % COURSE_COLORS.length];
};
const mix = (c, pct, base = "hsl(var(--card))") =>
  `color-mix(in srgb, ${c} ${pct}%, ${base})`;

function CourseCard({ c, upcoming, onEdit }) {
  const col = courseColor(c);
  const cover = c.cover || c.cover_url || c.image_url;
  const sub = c.professor || c.instructor;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-[3px]"
      style={{
        borderColor: mix(col, 28, "hsl(var(--border))"),
        "--c": col,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = mix(col, 55, "hsl(var(--border))");
        e.currentTarget.style.boxShadow = `0 16px 30px -16px ${mix(col, 60, "transparent")}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = mix(col, 28, "hsl(var(--border))");
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <Link
        href={`/courses/${c.id}`}
        className="flex flex-1 flex-col rounded-3xl focus-visible:outline-none focus-visible:ring-[3px]"
        style={{ "--tw-ring-color": mix(col, 40, "transparent") }}
      >
        {/* cover banner */}
        <div
          className="relative h-[84px] flex-none overflow-hidden"
          style={{
            background: cover
              ? undefined
              : `linear-gradient(135deg, ${col}, ${mix(col, 55, "#000")})`,
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
              <span className="absolute -bottom-12 left-1/3 h-24 w-24 rounded-full bg-white/10" />
              {c.code ? (
                <b className="absolute bottom-2 right-4 text-lg font-extrabold tracking-tight text-white/35">
                  {c.code}
                </b>
              ) : null}
            </>
          )}
          {upcoming != null && (
            <span
              className="absolute left-3 top-2.5 z-[2] rounded-full px-3 py-1 text-[13px] font-bold"
              style={{
                background: "#f4f6fb",
                color: "#1b2740",
                boxShadow: "0 2px 8px #00000040",
              }}
            >
              {upcoming} upcoming
            </span>
          )}
        </div>

        {/* content */}
        <div className="flex flex-1 flex-col items-start px-5 pb-5 pt-[18px]">
          <div
            className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[.08em]"
            style={{ color: mix(col, 60, "hsl(var(--muted-foreground))") }}
          >
            <BookOpen className="h-5 w-5" />
            <span>Course</span>
          </div>
          <h3 className="mt-2.5 text-[22px] font-extrabold leading-tight tracking-tight">
            {c.name}
          </h3>
          <div className="mt-3 text-[17px] font-semibold">
            {sub || "No instructor added"}
          </div>
          {c.description ? (
            <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {c.description}
            </div>
          ) : null}
          <span className="mt-[18px] inline-flex items-center gap-2 rounded-full border bg-muted px-5 py-[9px] text-sm font-bold transition-colors group-hover:[border-color:var(--c)] group-hover:[color:var(--c)]">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Edit ${c.name}`}
        title="Edit"
        onClick={onEdit}
        className="absolute right-3 top-2.5 z-[3] grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/40 focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [counts, setCounts] = useState(null); // { [courseId]: number } | null when unavailable
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from(TASKS.table).select(`${TASKS.course}, ${TASKS.done}`),
    ]);
    setCourses(c.data || []);
    if (t.error || !t.data) setCounts(null);
    else {
      const m = {};
      t.data.forEach((r) => {
        if (!r[TASKS.done]) m[r[TASKS.course]] = (m[r[TASKS.course]] || 0) + 1;
      });
      setCounts(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your courses.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> New course
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border bg-card px-3 py-7 text-center text-muted-foreground shadow-sm">
          <b className="mb-1 block text-foreground">No courses yet</b>
          Create your first course to start organizing.
        </div>
      ) : (
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              c={c}
              upcoming={counts ? counts[c.id] || 0 : null}
              onEdit={() => setEditing(c)}
            />
          ))}
        </div>
      )}

      {adding && (
        <AddModal
          type="course"
          onClose={() => setAdding(false)}
          onSaved={load}
        />
      )}
      {editing && (
        <EditCourseModal
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

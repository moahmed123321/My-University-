"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AddModal from "@/components/AddModal";
import EditCourseModal from "@/components/EditCourseModal";
import { ChevronRight, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────
   COLOUR HELPERS
───────────────────────────────────────────────────────────────────────── */

/** Parse a 3- or 6-digit hex string → {r, g, b} in 0–255. */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

/** Darken a hex colour by a fraction (0–1). */
const darken = (hex, f = 0.25) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - f))},${Math.round(g * (1 - f))},${Math.round(b * (1 - f))})`;
};

/** Lighten a hex colour toward white by a fraction. */
const lighten = (hex, f = 0.3) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(b + (255 - b) * f)})`;
};

/** Pale tint used for the card body / footer background. */
const tintedBg = (hex) => `color-mix(in srgb, ${hex} 6%, hsl(var(--card)))`;

/* ─────────────────────────────────────────────────────────────────────────
   APP LOGO MARK (My University emblem)
   Dynamically styled with the course's unique color gradient.
───────────────────────────────────────────────────────────────────────── */
function UniversityLogoMark({ color, id, className }) {
  const gradId = `logo-grad-${String(id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="30 15 255 235"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={lighten(color, 0.2)} stopOpacity="0.45" />
          <stop offset="100%" stopColor={darken(color, 0.2)} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        {/* Top mortarboard / chevron cap */}
        <path d="M35 35c0-13 14-21 25-15l79 44c8 5 18 5 26 0l91-49c11-6 25 2 25 15v22c0 8-4 15-11 19l-112 62c-7 4-16 4-23 0L46 80c-7-4-11-11-11-19z" />
        {/* Left book column */}
        <path d="M35 107c0-12 13-20 23-14l47 27c7 4 11 11 11 19v80c0 13-14 21-25 14l-45-26c-7-4-11-11-11-19z" />
        {/* Right book column */}
        <path d="M191 132c0-8 4-15 11-19l37-21c10-6 23 2 23 14v81c0 8-4 15-11 19l-38 22c-10 6-22-2-22-14z" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PALETTE & DATA HELPERS
───────────────────────────────────────────────────────────────────────── */
const PALETTE = [
  "#5c6ac4", // indigo
  "#006fbb", // ocean
  "#47995a", // sage
  "#c05717", // amber
  "#9c6ade", // plum
  "#1a7fa1", // teal
];

const TASKS = { table: "tasks", course: "course_id", done: "done" };

const courseSeed = (c) => {
  const id = String(c.id || "");
  const n = Number(id);
  return Number.isFinite(n)
    ? n
    : id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
};

const courseColor = (c) =>
  c.color || PALETTE[Math.abs(courseSeed(c)) % PALETTE.length];

const getInitials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";

/* ─────────────────────────────────────────────────────────────────────────
   COURSE CARD
───────────────────────────────────────────────────────────────────────── */
function CourseCard({ c, upcoming, onEdit }) {
  const accentColor = courseColor(c);
  const initials = getInitials(c.name);
  const instructor = c.professor || c.instructor;
  const bgImage = c.background_url || null;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card",
        "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.03)]",
        "transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]",
      )}
    >
      {/* ── edit pencil ──────────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label={`Edit ${c.name}`}
        onClick={onEdit}
        className={cn(
          "absolute right-2.5 top-2.5 z-20",
          "grid h-7 w-7 place-items-center rounded-lg",
          "bg-background/80 text-muted-foreground opacity-0 backdrop-blur-sm",
          "transition-all duration-150 hover:bg-background hover:text-foreground",
          "group-hover:opacity-100 focus-visible:opacity-100 shadow-sm border border-border/40",
        )}
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      <Link
        href={`/courses/${c.id}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* ── header cover with app logo watermark in course color ──────── */}
        <div
          className="relative flex min-h-[110px] flex-none flex-col justify-between overflow-hidden p-4 border-b border-border/40"
          style={
            bgImage
              ? {
                  backgroundImage: `linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%), url(${bgImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 16%, hsl(var(--card))) 0%, color-mix(in srgb, ${accentColor} 5%, hsl(var(--card))) 100%)`,
                }
          }
        >
          {/* Logo watermark background (rendered when no custom image override) */}
          {!bgImage && (
            <>
              {/* Soft ambient glow in the course color */}
              <div
                className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full blur-2xl opacity-25"
                style={{ backgroundColor: accentColor }}
              />
              {/* App logo mark colored with the course color */}
              <UniversityLogoMark
                color={accentColor}
                id={c.id}
                className="pointer-events-none absolute -bottom-4 -right-2 h-36 w-36 select-none transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5"
              />
            </>
          )}

          {/* upcoming badge (top-left) */}
          <div className="z-10 flex items-center justify-between">
            {upcoming != null && upcoming > 0 ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-xs"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  color: accentColor,
                  border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
                }}
              >
                {upcoming} upcoming
              </span>
            ) : (
              <span />
            )}
          </div>

          {/* initials avatar badge (bottom-left) */}
          <div className="z-10 mt-auto flex items-end">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold leading-none text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              {initials}
            </div>
          </div>
        </div>

        {/* ── card body ─────────────────────────────────────────────────── */}
        <div
          className="flex flex-1 flex-col px-4 py-3.5"
          style={{ background: tintedBg(accentColor) }}
        >
          {/* Course title */}
          <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug tracking-tight text-foreground">
            {c.name}
          </p>

          {/* Code · Instructor */}
          <div className="mt-1.5 flex min-h-[18px] flex-wrap items-center gap-x-1.5">
            {c.code && (
              <span
                className="text-xs font-semibold"
                style={{ color: accentColor }}
              >
                {c.code}
              </span>
            )}
            {c.code && instructor && (
              <span className="select-none text-[10px] text-muted-foreground/40">
                ·
              </span>
            )}
            {instructor && (
              <span
                dir="auto"
                className="truncate text-xs text-muted-foreground"
                style={{ unicodeBidi: "plaintext" }}
              >
                {instructor}
              </span>
            )}
          </div>

          {/* Optional description */}
          {c.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {c.description}
            </p>
          )}
        </div>

        {/* ── footer ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 border-t border-border/40 px-4 py-2.5"
          style={{ background: tintedBg(accentColor) }}
        >
          <span className="text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Open course
          </span>
          <ChevronRight
            className="h-3 w-3 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-foreground"
            strokeWidth={2}
          />
        </div>
      </Link>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────── */
export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [c, t] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from(TASKS.table).select(`${TASKS.course}, ${TASKS.done}`),
    ]);
    setCourses(c.data || []);
    if (t.error || !t.data) {
      setCounts(null);
    } else {
      const m = {};
      t.data.forEach((r) => {
        if (!r[TASKS.done])
          m[r[TASKS.course]] = (m[r[TASKS.course]] || 0) + 1;
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
      {/* ── page header ─────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">
            Courses
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading
              ? ""
              : courses.length === 0
              ? "Add your first course to get started."
              : `${courses.length} course${courses.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          className="btn-primary active:scale-[.97]"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
          New course
        </button>
      </div>

      {/* ── content ─────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No courses yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first course to start organizing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {/* ── modals ──────────────────────────────────────────────────── */}
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

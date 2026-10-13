"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtDate, linkType, sortItems } from "@/lib/helpers";
import { removeRow, toggleDone } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import AddMenu from "@/components/AddMenu";
import ItemTable from "@/components/ItemTable";

export default function CourseDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, tp, t, a, m, n] = await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("topics").select("*").eq("course_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("course_id", id),
      supabase.from("assignments").select("*").eq("course_id", id),
      supabase.from("materials").select("*").eq("course_id", id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("course_id", id).order("created_at", { ascending: false }),
    ]);
    setCourse(c.data);
    setTopics(tp.data || []);
    setTasks(t.data || []);
    setAssignments(a.data || []);
    setMaterials(m.data || []);
    setNotes(n.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (!course) {
    return (
      <div>
        <p className="mb-3 text-sm text-gray-600">Course not found.</p>
        <Link href="/courses" className="btn">Back to courses</Link>
      </div>
    );
  }

  const openTasks = sortItems(tasks.filter((t) => !t.done));
  const openAssignments = sortItems(assignments.filter((a) => !a.done));
  const completed = [
    ...tasks.filter((t) => t.done).map((t) => ({ ...t, _table: "tasks", _label: "Task" })),
    ...assignments.filter((a) => a.done).map((a) => ({ ...a, _table: "assignments", _label: "Assignment" })),
  ];

  async function deleteCourse() {
    const ok = await removeRow(
      "courses",
      course.id,
      "Delete this course and everything inside it (topics, tasks, assignments, materials, schedule)?"
    );
    if (ok) router.replace("/courses");
  }

  return (
    <div>
      <Link href="/courses" className="mb-2 inline-block text-sm text-gray-500 hover:text-gray-800">
        Back to courses
      </Link>
      <PageHeader title={course.name}>
        <AddMenu
          courses={[course]}
          defaultCourseId={course.id}
          onSaved={load}
          items={["topic", "task", "assignment", "note", "material"]}
        />
        <button className="btn" onClick={deleteCourse}>Delete course</button>
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        {[course.code, course.professor].filter(Boolean).join(", ")}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent topics">
          {topics.length === 0 ? (
            <Empty>No topics yet. Use + Add, then Recent Topic.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>{t.title}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{fmtDate(t.created_at.slice(0, 10))}</span>
                    <button
                      className="link-danger"
                      onClick={async () => {
                        if (await removeRow("topics", t.id)) load();
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Course materials">
          {materials.length === 0 ? (
            <Empty>No links yet. Add YouTube, Drive or any link with + Add.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-accent hover:underline">
                    {m.title}
                  </a>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-gray-400">{linkType(m.url)}</span>
                    <button
                      className="link-danger"
                      onClick={async () => {
                        if (await removeRow("materials", m.id)) load();
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tasks">
          <ItemTable rows={openTasks} table="tasks" onChange={load} hideCourse empty="No open tasks." />
        </Card>

        <Card title="Assignments">
          <ItemTable rows={openAssignments} table="assignments" onChange={load} hideCourse empty="No open assignments." />
        </Card>

        <Card title="Completed">
          {completed.length === 0 ? (
            <Empty>Finished tasks and assignments show up here.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {completed.map((r) => (
                <li key={r._table + r.id} className="flex items-center gap-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-teal-700"
                    checked
                    onChange={async () => {
                      await toggleDone(r._table, r);
                      load();
                    }}
                  />
                  <span className="flex-1 text-gray-500 line-through">{r.title}</span>
                  <span className="text-xs text-gray-400">{r._label}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Notes">
          {notes.length === 0 ? (
            <Empty>No notes for this course.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    {n.content && <p className="whitespace-pre-wrap text-gray-600">{n.content}</p>}
                  </div>
                  <button
                    className="link-danger"
                    onClick={async () => {
                      if (await removeRow("notes", n.id)) load();
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

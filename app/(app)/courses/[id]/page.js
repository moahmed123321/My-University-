"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtDate, linkType, sortItems } from "@/lib/helpers";
import { removeRow, toggleDone } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import ItemTable from "@/components/ItemTable";
import EditCourseModal from "@/components/EditCourseModal";
import AddModal from "@/components/AddModal";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CourseDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(null);

  const load = useCallback(async () => {
    const [c, tp, t, a, m] = await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("topics").select("*").eq("course_id", id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("course_id", id),
      supabase.from("assignments").select("*").eq("course_id", id),
      supabase.from("materials").select("*").eq("course_id", id).order("created_at", { ascending: false }),
    ]);
    setCourse(c.data);
    setTopics(tp.data || []);
    setTasks(t.data || []);
    setAssignments(a.data || []);
    setMaterials(m.data || []);
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
  const topicsByDay = topics.reduce((groups, topic) => {
    const day = topic.created_at.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(topic);
    return groups;
  }, {});

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
        <button className="btn" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit course</button>
        <button className="btn" onClick={deleteCourse}>Delete course</button>
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm text-gray-500">
        {[course.code, course.professor].filter(Boolean).join(", ")}
      </p>

      <Tabs defaultValue="topics" className="w-full">
        <div className="mb-5 overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max gap-1 bg-muted/70 p-1.5">
            <TabsTrigger value="topics">Topics <span className="ml-1 text-xs text-muted-foreground">{topics.length}</span></TabsTrigger>
            <TabsTrigger value="materials">Materials <span className="ml-1 text-xs text-muted-foreground">{materials.length}</span></TabsTrigger>
            <TabsTrigger value="tasks">Tasks <span className="ml-1 text-xs text-muted-foreground">{openTasks.length}</span></TabsTrigger>
            <TabsTrigger value="assignments">Assignments <span className="ml-1 text-xs text-muted-foreground">{openAssignments.length}</span></TabsTrigger>
            <TabsTrigger value="completed">Completed <span className="ml-1 text-xs text-muted-foreground">{completed.length}</span></TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="topics">
        <Card title="Recent topics" action={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Add topic" onClick={() => setAdding("topic")}><Plus className="h-4 w-4" /></Button>}>
          {topics.length === 0 ? (
            <Empty>No topics yet. Use + Add, then Recent Topic.</Empty>
          ) : (
            <div className="space-y-3">
              {Object.entries(topicsByDay).map(([day, dayTopics], index) => (
                <details key={day} open={index === 0} className="group overflow-hidden rounded-lg border bg-muted/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none hover:bg-muted/50">
                    <span className="flex items-center gap-3"><span className="text-primary transition-transform group-open:rotate-90">›</span><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{fmtDate(day)}</span></span>
                    <span className="text-xs font-medium text-muted-foreground">{dayTopics.length} {dayTopics.length === 1 ? "topic" : "topics"}</span>
                  </summary>
                  <ul className="divide-y border-t bg-card">
                    {dayTopics.map((topic) => (
                      <li key={topic.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span className="font-medium">{topic.title}</span>
                        <button className="link-danger" onClick={async () => { if (await removeRow("topics", topic.id)) load(); }}>Delete</button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </Card>
        </TabsContent>

        <TabsContent value="materials">
        <Card title="Course materials" action={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Add material" onClick={() => setAdding("material")}><Plus className="h-4 w-4" /></Button>}>
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
        </TabsContent>

        <TabsContent value="tasks">
        <Card title="Tasks">
          <ItemTable rows={openTasks} table="tasks" onChange={load} hideCourse empty="No open tasks." />
        </Card>
        </TabsContent>

        <TabsContent value="assignments">
        <Card title="Assignments">
          <ItemTable rows={openAssignments} table="assignments" onChange={load} hideCourse empty="No open assignments." />
        </Card>
        </TabsContent>

        <TabsContent value="completed">
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
        </TabsContent>
      </Tabs>
      {editing && <EditCourseModal course={course} onClose={() => setEditing(false)} onSaved={load} />}
      {adding && <AddModal type={adding} courses={[course]} defaultCourseId={course.id} onClose={() => setAdding(null)} onSaved={load} />}
    </div>
  );
}

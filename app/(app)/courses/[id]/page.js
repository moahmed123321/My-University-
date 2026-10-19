"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fmtDate, fmtDateTime, linkType, sortItems } from "@/lib/helpers";
import { removeRow, toggleDone } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import ItemTable from "@/components/ItemTable";
import EditCourseModal from "@/components/EditCourseModal";
import EditNoteModal from "@/components/EditNoteModal";
import AddModal from "@/components/AddModal";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
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
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [adding, setAdding] = useState(null);

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

      <div className="space-y-8">
        {/* ── Tasks, Assignments, Completed Element (Top) ── */}
        <Tabs defaultValue="tasks" className="w-full">
          <div className="mb-4 overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max gap-1 bg-muted/70 p-1.5">
              <TabsTrigger value="tasks">
                Tasks <span className="ml-1 text-xs text-muted-foreground">{openTasks.length}</span>
              </TabsTrigger>
              <TabsTrigger value="assignments">
                Assignments <span className="ml-1 text-xs text-muted-foreground">{openAssignments.length}</span>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed <span className="ml-1 text-xs text-muted-foreground">{completed.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tasks">
            <Card
              title="Tasks"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Add task"
                  onClick={() => setAdding("task")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              <ItemTable rows={openTasks} table="tasks" onChange={load} hideCourse empty="No open tasks." />
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card
              title="Assignments"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Add assignment"
                  onClick={() => setAdding("assignment")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              <ItemTable rows={openAssignments} table="assignments" onChange={load} hideCourse empty="No open assignments." />
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card title="Completed">
              {completed.length === 0 ? (
                <Empty>Finished tasks and assignments show up here.</Empty>
              ) : (
                <ul className="divide-y divide-border/60">
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
                      <span className="flex-1 text-muted-foreground line-through">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r._label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Recent topics, Notes, Materials Element (Below) ── */}
        <Tabs defaultValue="topics" className="w-full">
          <div className="mb-4 overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max gap-1 bg-muted/70 p-1.5">
              <TabsTrigger value="topics">
                Recent topics <span className="ml-1 text-xs text-muted-foreground">{topics.length}</span>
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes <span className="ml-1 text-xs text-muted-foreground">{notes.length}</span>
              </TabsTrigger>
              <TabsTrigger value="materials">
                Materials <span className="ml-1 text-xs text-muted-foreground">{materials.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="topics">
            <Card
              title="Recent topics"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Add topic"
                  onClick={() => setAdding("topic")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              {topics.length === 0 ? (
                <Empty>No topics yet. Use + Add, then Recent Topic.</Empty>
              ) : (
                <div className="space-y-3">
                  {Object.entries(topicsByDay).map(([day, dayTopics], index) => (
                    <details key={day} open={index === 0} className="group overflow-hidden rounded-lg border bg-muted/20">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none hover:bg-muted/50">
                        <span className="flex items-center gap-3">
                          <span className="text-primary transition-transform group-open:rotate-90">›</span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{fmtDate(day)}</span>
                        </span>
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

          <TabsContent value="notes">
            <Card
              title="Course notes"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Add note"
                  onClick={() => setAdding("note")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              {notes.length === 0 ? (
                <Empty>
                  No notes for this course yet. Click the + button above, or use "Quick Add" on the dashboard to add a note to this course.
                </Empty>
              ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="group flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Address / Title */}
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: course.color || "#0f766e" }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-foreground break-words leading-snug">
                              {note.title}
                            </h4>
                            {/* Description */}
                            {note.content ? (
                              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground break-words">
                                {note.content}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs italic text-muted-foreground/50">
                                No description
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date & Actions */}
                      <div className="flex shrink-0 items-center justify-between gap-3 pl-4.5 pt-1 sm:pl-0 sm:pt-0 sm:flex-col sm:items-end sm:gap-2">
                        {note.created_at && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                            <Calendar className="h-3 w-3" />
                            {fmtDateTime(note.created_at)}
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => setEditingNote(note)}
                            aria-label="Edit note"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={async () => {
                              if (await removeRow("notes", note.id, "Delete this note?")) {
                                load();
                              }
                            }}
                            aria-label="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card
              title="Course materials"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Add material"
                  onClick={() => setAdding("material")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              {materials.length === 0 ? (
                <Empty>No links yet. Add YouTube, Drive or any link with + Add.</Empty>
              ) : (
                <ul className="divide-y divide-border/60">
                  {materials.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-accent hover:underline">
                        {m.title}
                      </a>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-muted-foreground">{linkType(m.url)}</span>
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
        </Tabs>
      </div>
      {editing && <EditCourseModal course={course} onClose={() => setEditing(false)} onSaved={load} />}
      {editingNote && (
        <EditNoteModal
          note={editingNote}
          courses={[course]}
          onClose={() => setEditingNote(null)}
          onSaved={load}
          onDeleted={load}
        />
      )}
      {adding && <AddModal type={adding} courses={[course]} defaultCourseId={course.id} onClose={() => setAdding(null)} onSaved={load} />}
    </div>
  );
}

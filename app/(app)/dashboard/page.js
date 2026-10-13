"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fmtTime, fmtDate, isoDate } from "@/lib/helpers";
import { removeRow } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import AddMenu from "@/components/AddMenu";
import ItemTable from "@/components/ItemTable";

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const iso = isoDate();
    const dow = new Date().getDay();
    const [c, l, e, t, a, n] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from("lectures").select("*, courses(name, code)").eq("day_of_week", dow).order("start_time"),
      supabase.from("exams").select("*, courses(name, code)").gte("exam_date", iso).order("exam_date").limit(5),
      supabase
        .from("tasks")
        .select("*, courses(name, code)")
        .eq("done", false)
        .or(`due_date.lte.${iso},due_date.is.null`)
        .order("due_date"),
      supabase.from("assignments").select("*, courses(name, code)").eq("done", false).order("due_date"),
      supabase.from("notes").select("*, courses(name)").order("created_at", { ascending: false }).limit(5),
    ]);
    setCourses(c.data || []);
    setLectures(l.data || []);
    setExams(e.data || []);
    setTasks(t.data || []);
    setAssignments(a.data || []);
    setNotes(n.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = isoDate();

  return (
    <div>
      <PageHeader title="Dashboard">
        <span className="text-sm text-gray-500">{fmtDate(today)}</span>
        <AddMenu courses={courses} onSaved={load} />
      </PageHeader>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Today's schedule">
            {lectures.length === 0 ? (
              <Empty>No lectures today.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th">Time</th>
                      <th className="th">Course</th>
                      <th className="th">Type</th>
                      <th className="th">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lectures.map((l) => (
                      <tr key={l.id} className="border-t border-gray-100">
                        <td className="whitespace-nowrap py-2 pr-3">
                          {fmtTime(l.start_time)}
                          {l.end_time ? " - " + fmtTime(l.end_time) : ""}
                        </td>
                        <td className="py-2 pr-3">{l.courses?.name}</td>
                        <td className="py-2 pr-3 text-gray-600">{l.kind}</td>
                        <td className="py-2 text-gray-600">{l.room || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="mb-1 mt-5 text-sm font-semibold text-ink">Upcoming exams</h3>
            {exams.length === 0 ? (
              <Empty>No upcoming exams.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Time</th>
                      <th className="th">Course</th>
                      <th className="th">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((x) => (
                      <tr key={x.id} className="border-t border-gray-100">
                        <td className={"whitespace-nowrap py-2 pr-3 " + (x.exam_date === today ? "font-medium text-red-600" : "")}>
                          {x.exam_date === today ? "Today" : fmtDate(x.exam_date)}
                        </td>
                        <td className="py-2 pr-3">{fmtTime(x.exam_time) || "-"}</td>
                        <td className="py-2 pr-3">{x.courses?.name}</td>
                        <td className="py-2 text-gray-600">{x.room || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Today's tasks">
            <ItemTable rows={tasks} table="tasks" onChange={load} empty="No tasks due today. Nice." />
          </Card>

          <Card title="Assignments">
            <ItemTable rows={assignments} table="assignments" onChange={load} empty="No open assignments." />
          </Card>

          <Card title="Latest notes">
            {notes.length === 0 ? (
              <Empty>No notes yet. Use + Add, then Note.</Empty>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{n.title}</p>
                      {n.content && <p className="whitespace-pre-wrap text-gray-600">{n.content}</p>}
                      {n.courses?.name && <p className="text-xs text-gray-400">{n.courses.name}</p>}
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
      )}
    </div>
  );
}

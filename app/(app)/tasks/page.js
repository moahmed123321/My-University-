"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sortItems } from "@/lib/helpers";
import { Card, PageHeader } from "@/components/ui";
import AddModal from "@/components/AddModal";
import ItemTable from "@/components/ItemTable";

export default function TasksPage() {
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    const [c, t, a] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from("tasks").select("*, courses(name, code)"),
      supabase.from("assignments").select("*, courses(name, code)"),
    ]);
    setCourses(c.data || []);
    setTasks(t.data || []);
    setAssignments(a.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byCourse = (rows) => sortItems(filter ? rows.filter((r) => r.course_id === filter) : rows);

  return (
    <div>
      <PageHeader title="Tasks">
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => setModal("task")}>+ Task</button>
        <button className="btn-primary" onClick={() => setModal("assignment")}>+ Assignment</button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <Card title="Tasks">
            <ItemTable rows={byCourse(tasks)} table="tasks" onChange={load} empty="No tasks yet." />
          </Card>
          <Card title="Assignments">
            <ItemTable rows={byCourse(assignments)} table="assignments" onChange={load} empty="No assignments yet." />
          </Card>
        </div>
      )}

      {modal && <AddModal type={modal} courses={courses} defaultCourseId={filter} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

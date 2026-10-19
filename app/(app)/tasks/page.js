"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dbGetAll, dbPutMany } from "@/lib/offlineDb";
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
    // 1. Immediately read from local IndexedDB
    try {
      const [localC, localT, localA] = await Promise.all([
        dbGetAll("courses"),
        dbGetAll("tasks"),
        dbGetAll("assignments"),
      ]);

      if (localC.length || localT.length || localA.length) {
        const cMap = new Map(localC.map((c) => [c.id, c]));
        const joinedT = localT.map((t) => ({ ...t, courses: cMap.get(t.course_id) || null }));
        const joinedA = localA.map((a) => ({ ...a, courses: cMap.get(a.course_id) || null }));

        setCourses([...localC].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setTasks(joinedT);
        setAssignments(joinedA);
        setLoading(false);
      }
    } catch (e) {
      console.warn("[Tasks] Error reading local db:", e);
    }

    // 2. Fetch fresh from Supabase if online
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      const [c, t, a] = await Promise.all([
        supabase.from("courses").select("*").order("name"),
        supabase.from("tasks").select("*, courses(name, code)"),
        supabase.from("assignments").select("*, courses(name, code)"),
      ]);

      if (c.data) {
        setCourses(c.data);
        dbPutMany("courses", c.data);
      }
      if (t.data) {
        setTasks(t.data);
        dbPutMany("tasks", t.data.map(({ courses, ...rest }) => rest));
      }
      if (a.data) {
        setAssignments(a.data);
        dbPutMany("assignments", a.data.map(({ courses, ...rest }) => rest));
      }
    } catch (err) {
      console.warn("[Tasks] Network fetch error:", err);
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

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Empty, PageHeader } from "@/components/ui";
import AddModal from "@/components/AddModal";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("courses").select("*").order("name");
    setCourses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Courses">
        <button className="btn-primary" onClick={() => setAdding(true)}>+ Course</button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : courses.length === 0 ? (
        <Empty>No courses yet. Click + Course to add your first one.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="rounded-lg border border-gray-200 border-l-4 bg-white p-4 hover:bg-gray-50"
              style={{ borderLeftColor: c.color || "#0f766e" }}
            >
              <p className="font-semibold text-ink">{c.name}</p>
              <p className="text-sm text-gray-500">{[c.code, c.professor].filter(Boolean).join(", ") || "No details"}</p>
            </Link>
          ))}
        </div>
      )}

      {adding && <AddModal type="course" onClose={() => setAdding(false)} onSaved={load} />}
    </div>
  );
}

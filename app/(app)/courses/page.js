"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Empty, PageHeader } from "@/components/ui";
import AddModal from "@/components/AddModal";
import { ArrowUpRight, BookOpen, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditCourseModal from "@/components/EditCourseModal";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

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
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add course</Button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : courses.length === 0 ? (
        <Empty>No courses yet. Click + Course to add your first one.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="group relative overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: c.color || "#c8102e" }}>
            <Link href={`/courses/${c.id}`} className="block p-5 hover:bg-muted/20">
              <div className="mb-6 flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary"><BookOpen className="h-5 w-5" /></span><ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></div>
              <p className="font-semibold text-foreground">{c.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{[c.code, c.professor].filter(Boolean).join(" · ") || "No details added"}</p>
            </Link>
            <Button variant="ghost" size="icon" className="absolute bottom-3 right-3 h-8 w-8 text-muted-foreground" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}

      {adding && <AddModal type="course" onClose={() => setAdding(false)} onSaved={load} />}
      {editing && <EditCourseModal course={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

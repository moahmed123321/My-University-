"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseNotesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setCourse(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notes workspace...</p>;
  }

  if (!course) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Link href="/courses" className="btn">
          Back to courses
        </Link>
      </div>
    );
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const notesSrc = `/notes.html?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}&sbUrl=${encodeURIComponent(sbUrl)}&sbKey=${encodeURIComponent(sbKey)}`;

  return (
    <div className="space-y-4">
      {/* Navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {course.name}</span>
        </Link>
        <a
          href={notesSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Open in new window"
        >
          <span>Fullscreen window</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Header with course name */}
      <PageHeader title={`${course.name} · Notes`}>
        <Button variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>
          Course details
        </Button>
      </PageHeader>
      <p className="-mt-4 text-sm text-muted-foreground">
        {[course.code, course.professor].filter(Boolean).join(", ")}
      </p>

      {/* Embedded Notes & Canvas workspace in main area */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <iframe
          src={notesSrc}
          className="h-[calc(100vh-210px)] min-h-[660px] w-full border-0"
          title={`${course.name} Notes`}
        />
      </div>
    </div>
  );
}


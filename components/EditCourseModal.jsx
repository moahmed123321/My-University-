"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateRow } from "@/lib/db";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = ["#c8102e", "#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#db2777", "#475569"];

export default function EditCourseModal({ course, onClose, onSaved }) {
  const [values, setValues] = useState({ name: course.name || "", code: course.code || "", professor: course.professor || "", color: course.color || COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: updateError } = await updateRow("courses", course.id, values);
    setSaving(false);
    if (updateError) return setError(updateError.message);
    onSaved();
    onClose();
  }

  return <Modal title="Edit course" onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="course-name">Course name</Label><Input id="course-name" required value={values.name} onChange={(event) => update("name", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="course-code">Course code</Label><Input id="course-code" value={values.code} onChange={(event) => update("code", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="course-professor">Professor</Label><Input id="course-professor" value={values.professor} onChange={(event) => update("professor", event.target.value)} /></div>
      <fieldset className="space-y-2"><Label>Course color</Label><div className="flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => update("color", color)} className={`h-8 w-8 rounded-full ring-offset-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${values.color === color ? "scale-110 ring-2 ring-foreground" : "hover:scale-105"}`} style={{ backgroundColor: color }} />)}<input type="color" aria-label="Choose a custom course color" className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" value={values.color} onChange={(event) => update("color", event.target.value)} /></div></fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  </Modal>;
}

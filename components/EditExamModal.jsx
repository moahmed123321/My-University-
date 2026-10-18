"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, GraduationCap } from "lucide-react";

export default function EditExamModal({ exam, courses = [], onClose, onSaved, onDeleted }) {
  const [courseId, setCourseId] = useState(exam.course_id || "");
  const [examDate, setExamDate] = useState(exam.exam_date || "");
  const [examTime, setExamTime] = useState(exam.exam_time ? exam.exam_time.slice(0, 5) : "09:00");
  const [room, setRoom] = useState(exam.room || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      course_id: courseId,
      exam_date: examDate,
      exam_time: examTime ? `${examTime}:00` : null,
      room: room || null,
    };

    const { error: updateError } = await supabase
      .from("exams")
      .update(payload)
      .eq("id", exam.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (onSaved) onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    setDeleting(true);
    const { error: delError } = await supabase.from("exams").delete().eq("id", exam.id);
    setDeleting(false);
    if (delError) {
      setError(delError.message);
      return;
    }
    if (onDeleted) onDeleted();
    onClose();
  }

  return (
    <Modal title="Edit Exam" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2 rounded-lg bg-slate-900 p-2.5 text-white dark:bg-zinc-800">
          <GraduationCap className="h-5 w-5 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            Official Course Exam
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-course">Course</Label>
          <select
            id="exam-course"
            required
            className="input"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam-date">Date</Label>
            <Input
              id="exam-date"
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exam-time">Time</Label>
            <Input
              id="exam-time"
              type="time"
              value={examTime}
              onChange={(e) => setExamTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-room">Room / Hall</Label>
          <Input
            id="exam-room"
            placeholder="e.g. Main Hall B, Room 102"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}


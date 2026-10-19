"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateRow, removeRow } from "@/lib/db";
import { DAY_NAMES, DAY_ORDER } from "@/lib/helpers";
import {
  LECTURE_COLOR_PRESETS,
  getLectureColor,
  setStoredLectureColor,
  deleteStoredLectureColor,
} from "@/lib/lectureColors";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

export default function EditLectureModal({ lecture, courses = [], onClose, onSaved, onDeleted }) {
  const [courseId, setCourseId] = useState(lecture.course_id || "");
  const [kind, setKind] = useState(lecture.kind || "Lecture");
  const [dayOfWeek, setDayOfWeek] = useState(String(lecture.day_of_week ?? 0));
  const [startTime, setStartTime] = useState(lecture.start_time ? lecture.start_time.slice(0, 5) : "09:00");
  const [endTime, setEndTime] = useState(lecture.end_time ? lecture.end_time.slice(0, 5) : "10:30");
  const [room, setRoom] = useState(lecture.room || "");
  const [color, setColor] = useState(() => getLectureColor(lecture));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      course_id: courseId,
      kind,
      day_of_week: Number(dayOfWeek),
      start_time: startTime ? `${startTime}:00` : null,
      end_time: endTime ? `${endTime}:00` : null,
      room: room || null,
    };

    const { error: updateError } = await updateRow("lectures", lecture.id, payload);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Save unique color
    setStoredLectureColor(lecture.id, color);

    if (onSaved) onSaved();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    const success = await removeRow("lectures", lecture.id, "Are you sure you want to delete this lecture?");
    setDeleting(false);
    if (!success) return;
    deleteStoredLectureColor(lecture.id);
    if (onDeleted) onDeleted();
    onClose();
  }

  return (
    <Modal title="Edit Lecture / Class" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-1.5">
          <Label htmlFor="course">Course</Label>
          <select
            id="course"
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

        {/* Unique Color Picker */}
        <div className="space-y-1.5">
          <Label>Lecture Color</Label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {LECTURE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Select color ${preset}`}
                onClick={() => setColor(preset)}
                className={`h-7 w-7 rounded-full transition-transform focus:outline-none ${
                  color === preset
                    ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <input
              type="color"
              aria-label="Custom color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title="Custom color"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="kind">Type</Label>
            <select
              id="kind"
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="Lecture">Lecture</option>
              <option value="Lab">Lab</option>
              <option value="Section">Section</option>
              <option value="Tutorial">Tutorial</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="day">Day</Label>
            <select
              id="day"
              required
              className="input"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
            >
              {DAY_ORDER.map((d) => (
                <option key={d} value={String(d)}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start-time">Starts</Label>
            <Input
              id="start-time"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="end-time">Ends</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="room">Room / Hall</Label>
          <Input
            id="room"
            placeholder="e.g. Hall 3, Lab B"
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

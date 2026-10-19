"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateRow, removeRow } from "@/lib/db";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

export default function EditNoteModal({ note, courses = [], onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content || "");
  const [courseId, setCourseId] = useState(note.course_id || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a note title.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      title: title.trim(),
      content: content.trim() || null,
      course_id: courseId || null,
    };

    const { error: updateError } = await updateRow("notes", note.id, payload);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (onSaved) onSaved();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    const success = await removeRow("notes", note.id, "Are you sure you want to delete this note?");
    setDeleting(false);
    if (!success) return;
    if (onDeleted) onDeleted();
    onClose();
  }

  return (
    <Modal title="Edit note" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {courses.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="edit-note-course">Course</Label>
            <select
              id="edit-note-course"
              className="input w-full"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              <option value="">Choose a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="edit-note-title">Title / Address</Label>
          <Input
            id="edit-note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title / address"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-note-content">Description</Label>
          <Textarea
            id="edit-note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write note description here..."
            className="min-h-[140px] leading-relaxed"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
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
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}


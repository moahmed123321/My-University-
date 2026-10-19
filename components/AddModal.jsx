"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { insertRow } from "@/lib/db";
import { DAY_NAMES, DAY_ORDER } from "@/lib/helpers";
import { setStoredLectureColor } from "@/lib/lectureColors";
import Modal from "./Modal";

const courseField = (optional) => ({
  name: "course_id",
  label: optional ? "Course (optional)" : "Course",
  type: "course",
  required: !optional,
});

// One entry per thing you can add. To add a new field, add a line here
// (and the matching column in supabase/schema.sql).
const FORMS = {
  course: {
    title: "Add course",
    table: "courses",
    needsCourse: false,
    fields: [
      { name: "name", label: "Course name", type: "text", required: true },
      { name: "code", label: "Code (e.g. CS101)", type: "text" },
      { name: "professor", label: "Professor", type: "text" },
      { name: "color", label: "Color", type: "color", default: "#c8102e" },
    ],
  },
  note: {
    title: "Add note",
    table: "notes",
    needsCourse: true,
    fields: [
      courseField(false),
      { name: "title", label: "Title / Address", type: "text", required: true },
      { name: "content", label: "Description", type: "textarea" },
    ],
  },
  topic: {
    title: "Add recent topic",
    table: "topics",
    needsCourse: true,
    fields: [courseField(false), { name: "title", label: "Topic", type: "text", required: true }],
  },
  assignment: {
    title: "Add assignment",
    table: "assignments",
    needsCourse: true,
    fields: [
      courseField(false),
      { name: "title", label: "Title", type: "text", required: true },
      { name: "due_date", label: "Due date", type: "date" },
    ],
  },
  task: {
    title: "Add task",
    table: "tasks",
    needsCourse: true,
    fields: [
      courseField(false),
      { name: "title", label: "Task", type: "text", required: true },
      { name: "due_date", label: "Due date", type: "date" },
    ],
  },
  lecture: {
    title: "Add to week schedule",
    table: "lectures",
    needsCourse: true,
    fields: [
      courseField(false),
      {
        name: "kind",
        label: "Type",
        type: "select",
        default: "Lecture",
        options: ["Lecture", "Lab", "Section"].map((x) => ({ value: x, label: x })),
      },
      {
        name: "day_of_week",
        label: "Day",
        type: "select",
        number: true,
        required: true,
        default: String(DAY_ORDER[0]),
        options: DAY_ORDER.map((d) => ({ value: String(d), label: DAY_NAMES[d] })),
      },
      { name: "start_time", label: "Starts", type: "time", required: true },
      { name: "end_time", label: "Ends", type: "time" },
      { name: "room", label: "Room / Hall", type: "text" },
      { name: "color", label: "Color", type: "color", default: "#2563eb" },
    ],
  },
  exam: {
    title: "Add exam",
    table: "exams",
    needsCourse: true,
    fields: [
      courseField(false),
      { name: "exam_date", label: "Date", type: "date", required: true },
      { name: "exam_time", label: "Time", type: "time" },
      { name: "room", label: "Room / Hall", type: "text" },
    ],
  },
  material: {
    title: "Add course material",
    table: "materials",
    needsCourse: true,
    fields: [
      courseField(false),
      { name: "title", label: "Title", type: "text", required: true },
      { name: "url", label: "Link (YouTube, Drive, any website)", type: "url", required: true },
    ],
  },
};

export default function AddModal({ type, courses = [], defaultCourseId = "", initialValues = {}, onClose, onSaved }) {
  const cfg = FORMS[type];
  const [values, setValues] = useState(() => {
    const v = {};
    cfg.fields.forEach((f) => {
      v[f.name] = initialValues[f.name] ?? f.default ?? "";
    });
    if (defaultCourseId) v.course_id = defaultCourseId;
    return { ...v, ...initialValues };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const blocked = cfg.needsCourse && courses.length === 0;

  function set(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {};
    cfg.fields.forEach((f) => {
      let v = values[f.name];
      if (v === undefined || v === "") v = null;
      if (v !== null && f.number) v = Number(v);
      if (v !== null && f.type === "url" && !/^https?:\/\//i.test(v)) v = "https://" + v;
      payload[f.name] = v;
    });

    let customLectureColor = null;
    if (cfg.table === "lectures" && payload.color) {
      customLectureColor = payload.color;
      delete payload.color;
    }

    const { data, error } = await insertRow(cfg.table, payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data?.id && customLectureColor) {
      setStoredLectureColor(data.id, customLectureColor);
    }

    if (onSaved) onSaved();
    onClose();
  }

  return (
    <Modal title={cfg.title} onClose={onClose}>
      {blocked ? (
        <div className="text-sm text-gray-700">
          <p className="mb-3">You need at least one course first.</p>
          <Link href="/courses" className="btn-primary" onClick={onClose}>
            Go to Courses
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {cfg.fields.map((f) => (
            <label key={f.name} className="block text-sm">
              <span className="mb-1 block text-gray-600">{f.label}</span>
              {f.type === "course" ? (
                <select
                  className="input"
                  required={f.required}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                >
                  <option value="">{f.required ? "Choose a course" : "No course"}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : f.type === "select" ? (
                <select
                  className="input"
                  required={f.required}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  className="input"
                  rows={4}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : (
                <input
                  className={f.type === "color" ? "h-10 w-16 rounded border border-gray-300" : "input"}
                  type={f.type === "url" ? "text" : f.type}
                  required={f.required}
                  value={values[f.name]}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </label>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}
    </Modal>
  );
}

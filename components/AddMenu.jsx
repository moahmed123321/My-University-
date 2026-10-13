"use client";

import { useState } from "react";
import AddModal from "./AddModal";

const LABELS = {
  note: "Note",
  topic: "Recent Topic",
  assignment: "Assignment",
  task: "Task",
  material: "Material link",
};

export default function AddMenu({
  courses,
  onSaved,
  defaultCourseId = "",
  items = ["note", "topic", "assignment", "task"],
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(null);

  return (
    <div className="relative">
      <button className="btn-primary" onClick={() => setOpen(!open)}>
        + Add
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {items.map((t) => (
              <button
                key={t}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  setType(t);
                  setOpen(false);
                }}
              >
                + {LABELS[t]}
              </button>
            ))}
          </div>
        </>
      )}
      {type && (
        <AddModal
          type={type}
          courses={courses}
          defaultCourseId={defaultCourseId}
          onClose={() => setType(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

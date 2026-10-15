"use client";

import { useState } from "react";
import AddModal from "./AddModal";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [type, setType] = useState(null);

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button><Plus className="h-4 w-4" /> Add</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
            {items.map((t) => (
              <DropdownMenuItem
                key={t}
                onClick={() => {
                  setType(t);
                }}
              >
                <Plus className="h-4 w-4" /> {LABELS[t]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
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

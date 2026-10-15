"use client";

import { toggleDone, removeRow } from "@/lib/db";
import { DueBadge, Empty } from "./ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// Table used for both tasks and assignments
export default function ItemTable({ rows, table, onChange, hideCourse = false, empty = "Nothing here." }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr>
            <th className="th w-12"></th>
            <th className="th">Title</th>
            {!hideCourse && <th className="th">Course</th>}
            <th className="th">Due</th>
            <th className="th w-14"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t bg-card transition-colors hover:bg-muted/40">
              <td className="px-4 py-3">
                <Checkbox
                  checked={r.done}
                  onChange={async () => {
                    await toggleDone(table, r);
                    onChange();
                  }}
                />
              </td>
              <td className={"py-3 pr-4 font-medium " + (r.done ? "text-muted-foreground line-through" : "")}>{r.title}</td>
              {!hideCourse && <td className="py-3 pr-4">{r.courses?.name ? <Badge variant="secondary">{r.courses.name}</Badge> : <span className="text-muted-foreground">—</span>}</td>}
              <td className="py-3 pr-4 whitespace-nowrap">
                <DueBadge date={r.due_date} done={r.done} />
              </td>
              <td className="px-2 py-3 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${r.title}`}
                  onClick={async () => {
                    if (await removeRow(table, r.id)) onChange();
                  }}
                ><Trash2 className="h-4 w-4" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

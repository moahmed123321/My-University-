"use client";

import { toggleDone, removeRow } from "@/lib/db";
import { DueBadge, Empty } from "./ui";

// Table used for both tasks and assignments
export default function ItemTable({ rows, table, onChange, hideCourse = false, empty = "Nothing here." }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="th w-8"></th>
            <th className="th">Title</th>
            {!hideCourse && <th className="th">Course</th>}
            <th className="th">Due</th>
            <th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-700"
                  checked={r.done}
                  onChange={async () => {
                    await toggleDone(table, r);
                    onChange();
                  }}
                />
              </td>
              <td className={"py-2 pr-3 " + (r.done ? "text-gray-400 line-through" : "")}>{r.title}</td>
              {!hideCourse && <td className="py-2 pr-3 text-gray-600">{r.courses?.name}</td>}
              <td className="py-2 pr-3 whitespace-nowrap">
                <DueBadge date={r.due_date} done={r.done} />
              </td>
              <td className="py-2 text-right">
                <button
                  className="link-danger"
                  onClick={async () => {
                    if (await removeRow(table, r.id)) onChange();
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

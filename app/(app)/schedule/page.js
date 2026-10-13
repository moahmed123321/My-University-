"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_NAMES, DAY_ORDER, fmtTime, fmtDate, isoDate } from "@/lib/helpers";
import { removeRow } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import AddModal from "@/components/AddModal";

export default function SchedulePage() {
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "lecture" | "exam" | null

  const load = useCallback(async () => {
    const [c, l, e] = await Promise.all([
      supabase.from("courses").select("*").order("name"),
      supabase.from("lectures").select("*, courses(name, code)").order("start_time"),
      supabase.from("exams").select("*, courses(name, code)").order("exam_date"),
    ]);
    setCourses(c.data || []);
    setLectures(l.data || []);
    setExams(e.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayDow = new Date().getDay();
  const today = isoDate();

  return (
    <div>
      <PageHeader title="Schedule">
        <button className="btn" onClick={() => setModal("exam")}>+ Exam</button>
        <button className="btn-primary" onClick={() => setModal("lecture")}>+ Lecture</button>
      </PageHeader>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          <Card title="Week schedule">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="th">Day</th>
                    <th className="th">Time</th>
                    <th className="th">Course</th>
                    <th className="th">Type</th>
                    <th className="th">Room</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {DAY_ORDER.map((d) => {
                    const rows = lectures.filter((l) => l.day_of_week === d);
                    const isToday = d === todayDow;
                    const dayCls = "py-2 pr-3 align-top font-medium " + (isToday ? "text-accent" : "text-ink");
                    if (rows.length === 0) {
                      return (
                        <tr key={d} className="border-t border-gray-100">
                          <td className={dayCls}>{DAY_NAMES[d]}</td>
                          <td colSpan={5} className="py-2 text-gray-400">No classes</td>
                        </tr>
                      );
                    }
                    return (
                      <Fragment key={d}>
                        {rows.map((l, idx) => (
                          <tr key={l.id} className={idx === 0 ? "border-t border-gray-100" : ""}>
                            <td className={dayCls}>{idx === 0 ? DAY_NAMES[d] : ""}</td>
                            <td className="whitespace-nowrap py-2 pr-3">
                              {fmtTime(l.start_time)}
                              {l.end_time ? " - " + fmtTime(l.end_time) : ""}
                            </td>
                            <td className="py-2 pr-3">{l.courses?.name}</td>
                            <td className="py-2 pr-3 text-gray-600">{l.kind}</td>
                            <td className="py-2 pr-3 text-gray-600">{l.room || "-"}</td>
                            <td className="py-2 text-right">
                              <button
                                className="link-danger"
                                onClick={async () => {
                                  if (await removeRow("lectures", l.id)) load();
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Exams">
            {exams.length === 0 ? (
              <Empty>No exams added yet.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Time</th>
                      <th className="th">Course</th>
                      <th className="th">Room</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((x) => (
                      <tr key={x.id} className={"border-t border-gray-100 " + (x.exam_date < today ? "text-gray-400" : "")}>
                        <td className="whitespace-nowrap py-2 pr-3">{fmtDate(x.exam_date)}</td>
                        <td className="py-2 pr-3">{fmtTime(x.exam_time) || "-"}</td>
                        <td className="py-2 pr-3">{x.courses?.name}</td>
                        <td className="py-2 pr-3">{x.room || "-"}</td>
                        <td className="py-2 text-right">
                          <button
                            className="link-danger"
                            onClick={async () => {
                              if (await removeRow("exams", x.id)) load();
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
            )}
          </Card>
        </div>
      )}

      {modal && <AddModal type={modal} courses={courses} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

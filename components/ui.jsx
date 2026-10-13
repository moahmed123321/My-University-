import { isoDate, fmtDate } from "@/lib/helpers";

export function Card({ title, action, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="py-3 text-sm text-gray-500">{children}</p>;
}

export function PageHeader({ title, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function DueBadge({ date, done }) {
  if (!date) return <span className="text-gray-400">-</span>;
  const today = isoDate();
  let cls = "text-gray-600";
  let label = fmtDate(date);
  if (!done && date < today) {
    cls = "font-medium text-red-600";
    label += " (late)";
  } else if (!done && date === today) {
    cls = "font-medium text-amber-600";
    label = "Today";
  }
  return <span className={cls}>{label}</span>;
}

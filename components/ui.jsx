import { isoDate, fmtDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export function Card({ title, action, children, className }) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card p-5 text-card-foreground shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function PageHeader({ title, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
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

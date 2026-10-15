"use client";

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border bg-card p-6 text-card-foreground shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

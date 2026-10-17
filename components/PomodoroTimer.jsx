"use client";

import { useState } from "react";
import {
  usePomodoroContext,
  FOCUS_PRESETS,
  SHORT_BREAK_PRESETS,
  LONG_BREAK_PRESETS,
} from "@/components/PomodoroContext";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Timer,
  X,
} from "lucide-react";

/* ── Helpers ── */
const pad = (n) => String(Math.floor(n)).padStart(2, "0");
const fmt = (s) => `${pad(s / 60)}:${pad(s % 60)}`;

const PHASE_LABELS = {
  idle: "Ready to focus",
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

const PHASE_COLORS = {
  idle: "hsl(var(--muted-foreground))",
  focus: "#c8102e",
  short_break: "#2f7d4f",
  long_break: "#3b6ea5",
};

/* ── Circular progress ring ── */
function Ring({ progress, color, size = 120, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

/* ── Duration preset picker ── */
function PresetPicker({ label, value, presets, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                p === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {p}m
            </button>
          ))}
        </div>
        {/* +/- stepper for custom values */}
        <div className="ml-auto flex items-center gap-0.5 rounded-lg border bg-card">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, value - 1))}
            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Decrease"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="min-w-[28px] text-center text-xs font-bold tabular-nums">
            {value}
          </span>
          <button
            type="button"
            onClick={() => onChange(Math.min(120, value + 1))}
            className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Increase"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   FLOATING POMODORO WIDGET
   • Collapsed: small pill at bottom-right
   • Expanded: full timer with ring, controls, and settings panel
──────────────────────────────────────────────────────────────────────── */
export function FloatingPomodoro() {
  const pomo = usePomodoroContext();
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const color = PHASE_COLORS[pomo.phase];
  const label = PHASE_LABELS[pomo.phase];
  const isActive = pomo.phase !== "idle";

  /* ── Nothing running & not expanded → show a trigger button ── */
  if (!isActive && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full border bg-card/95 px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl md:bottom-4"
      >
        <Timer className="h-4 w-4 text-primary" />
        <span>Pomodoro</span>
      </button>
    );
  }

  /* ── Collapsed active pill ── */
  if (isActive && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-3 rounded-2xl border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl md:bottom-4"
        style={{
          borderColor: `color-mix(in srgb, ${color} 30%, hsl(var(--border)))`,
        }}
      >
        <div className="relative grid place-items-center">
          <Ring progress={pomo.progress} color={color} size={36} stroke={3} />
          <span className="absolute text-[9px] font-bold tabular-nums">
            {fmt(pomo.secondsLeft)}
          </span>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold" style={{ color }}>
            {label}
          </span>
          {pomo.task && (
            <span className="max-w-[100px] truncate text-[10px] text-muted-foreground">
              {pomo.task.title}
            </span>
          )}
        </div>
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  /* ── Expanded panel ── */
  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
        onClick={() => {
          setExpanded(false);
          setShowSettings(false);
        }}
      />
      <div
        className={cn(
          "fixed z-40 overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all",
          "bottom-20 right-4 left-4 md:bottom-4 md:left-auto md:w-[340px]"
        )}
        style={{
          borderColor: isActive
            ? `color-mix(in srgb, ${color} 25%, hsl(var(--border)))`
            : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" style={{ color: isActive ? color : undefined }} />
            <span className="text-sm font-bold">Pomodoro Timer</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              title="Settings"
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                showSettings
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setShowSettings(false);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="space-y-3 border-b bg-muted/30 px-4 py-4">
            <PresetPicker
              label="Focus duration"
              value={pomo.focusMin}
              presets={FOCUS_PRESETS}
              onChange={(v) => pomo.updateSettings({ focus: v })}
            />
            <PresetPicker
              label="Short break"
              value={pomo.shortBreakMin}
              presets={SHORT_BREAK_PRESETS}
              onChange={(v) => pomo.updateSettings({ shortBreak: v })}
            />
            <PresetPicker
              label="Long break"
              value={pomo.longBreakMin}
              presets={LONG_BREAK_PRESETS}
              onChange={(v) => pomo.updateSettings({ longBreak: v })}
            />
            <p className="text-[10px] text-muted-foreground">
              Long break triggers every 4 focus sessions.
              {isActive && " New durations apply from the next session."}
            </p>
          </div>
        )}

        {/* Timer body */}
        <div className="flex flex-col items-center gap-3 px-4 py-5">
          {/* Phase tabs (quick switch when idle) */}
          {!isActive && (
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <span className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                Focus · {pomo.focusMin}m
              </span>
              <span className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                Break · {pomo.shortBreakMin}m
              </span>
              <span className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                Long · {pomo.longBreakMin}m
              </span>
            </div>
          )}

          {/* Ring + digits */}
          <div className="relative grid place-items-center">
            <Ring
              progress={isActive ? pomo.progress : 0}
              color={color}
              size={140}
              stroke={6}
            />
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {fmt(pomo.secondsLeft)}
              </span>
              <span
                className="mt-0.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color }}
              >
                {label}
              </span>
            </div>
          </div>

          {/* Linked task */}
          {pomo.task && (
            <p className="max-w-full truncate text-center text-xs text-muted-foreground">
              📚 {pomo.task.title}
            </p>
          )}

          {/* Session dots */}
          {isActive && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full transition-colors"
                  style={{
                    background:
                      i < pomo.sessions % 4
                        ? PHASE_COLORS.focus
                        : "hsl(var(--border))",
                  }}
                />
              ))}
              <span className="ml-1.5 text-[11px] text-muted-foreground">
                {pomo.sessions} {pomo.sessions === 1 ? "session" : "sessions"} done
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2 pt-1">
            {isActive ? (
              <>
                <button
                  type="button"
                  onClick={pomo.togglePause}
                  className="grid h-12 w-12 place-items-center rounded-full text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                  style={{ background: color }}
                  aria-label={pomo.running ? "Pause" : "Resume"}
                >
                  {pomo.running ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-[1px]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={pomo.skipPhase}
                  title="Skip to next phase"
                  className="grid h-10 w-10 place-items-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pomo.resetPomodoro();
                  }}
                  title="Stop & reset"
                  className="grid h-10 w-10 place-items-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => pomo.startPomodoro(pomo.task)}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02] active:scale-[.98]"
              >
                <Play className="h-4 w-4" />
                Start Focus
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   SMALL FOCUS BUTTON (placed next to tasks / assignments)
──────────────────────────────────────────────────────────────────────── */
export function FocusButton({ taskId, taskTitle, table, className }) {
  const pomo = usePomodoroContext();
  const isThisTask = pomo.phase !== "idle" && pomo.task?.id === taskId;

  return (
    <button
      type="button"
      title={
        isThisTask
          ? `Focusing: ${fmt(pomo.secondsLeft)}`
          : "Start Pomodoro for this task"
      }
      onClick={(e) => {
        e.stopPropagation();
        if (isThisTask) {
          pomo.togglePause();
        } else {
          pomo.startPomodoro({ id: taskId, title: taskTitle, table });
        }
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        isThisTask
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {isThisTask ? (
        <>
          {pomo.running ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          <span className="tabular-nums">{fmt(pomo.secondsLeft)}</span>
        </>
      ) : (
        <>
          <Timer className="h-3 w-3" />
          <span>Focus</span>
        </>
      )}
    </button>
  );
}

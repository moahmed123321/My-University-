"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ── Default durations (minutes) ── */
const DEFAULT_FOCUS = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const SESSIONS_BEFORE_LONG = 4;

/* ── Presets for the settings panel ── */
export const FOCUS_PRESETS = [15, 20, 25, 30, 45, 50, 60];
export const SHORT_BREAK_PRESETS = [3, 5, 10];
export const LONG_BREAK_PRESETS = [10, 15, 20, 30];

const PomodoroContext = createContext(null);

export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoroContext must be used within PomodoroProvider");
  return ctx;
}

export function PomodoroProvider({ children }) {
  // "idle" | "focus" | "short_break" | "long_break"
  const [phase, setPhase] = useState("idle");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS * 60);
  const [sessions, setSessions] = useState(0);
  const [task, setTask] = useState(null); // { id, title, table }

  // Customizable durations (in minutes)
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS);
  const [shortBreakMin, setShortBreakMin] = useState(DEFAULT_SHORT_BREAK);
  const [longBreakMin, setLongBreakMin] = useState(DEFAULT_LONG_BREAK);

  const intervalRef = useRef(null);

  const playNotification = useCallback(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const title = phase === "focus" ? "Focus session complete!" : "Break is over!";
      const body = phase === "focus" ? "Time for a break 🎉" : "Ready to focus again? 💪";
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  }, [phase]);

  const durationFor = useCallback((p) => {
    if (p === "focus") return focusMin * 60;
    if (p === "short_break") return shortBreakMin * 60;
    if (p === "long_break") return longBreakMin * 60;
    return focusMin * 60;
  }, [focusMin, shortBreakMin, longBreakMin]);

  // Core tick
  useEffect(() => {
    if (running && phase !== "idle") {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  // When timer hits zero → advance phase
  useEffect(() => {
    if (secondsLeft !== 0 || phase === "idle") return;

    playNotification();
    setRunning(false);

    if (phase === "focus") {
      const next = sessions + 1;
      setSessions(next);
      if (next % SESSIONS_BEFORE_LONG === 0) {
        setPhase("long_break");
        setSecondsLeft(longBreakMin * 60);
      } else {
        setPhase("short_break");
        setSecondsLeft(shortBreakMin * 60);
      }
    } else {
      setPhase("focus");
      setSecondsLeft(focusMin * 60);
    }
  }, [secondsLeft, phase, sessions, playNotification, focusMin, shortBreakMin, longBreakMin]);

  /* ── Public API ── */

  const startPomodoro = useCallback((taskInfo = null) => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setTask(taskInfo);
    setPhase("focus");
    setSessions(0);
    setSecondsLeft(focusMin * 60);
    setRunning(true);
  }, [focusMin]);

  const togglePause = useCallback(() => {
    if (phase === "idle") return;
    setRunning((r) => !r);
  }, [phase]);

  const skipPhase = useCallback(() => {
    if (phase === "idle") return;
    setSecondsLeft(0);
  }, [phase]);

  const resetPomodoro = useCallback(() => {
    clearInterval(intervalRef.current);
    setPhase("idle");
    setRunning(false);
    setSecondsLeft(focusMin * 60);
    setSessions(0);
    setTask(null);
  }, [focusMin]);

  /** Update durations — can be called while idle or during a break.
   *  If called during focus, the new focus duration takes effect next session. */
  const updateSettings = useCallback(({ focus, shortBreak, longBreak }) => {
    if (focus != null && focus >= 1) {
      setFocusMin(focus);
      // If idle, also reset the displayed seconds
      if (phase === "idle") setSecondsLeft(focus * 60);
    }
    if (shortBreak != null && shortBreak >= 1) setShortBreakMin(shortBreak);
    if (longBreak != null && longBreak >= 1) setLongBreakMin(longBreak);
  }, [phase]);

  const totalSeconds = durationFor(phase === "idle" ? "focus" : phase);
  const progress = phase === "idle" ? 0 : 1 - secondsLeft / totalSeconds;

  return (
    <PomodoroContext.Provider
      value={{
        phase,
        running,
        secondsLeft,
        sessions,
        task,
        progress,
        totalSeconds,
        focusMin,
        shortBreakMin,
        longBreakMin,
        startPomodoro,
        togglePause,
        skipPhase,
        resetPomodoro,
        updateSettings,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

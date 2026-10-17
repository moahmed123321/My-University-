"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Layers, Moon, Palette, ShieldCheck, Sun, User } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  {
    id: "light",
    name: "Light",
    badge: null,
    desc: "Clean & bright appearance with signature university red accents.",
    icon: Sun,
    preview: {
      bg: "bg-[#fcfcfc] border-zinc-200",
      card: "bg-white border-zinc-200/80 shadow-xs",
      header: "bg-red-500",
      text1: "bg-zinc-800",
      text2: "bg-zinc-300",
      accent: "bg-red-500",
    },
  },
  {
    id: "neutral-dark",
    name: "Neutral Dark",
    badge: "Elevated Surfaces",
    desc: "Deep charcoal ground with elevated cards, crisp outlines, and high-contrast surfaces.",
    icon: Layers,
    preview: {
      bg: "bg-[#111113] border-zinc-800",
      card: "bg-[#1f1f23] border-zinc-700/60 shadow-md",
      header: "bg-red-600",
      text1: "bg-zinc-100",
      text2: "bg-zinc-600",
      accent: "bg-red-500",
    },
  },
  {
    id: "dark",
    name: "Classic Dark",
    badge: null,
    desc: "Deep blue-slate midnight appearance for late-night study sessions.",
    icon: Moon,
    preview: {
      bg: "bg-[#0b1329] border-slate-800",
      card: "bg-[#111c38] border-slate-700/60 shadow-md",
      header: "bg-blue-600",
      text1: "bg-slate-100",
      text2: "bg-slate-500",
      accent: "bg-red-500",
    },
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  const currentTheme = mounted ? theme : "light";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your interface appearance, themes, and workspace preferences.
        </p>
      </div>

      {/* ── Appearance & Themes ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Appearance & Themes</CardTitle>
          </div>
          <CardDescription>
            Choose the display style that best suits your study environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((t) => {
              const selected = currentTheme === t.id;
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                      : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
                  )}
                >
                  {/* Theme Mockup Visual Preview */}
                  <div className={cn("relative p-4 border-b border-border/40", t.preview.bg)}>
                    <div
                      className={cn(
                        "flex flex-col gap-2 rounded-lg p-3 transition-transform duration-200 group-hover:-translate-y-0.5",
                        t.preview.card
                      )}
                    >
                      {/* Mini card header */}
                      <div className="flex items-center justify-between">
                        <div className={cn("h-2 w-14 rounded-full", t.preview.text1)} />
                        <div className={cn("h-2.5 w-2.5 rounded-full", t.preview.accent)} />
                      </div>
                      {/* Mini lines */}
                      <div className={cn("h-1.5 w-24 rounded-full", t.preview.text2)} />
                      <div className={cn("h-1.5 w-16 rounded-full", t.preview.text2)} />
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <IconComp className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm font-semibold text-foreground">
                          {t.name}
                        </span>
                      </div>

                      {/* Selected checkmark indicator */}
                      <div
                        className={cn(
                          "grid h-5 w-5 place-items-center rounded-full border transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 bg-background text-transparent"
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    </div>

                    {t.badge && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                          {t.badge}
                        </Badge>
                      </div>
                    )}

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Account & Workspace ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Account & Workspace</CardTitle>
          </div>
          <CardDescription>
            Your current logged-in session and workspace details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Email
              </p>
              <p className="text-sm font-medium text-foreground">
                {userEmail || "Signed in"}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span>Authenticated</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

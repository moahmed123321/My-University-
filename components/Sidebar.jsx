"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/components/BrandMark";
import { BookOpen, CalendarDays, ChevronDown, ChevronRight, LayoutDashboard, LogOut, CheckSquare, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/courses", label: "Courses", icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [showCourses, setShowCourses] = useState(pathname.startsWith("/courses"));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/courses")) {
      setShowCourses(true);
    }
  }, [pathname]);

  useEffect(() => {
    supabase.from("courses").select("id, name, color").order("name").then(({ data }) => setCourses(data || []));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card p-4 transition-[width] duration-200 md:flex overflow-x-hidden",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("mb-6 flex items-center", collapsed ? "flex-col gap-3" : "justify-between")}>
          <BrandMark compact={collapsed} className={collapsed ? "h-9 w-9" : "h-auto w-36"} />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            Workspace
          </p>
        )}

        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => {
            const active = pathname.startsWith(i.href);
            return (
              <div key={i.href}>
                <div className="flex items-center">
                  <Link
                    href={i.href}
                    title={collapsed ? i.label : undefined}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-muted font-semibold text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <i.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{i.label}</span>}
                  </Link>
                  {i.href === "/courses" && !collapsed && (
                    <button
                      type="button"
                      aria-label="Toggle course list"
                      onClick={() => setShowCourses((shown) => !shown)}
                      className="ml-1 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {showCourses ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                {i.href === "/courses" && showCourses && !collapsed && (
                  <div className="mt-1 space-y-1 border-l pl-4">
                    {courses.length ? (
                      courses.map((course) => {
                        const isCurrentCourse = pathname.startsWith(`/courses/${course.id}`);
                        const isNotesActive = pathname === `/courses/${course.id}/notes`;
                        const isOverviewActive = pathname === `/courses/${course.id}`;
                        return (
                          <div key={course.id} className="space-y-0.5">
                            <Link
                              href={`/courses/${course.id}`}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                                isOverviewActive
                                  ? "bg-muted font-medium text-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: course.color || "#c8102e" }}
                              />
                              <span className="truncate">{course.name}</span>
                            </Link>
                            {isCurrentCourse && (
                              <div className="ml-4 space-y-0.5 border-l pl-2 py-0.5">
                                <Link
                                  href={`/courses/${course.id}`}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors",
                                    isOverviewActive
                                      ? "font-semibold text-primary"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <span>Overview</span>
                                </Link>
                                <Link
                                  href={`/courses/${course.id}/notes`}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors",
                                    isNotesActive
                                      ? "font-semibold text-primary"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <span>Notes, Canvas & Folders</span>
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        No courses yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom actions: Settings (standard) above Sign out (red) */}
        <div className="mt-auto space-y-1 border-t border-border/60 pt-3">
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              pathname.startsWith("/settings")
                ? "bg-muted font-semibold text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Settings</span>}
          </Link>

          <button
            title={collapsed ? "Sign out" : undefined}
            onClick={signOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-card/95 px-1 pb-safe backdrop-blur md:hidden">
        {ITEMS.map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={"flex flex-1 flex-col items-center gap-1 py-4 text-center text-xs " + (active ? "font-semibold text-primary" : "text-muted-foreground")}
            >
              <i.icon className="h-5 w-5" />
              {i.label}
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-4 text-center text-xs transition-colors",
            pathname.startsWith("/settings")
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { dbGetAll, dbPutMany } from "@/lib/offlineDb";
import BrandMark from "@/components/BrandMark";
import SyncStatusBadge from "@/components/SyncStatusBadge";
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
    // 1. Immediately read from IndexedDB
    dbGetAll("courses").then((cached) => {
      if (cached && cached.length) {
        setCourses(cached.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      }
    });

    // 2. Refresh from Supabase if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      supabase
        .from("courses")
        .select("id, name, color")
        .order("name")
        .then(({ data }) => {
          if (data) {
            setCourses(data);
            dbPutMany("courses", data);
          }
        });
    }

    // 3. Listen to data-updated
    const handleUpdate = () => {
      dbGetAll("courses").then((cached) => {
        if (cached && cached.length) {
          setCourses(cached.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        }
      });
    };
    window.addEventListener("uni:data-updated", handleUpdate);
    return () => window.removeEventListener("uni:data-updated", handleUpdate);
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
                        const isActive = pathname === `/courses/${course.id}`;
                        return (
                          <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                              isActive
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

        {/* Bottom actions: SyncStatusBadge, Settings, Sign out */}
        <div className="mt-auto space-y-1.5 border-t border-border/60 pt-3">
          <SyncStatusBadge collapsed={collapsed} />
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

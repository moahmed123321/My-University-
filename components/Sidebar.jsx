"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BrandMark from "@/components/BrandMark";
import { BookOpen, CalendarDays, ChevronDown, ChevronRight, LayoutDashboard, LogOut, CheckSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  const [showCourses, setShowCourses] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card p-4 transition-[width] duration-200 md:flex ${collapsed ? "w-20" : "w-64"}`}>
        <div className={`mb-9 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <BrandMark compact={collapsed} className={collapsed ? "h-9 w-9" : "h-auto w-36"} />
          {!collapsed && <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftClose className="h-4 w-4" /></button>}
          {collapsed && <button type="button" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" className="absolute top-16 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftOpen className="h-4 w-4" /></button>}
        </div>
        {!collapsed && <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>}
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => {
            const active = pathname.startsWith(i.href);
            return (
              <div key={i.href}>
                <div className="flex items-center">
                  <Link href={i.href} title={collapsed ? i.label : undefined} className={"flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors " + (active ? "bg-muted font-semibold text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground") + (collapsed ? " justify-center px-2" : "")}><i.icon className="h-4 w-4" />{!collapsed && i.label}</Link>
                  {i.href === "/courses" && !collapsed && <button type="button" aria-label="Toggle course list" onClick={() => setShowCourses((shown) => !shown)} className="ml-1 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">{showCourses ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>}
                </div>
                {i.href === "/courses" && showCourses && !collapsed && <div className="mt-1 space-y-1 border-l pl-4">{courses.length ? courses.map((course) => <Link key={course.id} href={`/courses/${course.id}`} className={"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs " + (pathname === `/courses/${course.id}` ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: course.color || "#c8102e" }} /> <span className="truncate">{course.name}</span></Link>) : <p className="px-2 py-1 text-xs text-muted-foreground">No courses yet</p>}</div>}
              </div>
            );
          })}
        </nav>
        <button title={collapsed ? "Sign out" : undefined} onClick={signOut} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground ${collapsed ? "justify-center px-2" : ""}`}>
          <LogOut className="h-4 w-4" /> {!collapsed && "Sign out"}
        </button>
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
      </nav>
    </>
  );
}

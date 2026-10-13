"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/tasks", label: "Tasks" },
  { href: "/courses", label: "Courses" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-ink p-4 text-white md:flex">
        <div className="mb-8 px-2 text-lg font-semibold">Uni Manager</div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => {
            const active = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={
                  "rounded-md px-3 py-2 text-sm " +
                  (active ? "bg-white/15 font-medium" : "text-white/70 hover:bg-white/10")
                }
              >
                {i.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10">
          Sign out
        </button>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-ink text-white md:hidden">
        {ITEMS.map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={"flex-1 py-3 text-center text-xs " + (active ? "font-semibold" : "text-white/60")}
            >
              {i.label}
            </Link>
          );
        })}
        <button onClick={signOut} className="flex-1 py-3 text-center text-xs text-white/60">
          Sign out
        </button>
      </nav>
    </>
  );
}

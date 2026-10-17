"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { PomodoroProvider } from "@/components/PomodoroContext";
import { FloatingPomodoro } from "@/components/PomodoroTimer";

// Every page inside (app) needs a logged-in user. Otherwise go to /login.
export default function AppLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading your workspace...</div>;

  return (
    <PomodoroProvider>
      <div className="min-h-screen bg-muted/30 md:flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 md:pb-8"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
      <FloatingPomodoro />
    </PomodoroProvider>
  );
}

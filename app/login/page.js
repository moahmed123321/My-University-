"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandMark from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the app.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else router.replace("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else if (data.session) router.replace("/dashboard");
        else setInfo("Account created. Check your email to confirm it, then log in.");
      }
    } catch {
      setError("We couldn't reach Supabase. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/70" />
        <div className="relative inline-flex w-fit rounded-xl bg-white dark:bg-card/90 dark:border dark:border-border/60 p-3 shadow-lg"><BrandMark /></div>
        <div className="relative max-w-md">
          <Badge className="mb-5 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15">
            Your semester, organized
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">A calmer way to manage university.</h1>
          <p className="mt-5 text-lg leading-8 text-primary-foreground/75">
            Keep courses, deadlines, lectures, and notes together so you can focus on learning.
          </p>
          <div className="mt-10 space-y-4 text-sm text-primary-foreground/85">
            <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5" /> See upcoming work at a glance</p>
            <p className="flex items-center gap-3"><CalendarDays className="h-5 w-5" /> Plan every lecture and exam</p>
          </div>
        </div>
        <p className="relative text-sm text-primary-foreground/60">Built for focused study days.</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <Card className="border-border/70 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
              <CardDescription>
                {mode === "login" ? "Enter your details to continue to your workspace." : "Start organizing your semester in one place."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">University email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@university.edu" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 6 characters" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
                {info && <p role="status" className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">{info}</p>}
                <Button className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "New here? " : "Already have an account? "}
                <button type="button" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}>
                  {mode === "login" ? "Create an account" : "Log in"}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

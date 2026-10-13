"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    setLoading(true);
    setError("");
    setInfo("");

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
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Uni Manager</h1>
        <p className="mb-5 text-sm text-gray-500">
          {mode === "login" ? "Log in to see your schedule and tasks." : "Create your account."}
        </p>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-gray-600">Email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-gray-600">Password (min 6 characters)</span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {info && <p className="mb-3 text-sm text-teal-700">{info}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-800"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </main>
  );
}

import { createClient } from "@supabase/supabase-js";

// The fallback values only stop the build from crashing if the keys are missing.
// Real keys come from .env.local (on your computer) or Vercel Environment Variables (online).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

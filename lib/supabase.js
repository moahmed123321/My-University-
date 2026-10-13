import { createClient } from "@supabase/supabase-js";

// The fallback values only stop the build from crashing if the keys are missing.
// Real keys come from .env.local (on your computer) or Vercel Environment Variables (online).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

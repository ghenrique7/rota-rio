import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const urlReady = SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT");
const keyReady = SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "YOUR_ANON_KEY";

if (!urlReady || !keyReady) {
  throw new Error(
    "Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js (Project Settings → API)."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

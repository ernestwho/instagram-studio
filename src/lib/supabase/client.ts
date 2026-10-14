import { createClient } from "@supabase/supabase-js";

// App a utente singolo: la sessione sta nel browser e i dati sono protetti dalle policy (RLS).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

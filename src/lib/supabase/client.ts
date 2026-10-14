import { createClient } from "@supabase/supabase-js";
import { URL_SUPABASE } from "./indirizzo";

// La sessione sta nel browser; i dati sono nello schema "studio" e protetti dalle policy (RLS),
// che li mostrano solo agli utenti elencati in studio.accesso.
export const supabase = createClient(
  URL_SUPABASE,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "studio" } },
);

/** true se l'utente collegato è tra quelli ammessi a Instagram Studio. */
export async function haAccesso(userId: string) {
  const { data, error } = await supabase.from("accesso").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

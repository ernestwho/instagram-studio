import { createClient } from "@supabase/supabase-js";

// La sessione sta nel browser; i dati sono nello schema "studio" e protetti dalle policy (RLS),
// che li mostrano solo agli utenti elencati in studio.accesso.
// L'indirizzo deve essere solo https://xxxx.supabase.co: togliamo eventuali /rest/v1 o "/" finali incollati per errore.
export const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/(rest\/v1|auth\/v1)?\/?$/, ""),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "studio" } },
);

/** true se l'utente collegato è tra quelli ammessi a Instagram Studio. */
export async function haAccesso(userId: string) {
  const { data, error } = await supabase.from("accesso").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

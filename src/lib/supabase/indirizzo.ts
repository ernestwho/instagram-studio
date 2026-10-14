// L'indirizzo deve essere solo https://xxxx.supabase.co: togliamo eventuali /rest/v1 o "/" finali incollati per errore.
export const URL_SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/(rest\/v1|auth\/v1)?\/?$/, "");

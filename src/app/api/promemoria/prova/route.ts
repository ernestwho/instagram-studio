// Notifica di prova dalle Impostazioni: solo per gli utenti ammessi a Instagram Studio.
import { createClient } from "@supabase/supabase-js";
import { chiaviMancanti, invia, iscrizioneSchema } from "@/lib/push";
import { URL_SUPABASE } from "@/lib/supabase/indirizzo";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ errore: "non autorizzato" }, { status: 401 });
  const supabase = createClient(
    URL_SUPABASE,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "studio" }, global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: ammesso } = await supabase.rpc("ammesso");
  if (ammesso !== true) return Response.json({ errore: "non autorizzato" }, { status: 401 });
  if (chiaviMancanti())
    return Response.json({ errore: "Mancano le chiavi VAPID nelle variabili di Vercel" }, { status: 500 });

  const iscrizione = iscrizioneSchema.safeParse((await request.json().catch(() => null))?.iscrizione);
  if (!iscrizione.success) return Response.json({ errore: "iscrizione non valida" }, { status: 400 });
  let esito: Awaited<ReturnType<typeof invia>>;
  try {
    esito = await invia(
      [{ chiave: "prova", titolo: "Instagram Studio", corpo: "Le notifiche funzionano su questo dispositivo.", url: "/impostazioni" }],
      [iscrizione.data],
    );
  } catch (e) {
    return Response.json({ errore: (e as Error).message }, { status: 500 });
  }
  if (esito.inviate) return Response.json(esito);
  // Mostra in Impostazioni il motivo dato dal servizio push (Apple, Google, Mozilla).
  const motivo = esito.scadute.length ? "iscrizione scaduta: disattiva e riattiva le notifiche" : esito.errori.join("; ");
  return Response.json({ ...esito, errore: `Il servizio push ha rifiutato la notifica (${motivo})` }, { status: 502 });
}

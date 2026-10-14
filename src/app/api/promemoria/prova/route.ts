// Notifica di prova dalle Impostazioni: solo per gli utenti ammessi a Instagram Studio.
import { createClient } from "@supabase/supabase-js";
import { chiaviMancanti, invia, iscrizioneSchema } from "@/lib/push";
import { URL_SUPABASE } from "@/lib/supabase/client";

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
  const esito = await invia(
    [{ chiave: "prova", titolo: "Instagram Studio", corpo: "Le notifiche funzionano su questo dispositivo.", url: "/impostazioni" }],
    [iscrizione.data],
  );
  return Response.json(esito, { status: esito.inviate ? 200 : 502 });
}

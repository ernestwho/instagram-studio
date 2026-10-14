// Chiamata ogni ora da Supabase Cron (studio.invia_promemoria) con i promemoria dovuti.
import * as z from "zod";
import { chiaviMancanti, invia, iscrizioneSchema, notificaSchema, stessoSegreto } from "@/lib/push";

const corpoSchema = z.object({ notifiche: z.array(notificaSchema), iscrizioni: z.array(iscrizioneSchema) });

export async function POST(request: Request) {
  const segreto = (process.env.PROMEMORIA_SEGRETO ?? "").trim();
  const ricevuto = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!segreto || !stessoSegreto(ricevuto, segreto)) return Response.json({ errore: "non autorizzato" }, { status: 401 });
  if (chiaviMancanti()) return Response.json({ errore: "chiavi VAPID mancanti" }, { status: 500 });

  const dati = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dati.success) return Response.json({ errore: "dati non validi" }, { status: 400 });
  return Response.json(await invia(dati.data.notifiche, dati.data.iscrizioni));
}

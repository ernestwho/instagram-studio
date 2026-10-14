// Invio delle notifiche Web Push (solo lato server). Gratis: usa i server push di browser e telefoni.
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import * as z from "zod";

export const iscrizioneSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});
export type Iscrizione = z.infer<typeof iscrizioneSchema>;

export const notificaSchema = z.object({
  chiave: z.string(),
  titolo: z.string(),
  corpo: z.string(),
  url: z.string().startsWith("/"),
});
export type Notifica = z.infer<typeof notificaSchema>;

export function chiaviMancanti() {
  return !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY;
}

/** Manda le notifiche a tutti i dispositivi; restituisce quelli non più validi (disinstallati o revocati). */
export async function invia(notifiche: Notifica[], iscrizioni: Iscrizione[]) {
  const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost";
  webpush.setVapidDetails(`https://${dominio}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const scadute = new Set<string>();
  let inviate = 0;
  const errori: string[] = [];
  await Promise.all(
    iscrizioni.flatMap((s) =>
      notifiche.map(async (n) => {
        try {
          await webpush.sendNotification(
            s,
            JSON.stringify({ titolo: n.titolo, corpo: n.corpo, url: n.url, tag: n.chiave }),
            { TTL: 6 * 3600, urgency: "high" },
          );
          inviate++;
        } catch (e) {
          const codice = (e as { statusCode?: number }).statusCode;
          if (codice === 404 || codice === 410) scadute.add(s.endpoint);
          else errori.push(`${codice ?? ""} ${(e as Error).message}`.trim());
        }
      }),
    ),
  );
  return { inviate, scadute: [...scadute], errori };
}

export function stessoSegreto(ricevuto: string, atteso: string) {
  const a = Buffer.from(ricevuto);
  const b = Buffer.from(atteso);
  return a.length === b.length && timingSafeEqual(a, b);
}

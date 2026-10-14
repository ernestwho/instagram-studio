// Funzioni sul testo delle caption (senza database, così si testano da sole).
import type { PartitaBreve } from "./contenuti";
import { dataBreve, oraBreve } from "./date";

export const LIMITE_CARATTERI = 2200;
export const LIMITE_HASHTAG = 30;
/** Più o meno quanto si vede nel feed prima di "altro". */
export const PRIMA_RIGA = 125;

/** Trasforma testo libero ("basket, #ragusa  sport") in hashtag puliti e senza doppioni. */
export function leggiHashtag(testo: string): string[] {
  return unisciHashtag(
    [],
    testo
      .split(/[\s,;]+/)
      .map((h) => h.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, ""))
      .filter(Boolean)
      .map((h) => `#${h}`),
  );
}

/** Aggiunge hashtag in coda, saltando quelli già presenti (senza badare a maiuscole). */
export function unisciHashtag(attuali: string[], nuovi: string[]): string[] {
  const visti = new Set(attuali.map((h) => h.toLowerCase()));
  const risultato = [...attuali];
  for (const h of nuovi) {
    if (visti.has(h.toLowerCase())) continue;
    visti.add(h.toLowerCase());
    risultato.push(h);
  }
  return risultato;
}

/** Hashtag scritti dentro il testo della caption (contano anche loro per il limite di 30). */
export function hashtagNelTesto(testo: string): string[] {
  return testo.match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

export function conteggi(caption: string, hashtag: string[]) {
  const completa = hashtag.length ? `${caption}\n\n${hashtag.join(" ")}` : caption;
  const tutti = unisciHashtag(hashtagNelTesto(caption), hashtag);
  const primaRiga = caption.split("\n")[0];
  return {
    caratteri: [...completa].length,
    hashtag: tutti.length,
    primaRigaLunga: [...primaRiga].length > PRIMA_RIGA,
  };
}

/** Segnaposto utilizzabili nei modelli, con la partita collegata al contenuto. */
export const SEGNAPOSTO = ["{avversario}", "{giornata}", "{data}", "{ora}", "{palazzetto}"] as const;

export function compilaModello(testo: string, partita: PartitaBreve | null): string {
  if (!partita) return testo;
  const avversario = partita.casa.includes("Virtus") ? partita.ospite : partita.casa;
  return testo
    .replaceAll("{avversario}", avversario)
    .replaceAll("{giornata}", String(partita.giornata))
    .replaceAll("{data}", dataBreve(partita.data))
    .replaceAll("{ora}", oraBreve(partita.ora))
    .replaceAll("{palazzetto}", partita.palazzetto);
}

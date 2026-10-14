// Contenuti del piano: tipi, etichette e operazioni sul database.
import { aggiungiGiorni, oggiRoma } from "./date";
import type { Stato } from "./import/anteprima";
import { ACCOUNT, FORMATI, type ComeRealizzarlo } from "./import/formato";
import { supabase } from "./supabase/client";

export { ACCOUNT, FORMATI };
export type { Stato };

export const STATI: { valore: Stato; etichetta: string }[] = [
  { valore: "da_girare", etichetta: "Da girare" },
  { valore: "in_montaggio", etichetta: "In montaggio" },
  { valore: "pronto", etichetta: "Pronto" },
  { valore: "programmato", etichetta: "Programmato" },
  { valore: "pubblicato", etichetta: "Pubblicato" },
];
export const etichettaStato = (s: Stato) => STATI.find((x) => x.valore === s)!.etichetta;

export const ETICHETTE_FORMATO: Record<string, string> = {
  foto: "Foto",
  carosello: "Carosello",
  reel: "Reel",
  storia: "Storia",
};

export type Rubrica = { id: string; nome: string; colore: string };

export type PartitaBreve = {
  id: string;
  giornata: number;
  data: string;
  ora: string;
  casa: string;
  ospite: string;
  palazzetto: string;
  indirizzo: string;
  rimossa: boolean;
};

export type Contenuto = {
  id: string;
  codice: string | null;
  piano_id: string | null;
  account: string;
  titolo: string;
  rubrica_id: string | null;
  formato: (typeof FORMATI)[number];
  pub_modo: "data" | "partita";
  pub_data: string | null;
  partita_id: string | null;
  giorni_dopo: number | null;
  pub_ora: string;
  obiettivo: string;
  come_realizzarlo: Partial<ComeRealizzarlo>;
  caption_bozza: string;
  caption: string | null;
  hashtag: string[];
  stato: Stato;
  link_post: string | null;
  spunte: number[];
  modificato_a_mano: boolean;
  data_uscita: string | null;
  partita_mancante: boolean;
  rubriche: Rubrica | null;
  partite: PartitaBreve | null;
};

const CAMPI = "*, rubriche(id, nome, colore), partite(id, giornata, data, ora, casa, ospite, palazzetto, indirizzo, rimossa)";

function controlla<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function caricaTutti(): Promise<Contenuto[]> {
  return controlla(
    await supabase
      .from("v_contenuti")
      .select(CAMPI)
      .order("data_uscita", { nullsFirst: true })
      .order("pub_ora"),
  ) as Contenuto[];
}

export async function caricaContenuto(id: string): Promise<Contenuto | null> {
  return controlla(await supabase.from("v_contenuti").select(CAMPI).eq("id", id).maybeSingle()) as Contenuto | null;
}

export async function caricaRubriche(): Promise<Rubrica[]> {
  return controlla(await supabase.from("rubriche").select("id, nome, colore").order("nome"));
}

export async function caricaPartite(): Promise<PartitaBreve[]> {
  return controlla(await supabase.from("partite").select("*").eq("rimossa", false).order("data"));
}

/** Campi modificabili a mano (le colonne della tabella contenuti). */
export type Modifica = Partial<
  Pick<
    Contenuto,
    | "account"
    | "titolo"
    | "rubrica_id"
    | "formato"
    | "pub_modo"
    | "pub_data"
    | "partita_id"
    | "giorni_dopo"
    | "pub_ora"
    | "obiettivo"
    | "come_realizzarlo"
    | "caption_bozza"
    | "caption"
    | "hashtag"
    | "stato"
    | "link_post"
    | "spunte"
    | "modificato_a_mano"
  >
>;

export async function aggiorna(id: string, modifica: Modifica) {
  controlla(await supabase.from("contenuti").update(modifica).eq("id", id).select("id"));
}

export async function crea(dati: Modifica & Pick<Contenuto, "titolo" | "account" | "formato" | "pub_modo" | "pub_ora">) {
  const r = controlla<{ id: string }>(await supabase.from("contenuti").insert(dati).select("id").single());
  return r.id;
}

export async function elimina(id: string) {
  controlla(await supabase.from("contenuti").delete().eq("id", id).select("id"));
}

/**
 * Sposta un contenuto su un altro giorno. Se era legato a una partita resta legato
 * (cambia giorni_dopo); con "fissa" diventa a data fissa.
 */
export function spostamento(c: Contenuto, nuovaData: string): Modifica {
  if (c.pub_modo === "partita" && c.partite && !c.partite.rimossa) {
    const giorni = Math.round((Date.parse(nuovaData) - Date.parse(c.partite.data)) / 86_400_000);
    return { giorni_dopo: giorni, modificato_a_mano: c.piano_id !== null };
  }
  return { pub_modo: "data", pub_data: nuovaData, modificato_a_mano: c.piano_id !== null };
}

export function settimanaDi(data: string) {
  // Lunedì della settimana della data.
  const giorno = new Date(`${data}T12:00:00Z`).getUTCDay();
  return aggiungiGiorni(data, -((giorno + 6) % 7));
}

export function oggi() {
  return oggiRoma();
}

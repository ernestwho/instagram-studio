// Letture e scritture sul database usate dalle schermate.
import type { AnteprimaCalendario, AnteprimaPiano, ContenutoDb, PartitaDb } from "./import/anteprima";
import { supabase } from "./supabase/client";

function controlla<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function caricaPartite(): Promise<PartitaDb[]> {
  return controlla(await supabase.from("partite").select("*").order("data"));
}

export async function caricaContenutiPerImport(): Promise<ContenutoDb[]> {
  return controlla(await supabase.from("v_contenuti_import").select("*"));
}

export async function applicaCalendario(dati: AnteprimaCalendario["applica"]) {
  return controlla(await supabase.rpc("applica_calendario", { dati }));
}

export async function applicaPiano(dati: AnteprimaPiano["applica"]) {
  return controlla(await supabase.rpc("applica_piano", { dati }));
}

export type VoceStorico = {
  id: string;
  tipo: "calendario" | "piano";
  nome: string;
  importato_il: string;
  riepilogo: Record<string, number>;
  attivo?: boolean;
};

export async function caricaStorico(): Promise<VoceStorico[]> {
  const [cal, piani] = await Promise.all([
    supabase.from("import_calendario").select("id, stagione, importato_il, riepilogo"),
    supabase.from("piani").select("id, nome, importato_il, riepilogo, attivo"),
  ]);
  const voci: VoceStorico[] = [
    ...controlla(cal).map((c) => ({ ...c, tipo: "calendario" as const, nome: `Calendario ${c.stagione}` })),
    ...controlla(piani).map((p) => ({ ...p, tipo: "piano" as const })),
  ];
  return voci.sort((a, b) => b.importato_il.localeCompare(a.importato_il));
}

export type ContenutoLista = {
  id: string;
  codice: string | null;
  titolo: string;
  account: string;
  formato: string;
  stato: string;
  data_uscita: string | null;
  pub_ora: string;
  partita_mancante: boolean;
  rubriche: { nome: string; colore: string } | null;
};

export async function caricaContenuti(): Promise<ContenutoLista[]> {
  return controlla(
    await supabase
      .from("v_contenuti")
      .select("id, codice, titolo, account, formato, stato, data_uscita, pub_ora, partita_mancante, rubriche(nome, colore)")
      .order("data_uscita", { nullsFirst: true })
      .order("pub_ora"),
  ) as unknown as ContenutoLista[];
}

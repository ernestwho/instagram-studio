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

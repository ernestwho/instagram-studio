// Laboratorio caption: modelli e gruppi di hashtag sul database.
import { supabase } from "./supabase/client";

export * from "./caption";

export type Modello = { id: string; nome: string; testo: string; account: string | null };
export type GruppoHashtag = { id: string; nome: string; hashtag: string[] };

function controlla<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function caricaModelli(): Promise<Modello[]> {
  return controlla(await supabase.from("modelli_caption").select("id, nome, testo, account").order("nome"));
}

export async function salvaModello(m: Omit<Modello, "id">): Promise<Modello> {
  return controlla(await supabase.from("modelli_caption").insert(m).select("id, nome, testo, account").single());
}

export async function eliminaModello(id: string) {
  controlla(await supabase.from("modelli_caption").delete().eq("id", id).select("id"));
}

export async function caricaGruppi(): Promise<GruppoHashtag[]> {
  return controlla(await supabase.from("gruppi_hashtag").select("id, nome, hashtag").order("nome"));
}

export async function salvaGruppo(g: Omit<GruppoHashtag, "id">): Promise<GruppoHashtag> {
  return controlla(await supabase.from("gruppi_hashtag").insert(g).select("id, nome, hashtag").single());
}

export async function eliminaGruppo(id: string) {
  controlla(await supabase.from("gruppi_hashtag").delete().eq("id", id).select("id"));
}

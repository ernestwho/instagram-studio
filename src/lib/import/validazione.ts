// Validazione dei file di import con messaggi in italiano che indicano contenuto e campo.
import { z } from "zod";
import {
  calendarioSchema,
  contenutoSchema,
  pianoSchema,
  rubricaSchema,
  type Calendario,
  type ContenutoFile,
  type Piano,
  type Rubrica,
} from "./formato";

export type Problema = { dove: string; messaggio: string };

export type Esito<T> =
  | { ok: true; dati: T; avvisi: Problema[] }
  | { ok: false; errori: Problema[]; avvisi: Problema[] };

export type TipoFile = "calendario_partite" | "piano_editoriale";

/** Legge il testo di un file e dice che tipo di import è. */
export function leggiFile(testo: string): { ok: true; json: unknown; tipo: TipoFile } | { ok: false; errore: Problema } {
  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch (e) {
    return { ok: false, errore: { dove: "file", messaggio: `non è un JSON valido (${(e as Error).message})` } };
  }
  const tipo = (json as { tipo?: unknown } | null)?.tipo;
  if (tipo === "calendario_partite" || tipo === "piano_editoriale") return { ok: true, json, tipo };
  return {
    ok: false,
    errore: { dove: "tipo", messaggio: 'il file deve avere "tipo": "calendario_partite" oppure "piano_editoriale"' },
  };
}

export const LIMITE_CAPTION = 2200;
export const LIMITE_HASHTAG = 30;

export function validaCalendario(json: unknown): Esito<Calendario> {
  const r = calendarioSchema.safeParse(json);
  if (!r.success) return { ok: false, errori: problemi(r.error, json, "partite", "Partita"), avvisi: [] };
  const errori: Problema[] = [];
  duplicati(r.data.partite.map((p) => p.id)).forEach((id) =>
    errori.push({ dove: `Partita ${id} → id`, messaggio: "id ripetuto: ogni partita deve avere un id diverso" }),
  );
  return errori.length ? { ok: false, errori, avvisi: [] } : { ok: true, dati: r.data, avvisi: [] };
}

/**
 * @param idPartite gli id delle partite presenti nel calendario caricato nell'app.
 */
export function validaPiano(json: unknown, idPartite: Set<string>): Esito<Piano> {
  const r = pianoSchema.safeParse(json);
  if (!r.success) {
    // Mostra tutto in una volta: agli errori di struttura aggiunge i controlli sui contenuti leggibili.
    const errori = problemi(r.error, json, "contenuti", "Contenuto");
    const grezzo = json as { rubriche?: unknown; contenuti?: unknown };
    const rubriche = z.array(rubricaSchema).safeParse(grezzo.rubriche);
    const leggibili = Array.isArray(grezzo.contenuti)
      ? grezzo.contenuti.flatMap((c) => {
          const x = contenutoSchema.safeParse(c);
          return x.success ? [x.data] : [];
        })
      : [];
    const extra = controllaContenuti(leggibili, rubriche.success ? rubriche.data : null, idPartite);
    return { ok: false, errori: [...errori, ...extra.errori], avvisi: extra.avvisi };
  }
  const piano = r.data;
  const errori: Problema[] = [];

  if (piano.valido_dal > piano.valido_al)
    errori.push({ dove: "valido_al", messaggio: "è prima di valido_dal" });
  duplicati(piano.rubriche.map((x) => x.id)).forEach((id) =>
    errori.push({ dove: `Rubrica ${id} → id`, messaggio: "id ripetuto" }),
  );
  duplicati(piano.contenuti.map((c) => c.id)).forEach((id) =>
    errori.push({ dove: `Contenuto ${id} → id`, messaggio: "id ripetuto: ogni contenuto deve avere un id diverso" }),
  );

  const controlli = controllaContenuti(piano.contenuti, piano.rubriche, idPartite);
  errori.push(...controlli.errori);
  return errori.length
    ? { ok: false, errori, avvisi: controlli.avvisi }
    : { ok: true, dati: piano, avvisi: controlli.avvisi };
}

function controllaContenuti(contenuti: ContenutoFile[], rubricheFile: Rubrica[] | null, idPartite: Set<string>) {
  const errori: Problema[] = [];
  const avvisi: Problema[] = [];
  const rubriche = rubricheFile && new Set(rubricheFile.map((x) => x.id));
  for (const c of contenuti) {
    if (rubriche && !rubriche.has(c.rubrica))
      errori.push({
        dove: `Contenuto ${c.id} → rubrica`,
        messaggio: `la rubrica "${c.rubrica}" non è tra le rubriche del file`,
      });
    if (c.pubblicazione.modo === "partita" && !idPartite.has(c.pubblicazione.partita_id))
      errori.push({
        dove: `Contenuto ${c.id} → pubblicazione.partita_id`,
        messaggio: `la partita ${c.pubblicazione.partita_id} non esiste nel calendario caricato`,
      });
    const nHashtag = c.hashtag.length + (c.caption_bozza.match(/#\S+/g)?.length ?? 0);
    if (nHashtag > LIMITE_HASHTAG)
      avvisi.push({
        dove: `Contenuto ${c.id} → hashtag`,
        messaggio: `${nHashtag} hashtag: Instagram ne accetta al massimo ${LIMITE_HASHTAG}`,
      });
    const lunghezza = captionCompleta(c.caption_bozza, c.hashtag).length;
    if (lunghezza > LIMITE_CAPTION)
      avvisi.push({
        dove: `Contenuto ${c.id} → caption_bozza`,
        messaggio: `${lunghezza} caratteri con gli hashtag: Instagram ne accetta al massimo ${LIMITE_CAPTION}`,
      });
  }
  return { errori, avvisi };
}

export function captionCompleta(caption: string, hashtag: string[]) {
  return hashtag.length ? `${caption}\n\n${hashtag.join(" ")}` : caption;
}

function duplicati(ids: string[]) {
  const visti = new Set<string>();
  const doppi = new Set<string>();
  for (const id of ids) (visti.has(id) ? doppi : visti).add(id);
  return [...doppi];
}

/**
 * Trasforma gli errori di Zod in "Contenuto c014 → pubblicazione.partita_id: ...".
 * Per gli elementi della lista principale usa il loro id se c'è, altrimenti la posizione.
 */
function problemi(errore: z.ZodError, json: unknown, lista: string, etichetta: string): Problema[] {
  const visti = new Set<string>();
  const out: Problema[] = [];
  for (const issue of errore.issues) {
    const path = issue.path.map(String);
    let dove: string;
    if (path[0] === lista && path.length > 1) {
      const i = Number(path[1]);
      const elemento = (json as Record<string, unknown[]>)[lista]?.[i] as { id?: unknown } | undefined;
      const nome = typeof elemento?.id === "string" && elemento.id ? elemento.id : `n. ${i + 1}`;
      const campo = path.slice(2).join(".");
      dove = campo ? `${etichetta} ${nome} → ${campo}` : `${etichetta} ${nome}`;
    } else if (path[0] === "rubriche" && path.length > 1) {
      const i = Number(path[1]);
      const r = (json as { rubriche?: { id?: unknown }[] }).rubriche?.[i];
      const nome = typeof r?.id === "string" && r.id ? r.id : `n. ${i + 1}`;
      dove = `Rubrica ${nome}${path.length > 2 ? ` → ${path.slice(2).join(".")}` : ""}`;
    } else {
      dove = path.join(".") || "file";
    }
    const messaggio = issue.code === "invalid_type" && issue.input === undefined ? "manca" : issue.message;
    const chiave = `${dove}|${messaggio}`;
    if (!visti.has(chiave)) {
      visti.add(chiave);
      out.push({ dove, messaggio });
    }
  }
  return out;
}

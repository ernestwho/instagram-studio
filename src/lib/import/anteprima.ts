// Anteprima delle modifiche di un import, e dati da applicare al database.
// Tutta la logica sta qui (testata); il database applica le modifiche in una transazione.
import { aggiungiGiorni, istanteRoma, oraBreve } from "../date";
import type { Calendario, ContenutoFile, Piano, Pubblicazione } from "./formato";
import type { Problema } from "./validazione";

export type Stato = "da_girare" | "in_montaggio" | "pronto" | "programmato" | "pubblicato";

export type PartitaDb = {
  id: string;
  stagione: string;
  giornata: number;
  data: string;
  ora: string;
  casa: string;
  ospite: string;
  palazzetto: string;
  indirizzo: string;
  note: string;
  rimossa: boolean;
};

/** Campi di un contenuto che arrivano dal file del piano. */
export type CampiPiano = {
  account: string;
  titolo: string;
  rubrica_id: string;
  formato: ContenutoFile["formato"];
  pub_modo: "data" | "partita";
  pub_data: string | null;
  partita_id: string | null;
  giorni_dopo: number | null;
  pub_ora: string;
  obiettivo: string;
  come_realizzarlo: ContenutoFile["come_realizzarlo"];
  caption_bozza: string;
  hashtag: string[];
};

export type ContenutoDb = CampiPiano & {
  id: string;
  codice: string | null;
  piano_id: string | null;
  /** Codice del piano di provenienza (es. "piano-autunno-2026"). */
  piano_codice: string | null;
  stato: Stato;
  caption: string | null;
  modificato_a_mano: boolean;
};

export type Uscita = { data: string; ora: string } | null;
export type DataSpostata = { id: string; codice: string | null; titolo: string; prima: Uscita; dopo: Uscita };
export type CampoCambiato = { campo: string; prima: string; dopo: string };

// ---------- Date di uscita ----------

type DatePartite = Map<string, { data: string; rimossa?: boolean }>;

export function uscitaDi(
  r: Pick<CampiPiano, "pub_modo" | "pub_data" | "partita_id" | "giorni_dopo" | "pub_ora">,
  partite: DatePartite,
): Uscita {
  const ora = oraBreve(r.pub_ora);
  if (r.pub_modo === "data") return { data: r.pub_data!, ora };
  const p = partite.get(r.partita_id!);
  if (!p || p.rimossa) return null;
  return { data: aggiungiGiorni(p.data, r.giorni_dopo!), ora };
}

function stessaUscita(a: Uscita, b: Uscita) {
  return a?.data === b?.data && a?.ora === b?.ora;
}

export function campiDaFile(c: ContenutoFile): CampiPiano {
  const p: Pubblicazione = c.pubblicazione;
  return {
    account: c.account,
    titolo: c.titolo,
    rubrica_id: c.rubrica,
    formato: c.formato,
    pub_modo: p.modo,
    pub_data: p.modo === "data" ? p.data : null,
    partita_id: p.modo === "partita" ? p.partita_id : null,
    giorni_dopo: p.modo === "partita" ? p.giorni_dopo : null,
    pub_ora: p.ora,
    obiettivo: c.obiettivo,
    come_realizzarlo: c.come_realizzarlo,
    caption_bozza: c.caption_bozza,
    hashtag: c.hashtag,
  };
}

/** Ordine stabile per l'anteprima: per codice (c001, c002…), poi per titolo. */
function perCodice(contenuti: ContenutoDb[]) {
  return [...contenuti].sort(
    (a, b) => (a.codice ?? "~").localeCompare(b.codice ?? "~", "it", { numeric: true }) || a.titolo.localeCompare(b.titolo),
  );
}

// ---------- Calendario ----------

export type AnteprimaCalendario = {
  nuove: PartitaDb[];
  modificate: { id: string; descrizione: string; campi: CampoCambiato[] }[];
  rimosse: PartitaDb[];
  dateSpostate: DataSpostata[];
  contenutiSenzaPartita: { id: string; codice: string | null; titolo: string; partita_id: string }[];
  invariate: number;
  applica: {
    stagione: string;
    file: Calendario;
    riepilogo: Riepilogo;
    partite: Omit<PartitaDb, "rimossa">[];
  };
};

export type Riepilogo = Record<string, number>;

const CAMPI_PARTITA: [keyof PartitaDb, string][] = [
  ["data", "data"],
  ["ora", "ora"],
  ["giornata", "giornata"],
  ["casa", "casa"],
  ["ospite", "ospite"],
  ["palazzetto", "palazzetto"],
  ["indirizzo", "indirizzo"],
  ["note", "note"],
];

export function anteprimaCalendario(
  cal: Calendario,
  partiteDb: PartitaDb[],
  contenutiDb: ContenutoDb[],
): AnteprimaCalendario {
  const nuoveRighe = cal.partite.map((p) => ({
    id: p.id,
    stagione: cal.stagione,
    giornata: p.giornata,
    data: p.data,
    ora: p.ora,
    casa: p.casa,
    ospite: p.ospite,
    palazzetto: p.palazzetto,
    indirizzo: p.indirizzo,
    note: p.note ?? "",
  }));
  const vecchie = new Map(partiteDb.map((p) => [p.id, { ...p, ora: oraBreve(p.ora) }]));
  const ids = new Set(nuoveRighe.map((p) => p.id));

  const nuove: PartitaDb[] = [];
  const modificate: AnteprimaCalendario["modificate"] = [];
  let invariate = 0;
  for (const p of nuoveRighe) {
    const v = vecchie.get(p.id);
    if (!v || v.rimossa) {
      nuove.push({ ...p, rimossa: false });
      continue;
    }
    const campi = CAMPI_PARTITA.filter(([k]) => String(v[k]) !== String(p[k as keyof typeof p])).map(
      ([k, etichetta]) => ({ campo: etichetta, prima: String(v[k]), dopo: String(p[k as keyof typeof p]) }),
    );
    if (campi.length) modificate.push({ id: p.id, descrizione: `${p.casa} – ${p.ospite}`, campi });
    else invariate++;
  }
  const rimosse = partiteDb.filter((p) => p.stagione === cal.stagione && !p.rimossa && !ids.has(p.id));

  // Effetto sui contenuti non ancora pubblicati legati alle partite.
  const primaMap: DatePartite = new Map(partiteDb.map((p) => [p.id, p]));
  const dopoMap: DatePartite = new Map(primaMap);
  for (const r of rimosse) dopoMap.set(r.id, { data: r.data, rimossa: true });
  for (const p of nuoveRighe) dopoMap.set(p.id, { data: p.data });

  const dateSpostate: DataSpostata[] = [];
  const contenutiSenzaPartita: AnteprimaCalendario["contenutiSenzaPartita"] = [];
  for (const c of perCodice(contenutiDb)) {
    if (c.pub_modo !== "partita" || c.stato === "pubblicato") continue;
    const prima = uscitaDi(c, primaMap);
    const dopo = uscitaDi(c, dopoMap);
    if (!dopo) contenutiSenzaPartita.push({ id: c.id, codice: c.codice, titolo: c.titolo, partita_id: c.partita_id! });
    else if (!stessaUscita(prima, dopo))
      dateSpostate.push({ id: c.id, codice: c.codice, titolo: c.titolo, prima, dopo });
  }

  return {
    nuove,
    modificate,
    rimosse,
    dateSpostate,
    contenutiSenzaPartita,
    invariate,
    applica: {
      stagione: cal.stagione,
      file: cal,
      riepilogo: {
        nuove: nuove.length,
        modificate: modificate.length,
        rimosse: rimosse.length,
        date_spostate: dateSpostate.length,
      },
      partite: nuoveRighe,
    },
  };
}

// ---------- Piano editoriale ----------

export type VoceContenuto = { id?: string; codice: string; titolo: string; uscita: Uscita };

export type AnteprimaPiano = {
  nuovi: VoceContenuto[];
  modificati: (VoceContenuto & { campi: CampoCambiato[] })[];
  rimossi: (VoceContenuto & { stato: Stato })[];
  dateSpostate: DataSpostata[];
  /** Contenuti del file già pubblicati o già passati: restano come sono. */
  ignorati: VoceContenuto[];
  invariati: number;
  avvisi: Problema[];
  applica: {
    piano: { codice: string; nome: string; valido_dal: string; valido_al: string; file: Piano; riepilogo: Riepilogo };
    rubriche: Piano["rubriche"];
    elimina: string[];
    aggiorna: (CampiPiano & { id: string })[];
    inserisci: (CampiPiano & { codice: string })[];
  };
};

const ETICHETTE: Partial<Record<keyof CampiPiano, string>> = {
  account: "account",
  titolo: "titolo",
  rubrica_id: "rubrica",
  formato: "formato",
  obiettivo: "obiettivo",
  come_realizzarlo: "come realizzarlo",
  caption_bozza: "caption",
  hashtag: "hashtag",
};

function descriviUscita(c: CampiPiano) {
  return c.pub_modo === "data"
    ? `${c.pub_data} ${oraBreve(c.pub_ora)}`
    : `partita ${c.partita_id} ${c.giorni_dopo! >= 0 ? "+" : ""}${c.giorni_dopo} giorni, ${oraBreve(c.pub_ora)}`;
}

function confronta(prima: CampiPiano, dopo: CampiPiano): CampoCambiato[] {
  const campi: CampoCambiato[] = [];
  for (const [k, etichetta] of Object.entries(ETICHETTE) as [keyof CampiPiano, string][]) {
    const a = stabile(prima[k]);
    const b = stabile(dopo[k]);
    if (a !== b) campi.push({ campo: etichetta, prima: testoCampo(prima[k]), dopo: testoCampo(dopo[k]) });
  }
  const regolaPrima = descriviUscita(prima);
  const regolaDopo = descriviUscita(dopo);
  if (regolaPrima !== regolaDopo) campi.push({ campo: "pubblicazione", prima: regolaPrima, dopo: regolaDopo });
  return campi;
}

/** JSON con le chiavi in ordine: jsonb di Postgres non conserva l'ordine delle chiavi. */
function stabile(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stabile).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabile((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

function testoCampo(v: unknown) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(" ");
  return JSON.stringify(v);
}

/**
 * Un nuovo piano sostituisce solo i contenuti futuri non pubblicati dei piani precedenti.
 * Se il file ha lo stesso id del piano già caricato (una revisione), i contenuti con lo stesso
 * id (es. c005) sono riconosciuti come "modificati" e mantengono stato, caption finale e spunte.
 */
export function anteprimaPiano(
  piano: Piano,
  contenutiDb: ContenutoDb[],
  partite: PartitaDb[],
  adesso: Date,
): AnteprimaPiano {
  const datePartite: DatePartite = new Map(partite.map((p) => [p.id, p]));
  const futuro = (c: CampiPiano) => {
    const u = uscitaDi(c, datePartite);
    return !u || istanteRoma(u.data, u.ora) >= adesso;
  };
  const delPiano = perCodice(contenutiDb).filter((c) => c.piano_id !== null);
  const sostituibili = delPiano.filter((c) => c.stato !== "pubblicato" && futuro(c));
  const sostituibiliIds = new Set(sostituibili.map((c) => c.id));
  const stessoPiano = (c: ContenutoDb) => c.piano_codice === piano.id && c.codice !== null;
  const daSostituire = new Map(sostituibili.filter(stessoPiano).map((c) => [c.codice!, c]));
  const storici = new Map(
    delPiano.filter((c) => stessoPiano(c) && !sostituibiliIds.has(c.id)).map((c) => [c.codice!, c]),
  );

  const nuovi: AnteprimaPiano["nuovi"] = [];
  const modificati: AnteprimaPiano["modificati"] = [];
  const dateSpostate: DataSpostata[] = [];
  const ignorati: VoceContenuto[] = [];
  const avvisi: Problema[] = [];
  const aggiorna: AnteprimaPiano["applica"]["aggiorna"] = [];
  const inserisci: AnteprimaPiano["applica"]["inserisci"] = [];
  const usati = new Set<string>();
  let invariati = 0;

  for (const c of piano.contenuti) {
    const campi = campiDaFile(c);
    const uscita = uscitaDi(campi, datePartite);
    const storico = storici.get(c.id);
    if (storico) {
      ignorati.push({ id: storico.id, codice: c.id, titolo: c.titolo, uscita: uscitaDi(storico, datePartite) });
      continue;
    }
    const vecchio = daSostituire.get(c.id);
    if (!vecchio) {
      nuovi.push({ codice: c.id, titolo: c.titolo, uscita });
      inserisci.push({ ...campi, codice: c.id });
      if (uscita && istanteRoma(uscita.data, uscita.ora) < adesso)
        avvisi.push({
          dove: `Contenuto ${c.id}`,
          messaggio: `la data di uscita (${uscita.data} ${uscita.ora}) è già passata`,
        });
      continue;
    }
    usati.add(vecchio.id);
    aggiorna.push({ ...campi, id: vecchio.id });
    const cambiati = confronta(vecchio, campi);
    if (!cambiati.length) {
      invariati++;
      continue;
    }
    modificati.push({ id: vecchio.id, codice: c.id, titolo: c.titolo, uscita, campi: cambiati });
    const prima = uscitaDi(vecchio, datePartite);
    if (!stessaUscita(prima, uscita))
      dateSpostate.push({ id: vecchio.id, codice: c.id, titolo: c.titolo, prima, dopo: uscita });
    if (vecchio.modificato_a_mano)
      avvisi.push({
        dove: `Contenuto ${c.id}`,
        messaggio: "l'avevi modificato a mano: le tue modifiche ai campi del piano verranno sostituite",
      });
  }

  const rimossi: AnteprimaPiano["rimossi"] = sostituibili
    .filter((c) => !usati.has(c.id))
    .map((c) => ({ id: c.id, codice: c.codice ?? "", titolo: c.titolo, uscita: uscitaDi(c, datePartite), stato: c.stato }));
  for (const r of rimossi)
    if (r.stato !== "da_girare")
      avvisi.push({
        dove: `Contenuto ${r.codice || r.titolo}`,
        messaggio: `viene rimosso ma è già "${r.stato.replace("_", " ")}"`,
      });

  return {
    nuovi,
    modificati,
    rimossi,
    dateSpostate,
    ignorati,
    invariati,
    avvisi,
    applica: {
      piano: {
        codice: piano.id,
        nome: piano.nome,
        valido_dal: piano.valido_dal,
        valido_al: piano.valido_al,
        file: piano,
        riepilogo: {
          nuovi: nuovi.length,
          modificati: modificati.length,
          rimossi: rimossi.length,
          date_spostate: dateSpostate.length,
          invariati,
          ignorati: ignorati.length,
        },
      },
      rubriche: piano.rubriche,
      elimina: rimossi.map((r) => r.id!),
      aggiorna,
      inserisci,
    },
  };
}

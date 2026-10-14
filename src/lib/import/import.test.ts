import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  anteprimaCalendario,
  anteprimaPiano,
  campiDaFile,
  type ContenutoDb,
  type PartitaDb,
} from "./anteprima";
import type { Calendario, Piano } from "./formato";
import { leggiFile, validaCalendario, validaPiano } from "./validazione";

const calendario: Calendario = JSON.parse(readFileSync("dati-iniziali/calendario.json", "utf8"));
const piano: Piano = JSON.parse(readFileSync("dati-iniziali/piano-editoriale.json", "utf8"));
const idPartite = new Set(calendario.partite.map((p) => p.id));
const copia = <T>(x: T): T => structuredClone(x);
const ADESSO = new Date("2026-10-14T10:00:00Z");

function partiteDb(cal = calendario): PartitaDb[] {
  return cal.partite.map((p) => ({ ...p, note: p.note ?? "", stagione: cal.stagione, rimossa: false }));
}

/** Simula il database dopo aver importato un piano. */
function contenutiDb(p = piano, pianoId = "uuid-piano"): ContenutoDb[] {
  return p.contenuti.map((c) => ({
    ...campiDaFile(c),
    pub_ora: `${c.pubblicazione.ora}:00`,
    id: `uuid-${c.id}`,
    codice: c.id,
    piano_id: pianoId,
    piano_codice: p.id,
    stato: "da_girare",
    caption: null,
    modificato_a_mano: false,
  }));
}

describe("validazione", () => {
  it("accetta i file reali", () => {
    expect(validaCalendario(calendario).ok).toBe(true);
    const esito = validaPiano(piano, idPartite);
    expect(esito.ok).toBe(true);
    expect(esito.avvisi).toEqual([]);
  });

  it("riconosce il tipo di file e i JSON rotti", () => {
    expect(leggiFile(JSON.stringify(piano))).toMatchObject({ ok: true, tipo: "piano_editoriale" });
    expect(leggiFile(JSON.stringify(calendario))).toMatchObject({ ok: true, tipo: "calendario_partite" });
    expect(leggiFile("{ rotto")).toMatchObject({ ok: false, errore: { dove: "file" } });
    expect(leggiFile('{"tipo":"altro"}')).toMatchObject({ ok: false, errore: { dove: "tipo" } });
  });

  it("indica contenuto e campo sbagliato", () => {
    const p = copia(piano) as unknown as { contenuti: Record<string, unknown>[] };
    p.contenuti[13].formato = "video";
    (p.contenuti[2].pubblicazione as Record<string, unknown>).partita_id = "2026-27-g08";
    (p.contenuti[0].pubblicazione as Record<string, unknown>).ora = "25:00";
    delete p.contenuti[4].titolo;
    // Prima gli errori di struttura.
    const esito = validaPiano(p, idPartite);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori).toContainEqual({
      dove: "Contenuto c014 → formato",
      messaggio: "deve essere uno tra foto, carosello, reel, storia",
    });
    expect(esito.errori).toContainEqual({ dove: "Contenuto c001 → pubblicazione.ora", messaggio: "deve essere un'ora HH:MM (es. 18:00)" });
    expect(esito.errori).toContainEqual({ dove: "Contenuto c005 → titolo", messaggio: "manca" });
    // Anche i controlli sui contenuti leggibili, nello stesso giro.
    expect(esito.errori).toContainEqual({
      dove: "Contenuto c003 → pubblicazione.partita_id",
      messaggio: "la partita 2026-27-g08 non esiste nel calendario caricato",
    });
  });

  it("segnala partite inesistenti, rubriche sconosciute e id ripetuti", () => {
    const p = copia(piano);
    (p.contenuti[2].pubblicazione as { partita_id: string }).partita_id = "2026-27-g08";
    p.contenuti[3].rubrica = "interviste";
    p.contenuti[5].id = "c001";
    const esito = validaPiano(p, idPartite);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori).toEqual([
      { dove: "Contenuto c001 → id", messaggio: "id ripetuto: ogni contenuto deve avere un id diverso" },
      {
        dove: "Contenuto c003 → pubblicazione.partita_id",
        messaggio: "la partita 2026-27-g08 non esiste nel calendario caricato",
      },
      { dove: "Contenuto c004 → rubrica", messaggio: 'la rubrica "interviste" non è tra le rubriche del file' },
    ]);
  });

  it("valida il calendario", () => {
    const c = copia(calendario) as unknown as { partite: Record<string, unknown>[] };
    c.partite[2].data = "2026-02-30";
    c.partite[3].id = "2026-27-g01";
    const esito = validaCalendario(c);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(esito.errori).toContainEqual({ dove: "Partita 2026-27-g05 → data", messaggio: "non è una data esistente" });
    const dup = validaCalendario({ ...calendario, partite: [calendario.partite[0], calendario.partite[0]] });
    expect(dup.ok).toBe(false);
  });

  it("avvisa per troppi hashtag", () => {
    const p = copia(piano);
    p.contenuti[0].hashtag = Array.from({ length: 31 }, (_, i) => `#tag${i}`);
    const esito = validaPiano(p, idPartite);
    expect(esito.ok).toBe(true);
    expect(esito.avvisi[0]).toMatchObject({ dove: "Contenuto c001 → hashtag" });
  });
});

describe("anteprima calendario", () => {
  it("primo import: 13 partite nuove", () => {
    const a = anteprimaCalendario(calendario, [], []);
    expect(a.nuove).toHaveLength(13);
    expect(a.applica.partite).toHaveLength(13);
  });

  it("partita spostata: le date dei contenuti collegati si spostano", () => {
    const c = copia(calendario);
    c.partite.find((p) => p.id === "2026-27-g05")!.data = "2026-10-28";
    const a = anteprimaCalendario(c, partiteDb(), contenutiDb());
    expect(a.modificate).toEqual([
      {
        id: "2026-27-g05",
        descrizione: "Virtus Kleb Ragusa – Miwa Energia Benevento",
        campi: [{ campo: "data", prima: "2026-10-25", dopo: "2026-10-28" }],
      },
    ]);
    expect(a.dateSpostate.map((d) => [d.codice, d.prima?.data, d.dopo?.data])).toEqual([
      ["c003", "2026-10-24", "2026-10-27"],
      ["c004", "2026-10-25", "2026-10-28"],
      ["c005", "2026-10-26", "2026-10-29"],
      ["c006", "2026-10-28", "2026-10-31"],
    ]);
    expect(a.invariate).toBe(12);
  });

  it("partita sparita: i contenuti vengono segnalati, non cancellati", () => {
    const c = copia(calendario);
    c.partite = c.partite.filter((p) => p.id !== "2026-27-g07");
    const a = anteprimaCalendario(c, partiteDb(), contenutiDb());
    expect(a.rimosse.map((p) => p.id)).toEqual(["2026-27-g07"]);
    expect(a.contenutiSenzaPartita.map((x) => x.codice)).toEqual(["c009", "c010", "c011", "c012"]);
    expect(a.applica.partite).toHaveLength(12);
  });

  it("ignora i contenuti già pubblicati", () => {
    const c = copia(calendario);
    c.partite.find((p) => p.id === "2026-27-g05")!.ora = "20:30";
    const db = contenutiDb().map((x) => (x.codice === "c003" ? { ...x, stato: "pubblicato" as const } : x));
    c.partite.find((p) => p.id === "2026-27-g05")!.data = "2026-10-26";
    const a = anteprimaCalendario(c, partiteDb(), db);
    expect(a.dateSpostate.map((d) => d.codice)).toEqual(["c004", "c005", "c006"]);
    expect(a.modificate[0].campi.map((x) => x.campo)).toEqual(["data", "ora"]);
  });
});

describe("anteprima piano", () => {
  it("primo import: 32 contenuti nuovi", () => {
    const a = anteprimaPiano(piano, [], partiteDb(), ADESSO);
    expect(a.nuovi).toHaveLength(32);
    expect(a.applica.inserisci).toHaveLength(32);
    expect(a.nuovi.find((n) => n.codice === "c003")!.uscita).toEqual({ data: "2026-10-24", ora: "18:00" });
    expect(a.avvisi).toEqual([]);
  });

  it("stesso file ricaricato: nessuna modifica", () => {
    const a = anteprimaPiano(piano, contenutiDb(), partiteDb(), ADESSO);
    expect(a.invariati).toBe(32);
    expect([a.nuovi, a.modificati, a.rimossi, a.dateSpostate]).toEqual([[], [], [], []]);
    expect(a.applica.aggiorna).toHaveLength(32);
  });

  it("revisione del piano: nuovi, modificati, rimossi e date spostate", () => {
    const p = copia(piano);
    p.contenuti = p.contenuti.filter((c) => c.id !== "c002");
    p.contenuti.find((c) => c.id === "c005")!.caption_bozza = "Nuova caption";
    const c013 = p.contenuti.find((c) => c.id === "c013")!;
    c013.pubblicazione = { modo: "data", data: "2026-11-18", ora: "20:00" };
    p.contenuti.push({ ...copia(p.contenuti[0]), id: "c033", titolo: "Extra" });
    const db = contenutiDb().map((c) => (c.codice === "c005" ? { ...c, modificato_a_mano: true } : c));
    const a = anteprimaPiano(p, db, partiteDb(), ADESSO);
    expect(a.nuovi.map((x) => x.codice)).toEqual(["c033"]);
    expect(a.rimossi.map((x) => x.codice)).toEqual(["c002"]);
    expect(a.modificati.map((x) => [x.codice, x.campi.map((f) => f.campo)])).toEqual([
      ["c005", ["caption"]],
      ["c013", ["pubblicazione"]],
    ]);
    expect(a.dateSpostate).toEqual([
      {
        id: "uuid-c013",
        codice: "c013",
        titolo: "Slow motion: Il dettaglio",
        prima: { data: "2026-11-17", ora: "19:00" },
        dopo: { data: "2026-11-18", ora: "20:00" },
      },
    ]);
    expect(a.avvisi.map((x) => x.dove)).toEqual(["Contenuto c005"]);
    expect(a.applica.elimina).toEqual(["uuid-c002"]);
  });

  it("non tocca pubblicati e contenuti passati", () => {
    const adesso = new Date("2026-10-27T12:00:00Z"); // dopo c001..c005
    const db = contenutiDb().map((c) => (c.codice === "c006" ? { ...c, stato: "pubblicato" as const } : c));
    const p = copia(piano);
    p.contenuti.find((c) => c.id === "c001")!.titolo = "Cambiato";
    const a = anteprimaPiano(p, db, partiteDb(), adesso);
    expect(a.ignorati.map((x) => x.codice)).toEqual(["c001", "c002", "c003", "c004", "c005", "c006"]);
    expect(a.modificati).toEqual([]);
    expect(a.invariati).toBe(26);
    expect(a.applica.aggiorna.map((x) => x.id)).not.toContain("uuid-c001");
  });

  it("un piano diverso sostituisce i futuri non pubblicati del precedente", () => {
    const nuovo = copia(piano);
    nuovo.id = "piano-inverno-2027";
    nuovo.contenuti = nuovo.contenuti.slice(0, 2).map((c, i) => ({
      ...c,
      id: `c00${i + 1}`,
      pubblicazione: { modo: "data" as const, data: "2027-01-10", ora: "19:00" },
    }));
    const adesso = new Date("2026-12-20T12:00:00Z");
    const db = contenutiDb().map((c) =>
      c.codice === "c031" ? { ...c, stato: "pronto" as const } : c.codice === "c032" ? { ...c, stato: "pubblicato" as const } : c,
    );
    const a = anteprimaPiano(nuovo, db, partiteDb(), adesso);
    expect(a.nuovi.map((x) => x.codice)).toEqual(["c001", "c002"]);
    // Futuri al 20/12 alle 13: c028 (live 16:00) e successivi, tranne c032 pubblicato.
    expect(a.rimossi.map((x) => x.codice)).toEqual(["c028", "c029", "c030", "c031"]);
    expect(a.avvisi).toEqual([{ dove: "Contenuto c031", messaggio: 'viene rimosso ma è già "pronto"' }]);
  });

  it("i contenuti extra aggiunti a mano non vengono mai toccati", () => {
    const extra: ContenutoDb = { ...contenutiDb()[0], id: "uuid-extra", codice: null, piano_id: null, piano_codice: null };
    const a = anteprimaPiano(piano, [extra], partiteDb(), ADESSO);
    expect(a.rimossi).toEqual([]);
    expect(a.nuovi).toHaveLength(32);
  });
});

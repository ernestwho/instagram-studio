"use client";

import { AlertTriangle, CheckCircle2, FileUp, History, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import calendarioIniziale from "../../../../../dati-iniziali/calendario.json";
import pianoIniziale from "../../../../../dati-iniziali/piano-editoriale.json";
import { Scheda, stileBottone, stileBottoneSecondario, Titolo } from "@/components/ui";
import {
  applicaCalendario,
  applicaPiano,
  caricaContenutiPerImport,
  caricaPartite,
  caricaStorico,
  type VoceStorico,
} from "@/lib/dati";
import { dataBreve } from "@/lib/date";
import {
  anteprimaCalendario,
  anteprimaPiano,
  type AnteprimaCalendario,
  type AnteprimaPiano,
  type PartitaDb,
  type Uscita,
} from "@/lib/import/anteprima";
import { leggiFile, validaCalendario, validaPiano, type Problema } from "@/lib/import/validazione";

type Fase =
  | { tipo: "attesa" }
  | { tipo: "errori"; nomeFile: string; errori: Problema[]; avvisi: Problema[] }
  | { tipo: "calendario"; nomeFile: string; anteprima: AnteprimaCalendario }
  | { tipo: "piano"; nomeFile: string; anteprima: AnteprimaPiano; avvisi: Problema[] }
  | { tipo: "fatto"; messaggio: string };

export default function Importa() {
  const [fase, setFase] = useState<Fase>({ tipo: "attesa" });
  const [storico, setStorico] = useState<VoceStorico[] | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [erroreDb, setErroreDb] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const aggiornaStorico = useCallback(() => {
    caricaStorico().then(setStorico, (e) => setErroreDb(e.message));
  }, []);
  useEffect(aggiornaStorico, [aggiornaStorico]);

  async function esamina(nomeFile: string, json: unknown, tipo: "calendario_partite" | "piano_editoriale") {
    const [partite, contenuti] = await Promise.all([caricaPartite(), caricaContenutiPerImport()]);
    if (tipo === "calendario_partite") {
      const esito = validaCalendario(json);
      if (!esito.ok) return setFase({ tipo: "errori", nomeFile, errori: esito.errori, avvisi: esito.avvisi });
      setFase({ tipo: "calendario", nomeFile, anteprima: anteprimaCalendario(esito.dati, partite, contenuti) });
    } else {
      const ids = new Set(partite.filter((p) => !p.rimossa).map((p) => p.id));
      const esito = validaPiano(json, ids);
      if (!esito.ok) return setFase({ tipo: "errori", nomeFile, errori: esito.errori, avvisi: esito.avvisi });
      setFase({
        tipo: "piano",
        nomeFile,
        anteprima: anteprimaPiano(esito.dati, contenuti, partite, new Date()),
        avvisi: esito.avvisi,
      });
    }
  }

  async function scegliFile(file: File) {
    setErroreDb("");
    const letto = leggiFile(await file.text());
    if (!letto.ok) return setFase({ tipo: "errori", nomeFile: file.name, errori: [letto.errore], avvisi: [] });
    await esamina(file.name, letto.json, letto.tipo).catch((e) => setErroreDb(e.message));
  }

  async function applica() {
    setInCorso(true);
    setErroreDb("");
    try {
      if (fase.tipo === "calendario") {
        await applicaCalendario(fase.anteprima.applica);
        setFase({ tipo: "fatto", messaggio: "Calendario importato." });
      } else if (fase.tipo === "piano") {
        await applicaPiano(fase.anteprima.applica);
        setFase({ tipo: "fatto", messaggio: `Piano "${fase.anteprima.applica.piano.nome}" importato.` });
      }
      aggiornaStorico();
    } catch (e) {
      setErroreDb((e as Error).message);
    } finally {
      setInCorso(false);
    }
  }

  /** Primo avvio: carica calendario e piano forniti con l'app, nello stesso modo di un import a mano. */
  async function caricaDatiIniziali() {
    setInCorso(true);
    setErroreDb("");
    try {
      const cal = validaCalendario(calendarioIniziale);
      if (!cal.ok) throw new Error("Il calendario iniziale non è valido.");
      await applicaCalendario(anteprimaCalendario(cal.dati, [], []).applica);
      const partite = await caricaPartite();
      const piano = validaPiano(pianoIniziale, new Set(partite.map((p) => p.id)));
      if (!piano.ok) throw new Error("Il piano iniziale non è valido.");
      await applicaPiano(anteprimaPiano(piano.dati, [], partite, new Date()).applica);
      setFase({ tipo: "fatto", messaggio: "Dati iniziali caricati: 13 partite e 32 contenuti." });
      aggiornaStorico();
    } catch (e) {
      setErroreDb((e as Error).message);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <>
      <Titolo occhiello="04 — Impostazioni" sotto="Carica il calendario partite o un piano editoriale in formato JSON.">Importa</Titolo>

      {storico?.length === 0 && fase.tipo === "attesa" && (
        <Scheda className="mb-4 border-accento/40">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-accento" aria-hidden /> Primo avvio
          </h2>
          <p className="mt-1 mb-4 text-sm text-testo-2">
            Carica il calendario 2026/27 (13 partite al PalaPadua) e il piano editoriale autunno 2026 (32 contenuti).
          </p>
          <button className={stileBottone} onClick={caricaDatiIniziali} disabled={inCorso}>
            {inCorso ? "Caricamento…" : "Carica i dati iniziali"}
          </button>
        </Scheda>
      )}

      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Scegli un file JSON"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) scegliFile(f);
        }}
      />

      {(fase.tipo === "attesa" || fase.tipo === "fatto") && (
        <button className={`${stileBottoneSecondario} w-full py-6`} onClick={() => input.current?.click()}>
          <FileUp className="size-5" aria-hidden /> Scegli un file JSON
        </button>
      )}

      {fase.tipo === "fatto" && (
        <p className="mt-4 flex items-center gap-2 text-successo" role="status">
          <CheckCircle2 className="size-5" aria-hidden /> {fase.messaggio}{" "}
          <Link href="/piano" className="underline">
            Vai al piano
          </Link>
        </p>
      )}

      {erroreDb && (
        <p className="mt-4 text-errore" role="alert">
          Non sono riuscito a salvare: {erroreDb}
        </p>
      )}

      {fase.tipo === "errori" && (
        <Scheda>
          <h2 className="flex items-center gap-2 font-semibold text-errore">
            <XCircle className="size-5" aria-hidden /> {fase.nomeFile}: {fase.errori.length}{" "}
            {fase.errori.length === 1 ? "errore" : "errori"}
          </h2>
          <p className="mt-1 mb-3 text-sm text-testo-2">Correggi il file e caricalo di nuovo. Non è stato cambiato niente.</p>
          <ListaProblemi problemi={fase.errori} />
          {fase.avvisi.length > 0 && <ListaProblemi problemi={fase.avvisi} avviso />}
          <Azioni annulla={() => setFase({ tipo: "attesa" })} />
        </Scheda>
      )}

      {fase.tipo === "calendario" && (
        <VistaCalendario
          nomeFile={fase.nomeFile}
          a={fase.anteprima}
          azioni={<Azioni annulla={() => setFase({ tipo: "attesa" })} applica={applica} inCorso={inCorso} />}
        />
      )}

      {fase.tipo === "piano" && (
        <VistaPiano
          nomeFile={fase.nomeFile}
          a={fase.anteprima}
          avvisi={[...fase.avvisi, ...fase.anteprima.avvisi]}
          azioni={<Azioni annulla={() => setFase({ tipo: "attesa" })} applica={applica} inCorso={inCorso} />}
        />
      )}

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
          <History className="size-5" aria-hidden /> Storico import
        </h2>
        {storico === null ? (
          <p className="text-testo-3">Caricamento…</p>
        ) : storico.length === 0 ? (
          <p className="text-testo-3">Nessun import ancora.</p>
        ) : (
          <ul className="divide-y divide-bordo rounded-2xl border border-bordo bg-superficie">
            {storico.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {v.nome}{" "}
                    {v.attivo && (
                      <span className="ml-1 bg-accento/15 px-2 py-0.5 text-xs text-accento">attivo</span>
                    )}
                  </p>
                  <p className="text-sm text-testo-2">{testoRiepilogo(v.riepilogo)}</p>
                </div>
                <time className="shrink-0 text-sm text-testo-3" dateTime={v.importato_il}>
                  {new Date(v.importato_il).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function testoRiepilogo(r: Record<string, number>) {
  const parti = Object.entries(r)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k.replace("_", " ")}`);
  return parti.join(" · ") || "nessuna modifica";
}

function Azioni({ annulla, applica, inCorso }: { annulla: () => void; applica?: () => void; inCorso?: boolean }) {
  return (
    <div className="mt-6 flex gap-3">
      <button className={stileBottoneSecondario} onClick={annulla} disabled={inCorso}>
        Annulla
      </button>
      {applica && (
        <button className={`${stileBottone} flex-1`} onClick={applica} disabled={inCorso}>
          {inCorso ? "Applico…" : "Applica le modifiche"}
        </button>
      )}
    </div>
  );
}

function ListaProblemi({ problemi, avviso }: { problemi: Problema[]; avviso?: boolean }) {
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {problemi.map((p, i) => (
        <li
          key={i}
          className={`rounded-xl px-3 py-2 text-sm ${avviso ? "bg-avviso/10 text-testo" : "bg-errore/10 text-testo"}`}
        >
          <span className={`font-semibold ${avviso ? "text-avviso" : "text-errore"}`}>{p.dove}</span>: {p.messaggio}
        </li>
      ))}
    </ul>
  );
}

function testoUscita(u: Uscita) {
  return u ? `${dataBreve(u.data)}, ${u.ora}` : "senza data";
}

function Gruppo({ titolo, n, children }: { titolo: string; n: number; children: ReactNode }) {
  if (n === 0) return null;
  return (
    <details className="group border-t border-bordo py-3" open={n <= 8}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        {titolo}
        <span className="bg-superficie-2 px-2.5 py-0.5 text-sm">{n}</span>
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">{children}</ul>
    </details>
  );
}

function Riga({ codice, titolo, dettaglio }: { codice?: string | null; titolo: string; dettaglio?: ReactNode }) {
  return (
    <li className="rounded-lg bg-superficie-2/60 px-3 py-2">
      <p>
        {codice && <span className="mr-2 font-mono text-xs text-testo-3">{codice}</span>}
        {titolo}
      </p>
      {dettaglio && <div className="mt-0.5 text-testo-2">{dettaglio}</div>}
    </li>
  );
}

function descriviPartita(p: PartitaDb) {
  return `${p.casa} – ${p.ospite}`;
}

function VistaCalendario({ nomeFile, a, azioni }: { nomeFile: string; a: AnteprimaCalendario; azioni: ReactNode }) {
  const nessuna = !a.nuove.length && !a.modificate.length && !a.rimosse.length;
  return (
    <Scheda>
      <h2 className="font-semibold">Anteprima: {nomeFile}</h2>
      <p className="mb-3 text-sm text-testo-2">
        Calendario {a.applica.stagione}, {a.applica.partite.length} partite.{" "}
        {nessuna && "Nessuna differenza rispetto a quello caricato."}
      </p>
      {a.contenutiSenzaPartita.length > 0 && (
        <ListaProblemi
          avviso
          problemi={a.contenutiSenzaPartita.map((c) => ({
            dove: `${c.codice ?? ""} ${c.titolo}`.trim(),
            messaggio: `perde la partita ${c.partita_id}. Non verrà cancellato: lo trovi segnalato nel piano.`,
          }))}
        />
      )}
      <div className="mt-3">
        <Gruppo titolo="Partite nuove" n={a.nuove.length}>
          {a.nuove.map((p) => (
            <Riga key={p.id} codice={p.id} titolo={descriviPartita(p)} dettaglio={`${dataBreve(p.data)}, ${p.ora}`} />
          ))}
        </Gruppo>
        <Gruppo titolo="Partite modificate" n={a.modificate.length}>
          {a.modificate.map((p) => (
            <Riga
              key={p.id}
              codice={p.id}
              titolo={p.descrizione}
              dettaglio={p.campi.map((c) => (
                <p key={c.campo}>
                  {c.campo}: <s className="text-testo-3">{c.prima}</s> → {c.dopo}
                </p>
              ))}
            />
          ))}
        </Gruppo>
        <Gruppo titolo="Partite rimosse" n={a.rimosse.length}>
          {a.rimosse.map((p) => (
            <Riga key={p.id} codice={p.id} titolo={descriviPartita(p)} dettaglio={dataBreve(p.data)} />
          ))}
        </Gruppo>
        <Gruppo titolo="Contenuti con la data spostata" n={a.dateSpostate.length}>
          {a.dateSpostate.map((d) => (
            <Riga
              key={d.id}
              codice={d.codice}
              titolo={d.titolo}
              dettaglio={
                <>
                  <s className="text-testo-3">{testoUscita(d.prima)}</s> → {testoUscita(d.dopo)}
                </>
              }
            />
          ))}
        </Gruppo>
      </div>
      {azioni}
    </Scheda>
  );
}

function VistaPiano({
  nomeFile,
  a,
  avvisi,
  azioni,
}: {
  nomeFile: string;
  a: AnteprimaPiano;
  avvisi: Problema[];
  azioni: ReactNode;
}) {
  const p = a.applica.piano;
  return (
    <Scheda>
      <h2 className="font-semibold">Anteprima: {nomeFile}</h2>
      <p className="mb-3 text-sm text-testo-2">
        {p.nome}, dal {dataBreve(p.valido_dal)} al {dataBreve(p.valido_al)}.{" "}
        {a.invariati > 0 && `${a.invariati} contenuti invariati.`}
      </p>
      {avvisi.length > 0 && (
        <>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-avviso">
            <AlertTriangle className="size-4" aria-hidden /> Da controllare
          </p>
          <ListaProblemi problemi={avvisi} avviso />
        </>
      )}
      <div className="mt-3">
        <Gruppo titolo="Contenuti nuovi" n={a.nuovi.length}>
          {a.nuovi.map((c) => (
            <Riga key={c.codice} codice={c.codice} titolo={c.titolo} dettaglio={testoUscita(c.uscita)} />
          ))}
        </Gruppo>
        <Gruppo titolo="Contenuti modificati" n={a.modificati.length}>
          {a.modificati.map((c) => (
            <Riga
              key={c.codice}
              codice={c.codice}
              titolo={c.titolo}
              dettaglio={c.campi.map((f) => (
                <p key={f.campo} className="line-clamp-3">
                  {f.campo}: <s className="text-testo-3">{f.prima}</s> → {f.dopo}
                </p>
              ))}
            />
          ))}
        </Gruppo>
        <Gruppo titolo="Contenuti rimossi" n={a.rimossi.length}>
          {a.rimossi.map((c) => (
            <Riga key={c.id} codice={c.codice} titolo={c.titolo} dettaglio={testoUscita(c.uscita)} />
          ))}
        </Gruppo>
        <Gruppo titolo="Date spostate" n={a.dateSpostate.length}>
          {a.dateSpostate.map((d) => (
            <Riga
              key={d.id}
              codice={d.codice}
              titolo={d.titolo}
              dettaglio={
                <>
                  <s className="text-testo-3">{testoUscita(d.prima)}</s> → {testoUscita(d.dopo)}
                </>
              }
            />
          ))}
        </Gruppo>
        <Gruppo titolo="Già pubblicati o passati: restano come sono" n={a.ignorati.length}>
          {a.ignorati.map((c) => (
            <Riga key={c.codice} codice={c.codice} titolo={c.titolo} dettaglio={testoUscita(c.uscita)} />
          ))}
        </Gruppo>
      </div>
      {azioni}
    </Scheda>
  );
}

"use client";

import { AlertTriangle, FileUp, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { quando, RigaContenuto } from "@/components/contenuto";
import { Scheda, stileBottone, Titolo } from "@/components/ui";
import {
  ACCOUNT,
  caricaPartite,
  caricaTutti,
  oggi,
  settimanaDi,
  STATI,
  type Contenuto,
  type PartitaBreve,
  type Stato,
} from "@/lib/contenuti";
import { aggiungiGiorni, dataBreve, oraBreve } from "@/lib/date";

type Filtri = { account: string; stato: Stato | ""; rubrica: string; storico: boolean };

export default function Piano() {
  const [contenuti, setContenuti] = useState<Contenuto[] | null>(null);
  const [partite, setPartite] = useState<PartitaBreve[]>([]);
  const [errore, setErrore] = useState("");
  const [filtri, setFiltri] = useState<Filtri>({ account: "", stato: "", rubrica: "", storico: false });

  useEffect(() => {
    Promise.all([caricaTutti(), caricaPartite()]).then(([c, p]) => {
      setContenuti(c);
      setPartite(p);
    }, (e) => setErrore(e.message));
  }, []);

  const oggiStr = oggi();
  const visibili = useMemo(
    () =>
      (contenuti ?? []).filter(
        (c) =>
          (!filtri.account || c.account === filtri.account) &&
          (!filtri.stato || c.stato === filtri.stato) &&
          (!filtri.rubrica || c.rubrica_id === filtri.rubrica) &&
          (filtri.storico || (c.stato !== "pubblicato" && (!c.data_uscita || c.data_uscita >= oggiStr))),
      ),
    [contenuti, filtri, oggiStr],
  );

  if (errore) return <p className="text-errore">Non riesco a leggere il piano: {errore}</p>;
  if (!contenuti) return <Titolo occhiello="01 — Piano editoriale">Piano</Titolo>;

  if (contenuti.length === 0)
    return (
      <>
        <Titolo occhiello="01 — Piano editoriale">Piano</Titolo>
        <Scheda>
          <p className="mb-4 text-testo-2">Non c&apos;è ancora nessun contenuto. Carica calendario e piano editoriale.</p>
          <Link href="/impostazioni/importa" className={stileBottone}>
            <FileUp className="size-5" aria-hidden /> Vai a Importa
          </Link>
        </Scheda>
      </>
    );

  const rubriche = [...new Map(contenuti.flatMap((c) => (c.rubriche ? [[c.rubriche.id, c.rubriche]] : []))).values()];
  const prossima = partite.find((p) => p.data >= oggiStr);
  const daSistemare = visibili.filter((c) => !c.data_uscita);
  const gruppi = raggruppaPerSettimana(visibili.filter((c) => c.data_uscita), oggiStr);
  const daFare = contenuti.filter((c) => c.stato !== "pubblicato" && c.data_uscita && c.data_uscita >= oggiStr).length;

  return (
    <>
      <Titolo occhiello="01 — Piano editoriale" sotto={`${daFare} contenuti in arrivo`}>Piano</Titolo>

      {prossima && <ProssimaPartita partita={prossima} contenuti={contenuti} oggi={oggiStr} />}

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Selettore
          etichetta="Account"
          valore={filtri.account}
          opzioni={ACCOUNT.map((a) => [a, a])}
          onChange={(account) => setFiltri({ ...filtri, account })}
        />
        <Selettore
          etichetta="Stato"
          valore={filtri.stato}
          opzioni={STATI.map((s) => [s.valore, s.etichetta])}
          onChange={(stato) => setFiltri({ ...filtri, stato: stato as Stato | "" })}
        />
        <Selettore
          etichetta="Rubrica"
          valore={filtri.rubrica}
          opzioni={rubriche.map((r) => [r.id, r.nome])}
          onChange={(rubrica) => setFiltri({ ...filtri, rubrica })}
        />
        <button
          aria-pressed={filtri.storico}
          onClick={() => setFiltri({ ...filtri, storico: !filtri.storico })}
          className={`shrink-0 border px-3 py-1.5 text-sm ${
            filtri.storico ? "border-accento text-accento" : "border-bordo text-testo-2"
          }`}
        >
          Anche passati
        </button>
      </div>

      {daSistemare.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 border-b-2 border-avviso pb-2 font-display text-xl font-extrabold tracking-tight text-avviso">
            <AlertTriangle className="size-4" aria-hidden /> Da sistemare
          </h2>
          <ul className="flex flex-col">
            {daSistemare.map((c) => (
              <RigaContenuto key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}

      {gruppi.length === 0 && daSistemare.length === 0 && (
        <p className="py-8 text-center text-testo-3">Nessun contenuto con questi filtri.</p>
      )}

      {gruppi.map(([titolo, voci]) => (
        <section key={titolo} className="mb-6">
          <h2 className="mb-3 border-b-2 border-testo pb-2 font-display text-xl font-extrabold tracking-tight">{titolo}</h2>
          <ul className="flex flex-col">
            {voci.map((c) => (
              <RigaContenuto key={c.id} c={c} />
            ))}
          </ul>
        </section>
      ))}

      <Link
        href="/piano/nuovo"
        aria-label="Nuovo contenuto extra"
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center bg-accento text-accento-testo shadow-lg shadow-black/20 md:bottom-8"
      >
        <Plus className="size-7" aria-hidden />
      </Link>
    </>
  );
}

function raggruppaPerSettimana(contenuti: Contenuto[], oggiStr: string): [string, Contenuto[]][] {
  const questa = settimanaDi(oggiStr);
  const prossima = aggiungiGiorni(questa, 7);
  const gruppi = new Map<string, Contenuto[]>();
  for (const c of contenuti) {
    const lunedi = settimanaDi(c.data_uscita!);
    const titolo =
      lunedi === questa
        ? "Questa settimana"
        : lunedi === prossima
          ? "Settimana prossima"
          : `Settimana dal ${dataBreve(lunedi)}`;
    gruppi.set(titolo, [...(gruppi.get(titolo) ?? []), c]);
  }
  return [...gruppi];
}

function Selettore({
  etichetta,
  valore,
  opzioni,
  onChange,
}: {
  etichetta: string;
  valore: string;
  opzioni: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label={etichetta}
      value={valore}
      onChange={(e) => onChange(e.target.value)}
      className={`shrink-0 appearance-none border bg-superficie px-3 py-1.5 text-sm ${
        valore ? "border-accento text-accento" : "border-bordo text-testo-2"
      }`}
    >
      <option value="">{etichetta}: tutti</option>
      {opzioni.map(([v, e]) => (
        <option key={v} value={v}>
          {e}
        </option>
      ))}
    </select>
  );
}

function ProssimaPartita({ partita, contenuti, oggi }: { partita: PartitaBreve; contenuti: Contenuto[]; oggi: string }) {
  const collegati = contenuti.filter((c) => c.partita_id === partita.id);
  const fatti = collegati.filter((c) => c.stato !== "da_girare").length;
  return (
    <Scheda className="mb-5 overflow-hidden border-accento p-0">
      <div className="bg-accento px-4 py-4 text-accento-testo">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          {partita.data === oggi ? "Partita di oggi" : "Prossima partita"} · giornata {partita.giornata}
        </p>
        <p className="mt-0.5 font-display text-2xl font-extrabold leading-tight tracking-tight">
          {partita.casa} – {partita.ospite}
        </p>
        <p className="flex items-center gap-1 text-sm opacity-90">
          {dataBreve(partita.data)}, {oraBreve(partita.ora)} · <MapPin className="size-3.5" aria-hidden />
          {partita.palazzetto}
        </p>
      </div>
      {collegati.length > 0 && (
        <ul className="divide-y divide-bordo">
          {collegati.map((c) => (
            <li key={c.id}>
              <Link href={`/piano/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-superficie-2">
                <span className="size-2.5 rounded-full" style={{ background: c.rubriche?.colore }} aria-hidden />
                <span className="flex-1 truncate">{c.rubriche?.nome ?? c.titolo}</span>
                <span className="text-testo-3">{quando(c)}</span>
              </Link>
            </li>
          ))}
          <li className="px-4 py-2 text-xs text-testo-3">
            {fatti} di {collegati.length} già girati o in lavorazione
          </li>
        </ul>
      )}
    </Scheda>
  );
}

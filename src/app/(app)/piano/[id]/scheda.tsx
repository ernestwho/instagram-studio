"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Pencil,
  PenLine,
  Radio,
  Sun,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { IconaFormato, quando } from "@/components/contenuto";
import { Scheda } from "@/components/ui";
import {
  aggiorna,
  caricaContenuto,
  elimina,
  ETICHETTE_FORMATO,
  STATI,
  type Contenuto,
  type Modifica,
} from "@/lib/contenuti";
import { dataBreve, oraBreve } from "@/lib/date";
import { captionCompleta } from "@/lib/import/validazione";

export function SchedaContenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [c, setC] = useState<Contenuto | null | undefined>(undefined);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaContenuto(id).then(setC, (e) => setErrore(e.message));
  }, [id]);

  // Salva subito e aggiorna la scheda; se il salvataggio fallisce torna indietro.
  async function salva(modifica: Modifica) {
    if (!c) return;
    const prima = c;
    setC({ ...c, ...modifica });
    setErrore("");
    try {
      await aggiorna(c.id, modifica);
    } catch (e) {
      setC(prima);
      setErrore(`Non salvato: ${(e as Error).message}`);
    }
  }

  if (c === undefined) return errore ? <p className="text-errore">{errore}</p> : null;
  if (c === null)
    return (
      <p className="text-testo-2">
        Contenuto non trovato. <Link href="/piano" className="underline">Torna al piano</Link>
      </p>
    );

  const cr = c.come_realizzarlo;
  const live = c.rubrica_id === "live";
  const spunte = new Set(c.spunte);

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-testo-2">
          <ArrowLeft className="size-5" aria-hidden /> Piano
        </button>
        <SchermoAcceso />
      </div>

      <header>
        <p className="flex flex-wrap items-center gap-2 text-sm text-testo-2">
          {c.rubriche && (
            <span className="flex items-center gap-1.5 font-medium" style={{ color: c.rubriche.colore }}>
              <span className="size-2.5 rounded-full" style={{ background: c.rubriche.colore }} aria-hidden />
              {c.rubriche.nome}
            </span>
          )}
          <span className="flex items-center gap-1">
            <IconaFormato formato={c.formato} className="size-3.5" /> {ETICHETTE_FORMATO[c.formato]}
          </span>
          <span>{c.account}</span>
          {c.codice && <span className="font-mono text-xs text-testo-3">{c.codice}</span>}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase leading-tight tracking-wide">{c.titolo}</h1>
        <p className="mt-1 text-lg font-medium">{quando(c)}</p>
        {c.partite && (
          <p className="flex flex-wrap items-center gap-1 text-sm text-testo-2">
            Partita: {c.partite.casa} – {c.partite.ospite}, {dataBreve(c.partite.data)} ore {oraBreve(c.partite.ora)}
            <MapPin className="ml-1 size-3.5" aria-hidden /> {c.partite.palazzetto}
          </p>
        )}
        {c.partita_mancante && (
          <p className="mt-2 rounded-xl bg-avviso/10 px-3 py-2 text-sm text-avviso">
            La partita {c.partita_id} non è più nel calendario: scegli una nuova data da Modifica.
          </p>
        )}
        {live && (
          <p className="mt-2 flex items-center gap-2 rounded-xl bg-accento/10 px-3 py-2 text-sm">
            <Radio className="size-4 text-accento" aria-hidden /> Si pubblica in diretta dal telefono durante la serata.
          </p>
        )}
      </header>

      {errore && (
        <p role="alert" className="text-sm text-errore">
          {errore}
        </p>
      )}

      <div role="radiogroup" aria-label="Stato" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STATI.map((s) => (
          <button
            key={s.valore}
            role="radio"
            aria-checked={c.stato === s.valore}
            onClick={() => salva({ stato: s.valore })}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
              c.stato === s.valore ? "border-accento bg-accento text-accento-testo" : "border-bordo text-testo-2"
            }`}
          >
            {s.etichetta}
          </button>
        ))}
      </div>

      {c.stato === "pubblicato" && <LinkPost valore={c.link_post} onSalva={(link_post) => salva({ link_post })} />}

      {c.obiettivo && (
        <Sezione titolo="Obiettivo">
          <p className="text-lg leading-snug">{c.obiettivo}</p>
        </Sezione>
      )}

      {!!cr.cosa_girare?.length && (
        <Sezione titolo="Cosa girare">
          <ul className="flex flex-col gap-1">
            {cr.cosa_girare.map((voce, i) => {
              const fatto = spunte.has(i);
              return (
                <li key={i}>
                  <button
                    role="checkbox"
                    aria-checked={fatto}
                    onClick={() =>
                      salva({ spunte: fatto ? c.spunte.filter((x) => x !== i) : [...c.spunte, i].sort((a, b) => a - b) })
                    }
                    className="flex w-full items-start gap-3 rounded-xl px-1 py-2 text-left text-lg leading-snug"
                  >
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        fatto ? "border-successo bg-successo text-white" : "border-testo-3"
                      }`}
                    >
                      {fatto && <Check className="size-4" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className={fatto ? "text-testo-3 line-through" : ""}>{voce}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sezione>
      )}

      {!!cr.inquadrature?.length && (
        <Sezione titolo="Inquadrature">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-lg leading-snug marker:text-accento">
            {cr.inquadrature.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </Sezione>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cr.durata && <Dato titolo="Durata" valore={cr.durata} />}
        {cr.formato_video && <Dato titolo="Formato" valore={cr.formato_video} />}
      </div>
      {cr.gancio && (
        <Sezione titolo="Gancio">
          <p className="text-lg leading-snug">{cr.gancio}</p>
        </Sezione>
      )}
      {cr.audio && (
        <Sezione titolo="Audio">
          <p className="text-lg leading-snug">{cr.audio}</p>
        </Sezione>
      )}
      {cr.montaggio && (
        <Sezione titolo="Montaggio">
          <p className="text-lg leading-snug">{cr.montaggio}</p>
        </Sezione>
      )}

      <Caption c={c} />

      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href={`/piano/${c.id}/modifica`}
          className="flex items-center gap-2 rounded-xl border border-bordo px-4 py-2.5 font-medium hover:bg-superficie-2"
        >
          <Pencil className="size-4" aria-hidden /> Modifica
        </Link>
        {c.stato !== "pubblicato" && (
          <button
            onClick={async () => {
              if (!confirm(`Eliminare "${c.titolo}"?`)) return;
              try {
                await elimina(c.id);
                router.replace("/piano");
              } catch (e) {
                setErrore((e as Error).message);
              }
            }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-errore hover:bg-errore/10"
          >
            <Trash2 className="size-4" aria-hidden /> Elimina
          </button>
        )}
      </div>
    </article>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <Scheda>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-testo-3">{titolo}</h2>
      {children}
    </Scheda>
  );
}

function Dato({ titolo, valore }: { titolo: string; valore: string }) {
  return (
    <Scheda>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-testo-3">{titolo}</h2>
      <p className="mt-1 text-lg font-semibold">{valore}</p>
    </Scheda>
  );
}

function Caption({ c }: { c: Contenuto }) {
  const [copiato, setCopiato] = useState(false);
  const testo = captionCompleta(c.caption ?? c.caption_bozza, c.hashtag);
  if (!testo.trim()) return null;
  return (
    <Sezione titolo={c.caption ? "Caption" : "Caption (bozza)"}>
      <p className="whitespace-pre-wrap leading-snug">{testo}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(testo);
            setCopiato(true);
            setTimeout(() => setCopiato(false), 2000);
          }}
          className="flex items-center gap-2 rounded-xl bg-accento px-4 py-2.5 font-semibold text-accento-testo"
        >
          {copiato ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiato ? "Copiata" : "Copia caption"}
        </button>
        <Link
          href={`/crea?contenuto=${c.id}`}
          className="flex items-center gap-2 rounded-xl border border-bordo px-4 py-2.5 font-medium hover:bg-superficie-2"
        >
          <PenLine className="size-4" aria-hidden /> Lavorala in Crea
        </Link>
      </div>
    </Sezione>
  );
}

function LinkPost({ valore, onSalva }: { valore: string | null; onSalva: (v: string | null) => void }) {
  const [testo, setTesto] = useState(valore ?? "");
  return (
    <Scheda className="flex flex-col gap-2">
      <label htmlFor="link-post" className="text-xs font-semibold uppercase tracking-wider text-testo-3">
        Link del post pubblicato
      </label>
      <div className="flex gap-2">
        <input
          id="link-post"
          type="url"
          inputMode="url"
          placeholder="https://www.instagram.com/p/…"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onBlur={() => testo.trim() !== (valore ?? "") && onSalva(testo.trim() || null)}
          className="min-w-0 flex-1 rounded-xl border border-bordo bg-sfondo px-3 py-2.5 outline-none focus:border-accento"
        />
        {valore && (
          <a
            href={valore}
            target="_blank"
            rel="noreferrer"
            aria-label="Apri il post"
            className="flex items-center rounded-xl border border-bordo px-3"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
    </Scheda>
  );
}

/** Tiene lo schermo acceso mentre si legge la scheda sul set (Wake Lock API). */
function SchermoAcceso() {
  const [attivo, setAttivo] = useState(false);
  const blocco = useRef<WakeLockSentinel | null>(null);
  const supportato = useSyncExternalStore(
    nessunaIscrizione,
    () => "wakeLock" in navigator,
    () => false,
  );

  useEffect(() => {
    if (!attivo) return;
    let annullato = false;
    const richiedi = () =>
      navigator.wakeLock.request("screen").then(
        (b) => {
          if (annullato) b.release();
          else blocco.current = b;
        },
        () => setAttivo(false),
      );
    richiedi();
    // Il blocco cade quando l'app va in secondo piano: lo richiede di nuovo al ritorno.
    const alRitorno = () => document.visibilityState === "visible" && richiedi();
    document.addEventListener("visibilitychange", alRitorno);
    return () => {
      annullato = true;
      document.removeEventListener("visibilitychange", alRitorno);
      blocco.current?.release();
      blocco.current = null;
    };
  }, [attivo]);

  if (!supportato) return null;
  return (
    <button
      aria-pressed={attivo}
      onClick={() => setAttivo(!attivo)}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
        attivo ? "border-accento text-accento" : "border-bordo text-testo-2"
      }`}
    >
      <Sun className="size-4" aria-hidden /> {attivo ? "Schermo acceso" : "Tieni acceso"}
    </button>
  );
}

const nessunaIscrizione = () => () => {};

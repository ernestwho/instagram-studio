"use client";

import { AlertTriangle, FileUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Scheda, stileBottone, Titolo } from "@/components/ui";
import { caricaContenuti, type ContenutoLista } from "@/lib/dati";
import { dataBreve, oggiRoma, oraBreve } from "@/lib/date";

const STATI: Record<string, string> = {
  da_girare: "Da girare",
  in_montaggio: "In montaggio",
  pronto: "Pronto",
  programmato: "Programmato",
  pubblicato: "Pubblicato",
};

// Lista essenziale per verificare i dati importati: filtri, scheda e modifica arrivano al passo 3.
export default function Piano() {
  const [contenuti, setContenuti] = useState<ContenutoLista[] | null>(null);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaContenuti().then(setContenuti, (e) => setErrore(e.message));
  }, []);

  if (errore) return <p className="text-errore">Non riesco a leggere il piano: {errore}</p>;
  if (!contenuti) return <Titolo>Piano</Titolo>;

  if (contenuti.length === 0)
    return (
      <>
        <Titolo>Piano</Titolo>
        <Scheda>
          <p className="mb-4 text-testo-2">Non c&apos;è ancora nessun contenuto. Carica calendario e piano editoriale.</p>
          <Link href="/impostazioni/importa" className={stileBottone}>
            <FileUp className="size-5" aria-hidden /> Vai a Importa
          </Link>
        </Scheda>
      </>
    );

  const oggi = oggiRoma();
  const prossimi = contenuti.filter((c) => !c.data_uscita || c.data_uscita >= oggi);
  return (
    <>
      <Titolo sotto={`${prossimi.length} contenuti in arrivo`}>Piano</Titolo>
      <ul className="flex flex-col gap-2">
        {prossimi.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-bordo bg-superficie px-4 py-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: c.rubriche?.colore ?? "var(--testo-3)" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.titolo}</p>
              <p className="text-sm text-testo-2">
                {c.data_uscita ? `${dataBreve(c.data_uscita)}, ${oraBreve(c.pub_ora)}` : "Senza data"} · {c.formato} ·{" "}
                {c.rubriche?.nome}
                {c.account !== "@ernestwhoo" && ` · ${c.account}`}
              </p>
              {c.partita_mancante && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-avviso">
                  <AlertTriangle className="size-4" aria-hidden /> La partita non è più nel calendario
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-superficie-2 px-2.5 py-1 text-xs">{STATI[c.stato]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

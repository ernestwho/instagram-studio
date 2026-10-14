"use client";

import { Check, Copy, Hash, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { quando } from "@/components/contenuto";
import { Scheda, stileBottone, Titolo } from "@/components/ui";
import { aggiorna, caricaTutti, oggi, type Contenuto } from "@/lib/contenuti";
import {
  caricaGruppi,
  caricaModelli,
  compilaModello,
  conteggi,
  eliminaGruppo,
  eliminaModello,
  leggiHashtag,
  LIMITE_CARATTERI,
  LIMITE_HASHTAG,
  PRIMA_RIGA,
  salvaGruppo,
  salvaModello,
  SEGNAPOSTO,
  unisciHashtag,
  type GruppoHashtag,
  type Modello,
} from "@/lib/crea";
import { captionCompleta } from "@/lib/import/validazione";

const CHIAVE_LIBERA = "crea-bozza-libera";
type Salvataggio = "salvato" | "in_attesa" | "salvo" | "errore";

function leggiLibera(): { caption: string; hashtag: string[] } {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_LIBERA) ?? "null");
    if (v && typeof v.caption === "string" && Array.isArray(v.hashtag)) return v;
  } catch {}
  return { caption: "", hashtag: [] };
}

export function Laboratorio() {
  const router = useRouter();
  const scelto = useSearchParams().get("contenuto") ?? "";
  const [contenuti, setContenuti] = useState<Contenuto[] | null>(null);
  const [modelli, setModelli] = useState<Modello[]>([]);
  const [gruppi, setGruppi] = useState<GruppoHashtag[]>([]);
  const [errore, setErrore] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtag, setHashtag] = useState<string[]>([]);
  const [salvataggio, setSalvataggio] = useState<Salvataggio>("salvato");
  const [caricato, setCaricato] = useState<string | null>(null);
  const attesa = useRef<{ timer: ReturnType<typeof setTimeout>; salva: () => Promise<void> } | null>(null);

  useEffect(() => {
    Promise.all([caricaTutti(), caricaModelli(), caricaGruppi()]).then(([c, m, g]) => {
      setContenuti(c);
      setModelli(m);
      setGruppi(g);
    }, (e) => setErrore(e.message));
  }, []);

  const contenuto = contenuti?.find((c) => c.id === scelto) ?? null;

  /** Salva subito l'eventuale modifica in sospeso (prima di cambiare contenuto o uscire). */
  const svuota = useCallback(async () => {
    const a = attesa.current;
    if (!a) return;
    clearTimeout(a.timer);
    attesa.current = null;
    await a.salva();
  }, []);

  // Carica nell'editor il contenuto scelto (o la bozza libera) quando cambia la scelta.
  useEffect(() => {
    if (!contenuti || caricato === scelto) return;
    const c = contenuti.find((x) => x.id === scelto);
    const dati = c ? { caption: c.caption ?? c.caption_bozza, hashtag: c.hashtag } : leggiLibera();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronizza l'editor con il contenuto scelto
    setCaption(dati.caption);
    setHashtag(dati.hashtag);
    setSalvataggio("salvato");
    setCaricato(scelto);
  }, [contenuti, scelto, caricato]);

  useEffect(() => () => void svuota(), [svuota]);

  function cambia(nuovaCaption: string, nuoviHashtag: string[]) {
    setCaption(nuovaCaption);
    setHashtag(nuoviHashtag);
    if (attesa.current) clearTimeout(attesa.current.timer);
    const id = scelto;
    const salva = async () => {
      if (!id) {
        try {
          localStorage.setItem(CHIAVE_LIBERA, JSON.stringify({ caption: nuovaCaption, hashtag: nuoviHashtag }));
        } catch {}
        setSalvataggio("salvato");
        return;
      }
      setSalvataggio("salvo");
      try {
        await aggiorna(id, { caption: nuovaCaption, hashtag: nuoviHashtag });
        setContenuti((tutti) =>
          tutti?.map((x) => (x.id === id ? { ...x, caption: nuovaCaption, hashtag: nuoviHashtag } : x)) ?? null,
        );
        setSalvataggio((s) => (s === "salvo" ? "salvato" : s));
      } catch {
        setSalvataggio("errore");
      }
    };
    setSalvataggio("in_attesa");
    attesa.current = {
      salva,
      timer: setTimeout(() => {
        attesa.current = null;
        void salva();
      }, 800),
    };
  }

  async function scegli(id: string) {
    await svuota();
    router.replace(id ? `/crea?contenuto=${id}` : "/crea", { scroll: false });
  }

  if (errore) return <p className="text-errore">Non riesco a leggere i dati: {errore}</p>;
  if (!contenuti) return <Titolo>Crea</Titolo>;

  const oggiStr = oggi();
  const sceglibili = contenuti.filter(
    (c) => c.id === scelto || (c.stato !== "pubblicato" && (!c.data_uscita || c.data_uscita >= oggiStr)),
  );
  const n = conteggi(caption, hashtag);
  const bozzaPiano = contenuto?.caption_bozza ?? "";

  return (
    <>
      <Titolo sotto="Scrivi la caption, poi copiala e incollala su Instagram.">Crea</Titolo>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Scheda className="flex flex-col gap-2">
            <label htmlFor="scelta" className="text-xs font-semibold uppercase tracking-wider text-testo-3">
              Per quale contenuto
            </label>
            <select
              id="scelta"
              value={scelto}
              onChange={(e) => void scegli(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-bordo bg-sfondo px-3 py-2.5"
            >
              <option value="">Testo libero (non collegato)</option>
              {sceglibili.map((c) => (
                <option key={c.id} value={c.id}>
                  {quando(c)} · {c.titolo}
                </option>
              ))}
            </select>
            {contenuto && (
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-testo-2">
                <span className="size-2.5 rounded-full" style={{ background: contenuto.rubriche?.colore }} aria-hidden />
                {contenuto.rubriche?.nome} · {contenuto.account}
                <Link href={`/piano/${contenuto.id}`} className="text-accento underline-offset-2 hover:underline">
                  Apri scheda
                </Link>
              </p>
            )}
          </Scheda>

          <Scheda className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="caption" className="text-xs font-semibold uppercase tracking-wider text-testo-3">
                Caption
              </label>
              <StatoSalvataggio stato={salvataggio} libero={!scelto} />
            </div>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => cambia(e.target.value, hashtag)}
              rows={10}
              placeholder="Scrivi qui la caption…"
              className="field-sizing-content min-h-48 w-full resize-y rounded-xl border border-bordo bg-sfondo px-3 py-2.5 leading-snug outline-none focus:border-accento"
            />
            <Contatori caratteri={n.caratteri} hashtag={n.hashtag} primaRigaLunga={n.primaRigaLunga} />
            {contenuto && bozzaPiano && caption !== bozzaPiano && (
              <button
                onClick={() => cambia(bozzaPiano, hashtag)}
                className="flex items-center gap-1.5 self-start text-sm text-testo-2 hover:text-testo"
              >
                <RotateCcw className="size-4" aria-hidden /> Rimetti la bozza del piano
              </button>
            )}
          </Scheda>

          <Scheda className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-testo-3">Hashtag</h2>
            <EditorHashtag valore={hashtag} onChange={(h) => cambia(caption, h)} />
          </Scheda>

          <Anteprima account={contenuto?.account ?? "@ernestwhoo"} testo={captionCompleta(caption, hashtag)} />

          <BottoneCopia testo={captionCompleta(caption, hashtag)} />
        </div>

        <div className="flex flex-col gap-4">
          <Modelli
            modelli={modelli.filter((m) => !m.account || !contenuto || m.account === contenuto.account)}
            caption={caption}
            onUsa={(m) => {
              const testo = compilaModello(m.testo, contenuto?.partite ?? null);
              cambia(caption.trim() ? `${caption.trimEnd()}\n\n${testo}` : testo, hashtag);
            }}
            onSalva={async (nome) => {
              const m = await salvaModello({ nome, testo: caption, account: null });
              setModelli((tutti) => [...tutti, m].sort((a, b) => a.nome.localeCompare(b.nome)));
            }}
            onElimina={async (id) => {
              await eliminaModello(id);
              setModelli((tutti) => tutti.filter((m) => m.id !== id));
            }}
          />
          <Gruppi
            gruppi={gruppi}
            hashtag={hashtag}
            onUsa={(g) => cambia(caption, unisciHashtag(hashtag, g.hashtag))}
            onSalva={async (nome) => {
              const g = await salvaGruppo({ nome, hashtag });
              setGruppi((tutti) => [...tutti, g].sort((a, b) => a.nome.localeCompare(b.nome)));
            }}
            onElimina={async (id) => {
              await eliminaGruppo(id);
              setGruppi((tutti) => tutti.filter((g) => g.id !== id));
            }}
          />
        </div>
      </div>
    </>
  );
}

function StatoSalvataggio({ stato, libero }: { stato: Salvataggio; libero: boolean }) {
  const testo = {
    salvato: libero ? "Salvata su questo dispositivo" : "Salvata",
    in_attesa: "Modifiche in corso…",
    salvo: "Salvo…",
    errore: "Non salvata: controlla la connessione",
  }[stato];
  return (
    <span role="status" className={`text-xs ${stato === "errore" ? "text-errore" : "text-testo-3"}`}>
      {testo}
    </span>
  );
}

function Contatori({ caratteri, hashtag, primaRigaLunga }: { caratteri: number; hashtag: number; primaRigaLunga: boolean }) {
  const troppi = caratteri > LIMITE_CARATTERI;
  const troppiHashtag = hashtag > LIMITE_HASHTAG;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
        <div
          className={`h-full rounded-full ${troppi ? "bg-errore" : caratteri > LIMITE_CARATTERI * 0.9 ? "bg-avviso" : "bg-accento"}`}
          style={{ width: `${Math.min(100, (caratteri / LIMITE_CARATTERI) * 100)}%` }}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-testo-2">
        <span className={troppi ? "font-semibold text-errore" : ""}>
          {caratteri.toLocaleString("it-IT")} / {LIMITE_CARATTERI.toLocaleString("it-IT")} caratteri
        </span>
        <span className={troppiHashtag ? "font-semibold text-errore" : ""}>
          {hashtag} / {LIMITE_HASHTAG} hashtag
        </span>
      </div>
      {primaRigaLunga && (
        <p className="text-avviso">
          La prima riga supera i {PRIMA_RIGA} caratteri: nel feed verrà tagliata con &quot;altro&quot;.
        </p>
      )}
    </div>
  );
}

function EditorHashtag({ valore, onChange }: { valore: string[]; onChange: (h: string[]) => void }) {
  const [testo, setTesto] = useState("");
  function aggiungi() {
    const nuovi = leggiHashtag(testo);
    if (nuovi.length) onChange(unisciHashtag(valore, nuovi));
    setTesto("");
  }
  return (
    <>
      {valore.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {valore.map((h) => (
            <li key={h} className="flex items-center gap-1 rounded-full bg-superficie-2 py-1 pr-1 pl-3 text-sm">
              {h}
              <button
                onClick={() => onChange(valore.filter((x) => x !== h))}
                aria-label={`Togli ${h}`}
                className="rounded-full p-1 text-testo-3 hover:bg-bordo hover:text-testo"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-testo-3">Nessun hashtag. Scrivili qui sotto o aggiungi un gruppo.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          aggiungi();
        }}
        className="flex gap-2"
      >
        <input
          aria-label="Nuovi hashtag"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="#basket #ragusa"
          autoCapitalize="none"
          autoCorrect="off"
          className="min-w-0 flex-1 rounded-xl border border-bordo bg-sfondo px-3 py-2.5 outline-none focus:border-accento"
        />
        <button className="flex items-center gap-1 rounded-xl border border-bordo px-3 font-medium hover:bg-superficie-2">
          <Plus className="size-4" aria-hidden /> Aggiungi
        </button>
      </form>
      {valore.length > 0 && (
        <button onClick={() => onChange([])} className="self-start text-sm text-testo-3 hover:text-testo">
          Togli tutti
        </button>
      )}
    </>
  );
}

/** Come appare la caption sotto il post: nel feed si vede solo l'inizio, poi "altro". */
function Anteprima({ account, testo }: { account: string; testo: string }) {
  const [aperta, setAperta] = useState(false);
  if (!testo.trim()) return null;
  const righe = testo.split("\n");
  const inizio = [...righe[0]].slice(0, PRIMA_RIGA).join("");
  const tagliata = !aperta && (righe.length > 1 || inizio.length < righe[0].length);
  const mostrato = tagliata ? inizio : testo;
  return (
    <Sezione titolo="Anteprima nel feed">
      <p className="whitespace-pre-wrap text-[15px] leading-snug">
        <span className="font-semibold">{account.replace(/^@/, "")}</span>{" "}
        {mostrato.split(/(#[\p{L}\p{N}_]+)/u).map((pezzo, i) =>
          pezzo.startsWith("#") ? (
            <span key={i} className="text-sky-700 dark:text-sky-300">
              {pezzo}
            </span>
          ) : (
            pezzo
          ),
        )}
        {tagliata && (
          <>
            …{" "}
            <button onClick={() => setAperta(true)} className="text-testo-3">
              altro
            </button>
          </>
        )}
      </p>
      {aperta && (
        <button onClick={() => setAperta(false)} className="self-start text-sm text-testo-3">
          Mostra meno
        </button>
      )}
    </Sezione>
  );
}

function BottoneCopia({ testo }: { testo: string }) {
  const [copiato, setCopiato] = useState(false);
  return (
    <button
      disabled={!testo.trim()}
      onClick={async () => {
        await navigator.clipboard.writeText(testo);
        setCopiato(true);
        setTimeout(() => setCopiato(false), 2000);
      }}
      className={`${stileBottone} w-full py-4 text-lg`}
    >
      {copiato ? <Check className="size-5" aria-hidden /> : <Copy className="size-5" aria-hidden />}
      {copiato ? "Copiata, ora incollala su Instagram" : "Copia caption e hashtag"}
    </button>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <Scheda className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-testo-3">{titolo}</h2>
      {children}
    </Scheda>
  );
}

function Modelli({
  modelli,
  caption,
  onUsa,
  onSalva,
  onElimina,
}: {
  modelli: Modello[];
  caption: string;
  onUsa: (m: Modello) => void;
  onSalva: (nome: string) => Promise<void>;
  onElimina: (id: string) => Promise<void>;
}) {
  return (
    <Sezione titolo="Modelli di caption">
      {modelli.length === 0 ? (
        <p className="text-sm text-testo-3">
          Salva come modello le frasi che ripeti spesso. Puoi usare {SEGNAPOSTO.join(" ")}: vengono riempiti con la
          partita del contenuto.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {modelli.map((m) => (
            <li key={m.id} className="flex items-center gap-1">
              <button
                onClick={() => onUsa(m)}
                title={m.testo}
                className="min-w-0 flex-1 rounded-xl border border-bordo px-3 py-2 text-left hover:bg-superficie-2"
              >
                <span className="block truncate font-medium">{m.nome}</span>
                <span className="block truncate text-sm text-testo-3">{m.testo}</span>
              </button>
              <Elimina nome={m.nome} onConferma={() => onElimina(m.id)} />
            </li>
          ))}
        </ul>
      )}
      <NuovoNome
        etichetta="Salva la caption come modello"
        segnaposto="Nome del modello, es. Pre-partita"
        disabilitato={!caption.trim()}
        onSalva={onSalva}
      />
    </Sezione>
  );
}

function Gruppi({
  gruppi,
  hashtag,
  onUsa,
  onSalva,
  onElimina,
}: {
  gruppi: GruppoHashtag[];
  hashtag: string[];
  onUsa: (g: GruppoHashtag) => void;
  onSalva: (nome: string) => Promise<void>;
  onElimina: (id: string) => Promise<void>;
}) {
  return (
    <Sezione titolo="Gruppi di hashtag">
      {gruppi.length === 0 ? (
        <p className="text-sm text-testo-3">
          Prepara gli hashtag nella caption e salvali come gruppo, così la prossima volta li aggiungi con un tocco.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {gruppi.map((g) => (
            <li key={g.id} className="flex items-center gap-1">
              <button
                onClick={() => onUsa(g)}
                title={g.hashtag.join(" ")}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-bordo px-3 py-2 text-left hover:bg-superficie-2"
              >
                <Hash className="size-4 shrink-0 text-accento" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.nome}</span>
                  <span className="block truncate text-sm text-testo-3">{g.hashtag.join(" ")}</span>
                </span>
                <span className="text-sm text-testo-3">{g.hashtag.length}</span>
              </button>
              <Elimina nome={g.nome} onConferma={() => onElimina(g.id)} />
            </li>
          ))}
        </ul>
      )}
      <NuovoNome
        etichetta="Salva questi hashtag come gruppo"
        segnaposto="Nome del gruppo, es. Basket Sicilia"
        disabilitato={hashtag.length === 0}
        onSalva={onSalva}
      />
    </Sezione>
  );
}

function Elimina({ nome, onConferma }: { nome: string; onConferma: () => Promise<void> }) {
  return (
    <button
      onClick={() => confirm(`Eliminare "${nome}"?`) && void onConferma()}
      aria-label={`Elimina ${nome}`}
      className="rounded-xl p-2.5 text-testo-3 hover:bg-superficie-2 hover:text-errore"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

function NuovoNome({
  etichetta,
  segnaposto,
  disabilitato,
  onSalva,
}: {
  etichetta: string;
  segnaposto: string;
  disabilitato: boolean;
  onSalva: (nome: string) => Promise<void>;
}) {
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [errore, setErrore] = useState("");
  if (!aperto)
    return (
      <button
        disabled={disabilitato}
        onClick={() => setAperto(true)}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-accento disabled:text-testo-3"
      >
        <Save className="size-4" aria-hidden /> {etichetta}
      </button>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        try {
          await onSalva(nome.trim());
          setNome("");
          setErrore("");
          setAperto(false);
        } catch (err) {
          setErrore((err as Error).message);
        }
      }}
      className="flex flex-col gap-2"
    >
      <input
        autoFocus
        aria-label={etichetta}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={segnaposto}
        className="rounded-xl border border-bordo bg-sfondo px-3 py-2.5 outline-none focus:border-accento"
      />
      {errore && <p className="text-sm text-errore">{errore}</p>}
      <div className="flex gap-2">
        <button className="rounded-xl bg-accento px-4 py-2 font-semibold text-accento-testo">Salva</button>
        <button type="button" onClick={() => setAperto(false)} className="rounded-xl px-4 py-2 text-testo-2">
          Annulla
        </button>
      </div>
    </form>
  );
}

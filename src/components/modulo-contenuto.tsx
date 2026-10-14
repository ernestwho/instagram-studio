"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, type ReactNode } from "react";
import { stileBottone, Titolo } from "@/components/ui";
import {
  ACCOUNT,
  aggiorna,
  caricaContenuto,
  caricaPartite,
  caricaRubriche,
  crea,
  ETICHETTE_FORMATO,
  FORMATI,
  oggi,
  type Contenuto,
  type Modifica,
  type PartitaBreve,
  type Rubrica,
} from "@/lib/contenuti";
import { aggiungiGiorni, dataBreve, oraBreve } from "@/lib/date";

export function ModificaContenuto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<Contenuto | null>(null);
  useEffect(() => {
    caricaContenuto(id).then(setC);
  }, [id]);
  return c ? <ModuloContenuto contenuto={c} /> : null;
}

type Valori = {
  titolo: string;
  account: string;
  formato: Contenuto["formato"];
  rubrica_id: string;
  pub_modo: "data" | "partita";
  pub_data: string;
  partita_id: string;
  giorni_dopo: string;
  pub_ora: string;
  obiettivo: string;
  cosa_girare: string;
  inquadrature: string;
  durata: string;
  formato_video: string;
  gancio: string;
  audio: string;
  montaggio: string;
  caption_bozza: string;
  hashtag: string;
};

function valoriIniziali(c?: Contenuto): Valori {
  const cr = c?.come_realizzarlo ?? {};
  return {
    titolo: c?.titolo ?? "",
    account: c?.account ?? ACCOUNT[0],
    formato: c?.formato ?? "reel",
    rubrica_id: c?.rubrica_id ?? "",
    pub_modo: c?.pub_modo ?? "data",
    pub_data: c?.pub_data ?? c?.data_uscita ?? oggi(),
    partita_id: c?.partita_id ?? "",
    giorni_dopo: String(c?.giorni_dopo ?? 0),
    pub_ora: c ? oraBreve(c.pub_ora) : "19:00",
    obiettivo: c?.obiettivo ?? "",
    cosa_girare: (cr.cosa_girare ?? []).join("\n"),
    inquadrature: (cr.inquadrature ?? []).join("\n"),
    durata: cr.durata ?? "",
    formato_video: cr.formato_video ?? "9:16",
    gancio: cr.gancio ?? "",
    audio: cr.audio ?? "",
    montaggio: cr.montaggio ?? "",
    caption_bozza: c?.caption_bozza ?? "",
    hashtag: (c?.hashtag ?? []).join(" "),
  };
}

const righe = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

/** Modulo per modificare un contenuto o aggiungerne uno extra. */
export function ModuloContenuto({ contenuto }: { contenuto?: Contenuto }) {
  const router = useRouter();
  const [v, setV] = useState<Valori>(() => valoriIniziali(contenuto));
  const [rubriche, setRubriche] = useState<Rubrica[]>([]);
  const [partite, setPartite] = useState<PartitaBreve[]>([]);
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    caricaRubriche().then(setRubriche);
    caricaPartite().then(setPartite);
  }, []);

  const imposta = (campo: keyof Valori) => (e: { target: { value: string } }) =>
    setV((x) => ({ ...x, [campo]: e.target.value }));
  const partita = partite.find((p) => p.id === v.partita_id);
  const giorni = Number(v.giorni_dopo);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (v.pub_modo === "partita" && !partita) return setErrore("Scegli la partita.");
    const hashtag = v.hashtag
      .split(/\s+/)
      .filter(Boolean)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));
    const dati: Modifica = {
      titolo: v.titolo.trim(),
      account: v.account,
      formato: v.formato,
      rubrica_id: v.rubrica_id || null,
      pub_modo: v.pub_modo,
      pub_data: v.pub_modo === "data" ? v.pub_data : null,
      partita_id: v.pub_modo === "partita" ? v.partita_id : null,
      giorni_dopo: v.pub_modo === "partita" ? giorni : null,
      pub_ora: v.pub_ora,
      obiettivo: v.obiettivo.trim(),
      come_realizzarlo: {
        cosa_girare: righe(v.cosa_girare),
        inquadrature: righe(v.inquadrature),
        durata: v.durata.trim(),
        formato_video: v.formato_video.trim(),
        gancio: v.gancio.trim(),
        audio: v.audio.trim(),
        montaggio: v.montaggio.trim(),
      },
      caption_bozza: v.caption_bozza,
      hashtag,
    };
    setInCorso(true);
    setErrore("");
    try {
      if (contenuto) {
        await aggiorna(contenuto.id, { ...dati, modificato_a_mano: contenuto.piano_id !== null });
        router.replace(`/piano/${contenuto.id}`);
      } else {
        const id = await crea({ ...dati, titolo: dati.titolo!, account: v.account, formato: v.formato, pub_modo: v.pub_modo, pub_ora: v.pub_ora });
        router.replace(`/piano/${id}`);
      }
    } catch (e) {
      setErrore((e as Error).message);
      setInCorso(false);
    }
  }

  const stileCampo =
    "w-full rounded-xl border border-bordo bg-superficie px-3 py-2.5 text-base outline-none focus:border-accento";

  return (
    <form onSubmit={salva} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="-ml-2 flex items-center gap-1 self-start rounded-lg px-2 py-1.5 text-testo-2"
      >
        <ArrowLeft className="size-5" aria-hidden /> Indietro
      </button>
      <Titolo sotto={contenuto?.piano_id ? "Le modifiche restano finché non importi un nuovo piano." : undefined}>
        {contenuto ? "Modifica" : "Nuovo contenuto"}
      </Titolo>

      <Campo etichetta="Titolo">
        <input required value={v.titolo} onChange={imposta("titolo")} className={stileCampo} />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etichetta="Account">
          <select value={v.account} onChange={imposta("account")} className={stileCampo}>
            {ACCOUNT.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Rubrica">
          <select value={v.rubrica_id} onChange={imposta("rubrica_id")} className={stileCampo}>
            <option value="">Nessuna</option>
            {rubriche.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Formato</legend>
        <div className="grid grid-cols-4 gap-2">
          {FORMATI.map((f) => (
            <label
              key={f}
              className={`cursor-pointer rounded-xl border py-2.5 text-center text-sm font-medium ${
                v.formato === f ? "border-accento bg-accento/10 text-accento" : "border-bordo text-testo-2"
              }`}
            >
              <input type="radio" name="formato" value={f} checked={v.formato === f} onChange={imposta("formato")} className="sr-only" />
              {ETICHETTE_FORMATO[f]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-bordo p-4">
        <legend className="px-1 text-sm font-medium">Uscita</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["data", "Data fissa"],
              ["partita", "Legata a una partita"],
            ] as const
          ).map(([modo, etichetta]) => (
            <label
              key={modo}
              className={`cursor-pointer rounded-xl border py-2.5 text-center text-sm font-medium ${
                v.pub_modo === modo ? "border-accento bg-accento/10 text-accento" : "border-bordo text-testo-2"
              }`}
            >
              <input type="radio" name="modo" value={modo} checked={v.pub_modo === modo} onChange={imposta("pub_modo")} className="sr-only" />
              {etichetta}
            </label>
          ))}
        </div>
        {v.pub_modo === "data" ? (
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Giorno">
              <input type="date" required value={v.pub_data} onChange={imposta("pub_data")} className={stileCampo} />
            </Campo>
            <Campo etichetta="Ora">
              <input type="time" required value={v.pub_ora} onChange={imposta("pub_ora")} className={stileCampo} />
            </Campo>
          </div>
        ) : (
          <>
            <Campo etichetta="Partita">
              <select required value={v.partita_id} onChange={imposta("partita_id")} className={stileCampo}>
                <option value="">Scegli…</option>
                {partite.map((p) => (
                  <option key={p.id} value={p.id}>
                    {dataBreve(p.data)} – {p.ospite}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etichetta="Giorni dalla partita">
                <input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  required
                  value={v.giorni_dopo}
                  onChange={imposta("giorni_dopo")}
                  className={stileCampo}
                />
              </Campo>
              <Campo etichetta="Ora">
                <input type="time" required value={v.pub_ora} onChange={imposta("pub_ora")} className={stileCampo} />
              </Campo>
            </div>
            {partita && Number.isInteger(giorni) && (
              <p className="text-sm text-testo-2">
                Esce {giorni === 0 ? "il giorno della partita" : giorni < 0 ? `${-giorni} giorni prima` : `${giorni} giorni dopo`}:{" "}
                <strong className="text-testo">{dataBreve(aggiungiGiorni(partita.data, giorni))}</strong>. Se la partita si
                sposta, si sposta anche questo.
              </p>
            )}
          </>
        )}
      </fieldset>

      <Campo etichetta="Obiettivo">
        <textarea rows={2} value={v.obiettivo} onChange={imposta("obiettivo")} className={stileCampo} />
      </Campo>

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-bordo p-4">
        <legend className="px-1 text-sm font-medium">Come realizzarlo</legend>
        <Campo etichetta="Cosa girare" aiuto="Una voce per riga">
          <textarea rows={4} value={v.cosa_girare} onChange={imposta("cosa_girare")} className={stileCampo} />
        </Campo>
        <Campo etichetta="Inquadrature" aiuto="Una voce per riga">
          <textarea rows={3} value={v.inquadrature} onChange={imposta("inquadrature")} className={stileCampo} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Durata">
            <input value={v.durata} onChange={imposta("durata")} className={stileCampo} />
          </Campo>
          <Campo etichetta="Formato video">
            <input value={v.formato_video} onChange={imposta("formato_video")} className={stileCampo} />
          </Campo>
        </div>
        <Campo etichetta="Gancio">
          <textarea rows={2} value={v.gancio} onChange={imposta("gancio")} className={stileCampo} />
        </Campo>
        <Campo etichetta="Audio">
          <input value={v.audio} onChange={imposta("audio")} className={stileCampo} />
        </Campo>
        <Campo etichetta="Montaggio">
          <textarea rows={3} value={v.montaggio} onChange={imposta("montaggio")} className={stileCampo} />
        </Campo>
      </fieldset>

      <Campo etichetta="Caption bozza">
        <textarea rows={3} value={v.caption_bozza} onChange={imposta("caption_bozza")} className={stileCampo} />
      </Campo>
      <Campo etichetta="Hashtag" aiuto="Separati da spazi">
        <textarea rows={2} value={v.hashtag} onChange={imposta("hashtag")} className={stileCampo} />
      </Campo>

      {errore && (
        <p role="alert" className="text-errore">
          {errore}
        </p>
      )}
      <button type="submit" disabled={inCorso} className={`${stileBottone} sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4`}>
        {inCorso ? "Salvo…" : contenuto ? "Salva le modifiche" : "Aggiungi al piano"}
      </button>
    </form>
  );
}

function Campo({ etichetta, aiuto, children }: { etichetta: string; aiuto?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>
        {etichetta} {aiuto && <span className="font-normal text-testo-3">· {aiuto}</span>}
      </span>
      {children}
    </label>
  );
}

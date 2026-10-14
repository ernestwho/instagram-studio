"use client";

import { Bell, BellOff, Send, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Scheda, stileBottone, stileBottoneSecondario } from "@/components/ui";
import {
  attiva,
  caricaDispositivi,
  caricaOrari,
  disattiva,
  iphoneDaInstallare,
  iscrizioneAttuale,
  ORARI_PREDEFINITI,
  prova,
  rimuoviDispositivo,
  salvaOrari,
  supportate,
  type Orari,
} from "@/lib/notifiche";

type Dispositivo = Awaited<ReturnType<typeof caricaDispositivi>>[number];

export function Promemoria() {
  const [pronto, setPronto] = useState(false);
  const [iscrizione, setIscrizione] = useState<PushSubscription | null>(null);
  const [orari, setOrari] = useState<Orari>(ORARI_PREDEFINITI);
  const [dispositivi, setDispositivi] = useState<Dispositivo[]>([]);
  const [messaggio, setMessaggio] = useState<{ testo: string; errore?: boolean } | null>(null);
  const [occupato, setOccupato] = useState(false);

  useEffect(() => {
    Promise.all([supportate() ? iscrizioneAttuale() : null, caricaOrari(), caricaDispositivi()]).then(
      ([i, o, d]) => {
        setIscrizione(i);
        setOrari(o);
        setDispositivi(d);
        setPronto(true);
      },
      (e) => {
        setMessaggio({ testo: e.message, errore: true });
        setPronto(true);
      },
    );
  }, []);

  async function esegui(azione: () => Promise<string | void>) {
    setOccupato(true);
    setMessaggio(null);
    try {
      const testo = await azione();
      if (testo) setMessaggio({ testo });
      setDispositivi(await caricaDispositivi());
    } catch (e) {
      setMessaggio({ testo: (e as Error).message, errore: true });
    } finally {
      setOccupato(false);
    }
  }

  function cambiaOrario(campo: keyof Orari, valore: number) {
    const nuovi = { ...orari, [campo]: valore };
    setOrari(nuovi);
    void esegui(async () => {
      await salvaOrari(nuovi);
      return "Orari salvati";
    });
  }

  const questo = iscrizione?.endpoint;

  return (
    <Scheda className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">Promemoria</p>
        <p className="text-sm text-testo-2">
          Notifiche gratuite su telefono e computer: cosa girare, cosa esce e quando pubblicare.
        </p>
      </div>

      {!pronto ? null : iphoneDaInstallare() ? (
        <p className="rounded-xl bg-avviso/10 p-3 text-sm text-avviso">
          Su iPhone le notifiche arrivano solo dall&apos;app installata: in Safari tocca Condividi → Aggiungi alla
          schermata Home, poi apri Instagram Studio dall&apos;icona e torna qui.
        </p>
      ) : !supportate() ? (
        <p className="text-sm text-testo-2">Questo browser non supporta le notifiche push.</p>
      ) : iscrizione ? (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={occupato}
            onClick={() =>
              esegui(async () => {
                await prova(iscrizione);
                return "Notifica di prova inviata: dovrebbe arrivare tra pochi secondi";
              })
            }
            className={stileBottone}
          >
            <Send className="size-4" aria-hidden /> Invia una prova
          </button>
          <button
            disabled={occupato}
            onClick={() =>
              esegui(async () => {
                await disattiva(iscrizione);
                setIscrizione(null);
                return "Notifiche disattivate su questo dispositivo";
              })
            }
            className={stileBottoneSecondario}
          >
            <BellOff className="size-4" aria-hidden /> Disattiva qui
          </button>
        </div>
      ) : (
        <button
          disabled={occupato}
          onClick={() =>
            esegui(async () => {
              setIscrizione(await attiva());
              return "Notifiche attive su questo dispositivo";
            })
          }
          className={`${stileBottone} self-start`}
        >
          <Bell className="size-4" aria-hidden /> Attiva su questo dispositivo
        </button>
      )}

      {messaggio && (
        <p role="status" className={`text-sm ${messaggio.errore ? "text-errore" : "text-successo"}`}>
          {messaggio.testo}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SceltaOra
          id="ora-sera"
          etichetta="La sera prima"
          spiegazione="Cosa girare domani e cosa esce domani ma non è pronto"
          valore={orari.sera}
          disabilitato={!pronto}
          onChange={(v) => cambiaOrario("sera", v)}
        />
        <SceltaOra
          id="ora-partita"
          etichetta="Il giorno della partita"
          spiegazione="Elenco di cosa girare per tutti i contenuti della partita"
          valore={orari.partita}
          disabilitato={!pronto}
          onChange={(v) => cambiaOrario("partita", v)}
        />
      </div>
      <p className="text-sm text-testo-3">E all&apos;ora di uscita, se il contenuto non è ancora programmato.</p>

      {dispositivi.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-testo-3">Dispositivi attivi</p>
          <ul className="flex flex-col gap-1.5">
            {dispositivi.map((d) => (
              <li key={d.endpoint} className="flex items-center gap-2 text-sm">
                <Smartphone className="size-4 text-testo-3" aria-hidden />
                <span className="flex-1">
                  {d.dispositivo || "Dispositivo"}
                  {d.endpoint === questo && <span className="text-testo-3"> (questo)</span>}
                </span>
                {d.endpoint !== questo && (
                  <button
                    aria-label={`Rimuovi ${d.dispositivo}`}
                    onClick={() => esegui(() => rimuoviDispositivo(d.endpoint))}
                    className="rounded-lg p-2 text-testo-3 hover:text-errore"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Scheda>
  );
}

function SceltaOra({
  id,
  etichetta,
  spiegazione,
  valore,
  disabilitato,
  onChange,
}: {
  id: string;
  etichetta: string;
  spiegazione: string;
  valore: number;
  disabilitato: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etichetta}
      </label>
      <select
        id={id}
        value={valore}
        disabled={disabilitato}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-bordo bg-sfondo px-3 py-2.5"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            alle {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
      <p className="text-xs text-testo-3">{spiegazione}</p>
    </div>
  );
}

"use client";

import type { EventContentArg, EventDropArg, EventInput } from "@fullcalendar/core";
import itLocale from "@fullcalendar/core/locales/it";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Titolo } from "@/components/ui";
import {
  aggiorna,
  caricaPartite,
  caricaTutti,
  etichettaStato,
  spostamento,
  type Contenuto,
  type PartitaBreve,
} from "@/lib/contenuti";
import { oraBreve } from "@/lib/date";
import "./agenda.css";

type Vista = "dayGridMonth" | "timeGridWeek" | "listMonth";
const VISTE: [Vista, string][] = [
  ["dayGridMonth", "Mese"],
  ["timeGridWeek", "Settimana"],
  ["listMonth", "Lista"],
];

export default function Agenda() {
  const router = useRouter();
  const [contenuti, setContenuti] = useState<Contenuto[]>([]);
  const [partite, setPartite] = useState<PartitaBreve[]>([]);
  const [account, setAccount] = useState("");
  const [errore, setErrore] = useState("");
  const [vista, setVista] = useState<Vista>("dayGridMonth");

  useEffect(() => {
    Promise.all([caricaTutti(), caricaPartite()]).then(([c, p]) => {
      setContenuti(c);
      setPartite(p);
    }, (e) => setErrore(e.message));
  }, []);

  const eventi = useMemo<EventInput[]>(
    () => [
      ...partite.map((p) => ({
        id: `partita-${p.id}`,
        title: `${p.casa.replace("Virtus Kleb Ragusa", "Virtus")} – ${p.ospite}`,
        start: `${p.data}T${oraBreve(p.ora)}`,
        editable: false,
        backgroundColor: "transparent",
        borderColor: "transparent",
        classNames: ["evento-partita"],
        extendedProps: { tipo: "partita", partita: p },
      })),
      ...contenuti
        .filter((c) => c.data_uscita && (!account || c.account === account))
        .map((c) => ({
          id: c.id,
          title: c.titolo,
          start: `${c.data_uscita}T${oraBreve(c.pub_ora)}`,
          editable: c.stato !== "pubblicato",
          backgroundColor: c.rubriche?.colore ?? "#8b8e96",
          borderColor: c.rubriche?.colore ?? "#8b8e96",
          classNames: ["evento-contenuto", `stato-${c.stato}`],
          extendedProps: { tipo: "contenuto", contenuto: c },
        })),
    ],
    [contenuti, partite, account],
  );

  async function sposta(info: EventDropArg) {
    const c = info.event.extendedProps.contenuto as Contenuto | undefined;
    if (!c || !info.event.startStr) return info.revert();
    const [data, ora] = info.event.startStr.slice(0, 16).split("T");
    const modifica = { ...spostamento(c, data), ...(vista === "timeGridWeek" && ora ? { pub_ora: ora } : {}) };
    try {
      await aggiorna(c.id, modifica);
      setContenuti((tutti) =>
        tutti.map((x) =>
          x.id === c.id ? { ...x, ...modifica, data_uscita: data, pub_ora: modifica.pub_ora ?? x.pub_ora } : x,
        ),
      );
    } catch (e) {
      info.revert();
      setErrore(`Spostamento non salvato: ${(e as Error).message}`);
    }
  }

  const rubriche = [...new Map(contenuti.flatMap((c) => (c.rubriche ? [[c.rubriche.id, c.rubriche]] : []))).values()];

  return (
    <>
      <Titolo sotto="Tieni premuto un contenuto e trascinalo per spostarlo.">Agenda</Titolo>
      {errore && (
        <p role="alert" className="mb-3 text-sm text-errore">
          {errore}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Vista" className="flex rounded-xl border border-bordo bg-superficie p-1">
          {VISTE.map(([v, etichetta]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                vista === v ? "bg-accento text-accento-testo" : "text-testo-2"
              }`}
            >
              {etichetta}
            </button>
          ))}
        </div>
        <select
          aria-label="Account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="rounded-xl border border-bordo bg-superficie px-3 py-2 text-sm"
        >
          <option value="">Tutti gli account</option>
          <option value="@ernestwhoo">@ernestwhoo</option>
          <option value="@ernestwhoo.creative">@ernestwhoo.creative</option>
        </select>
      </div>

      <div className="agenda rounded-2xl border border-bordo bg-superficie p-2 md:p-4">
        <FullCalendar
          key={vista}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={itLocale}
          initialView={vista}
          headerToolbar={{ left: "prev,next today", center: "", right: "title" }}
          height="auto"
          firstDay={1}
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotMinTime="08:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={false}
          longPressDelay={300}
          eventLongPressDelay={300}
          events={eventi}
          eventDrop={sposta}
          eventContent={Evento}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            if (info.event.extendedProps.tipo === "contenuto") router.push(`/piano/${info.event.id}`);
          }}
          noEventsText="Niente in programma"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-testo-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {rubriche.map((r) => (
            <span key={r.id} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ background: r.colore }} aria-hidden /> {r.nome}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-2 border-testo" aria-hidden /> Partita in casa
          </span>
        </div>
        <p>
          Contenuto pieno = da fare · tratteggiato = programmato · barrato e chiaro = pubblicato · C = @ernestwhoo.creative
        </p>
      </div>
    </>
  );
}

function Evento(arg: EventContentArg) {
  const { tipo, contenuto } = arg.event.extendedProps as { tipo: string; contenuto?: Contenuto };
  if (tipo === "partita")
    return (
      <div className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs font-semibold">
        <span aria-hidden>🏀</span>
        <span className="truncate">
          <span className="ora-evento">{arg.timeText} </span>
          {arg.event.title}
        </span>
      </div>
    );
  const c = contenuto!;
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs"
      title={`${c.titolo} · ${etichettaStato(c.stato)}`}
    >
      {c.account === "@ernestwhoo.creative" && <span className="rounded bg-black/25 px-1 font-bold">C</span>}
      <span className="ora-evento shrink-0 opacity-80">{arg.timeText}</span>
      <span className="truncate font-medium">
        {arg.view.type.startsWith("list") ? c.titolo : (c.rubriche?.nome ?? c.titolo)}
      </span>
    </div>
  );
}

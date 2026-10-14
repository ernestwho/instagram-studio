// Pezzi di interfaccia condivisi tra Piano, scheda e Agenda.
import { AlertTriangle, Film, Image as ImageIcon, Images, Radio } from "lucide-react";
import Link from "next/link";
import { etichettaStato, ETICHETTE_FORMATO, type Contenuto, type Stato } from "@/lib/contenuti";
import { dataBreve, oraBreve } from "@/lib/date";

const COLORI_STATO: Record<Stato, string> = {
  da_girare: "text-testo-2",
  in_montaggio: "text-avviso",
  pronto: "text-accento",
  programmato: "text-sky-600 dark:text-sky-400",
  pubblicato: "text-successo",
};

export function BadgeStato({ stato }: { stato: Stato }) {
  return (
    <span className={`shrink-0 border border-current px-2.5 py-1 text-xs font-medium ${COLORI_STATO[stato]}`}>
      {etichettaStato(stato)}
    </span>
  );
}

export function IconaFormato({ formato, className = "size-4" }: { formato: string; className?: string }) {
  const Icona = formato === "reel" ? Film : formato === "carosello" ? Images : formato === "storia" ? Radio : ImageIcon;
  return <Icona className={className} aria-label={ETICHETTE_FORMATO[formato]} />;
}

export function quando(c: Pick<Contenuto, "data_uscita" | "pub_ora">) {
  return c.data_uscita ? `${dataBreve(c.data_uscita)}, ${oraBreve(c.pub_ora)}` : "Senza data";
}

export function RigaContenuto({ c }: { c: Contenuto }) {
  return (
    <li>
      <Link
        href={`/piano/${c.id}`}
        className="flex items-center gap-3 border-b border-bordo px-1 py-3.5 transition hover:bg-superficie-2 active:scale-[0.99]"
      >
        <span
          className="h-10 w-1.5 shrink-0 rounded-full"
          style={{ background: c.rubriche?.colore ?? "var(--testo-3)" }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-lg font-semibold leading-snug ${c.stato === "pubblicato" ? "text-testo-2" : ""}`}>{c.titolo}</p>
          <p className="flex items-center gap-1.5 text-sm text-testo-2">
            <IconaFormato formato={c.formato} className="size-3.5" />
            {quando(c)}
            <span className="truncate">· {c.rubriche?.nome}</span>
            {c.account !== "@ernestwhoo" && <span className="text-accento">· creative</span>}
          </p>
          {c.partita_mancante && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-avviso">
              <AlertTriangle className="size-4" aria-hidden /> La partita non è più nel calendario
            </p>
          )}
        </div>
        <BadgeStato stato={c.stato} />
      </Link>
    </li>
  );
}

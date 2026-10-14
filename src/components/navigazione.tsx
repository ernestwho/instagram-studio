"use client";

import { CalendarDays, ListChecks, PenLine, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const voci = [
  { href: "/piano", etichetta: "Piano", Icona: ListChecks },
  { href: "/crea", etichetta: "Crea", Icona: PenLine },
  { href: "/agenda", etichetta: "Agenda", Icona: CalendarDays },
  { href: "/impostazioni", etichetta: "Impostazioni", Icona: Settings },
];

/** Barra in basso su telefono, barra laterale numerata su PC (come nel gestionale). */
export function Navigazione() {
  const percorso = usePathname();
  return (
    <nav
      aria-label="Sezioni"
      className="barra-sicura fixed inset-x-0 bottom-0 z-30 border-t border-bordo bg-superficie md:inset-y-0 md:right-auto md:w-64 md:border-t-0 md:border-r-2 md:pb-0"
    >
      <div className="hidden border-b-2 border-bordo px-6 pt-7 pb-7 md:block">
        <p className="font-display text-3xl font-extrabold leading-none tracking-tight">Studio</p>
        <p className="occhiello mt-2">Instagram · 2026</p>
      </div>
      <ul className="grid grid-cols-4 md:flex md:flex-col">
        {voci.map(({ href, etichetta, Icona }, i) => {
          const attiva = percorso === href || percorso.startsWith(`${href}/`);
          return (
            <li key={href} className="md:border-b md:border-bordo">
              <Link
                href={href}
                aria-current={attiva ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium md:flex-row md:gap-4 md:px-6 md:py-6 md:text-xl md:font-normal ${
                  attiva ? "bg-testo text-sfondo md:font-bold" : "text-testo-2 hover:text-testo md:text-testo"
                }`}
              >
                <Icona className="size-6 md:hidden" strokeWidth={attiva ? 2.4 : 1.8} aria-hidden />
                <span className={`hidden text-sm md:inline ${attiva ? "text-accento" : "text-testo-3"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

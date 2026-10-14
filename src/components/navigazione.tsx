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

/** Barra in basso su telefono, barra laterale su PC. */
export function Navigazione() {
  const percorso = usePathname();
  return (
    <nav
      aria-label="Sezioni"
      className="barra-sicura fixed inset-x-0 bottom-0 z-30 border-t border-bordo bg-superficie/95 backdrop-blur md:inset-y-0 md:right-auto md:w-56 md:border-t-0 md:border-r md:pb-0"
    >
      <div className="hidden px-5 pt-6 pb-8 md:block">
        <p className="font-display text-2xl font-bold uppercase tracking-wide">
          Instagram <span className="text-accento">Studio</span>
        </p>
      </div>
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1 md:px-3">
        {voci.map(({ href, etichetta, Icona }) => {
          const attiva = percorso === href || percorso.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={attiva ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm ${
                  attiva ? "text-accento md:bg-superficie-2" : "text-testo-2 hover:text-testo"
                }`}
              >
                <Icona className="size-6 md:size-5" strokeWidth={attiva ? 2.4 : 1.8} aria-hidden />
                {etichetta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

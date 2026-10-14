"use client";

import { ChevronRight, FileUp, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useSessione } from "@/components/accesso";
import { Promemoria } from "@/components/promemoria";
import { Scheda, Titolo } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

type Tema = "sistema" | "chiaro" | "scuro";

const ascoltatori = new Set<() => void>();

function leggiTema(): Tema {
  try {
    const t = localStorage.getItem("tema");
    if (t === "chiaro" || t === "scuro") return t;
  } catch {}
  return "sistema";
}

function applicaTema(t: Tema) {
  const scuro = t === "scuro" || (t === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", scuro);
  try {
    if (t === "sistema") localStorage.removeItem("tema");
    else localStorage.setItem("tema", t);
  } catch {}
  ascoltatori.forEach((f) => f());
}

function iscriviti(f: () => void) {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

export default function Impostazioni() {
  const sessione = useSessione();
  const tema = useSyncExternalStore(iscriviti, leggiTema, () => "sistema" as Tema);

  return (
    <>
      <Titolo occhiello="04 — Preferenze">Impostazioni</Titolo>
      <div className="flex flex-col gap-4">
        <Link href="/impostazioni/importa">
          <Scheda className="flex items-center gap-3 transition hover:bg-superficie-2">
            <FileUp className="size-5 text-accento" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">Importa</p>
              <p className="text-sm text-testo-2">Calendario partite e piano editoriale, con storico</p>
            </div>
            <ChevronRight className="size-5 text-testo-3" aria-hidden />
          </Scheda>
        </Link>

        <Promemoria />

        <Scheda>
          <p className="mb-3 font-semibold">Tema</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
            {(
              [
                ["sistema", "Automatico", Monitor],
                ["chiaro", "Chiaro", Sun],
                ["scuro", "Scuro", Moon],
              ] as const
            ).map(([valore, etichetta, Icona]) => (
              <button
                key={valore}
                role="radio"
                aria-checked={tema === valore}
                onClick={() => applicaTema(valore)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm ${
                  tema === valore ? "border-accento text-accento" : "border-bordo text-testo-2"
                }`}
              >
                <Icona className="size-5" aria-hidden />
                {etichetta}
              </button>
            ))}
          </div>
        </Scheda>

        <Scheda className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold">Account</p>
            <p className="text-sm text-testo-2">{sessione?.user.email}</p>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-errore hover:bg-errore/10"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="size-4" aria-hidden /> Esci
          </button>
        </Scheda>
      </div>
    </>
  );
}

import type { ReactNode } from "react";

export function Titolo({ children, sotto }: { children: ReactNode; sotto?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">{children}</h1>
      {sotto && <p className="mt-1 text-testo-2">{sotto}</p>}
    </header>
  );
}

export function Scheda({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-bordo bg-superficie p-4 ${className}`}>{children}</section>;
}

export const stileBottone =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accento px-4 py-3 font-semibold text-accento-testo transition active:scale-[0.98] disabled:opacity-50";
export const stileBottoneSecondario =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-bordo bg-superficie px-4 py-3 font-medium transition hover:bg-superficie-2 active:scale-[0.98] disabled:opacity-50";

import type { ReactNode } from "react";

/** Intestazione di pagina: occhiello rosso numerato, titolo grande e riga sotto, come nel gestionale. */
export function Titolo({ children, sotto, occhiello }: { children: ReactNode; sotto?: ReactNode; occhiello?: ReactNode }) {
  return (
    <header className="mb-6 border-b border-bordo pb-5">
      {occhiello && <p className="occhiello mb-1">{occhiello}</p>}
      <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight md:text-6xl">{children}</h1>
      {sotto && <p className="mt-3 text-testo-2">{sotto}</p>}
    </header>
  );
}

export function Scheda({ children, className = "" }: { children: ReactNode; className?: string }) {
  const spazio = /(^|\s)p-\d/.test(className) ? "" : "p-4";
  return <section className={`border border-bordo bg-superficie ${spazio} ${className}`}>{children}</section>;
}

export const stileBottone =
  "inline-flex items-center justify-center gap-2 bg-accento px-4 py-3 font-bold text-accento-testo transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50";
export const stileBottoneSecondario =
  "inline-flex items-center justify-center gap-2 border border-testo-3 bg-superficie px-4 py-3 font-bold transition hover:bg-superficie-2 active:scale-[0.98] disabled:opacity-50";

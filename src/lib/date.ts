// Date in ora italiana. Le date sono stringhe AAAA-MM-GG e le ore HH:MM, come nei file.
export const FUSO = "Europe/Rome";

export function aggiungiGiorni(data: string, giorni: number): string {
  const [a, m, g] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g + giorni)).toISOString().slice(0, 10);
}

/** "18:00:00" (Postgres) o "18:00" → "18:00". */
export function oraBreve(ora: string): string {
  return ora.slice(0, 5);
}

/** Istante corrispondente a data e ora italiane, con ora legale/solare corretta. */
export function istanteRoma(data: string, ora: string): Date {
  const [a, m, g] = data.split("-").map(Number);
  const [h, min] = ora.split(":").map(Number);
  const comeUtc = Date.UTC(a, m - 1, g, h, min);
  // Prima stima con l'offset di quell'istante, poi correzione (serve nelle ore del cambio).
  let istante = comeUtc - offsetRoma(new Date(comeUtc));
  istante = comeUtc - offsetRoma(new Date(istante));
  return new Date(istante);
}

/** Millisecondi di differenza tra l'ora italiana e UTC in quell'istante (+1h o +2h). */
function offsetRoma(d: Date): number {
  const parti = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const v = (t: string) => Number(parti.find((p) => p.type === t)!.value);
  const comeUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"));
  return comeUtc - Math.floor(d.getTime() / 60000) * 60000;
}

/** Data di oggi in Italia, AAAA-MM-GG. */
export function oggiRoma(adesso = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(adesso);
}

const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const mesi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** "2026-10-25" → "dom 25 ott". */
export function dataBreve(data: string): string {
  const [a, m, g] = data.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  return `${giorni[d.getUTCDay()]} ${g} ${mesi[m - 1]}`;
}

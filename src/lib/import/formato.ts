// Formato dei file di import (vedi docs/formato-file.md).
// Il formato del calendario è condiviso con "Matchday Shot List": non cambiarlo.
import { z } from "zod";

export const ACCOUNT = ["@ernestwhoo", "@ernestwhoo.creative"] as const;
export const FORMATI = ["foto", "carosello", "reel", "storia"] as const;

const data = z
  .string({ error: "deve essere una data AAAA-MM-GG" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "deve essere una data AAAA-MM-GG")
  .refine(dataValida, "non è una data esistente");
const ora = z
  .string({ error: "deve essere un'ora HH:MM" })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "deve essere un'ora HH:MM (es. 18:00)");
const testo = z.string({ error: "deve essere un testo" });
const testoPieno = testo.trim().min(1, "non può essere vuoto");

function dataValida(s: string) {
  const [a, m, g] = s.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g;
}

export const partitaSchema = z.object({
  id: testoPieno,
  giornata: z.number({ error: "deve essere un numero" }).int("deve essere un numero intero"),
  data,
  ora,
  casa: testoPieno,
  ospite: testoPieno,
  palazzetto: testoPieno,
  indirizzo: testoPieno,
  note: testo.optional(),
});

export const calendarioSchema = z.object({
  tipo: z.literal("calendario_partite", { error: 'deve essere "calendario_partite"' }),
  versione: z.literal(1, { error: "versione non supportata (atteso 1)" }),
  stagione: testoPieno,
  squadra: testoPieno,
  campionato: testoPieno,
  aggiornato_il: data,
  partite: z.array(partitaSchema, { error: "deve essere una lista di partite" }),
});

export const rubricaSchema = z.object({
  id: testoPieno,
  nome: testoPieno,
  colore: z
    .string({ error: "deve essere un colore #RRGGBB" })
    .regex(/^#[0-9A-Fa-f]{6}$/, "deve essere un colore #RRGGBB (es. #E4572E)"),
});

const pubblicazioneSchema = z.discriminatedUnion(
  "modo",
  [
    z.object({ modo: z.literal("data"), data, ora }),
    z.object({
      modo: z.literal("partita"),
      partita_id: testoPieno,
      giorni_dopo: z
        .number({ error: "deve essere un numero intero (es. -1, 0, 1)" })
        .int("deve essere un numero intero (es. -1, 0, 1)"),
      ora,
    }),
  ],
  { error: 'il campo "modo" deve essere "data" oppure "partita"' },
);

const listaTesti = z.array(testo, { error: "deve essere una lista di testi" });

export const comeRealizzarloSchema = z.object({
  cosa_girare: listaTesti,
  inquadrature: listaTesti,
  durata: testo,
  formato_video: testo,
  gancio: testo,
  audio: testo,
  montaggio: testo,
});

export const contenutoSchema = z.object({
  id: testoPieno,
  account: z.enum(ACCOUNT, { error: `deve essere ${ACCOUNT.join(" oppure ")}` }),
  titolo: testoPieno,
  rubrica: testoPieno,
  formato: z.enum(FORMATI, { error: `deve essere uno tra ${FORMATI.join(", ")}` }),
  pubblicazione: pubblicazioneSchema,
  obiettivo: testo,
  come_realizzarlo: comeRealizzarloSchema,
  caption_bozza: testo,
  hashtag: z.array(
    z.string({ error: "deve essere un testo" }).regex(/^#\S+$/, 'deve iniziare con "#" e non avere spazi'),
    { error: "deve essere una lista di hashtag" },
  ),
});

export const pianoSchema = z.object({
  tipo: z.literal("piano_editoriale", { error: 'deve essere "piano_editoriale"' }),
  versione: z.literal(1, { error: "versione non supportata (atteso 1)" }),
  id: testoPieno,
  nome: testoPieno,
  valido_dal: data,
  valido_al: data,
  rubriche: z.array(rubricaSchema, { error: "deve essere una lista di rubriche" }),
  contenuti: z.array(contenutoSchema, { error: "deve essere una lista di contenuti" }),
});

export type Partita = z.infer<typeof partitaSchema>;
export type Calendario = z.infer<typeof calendarioSchema>;
export type Rubrica = z.infer<typeof rubricaSchema>;
export type ContenutoFile = z.infer<typeof contenutoSchema>;
export type Pubblicazione = ContenutoFile["pubblicazione"];
export type ComeRealizzarlo = z.infer<typeof comeRealizzarloSchema>;
export type Piano = z.infer<typeof pianoSchema>;

import { describe, expect, it } from "vitest";
import { aggiungiGiorni, dataBreve, istanteRoma, oggiRoma } from "./date";

describe("aggiungiGiorni", () => {
  it("gestisce fine mese, fine anno e giorni negativi", () => {
    expect(aggiungiGiorni("2026-10-31", 1)).toBe("2026-11-01");
    expect(aggiungiGiorni("2026-12-31", 1)).toBe("2027-01-01");
    expect(aggiungiGiorni("2026-11-01", -1)).toBe("2026-10-31");
    expect(aggiungiGiorni("2026-10-25", 0)).toBe("2026-10-25");
  });
});

describe("istanteRoma", () => {
  it("usa l'ora legale prima del 25 ottobre 2026", () => {
    expect(istanteRoma("2026-10-24", "18:00").toISOString()).toBe("2026-10-24T16:00:00.000Z");
  });
  it("usa l'ora solare dal 25 ottobre 2026, giorno di partita", () => {
    expect(istanteRoma("2026-10-25", "18:00").toISOString()).toBe("2026-10-25T17:00:00.000Z");
    expect(istanteRoma("2026-10-25", "16:00").toISOString()).toBe("2026-10-25T15:00:00.000Z");
  });
  it("gestisce il passaggio all'ora legale di marzo", () => {
    expect(istanteRoma("2027-03-28", "18:00").toISOString()).toBe("2027-03-28T16:00:00.000Z");
    expect(istanteRoma("2027-03-27", "18:00").toISOString()).toBe("2027-03-27T17:00:00.000Z");
  });
});

describe("oggiRoma e dataBreve", () => {
  it("usa il giorno italiano anche a mezzanotte UTC", () => {
    expect(oggiRoma(new Date("2026-10-13T22:30:00Z"))).toBe("2026-10-14");
  });
  it("scrive la data in breve in italiano", () => {
    expect(dataBreve("2026-10-25")).toBe("dom 25 ott");
  });
});

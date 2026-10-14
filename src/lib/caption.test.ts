import { describe, expect, it } from "vitest";
import { compilaModello, conteggi, leggiHashtag, unisciHashtag } from "./caption";
import type { PartitaBreve } from "./contenuti";

describe("hashtag", () => {
  it("pulisce il testo libero", () => {
    expect(leggiHashtag("basket, #Ragusa  ##sport; #ragusa virtus!")).toEqual(["#basket", "#Ragusa", "#sport", "#virtus"]);
  });
  it("unisce senza doppioni", () => {
    expect(unisciHashtag(["#basket", "#Ragusa"], ["#ragusa", "#sicilia"])).toEqual(["#basket", "#Ragusa", "#sicilia"]);
  });
});

describe("conteggi", () => {
  it("conta caratteri con gli hashtag e quelli nel testo", () => {
    const n = conteggi("Si vola! #virtus", ["#basket", "#Virtus"]);
    expect(n.caratteri).toBe("Si vola! #virtus\n\n#basket #Virtus".length);
    expect(n.hashtag).toBe(2);
    expect(n.primaRigaLunga).toBe(false);
  });
  it("segnala la prima riga lunga", () => {
    expect(conteggi("a".repeat(130), []).primaRigaLunga).toBe(true);
  });
});

describe("modelli", () => {
  const partita: PartitaBreve = {
    id: "g05", giornata: 5, data: "2026-10-25", ora: "18:00:00", casa: "Virtus Kleb Ragusa",
    ospite: "Miwa Energia Benevento", palazzetto: "PalaPadua", indirizzo: "", rimossa: false,
  };
  it("riempie i segnaposto con la partita", () => {
    expect(compilaModello("G{giornata}: vs {avversario}, {data} ore {ora} al {palazzetto}", partita)).toBe(
      "G5: vs Miwa Energia Benevento, dom 25 ott ore 18:00 al PalaPadua",
    );
  });
  it("senza partita lascia il testo com'è", () => {
    expect(compilaModello("vs {avversario}", null)).toBe("vs {avversario}");
  });
});

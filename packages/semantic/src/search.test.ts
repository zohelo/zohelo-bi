import { describe, expect, it } from "vitest";
import { normalise, search, type SearchItem } from "./index";

const items: SearchItem[] = [
  { key: "gdp", name_pl: "Produkt krajowy brutto", name_en: "GDP, current prices", synonyms: ["PKB"], codes: ["P2392"] },
  { key: "unemployment", name_pl: "Stopa bezrobocia", name_en: "Unemployment rate" },
  { key: "lodz", name_pl: "Łódź", name_en: "Lodz" },
];

describe("search", () => {
  it("finds a synonym exactly", () => {
    expect(search(items, "pkb")).toEqual([{ key: "gdp", score: 3 }]);
  });

  it("finds an English name by its start", () => {
    expect(search(items, "GDP")).toEqual([{ key: "gdp", score: 2 }]);
  });

  it("finds a Polish name containing the query", () => {
    expect(search(items, "bezrob")).toEqual([{ key: "unemployment", score: 1 }]);
  });

  it("finds a source code", () => {
    expect(search(items, "p2392")).toEqual([{ key: "gdp", score: 3 }]);
  });

  it("ignores Polish diacritics", () => {
    expect(normalise("  Łódź ")).toBe("lodz");
    expect(search(items, "łódź")).toEqual([{ key: "lodz", score: 3 }]);
  });

  it("returns nothing for an empty query", () => {
    expect(search(items, "   ")).toEqual([]);
  });

  it("sorts ties by English name and respects the limit", () => {
    const ties: SearchItem[] = [
      { key: "b", name_pl: "x", name_en: "Rate B" },
      { key: "a", name_pl: "x", name_en: "Rate A" },
    ];
    expect(search(ties, "rate").map((h) => h.key)).toEqual(["a", "b"]);
    expect(search(ties, "rate", 1)).toEqual([{ key: "a", score: 2 }]);
  });
});

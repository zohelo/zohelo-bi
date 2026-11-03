import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { normalise, plural, queryTokens, searchDocs, searchKpis, suggestKpis } from "./search";

const cat = await dummy.catalog();
const docs = searchDocs(cat);

describe("normalise", () => {
  it("folds Polish letters and case", () => {
    expect(normalise("Łódź")).toBe("lodz");
    expect(normalise("ŻÓŁĆ gęślą jaźń")).toBe("zolc gesla jazn");
    expect(normalise("Województwa")).toBe("wojewodztwa");
  });
  it("turns punctuation into single spaces", () => {
    expect(normalise("PKB, wzrost  realny (r/r)")).toBe("pkb wzrost realny r r");
    expect(queryTokens("  kurs   euro ")).toEqual(["kurs", "euro"]);
  });
});

describe("searchKpis", () => {
  it("matches without Polish letters and in any case", () => {
    const a = searchKpis(docs, "stopa bezrobocia").map((k) => k.kpi_key);
    const b = searchKpis(docs, "STOPA BEZROBOCIA").map((k) => k.kpi_key);
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
    expect(searchKpis(docs, "ludnosc").length).toBe(searchKpis(docs, "ludność").length);
  });
  it("requires every word and ranks name matches first", () => {
    const hits = searchKpis(docs, "inflacja hicp");
    expect(hits[0]!.kpi_key).toBe("hicp_annual_rate");
    expect(searchKpis(docs, "inflacja zzzz")).toEqual([]);
  });
  it("searches domain, source and voivodeship scope too", () => {
    expect(searchKpis(docs, "eurostat").every((k) => k.source_keys.includes("eurostat") || /eurostat/i.test(k.name_pl))).toBe(true);
    expect(searchKpis(docs, "wojewodztwa").every((k) => k.geo_levels.includes("voivodeship") || /wojew/i.test(k.name_pl))).toBe(true);
  });
  it("returns the whole catalogue for an empty query", () => {
    expect(searchKpis(docs, "  ")).toHaveLength(cat.kpis.length);
  });
});

describe("suggestKpis", () => {
  it("finds indicators from a mistyped key", () => {
    const s = suggestKpis(docs, "nie ma bezrobocia");
    expect(s.length).toBeGreaterThan(0);
    expect(/bezroboc/i.test(s[0]!.name_pl)).toBe(true);
  });
});

describe("plural", () => {
  it("uses Polish plural forms", () => {
    const f = (n: number) => plural(n, "pl", ["wskaźnik", "wskaźniki", "wskaźników"], ["indicator", "indicators"]);
    expect([1, 2, 4, 5, 12, 13, 22, 25, 183].map(f)).toEqual([
      "wskaźnik",
      "wskaźniki",
      "wskaźniki",
      "wskaźników",
      "wskaźników",
      "wskaźników",
      "wskaźniki",
      "wskaźników",
      "wskaźniki",
    ]);
    expect(plural(1, "en", ["", "", ""], ["indicator", "indicators"])).toBe("indicator");
  });
});

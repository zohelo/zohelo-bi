import { describe, expect, it } from "vitest";
import { flagWords, latestChange, latestUnit } from "./format";

describe("latestChange", () => {
  const kpi = { unit_key: "pct", frequency: "Q" as const };
  it("is undefined without a latest value or a period before (contract v2 allows a null previous value)", () => {
    expect(latestChange(undefined, kpi, undefined, "pl")).toBeUndefined();
    expect(latestChange({ value: 2.5, previous_value: null }, kpi, undefined, "pl")).toBeUndefined();
  });
  it("formats the change against the period before", () => {
    expect(latestChange({ value: 2.5, previous_value: 2.7 }, kpi, undefined, "en")?.delta).toBeCloseTo(-0.2);
  });
});

describe("latest values in their own unit (contract v2: sources publish in different units)", () => {
  const cat = {
    units: [
      { unit_key: "mln_eur", symbol: "mln EUR", name_pl: "mln EUR", name_en: "EUR m", is_rate: false },
      { unit_key: "mln_pln", symbol: "mln zł", name_pl: "mln zł", name_en: "PLN m", is_rate: false },
    ],
  } as unknown as Parameters<typeof latestChange>[2];
  it("formats the change in the value's unit, not the KPI's", () => {
    const kpi = { unit_key: "mln_eur", frequency: "A" as const };
    const ch = latestChange({ value: 3687000, previous_value: 3377000, unit_key: "mln_pln" }, kpi, cat, "pl")!;
    expect(ch.shown).toContain("zł");
    expect(ch.shown).not.toContain("EUR");
  });
  it("gives the unit of a latest value, falling back to the KPI's", () => {
    expect(latestUnit({ unit_key: "mln_pln" }, { unit_key: "mln_eur" })).toBe("mln_pln");
    expect(latestUnit({}, { unit_key: "mln_eur" })).toBe("mln_eur");
    expect(latestUnit(undefined, { unit_key: "mln_eur" })).toBe("mln_eur");
  });
});

describe("flagWords (contract v2 observation flags p e b f u d n c)", () => {
  it("names every flag the contract writes, in both languages, and skips unknown letters", () => {
    expect(flagWords(["p", "e"], "pl")).toEqual(["dane wstępne", "szacunek"]);
    expect(flagWords(["b", "f", "u", "d", "n", "c"], "en")).toEqual([
      "break in series",
      "forecast",
      "low reliability",
      "definition differs",
      "not significant",
      "confidential",
    ]);
    expect(flagWords(["x"], "pl")).toEqual([]);
  });
});

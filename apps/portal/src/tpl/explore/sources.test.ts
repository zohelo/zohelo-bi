import { describe, expect, it } from "vitest";
import type { Kpi, Series } from "../../data";
import { compareSources } from "./sources";

const kpi = { kpi_key: "gdp_nominal", unit_key: "mln_eur", frequency: "A", source_keys: ["eurostat", "world_bank_wdi", "gus_dbw"] } as Kpi;
const s = (source_key: string, unit_key: string | undefined, points: [string, number | null][], frequency?: "A" | "Q"): Series => ({
  kpi_key: "gdp_nominal",
  geography: "PL",
  source_key,
  unit_key,
  frequency,
  members: {},
  points: points.map(([period, value]) => ({ period, value })),
});

describe("compareSources (the indicator page's 'same measure in other sources')", () => {
  it("lists every source's latest value in its own unit and frequency", () => {
    const c = compareSources(kpi, [s("eurostat", "mln_eur", [["2024", 815000]]), s("gus_dbw", "mln_pln", [["2024", 3687000]])]);
    expect(c.rows).toEqual([
      { source: "eurostat", period: "2024", value: 815000, unit_key: "mln_eur", frequency: "A" },
      { source: "world_bank_wdi", period: null, value: null, unit_key: "mln_eur", frequency: "A" },
      { source: "gus_dbw", period: "2024", value: 3687000, unit_key: "mln_pln", frequency: "A" },
    ]);
  });

  it("gives no spread across different units (mln EUR against mln PLN mean nothing)", () => {
    const c = compareSources(kpi, [s("eurostat", "mln_eur", [["2024", 815000]]), s("gus_dbw", "mln_pln", [["2024", 3687000]])]);
    expect(c.spread).toBeNull();
    expect(c.sameUnit).toBe(false);
  });

  it("gives no spread across different frequencies", () => {
    const q = { ...kpi, frequency: "Q" as const, unit_key: "pct" };
    const c = compareSources(q, [s("eurostat", "pct", [["2025-Q2", 2.6]]), s("world_bank_wdi", "pct", [["2024", 2.9]], "A")]);
    expect(c.spread).toBeNull();
    expect(c.sameFrequency).toBe(false);
    expect(c.rows[1]).toMatchObject({ frequency: "A", period: "2024" });
  });

  it("gives the spread when units and frequencies agree, from each source's last value", () => {
    const c = compareSources({ ...kpi, unit_key: "persons" }, [
      s("eurostat", "persons", [["2024", 100]]),
      s("world_bank_wdi", "persons", [
        ["2023", 90],
        ["2024", null],
      ]),
      s("gus_dbw", undefined, [["2024", 104]]),
    ]);
    expect(c.spread).toBe(14);
  });
});

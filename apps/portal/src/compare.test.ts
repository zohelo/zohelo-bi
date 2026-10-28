import { describe, expect, it } from "vitest";
import type { SeriesRow } from "@zohelo/semantic";
import { compareSources } from "./compare";

const row = (source: string, date_key: string, value: number | null): SeriesRow => ({
  series_key: `${source}-population`,
  source_system: source,
  geography_name: "Polska",
  geography_level: "country",
  frequency: "A",
  date_key,
  value,
  unit: "persons",
  breakdown_json: null,
});

describe("compareSources", () => {
  it("puts sources side by side per period, newest first, with the spread", () => {
    expect(compareSources([row("eurostat", "2023", 10), row("gus_bdl", "2023", 12), row("eurostat", "2022", 9)])).toEqual({
      sources: ["eurostat", "gus_bdl"],
      rows: [
        { period: "2023", values: { eurostat: 10, gus_bdl: 12 }, spread: 2 },
        { period: "2022", values: { eurostat: 9, gus_bdl: null }, spread: null },
      ],
    });
  });

  it("counts a null value as missing", () => {
    const { rows } = compareSources([row("eurostat", "2023", null), row("gus_bdl", "2023", 5)]);
    expect(rows[0]!.spread).toBeNull();
    expect(rows[0]!.values).toEqual({ eurostat: null, gus_bdl: 5 });
  });

  it("keeps the first value of a source and period", () => {
    const { rows } = compareSources([row("eurostat", "2023", 10), row("eurostat", "2023", 99)]);
    expect(rows).toEqual([{ period: "2023", values: { eurostat: 10 }, spread: null }]);
  });

  it("gives an empty table for no rows", () => {
    expect(compareSources([])).toEqual({ sources: [], rows: [] });
  });
});

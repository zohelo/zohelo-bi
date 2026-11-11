import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCalendarV2, validateCatalogV2, validateLatestV2, validateSeriesV2, validateTopics } from "./index";

const fixture = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../fixtures/v2/${path}`, import.meta.url), "utf8")) as Record<string, unknown>;

type Obj = Record<string, unknown>;
const first = (x: Obj, key: string): Obj => (x[key] as Obj[])[0]!;

describe("contract v2 fixtures", () => {
  it("validates catalog.json", () => {
    const c = validateCatalogV2(fixture("catalog.json"));
    expect(c.version).toBe(2);
    expect(c.kpis.map((k) => k.kpi_key)).toEqual(["hicp_annual_rate", "unemployment_lfs", "population_total"]);
    expect(c.kpis[1]?.polarity).toBe("down");
    expect(c.dimensions.find((d) => d.dimension_key === "sex")?.members.map((m) => m.key)).toEqual(["m", "f"]);
    expect(c.geographies.find((g) => g.key === "EU27")?.level).toBe("aggregate");
  });

  it("validates latest.json", () => {
    const l = validateLatestV2(fixture("latest.json"));
    expect(l.values.find((v) => v.kpi_key === "population_total" && v.geography === "PL")?.year_ago_value).toBeNull();
  });

  it("validates every kpi/<kpi_key>/series.json", () => {
    for (const k of ["hicp_annual_rate", "unemployment_lfs", "population_total"]) {
      const s = validateSeriesV2(fixture(`kpi/${k}/series.json`));
      expect(s.kpi_key).toBe(k);
      for (const one of s.series) expect(one.values).toHaveLength(s.periods.length);
    }
  });

  it("validates calendar.json", () => {
    expect(validateCalendarV2(fixture("calendar.json")).releases[0]?.kpi_keys).toEqual(["hicp_annual_rate"]);
  });

  it("validates topics.json copied from zohelo-data", () => {
    expect(validateTopics(fixture("topics.json")).periods.day.topics[0]?.topic_key).toBe("inflation");
  });
});

describe("contract v2 validators reject", () => {
  it("a KPI without definition_en", () => {
    const c = fixture("catalog.json");
    delete first(c, "kpis").definition_en;
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].definition_en: required property missing");
  });

  it("an aggregation outside the contract (summing an average would be wrong)", () => {
    const c = fixture("catalog.json");
    first(c, "kpis").aggregation = "avg";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].aggregation: expected sum, mean, rate, index or none, got avg");
  });

  it("a polarity outside up, down, neutral", () => {
    const c = fixture("catalog.json");
    first(c, "kpis").polarity = "good";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].polarity: expected up, down or neutral, got good");
  });

  it("a frequency the product does not show", () => {
    const c = fixture("catalog.json");
    first(c, "kpis").frequency = "D";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].frequency: expected M, Q or A, got D");
  });

  it("a geography level outside country, voivodeship, aggregate", () => {
    const c = fixture("catalog.json");
    first(c, "geographies").level = "nuts2";
    expect(() => validateCatalogV2(c)).toThrow(
      "catalog.json: $.geographies[0].level: expected country, voivodeship or aggregate, got nuts2",
    );
  });

  it("a dimension member without its name", () => {
    const c = fixture("catalog.json");
    delete first(first(c, "dimensions"), "members").name_pl;
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.dimensions[0].members[0].name_pl: required property missing");
  });

  it("a latest value whose value is a string", () => {
    const l = fixture("latest.json");
    first(l, "values").value = "2.8";
    expect(() => validateLatestV2(l)).toThrow("latest.json: $.values[0].value: expected number, got string");
  });

  it("a series whose values do not line up with the periods", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    (first(s, "series").values as unknown[]).pop();
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].values: expected 10 values (one per period), got 9");
  });

  it("a series value that is neither a number nor null", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    (first(s, "series").values as unknown[])[0] = "3.0";
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].values[0]: expected number or null, got string");
  });

  it("a calendar release without kpi_keys", () => {
    const c = fixture("calendar.json");
    delete first(c, "releases").kpi_keys;
    expect(() => validateCalendarV2(c)).toThrow("calendar.json: $.releases[0].kpi_keys: required property missing");
  });
});

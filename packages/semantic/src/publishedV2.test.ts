import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCalendarV2, validateCatalogV2, validateLatestV2, validateSeriesV2, validateStatusV2, validateTopics } from "./index";

// zohelo-data's contract v2 fixtures, copied (fixtures/v2/SOURCE.md).
const fixture = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../fixtures/v2/${path}`, import.meta.url), "utf8")) as Record<string, unknown>;

type Obj = Record<string, unknown>;
const first = (x: Obj, key: string): Obj => (x[key] as Obj[])[0]!;
const KPIS = ["eurpln", "gdp_nominal", "gdp_real_growth", "hicp_annual_rate", "population_total", "unemployment_lfs"];

describe("contract v2 fixtures (zohelo-data)", () => {
  it("validates catalog.json", () => {
    const c = validateCatalogV2(fixture("catalog.json"));
    expect(c.version).toBe(2);
    expect(c.kpis.map((k) => k.kpi_key)).toEqual(KPIS);
    expect(c.kpis.find((k) => k.kpi_key === "unemployment_lfs")?.polarity).toBe("down");
    expect(c.geographies.find((g) => g.key === "EU27")?.level).toBe("aggregate");
    expect(c.geographies.map((g) => g.key)).toContain("EL");
  });

  it("validates latest.json, every value with its own unit", () => {
    const l = validateLatestV2(fixture("latest.json"));
    expect(l.values.find((v) => v.kpi_key === "gdp_nominal" && v.geography === "PL")?.unit_key).toBe("mln_eur");
  });

  it("validates every kpi/<kpi_key>/series.json, every series with its own unit", () => {
    for (const k of KPIS) {
      const s = validateSeriesV2(fixture(`kpi/${k}/series.json`));
      expect(s.kpi_key).toBe(k);
      for (const one of s.series)
        expect(one.values).toHaveLength((one.frequency ? s.periods_by_frequency![one.frequency]! : s.periods).length);
    }
    const gdp = validateSeriesV2(fixture("kpi/gdp_nominal/series.json"));
    expect(new Set(gdp.series.map((s) => s.unit_key))).toEqual(new Set(["mln_eur", "usd", "mln_pln"]));
  });

  it("validates calendar.json and status.json", () => {
    expect(validateCalendarV2(fixture("calendar.json")).releases[0]?.kpi_keys).toEqual(["hicp_annual_rate"]);
    expect(validateStatusV2(fixture("status.json")).sources.length).toBeGreaterThan(0);
  });

  it("validates topics.json", () => {
    expect(validateTopics(fixture("topics.json")).periods.day.topics[0]?.topic_key).toBe("inflation");
  });
});

describe("contract v2: what the schemas allow", () => {
  it("a domain without csa_code and sort", () => {
    const c = fixture("catalog.json");
    delete first(c, "domains").csa_code;
    delete first(c, "domains").sort;
    expect(() => validateCatalogV2(c)).not.toThrow();
  });

  it("a member whose parent_key is null", () => {
    const c = fixture("catalog.json");
    c.dimensions = [
      {
        dimension_key: "sex",
        name_pl: "Płeć",
        name_en: "Sex",
        members: [{ key: "f", name_pl: "kobiety", name_en: "women", sort: 1, parent_key: null }],
      },
    ];
    expect(() => validateCatalogV2(c)).not.toThrow();
  });

  it("a release without a link", () => {
    const c = fixture("calendar.json");
    first(c, "releases").url = null;
    expect(() => validateCalendarV2(c)).not.toThrow();
  });

  it("a series at another frequency on periods_by_frequency (the fixtures' World Bank and NUTS 2 annual series)", () => {
    const s = validateSeriesV2(fixture("kpi/unemployment_lfs/series.json"));
    const annual = s.series.find((x) => x.frequency === "A")!;
    expect(annual.geography).toBe("PL-14");
    expect(annual.values).toHaveLength(s.periods_by_frequency!.A!.length);
  });

  it("the draft KPI of the fixture (O37 status)", () => {
    const c = validateCatalogV2(fixture("catalog.json"));
    expect(c.kpis.filter((k) => k.status === "draft").map((k) => k.kpi_key)).toEqual(["gdp_nominal"]);
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
    expect(() => validateCatalogV2(c)).toThrow(
      "catalog.json: $.kpis[0].aggregation: expected one of sum, mean, rate, index, none, got avg",
    );
  });

  it("a polarity outside up, down, neutral", () => {
    const c = fixture("catalog.json");
    first(c, "kpis").polarity = "good";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].polarity: expected one of up, down, neutral, got good");
  });

  it("a frequency the product does not show", () => {
    const c = fixture("catalog.json");
    first(c, "kpis").frequency = "D";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].frequency: expected one of M, Q, A, got D");
  });

  it("a geography level outside country, voivodeship, aggregate", () => {
    const c = fixture("catalog.json");
    first(c, "geographies").level = "nuts2";
    expect(() => validateCatalogV2(c)).toThrow(
      "catalog.json: $.geographies[0].level: expected one of country, voivodeship, aggregate, got nuts2",
    );
  });

  it("a unit without decimals", () => {
    const c = fixture("catalog.json");
    delete first(c, "units").decimals;
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.units[0].decimals: required property missing");
  });

  it("a latest value without its unit", () => {
    const l = fixture("latest.json");
    delete first(l, "values").unit_key;
    expect(() => validateLatestV2(l)).toThrow("latest.json: $.values[0].unit_key: required property missing");
  });

  it("a latest value whose value is a string", () => {
    const l = fixture("latest.json");
    first(l, "values").value = "2.8";
    expect(() => validateLatestV2(l)).toThrow("latest.json: $.values[0].value: expected number, got string");
  });

  it("a series without its unit", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    delete first(s, "series").unit_key;
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].unit_key: required property missing");
  });

  it("a series whose values do not line up with the periods", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    (first(s, "series").values as unknown[]).pop();
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].values: expected 6 values (one per period), got 5");
  });

  it("a series of another frequency whose values do not line up with periods_by_frequency", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    first(s, "series").frequency = "A";
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].values: expected 3 values (one per period), got 6");
  });

  it("a series of another frequency without its periods_by_frequency axis", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    first(s, "series").frequency = "M";
    expect(() => validateSeriesV2(s)).toThrow(
      "kpi/<kpi_key>/series.json: $.periods_by_frequency.M: missing, but $.series[0] has frequency M",
    );
  });

  it("a KPI without its review status, or with one outside draft and published (O37)", () => {
    const c = fixture("catalog.json");
    delete first(c, "kpis").status;
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].status: required property missing");
    first(c, "kpis").status = "review";
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis[0].status: expected one of draft, published, got review");
  });

  it("keys that break the schema's patterns (a NUTS code as a geography)", () => {
    const c = fixture("catalog.json");
    (first(c, "kpis").geographies as string[]).push("PL22");
    expect(() => validateCatalogV2(c)).toThrow('catalog.json: $.kpis[0].geographies[1]: "PL22" does not match');
  });

  it("an empty catalogue (the schema's minItems)", () => {
    const c = fixture("catalog.json");
    c.kpis = [];
    expect(() => validateCatalogV2(c)).toThrow("catalog.json: $.kpis: expected at least 1 items, got 0");
  });

  it("a series frequency outside M, Q, A", () => {
    const s = fixture("kpi/unemployment_lfs/series.json");
    first(s, "series").frequency = "D";
    expect(() => validateSeriesV2(s)).toThrow("kpi/<kpi_key>/series.json: $.series[0].frequency: expected one of M, Q, A, got D");
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

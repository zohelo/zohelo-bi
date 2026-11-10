import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCatalog, validateKpiLatest, validateManifest, validateTopics } from "./index";

const fixture = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../fixtures/v1/${path}`, import.meta.url), "utf8")) as Record<string, unknown>;

describe("published fixtures", () => {
  it("validates catalog/catalog.json", () => {
    const catalog = validateCatalog(fixture("catalog/catalog.json"));
    expect(catalog.kpis.length).toBeGreaterThan(0);
    expect(catalog.kpis[0]?.unit_key).toBeTypeOf("string");
  });

  it("validates manifest.json", () => {
    const manifest = validateManifest(fixture("manifest.json"));
    expect(manifest.metrics.map((m) => m.kpi_key)).toContain("unemployment_rate");
  });

  it("validates kpi/unemployment_rate/latest.json", () => {
    const latest = validateKpiLatest(fixture("kpi/unemployment_rate/latest.json"));
    expect(latest.kpi_key).toBe("unemployment_rate");
    expect(latest.values.length).toBe(2);
  });
});

describe("published validators reject", () => {
  it("a catalog KPI without name_en", () => {
    const catalog = fixture("catalog/catalog.json");
    const kpis = catalog.kpis as Record<string, unknown>[];
    delete kpis[0]?.name_en;
    expect(() => validateCatalog(catalog)).toThrow("catalog/catalog.json: $.kpis[0].name_en: required property missing");
  });

  it("a catalog KPI whose dimensions is the string 'x'", () => {
    const catalog = fixture("catalog/catalog.json");
    const kpis = catalog.kpis as Record<string, unknown>[];
    if (kpis[0]) kpis[0].dimensions = "x";
    expect(() => validateCatalog(catalog)).toThrow("$.kpis[0].dimensions: expected array, got string");
  });

  it("a latest.json value given as the string '3.2'", () => {
    const latest = fixture("kpi/unemployment_rate/latest.json");
    const values = latest.values as Record<string, unknown>[];
    if (values[0]) values[0].value = "3.2";
    expect(() => validateKpiLatest(latest)).toThrow("$.values[0].value: expected number, got string");
  });

  it("a latest.json whose values is a string", () => {
    const latest = { ...fixture("kpi/unemployment_rate/latest.json"), values: "3.2" };
    expect(() => validateKpiLatest(latest)).toThrow("$.values: expected array, got string");
  });

  it("a manifest without a required property", () => {
    const manifest = fixture("manifest.json");
    delete manifest.generated_at;
    expect(() => validateManifest(manifest)).toThrow("manifest.json: $.generated_at: required property missing");
  });

  it("a non-integer version and a wrong nested type", () => {
    expect(() => validateManifest({ ...fixture("manifest.json"), version: 1.5 })).toThrow("$.version: expected integer, got number");
    const latest = fixture("kpi/unemployment_rate/latest.json");
    const values = latest.values as Record<string, unknown>[];
    if (values[0]) values[0].flags = [1];
    expect(() => validateKpiLatest(latest)).toThrow("$.values[0].flags[0]: expected string, got integer");
  });

  it("allows extra properties and a null parent_key", () => {
    const catalog = { ...fixture("catalog/catalog.json"), extra: true };
    expect(() => validateCatalog(catalog)).not.toThrow();
  });
});

describe("topics.json", () => {
  // zohelo-data has no topics fixture yet (docs/topics.md, design branch); this minimal file follows the contract
  // table in docs/published.md. Replace it with a copy of warehouse/published/fixtures/v2/topics.json once published.
  const topic = () => ({
    topic_key: "inflacja",
    name_pl: "Inflacja i ceny",
    name_en: "Inflation and prices",
    rank: 1,
    heat: 2.31,
    trend: "up",
    kpi_keys: ["cpi_annual_rate"],
    headlines: [{ title: "T", url: "https://example.com/a", outlet: "O", lang: "pl", published_at: "2026-11-10T07:40:00Z" }],
    next_release: null,
    signals: { news: 2.6, volume: null, attention: 1.4 },
  });
  const period = () => ({ window: { from: "2026-11-10", to: "2026-11-10" }, topics: [topic()] });
  const file = () => ({
    version: 2,
    generated_at: "2026-11-10T05:30:00Z",
    periods: { day: period(), week: period(), month: period(), quarter: period(), year: period() },
  });

  it("validates a file with null signals and a null next release", () => {
    expect(validateTopics(file()).periods.day.topics[0]?.signals.volume).toBeNull();
  });
  it("validates a next release object", () => {
    const f = file();
    (f.periods.week.topics[0] as Record<string, unknown>).next_release = {
      date: "2026-11-16",
      source_key: "gus",
      title_pl: "a",
      title_en: "b",
    };
    expect(validateTopics(f).periods.week.topics[0]?.next_release?.date).toBe("2026-11-16");
  });
  it("rejects a missing period", () => {
    const f = file() as Record<string, unknown>;
    delete (f.periods as Record<string, unknown>).quarter;
    expect(() => validateTopics(f)).toThrow("topics.json: $.periods.quarter: required property missing");
  });
  it("rejects an unknown trend", () => {
    const f = file();
    f.periods.month.topics[0]!.trend = "sideways";
    expect(() => validateTopics(f)).toThrow("topics.json: $.periods.month.topics[0].trend: expected up, down or flat");
  });
  it("rejects a headline link that is not http(s)", () => {
    const f = file();
    f.periods.day.topics[0]!.headlines[0]!.url = "javascript:alert(1)";
    expect(() => validateTopics(f)).toThrow("topics.json: $.periods.day.topics[0].headlines[0].url: expected an http(s) link");
  });
  it("rejects a heat that is a string", () => {
    const f = file() as unknown as { periods: { year: { topics: Record<string, unknown>[] } } };
    f.periods.year.topics[0]!.heat = "hot";
    expect(() => validateTopics(f)).toThrow("$.periods.year.topics[0].heat: expected number, got string");
  });
});

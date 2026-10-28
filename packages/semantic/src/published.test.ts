import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateCatalog, validateKpiLatest, validateManifest } from "./index";

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
    delete kpis[1]?.name_en;
    expect(() => validateCatalog(catalog)).toThrow("catalog/catalog.json: $.kpis[1].name_en: required property missing");
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

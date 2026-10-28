import { describe, expect, it } from "vitest";
import { citation, headline, sourceRows, type LatestValue } from "./index";

// From zohelo-data warehouse/published/fixtures/ (commit 47bb8da).
const latest: LatestValue[] = [
  {
    source_key: "eurostat",
    geography_level: "country",
    period: "2025",
    value: 3.2,
    previous_period: "2024",
    previous_value: 2.9,
  },
  { source_key: "eurostat", geography_level: "voivodeship", period: "2025", value: 2.6 },
];
const sources = [
  { source_key: "eurostat", name_en: "Eurostat", licence_key: "cc_by_4_0", register_id: "GL-001" },
  { source_key: "world_bank_wdi", name_en: "World Bank – WDI", licence_key: "cc_by_4_0", register_id: "GL-005" },
  { source_key: "gus_bdl", name_en: "Statistics Poland – Local Data Bank", licence_key: "gus_terms", register_id: "PLS-001" },
  { source_key: "nbp", name_en: "National Bank of Poland", licence_key: "nbp_terms", register_id: "PLG-001" },
];
const licences = [
  {
    licence_key: "cc_by_4_0",
    name: "Creative Commons Attribution 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    attribution_text: "Source: <publisher> (illustrative)",
  },
  {
    licence_key: "gus_terms",
    name: "GUS terms of use (illustrative)",
    url: "https://example.invalid/gus",
    attribution_text: "Źródło: GUS (illustrative)",
  },
  {
    licence_key: "nbp_terms",
    name: "NBP terms of use (illustrative)",
    url: "https://example.invalid/nbp",
    attribution_text: "Źródło: NBP (illustrative)",
  },
];

describe("citation", () => {
  it("follows the template", () => {
    expect(
      citation(
        { kpi_key: "unemployment_rate", name_en: "Unemployment rate (LFS)" },
        ["Eurostat", "World Bank – WDI"],
        new Date("2026-10-28T12:00:00Z"),
      ),
    ).toBe("Unemployment rate (LFS), Eurostat; World Bank – WDI, zohelo-bi, accessed 2026-10-28, bi.zohelo.com/kpi/unemployment_rate");
  });
});

describe("headline", () => {
  it("takes the country value with its change", () => {
    const h = headline(latest, ["eurostat"])!;
    expect(h).toMatchObject({ source_key: "eurostat", period: "2025", value: 3.2, previous_period: "2024" });
    expect(h.delta).toBeCloseTo(0.3);
  });

  it("is null without a country value", () => {
    expect(headline(latest.slice(1), ["eurostat"])).toBeNull();
  });

  it("respects the source order and falls back to the first candidate", () => {
    const values: LatestValue[] = [
      { source_key: "eurostat", geography_level: "country", period: "2025", value: 3.2 },
      { source_key: "world_bank_wdi", geography_level: "country", period: "2024", value: 2.9 },
    ];
    expect(headline(values, ["world_bank_wdi", "eurostat"])).toEqual({
      source_key: "world_bank_wdi",
      period: "2024",
      value: 2.9,
      delta: null,
    });
    expect(headline(values, ["nbp"])?.source_key).toBe("eurostat");
  });
});

describe("sourceRows", () => {
  it("skips unknown sources and joins the licence", () => {
    expect(sourceRows(["nbp", "unknown"], sources, licences)).toEqual([
      {
        source_key: "nbp",
        name_en: "National Bank of Poland",
        register_id: "PLG-001",
        licence_name: "NBP terms of use (illustrative)",
        licence_url: "https://example.invalid/nbp",
        attribution_text: "Źródło: NBP (illustrative)",
      },
    ]);
  });

  it("gives null licence fields for an unknown licence_key", () => {
    const [row] = sourceRows(["eurostat"], [{ ...sources[0]!, licence_key: "nope" }], licences);
    expect(row).toMatchObject({ licence_name: null, licence_url: null, attribution_text: null });
  });

  it("keeps the order of sourceKeys", () => {
    expect(sourceRows(["world_bank_wdi", "eurostat"], sources, licences).map((r) => r.source_key)).toEqual(["world_bank_wdi", "eurostat"]);
  });
});

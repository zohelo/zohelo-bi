import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LatestValue } from "@zohelo/semantic";
import { KpiView, type KpiCatalog } from "./KpiView";

// Subsets of zohelo-data warehouse/published/fixtures/catalog/catalog.json and
// kpi/unemployment_rate/latest.json (commit 47bb8da).
const catalog: KpiCatalog = {
  kpis: [
    {
      kpi_key: "unemployment_rate",
      name_pl: "Stopa bezrobocia (BAEL)",
      name_en: "Unemployment rate (LFS)",
      unit_key: "pct_labour_force",
      source_keys: ["eurostat", "world_bank_wdi"],
      geo_levels: ["country", "voivodeship"],
      dimensions: [],
    },
    {
      kpi_key: "fx_rate",
      name_pl: "Kurs waluty w PLN",
      name_en: "Exchange rate to PLN",
      unit_key: "pln_per_unit",
      source_keys: ["nbp"],
      geo_levels: ["country"],
      dimensions: [{ dimension_key: "currency", member_count: 33, levels: ["currency"] }],
    },
  ],
  units: [
    { unit_key: "persons", symbol: "os." },
    { unit_key: "mln_ncu", symbol: "mln" },
    { unit_key: "pct", symbol: "%" },
    { unit_key: "pct_labour_force", symbol: "%" },
    { unit_key: "pln_per_unit", symbol: "zł" },
  ],
  sources: [
    { source_key: "eurostat", name_en: "Eurostat", licence_key: "cc_by_4_0", register_id: "GL-001" },
    { source_key: "world_bank_wdi", name_en: "World Bank – WDI", licence_key: "cc_by_4_0", register_id: "GL-005" },
    { source_key: "gus_bdl", name_en: "Statistics Poland – Local Data Bank", licence_key: "gus_terms", register_id: "PLS-001" },
    { source_key: "nbp", name_en: "National Bank of Poland", licence_key: "nbp_terms", register_id: "PLG-001" },
  ],
  licences: [
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
  ],
};

const unemploymentLatest: LatestValue[] = [
  { source_key: "eurostat", geography_level: "country", period: "2025", value: 3.2, previous_period: "2024", previous_value: 2.9 },
  { source_key: "eurostat", geography_level: "voivodeship", period: "2025", value: 2.6 },
];

const accessed = new Date("2026-10-28T12:00:00Z");
const view = (kpiKey: string, latest: LatestValue[] | null) =>
  renderToStaticMarkup(<KpiView catalog={catalog} kpiKey={kpiKey} latest={latest} accessed={accessed} />);

describe("KpiView", () => {
  it("renders unemployment_rate with value, change, sources, levels and citation", () => {
    const html = view("unemployment_rate", unemploymentLatest);
    expect(html).toContain("3.2 %");
    expect(html).toContain("+0.3 vs 2024");
    expect(html).toContain("GL-001");
    expect(html).toContain("GL-005");
    expect(html).toContain("country, voivodeship");
    expect(html).toContain(
      "Unemployment rate (LFS), Eurostat; World Bank – WDI, zohelo-bi, accessed 2026-10-28, bi.zohelo.com/kpi/unemployment_rate",
    );
  });

  it("says when nothing is published", () => {
    expect(view("unemployment_rate", null)).toContain("No published value yet.");
  });

  it("renders fx_rate with its unit symbol and currency dimension", () => {
    const html = view("fx_rate", [{ source_key: "nbp", geography_level: "country", period: "2026-10-27", value: 4.25 }]);
    expect(html).toContain("4.25 zł");
    expect(html).toContain("currency");
    expect(html).toContain("33");
  });

  it("names an unknown KPI", () => {
    expect(view("nope", null)).toContain("Unknown KPI: nope");
  });
});

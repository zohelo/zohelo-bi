import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deepestGeo } from "../labels";
import { KpiCard, type CardKpi } from "./KpiCard";

// Rows of zohelo-data warehouse/published/fixtures/catalog/catalog.json (commit 47bb8da).
const fxRate: CardKpi = {
  kpi_key: "fx_rate",
  name_pl: "Kurs waluty w PLN",
  name_en: "Exchange rate to PLN",
  unit_key: "pln_per_unit",
  frequency_default: "D",
  geo_levels: ["country"],
  first_period: "2002-01-02",
  last_period: "2026-10-27",
  loaded_at: "2026-01-01T00:00:00Z",
};
const population: CardKpi = {
  kpi_key: "population",
  name_pl: "Ludność",
  name_en: "Population",
  unit_key: "persons",
  frequency_default: "A",
  geo_levels: ["country", "voivodeship"],
  first_period: "1990",
  last_period: "2025",
  loaded_at: "2026-01-01T00:00:00Z",
};

describe("KpiCard", () => {
  it("shows the fx_rate facts and links to the explorer", () => {
    const html = renderToStaticMarkup(
      <KpiCard kpi={fxRate} unit={{ symbol: "zł", name_en: "PLN per currency unit" }} sourceNames={["National Bank of Poland"]} />,
    );
    expect(html).toContain("Exchange rate to PLN");
    expect(html).toContain("Kurs waluty w PLN");
    expect(html).toContain("PLN per currency unit (zł)");
    expect(html).toContain("Daily");
    expect(html).toContain("2002-01-02–2026-10-27");
    expect(html).toContain("National Bank of Poland");
    expect(html).toContain("Loaded 2026-01-01");
    expect(html).toContain('href="/explore?metric=fx_rate"');
  });

  it("shows the deepest geography level", () => {
    expect(renderToStaticMarkup(<KpiCard kpi={population} sourceNames={[]} />)).toContain("Voivodeship");
  });

  it("shows unit_key without a unit", () => {
    expect(renderToStaticMarkup(<KpiCard kpi={population} sourceNames={[]} />)).toContain("persons");
  });
});

describe("deepestGeo", () => {
  it("picks the finest known level", () => {
    expect(deepestGeo(["gmina", "country"])).toBe("gmina");
    expect(deepestGeo(["country", "planet"])).toBe("country");
  });

  it("is null without a known level", () => {
    expect(deepestGeo([])).toBeNull();
  });
});

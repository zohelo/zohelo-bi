import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KpiGrid, type GridKpi } from "./KpiGrid";

// Rows of zohelo-data warehouse/published/fixtures/catalog/catalog.json (commit 47bb8da), as in KpiCard.test.tsx.
const fxRate: GridKpi = {
  kpi_key: "fx_rate",
  name_pl: "Kurs waluty w PLN",
  name_en: "Exchange rate to PLN",
  unit_key: "pln_per_unit",
  frequency_default: "D",
  geo_levels: ["country"],
  first_period: "2002-01-02",
  last_period: "2026-10-27",
  loaded_at: "2026-01-01T00:00:00Z",
  source_keys: ["nbp"],
};
const population: GridKpi = {
  kpi_key: "population",
  name_pl: "Ludność",
  name_en: "Population",
  unit_key: "persons",
  frequency_default: "A",
  geo_levels: ["country", "voivodeship"],
  first_period: "1990",
  last_period: "2025",
  loaded_at: "2026-01-01T00:00:00Z",
  source_keys: ["eurostat", "gus_bdl"],
};
const units = { pln_per_unit: { symbol: "zł", name_en: "PLN per currency unit" } };
const sources = { nbp: "National Bank of Poland", eurostat: "Eurostat" };

const render = (kpis: GridKpi[] | undefined, loading: boolean, error: string | null = null) =>
  renderToStaticMarkup(<KpiGrid kpis={kpis} units={units} sources={sources} loading={loading} error={error} />);

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("KpiGrid", () => {
  it("shows an error as an alert and no cards", () => {
    const html = render([fxRate], false, "HTTP 500");
    expect(html).toContain('role="alert"');
    expect(html).toContain("HTTP 500");
    expect(html).not.toContain("kpi-card");
  });

  it("shows 6 skeletons while loading without rows", () => {
    const html = render(undefined, true);
    expect(html).toContain('aria-busy="true"');
    expect(count(html, 'class="skeleton"')).toBe(6);
  });

  it("shows the cards while loading when rows are given", () => {
    const html = render([fxRate], true);
    expect(html).toContain("kpi-card");
    expect(html).not.toContain("skeleton");
  });

  it("says when no KPI matches", () => {
    expect(render([], false)).toContain("No KPIs match.");
  });

  it("renders the cards in input order with unit and source names", () => {
    const html = render([fxRate, population], false);
    expect(html.indexOf("Exchange rate to PLN")).toBeGreaterThan(-1);
    expect(html.indexOf("Exchange rate to PLN")).toBeLessThan(html.indexOf("Population"));
    expect(html).toContain("Eurostat · gus_bdl");
    expect(html).toContain("PLN per currency unit (zł)");
    expect(count(html, '<article class="kpi-card"')).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { catalogueParams, filterKpis, parseCatalogueParams, type CatalogueKpi } from "./index";

// Names and keys as in zohelo-data warehouse/published/fixtures/catalog/catalog.json (commit 47bb8da).
const kpis: CatalogueKpi[] = [
  {
    kpi_key: "population",
    name_pl: "Ludność",
    name_en: "Population",
    domain_path: ["population", "population.stock", "population.stock.population"],
    source_keys: ["eurostat", "world_bank_wdi", "gus_bdl"],
  },
  {
    kpi_key: "gdp_current_prices",
    name_pl: "PKB w cenach bieżących",
    name_en: "GDP, current prices",
    domain_path: ["economy", "economy.national_accounts", "economy.national_accounts.gdp"],
    source_keys: ["eurostat", "world_bank_wdi"],
  },
  {
    kpi_key: "fx_rate",
    name_pl: "Kurs waluty w PLN",
    name_en: "Exchange rate to PLN",
    domain_path: ["finance", "finance.fx_gold", "finance.fx_gold.exchange_rates"],
    source_keys: ["nbp"],
  },
];
const keys = (rows: CatalogueKpi[]) => rows.map((k) => k.kpi_key);

describe("parseCatalogueParams", () => {
  it("keeps only the domain when both are given", () => {
    expect(parseCatalogueParams(new URLSearchParams("domain=economy&source=nbp"))).toEqual({ domain: "economy", source: undefined, q: "" });
  });

  it("parses a source and a query", () => {
    expect(parseCatalogueParams(new URLSearchParams("source=nbp&q=kurs"))).toEqual({ domain: undefined, source: "nbp", q: "kurs" });
  });

  it("treats empty values as unset", () => {
    expect(parseCatalogueParams(new URLSearchParams("domain=&source=&q="))).toEqual({ domain: undefined, source: undefined, q: "" });
  });
});

describe("catalogueParams", () => {
  it("round-trips a selection", () => {
    for (const q of ["domain=economy&q=pkb", "source=nbp&q=kurs", "domain=finance", ""])
      expect(catalogueParams(parseCatalogueParams(new URLSearchParams(q))).toString()).toBe(q);
  });

  it("drops the source when a domain is set and a blank query", () => {
    expect(catalogueParams({ domain: "economy", source: "nbp", q: "  " }).toString()).toBe("domain=economy");
  });
});

describe("filterKpis", () => {
  it("filters by domain", () => {
    expect(keys(filterKpis(kpis, { domain: "economy", q: "" }))).toEqual(["gdp_current_prices"]);
  });

  it("filters by source", () => {
    expect(keys(filterKpis(kpis, { source: "eurostat", q: "" }))).toEqual(["population", "gdp_current_prices"]);
  });

  it("searches the names", () => {
    expect(keys(filterKpis(kpis, { q: "pkb" }))).toEqual(["gdp_current_prices"]);
  });

  it("combines the query with the domain", () => {
    expect(keys(filterKpis(kpis, { domain: "economy", q: "kurs" }))).toEqual([]);
  });

  it("keeps the input order without a query", () => {
    expect(keys(filterKpis(kpis, { q: " " }))).toEqual(["population", "gdp_current_prices", "fx_rate"]);
  });
});

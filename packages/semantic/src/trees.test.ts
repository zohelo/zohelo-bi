import { describe, expect, it } from "vitest";
import { domainTree, sourceTree, type TreeDomain, type TreeKpi, type TreeSource } from "./index";

// From zohelo-data warehouse/published/fixtures/catalog/catalog.json (commit 47bb8da).
const kpis: TreeKpi[] = [
  {
    kpi_key: "population",
    domain_path: ["population", "population.stock", "population.stock.population"],
    source_keys: ["eurostat", "world_bank_wdi", "gus_bdl"],
  },
  {
    kpi_key: "gdp_current_prices",
    domain_path: ["economy", "economy.national_accounts", "economy.national_accounts.gdp"],
    source_keys: ["eurostat", "world_bank_wdi"],
  },
  {
    kpi_key: "inflation",
    domain_path: ["economy", "economy.prices", "economy.prices.consumer_prices"],
    source_keys: ["eurostat", "world_bank_wdi"],
  },
  {
    kpi_key: "unemployment_rate",
    domain_path: ["labour", "labour.employment", "labour.employment.lfs"],
    source_keys: ["eurostat", "world_bank_wdi"],
  },
  { kpi_key: "fx_rate", domain_path: ["finance", "finance.fx_gold", "finance.fx_gold.exchange_rates"], source_keys: ["nbp"] },
];
const domains: TreeDomain[] = [
  { domain_key: "population", level: "domain", parent_key: null, name_en: "Population", name_pl: "Ludność", sort: 5 },
  {
    domain_key: "population.stock",
    level: "group",
    parent_key: "population",
    name_en: "Population stock & structure",
    name_pl: "Stan i struktura ludności",
    sort: 1,
  },
  {
    domain_key: "population.stock.population",
    level: "subgroup",
    parent_key: "population.stock",
    name_en: "Population",
    name_pl: "Ludność",
    sort: 1,
  },
  { domain_key: "economy", level: "domain", parent_key: null, name_en: "Economy", name_pl: "Gospodarka", sort: 1 },
  {
    domain_key: "economy.national_accounts",
    level: "group",
    parent_key: "economy",
    name_en: "National accounts & GDP",
    name_pl: "Rachunki narodowe i PKB",
    sort: 1,
  },
  {
    domain_key: "economy.national_accounts.gdp",
    level: "subgroup",
    parent_key: "economy.national_accounts",
    name_en: "GDP",
    name_pl: "PKB",
    sort: 1,
  },
  {
    domain_key: "economy.prices",
    level: "group",
    parent_key: "economy",
    name_en: "Prices & inflation",
    name_pl: "Ceny i inflacja",
    sort: 3,
  },
  {
    domain_key: "economy.prices.consumer_prices",
    level: "subgroup",
    parent_key: "economy.prices",
    name_en: "Consumer prices",
    name_pl: "Ceny konsumpcyjne",
    sort: 1,
  },
  { domain_key: "labour", level: "domain", parent_key: null, name_en: "Labour & income", name_pl: "Praca i dochody", sort: 4 },
  {
    domain_key: "labour.employment",
    level: "group",
    parent_key: "labour",
    name_en: "Employment & unemployment",
    name_pl: "Zatrudnienie i bezrobocie",
    sort: 1,
  },
  {
    domain_key: "labour.employment.lfs",
    level: "subgroup",
    parent_key: "labour.employment",
    name_en: "Labour force survey",
    name_pl: "Badanie aktywności ekonomicznej ludności (BAEL)",
    sort: 1,
  },
  { domain_key: "finance", level: "domain", parent_key: null, name_en: "Finance", name_pl: "Finanse", sort: 2 },
  {
    domain_key: "finance.fx_gold",
    level: "group",
    parent_key: "finance",
    name_en: "Exchange rates & gold",
    name_pl: "Kursy walut i złoto",
    sort: 3,
  },
  {
    domain_key: "finance.fx_gold.exchange_rates",
    level: "subgroup",
    parent_key: "finance.fx_gold",
    name_en: "Exchange rates",
    name_pl: "Kursy walut",
    sort: 1,
  },
];
const sources: TreeSource[] = [
  { source_key: "eurostat", name_pl: "Eurostat", name_en: "Eurostat" },
  { source_key: "world_bank_wdi", name_pl: "Bank Światowy – WDI", name_en: "World Bank – WDI" },
  { source_key: "gus_bdl", name_pl: "GUS – Bank Danych Lokalnych", name_en: "Statistics Poland – Local Data Bank" },
  { source_key: "nbp", name_pl: "Narodowy Bank Polski", name_en: "National Bank of Poland" },
];

describe("domainTree", () => {
  it("orders the domain roots by sort", () => {
    expect(domainTree(kpis, domains).map((n) => n.key)).toEqual(["economy", "finance", "labour", "population"]);
  });

  it("counts KPIs and orders the children", () => {
    const economy = domainTree(kpis, domains)[0]!;
    expect(economy.count).toBe(2);
    expect(economy.children.map((n) => [n.key, n.count])).toEqual([
      ["economy.national_accounts", 1],
      ["economy.prices", 1],
    ]);
    expect(economy.children[0]!.children.map((n) => n.level)).toEqual(["subgroup"]);
  });

  it("drops a domain without KPIs", () => {
    const extra: TreeDomain = { domain_key: "health", level: "domain", parent_key: null, name_en: "Health", name_pl: "Zdrowie", sort: 0 };
    expect(domainTree(kpis, [...domains, extra]).map((n) => n.key)).not.toContain("health");
  });

  it("breaks a sort tie by name_en", () => {
    const tied = domains.map((d) => (d.parent_key === null ? { ...d, sort: 1 } : d));
    expect(domainTree(kpis, tied).map((n) => n.key)).toEqual(["economy", "finance", "labour", "population"]);
  });
});

describe("sourceTree", () => {
  it("lists sources by name with their KPI counts", () => {
    expect(sourceTree(kpis, sources).map((n) => [n.name_en, n.count])).toEqual([
      ["Eurostat", 4],
      ["National Bank of Poland", 1],
      ["Statistics Poland – Local Data Bank", 1],
      ["World Bank – WDI", 4],
    ]);
  });

  it("has one level and ignores source keys missing from sources", () => {
    const tree = sourceTree([...kpis, { kpi_key: "x", domain_path: [], source_keys: ["unknown"] }], sources);
    expect(tree).toHaveLength(4);
    expect(tree.every((n) => n.level === "source" && n.children.length === 0)).toBe(true);
  });

  it("drops a source without KPIs", () => {
    expect(sourceTree(kpis.slice(0, 1), sources).map((n) => n.key)).toEqual(["eurostat", "gus_bdl", "world_bank_wdi"]);
  });
});

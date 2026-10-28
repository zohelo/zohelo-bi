import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { domainTree, sourceTree, type TreeDomain, type TreeKpi, type TreeSource } from "@zohelo/semantic";
import { TreePanel, type TreeMode } from "./TreePanel";

// Rows of zohelo-data warehouse/published/fixtures/catalog/catalog.json (commit 47bb8da).
const kpis: TreeKpi[] = [
  {
    kpi_key: "population",
    domain_path: ["population", "population.stock", "population.stock.population"],
    source_keys: ["eurostat", "world_bank_wdi", "gus_bdl"],
  },
  {
    kpi_key: "inflation",
    domain_path: ["economy", "economy.prices", "economy.prices.consumer_prices"],
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
  { source_key: "eurostat", name_en: "Eurostat", name_pl: "Eurostat" },
  { source_key: "world_bank_wdi", name_en: "World Bank – WDI", name_pl: "Bank Światowy – WDI" },
  { source_key: "gus_bdl", name_en: "Statistics Poland – Local Data Bank", name_pl: "GUS – Bank Danych Lokalnych" },
  { source_key: "nbp", name_en: "National Bank of Poland", name_pl: "Narodowy Bank Polski" },
];

const noop = () => {};
const render = (mode: TreeMode, selected?: string) =>
  renderToStaticMarkup(
    <TreePanel
      mode={mode}
      domains={domainTree(kpis, domains)}
      sources={sourceTree(kpis, sources)}
      selected={selected}
      onMode={noop}
      onSelect={noop}
    />,
  );

describe("TreePanel", () => {
  it("shows the domain tree in domain mode", () => {
    const html = render("domain");
    expect(html).toContain("Economy");
    expect(html).toContain("Prices &amp; inflation");
    expect(html).toContain("Consumer prices");
    expect(html).not.toContain("National Bank of Poland");
    expect(html).toContain('aria-selected="true" class="selected">By domain');
  });

  it("shows the source tree in source mode", () => {
    const html = render("source");
    expect(html).toContain("National Bank of Poland");
    expect(html).not.toContain("Economy");
  });

  it("marks the selected node as current", () => {
    const html = render("domain", "economy.prices");
    expect(html.split('aria-current="true"').length - 1).toBe(1);
    const current = html.slice(html.indexOf('aria-current="true"'));
    expect(current.slice(0, current.indexOf("</button>"))).toContain("Prices &amp; inflation");
  });

  it("marks 'All KPIs' as current without a selection", () => {
    const html = render("domain");
    expect(html.split('aria-current="true"').length - 1).toBe(1);
    expect(html).toMatch(/aria-current="true">All KPIs<\/button>/);
  });
});

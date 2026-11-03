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

  it("says when no KPI matches in Polish with lang pl", () => {
    expect(renderToStaticMarkup(<KpiGrid kpis={[]} units={units} sources={sources} loading={false} error={null} lang="pl" />)).toContain(
      "Brak pasujących wskaźników.",
    );
  });
});

describe("KpiGrid with latest values (#325)", () => {
  const unemployment: GridKpi = {
    kpi_key: "unemployment_rate",
    name_pl: "Stopa bezrobocia (BAEL)",
    name_en: "Unemployment rate (LFS)",
    unit_key: "pct_labour_force",
    frequency_default: "A",
    geo_levels: ["country", "voivodeship"],
    first_period: "2000",
    last_period: "2025",
    loaded_at: "2026-01-01T00:00:00Z",
    source_keys: ["eurostat", "world_bank_wdi"],
  };
  const pct = { pct_labour_force: { symbol: "%", name_en: "% of labour force", is_rate: true } };
  // kpi/unemployment_rate/latest.json of the fixtures (eurostat PL 2025: 3.2, previous 2.9), with a voivodeship row and a later
  // World Bank row that the card must not pick.
  const latest = {
    unemployment_rate: {
      kpi_key: "unemployment_rate",
      unit_key: "pct_labour_force",
      generated_at: "2026-01-01T00:00:00Z",
      values: [
        {
          source_key: "world_bank_wdi",
          geography_key: "PL",
          geography_level: "country",
          period: "2025",
          value: 3.1,
          flags: [],
          checked_at: "",
        },
        {
          source_key: "eurostat",
          geography_key: "TERC:12",
          geography_level: "voivodeship",
          period: "2025",
          value: 2.6,
          flags: ["p"],
          checked_at: "",
        },
        {
          source_key: "eurostat",
          geography_key: "PL",
          geography_level: "country",
          period: "2025",
          value: 3.2,
          previous_period: "2024",
          previous_value: 2.9,
          flags: ["p"],
          checked_at: "",
        },
      ],
    },
  };
  const sources = { eurostat: "Eurostat", world_bank_wdi: "Bank Światowy – WDI", nbp: "Narodowy Bank Polski" };

  it("shows the national value of the first source, period, preliminary, a p.p. change and the source (PL)", () => {
    const html = renderToStaticMarkup(
      <KpiGrid kpis={[unemployment]} units={pct} sources={sources} latest={latest} loading={false} error={null} lang="pl" />,
    );
    expect(html).toContain('<p class="kpi-card-value">3,2%</p>');
    expect(html).toContain('2025<span class="kpi-prelim"> · dane wstępne</span>');
    expect(html).toContain("+0,3\u00a0p.p. wobec 2024");
    expect(html).toContain("Źródło: Eurostat");
    expect(html).toContain('class="kpi-facts small"');
    expect(html.indexOf("kpi-card-value")).toBeLessThan(html.indexOf("kpi-facts"));
  });

  it("shows the same card in English", () => {
    const html = renderToStaticMarkup(
      <KpiGrid kpis={[unemployment]} units={pct} sources={{ eurostat: "Eurostat" }} latest={latest} loading={false} error={null} />,
    );
    expect(html).toContain('<p class="kpi-card-value">3.2%</p>');
    expect(html).toContain("preliminary");
    expect(html).toContain("+0.3\u00a0pp vs 2024");
    expect(html).toContain("Source: Eurostat");
  });

  // kpi/population and kpi/gdp_current_prices of the zohelo-data latest fixtures (gdp: eurostat in mln_eur, preliminary).
  const levelUnits = {
    persons: { symbol: "os.", name_en: "persons", is_rate: false },
    mln_ncu: { symbol: "mln", name_en: "million, source currency", is_rate: false },
    mln_eur: { symbol: "mln EUR", name_en: "million euro", is_rate: false },
  };
  const gdp: GridKpi = { ...population, kpi_key: "gdp_current_prices", unit_key: "mln_ncu", source_keys: ["eurostat", "world_bank_wdi"] };
  const row = (value: number, previous_value: number, unit_key: string, flags: string[] = []) => ({
    source_key: "eurostat",
    geography_key: "PL",
    geography_level: "country",
    period: "2024",
    value,
    previous_period: "2023",
    previous_value,
    unit_key,
    flags,
    checked_at: "",
  });
  const levels = {
    population: {
      kpi_key: "population",
      unit_key: "persons",
      generated_at: "",
      values: [{ ...row(37_490_000, 37_640_000, "persons"), source_key: "gus_bdl" }],
    },
    gdp_current_prices: {
      kpi_key: "gdp_current_prices",
      unit_key: "mln_ncu",
      generated_at: "",
      values: [row(845_000, 750_000, "mln_eur", ["p"])],
    },
  };
  const cards = (lang?: "pl" | "en") =>
    renderToStaticMarkup(
      <KpiGrid
        kpis={[{ ...population, source_keys: ["gus_bdl"] }, gdp]}
        units={levelUnits}
        sources={sources}
        latest={levels}
        loading={false}
        error={null}
        lang={lang}
      />,
    );

  it("writes levels in compact form with the value's own unit, and GDP's change as nominal per cent (PL)", () => {
    const html = cards("pl");
    expect(html).toContain('<p class="kpi-card-value">37,5\u00a0mln</p>');
    expect(html).toContain("\u2212150\u00a0tys. (\u22120,4%) wobec 2023");
    expect(html).toContain('<p class="kpi-card-value">845\u00a0mld\u00a0EUR</p>');
    expect(html).toContain("+12,7% wobec 2023, nominalnie");
    expect(html).not.toContain("os.</p>");
  });

  it("writes the same cards in English without the Polish unit symbol", () => {
    const html = cards();
    expect(html).toContain('<p class="kpi-card-value">37.5\u00a0m</p>');
    expect(html).toContain("\u2212150k (\u22120.4%) vs 2023");
    expect(html).toContain('<p class="kpi-card-value">EUR\u00a0845\u00a0bn</p>');
    expect(html).toContain("+12.7% vs 2023, nominal");
    expect(html).not.toContain("os.</p>");
  });

  it("says there is no current value for a KPI in NO_LATEST", () => {
    const html = renderToStaticMarkup(
      <KpiGrid kpis={[fxRate]} units={units} sources={sources} latest={{ fx_rate: null }} loading={false} error={null} lang="pl" />,
    );
    expect(html).toContain("Brak bieżącej wartości");
    expect(html).not.toContain("kpi-card-value");
  });

  it("holds a placeholder while latest.json loads, and keeps metadata-only cards without latest", () => {
    expect(
      renderToStaticMarkup(<KpiGrid kpis={[population]} units={units} sources={sources} latest={{}} loading={false} error={null} />),
    ).toContain("skeleton-line");
    const bare = renderToStaticMarkup(<KpiGrid kpis={[population]} units={units} sources={sources} loading={false} error={null} />);
    expect(bare).not.toContain("kpi-current");
    expect(bare).toContain('class="kpi-facts"');
  });
});

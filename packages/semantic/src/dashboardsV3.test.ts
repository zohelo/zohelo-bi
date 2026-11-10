import { describe, expect, it } from "vitest";
import { v3ChartFit, validateDashboardV3, validateDashboardV3Catalog, type DashboardV3, type V3Catalog } from "./dashboardsV3";

const card = (over: object = {}) => ({
  kpi: "hicp",
  chart: "line-band",
  title_pl: "Inflacja {value}",
  title_en: "Inflation {value}",
  span: 12,
  ...over,
});

function dash(over: Partial<DashboardV3> = {}): DashboardV3 {
  return {
    schema: 3,
    id: "economy",
    domain_key: "economy",
    title_pl: "Gospodarka",
    title_en: "Economy",
    overview: { lead_pl: "Lead", lead_en: "Lead", kpis: ["hicp", "unemp", "gdp"] },
    pages: [
      {
        id: "prices",
        group_key: "economy.prices",
        title_pl: "Ceny",
        title_en: "Prices",
        lead_pl: "Lead",
        lead_en: "Lead",
        filters: ["period", "geography", "coicop"],
        kpis: ["hicp", "unemp", "gdp"],
        sections: [{ title_pl: "Trend", title_en: "Trend", cards: [card({ span: 8 }), card({ span: 4, chart: "ranked-bars" })] }],
      },
    ],
    ...over,
  } as DashboardV3;
}

const cat: V3Catalog = {
  domains: [
    { domain_key: "economy", level: "domain", parent_key: null },
    { domain_key: "economy.prices", level: "group", parent_key: "economy" },
  ],
  kpis: [
    {
      kpi_key: "hicp",
      unit_key: "pct",
      frequency: "M",
      group_key: "economy.prices",
      domain_key: "economy",
      geo_levels: ["country"],
      geographies: ["PL", "DE", "CZ", "SK", "HU", "EU27"],
      dimension_keys: ["coicop"],
      source_keys: ["eurostat"],
    },
    {
      kpi_key: "unemp",
      unit_key: "pct",
      frequency: "A",
      group_key: "economy.prices",
      domain_key: "economy",
      geo_levels: ["country", "voivodeship"],
      geographies: ["PL", "PL02", "PL04", "PL06", "PL08", "PL10", "PL12", "PL14", "PL16", "DE"],
      dimension_keys: ["sex", "age"],
      source_keys: ["gus_bdl", "eurostat"],
    },
    {
      kpi_key: "gdp",
      unit_key: "pln_bn",
      frequency: "A",
      group_key: "economy.prices",
      domain_key: "economy",
      geo_levels: ["country"],
      geographies: ["PL"],
      dimension_keys: ["nace"],
      source_keys: ["gus"],
    },
  ],
  dimensions: ["coicop", "sex", "age", "nace"].map((d) => ({ dimension_key: d, members: [{ key: "total" }, { key: `${d}_a` }] })),
  geographies: [
    { key: "PL", level: "country" },
    ...["PL02", "PL04", "PL06", "PL08", "PL10", "PL12", "PL14", "PL16"].map((key) => ({ key, level: "voivodeship" })),
    ...["DE", "CZ", "SK", "HU", "EU27"].map((key) => ({ key, level: "country" })),
  ],
};

const F = "dashboards/domains/economy.yaml";

describe("dashboard format v3: structure", () => {
  it("accepts a valid file", () => {
    expect(validateDashboardV3(dash(), F)).toEqual([]);
  });
  it("names the file and path, in Polish and English", () => {
    const d = dash();
    d.pages[0]!.sections[0]!.cards[1]!.chart = "pie" as never;
    expect(validateDashboardV3(d, F)).toEqual([
      `${F}: pages[0].sections[0].cards[1].chart: nieznany typ wykresu „pie” / unknown chart type "pie"`,
    ]);
  });
  it("requires the id to equal domain key and file name, and the page id to be the group suffix", () => {
    const d = dash({ id: "eco" });
    d.pages[0]!.group_key = "economy.money";
    const p = validateDashboardV3(d, F);
    expect(p.some((m) => m.includes("id: id musi być równe domain_key"))).toBe(true);
    expect(p.some((m) => m.includes("pages[0].group_key: musi być economy.prices"))).toBe(true);
  });
  it("checks KPI tile count, tokens, periods and bands", () => {
    const d = dash();
    d.pages[0]!.kpis = ["hicp"];
    d.pages[0]!.sections[0]!.cards[0] = card({ span: 8, title_pl: "{wartosc}", period: "3y", band: [3, 1] }) as never;
    const p = validateDashboardV3(d, F).join("\n");
    expect(p).toContain("pages[0].kpis: potrzeba 3–5 kafelków KPI");
    expect(p).toContain("nieznany znacznik {wartosc}");
    expect(p).toContain("cards[0].period: okres musi być jednym z 1y, 5y, 10y, max");
    expect(p).toContain("cards[0].band: pasmo to [dolna, górna]");
  });
  it("accepts explicit period bounds and rejects malformed ones", () => {
    const d = dash();
    d.pages[0]!.sections[0]!.cards[0] = card({ span: 8, period: { from: "2015", to: "2024-Q4" } }) as never;
    expect(validateDashboardV3(d, F)).toEqual([]);
    d.pages[0]!.sections[0]!.cards[0] = card({ span: 8, period: { from: "15" } }) as never;
    expect(validateDashboardV3(d, F).join()).toContain("period.from");
  });
  it("only allows the design template's card rows", () => {
    const d = dash();
    d.pages[0]!.sections[0]!.cards = [card({ span: 6 }), card({ span: 4 })] as never;
    expect(validateDashboardV3(d, F).join()).toContain("rząd kart 6+4 niedozwolony");
    d.pages[0]!.sections[0]!.cards = [card({ span: 4 }), card({ span: 4 }), card({ span: 4 }), card({ span: 12 })] as never;
    expect(validateDashboardV3(d, F)).toEqual([]);
  });
  it("caps a section at six chart cards and a page at eighteen (the sparkline table does not count)", () => {
    const d = dash();
    d.pages[0]!.sections = [
      { title_pl: "A", title_en: "A", cards: Array.from({ length: 7 }, () => card()) as never },
      { title_pl: "B", title_en: "B", cards: [card({ chart: "sparkline-table" })] as never },
    ];
    expect(validateDashboardV3(d, F).join()).toContain("najwyżej 6 kart z wykresem w sekcji (jest 7)");
    d.pages[0]!.sections = Array.from({ length: 4 }, (_, i) => ({
      title_pl: `S${i}`,
      title_en: `S${i}`,
      cards: Array.from({ length: 5 }, () => card()) as never,
    }));
    expect(validateDashboardV3(d, F).join()).toContain("na stronie (jest 20)");
  });
  it("checks section ids and navigation labels", () => {
    const d = dash();
    d.pages[0]!.sections = [
      { id: "growth", title_pl: "A", title_en: "A", nav_pl: "Wzrost", cards: [card()] as never },
      { id: "growth", title_pl: "B", title_en: "B", cards: [card()] as never },
      { id: "Bad Id", title_pl: "C", title_en: "C", nav_en: "x".repeat(40), cards: [card()] as never },
    ];
    const p = validateDashboardV3(d, F).join("\n");
    expect(p).toContain("powtórzone id sekcji");
    expect(p).toContain("id sekcji: małe litery");
    expect(p).toContain("nav_en");
    d.pages[0]!.sections = [{ id: "growth", title_pl: "A", title_en: "A", nav_pl: "Wzrost", nav_en: "Growth", cards: [card()] as never }];
    expect(validateDashboardV3(d, F)).toEqual([]);
  });
  it("rejects other schemas and non-objects", () => {
    expect(validateDashboardV3(dash({ schema: 2 as never }), F).join()).toContain("schema: 3");
    expect(validateDashboardV3(null, F)).toHaveLength(1);
  });
});

describe("dashboard format v3: catalogue", () => {
  it("accepts keys that exist", () => {
    expect(validateDashboardV3Catalog(dash(), F, cat)).toEqual([]);
  });
  it("reports unknown KPIs, geographies, dimensions and missing group pages", () => {
    const d = dash();
    d.pages[0]!.kpis = ["hicp", "unemp", "nope"];
    d.pages[0]!.filters = ["period", "colour"];
    d.pages[0]!.sections[0]!.cards[0] = card({ span: 8, geographies: ["XX"] }) as never;
    const c2 = { ...cat, domains: [...cat.domains, { domain_key: "economy.trade", level: "group", parent_key: "economy" }] };
    const p = validateDashboardV3Catalog(d, F, c2).join("\n");
    expect(p).toContain("pages[0].kpis[2]: nieznany KPI nope");
    expect(p).toContain("nieznany filtr lub wymiar colour");
    expect(p).toContain("nieznany obszar XX");
    expect(p).toContain("brak strony dla grupy economy.trade");
  });
  it("checks that a chart suits its KPI", () => {
    const fit = (c: object, k: string) =>
      v3ChartFit(
        c as never,
        cat.kpis.find((x) => x.kpi_key === k)!,
        cat,
      );
    expect(fit({ chart: "heatmap" }, "hicp")).toBeNull();
    expect(fit({ chart: "heatmap" }, "unemp")?.[1]).toBe("a heatmap needs monthly data");
    expect(fit({ chart: "pyramid" }, "unemp")).toBeNull();
    expect(fit({ chart: "pyramid" }, "hicp")?.[1]).toContain("sex and age");
    expect(fit({ chart: "tile-map" }, "unemp")).toBeNull();
    expect(fit({ chart: "tile-map" }, "hicp")?.[1]).toBe("needs voivodeship data");
    expect(fit({ chart: "segmented-bar" }, "gdp")?.[1]).toContain("needs split");
    expect(fit({ chart: "segmented-bar", split: "nace" }, "gdp")).toBeNull();
    expect(fit({ chart: "segmented-bar", split: "coicop" }, "hicp")?.[1]).toContain("additive");
    expect(fit({ chart: "ranked-bars" }, "gdp")?.[1]).toContain("Poland only");
    expect(fit({ chart: "scatter" }, "unemp")?.[1]).toContain("compare");
    expect(fit({ chart: "line-band", split: "sex" }, "hicp")?.[1]).toBe("hicp has no dimension sex");
  });
  it("contributions: needs split, a pp unit and at most 7 components", () => {
    const gdpc = {
      ...cat.kpis.find((x) => x.kpi_key === "gdp")!,
      kpi_key: "gdp_contrib",
      unit_key: "pp",
      dimension_keys: ["nace", "coicop"],
    };
    const wide = { dimension_key: "coicop", members: [{ key: "total" }, ...Array.from({ length: 8 }, (_, i) => ({ key: `c${i}` }))] };
    const c2: V3Catalog = {
      ...cat,
      kpis: [...cat.kpis, gdpc],
      dimensions: [...cat.dimensions.filter((d) => d.dimension_key !== "coicop"), wide],
    };
    expect(v3ChartFit({ chart: "contributions", split: "nace" } as never, gdpc, c2)).toBeNull();
    expect(v3ChartFit({ chart: "contributions" } as never, gdpc, c2)?.[1]).toContain("needs split");
    expect(
      v3ChartFit(
        { chart: "contributions", split: "nace" } as never,
        cat.kpis.find((x) => x.kpi_key === "gdp")!,
        c2,
      )?.[1],
    ).toBe("contributions need the unit pp (percentage points); pln_bn is not a contribution");
    expect(v3ChartFit({ chart: "contributions", split: "coicop" } as never, gdpc, c2)?.[1]).toBe(
      "coicop has 8 components; contributions show at most 7",
    );
    const d = dash();
    d.pages[0]!.sections[0]!.cards[0] = card({ span: 8, chart: "contributions" }) as never;
    expect(validateDashboardV3(d, F)).toEqual([]);
    expect(validateDashboardV3Catalog(d, F, cat).join()).toContain("potrzebuje pola split");
  });
  it("needs one unit across a bullet chart", () => {
    const d = dash();
    d.pages[0]!.sections[0]!.cards[1] = card({ span: 4, chart: "bullet", compare: ["gdp"] }) as never;
    expect(validateDashboardV3Catalog(d, F, cat).join()).toContain("gdp ma inną jednostkę niż hicp");
  });
  it("reports a filter no KPI of the page can use", () => {
    const d = dash();
    d.pages[0]!.filters = ["source", "nace"];
    d.pages[0]!.kpis = ["hicp", "hicp", "hicp"];
    const p = validateDashboardV3Catalog(d, F, cat).join("\n");
    expect(p).toContain("żaden KPI strony nie ma kilku źródeł");
    expect(p).toContain("żaden KPI strony nie ma wymiaru nace");
  });
});

describe("dashboard format v3: cross-domain summary", () => {
  const summary = (over: Partial<DashboardV3> = {}) =>
    dash({ id: "poland", domain_key: "poland", scope: "cross-domain", pages: [], ...over });
  it("needs no catalogue domain and no pages", () => {
    expect(validateDashboardV3(summary(), "dashboards/domains/poland.yaml")).toEqual([]);
    expect(validateDashboardV3Catalog(summary(), "dashboards/domains/poland.yaml", cat)).toEqual([]);
  });
  it("still checks its KPIs, and refuses a catalogue domain key or an unknown scope", () => {
    const p = validateDashboardV3Catalog(summary({ overview: { lead_pl: "L", lead_en: "L", kpis: ["nope", "hicp", "gdp"] } }), F, cat);
    expect(p.join()).toContain("nieznany KPI nope");
    const dom = summary({ id: "economy", domain_key: "economy" });
    expect(validateDashboardV3Catalog(dom, F, cat).join()).toContain("przegląd przekrojowy");
    expect(validateDashboardV3({ ...summary(), scope: "all" }, "dashboards/domains/poland.yaml").join()).toContain("scope");
  });
});

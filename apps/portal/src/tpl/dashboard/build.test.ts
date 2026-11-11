import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CHART_TYPES } from "@zohelo/visuals";
import { V3_CHART_TYPES, validateDashboardV3, validateDashboardV3Catalog, type DashboardV3, type V3Card } from "@zohelo/semantic";
import { dummy } from "../../data/dummy";
import type { Catalog, Series } from "../../data";
import { alignPeriod, buildCard, fillTokens, planCard, shiftYears, windowFor, type Built, type Plan } from "./build";
import { readState, withFilter } from "./state";

const cat: Catalog = await dummy.catalog();
const none = { members: {} };

async function draw(card: Partial<V3Card> & Pick<V3Card, "kpi" | "chart">, state = none, lang: "pl" | "en" = "pl"): Promise<Built> {
  const plan = planCard({ title_pl: "T {top}", title_en: "T {top}", ...card }, cat, state);
  if ("problem" in plan) throw new Error(plan.problem.en);
  return buildCard(plan, await fetchAll(plan), cat, lang);
}

async function fetchAll(plan: Plan): Promise<Record<string, Series[]>> {
  const out: Record<string, Series[]> = {};
  for (const f of plan.fetches) out[f.id] = await dummy.series(f.kpi, f.query);
  return out;
}

const ys = (b: Built, i = 0) => b.z.series[i]!.points.map((p) => p.y);

describe("periods", () => {
  it("shifts and aligns periods per frequency", () => {
    expect(shiftYears("2026-09", -10)).toBe("2016-09");
    expect(shiftYears("2026-Q2", -5)).toBe("2021-Q2");
    expect(alignPeriod("2015", "M", false)).toBe("2015-01");
    expect(alignPeriod("2015", "Q", true)).toBe("2015-Q4");
    expect(alignPeriod("2015-05", "Q", false)).toBe("2015-Q2");
  });
  it("builds windows clamped to the data", () => {
    const k = cat.kpis.find((x) => x.kpi_key === "hicp_annual_rate")!;
    expect(windowFor("5y", k)).toEqual({ from: "2021-09", to: "2026-09" });
    expect(windowFor("max", k).from).toBe("2010-01");
    expect(windowFor({ from: "2015" }, k, true)).toEqual({ from: "2015-09", to: "2026-09" });
    expect(windowFor({ from: "2000", to: "2030" }, k)).toEqual({ from: "2010-01", to: "2026-09" });
  });
});

describe("chart builders", () => {
  it("line-band: one hero series, band, max annotation, value token", async () => {
    const b = await draw({
      kpi: "hicp_annual_rate",
      chart: "line-band",
      band: [1.5, 3.5],
      annotate: "max",
      period: "10y",
      title_pl: "Inflacja: {value} ({period})",
    });
    expect(b.z.series).toHaveLength(1);
    expect(b.z.series[0]!.role).toBe("hero");
    expect(b.z.band).toEqual([1.5, 3.5]);
    expect(b.z.annotate?.x).toMatch(/^\d{4}-\d{2}$/);
    expect(b.z.ariaLabel).toMatch(/^Inflacja: -?\d+,\d%/);
    expect(b.sub).toContain("miesięcznie");
  });
  it("line-highlight: Poland hero and context neighbours", async () => {
    const b = await draw({ kpi: "hicp_annual_rate", chart: "line-highlight" });
    expect(b.z.series[0]).toMatchObject({ id: "PL", role: "hero" });
    expect(b.z.series.slice(1).every((s) => s.role === "context")).toBe(true);
    expect(b.z.series.map((s) => s.id)).toContain("EU27");
  });
  it("line-highlight over voivodeships keeps Poland and the extremes", async () => {
    const b = await draw({ kpi: "registered_unemployment", chart: "line-highlight" });
    expect(b.z.series.length).toBeLessThanOrEqual(6);
    expect(b.z.series[0]!.id).toBe("PL");
  });
  it("columns: annual values for rates, annual change for levels", async () => {
    const r = await draw({ kpi: "gdp_real_growth", chart: "columns" });
    expect(r.z.series[0]!.points.every((p) => /^\d{4}$/.test(p.x))).toBe(true);
    const l = await draw({ kpi: "exports_goods", chart: "columns" });
    expect(l.z.unit.symbol).toBe("%");
    expect(l.sub).toContain("zmiana r/r");
  });
  it("small-multiples: at most 9 panels on a shared scale", async () => {
    const b = await draw({ kpi: "registered_unemployment", chart: "small-multiples" });
    expect(b.z.series.length).toBe(9);
    expect(b.sub).toContain("wspólna skala");
  });
  it("area-share: member shares sum to 100 in every period", async () => {
    const b = await draw({ kpi: "electricity_generation", chart: "area-share", split: "fuel" });
    expect(b.z.series.map((s) => s.id)).toEqual(["coal", "gas", "res"]);
    const n = b.z.series[0]!.points.length;
    for (let i = 0; i < n; i++) expect(b.z.series.reduce((t, s) => t + (s.points[i]!.y ?? 0), 0)).toBeCloseTo(100, 0);
  });
  it("ranked-bars: sorted descending, Poland reference, top/bottom tokens", async () => {
    const b = await draw({ kpi: "gdp_per_capita_pps", chart: "ranked-bars", reference: "PL", title_pl: "{top} / {bottom}" });
    const v = ys(b).map((x) => x!);
    expect([...v].sort((a, c) => c - a)).toEqual(v);
    expect(b.z.categories).toHaveLength(16);
    expect(b.z.reference?.label).toMatch(/^Polska: /);
    expect(b.z.ariaLabel).toBe(`${b.z.categories![0]!.label} / ${b.z.categories![15]!.label}`);
  });
  it("tile-map: 16 voivodeships with short codes, highlight follows the geography filter", async () => {
    const b = await draw({ kpi: "registered_unemployment", chart: "tile-map" }, { members: {}, geo: "PL-14" } as never);
    expect(b.z.categories).toHaveLength(16);
    expect(b.z.categories!.find((c) => c.key === "PL-14")!.short).toBe("MZ");
    expect(b.z.highlight).toBe("PL-14");
  });
  it("grouped-bars, dumbbell, slope: two series = two years per category", async () => {
    for (const chart of ["grouped-bars", "dumbbell", "slope"] as const) {
      const b = await draw({ kpi: "employment_rate", chart, period: "10y" });
      expect(b.z.series.map((s) => s.id)).toEqual(["2016-Q2", "2026-Q2"]);
      expect(b.z.categories!.length).toBeGreaterThan(3);
    }
  });
  it("diverging-bars: change since the base year in pp for rates, sorted", async () => {
    const b = await draw({ kpi: "employment_rate", chart: "diverging-bars", period: "10y" });
    expect(b.z.unit.symbol).toBe("pp");
    const v = ys(b).map((x) => x!);
    expect([...v].sort((a, c) => c - a)).toEqual(v);
  });
  it("bullet: several KPIs of one unit against the band", async () => {
    const b = await draw({ kpi: "hicp_annual_rate", chart: "bullet", compare: ["cpi_annual_rate", "core_inflation"], band: [1.5, 3.5] });
    expect(b.z.series).toHaveLength(1);
    expect(b.z.categories!.map((c) => c.key)).toEqual(["hicp_annual_rate", "cpi_annual_rate", "core_inflation"]);
  });
  it("waterfall: member contributions to the change", async () => {
    const b = await draw({ kpi: "gva_by_section", chart: "waterfall", split: "nace", period: "5y" });
    expect(b.z.series).toHaveLength(1);
    expect(b.z.categories!.map((c) => c.key)).toEqual(["c", "f", "g", "j"]);
  });
  describe("contributions", () => {
    // A pp KPI split by a dimension with three members (the dummy catalogue may not have one yet).
    const base = cat.kpis.find((k) => k.kpi_key === "gdp_real_growth")!;
    const dim = cat.dimensions.find((d) => d.members.filter((m) => m.key !== "total").length === 3)!;
    const kpi = { ...base, kpi_key: "gdp_contrib", unit_key: "pp", dimension_keys: [dim.dimension_key] };
    const c2: Catalog = { ...cat, kpis: [...cat.kpis, kpi] };
    const keys = dim.members.filter((m) => m.key !== "total").map((m) => m.key);
    const card = {
      kpi: "gdp_contrib",
      chart: "contributions" as const,
      split: dim.dimension_key,
      title_pl: "PKB {value}",
      title_en: "GDP {value}",
    };
    const row = (member: string, vals: (number | null)[], periods: string[]): Series => ({
      kpi_key: "gdp_contrib",
      geography: "PL",
      source_key: base.source_keys[0]!,
      members: { [dim.dimension_key]: member },
      points: periods.map((period, i) => ({ period, value: vals[i]! })),
    });

    it("plans the members and the total over the last 5 years", () => {
      const plan = planCard(card, c2, none);
      if ("problem" in plan) throw new Error(plan.problem.en);
      expect(plan.fetches.map((f) => f.id)).toEqual(["main", "total"]);
      expect(plan.fetches[0]!.query.split).toBe(dim.dimension_key);
      expect(plan.fetches[1]!.query.split).toBeUndefined();
      expect(plan.fetches[1]!.query.members?.[dim.dimension_key]).toBeUndefined();
      expect(plan.main.from).toBe(shiftYears(kpi.last_period, -5));
    });
    it("maps members to signed components and the total member to the dot", () => {
      const plan = planCard(card, c2, none) as Plan;
      const ps = ["2025", "2026"];
      const res = {
        main: [row(keys[0]!, [2.1, -0.4], ps), row(keys[1]!, [-1.2, -0.3], ps), row(keys[2]!, [0.6, null], ps)],
        total: [{ ...row("total", [1.5, -0.7], ps), members: {} }],
      };
      const b = buildCard(plan, res, c2, "pl");
      expect(b.z.type).toBe("contributions");
      expect(b.z.series.map((s) => s.id)).toEqual(keys);
      expect(b.z.series[1]!.points).toEqual([
        { x: "2025", y: -1.2 },
        { x: "2026", y: -0.3 },
      ]);
      expect(b.z.total?.points).toEqual([
        { x: "2025", y: 1.5 },
        { x: "2026", y: -0.7 },
      ]);
      expect(b.z.total?.label).toBe(kpi.name_pl);
      expect(b.z.unit).toEqual({ symbol: "pp", isRate: true, decimals: 1 });
      expect(b.z.ariaLabel).toBe("PKB −0,7 pp");
      expect(b.sub).toContain("wkład, punkty procentowe");
      // without the total member, the dot is the sum of the components
      const s = buildCard(plan, { main: res.main }, c2, "en");
      expect(s.z.total?.points.map((p) => p.y)).toEqual([1.5, -0.7]);
    });
    it("refuses a card without split or with a unit that is not pp", () => {
      const p = planCard({ ...card, split: undefined }, c2, none);
      expect("problem" in p && p.problem.en).toMatch(/needs split/);
      const q = planCard({ ...card, kpi: "gva_by_section", split: "nace" }, c2, none);
      expect("problem" in q && q.problem.en).toMatch(/need the unit pp/);
    });
  });
  it("stacked-bars: shares per member for three periods", async () => {
    const b = await draw({ kpi: "gva_by_section", chart: "stacked-bars", split: "nace", period: "10y" });
    expect(b.z.categories!.map((c) => c.key)).toEqual(["2015", "2020", "2025"]);
    expect(b.z.series.reduce((t, s) => t + s.points[2]!.y!, 0)).toBeCloseTo(100, 0);
  });
  it("segmented-bar: one whole split into labelled parts", async () => {
    const b = await draw({ kpi: "electricity_generation", chart: "segmented-bar", split: "fuel" });
    expect(b.z.series).toHaveLength(1);
    expect(ys(b).reduce((t, v) => t! + v!, 0)).toBeCloseTo(100, 0);
  });
  it("pyramid: men and women by age band", async () => {
    const b = await draw({ kpi: "population_total", chart: "pyramid" });
    expect(b.z.series.map((s) => s.id)).toEqual(["m", "f"]);
    expect(b.z.categories!.map((c) => c.key)).toEqual(["y15_24", "y25_54", "y55_64"]);
  });
  it("histogram: voivodeships counted in equal bins with a median reference", async () => {
    const b = await draw({ kpi: "gdp_per_capita_pps", chart: "histogram" });
    expect(ys(b).reduce((t, v) => t! + v!, 0)).toBe(16);
    expect(b.z.reference?.label).toMatch(/^mediana /);
  });
  it("scatter: series x and y over the shared areas", async () => {
    const b = await draw({ kpi: "registered_unemployment", chart: "scatter", compare: ["gdp_per_capita_pps"] });
    expect(b.z.series.map((s) => s.id)).toEqual(["x", "y"]);
    expect(b.z.categories).toHaveLength(16);
  });
  it("heatmap: one monthly series over whole years (the chart lays out month × year)", async () => {
    const b = await draw({ kpi: "hicp_annual_rate", chart: "heatmap", period: "5y" });
    expect(b.z.series).toHaveLength(1);
    expect(b.z.series[0]!.points[0]!.x).toBe("2021-01");
    expect(b.z.series[0]!.points.at(-1)!.x).toBe("2026-09");
  });
  it("scatter and sparkline-table carry each series' unit", async () => {
    const s = await draw({ kpi: "registered_unemployment", chart: "scatter", compare: ["gdp_per_capita_pps"] });
    expect(s.z.series.map((x) => x.unit?.symbol)).toEqual(["pkt", "%"]);
    const t = await draw({ kpi: "hicp_annual_rate", chart: "sparkline-table", compare: ["avg_wage"] });
    expect(t.z.series.map((x) => x.unit?.symbol)).toEqual(["%", "zł"]);
  });
  it("sparkline-table: one series per indicator", async () => {
    const b = await draw({ kpi: "hicp_annual_rate", chart: "sparkline-table", compare: ["gdp_real_growth", "avg_wage"] });
    expect(b.z.series.map((s) => s.id)).toEqual(["hicp_annual_rate", "gdp_real_growth", "avg_wage"]);
    expect(b.z.series[0]!.label).toBe("Inflacja HICP, r/r");
  });
  it("says in the subtitle when a filter does not apply", async () => {
    const b = await draw({ kpi: "core_inflation", chart: "line-band" }, { members: { sex: "f" }, geo: "DE" } as never);
    expect(b.sub).toContain("brak danych dla: Niemcy");
    expect(b.sub).toContain("nie dotyczy");
  });
  it("refuses a chart that does not suit the KPI", () => {
    const p = planCard({ kpi: "gdp_real_growth", chart: "heatmap", title_pl: "x", title_en: "x" }, cat, none);
    expect("problem" in p && p.problem.pl).toMatch(/miesięcznych/);
  });
  it("fills tokens and leaves unknown ones", () => {
    expect(fillTokens("{top} i {nic}", { top: "Mazowieckie" })).toBe("Mazowieckie i {nic}");
  });
});

describe("filter state", () => {
  it("reads only declared filters with valid values", () => {
    const p = new URLSearchParams("period=5y&geo=PL-14&sex=f&level=bad&source=gus");
    expect(readState(p, ["period", "geography", "sex", "geo_level"], cat)).toEqual({ period: "5y", geo: "PL-14", members: { sex: "f" } });
  });
  it("reads a pre-contract voivodeship key as the contract's key", () => {
    expect(readState(new URLSearchParams("geo=PL14"), ["geography"], cat)).toEqual({ geo: "PL-14", members: {} });
  });
  it("writes a filter into the URL, keeping the others", () => {
    const u = new URL("https://bi.zohelo.com/d/economy/prices?period=5y");
    expect(withFilter(u, "geography", "DE")).toBe("/d/economy/prices?period=5y&geo=DE");
    expect(withFilter(u, "period", null)).toBe("/d/economy/prices");
  });
});

describe("domain dashboards", () => {
  const dir = new URL("../../../../../dashboards/domains/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));
  const dashboards = files.map((f) => [f, parse(readFileSync(new URL(f, dir), "utf8")) as DashboardV3] as const);

  it("the format's chart list is the chart library's minus the explorer-only types", () => {
    // Added with the user-layer brief (milestone 6): drawn by the library and used by the explorer; dashboard YAML
    // gets them when a domain expert asks for them (the card builder then needs a data plan for each).
    const explorerOnly = [
      "area",
      "stacked-area",
      "stacked-columns",
      "combo",
      "bump",
      "lollipop",
      "dot-plot",
      "ranking-table",
      "treemap",
      "boxplot",
      "choropleth",
      "ibcs-columns",
      "ibcs-bars",
      "variance-columns",
      "variance-bars",
      "bridge",
      // chart library v2 (2026-11-09): explorer and guide only until a dashboard asks for them
      "pie",
      "waffle",
      "strip",
      "fan",
      "symbol-map",
      "sankey",
      "kpi-card",
      "sparkline",
      "table",
      // chart catalogue (2026-11-09)
      "pareto",
    ];
    expect([...V3_CHART_TYPES]).toEqual(CHART_TYPES.filter((t) => !explorerOnly.includes(t)));
  });
  it("there is one valid dashboard per domain, every group a page, plus the cross-domain summary", () => {
    expect(files).toHaveLength(13);
    expect(dashboards.filter(([, d]) => d.scope === "cross-domain").map(([, d]) => d.id)).toEqual(["poland"]);
    for (const [f, d] of dashboards) {
      expect(validateDashboardV3(d, f)).toEqual([]);
      expect(validateDashboardV3Catalog(d, f, cat)).toEqual([]);
    }
  });
  it("uses every chart type at least twice", () => {
    const use = new Map<string, number>();
    for (const [, d] of dashboards)
      for (const s of [...(d.overview.sections ?? []), ...d.pages.flatMap((p) => p.sections)])
        for (const c of s.cards) use.set(c.chart, (use.get(c.chart) ?? 0) + 1);
    // contributions needs a pp KPI with a dimension; required here once the sample catalogue has one
    const drawable = (t: string) => t !== "contributions" || cat.kpis.some((k) => k.unit_key === "pp" && k.dimension_keys.length > 0);
    for (const t of V3_CHART_TYPES) if (drawable(t)) expect(use.get(t) ?? 0, t).toBeGreaterThanOrEqual(2);
  });
  it("every card builds data in both languages", async () => {
    for (const [, d] of dashboards)
      for (const s of [...(d.overview.sections ?? []), ...d.pages.flatMap((p) => p.sections)])
        for (const c of s.cards) {
          const plan = planCard(c, cat, none);
          expect("problem" in plan ? plan.problem.en : "", `${d.id} ${c.kpi} ${c.chart}`).toBe("");
          if ("problem" in plan) continue;
          const res = await fetchAll(plan);
          for (const lang of ["pl", "en"] as const) {
            const b = buildCard(plan, res, cat, lang);
            expect(b.empty, `${d.id} ${c.kpi} ${c.chart}`).toBe(false);
            expect(b.z.ariaLabel, `${d.id} ${c.kpi} ${c.chart}`).not.toMatch(/\{|–$/);
          }
        }
  });
});

describe("scorecard", () => {
  it("measures each row as its framework does and judges it by the yardstick", async () => {
    const b = await draw({
      kpi: "hicp_annual_rate",
      chart: "scorecard",
      framework: "maastricht",
      compare: ["gg_deficit_gdp", "gg_debt_gdp", "bond_yield_10y", "eurpln"],
      title_pl: "Kryteria: {met} z {judged}",
    });
    const rows = b.z.scorecard!;
    expect(rows.map((r) => r.id)).toEqual(["hicp_annual_rate", "gg_deficit_gdp", "gg_debt_gdp", "bond_yield_10y", "eurpln"]);
    expect(rows[0]!.measure).toBe("średnia 12 miesięcy");
    expect(rows[0]!.yardstick).toContain("2,7%");
    // The verdict follows the rule from the measured value.
    const hicp = rows[0]!;
    expect(hicp.verdict).toBe(hicp.value! <= 2.7 ? "meets" : "misses");
    expect(rows[4]!.verdict).toBe("misses"); // not in ERM II: a fixed verdict
    expect(rows.every((r) => r.eu !== undefined)).toBe(true);
    const met = rows.filter((r) => r.verdict === "meets").length;
    expect(b.facts.met).toBe(String(met));
    expect(b.facts.judged).toBe("5");
    expect(b.sub).toContain("Kryteria konwergencji z Maastricht");
  });
  it("a row without a threshold says so instead of judging", async () => {
    const b = await draw({ kpi: "employment_rate", chart: "scorecard", framework: "social", compare: ["arope_rate"] });
    expect(b.z.scorecard![1]!.verdict).toBe("none");
    expect(b.z.scorecard![1]!.yardstick).toContain("15 mln");
  });
});

import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { parseExplore, shapeOf } from "./exploreState";
import { buildView, fetchPlan } from "./view";

const cat = await dummy.catalog();
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);

async function view(qs: string) {
  const q = parseExplore(qs, cat);
  const shape = shapeOf(q, cat);
  const plan = fetchPlan(q, shape, cat);
  const series = (
    await Promise.all(plan.map((f) => dummy.series(f.kpi, { geographies: f.geographies, sources: [f.source], members: f.members })))
  ).flat();
  return { q, shape, plan, v: buildView(cat, q, shape, series, "pl") };
}

describe("fetch plan", () => {
  it("fetches all members of placed dimensions and only the filter member otherwise", async () => {
    const { plan } = await view(
      "?i=unemployment_lfs&geo=PL,DE&m.sex=m,f&m.age=y15_24,y25_54&chart=line&series=sex&panels=&f.age=y25_54&f.geo=DE",
    );
    expect(plan).toEqual([
      { kpi: "unemployment_lfs", source: "gus_bdl", geographies: ["DE"], members: { sex: "m", age: "y25_54" } },
      { kpi: "unemployment_lfs", source: "gus_bdl", geographies: ["DE"], members: { sex: "f", age: "y25_54" } },
    ]);
  });
  it("fetches all voivodeships for the map", async () => {
    const { plan } = await view(`?i=unemployment_lfs&lvl=woj&geo=PL14&chart=map`);
    expect(plan[0]!.geographies).toEqual(VOIV);
  });
});

describe("view", () => {
  it("draws one line per area with a finding title and a subtitle", async () => {
    const { v, shape } = await view("?i=hicp_annual_rate&geo=PL,EU27,DE&t=5y&chart=line&series=geo&panels=");
    expect(v.panels).toHaveLength(1);
    expect(v.panels[0]!.chart.type).toBe("line-highlight");
    expect(v.panels[0]!.chart.series.map((s) => s.id)).toEqual(["PL", "EU27", "DE"]);
    expect(v.title).toMatch(/^Najwyżej .+, najniżej .+/);
    expect(v.sub).toContain("miesięcznie");
    expect(v.sub).toContain("3 serie");
    expect(v.csv.rows).toHaveLength(3 * shape.periods.length);
    expect(v.live).toMatch(/^Wykres zaktualizowany: 3 serie, /);
  });
  it("indexes several indicators to the base year (mixed frequencies averaged to years)", async () => {
    const { v } = await view("?i=avg_wage,gdp_nominal,population_total&geo=PL&t=all&chart=line&series=i&panels=&cmp=index&base=2015");
    const s = v.panels[0]!.chart.series;
    expect(s).toHaveLength(3);
    for (const x of s) expect(x.points.find((p) => p.x === "2015")?.y).toBeCloseTo(100, 5);
    expect(v.sub).toMatch(/^indeks, 2015 = 100 · średnie roczne/);
    expect(v.notes.join(" ")).toMatch(/uśredniono do lat/);
    expect(v.csv.rows[0]!.at(-1)).toBe("indeks (2015 = 100)");
  });
  it("separate panels draw one chart per indicator with its own unit", async () => {
    const { v } = await view("?i=hicp_annual_rate,avg_wage&geo=PL,EU27&cmp=panels");
    expect(v.grid).toBe(true);
    expect(v.panels.map((p) => p.chart.unit.symbol)).toEqual(["%", "zł"]);
  });
  it("ranks areas at one period", async () => {
    const { v } = await view(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bars&cats=geo&series=`);
    const c = v.panels[0]!.chart;
    expect(c.type).toBe("ranked-bars");
    expect(c.categories).toHaveLength(16);
    expect(v.title).toMatch(/^Najwyżej .+, najniżej .+, 2025$/);
  });
  it("pivots rows × columns in a heatmap", async () => {
    const { v } = await view("?i=unemployment_lfs&geo=PL&t=5y&chart=heatmap&rows=age&cols=sex&m.sex=m,f&m.age=y15_24,y25_54,y55_64");
    const c = v.panels[0]!.chart;
    expect(c.type).toBe("heatmap");
    expect(c.series.map((s) => s.id)).toEqual(["y15_24", "y25_54", "y55_64"]);
    expect(c.categories?.map((k) => k.key)).toEqual(["m", "f"]);
    expect(v.title).toMatch(/^Najwyżej: /);
  });
  it("scatter states the correlation", async () => {
    const { v } = await view(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=scatter`);
    expect(v.panels[0]!.chart.series.map((s) => s.id)).toEqual(["x", "y"]);
    expect(v.title).toMatch(/r = -?\d,\d\d, 16 obszarów/);
  });
  it("names the cause when nothing has data", async () => {
    const { v } = await view("?i=hicp_annual_rate&geo=PL&from=2026&to=2026&chart=line");
    expect(v.empty ?? "").toBe("");
    const none = buildView(
      cat,
      parseExplore("?i=hicp_annual_rate&geo=PL", cat),
      shapeOf(parseExplore("?i=hicp_annual_rate&geo=PL", cat), cat),
      [],
      "pl",
    );
    expect(none.empty).toMatch(/^Brak wartości dla Inflacja HICP/);
  });
});

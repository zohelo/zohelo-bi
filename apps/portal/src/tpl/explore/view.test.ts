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
      "?i=unemployment_lfs&geo=PL,DE&m.sex=m,f&m.age=y15_24,y25_54&chart=line&x=t&leg=sex&sm=&f.age=y25_54&f.geo=DE",
    );
    expect(plan).toEqual([
      { kpi: "unemployment_lfs", source: "gus_bdl", geographies: ["DE"], members: { sex: "m", age: "y25_54" } },
      { kpi: "unemployment_lfs", source: "gus_bdl", geographies: ["DE"], members: { sex: "f", age: "y25_54" } },
    ]);
  });
  it("fetches all voivodeships for the map", async () => {
    const { plan } = await view(`?i=unemployment_lfs&lvl=woj&geo=PL-14&chart=map`);
    expect(plan[0]!.geographies).toEqual(VOIV);
  });
});

describe("view", () => {
  it("draws one line per area with a business title, a subtitle and a finding", async () => {
    const { v, shape } = await view("?i=hicp_annual_rate&geo=PL,EU27,DE&t=5y&chart=line&x=t&leg=geo&sm=");
    expect(v.panels).toHaveLength(1);
    expect(v.panels[0]!.chart.type).toBe("line-highlight");
    expect(v.panels[0]!.chart.series.map((s) => s.id)).toEqual(["PL", "EU27", "DE"]);
    expect(v.title).toMatch(/^Inflacja HICP, r\/r według krajów, sty 2022–wrz 2026$/);
    expect(v.finding).toMatch(/^Najwyżej .+, najniżej .+/);
    expect(v.sub).toContain("miesięcznie");
    expect(v.sub).toContain("3 serie");
    expect(v.csv.rows).toHaveLength(3 * shape.periods.length);
    expect(v.live).toMatch(/^Wykres zaktualizowany: Inflacja HICP/);
    expect(v.pivot.columns).toEqual(["Miesiąc", "Polska", "UE-27", "Niemcy"]);
    expect(v.pivot.rows).toHaveLength(shape.periods.length);
  });
  it("indexes several indicators to the base year (mixed frequencies averaged to years)", async () => {
    const { v } = await view("?i=avg_wage,gdp_nominal,population_total&geo=PL&t=all&chart=line&x=t&leg=i&sm=&cmp=index&base=2015");
    const s = v.panels[0]!.chart.series;
    expect(s).toHaveLength(3);
    for (const x of s) expect(x.points.find((p) => p.x === "2015")?.y).toBeCloseTo(100, 3);
    expect(v.sub).toMatch(/^indeks, 2015 = 100 · rocznie \(średnie z pełnych okresów\)/);
    expect(v.notes.join(" ")).toMatch(/różne częstotliwości/);
    expect(v.csv.rows[0]!.at(-1)).toBe("indeks (2015 = 100)");
  });
  it("separate panels draw one chart per indicator with its own unit", async () => {
    const { v } = await view("?i=hicp_annual_rate,avg_wage&geo=PL,EU27&cmp=panels");
    expect(v.grid).toBe(true);
    expect(v.panels.map((p) => p.chart.unit.symbol)).toEqual(["%", "zł"]);
  });
  it("ranks areas at one period", async () => {
    const { v } = await view(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bars&x=geo`);
    const c = v.panels[0]!.chart;
    expect(c.type).toBe("ranked-bars");
    expect(c.categories).toHaveLength(16);
    expect(v.title).toBe("Ludność według województw, 2025");
    expect(v.finding).toMatch(/^Najwyżej .+, najniżej .+\)$/);
  });
  it("pivots rows × columns in a heatmap", async () => {
    const { v } = await view("?i=unemployment_lfs&geo=PL&t=5y&chart=heatmap&rows=age&cols=sex&m.sex=m,f&m.age=y15_24,y25_54,y55_64");
    const c = v.panels[0]!.chart;
    expect(c.type).toBe("heatmap");
    expect(c.series.map((s) => s.id)).toEqual(["y15_24", "y25_54", "y55_64"]);
    expect(c.categories?.map((k) => k.key)).toEqual(["m", "f"]);
    expect(v.title).toBe("Stopa bezrobocia (BAEL) według wieku i płci, Polska, 2 kw. 2026");
    expect(v.finding).toMatch(/^Najwyżej: /);
    expect(v.pivot.columns).toEqual(["Wiek \\ Płeć", "mężczyźni", "kobiety"]);
  });
  it("scatter states the correlation", async () => {
    const { v } = await view(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=scatter`);
    expect(v.panels[0]!.chart.series.map((s) => s.id)).toEqual(["x", "y"]);
    expect(v.finding).toMatch(/r = -?\d,\d\d, 16 punktów/);
  });
  it("a bubble chart adds a size series; a seasonal view compares years month by month", async () => {
    const { v } = await view(
      `?i=gdp_per_capita_pps,disposable_income_pc,population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bubble&x=geo`,
    );
    expect(v.panels[0]!.chart.series.map((s) => s.id)).toEqual(["x", "y", "size"]);
    const s = await view("?i=avg_wage&geo=PL&t=5y&chart=line&x=t.moy&leg=t");
    expect(s.q.grain).toBe("y");
    expect(s.v.panels[0]!.chart.series.map((x) => x.id)).toEqual(["2021", "2022", "2023", "2024", "2025"]);
    expect(s.v.panels[0]!.chart.series[0]!.points).toHaveLength(12);
    expect(s.v.sub).toMatch(/^złote · miesięcznie/);
  });
  it("a chart that still needs a field draws nothing and says what is missing", async () => {
    const { v } = await view("?i=avg_wage&geo=PL&t=5y&chart=scatter&x=geo");
    expect(v.needs.map((n) => n.pl)).toEqual(["miarę w „Oś Y (miara)”"]);
    expect(v.panels).toEqual([]);
  });
  it("a measure without a placed breakdown shows its total, and the view says so", async () => {
    const { v } = await view("?i=unemployment_lfs,avg_wage&geo=PL&t=5y&chart=line&x=t&leg=sex&sm=i&m.sex=m,f&cmp=panels");
    expect(v.notes.join(" ")).toMatch(/Przeciętne wynagrodzenie brutto: bez podziału „Płeć”, pokazano wartość ogółem/);
    const wage = v.panels.find((p) => p.key === "avg_wage")!.chart.series;
    expect(wage.map((s) => s.id)).toEqual(["m", "f"]);
    expect(wage[0]!.points.map((p) => p.y)).toEqual(wage[1]!.points.map((p) => p.y));
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

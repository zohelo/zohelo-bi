import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, defaultQuery, exploreLink, normaliseQuery, parseExplore, serialiseExplore, shapeOf, windowOf } from "./exploreState";

const cat = await dummy.catalog();
const hicp = cat.kpis.find((k) => k.kpi_key === "hicp_annual_rate")!;
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);

describe("explorer URL state", () => {
  it("opens blank: no measures, nothing placed (owner review 2026-11-05)", () => {
    const q = parseExplore("", cat);
    expect(q).toMatchObject({ i: [], geo: [], chart: "line", slots: {}, mode: "edit" });
    expect(serialiseExplore(q)).toBe("?i=");
  });

  it("one measure opens as a line: time on the x axis, areas in the legend", () => {
    const q = parseExplore("?i=hicp_annual_rate", cat);
    expect(q).toMatchObject({ i: ["hicp_annual_rate"], level: "country", geo: ["PL", "EU27"], time: { last: 10 }, chart: "line" });
    expect(q.slots).toEqual({ x: "t", legend: "geo", sm: null });
    const s = shapeOf(q, cat);
    expect(s.window[1] - s.window[0]).toBe(9);
  });

  it("keeps the calendar level, hierarchies and the view mode in the URL", () => {
    const q = parseExplore("?i=avg_wage&geo=PL&t=5y&g=q&h=t&mode=view", cat);
    expect(q).toMatchObject({ grain: "q", hier: ["t"], mode: "view" });
    expect(shapeOf(q, cat).periods[0]).toMatch(/^\d{4}-Q\d$/);
    expect(serialiseExplore(q)).toContain("g=q");
    expect(serialiseExplore(q)).toContain("h=t");
    expect(serialiseExplore(q)).toContain("mode=view");
    expect(parseExplore(serialiseExplore(q), cat)).toEqual(q);
  });

  it("the blank explorer keeps fields laid out before a measure is chosen", () => {
    const q = parseExplore("?i=&chart=columns&x=t", cat);
    expect(q).toMatchObject({ i: [], chart: "columns", slots: { x: "t" } });
    expect(parseExplore(serialiseExplore(q), cat)).toEqual(q);
  });

  it("round-trips a full multi-indicator query", () => {
    const qs =
      "?i=avg_wage,population_total&src=population_total:eurostat&lvl=kraj&geo=PL,DE&from=2012&to=2020&chart=line&series=geo&panels=i&cmp=index&base=2015&m.sex=f,m";
    const q = parseExplore(qs, cat);
    expect(q.i).toEqual(["avg_wage", "population_total"]);
    expect(q.src).toEqual({ population_total: "eurostat" });
    expect(q.time).toEqual({ from: 2012, to: 2020 });
    expect(q.cmp).toBe("index");
    expect(q.base).toBe(2015);
    expect(q.members).toEqual({ sex: ["m", "f"] }); // dimensions of any measure (union); wages show their total
    expect(q.slots).toEqual({ x: "t", legend: "geo", sm: "i" }); // old series/panels names still read
    expect(parseExplore(serialiseExplore(q), cat)).toEqual(q);
  });

  it("keeps members of shared dimensions in catalogue order and drops a lone total", () => {
    const q = parseExplore("?i=unemployment_lfs&m.sex=f,m,xx&m.age=total", cat);
    expect(q.members).toEqual({ sex: ["m", "f"] });
    expect(serialiseExplore(q)).toContain("m.sex=m,f");
  });

  it("repairs invalid parts", () => {
    const q = parseExplore("?i=nope,hicp_annual_rate,hicp_annual_rate&lvl=woj&geo=XX&t=7y&chart=map&cmp=weird&base=1800", cat);
    expect(q.i).toEqual(["hicp_annual_rate"]);
    expect(q.level).toBe("country"); // HICP has no voivodeship data
    expect(q.geo).toEqual(["PL", "EU27"]);
    expect(q.time).toEqual({ last: 10 });
    expect(q.chart).toBe("line"); // the map needs voivodeships
    expect(q.cmp).toBe("same");
    expect(q.base).toBeNull();
  });

  it("caps the indicators at six", () => {
    const keys = cat.kpis.slice(0, 9).map((k) => k.kpi_key);
    expect(parseExplore(`?i=${keys.join(",")}`, cat).i).toHaveLength(6);
  });

  it("opens an empty query for ?i= (the blank state)", () => {
    const q = parseExplore("?i=", cat);
    expect(q.i).toEqual([]);
    expect(serialiseExplore(q)).toBe("?i=");
  });

  it("translates old single-indicator links", () => {
    const voivKpi = cat.kpis.find((k) => k.kpi_key === "unemployment_lfs")!;
    const map = parseExplore(`?kpi=${voivKpi.kpi_key}&lvl=woj&geo=PL14,PL02,XX&view=map`, cat);
    expect(map).toMatchObject({ i: ["unemployment_lfs"], level: "voivodeship", geo: ["PL14", "PL02"], chart: "map" });
    const split = parseExplore("?kpi=unemployment_lfs&lvl=kraj&geo=PL&src=eurostat&split=sex&from=2015&to=2020&view=line", cat);
    expect(split.members).toEqual({ sex: ["m", "f"] });
    expect(split.src).toEqual({ unemployment_lfs: "eurostat" });
    expect(split.time).toEqual({ from: 2015, to: 2020 });
    expect(split.slots.legend).toBe("sex");
    const bars = parseExplore("?kpi=hicp_annual_rate&geo=PL,DE,CZ&view=bars", cat);
    expect(bars.chart).toBe("bars");
    expect(parseExplore("?kpi=hicp_annual_rate&view=table", cat).chart).toBe("line");
  });

  it("builds explorer links in the new format and they open the same view", () => {
    const link = exploreLink(hicp, cat);
    expect(link).toBe("/explore?i=hicp_annual_rate&lvl=kraj&geo=PL,EU27&t=10y&chart=line&x=t&leg=geo&sm=");
    const unemp = cat.kpis.find((k) => k.kpi_key === "unemployment_lfs")!;
    const v = exploreLink(unemp, cat, { level: "voivodeship", view: "map" });
    expect(parseExplore(v.slice("/explore".length), cat).chart).toBe("map");
  });
});

describe("time window", () => {
  it("rolls the last N years and clamps fixed years", () => {
    expect(windowOf({ last: 5 }, [2010, 2026])).toEqual([2022, 2026]);
    expect(windowOf({ last: 0 }, [2010, 2026])).toEqual([2010, 2026]);
    expect(windowOf({ from: 2030, to: 2000 }, [2010, 2026])).toEqual([2010, 2026]);
    expect(windowOf({ from: 2020, to: 2015 }, [2010, 2026])).toEqual([2015, 2020]);
  });
  it("aligns mixed frequencies to the coarsest and keeps complete years only", () => {
    const s = shapeOf(normaliseQuery({ ...defaultQuery(cat), i: ["avg_wage", "population_total"] }, cat), cat);
    expect(s.freq).toBe("A");
    expect(s.mixed).toBe(true);
    expect(s.span[1]).toBe(2025); // 2026 has 9 months of wages only
    expect(s.periods.at(-1)).toBe("2025");
  });
});

describe("edits", () => {
  it("adding an indicator with another unit picks a compare mode and places the indicator", () => {
    const q0 = parseExplore("?i=avg_wage&geo=PL", cat);
    const q1 = applyPatch(q0, { i: ["avg_wage", "population_total"] }, cat);
    expect(q1.cmp).toBe("index");
    expect(Object.values(q1.slots)).toContain("i");
  });
  it("rates cannot be indexed, so different-unit rates fall back to separate panels", () => {
    const q = applyPatch(parseExplore("?i=hicp_annual_rate&geo=PL", cat), { i: ["hicp_annual_rate", "avg_wage"] }, cat);
    expect(q.cmp).toBe("panels");
    expect(q.slots.sm).toBe("i");
  });
  it("adding areas puts them in a free slot", () => {
    const q0 = parseExplore("?i=unemployment_lfs&geo=PL&chart=line&x=t&leg=&sm=", cat);
    expect(q0.slots).toEqual({ x: "t", legend: null, sm: null });
    const q1 = applyPatch(q0, { geo: ["PL", "DE"] }, cat);
    expect(q1.slots.legend).toBe("geo");
  });
  it("one period switches a line to ranked bars; 16 voivodeships over time pick the heatmap", () => {
    const q = parseExplore(`?i=unemployment_lfs&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(shapeOf(q, cat).periods.length).toBe(2); // quarterly: two quarters of 2026
    const a = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(a.chart).toBe("bars");
    expect(a.slots.x).toBe("geo");
    const h = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=10y`, cat);
    expect(h.chart).toBe("heatmap");
    expect(h.slots).toEqual({ rows: "geo", cols: "t" });
  });
  it("two indicators, one period and many areas default to a scatter", () => {
    const q = parseExplore(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(q.chart).toBe("scatter");
    expect(q.slots).toEqual({ x: "geo", sm: null });
  });
  it("any kind can be chosen: switching moves the placed fields to the new wells", () => {
    const q0 = parseExplore("?i=hicp_annual_rate&geo=PL,DE,CZ&t=5y", cat);
    const bars = applyPatch(q0, { chart: "bars" }, cat);
    expect(bars.chart).toBe("bars");
    expect(bars.slots.x).toBe("t"); // the x axis keeps time (bars of periods)
    const heat = applyPatch(q0, { chart: "heatmap" }, cat);
    expect(heat.slots).toEqual({ rows: "geo", cols: "t" }); // axis → columns, legend → rows (or as fits)
    const map = applyPatch(q0, { chart: "map" }, cat);
    expect(map.chart).toBe("line"); // HICP has no voivodeship data: the only kind that is impossible
  });
  it("a kind with a well per measure takes the measures in order (scatter X, Y; bubble size)", () => {
    const q = parseExplore(
      `?i=gdp_per_capita_pps,disposable_income_pc,population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bubble&x=geo`,
      cat,
    );
    expect(q.chart).toBe("bubble");
    expect(q.slots).toEqual({ x: "geo", sm: null });
  });
  it("drops filters of dimensions that are placed or unknown", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL,DE&chart=line&series=geo&f.geo=DE&f.t=2020&f.zz=1", cat);
    expect(q.filters).toEqual({});
    const b = parseExplore("?i=hicp_annual_rate&geo=PL,DE&t=5y&chart=bars&x=geo&f.t=2024-03", cat);
    expect(b.filters).toEqual({ t: "2024-03" });
  });
});

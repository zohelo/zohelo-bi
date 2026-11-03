import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, defaultQuery, exploreLink, normaliseQuery, parseExplore, serialiseExplore, shapeOf, windowOf } from "./exploreState";

const cat = await dummy.catalog();
const hicp = cat.kpis.find((k) => k.kpi_key === "hicp_annual_rate")!;
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);

describe("explorer URL state", () => {
  it("defaults to HICP for Poland and the EU-27 over the last ten years, as a line by area", () => {
    const q = parseExplore("", cat);
    expect(q).toMatchObject({ i: ["hicp_annual_rate"], level: "country", geo: ["PL", "EU27"], time: { last: 10 }, chart: "line" });
    expect(q.slots).toEqual({ series: "geo", panels: null });
    const s = shapeOf(q, cat);
    expect(s.window[1] - s.window[0]).toBe(9);
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
    expect(q.members).toEqual({}); // sex is not shared by both indicators
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

  it("opens an empty query for ?i= (the empty state)", () => {
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
    expect(split.slots.series).toBe("sex");
    const bars = parseExplore("?kpi=hicp_annual_rate&geo=PL,DE,CZ&view=bars", cat);
    expect(bars.chart).toBe("bars");
    expect(parseExplore("?kpi=hicp_annual_rate&view=table", cat).chart).toBe("line");
  });

  it("builds explorer links in the new format and they open the same view", () => {
    const link = exploreLink(hicp, cat);
    expect(link).toBe("/explore?i=hicp_annual_rate&lvl=kraj&geo=PL,EU27&t=10y&chart=line&series=geo&panels=");
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
    expect(q.slots.panels).toBe("i");
  });
  it("adding areas puts them in a free slot", () => {
    const q0 = parseExplore("?i=unemployment_lfs&geo=PL&chart=line&series=&panels=", cat);
    expect(q0.slots).toEqual({ series: null, panels: null });
    const q1 = applyPatch(q0, { geo: ["PL", "DE"] }, cat);
    expect(q1.slots.series).toBe("geo");
  });
  it("one period switches a line to ranked bars; 16 voivodeships over time pick the heatmap", () => {
    const q = parseExplore(`?i=unemployment_lfs&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(shapeOf(q, cat).periods.length).toBe(2); // quarterly: two quarters of 2026
    const a = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(a.chart).toBe("bars");
    expect(a.slots.cats).toBe("geo");
    const h = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=10y`, cat);
    expect(h.chart).toBe("heatmap");
    expect(h.slots).toEqual({ rows: "geo", cols: "t" });
  });
  it("two indicators, one period and many areas default to a scatter", () => {
    const q = parseExplore(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    expect(q.chart).toBe("scatter");
  });
  it("drops filters of dimensions that are placed or unknown", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL,DE&chart=line&series=geo&f.geo=DE&f.t=2020&f.zz=1", cat);
    expect(q.filters).toEqual({});
    const b = parseExplore("?i=hicp_annual_rate&geo=PL,DE&t=5y&chart=bars&cats=geo&f.t=2024-03", cat);
    expect(b.filters).toEqual({ t: "2024-03" });
  });
});

import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, parseExplore, shapeOf } from "./exploreState";
import { CHARTS, canPlace, fits, layoutIssues, missing, moveDim, possible, recommend, swapSlots } from "./layout";
import { pyPeriod } from "./view";
import { alignPoints, indexPoints, kpiPeriods, periodsBetween } from "./transform";

const cat = await dummy.catalog();
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
const at = (qs: string) => {
  const q = parseExplore(qs, cat);
  return { q, s: shapeOf(q, cat) };
};
const impossible = (qs: string) => {
  const { q, s } = at(qs);
  return CHARTS.filter((c) => !possible(c, s, q).ok);
};

describe("explorer v4 kinds (owner review 2026-11-05: do not grey out unless impossible)", () => {
  it("every kind can be chosen; only maps are impossible for measures without voivodeship data", () => {
    expect(impossible("?i=hicp_annual_rate&geo=PL&t=10y")).toEqual(["map", "choro"]);
    expect(impossible(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=5y`)).toEqual([]);
    expect(impossible("?i=")).toEqual([]);
  });
  it("an impossible kind carries a reason", () => {
    const { q, s } = at("?i=hicp_annual_rate&geo=PL");
    const v = possible("map", s, q);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason.pl).toMatch(/województw/);
  });
  it("a kind with empty required wells names what it still needs", () => {
    expect(missing("line", { i: [], slots: {} }).map((n) => n.key)).toEqual(["values", "x"]);
    expect(missing("scatter", { i: ["avg_wage"], slots: { x: "geo" } }).map((n) => n.pl)).toEqual(["miarę w „Oś Y (miara)”"]);
    expect(missing("bubble", { i: ["avg_wage", "population_total"], slots: { x: "geo" } }).map((n) => n.en)).toEqual([
      "a measure in “Size (measure)”",
    ]);
    expect(missing("line", { i: ["avg_wage"], slots: { x: "t" } })).toEqual([]);
  });
  it("switching to a kind keeps what fits and the canvas asks for the rest", () => {
    const { q } = at("?i=avg_wage&geo=PL&t=5y");
    const sc = applyPatch(q, { chart: "scatter" }, cat);
    expect(sc.chart).toBe("scatter");
    expect(missing("scatter", sc).length).toBeGreaterThan(0);
  });
  it("parts of a whole are recommended only for amounts that add up", () => {
    const parts = at("?i=population_total&geo=PL&t=5y&m.sex=m,f");
    expect(recommend(parts.s, parts.q, 6)).toContain("stacked");
    expect(fits("stacked", parts.s, parts.q)).toBe(true);
    const rates = at("?i=unemployment_lfs&geo=PL&t=5y&m.sex=m,f");
    expect(recommend(rates.s, rates.q, 6)).not.toContain("stacked");
  });
  it("the previous-year period keeps the sub-period", () => {
    expect(pyPeriod("2026-09")).toBe("2025-09");
    expect(pyPeriod("2026-Q2")).toBe("2025-Q2");
    expect(pyPeriod("2025")).toBe("2024");
  });
  it("recommends up to three kinds, the automatic one first", () => {
    const { q, s } = at(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`);
    const r = recommend(s, q);
    expect(r[0]).toBe("bars");
    expect(r).toContain("choro");
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe("automatic chart", () => {
  it("time series → line; one period by voivodeship → bars; many periods by voivodeship → heatmap", () => {
    expect(at("?i=population_total&geo=PL&t=10y").q.chart).toBe("line");
    expect(at(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`).q.chart).toBe("bars");
    expect(at(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=10y`).q.chart).toBe("heatmap");
    expect(at(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y`).q.chart).toBe("scatter");
  });
});

describe("wells", () => {
  it("time goes on the x axis; IBCS takes only periods; a map only areas; measures never in a dimension well of a scatter", () => {
    expect(canPlace("line", "x", "t")).toBe(true);
    expect(canPlace("bars", "x", "t")).toBe(true);
    expect(canPlace("heatmap", "cols", "t")).toBe(true);
    expect(canPlace("ibcs", "x", "geo")).toBe(false);
    expect(canPlace("map", "x", "t")).toBe(false);
    expect(canPlace("scatter", "x", "i")).toBe(false);
    expect(canPlace("line", "legend", "i")).toBe(true);
  });
  it("moving a dimension into an occupied well swaps them; swap exchanges the first two wells", () => {
    const { q } = at("?i=unemployment_lfs&geo=PL,DE&m.sex=m,f&chart=line&x=t&leg=geo&sm=sex");
    expect(moveDim(q, "legend", "sex")).toEqual({ x: "t", legend: "sex", sm: "geo" });
    expect(moveDim(q, "sm", null)).toEqual({ x: "t", legend: "geo", sm: null });
    expect(swapSlots(q)).toEqual({ x: "geo", legend: "t", sm: "sex" });
    const h = at("?i=unemployment_lfs&geo=PL,DE&t=5y&chart=heatmap&rows=geo&cols=t").q;
    expect(swapSlots(h)).toEqual({ rows: "t", cols: "geo" });
  });
  it("reports too many series and different units inline on the well", () => {
    const many = at(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&chart=line&x=t&leg=geo&sm=`);
    expect(layoutIssues(many.q, many.s).legend?.pl).toMatch(/Za dużo wartości \(16, maks\. 8\)/);
    const units = at("?i=avg_wage,population_total&geo=PL&chart=line&x=t&leg=i&sm=&cmp=same");
    expect(layoutIssues(units.q, units.s).legend?.pl).toMatch(/różne jednostki/);
    const idx = at("?i=avg_wage,population_total&geo=PL&chart=line&x=t&leg=i&sm=&cmp=index");
    expect(layoutIssues(idx.q, idx.s)).toEqual({});
  });
});

describe("transforms", () => {
  it("lists periods and complete aligned periods", () => {
    expect(periodsBetween("2025-Q3", "2026-Q2", "Q")).toEqual(["2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2"]);
    expect(kpiPeriods({ frequency: "M", first_period: "2024-01", last_period: "2025-06" }, "A")).toEqual(["2024"]);
    expect(kpiPeriods({ frequency: "M", first_period: "2024-01", last_period: "2025-06" }, "Q")).toHaveLength(6);
  });
  it("averages complete groups only", () => {
    const pts = [
      { x: "2024-Q1", y: 1 },
      { x: "2024-Q2", y: 2 },
      { x: "2024-Q3", y: 3 },
      { x: "2024-Q4", y: 6 },
      { x: "2025-Q1", y: 5 },
    ];
    expect(alignPoints(pts, "Q", "A")).toEqual([
      { x: "2024", y: 3 },
      { x: "2025", y: null },
    ]);
  });
  it("indexes to the base year mean = 100 and refuses a non-positive base", () => {
    const pts = [
      { x: "2015", y: 50 },
      { x: "2016", y: 75 },
      { x: "2017", y: null },
    ];
    expect(indexPoints(pts, 2015)).toEqual({
      ok: true,
      points: [
        { x: "2015", y: 100 },
        { x: "2016", y: 150 },
        { x: "2017", y: null },
      ],
    });
    expect(
      indexPoints(
        [
          { x: "2015-01", y: 1 },
          { x: "2015-02", y: 3 },
          { x: "2016-01", y: 4 },
        ],
        2015,
      ).points.at(-1)?.y,
    ).toBe(200);
    expect(indexPoints([{ x: "2015", y: -2 }], 2015).ok).toBe(false);
    expect(indexPoints([{ x: "2016", y: 2 }], 2015).ok).toBe(false);
  });
});

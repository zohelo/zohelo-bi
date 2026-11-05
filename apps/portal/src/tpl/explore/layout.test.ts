import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { parseExplore, shapeOf } from "./exploreState";
import { AUTO_CHARTS, CHARTS, canPlace, chartOk, layoutIssues, moveDim, recommend, swapSlots } from "./layout";
import { pyPeriod } from "./viewMore";
import { alignPoints, indexPoints, kpiPeriods, periodsBetween } from "./transform";

const cat = await dummy.catalog();
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
const valid = (qs: string) => {
  const q = parseExplore(qs, cat);
  const s = shapeOf(q, cat);
  return AUTO_CHARTS.filter((c) => chartOk(c, s, q).ok);
};
const validAll = (qs: string) => {
  const q = parseExplore(qs, cat);
  const s = shapeOf(q, cat);
  return CHARTS.filter((c) => !AUTO_CHARTS.includes(c) && chartOk(c, s, q).ok);
};

describe("explorer v3 kinds", () => {
  it("one indicator over time: area and the previous-year variance charts; no parts, no ranks", () => {
    expect(validAll("?i=population_total&geo=PL&t=10y")).toEqual(["area", "ibcs", "variance", "matrix"]);
  });
  it("parts of a whole need a breakdown; combo needs two indicators in one unit", () => {
    const parts = validAll("?i=population_total&geo=PL&t=5y&m.sex=m,f");
    expect(parts).toContain("stacked");
    expect(parts).toContain("share");
    // rates do not add up: no stacking of unemployment rates by sex
    expect(validAll("?i=unemployment_lfs&geo=PL&t=5y&m.sex=m,f")).not.toContain("stacked");
    expect(validAll("?i=cpi_annual_rate,hicp_annual_rate&geo=PL&t=10y")).toContain("combo");
    expect(validAll("?i=avg_wage,population_total&geo=PL&t=10y")).not.toContain("combo");
  });
  it("regions: the real map and the box plot need the voivodeship level", () => {
    const woj = validAll(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=5y`);
    expect(woj).toEqual(expect.arrayContaining(["choro", "boxplot", "bump"]));
    expect(validAll("?i=population_total&geo=PL&t=5y")).not.toContain("choro");
  });
  it("the previous-year period keeps the sub-period", () => {
    expect(pyPeriod("2026-09")).toBe("2025-09");
    expect(pyPeriod("2026-Q2")).toBe("2025-Q2");
    expect(pyPeriod("2025")).toBe("2024");
  });
  it("recommends up to three kinds, the automatic one first", () => {
    const q = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`, cat);
    const r = recommend(shapeOf(q, cat), q);
    expect(r[0]).toBe("bars");
    expect(r).toContain("choro");
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe("chart-type rules", () => {
  it("one indicator over time: line, heatmap only with two multi dimensions, columns up to 24 periods", () => {
    expect(valid("?i=population_total&geo=PL&t=10y")).toEqual(["line", "columns"]);
    expect(valid("?i=hicp_annual_rate&geo=PL&t=10y")).toEqual(["line"]); // 120 months: too many columns
    expect(valid("?i=population_total&geo=PL,DE&t=10y")).toEqual(["line", "columns", "bars", "dumbbell", "slope", "heatmap"]);
  });
  it("one period: no time charts; the map needs voivodeships; scatter needs two indicators and 3 areas", () => {
    const one = `?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y`;
    expect(valid(one)).toEqual(["bars", "map"]);
    expect(valid(`?i=population_total,gdp_per_capita_region&lvl=woj&geo=${VOIV.join(",")}&t=1y`)).toEqual([
      "bars",
      "heatmap",
      "map",
      "scatter",
    ]);
  });
  it("disabled types carry a reason", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL", cat);
    const v = chartOk("map", shapeOf(q, cat), q);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason.pl).toMatch(/Województwa/);
  });
});

describe("slots", () => {
  it("time is placeable only in the heatmap and the matrix", () => {
    expect(canPlace("heatmap", "cols", "t")).toBe(true);
    expect(canPlace("matrix", "cols", "t")).toBe(true);
    expect(canPlace("bars", "cats", "t")).toBe(false);
    expect(canPlace("line", "series", "t")).toBe(false);
    expect(canPlace("map", "series", "geo")).toBe(false);
  });
  it("moving a dimension into an occupied slot swaps them; swap exchanges the two slots", () => {
    const q = parseExplore("?i=unemployment_lfs&geo=PL,DE&m.sex=m,f&chart=line&series=geo&panels=sex", cat);
    expect(moveDim(q, "series", "sex")).toEqual({ series: "sex", panels: "geo" });
    expect(moveDim(q, "panels", null)).toEqual({ series: "geo", panels: null });
    expect(swapSlots(q)).toEqual({ series: "sex", panels: "geo" });
    const h = parseExplore("?i=unemployment_lfs&geo=PL,DE&t=5y&chart=heatmap&rows=geo&cols=t", cat);
    expect(swapSlots(h)).toEqual({ rows: "t", cols: "geo" });
  });
  it("reports too many series and different units inline on the slot", () => {
    const many = parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&chart=line&series=geo&panels=`, cat);
    expect(layoutIssues(many, shapeOf(many, cat)).series?.pl).toMatch(/Za dużo wartości \(16, maks\. 8\)/);
    const units = parseExplore("?i=avg_wage,population_total&geo=PL&chart=line&series=i&panels=&cmp=same", cat);
    expect(layoutIssues(units, shapeOf(units, cat)).series?.pl).toMatch(/różne jednostki/);
    const idx = parseExplore("?i=avg_wage,population_total&geo=PL&chart=line&series=i&panels=&cmp=index", cat);
    expect(layoutIssues(idx, shapeOf(idx, cat))).toEqual({});
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

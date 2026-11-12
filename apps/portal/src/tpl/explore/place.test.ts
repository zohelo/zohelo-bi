import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, parseExplore, shapeOf } from "./exploreState";
import { fitWell, missingIn, placePatch, removePatch, sensibleWell, wellOf, wellsOf } from "./place";

const cat = await dummy.catalog();
const at = (qs: string) => {
  const q = parseExplore(qs, cat);
  return { q, s: shapeOf(q, cat) };
};

describe("explorer v4 placement", () => {
  it("wells are values, the chart's wells (Oś X, Legenda, Małe wielokrotności…) and filters", () => {
    expect(wellsOf(at("?i=unemployment_lfs&geo=PL&chart=line").q)).toEqual(["values", "x", "legend", "sm", "filters"]);
    expect(wellsOf(at("?i=unemployment_lfs&geo=PL&t=1y&chart=bars").q)).toEqual(["values", "x", "legend", "sm", "filters"]);
  });
  it("measures go to values only; dimensions never to values", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line");
    expect(fitWell(q, s, cat, { kind: "kpi", key: "avg_wage" }, "values").ok).toBe(true);
    expect(fitWell(q, s, cat, { kind: "kpi", key: "avg_wage" }, "legend").ok).toBe(false);
    expect(fitWell(q, s, cat, { kind: "dim", key: "sex" }, "values").ok).toBe(false);
  });
  it("a breakdown a measure lacks is accepted: the measure shows its total (union of dimensions)", () => {
    const { q, s } = at("?i=population_total,avg_wage&geo=PL&chart=line");
    expect(fitWell(q, s, cat, { kind: "dim", key: "nace" }, "legend").ok).toBe(true);
    expect(missingIn(s.kpis, "nace").map((k) => k.kpi_key)).toEqual(["population_total"]);
  });
  it("time goes on the x axis; maps refuse other fields with a reason, the business look takes categories too", () => {
    const line = at("?i=unemployment_lfs&geo=PL&chart=line&x=&leg=&sm=");
    expect(fitWell(line.q, line.s, cat, { kind: "dim", key: "t" }, "x").ok).toBe(true);
    expect(sensibleWell(line.q, line.s, cat, { kind: "dim", key: "t", grain: "q" })).toBe("x");
    const map = at("?i=unemployment_lfs&lvl=woj&t=1y&chart=choro");
    const v = fitWell(map.q, map.s, cat, { kind: "dim", key: "sex" }, "x");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.why.pl).toMatch(/Geografia/);
    // An old IBCS link opens columns in the business look (looks.ts): areas may go on the axis (AC vs PY per area).
    const ibcs = at("?i=avg_wage&geo=PL&t=5y&chart=ibcs");
    expect(ibcs.q.chart).toBe("columns");
    expect(ibcs.q.v).toBe("column.ibcs");
    expect(fitWell(ibcs.q, ibcs.s, cat, { kind: "dim", key: "geo" }, "x").ok).toBe(true);
    const sc = at("?i=avg_wage,population_total&geo=PL,DE,CZ&t=1y&chart=scatter&x=geo");
    expect(fitWell(sc.q, sc.s, cat, { kind: "names", key: "i" }, "sm").ok).toBe(false);
  });
  it("+ puts a breakdown in the first free well and shows its parts", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line&x=t&leg=&sm=");
    const f = { kind: "dim" as const, key: "sex" };
    expect(sensibleWell(q, s, cat, f)).toBe("legend");
    const next = applyPatch(q, placePatch(q, s, cat, f, "legend")!, cat);
    expect(next.slots.legend).toBe("sex");
    expect(next.members.sex?.length).toBeGreaterThan(1);
    expect(wellOf(next, f)).toBe("legend");
    const back = applyPatch(next, removePatch(next, f), cat);
    expect(back.slots.legend).toBeFalsy();
  });
  it("placing the area in the legend widens a single area to several", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line&x=t&leg=&sm=");
    const p = placePatch(q, s, cat, { kind: "dim", key: "geo" }, "legend")!;
    expect(p.geo?.length).toBeGreaterThan(1);
  });
  it("Kalendarz levels set the grain; the whole hierarchy starts at years and can be drilled", () => {
    const { q, s } = at("?i=avg_wage&geo=PL&t=5y&chart=line&x=&leg=&sm=");
    const quarter = applyPatch(q, placePatch(q, s, cat, { kind: "dim", key: "t", grain: "q" }, "x")!, cat);
    expect(quarter).toMatchObject({ grain: "q", slots: { x: "t" }, hier: [] });
    const h = applyPatch(q, placePatch(q, s, cat, { kind: "dim", key: "t", hier: true }, "x")!, cat);
    expect(h).toMatchObject({ grain: "y", hier: ["t"] });
    const down = applyPatch(h, placePatch(h, shapeOf(h, cat), cat, { kind: "dim", key: "t", grain: "m", hier: true }, "x")!, cat);
    expect(down).toMatchObject({ grain: "m", hier: ["t"] });
  });
  it("fields laid out on the blank explorer stay when the first measure arrives", () => {
    let q = parseExplore("", cat);
    q = applyPatch(q, placePatch(q, shapeOf(q, cat), cat, { kind: "dim", key: "geo", level: "voivodeship" }, "x")!, cat);
    expect(q).toMatchObject({ i: [], level: "voivodeship", slots: { x: "geo" } });
    q = applyPatch(q, { i: ["unemployment_lfs"] }, cat);
    expect(q).toMatchObject({ chart: "columns", slots: { x: "geo" } }); // categories on x: columns, as Power BI
    expect(q.geo).toHaveLength(16);
    let t = parseExplore("", cat);
    t = applyPatch(t, placePatch(t, shapeOf(t, cat), cat, { kind: "dim", key: "t", hier: true }, "x")!, cat);
    t = applyPatch(t, { i: ["hicp_annual_rate"] }, cat);
    expect(t).toMatchObject({ chart: "line", grain: "y", hier: ["t"], slots: { x: "t", legend: "geo" } });
  });
  it("a longer time window does not move the period onto the chart", () => {
    const q = parseExplore("?i=population_total&lvl=woj&geo=PL-14,PL-02&t=1y&chart=bars&x=geo", cat);
    expect(applyPatch(q, { time: { last: 10 } }, cat)).toMatchObject({ chart: "bars", slots: { x: "geo", sm: null } });
  });
  it("Województwo on the axis shows every voivodeship", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&t=1y&chart=bars&x=&sm=");
    const next = applyPatch(q, placePatch(q, s, cat, { kind: "dim", key: "geo", level: "voivodeship" }, "x")!, cat);
    expect(next.level).toBe("voivodeship");
    expect(next.geo).toHaveLength(16);
    expect(next.slots.x).toBe("geo");
  });
});

import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, parseExplore, shapeOf } from "./exploreState";
import { fitWell, placePatch, removePatch, sensibleWell, wellOf, wellsOf } from "./place";

const cat = await dummy.catalog();
const at = (qs: string) => {
  const q = parseExplore(qs, cat);
  return { q, s: shapeOf(q, cat) };
};

describe("explorer v3 placement", () => {
  it("wells are values, the chart's slots and filters", () => {
    const { q } = at("?i=unemployment_lfs&geo=PL&chart=line");
    expect(wellsOf(q)).toEqual(["values", "series", "panels", "filters"]);
  });
  it("indicators go to values only; dimensions never to values", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line");
    expect(fitWell(q, s, cat, { kind: "kpi", key: "avg_wage" }, "values", "pl").ok).toBe(true);
    expect(fitWell(q, s, cat, { kind: "kpi", key: "avg_wage" }, "series", "pl").ok).toBe(false);
    const v = fitWell(q, s, cat, { kind: "dim", key: "sex" }, "values", "pl");
    expect(v.ok).toBe(false);
  });
  it("a breakdown the indicator lacks is refused with the indicator's name", () => {
    const { q, s } = at("?i=population_total&geo=PL&chart=line");
    const v = fitWell(q, s, cat, { kind: "dim", key: "nace" }, "series", "pl");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.why.pl).toMatch(/Ludność|Population/);
  });
  it("period goes to rows or columns only in the heatmap and the matrix", () => {
    const line = at("?i=unemployment_lfs&geo=PL&chart=line");
    expect(fitWell(line.q, line.s, cat, { kind: "dim", key: "t" }, "series", "pl").ok).toBe(false);
    const m = at("?i=unemployment_lfs&geo=PL&chart=matrix");
    expect(fitWell(m.q, m.s, cat, { kind: "dim", key: "t" }, "cols", "pl").ok).toBe(true);
  });
  it("+ puts a breakdown in the first free slot and shows its parts", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line&series=&panels=");
    const f = { kind: "dim" as const, key: "sex" };
    expect(sensibleWell(q, s, cat, f, "pl")).toBe("series");
    const next = applyPatch(q, placePatch(q, s, cat, f, "series", "pl")!, cat);
    expect(next.slots.series).toBe("sex");
    expect(next.members.sex?.length).toBeGreaterThan(1);
    expect(wellOf(next, f)).toBe("series");
    const back = applyPatch(next, removePatch(next, f), cat);
    expect(back.slots.series).toBeFalsy();
  });
  it("placing the area on a slot widens a single area to several", () => {
    const { q, s } = at("?i=unemployment_lfs&geo=PL&chart=line&series=&panels=");
    const p = placePatch(q, s, cat, { kind: "dim", key: "geo" }, "series", "pl")!;
    expect(p.geo?.length).toBeGreaterThan(1);
  });
});

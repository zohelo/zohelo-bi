import { describe, expect, it } from "vitest";
import { VARIANTS } from "@zohelo/visuals";
import { dummy } from "../../data/dummy";
import { CHARTS } from "./layout";
import { applyPatch, parseExplore, serialiseExplore, shapeOf } from "./exploreState";
import { KIND_VARIANT, VARIANT_BASE, currentVariant, variantVerdict } from "./variants";
import { LEGACY_KIND } from "./looks";
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
  return { q, v: buildView(cat, q, shape, series, "pl") };
}

describe("chart library variants in the explorer", () => {
  it("every library variant has a base kind and every kind a variant of its own", () => {
    for (const v of VARIANTS) expect(CHARTS).toContain(VARIANT_BASE[v.id]);
    // Old kinds that became a look of a wardrobe type may point at the type's base kind instead.
    for (const k of CHARTS) expect([k, LEGACY_KIND[k]?.chart]).toContain(VARIANT_BASE[KIND_VARIANT[k]]);
  });
  it("keeps a chosen variant in the URL and drops it when the kind changes", () => {
    const q = parseExplore("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.step", cat);
    expect(q.v).toBe("line.step");
    expect(serialiseExplore(q)).toContain("v=line.step");
    expect(currentVariant(q.chart, q.v).id).toBe("line.step");
    expect(applyPatch(q, { chart: "columns" }, cat).v).toBeNull();
    // A variant of another kind is ignored.
    expect(parseExplore("?i=avg_wage&geo=PL&chart=line&x=t&v=pie.donut", cat).v).toBeNull();
  });
  it("draws a variant as its own chart type with its options", async () => {
    const { v } = await view("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.step");
    expect(v.panels[0]!.chart.type).toBe("line-highlight");
    expect(v.panels[0]!.chart.opts?.step).toBe(true);
    const pie = await view("?i=population_total&geo=PL&t=1y&m.sex=m,f&chart=segmented&leg=sex&v=pie.donut");
    expect(pie.v.panels[0]!.chart.type).toBe("pie");
    expect(pie.v.panels[0]!.chart.opts?.donut).toBe(true);
  });
  it("builds the range band from the spread of the voivodeships", async () => {
    const { v } = await view(`?i=avg_wage&lvl=woj&geo=PL,${VOIV.join(",")}&t=5y&chart=area&x=t&leg=geo&v=area.range`);
    const z = v.panels[0]!.chart;
    expect(z.type).toBe("area");
    expect(z.series.map((s) => s.id)).toEqual(["PL", "lo", "hi"]);
  });
  it("a variant whose data the catalogue lacks is not drawn and says why", async () => {
    const band = VARIANTS.find((x) => x.id === "line.band")!;
    expect(variantVerdict(band, { voivodeships: true, periods: 10, years: 5, measures: 1 }).ok).toBe(false);
    const fan = VARIANTS.find((x) => x.id === "fan.percentile")!;
    expect(variantVerdict(fan, { voivodeships: true, periods: 10, years: 5, measures: 1 }).ok).toBe(false);
    const { v } = await view("?i=unemployment_lfs&geo=PL&t=5y&chart=line&x=t&v=fan.percentile");
    expect(v.panels).toHaveLength(0);
    expect(v.empty).toMatch(/projekcji/);
    // A locked look of a wardrobe type falls back to the type's default look and says why in the notes.
    const look = await view("?i=unemployment_lfs&geo=PL&t=5y&chart=line&x=t&v=line.band");
    expect(look.v.panels).toHaveLength(1);
    expect(look.v.notes.join(" ")).toMatch(/przedziałów ufności/);
  });
});

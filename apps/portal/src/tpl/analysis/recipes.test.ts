import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import type { Kpi } from "../../data";
import { RECIPES, analyseConvergence, analyseForecast, analyseRelation, analyseSeason, analyseTrend, nextPeriod } from "./recipes";

const cat = await dummy.catalog();
const kpi = (k: string) => cat.kpis.find((x) => x.kpi_key === k) as Kpi;
const total = async (k: string, geo = "PL") => {
  const s = await dummy.series(k, { geographies: [geo] });
  return { kpi: kpi(k), geo, points: (s.find((x) => Object.keys(x.members).length === 0) ?? s[0])!.points };
};
const ctx = { cat, lang: "pl" as const };

describe("analysis recipes", () => {
  it("every recipe's example indicators exist", () => {
    for (const r of RECIPES) for (const k of r.example) expect(kpi(k), `${r.id}: ${k}`).toBeTruthy();
  });
  it("steps periods forward", () => {
    expect(nextPeriod("2026-12")).toBe("2027-01");
    expect(nextPeriod("2026-Q4")).toBe("2027-Q1");
    expect(nextPeriod("2025")).toBe("2026");
  });
  it("trend: a growth rate for a level, points for a rate", async () => {
    const wage = analyseTrend(await total("avg_wage"), ctx);
    if (!wage.ok) throw new Error(wage.problem);
    expect(wage.finding).toMatch(/rośnie średnio o [\d,]+% rocznie/);
    expect(wage.cards[0]!.chart.series.map((s) => s.id)).toEqual(["y", "trend"]);
    const rate = analyseTrend(await total("registered_unemployment"), ctx);
    if (!rate.ok) throw new Error(rate.problem);
    expect(rate.facts[0]!.value).toMatch(/pp$/);
  });
  it("seasonality: refuses annual data, names the high and the low period", async () => {
    const annual = analyseSeason(await total("gdp_per_capita_region"), ctx);
    expect(annual.ok).toBe(false);
    const s = analyseSeason(await total("overnight_stays"), ctx);
    if (!s.ok) throw new Error(s.problem);
    expect(s.cards).toHaveLength(2);
    expect(s.cards[0]!.chart.categories).toHaveLength(12);
    // Calendar order: the first bar is January.
    expect(s.cards[0]!.chart.categories![0]!.label).toBe("sty");
    expect(s.finding).toMatch(/silna sezonowość, najwyżej/);
  });
  it("forecast: a year ahead with an interval that contains the point forecast", async () => {
    const f = analyseForecast(await total("avg_wage"), ctx);
    if (!f.ok) throw new Error(f.problem);
    const z = f.cards[0]!.chart;
    const y = z.series.find((s) => s.id === "y")!.points;
    const lo = z.series.find((s) => s.id === "lo")!.points.at(-1)!.y!;
    const hi = z.series.find((s) => s.id === "hi")!.points.at(-1)!.y!;
    expect(lo).toBeLessThan(y.at(-1)!.y!);
    expect(hi).toBeGreaterThan(y.at(-1)!.y!);
    expect(z.opts?.forecastFrom).toBe(nextPeriod(kpi("avg_wage").last_period));
    expect(f.facts.some((x) => /Metoda/.test(x.label))).toBe(true);
    expect(f.cautions.at(-1)).toMatch(/przedłuża dotychczasowy wzorzec/);
  });
  it("relationship: compares yearly changes and refuses mixed frequencies", async () => {
    const r = analyseRelation(await total("cpi_annual_rate"), await total("nbp_reference_rate"), ctx);
    if (!r.ok) throw new Error(r.problem);
    expect(r.finding).toMatch(/korelacja -?[\d,]+/);
    expect(r.cards[0]!.chart.type).toBe("scatter");
    expect(r.cautions[0]).toMatch(/nie oznacza przyczyny/);
    const mixed = analyseRelation(await total("avg_wage"), await total("gdp_per_capita_region"), ctx);
    expect(mixed.ok).toBe(false);
    const same = analyseRelation(await total("avg_wage"), await total("avg_wage"), ctx);
    expect(same.ok).toBe(false);
  });
  it("convergence: spread over time and catching-up across voivodeships", async () => {
    const voiv = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
    const series = await dummy.series("gdp_per_capita_region", { geographies: voiv });
    const c = analyseConvergence(
      {
        kpi: kpi("gdp_per_capita_region"),
        units: voiv.map((g) => ({ geo: g, points: series.find((s) => s.geography === g)?.points ?? [] })),
        scopePl: "województwami",
        scopeEn: "voivodeships",
      },
      ctx,
    );
    if (!c.ok) throw new Error(c.problem);
    expect(c.finding).toMatch(/różnice między województwami/);
    expect(c.cards.length).toBeGreaterThanOrEqual(1);
    expect(c.facts[0]!.label).toMatch(/Rozrzut w \d{4}/);
  });
});

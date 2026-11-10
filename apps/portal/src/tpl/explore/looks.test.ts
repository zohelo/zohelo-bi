import { describe, expect, it } from "vitest";
import type { ZChartProps } from "@zohelo/visuals";
import { dummy } from "../../data/dummy";
import { applyPatch, isIndexed, parseExplore, serialiseExplore, shapeOf } from "./exploreState";
import {
  LINE_LOOKS,
  LOOKS,
  SETTINGS,
  WARDROBE_TYPES,
  applyAreaSettings,
  applyBarSettings,
  applyColumnSettings,
  applyComboSettings,
  applyLineSettings,
  businessOf,
  changedSettings,
  currentLook,
  effectiveSettings,
  layoutOf,
  layoutSlots,
  lookContext,
  lookInEffect,
  lookUsable,
  looksOf,
  visibleSettings,
  type LookCtx,
} from "./looks";
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
  return { q, shape, v: buildView(cat, q, shape, series, "pl") };
}

const CTX: LookCtx = {
  rates: false,
  additive: true,
  grain: "y",
  timeX: true,
  seriesCount: 3,
  years: 10,
  hasPL: true,
  hasEU: false,
  layout: "legend",
};
const mk = (id: string, ...ys: number[]) => ({ id, label: id, points: ys.map((y, i) => ({ x: String(2020 + i), y })) });
const cats = (...keys: string[]) => keys.map((key) => ({ key, label: key }));

describe("the wardrobe (owner's outfits, 2026-11-09)", () => {
  it("every type has a blank look first, a default look, unique ids and only known setting values", () => {
    for (const t of WARDROBE_TYPES) {
      const ls = LOOKS[t];
      expect(ls[0]!.id).toBe(`${t}.blank`);
      expect(new Set(ls.map((l) => l.id)).size).toBe(ls.length);
      for (const l of ls)
        for (const [k, v] of Object.entries(l.settings)) {
          const def = SETTINGS[t].find((d) => d.key === k);
          expect(def, `${l.id}: setting ${k}`).toBeDefined();
          expect(
            def!.options.map((o) => o.value),
            `${l.id}: ${k}=${v}`,
          ).toContain(v);
        }
      expect(SETTINGS[t].length).toBeGreaterThanOrEqual(13);
    }
    expect(LINE_LOOKS[0]!.id).toBe("line.blank");
    expect(currentLook("line", null)!.id).toBe("line.multi");
    expect(currentLook("columns", null)!.id).toBe("column.simple");
    expect(currentLook("bars", null)!.id).toBe("bar.ranked");
    expect(currentLook("area", null)!.id).toBe("area.simple");
    expect(currentLook("combo", null)!.id).toBe("combo.column-line");
    expect(looksOf("scatter")).toBeUndefined();
  });

  it("a setting changed on top of a look marks it modified and lives in the URL", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL,EU27,DE&t=10y&chart=line&x=t&leg=geo&v=line.highlight&o.shape=step", cat);
    const look = currentLook(q.chart, q.v)!;
    expect(effectiveSettings(look, q.o)).toMatchObject({ emphasis: "hero", shape: "step" });
    expect(changedSettings(look, q.o)).toEqual(["shape"]);
    expect(serialiseExplore(q)).toContain("o.shape=step");
    // Another look starts from its own preset.
    expect(applyPatch(q, { v: "line.multi" }, cat).o).toEqual({});
    // A locked setting cannot be switched on.
    expect(effectiveSettings(look, { uncertainty: "band" }).uncertainty).toBe("off");
  });

  it("the index look indexes the series, but not rates (the lock wins over the URL)", () => {
    const wage = parseExplore("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.indexed", cat);
    expect(isIndexed(wage, shapeOf(wage, cat))).toBe(true);
    expect(isIndexed(parseExplore("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.indexed&o.scale=value", cat))).toBe(false);
    const rate = parseExplore("?i=hicp_annual_rate&geo=PL&t=5y&chart=line&x=t&o.scale=index", cat);
    expect(isIndexed(rate, shapeOf(rate, cat))).toBe(false);
  });

  it("reads the layout of the dimensions from the wells and lays them out for a look", () => {
    expect(layoutOf({ x: "t", legend: "geo" })).toBe("legend");
    expect(layoutOf({ x: "t" })).toBe("one");
    expect(layoutOf({ x: "t", sm: "geo" })).toBe("panels");
    expect(layoutOf({ x: "t.moy", legend: "t" })).toBe("seasonal");
    const q = parseExplore("?i=hicp_annual_rate&geo=PL,DE&t=10y&chart=line&x=t&leg=geo", cat);
    expect(layoutSlots(q, "panels", { grain: "m" })).toMatchObject({ legend: null, sm: "geo" });
    expect(layoutSlots(q, "seasonal", { grain: "m" })).toMatchObject({ x: "t.moy", legend: "t", sm: "geo" });
    expect(layoutSlots(q, "seasonal", { grain: "y" })).toBeUndefined();
    const one = parseExplore("?i=hicp_annual_rate&geo=PL&t=10y&chart=line&x=t&leg=&sm=", cat);
    expect(layoutSlots(one, "panels", { grain: "m" })).toBeUndefined();
  });

  it("locks looks and options the data cannot wear: stacking averages, business on one year, panels without series", () => {
    const wage = parseExplore(`?i=avg_wage&lvl=woj&geo=${VOIV.slice(0, 4).join(",")}&t=5y&chart=columns&x=t&leg=geo`, cat);
    const ctx = lookContext(wage, shapeOf(wage, cat));
    expect(ctx.additive).toBe(false);
    expect(
      lookUsable(
        LOOKS.column.find((l) => l.id === "column.stacked")!,
        wage,
        ctx,
      ),
    ).toBe(false);
    expect(
      lookUsable(
        LOOKS.column.find((l) => l.id === "column.clustered")!,
        wage,
        ctx,
      ),
    ).toBe(true);
    expect(effectiveSettings(currentLook("columns", "column.stacked")!, {}, ctx).stack).toBe("clustered");
    // A one-year window still compares with the previous year (the data span has it); one series has no panels.
    const oneYear = parseExplore("?i=avg_wage&geo=PL&t=1y&chart=columns&x=t", cat);
    const c1 = lookContext(oneYear, shapeOf(oneYear, cat));
    expect(
      lookUsable(
        LOOKS.column.find((l) => l.id === "column.ibcs")!,
        oneYear,
        c1,
      ),
    ).toBe(true);
    expect(
      lookUsable(
        LOOKS.column.find((l) => l.id === "column.panels")!,
        oneYear,
        c1,
      ),
    ).toBe(false);
    expect(
      lookUsable(
        LOOKS.column.find((l) => l.id === "column.ibcs")!,
        oneYear,
        { ...c1, years: 1 },
      ),
    ).toBe(false);
    // Rows the pane shows follow the data: no stacking choice without a series dimension.
    const look = currentLook("columns", null)!;
    expect(visibleSettings(look, effectiveSettings(look, {}, c1), c1).map((d) => d.key)).not.toContain("stack");
  });

  it("old links with folded kinds open the wardrobe type in the matching look", () => {
    const ibcs = parseExplore("?i=avg_wage&geo=PL&t=5y&chart=ibcs", cat);
    expect(ibcs.chart).toBe("columns");
    expect(ibcs.v).toBe("column.ibcs");
    expect(serialiseExplore(ibcs)).toContain("chart=columns");
    expect(parseExplore("?i=population_total&geo=PL&t=5y&m.sex=m,f&chart=stackcols&x=t&leg=sex", cat)).toMatchObject({
      chart: "columns",
      v: "column.stacked",
    });
    expect(parseExplore("?i=population_total&geo=PL&t=5y&m.sex=m,f&chart=share&x=t&leg=sex", cat)).toMatchObject({
      chart: "area",
      v: "area.percent",
    });
    expect(parseExplore(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bridge&x=geo`, cat)).toMatchObject({
      chart: "bars",
      v: "bar.bridge",
    });
    expect(applyPatch(ibcs, { chart: "varbars" }, cat)).toMatchObject({ chart: "bars", v: "bar.variance" });
  });

  it("a locked look falls back to the default look with the reason", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL&t=5y&chart=line&x=t&v=line.indexed", cat);
    const w = lookInEffect(q, shapeOf(q, cat), "pl")!;
    expect(w.look.id).toBe("line.multi");
    expect(w.fallback?.chosen.id).toBe("line.indexed");
    expect(w.fallback?.why).toMatch(/Indeks/);
  });

  it("line: hero, reference, band of the others, top N, extremes and the seasonal hero", () => {
    const base: ZChartProps = {
      type: "line-highlight",
      lang: "pl",
      unit: { symbol: "%", isRate: true, decimals: 1 },
      ariaLabel: "",
      series: [mk("PL", 3, 5), mk("DE", 1, 2), mk("CZ", 2, 6), mk("SK", 4, 1), mk("HU", 5, 3)],
    };
    const ref = applyLineSettings(
      base,
      { ...LINE_LOOKS.find((l) => l.id === "line.reference")!.settings, shape: "step", names: "legend" },
      "pl",
    );
    expect(ref.highlight).toBe("PL");
    expect(ref.series.find((s) => s.id === "DE")!.role).toBe("context");
    expect(ref.reference?.value).toBe(4);
    expect(ref.opts).toMatchObject({ step: true, endLabels: false, contextLabels: false });
    const look = LINE_LOOKS.find((l) => l.id === "line.highlight")!;
    const band = applyLineSettings(base, { ...look.settings, band: "minmax" }, "pl");
    expect(band.series.find((x) => x.id === "lo")!.points.map((p) => p.y)).toEqual([1, 1]);
    expect(band.opts?.intervalLabel).toBe("rozpiętość pozostałych");
    const top = applyLineSettings(base, { ...look.settings, top: "3" }, "pl");
    expect(top.series.map((x) => x.id).sort()).toEqual(["CZ", "HU", "PL"]);
    const ext = applyLineSettings(base, { ...look.settings, emphasis: "extremes" }, "pl");
    expect(ext.series.filter((x) => x.role === "series").map((x) => x.id)).toEqual(["CZ", "SK"]);
    expect(ext.highlight).toBeUndefined();
    // Clean: every series an equal ("series"), no implicit hero.
    const clean = applyLineSettings(base, LINE_LOOKS.find((l) => l.id === "line.multi")!.settings, "pl");
    expect(clean.series.every((s) => s.role === "series")).toBe(true);
    // Seasonal: the latest year is the hero and the band is the range of the previous years.
    const years: ZChartProps = { ...base, series: [mk("2022", 1, 2), mk("2023", 2, 3), mk("2024", 3, 4), mk("2025", 4, 5)] };
    const season = applyLineSettings(years, LINE_LOOKS.find((l) => l.id === "line.seasonal")!.settings, "pl", {
      ...CTX,
      layout: "seasonal",
    });
    expect(season.highlight).toBe("2025");
    expect(season.opts?.intervalLabel).toBe("rozpiętość poprzednich lat");
    expect(season.series.find((s) => s.id === "hi")!.points.map((p) => p.y)).toEqual([3, 4]);
  });

  it("column: stacking, 100%, top N with Pozostałe, sort, latest-period hero and labels", () => {
    const multi: ZChartProps = {
      type: "grouped-bars",
      lang: "pl",
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "",
      series: [mk("a", 5, 6), mk("b", 3, 2), mk("c", 1, 1), mk("d", 2, 2)],
    };
    const s = effectiveSettings(currentLook("columns", "column.stacked")!, {}, CTX);
    const stacked = applyColumnSettings(multi, s, "pl", CTX);
    expect(stacked.type).toBe("stacked-columns");
    expect(stacked.opts).toMatchObject({ percent: false, totals: true });
    const pct = applyColumnSettings(multi, { ...s, stack: "percent" }, "pl", CTX);
    expect(pct.opts?.percent).toBe(true);
    expect(pct.unit.symbol).toBe("%");
    const top = applyColumnSettings(multi, { ...s, stack: "clustered", top: "3" }, "pl", CTX);
    expect(top.series.map((x) => x.id)).toEqual(["a", "b", "d", "other"]);
    expect(top.series.find((x) => x.id === "other")!.points.map((p) => p.y)).toEqual([1, 1]);
    const noSum = applyColumnSettings(multi, { ...s, stack: "clustered", top: "3" }, "pl", { ...CTX, additive: false });
    expect(noSum.series.map((x) => x.id)).toEqual(["a", "b", "d"]);
    const single: ZChartProps = {
      type: "columns",
      lang: "pl",
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "",
      categories: cats("PL", "DE", "CZ", "EU27"),
      series: [
        {
          id: "v",
          label: "v",
          points: [
            { x: "PL", y: 3 },
            { x: "DE", y: 5 },
            { x: "CZ", y: 1 },
            { x: "EU27", y: 4 },
          ],
        },
      ],
    };
    const catCtx: LookCtx = { ...CTX, timeX: false, seriesCount: 0, hasEU: true };
    const ranked = applyColumnSettings(
      single,
      effectiveSettings(currentLook("columns", "column.ranked")!, { reference: "eu" }, catCtx),
      "pl",
      catCtx,
    );
    expect(ranked.categories!.map((c) => c.key)).toEqual(["DE", "EU27", "PL", "CZ"]);
    expect(ranked.highlight).toBe("PL");
    expect(ranked.reference).toEqual({ value: 4, label: "UE-27" });
    expect(ranked.opts?.contextBars).toBe(true);
    const top2 = applyColumnSettings(
      single,
      { ...effectiveSettings(currentLook("columns", "column.top")!, {}, catCtx), top: "3" },
      "pl",
      catCtx,
    );
    expect(top2.categories!.map((c) => c.key)).toEqual(["DE", "EU27", "PL", "other"]);
    const latest = applyColumnSettings(
      { ...single, categories: undefined },
      effectiveSettings(currentLook("columns", "column.latest")!, {}, CTX),
      "pl",
      CTX,
    );
    expect(latest.highlight).toBe("last");
    const labelled = applyColumnSettings(single, effectiveSettings(currentLook("columns", "column.labelled")!, {}, catCtx), "pl", catCtx);
    expect(labelled.opts).toMatchObject({ barLabels: "all", grid: false });
  });

  it("bar: ranked with benchmark, diverging, clustered and 100% bars", () => {
    const single: ZChartProps = {
      type: "ranked-bars",
      lang: "pl",
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "",
      categories: cats("PL", "DE", "EU27"),
      series: [
        {
          id: "v",
          label: "v",
          points: [
            { x: "PL", y: 3 },
            { x: "DE", y: -5 },
            { x: "EU27", y: 4 },
          ],
        },
      ],
    };
    const ctx: LookCtx = { ...CTX, timeX: false, seriesCount: 0, hasEU: true };
    const bm = applyBarSettings(single, effectiveSettings(currentLook("bars", "bar.benchmark")!, {}, ctx), "pl", ctx);
    expect(bm.type).toBe("ranked-bars");
    expect(bm.highlight).toBe("PL");
    expect(bm.opts).toMatchObject({ benchmark: "EU27", sort: "desc" });
    const div = applyBarSettings(single, effectiveSettings(currentLook("bars", "bar.diverging")!, {}, ctx), "pl", ctx);
    expect(div.type).toBe("diverging-bars");
    const multi: ZChartProps = { ...single, series: [mk("a", 5, 6), mk("b", 3, 2)], categories: cats("2020", "2021") };
    const cl = applyBarSettings(multi, effectiveSettings(currentLook("bars", "bar.clustered")!, {}, CTX), "pl", CTX);
    expect(cl.type).toBe("grouped-bars");
    expect(cl.opts?.horizontal).toBe(true);
    const pc = applyBarSettings(multi, effectiveSettings(currentLook("bars", "bar.percent")!, {}, CTX), "pl", CTX);
    expect(pc.type).toBe("stacked-columns");
    expect(pc.opts).toMatchObject({ horizontal: true, percent: true });
  });

  it("area: overlap, stacked, 100%, surplus and the range band around the hero", () => {
    const z: ZChartProps = {
      type: "area",
      lang: "pl",
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "",
      series: [mk("PL", 3, 5), mk("DE", 1, 2), mk("CZ", 2, 6)],
    };
    const simple = applyAreaSettings(z, effectiveSettings(currentLook("area", null)!, {}, CTX), "pl", CTX);
    expect(simple.type).toBe("area");
    expect(simple.opts).toMatchObject({ areaFill: "light", endLabels: true });
    const st = applyAreaSettings(z, effectiveSettings(currentLook("area", "area.stacked")!, {}, CTX), "pl", CTX);
    expect(st.type).toBe("stacked-area");
    const pc = applyAreaSettings(z, effectiveSettings(currentLook("area", "area.percent")!, {}, CTX), "pl", CTX);
    expect(pc.type).toBe("area-share");
    const rg = applyAreaSettings(z, effectiveSettings(currentLook("area", "area.range")!, {}, CTX), "pl", CTX);
    expect(rg.series.map((s) => s.id)).toEqual(["PL", "lo", "hi"]);
    expect(rg.opts?.range).toBe(true);
    const one: ZChartProps = { ...z, series: [mk("PL", 3, -2)] };
    const sp = applyAreaSettings(one, effectiveSettings(currentLook("area", "area.surplus")!, {}, { ...CTX, seriesCount: 0 }), "pl", {
      ...CTX,
      seriesCount: 0,
    });
    expect(sp.opts?.surplus).toBe(true);
    expect(sp.reference?.value).toBe(0);
  });

  it("combo: swap, line in the lead, labels and markers", () => {
    const z: ZChartProps = {
      type: "combo",
      lang: "pl",
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "",
      series: [mk("a", 1, 2), mk("b", 3, 4)],
    };
    const lead = applyComboSettings(z, effectiveSettings(currentLook("combo", "combo.line-lead")!, {}, CTX), "pl");
    expect(lead.opts).toMatchObject({ contextBars: true, lineColour: "series", markers: true, endLabels: true });
    const sw = applyComboSettings(z, effectiveSettings(currentLook("combo", null)!, { swap: "second", barLabels: "all" }, CTX), "pl");
    expect(sw.series.map((s) => s.id)).toEqual(["b", "a"]);
    expect(sw.opts?.barLabels).toBe("all");
    const soft = applyComboSettings(z, effectiveSettings(currentLook("combo", "combo.smooth")!, {}, CTX), "pl");
    expect(soft.opts).toMatchObject({ smooth: true, markers: false, barWidth: "narrow", grid: false });
  });

  it("business looks build AC vs PY over time or over categories, in the one palette (no black)", async () => {
    const time = await view("?i=avg_wage&geo=PL&t=5y&chart=columns&x=t&v=column.ibcs");
    expect(businessOf(time.q, time.shape)).toEqual({ type: "ibcs-columns", over: "time" });
    const z = time.v.panels[0]!.chart;
    expect(z.type).toBe("ibcs-columns");
    expect(z.series.map((s) => s.id)).toEqual(["PY", "AC"]);
    expect(time.v.spoken).toMatch(/wygląd Biznesowy: AC i PY/);
    const cats = await view(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bars&x=geo&v=bar.variance`);
    expect(businessOf(cats.q, cats.shape)).toEqual({ type: "variance-bars", over: "cats" });
    expect(cats.v.panels[0]!.chart.type).toBe("variance-bars");
    const bridge = await view(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bars&x=geo&v=bar.bridge`);
    expect(bridge.v.panels[0]!.chart.type).toBe("bridge");
    // Columns over areas in the business look: AC vs PY per area, drawn as IBCS columns.
    const colCats = await view(`?i=population_total&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=columns&x=geo&v=column.variance`);
    expect(colCats.v.panels[0]!.chart.type).toBe("variance-columns");
  });

  it("the built view follows the look: stacked columns, bar ranking, area band, small multiples", async () => {
    const st = await view("?i=population_total&geo=PL&t=5y&m.sex=m,f&chart=columns&x=t&leg=sex&v=column.stacked");
    expect(st.v.panels[0]!.chart.type).toBe("stacked-columns");
    const avg = await view(`?i=avg_wage&lvl=woj&geo=${VOIV.slice(0, 3).join(",")}&t=5y&chart=columns&x=t&leg=geo&v=column.stacked`);
    expect(avg.v.panels[0]!.chart.type).toBe("grouped-bars");
    expect(avg.v.notes.join(" ")).toMatch(/Skumulowane.*niedostępny/);
    const bars = await view(`?i=unemployment_lfs&lvl=woj&geo=${VOIV.join(",")}&t=1y&chart=bars&x=geo&v=bar.top`);
    const bz = bars.v.panels[0]!.chart;
    expect(bz.type).toBe("ranked-bars");
    expect(bz.categories!.length).toBeLessThanOrEqual(6);
    expect(bars.v.notes.join(" ")).toMatch(/5 najwyższych/);
    const panels = await view("?i=hicp_annual_rate&geo=PL,DE,CZ&t=5y&chart=line&x=t&sm=geo&v=line.panels");
    expect(panels.v.panels[0]!.chart.type).toBe("small-multiples");
    const colPanels = await view("?i=hicp_annual_rate&geo=PL,DE,CZ&t=5y&chart=columns&x=t&sm=geo&v=column.panels");
    expect(colPanels.v.grid).toBe(true);
    expect(colPanels.v.panels).toHaveLength(3);
  });
});

import { createRequire } from "node:module";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { CHART_SAMPLES } from "./samples";
import { EXTRA_VARIANT_SAMPLES } from "./samplesExtra";
import { VARIANT_BY_ID, VARIANTS, ZChart, buildScene, legendItems, toTable } from "./index";
import { pieParts, waffleParts } from "./drawPart";
import { paretoRows } from "./drawPareto";
import { histogramShares } from "./drawOther";
import { VARIANT_SAMPLES } from "./samplesVariants";
import { beeswarm, divergence, fanModel } from "./drawSpread";
import { sankeyLayout, symbolLegendValues, symbolRadius } from "./drawFlow";
import { kpiModel, tableRows } from "./drawCards";
import type { ChartSample, ZChartProps } from "./types";

const req = createRequire(new URL("../../../../apps/portal/package.json", import.meta.url));
const { renderToString } = req("react-dom/server") as { renderToString: (el: ReactElement) => string };
const html = (p: ZChartProps, width = 640) => renderToString(<ZChart {...p} width={width} />);
const fills = (h: string, color: string) => [...h.matchAll(/<(?:path|rect|circle)[^>]*>/g)].filter((m) => m[0].includes(`fill="${color}"`));
const V = EXTRA_VARIANT_SAMPLES;

const EXTRA = ["pie", "waffle", "strip", "fan", "symbol-map", "sankey", "kpi-card", "sparkline", "table", "pareto"];

describe("variant samples", () => {
  it("one sample per library variant drawn by a v2 type, with exactly the variant's chart and options", () => {
    const ids = VARIANTS.filter((v) => EXTRA.includes(v.chart))
      .map((v) => v.id)
      .sort();
    expect(Object.keys(V).sort()).toEqual(ids);
    for (const [id, s] of Object.entries(V)) {
      const v = VARIANT_BY_ID[id]!;
      expect(s.type, id).toBe(v.chart);
      expect(s.opts, id).toEqual(v.opts);
    }
  });

  for (const [id, s] of Object.entries(EXTRA_VARIANT_SAMPLES))
    it(`${id} renders at desktop and phone width with a table and read-out`, () => {
      for (const w of [1100, 640, 360]) {
        const h = html(s, w);
        expect(h).not.toMatch(/NaN|undefined|Infinity/);
        expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        for (const m of h.matchAll(/font-size:\s*([\d.]+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(11);
        for (const m of h.matchAll(/<text[^>]*fill="([^"]+)"/g)) expect(m[1]).toMatch(/^var\(--(ink|ink-2|ink-3|ink-muted|on-inverse)\)$/);
      }
      const scene = buildScene(s, 640);
      expect(scene.stops.length).toBeGreaterThan(0);
      for (const st of scene.stops) {
        expect(st.title).toBeTruthy();
        expect(st.rows.length).toBeGreaterThan(0);
      }
      const t = toTable(s);
      expect(t.rows.length).toBeGreaterThan(0);
      for (const r of t.rows) expect(r.length).toBe(t.columns.length);
      for (const it of legendItems(s)) expect(it.color).toMatch(/^var\(--[a-z0-9-]+\)$/);
      for (const k of ["title", "sub", "ariaLabel"] as const) expect(s[k].length).toBeGreaterThan(2);
    });
});

describe("pie", () => {
  it("folds more than 5 parts into Pozostałe in series-context, keeping the 4 largest in key order", () => {
    const { parts } = pieParts(CHART_SAMPLES.pie);
    expect(parts.map((p) => p.label)).toEqual(["Węgiel kamienny", "Węgiel brunatny", "Gaz ziemny", "Wiatr", "Pozostałe"]);
    expect(parts.map((p) => p.color)).toEqual([
      "var(--series-1)",
      "var(--series-2)",
      "var(--series-3)",
      "var(--series-4)",
      "var(--series-context)",
    ]);
    expect(parts[4]!.value).toBeCloseTo(26.2, 6);
    expect(parts[4]!.folded.map((f) => f.label)).toEqual(["Słońce", "Biomasa i biogaz", "Woda", "Inne paliwa"]);
    expect(parts.reduce((a, p) => a + p.share, 0)).toBeCloseTo(1, 9);
  });
  it("labels shares directly, lists the folded parts in the read-out and keeps every part in the table", () => {
    const h = html(CHART_SAMPLES.pie);
    expect(h).toContain(">36%<");
    expect(h).toContain(">Pozostałe<");
    const stop = buildScene(CHART_SAMPLES.pie, 640).stops[4]!;
    expect(stop.rows.map((r) => r.label)).toEqual(["Produkcja", "Słońce", "Biomasa i biogaz", "Woda", "Inne paliwa"]);
    expect(toTable(CHART_SAMPLES.pie).rows).toHaveLength(8);
    expect(legendItems(CHART_SAMPLES.pie)).toHaveLength(5);
  });
  it("does not fold 5 parts; the phone layout keeps the folded label", () => {
    const five = {
      ...CHART_SAMPLES.pie,
      series: [{ ...CHART_SAMPLES.pie.series[0]!, points: CHART_SAMPLES.pie.series[0]!.points.slice(0, 5) }],
    };
    expect(pieParts(five).parts.map((p) => p.color)).not.toContain("var(--series-context)");
    expect(html(CHART_SAMPLES.pie, 360)).toContain(">Pozostałe<");
  });
  it("donut: a ring with the total in the centre", () => {
    const h = html(V["pie.donut"]!);
    expect(h).toContain(">37,6 mln<");
    expect(h).toContain(">razem<");
    expect(h).toMatch(/<path d="M[^"]*A[^"]*A[^"]*Z"/); // outer and inner arc
  });
});

describe("waffle", () => {
  it("a share in % fills that many of 100 squares, the rest stays empty", () => {
    const w = waffleParts(CHART_SAMPLES.waffle);
    expect(w.parts[0]!.cells).toBe(27);
    expect(w.rest).toBe(73);
    const h = html(CHART_SAMPLES.waffle);
    expect(fills(h, "var(--series-1)")).toHaveLength(27 + 1); // cells and the label swatch
    expect(fills(h, "var(--surface-muted)")).toHaveLength(73 + 1);
  });
  it("other units split 100 squares in proportion (largest remainder)", () => {
    const p = {
      ...CHART_SAMPLES.waffle,
      unit: { symbol: "osób", isRate: false, decimals: 0 },
      series: [{ id: "a", label: "A", points: ["x", "y", "z"].map((x) => ({ x, y: 1 })) }],
    };
    expect(waffleParts(p).parts.map((q) => q.cells)).toEqual([34, 33, 33]);
    expect(waffleParts(p).rest).toBe(0);
  });
});

describe("strip and beeswarm", () => {
  it("beeswarm packs dots without overlap", () => {
    const xs = Array.from({ length: 400 }, (_, i) => 100 + ((i * 37) % 97) * 1.3 + (i % 5));
    const rad = 3;
    const off = beeswarm(xs, rad);
    for (let i = 0; i < xs.length; i++)
      for (let j = i + 1; j < xs.length; j++) expect(Math.hypot(xs[i]! - xs[j]!, off[i]! - off[j]!)).toBeGreaterThanOrEqual(2 * rad - 1e-6);
  });
  it("the beeswarm sample has no overlapping dots in either row", () => {
    const s = V["strip.beeswarm"]!;
    const scene = buildScene(s, 640);
    const h = html(s);
    const radii = [...h.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map((m) => Number(m[1]));
    const rad = Math.min(...radii);
    const n = s.series[0]!.points.length;
    expect(scene.stops).toHaveLength(2 * n);
    for (const row of [scene.stops.slice(0, n), scene.stops.slice(n)])
      for (let i = 0; i < row.length; i++)
        for (let j = i + 1; j < row.length; j++)
          expect(Math.hypot(row[i]!.x - row[j]!.x, row[i]!.y - row[j]!.y)).toBeGreaterThanOrEqual(2 * rad - 0.2);
  });
  it("highlights one unit in every row and labels it", () => {
    const s = V["strip.beeswarm"]!;
    for (const g of s.series) expect(Math.max(...g.points.map((p) => p.y ?? 0))).toBe(g.points.find((p) => p.x === s.highlight)!.y);
    const h = html(s);
    expect(h).toContain(">powiat szydłowiecki 21,9%<");
    expect(fills(h, "var(--series-1)")).toHaveLength(2);
  });
  it("jitter is deterministic", () => {
    expect(html(CHART_SAMPLES.strip)).toBe(html(CHART_SAMPLES.strip));
  });
  it("table: one row per unit and the median per group", () => {
    const t = toTable(CHART_SAMPLES.strip);
    expect(t.columns).toEqual(["Jednostka", "2005", "2015", "2025"]);
    expect(t.rows).toHaveLength(17);
    expect(t.rows.at(-1)![0]).toBe("Mediana");
  });
});

describe("fan", () => {
  it("percentile bands from the outer to the inner one, the central line solid then dashed", () => {
    const m = fanModel(CHART_SAMPLES.fan);
    expect(m.bands.map((b) => b.fill)).toEqual(["var(--band)", "var(--seq-1)"]);
    expect(m.xs[m.from]).toBe("2025-Q3");
    const h = html(CHART_SAMPLES.fan);
    expect(fills(h, "var(--band)")).toHaveLength(1);
    expect(fills(h, "var(--seq-1)")).toHaveLength(1);
    expect([...h.matchAll(/stroke="var\(--ink\)"[^>]*stroke-dasharray="5 4"/g)]).toHaveLength(1);
    expect(
      buildScene(CHART_SAMPLES.fan, 640)
        .stops.at(-1)!
        .rows.map((r) => r.label),
    ).toEqual(["Ścieżka centralna", "30. percentyl – 70. percentyl", "10. percentyl – 90. percentyl"]);
    expect(legendItems(CHART_SAMPLES.fan).map((l) => l.label)).toEqual([
      "Ścieżka centralna",
      "10. percentyl – 90. percentyl",
      "30. percentyl – 70. percentyl",
      "cel NBP 2,5%",
    ]);
  });
  it("scenarios: the forecast starts where the lines part (forecastFrom empty), shared history drawn once", () => {
    const s = V["fan.scenarios"]!;
    expect(s.opts).toEqual({ forecastFrom: "" });
    const m = fanModel(s);
    expect(m.xs[m.from]).toBe("2023");
    expect(m.sharedHistory).toBe(true);
    expect(divergence(s.series, m.xs)).toBe(5);
    const h = html(s);
    expect([...h.matchAll(/stroke-dasharray="5 4"/g)]).toHaveLength(3);
    expect(h).toContain(">prognoza<");
    expect(legendItems(s)[0]).toEqual({ label: "dane", color: "var(--ink)", shape: "line" });
    // an explicit forecastFrom wins
    expect(fanModel({ ...s, opts: { forecastFrom: "2030" } }).xs[fanModel({ ...s, opts: { forecastFrom: "2030" } }).from]).toBe("2030");
  });
});

describe("symbol map", () => {
  it("circle area is proportional to the value (radius ∝ √value)", () => {
    expect(symbolRadius(4, 4, 10)).toBe(10);
    expect(symbolRadius(1, 4, 10)).toBe(5);
    const h = html(CHART_SAMPLES["symbol-map"]);
    const circles = [...h.matchAll(/<circle[^>]*r="([\d.]+)"[^>]*fill="var\(--series-1\)"/g)].map((m) => Number(m[1]));
    expect(circles).toHaveLength(16);
    const big = Math.max(...circles);
    const small = Math.min(...circles);
    expect(big / small).toBeCloseTo(Math.sqrt(5_514_000 / 942_000), 1);
  });
  it("legend of 2–3 round reference circles under the maximum", () => {
    expect(symbolLegendValues(5_514_000)).toEqual([5_000_000, 2_000_000, 500_000]);
    expect(html(CHART_SAMPLES["symbol-map"])).toContain(">5 mln osób<");
  });
  it("overlay: regions coloured by the rate series in the 4-class ramp, circles in series-reference", () => {
    const s = V["symbols.overlay"]!;
    const h = html(s);
    expect(fills(h, "var(--seq-5)").length).toBeGreaterThan(0);
    expect([...h.matchAll(/<circle[^>]*fill="var\(--series-reference\)"/g)]).toHaveLength(16);
    expect(legendItems(s).map((l) => l.label)).toEqual([
      "pole koła = Bezrobotni",
      "Stopa bezrobocia: < 4%",
      "Stopa bezrobocia: 4–6%",
      "Stopa bezrobocia: 6–8%",
      "Stopa bezrobocia: ≥ 8%",
    ]);
    expect(toTable(s).columns).toEqual(["Województwo", "Bezrobotni", "Stopa bezrobocia"]);
    expect(buildScene(s, 640).stops.find((st) => st.title === "Świętokrzyskie")!.rows[1]!.value).toBe("8,9% (≥ 8%)");
  });
});

describe("sankey", () => {
  it("node totals equal the sums of their links on both sides", () => {
    const { nodes, links } = sankeyLayout(CHART_SAMPLES.sankey, 0, 300);
    for (const n of nodes) {
      const sum = links.filter((l) => (n.side === "from" ? l.from : l.to) === n.key).reduce((a, l) => a + l.value, 0);
      expect(n.total).toBe(sum);
      const hs = links.filter((l) => (n.side === "from" ? l.from : l.to) === n.key).reduce((a, l) => a + l.h, 0);
      expect(hs).toBeCloseTo(n.h, 6);
    }
    expect(nodes.find((n) => n.side === "to" && n.key === "PL14")!.total).toBe(9500);
    const sideSum = (s: "from" | "to") => nodes.filter((n) => n.side === s).reduce((a, n) => a + n.total, 0);
    expect(sideSum("from")).toBe(sideSum("to"));
  });
  it("links stack inside their nodes without gaps or overlaps", () => {
    const { nodes, links } = sankeyLayout(CHART_SAMPLES.sankey, 0, 300);
    for (const n of nodes) {
      const ls = links
        .filter((l) => (n.side === "from" ? l.from : l.to) === n.key)
        .map((l) => ({ y: n.side === "from" ? l.y0 : l.y1, h: l.h }))
        .sort((a, b) => a.y - b.y);
      expect(ls[0]!.y).toBeCloseTo(n.y, 6);
      for (let i = 1; i < ls.length; i++) expect(ls[i]!.y).toBeCloseTo(ls[i - 1]!.y + ls[i - 1]!.h, 6);
    }
  });
  it("links in series-context with opacity, the highlighted node's links in series-1; table of flows", () => {
    const h = html(CHART_SAMPLES.sankey);
    expect(fills(h, "var(--series-context)").length).toBe(12);
    expect(fills(h, "var(--series-1)").length).toBe(8 + 2); // 8 links of PL14, its two nodes
    expect(h).toMatch(/fill="var\(--series-context\)"[^>]*opacity="0.2"/);
    const t = toTable(CHART_SAMPLES.sankey);
    expect(t.rows).toHaveLength(20);
    expect(t.rows[0]).toEqual(["Mazowieckie", "Małopolskie", "2\u00a0100", "34,4"]);
  });
});

describe("kpi card and sparkline", () => {
  it("big value with the change against the previous point, never coloured as good or bad", () => {
    const h = html(CHART_SAMPLES["kpi-card"]);
    expect(h).toContain(">2,9%<");
    expect(h).toContain(">▼ 0,2 pp<");
    expect(h).toContain("wobec sierpień 2026");
    expect(h).not.toMatch(/change-(good|bad)/);
  });
  it("spark: a sparkline with one read-out per point", () => {
    const s = V["kpi.spark"]!;
    expect(buildScene(s, 640).stops).toHaveLength(25);
  });
  it("target: progress bar with a target tick; the reference gives the value when opts.target is the placeholder 0", () => {
    const s = V["kpi.target"]!;
    expect(s.opts).toEqual({ target: 0 });
    expect(kpiModel(s).target).toEqual({ value: 78, label: "cel UE 2030" });
    expect(kpiModel({ ...s, opts: { target: 80 } }).target).toEqual({ value: 80, label: "cel" });
    const h = html(s);
    expect(h).toContain(">powyżej celu o 0,9 pp<");
    expect(legendItems(s)).toEqual([{ label: "cel UE 2030", color: "var(--ink)", shape: "tick" }]);
    expect(toTable(s).rows.at(-1)).toEqual(["cel UE 2030", "78,0", "–"]);
  });
  it("sparkline columns: negative columns in div-negative, last value labelled, no axis text", () => {
    const s = V["sparkline.columns"]!;
    const h = html(s);
    expect(fills(h, "var(--div-negative)")).toHaveLength(3);
    expect([...h.matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1])).toEqual(["0,9%"]);
    const line = html(V["sparkline.line"]!);
    expect([...line.matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1])).toEqual(["2,9%"]);
  });
});

describe("table", () => {
  const base = CHART_SAMPLES.table;
  const cells = (p: ChartSample) => html(p);
  it("plain: numbers right-aligned in tabular figures, no shading", () => {
    const h = cells(base);
    expect(h).toContain("font-variant-numeric:tabular-nums");
    expect(h).toMatch(/text-anchor="end"[^>]*>8,9</);
    expect(h).not.toMatch(/fill="var\(--seq-/);
    expect(legendItems(base)).toEqual([]);
  });
  it("heat: every value cell shaded in the 4-class ramp, legend of the classes", () => {
    const s = V["table.heat"]!;
    const h = cells(s);
    const shaded = [1, 2, 4, 5].reduce((a, k) => a + fills(h, `var(--seq-${k})`).length, 0);
    expect(shaded).toBe(16 * 3);
    expect(legendItems(s).map((l) => l.label)).toEqual(["< 5%", "5–8%", "8–11%", "≥ 11%"]);
  });
  it("bars: one bar per value cell", () => {
    const h = cells({ ...base, opts: { cells: "bars" } });
    expect(fills(h, "var(--series-1)")).toHaveLength(16 * 3);
  });
  it("spark: a trend line per row across the columns", () => {
    const h = cells({ ...base, opts: { cells: "spark" } });
    expect([...h.matchAll(/<path[^>]*stroke="var\(--series-1\)"/g)]).toHaveLength(16);
    expect(h).toContain(">Trend<");
  });
  it("hierarchy: group rows with subtotals of counts; rates are never summed", () => {
    const s = V["matrix.subtotals"]!;
    const rows = tableRows(s);
    expect(rows.filter((r) => r.kind === "group")).toHaveLength(7);
    const south = rows.find((r) => r.key === "M1")!;
    expect(south.values).toEqual([3373 + 4571, 3432 + 4322]);
    expect(toTable(s).rows[0]).toEqual(["Makroregion południowy (razem)", "7\u00a0944", "7\u00a0754"]);
    const rate = tableRows({ ...s, unit: { symbol: "%", isRate: true, decimals: 1 } });
    expect(rate.find((r) => r.key === "M1")!.values).toEqual([null, null]);
    expect(tableRows({ ...s, opts: { cells: "plain" } }).every((r) => r.kind === "row")).toBe(true);
  });
});

describe("chart catalogue 2026-11-09: pareto and the cumulative histogram", () => {
  it("pareto: parts from the largest, shares add up to 100, the cumulative line on the % axis, 80% marked", () => {
    const s = CHART_SAMPLES.pareto;
    const rows = paretoRows(s);
    expect(rows[0]!.key).toBe("PL14");
    expect(rows.map((r) => r.share)).toEqual([...rows.map((r) => r.share)].sort((a, b) => b - a));
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(100, 6);
    expect(rows[rows.length - 1]!.cumulative).toBeCloseTo(100, 6);
    expect(rows.findIndex((r) => r.cumulative >= 80)).toBe(5);
    const h = html(s);
    expect(fills(h, "var(--series-1)")).toHaveLength(16);
    expect(h).toContain(">80%<");
    expect(toTable(s).columns).toEqual(["Kategoria", "Eksport", "Udział, %", "Narastająco, %"]);
    expect(legendItems(s).map((l) => l.shape)).toEqual(["square", "line", "line"]);
    // key order kept with sort "data"
    expect(paretoRows({ ...s, opts: { sort: "data" } }).map((r) => r.key)).toEqual(s.categories!.map((c) => c.key));
    expect(buildScene(s, 390).stops).toHaveLength(16);
  });
  it("histogram.cumulative: bars as shares, the ogive reaching 100%, a four-column table", () => {
    const s = VARIANT_SAMPLES["histogram.cumulative"]!;
    const { share, cumulative } = histogramShares(s);
    expect(share.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(cumulative[cumulative.length - 1]).toBeCloseTo(100, 6);
    const t = toTable(s);
    expect(t.columns).toEqual(["Przedział", s.series[0]!.label, "Udział, %", "Narastająco, %"]);
    expect(legendItems(s).map((l) => l.label)).toEqual(["udział jednostek", "narastająco"]);
    expect(html(s)).toContain(">100%<");
  });
});

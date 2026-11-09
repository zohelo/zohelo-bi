// Chart library v2 variant options (ZOptions) drawn by the existing chart types, and the variant samples.

import { createRequire } from "node:module";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  CHART_SAMPLES,
  VARIANTS,
  VARIANT_SAMPLES,
  ZChart,
  buildScene,
  legendItems,
  toTable,
  type ChartSample,
  type ZChartProps,
} from "./index";
import { divergingBreaks, linFit, scatterPoints } from "./drawOther";

const req = createRequire(new URL("../../../../apps/portal/package.json", import.meta.url));
const { renderToString } = req("react-dom/server") as { renderToString: (el: ReactElement) => string };

const NEW_TYPES = ["pie", "waffle", "strip", "fan", "symbol-map", "sankey", "kpi-card", "sparkline", "table", "pareto"];
const html = (p: ZChartProps, width = 640) => renderToString(<ZChart {...p} width={width} />);
const tags = (h: string, tag: string) => [...h.matchAll(new RegExp(`<${tag}[^>]*>`, "g"))].map((m) => m[0]);
const attr = (t: string, a: string) => new RegExp(`\\s${a}="([^"]*)"`).exec(t)?.[1];
const texts = (h: string) => [...h.matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1]!.replace(/\s/g, " "));
const sample = (id: string): ChartSample => VARIANT_SAMPLES[id]!;
const num = (s: string) => Number(s.replace(/\s/g, "").replace("−", "-").replace(",", "."));
/** Colour of a legend item: a token, or a colour-mix of two tokens (diverging light steps). */
const TOKEN = /^(var\(--[a-z0-9-]+\)|color-mix\(in srgb, var\(--[a-z0-9-]+\) \d+%, var\(--[a-z0-9-]+\)\))$/;

describe("variant samples", () => {
  it("one sample per variant drawn by an existing type, with that variant's chart and options", () => {
    const ids = VARIANTS.filter((v) => !NEW_TYPES.includes(v.chart)).map((v) => v.id);
    expect(Object.keys(VARIANT_SAMPLES).sort()).toEqual(ids.sort());
    for (const v of VARIANTS) {
      const s = VARIANT_SAMPLES[v.id];
      if (!s) continue;
      expect(s.type, v.id).toBe(v.chart);
      expect(s.kind_pl).toBe(v.pl);
      expect(s.kind_en).toBe(v.en);
      // the library's options, placeholders ("") filled with the sample's value
      for (const [k, val] of Object.entries(v.opts ?? {})) {
        const got = (s.opts as Record<string, unknown>)[k];
        if (val === "") expect(got, `${v.id}.${k}`).toBeTruthy();
        else expect(got, `${v.id}.${k}`).toEqual(val);
      }
      if (!v.opts) expect(s.opts).toBeUndefined();
      for (const k of [
        "kind_pl",
        "kind_en",
        "group_pl",
        "group_en",
        "title",
        "sub",
        "use_pl",
        "avoid_pl",
        "use_en",
        "avoid_en",
        "ariaLabel",
      ] as const)
        expect(s[k].length, `${v.id}.${k}`).toBeGreaterThan(2);
    }
  });

  for (const [id, s] of Object.entries(VARIANT_SAMPLES)) {
    it(`${id}: renders at every width with stops, a rectangular table and a token legend`, () => {
      for (const width of [1100, 640, 360]) {
        const h = html(s, width);
        expect(h).toContain('role="img"');
        expect(h).toContain(`width="${width}"`);
        expect(h).not.toMatch(/NaN|undefined|Infinity/);
        expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        const sizes = [...h.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
        expect(sizes.length).toBeGreaterThan(0);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
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
      expect(t.numeric.length).toBe(t.columns.length);
      for (const r of t.rows) expect(r.length).toBe(t.columns.length);
      for (const it of legendItems(s)) {
        expect(it.color).toMatch(TOKEN);
        expect(it.label).not.toMatch(/undefined|NaN/);
      }
    });
  }
});

describe("step", () => {
  it("line: horizontal then vertical segments, no diagonals", () => {
    const hero = tags(html(sample("line.step")), "path").find((t) => attr(t, "stroke") === "var(--series-1)")!;
    const d = attr(hero, "d")!;
    expect(d).toMatch(/H[\d.]+V[\d.]+/);
    expect(d).not.toContain("L");
  });
  it("area: the line and its fill are steps", () => {
    const p = { ...sample("area.simple"), opts: { step: true } };
    const paths = tags(html(p), "path").map((t) => attr(t, "d")!);
    expect(paths.filter((d) => /H[\d.]+V/.test(d)).length).toBeGreaterThanOrEqual(2);
  });
  it("line-band: steps", () => {
    const p = { ...CHART_SAMPLES["line-band"], opts: { step: true } };
    const hero = tags(html(p), "path").find((t) => attr(t, "stroke") === "var(--series-1)" && attr(t, "stroke-width") === "2.25")!;
    expect(attr(hero, "d")).toMatch(/^M[\d.]+ [\d.]+H/);
  });
});

describe("forecastFrom", () => {
  const s = sample("line.forecast");
  it("line: solid up to the last actual period, dashed from there on", () => {
    const lines = tags(html(s), "path").filter((t) => attr(t, "stroke") === "var(--series-1)");
    const solid = lines.find((t) => !attr(t, "stroke-dasharray"))!;
    const dashed = lines.find((t) => attr(t, "stroke-dasharray") === "5 4")!;
    expect(solid).toBeTruthy();
    expect(dashed).toBeTruthy();
    const lastSolid = attr(solid, "d")!.split(/[ML]/).filter(Boolean).at(-1);
    const firstDashed = attr(dashed, "d")!.split(/[ML]/).filter(Boolean)[0];
    expect(firstDashed).toBe(lastSolid); // the dashed part continues from 2025
    expect(attr(dashed, "d")!.split("L")).toHaveLength(4); // 2025 → 2026, 2027, 2028
    expect(texts(html(s))).toContain("prognoza");
  });
  it("stops, legend and table carry the forecast flag", () => {
    const stops = buildScene(s, 640).stops;
    expect(stops.at(-1)!.title).toContain("prognoza");
    expect(stops[0]!.title).not.toContain("prognoza");
    expect(legendItems(s).map((l) => l.label)).toContain("prognoza (linia przerywana)");
    const t = toTable(s);
    expect(t.columns.at(-1)).toBe("Rodzaj");
    expect(t.rows.find((r) => r[0] === "2025")!.at(-1)).toBe("dane");
    expect(t.rows.find((r) => r[0] === "2026")!.at(-1)).toBe("prognoza");
  });
  it("columns: hatched from the forecast period, with a legend item", () => {
    const p = { ...CHART_SAMPLES.columns, opts: { forecastFrom: "2023" } };
    const h = html(p);
    expect(h).toContain("<pattern");
    const hatched = tags(h, "path").filter((t) => attr(t, "fill")?.startsWith("url(#zc-hatch"));
    expect(hatched).toHaveLength(2); // 2023 and 2024
    expect(legendItems(p).map((l) => l.label)).toContain("prognoza (kreskowane)");
    expect(toTable(p).rows.map((r) => r.at(-1))).toEqual([...Array(8).fill("dane"), "prognoza", "prognoza"]);
  });
  it("an empty forecastFrom draws no forecast", () => {
    const p = { ...s, opts: { forecastFrom: "" } };
    expect(html(p)).not.toContain('stroke-dasharray="5 4"');
    expect(toTable(p).columns).not.toContain("Rodzaj");
  });
});

describe("interval", () => {
  const s = sample("line.band");
  it("line: a shaded band, the bounds not drawn as lines and not in the legend", () => {
    const h = html(s);
    const lines = tags(h, "path").filter((t) => attr(t, "fill") === "none" && /^var\(--series-/.test(attr(t, "stroke") ?? ""));
    expect(lines).toHaveLength(1);
    expect(tags(h, "path").some((t) => attr(t, "fill") === "var(--band)" && attr(t, "d")!.endsWith("Z"))).toBe(true);
    const labels = legendItems(s).map((l) => l.label);
    expect(labels).toEqual(["Polska", "przedział ufności"]);
    expect(legendItems(s)[1]!.shape).toBe("band");
  });
  it("line: the tooltip gives the interval; the table keeps both bounds", () => {
    const rows = buildScene(s, 640).stops[0]!.rows;
    expect(rows.at(-1)).toEqual({ label: "przedział ufności", value: "3,7–4,2%", color: "var(--band)" });
    expect(toTable(s).columns).toEqual(["Okres", "Polska", "dolna granica", "górna granica"]);
  });
  it("dot-plot: an error bar per dot, bounds out of the legend", () => {
    const d = sample("dot.interval");
    const h = html(d);
    expect(tags(h, "circle")).toHaveLength(8);
    const bars = tags(h, "path").filter((t) => attr(t, "stroke") === "var(--series-reference)");
    expect(bars).toHaveLength(8 * 3); // bar and two end ticks
    expect(legendItems(d).map((l) => l.label)).toEqual(["Zasięg ubóstwa skrajnego", "przedział ufności"]);
    expect(buildScene(d, 640).stops[0]!.rows.at(-1)!.value).toBe("6,8–9,4%");
  });
});

describe("scatter options", () => {
  it("trend: least-squares line with a negative slope and r² in the legend", () => {
    const s = sample("scatter.trend");
    const fit = linFit(scatterPoints(s).pts)!;
    expect(fit.slope).toBeLessThan(0);
    expect(fit.r2).toBeGreaterThan(0);
    expect(fit.r2).toBeLessThan(1);
    const l = legendItems(s).find((i) => i.label.startsWith("linia trendu"))!;
    expect(l.label).toMatch(/y = −0,\d+x \+ \d+,\d+, r² = 0,\d\d$/);
    const line = tags(html(s), "path").find((t) => attr(t, "stroke") === "var(--series-reference)" && attr(t, "stroke-width") === "1.5")!;
    const [a, b] = attr(line, "d")!
      .slice(1)
      .split("L")
      .map((p) => p.split(" ").map(Number));
    expect(b![1]!).toBeGreaterThan(a![1]!); // goes down to the right (y grows in SVG)
  });
  it("quadrants: dashed lines at the means, four labels, a table column", () => {
    const s = sample("scatter.quadrants");
    const h = html(s);
    expect(tags(h, "path").filter((t) => attr(t, "stroke-dasharray") === "4 3")).toHaveLength(2);
    for (const q of ["wyższe x i y", "niższe x, wyższe y", "niższe x i y", "wyższe x, niższe y"]) expect(texts(h)).toContain(q);
    const t = toTable(s);
    expect(t.columns.at(-1)).toBe("Ćwiartka (wobec średnich)");
    expect(t.rows.find((r) => r[0] === "Mazowieckie")!.at(-1)).toBe("wyższe x i y");
  });
  it("connect: one path through the points in year order, first and last year labelled", () => {
    const s = sample("scatter.connected");
    const h = html(s);
    const path = tags(h, "path").find((t) => attr(t, "stroke") === "var(--series-1)")!;
    expect(attr(path, "d")!.split("L")).toHaveLength(14);
    expect(texts(h)).toContain("2012");
    expect(texts(h)).toContain("2025");
    expect(buildScene(s, 640).stops.map((st) => st.title)).toEqual(Array.from({ length: 14 }, (_, i) => String(2012 + i)));
    expect(legendItems(s).some((l) => l.label.startsWith("linia trendu"))).toBe(false);
  });
  it('labels "all": every point labelled when there is room', () => {
    const s = sample("scatter.labelled");
    const labelled = texts(html(s, 1100)).filter((t) => s.categories!.some((c) => c.label === t));
    expect(labelled.length).toBeGreaterThanOrEqual(14);
  });
  it('labels "all": crowded points fall back to the highlighted one', () => {
    const keys = Array.from({ length: 80 }, (_, i) => `u${i}`);
    const p: ZChartProps = {
      ...sample("scatter.labelled"),
      categories: keys.map((k) => ({ key: k, label: `Jednostka ${k}` })),
      series: [
        // a dense cluster (two outliers stretch the axes)
        { id: "x", label: "x", points: keys.map((k, i) => ({ x: k, y: i === 0 ? 0 : i === 1 ? 100 : 50 + (i % 9) * 0.2 })) },
        { id: "y", label: "y", points: keys.map((k, i) => ({ x: k, y: i === 0 ? 0 : i === 1 ? 10 : 5 + (i % 7) * 0.05 })) },
      ],
      highlight: "u5",
    };
    expect(texts(html(p)).filter((t) => t.startsWith("Jednostka"))).toEqual(["Jednostka u5"]);
  });
});

describe("percent", () => {
  it("stacked-columns: every column sums to 100% and the axis is in per cent", () => {
    const s = sample("column.percent");
    for (const r of toTable(s).rows) expect(r.slice(1).reduce((a, v) => a + num(v), 0)).toBeCloseTo(100, 0);
    expect(toTable(s).columns[1]).toBe("VAT, %");
    const h = html(s);
    expect(texts(h)).toContain("100%");
    const segs = tags(h, "rect").filter((t) => /^var\(--series-\d\)$/.test(attr(t, "fill") ?? ""));
    const col0 = segs.slice(0, 5).reduce((a, t) => a + Number(attr(t, "height")), 0);
    const col6 = segs.slice(30, 35).reduce((a, t) => a + Number(attr(t, "height")), 0);
    expect(col0).toBeCloseTo(col6, 0);
    expect(buildScene(s, 640).stops[0]!.rows[4]!.value).toMatch(/^43,7% \(174 mld zł\)$/);
  });
  it("stacked-area: 100% stacking", () => {
    const p = { ...CHART_SAMPLES["stacked-area"], opts: { percent: true } };
    for (const r of toTable(p).rows) expect(r.slice(1).reduce((a, v) => a + num(v), 0)).toBeCloseTo(100, 0);
    expect(texts(html(p))).toContain("100%");
  });
  it("pyramid: shares of the total population on a % axis", () => {
    const s = sample("pyramid.percent");
    const t = toTable(s);
    expect(t.columns).toEqual(["Wiek", "mężczyźni, %", "kobiety, %"]);
    expect(t.rows.reduce((a, r) => a + num(r[1]!) + num(r[2]!), 0)).toBeCloseTo(100, 0);
    expect(texts(html(s)).some((x) => /%$/.test(x))).toBe(true);
  });
});

describe("overlay (pyramid)", () => {
  const s = sample("pyramid.overlay");
  it("the overlay pair is drawn as two outlines of steps over the bars", () => {
    const outlines = tags(html(s), "path").filter((t) => attr(t, "stroke") === "var(--ink)" && attr(t, "fill") === "none");
    expect(outlines).toHaveLength(2);
    for (const o of outlines) expect(attr(o, "d")).toMatch(/V[\d.]+H[\d.]+V/);
  });
  it("legend, tooltip and table name the overlay", () => {
    expect(legendItems(s).map((l) => l.label)).toEqual(["mężczyźni 2025", "kobiety 2025", "mężczyźni 2050, kobiety 2050"]);
    expect(buildScene(s, 640).stops[0]!.rows.map((r) => r.label)).toEqual([
      "mężczyźni 2025",
      "kobiety 2025",
      "mężczyźni 2050",
      "kobiety 2050",
    ]);
    expect(toTable(s).columns).toHaveLength(5);
  });
});

describe("surplus and range (area)", () => {
  it("surplus: positive fill above zero, negative below, both in the legend", () => {
    const s = sample("area.surplus");
    const h = html(s);
    expect(tags(h, "clipPath")).toHaveLength(2);
    const fills = tags(h, "path").map((t) => attr(t, "fill"));
    expect(fills).toContain("var(--div-positive)");
    expect(fills).toContain("var(--div-negative)");
    expect(legendItems(s).map((l) => l.label)).toEqual(["Saldo obrotów towarowych", "nadwyżka", "deficyt"]);
    const stops = buildScene(s, 640).stops;
    expect(stops[0]!.rows[0]!.color).toBe("var(--div-negative)");
    expect(stops.find((st) => st.title === "2020")!.rows[0]!.color).toBe("var(--div-positive)");
  });
  it("range: a band between lo and hi with series[0] as the only line", () => {
    const s = sample("area.range");
    const h = html(s);
    expect(tags(h, "path").filter((t) => attr(t, "fill") === "var(--band)")).toHaveLength(1);
    expect(tags(h, "path").filter((t) => attr(t, "fill") === "none" && attr(t, "stroke") === "var(--series-1)")).toHaveLength(1);
    const l = legendItems(s);
    expect(l[0]!.label).toBe("Polska");
    expect(l[1]!.shape).toBe("band");
  });
});

describe("ramp", () => {
  it("diverging: thresholds symmetric around the reference, two-sided colours", () => {
    const s = sample("choropleth.diverging");
    const vals = s.series[0]!.points.map((p) => p.y!);
    const b = divergingBreaks(s, vals, 4);
    expect(b[1]).toBe(100);
    expect(b[0]! + b[2]!).toBeCloseTo(200, 6);
    expect(legendItems(s).map((l) => l.color)).toEqual([
      "var(--div-negative)",
      "color-mix(in srgb, var(--div-negative) 50%, var(--div-mid))",
      "color-mix(in srgb, var(--div-positive) 50%, var(--div-mid))",
      "var(--div-positive)",
    ]);
    // without a reference: centred on the (rounded) mean
    const m = divergingBreaks({ ...s, reference: undefined }, vals, 5);
    expect(m[0]! + m[3]!).toBeCloseTo(m[1]! + m[2]!, 6);
  });
  it("diverging heatmap: 5 classes with the midpoint", () => {
    const s = sample("heatmap.correlation");
    expect(legendItems(s).map((l) => l.color)[2]).toBe("var(--div-mid)");
    expect(legendItems(s).map((l) => l.label)).toEqual(["< −0,6", "−0,6–−0,2", "−0,2–0,2", "0,2–0,6", "≥ 0,6"]);
  });
  it("diverging tile-map uses the same ramp", () => {
    const p = { ...CHART_SAMPLES["tile-map"], breaks: undefined, opts: { ramp: "diverging" as const } };
    expect(html(p)).toContain("var(--div-negative)");
  });
  it("categorical: one series colour per class from ZCategory.group, labels from the class category", () => {
    const s = sample("choropleth.typology");
    expect(legendItems(s)).toEqual([
      { label: "rolnictwo", color: "var(--series-1)", shape: "square" },
      { label: "przemysł", color: "var(--series-2)", shape: "square" },
      { label: "usługi metropolitalne", color: "var(--series-3)", shape: "square" },
      { label: "mieszany", color: "var(--series-4)", shape: "square" },
    ]);
    expect(toTable(s).rows.find((r) => r[0] === "Mazowieckie")![2]).toBe("usługi metropolitalne");
  });
  it("categorical without groups: values are the class keys", () => {
    const p = {
      ...CHART_SAMPLES["tile-map"],
      opts: { ramp: "categorical" as const },
      series: [
        {
          id: "c",
          label: "Typ",
          points: [
            { x: "PL14", y: 1 },
            { x: "PL30", y: 2 },
            { x: "PL06", y: 1 },
          ],
        },
      ],
    };
    expect(legendItems(p).map((l) => l.label)).toEqual(["1", "2"]);
  });
});

describe("mini (tile-map)", () => {
  const s = sample("tiles.mini");
  it("a sparkline in every tile on one shared scale", () => {
    const sparks = tags(html(s), "path").filter((t) => attr(t, "stroke") === "var(--series-1)");
    expect(sparks).toHaveLength(16);
  });
  it("table: latest value and the history of every region", () => {
    const t = toTable(s);
    expect(t.columns.slice(0, 3)).toEqual(["Województwo", "Stopa bezrobocia 2025", "Klasa"]);
    expect(t.columns.slice(3)).toEqual(Array.from({ length: 11 }, (_, i) => String(2015 + i)));
    expect(legendItems(s).map((l) => l.shape)).toEqual(["square", "line"]);
  });
});

describe("hierarchy (treemap)", () => {
  const s = sample("treemap.hierarchy");
  it("parts nested in labelled groups, coloured by group", () => {
    const h = html(s);
    for (const g of ["Sprawy społeczne", "Bezpieczeństwo", "Usługi publiczne", "Gospodarka i państwo"])
      expect(texts(h).some((t) => t.startsWith(g))).toBe(true);
    expect(legendItems(s).map((l) => l.label)).toEqual(["Sprawy społeczne", "Bezpieczeństwo", "Gospodarka i państwo", "Usługi publiczne"]);
    expect(buildScene(s, 640).stops).toHaveLength(12);
    const t = toTable(s);
    expect(t.columns[0]).toBe("Grupa");
    expect(t.rows[0]).toEqual(["Sprawy społeczne", "Emerytury (dotacja FUS)", "90", "15,1"]);
  });
});

describe("benchmark", () => {
  it("ranked-bars: the benchmark in series-context, bold, with a line at its value", () => {
    const s = { ...sample("bar.benchmark"), highlight: undefined };
    const h = html(s);
    const bars = tags(h, "path").filter((t) => /Z$/.test(attr(t, "d") ?? ""));
    expect(bars.filter((t) => attr(t, "fill") === "var(--series-context)")).toHaveLength(1);
    expect(tags(h, "path").some((t) => attr(t, "stroke-dasharray") === "2 3")).toBe(true);
    expect(legendItems(s)).toContainEqual({ label: "UE-27", color: "var(--series-context)", shape: "square" });
  });
  it("lollipop: the benchmark dot in series-context next to the highlight", () => {
    const p = { ...CHART_SAMPLES.lollipop, opts: { benchmark: "PL22" } };
    const fills = tags(html(p), "circle").map((t) => attr(t, "fill"));
    expect(fills.filter((f) => f === "var(--series-1)")).toHaveLength(1);
    expect(legendItems(p).map((l) => l.label)).toContain("Pomorskie");
  });
});

describe("horizontal", () => {
  it("grouped bars: categories on the vertical axis, full names, one stop per row", () => {
    const s = sample("bar.clustered");
    const scene = buildScene(s, 640);
    expect(scene.pick).toBe("y");
    expect(scene.stops).toHaveLength(6);
    expect(scene.stops[1]!.y).toBeGreaterThan(scene.stops[0]!.y);
    expect(texts(html(s))).toContain("Warmińsko-mazurskie");
  });
  it("stacked columns: one stacked bar per row with its total", () => {
    const s = sample("bar.stacked");
    const scene = buildScene(s, 640);
    expect(scene.pick).toBe("y");
    expect(scene.stops).toHaveLength(6);
    expect(texts(html(s))).toContain("2 870");
    const p = { ...s, opts: { horizontal: true, percent: true } };
    expect(texts(html(p))).toContain("100%");
  });
});

describe("target (bullet)", () => {
  it("the target tick comes from opts.target when there is no reference", () => {
    const p = { ...CHART_SAMPLES.bullet, reference: undefined, opts: { target: 2.5 } };
    expect(legendItems(p).at(-1)).toEqual({ label: "cel", color: "var(--ink)", shape: "tick" });
    expect(toTable(p).columns).toContain("cel");
    const ticks = tags(html(p), "path").filter((t) => attr(t, "stroke") === "var(--ink)" && attr(t, "stroke-width") === "2");
    expect(ticks.length).toBe(CHART_SAMPLES.bullet.series[0]!.points.length);
  });
});

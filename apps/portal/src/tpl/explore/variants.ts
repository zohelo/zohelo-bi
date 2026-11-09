// Chart library v2 in the explorer (docs/chart-library-proposal.md): every library variant is drawn from the data
// of one explorer kind (its base: the kind's wells and data assembly) and then turned into the variant's chart
// type and options (applyVariant). The picker shows types → variants; the URL keeps both (chart=<base>&v=<id>).

import { looksOf } from "./looks";
import { VARIANT_BY_ID, VARIANTS, type ChartVariant, type VariantNeed, type ZChartProps, type ZSeries } from "@zohelo/visuals";
import type { ChartKind } from "./exploreState";

/** Explorer kind whose wells and data a variant uses. */
export const VARIANT_BASE: Record<string, ChartKind> = {
  "line.blank": "line",
  "line.simple": "line",
  "line.multi": "line",
  "line.highlight": "line",
  "line.reference": "line",
  "line.step": "line",
  "line.indexed": "line",
  "line.band": "line",
  "line.forecast": "line",
  // Wardrobe types (looks.ts): every library variant of line, column, bar, area and combo is a look of the base kind.
  "column.simple": "columns",
  "column.clustered": "columns",
  "column.stacked": "columns",
  "column.percent": "columns",
  "column.diverging": "columns",
  "column.ibcs": "columns",
  "column.variance": "columns",
  "bar.ranked": "bars",
  "bar.benchmark": "bars",
  "bar.clustered": "bars",
  "bar.stacked": "bars",
  "bar.percent": "bars",
  "bar.diverging": "bars",
  "bar.segmented": "segmented",
  "bar.ibcs": "bars",
  "bar.variance": "bars",
  "area.simple": "area",
  "area.stacked": "area",
  "area.percent": "area",
  "area.surplus": "area",
  "area.range": "area",
  "combo.column-line": "combo",
  "combo.contributions": "contributions",
  "scatter.simple": "scatter",
  "scatter.trend": "scatter",
  "scatter.labelled": "scatter",
  "scatter.quadrants": "scatter",
  "scatter.connected": "scatter",
  "bubble.simple": "bubble",
  "bubble.connected": "bubble",
  "dot.lollipop": "lollipop",
  "dot.cleveland": "dots",
  "dot.interval": "dots",
  "dumbbell.periods": "dumbbell",
  "dumbbell.groups": "dumbbell",
  "slope.simple": "slope",
  "slope.highlight": "slope",
  "bump.rank": "bump",
  "pyramid.absolute": "pyramid",
  "pyramid.percent": "pyramid",
  "pyramid.overlay": "pyramid",
  "histogram.simple": "histogram",
  "histogram.marker": "histogram",
  "boxplot.category": "boxplot",
  "boxplot.time": "boxplot",
  "strip.strip": "boxplot",
  "strip.beeswarm": "boxplot",
  "fan.percentile": "line",
  "fan.scenarios": "line",
  "waterfall.bridge": "bridge",
  // chart catalogue (2026-11-09): Pareto from the columns kind (categories on the axis), the ogive from the histogram
  "pareto.simple": "columns",
  "histogram.cumulative": "histogram",
  "waterfall.period": "waterfall",
  "bullet.target": "bars",
  "bullet.ranges": "bars",
  "pie.pie": "segmented",
  "pie.donut": "segmented",
  "treemap.flat": "treemap",
  "treemap.hierarchy": "treemap",
  "waffle.grid": "segmented",
  "heatmap.time": "heatmap",
  "heatmap.region": "heatmap",
  "heatmap.correlation": "line",
  "choropleth.sequential": "choro",
  "choropleth.diverging": "choro",
  "choropleth.typology": "choro",
  "symbols.circles": "choro",
  "symbols.overlay": "choro",
  "tiles.color": "map",
  "tiles.mini": "line",
  "sankey.two": "bars",
  "table.plain": "columns",
  "table.heat": "columns",
  "table.ranking": "ranking",
  "table.spark": "sparkline",
  "matrix.crosstab": "matrix",
  "matrix.subtotals": "matrix",
  "kpi.change": "line",
  "kpi.spark": "line",
  "kpi.target": "line",
  "sparkline.line": "line",
  "sparkline.columns": "line",
};

/** The variant an explorer kind shows when no variant was chosen (the kind's own chart). */
export const KIND_VARIANT: Record<ChartKind, string> = {
  line: "line.multi",
  columns: "column.simple",
  area: "area.simple",
  stacked: "area.stacked",
  stackcols: "column.stacked",
  share: "area.percent",
  contributions: "combo.contributions",
  combo: "combo.column-line",
  bars: "bar.ranked",
  stackbars: "bar.percent",
  segmented: "bar.segmented",
  treemap: "treemap.flat",
  waterfall: "waterfall.period",
  diverging: "bar.diverging",
  heatmap: "heatmap.time",
  matrix: "matrix.crosstab",
  sparkline: "table.spark",
  map: "tiles.color",
  choro: "choropleth.sequential",
  scatter: "scatter.simple",
  bubble: "bubble.simple",
  boxplot: "boxplot.category",
  histogram: "histogram.simple",
  pyramid: "pyramid.absolute",
  ibcs: "column.ibcs",
  ibcsbars: "bar.ibcs",
  bridge: "waterfall.bridge",
  variance: "column.variance",
  varbars: "bar.variance",
  dumbbell: "dumbbell.periods",
  slope: "slope.simple",
  bump: "bump.rank",
  lollipop: "dot.lollipop",
  dots: "dot.cleveland",
  ranking: "table.ranking",
};

/** The variant in effect: the chosen one when it belongs to the kind, else the kind's own. */
export function currentVariant(chart: ChartKind, v: string | null | undefined): ChartVariant {
  const chosen = v ? VARIANT_BY_ID[v] : undefined;
  if (chosen && VARIANT_BASE[chosen.id] === chart) return chosen;
  return VARIANT_BY_ID[KIND_VARIANT[chart]]!;
}

/** A chosen variant kept only when it is drawn from this kind. */
export function validVariant(chart: ChartKind, v: string | null | undefined): string | null {
  if (v && looksOf(chart)?.some((l) => l.id === v)) return KIND_VARIANT[chart] !== v ? v : null;
  return v && VARIANT_BY_ID[v] && VARIANT_BASE[v] === chart && KIND_VARIANT[chart] !== v ? v : null;
}

/**
 * Needs the template's sample catalogue cannot meet: no measure carries confidence intervals, projections, flows,
 * targets, categorical values or grouped breakdowns. With real data these come from the KPI metadata.
 */
const UNMET: VariantNeed[] = ["uncertainty", "projection", "flows", "target", "categories", "hierarchy"];

export type VariantContext = { voivodeships: boolean; periods: number; years: number; measures: number; additive?: boolean };

/** Whether a variant can be drawn from the current measures; the reason when not. */
export function variantVerdict(v: ChartVariant, ctx: VariantContext): { ok: true } | { ok: false; need: VariantNeed } {
  for (const n of v.needs ?? []) {
    if (UNMET.includes(n)) return { ok: false, need: n };
    if (n === "voivodeships" && !ctx.voivodeships) return { ok: false, need: n };
    if (n === "two-periods" && ctx.periods < 2) return { ok: false, need: n };
    if (n === "previous-year" && ctx.years < 2) return { ok: false, need: n };
    if (n === "three-measures" && ctx.measures < 3) return { ok: false, need: n };
    if (n === "additive" && ctx.additive === false) return { ok: false, need: n };
  }
  return { ok: true };
}

const num = (y: number | null | undefined): y is number => typeof y === "number" && Number.isFinite(y);

function pearson(a: (number | null)[], b: (number | null)[]): number | null {
  const pairs = a.map((x, i) => [x, b[i]] as const).filter((p): p is readonly [number, number] => num(p[0]) && num(p[1]));
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Last non-empty point of a series. */
const last = (s: ZSeries) => [...s.points].reverse().find((p) => num(p.y));

/**
 * Turns the chart built for the base kind into the variant's chart: type, options and the few reshapes a variant
 * needs (range band from the spread of the other series, latest values for tiles and KPI cards, a correlation
 * matrix). Variants that only change options keep the data as it is.
 */
export function applyVariant(z: ZChartProps, v: ChartVariant, lang: "pl" | "en"): ZChartProps {
  const pl = lang === "pl";
  const opts = { ...(v.opts ?? {}) };
  const out: ZChartProps = { ...z, type: v.chart, opts };
  switch (v.id) {
    case "line.simple":
      return { ...out, series: z.series.slice(0, 1) };
    case "line.highlight": {
      const hero = z.series.find((s) => s.id === "PL" || s.role === "hero") ?? z.series[0];
      return { ...out, highlight: hero?.id, series: z.series.map((s) => ({ ...s, role: s === hero ? "hero" : "context" })) };
    }
    case "line.reference": {
      const eu = z.series.find((s) => /^EU27/.test(s.id));
      const main = z.series.find((s) => s !== eu) ?? z.series[0]!;
      const ref = eu ? last(eu)?.y : undefined;
      const vals = main.points.map((p) => p.y).filter(num);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
      const value = ref ?? mean;
      return {
        ...out,
        series: [{ ...main, role: "hero" }],
        reference:
          value === undefined
            ? undefined
            : { value, label: eu ? (pl ? `UE-27: ${eu.label}` : `EU-27: ${eu.label}`) : pl ? "średnia okresu" : "period average" },
      };
    }
    case "column.clustered":
      return { ...out, type: "grouped-bars" };
    case "pareto.simple":
      // One series of parts; the renderer sorts and accumulates. Series beyond the first (a legend) are dropped.
      return { ...out, series: z.series.slice(0, 1).map((s) => ({ ...s, role: undefined })), highlight: undefined, reference: undefined };
    case "bar.benchmark":
      return {
        ...out,
        opts: {
          ...opts,
          benchmark: z.categories?.some((c) => /^EU27/.test(c.key)) ? z.categories.find((c) => /^EU27/.test(c.key))!.key : undefined,
        },
      };
    case "area.range": {
      const main = z.series.find((s) => s.id === "PL") ?? z.series[0]!;
      const rest = z.series.filter((s) => s !== main);
      if (!rest.length) return { ...out, type: "area", opts: {}, series: [main] };
      const xs = main.points.map((p) => p.x);
      const at = (s: ZSeries, x: string) => s.points.find((p) => p.x === x)?.y;
      const lo: ZSeries = {
        id: "lo",
        label: pl ? "najniższa" : "lowest",
        points: xs.map((x) => ({ x, y: Math.min(...rest.map((s) => at(s, x)).filter(num)) })),
      };
      const hi: ZSeries = {
        id: "hi",
        label: pl ? "najwyższa" : "highest",
        points: xs.map((x) => ({ x, y: Math.max(...rest.map((s) => at(s, x)).filter(num)) })),
      };
      return { ...out, series: [{ ...main, role: "hero" }, lo, hi] };
    }
    case "tiles.mini": {
      const latest: ZSeries = {
        id: "latest",
        label: z.series[0]?.label ?? "",
        points: z.series.map((s) => ({ x: s.id, y: last(s)?.y ?? null })),
      };
      return { ...out, series: [latest, ...z.series], categories: undefined };
    }
    case "kpi.change":
    case "kpi.spark":
    case "kpi.target":
    case "sparkline.line":
    case "sparkline.columns":
      return { ...out, series: z.series.slice(0, 1), height: v.type === "kpi" ? 160 : 90 };
    case "heatmap.correlation": {
      const ss = z.series;
      const xs = [...new Set(ss.flatMap((s) => s.points.map((p) => p.x)))];
      const vec = (s: ZSeries) => xs.map((x) => s.points.find((p) => p.x === x)?.y ?? null);
      return {
        ...out,
        unit: { symbol: "", isRate: false, decimals: 2 },
        categories: ss.map((s) => ({ key: s.id, label: s.label })),
        series: ss.map((a) => ({ id: a.id, label: a.label, points: ss.map((b) => ({ x: b.id, y: pearson(vec(a), vec(b)) })) })),
      };
    }
    default:
      return out;
  }
}

/** Every variant, for tests and the picker. */
export const ALL_VARIANTS = VARIANTS;

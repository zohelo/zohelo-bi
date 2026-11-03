// From a normalised query and its data to what the canvas shows: the fetch plan (one data.series call per
// indicator and member combination), observations aligned and transformed, the chart model(s) for ZChart,
// a title stating the finding, the subtitle, notes, the CSV of the visible data and the spoken summary.

import type { Catalog, Kpi, Series } from "../../data";
import type { Lang } from "../../i18n";
import { fmtDiff, type ZCategory, type ZChartProps, type ZSeries, type ZUnit } from "@zohelo/visuals";
import { geoName, kpiName, memberName, zUnit } from "../chartData";
import { fmtNumber, fmtPeriod, fmtValue, freqLabel } from "../format";
import type { CsvTable } from "./csv";
import { filterValue, indexBase, isIndexed, kpisOf, placedDims, sourceOf, type DimId, type Query, type Shape } from "./exploreState";
import { findingTitle, firstPoint, lastPoint } from "./findings";
import { VOIV_SHORT, nameOf, unitName, voivodeshipKeys } from "./kpiInfo";
import { plural } from "./search";
import { alignPoints, indexPoints } from "./transform";

export type Fetch = { kpi: string; source: string; geographies: string[]; members: Record<string, string> };
/** More calls than this is a query nobody can read; the canvas asks to narrow it. */
export const MAX_FETCHES = 96;

function pick(q: Query, shape: Shape, placed: Set<DimId>, d: DimId): string[] {
  if (placed.has(d)) return shape.members[d] ?? [];
  const v = filterValue(q, shape, d);
  return v ? [v] : [];
}

/** One call per shown indicator and member combination; dimensions used as filters fetch only their member. */
export function fetchPlan(q: Query, shape: Shape, cat: Catalog): Fetch[] {
  if (!q.i.length) return [];
  const placed = placedDims(q, shape);
  const kpis = kpisOf(cat, pick(q, shape, placed, "i"));
  const geos = q.chart === "map" ? voivodeshipKeys(cat) : pick(q, shape, placed, "geo");
  let combos: Record<string, string>[] = [{}];
  for (const d of shape.shared) combos = combos.flatMap((c) => pick(q, shape, placed, d).map((m) => ({ ...c, [d]: m })));
  return kpis.flatMap((k) =>
    combos.map((members) => ({
      kpi: k.kpi_key,
      source: sourceOf(q, k),
      geographies: geos.filter((g) => k.geographies.includes(g)),
      members,
    })),
  );
}

export type Obs = { i: string; geo: string; m: Record<string, string>; t: string; v: number | null };

export function coord(o: Obs, d: DimId): string {
  return d === "i" ? o.i : d === "geo" ? o.geo : d === "t" ? o.t : (o.m[d] ?? "total");
}

/** Series → observations at the view's frequency (mean of complete periods), indexed when asked, in the window. */
export function toObs(series: Series[], q: Query, shape: Shape): { obs: Obs[]; noBase: string[] } {
  const inWindow = new Set(shape.periods);
  const base = indexBase(q, shape);
  const noBase: string[] = [];
  const obs: Obs[] = [];
  for (const s of series) {
    const k = shape.kpis.find((x) => x.kpi_key === s.kpi_key);
    if (!k) continue;
    let pts = alignPoints(
      s.points.map((p) => ({ x: p.period, y: p.value })),
      k.frequency,
      shape.freq,
    );
    if (isIndexed(q)) {
      const r = indexPoints(pts, base);
      if (!r.ok) noBase.push(`${s.kpi_key}|${s.geography}`);
      pts = r.points;
    }
    const m: Record<string, string> = {};
    for (const d of shape.shared) m[d] = s.members[d] ?? "total";
    for (const p of pts) if (inWindow.has(p.x)) obs.push({ i: s.kpi_key, geo: s.geography, m, t: p.x, v: p.y });
  }
  return { obs, noBase };
}

export const INDEX_UNIT: ZUnit = { symbol: "", isRate: false, decimals: 1 };

export type Panel = { key: string; label: string | null; chart: ZChartProps };
export type ExploreView = {
  caption: string;
  title: string;
  sub: string;
  panels: Panel[];
  /** Several panels side by side (each its own chart and axis). */
  grid: boolean;
  /** Chart whose legend is shown (two or more entries). */
  legend: ZChartProps | null;
  notes: string[];
  csv: CsvTable;
  /** Visually hidden description for screen readers. */
  spoken: string;
  /** Polite announcement after a change. */
  live: string;
  /** Set when there is nothing to draw: names the cause. */
  empty?: string;
  kpis: Kpi[];
};

type Ctx = {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  pl: boolean;
  index: boolean;
  base: number;
  placed: Set<DimId>;
  val: (at: Record<DimId, string>) => number | null;
  lab: (d: DimId, key: string) => string;
  members: (d: DimId) => string[];
};

export function dimName(cat: Catalog, d: DimId, lang: Lang): string {
  const pl = lang === "pl";
  if (d === "i") return pl ? "Wskaźnik" : "Indicator";
  if (d === "geo") return pl ? "Obszar" : "Area";
  if (d === "t") return pl ? "Okres" : "Period";
  return nameOf(
    cat.dimensions.find((x) => x.dimension_key === d),
    lang,
    d,
  );
}

export function memberLabel(cat: Catalog, d: DimId, key: string, lang: Lang): string {
  if (d === "i") {
    const k = cat.kpis.find((x) => x.kpi_key === key);
    return k ? kpiName(k, lang) : key;
  }
  if (d === "geo") return geoName(cat, key, lang);
  if (d === "t") return fmtPeriod(key, lang);
  return memberName(cat, d, key, lang);
}

const sampleOf = (vals: (number | null)[]) => vals.find((v) => v !== null && Number.isFinite(v)) ?? 1;

function unitFor(c: Ctx, k: Kpi | undefined, sample: number): ZUnit {
  if (c.index) return INDEX_UNIT;
  return zUnit(c.cat, k?.unit_key ?? "", sample);
}

function fmtFor(c: Ctx, k: Kpi | undefined) {
  return {
    value: (v: number) => (c.index ? fmtNumber(v, c.lang, 1) : fmtValue(v, k?.unit_key ?? "", c.cat, c.lang)),
    period: (p: string) => fmtPeriod(p, c.lang),
  };
}

/** Indicator the chart's values are in: the panel's, the filter's, or the first (same unit / index). */
function kpiFor(c: Ctx, at: Record<DimId, string> = {}): Kpi | undefined {
  const key = at.i ?? (c.placed.has("i") ? c.q.i[0] : filterValue(c.q, c.shape, "i"));
  return c.shape.kpis.find((k) => k.kpi_key === key);
}

function cats(c: Ctx, d: DimId): ZCategory[] {
  return c.members(d).map((k) => ({ key: k, label: c.lab(d, k), short: d === "geo" ? VOIV_SHORT[k] : undefined }));
}

function timeSeries(c: Ctx, sDim: DimId | null, at: Record<DimId, string>, single: string): ZSeries[] {
  const keys = sDim ? c.members(sDim) : [""];
  const hero = sDim === "geo" ? Math.max(0, keys.indexOf("PL")) : 0;
  return keys.map((k, j) => ({
    id: sDim ? k : "value",
    label: sDim ? c.lab(sDim, k) : single,
    role: keys.length <= 5 ? "series" : j === hero ? "hero" : "context",
    points: c.shape.periods.map((t) => ({ x: t, y: c.val({ ...at, ...(sDim ? { [sDim]: k } : {}), t }) })),
  }));
}

function changeOf(s: ZSeries): number | null {
  const a = firstPoint(s.points),
    b = lastPoint(s.points);
  return a && b && a.x !== b.x ? b.y - a.y : null;
}

const range = (c: Ctx) => {
  const ps = c.shape.periods;
  return ps.length
    ? ps.length === 1
      ? fmtPeriod(ps[0]!, c.lang)
      : `${fmtPeriod(ps[0]!, c.lang)}–${fmtPeriod(ps[ps.length - 1]!, c.lang)}`
    : "";
};

/** Label of the one series when no dimension is in the series slot (the area, else the indicator). */
function singleLabel(c: Ctx, at: Record<DimId, string>): string {
  if (!c.placed.has("geo") || at.geo) return c.lab("geo", at.geo ?? filterValue(c.q, c.shape, "geo") ?? "PL");
  return c.lab("i", at.i ?? filterValue(c.q, c.shape, "i") ?? "");
}

function buildTime(c: Ctx): Pick<ExploreView, "panels" | "grid" | "title"> & { count: number } {
  const { q, shape, pl } = c;
  const sDim = q.slots.series ?? null;
  const pDim = q.slots.panels ?? null;
  const pKeys = pDim ? c.members(pDim) : [""];
  const panels: Panel[] = [];
  const panelSeries = pKeys.map((pk) => {
    const at = pDim ? { [pDim]: pk } : {};
    return { pk, at, series: timeSeries(c, sDim, at, singleLabel(c, at)) };
  });
  const one = !pDim;
  const shared = !sDim && pDim && q.chart === "line" && (pDim !== "i" || shape.sameUnit || c.index);
  const count = panelSeries.reduce((a, p) => a + p.series.length, 0);
  let title: string;
  if (one) {
    const k = kpiFor(c);
    title = findingTitle(panelSeries[0]!.series, fmtFor(c, k), c.lang);
  } else {
    const ups: string[] = [],
      downs: string[] = [];
    for (const p of panelSeries) {
      const ch = p.series.length === 1 ? changeOf(p.series[0]!) : null;
      if (ch !== null) (ch > 0 ? ups : ch < 0 ? downs : []).push(c.lab(pDim!, p.pk));
    }
    const parts = [
      ups.length ? `${pl ? "Wzrost" : "Up"}: ${ups.join(", ")}` : "",
      downs.length ? `${pl ? "spadek" : "down"}: ${downs.join(", ")}` : "",
    ].filter(Boolean);
    if (parts.length && panelSeries.every((p) => p.series.length === 1)) {
      const s = parts.join("; ");
      title = `${s.charAt(0).toUpperCase()}${s.slice(1)} (${range(c)})`;
    } else {
      const first = panelSeries[0]!;
      title = `${c.lab(pDim!, first.pk)}: ${findingTitle(first.series, fmtFor(c, kpiFor(c, first.at)), c.lang)}`;
    }
  }
  const unitOf = (at: Record<DimId, string>, s: ZSeries[]) =>
    unitFor(c, kpiFor(c, at), sampleOf(s.flatMap((x) => x.points.map((p) => p.y))));
  const draw = (series: ZSeries[], at: Record<DimId, string>, height: number, aria: string): ZChartProps => {
    const unit = unitOf(at, series);
    const base = { unit, lang: c.lang, ariaLabel: aria, formatPeriod: (p: string) => fmtPeriod(p, c.lang) };
    if (q.chart === "columns") {
      if (series.length === 1) return { ...base, type: "columns", series, height };
      return {
        ...base,
        type: "grouped-bars",
        series,
        categories: shape.periods.map((t) => ({ key: t, label: fmtPeriod(t, c.lang), short: t.length === 4 ? t.slice(2) : undefined })),
        height,
      };
    }
    return { ...base, type: "line-highlight", series, height };
  };
  if (one) panels.push({ key: "all", label: null, chart: draw(panelSeries[0]!.series, {}, 380, title) });
  else if (shared) {
    const series = panelSeries.map((p) => ({ ...p.series[0]!, id: p.pk, label: c.lab(pDim!, p.pk), role: "series" as const }));
    panels.push({ key: "sm", label: null, chart: { ...draw(series, {}, 0, title), type: "small-multiples", height: undefined } });
  } else
    for (const p of panelSeries)
      panels.push({ key: p.pk, label: c.lab(pDim!, p.pk), chart: draw(p.series, p.at, 240, `${c.lab(pDim!, p.pk)}: ${title}`) });
  return { panels, grid: !one && !shared, title, count };
}

function buildBars(c: Ctx): Pick<ExploreView, "panels" | "title"> & { count: number } {
  const { q } = c;
  const cDim = q.slots.cats!;
  const sDim = q.slots.series ?? null;
  const t = filterValue(q, c.shape, "t") ?? "";
  const categories = cats(c, cDim);
  const sKeys = sDim ? c.members(sDim).slice(0, 3) : [""];
  const series: ZSeries[] = sKeys.map((sk) => ({
    id: sDim ? sk : "value",
    label: sDim ? c.lab(sDim, sk) : fmtPeriod(t, c.lang),
    role: sDim ? "series" : undefined,
    points: categories.map((k) => ({ x: k.key, y: c.val({ [cDim]: k.key, ...(sDim ? { [sDim]: sk } : {}), t }) })),
  }));
  const k = kpiFor(c);
  const fmt = fmtFor(c, k);
  const perCat = categories.map((cat, j) => ({ id: cat.key, label: cat.label, points: [{ x: t, y: series[0]!.points[j]!.y }] }));
  const found = findingTitle(perCat, fmt, c.lang);
  const title = sDim ? `${series[0]!.label}: ${found.charAt(0).toLowerCase()}${found.slice(1)}` : found;
  const unit = unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y))));
  const highlight = cDim === "geo" && categories.length > 1 && categories.some((x) => x.key === "PL") ? "PL" : undefined;
  const chart: ZChartProps = sDim
    ? { type: "grouped-bars", categories, series, unit, lang: c.lang, ariaLabel: title, height: 340 }
    : { type: "ranked-bars", categories, series, unit, lang: c.lang, ariaLabel: title, highlight };
  return { panels: [{ key: "bars", label: null, chart }], title, count: categories.length };
}

function buildTwoPeriods(c: Ctx): Pick<ExploreView, "panels" | "title"> & { count: number } {
  const { q, pl } = c;
  const cDim = q.slots.cats!;
  const ps = c.shape.periods;
  const p0 = ps[0]!,
    p1 = ps[ps.length - 1]!;
  const categories = cats(c, cDim);
  const series: ZSeries[] = [p0, p1].map((t) => ({
    id: t,
    label: fmtPeriod(t, c.lang),
    points: categories.map((k) => ({ x: k.key, y: c.val({ [cDim]: k.key, t }) })),
  }));
  const k = kpiFor(c);
  const unit = unitFor(c, k, sampleOf(series[1]!.points.map((p) => p.y)));
  const changes = categories
    .map((cat, j) => {
      const a = series[0]!.points[j]!.y,
        b = series[1]!.points[j]!.y;
      return { label: cat.label, d: a === null || b === null ? null : b - a };
    })
    .filter((x): x is { label: string; d: number } => x.d !== null)
    .sort((a, b) => b.d - a.d);
  const hi = changes[0],
    lo = changes[changes.length - 1];
  const when = `${fmtPeriod(p0, c.lang)}–${fmtPeriod(p1, c.lang)}`;
  const title =
    hi && lo && hi !== lo
      ? pl
        ? `Największa zmiana: ${hi.label} (${fmtDiff(hi.d, unit, c.lang)}), najmniejsza: ${lo.label} (${fmtDiff(lo.d, unit, c.lang)}), ${when}`
        : `Largest change: ${hi.label} (${fmtDiff(hi.d, unit, c.lang)}), smallest: ${lo.label} (${fmtDiff(lo.d, unit, c.lang)}), ${when}`
      : hi
        ? `${hi.label}: ${fmtDiff(hi.d, unit, c.lang)} (${when})`
        : pl
          ? "Brak danych dla obu okresów"
          : "No data for both periods";
  const highlight = cDim === "geo" && categories.some((x) => x.key === "PL") ? "PL" : undefined;
  const chart: ZChartProps =
    q.chart === "slope"
      ? { type: "slope", categories, series, unit, lang: c.lang, ariaLabel: title, highlight, height: 360 }
      : { type: "dumbbell", categories, series, unit, lang: c.lang, ariaLabel: title };
  return { panels: [{ key: q.chart, label: null, chart }], title, count: categories.length };
}

function buildHeatmap(c: Ctx): Pick<ExploreView, "panels" | "title"> & { count: number } {
  const { q, pl } = c;
  const rDim = q.slots.rows!;
  const cDim = q.slots.cols!;
  const t = c.placed.has("t") ? undefined : filterValue(q, c.shape, "t");
  const columns = cDim === "t" ? c.shape.periods.map((p) => ({ key: p, label: fmtPeriod(p, c.lang) })) : cats(c, cDim);
  const series: ZSeries[] = c.members(rDim).map((rk) => ({
    id: rk,
    label: c.lab(rDim, rk),
    points: columns.map((col) => ({ x: col.key, y: c.val({ [rDim]: rk, [cDim]: col.key, ...(t ? { t } : {}) }) })),
  }));
  const k = kpiFor(c);
  const fmt = fmtFor(c, k);
  type Cell = { r: string; c: string; v: number };
  const cells: Cell[] = series.flatMap((s) =>
    s.points.flatMap((p, j) => (p.y === null ? [] : [{ r: s.label, c: columns[j]!.label, v: p.y }])),
  );
  const h = cells.reduce<Cell | null>((a, x) => (!a || x.v > a.v ? x : a), null);
  const l = cells.reduce<Cell | null>((a, x) => (!a || x.v < a.v ? x : a), null);
  const title =
    h && l
      ? pl
        ? `Najwyżej: ${h.r}, ${h.c} (${fmt.value(h.v)}); najniżej: ${l.r}, ${l.c} (${fmt.value(l.v)})`
        : `Highest: ${h.r}, ${h.c} (${fmt.value(h.v)}); lowest: ${l.r}, ${l.c} (${fmt.value(l.v)})`
      : pl
        ? "Brak danych dla wybranego zapytania"
        : "No data for this query";
  const unit = unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y))));
  return {
    panels: [{ key: "heat", label: null, chart: { type: "heatmap", categories: columns, series, unit, lang: c.lang, ariaLabel: title } }],
    title,
    count: series.length,
  };
}

function buildMap(c: Ctx): Pick<ExploreView, "panels" | "title"> & { count: number } {
  const { cat, q } = c;
  const t = filterValue(q, c.shape, "t") ?? "";
  const voiv = voivodeshipKeys(cat);
  const k = kpiFor(c);
  const points = voiv.map((g) => ({ x: g, y: c.val({ geo: g, t }) }));
  const perGeo = voiv.map((g, j) => ({ id: g, label: geoName(cat, g, c.lang), points: [{ x: t, y: points[j]!.y }] }));
  const title = findingTitle(perGeo, fmtFor(c, k), c.lang);
  const one = q.geo.filter((g) => g !== "PL");
  const chart: ZChartProps = {
    type: "tile-map",
    categories: voiv.map((g) => ({ key: g, label: geoName(cat, g, c.lang), short: VOIV_SHORT[g] })),
    series: [{ id: "value", label: k ? kpiName(k, c.lang) : "", points }],
    unit: unitFor(c, k, sampleOf(points.map((p) => p.y))),
    lang: c.lang,
    ariaLabel: title,
    highlight: one.length === 1 ? one[0] : undefined,
  };
  return { panels: [{ key: "map", label: null, chart }], title, count: voiv.length };
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n,
    my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

function buildScatter(c: Ctx): Pick<ExploreView, "panels" | "title"> & { count: number } {
  const { q, pl } = c;
  const t = filterValue(q, c.shape, "t") ?? "";
  const [kx, ky] = [c.shape.kpis[0]!, c.shape.kpis[1]!];
  const geos = q.geo;
  const xs = geos.map((g) => c.val({ i: kx.kpi_key, geo: g, t }));
  const ys = geos.map((g) => c.val({ i: ky.kpi_key, geo: g, t }));
  const both = geos.map((_, j) => j).filter((j) => xs[j] !== null && ys[j] !== null);
  const r = pearson(
    both.map((j) => xs[j]!),
    both.map((j) => ys[j]!),
  );
  const ux = unitFor(c, kx, sampleOf(xs));
  const uy = unitFor(c, ky, sampleOf(ys));
  const strength = (v: number) =>
    Math.abs(v) >= 0.7 ? (pl ? "silna" : "strong") : Math.abs(v) >= 0.4 ? (pl ? "umiarkowana" : "moderate") : pl ? "słaba" : "weak";
  const dir = (v: number) => (v >= 0 ? (pl ? "dodatnia" : "positive") : pl ? "ujemna" : "negative");
  const title =
    r === null
      ? pl
        ? "Za mało obszarów z obiema wartościami"
        : "Too few areas with both values"
      : pl
        ? `Zależność ${strength(r)}, ${dir(r)} (r = ${fmtNumber(r, c.lang, 2)}, ${both.length} obszarów), ${fmtPeriod(t, c.lang)}`
        : `${strength(r)} ${dir(r)} relationship (r = ${fmtNumber(r, c.lang, 2)}, ${both.length} areas), ${fmtPeriod(t, c.lang)}`;
  const chart: ZChartProps = {
    type: "scatter",
    categories: geos.map((g) => ({ key: g, label: c.lab("geo", g), short: VOIV_SHORT[g] })),
    series: [
      { id: "x", label: kpiName(kx, c.lang), unit: ux, points: geos.map((g, j) => ({ x: g, y: xs[j]! })) },
      { id: "y", label: kpiName(ky, c.lang), unit: uy, points: geos.map((g, j) => ({ x: g, y: ys[j]! })) },
    ],
    unit: uy,
    lang: c.lang,
    ariaLabel: title,
    highlight: geos.includes("PL") ? "PL" : undefined,
    height: 360,
  };
  return { panels: [{ key: "scatter", label: null, chart }], title, count: both.length };
}

const CHART_NAME: Record<Query["chart"], [string, string]> = {
  line: ["Wykres liniowy", "Line chart"],
  columns: ["Słupki w czasie", "Columns over time"],
  bars: ["Ranking słupkowy", "Bar ranking"],
  dumbbell: ["Zmiana między okresami", "Change between periods"],
  slope: ["Wykres nachylenia", "Slope chart"],
  heatmap: ["Mapa cieplna", "Heatmap"],
  map: ["Mapa województw", "Voivodeship map"],
  scatter: ["Wykres rozrzutu", "Scatter plot"],
};

export function chartName(chart: Query["chart"], lang: Lang): string {
  return CHART_NAME[chart][lang === "pl" ? 0 : 1];
}

/** Everything the canvas draws for the query and its fetched series. */
export function buildView(cat: Catalog, q: Query, shape: Shape, series: Series[], lang: Lang): ExploreView {
  const pl = lang === "pl";
  const placed = placedDims(q, shape);
  const { obs, noBase } = toObs(series, q, shape);
  const dims: DimId[] = ["i", "geo", "t", ...shape.shared];
  // Dimensions not in the chart keep only their filter member; the period too on single-period charts.
  const fixedTo = new Map<DimId, string>();
  for (const d of dims) if (!placed.has(d)) fixedTo.set(d, filterValue(q, shape, d) ?? "");
  const sel = obs.filter((o) => [...fixedTo].every(([d, v]) => coord(o, d) === v));
  const keyOf = (at: Record<DimId, string>) => dims.map((d) => at[d] ?? fixedTo.get(d) ?? "").join("|");
  const map = new Map(sel.map((o) => [keyOf(Object.fromEntries(dims.map((d) => [d, coord(o, d)]))), o.v]));
  const index = isIndexed(q);
  const base = indexBase(q, shape);
  const c: Ctx = {
    cat,
    q,
    shape,
    lang,
    pl,
    index,
    base,
    placed,
    val: (at) => map.get(keyOf(at)) ?? null,
    lab: (d, key) => memberLabel(cat, d, key, lang),
    members: (d) => (d === "geo" && q.chart === "map" ? voivodeshipKeys(cat) : (shape.members[d] ?? [])),
  };

  const built =
    q.chart === "line" || q.chart === "columns"
      ? buildTime(c)
      : q.chart === "bars"
        ? { ...buildBars(c), grid: false }
        : q.chart === "dumbbell" || q.chart === "slope"
          ? { ...buildTwoPeriods(c), grid: false }
          : q.chart === "heatmap"
            ? { ...buildHeatmap(c), grid: false }
            : q.chart === "map"
              ? { ...buildMap(c), grid: false }
              : { ...buildScatter(c), grid: false };

  // Which data is visible: the CSV and the zero-data check use exactly this.
  const ps = shape.periods;
  const visible = sel.filter((o) => {
    if (q.chart === "dumbbell" || q.chart === "slope") return o.t === ps[0] || o.t === ps[ps.length - 1];
    if (q.chart === "scatter") return o.i === q.i[0] || o.i === q.i[1];
    return true;
  });
  const shownKpis = kpisOf(cat, [...new Set(visible.map((o) => o.i))]);
  const kpiText = (shownKpis.length ? shownKpis : shape.kpis).map((k) => kpiName(k, lang));

  // Subtitle: unit or transform · frequency · period · count · compare mode.
  const units = [...new Set((shownKpis.length ? shownKpis : shape.kpis).map((k) => unitName(cat, k.unit_key, lang)))];
  const unitText = index ? (pl ? `indeks, ${base} = 100` : `index, ${base} = 100`) : units.join("; ");
  const freqText = shape.mixed
    ? shape.freq === "A"
      ? pl
        ? "średnie roczne"
        : "annual means"
      : pl
        ? "średnie kwartalne"
        : "quarterly means"
    : freqLabel(shape.freq, lang);
  const singleT = !placed.has("t") ? fmtPeriod(filterValue(q, shape, "t") ?? "", lang) : null;
  const periodText =
    q.chart === "dumbbell" || q.chart === "slope"
      ? `${fmtPeriod(ps[0] ?? "", lang)} ${pl ? "i" : "and"} ${fmtPeriod(ps[ps.length - 1] ?? "", lang)}`
      : (singleT ?? range(c));
  const countText =
    q.chart === "line" || q.chart === "columns"
      ? built.grid || built.panels[0]?.chart.type === "small-multiples"
        ? `${built.panels.length > 1 ? built.panels.length : (built.panels[0]?.chart.series.length ?? 0)} ${plural(built.panels.length > 1 ? built.panels.length : (built.panels[0]?.chart.series.length ?? 0), lang, ["panel", "panele", "paneli"], ["panel", "panels"])}`
        : `${built.count} ${plural(built.count, lang, ["seria", "serie", "serii"], ["series", "series"])}`
      : q.chart === "scatter"
        ? `${built.count} ${plural(built.count, lang, ["punkt", "punkty", "punktów"], ["point", "points"])}`
        : q.chart === "heatmap"
          ? `${built.count} ${plural(built.count, lang, ["wiersz", "wiersze", "wierszy"], ["row", "rows"])}`
          : `${built.count} ${plural(built.count, lang, ["kategoria", "kategorie", "kategorii"], ["category", "categories"])}`;
  const cmpText =
    q.i.length > 1 && q.cmp === "panels" && built.grid ? (pl ? "osobne panele, każdy z własną osią" : "separate panels, own axes") : "";
  const sub = [unitText, freqText, periodText, countText, cmpText].filter(Boolean).join(" · ");

  // Caption: what the single-valued parts of the query are (indicator, area, members used as filters).
  const fixedParts = [...fixedTo]
    .filter(([d]) => d !== "t" && d !== "i" && (shape.members[d]?.length ?? 0) > 0)
    .filter(([d, v]) => !(shape.shared.includes(d) && v === "total" && (shape.members[d]?.length ?? 0) <= 1))
    .map(([d, v]) => memberLabel(cat, d, v, lang));
  const caption = [kpiText.length > 2 ? `${kpiText.length} ${pl ? "wskaźniki" : "indicators"}` : kpiText.join(" · "), ...fixedParts]
    .filter(Boolean)
    .join(" · ");

  const notes: string[] = [];
  if (shape.mixed)
    notes.push(
      pl
        ? `Wskaźniki mają różne częstotliwości: wartości uśredniono do ${shape.freq === "A" ? "lat" : "kwartałów"} (średnia, tylko pełne okresy).`
        : `The indicators have different frequencies: values are averaged to ${shape.freq === "A" ? "years" : "quarters"} (mean of complete periods only).`,
    );
  if (noBase.length) {
    const names = [...new Set(noBase.map((x) => memberLabel(cat, "i", x.split("|")[0]!, lang)))];
    notes.push(
      pl
        ? `Brak wartości dodatniej w roku bazowym ${base}, więc bez indeksu: ${names.join(", ")}. Zmień rok bazowy.`
        : `No positive value in base year ${base}, so no index for: ${names.join(", ")}. Change the base year.`,
    );
  }
  if (q.chart === "scatter" && q.i.length > 2)
    notes.push(
      pl
        ? "Oś X to pierwszy, oś Y drugi wskaźnik; pozostałe pominięto (kolejność zmienisz w kroku 1)."
        : "X is the first and Y the second indicator; others are left out (reorder in step 1).",
    );
  if (q.chart === "map")
    notes.push(
      pl ? "Mapa pokazuje wszystkie 16 województw w wybranym okresie." : "The map shows all 16 voivodeships in the selected period.",
    );
  const partial = [...new Set(shape.kpis.flatMap((k) => k.dimension_keys))].filter((d) => !shape.shared.includes(d));
  if (partial.length && shape.kpis.length > 1)
    notes.push(
      pl
        ? `Wymiary nie wspólne dla wszystkich wskaźników pokazano jako ogółem: ${partial.map((d) => dimName(cat, d, lang)).join(", ")}.`
        : `Dimensions not shared by every indicator are shown as totals: ${partial.map((d) => dimName(cat, d, lang)).join(", ")}.`,
    );

  const valued = visible.filter((o) => o.v !== null);
  const empty = valued.length
    ? undefined
    : pl
      ? `Brak wartości dla ${kpiText.join(", ")} w ${periodText}${fixedParts.length ? ` (${fixedParts.join(", ")})` : ""}. Zmień okres, obszary albo kategorie.`
      : `No values for ${kpiText.join(", ")} in ${periodText}${fixedParts.length ? ` (${fixedParts.join(", ")})` : ""}. Change the period, areas or categories.`;

  // CSV of the visible data, long format (one row per value).
  const unitCol = (k: string) =>
    index
      ? pl
        ? `indeks (${base} = 100)`
        : `index (${base} = 100)`
      : unitName(cat, cat.kpis.find((x) => x.kpi_key === k)?.unit_key ?? "", lang);
  const order = (d: DimId, v: string) => (shape.members[d] ?? []).indexOf(v);
  const rows = visible
    .slice()
    .sort(
      (a, b) =>
        order("i", a.i) - order("i", b.i) ||
        a.geo.localeCompare(b.geo) ||
        JSON.stringify(a.m).localeCompare(JSON.stringify(b.m)) ||
        a.t.localeCompare(b.t),
    );
  const csv: CsvTable = {
    columns: [
      pl ? "wskaźnik" : "indicator",
      pl ? "kod_wskaźnika" : "indicator_key",
      pl ? "obszar" : "area",
      pl ? "kod_obszaru" : "area_key",
      ...shape.shared.map((d) => dimName(cat, d, lang).toLowerCase()),
      pl ? "okres" : "period",
      pl ? "wartość" : "value",
      pl ? "jednostka" : "unit",
    ],
    rows: rows.map((o) => [
      memberLabel(cat, "i", o.i, lang),
      o.i,
      geoName(cat, o.geo, lang),
      o.geo,
      ...shape.shared.map((d) => memberName(cat, d, o.m[d] ?? "total", lang)),
      o.t,
      o.v,
      unitCol(o.i),
    ]),
  };

  const legend = built.panels.length === 1 ? built.panels[0]!.chart : (built.panels[0]?.chart ?? null);
  const name = chartName(q.chart, lang);
  const seriesList = built.panels
    .flatMap((p) => p.chart.series.map((s) => ({ p: p.label, s })))
    .slice(0, 12)
    .map(({ p, s }) => {
      const last = lastPoint(s.points);
      return `${p ? `${p}, ` : ""}${s.label}${last ? `: ${fmtNumber(last.y, lang, 1)} (${fmtPeriod(last.x, lang)})` : ""}`;
    });
  const spoken = `${name}. ${built.title}. ${sub}.${q.chart === "line" || q.chart === "columns" ? ` ${pl ? "Ostatnie wartości" : "Latest values"}: ${seriesList.join("; ")}.` : ""}`;
  const live = pl ? `Wykres zaktualizowany: ${countText}, ${periodText}.` : `Chart updated: ${countText}, ${periodText}.`;
  return {
    caption,
    title: built.title,
    sub,
    panels: built.panels,
    grid: built.grid,
    legend,
    notes,
    csv,
    spoken,
    live,
    empty,
    kpis: shownKpis.length ? shownKpis : shape.kpis,
  };
}

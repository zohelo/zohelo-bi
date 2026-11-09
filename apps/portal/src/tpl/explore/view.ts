// From a normalised query and its data to what the canvas shows: the fetch plan, observations at their native
// frequency, cells (the mean of the matching observations at the chosen Kalendarz level, complete periods only),
// the chart model(s) for ZChart, a business title built from the selection ("Stopa bezrobocia według województw
// i płci, 2 kw. 2026"), the subtitle, a one-line finding, notes, the raw CSV, a pivot table and the spoken summary.
// One generic builder serves every kind with an axis, a legend and small multiples; maps, scatter/bubble, box plot,
// heatmap/matrix, IBCS/variances and the bridge have their own.

import { applyLook, businessOf, lookInEffect, wardrobeOf } from "./looks";
import { KIND_VARIANT, applyVariant, currentVariant, variantVerdict } from "./variants";
import type { Catalog, Frequency, Kpi, Series } from "../../data";
import type { Lang } from "../../i18n";
import { NEED_INFO, fmtSigned, type ZCategory, type ZChartProps, type ZSeries, type ZUnit } from "@zohelo/visuals";
import { geoName, kpiName, memberName, zUnit } from "../chartData";
import { fmtNumber, fmtPeriod, fmtValue, freqLabel } from "../format";
import { polarityOf } from "../polarity";
import type { CsvTable } from "./csv";
import {
  filterValue,
  indexBase,
  isIndexed,
  kpisOf,
  placedDims,
  sourceOf,
  type DimId,
  type Query,
  type Shape,
  type SlotKey,
} from "./exploreState";
import { findingTitle, lastPoint } from "./findings";
import { KIND_INFO, kindName, measureWells } from "./kinds";
import { VOIV_SHORT, hasVoivodeships, unitName, voivodeshipKeys } from "./kpiInfo";
import { missing, SLOTS, type Need } from "./layout";
import { dimBy, dimLabel, isTimeDim, listText, monthOfYear, periodAt, quarterOfYear, seasonLabel, supportsGrain } from "./model";
import { plural } from "./search";
import { indexPoints, partsPer, freqOf } from "./transform";

export type Fetch = { kpi: string; source: string; geographies: string[]; members: Record<string, string> };
/** More calls than this is a query nobody can read; the canvas asks to narrow it. */
export const MAX_FETCHES = 96;

/** Kinds that show all 16 voivodeships when the area is on the chart. */
export const ALL_VOIV = new Set<Query["chart"]>(["map", "choro", "boxplot"]);

/** Same period one year earlier: "2026-09" → "2025-09", "2026-Q2" → "2025-Q2", "2025" → "2024". */
export function pyPeriod(p: string): string {
  return `${Number(p.slice(0, 4)) - 1}${p.slice(4)}`;
}

/** Measures the chart reads: all when "Miary" is placed or the kind has a well per measure, else the filter one. */
function shownMeasures(q: Query, shape: Shape, cat: Catalog): Kpi[] {
  const mw = measureWells(q.chart);
  if (mw) return shape.kpis.slice(0, mw.length);
  if (placedDims(q).has("i")) return shape.kpis;
  return kpisOf(cat, [filterValue(q, shape, "i") ?? ""]);
}

/** Members a placed dimension shows in its well (all voivodeships on maps, the last periods within a cap). */
function wellMembers(q: Query, shape: Shape, cat: Catalog, d: DimId, slot: SlotKey | undefined): string[] {
  let ms = d === "geo" && q.level === "voivodeship" && ALL_VOIV.has(q.chart) ? voivodeshipKeys(cat) : (shape.members[d] ?? []);
  const sp = slot ? KIND_INFO[q.chart].slots.find((s) => s.key === slot) : undefined;
  if (sp?.pair) ms = d === "t" ? (ms.length > 1 ? [ms[0]!, ms[ms.length - 1]!] : ms) : ms.slice(0, 2);
  else if (sp?.cap && d === "t" && ms.length > sp.cap) ms = ms.slice(-sp.cap);
  return ms;
}

/** Values of dimensions in no well: their filter member, or undefined where the chart spans them (seasonal views). */
function fixedOf(q: Query, shape: Shape): Map<DimId, string | undefined> {
  const placed = placedDims(q);
  const out = new Map<DimId, string | undefined>();
  const seasonal = placed.has("t.moy") || placed.has("t.qoy");
  for (const d of ["i", "geo", "t", "t.moy", "t.qoy", ...shape.dims]) {
    if (placed.has(d) || !shape.members[d]) continue;
    if (d === "i" && measureWells(q.chart)) continue;
    if (d === "t" && seasonal && !q.filters.t) continue;
    if ((d === "t.moy" || d === "t.qoy") && !q.filters[d]) continue;
    out.set(d, filterValue(q, shape, d));
  }
  return out;
}

/** One call per shown measure and member combination of its own breakdowns; filters fetch only their member. */
export function fetchPlan(q: Query, shape: Shape, cat: Catalog): Fetch[] {
  if (!q.i.length) return [];
  const placed = placedDims(q);
  const fixed = fixedOf(q, shape);
  const geoSlot = SLOTS[q.chart].find((s) => q.slots[s] === "geo");
  const geos = placed.has("geo") ? wellMembers(q, shape, cat, "geo", geoSlot) : [fixed.get("geo") ?? q.geo[0] ?? "PL"];
  return shownMeasures(q, shape, cat).flatMap((k) => {
    let combos: Record<string, string>[] = [{}];
    for (const d of shape.dims) {
      if (!k.dimension_keys.includes(d)) continue;
      const ms = placed.has(d) ? (shape.members[d] ?? []) : [fixed.get(d) ?? "total"];
      combos = combos.flatMap((c) => ms.map((m) => ({ ...c, [d]: m })));
    }
    return combos.map((members) => ({
      kpi: k.kpi_key,
      source: sourceOf(q, k),
      geographies: geos.filter((g) => k.geographies.includes(g)),
      members,
    }));
  });
}

export type Obs = { i: string; geo: string; m: Record<string, string>; t: string; v: number | null };

/** Series → observations at their native frequency in the window years, indexed when asked. */
export function toObs(series: Series[], q: Query, shape: Shape): { obs: Obs[]; noBase: string[] } {
  const [y0, y1] = shape.window;
  const base = indexBase(q, shape);
  const noBase: string[] = [];
  const obs: Obs[] = [];
  const pyFrom = businessOf(q, shape) ? y0 - 1 : y0;
  for (const s of series) {
    const k = shape.kpis.find((x) => x.kpi_key === s.kpi_key);
    if (!k) continue;
    let pts = s.points.map((p) => ({ x: p.period, y: p.value }));
    if (isIndexed(q, shape)) {
      const r = indexPoints(pts, base);
      if (!r.ok) noBase.push(`${s.kpi_key}|${s.geography}`);
      pts = r.points;
    }
    const m: Record<string, string> = {};
    for (const d of k.dimension_keys) m[d] = s.members[d] ?? "total";
    for (const p of pts) {
      const y = Number(p.x.slice(0, 4));
      if (y >= pyFrom && y <= y1) obs.push({ i: s.kpi_key, geo: s.geography, m, t: p.x, v: p.y });
    }
  }
  return { obs, noBase };
}

export const INDEX_UNIT: ZUnit = { symbol: "", isRate: false, decimals: 1 };

export type Panel = { key: string; label: string | null; chart: ZChartProps };
export type MatrixModel = {
  rowHead: string;
  colHead: string | null;
  rows: { key: string; label: string }[];
  cols: { key: string; label: string }[];
  /** Formatted cells, rows × cols ("–" = no value). */
  cells: string[][];
  raw: (number | null)[][];
  note: string;
};
export type Pivot = { columns: string[]; rows: (string | number | null)[][] };

export type ExploreView = {
  /** Measures shown (for saved-view names). */
  caption: string;
  title: string;
  sub: string;
  /** One sentence from the numbers (highest/lowest, change, correlation). */
  finding: string;
  panels: Panel[];
  /** Several panels side by side (each its own chart and axis). */
  grid: boolean;
  /** Chart whose legend is shown (two or more entries). */
  legend: ZChartProps | null;
  notes: string[];
  csv: CsvTable;
  /** The chart's numbers with the axis in rows and the series in columns. */
  pivot: Pivot;
  spoken: string;
  live: string;
  /** Set when there is nothing to draw: names the cause. */
  empty?: string;
  /** Wells the chart still needs (drawn as a prompt instead of a chart). */
  needs: Need[];
  kpis: Kpi[];
  matrix?: MatrixModel;
};

export type Ctx = {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  pl: boolean;
  index: boolean;
  base: number;
  placed: Set<DimId>;
  fixed: Map<DimId, string | undefined>;
  val: (at: Record<DimId, string>) => number | null;
  lab: (d: DimId, key: string) => string;
  /** Members of a placed dimension as its well shows them. */
  members: (d: DimId) => string[];
  notes: Set<string>;
};

/** Name of a dimension (chip, column head). */
export function dimName(cat: Catalog, d: DimId, lang: Lang, ctx: { grain?: Shape["grain"] | null; level?: Query["level"] } = {}): string {
  return dimLabel(cat, d, lang, ctx);
}

export function memberLabel(cat: Catalog, d: DimId, key: string, lang: Lang): string {
  if (d === "i") {
    const k = cat.kpis.find((x) => x.kpi_key === key);
    return k ? kpiName(k, lang) : key;
  }
  if (d === "geo") return geoName(cat, key, lang);
  if (d === "t") return fmtPeriod(key, lang);
  if (d === "t.moy" || d === "t.qoy") return seasonLabel(d, key, lang);
  return memberName(cat, d, key, lang);
}

export const sampleOf = (vals: (number | null)[]) => vals.find((v) => v !== null && Number.isFinite(v)) ?? 1;

function kpiAt(c: Ctx, at: Record<DimId, string>): Kpi | undefined {
  const key = at.i ?? c.fixed.get("i") ?? c.q.i[0];
  return c.shape.kpis.find((k) => k.kpi_key === key);
}

export function unitFor(c: Ctx, k: Kpi | undefined, sample: number): ZUnit {
  if (c.index) return INDEX_UNIT;
  return zUnit(c.cat, k?.unit_key ?? "", sample);
}

function fmtFor(c: Ctx, k: Kpi | undefined) {
  const x = c.q.slots.x;
  return {
    value: (v: number) => (c.index ? fmtNumber(v, c.lang, 1) : fmtValue(v, k?.unit_key ?? "", c.cat, c.lang)),
    // The x axis may be a seasonal attribute (month or quarter of year) rather than a period.
    period: (p: string) => (x === "t.moy" || x === "t.qoy" ? c.lab(x, p) : fmtPeriod(p, c.lang)),
  };
}

/** The cell lookup: mean of the observations matching the constraints (complete periods when aggregating time). */
function makeVal(obs: Obs[], shape: Shape, fixed: Map<DimId, string | undefined>): (at: Record<DimId, string>) => number | null {
  type Cell = { sum: number; n: number; fq: Frequency };
  const cache = new Map<string, Map<string, Cell>>();
  const has = (i: string, d: string) => shape.has[i]?.has(d) ?? false;
  const coord = (o: Obs, d: DimId): string | undefined => {
    if (d === "i") return o.i;
    if (d === "geo") return o.geo;
    if (d === "t") return periodAt(o.t, shape.grain);
    if (d === "t.moy") return monthOfYear(o.t);
    if (d === "t.qoy") return quarterOfYear(o.t);
    return has(o.i, d) ? o.m[d] : "*";
  };
  return (at) => {
    const cons = new Map<DimId, string>();
    for (const [d, v] of fixed) if (v !== undefined) cons.set(d, v);
    for (const [d, v] of Object.entries(at)) cons.set(d, v);
    const dims = [...cons.keys()].sort();
    const sig = dims.join("|");
    let index = cache.get(sig);
    if (!index) {
      index = new Map();
      for (const o of obs) {
        if (o.v === null || !Number.isFinite(o.v)) continue;
        const parts: string[] = [];
        let ok = true;
        for (const d of dims) {
          const v = coord(o, d);
          if (v === undefined) {
            ok = false;
            break;
          }
          parts.push(v);
        }
        if (!ok) continue;
        const key = parts.join("|");
        const cell = index.get(key) ?? { sum: 0, n: 0, fq: freqOf(o.t) };
        cell.sum += o.v;
        cell.n += 1;
        index.set(key, cell);
      }
      cache.set(sig, index);
    }
    const measure = cons.get("i");
    const related = (d: DimId) => d === "i" || d === "geo" || isTimeDim(d) || !measure || has(measure, d);
    const key = dims.map((d) => (related(d) ? cons.get(d)! : "*")).join("|");
    const cell = index.get(key);
    if (!cell) return null;
    // A coarser period needs every part (a year of 9 months is not a year), unless a seasonal attribute is used.
    if (cons.has("t") && !cons.has("t.moy") && !cons.has("t.qoy")) {
      const need = partsPer(cell.fq, shape.freq);
      if (need > 1 && cell.n < need) return null;
    }
    return Math.round((cell.sum / cell.n) * 1e6) / 1e6;
  };
}

const short = (d: DimId, k: string) => (d === "geo" ? VOIV_SHORT[k] : d === "t" && /^\d{4}$/.test(k) ? k.slice(2) : undefined);
function cats(c: Ctx, d: DimId, keys: string[]): ZCategory[] {
  return keys.map((k) => ({ key: k, label: c.lab(d, k), short: short(d, k) }));
}

/** Label of the one series when no dimension is in the legend (the area, else the measure). */
function singleLabel(c: Ctx): string {
  const k = kpiAt(c, {});
  if (c.placed.has("geo") || c.fixed.get("geo") === undefined) return k ? kpiName(k, c.lang) : "";
  return c.lab("geo", c.fixed.get("geo")!);
}

type Built = { panels: Panel[]; grid: boolean; count: number; countText: string; periodText?: string; finding: string };

const one = (key: string, chart: ZChartProps): Panel[] => [{ key, label: null, chart }];
const seriesCount = (n: number, lang: Lang) => `${n} ${plural(n, lang, ["seria", "serie", "serii"], ["series", "series"])}`;
const catsCount = (n: number, lang: Lang) => `${n} ${plural(n, lang, ["kategoria", "kategorie", "kategorii"], ["category", "categories"])}`;

/** Axis × legend × small multiples: every kind with a category or time axis. */
function buildXY(c: Ctx): Built {
  const { q, lang } = c;
  const xD = q.slots.x ?? null;
  const lD = q.slots.legend ?? null;
  const smD = q.slots.sm ?? null;
  const xKeys = xD ? c.members(xD) : [];
  const lKeys = lD ? c.members(lD) : [""];
  const smKeys = smD ? c.members(smD).slice(0, 12) : [""];
  const chart = q.chart;
  const fmtX = (k: string) => (xD ? c.lab(xD, k) : k);
  const panels: Panel[] = [];
  let finding = "";
  for (const sk of smKeys) {
    const smAt: Record<DimId, string> = smD ? { [smD]: sk } : {};
    const mk = (lk: string, xk: string) => c.val({ ...smAt, ...(lD ? { [lD]: lk } : {}), ...(xD ? { [xD]: xk } : {}) });
    const series: ZSeries[] = lKeys.map((lk, j) => ({
      id: lD ? lk : "value",
      label: lD ? c.lab(lD, lk) : singleLabel(c),
      role: lKeys.length <= 5 ? "series" : lD === "geo" && lk === "PL" ? "hero" : j === 0 && lD !== "geo" ? "hero" : "context",
      points: xKeys.map((xk) => ({ x: xk, y: mk(lk, xk) })),
    }));
    const k = kpiAt(c, smAt);
    const unit = unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y))));
    const aria = smD ? `${c.lab(smD, sk)}` : "";
    const base = { unit, lang, ariaLabel: aria, formatPeriod: fmtX };
    const categories = xD ? cats(c, xD, xKeys) : undefined;
    const hl = xD === "geo" && xKeys.includes("PL") ? "PL" : undefined;
    const sum = (xk: string) => series.reduce((a, s) => a + Math.max(0, s.points.find((p) => p.x === xk)?.y ?? 0), 0);
    const shares = (): ZSeries[] =>
      series.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ x: p.x, y: p.y === null || !sum(p.x) ? null : (Math.max(0, p.y) / sum(p.x)) * 100 })),
      }));
    const pctUnit: ZUnit = { symbol: "%", isRate: true, decimals: 1 };
    let z: ZChartProps;
    switch (chart) {
      case "area":
        z = { ...base, type: "area", series };
        break;
      case "stacked":
        z = { ...base, type: "stacked-area", series };
        break;
      case "share":
        z = { ...base, type: "area-share", series: shares(), unit: pctUnit };
        break;
      case "bump":
        z = { ...base, type: "bump", series, highlight: series.some((s) => s.id === "PL") ? "PL" : undefined };
        break;
      case "columns":
        z = series.length === 1 ? { ...base, type: "columns", series, categories } : { ...base, type: "grouped-bars", series, categories };
        break;
      case "stackcols":
        z = { ...base, type: "stacked-columns", series, categories };
        break;
      case "contributions":
        z = { ...base, type: "contributions", series, categories };
        break;
      case "bars":
        // Every legend series stays: the bar look decides (ranked, clustered, stacked, 100%).
        z = { ...base, type: "ranked-bars", series, categories, highlight: hl };
        break;
      case "lollipop":
        z = { ...base, type: "lollipop", series: series.slice(0, 1), categories, highlight: hl };
        break;
      case "diverging":
        z = { ...base, type: "diverging-bars", series: series.slice(0, 1), categories };
        break;
      case "treemap":
        z = {
          ...base,
          type: "treemap",
          series: [{ ...series[0]!, points: series[0]!.points.filter((p) => p.y !== null && p.y > 0 && p.x !== "total") }],
          categories,
        };
        break;
      case "waterfall":
        z = {
          ...base,
          type: "waterfall",
          series: [{ ...series[0]!, points: series[0]!.points.filter((p) => p.x !== "total") }],
          categories,
        };
        break;
      case "dots":
        z = { ...base, type: "dot-plot", series: series.slice(0, 3), categories };
        break;
      case "stackbars":
        z = { ...base, type: "stacked-bars", series: shares(), categories, unit: pctUnit };
        break;
      case "pyramid":
        z = { ...base, type: "pyramid", series: series.slice(0, 2), categories };
        break;
      case "dumbbell":
        z = { ...base, type: "dumbbell", series: series.slice(0, 2), categories };
        break;
      case "slope":
        z = { ...base, type: "slope", series: series.slice(0, 2), categories, highlight: hl, height: 360 };
        break;
      case "ranking": {
        const t = c.fixed.get("t");
        const ps = c.shape.periods;
        const prev = t && !c.placed.has("t") ? ps[ps.indexOf(t) - 1] : undefined;
        const cur: ZSeries = { ...series[0]!, label: t ? c.lab("t", t) : series[0]!.label };
        const prevS: ZSeries[] = prev
          ? [
              {
                id: "prev",
                label: c.lab("t", prev),
                points: xKeys.map((xk) => ({ x: xk, y: c.val({ ...smAt, ...(xD ? { [xD]: xk } : {}), t: prev }) })),
              },
            ]
          : [];
        z = { ...base, type: "ranking-table", series: [cur, ...prevS], categories, highlight: hl };
        break;
      }
      default:
        z = { ...base, type: "line-highlight", series };
    }
    const own = findingOf(c, z, k);
    if (!finding) finding = own && smD && smKeys.length > 1 ? `${c.lab(smD, sk)}: ${own}` : own;
    z.ariaLabel = [aria, own].filter(Boolean).join(": ");
    panels.push({ key: sk || "all", label: smD ? c.lab(smD, sk) : null, chart: z });
  }
  // A line in small multiples without a legend: one shared-scale chart.
  if (chart === "line" && smD && !lD && xD === "t" && smKeys.length > 1 && (smD !== "i" || c.shape.sameUnit || c.index)) {
    const series = panels.map((p) => ({ ...p.chart.series[0]!, id: p.key, label: p.label ?? "", role: "series" as const }));
    const z: ZChartProps = { ...panels[0]!.chart, type: "small-multiples", series, height: undefined, ariaLabel: finding };
    return {
      panels: one("sm", z),
      grid: false,
      count: series.length,
      countText: `${series.length} ${plural(series.length, lang, ["panel", "panele", "paneli"], ["panel", "panels"])}`,
      finding,
    };
  }
  const nSeries = lD ? lKeys.length : 1;
  const timeAxis = xD === "t";
  const countText =
    panels.length > 1
      ? `${panels.length} ${plural(panels.length, lang, ["panel", "panele", "paneli"], ["panel", "panels"])}`
      : timeAxis
        ? seriesCount(nSeries, lang)
        : nSeries > 1
          ? `${catsCount(xKeys.length, lang)} × ${seriesCount(nSeries, lang)}`
          : catsCount(xKeys.length, lang);
  return { panels, grid: panels.length > 1, count: xKeys.length, countText, finding };
}

/** One sentence from a drawn chart: change of one line, highest and lowest of several or of categories. */
function findingOf(c: Ctx, z: ZChartProps, k: Kpi | undefined): string {
  const fmt = fmtFor(c, k);
  const timeAxis = c.q.slots.x === "t";
  const catLabel = (x: string) => (z.categories?.find((y) => y.key === x)?.label ?? x) as string;
  if (z.type === "pyramid" || z.type === "segmented-bar") return "";
  if (z.type === "dumbbell" || z.type === "slope") {
    const [a, b] = z.series;
    if (!a || !b) return "";
    const ch = a.points
      .map((p) => ({ x: p.x, a: p.y, b: b.points.find((q) => q.x === p.x)?.y ?? null }))
      .filter((r): r is { x: string; a: number; b: number } => r.a !== null && r.b !== null)
      .sort((r, s) => Math.abs(s.b - s.a) - Math.abs(r.b - r.a))[0];
    if (!ch) return "";
    return `${c.pl ? "Największa zmiana" : "Largest change"}: ${catLabel(ch.x)} (${fmt.value(ch.a)} → ${fmt.value(ch.b)})`;
  }
  if (timeAxis || z.type === "line-highlight" || z.type === "area") return findingTitle(z.series, fmt, c.lang);
  const s = z.series[0];
  if (!s) return "";
  const per = s.points.map((p) => ({ id: p.x, label: catLabel(p.x), points: [{ x: "", y: p.y }] }));
  if (z.unit.symbol === "%" && (z.type === "stacked-bars" || z.type === "area-share")) return "";
  const known = per.filter((p) => p.points[0]!.y !== null);
  if (known.length < 2) return known[0] ? `${known[0].label}: ${fmt.value(known[0].points[0]!.y!)}` : "";
  const f = findingTitle(per, { ...fmt, period: () => "" }, c.lang);
  return f.replace(/,? \(\)$/, "").replace(/, $/, "");
}

function buildHeat(c: Ctx): Built {
  const { q, lang, pl } = c;
  const rD = q.slots.rows!;
  const cD = q.slots.cols!;
  const rKeys = c.members(rD);
  const cKeys = c.members(cD);
  const series: ZSeries[] = rKeys.map((rk) => ({
    id: rk,
    label: c.lab(rD, rk),
    points: cKeys.map((ck) => ({ x: ck, y: c.val({ [rD]: rk, [cD]: ck }) })),
  }));
  const k = kpiAt(c, {});
  const fmt = fmtFor(c, k);
  type Cell = { r: string; c: string; v: number };
  const cells: Cell[] = series.flatMap((s) => s.points.flatMap((p) => (p.y === null ? [] : [{ r: s.label, c: c.lab(cD, p.x), v: p.y }])));
  const h = cells.reduce<Cell | null>((a, x) => (!a || x.v > a.v ? x : a), null);
  const l = cells.reduce<Cell | null>((a, x) => (!a || x.v < a.v ? x : a), null);
  const finding =
    h && l
      ? pl
        ? `Najwyżej: ${h.r}, ${h.c} (${fmt.value(h.v)}); najniżej: ${l.r}, ${l.c} (${fmt.value(l.v)})`
        : `Highest: ${h.r}, ${h.c} (${fmt.value(h.v)}); lowest: ${l.r}, ${l.c} (${fmt.value(l.v)})`
      : "";
  const unit = unitFor(c, k, sampleOf(cells.map((x) => x.v)));
  const z: ZChartProps = { type: "heatmap", categories: cats(c, cD, cKeys), series, unit, lang, ariaLabel: finding };
  return { panels: one("heat", z), grid: false, count: rKeys.length, countText: `${rKeys.length} × ${cKeys.length}`, finding };
}

function buildMatrix(c: Ctx): Built & { matrix: MatrixModel } {
  const { q, pl, shape, cat, lang } = c;
  const rD = q.slots.rows!;
  const cD = q.slots.cols ?? null;
  const rows = c.members(rD).map((key) => ({ key, label: c.lab(rD, key) }));
  const cols = cD ? c.members(cD).map((key) => ({ key, label: c.lab(cD, key) })) : [{ key: "", label: pl ? "Wartość" : "Value" }];
  const raw = rows.map((r) => cols.map((col) => c.val({ [rD]: r.key, ...(cD ? { [cD]: col.key } : {}) })));
  const kAt = (rk: string, ck: string) => {
    const key = rD === "i" ? rk : cD === "i" ? ck : undefined;
    return key ? shape.kpis.find((x) => x.kpi_key === key) : kpiAt(c, {});
  };
  const cells = rows.map((r, i) =>
    cols.map((col, j) => {
      const v = raw[i]![j]!;
      if (v === null) return "–";
      if (c.index) return fmtNumber(v, lang, 1);
      const k = kAt(r.key, col.key);
      return k ? fmtValue(v, k.unit_key, cat, lang) : fmtNumber(v, lang, 1);
    }),
  );
  const ctx = { grain: shape.grain, level: q.level };
  const note = pl
    ? "Macierz pokazuje dokładne wartości; kopiowanie i pobieranie (CSV, XLSX) obejmują wszystkie komórki."
    : "The matrix shows exact values; copying and downloads (CSV, XLSX) include every cell.";
  return {
    panels: [],
    grid: false,
    count: rows.length,
    countText: `${rows.length} × ${cols.length}`,
    finding: "",
    matrix: { rowHead: dimLabel(cat, rD, lang, ctx), colHead: cD ? dimLabel(cat, cD, lang, ctx) : null, rows, cols, cells, raw, note },
  };
}

function buildMap(c: Ctx): Built {
  const { cat, q, lang, pl } = c;
  const voiv = voivodeshipKeys(cat);
  const smD = q.slots.sm ?? null;
  const smKeys = smD ? c.members(smD).slice(0, 6) : [""];
  const k = shownMeasures(q, c.shape, cat)[0];
  let finding = "";
  const panels = smKeys.map((sk): Panel => {
    const at: Record<DimId, string> = { ...(smD ? { [smD]: sk } : {}), ...(k ? { i: k.kpi_key } : {}) };
    const points = voiv.map((g) => ({ x: g, y: c.val({ ...at, geo: g }) }));
    const per = voiv.map((g, j) => ({ id: g, label: geoName(cat, g, lang), points: [{ x: "", y: points[j]!.y }] }));
    const f = findingTitle(per, { ...fmtFor(c, k), period: () => "" }, lang).replace(/, $/, "");
    if (!finding) finding = f;
    const one1 = q.geo.filter((g) => g !== "PL");
    return {
      key: sk || "map",
      label: smD ? c.lab(smD, sk) : null,
      chart: {
        type: q.chart === "choro" ? "choropleth" : "tile-map",
        categories: voiv.map((g) => ({ key: g, label: geoName(cat, g, lang), short: VOIV_SHORT[g] })),
        series: [{ id: "value", label: k ? kpiName(k, lang) : "", points }],
        unit: unitFor(c, k, sampleOf(points.map((p) => p.y))),
        lang,
        ariaLabel: f,
        highlight: one1.length === 1 ? one1[0] : undefined,
      },
    };
  });
  return { panels, grid: panels.length > 1, count: 16, countText: pl ? "16 województw" : "16 voivodeships", finding };
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

function buildScatter(c: Ctx): Built {
  const { q, pl, lang, shape } = c;
  const pD = q.slots.x!;
  const keys = c.members(pD);
  const ms = shape.kpis.slice(0, q.chart === "bubble" ? 3 : 2);
  const smD = q.slots.sm ?? null;
  const smKeys = smD ? c.members(smD).slice(0, 6) : [""];
  let finding = "";
  let points = 0;
  const panels = smKeys.map((sk): Panel => {
    const at = smD ? { [smD]: sk } : {};
    const vals = ms.map((k) => keys.map((p) => c.val({ ...at, i: k.kpi_key, [pD]: p })));
    const both = keys.map((_, j) => j).filter((j) => vals[0]?.[j] != null && vals[1]?.[j] != null);
    points = Math.max(points, both.length);
    const r = pearson(
      both.map((j) => vals[0]![j]!),
      both.map((j) => vals[1]![j]!),
    );
    const strength = (v: number) =>
      Math.abs(v) >= 0.7 ? (pl ? "silna" : "strong") : Math.abs(v) >= 0.4 ? (pl ? "umiarkowana" : "moderate") : pl ? "słaba" : "weak";
    const dir = (v: number) => (v >= 0 ? (pl ? "dodatnia" : "positive") : pl ? "ujemna" : "negative");
    const f =
      r === null
        ? pl
          ? "Za mało punktów z obiema wartościami"
          : "Too few points with both values"
        : pl
          ? `Zależność ${strength(r)}, ${dir(r)} (r = ${fmtNumber(r, lang, 2)}, ${both.length} punktów)`
          : `${strength(r)} ${dir(r)} relationship (r = ${fmtNumber(r, lang, 2)}, ${both.length} points)`;
    if (!finding) finding = f;
    const ids = ["x", "y", "size"];
    const series: ZSeries[] = ms.map((k, j) => ({
      id: ids[j]!,
      label: kpiName(k, lang),
      unit: unitFor(c, k, sampleOf(vals[j]!)),
      points: keys.map((p, n) => ({ x: p, y: vals[j]![n]! })),
    }));
    return {
      key: sk || "scatter",
      label: smD ? c.lab(smD, sk) : null,
      chart: {
        type: "scatter",
        categories: cats(c, pD, keys),
        series,
        unit: series[1]?.unit ?? unitFor(c, ms[0], 1),
        lang,
        ariaLabel: f,
        highlight: keys.includes("PL") ? "PL" : undefined,
      },
    };
  });
  return {
    panels,
    grid: panels.length > 1,
    count: points,
    countText: `${points} ${plural(points, lang, ["punkt", "punkty", "punktów"], ["point", "points"])}`,
    finding,
  };
}

function median(v: number[]): number | null {
  const s = v.slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function buildBoxplot(c: Ctx): Built {
  const { q, pl, lang } = c;
  const bD = q.slots.x!;
  const uD = q.slots.legend!;
  const boxes = c.members(bD);
  const units = c.members(uD);
  const k = kpiAt(c, {});
  const series: ZSeries[] = boxes.map((b) => ({
    id: b,
    label: c.lab(bD, b),
    points: units.map((u) => ({ x: u, y: c.val({ [bD]: b, [uD]: u }) })),
  }));
  const meds = series.map((s) => median(s.points.map((p) => p.y).filter((v): v is number => v !== null)));
  const fmt = fmtFor(c, k);
  const first = meds.find((m) => m !== null);
  const last = [...meds].reverse().find((m) => m !== null);
  const finding =
    first != null && last != null
      ? pl
        ? `Mediana: ${fmt.value(first)} → ${fmt.value(last)}`
        : `Median: ${fmt.value(first)} → ${fmt.value(last)}`
      : "";
  const z: ZChartProps = {
    type: "boxplot",
    categories: cats(c, uD, units),
    series,
    unit: unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y)))),
    lang,
    ariaLabel: finding,
    highlight: q.geo.find((g) => g !== "PL" && units.includes(g)),
    formatPeriod: (p) => c.lab(bD, p),
  };
  return { panels: one("box", z), grid: false, count: boxes.length, countText: `${boxes.length} × ${units.length}`, finding };
}

function buildHistogram(c: Ctx): Built {
  const { q, pl, lang } = c;
  const uD = q.slots.x!;
  const units = c.members(uD);
  const k = kpiAt(c, {});
  const vals = units.map((u) => c.val({ [uD]: u })).filter((v): v is number => v !== null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const bins = Math.min(8, Math.max(3, Math.round(Math.sqrt(vals.length))));
  const raw = (hi - lo) / bins || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const edges: number[] = [];
  for (let e = start; e <= hi + 1e-9; e += step) edges.push(Math.round(e * 1e6) / 1e6);
  const keys = edges.map((e) => `${e}-${Math.round((e + step) * 1e6) / 1e6}`);
  const counts = edges.map((e) => vals.filter((v) => v >= e && v < e + step).length);
  const med = median(vals);
  const fmt = fmtFor(c, k);
  const finding =
    med !== null ? (pl ? `Mediana ${fmt.value(med)}; ${vals.length} jednostek` : `Median ${fmt.value(med)}; ${vals.length} units`) : "";
  const z: ZChartProps = {
    type: "histogram",
    series: [{ id: "count", label: pl ? "Liczba jednostek" : "Number of units", points: keys.map((x, j) => ({ x, y: counts[j]! })) }],
    unit: unitFor(c, k, sampleOf(vals)),
    lang,
    ariaLabel: finding,
    reference: med !== null ? { value: med, label: `${pl ? "mediana" : "median"} ${fmt.value(med)}` } : undefined,
  };
  return { panels: one("hist", z), grid: false, count: vals.length, countText: `${vals.length} ${pl ? "jednostek" : "units"}`, finding };
}

function buildSparkline(c: Ctx): Built {
  const { q, lang } = c;
  const rD = q.slots.rows!;
  const rows = c.members(rD);
  const ps = c.shape.periods;
  const series: ZSeries[] = rows.map((r) => {
    const at = { [rD]: r };
    const k = kpiAt(c, at);
    const pts = ps.map((t) => ({ x: t, y: c.val({ ...at, t }) }));
    return { id: r, label: c.lab(rD, r), unit: unitFor(c, k, sampleOf(pts.map((p) => p.y))), points: pts };
  });
  const z: ZChartProps = {
    type: "sparkline-table",
    series,
    unit: series[0]?.unit ?? INDEX_UNIT,
    lang,
    ariaLabel: "",
    formatPeriod: (p) => fmtPeriod(p, lang),
  };
  const periodText = ps.length ? `${fmtPeriod(ps[0]!, lang)}–${fmtPeriod(ps[ps.length - 1]!, lang)}` : undefined;
  return {
    panels: one("spark", z),
    grid: false,
    count: rows.length,
    countText: `${rows.length} ${plural(rows.length, lang, ["wiersz", "wiersze", "wierszy"], ["row", "rows"])}`,
    periodText,
    finding: "",
  };
}

/** IBCS / variance over time: actual against the same period a year earlier. */
function buildVarianceTime(c: Ctx, type: "ibcs-columns" | "variance-columns"): Built {
  const { q, pl, lang, shape } = c;
  const smD = q.slots.sm ?? null;
  const smKeys = smD ? c.members(smD).slice(0, 6) : [""];
  const keep = shape.freq === "A" ? 10 : 12;
  const periods = shape.periods.slice(-keep);
  let finding = "";
  const panels = smKeys.map((sk): Panel => {
    const at = smD ? { [smD]: sk } : {};
    const k = kpiAt(c, at);
    const ac = periods.map((p) => c.val({ ...at, t: p }));
    const py = periods.map((p) => c.val({ ...at, t: pyPeriod(p) }));
    const unit = unitFor(c, k, sampleOf(ac));
    const deltas = periods.map((_, j) => (ac[j] !== null && py[j] !== null ? ac[j]! - py[j]! : null));
    const known = deltas.filter((d): d is number => d !== null);
    const up = known.filter((d) => d > 0).length;
    const lastD = deltas[deltas.length - 1];
    const lastPy = py[py.length - 1];
    const pct = lastD != null && lastPy ? (lastD / Math.abs(lastPy)) * 100 : null;
    const f = known.length
      ? pl
        ? `Powyżej roku poprzedniego w ${up} z ${known.length} okresów; ostatnio ΔPY ${fmtSigned(lastD ?? 0, lang, unit.decimals)}${pct !== null ? ` (${fmtSigned(pct, lang, 1)}%)` : ""}`
        : `Above the previous year in ${up} of ${known.length} periods; latest ΔPY ${fmtSigned(lastD ?? 0, lang, unit.decimals)}${pct !== null ? ` (${fmtSigned(pct, lang, 1)}%)` : ""}`
      : pl
        ? "Brak wartości z roku poprzedniego: wydłuż okres"
        : "No previous-year values: widen the period";
    if (!finding) finding = f;
    return {
      key: sk || q.chart,
      label: smD ? c.lab(smD, sk) : null,
      chart: {
        type,
        series: [
          { id: "PY", label: pl ? "PY (rok wcześniej)" : "PY (year before)", points: periods.map((p, j) => ({ x: p, y: py[j]! })) },
          { id: "AC", label: "AC", points: periods.map((p, j) => ({ x: p, y: ac[j]! })) },
        ],
        unit,
        lang,
        ariaLabel: f,
        polarity: k ? polarityOf(k.kpi_key) : undefined,
        formatPeriod: (p) => fmtPeriod(p, lang),
      },
    };
  });
  const n = periods.length;
  return {
    panels,
    grid: panels.length > 1,
    count: n,
    countText: `${n} ${plural(n, lang, ["okres", "okresy", "okresów"], ["period", "periods"])} ${pl ? "wobec roku wcześniej" : "against a year earlier"}`,
    periodText: n ? `${fmtPeriod(periods[0]!, lang)}–${fmtPeriod(periods[n - 1]!, lang)}` : undefined,
    finding,
  };
}

/** IBCS / variance by category and the bridge: the period against the same period a year earlier. */
function buildVarianceCats(c: Ctx, type: "ibcs-bars" | "variance-bars" | "bridge" | "ibcs-columns" | "variance-columns"): Built {
  const { q, pl, lang } = c;
  const cD = q.slots.x!;
  const t = c.fixed.get("t") ?? c.shape.periods[c.shape.periods.length - 1] ?? "";
  const p0 = pyPeriod(t);
  const keys = c.members(cD).filter((x) => type !== "bridge" || x !== "total");
  const k = kpiAt(c, {});
  const ac = keys.map((x) => c.val({ [cD]: x, t }));
  const py = keys.map((x) => c.val({ [cD]: x, t: p0 }));
  const unit = unitFor(c, k, sampleOf(ac));
  const categories = cats(c, cD, keys);
  const rows = keys
    .map((_, j) => ({ label: categories[j]!.label, d: ac[j] !== null && py[j] !== null ? ac[j]! - py[j]! : null }))
    .filter((r): r is { label: string; d: number } => r.d !== null)
    .sort((a, b) => b.d - a.d);
  const up = rows.filter((r) => r.d > 0).length;
  const finding = rows.length
    ? pl
      ? `Wzrost wobec ${fmtPeriod(p0, lang)} w ${up} z ${rows.length}; najwięcej: ${rows[0]!.label} (${fmtSigned(rows[0]!.d, lang, unit.decimals)})`
      : `Up on ${fmtPeriod(p0, lang)} in ${up} of ${rows.length}; most: ${rows[0]!.label} (${fmtSigned(rows[0]!.d, lang, unit.decimals)})`
    : pl
      ? `Brak wartości z ${fmtPeriod(p0, lang)}`
      : `No values for ${fmtPeriod(p0, lang)}`;
  const periodText = `AC ${fmtPeriod(t, lang)} · PY ${fmtPeriod(p0, lang)}`;
  if (type === "bridge") {
    const pyTotal = py.reduce<number>((a, v) => a + (v ?? 0), 0);
    const z: ZChartProps = {
      type: "bridge",
      categories,
      series: [
        {
          id: "drivers",
          label: pl ? "Zmiana" : "Change",
          points: keys.map((x, j) => ({ x, y: ac[j] !== null && py[j] !== null ? ac[j]! - py[j]! : null })),
        },
      ],
      unit,
      lang,
      ariaLabel: finding,
      reference: { value: pyTotal, label: `PY ${fmtPeriod(p0, lang)}` },
      totalLabel: `AC ${fmtPeriod(t, lang)}`,
      polarity: k ? polarityOf(k.kpi_key) : undefined,
    };
    return { panels: one("bridge", z), grid: false, count: keys.length, countText: catsCount(keys.length, lang), periodText, finding };
  }
  const z: ZChartProps = {
    type,
    categories,
    series: [
      { id: "AC", label: `AC ${fmtPeriod(t, lang)}`, points: keys.map((x, j) => ({ x, y: ac[j]! })) },
      { id: "PY", label: `PY ${fmtPeriod(p0, lang)}`, points: keys.map((x, j) => ({ x, y: py[j]! })) },
    ],
    unit,
    lang,
    ariaLabel: finding,
    polarity: k ? polarityOf(k.kpi_key) : undefined,
    formatPeriod: (p) => c.lab(cD, p),
  };
  return { panels: one(type, z), grid: false, count: keys.length, countText: catsCount(keys.length, lang), periodText, finding };
}

function buildCombo(c: Ctx): Built {
  const { q, lang, pl, shape } = c;
  const xD = q.slots.x!;
  const xKeys = c.members(xD);
  const ms = shape.kpis.slice(0, 2);
  const smD = q.slots.sm ?? null;
  const smKeys = smD ? c.members(smD).slice(0, 6) : [""];
  let finding = "";
  const panels = smKeys.map((sk): Panel => {
    const at = smD ? { [smD]: sk } : {};
    const series: ZSeries[] = ms.map((k) => ({
      id: k.kpi_key,
      label: kpiName(k, lang),
      points: xKeys.map((x) => ({ x, y: c.val({ ...at, i: k.kpi_key, [xD]: x }) })),
    }));
    const last = (s: ZSeries) => lastPoint(s.points);
    const la = last(series[0]!);
    const lb = series[1] ? last(series[1]) : undefined;
    const f0 = fmtFor(c, ms[0]);
    const f1 = fmtFor(c, ms[1]);
    const f =
      la && lb
        ? `${series[0]!.label}: ${f0.value(la.y)}, ${series[1]!.label}: ${f1.value(lb.y)} (${c.lab(xD, la.x)})`
        : pl
          ? "Brak danych dla obu miar"
          : "No data for both measures";
    if (!finding) finding = f;
    return {
      key: sk || "combo",
      label: smD ? c.lab(smD, sk) : null,
      chart: {
        type: "combo",
        series,
        unit: unitFor(c, ms[0], sampleOf(series.flatMap((s) => s.points.map((p) => p.y)))),
        lang,
        ariaLabel: f,
        formatPeriod: (p) => c.lab(xD, p),
        categories: cats(c, xD, xKeys),
      },
    };
  });
  return {
    panels,
    grid: panels.length > 1,
    count: 2,
    countText: pl ? "2 miary: kolumny i linia" : "2 measures: columns and line",
    finding,
  };
}

function buildSegmented(c: Ctx): Built {
  const { q, lang, pl } = c;
  const pD = q.slots.legend!;
  const keys = c.members(pD).filter((x) => x !== "total");
  const smD = q.slots.sm ?? null;
  const smKeys = smD ? c.members(smD).slice(0, 6) : [""];
  const panels = smKeys.map((sk): Panel => {
    const at = smD ? { [smD]: sk } : {};
    const vals = keys.map((x) => Math.max(0, c.val({ ...at, [pD]: x }) ?? 0));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    return {
      key: sk || "seg",
      label: smD ? c.lab(smD, sk) : null,
      chart: {
        type: "segmented-bar",
        categories: cats(c, pD, keys),
        series: [{ id: "share", label: pl ? "Udział" : "Share", points: keys.map((x, j) => ({ x, y: (vals[j]! / total) * 100 })) }],
        unit: { symbol: "%", isRate: true, decimals: 1 },
        lang,
        ariaLabel: "",
      },
    };
  });
  return { panels, grid: panels.length > 1, count: keys.length, countText: catsCount(keys.length, lang), finding: "" };
}

export function chartName(chart: Query["chart"], lang: Lang): string {
  return kindName(chart, lang);
}

/** Everything the canvas draws for the query and its fetched series. */
export function buildView(cat: Catalog, q: Query, shape: Shape, series: Series[], lang: Lang): ExploreView {
  const pl = lang === "pl";
  const placed = placedDims(q);
  const fixed = fixedOf(q, shape);
  const { obs, noBase } = toObs(series, q, shape);
  const val = makeVal(obs, shape, fixed);
  const index = isIndexed(q, shape);
  const base = indexBase(q, shape);
  const ctxNames = { grain: shape.grain, level: q.level };
  const c: Ctx = {
    cat,
    q,
    shape,
    lang,
    pl,
    index,
    base,
    placed,
    fixed,
    val,
    lab: (d, key) => memberLabel(cat, d, key, lang),
    members: (d) =>
      wellMembers(
        q,
        shape,
        cat,
        d,
        SLOTS[q.chart].find((s) => q.slots[s] === d),
      ),
    notes: new Set(),
  };
  const shown = shownMeasures(q, shape, cat);
  const needs = missing(q.chart, q);
  // The wardrobe (looks.ts): the look in effect, what the data allows, and the business comparison, if any.
  const worn = lookInEffect(q, shape, lang);
  // A library variant drawn from the kind (KPI card, fan, table…) is not a look: the variant path handles it.
  const wardrobe = worn ? wardrobeOf(q.chart) : undefined;
  const look = worn?.look;
  const lookCtx = worn?.ctx;
  const settings = worn?.settings;
  if (worn?.fallback)
    c.notes.add(
      pl
        ? `Wygląd „${worn.fallback.chosen.pl}” jest niedostępny dla tych danych: ${worn.fallback.why} Pokazano „${worn.look.pl}”.`
        : `The “${worn.fallback.chosen.en}” look is unavailable for these data: ${worn.fallback.why} Showing “${worn.look.en}”.`,
    );
  const business = businessOf(q, shape);

  let built: Built & { matrix?: MatrixModel };
  if (needs.length) built = { panels: [], grid: false, count: 0, countText: "", finding: "" };
  else if (business)
    built =
      business.over === "time" && business.type !== "bridge"
        ? buildVarianceTime(c, business.type as "ibcs-columns" | "variance-columns")
        : buildVarianceCats(c, business.type as "ibcs-bars" | "variance-bars" | "bridge" | "ibcs-columns" | "variance-columns");
  else
    switch (q.chart) {
      case "heatmap":
        built = buildHeat(c);
        break;
      case "matrix":
        built = buildMatrix(c);
        break;
      case "map":
      case "choro":
        built = buildMap(c);
        break;
      case "scatter":
      case "bubble":
        built = buildScatter(c);
        break;
      case "boxplot":
        built = buildBoxplot(c);
        break;
      case "histogram":
        built = buildHistogram(c);
        break;
      case "sparkline":
        built = buildSparkline(c);
        break;
      case "ibcs":
      case "variance":
        built = buildVarianceTime(c, q.chart === "ibcs" ? "ibcs-columns" : "variance-columns");
        break;
      case "ibcsbars":
      case "varbars":
      case "bridge":
        built = buildVarianceCats(c, q.chart === "ibcsbars" ? "ibcs-bars" : q.chart === "varbars" ? "variance-bars" : "bridge");
        break;
      case "combo":
        built = buildCombo(c);
        break;
      case "segmented":
        built = buildSegmented(c);
        break;
      default:
        built = buildXY(c);
    }

  // ---------- chart library variant (variants.ts): needs, then the variant's chart type and options
  const variant = currentVariant(q.chart, q.v);
  const verdict = variantVerdict(variant, {
    voivodeships: shape.kpis.some(hasVoivodeships),
    periods: shape.periods.length,
    years: shape.span[1] - shape.span[0] + 1,
    measures: q.i.length,
  });
  let blocked: string | undefined;
  if (!needs.length && !verdict.ok && !wardrobe) {
    blocked = pl ? NEED_INFO[verdict.need].pl : NEED_INFO[verdict.need].en;
    built = { ...built, panels: [] };
  } else if (!needs.length && wardrobe && settings && lookCtx) {
    // The wardrobe: the look's preset with the reader's changes, applied to every panel.
    const top = settings.top && settings.top !== "all" ? Number(settings.top) : Infinity;
    const cut = built.panels.some((p) => Math.max(p.chart.series.length, p.chart.categories?.length ?? 0) > top);
    built = {
      ...built,
      panels: built.panels.map((p) => ({ ...p, chart: applyLook(wardrobe, p.chart, settings, lang, lookCtx) })),
    };
    if (cut && !lookCtx.additive && !business)
      c.notes.add(
        pl
          ? `Pokazano ${settings.top} najwyższych; reszty nie zsumowano, bo części tej miary się nie sumują.`
          : `The top ${settings.top} are shown; the rest were not summed because the parts of this measure do not add up.`,
      );
  } else if (!needs.length && variant.id !== KIND_VARIANT[q.chart])
    built = {
      ...built,
      panels: built.panels.map((p) => (p.chart.type === "small-multiples" ? p : { ...p, chart: applyVariant(p.chart, variant, lang) })),
    };

  // ---------- title: measures, by which dimensions, where, when (business style)
  const names = shown.map((k) => kpiName(k, lang));
  const measuresText = listText(names, lang, `${names.length} ${pl ? "miar" : "measures"}`);
  const byDims = (["x", "legend", "rows", "cols", "sm"] as SlotKey[])
    .filter((s) => SLOTS[q.chart].includes(s))
    .map((s) => q.slots[s])
    .filter((d): d is DimId => !!d && d !== "t" && d !== "i");
  const byText = byDims.length
    ? `${pl ? " według " : " by "}${listText(
        [...new Set(byDims)].map((d) => dimBy(cat, d, lang, ctxNames)),
        lang,
      )}`
    : "";
  const fixedGeo = !placed.has("geo") ? fixed.get("geo") : undefined;
  const ps = shape.periods;
  const tMembers = placed.has("t") ? c.members("t") : [];
  const seasonal = placed.has("t.moy") || placed.has("t.qoy");
  const periodText =
    built.periodText ??
    (tMembers.length > 1
      ? KIND_INFO[q.chart].slots.some((s) => s.pair && q.slots[s.key] === "t")
        ? `${fmtPeriod(tMembers[0]!, lang)} ${pl ? "i" : "and"} ${fmtPeriod(tMembers[tMembers.length - 1]!, lang)}`
        : `${fmtPeriod(tMembers[0]!, lang)}–${fmtPeriod(tMembers[tMembers.length - 1]!, lang)}`
      : fixed.get("t")
        ? fmtPeriod(fixed.get("t")!, lang)
        : seasonal && ps.length
          ? `${pl ? "średnio" : "average"} ${ps[0]!.slice(0, 4)}–${ps[ps.length - 1]!.slice(0, 4)}`
          : "");
  const title = q.i.length
    ? `${measuresText}${byText}${fixedGeo ? `, ${geoName(cat, fixedGeo, lang)}` : ""}${periodText ? `, ${periodText}` : ""}`
    : pl
      ? "Wybierz miarę"
      : "Choose a measure";

  // ---------- subtitle: unit, level, filters, count, compare mode
  const units = [...new Set(shown.map((k) => unitName(cat, k.unit_key, lang)))];
  const unitText = index ? (pl ? `indeks, ${base} = 100` : `index, ${base} = 100`) : units.join("; ");
  const aggregated = !seasonal && shown.some((k) => partsPer(k.frequency, shape.freq) > 1) && (placed.has("t") || !!fixed.get("t"));
  const seasonFreq: Frequency | null = placed.has("t.moy") ? "M" : placed.has("t.qoy") ? "Q" : null;
  const grainText = seasonFreq
    ? `${freqLabel(seasonFreq, lang)}${seasonFreq === "Q" && shown.some((k) => k.frequency === "M") ? (pl ? " (średnie z miesięcy)" : " (means of months)") : ""}`
    : `${freqLabel(shape.freq, lang)}${aggregated ? (pl ? " (średnie z pełnych okresów)" : " (means of complete periods)") : ""}`;
  const filterTexts = [...fixed]
    .filter(
      ([d, v]) => v !== undefined && d !== "i" && d !== "geo" && d !== "t" && !(v === "total" && (shape.members[d]?.length ?? 0) <= 1),
    )
    .map(([d, v]) => `${dimLabel(cat, d, lang, ctxNames)}: ${memberLabel(cat, d, v!, lang).toLocaleLowerCase(lang)}`);
  const cmpText =
    q.i.length > 1 && q.cmp === "panels" && built.grid ? (pl ? "osobne panele, każdy z własną osią" : "separate panels, own axes") : "";
  // A capped time axis says so in the subtitle, so the counts on the chips and the chart agree (review 2026-11-09).
  const capSlot = SLOTS[q.chart].find((s) => q.slots[s] === "t");
  const capSpec = capSlot ? KIND_INFO[q.chart].slots.find((s) => s.key === capSlot) : undefined;
  const capText =
    capSpec?.cap && !capSpec.pair && shape.periods.length > capSpec.cap
      ? pl
        ? `pokazano ${capSpec.cap} z ${shape.periods.length} okresów`
        : `${capSpec.cap} of ${shape.periods.length} periods shown`
      : "";
  const sub = [unitText, grainText, ...filterTexts, built.countText, capText, cmpText].filter(Boolean).join(" · ");

  // ---------- notes
  const notes: string[] = [];
  if (shape.mixed && aggregated)
    notes.push(
      pl
        ? `Miary mają różne częstotliwości: wartości pokazano ${freqLabel(shape.freq, lang)} jako średnie z pełnych okresów.`
        : `The measures have different frequencies: values are shown ${freqLabel(shape.freq, lang)} as means of complete periods.`,
    );
  const coarse = shown.filter((k) => !supportsGrain(k, shape.grain));
  if (coarse.length)
    notes.push(
      pl
        ? `Brak danych na poziomie „${dimLabel(cat, "t", lang, ctxNames)}”: ${coarse.map((k) => kpiName(k, lang)).join(", ")} (dane ${freqLabel(coarse[0]!.frequency, lang)}).`
        : `No data at “${dimLabel(cat, "t", lang, ctxNames)}” level: ${coarse.map((k) => kpiName(k, lang)).join(", ")}.`,
    );
  if (q.level === "voivodeship") {
    const noVoiv = shown.filter((k) => !k.geo_levels.includes("voivodeship"));
    if (noVoiv.length)
      notes.push(
        pl
          ? `Bez danych dla województw: ${noVoiv.map((k) => kpiName(k, lang)).join(", ")}.`
          : `No voivodeship data: ${noVoiv.map((k) => kpiName(k, lang)).join(", ")}.`,
      );
  }
  for (const d of shape.dims) {
    const used = placed.has(d) || (fixed.get(d) !== undefined && fixed.get(d) !== "total");
    if (!used) continue;
    const lack = shown.filter((k) => !k.dimension_keys.includes(d));
    if (lack.length)
      notes.push(
        pl
          ? `${lack.map((k) => kpiName(k, lang)).join(", ")}: bez podziału „${dimLabel(cat, d, lang)}”, pokazano wartość ogółem.`
          : `${lack.map((k) => kpiName(k, lang)).join(", ")}: no “${dimLabel(cat, d, lang)}” breakdown, the total is shown.`,
      );
  }
  const tSlot = SLOTS[q.chart].find((s) => q.slots[s] === "t");
  const tSpec = tSlot ? KIND_INFO[q.chart].slots.find((s) => s.key === tSlot) : undefined;
  if (tSpec?.cap && !tSpec.pair && ps.length > tSpec.cap)
    notes.push(pl ? `Pokazano ostatnie ${tSpec.cap} okresów (więcej ten wykres nie mieści).` : `Showing the last ${tSpec.cap} periods.`);
  const mw = measureWells(q.chart);
  if (mw && q.i.length > mw.length)
    notes.push(pl ? `Ten wykres używa ${mw.length} pierwszych miar z „Wartości”.` : `This chart uses the first ${mw.length} measures.`);
  if (noBase.length) {
    const nm = [...new Set(noBase.map((x) => memberLabel(cat, "i", x.split("|")[0]!, lang)))];
    notes.push(
      pl
        ? `Brak wartości dodatniej w roku bazowym ${base}, więc bez indeksu: ${nm.join(", ")}. Zmień rok bazowy.`
        : `No positive value in base year ${base}, so no index for: ${nm.join(", ")}. Change the base year.`,
    );
  }
  if (q.chart === "map" || q.chart === "choro")
    notes.push(pl ? "Mapa pokazuje wszystkie 16 województw." : "The map shows all 16 voivodeships.");
  for (const n of c.notes) notes.push(n);

  // ---------- raw data: every observation the chart reads (native periods)
  const tFix = fixed.get("t");
  const tAllowed = new Set<string>(tFix ? [tFix] : []);
  if (tFix && (["ibcsbars", "varbars", "bridge"].includes(q.chart) || business?.over === "cats")) tAllowed.add(pyPeriod(tFix));
  if (tFix && q.chart === "ranking" && ps.indexOf(tFix) > 0) tAllowed.add(ps[ps.indexOf(tFix) - 1]!);
  const memberOk = (o: Obs, d: DimId): boolean => {
    if (placed.has(d)) {
      const ms = new Set(c.members(d));
      const v =
        d === "i"
          ? o.i
          : d === "geo"
            ? o.geo
            : d === "t"
              ? periodAt(o.t, shape.grain)
              : d === "t.moy"
                ? monthOfYear(o.t)
                : d === "t.qoy"
                  ? quarterOfYear(o.t)
                  : (o.m[d] ?? "*");
      return v === "*" || (v !== undefined && ms.has(v));
    }
    const f = fixed.get(d);
    if (f === undefined) return true;
    if (d === "i") return o.i === f;
    if (d === "geo") return o.geo === f;
    if (d === "t") return tAllowed.has(periodAt(o.t, shape.grain) ?? "");
    if (d === "t.moy") return monthOfYear(o.t) === f;
    if (d === "t.qoy") return quarterOfYear(o.t) === f;
    return o.m[d] === undefined || o.m[d] === f;
  };
  const shownKeys = new Set(shown.map((k) => k.kpi_key));
  const timeAll = ["ibcs", "variance", "sparkline"].includes(q.chart) || business?.over === "time";
  const visible = needs.length
    ? []
    : obs.filter(
        (o) =>
          shownKeys.has(o.i) &&
          o.v !== null &&
          ["i", "geo", "t.moy", "t.qoy", ...shape.dims].every((d) => memberOk(o, d)) &&
          (timeAll || memberOk(o, "t")) &&
          Number(o.t.slice(0, 4)) >= shape.window[0],
      );
  const unitCol = (k: string) =>
    index
      ? pl
        ? `indeks (${base} = 100)`
        : `index (${base} = 100)`
      : unitName(cat, cat.kpis.find((x) => x.kpi_key === k)?.unit_key ?? "", lang);
  const order = (v: string) => shape.kpis.findIndex((k) => k.kpi_key === v);
  const rows = visible
    .slice()
    .sort(
      (a, b) =>
        order(a.i) - order(b.i) ||
        a.geo.localeCompare(b.geo) ||
        JSON.stringify(a.m).localeCompare(JSON.stringify(b.m)) ||
        a.t.localeCompare(b.t),
    );
  const csv: CsvTable = {
    columns: [
      pl ? "miara" : "measure",
      pl ? "kod_miary" : "measure_key",
      pl ? "obszar" : "area",
      pl ? "kod_obszaru" : "area_key",
      ...shape.dims.map((d) => dimLabel(cat, d, lang).toLowerCase()),
      pl ? "okres" : "period",
      pl ? "wartość" : "value",
      pl ? "jednostka" : "unit",
    ],
    rows: rows.map((o) => [
      memberLabel(cat, "i", o.i, lang),
      o.i,
      geoName(cat, o.geo, lang),
      o.geo,
      ...shape.dims.map((d) => (o.m[d] ? memberName(cat, d, o.m[d]!, lang) : pl ? "(brak podziału)" : "(not broken down)")),
      o.t,
      o.v,
      unitCol(o.i),
    ]),
  };

  const xHead =
    q.chart === "histogram"
      ? pl
        ? "Przedział wartości"
        : "Value range"
      : q.chart === "sparkline"
        ? dimLabel(cat, "t", lang, ctxNames)
        : q.slots.x
          ? dimLabel(cat, q.slots.x, lang, ctxNames)
          : "";
  const pivot = built.matrix
    ? matrixPivot(built.matrix)
    : q.chart === "heatmap" && built.panels[0]
      ? heatPivot(
          built.panels[0].chart,
          `${dimLabel(cat, q.slots.rows!, lang, ctxNames)} \\ ${dimLabel(cat, q.slots.cols!, lang, ctxNames)}`,
        )
      : panelsPivot(built.panels, lang, xHead);
  const valued = visible.length > 0;
  const empty = blocked
    ? blocked
    : needs.length || !q.i.length
      ? undefined
      : valued
        ? undefined
        : pl
          ? `Brak wartości dla ${names.join(", ")}${periodText ? ` (${periodText})` : ""}. Zmień okres, obszary albo kategorie.`
          : `No values for ${names.join(", ")}${periodText ? ` (${periodText})` : ""}. Change the period, areas or categories.`;

  const legend = built.panels[0]?.chart ?? null;
  const name = look
    ? `${chartName(q.chart, lang)}, ${pl ? "wygląd" : "look"} ${pl ? look.pl : look.en}`
    : variant.id === KIND_VARIANT[q.chart]
      ? chartName(q.chart, lang)
      : `${chartName(q.chart, lang)}: ${pl ? variant.pl : variant.en}`;
  const seriesList = built.panels
    .flatMap((p) => p.chart.series.map((s) => ({ p: p.label, s })))
    .slice(0, 12)
    .map(({ p, s }) => {
      const last = lastPoint(s.points);
      return `${p ? `${p}, ` : ""}${s.label}${last ? `: ${fmtNumber(last.y, lang, 1)}` : ""}`;
    });
  const spoken = `${name}. ${title}. ${sub}.${built.finding ? ` ${built.finding}.` : ""}${q.slots.x === "t" && seriesList.length ? ` ${pl ? "Ostatnie wartości" : "Latest values"}: ${seriesList.join("; ")}.` : ""}`;
  const live = pl ? `Wykres zaktualizowany: ${title}.` : `Chart updated: ${title}.`;
  return {
    caption: measuresText,
    title,
    sub,
    finding: built.finding,
    panels: built.panels,
    grid: built.grid,
    legend,
    notes,
    csv,
    pivot,
    spoken,
    live,
    empty,
    needs,
    kpis: shown,
    matrix: built.matrix,
  };
}

/** Heatmap rows stay rows and its columns stay columns. */
function heatPivot(z: ZChartProps, head: string): Pivot {
  const cols = z.categories ?? [];
  return {
    columns: [head, ...cols.map((c) => c.label)],
    rows: z.series.map((s) => [s.label, ...cols.map((c) => s.points.find((p) => p.x === c.key)?.y ?? null)]),
  };
}

function matrixPivot(m: MatrixModel): Pivot {
  return {
    columns: [m.colHead ? `${m.rowHead} \\ ${m.colHead}` : m.rowHead, ...m.cols.map((c) => c.label)],
    rows: m.rows.map((r, i) => [r.label, ...m.raw[i]!]),
  };
}

/** Axis in rows, series in columns (a panel's name goes before the series name when there are several panels). */
function panelsPivot(panels: Panel[], lang: Lang, xHead: string): Pivot {
  const xs: string[] = [];
  const labelOf = new Map<string, string>();
  const cols: { head: string; get: (x: string) => number | null }[] = [];
  for (const p of panels) {
    const z = p.chart;
    for (const s of z.series) {
      for (const pt of s.points)
        if (!labelOf.has(pt.x)) {
          xs.push(pt.x);
          labelOf.set(pt.x, z.categories?.find((c) => c.key === pt.x)?.label ?? z.formatPeriod?.(pt.x) ?? pt.x);
        }
      const map = new Map(s.points.map((pt) => [pt.x, pt.y]));
      cols.push({ head: `${p.label ? `${p.label} · ` : ""}${s.label}`, get: (x) => map.get(x) ?? null });
    }
  }
  return {
    columns: [xHead || (lang === "pl" ? "Kategoria" : "Category"), ...cols.map((c) => c.head)],
    rows: xs.map((x) => [labelOf.get(x) ?? x, ...cols.map((c) => c.get(x))]),
  };
}

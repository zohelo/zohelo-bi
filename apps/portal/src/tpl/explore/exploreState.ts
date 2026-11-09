// Explorer query, kept whole in the URL so a link, a refresh or Back reproduces the view:
//   /explore?i=cpi_annual_rate,avg_wage&lvl=kraj&geo=PL,EU27&t=10y&g=y&chart=line&x=t&leg=geo&sm=i&cmp=index
//            &base=2015&m.sex=f,m&f.t=2025&h=t&mode=view
// i = measures (1–6, in order; for scatter/bubble/combo the order is X, Y, size / columns, line), src = non-default
// source per measure ("kpi:source"), lvl = kraj | woj (Geografia level), geo = areas, t = rolling window (1y, 5y,
// 10y, all) or from/to (years), g = Kalendarz level (y | q | m; absent = the coarsest frequency of the measures),
// chart = chart kind, x / leg / sm / rows / cols = the dimension in each well (empty = none), cmp = same | index |
// panels (several measures), base = index base year, m.<dim> = members of a breakdown, f.<dim> = the one member a
// dimension shows when it is a filter, h = dimensions placed as a hierarchy (drill-down: t, geo), mode=view = the
// chart alone (saved views open this way). No `i` and no `kpi` = the blank explorer. Parsing validates every part
// against the catalogue; old links (?kpi=…&view=…, series=/panels=/cats=) still open a sensible view.

import { LEGACY_KIND, currentLook, layoutOf, layoutSlots, lookIndexes, seriesValue, wearsLook } from "./looks";
import { validVariant } from "./variants";
import type { Catalog, Frequency, GeoLevel, Kpi } from "../../data";
import { euGeographies, hasVoivodeships } from "./kpiInfo";
import { coarsest, kpiPeriods, yearOfPeriod } from "./transform";
import { CHARTS, SLOTS, autoChart, arrange, canPlace, defaultSlots, isTimeChart, possible } from "./layout";
import { FREQ_GRAIN, GRAINS, GRAIN_FREQ, isTimeDim, supportsGrain, unionDims, type DimId, type Grain } from "./model";

export type { DimId, Grain } from "./model";

export type ChartKind =
  | "line"
  | "columns"
  | "bars"
  | "dumbbell"
  | "slope"
  | "heatmap"
  | "map"
  | "scatter"
  | "area"
  | "stacked"
  | "stackcols"
  | "share"
  | "combo"
  | "bump"
  | "lollipop"
  | "dots"
  | "ranking"
  | "treemap"
  | "boxplot"
  | "choro"
  | "ibcs"
  | "variance"
  | "ibcsbars"
  | "varbars"
  | "matrix"
  // explorer v4 (owner review 2026-11-05): more of the library
  | "bubble"
  | "contributions"
  | "stackbars"
  | "segmented"
  | "waterfall"
  | "bridge"
  | "diverging"
  | "pyramid"
  | "histogram"
  | "sparkline";
export type SlotKey = "x" | "legend" | "sm" | "rows" | "cols";
export const SLOT_KEYS: SlotKey[] = ["x", "legend", "sm", "rows", "cols"];
/** URL parameter of each well. */
export const SLOT_PARAM: Record<SlotKey, string> = { x: "x", legend: "leg", sm: "sm", rows: "rows", cols: "cols" };
export type Compare = "same" | "index" | "panels";
export const COMPARES: Compare[] = ["same", "index", "panels"];
/** Rolling window of the last N years (0 = all), or fixed years. */
export type TimeSel = { last: number } | { from: number; to: number };
export type Mode = "edit" | "view";

export type Query = {
  i: string[];
  /** Source per measure when not its first source. */
  src: Record<string, string>;
  level: GeoLevel;
  geo: string[];
  /** Selected members of breakdowns; absent = total only. */
  members: Record<string, string[]>;
  time: TimeSel;
  /** Kalendarz level of "t"; null = the coarsest frequency of the measures. */
  grain: Grain | null;
  chart: ChartKind;
  /** Chart library variant drawn from this kind (variants.ts); null = the kind's own chart. */
  v: string | null;
  /** Settings changed on top of the look (looks.ts), e.g. { emphasis: "hero" }; URL o.<key>=<value>. */
  o: Record<string, string>;
  /** undefined = automatic, null = deliberately empty. */
  slots: Partial<Record<SlotKey, DimId | null>>;
  /** Member shown for a dimension that is in no well (absent = the first member, the latest period). */
  filters: Record<DimId, string>;
  cmp: Compare;
  /** Index base year; null = first year of the window. */
  base: number | null;
  /** Dimensions placed as a hierarchy (drill-down controls on the chart). */
  hier: DimId[];
  mode: Mode;
};

/** A query before normalising: the chart kind and compare mode may be left to the defaults. */
export type QueryInput = Omit<Query, "cmp" | "chart" | "grain" | "hier" | "mode" | "v" | "o"> & {
  v?: string | null;
  o?: Record<string, string>;
  cmp?: Compare;
  chart?: ChartKind;
  grain?: Grain | null;
  hier?: DimId[];
  mode?: Mode;
};

/** What the selection looks like, from the catalogue alone (no data needed). */
export type Shape = {
  kpis: Kpi[];
  /** Kalendarz level of "t" and its frequency. */
  grain: Grain;
  freq: Frequency;
  /** Measures of different frequencies. */
  mixed: boolean;
  sameUnit: boolean;
  /** Every unit can be shown as an index (not a rate or percentage). */
  indexable: boolean;
  /** Years with complete data at `freq`. */
  span: [number, number];
  window: [number, number];
  /** Periods (at `freq`) in the window: the members of "t". */
  periods: string[];
  /** Breakdowns of any selected measure (union, catalogue order). */
  dims: string[];
  /** Breakdowns of each measure. */
  has: Record<string, Set<string>>;
  /** Members per placeable dimension: i, geo, t, t.moy, t.qoy and each breakdown. */
  members: Record<DimId, string[]>;
};

export const MAX_KPIS = 6;
export const LAST_YEARS = [1, 5, 10, 0];
export const DEFAULT_KPI = "hicp_annual_rate";
const DEFAULT_LAST = 10;
/** Default voivodeships: the three largest by population. */
const DEFAULT_VOIV = ["PL14", "PL24", "PL12"];
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const list = (v: string | null) =>
  (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const uniq = <T>(xs: T[]) => [...new Set(xs)];

export function kpisOf(cat: Catalog, keys: string[]): Kpi[] {
  return keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
}

export function levelGeos(k: Kpi, cat: Catalog, level: GeoLevel): string[] {
  const lv = new Map(cat.geographies.map((g) => [g.key, g.level]));
  return k.geographies.filter((g) => g === "PL" || lv.get(g) === level);
}

/** Areas at the level that any selected measure has (union; Poland first, catalogue order). */
export function commonGeos(kpis: Kpi[], cat: Catalog, level: GeoLevel): string[] {
  if (!kpis.length) return [];
  const has = new Set(kpis.flatMap((k) => (level === "voivodeship" && !hasVoivodeships(k) ? [] : levelGeos(k, cat, level))));
  return cat.geographies
    .map((g) => g.key)
    .filter((g) => has.has(g) && (g === "PL" || cat.geographies.find((x) => x.key === g)!.level === level));
}

export function defaultAreas(kpis: Kpi[], cat: Catalog, level: GeoLevel): string[] {
  const avail = commonGeos(kpis, cat, level);
  const pick =
    level === "voivodeship"
      ? DEFAULT_VOIV.filter((g) => avail.includes(g))
      : kpis.every((k) => euGeographies(k, cat).includes("EU27"))
        ? ["PL", "EU27"]
        : ["PL"];
  const ok = pick.filter((g) => avail.includes(g));
  return ok.length ? ok : avail.slice(0, 1);
}

/** Breakdowns every measure has (used where a chart needs one shared breakdown). */
export function sharedDims(kpis: Kpi[]): string[] {
  if (!kpis.length) return [];
  return kpis[0]!.dimension_keys.filter((d) => kpis.every((k) => k.dimension_keys.includes(d)));
}

export function sourceOf(q: Pick<Query, "src">, k: Kpi): string {
  return q.src[k.kpi_key] ?? k.source_keys[0] ?? "";
}

/** The years a time selection covers, inside the years with data. */
export function windowOf(time: TimeSel, span: [number, number]): [number, number] {
  const [a, b] = span;
  if ("last" in time) return time.last > 0 ? [Math.max(a, b - time.last + 1), b] : [a, b];
  const clamp = (y: number) => Math.min(b, Math.max(a, y));
  const f = clamp(time.from),
    t = clamp(time.to);
  return f <= t ? [f, t] : [t, f];
}

/** The Kalendarz level actually used: the chosen one when a measure has data at it, else the coarsest frequency. */
export function grainOf(kpis: Kpi[], g: Grain | null | undefined): Grain {
  const base = FREQ_GRAIN[coarsest(kpis.map((k) => k.frequency))];
  if (!g || !kpis.length) return base;
  return kpis.some((k) => supportsGrain(k, g)) ? g : base;
}

export function shapeOf(q: Pick<Query, "i" | "geo" | "members" | "time"> & { grain?: Grain | null }, cat: Catalog): Shape {
  const kpis = kpisOf(cat, q.i);
  const grain = grainOf(kpis, q.grain);
  const freq = GRAIN_FREQ[grain];
  const own = kpis.filter((k) => supportsGrain(k, grain)).map((k) => kpiPeriods(k, freq));
  const firsts = own.map((ps) => ps[0]).filter((p): p is string => !!p);
  const lasts = own.map((ps) => ps[ps.length - 1]).filter((p): p is string => !!p);
  const span: [number, number] = firsts.length
    ? [Math.min(...firsts.map(yearOfPeriod)), Math.max(...lasts.map(yearOfPeriod))]
    : [2010, 2010];
  const window = windowOf(q.time, span);
  const periods = uniq(own.flat())
    .filter((p) => yearOfPeriod(p) >= window[0] && yearOfPeriod(p) <= window[1])
    .sort();
  const units = new Set(kpis.map((k) => k.unit_key));
  const rate = new Set(cat.units.filter((u) => u.is_rate || u.symbol === "%").map((u) => u.unit_key));
  const dims = unionDims(kpis, cat);
  const has: Record<string, Set<string>> = {};
  for (const k of kpis) has[k.kpi_key] = new Set(k.dimension_keys);
  const members: Record<DimId, string[]> = { i: kpis.map((k) => k.kpi_key), geo: q.geo, t: periods };
  if (kpis.some((k) => k.frequency === "M")) members["t.moy"] = MONTHS;
  if (kpis.some((k) => k.frequency !== "A")) members["t.qoy"] = ["Q1", "Q2", "Q3", "Q4"];
  for (const d of dims) members[d] = q.members[d]?.length ? q.members[d]! : ["total"];
  return {
    kpis,
    grain,
    freq,
    mixed: new Set(kpis.map((k) => k.frequency)).size > 1,
    sameUnit: units.size <= 1,
    indexable: kpis.every((k) => !rate.has(k.unit_key)),
    span,
    window,
    periods,
    dims,
    has,
    members,
  };
}

export function emptyQuery(): Query {
  return {
    i: [],
    src: {},
    level: "country",
    geo: [],
    members: {},
    time: { last: DEFAULT_LAST },
    grain: null,
    chart: "line",
    v: null,
    o: {},
    slots: {},
    filters: {},
    cmp: "same",
    base: null,
    hier: [],
    mode: "edit",
  };
}

/** The member a dimension shows when it is a filter: the chosen one, else the first (the latest period for t). */
export function filterValue(q: Query, shape: Shape, dim: DimId): string | undefined {
  const ms = shape.members[dim] ?? [];
  const f = q.filters[dim];
  if (f && ms.includes(f)) return f;
  return dim === "t" ? ms[ms.length - 1] : ms[0];
}

/** Dimensions placed in a well of the chart. */
export function placedDims(q: Pick<Query, "chart" | "slots">): Set<DimId> {
  const out = new Set<DimId>();
  for (const s of SLOTS[q.chart]) {
    const d = q.slots[s];
    if (d) out.add(d);
  }
  return out;
}

/** The well a dimension is in (undefined = a filter). */
export function slotOf(q: Pick<Query, "chart" | "slots">, d: DimId): SlotKey | undefined {
  return SLOTS[q.chart].find((s) => q.slots[s] === d);
}

export function defaultCompare(shape: Shape): Compare {
  if (shape.sameUnit || shape.periods.length < 2) return "same";
  return shape.indexable ? "index" : "panels";
}

/** Whether values are shown as an index (several measures; scatter and bubble keep each axis in its own unit). */
export function isIndexed(q: Query, shape?: Shape): boolean {
  if (lookIndexes(q, shape)) return true;
  return q.cmp === "index" && q.i.length > 1 && q.chart !== "scatter" && q.chart !== "bubble" && q.chart !== "combo";
}

/** Index base year: the chosen one, else the first year of the window (the first year with data for one year). */
export function indexBase(q: Query, shape: Shape): number {
  return q.base ?? (shape.window[0] < shape.window[1] ? shape.window[0] : shape.span[0]);
}

const KINDS_WITH_LIST = (c: ChartKind) => c !== "combo" && c !== "scatter" && c !== "bubble" && c !== "map" && c !== "choro";

/** Makes any query consistent with the catalogue (used after parsing and after every edit). */
export function normaliseQuery(q: QueryInput, cat: Catalog): Query {
  // Old kinds that are now a look of a wardrobe type (chart=stackcols → columns in the stacked look).
  const legacy = q.chart ? LEGACY_KIND[q.chart] : undefined;
  if (legacy) {
    const slots = { ...q.slots };
    // A bridge's drivers and IBCS periods sit on the x axis of the base kind too; nothing else moves.
    q = { ...q, chart: legacy.chart, v: q.v && q.v.startsWith(`${legacy.v.split(".")[0]}.`) ? q.v : legacy.v, slots };
  }
  const keys = uniq(q.i)
    .filter((k) => cat.kpis.some((x) => x.kpi_key === k))
    .slice(0, MAX_KPIS);
  const chartIn = q.chart && CHARTS.includes(q.chart) ? q.chart : undefined;
  const hierIn = uniq(q.hier ?? []).filter((d) => d === "t" || d === "geo");
  const mode: Mode = q.mode === "view" ? "view" : "edit";
  if (!keys.length) {
    // The blank explorer keeps what was placed, so dimensions can be laid out before a measure is chosen.
    const chart = chartIn ?? "line";
    const slots: Partial<Record<SlotKey, DimId | null>> = {};
    for (const s of SLOTS[chart]) {
      const d = q.slots[s];
      if (d === null || (d && canPlace(chart, s, d))) slots[s] = d;
    }
    return {
      ...emptyQuery(),
      time: q.time,
      level: q.level === "voivodeship" ? "voivodeship" : "country",
      grain: q.grain && GRAINS.includes(q.grain) ? q.grain : null,
      chart,
      v: validVariant(chart, q.v),
      o: { ...(q.o ?? {}) },
      slots,
      hier: hierIn,
      mode,
    };
  }
  const kpis = kpisOf(cat, keys);
  const src: Record<string, string> = {};
  for (const k of kpis) {
    const s = q.src[k.kpi_key];
    if (s && k.source_keys.includes(s) && s !== k.source_keys[0]) src[k.kpi_key] = s;
  }
  const level: GeoLevel = q.level === "voivodeship" && kpis.some(hasVoivodeships) ? "voivodeship" : "country";
  const avail = commonGeos(kpis, cat, level);
  const kept = uniq(q.geo).filter((g) => avail.includes(g));
  // Areas laid out on an axis (placed before a measure was chosen) show every area of the level.
  const axisGeo = (["x", "rows", "cols"] as SlotKey[]).some((s) => q.slots[s] === "geo");
  const geo = kept.length
    ? kept
    : axisGeo
      ? avail.filter((g) => level === "country" || g !== "PL").slice(0, 40)
      : defaultAreas(kpis, cat, level);
  const members: Record<string, string[]> = {};
  for (const d of unionDims(kpis, cat)) {
    const known = cat.dimensions.find((x) => x.dimension_key === d)?.members.map((m) => m.key) ?? [];
    const ms = uniq(q.members[d] ?? []).filter((m) => known.includes(m));
    const ordered = known.filter((m) => ms.includes(m));
    if (ordered.length && !(ordered.length === 1 && ordered[0] === "total")) members[d] = ordered;
  }
  const time: TimeSel =
    "last" in q.time
      ? { last: LAST_YEARS.includes(q.time.last) ? q.time.last : DEFAULT_LAST }
      : Number.isFinite(q.time.from) && Number.isFinite(q.time.to)
        ? q.time
        : { last: DEFAULT_LAST };
  // A seasonal view (month or quarter of year on the chart with the period) compares years: "t" is the year.
  const given = Object.values(q.slots);
  const seasonal = given.includes("t") && (given.includes("t.moy") || given.includes("t.qoy"));
  const grain = seasonal ? "y" : q.grain && GRAINS.includes(q.grain) && kpis.some((k) => supportsGrain(k, q.grain!)) ? q.grain : null;
  const shape = shapeOf({ i: keys, geo, members, time, grain }, cat);
  const fixedTime: TimeSel = "last" in time ? time : { from: shape.window[0], to: shape.window[1] };

  let cmp: Compare = keys.length < 2 ? "same" : q.cmp && COMPARES.includes(q.cmp) ? q.cmp : defaultCompare(shape);
  if (cmp === "index" && !shape.indexable) cmp = shape.sameUnit ? "same" : "panels";
  const base = cmp === "index" && q.base !== null && q.base >= shape.span[0] && q.base <= shape.span[1] ? q.base : null;

  const draft: Query = {
    i: keys,
    src,
    level,
    geo,
    members,
    time: fixedTime,
    grain,
    chart: chartIn ?? "line",
    v: null,
    o: {},
    slots: {},
    filters: {},
    cmp,
    base,
    hier: hierIn,
    mode,
  };
  const chart = chartIn && possible(chartIn, shape, draft).ok ? chartIn : autoChart(shape, draft);
  draft.chart = chart;

  // Wells: keep valid choices, each dimension at most once; fill the automatic ones.
  const used = new Set<DimId>();
  const slots: Partial<Record<SlotKey, DimId | null>> = {};
  const chartSlots = SLOTS[chart];
  const asked = !chartIn || chart === chartIn ? q.slots : {};
  for (const s of chartSlots) {
    const d = asked[s];
    if (d === null) slots[s] = null;
    else if (d && shape.members[d] && canPlace(chart, s, d) && !used.has(d)) {
      slots[s] = d;
      used.add(d);
    }
  }
  if (cmp === "panels" && isTimeChart(chart) && keys.length > 1 && chartSlots.includes("sm") && slots.sm !== "i") {
    for (const s of chartSlots) if (slots[s] === "i") slots[s] = undefined;
    slots.sm = "i";
  }
  if (chartSlots.some((s) => slots[s] === undefined)) {
    const auto = defaultSlots(chart, shape, { ...draft, slots });
    for (const s of chartSlots) if (slots[s] === undefined) slots[s] = auto[s] ?? null;
  }
  // Several measures in one list of values must be told apart: they take a free well (legend, multiples, axis).
  if (keys.length > 1 && KINDS_WITH_LIST(chart) && !chartSlots.some((s) => slots[s] === "i")) {
    const free = (["legend", "sm", "x", "rows", "cols"] as SlotKey[]).find(
      (s) => chartSlots.includes(s) && !slots[s] && canPlace(chart, s, "i"),
    );
    if (free) slots[free] = "i";
  }
  draft.slots = slots;

  const placed = placedDims(draft);
  const filters: Record<DimId, string> = {};
  for (const [d, v] of Object.entries(q.filters))
    if (shape.members[d] && !placed.has(d) && shape.members[d]!.includes(v) && shape.members[d]!.length > 1) filters[d] = v;
  draft.filters = filters;
  draft.hier = hierIn.filter((d) => placed.has(d));
  draft.v = validVariant(draft.chart, q.v);
  draft.o = draft.chart === q.chart ? { ...(q.o ?? {}) } : {};
  return draft;
}

function readTime(p: URLSearchParams): TimeSel {
  const t = p.get("t");
  const m = t ? /^(\d+)y$/.exec(t) : null;
  if (t === "all") return { last: 0 };
  if (m) return { last: Number(m[1]) };
  const num = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : NaN);
  if (p.has("from") || p.has("to")) {
    const from = num(p.get("from")),
      to = num(p.get("to"));
    return { from: Number.isFinite(from) ? from : 1900, to: Number.isFinite(to) ? to : 9999 };
  }
  return { last: DEFAULT_LAST };
}

/** Old well names (explorer v3): series → legend, panels → small multiples, cats → x. */
const OLD_SLOT: Record<string, SlotKey> = { series: "legend", panels: "sm", cats: "x" };

/** Parses the query string; old single-indicator links (kpi, split, view, src without ":") are translated. */
export function parseExplore(search: string, cat: Catalog): Query {
  const p = new URLSearchParams(search);
  const legacy = !p.has("i") && p.has("kpi");
  const i = legacy ? [p.get("kpi") ?? DEFAULT_KPI] : list(p.get("i"));
  const g = p.get("g") as Grain | null;
  const q: QueryInput = {
    ...emptyQuery(),
    chart: undefined,
    cmp: undefined,
    i,
    level: p.get("lvl") === "woj" ? "voivodeship" : "country",
    geo: list(p.get("geo")),
    time: readTime(p),
    grain: g && GRAINS.includes(g) ? g : null,
    hier: list(p.get("h")),
    mode: p.get("mode") === "view" ? "view" : "edit",
  };
  for (const s of list(p.get("src"))) {
    const [k, v] = s.includes(":") ? s.split(":") : [i[0], s];
    if (k && v && !q.src[k]) q.src[k] = v;
  }
  for (const [key, value] of p) {
    if (key.startsWith("m.")) q.members[key.slice(2)] = list(value);
    if (key.startsWith("f.") && value) q.filters[key.slice(2)] = value;
  }
  const chart = p.get("chart") as ChartKind | null;
  if (chart && CHARTS.includes(chart)) q.chart = chart;
  q.v = p.get("v");
  q.o = {};
  for (const [k, val] of p) if (k.startsWith("o.") && val) q.o[k.slice(2)] = val;
  for (const [old, s] of Object.entries(OLD_SLOT)) if (p.has(old) && !p.has(SLOT_PARAM[s])) q.slots[s] = p.get(old) || null;
  for (const s of SLOT_KEYS) if (p.has(SLOT_PARAM[s])) q.slots[s] = p.get(SLOT_PARAM[s]) || null;
  const cmp = p.get("cmp") as Compare | null;
  if (cmp && COMPARES.includes(cmp)) q.cmp = cmp;
  const base = p.get("base");
  q.base = base && /^\d{4}$/.test(base) ? Number(base) : null;

  if (legacy) {
    const split = p.get("split");
    const k = cat.kpis.find((x) => x.kpi_key === i[0]);
    const dim = split && k?.dimension_keys.includes(split) ? cat.dimensions.find((d) => d.dimension_key === split) : undefined;
    if (dim) q.members[dim.dimension_key] = dim.members.filter((m) => m.key !== "total").map((m) => m.key);
    const view = p.get("view");
    if (view === "map") q.chart = "map";
    else if (view === "bars") q.chart = q.geo.length > 1 || dim ? "bars" : "columns";
    else q.chart = "line";
  }
  const out = normaliseQuery(q, cat);
  // A link that names a look with its own dimension layout (panels, seasonal) gets that layout, as choosing the look
  // on the chart would; a link with a plain look keeps the wells as written (a reader may have moved them).
  const look = out.i.length && wearsLook(out) ? currentLook(out.chart, out.v) : undefined;
  const layout = look?.settings.series;
  if (look && layout && (layout === "panels" || layout === "seasonal") && seriesValue(look.type, layoutOf(out.slots)) !== layout) {
    const slots = layoutSlots(out, layout, { grain: shapeOf(out, cat).grain });
    if (slots) return normaliseQuery({ ...out, slots }, cat);
  }
  return out;
}

/** Query string of a normalised query (every part that changes the view; the wells of the chart always). */
export function serialiseExplore(q: Query): string {
  const p = new URLSearchParams();
  p.set("i", q.i.join(","));
  const placed = SLOTS[q.chart].some((s) => q.slots[s]);
  if (!q.i.length && !placed) return `?${p.toString()}${q.mode === "view" ? "&mode=view" : ""}`;
  const src = Object.entries(q.src);
  if (src.length) p.set("src", src.map(([k, v]) => `${k}:${v}`).join(","));
  p.set("lvl", q.level === "voivodeship" ? "woj" : "kraj");
  if (q.i.length) p.set("geo", q.geo.join(","));
  if ("last" in q.time) p.set("t", q.time.last > 0 ? `${q.time.last}y` : "all");
  else {
    p.set("from", String(q.time.from));
    p.set("to", String(q.time.to));
  }
  if (q.grain) p.set("g", q.grain);
  p.set("chart", q.chart);
  if (q.v) p.set("v", q.v);
  for (const [k, val] of Object.entries(q.o ?? {}).sort()) p.set(`o.${k}`, val);
  // The blank explorer writes only what was placed (the rest stays automatic for the first measure).
  for (const s of SLOTS[q.chart]) if (q.i.length || q.slots[s]) p.set(SLOT_PARAM[s], q.slots[s] ?? "");
  if (q.i.length > 1) p.set("cmp", q.cmp);
  if (q.base !== null) p.set("base", String(q.base));
  for (const [d, ms] of Object.entries(q.members)) p.set(`m.${d}`, ms.join(","));
  for (const [d, v] of Object.entries(q.filters)) p.set(`f.${d}`, v);
  if (q.hier.length) p.set("h", q.hier.join(","));
  if (q.mode === "view") p.set("mode", "view");
  return `?${p.toString().replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
}

/** A query with one measure and the automatic view (old default of the explorer; links from other pages). */
export function defaultQuery(cat: Catalog, kpiKey = DEFAULT_KPI): Query {
  return normaliseQuery({ ...emptyQuery(), i: [kpiKey], chart: undefined, cmp: undefined }, cat);
}

/** Fields of an old single-indicator explorer link (kept for `exploreLink` callers). */
export type ExState = {
  kpi: string;
  level: GeoLevel;
  areas: string[];
  sources: string[];
  split: string | null;
  from: number;
  to: number;
  view: "line" | "bars" | "map" | "table";
};

/** Explorer link for one indicator with defaults (used by "Otwórz w eksploratorze"). */
export function exploreLink(k: Kpi, cat: Catalog, over: Partial<ExState> = {}): string {
  const p = new URLSearchParams({ kpi: over.kpi ?? k.kpi_key });
  if (over.level) p.set("lvl", over.level === "voivodeship" ? "woj" : "kraj");
  if (over.areas?.length) p.set("geo", over.areas.join(","));
  if (over.sources?.length) p.set("src", over.sources.join(","));
  if (over.split) p.set("split", over.split);
  if (over.from !== undefined) p.set("from", String(over.from));
  if (over.to !== undefined) p.set("to", String(over.to));
  if (over.view) p.set("view", over.view);
  return `/explore${serialiseExplore(parseExplore(`?${p.toString()}`, cat))}`;
}

/**
 * One edit from the panel: merges the patch and normalises. A dimension that gains several values and is in no
 * well goes to a free well of the chart, so what was just added shows. New measures reset the compare mode to
 * the default for their units; another chart kind takes over the placed fields where it can (arrange).
 */
export function applyPatch(prev: Query, patch: Partial<QueryInput>, cat: Catalog): Query {
  const next: QueryInput = { ...prev, ...patch };
  // Another kind drops the variant unless the patch names one (the picker sends both).
  if (patch.chart && patch.chart !== prev.chart && !("v" in patch)) next.v = null;
  // Another look starts from its own preset: the changes made to the previous look are dropped.
  if ((("v" in patch && patch.v !== prev.v) || (patch.chart && patch.chart !== prev.chart)) && !("o" in patch)) next.o = {};
  if (patch.i && !("cmp" in patch)) next.cmp = undefined;
  // The first measure on the blank explorer's default line with categories on the x axis: columns (as Power BI).
  if (!prev.i.length && patch.i?.length && !patch.chart && prev.chart === "line" && prev.slots.x && prev.slots.x !== "t")
    next.chart = "columns";
  if (patch.chart && patch.chart !== prev.chart && !patch.slots) {
    const shape = shapeOf(prev, cat);
    // A kind that cannot be drawn from these measures at all changes nothing (the picker disables it).
    if (!possible(patch.chart, shape, prev).ok) return normaliseQuery(prev, cat);
    next.slots = arrange(prev, patch.chart, shape);
    // Maps need voivodeships; IBCS and variances need a previous year in the window.
    if ((patch.chart === "map" || patch.chart === "choro") && prev.level !== "voivodeship") {
      next.level = "voivodeship";
      next.geo = [];
    }
    if (["ibcs", "variance", "ibcsbars", "varbars", "bridge"].includes(patch.chart) && shape.window[1] - shape.window[0] < 1)
      next.time = { last: 5 };
  }
  let n = normaliseQuery(next, cat);
  if (patch.slots || patch.chart || !n.i.length) return n;
  const before = shapeOf(prev, cat);
  const after = shapeOf(n, cat);
  const placed = placedDims(n);
  const fresh = Object.keys(after.members).filter(
    // Time stays where it is: a longer window does not move the period onto the chart.
    (d) => after.members[d]!.length > 1 && (before.members[d]?.length ?? 0) <= 1 && !placed.has(d) && !isTimeDim(d),
  );
  if (fresh.length) {
    const slots = { ...n.slots };
    for (const d of fresh) {
      const free = SLOTS[n.chart].find((s) => !slots[s] && canPlace(n.chart, s, d) && s !== "sm");
      if (free) slots[free] = d;
    }
    n = normaliseQuery({ ...n, slots }, cat);
  }
  return n;
}

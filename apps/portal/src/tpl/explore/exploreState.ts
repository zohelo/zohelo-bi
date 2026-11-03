// Explorer query, kept whole in the URL so a link, a refresh or Back reproduces the view:
//   /explore?i=cpi_annual_rate,avg_wage&lvl=kraj&geo=PL,EU27&t=10y&chart=line&series=geo&panels=i&cmp=index
//            &base=2015&m.sex=f,m&f.t=2025
// i = indicators (1–6, in order), src = non-default source per indicator ("kpi:source"), lvl = kraj | woj,
// geo = areas, t = rolling window (1y, 5y, 10y, all) or from/to (years), chart = chart type, series/panels/cats/
// rows/cols = the dimension in each slot of the chart (empty = none), cmp = same | index | panels (several
// indicators), base = index base year, m.<dim> = members of a shared dimension, f.<dim> = member of a dimension
// used as a single-value filter. Parsing validates every part against the catalogue and falls back to defaults,
// so a hand-edited or old link (?kpi=…&geo=…&lvl=…&split=…&from=…&to=…&view=…) still opens a sensible view.

import type { Catalog, Frequency, GeoLevel, Kpi } from "../../data";
import { euGeographies, hasVoivodeships } from "./kpiInfo";
import { coarsest, kpiPeriods, yearOfPeriod } from "./transform";
import { CHARTS, SLOTS, autoChart, canPlace, chartOk, defaultSlots, isFixed } from "./layout";

export type ChartKind = "line" | "columns" | "bars" | "dumbbell" | "slope" | "heatmap" | "map" | "scatter";
export type SlotKey = "series" | "panels" | "cats" | "rows" | "cols";
export const SLOT_KEYS: SlotKey[] = ["series", "panels", "cats", "rows", "cols"];
/** "i" = indicator, "geo" = area, "t" = period, otherwise a dimension key (sex, age, nace…). */
export type DimId = string;
export type Compare = "same" | "index" | "panels";
export const COMPARES: Compare[] = ["same", "index", "panels"];
/** Rolling window of the last N years (0 = all), or fixed years. */
export type TimeSel = { last: number } | { from: number; to: number };

export type Query = {
  i: string[];
  /** Source per indicator when not its first source. */
  src: Record<string, string>;
  level: GeoLevel;
  geo: string[];
  /** Selected members of shared dimensions; absent = total only. */
  members: Record<string, string[]>;
  time: TimeSel;
  chart: ChartKind;
  /** undefined = automatic, null = deliberately empty. */
  slots: Partial<Record<SlotKey, DimId | null>>;
  /** Member shown for a dimension that is in no slot (absent = the first member, the latest period). */
  filters: Record<DimId, string>;
  cmp: Compare;
  /** Index base year; null = first year of the window. */
  base: number | null;
};

/** A query before normalising: the chart type and compare mode may be left to the defaults. */
export type QueryInput = Omit<Query, "cmp" | "chart"> & { cmp?: Compare; chart?: ChartKind };

/** What the selection looks like, from the catalogue alone (no data needed). */
export type Shape = {
  kpis: Kpi[];
  /** Frequency the view is drawn at (the coarsest of the indicators). */
  freq: Frequency;
  mixed: boolean;
  sameUnit: boolean;
  /** Every unit can be shown as an index (not a rate or percentage). */
  indexable: boolean;
  /** Years with complete data at `freq`. */
  span: [number, number];
  window: [number, number];
  /** Periods (at `freq`) in the window. */
  periods: string[];
  /** Dimensions every indicator has. */
  shared: string[];
  /** Members per placeable dimension: i, geo, t and each shared dimension. */
  members: Record<DimId, string[]>;
};

export const MAX_KPIS = 6;
export const LAST_YEARS = [1, 5, 10, 0];
export const DEFAULT_KPI = "hicp_annual_rate";
const DEFAULT_LAST = 10;
/** Default voivodeships: the three largest by population. */
const DEFAULT_VOIV = ["PL14", "PL24", "PL12"];

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

/** Areas every selected indicator has at the level (Poland first). */
export function commonGeos(kpis: Kpi[], cat: Catalog, level: GeoLevel): string[] {
  if (!kpis.length) return [];
  const sets = kpis.map((k) => new Set(levelGeos(k, cat, level)));
  return levelGeos(kpis[0]!, cat, level).filter((g) => sets.every((s) => s.has(g)));
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

export function shapeOf(q: Pick<Query, "i" | "geo" | "members" | "time">, cat: Catalog): Shape {
  const kpis = kpisOf(cat, q.i);
  const freq = coarsest(kpis.map((k) => k.frequency));
  const own = kpis.map((k) => kpiPeriods(k, freq));
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
  const shared = sharedDims(kpis);
  const members: Record<DimId, string[]> = { i: kpis.map((k) => k.kpi_key), geo: q.geo, t: periods };
  for (const d of shared) members[d] = q.members[d]?.length ? q.members[d]! : ["total"];
  return {
    kpis,
    freq,
    mixed: new Set(kpis.map((k) => k.frequency)).size > 1,
    sameUnit: units.size <= 1,
    indexable: kpis.every((k) => !rate.has(k.unit_key)),
    span,
    window,
    periods,
    shared,
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
    chart: "line",
    slots: {},
    filters: {},
    cmp: "same",
    base: null,
  };
}

/** Members a dimension shows when it is a filter: the chosen one, else the first (the latest period for t). */
export function filterValue(q: Query, shape: Shape, dim: DimId): string | undefined {
  const ms = shape.members[dim] ?? [];
  const f = q.filters[dim];
  if (f && ms.includes(f)) return f;
  return dim === "t" ? ms[ms.length - 1] : ms[0];
}

/** Dimensions shown in the chart (in a slot or fixed by the chart type). */
export function placedDims(q: Query, shape: Shape): Set<DimId> {
  const out = new Set<DimId>();
  for (const s of SLOTS[q.chart]) {
    const d = q.slots[s];
    if (d) out.add(d);
  }
  for (const d of Object.keys(shape.members)) if (isFixed(q.chart, d)) out.add(d);
  return out;
}

export function defaultCompare(shape: Shape): Compare {
  if (shape.sameUnit || shape.periods.length < 2) return "same";
  return shape.indexable ? "index" : "panels";
}

/** Whether values are shown as an index (several indicators; a scatter keeps each axis in its own unit). */
export function isIndexed(q: Query): boolean {
  return q.cmp === "index" && q.i.length > 1 && q.chart !== "scatter";
}

/** Index base year: the chosen one, else the first year of the window (the first year with data for one year). */
export function indexBase(q: Query, shape: Shape): number {
  return q.base ?? (shape.window[0] < shape.window[1] ? shape.window[0] : shape.span[0]);
}

/** Makes any query consistent with the catalogue (used after parsing and after every edit). */
export function normaliseQuery(q: QueryInput, cat: Catalog): Query {
  const keys = uniq(q.i)
    .filter((k) => cat.kpis.some((x) => x.kpi_key === k))
    .slice(0, MAX_KPIS);
  if (!keys.length) return { ...emptyQuery(), time: q.time };
  const kpis = kpisOf(cat, keys);
  const src: Record<string, string> = {};
  for (const k of kpis) {
    const s = q.src[k.kpi_key];
    if (s && k.source_keys.includes(s) && s !== k.source_keys[0]) src[k.kpi_key] = s;
  }
  const level: GeoLevel = q.level === "voivodeship" && kpis.every(hasVoivodeships) ? "voivodeship" : "country";
  const avail = commonGeos(kpis, cat, level);
  const kept = uniq(q.geo).filter((g) => avail.includes(g));
  const geo = kept.length ? kept : defaultAreas(kpis, cat, level);
  const members: Record<string, string[]> = {};
  for (const d of sharedDims(kpis)) {
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
  const shape = shapeOf({ i: keys, geo, members, time }, cat);
  const fixedTime: TimeSel = "last" in time ? time : { from: shape.window[0], to: shape.window[1] };

  let cmp: Compare = keys.length < 2 ? "same" : q.cmp && COMPARES.includes(q.cmp) ? q.cmp : defaultCompare(shape);
  if (cmp === "index" && !shape.indexable) cmp = shape.sameUnit ? "same" : "panels";
  const base = cmp === "index" && q.base !== null && q.base >= shape.span[0] && q.base <= shape.span[1] ? q.base : null;

  const draft: Query = { i: keys, src, level, geo, members, time: fixedTime, chart: q.chart ?? "line", slots: {}, filters: {}, cmp, base };
  const chart = q.chart && CHARTS.includes(q.chart) && chartOk(q.chart, shape, draft).ok ? q.chart : autoChart(shape, draft);
  draft.chart = chart;

  // Slots: keep valid choices, each dimension at most once; fill the automatic ones.
  const used = new Set<DimId>();
  const slots: Partial<Record<SlotKey, DimId | null>> = {};
  const chartSlots = SLOTS[chart];
  const given = !q.chart || chart === q.chart ? q.slots : {};
  for (const s of chartSlots) {
    const d = given[s];
    if (d === null) slots[s] = null;
    else if (d && shape.members[d] && canPlace(chart, s, d) && !used.has(d)) {
      slots[s] = d;
      used.add(d);
    }
  }
  const timeChart = chart === "line" || chart === "columns";
  if (cmp === "panels" && timeChart && keys.length > 1 && slots.panels !== "i") {
    const prev = slots.panels;
    if (slots.series === "i") slots.series = prev ?? undefined;
    slots.panels = "i";
  }
  if (chartSlots.some((s) => slots[s] === undefined)) {
    const auto = defaultSlots(chart, shape, { ...draft, slots });
    for (const s of chartSlots) if (slots[s] === undefined) slots[s] = auto[s] ?? null;
  }
  draft.slots = slots;

  const placed = placedDims(draft, shape);
  const filters: Record<DimId, string> = {};
  for (const [d, v] of Object.entries(q.filters))
    if (shape.members[d] && !placed.has(d) && shape.members[d]!.includes(v) && shape.members[d]!.length > 1) filters[d] = v;
  draft.filters = filters;
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

/** Parses the query string; old single-indicator links (kpi, split, view, src without ":") are translated. */
export function parseExplore(search: string, cat: Catalog): Query {
  const p = new URLSearchParams(search);
  const legacy = !p.has("i");
  const i = legacy ? [p.get("kpi") ?? DEFAULT_KPI] : list(p.get("i"));
  const q: QueryInput = {
    ...emptyQuery(),
    chart: undefined,
    cmp: undefined,
    i,
    level: p.get("lvl") === "woj" ? "voivodeship" : "country",
    geo: list(p.get("geo")),
    time: readTime(p),
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
  for (const s of SLOT_KEYS) if (p.has(s)) q.slots[s] = p.get(s) || null;
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
  return normaliseQuery(q, cat);
}

/** Query string of a normalised query (every part that changes the view; slots of the chart always). */
export function serialiseExplore(q: Query): string {
  const p = new URLSearchParams();
  p.set("i", q.i.join(","));
  if (!q.i.length) return `?${p.toString()}`;
  const src = Object.entries(q.src);
  if (src.length) p.set("src", src.map(([k, v]) => `${k}:${v}`).join(","));
  p.set("lvl", q.level === "voivodeship" ? "woj" : "kraj");
  p.set("geo", q.geo.join(","));
  if ("last" in q.time) p.set("t", q.time.last > 0 ? `${q.time.last}y` : "all");
  else {
    p.set("from", String(q.time.from));
    p.set("to", String(q.time.to));
  }
  p.set("chart", q.chart);
  for (const s of SLOTS[q.chart]) p.set(s, q.slots[s] ?? "");
  if (q.i.length > 1) p.set("cmp", q.cmp);
  if (q.base !== null) p.set("base", String(q.base));
  for (const [d, ms] of Object.entries(q.members)) p.set(`m.${d}`, ms.join(","));
  for (const [d, v] of Object.entries(q.filters)) p.set(`f.${d}`, v);
  return `?${p.toString().replace(/%2C/g, ",").replace(/%3A/g, ":")}`;
}

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
 * slot goes to a free slot of the chart, so what was just added shows. New indicators reset the compare mode to
 * the default for their units; another chart type starts from its automatic layout.
 */
export function applyPatch(prev: Query, patch: Partial<QueryInput>, cat: Catalog): Query {
  const next: QueryInput = { ...prev, ...patch };
  if (patch.i && !("cmp" in patch)) next.cmp = undefined;
  if (patch.chart && patch.chart !== prev.chart && !patch.slots) next.slots = {};
  let n = normaliseQuery(next, cat);
  if (patch.slots || patch.chart || !n.i.length) return n;
  const before = shapeOf(prev, cat);
  const after = shapeOf(n, cat);
  const placed = placedDims(n, after);
  const fresh = Object.keys(after.members).filter(
    (d) => after.members[d]!.length > 1 && (before.members[d]?.length ?? 0) <= 1 && !placed.has(d),
  );
  if (fresh.length) {
    const slots = { ...n.slots };
    for (const d of fresh) {
      const free = SLOTS[n.chart].find((s) => !slots[s] && canPlace(n.chart, s, d));
      if (free) slots[free] = d;
    }
    n = normaliseQuery({ ...n, slots }, cat);
  }
  return n;
}

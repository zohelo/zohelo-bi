// Layout rules of the explorer: the wells of each chart kind (kinds.ts), what may go in them, what a chart still
// needs, the automatic layout, how the placed fields move to another kind, and recommendations.
// Owner review 2026-11-05: every kind can be chosen; only a chart that cannot be drawn from the catalogue at all
// (a voivodeship map for measures without voivodeship data) is unavailable. A kind with empty required wells
// shows what it needs on the canvas instead of being greyed out.

import type { ChartKind, DimId, Query, Shape, SlotKey } from "./exploreState";
import { KIND_INFO, measureWells } from "./kinds";
import { hasVoivodeships } from "./kpiInfo";
import { isTimeDim } from "./model";

/** The original eight: the kinds chosen automatically; the rest are picked by the reader. */
export const AUTO_CHARTS: ChartKind[] = ["line", "columns", "bars", "dumbbell", "slope", "heatmap", "map", "scatter"];
export const CHARTS: ChartKind[] = Object.keys(KIND_INFO) as ChartKind[];

/** Wells of each kind, in order (the first is the main one). */
export const SLOTS: Record<ChartKind, SlotKey[]> = Object.fromEntries(
  CHARTS.map((c) => [c, KIND_INFO[c].slots.map((s) => s.key)]),
) as Record<ChartKind, SlotKey[]>;

const spec = (c: ChartKind, s: SlotKey) => KIND_INFO[c].slots.find((x) => x.key === s);

/** Kinds whose x axis is time by default (several measures may get one panel each). */
export const TIME_X: ChartKind[] = [
  "line",
  "columns",
  "area",
  "stacked",
  "stackcols",
  "share",
  "contributions",
  "combo",
  "bump",
  "ibcs",
  "variance",
];
export function isTimeChart(chart: ChartKind): boolean {
  return chart === "line" || chart === "columns" || chart === "area";
}

/** An average, median or per-person value: money or counts in its unit, but its parts do not add up.
 * Template heuristic from key and name; real data needs an explicit aggregation per KPI (sum / average / ratio). */
export function averageLike(k: Pick<Shape["kpis"][number], "kpi_key" | "name_pl" | "name_en">): boolean {
  return (
    /^(avg|median|mean)_|_(avg|median|mean|pc)$|_per_/.test(k.kpi_key) ||
    /^(przeciętn|średni|median|zasięg)/i.test(k.name_pl) ||
    /^(average|mean|median)\b|per (person|capita|inhabitant)/i.test(k.name_en)
  );
}

/** Every measure is an additive amount (counts, money, persons): parts of it can be stacked or shared out. */
export function additive(shape: Shape): boolean {
  return shape.kpis.every((k) => !/^(pct|pp|idx|per_|rate|years|celsius|ug_m3|hours|t_ha)/.test(k.unit_key) && !averageLike(k));
}

export function canPlace(chart: ChartKind, slot: SlotKey, dim: DimId): boolean {
  const s = spec(chart, slot);
  if (!s) return false;
  if (s.only && !s.only.includes(dim)) return false;
  if (dim === "i" && measureWells(chart)) return false;
  return true;
}

const count = (shape: Shape, d: DimId) => shape.members[d]?.length ?? 0;

export type Verdict = { ok: true } | { ok: false; reason: { pl: string; en: string } };
const no = (pl: string, en: string): Verdict => ({ ok: false, reason: { pl, en } });

/** Whether a kind can be drawn from the catalogue at all (independent of the wells). */
export function possible(chart: ChartKind, shape: Shape, q: Pick<Query, "i">): Verdict {
  if (!q.i.length) return { ok: true };
  if ((chart === "map" || chart === "choro") && !shape.kpis.some(hasVoivodeships))
    return no("Wybrane miary nie mają danych dla województw.", "The chosen measures have no voivodeship data.");
  if (["ibcs", "variance", "ibcsbars", "varbars", "bridge"].includes(chart) && shape.span[1] - shape.span[0] < 1)
    return no("Porównanie z rokiem poprzednim wymaga co najmniej dwóch lat danych.", "Needs two years of data.");
  return { ok: true };
}

/** Kept for callers of the v3 API: a kind is available when it is possible. */
export function chartOk(chart: ChartKind, shape: Shape, q: Pick<Query, "i">): Verdict {
  return possible(chart, shape, q);
}

export type Need = { key: SlotKey | "values"; pl: string; en: string };

/** What a chart still needs before it can be drawn: empty required wells and missing measures. */
export function missing(chart: ChartKind, q: Pick<Query, "i" | "slots">): Need[] {
  const out: Need[] = [];
  const mw = measureWells(chart);
  if (!q.i.length) out.push({ key: "values", pl: "miarę w „Wartościach”", en: "a measure in “Values”" });
  else if (mw && q.i.length < mw.length)
    mw.slice(q.i.length).forEach((w) => out.push({ key: "values", pl: `miarę w „${w[0]}”`, en: `a measure in “${w[1]}”` }));
  for (const s of KIND_INFO[chart].slots)
    if (s.required && !q.slots[s.key]) out.push({ key: s.key, pl: `pole w „${s.label[0]}”`, en: `a field in “${s.label[1]}”` });
  return out;
}

export type Issues = Partial<Record<SlotKey | "values", { pl: string; en: string }>>;

/** Problems of the current layout, keyed by the well they belong to (shown inline there). */
export function layoutIssues(q: Query, shape: Shape): Issues {
  const out: Issues = { ...misuse(q, shape) };
  const chart = q.chart;
  const [k0, k1] = shape.kpis;
  if (chart === "combo" && k0 && k1 && k0.unit_key !== k1.unit_key)
    out.values = {
      pl: "Kolumny i linia mają jedną oś: wybierz dwie miary w tej samej jednostce (inne jednostki wprowadzą w błąd).",
      en: "Columns and line share one axis: choose two measures in the same unit (other units would mislead).",
    };
  for (const s of KIND_INFO[chart].slots) {
    const d = q.slots[s.key];
    if (!d) continue;
    const n = count(shape, d);
    if (s.cap && n > s.cap && d !== "t")
      out[s.key] = {
        pl: `Za dużo wartości (${n}, maks. ${s.cap}). Wybierz mniej wartości albo przenieś pole do innej studzienki.`,
        en: `Too many values (${n}, max ${s.cap}). Select fewer values or move the field.`,
      };
    else if (s.pair && n < 2) out[s.key] = { pl: "Potrzebne są dwie wartości do porównania.", en: "Two values are needed to compare." };
    else if (d === "i" && n > 1 && !shape.sameUnit && q.cmp !== "index" && s.key !== "sm")
      out[s.key] = shape.indexable
        ? {
            pl: "Miary mają różne jednostki: wybierz porównanie „Indeks” albo przenieś „Miary” do małych wielokrotności.",
            en: "The measures have different units: choose “Index” or move “Measures” to small multiples.",
          }
        : {
            pl: "Miary mają różne jednostki: przenieś „Miary” do małych wielokrotności.",
            en: "Different units: move “Measures” to small multiples.",
          };
  }
  return out;
}

/** Kinds that add their parts up (a stack, a share, a total), and the well that holds the parts. */
export const SUMMING: Partial<Record<ChartKind, SlotKey>> = {
  stacked: "legend",
  stackcols: "legend",
  share: "legend",
  stackbars: "legend",
  segmented: "legend",
  treemap: "x",
  waterfall: "x",
};
/** Kinds that join their points with a line, so their x axis must be an order in time. */
const LINE_X: ChartKind[] = ["line", "area", "bump"];

/** Statistical misuse (review 2026-11-09): layouts that would draw a wrong chart, e.g. a sum of averages or a
 * line through voivodeships. The kind stays selectable; the chart is not drawn and the well says why. */
export function misuse(q: Query, shape: Shape): Issues {
  const chart = q.chart;
  if (!q.i.length) return {};
  const parts = SUMMING[chart];
  if (parts && !additive(shape)) {
    const k = shape.kpis.find((x) => !additive({ ...shape, kpis: [x] }));
    const pl = k?.name_pl ?? "Ta miara";
    const en = k?.name_en ?? "This measure";
    return {
      values: {
        pl: `„${pl}” to wskaźnik (średnia, stopa lub udział): jego części się nie sumują, więc ten wykres pokazałby fałszywą sumę. Wybierz kolumny, linię albo słupki grupowane.`,
        en: `“${en}” is a ratio (an average, rate or share): its parts do not add up, so this chart would show a false total. Choose columns, a line or grouped bars.`,
      },
    };
  }
  const x = q.slots.x;
  if (LINE_X.includes(chart) && x && !isTimeDim(x))
    return {
      x: {
        pl: "Linia łączy kolejne okresy: na osi X musi być czas. Dla kategorii lub obszarów wybierz kolumny albo słupki.",
        en: "A line joins consecutive periods: the X axis must be time. For categories or areas choose columns or bars.",
      },
    };
  if (chart === "bridge" && x && isTimeDim(x))
    return {
      x: {
        pl: "Czynniki zmiany to części całości (np. sekcje, województwa), nie okresy: porównanie z rokiem poprzednim robi już sam wykres.",
        en: "Drivers of change are parts of the whole (e.g. sections, voivodeships), not periods: the chart already compares with the previous year.",
      },
    };
  return {};
}

/** Multi-valued dimensions that may be laid out, in placement order (areas first; measures first for one area). */
function candidates(shape: Shape, q: Pick<Query, "geo" | "i">): DimId[] {
  const geoFirst = q.geo.length > 1;
  const order: DimId[] = geoFirst ? ["geo", ...shape.dims, "i"] : ["i", "geo", ...shape.dims];
  return order.filter((d) => count(shape, d) > 1);
}

/** Automatic layout: the preferred dimension of each empty well (keeps wells already set). */
export function defaultSlots(chart: ChartKind, shape: Shape, q: Query): Partial<Record<SlotKey, DimId | null>> {
  const slots: Partial<Record<SlotKey, DimId | null>> = { ...q.slots };
  const used = new Set(Object.values(slots).filter(Boolean) as DimId[]);
  const has = (s: SlotKey) => SLOTS[chart].includes(s) && slots[s] === undefined;
  const fits = (s: SlotKey, d: DimId) => {
    const sp = spec(chart, s)!;
    if (!canPlace(chart, s, d) || used.has(d)) return false;
    if (sp.cap && count(shape, d) > sp.cap && d !== "t") return false;
    if (d === "i" && !shape.sameUnit && q.cmp !== "index" && s !== "sm") return false;
    return true;
  };
  const put = (s: SlotKey, d: DimId | undefined) => {
    if (!has(s) || !d || !fits(s, d)) return false;
    slots[s] = d;
    used.add(d);
    return true;
  };
  const cands = candidates(shape, q).filter((d) => !isTimeDim(d));
  const time = shape.periods.length > 1 ? "t" : undefined;
  const firstFree = (s: SlotKey) => cands.find((d) => fits(s, d));

  if (chart === "map" || chart === "choro") put("x", "geo");
  else if (chart === "boxplot") {
    put("x", time);
    put("legend", "geo");
  } else if (chart === "heatmap" || chart === "matrix") {
    put("rows", firstFree("rows"));
    if (!put("cols", time)) put("cols", firstFree("cols"));
  } else if (chart === "sparkline") put("rows", firstFree("rows"));
  else if (chart === "dumbbell" || chart === "slope") {
    put("x", firstFree("x"));
    if (!put("legend", time)) put("legend", firstFree("legend"));
  } else if (chart === "pyramid") {
    put("legend", cands.includes("sex") ? "sex" : firstFree("legend"));
    put("x", cands.includes("age") ? "age" : firstFree("x"));
  } else if (TIME_X.includes(chart)) {
    if (!put("x", time)) put("x", firstFree("x"));
  } else if (!put("x", firstFree("x"))) put("x", time);

  if (has("legend")) put("legend", firstFree("legend"));
  if (has("sm"))
    put(
      "sm",
      cands.find((d) => d === "i" && fits("sm", d)),
    );
  for (const s of SLOTS[chart]) if (slots[s] === undefined) slots[s] = null;
  return slots;
}

/** The placed fields of a query moved to another kind: same well where it exists and fits, else the next free one. */
export function arrange(q: Query, chart: ChartKind, shape: Shape): Partial<Record<SlotKey, DimId | null>> {
  const placed = (["x", "legend", "sm", "rows", "cols"] as SlotKey[])
    .filter((s) => SLOTS[q.chart].includes(s) && q.slots[s])
    .map((s) => ({ s, d: q.slots[s]! }));
  // Columns of a table are the horizontal axis of a chart, rows its legend (and back): a line of areas over time
  // becomes a heatmap with areas in rows and periods in columns.
  const alias: Partial<Record<SlotKey, SlotKey>> = { rows: "legend", cols: "x", x: "cols", legend: "rows" };
  const out: Partial<Record<SlotKey, DimId | null>> = {};
  const used = new Set<DimId>();
  const ok = (s: SlotKey, d: DimId) => {
    const sp = spec(chart, s);
    return !!sp && out[s] === undefined && !used.has(d) && canPlace(chart, s, d) && !(sp.cap && count(shape, d) > sp.cap && d !== "t");
  };
  for (const { s, d } of placed) {
    const target = [s, alias[s]].find((t): t is SlotKey => !!t && ok(t, d)) ?? SLOTS[chart].find((t) => ok(t, d));
    if (target) {
      out[target] = d;
      used.add(d);
    }
  }
  return out;
}

/** How many multi-valued dimensions a chart shows with its automatic layout; -1 when it still needs something. */
function shown(chart: ChartKind, shape: Shape, q: Query): number {
  const slots = defaultSlots(chart, shape, { ...q, chart, slots: {} });
  const qq = { ...q, chart, slots };
  if (missing(chart, qq).length || Object.keys(layoutIssues(qq, shape)).length) return -1;
  // Scatter, bubble and combo show two or more measures in their own wells.
  const mw = measureWells(chart);
  const measures = mw && mw.length > 1 && q.i.length > 1 ? 1 : 0;
  return Object.values(slots).filter((d) => d && count(shape, d) > 1).length + measures;
}

/** Whether a kind fits the selection now (automatic layout, nothing missing, no issues). */
export function fits(chart: ChartKind, shape: Shape, q: Query): boolean {
  return possible(chart, shape, q).ok && shown(chart, shape, q) >= 0;
}

/** The chart that fits best: shows the most multi-valued dimensions without issues; ties by preference. */
export function autoChart(shape: Shape, q: Query): ChartKind {
  const prefs: ChartKind[] =
    shape.periods.length > 1
      ? ["line", "heatmap", "columns", "bars", "dumbbell", "slope", "map", "scatter"]
      : q.i.length >= 2 && q.geo.length >= 3
        ? ["scatter", "bars", "heatmap", "map", "line", "columns", "dumbbell", "slope"]
        : ["bars", "map", "heatmap", "scatter", "line", "columns", "dumbbell", "slope"];
  let best: ChartKind = prefs.find((c) => possible(c, shape, q).ok) ?? "line";
  let score = -2;
  for (const c of prefs) {
    if (!possible(c, shape, q).ok) continue;
    const s = shown(c, shape, q);
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
}

/**
 * Up to three recommended kinds for the selection (chart picker): the automatic choice first, then kinds that
 * suit the shape of the data — parts of a whole, many areas, two or three measures, regions, one period.
 */
export function recommend(shape: Shape, q: Query, n = 3): ChartKind[] {
  const multi = (d: DimId) => count(shape, d) > 1;
  const breakdown = shape.dims.some(multi);
  const regions = q.level === "voivodeship";
  const time = shape.periods.length > 1;
  const order: ChartKind[] = [autoChart(shape, q)];
  if (q.i.length === 3) order.push("bubble");
  if (time) {
    if (q.i.length === 2 && shape.sameUnit) order.push("combo");
    if (breakdown && additive(shape)) order.push("stacked", "stackcols", "share");
    if (q.geo.length >= 3) order.push("bump", "heatmap");
    if (q.i.length === 1 && q.geo.length === 1 && !breakdown) order.push("variance", "ibcs", "area");
    if (regions) order.push("boxplot");
    order.push("line", "area", "matrix");
  } else {
    if (regions) order.push("choro");
    if (q.i.length >= 2 && q.geo.length >= 3) order.push("scatter");
    if (breakdown && additive(shape)) order.push("treemap", "waterfall", "stackbars");
    order.push("lollipop", "ranking", "varbars", "ibcsbars", "dots", "bars", "matrix");
  }
  const out: ChartKind[] = [];
  for (const c of order) {
    if (out.includes(c) || !fits(c, shape, q)) continue;
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** Puts a dimension in a well (null = take the well's dimension out); a displaced one takes the mover's place. */
export function moveDim(q: Query, slot: SlotKey, dim: DimId | null): Partial<Record<SlotKey, DimId | null>> {
  const slots: Partial<Record<SlotKey, DimId | null>> = {};
  for (const s of SLOTS[q.chart]) slots[s] = q.slots[s] ?? null;
  const from = SLOTS[q.chart].find((s) => slots[s] === dim && dim !== null);
  const prev = slots[slot] ?? null;
  slots[slot] = dim;
  if (from && from !== slot) slots[from] = prev && canPlace(q.chart, from, prev) ? prev : null;
  return slots;
}

/** Swaps the chart's first two wells when both dimensions fit the other well. */
export function swapSlots(q: Query): Partial<Record<SlotKey, DimId | null>> | null {
  const [a, b] = SLOTS[q.chart];
  if (!a || !b) return null;
  const da = q.slots[a] ?? null,
    db = q.slots[b] ?? null;
  if ((da && !canPlace(q.chart, b, da)) || (db && !canPlace(q.chart, a, db))) return null;
  return { ...q.slots, [a]: db, [b]: da };
}

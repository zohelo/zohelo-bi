// Chart types and layout rules of the explorer (Show Me style): which chart types fit the selection, the slots
// of each chart and what may go in them, the automatic layout, and the issues shown inline on a slot.
// Only types of the chart library are used (@zohelo/visuals), with their data contracts.

import type { ChartKind, DimId, Query, Shape, SlotKey } from "./exploreState";

/** The original eight: the only kinds chosen automatically (autoChart); the rest are picked by the reader. */
export const AUTO_CHARTS: ChartKind[] = ["line", "columns", "bars", "dumbbell", "slope", "heatmap", "map", "scatter"];
export const CHARTS: ChartKind[] = [
  ...AUTO_CHARTS,
  "area",
  "stacked",
  "stackcols",
  "share",
  "combo",
  "bump",
  "lollipop",
  "dots",
  "ranking",
  "treemap",
  "boxplot",
  "choro",
  "ibcs",
  "variance",
  "ibcsbars",
  "varbars",
  "matrix",
];

/** Slots of each chart type, in order (the first is the main one). */
export const SLOTS: Record<ChartKind, SlotKey[]> = {
  line: ["series", "panels"],
  columns: ["series", "panels"],
  bars: ["cats", "series"],
  dumbbell: ["cats"],
  slope: ["cats"],
  heatmap: ["rows", "cols"],
  map: [],
  scatter: [],
  area: ["series", "panels"],
  stacked: ["series", "panels"],
  stackcols: ["series", "panels"],
  share: ["series", "panels"],
  combo: [],
  bump: ["series"],
  lollipop: ["cats"],
  dots: ["cats", "series"],
  ranking: ["cats"],
  treemap: ["cats"],
  boxplot: [],
  choro: [],
  ibcs: [],
  variance: [],
  ibcsbars: ["cats"],
  varbars: ["cats"],
  matrix: ["rows", "cols"],
};

/** Slots a chart cannot be drawn without (the others may stay empty). */
export const REQUIRED: Partial<Record<ChartKind, SlotKey[]>> = {
  bars: ["cats"],
  dumbbell: ["cats"],
  slope: ["cats"],
  heatmap: ["rows", "cols"],
  stacked: ["series"],
  stackcols: ["series"],
  share: ["series"],
  bump: ["series"],
  lollipop: ["cats"],
  dots: ["cats", "series"],
  ranking: ["cats"],
  treemap: ["cats"],
  ibcsbars: ["cats"],
  varbars: ["cats"],
  matrix: ["rows"],
};

/** Time charts: the period runs along the x axis. */
export const TIME_CHARTS: ChartKind[] = ["line", "columns", "area", "stacked", "stackcols", "share", "combo", "bump", "ibcs", "variance"];

/** Most members a slot can show and stay readable (line colours run out after 5; grouped bars take 3). */
export const CAP: Record<ChartKind, Partial<Record<SlotKey, number>>> = {
  line: { series: 8, panels: 12 },
  columns: { series: 3, panels: 12 },
  bars: { cats: 40, series: 3 },
  dumbbell: { cats: 30 },
  slope: { cats: 16 },
  heatmap: { rows: 40, cols: 120 },
  map: {},
  scatter: {},
  area: { series: 3, panels: 12 },
  stacked: { series: 6, panels: 6 },
  stackcols: { series: 6, panels: 6 },
  share: { series: 4, panels: 6 },
  combo: {},
  bump: { series: 12 },
  lollipop: { cats: 40 },
  dots: { cats: 30, series: 3 },
  ranking: { cats: 30 },
  treemap: { cats: 40 },
  boxplot: {},
  choro: {},
  ibcs: {},
  variance: {},
  ibcsbars: { cats: 20 },
  varbars: { cats: 20 },
  matrix: { rows: 60, cols: 40 },
};

export type FixedRole = "x" | "two" | "areas" | "axes" | "points" | "pair" | "groups";

/** Dimensions a chart type places itself (time on the x axis, the voivodeships of the map…). */
export function fixedRole(chart: ChartKind, dim: DimId): FixedRole | undefined {
  if (dim === "t" && TIME_CHARTS.includes(chart)) return "x";
  if (dim === "i" && chart === "combo") return "pair";
  if (dim === "geo" && (chart === "choro" || chart === "boxplot")) return "areas";
  if (dim === "t" && chart === "boxplot") return "groups";
  if (dim === "t" && (chart === "dumbbell" || chart === "slope")) return "two";
  if (dim === "geo" && chart === "map") return "areas";
  if (dim === "i" && chart === "scatter") return "axes";
  if (dim === "geo" && chart === "scatter") return "points";
  return undefined;
}

export function isFixed(chart: ChartKind, dim: DimId): boolean {
  return fixedRole(chart, dim) !== undefined;
}

/** Charts where several indicators may each get their own panel (compare mode "Osobne panele"). */
export function isTimeChart(chart: ChartKind): boolean {
  return chart === "line" || chart === "columns" || chart === "area";
}

/** Every indicator is an additive amount (counts, money, persons): parts of it can be stacked or shared out. */
export function additive(shape: Shape): boolean {
  return shape.kpis.every((k) => !/^(pct|pp|idx|per_|rate|years|celsius|ug_m3|hours|t_ha)/.test(k.unit_key));
}

/** Period is placeable only in the heatmap; elsewhere it is the x axis or a single-period filter. */
export function canPlace(chart: ChartKind, slot: SlotKey, dim: DimId): boolean {
  if (!SLOTS[chart].includes(slot) || isFixed(chart, dim)) return false;
  if (dim === "t") return chart === "heatmap" || chart === "matrix";
  return true;
}

const count = (shape: Shape, d: DimId) => shape.members[d]?.length ?? 0;

export type Verdict = { ok: true } | { ok: false; reason: { pl: string; en: string } };
const no = (pl: string, en: string): Verdict => ({ ok: false, reason: { pl, en } });

/** Whether a chart type fits the selection at all (independent of the layout). */
export function chartOk(chart: ChartKind, shape: Shape, q: Pick<Query, "level" | "geo" | "i">): Verdict {
  const periods = shape.periods.length;
  const cats = ["i", "geo", ...shape.shared].filter((d) => count(shape, d) > 1);
  const multi = Object.keys(shape.members).filter((d) => count(shape, d) > 1);
  switch (chart) {
    case "line":
      return periods >= 2 ? { ok: true } : no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
    case "columns":
      if (periods < 2) return no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
      return periods <= 24
        ? { ok: true }
        : no(`${periods} okresów to za dużo na słupki (maks. 24); skróć okres.`, `${periods} periods is too many for columns (max 24).`);
    case "bars":
      return cats.length
        ? { ok: true }
        : no("Potrzeba dwóch obszarów, wskaźników lub kategorii do porównania.", "Needs two areas, indicators or categories to compare.");
    case "dumbbell":
    case "slope":
      if (periods < 2) return no("Potrzeba dwóch okresów do porównania.", "Needs two periods to compare.");
      return cats.length
        ? { ok: true }
        : no("Potrzeba dwóch obszarów, wskaźników lub kategorii.", "Needs two areas, indicators or categories.");
    case "heatmap":
      return multi.length >= 2
        ? { ok: true }
        : no("Potrzeba dwóch wymiarów z kilkoma wartościami (np. obszary × okresy).", "Needs two dimensions with several values.");
    case "map":
      return q.level === "voivodeship"
        ? { ok: true }
        : no("Mapa wymaga poziomu „Województwa” (Obszar).", "The map needs the voivodeship level (Area).");
    case "scatter":
      if (q.i.length < 2) return no("Potrzeba dwóch wskaźników (oś X i oś Y).", "Needs two indicators (x and y axis).");
      return q.geo.length >= 3
        ? { ok: true }
        : no("Potrzeba co najmniej trzech obszarów (punktów).", "Needs at least three areas (points).");
    case "area":
      return periods >= 2 ? { ok: true } : no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
    case "stacked":
    case "share":
    case "stackcols":
    case "bump": {
      if (periods < 2) return no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
      if (chart === "stackcols" && periods > 24)
        return no(`${periods} okresów to za dużo na kolumny (maks. 24); skróć okres.`, `${periods} periods is too many (max 24).`);
      if (chart !== "bump" && !additive(shape))
        return no(
          "Części całości wymagają wielkości, które się sumują (liczby, kwoty), nie stóp ani wskaźników.",
          "Parts of a whole need amounts that add up (counts, money), not rates.",
        );
      const parts = cats.filter((d) => d !== "i" || shape.sameUnit);
      if (!parts.length)
        return no(
          chart === "bump"
            ? "Potrzeba co najmniej trzech kategorii do rankingu."
            : "Potrzeba części całości: wymiaru z kilkoma wartościami (np. płeć, sekcja).",
          chart === "bump" ? "Needs at least three categories to rank." : "Needs parts of a whole: a dimension with several values.",
        );
      if (chart === "bump" && !parts.some((d) => count(shape, d) >= 3))
        return no("Potrzeba co najmniej trzech kategorii do rankingu.", "Needs at least three categories to rank.");
      return { ok: true };
    }
    case "combo":
      if (q.i.length !== 2)
        return no("Potrzeba dokładnie dwóch wskaźników: kolumny i linia.", "Needs exactly two indicators: columns and line.");
      if (!shape.sameUnit)
        return no("Oba wskaźniki muszą mieć tę samą jednostkę (jedna oś).", "Both indicators need the same unit (one axis).");
      return periods >= 2 ? { ok: true } : no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
    case "lollipop":
    case "ranking":
    case "treemap":
      if (!cats.length) return no("Potrzeba kilku obszarów, wskaźników lub kategorii.", "Needs several areas, indicators or categories.");
      if (chart === "treemap" && !additive(shape))
        return no(
          "Mapa drzewa potrzebuje wielkości, które się sumują (nie stóp ani wskaźników).",
          "A treemap needs additive amounts (not rates).",
        );
      return { ok: true };
    case "dots":
      return cats.length >= 2
        ? { ok: true }
        : no("Potrzeba dwóch wymiarów z kilkoma wartościami (kategorie i seria).", "Needs two dimensions with several values.");
    case "boxplot":
      if (q.level !== "voivodeship")
        return no("Wykres pudełkowy pokazuje rozrzut województw: wybierz poziom „Województwa”.", "Needs the voivodeship level.");
      return periods >= 2 ? { ok: true } : no("Potrzeba co najmniej dwóch okresów.", "Needs at least two periods.");
    case "choro":
      return q.level === "voivodeship"
        ? { ok: true }
        : no("Mapa wymaga poziomu „Województwa” (Obszar).", "The map needs the voivodeship level (Area).");
    case "ibcs":
    case "variance":
    case "ibcsbars":
    case "varbars": {
      if (shape.span[1] - shape.window[0] < 1 || shape.window[1] - shape.window[0] < 1)
        return no(
          "Odchylenie od roku poprzedniego (PY) wymaga co najmniej dwóch lat w okresie.",
          "The variance from the previous year (PY) needs two years in the window.",
        );
      if (chart === "ibcsbars" || chart === "varbars")
        return cats.length ? { ok: true } : no("Potrzeba kilku obszarów lub kategorii.", "Needs several areas or categories.");
      return { ok: true };
    }
    case "matrix":
      return { ok: true };
  }
}

export type Issues = Partial<Record<SlotKey, { pl: string; en: string }>>;

/** Problems of the current layout, keyed by the slot they belong to (shown inline there). */
export function layoutIssues(q: Query, shape: Shape): Issues {
  const out: Issues = {};
  const chart = q.chart;
  for (const s of SLOTS[chart]) {
    const d = q.slots[s];
    const required = (REQUIRED[chart] ?? []).includes(s);
    if (!d) {
      if (required) out[s] = { pl: "Wybierz wymiar do tego miejsca.", en: "Choose a dimension for this slot." };
      continue;
    }
    const n = count(shape, d);
    const cap = CAP[chart][s];
    if (cap && n > cap)
      out[s] = {
        pl: `Za dużo wartości (${n}, maks. ${cap}). Przenieś wymiar do innego miejsca albo wybierz mniej wartości.`,
        en: `Too many values (${n}, max ${cap}). Move the dimension or select fewer values.`,
      };
    else if (d === "i" && n > 1 && !shape.sameUnit && q.cmp !== "index" && !(s === "panels" && isTimeChart(chart)))
      out[s] = shape.indexable
        ? {
            pl: "Wskaźniki mają różne jednostki: wybierz porównanie „Indeks” albo „Osobne panele”.",
            en: "The indicators have different units: choose “Index” or “Separate panels”.",
          }
        : {
            pl: "Wskaźniki mają różne jednostki i nie da się ich zindeksować: przenieś „Wskaźnik” do paneli albo filtra.",
            en: "Different units that cannot be indexed: move “Indicator” to panels or a filter.",
          };
  }
  return out;
}

/** Candidate dimensions with several members, in placement order (areas first; indicators first for one area). */
function candidates(chart: ChartKind, shape: Shape, q: Query): DimId[] {
  const order: DimId[] = q.geo.length <= 1 ? ["i", "geo", ...shape.shared] : ["geo", ...shape.shared, "i"];
  if (chart === "heatmap" || chart === "matrix") order.push("t");
  return order.filter((d) => count(shape, d) > 1 && !isFixed(chart, d));
}

/** Automatic layout: each multi-valued dimension into the first slot it fits (keeps slots already set). */
export function defaultSlots(chart: ChartKind, shape: Shape, q: Query): Partial<Record<SlotKey, DimId | null>> {
  const slots: Partial<Record<SlotKey, DimId | null>> = { ...q.slots };
  const used = new Set(Object.values(slots).filter(Boolean) as DimId[]);
  const fits = (s: SlotKey, d: DimId) => {
    const cap = CAP[chart][s];
    if (!canPlace(chart, s, d) || used.has(d) || (cap && count(shape, d) > cap)) return false;
    if (d === "i" && !shape.sameUnit && q.cmp !== "index" && !(s === "panels" && isTimeChart(chart))) return false;
    return true;
  };
  const cands = candidates(chart, shape, q);
  for (const s of SLOTS[chart]) {
    if (slots[s] !== undefined) continue;
    let pick: DimId | undefined;
    if ((chart === "heatmap" || chart === "matrix") && s === "cols" && fits(s, "t") && count(shape, "t") > 1) pick = "t";
    else if ((chart === "heatmap" || chart === "matrix") && s === "rows")
      pick = cands.find((d) => d !== "t" && fits(s, d)) ?? cands.find((d) => fits(s, d));
    else pick = cands.find((d) => fits(s, d));
    slots[s] = pick ?? null;
    if (pick) used.add(pick);
  }
  return slots;
}

/** How many multi-valued dimensions a chart shows with its automatic layout (fixed ones included). */
function shown(chart: ChartKind, shape: Shape, q: Query): number {
  const slots = defaultSlots(chart, shape, { ...q, chart, slots: {} });
  const placed = new Set<DimId>(Object.values(slots).filter(Boolean) as DimId[]);
  for (const d of Object.keys(shape.members)) if (isFixed(chart, d)) placed.add(d);
  const issues = layoutIssues({ ...q, chart, slots }, shape);
  if (Object.keys(issues).length) return -1;
  return [...placed].filter((d) => count(shape, d) > 1).length;
}

/** The chart that fits best: shows the most multi-valued dimensions without issues; ties by preference. */
export function autoChart(shape: Shape, q: Query): ChartKind {
  const prefs: ChartKind[] =
    shape.periods.length > 1
      ? ["line", "heatmap", "columns", "bars", "dumbbell", "slope", "map", "scatter"]
      : q.i.length >= 2 && q.geo.length >= 3
        ? ["scatter", "bars", "heatmap", "map", "line", "columns", "dumbbell", "slope"]
        : ["bars", "map", "heatmap", "scatter", "line", "columns", "dumbbell", "slope"];
  let best: ChartKind = prefs.find((c) => chartOk(c, shape, q).ok) ?? "line";
  let score = -2;
  for (const c of prefs) {
    if (!chartOk(c, shape, q).ok) continue;
    const s = shown(c, shape, q);
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
}

/**
 * Up to three recommended kinds for the selection (explorer v3 chart picker): the automatic choice first, then
 * kinds that suit the shape of the data — parts of a whole, many areas, two indicators, regions, one period —
 * from the whole library. Only kinds that fit without layout issues.
 */
export function recommend(shape: Shape, q: Query, n = 3): ChartKind[] {
  const multi = (d: DimId) => count(shape, d) > 1;
  const breakdown = shape.shared.some(multi);
  const regions = q.level === "voivodeship";
  const time = shape.periods.length > 1;
  const order: ChartKind[] = [autoChart(shape, q)];
  if (time) {
    if (q.i.length === 2 && shape.sameUnit) order.push("combo");
    if (breakdown) order.push("stacked", "share", "stackcols");
    if (q.geo.length >= 3) order.push("bump", "heatmap");
    if (q.i.length === 1 && q.geo.length === 1 && !breakdown) order.push("variance", "ibcs", "area");
    if (regions) order.push("boxplot");
    order.push("line", "area", "matrix");
  } else {
    if (regions) order.push("choro");
    if (q.i.length >= 2 && q.geo.length >= 3) order.push("scatter");
    order.push("lollipop", "ranking", "treemap", "varbars", "ibcsbars", "dots", "bars", "matrix");
  }
  const out: ChartKind[] = [];
  for (const c of order) {
    if (out.includes(c) || !chartOk(c, shape, q).ok || shown(c, shape, q) < 0) continue;
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** Puts a dimension in a slot (null = take the slot's dimension out); a displaced one takes the mover's place. */
export function moveDim(q: Query, slot: SlotKey, dim: DimId | null): Partial<Record<SlotKey, DimId | null>> {
  const slots: Partial<Record<SlotKey, DimId | null>> = {};
  for (const s of SLOTS[q.chart]) slots[s] = q.slots[s] ?? null;
  const from = SLOTS[q.chart].find((s) => slots[s] === dim && dim !== null);
  const prev = slots[slot] ?? null;
  slots[slot] = dim;
  if (from && from !== slot) slots[from] = prev && canPlace(q.chart, from, prev) ? prev : null;
  return slots;
}

/** Swaps the chart's two slots when both dimensions fit the other slot. */
export function swapSlots(q: Query): Partial<Record<SlotKey, DimId | null>> | null {
  const [a, b] = SLOTS[q.chart];
  if (!a || !b) return null;
  const da = q.slots[a] ?? null,
    db = q.slots[b] ?? null;
  if ((da && !canPlace(q.chart, b, da)) || (db && !canPlace(q.chart, a, db))) return null;
  return { ...q.slots, [a]: db, [b]: da };
}

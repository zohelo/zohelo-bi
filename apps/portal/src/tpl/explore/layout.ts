// Chart types and layout rules of the explorer (Show Me style): which chart types fit the selection, the slots
// of each chart and what may go in them, the automatic layout, and the issues shown inline on a slot.
// Only types of the chart library are used (@zohelo/visuals), with their data contracts.

import type { ChartKind, DimId, Query, Shape, SlotKey } from "./exploreState";

export const CHARTS: ChartKind[] = ["line", "columns", "bars", "dumbbell", "slope", "heatmap", "map", "scatter"];

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
};

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
};

export type FixedRole = "x" | "two" | "areas" | "axes" | "points";

/** Dimensions a chart type places itself (time on the x axis, the voivodeships of the map…). */
export function fixedRole(chart: ChartKind, dim: DimId): FixedRole | undefined {
  if (dim === "t" && (chart === "line" || chart === "columns")) return "x";
  if (dim === "t" && (chart === "dumbbell" || chart === "slope")) return "two";
  if (dim === "geo" && chart === "map") return "areas";
  if (dim === "i" && chart === "scatter") return "axes";
  if (dim === "geo" && chart === "scatter") return "points";
  return undefined;
}

export function isFixed(chart: ChartKind, dim: DimId): boolean {
  return fixedRole(chart, dim) !== undefined;
}

export function isTimeChart(chart: ChartKind): boolean {
  return chart === "line" || chart === "columns";
}

/** Period is placeable only in the heatmap; elsewhere it is the x axis or a single-period filter. */
export function canPlace(chart: ChartKind, slot: SlotKey, dim: DimId): boolean {
  if (!SLOTS[chart].includes(slot) || isFixed(chart, dim)) return false;
  if (dim === "t") return chart === "heatmap";
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
        : no("Mapa wymaga poziomu „Województwa” (krok 2).", "The map needs the voivodeship level (step 2).");
    case "scatter":
      if (q.i.length < 2) return no("Potrzeba dwóch wskaźników (oś X i oś Y).", "Needs two indicators (x and y axis).");
      return q.geo.length >= 3
        ? { ok: true }
        : no("Potrzeba co najmniej trzech obszarów (punktów).", "Needs at least three areas (points).");
  }
}

export type Issues = Partial<Record<SlotKey, { pl: string; en: string }>>;

/** Problems of the current layout, keyed by the slot they belong to (shown inline there). */
export function layoutIssues(q: Query, shape: Shape): Issues {
  const out: Issues = {};
  const chart = q.chart;
  for (const s of SLOTS[chart]) {
    const d = q.slots[s];
    const required = s === "cats" || chart === "heatmap";
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
  if (chart === "heatmap") order.push("t");
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
    if (chart === "heatmap" && s === "cols" && fits(s, "t") && count(shape, "t") > 1) pick = "t";
    else if (chart === "heatmap" && s === "rows") pick = cands.find((d) => d !== "t" && fits(s, d)) ?? cands.find((d) => fits(s, d));
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

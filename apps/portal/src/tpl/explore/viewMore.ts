// View builders of the explorer kinds added in v3 (milestone 6): combo, lollipop, ranking table, treemap, dot plot,
// box plot, voivodeship map, IBCS / variance charts (actual against the previous year) and the matrix (table).
// Same contract as view.ts: from the context of one normalised query to the panels, a title stating the finding
// and the count shown in the subtitle. The time kinds with series and panels (area, stacked…) stay in buildTime.

import type { ZChartProps, ZSeries } from "@zohelo/visuals";
import { fmtDiff, fmtSigned } from "@zohelo/visuals";
import { geoName, kpiName } from "../chartData";
import { fmtNumber, fmtPeriod, fmtValue } from "../format";
import { polarityOf } from "../polarity";
import { filterValue, type DimId, type Query } from "./exploreState";
import { findingTitle } from "./findings";
import { VOIV_SHORT, voivodeshipKeys } from "./kpiInfo";
import { plural } from "./search";
import { cats, dimName, fmtFor, kpiFor, sampleOf, singleLabel, unitFor, type Ctx, type Panel } from "./view";

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

type Built = {
  panels: Panel[];
  grid: false;
  title: string;
  count: number;
  countText: string;
  matrix?: MatrixModel;
  periodText?: string;
};

/** Kinds that read a second period although the period is not on the chart (previous period / year). */
export const NEEDS_TIME = new Set<Query["chart"]>(["ranking", "ibcsbars", "varbars"]);

/** Same period one year earlier: "2026-09" → "2025-09", "2026-Q2" → "2025-Q2", "2025" → "2024". */
export function pyPeriod(p: string): string {
  const y = Number(p.slice(0, 4)) - 1;
  return `${y}${p.slice(4)}`;
}

const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const count = (n: number, lang: Ctx["lang"], pl: [string, string, string], en: [string, string]) => `${n} ${plural(n, lang, pl, en)}`;

function catsCount(c: Ctx, n: number): string {
  return count(n, c.lang, ["kategoria", "kategorie", "kategorii"], ["category", "categories"]);
}

function one(key: string, chart: ZChartProps): Panel[] {
  return [{ key, label: null, chart }];
}

// ---------- combo: two indicators, columns + line

function buildCombo(c: Ctx): Built {
  const { q, pl, shape } = c;
  const [ka, kb] = [shape.kpis[0]!, shape.kpis[1]!];
  const label = singleLabel(c, {});
  const series: ZSeries[] = [ka, kb].map((k) => ({
    id: k.kpi_key,
    label: kpiName(k, c.lang),
    points: shape.periods.map((t) => ({ x: t, y: c.val({ i: k.kpi_key, t }) })),
  }));
  const last = (s: ZSeries) => [...s.points].reverse().find((p) => p.y !== null);
  const la = last(series[0]!);
  const lb = last(series[1]!);
  const f = fmtFor(c, ka);
  const title =
    la && lb
      ? pl
        ? `${series[0]!.label}: ${f.value(la.y!)}, ${lc(series[1]!.label)}: ${f.value(lb.y!)} (${fmtPeriod(la.x, c.lang)}, ${label})`
        : `${series[0]!.label}: ${f.value(la.y!)}, ${lc(series[1]!.label)}: ${f.value(lb.y!)} (${fmtPeriod(la.x, c.lang)}, ${label})`
      : pl
        ? "Brak danych dla obu wskaźników"
        : "No data for both indicators";
  const unit = unitFor(c, ka, sampleOf(series.flatMap((s) => s.points.map((p) => p.y))));
  const chart: ZChartProps = {
    type: "combo",
    series,
    unit,
    lang: c.lang,
    ariaLabel: title,
    formatPeriod: (p) => fmtPeriod(p, c.lang),
    categories: shape.periods.map((t) => ({ key: t, label: fmtPeriod(t, c.lang), short: t.length === 4 ? t.slice(2) : undefined })),
    height: 360,
  };
  void q;
  return {
    panels: one("combo", chart),
    grid: false,
    title,
    count: 2,
    countText: pl ? "2 wskaźniki: kolumny i linia" : "2 indicators: columns and line",
  };
}

// ---------- category kinds: lollipop, ranking table, treemap, dot plot

function buildCategories(c: Ctx): Built {
  const { q, pl, shape } = c;
  const cDim = q.slots.cats!;
  const t = filterValue(q, shape, "t") ?? "";
  const categories = cats(c, cDim);
  const k = kpiFor(c);
  const fmt = fmtFor(c, k);
  const highlight = cDim === "geo" && categories.some((x) => x.key === "PL") ? "PL" : undefined;
  if (q.chart === "dots") {
    const sDim = q.slots.series!;
    const sKeys = c.members(sDim).slice(0, 3);
    const series: ZSeries[] = sKeys.map((sk) => ({
      id: sk,
      label: c.lab(sDim, sk),
      points: categories.map((x) => ({ x: x.key, y: c.val({ [cDim]: x.key, [sDim]: sk, t }) })),
    }));
    const gaps = categories
      .map((x, j) => {
        const vs = series.map((s) => s.points[j]!.y).filter((v): v is number => v !== null);
        return { label: x.label, gap: vs.length > 1 ? Math.max(...vs) - Math.min(...vs) : null };
      })
      .filter((g): g is { label: string; gap: number } => g.gap !== null)
      .sort((a, b) => b.gap - a.gap);
    const unit = unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y))));
    const title = gaps[0]
      ? pl
        ? `Największa różnica: ${gaps[0].label} (${fmtDiff(gaps[0].gap, unit, c.lang).replace(/^\+/, "")}), ${fmtPeriod(t, c.lang)}`
        : `Largest gap: ${gaps[0].label} (${fmtDiff(gaps[0].gap, unit, c.lang).replace(/^\+/, "")}), ${fmtPeriod(t, c.lang)}`
      : pl
        ? "Brak danych"
        : "No data";
    return {
      panels: one("dots", { type: "dot-plot", categories, series, unit, lang: c.lang, ariaLabel: title }),
      grid: false,
      title,
      count: categories.length,
      countText: catsCount(c, categories.length),
    };
  }
  const values = categories.map((x) => c.val({ [cDim]: x.key, t }));
  const perCat = categories.map((x, j) => ({ id: x.key, label: x.label, points: [{ x: t, y: values[j]! }] }));
  const title = findingTitle(perCat, fmt, c.lang);
  const series: ZSeries[] = [
    {
      id: "value",
      label: k ? `${kpiName(k, c.lang)}, ${fmtPeriod(t, c.lang)}` : fmtPeriod(t, c.lang),
      points: categories.map((x, j) => ({ x: x.key, y: values[j]! })),
    },
  ];
  const unit = unitFor(c, k, sampleOf(values));
  if (q.chart === "ranking") {
    const i = shape.periods.indexOf(t);
    const prev = i > 0 ? shape.periods[i - 1]! : null;
    if (prev)
      series.push({
        id: "prev",
        label: fmtPeriod(prev, c.lang),
        points: categories.map((x) => ({ x: x.key, y: c.val({ [cDim]: x.key, t: prev }) })),
      });
    series[0]!.label = fmtPeriod(t, c.lang);
    return {
      panels: one("ranking", { type: "ranking-table", categories, series, unit, lang: c.lang, ariaLabel: title, highlight }),
      grid: false,
      title,
      count: categories.length,
      countText: catsCount(c, categories.length),
      periodText: prev ? `${fmtPeriod(t, c.lang)} ${pl ? "wobec" : "vs"} ${fmtPeriod(prev, c.lang)}` : undefined,
    };
  }
  const type = q.chart === "treemap" ? "treemap" : "lollipop";
  return {
    panels: one(type, { type, categories, series, unit, lang: c.lang, ariaLabel: title, highlight }),
    grid: false,
    title,
    count: categories.length,
    countText: catsCount(c, categories.length),
  };
}

// ---------- box plot: spread of the 16 voivodeships per period

function median(v: number[]): number | null {
  const s = v.slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function buildBoxplot(c: Ctx): Built {
  const { q, pl, cat } = c;
  const voiv = voivodeshipKeys(cat);
  const periods = c.shape.periods.slice(-16);
  const k = kpiFor(c);
  const series: ZSeries[] = periods.map((t) => ({
    id: t,
    label: t,
    points: voiv.map((g) => ({ x: g, y: c.val({ geo: g, t }) })),
  }));
  const meds = series.map((s) => median(s.points.map((p) => p.y).filter((v): v is number => v !== null)));
  const fmt = fmtFor(c, k);
  const first = meds.find((m) => m !== null);
  const last = [...meds].reverse().find((m) => m !== null);
  const title =
    first !== undefined && first !== null && last !== undefined && last !== null
      ? pl
        ? `Mediana województw: ${fmt.value(first)} → ${fmt.value(last)} (${fmtPeriod(periods[0]!, c.lang)}–${fmtPeriod(periods[periods.length - 1]!, c.lang)})`
        : `Median of voivodeships: ${fmt.value(first)} → ${fmt.value(last)} (${fmtPeriod(periods[0]!, c.lang)}–${fmtPeriod(periods[periods.length - 1]!, c.lang)})`
      : pl
        ? "Za mało województw z danymi"
        : "Too few voivodeships with data";
  const hl = q.geo.find((g) => g !== "PL" && voiv.includes(g));
  const chart: ZChartProps = {
    type: "boxplot",
    categories: voiv.map((g) => ({ key: g, label: geoName(cat, g, c.lang), short: VOIV_SHORT[g] })),
    series,
    unit: unitFor(c, k, sampleOf(series.flatMap((s) => s.points.map((p) => p.y)))),
    lang: c.lang,
    ariaLabel: title,
    highlight: hl,
    formatPeriod: (p) => fmtPeriod(p, c.lang),
    height: 340,
  };
  return {
    panels: one("box", chart),
    grid: false,
    title,
    count: periods.length,
    countText: `${count(periods.length, c.lang, ["okres", "okresy", "okresów"], ["period", "periods"])} · 16 ${pl ? "województw" : "voivodeships"}`,
  };
}

// ---------- voivodeship map (choropleth)

function buildChoro(c: Ctx): Built {
  const { cat, q, pl } = c;
  const t = filterValue(q, c.shape, "t") ?? "";
  const voiv = voivodeshipKeys(cat);
  const k = kpiFor(c);
  const points = voiv.map((g) => ({ x: g, y: c.val({ geo: g, t }) }));
  const perGeo = voiv.map((g, j) => ({ id: g, label: geoName(cat, g, c.lang), points: [{ x: t, y: points[j]!.y }] }));
  const title = findingTitle(perGeo, fmtFor(c, k), c.lang);
  const one1 = q.geo.filter((g) => g !== "PL");
  const chart: ZChartProps = {
    type: "choropleth",
    categories: voiv.map((g) => ({ key: g, label: geoName(cat, g, c.lang), short: VOIV_SHORT[g] })),
    series: [{ id: "value", label: k ? kpiName(k, c.lang) : "", points }],
    unit: unitFor(c, k, sampleOf(points.map((p) => p.y))),
    lang: c.lang,
    ariaLabel: title,
    highlight: one1.length === 1 ? one1[0] : undefined,
  };
  return { panels: one("choro", chart), grid: false, title, count: 16, countText: pl ? "16 województw" : "16 voivodeships" };
}

// ---------- IBCS / variance over time: AC against PY

function buildVarianceTime(c: Ctx): Built {
  const { q, pl, shape } = c;
  const k = kpiFor(c);
  const inWin = new Set(shape.periods);
  const keep = shape.freq === "A" ? 10 : 12;
  const periods = shape.periods.filter((p) => inWin.has(pyPeriod(p))).slice(-keep);
  const ac = periods.map((p) => c.val({ t: p }));
  const py = periods.map((p) => c.val({ t: pyPeriod(p) }));
  const series: ZSeries[] = [
    { id: "PY", label: pl ? "PY (rok wcześniej)" : "PY (year before)", points: periods.map((p, j) => ({ x: p, y: py[j]! })) },
    { id: "AC", label: "AC", points: periods.map((p, j) => ({ x: p, y: ac[j]! })) },
  ];
  const deltas = periods.map((_, j) => (ac[j] !== null && py[j] !== null ? ac[j]! - py[j]! : null));
  const known = deltas.filter((d): d is number => d !== null);
  const up = known.filter((d) => d > 0).length;
  const unit = unitFor(c, k, sampleOf(ac));
  const lastJ = deltas.length - 1;
  const lastD = deltas[lastJ];
  const lastPct = lastD !== null && lastD !== undefined && py[lastJ] ? (lastD / Math.abs(py[lastJ]!)) * 100 : null;
  const label = singleLabel(c, {});
  const title = known.length
    ? pl
      ? `${label}: powyżej roku poprzedniego w ${up} z ${known.length} okresów; ostatnio ΔPY ${fmtSigned(lastD ?? 0, c.lang, unit.decimals)}${lastPct !== null ? ` (${fmtSigned(lastPct, c.lang, 1)}%)` : ""}`
      : `${label}: above the previous year in ${up} of ${known.length} periods; latest ΔPY ${fmtSigned(lastD ?? 0, c.lang, unit.decimals)}${lastPct !== null ? ` (${fmtSigned(lastPct, c.lang, 1)}%)` : ""}`
    : pl
      ? "Brak wartości z roku poprzedniego w wybranym okresie: wydłuż okres"
      : "No previous-year values in the window: widen the period";
  const chart: ZChartProps = {
    type: q.chart === "ibcs" ? "ibcs-columns" : "variance-columns",
    series,
    unit,
    lang: c.lang,
    ariaLabel: title,
    polarity: k ? polarityOf(k.kpi_key) : undefined,
    formatPeriod: (p) => fmtPeriod(p, c.lang),
    height: 300,
  };
  const n = periods.length;
  return {
    panels: one(q.chart, chart),
    grid: false,
    title,
    count: n,
    countText: `${pl ? "ostatnie" : "last"} ${count(n, c.lang, ["okres", "okresy", "okresów"], ["period", "periods"])} ${pl ? "wobec roku wcześniej" : "against a year earlier"}`,
    periodText: n ? `${fmtPeriod(periods[0]!, c.lang)}–${fmtPeriod(periods[n - 1]!, c.lang)}` : undefined,
  };
}

// ---------- IBCS / variance by category: AC (period) against PY (a year earlier)

function buildVarianceCats(c: Ctx): Built {
  const { q, pl, shape } = c;
  const cDim = q.slots.cats!;
  const t = filterValue(q, shape, "t") ?? "";
  const p0 = pyPeriod(t);
  const categories = cats(c, cDim);
  const k = kpiFor(c);
  const ac = categories.map((x) => c.val({ [cDim]: x.key, t }));
  const py = categories.map((x) => (shape.periods.includes(p0) ? c.val({ [cDim]: x.key, t: p0 }) : null));
  const series: ZSeries[] = [
    { id: "AC", label: `AC ${fmtPeriod(t, c.lang)}`, points: categories.map((x, j) => ({ x: x.key, y: ac[j]! })) },
    { id: "PY", label: `PY ${fmtPeriod(p0, c.lang)}`, points: categories.map((x, j) => ({ x: x.key, y: py[j]! })) },
  ];
  const unit = unitFor(c, k, sampleOf(ac));
  const rows = categories
    .map((x, j) => ({ label: x.label, d: ac[j] !== null && py[j] !== null ? ac[j]! - py[j]! : null }))
    .filter((r): r is { label: string; d: number } => r.d !== null)
    .sort((a, b) => b.d - a.d);
  const up = rows.filter((r) => r.d > 0).length;
  const title = rows.length
    ? pl
      ? `Wzrost wobec ${fmtPeriod(p0, c.lang)} w ${up} z ${rows.length} kategorii; najwięcej: ${rows[0]!.label} (${fmtSigned(rows[0]!.d, c.lang, unit.decimals)})`
      : `Up on ${fmtPeriod(p0, c.lang)} in ${up} of ${rows.length} categories; most: ${rows[0]!.label} (${fmtSigned(rows[0]!.d, c.lang, unit.decimals)})`
    : pl
      ? `Brak wartości z ${fmtPeriod(p0, c.lang)}: wydłuż okres, aby porównać z rokiem wcześniej`
      : `No values for ${fmtPeriod(p0, c.lang)}: widen the period to compare with a year earlier`;
  const chart: ZChartProps = {
    type: q.chart === "ibcsbars" ? "ibcs-bars" : "variance-bars",
    categories,
    series,
    unit,
    lang: c.lang,
    ariaLabel: title,
    polarity: k ? polarityOf(k.kpi_key) : undefined,
  };
  return {
    panels: one(q.chart, chart),
    grid: false,
    title,
    count: categories.length,
    countText: catsCount(c, categories.length),
    periodText: `AC ${fmtPeriod(t, c.lang)} · PY ${fmtPeriod(p0, c.lang)}`,
  };
}

// ---------- matrix (rows × columns table)

function buildMatrix(c: Ctx): Built {
  const { q, pl, shape, cat } = c;
  const rDim = q.slots.rows!;
  const cDim = q.slots.cols ?? null;
  const t = c.placed.has("t") ? undefined : filterValue(q, shape, "t");
  const rows = c.members(rDim).map((key) => ({ key, label: c.lab(rDim, key) }));
  const cols = cDim ? c.members(cDim).map((key) => ({ key, label: c.lab(cDim, key) })) : [{ key: "", label: pl ? "Wartość" : "Value" }];
  const raw = rows.map((r) => cols.map((col) => c.val({ [rDim]: r.key, ...(cDim ? { [cDim]: col.key } : {}), ...(t ? { t } : {}) })));
  const kpiAt = (rk: string, ck: string) => {
    const key = rDim === "i" ? rk : cDim === "i" ? ck : undefined;
    return key ? shape.kpis.find((x) => x.kpi_key === key) : kpiFor(c);
  };
  const cells = rows.map((r, i) =>
    cols.map((col, j) => {
      const v = raw[i]![j]!;
      if (v === null) return "–";
      if (c.index) return fmtNumber(v, c.lang, 1);
      const k = kpiAt(r.key, col.key);
      return k ? fmtValue(v, k.unit_key, cat, c.lang) : fmtNumber(v, c.lang, 1);
    }),
  );
  const filled = raw.flat().filter((v) => v !== null).length;
  const rowHead = dimName(cat, rDim, c.lang);
  const colHead = cDim ? dimName(cat, cDim, c.lang) : null;
  const title = pl
    ? `${rowHead}${colHead ? ` × ${lc(colHead)}` : ""}: ${filled} ${plural(filled, c.lang, ["wartość", "wartości", "wartości"], ["value", "values"])}${t ? `, ${fmtPeriod(t, c.lang)}` : ""}`
    : `${rowHead}${colHead ? ` × ${lc(colHead)}` : ""}: ${filled} values${t ? `, ${fmtPeriod(t, c.lang)}` : ""}`;
  const note = pl
    ? "Macierz pokazuje dokładne wartości; kopiowanie i pobieranie (CSV, XLSX) obejmują wszystkie komórki."
    : "The matrix shows exact values; copying and downloads (CSV, XLSX) include every cell.";
  return {
    panels: [],
    grid: false,
    title,
    count: rows.length,
    countText: `${rows.length} × ${cols.length}`,
    matrix: { rowHead, colHead, rows, cols, cells, raw, note },
  };
}

/** Builder of a v3 kind, or null for the kinds handled by view.ts. */
export function buildMore(c: Ctx): Built | null {
  switch (c.q.chart) {
    case "combo":
      return buildCombo(c);
    case "lollipop":
    case "ranking":
    case "treemap":
    case "dots":
      return buildCategories(c);
    case "boxplot":
      return buildBoxplot(c);
    case "choro":
      return buildChoro(c);
    case "ibcs":
    case "variance":
      return buildVarianceTime(c);
    case "ibcsbars":
    case "varbars":
      return buildVarianceCats(c);
    case "matrix":
      return buildMatrix(c);
    default:
      return null;
  }
}

/** Dimensions a builder reads besides the placed ones (used to keep their observations). */
export function extraDims(chart: Query["chart"]): DimId[] {
  return NEEDS_TIME.has(chart) ? ["t"] : [];
}

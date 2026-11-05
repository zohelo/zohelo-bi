// Chart types added by the user-layer brief (milestone 6), standard and editorial families:
// area, stacked-area, stacked-columns, combo, bump, lollipop, dot-plot, ranking-table, treemap, boxplot, choropleth.
// Same rules as the rest of the library: real pixel size, text ≥ 11px, tokens only, one stop per readable mark.

import { fitText, fmtDiff, fmtNum, fmtVal, parsePeriod, periodLabel, textWidth } from "./format";
import { classOf, extent, linear, niceTicks, periodPositions, spread, timeTicks } from "./scale";
import {
  COL,
  catLabel,
  drawYAxis,
  linePath,
  makeYAxis,
  rampColors,
  seriesColor,
  valueAt,
  xKeys,
  type Ctx,
  type Scene,
  type Stop,
} from "./scene";
import { tipTitle } from "./drawTime";
import { breaksFor, classLabels } from "./drawOther";
import { groupColors } from "./drawBars";
import { tileValues, VOIVODESHIP_TILES } from "./tiles";
import { POLAND_BOX, VOIVODESHIP_CENTROIDS, VOIVODESHIP_PATHS } from "./polandMap";
import type { ZSeries } from "./types";

const TOP = 14;
const AXIS = 26;

const isPeriod = (x: string) => parsePeriod(x).kind !== "X";

/** Label of an x key: a period (short on phones) or a category. */
export function xLabel(c: Ctx, x: string, short = false): string {
  if (isPeriod(x)) return c.phone ? periodLabel(x, c.lang, "phone") : (c.p.formatPeriod?.(x) ?? periodLabel(x, c.lang));
  return catLabel(c.p, x, short);
}

// ---------- frames

type TimeFrame = { xs: string[]; px: (x: string) => number; x0: number; x1: number; y0: number; y1: number; sy: (v: number) => number };

/** Continuous time axis (areas, bump): y ticks with labels, x ticks by year/period. */
function timeFrame(
  c: Ctx,
  xs: string[],
  lo: number,
  hi: number,
  o: { rightPad: number; height: number; zero?: boolean; noAxis?: boolean },
) {
  const y0 = TOP;
  const y1 = o.height - AXIS;
  const ticks = niceTicks(o.zero === false ? lo : Math.min(0, lo), o.zero === false ? hi : Math.max(0, hi), c.phone ? 3 : 4);
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = o.noAxis ? 4 : Math.ceil(ax.labelW + 10);
  const x1 = c.W - o.rightPad;
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const pos = new Map(xs.map((x, i) => [x, ts[i]!]));
  const px = (x: string) => x0 + (((pos.get(x) ?? 0) - t0) / (t1 - t0 || 1)) * (x1 - x0);
  if (!o.noAxis) drawYAxis(c, ax, x0, x1);
  const tk = timeTicks(xs, c.phone ? 3 : 6, c.lang, c.phone, c.p.formatPeriod);
  tk.forEach((t, i) => {
    const x = x0 + ((t.t - t0) / (t1 - t0 || 1)) * (x1 - x0);
    const last = i === tk.length - 1 && x > x1 - textWidth(t.label, 11) / 2;
    c.d.text(last ? x1 : x, o.height - 8, t.label, { anchor: last ? "end" : "middle" });
  });
  const f: TimeFrame = { xs, px, x0, x1, y0, y1, sy: ax.sy };
  return f;
}

type BandFrame = {
  xs: string[];
  step: number;
  cx: (i: number) => number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sy: (v: number) => number;
};

/** Band axis (stacked columns, combo): zero-based y ticks, one slot per x, thinned labels. */
function bandFrame(c: Ctx, xs: string[], lo: number, hi: number, height: number): BandFrame {
  const y0 = TOP + 6;
  const y1 = height - AXIS;
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const step = (x1 - x0) / Math.max(1, xs.length);
  const room = c.phone ? 46 : 56;
  const every = Math.max(1, Math.ceil(xs.length / Math.max(1, Math.floor((x1 - x0) / room))));
  xs.forEach((x, i) => {
    if ((xs.length - 1 - i) % every) return;
    const full = xLabel(c, x);
    const l = textWidth(full, 11) <= step * every - 4 ? full : fitText(xLabel(c, x, true), 11, step * every - 4);
    c.d.text(x0 + step * (i + 0.5), height - 8, l, { anchor: "middle", tone: "ink-2" });
  });
  return { xs, step, cx: (i) => x0 + step * (i + 0.5), x0, x1, y0, y1, sy: ax.sy };
}

/** Name column for row charts: full names, shortened when they do not fit `share` of the width. */
function names(c: Ctx, keys: string[], share: number): { names: string[]; w: number } {
  const max = c.W * share;
  const out = keys.map((k) => {
    const full = catLabel(c.p, k);
    return fitText(textWidth(full, 11) > max ? catLabel(c.p, k, true) : full, 11, max);
  });
  return { names: out, w: Math.ceil(Math.min(max, Math.max(0, ...out.map((l) => textWidth(l, 11))))) };
}

function timeStops(
  c: Ctx,
  f: TimeFrame,
  series: ZSeries[],
  colors: string[],
  yOf: (s: ZSeries, i: number, x: string) => number | null,
): Stop[] {
  return f.xs.map((x) => {
    const X = f.px(x);
    const dots: { x: number; y: number; color: string }[] = [];
    const rows = series.map((s, i) => {
      const y = yOf(s, i, x);
      if (y !== null) dots.push({ x: X, y, color: colors[i]! });
      return { label: s.label, value: fmtVal(valueAt(s, x), c.unit, c.lang), color: colors[i] };
    });
    return { x: X, y: dots[0]?.y ?? f.y0, title: tipTitle(c, x), rows, guide: [X, f.y0, X, f.y1], dots };
  });
}

/** End labels on the right of a time chart, spread so they never collide. */
function endLabels(c: Ctx, f: TimeFrame, items: { label: string; y: number }[]) {
  const ys = spread(
    items.map((i) => i.y + 4),
    13,
    f.y0,
    f.y1 + 4,
  );
  items.forEach((it, i) => c.d.text(f.x1 + 6, ys[i]!, it.label, { tone: "ink-2" }));
}

// ---------- area

export function drawArea(c: Ctx): Scene {
  const series = c.p.series.slice(0, 3);
  const xs = xKeys(c.p, series);
  const [lo, hi] = extent(series.flatMap((s) => s.points.map((p) => p.y)));
  const colors = series.map((s, i) => seriesColor(s.role, i));
  const lastOf = (s: ZSeries) => [...s.points].reverse().find((p) => p.y !== null);
  const labels = series.map((s) => {
    const l = lastOf(s);
    return `${fitText(s.label, 11, c.phone ? 70 : 110)} ${fmtNum(l?.y, c.lang, c.unit.decimals)}`;
  });
  const rightPad = c.phone ? 8 : Math.min(c.W * 0.3, Math.max(...labels.map((l) => textWidth(l, 11))) + 10);
  const f = timeFrame(c, xs, lo, hi, { rightPad, height: c.H });
  const zero = f.sy(Math.max(lo > 0 ? lo * 0 : 0, Math.min(0, hi)));
  series.forEach((s, i) => {
    const pts = xs.map((x) => {
      const v = valueAt(s, x);
      return v === null ? null : { x: f.px(x), y: f.sy(v) };
    });
    const valid = pts.filter((p): p is { x: number; y: number } => !!p);
    if (valid.length > 1) {
      const area = `${linePath(pts)}L${valid[valid.length - 1]!.x} ${zero}L${valid[0]!.x} ${zero}Z`;
      c.d.path(area, "none", 0, { fill: colors[i], opacity: series.length > 1 ? 0.12 : 0.16 });
    }
    c.d.path(linePath(pts), colors[i]!, i === 0 ? 2.5 : 2);
  });
  if (!c.phone)
    endLabels(
      c,
      f,
      series.map((s, i) => ({ label: labels[i]!, y: f.sy(lastOf(s)?.y ?? 0) })),
    );
  const stops = timeStops(c, f, series, colors, (s, _i, x) => {
    const v = valueAt(s, x);
    return v === null ? null : f.sy(v);
  });
  return { height: c.H, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- stacked area

export function drawStackedArea(c: Ctx): Scene {
  const series = c.p.series.slice(0, 6);
  const xs = xKeys(c.p, series);
  const cum = xs.map((x) => {
    let acc = 0;
    return series.map((s) => {
      const a = acc;
      acc += Math.max(0, valueAt(s, x) ?? 0);
      return [a, acc] as [number, number];
    });
  });
  const hi = Math.max(0, ...cum.map((r) => r[r.length - 1]?.[1] ?? 0));
  const colors = series.map((s, i) => seriesColor(s.role, i));
  const labels = series.map((s) => fitText(s.label, 11, c.phone ? 60 : 120));
  const rightPad = c.phone ? 8 : Math.min(c.W * 0.28, Math.max(...labels.map((l) => textWidth(l, 11))) + 10);
  const f = timeFrame(c, xs, 0, hi, { rightPad, height: c.H });
  series.forEach((_, j) => {
    const top = xs.map((x, i) => ({ x: f.px(x), y: f.sy(cum[i]![j]![1]) }));
    const bottom = xs.map((x, i) => ({ x: f.px(x), y: f.sy(cum[i]![j]![0]) })).reverse();
    const d = `${linePath(top)}L${linePath(bottom).slice(1)}Z`;
    c.d.path(d, COL.surface, 1, { fill: colors[j] });
  });
  if (!c.phone) {
    const last = xs.length - 1;
    const items = series
      .map((_, j) => ({
        label: labels[j]!,
        y: f.sy((cum[last]![j]![0] + cum[last]![j]![1]) / 2),
        h: f.sy(cum[last]![j]![0]) - f.sy(cum[last]![j]![1]),
      }))
      .filter((it) => it.h > 3);
    endLabels(c, f, items);
  }
  const stops = xs.map((x, i) => {
    const X = f.px(x);
    const total = cum[i]![series.length - 1]?.[1] ?? 0;
    return {
      x: X,
      y: f.sy(total),
      title: tipTitle(c, x),
      rows: [
        ...series.map((s, j) => ({ label: s.label, value: fmtVal(valueAt(s, x), c.unit, c.lang), color: colors[j] })).reverse(),
        { label: c.lang === "pl" ? "Razem" : "Total", value: fmtVal(total, c.unit, c.lang) },
      ],
      guide: [X, f.y0, X, f.y1] as [number, number, number, number],
    };
  });
  return { height: c.H, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- stacked columns

export function drawStackedColumns(c: Ctx): Scene {
  const series = c.p.series.slice(0, 6);
  const xs = xKeys(c.p, series);
  const totals = xs.map((x) => series.reduce((a, s) => a + Math.max(0, valueAt(s, x) ?? 0), 0));
  const f = bandFrame(c, xs, 0, Math.max(...totals, 0) * 1.08, c.H);
  const colors = series.map((s, i) => seriesColor(s.role, i));
  const bw = Math.max(3, Math.min(f.step * 0.68, 56));
  const stops: Stop[] = [];
  const labelAll = xs.length <= 16;
  xs.forEach((x, i) => {
    const cx = f.cx(i);
    let acc = 0;
    series.forEach((s, j) => {
      const v = Math.max(0, valueAt(s, x) ?? 0);
      if (!v) return;
      const yTop = f.sy(acc + v);
      const yBot = f.sy(acc);
      c.d.rect(cx - bw / 2, yTop, bw, Math.max(0, yBot - yTop - (j ? 0 : 0)), colors[j]!);
      if (j > 0) c.d.line(cx - bw / 2, yBot, cx + bw / 2, yBot, COL.surface, 2);
      acc += v;
    });
    if (labelAll || i === xs.length - 1) {
      const l = fmtNum(totals[i], c.lang, c.unit.decimals);
      if (textWidth(l, 11, 600) <= f.step + 4) c.d.text(cx, f.sy(totals[i]!) - 5, l, { anchor: "middle", tone: "ink", weight: 600 });
    }
    stops.push({
      x: cx,
      y: f.sy(totals[i]!),
      title: tipTitle(c, x),
      rows: [
        ...series.map((s, j) => ({ label: s.label, value: fmtVal(valueAt(s, x), c.unit, c.lang), color: colors[j] })).reverse(),
        { label: c.lang === "pl" ? "Razem" : "Total", value: fmtVal(totals[i], c.unit, c.lang) },
      ],
      band: [cx - f.step / 2, f.y0 - 8, f.step, f.y1 - f.y0 + 8],
    });
  });
  return { height: c.H, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- combo (columns + line, one axis)

export function drawCombo(c: Ctx): Scene {
  const [a, b] = c.p.series;
  const xs = xKeys(c.p, c.p.series.slice(0, 2));
  const [lo, hi] = extent([...xs.map((x) => valueAt(a, x)), ...xs.map((x) => valueAt(b, x))]);
  const f = bandFrame(c, xs, lo, hi * 1.06, c.H);
  const bw = Math.max(3, Math.min(f.step * 0.62, 48));
  const zero = f.sy(0);
  const lineColor = COL.ink;
  xs.forEach((x, i) => {
    const v = valueAt(a, x);
    if (v === null) return;
    const y = f.sy(v);
    c.d.bar(f.cx(i) - bw / 2, Math.min(y, zero), bw, Math.abs(zero - y), COL.series(1), v < 0 ? "bottom" : "top");
  });
  const pts = xs.map((x, i) => {
    const v = valueAt(b, x);
    return v === null ? null : { x: f.cx(i), y: f.sy(v) };
  });
  c.d.path(linePath(pts), lineColor, 2);
  if (xs.length <= 24) pts.forEach((p) => p && c.d.circle(p.x, p.y, 3.5, lineColor));
  const stops = xs.map((x, i) => ({
    x: f.cx(i),
    y: Math.min(f.sy(valueAt(a, x) ?? 0), pts[i]?.y ?? f.y1),
    title: tipTitle(c, x),
    rows: [
      { label: a?.label ?? "", value: fmtVal(valueAt(a, x), c.unit, c.lang), color: COL.series(1) },
      { label: b?.label ?? "", value: fmtVal(valueAt(b, x), c.unit, c.lang), color: lineColor },
    ],
    band: [f.cx(i) - f.step / 2, f.y0 - 8, f.step, f.y1 - f.y0 + 8] as [number, number, number, number],
  }));
  return { height: c.H, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- bump (rank over time)

export function rankAt(series: ZSeries[], x: string): Map<string, number> {
  const vals = series
    .map((s) => ({ id: s.id, v: valueAt(s, x) }))
    .filter((r): r is { id: string; v: number } => r.v !== null)
    .sort((p, q) => q.v - p.v);
  return new Map(vals.map((r, i) => [r.id, i + 1]));
}

export function drawBump(c: Ctx): Scene {
  const series = c.p.series.slice(0, 12);
  const xs = xKeys(c.p, series);
  const n = series.length;
  const ranks = xs.map((x) => rankAt(series, x));
  const last = ranks[ranks.length - 1] ?? new Map<string, number>();
  const hl = c.p.highlight;
  const color = (s: ZSeries, i: number) =>
    hl ? (s.id === hl ? COL.series(1) : COL.context) : n <= 5 ? seriesColor(undefined, i) : i === 0 ? COL.series(1) : COL.context;
  const labels = series.map((s) => `${last.get(s.id) ?? "–"}. ${fitText(s.label, 11, c.phone ? 70 : 130)}`);
  const rightPad = Math.min(c.W * 0.34, Math.max(...labels.map((l) => textWidth(l, 11))) + 12);
  const height = Math.max(c.H, TOP + n * (c.phone ? 22 : 26) + AXIS + 10);
  const f = timeFrame(c, xs, 1, n, { rightPad, height, zero: false, noAxis: true });
  const ry = linear(1, Math.max(2, n), f.y0 + 4, f.y1 - 4);
  const order = series.map((s, i) => ({ s, i })).sort((p, q) => (p.s.id === hl ? 1 : 0) - (q.s.id === hl ? 1 : 0));
  for (const { s, i } of order) {
    const pts = xs.map((x, k) => {
      const r = ranks[k]!.get(s.id);
      return r === undefined ? null : { x: f.px(x), y: ry(r) };
    });
    const on = !hl || s.id === hl;
    c.d.path(linePath(pts), color(s, i), on ? 2.5 : 1.5);
    if (xs.length <= 16) pts.forEach((p) => p && c.d.circle(p.x, p.y, on ? 4 : 3, color(s, i)));
  }
  series.forEach((s, i) => {
    const r = last.get(s.id);
    if (r === undefined) return;
    const on = !hl || s.id === hl;
    c.d.text(f.x1 + 8, ry(r) + 4, labels[i]!, { tone: on ? "ink" : "ink-2", weight: s.id === hl ? 600 : 400 });
  });
  const stops = xs.map((x, k) => {
    const X = f.px(x);
    const rows = series
      .map((s, i) => ({ s, i, r: ranks[k]!.get(s.id) }))
      .filter((o) => o.r !== undefined)
      .sort((p, q) => p.r! - q.r!)
      .map((o) => ({ label: `${o.r}. ${o.s.label}`, value: fmtVal(valueAt(o.s, x), c.unit, c.lang), color: color(o.s, o.i) }));
    return { x: X, y: f.y0, title: tipTitle(c, x), rows, guide: [X, f.y0, X, f.y1] as [number, number, number, number] };
  });
  return { height, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- lollipop

export function drawLollipop(c: Ctx): Scene {
  const s = c.p.series[0];
  const keys = xKeys(c.p, s ? [s] : []).sort((a, b) => (valueAt(s, b) ?? -Infinity) - (valueAt(s, a) ?? -Infinity));
  const rowH = c.phone ? 28 : 24;
  const top = 6;
  const { names: nm, w: nameW } = names(c, keys, c.phone ? 0.36 : 0.3);
  const vals = keys.map((k) => valueAt(s, k));
  const labels = vals.map((v) => fmtNum(v, c.lang, c.unit.decimals));
  const valW = Math.max(...labels.map((l) => textWidth(l, 11, 600)));
  const x0 = nameW + 10;
  const x1 = c.W - valW - 14;
  const [lo, hi] = extent(vals.concat(c.p.reference ? [c.p.reference.value] : []));
  const sx = linear(Math.min(0, lo), Math.max(0, hi), x0, x1);
  const hl = c.p.highlight;
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = top + i * rowH + rowH / 2;
    const v = vals[i];
    const on = hl ? k === hl : true;
    c.d.text(x0 - 8, y + 4, nm[i]!, { anchor: "end", tone: "ink" });
    if (v !== null && v !== undefined) {
      c.d.line(sx(0), y, sx(v), y, COL.lineStrong, 2);
      c.d.circle(sx(v), y, 6, on ? COL.series(1) : COL.context);
      c.d.text(sx(v) + (v >= 0 ? 11 : -11), y + 4, labels[i]!, {
        anchor: v >= 0 ? "start" : "end",
        tone: "ink",
        weight: k === hl ? 600 : 400,
      });
    }
    stops.push({
      x: v === null || v === undefined ? x0 : sx(v),
      y,
      title: catLabel(c.p, k),
      rows: [{ label: s?.label ?? "", value: fmtVal(v, c.unit, c.lang), color: on ? COL.series(1) : COL.context }],
      band: [0, y - rowH / 2, c.W, rowH],
    });
  });
  const yb = top + keys.length * rowH;
  if (lo < 0) c.d.line(sx(0), top, sx(0), yb, COL.reference, 1);
  if (c.p.reference) {
    const x = sx(c.p.reference.value);
    c.d.line(x, top - 2, x, yb, COL.reference, 1, "3 3");
    c.d.text(Math.min(Math.max(x, x0 + 40), c.W - 40), yb + 14, c.p.reference.label, { anchor: "middle", tone: "ink-2" });
  }
  return { height: yb + (c.p.reference ? 22 : 4), els: c.d.els, stops, pick: "y" };
}

// ---------- dot plot

export function drawDotPlot(c: Ctx): Scene {
  const series = c.p.series.slice(0, 3);
  const last = series[series.length - 1];
  const keys = xKeys(c.p, series).sort((a, b) => (valueAt(last, b) ?? -Infinity) - (valueAt(last, a) ?? -Infinity));
  const colors = groupColors(series);
  const rowH = c.phone ? 30 : 26;
  const top = 8;
  const { names: nm, w: nameW } = names(c, keys, c.phone ? 0.34 : 0.28);
  const all = series.flatMap((s) => keys.map((k) => valueAt(s, k)));
  const [lo, hi] = extent(all);
  const ticks = niceTicks(lo > 0 && lo < (hi - lo) * 0.6 ? 0 : lo, hi, c.phone ? 3 : 5);
  const x0 = nameW + 14;
  const x1 = c.W - 10;
  const sx = linear(ticks.min, ticks.max, x0, x1);
  const yb = top + keys.length * rowH;
  ticks.values.forEach((t) => {
    c.d.line(sx(t), top - 4, sx(t), yb, COL.grid, 1);
    c.d.text(sx(t), yb + 14, fmtNum(t, c.lang, Math.max(0, -Math.floor(Math.log10(ticks.step || 1)))), { anchor: "middle" });
  });
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = top + i * rowH + rowH / 2;
    c.d.text(x0 - 10, y + 4, nm[i]!, { anchor: "end", tone: "ink" });
    const vs = series.map((s) => valueAt(s, k)).filter((v): v is number => v !== null);
    if (vs.length > 1) c.d.line(sx(Math.min(...vs)), y, sx(Math.max(...vs)), y, COL.referenceLight, 2);
    series.forEach((s, j) => {
      const v = valueAt(s, k);
      if (v !== null) c.d.circle(sx(v), y, 6, colors[j]!);
    });
    stops.push({
      x: sx(vs.length ? Math.max(...vs) : ticks.min),
      y,
      title: catLabel(c.p, k),
      rows: series.map((s, j) => ({ label: s.label, value: fmtVal(valueAt(s, k), c.unit, c.lang), color: colors[j] })),
      band: [0, y - rowH / 2, c.W, rowH],
    });
  });
  return { height: yb + 22, els: c.d.els, stops, pick: "y" };
}

// ---------- ranking table

export function drawRankingTable(c: Ctx): Scene {
  const [cur, prev] = c.p.series;
  const keys = xKeys(c.p, cur ? [cur] : []).sort((a, b) => (valueAt(cur, b) ?? -Infinity) - (valueAt(cur, a) ?? -Infinity));
  const prevRank = prev ? rankAt([...keys.map((k) => ({ id: k, label: k, points: [{ x: "p", y: valueAt(prev, k) }] }))], "p") : null;
  const rowH = 28;
  const head = 22;
  const pl = c.lang === "pl";
  const rankW = 26;
  const moveW = prev ? 34 : 0;
  const vals = keys.map((k) => valueAt(cur, k));
  const valLabels = vals.map((v) => fmtVal(v, c.unit, c.lang));
  const valW = Math.max(textWidth(pl ? "Wartość" : "Value", 11), ...valLabels.map((l) => textWidth(l, 12, 600)));
  const chg = keys.map((k) => {
    const a = valueAt(prev, k);
    const b = valueAt(cur, k);
    return prev && a !== null && b !== null ? fmtDiff(b - a, c.unit, c.lang) : "";
  });
  const chgW = prev && !c.phone ? Math.max(textWidth(pl ? "Zmiana" : "Change", 11), ...chg.map((l) => textWidth(l, 11))) + 12 : 0;
  const { names: nm, w: nameW } = names(c, keys, c.phone ? 0.34 : 0.26);
  const xName = rankW + moveW + 6;
  const xBar = xName + nameW + 12;
  const xVal = c.W - chgW - 4;
  const barMax = Math.max(24, xVal - valW - 12 - xBar);
  const [lo, hi] = extent(vals);
  const sx = linear(Math.min(0, lo), Math.max(0, hi), 0, barMax);
  const t = { tone: "muted" as const };
  c.d.text(0, 14, "#", t);
  c.d.text(xName, 14, pl ? "Nazwa" : "Name", t);
  c.d.text(xVal, 14, pl ? "Wartość" : "Value", { ...t, anchor: "end" });
  if (chgW) c.d.text(c.W - 2, 14, pl ? "Zmiana" : "Change", { ...t, anchor: "end" });
  c.d.line(0, head, c.W, head, COL.line, 1);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = head + i * rowH;
    const mid = y + rowH / 2 + 4;
    const rank = i + 1;
    c.d.text(0, mid, String(rank), { tone: "ink", weight: 600 });
    const pr = prevRank?.get(k);
    if (pr !== undefined) {
      const mv = pr - rank;
      c.d.text(rankW, mid, mv > 0 ? `▲${mv}` : mv < 0 ? `▼${-mv}` : "■", { tone: "ink-3" });
    }
    c.d.text(xName, mid, nm[i]!, { tone: "ink", weight: k === c.p.highlight ? 600 : 400 });
    const v = vals[i];
    if (v !== null && v !== undefined) {
      const a = sx(Math.min(0, v));
      const b = sx(Math.max(0, v));
      c.d.bar(
        xBar + a,
        y + 8,
        b - a,
        rowH - 16,
        k === c.p.highlight || !c.p.highlight ? COL.series(1) : COL.context,
        v < 0 ? "left" : "right",
      );
    }
    c.d.text(xVal, mid, valLabels[i]!, { anchor: "end", tone: "ink", weight: 600, size: 12 });
    if (chgW) c.d.text(c.W - 2, mid, chg[i]!, { anchor: "end", tone: "ink-2" });
    c.d.line(0, y + rowH, c.W, y + rowH, COL.line, 1);
    stops.push({
      x: xVal,
      y: y + rowH / 2,
      title: `${rank}. ${catLabel(c.p, k)}`,
      rows: [
        { label: cur?.label ?? "", value: valLabels[i]!, color: COL.series(1) },
        ...(prev ? [{ label: prev.label, value: fmtVal(valueAt(prev, k), c.unit, c.lang) }] : []),
        ...(pr !== undefined ? [{ label: pl ? "Poprzednie miejsce" : "Previous rank", value: String(pr) }] : []),
      ],
      band: [0, y, c.W, rowH],
    });
  });
  return { height: head + keys.length * rowH + 2, els: c.d.els, stops, pick: "y" };
}

// ---------- treemap (squarified)

type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap layout (Bruls, Huizing, van Wijk): values sorted high to low, rows of near-square tiles. */
export function squarify(values: number[], box: Rect): Rect[] {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const scale = (box.w * box.h) / total;
  const areas = values.map((v) => v * scale);
  const out: Rect[] = new Array(values.length);
  let { x, y, w, h } = box;
  let i = 0;
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const mx = Math.max(...row);
    const mn = Math.min(...row);
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]!];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]!], side) <= worst(row, side)) row.push(areas[j++]!);
    const s = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      const cw = s / h;
      let yy = y;
      row.forEach((a, k) => {
        out[i + k] = { x, y: yy, w: cw, h: a / cw };
        yy += a / cw;
      });
      x += cw;
      w -= cw;
    } else {
      const ch = s / w;
      let xx = x;
      row.forEach((a, k) => {
        out[i + k] = { x: xx, y, w: a / ch, h: ch };
        xx += a / ch;
      });
      y += ch;
      h -= ch;
    }
    i = j;
  }
  return out;
}

export function drawTreemap(c: Ctx): Scene {
  const s = c.p.series[0];
  const keys = xKeys(c.p, s ? [s] : [])
    .filter((k) => (valueAt(s, k) ?? 0) > 0)
    .sort((a, b) => (valueAt(s, b) ?? 0) - (valueAt(s, a) ?? 0));
  const vals = keys.map((k) => valueAt(s, k)!);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const height = c.p.height ?? (c.phone ? 300 : 340);
  const rects = squarify(vals, { x: 0, y: 0, w: c.W, h: height });
  const breaks = breaksFor(c.p, vals, 4);
  const ramp = rampColors(4);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const rc = rects[i]!;
    const cls = classOf(vals[i]!, breaks);
    c.d.rect(rc.x + 1, rc.y + 1, rc.w - 2, rc.h - 2, ramp[cls]!, { rx: 2 });
    const tone = cls >= 2 ? "inverse" : "ink";
    const share = `${fmtNum((vals[i]! / total) * 100, c.lang, 1)}%`;
    if (rc.w >= 64 && rc.h >= 38) {
      c.d.text(rc.x + 8, rc.y + 18, fitText(catLabel(c.p, k), 12, rc.w - 14, 600), { tone, weight: 600, size: 12 });
      c.d.text(rc.x + 8, rc.y + 33, fitText(`${fmtNum(vals[i], c.lang, c.unit.decimals)} · ${share}`, 11, rc.w - 14), { tone });
    } else if (rc.w >= 40 && rc.h >= 20) c.d.text(rc.x + 5, rc.y + 15, fitText(catLabel(c.p, k, true), 11, rc.w - 8), { tone });
    stops.push({
      x: rc.x + rc.w / 2,
      y: rc.y + rc.h / 2,
      title: catLabel(c.p, k),
      rows: [
        { label: s?.label ?? "", value: fmtVal(vals[i], c.unit, c.lang), color: ramp[cls] },
        { label: c.lang === "pl" ? "Udział" : "Share", value: share },
      ],
      outline: [rc.x, rc.y, rc.w, rc.h],
    });
  });
  return { height, els: c.d.els, stops, pick: "xy", nav: { kind: "spatial" } };
}

// ---------- box plot

export type BoxStats = { min: number; q1: number; med: number; q3: number; max: number; lo: number; hi: number; out: number[]; n: number };

function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const a = Math.floor(i);
  const b = Math.ceil(i);
  return sorted[a]! + (sorted[b]! - sorted[a]!) * (i - a);
}

/** Quartiles (linear interpolation), whiskers to the furthest point within 1.5 × IQR, the rest as outliers. */
export function boxStats(values: (number | null)[]): BoxStats | null {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < 3) return null;
  const q1 = quantile(v, 0.25);
  const q3 = quantile(v, 0.75);
  const iqr = q3 - q1;
  const inside = v.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  return {
    min: v[0]!,
    max: v[v.length - 1]!,
    q1,
    med: quantile(v, 0.5),
    q3,
    lo: inside[0] ?? v[0]!,
    hi: inside[inside.length - 1] ?? v[v.length - 1]!,
    out: v.filter((x) => !inside.includes(x)),
    n: v.length,
  };
}

export function drawBoxplot(c: Ctx): Scene {
  const groups = c.p.series.slice(0, 24);
  const stats = groups.map((g) => boxStats(g.points.map((p) => p.y)));
  const all = stats.flatMap((s) => (s ? [s.min, s.max] : []));
  const [lo, hi] = extent(all);
  const y0 = TOP;
  const y1 = c.H - AXIS;
  const ticks = niceTicks(lo, hi, c.phone ? 3 : 4);
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const step = (x1 - x0) / Math.max(1, groups.length);
  const bw = Math.max(6, Math.min(step * 0.5, 40));
  const every = Math.max(1, Math.ceil(groups.length / Math.max(1, Math.floor((x1 - x0) / (c.phone ? 40 : 50)))));
  const hl = c.p.highlight;
  const pl = c.lang === "pl";
  const stops: Stop[] = [];
  groups.forEach((g, i) => {
    const s = stats[i];
    const cx = x0 + step * (i + 0.5);
    if ((groups.length - 1 - i) % every === 0)
      c.d.text(cx, c.H - 8, fitText(xLabel(c, g.label) || g.label, 11, step * every - 4), { anchor: "middle", tone: "ink-2" });
    if (!s) return;
    c.d.line(cx, ax.sy(s.hi), cx, ax.sy(s.q3), COL.reference, 1.25);
    c.d.line(cx, ax.sy(s.q1), cx, ax.sy(s.lo), COL.reference, 1.25);
    c.d.line(cx - bw / 4, ax.sy(s.hi), cx + bw / 4, ax.sy(s.hi), COL.reference, 1.25);
    c.d.line(cx - bw / 4, ax.sy(s.lo), cx + bw / 4, ax.sy(s.lo), COL.reference, 1.25);
    c.d.rect(cx - bw / 2, ax.sy(s.q3), bw, Math.max(1, ax.sy(s.q1) - ax.sy(s.q3)), COL.band, { rx: 2, stroke: COL.bandEdge, sw: 1.25 });
    c.d.line(cx - bw / 2, ax.sy(s.med), cx + bw / 2, ax.sy(s.med), COL.ink, 2);
    s.out.forEach((o) => c.d.circle(cx, ax.sy(o), 2.5, COL.context, false));
    const hv = hl ? valueAt(g, hl) : null;
    if (hv !== null) c.d.circle(cx, ax.sy(hv), 4.5, COL.series(1));
    const f = (v: number) => fmtVal(v, c.unit, c.lang);
    stops.push({
      x: cx + bw / 2,
      y: ax.sy(s.med),
      title: xLabel(c, g.label) || g.label,
      rows: [
        { label: pl ? "Maksimum" : "Maximum", value: f(s.max) },
        { label: pl ? "Kwartyl górny" : "Upper quartile", value: f(s.q3) },
        { label: pl ? "Mediana" : "Median", value: f(s.med), color: COL.ink },
        { label: pl ? "Kwartyl dolny" : "Lower quartile", value: f(s.q1) },
        { label: pl ? "Minimum" : "Minimum", value: f(s.min) },
        ...(hv !== null && hl ? [{ label: catLabel(c.p, hl), value: f(hv), color: COL.series(1) }] : []),
      ],
      band: [cx - step / 2, y0 - 8, step, y1 - y0 + 8],
    });
  });
  return { height: c.H, els: c.d.els, stops, pick: "x" };
}

// ---------- choropleth (real voivodeship map)

export function drawChoropleth(c: Ctx): Scene {
  const s = c.p.series[0];
  const values = tileValues(s);
  const nums = [...values.values()].filter((v): v is number => v !== null);
  const breaks = breaksFor(c.p, nums, 4);
  const ramp = rampColors(4);
  const cls = classLabels(breaks, c.unit, c.lang);
  const maxH = c.p.height ?? (c.phone ? 340 : 420);
  const k = Math.min(c.W / POLAND_BOX.width, maxH / POLAND_BOX.height);
  const w = POLAND_BOX.width * k;
  const h = POLAND_BOX.height * k;
  const ox = (c.W - w) / 2;
  const hl = c.p.highlight;
  const tiles = new Map(VOIVODESHIP_TILES.map((t) => [t.key, t]));
  const regions = Object.entries(VOIVODESHIP_PATHS);
  c.d.add((key) => (
    <g key={key} transform={`translate(${ox.toFixed(1)} 2) scale(${k.toFixed(4)})`}>
      {regions.map(([g, d]) => {
        const v = values.get(g) ?? null;
        const ci = v === null ? -1 : classOf(v, breaks);
        return (
          <path
            key={g}
            d={d}
            fill={ci < 0 ? COL.muted : ramp[ci]}
            stroke={g === hl ? COL.ink : COL.surface}
            strokeWidth={g === hl ? 2.5 : 1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  ));
  const stops: Stop[] = [];
  for (const [g] of regions) {
    const [cx0, cy0] = VOIVODESHIP_CENTROIDS[g] ?? [0, 0];
    const x = ox + cx0 * k;
    const y = 2 + cy0 * k;
    const v = values.get(g) ?? null;
    const ci = v === null ? -1 : classOf(v, breaks);
    const tone = ci >= 2 ? "inverse" : "ink";
    const t = tiles.get(g);
    const big = w >= 340;
    c.d.text(x, y + (big ? -1 : 4), t?.abbr ?? g, { anchor: "middle", tone, weight: 600 });
    if (big) c.d.text(x, y + 13, fmtNum(v, c.lang, c.unit.decimals), { anchor: "middle", tone });
    stops.push({
      x,
      y,
      title: c.p.categories?.find((q) => q.key === g)?.label ?? (c.lang === "pl" ? t?.name_pl : t?.name_en) ?? g,
      rows: [
        {
          label: s?.label ?? "",
          value: `${fmtVal(v, c.unit, c.lang)}${ci >= 0 ? ` (${cls[ci]})` : ""}`,
          color: ci >= 0 ? ramp[ci] : undefined,
        },
      ],
      outline: [x - 18, y - 14, 36, 32],
    });
  }
  return { height: h + 6, els: c.d.els, stops, pick: "xy", nav: { kind: "spatial" } };
}

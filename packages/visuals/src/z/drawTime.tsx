// Change over time: line-band, line-highlight, columns, small-multiples, area-share, contributions.

import { fitText, fmtNum, fmtSigned, fmtVal, parsePeriod, periodLabel, textWidth } from "./format";
import { extent, niceTicks, periodPositions, spread, timeTicks, type Ticks } from "./scale";
import {
  COL,
  catLabel,
  drawYAxis,
  drawnSeries,
  forecastStart,
  hatchFill,
  intervalOf,
  linePath,
  makeYAxis,
  seriesColor,
  seriesPath,
  valueAt,
  words,
  xKeys,
  type Ctx,
  type Scene,
  type Stop,
} from "./scene";
import type { ZChartProps, ZSeries } from "./types";

const TOP = 12;
const AXIS_H = 26;

/** Lines may start above zero, but include it when it is near the data (never a hidden break). */
function lineDomain(lo: number, hi: number): [number, number] {
  if (lo > 0 && lo < hi - lo) return [0, hi];
  if (hi < 0 && -hi < hi - lo) return [lo, 0];
  return [lo, hi];
}

export function tipTitle(c: Ctx, x: string): string {
  const pp = periodLabel(x, c.lang, "long");
  if (pp !== x) return pp;
  return catLabel(c.p, x);
}

/** Lines: when a nice tick lies far beyond the data (e.g. −5 for a minimum of −0,2), end the axis near the data. */
function trimTicks(t: Ticks, lo: number, hi: number): Ticks {
  const min = lo - t.min > t.step * 0.5 ? lo - t.step * 0.15 : t.min;
  const max = t.max - hi > t.step * 0.5 ? hi + t.step * 0.15 : t.max;
  return { min, max, step: t.step, values: t.values.filter((v) => v >= min - 1e-9 && v <= max + 1e-9) };
}

export type TimeFrame = {
  xs: string[];
  px: (x: string) => number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sy: (v: number) => number;
};

function timeFrame(c: Ctx, series: ZSeries[], o: { rightPad: number; extra?: number[]; zero?: boolean; height: number }): TimeFrame {
  const xs = xKeys(c.p, series);
  const vals = series.flatMap((s) => s.points.map((pt) => pt.y)).concat(o.extra ?? []);
  let [lo, hi] = extent(vals);
  [lo, hi] = o.zero || c.p.opts?.zeroBase ? [Math.min(0, lo), Math.max(0, hi)] : lineDomain(lo, hi);
  const y0 = TOP;
  const y1 = o.height - AXIS_H;
  const ticks = trimTicks(niceTicks(lo, hi, c.phone ? 3 : 4), lo, hi);
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - o.rightPad;
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const tpos = new Map(xs.map((x, i) => [x, ts[i]!]));
  const px = (x: string) => x0 + (((tpos.get(x) ?? 0) - t0) / (t1 - t0 || 1)) * (x1 - x0);
  drawYAxis(c, ax, x0, x1);
  drawTimeTicks(c, xs, x0, x1, o.height - 8);
  return { xs, px, x0, x1, y0, y1, sy: ax.sy };
}

function drawTimeTicks(c: Ctx, xs: string[], x0: number, x1: number, y: number) {
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const ticksX = timeTicks(xs, c.phone ? 3 : 6, c.lang, c.phone, c.p.formatPeriod);
  ticksX.forEach((tk, i) => {
    const x = x0 + ((tk.t - t0) / (t1 - t0 || 1)) * (x1 - x0);
    const half = textWidth(tk.label, 11) / 2;
    const last = i === ticksX.length - 1 && x > x1 - half;
    const first = i === 0 && x < x0 + half - 8;
    c.d.text(last ? x1 : first ? x - 4 : x, y, tk.label, { anchor: last ? "end" : first ? "start" : "middle" });
  });
}

function timeStops(c: Ctx, f: TimeFrame, series: ZSeries[], colors: string[]): Stop[] {
  const iv = intervalOf(c.p);
  const fi = forecastStart(f.xs, c.p.opts?.forecastFrom);
  const w = words(c.lang);
  return f.xs.map((x, k) => {
    const X = f.px(x);
    const dots: { x: number; y: number; color: string }[] = [];
    const rows = series.map((s, i) => {
      const v = valueAt(s, x);
      if (v !== null) dots.push({ x: X, y: f.sy(v), color: colors[i]! });
      return { label: s.label, value: fmtVal(v, s.unit ?? c.unit, c.lang), color: colors[i] };
    });
    if (iv) {
      const lo = valueAt(iv.lower, x);
      const hi = valueAt(iv.upper, x);
      rows.push({
        label: c.p.opts?.intervalLabel ?? w.interval,
        value: lo === null || hi === null ? "–" : `${fmtNum(lo, c.lang, c.unit.decimals)}–${fmtVal(hi, c.unit, c.lang)}`,
        color: COL.band,
      });
    }
    return {
      x: X,
      y: dots.length ? Math.min(...dots.map((d) => d.y)) : f.y0,
      title: k >= fi ? `${tipTitle(c, x)} · ${w.forecast}` : tipTitle(c, x),
      rows,
      guide: [X, f.y0, X, f.y1] as [number, number, number, number],
      dots,
    };
  });
}

function annotate(c: Ctx, f: TimeFrame, s: ZSeries | undefined, color: string) {
  const a = c.p.annotate;
  if (!a || !s) return;
  const v = valueAt(s, a.x);
  if (v === null) return;
  const X = f.px(a.x);
  const Y = f.sy(v);
  c.d.circle(X, Y, 4.5, color);
  const w = textWidth(a.label, 11, 600);
  const right = X + 10 + w < f.x1;
  c.d.text(right ? X + 9 : X - 9, Math.max(f.y0 + 10, Y - 2), a.label, { anchor: right ? "start" : "end", tone: "ink", weight: 600 });
}

/** One series as a line (or steps): solid up to the forecast start, dashed from there on (`opts.forecastFrom`). */
function drawSeriesLine(c: Ctx, f: TimeFrame, s: ZSeries, color: string, width: number, dash?: string) {
  const pts = f.xs.map((x) => {
    const v = valueAt(s, x);
    return v === null ? null : { x: f.px(x), y: f.sy(v) };
  });
  const fi = forecastStart(f.xs, c.p.opts?.forecastFrom);
  if (fi >= f.xs.length) {
    c.d.path(seriesPath(c, pts), color, width, dash ? { dash } : undefined);
    return;
  }
  const solid = seriesPath(
    c,
    pts.map((p, i) => (i < fi ? p : null)),
  );
  if (solid) c.d.path(solid, color, width);
  c.d.path(
    seriesPath(
      c,
      pts.map((p, i) => (i >= fi - 1 ? p : null)),
    ),
    color,
    width,
    { dash: "5 4" },
  );
}

/** Thin divider where the forecast starts, labelled "prognoza" at the top. */
function forecastMarker(c: Ctx, f: TimeFrame) {
  const fi = forecastStart(f.xs, c.p.opts?.forecastFrom);
  if (fi >= f.xs.length || fi === 0) return;
  const X = (f.px(f.xs[fi - 1]!) + f.px(f.xs[fi]!)) / 2;
  c.d.line(X, f.y0, X, f.y1, COL.referenceLight, 1, "2 3");
  const label = words(c.lang).forecast;
  const right = X + 4 + textWidth(label, 11) <= f.x1;
  c.d.text(right ? X + 4 : X - 4, f.y0 + 10, label, { anchor: right ? "start" : "end", tone: "ink-3" });
}

/** Points of a filled band edge: with steps, each value holds until the next x (corner points added). */
function bandEdge(c: Ctx, pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (!c.p.opts?.step) return pts;
  const out: { x: number; y: number }[] = [];
  pts.forEach((p, i) => {
    if (i) out.push({ x: p.x, y: pts[i - 1]!.y });
    out.push(p);
  });
  return out;
}

/** Shaded band between two series (interval bounds or a min–max range), in contiguous runs. */
export function drawBandBetween(c: Ctx, f: TimeFrame, lower: ZSeries, upper: ZSeries, fill = COL.band) {
  let run: { x: number; lo: number; hi: number }[] = [];
  const flush = () => {
    if (run.length > 1) {
      const top = bandEdge(
        c,
        run.map((r) => ({ x: r.x, y: f.sy(r.hi) })),
      );
      const bot = bandEdge(
        c,
        run.map((r) => ({ x: r.x, y: f.sy(r.lo) })),
      ).reverse();
      c.d.path(`${linePath(top)}L${linePath(bot).slice(1)}Z`, "none", 0, { fill });
    }
    run = [];
  };
  for (const x of f.xs) {
    const lo = valueAt(lower, x);
    const hi = valueAt(upper, x);
    if (lo === null || hi === null) flush();
    else run.push({ x: f.px(x), lo, hi });
  }
  flush();
}

// ---------- line + band

export function drawLineBand(c: Ctx): Scene {
  const series = drawnSeries(c.p).slice(0, 5);
  const iv = intervalOf(c.p);
  const band = c.p.band;
  const ref = c.p.reference;
  const f = timeFrame(c, iv ? [...series, iv.lower, iv.upper] : series, {
    rightPad: 8,
    extra: [...(band ?? []), ...(ref ? [ref.value] : [])],
    height: c.H,
  });
  const { d } = c;
  if (band) {
    const ya = f.sy(Math.max(band[0], band[1]));
    const yb = f.sy(Math.min(band[0], band[1]));
    d.rect(f.x0, ya, f.x1 - f.x0, yb - ya, COL.band);
    d.line(f.x0, ya, f.x1, ya, COL.bandEdge, 1, "3 3");
    d.line(f.x0, yb, f.x1, yb, COL.bandEdge, 1, "3 3");
  }
  if (ref) {
    const y = f.sy(ref.value);
    d.line(f.x0, y, f.x1, y, COL.reference, 1, "4 3");
    d.text(f.x0 + 4, y - 5, ref.label, { tone: "ink-2" });
  }
  if (iv) drawBandBetween(c, f, iv.lower, iv.upper);
  forecastMarker(c, f);
  const colors = series.map((s, i) => seriesColor(s.role, i));
  series.forEach((s, i) => drawSeriesLine(c, f, s, colors[i]!, i === 0 ? 2.25 : 2));
  // end values
  const ends = series
    .map((s, i) => {
      const last = [...s.points].reverse().find((pt) => pt.y !== null);
      return last ? { i, x: f.px(last.x), y: f.sy(last.y!), v: last.y!, s } : null;
    })
    .filter((e): e is NonNullable<typeof e> => !!e);
  const ly = spread(
    ends.map((e) => (e.y - 10 < f.y0 + 4 ? e.y + 18 : e.y - 9)),
    14,
    f.y0 + 8,
    f.y1 - 2,
  );
  ends.forEach((e, k) => {
    d.circle(e.x, e.y, 3.5, colors[e.i]!);
    const label = fmtVal(e.v, e.s.unit ?? c.unit, c.lang);
    d.text(e.x - 5, ly[k]!, ends.length > 1 ? `${fitText(e.s.label, 11, 90)} ${label}` : label, {
      anchor: "end",
      tone: "ink",
      weight: 600,
      size: 12,
    });
  });
  annotate(c, f, series[0], colors[0]!);
  return { height: c.H, els: d.els, stops: timeStops(c, f, series, colors), pick: "x", initial: "last" };
}

// ---------- highlight line

/**
 * The emphasised series: the one with role "hero", else the `highlight` id. Without either, the first series is the
 * hero only when no series carries a role (a plain list of lines); series that all say "series" are equals (-1).
 */
export function heroIndex(c: Ctx, series: ZSeries[] = c.p.series): number {
  const i = series.findIndex((s) => s.role === "hero");
  if (i >= 0) return i;
  const h = series.findIndex((s) => s.id === c.p.highlight);
  if (h >= 0) return h;
  return series.some((s) => s.role) ? -1 : 0;
}

export function drawLineHighlight(c: Ctx): Scene {
  const series = drawnSeries(c.p);
  const iv = intervalOf(c.p);
  const hero = heroIndex(c, series);
  const colors = series.map((s, i) => (i === hero ? COL.series(1) : s.role === "series" ? seriesColor(undefined, i) : COL.context));
  const lastOf = (s: ZSeries) => [...s.points].reverse().find((pt) => pt.y !== null);
  const labels = series.map((s) => {
    const l = lastOf(s);
    return { name: s.label, val: l ? fmtNum(l.y, c.lang, c.unit.decimals) : "" };
  });
  const showEnds = c.p.opts?.endLabels !== false;
  // Context (grey) series may go unlabelled at the line ends (opts.contextLabels = false): the legend names them.
  const labelled = (i: number) => showEnds && (c.p.opts?.contextLabels !== false || i === hero || colors[i] !== COL.context);
  const maxLabel = c.W * (c.phone ? 0.36 : 0.3);
  const fullW = Math.max(0, ...labels.map((l, i) => (labelled(i) ? textWidth(`${l.name} ${l.val}`, 11, i === hero ? 600 : 400) : 0)));
  const labelW = showEnds ? Math.min(fullW, maxLabel) : 0;
  const f = timeFrame(c, iv ? [...series, iv.lower, iv.upper] : series, {
    rightPad: showEnds ? labelW + 12 : 8,
    extra: [...(c.p.band ?? []), ...(c.p.reference ? [c.p.reference.value] : [])],
    height: c.H,
  });
  const { d } = c;
  if (c.p.band) {
    const ya = f.sy(Math.max(...c.p.band));
    const yb = f.sy(Math.min(...c.p.band));
    d.rect(f.x0, ya, f.x1 - f.x0, yb - ya, COL.band);
    d.line(f.x0, ya, f.x1, ya, COL.bandEdge, 1, "3 3");
    d.line(f.x0, yb, f.x1, yb, COL.bandEdge, 1, "3 3");
  }
  if (c.p.reference) {
    const y = f.sy(c.p.reference.value);
    d.line(f.x0, y, f.x1, y, COL.reference, 1, "4 3");
    d.text(f.x0 + 4, y - 5, c.p.reference.label, { tone: "ink-2" });
  }
  if (iv) drawBandBetween(c, f, iv.lower, iv.upper);
  forecastMarker(c, f);
  const o = c.p.opts ?? {};
  const k = o.weight === "thin" ? 0.7 : o.weight === "thick" ? 1.5 : 1;
  const heroOn = series.some((s) => s.role === "hero") || !!c.p.highlight;
  // Shaded area under the hero or every series (opts.fill), drawn first and light.
  if (o.fill)
    series.forEach((s, i) => {
      if (o.fill === "hero" && !(heroOn && i === hero)) return;
      const pts = f.xs.map((x) => {
        const v = valueAt(s, x);
        return v === null ? null : { x: f.px(x), y: f.sy(v) };
      });
      const line = seriesPath(c, pts);
      const xsOn = pts.filter((p): p is { x: number; y: number } => !!p);
      if (!line || xsOn.length < 2) return;
      const base = f.y1;
      d.path(`${line}L${xsOn[xsOn.length - 1]!.x} ${base}L${xsOn[0]!.x} ${base}Z`, "none", 0, {
        fill: colors[i]!,
        opacity: o.fill === "all" ? 0.08 : 0.14,
      });
    });
  // Grey context lines first, coloured equals next, the hero last and on top.
  const rank = (i: number) => (i === hero ? 2 : colors[i] === COL.context ? 0 : 1);
  const order = series.map((_, i) => i).sort((a, b) => rank(a) - rank(b));
  for (const i of order)
    drawSeriesLine(
      c,
      f,
      series[i]!,
      colors[i]!,
      (i === hero ? 2.5 : colors[i] === COL.context ? 1.25 : heroOn ? 1.75 : 2) * k,
      o.contextDash && colors[i] === COL.context && (heroOn || series.length > 1) ? "4 3" : undefined,
    );
  // Least-squares trend of the hero (or the first series), dashed.
  if (o.trendLine) {
    const s0 = series[hero] ?? series[0];
    const pts = s0 ? f.xs.map((x, i) => ({ i, v: valueAt(s0, x) })).filter((p): p is { i: number; v: number } => p.v !== null) : [];
    if (pts.length >= 3) {
      const n = pts.length;
      const mx = pts.reduce((a, p) => a + p.i, 0) / n;
      const my = pts.reduce((a, p) => a + p.v, 0) / n;
      const b = pts.reduce((a, p) => a + (p.i - mx) * (p.v - my), 0) / (pts.reduce((a, p) => a + (p.i - mx) ** 2, 0) || 1);
      const a0 = my - b * mx;
      const i0 = pts[0]!.i;
      const i1 = pts[n - 1]!.i;
      d.line(f.px(f.xs[i0]!), f.sy(a0 + b * i0), f.px(f.xs[i1]!), f.sy(a0 + b * i1), COL.ink, 1.25, "6 4");
    }
  }
  // Value labels on the hero (or every series without a hero): last, min and max, or every point.
  if (o.valueLabels) {
    const targets = heroOn ? [hero] : series.map((_, i) => i).filter((i) => colors[i] !== COL.context);
    for (const i of targets) {
      const s0 = series[i];
      if (!s0) continue;
      const pts = s0.points.filter((p) => p.y !== null) as { x: string; y: number }[];
      if (!pts.length) continue;
      let pick: { x: string; y: number }[] = [];
      if (o.valueLabels === "last") pick = [pts[pts.length - 1]!];
      else if (o.valueLabels === "minmax") {
        const mx = pts.reduce((a, p) => (p.y > a.y ? p : a));
        const mn = pts.reduce((a, p) => (p.y < a.y ? p : a));
        pick = mx === mn ? [mx] : [mx, mn];
      } else if (pts.length <= 24) pick = pts;
      for (const p of pick) {
        const X = f.px(p.x);
        const Y = f.sy(p.y);
        const low = o.valueLabels === "minmax" && p.y === Math.min(...pts.map((q) => q.y)) && pick.length > 1;
        d.circle(X, Y, 3, colors[i]!);
        d.text(Math.min(Math.max(X, f.x0 + 14), f.x1 - 14), low ? Y + 15 : Y - 7, fmtNum(p.y, c.lang, c.unit.decimals), {
          anchor: "middle",
          tone: "ink",
          weight: 600,
        });
      }
    }
  }
  // Points only where they can be told apart (up to 40 periods); denser series keep the plain line.
  if (c.p.opts?.markers && Math.max(...series.map((s) => s.points.length)) <= 40)
    series.forEach((s, i) =>
      s.points.forEach((pt) => {
        if (pt.y !== null) d.circle(f.px(pt.x), f.sy(pt.y), i === hero ? 3.5 : 2.5, colors[i]!);
      }),
    );
  const heroS = series[hero] ?? series[0];
  const heroC = colors[hero] ?? colors[0] ?? COL.series(1);
  if (!showEnds) {
    annotate(c, f, heroS, heroC);
    return { height: c.H, els: d.els, stops: timeStops(c, f, series, colors), pick: "x", initial: "last" };
  }
  const shown = series.map((_, i) => i).filter((i) => labelled(i) && lastOf(series[i]!));
  const ly = spread(
    shown.map((i) => f.sy(lastOf(series[i]!)!.y!) + 4),
    13,
    f.y0 + 4,
    f.y1 + 4,
  );
  shown.forEach((i, k) => {
    const s = series[i]!;
    const val = labels[i]!.val;
    const weight = i === hero ? 600 : 400;
    const name = fitText(s.label, 11, labelW - textWidth(` ${val}`, 11, weight) + 0.5, weight);
    d.text(f.x1 + 6, ly[k]!, `${name} ${val}`, { tone: i === hero ? "ink" : "ink-2", weight });
  });
  annotate(c, f, heroS, heroC);
  return { height: c.H, els: d.els, stops: timeStops(c, f, series, colors), pick: "x", initial: "last" };
}

// ---------- columns

export function drawColumns(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const xs = xKeys(c.p, s ? [s] : []);
  const vals = xs.map((x) => valueAt(s, x));
  const [lo, hi] = extent(vals.concat(c.p.reference ? [c.p.reference.value] : []));
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const y0 = TOP + 6 + (c.p.annotate ? 14 : 0);
  const y1 = c.H - AXIS_H;
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const n = Math.max(1, xs.length);
  const step = (x1 - x0) / n;
  const o = c.p.opts ?? {};
  const bw = Math.max(2, Math.min(step * (o.barWidth === "narrow" ? 0.45 : 0.72), step - 2, o.barWidth === "narrow" ? 32 : 56));
  const zeroY = ax.sy(0);
  const cx = (i: number) => x0 + step * (i + 0.5);
  if (ticks.min < 0) d.line(x0, zeroY, x1, zeroY, COL.referenceLight, 1);
  if (c.p.reference) {
    const y = ax.sy(c.p.reference.value);
    d.line(x0, y, x1, y, COL.reference, 1, "4 3");
    d.text(x1, y - 5, c.p.reference.label, { anchor: "end", tone: "ink-2" });
  }
  // The emphasised bar: `highlight` names an x key, or "last" for the latest period.
  const hl = c.p.highlight === "last" ? xs[xs.length - 1] : c.p.highlight;
  const labelled = new Set(
    o.barLabels === "none" ? [] : o.barLabels === "all" ? xs : ([xs[xs.length - 1], c.p.annotate?.x, hl].filter(Boolean) as string[]),
  );
  const labelFits =
    o.barLabels !== "all" || Math.max(...vals.map((v) => textWidth(fmtNum(v, c.lang, c.unit.decimals), 11, 600))) <= step - 2;
  const fi = forecastStart(xs, c.p.opts?.forecastFrom);
  const hatches: Record<string, string> = {};
  const fillOf = (color: string, i: number) => (i < fi ? color : (hatches[color] ??= hatchFill(c, color)));
  xs.forEach((x, i) => {
    const v = vals[i];
    if (v === null || v === undefined) return;
    const y = ax.sy(v);
    const neg = v < 0;
    const color = o.contextBars && hl && x !== hl ? COL.context : neg ? COL.negative : COL.positive;
    d.bar(cx(i) - bw / 2, Math.min(y, zeroY), bw, Math.abs(zeroY - y), fillOf(color, i), neg ? "bottom" : "top");
    if (i >= fi) d.rect(cx(i) - bw / 2 + 0.5, Math.min(y, zeroY) + 0.5, bw - 1, Math.abs(zeroY - y) - 1, "none", { stroke: color, sw: 1 });
    if (labelled.has(x) && (labelFits || x === hl || i === xs.length - 1)) {
      const ty = neg ? y + 14 : y - 5;
      d.text(cx(i), ty, fmtNum(v, c.lang, c.unit.decimals), {
        anchor: "middle",
        tone: "ink",
        weight: x === hl || i === xs.length - 1 ? 600 : 400,
      });
      if (c.p.annotate?.x === x) {
        // the annotation sits in the headroom above the plot, over its column
        const w = textWidth(c.p.annotate.label, 11);
        const ax0 = Math.min(Math.max(cx(i), x0 + w / 2), x1 - w / 2);
        d.text(ax0, 12, c.p.annotate.label, { anchor: "middle", tone: "ink-2" });
        d.line(cx(i), 16, cx(i), Math.min(y, zeroY) - (neg ? 4 : 16), COL.referenceLight, 1);
      }
    }
  });
  // x labels: full, then 2-digit years, then every k-th
  const full = xs.map((x) => (c.p.formatPeriod?.(x) ?? (c.phone ? periodLabel(x, c.lang, "phone") : periodLabel(x, c.lang))) || x);
  const fits = (ls: string[]) => Math.max(...ls.map((l) => textWidth(l, 11))) <= step - 4;
  let shown = full;
  let every = 1;
  if (!fits(full)) {
    const short = xs.map((x, i) => (/^\d{4}$/.test(x) ? x.slice(2) : full[i]!));
    if (fits(short)) shown = short;
    else every = Math.ceil((Math.max(...full.map((l) => textWidth(l, 11))) + 8) / step);
  }
  shown.forEach((l, i) => {
    if ((xs.length - 1 - i) % every === 0) d.text(cx(i), c.H - 8, l, { anchor: "middle" });
  });
  const stops: Stop[] = xs.map((x, i) => {
    const v = vals[i] ?? null;
    return {
      x: cx(i),
      y: v === null ? zeroY : Math.min(ax.sy(v), zeroY),
      title: i >= fi ? `${tipTitle(c, x)} · ${words(c.lang).forecast}` : tipTitle(c, x),
      rows: [{ label: s?.label ?? "", value: fmtVal(v, c.unit, c.lang), color: v !== null && v < 0 ? COL.negative : COL.positive }],
      band: [cx(i) - step / 2, y0 - 6, step, y1 - y0 + 6] as [number, number, number, number],
    };
  });
  return { height: c.H, els: d.els, stops, pick: "x", initial: "last" };
}

// ---------- small multiples

export function drawSmallMultiples(c: Ctx): Scene {
  const series = c.p.series.slice(0, 12);
  const { d } = c;
  const n = Math.max(1, series.length);
  const o = c.p.opts ?? {};
  // Panels per row: as many as fit 190 px each (2 on phones), preferring a count that leaves no orphan row
  // (6 panels → 3 × 2, not 4 + 2); opts.panelCols overrides.
  const maxCols = c.phone ? 2 : Math.max(2, Math.min(4, Math.floor(c.W / 190)));
  let cols = Math.min(n, maxCols);
  if (!o.panelCols && n > maxCols) {
    const rowsOf = (k: number) => Math.ceil(n / k);
    for (let k = maxCols; k >= 2; k--) if (rowsOf(k) === rowsOf(maxCols) && n % k === 0) cols = k;
  }
  if (o.panelCols) cols = Math.max(1, Math.min(n, o.panelCols));
  const rows = Math.ceil(n / cols);
  const gap = c.phone ? 10 : 14;
  const pw = (c.W - gap * (cols - 1)) / cols;
  const titleH = 18;
  const footH = 20;
  // Panels grow when the card offers height (fill): the plot takes what is left after titles and footers.
  const natural = c.phone ? 76 : 92;
  const offered = c.p.height ? Math.floor((c.p.height - rows * (titleH + footH) - (rows - 1) * 10) / rows) : 0;
  const plotH = Math.max(natural, Math.min(offered, 220));
  const ph = titleH + plotH + footH;
  const height = rows * ph + (rows - 1) * 10;
  const xs = xKeys(c.p, series);
  // One value axis for every panel (default), or each panel scaled to its own data (opts.sharedY = false).
  const domainOf = (ss: ZSeries[]) => {
    const [lo0, hi0] = extent(ss.flatMap((s) => s.points.map((pt) => pt.y)));
    const [lo, hi] = o.zeroBase ? [Math.min(0, lo0), Math.max(0, hi0)] : lineDomain(lo0, hi0);
    return niceTicks(lo, hi, c.phone ? 2 : 3);
  };
  const sharedTicks = domainOf(o.panelContext ? c.p.series : series);
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const tpos = new Map(xs.map((x, i) => [x, ts[i]!]));
  const stops: Stop[] = [];
  series.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px0 = col * (pw + gap);
    const py0 = row * (ph + 10);
    const top = py0 + titleH;
    d.text(px0, py0 + 12, fitText(s.label, 11, pw, 600), { tone: "ink", weight: 600 });
    d.rect(px0, top, pw, plotH, COL.sunken, { rx: 4 });
    const ax = makeYAxis(c, o.sharedY === false ? domainOf(o.panelContext ? c.p.series : [s]) : sharedTicks, top + 8, top + plotH - 8);
    const gx0 = px0 + ax.labelW + 10;
    const gx1 = px0 + pw - 8;
    drawYAxis(c, ax, gx0, gx1);
    const X = (x: string) => gx0 + (((tpos.get(x) ?? 0) - t0) / (t1 - t0 || 1)) * (gx1 - gx0);
    const ptsOf = (ss: ZSeries) =>
      xs.map((x) => {
        const v = valueAt(ss, x);
        return v === null ? null : { x: X(x), y: ax.sy(v) };
      });
    // The other series in grey behind each panel's line (opts.panelContext).
    if (o.panelContext) for (const other of series) if (other !== s) d.path(seriesPath(c, ptsOf(other)), COL.context, 1);
    d.path(seriesPath(c, ptsOf(s)), COL.series(1), o.weight === "thick" ? 2.5 : o.weight === "thin" ? 1.25 : 1.75);
    const last = [...s.points].reverse().find((pt) => pt.y !== null);
    const firstX = xs[0];
    const lastX = xs[xs.length - 1];
    if (firstX) d.text(gx0, top + plotH + 14, periodLabel(firstX, c.lang, c.phone ? "phone" : "short"), {});
    if (last) {
      d.circle(X(last.x), ax.sy(last.y!), 3, COL.series(1));
      d.text(px0 + pw, top + plotH + 14, fmtVal(last.y, s.unit ?? c.unit, c.lang), { anchor: "end", tone: "ink", weight: 600 });
    } else if (lastX) d.text(px0 + pw, top + plotH + 14, "–", { anchor: "end" });
    xs.forEach((x) => {
      const v = valueAt(s, x);
      const gxp = X(x);
      stops.push({
        x: gxp,
        y: v === null ? top : ax.sy(v),
        title: tipTitle(c, x),
        rows: [{ label: s.label, value: fmtVal(v, s.unit ?? c.unit, c.lang), color: COL.series(1) }],
        guide: [gxp, top + 2, gxp, top + plotH - 2],
        dots: v === null ? [] : [{ x: gxp, y: ax.sy(v), color: COL.series(1) }],
      });
    });
  });
  return { height, els: d.els, stops, pick: "xy", nav: { kind: "grid", cols: xs.length }, initial: "last" };
}

// ---------- 100% area

export function drawAreaShare(c: Ctx): Scene {
  const series = c.p.series.slice(0, 5);
  const { d } = c;
  const xs = xKeys(c.p, series);
  const y0 = TOP;
  const y1 = c.H - AXIS_H;
  const ticks = { values: c.phone ? [0, 100] : [0, 50, 100], step: 50, min: 0, max: 100 };
  const ax = makeYAxis(c, ticks, y0, y1);
  const pctLabels = ticks.values.map((t) => `${t}%`);
  const x0 = Math.ceil(Math.max(...pctLabels.map((l) => textWidth(l, 11))) + 10);
  const x1 = c.W - 4;
  ticks.values.forEach((t, i) => {
    d.line(x0, ax.sy(t), x1, ax.sy(t), COL.grid, 1);
    d.text(x0 - 6, ax.sy(t) + 4, pctLabels[i]!, { anchor: "end" });
  });
  drawTimeTicks(c, xs, x0, x1, c.H - 8);
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const X = (i: number) => x0 + ((ts[i]! - t0) / (t1 - t0 || 1)) * (x1 - x0);
  const totals = xs.map((x) => series.reduce((a, s) => a + Math.max(0, valueAt(s, x) ?? 0), 0) || 1);
  const share = (s: ZSeries, i: number) => (Math.max(0, valueAt(s, xs[i]!) ?? 0) / totals[i]!) * 100;
  const colors = series.map((s, i) => seriesColor(s.role, i));
  let lower = xs.map(() => 0);
  const layers = series.map((s) => {
    const upper = lower.map((l, i) => l + share(s, i));
    const lo = lower;
    lower = upper;
    return { lo, hi: upper };
  });
  layers.forEach((L, k) => {
    let path = "";
    xs.forEach((_, i) => (path += `${i ? "L" : "M"}${X(i).toFixed(1)} ${ax.sy(L.hi[i]!).toFixed(1)}`));
    for (let i = xs.length - 1; i >= 0; i--) path += `L${X(i).toFixed(1)} ${ax.sy(L.lo[i]!).toFixed(1)}`;
    d.path(path + "Z", COL.surface, 1.5, { fill: colors[k] });
  });
  const lastI = xs.length - 1;
  layers.forEach((L, k) => {
    if (lastI < 0) return;
    const top = ax.sy(L.hi[lastI]!);
    const bot = ax.sy(L.lo[lastI]!);
    if (bot - top < 16) return;
    const v = L.hi[lastI]! - L.lo[lastI]!;
    const txt = `${series[k]!.label} ${fmtNum(v, c.lang, 0)}%`;
    d.text(x1 - 6, (top + bot) / 2 + 4, fitText(txt, 11, (x1 - x0) * 0.6, 600), { anchor: "end", tone: "ink", weight: 600 });
  });
  const stops: Stop[] = xs.map((x, i) => ({
    x: X(i),
    y: y0,
    title: tipTitle(c, x),
    rows: series.map((s, k) => ({ label: s.label, value: `${fmtNum(share(s, i), c.lang, c.unit.decimals || 1)}%`, color: colors[k] })),
    guide: [X(i), y0, X(i), y1] as [number, number, number, number],
  }));
  return { height: c.H, els: d.els, stops, pick: "x", initial: "last" };
}

// ---------- contributions to growth

export type ContribPart = { id: string; label: string; color: string; at: (x: string) => number | null };
export type Contributions = { xs: string[]; parts: ContribPart[]; total: { label: string; at: (x: string) => number | null } };

/** Contribution value with sign, always in percentage points: "+1,2 pp", "−0,4 pp". */
export function fmtPp(v: number | null, c: Pick<Ctx, "lang" | "unit">): string {
  return v === null ? "–" : `${fmtSigned(v, c.lang, c.unit.decimals || 1)} pp`;
}

/**
 * Components and total of a contributions chart. Up to 5 components keep their identity colours; with more, the
 * first 4 stay and the rest fold into "Pozostałe" (series-context). The total is `p.total`, else the sum.
 */
export function contributions(p: ZChartProps): Contributions {
  const pl = p.lang === "pl";
  const all = p.series;
  const xs = xKeys(p, p.total ? [...all, p.total] : all);
  const keep = all.length > 5 ? all.slice(0, 4) : all;
  const rest = all.length > 5 ? all.slice(4) : [];
  const parts: ContribPart[] = keep.map((s, i) => ({ id: s.id, label: s.label, color: seriesColor(s.role, i), at: (x) => valueAt(s, x) }));
  if (rest.length)
    parts.push({
      id: "other",
      label: pl ? "Pozostałe" : "Other",
      color: COL.context,
      at: (x) => {
        const vs = rest.map((s) => valueAt(s, x)).filter((v): v is number => v !== null);
        return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
      },
    });
  const sum = (x: string) => {
    const vs = all.map((s) => valueAt(s, x)).filter((v): v is number => v !== null);
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
  };
  const total = p.total
    ? { label: p.total.label, at: (x: string) => valueAt(p.total, x) }
    : { label: p.totalLabel ?? (pl ? "Suma" : "Total"), at: sum };
  return { xs, parts, total };
}

/** Labels under columns of periods: years centred under their periods for sub-annual data, else every k-th period. */
function columnPeriodLabels(c: Ctx, xs: string[], cx: (i: number) => number, step: number, y: number) {
  const kinds = new Set(xs.map((x) => parsePeriod(x).kind));
  const sub = kinds.size === 1 && (kinds.has("Q") || kinds.has("M"));
  const label = (x: string) => (c.phone ? periodLabel(x, c.lang, "phone") : (c.p.formatPeriod?.(x) ?? periodLabel(x, c.lang))) || x;
  if (sub && !xs.every((x) => textWidth(label(x), 11) <= step - 4)) {
    const years: { year: number; i0: number; i1: number }[] = [];
    xs.forEach((x, i) => {
      const yr = parsePeriod(x).year;
      const last = years[years.length - 1];
      if (last && last.year === yr) last.i1 = i;
      else years.push({ year: yr, i0: i, i1: i });
    });
    const yTick = y - 13;
    years.forEach((g, k) => {
      const left = cx(g.i0) - step / 2;
      const w = (g.i1 - g.i0 + 1) * step;
      if (k) c.d.line(left, yTick - 6, left, yTick, COL.grid, 1);
      const full = String(g.year);
      const t = textWidth(full, 11) <= w - 4 ? full : textWidth(`’${full.slice(2)}`, 11) <= w - 2 ? `’${full.slice(2)}` : "";
      if (t) c.d.text(left + w / 2, y, t, { anchor: "middle" });
    });
    return;
  }
  const full = xs.map(label);
  const widest = Math.max(...full.map((l) => textWidth(l, 11)));
  const every = widest <= step - 4 ? 1 : Math.ceil((widest + 8) / step);
  full.forEach((l, i) => {
    if ((xs.length - 1 - i) % every === 0) c.d.text(cx(i), y, l, { anchor: "middle" });
  });
}

export function drawContributions(c: Ctx): Scene {
  const { d } = c;
  const { xs, parts, total } = contributions(c.p);
  const stacks = xs.map((x) => {
    let pos = 0;
    let neg = 0;
    const segs = parts.map((pt) => {
      const v = pt.at(x);
      if (v === null || v === 0) return null;
      const from = v > 0 ? pos : neg;
      if (v > 0) pos += v;
      else neg += v;
      return { from, to: from + v, v };
    });
    return { segs, pos, neg, total: total.at(x) };
  });
  const [lo, hi] = extent(stacks.flatMap((s) => [s.pos, s.neg, s.total]));
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const y0 = TOP + 14;
  const y1 = c.H - AXIS_H;
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const n = Math.max(1, xs.length);
  const step = (x1 - x0) / n;
  const bw = Math.max(2, Math.min(step * 0.7, step - 2, 44));
  const zeroY = ax.sy(0);
  const cx = (i: number) => x0 + step * (i + 0.5);
  stacks.forEach((st, i) => {
    const outer = { pos: -1, neg: -1 };
    st.segs.forEach((sg, j) => {
      if (sg) outer[sg.v > 0 ? "pos" : "neg"] = j;
    });
    st.segs.forEach((sg, j) => {
      if (!sg) return;
      // 2px surface gap between stacked segments (1px off each inner end), none at the zero line
      const inner = j !== (sg.v > 0 ? outer.pos : outer.neg);
      const top = sg.v > 0 ? ax.sy(sg.to) + (inner ? 1 : 0) : ax.sy(sg.from) + (sg.from !== 0 ? 1 : 0);
      const bot = sg.v > 0 ? ax.sy(sg.from) - (sg.from !== 0 ? 1 : 0) : ax.sy(sg.to) - (inner ? 1 : 0);
      const h = Math.max(0.5, bot - top);
      const x = cx(i) - bw / 2;
      if (j === outer.pos) d.bar(x, top, bw, h, parts[j]!.color, "top");
      else if (j === outer.neg) d.bar(x, top, bw, h, parts[j]!.color, "bottom");
      else d.rect(x, top, bw, h, parts[j]!.color);
    });
  });
  // the zero line above the columns, emphasised
  d.line(x0, zeroY, x1, zeroY, COL.reference, 1.25);
  // the total: one ink dot per period with a surface ring, the latest one labelled
  const dotR = Math.max(2.5, Math.min(4.5, bw / 2 - 0.5));
  stacks.forEach((st, i) => {
    if (st.total !== null) d.circle(cx(i), ax.sy(st.total), dotR, COL.ink);
  });
  let li = -1;
  stacks.forEach((st, i) => {
    if (st.total !== null) li = i;
  });
  if (li >= 0) {
    const st = stacks[li]!;
    const txt = fmtNum(st.total, c.lang, c.unit.decimals || 1);
    const w = textWidth(txt, 12, 600);
    const tx = Math.min(Math.max(cx(li), x0 + w / 2), x1 - w / 2);
    const ty = Math.min(ax.sy(st.pos), ax.sy(st.total!) - dotR) - 6;
    d.text(tx, Math.max(12, ty), txt, { anchor: "middle", tone: "ink", weight: 600, size: 12 });
  }
  columnPeriodLabels(c, xs, cx, step, c.H - 8);
  const stops: Stop[] = xs.map((x, i) => {
    const st = stacks[i]!;
    const rows = parts.map((pt) => ({ label: pt.label, value: fmtPp(pt.at(x), c), color: pt.color }));
    rows.push({ label: total.label, value: fmtPp(st.total, c), color: COL.ink });
    return {
      x: cx(i),
      y: Math.min(ax.sy(st.pos), st.total === null ? zeroY : ax.sy(st.total)),
      title: tipTitle(c, x),
      rows,
      band: [cx(i) - step / 2, y0 - 6, step, y1 - y0 + 6] as [number, number, number, number],
    };
  });
  return { height: c.H, els: d.els, stops, pick: "x", initial: "last" };
}

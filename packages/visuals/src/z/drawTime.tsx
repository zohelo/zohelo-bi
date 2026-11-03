// Change over time: line-band, line-highlight, columns, small-multiples, area-share.

import { fitText, fmtNum, fmtVal, periodLabel, textWidth } from "./format";
import { extent, niceTicks, periodPositions, spread, timeTicks, type Ticks } from "./scale";
import { COL, catLabel, drawYAxis, linePath, makeYAxis, seriesColor, valueAt, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import type { ZSeries } from "./types";

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

type TimeFrame = {
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
  [lo, hi] = o.zero ? [Math.min(0, lo), Math.max(0, hi)] : lineDomain(lo, hi);
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
  return f.xs.map((x) => {
    const X = f.px(x);
    const dots: { x: number; y: number; color: string }[] = [];
    const rows = series.map((s, i) => {
      const v = valueAt(s, x);
      if (v !== null) dots.push({ x: X, y: f.sy(v), color: colors[i]! });
      return { label: s.label, value: fmtVal(v, s.unit ?? c.unit, c.lang), color: colors[i] };
    });
    return {
      x: X,
      y: dots.length ? Math.min(...dots.map((d) => d.y)) : f.y0,
      title: tipTitle(c, x),
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

// ---------- line + band

export function drawLineBand(c: Ctx): Scene {
  const series = c.p.series.slice(0, 5);
  const band = c.p.band;
  const ref = c.p.reference;
  const f = timeFrame(c, series, { rightPad: 8, extra: [...(band ?? []), ...(ref ? [ref.value] : [])], height: c.H });
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
  const colors = series.map((s, i) => seriesColor(s.role, i));
  series.forEach((s, i) => {
    const pts = f.xs.map((x) => {
      const v = valueAt(s, x);
      return v === null ? null : { x: f.px(x), y: f.sy(v) };
    });
    d.path(linePath(pts), colors[i]!, i === 0 ? 2.25 : 2);
  });
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

export function heroIndex(c: Ctx): number {
  const i = c.p.series.findIndex((s) => s.role === "hero");
  if (i >= 0) return i;
  const h = c.p.series.findIndex((s) => s.id === c.p.highlight);
  return h >= 0 ? h : 0;
}

export function drawLineHighlight(c: Ctx): Scene {
  const series = c.p.series;
  const hero = heroIndex(c);
  const colors = series.map((s, i) => (i === hero ? COL.series(1) : s.role === "series" ? seriesColor(undefined, i) : COL.context));
  const lastOf = (s: ZSeries) => [...s.points].reverse().find((pt) => pt.y !== null);
  const labels = series.map((s) => {
    const l = lastOf(s);
    return { name: s.label, val: l ? fmtNum(l.y, c.lang, c.unit.decimals) : "" };
  });
  const maxLabel = c.W * (c.phone ? 0.36 : 0.3);
  const fullW = Math.max(...labels.map((l, i) => textWidth(`${l.name} ${l.val}`, 11, i === hero ? 600 : 400)));
  const labelW = Math.min(fullW, maxLabel);
  const f = timeFrame(c, series, {
    rightPad: labelW + 12,
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
  const order = series.map((_, i) => i).sort((a, b) => (a === hero ? 1 : 0) - (b === hero ? 1 : 0));
  for (const i of order) {
    const s = series[i]!;
    const pts = f.xs.map((x) => {
      const v = valueAt(s, x);
      return v === null ? null : { x: f.px(x), y: f.sy(v) };
    });
    d.path(linePath(pts), colors[i]!, i === hero ? 2.5 : 1.25);
  }
  const ends = series.map((s) => {
    const l = lastOf(s);
    return l ? f.sy(l.y!) + 4 : f.y1;
  });
  const ly = spread(ends, 13, f.y0 + 4, f.y1 + 4);
  series.forEach((s, i) => {
    const l = lastOf(s);
    if (!l) return;
    const val = labels[i]!.val;
    const weight = i === hero ? 600 : 400;
    const name = fitText(s.label, 11, labelW - textWidth(` ${val}`, 11, weight), weight);
    d.text(f.x1 + 6, ly[i]!, `${name} ${val}`, { tone: i === hero ? "ink" : "ink-2", weight });
  });
  annotate(c, f, series[hero], colors[hero]!);
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
  const bw = Math.max(2, Math.min(step * 0.72, step - 2, 56));
  const zeroY = ax.sy(0);
  const cx = (i: number) => x0 + step * (i + 0.5);
  if (ticks.min < 0) d.line(x0, zeroY, x1, zeroY, COL.referenceLight, 1);
  if (c.p.reference) {
    const y = ax.sy(c.p.reference.value);
    d.line(x0, y, x1, y, COL.reference, 1, "4 3");
    d.text(x1, y - 5, c.p.reference.label, { anchor: "end", tone: "ink-2" });
  }
  const labelled = new Set([xs[xs.length - 1], c.p.annotate?.x, c.p.highlight].filter(Boolean) as string[]);
  xs.forEach((x, i) => {
    const v = vals[i];
    if (v === null || v === undefined) return;
    const y = ax.sy(v);
    const neg = v < 0;
    d.bar(cx(i) - bw / 2, Math.min(y, zeroY), bw, Math.abs(zeroY - y), neg ? COL.negative : COL.positive, neg ? "bottom" : "top");
    if (labelled.has(x)) {
      const ty = neg ? y + 14 : y - 5;
      d.text(cx(i), ty, fmtNum(v, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
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
      title: tipTitle(c, x),
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
  const cols = Math.min(n, c.phone ? 2 : Math.max(2, Math.min(4, Math.floor(c.W / 200))));
  const rows = Math.ceil(n / cols);
  const gap = c.phone ? 10 : 14;
  const pw = (c.W - gap * (cols - 1)) / cols;
  const titleH = 18;
  const plotH = c.phone ? 76 : 92;
  const footH = 20;
  const ph = titleH + plotH + footH;
  const height = rows * ph + (rows - 1) * 10;
  const xs = xKeys(c.p, series);
  const [lo0, hi0] = extent(series.flatMap((s) => s.points.map((pt) => pt.y)));
  const [lo, hi] = lineDomain(lo0, hi0);
  const ticks = niceTicks(lo, hi, c.phone ? 2 : 3);
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
    const ax = makeYAxis(c, ticks, top + 8, top + plotH - 8);
    const gx0 = px0 + ax.labelW + 10;
    const gx1 = px0 + pw - 8;
    drawYAxis(c, ax, gx0, gx1);
    const X = (x: string) => gx0 + (((tpos.get(x) ?? 0) - t0) / (t1 - t0 || 1)) * (gx1 - gx0);
    d.path(
      linePath(
        xs.map((x) => {
          const v = valueAt(s, x);
          return v === null ? null : { x: X(x), y: ax.sy(v) };
        }),
      ),
      COL.series(1),
      1.75,
    );
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

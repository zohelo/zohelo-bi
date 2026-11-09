// Part of a whole, distribution, relationship/space and overview: stacked-bars, segmented-bar, pyramid, histogram,
// scatter, tile-map, heatmap, sparkline-table.

import {
  decimalsOf,
  fitText,
  fmtChangeArrow,
  fmtNum,
  fmtTick,
  fmtVal,
  monthName,
  parsePeriod,
  periodLabel,
  textWidth,
  withUnit,
} from "./format";
import { classOf, extent, linear, niceStep, niceTicks, quantileBreaks, spread } from "./scale";
import {
  COL,
  catLabel,
  divergingColors,
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
import { VOIVODESHIP_TILES, tileValues } from "./tiles";
import type { ZChartProps, ZSeries, ZUnit } from "./types";

// ---------- 100% stacked bars

export function drawStacked(c: Ctx): Scene {
  const series = c.p.series.slice(0, 5);
  const { d } = c;
  const keys = xKeys(c.p, series);
  const colors = series.map((s, i) => seriesColor(s.role, i));
  const labels = keys.map((k) => catLabel(c.p, k, c.phone));
  const labelW = Math.max(...labels.map((l) => textWidth(l, 11, 600)));
  const above = labelW > c.W * 0.28;
  const x0 = above ? 0 : Math.ceil(labelW) + 10;
  const W = c.W - x0 - 2;
  const barH = 28;
  const pitch = above ? 74 : 58;
  const top = above ? 18 : 6;
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = top + i * pitch;
    if (above) d.text(0, y - 6, fitText(labels[i]!, 11, c.W, 600), { tone: "ink", weight: 600 });
    else d.text(x0 - 8, y + barH / 2 + 4, labels[i]!, { anchor: "end", tone: "ink", weight: 600 });
    const tot = series.reduce((a, s) => a + Math.max(0, valueAt(s, k) ?? 0), 0) || 1;
    let cx = x0;
    let lastLabelEnd = -Infinity;
    const rows = series.map((s, j) => {
      const v = (Math.max(0, valueAt(s, k) ?? 0) / tot) * 100;
      const w = (v / 100) * W;
      if (w > 0) d.rect(cx, y, Math.max(0, w - 2), barH, colors[j]!, { rx: 2 });
      const l = `${fmtNum(v, c.lang, 0)}%`;
      const lw = textWidth(l, 11, 600);
      if (w > 0 && cx + 1 > lastLabelEnd + 4 && cx + 1 + lw <= c.W) {
        d.text(cx + 1, y + barH + 14, l, { tone: "ink", weight: 600 });
        lastLabelEnd = cx + 1 + lw;
      }
      cx += w;
      return { label: s.label, value: `${fmtNum(v, c.lang, c.unit.decimals || 0)}%`, color: colors[j] };
    });
    stops.push({ x: x0 + W / 2, y, title: catLabel(c.p, k), rows, band: [0, y - (above ? 18 : 8), c.W, pitch - 4] });
  });
  return { height: top + keys.length * pitch - (pitch - barH - 20), els: d.els, stops, pick: "y" };
}

// ---------- segmented bar (one whole)

export function partColor(key: string, i: number): string {
  return key === "other" || i >= 5 ? COL.context : COL.series(i + 1);
}

export function drawSegmented(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = xKeys(c.p, s ? [s] : []);
  const vals = keys.map((k) => Math.max(0, valueAt(s, k) ?? 0));
  const tot = vals.reduce((a, b) => a + b, 0) || 1;
  const H = Math.max(c.H, keys.length * 18 + 16);
  const top = 6;
  const barH = H - 12;
  const bx = c.phone ? 8 : 40;
  const bw = c.phone ? 52 : 70;
  const lx = bx + bw + 14;
  const stops: Stop[] = [];
  let y = top;
  const mids: number[] = [];
  const segs = keys.map((k, i) => {
    const h = (vals[i]! / tot) * barH;
    const seg = { k, i, y, h };
    mids.push(y + h / 2);
    y += h;
    return seg;
  });
  const ly = spread(mids, 16, top + 6, top + barH - 6);
  const pctW = Math.max(...vals.map((v) => textWidth(`${fmtNum((v / tot) * 100, c.lang, 0)}%`, 11, 600)));
  segs.forEach((g, n) => {
    const color = partColor(g.k, g.i);
    if (g.h > 0) d.rect(bx, g.y, bw, Math.max(0, g.h - 2), color, { rx: 2 });
    d.line(bx + bw + 2, g.y + g.h / 2, lx - 4, ly[n]!, COL.referenceLight, 1);
    const pct = `${fmtNum((vals[g.i]! / tot) * 100, c.lang, 0)}%`;
    d.text(lx, ly[n]! + 4, fitText(catLabel(c.p, g.k, c.phone), 11, c.W - lx - pctW - 12), { tone: "ink" });
    d.text(c.W - 2, ly[n]! + 4, pct, { anchor: "end", tone: "ink", weight: 600 });
    stops.push({
      x: bx + bw,
      y: g.y + g.h / 2,
      title: catLabel(c.p, g.k),
      rows: [{ label: s?.label ?? "", value: `${fmtVal(vals[g.i]!, c.unit, c.lang)}${c.unit.symbol === "%" ? "" : ` (${pct})`}`, color }],
      band: [0, ly[n]! - 9, c.W, 18],
    });
  });
  return { height: H, els: d.els, stops, pick: "y" };
}

// ---------- pyramid

/**
 * Pyramid parts: the base pair (left, right), the optional overlay pair (ids starting with `opts.overlay`) and the
 * value per band, as a share of the pair's total population with `opts.percent`.
 */
export function pyramidParts(p: ZChartProps) {
  const pre = p.opts?.overlay;
  const isOver = (s: ZSeries) => !!pre && s.id.startsWith(pre);
  const base = p.series.filter((s) => !isOver(s)).slice(0, 2);
  const over = p.series.filter(isOver).slice(0, 2);
  const pct = !!p.opts?.percent;
  const keys = xKeys(p, [...base, ...over]);
  const total = (pair: ZSeries[]) => pair.reduce((a, s) => a + keys.reduce((b, k) => b + Math.max(0, valueAt(s, k) ?? 0), 0), 0) || 1;
  const tb = total(base);
  const to = total(over);
  const val = (s: ZSeries | undefined, k: string): number | null => {
    const v = valueAt(s, k);
    if (v === null || !s || !pct) return v;
    return (v / (over.includes(s) ? to : tb)) * 100;
  };
  const unit: ZUnit = pct ? { symbol: "%", isRate: true, decimals: 1 } : p.unit;
  return { L: base[0], R: base[1], OL: over[0], OR: over[1], over, keys, val, pct, unit };
}

export function drawPyramid(c: Ctx): Scene {
  const { L, R, OL, OR, over, keys, val, unit } = pyramidParts(c.p);
  const { d } = c;
  const n = Math.max(1, keys.length);
  const labels = keys.map((k) => catLabel(c.p, k, true));
  const midW = Math.max(30, ...labels.map((l) => textWidth(l, 11))) + 12;
  const mid = c.W / 2;
  const top = 4;
  const bottom = c.H - 24;
  const pitch = (bottom - top) / n;
  const barH = Math.max(2, pitch - 1.5);
  const [, hi] = extent(keys.flatMap((k) => [val(L, k), val(R, k), val(OL, k), val(OR, k)]));
  const ticks = niceTicks(0, hi, 2);
  const half = mid - midW / 2 - 4;
  const sw = linear(0, ticks.max, 0, half);
  const every = Math.ceil(13 / pitch);
  const cl = seriesColor(L?.role, 0);
  const cr = seriesColor(R?.role, 1);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = bottom - (i + 1) * pitch;
    const vl = val(L, k);
    const vr = val(R, k);
    if (vl !== null) d.bar(mid - midW / 2 - sw(vl), y, sw(vl), barH, cl, "left", 1);
    if (vr !== null) d.bar(mid + midW / 2, y, sw(vr), barH, cr, "right", 1);
    if (i % every === 0 || i === n - 1) d.text(mid, y + barH / 2 + 4, labels[i]!, { anchor: "middle" });
    const ol = val(OL, k);
    const or = val(OR, k);
    stops.push({
      x: mid + midW / 2 + Math.max(vr === null ? 0 : sw(vr), or === null ? 0 : sw(or)),
      y: y + barH / 2,
      title: catLabel(c.p, k),
      rows: [
        { label: L?.label ?? "", value: fmtVal(vl, unit, c.lang), color: cl },
        { label: R?.label ?? "", value: fmtVal(vr, unit, c.lang), color: cr },
        ...(OL ? [{ label: OL.label, value: fmtVal(ol, unit, c.lang), color: COL.ink }] : []),
        ...(OR ? [{ label: OR.label, value: fmtVal(or, unit, c.lang), color: COL.ink }] : []),
      ],
      band: [0, y - 0.75, c.W, pitch],
    });
  });
  // overlay: the second pair as an outline of steps over the bars (one step per age band)
  over.forEach((s, side) => {
    let path = "";
    let pen = false;
    keys.forEach((k, i) => {
      const v = val(s, k);
      if (v === null) {
        pen = false;
        return;
      }
      const x = side === 0 ? mid - midW / 2 - sw(v) : mid + midW / 2 + sw(v);
      const yb = bottom - i * pitch;
      const yt = bottom - (i + 1) * pitch;
      path += pen ? `H${x.toFixed(1)}V${yt.toFixed(1)}` : `M${x.toFixed(1)} ${yb.toFixed(1)}V${yt.toFixed(1)}`;
      pen = true;
    });
    if (path) d.path(path, COL.ink, 1.5, { cap: "butt" });
  });
  const ay = c.H - 8;
  const maxL = withUnit(fmtTick(ticks.max, { ...unit, symbol: "" }, c.lang, ticks.step), unit.symbol === "%" ? "%" : "");
  d.text(mid - midW / 2 - half, ay, maxL, {});
  d.text(mid + midW / 2 + half, ay, maxL, { anchor: "end" });
  d.text(mid - midW / 2 - 2, ay, "0", { anchor: "end" });
  d.text(mid + midW / 2 + 2, ay, "0", {});
  if (!c.phone) {
    d.text(mid - midW / 2 - half / 2, ay, L?.label ?? "", { anchor: "middle", tone: "ink-2", weight: 600 });
    d.text(mid + midW / 2 + half / 2, ay, R?.label ?? "", { anchor: "middle", tone: "ink-2", weight: 600 });
  }
  return { height: c.H, els: d.els, stops, pick: "y" };
}

// ---------- histogram

export function binEdges(key: string): [number, number] | null {
  const m = /^(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)$/.exec(key);
  return m ? [Number(m[1]!.replace(",", ".")), Number(m[2]!.replace(",", "."))] : null;
}

export function drawHistogram(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = xKeys(c.p, s ? [s] : []);
  const vals = keys.map((k) => valueAt(s, k) ?? 0);
  const ticks = niceTicks(0, Math.max(...vals, 1), c.phone ? 3 : 3);
  const y0 = 22;
  const y1 = c.H - 26;
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 10;
  drawYAxis(c, ax, x0, x1);
  const n = Math.max(1, keys.length);
  const bw = (x1 - x0) / n;
  const edges = keys.map(binEdges);
  const numeric = edges.every(Boolean);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const v = vals[i]!;
    d.bar(x0 + i * bw + 1, ax.sy(v), bw - 2, ax.sy(0) - ax.sy(v), COL.series(1), "top", 1);
    stops.push({
      x: x0 + (i + 0.5) * bw,
      y: ax.sy(v),
      title: catLabel(c.p, k),
      rows: [{ label: s?.label ?? "", value: fmtVal(valueAt(s, k), c.unit, c.lang), color: COL.series(1) }],
      band: [x0 + i * bw, y0 - 14, bw, y1 - y0 + 14],
    });
  });
  if (numeric) {
    const all = [edges[0]![0], ...edges.map((e) => e![1])];
    const lw = Math.max(...all.map((e) => textWidth(fmtNum(e, c.lang, decimalsOf(e)), 11)));
    const every = Math.ceil((lw + 8) / bw);
    all.forEach((e, i) => {
      const last = i === all.length - 1;
      if (last || (i % every === 0 && all.length - 1 - i >= every))
        d.text(x0 + i * bw, c.H - 8, fmtNum(e, c.lang, decimalsOf(e)), { anchor: i === all.length - 1 ? "end" : "middle" });
    });
    const ref = c.p.reference;
    if (ref) {
      const lo = all[0]!;
      const hi = all[all.length - 1]!;
      const x = x0 + ((ref.value - lo) / (hi - lo || 1)) * (x1 - x0);
      d.line(x, y0 - 10, x, y1, COL.ink, 1.5, "4 3");
      const right = x + 6 + textWidth(ref.label, 11, 600) < c.W;
      d.text(right ? x + 6 : x - 6, y0 - 6, ref.label, { anchor: right ? "start" : "end", tone: "ink", weight: 600 });
    }
  } else {
    const every = Math.ceil((Math.max(...keys.map((k) => textWidth(catLabel(c.p, k, true), 11))) + 6) / bw);
    keys.forEach((k, i) => {
      if (i % every === 0) d.text(x0 + (i + 0.5) * bw, c.H - 8, catLabel(c.p, k, true), { anchor: "middle" });
    });
  }
  return { height: c.H, els: d.els, stops, pick: "x" };
}

// ---------- scatter

/** One dot: x and y values; `s` = the size value of a bubble chart (series id "size"), null when missing. */
export type ScatterPoint = { key: string; x: number; y: number; s?: number | null };

export function scatterPoints(p: ZChartProps): {
  xs: ZSeries | undefined;
  ys: ZSeries | undefined;
  ss: ZSeries | undefined;
  pts: ScatterPoint[];
} {
  const xs = p.series.find((s) => s.id === "x") ?? p.series[0];
  const ys = p.series.find((s) => s.id === "y") ?? p.series[1];
  const ss = p.series.find((s) => s.id === "size");
  const pts: ScatterPoint[] = [];
  for (const pt of xs?.points ?? []) {
    const y = valueAt(ys, pt.x);
    if (pt.y !== null && y !== null) pts.push({ key: pt.x, x: pt.y, y, ...(ss ? { s: valueAt(ss, pt.x) } : {}) });
  }
  return { xs, ys, ss, pts };
}

/** Radius of each dot: 5 px, or for a bubble chart an area proportional to |size| (3 px when the size is missing). */
export function bubbleRadius(pts: ScatterPoint[], ss: ZSeries | undefined, phone: boolean): (p: ScatterPoint) => number {
  if (!ss) return () => 5;
  const max = Math.max(0, ...pts.map((p) => Math.abs(p.s ?? 0)));
  const rMax = phone ? 16 : 24;
  return (p) => (p.s === null || p.s === undefined || !max ? 3 : Math.max(3, rMax * Math.sqrt(Math.abs(p.s) / max)));
}

export function drawScatter(c: Ctx): Scene {
  const { d } = c;
  const { xs, ys, ss, pts } = scatterPoints(c.p);
  const ux: ZUnit = xs?.unit ?? c.unit;
  const uy: ZUnit = ys?.unit ?? c.unit;
  const us: ZUnit = ss?.unit ?? c.unit;
  const rad = bubbleRadius(pts, ss, c.phone);
  const [xlo, xhi] = extent(pts.map((p) => p.x));
  const [ylo, yhi] = extent(pts.map((p) => p.y));
  const tx = niceTicks(xlo, xhi, c.phone ? 3 : 4);
  const ty = niceTicks(ylo, yhi, c.phone ? 3 : 4);
  const y0 = 22;
  const y1 = c.H - 40;
  const ax = makeYAxis({ ...c, unit: uy }, ty, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 10;
  drawYAxis({ ...c, unit: uy }, ax, x0, x1);
  const sx = linear(tx.min, tx.max, x0, x1);
  tx.values.forEach((t, i) => {
    const l = fmtTick(t, ux, c.lang, tx.step);
    const edge = i === tx.values.length - 1 ? "end" : "middle";
    d.text(i === tx.values.length - 1 ? Math.min(sx(t) + textWidth(l, 11) / 2, c.W) : sx(t), y1 + 16, l, { anchor: edge });
  });
  d.text(0, 11, fitText(ys?.label ?? "", 11, c.W * 0.9), { tone: "ink-2", weight: 500 });
  d.text(x1, c.H - 6, fitText(xs?.label ?? "", 11, c.W * 0.9), { anchor: "end", tone: "ink-2", weight: 500 });
  const o = c.p.opts ?? {};
  // quadrants: dashed lines at the mean of x and of y, each quadrant named in small ink-3 text
  if (o.quadrants && pts.length) {
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    d.line(sx(mx), y0, sx(mx), y1, COL.reference, 1, "4 3");
    d.line(x0, ax.sy(my), x1, ax.sy(my), COL.reference, 1, "4 3");
    const q = quadrantNames(c.lang);
    d.text(x1 - 4, y0 + 12, q.hh, { anchor: "end", tone: "ink-3" });
    d.text(x0 + 4, y0 + 12, q.lh, { tone: "ink-3" });
    d.text(x0 + 4, y1 - 6, q.ll, { tone: "ink-3" });
    d.text(x1 - 4, y1 - 6, q.hl, { anchor: "end", tone: "ink-3" });
  }
  // least-squares trend: faint by default, emphasised with opts.trend (r² in the legend), none with trend: false
  const fit = linFit(pts);
  const slope = fit?.slope ?? 0;
  const icpt = fit?.icpt ?? 0;
  if (fit && o.trend !== false && !o.connect) {
    const clampY = (x: number) => Math.min(ty.max, Math.max(ty.min, slope * x + icpt));
    if (o.trend) d.line(sx(xlo), ax.sy(clampY(xlo)), sx(xhi), ax.sy(clampY(xhi)), COL.reference, 1.5);
    else d.line(sx(xlo), ax.sy(clampY(xlo)), sx(xhi), ax.sy(clampY(xhi)), COL.referenceLight, 1, "4 4");
  }
  const hl = c.p.highlight;
  // connected scatter: the points in category (time) order
  const order = xKeys(c.p, xs ? [xs] : []);
  const ordered = order.map((k) => pts.find((p) => p.key === k)).filter((p): p is ScatterPoint => !!p);
  if (o.connect && ordered.length > 1) d.path(linePath(ordered.map((p) => ({ x: sx(p.x), y: ax.sy(p.y) }))), COL.series(1), 1.5);
  const resid = pts.map((p) => ({ p, r: Math.abs(p.y - (slope * p.x + icpt)) })).sort((a, b) => b.r - a.r);
  const labelled = new Set<string>(
    o.connect
      ? [...(hl ? [hl] : []), ordered[0]?.key ?? "", ordered[ordered.length - 1]?.key ?? ""].filter(Boolean)
      : o.labels === "all"
        ? pts.map((p) => p.key)
        : o.labels === "highlight"
          ? hl
            ? [hl]
            : []
          : [...(hl ? [hl] : []), ...resid.slice(0, c.phone ? 2 : 3).map((r) => r.p.key)],
  );
  const lastKey = o.connect ? ordered[ordered.length - 1]?.key : undefined;
  if (o.connect && !ss) {
    for (const p of ordered) if (p.key !== hl && p.key !== lastKey) d.circle(sx(p.x), ax.sy(p.y), 3.5, COL.series(1));
    const lp = ordered[ordered.length - 1];
    if (lp && lp.key !== hl) d.circle(sx(lp.x), ax.sy(lp.y), 6, COL.series(1));
  } else if (ss) {
    // Bubbles: the largest first so small ones stay visible; translucent so overlaps show.
    const order = pts.filter((p) => p.key !== hl).sort((a, b) => rad(b) - rad(a));
    for (const p of order)
      d.add((key) => (
        <circle
          key={key}
          cx={sx(p.x)}
          cy={ax.sy(p.y)}
          r={rad(p)}
          fill={COL.series(1)}
          fillOpacity={0.45}
          stroke={COL.series(1)}
          strokeWidth={1}
        />
      ));
  } else for (const p of pts) if (p.key !== hl) d.circle(sx(p.x), ax.sy(p.y), 5, COL.series(1));
  const hp = pts.find((p) => p.key === hl);
  if (hp) d.circle(sx(hp.x), ax.sy(hp.y), ss ? rad(hp) : 6.5, COL.series(1));
  const placed = placeLabels(
    c,
    pts.filter((p) => labelled.has(p.key)),
    (p) => ({ X: sx(p.x), Y: ax.sy(p.y), r: o.connect && !ss ? (p.key === lastKey ? 6 : 3.5) : rad(p) }),
    o.labels === "all" && !o.connect,
    [x0, y0 - 12, c.W, y1 + 4],
  );
  // labels "all": when the dots are too crowded to label most of them, fall back to the highlighted one
  const crowded = o.labels === "all" && !o.connect && placed.length < Math.ceil(labelled.size * 0.7);
  for (const lb of crowded ? placed.filter((l) => l.key === hl) : placed)
    d.text(lb.x, lb.y, lb.text, { anchor: lb.anchor, tone: "ink", weight: lb.key === hl ? 600 : 400 });
  const sorted = o.connect ? ordered : pts.slice().sort((a, b) => a.x - b.x);
  const stops: Stop[] = sorted.map((p) => ({
    x: sx(p.x),
    y: ax.sy(p.y),
    title: catLabel(c.p, p.key),
    rows: [
      { label: xs?.label ?? "x", value: fmtVal(p.x, ux, c.lang) },
      { label: ys?.label ?? "y", value: fmtVal(p.y, uy, c.lang) },
      ...(ss ? [{ label: ss.label, value: p.s === null || p.s === undefined ? "–" : fmtVal(p.s, us, c.lang) }] : []),
    ],
    dots: [{ x: sx(p.x), y: ax.sy(p.y), color: COL.series(1) }],
  }));
  return { height: c.H, els: d.els, stops, pick: "xy" };
}

/** Least-squares line through the dots with its r² (null below 3 dots). */
export function linFit(pts: { x: number; y: number }[]): { slope: number; icpt: number; r2: number } | null {
  if (pts.length < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const syy = pts.reduce((a, p) => a + (p.y - my) ** 2, 0);
  const sxy = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const slope = sxx ? sxy / sxx : 0;
  return { slope, icpt: my - slope * mx, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0 };
}

/** Names of the scatter quadrants (relative to the mean of x and of y). */
export function quadrantNames(lang: "pl" | "en") {
  return lang === "pl"
    ? { hh: "wyższe x i y", lh: "niższe x, wyższe y", ll: "niższe x i y", hl: "wyższe x, niższe y" }
    : { hh: "higher x and y", lh: "lower x, higher y", ll: "lower x and y", hl: "higher x, lower y" };
}

/** Quadrant of a dot against the means (table column of scatter `opts.quadrants`). */
export function quadrantOf(p: { x: number; y: number }, mx: number, my: number, lang: "pl" | "en"): string {
  const q = quadrantNames(lang);
  return p.x >= mx ? (p.y >= my ? q.hh : q.hl) : p.y >= my ? q.lh : q.ll;
}

type PlacedLabel = { key: string; text: string; x: number; y: number; anchor: "start" | "end" | "middle" };

/**
 * Dot labels without overlaps: right of the dot, else left; with `tryAll` also above and below. A label that fits
 * nowhere (other labels, the plot box) is dropped; the highlighted one is placed first.
 */
function placeLabels(
  c: Ctx,
  pts: ScatterPoint[],
  at: (p: ScatterPoint) => { X: number; Y: number; r: number },
  tryAll: boolean,
  box: [number, number, number, number],
): PlacedLabel[] {
  const hl = c.p.highlight;
  const out: PlacedLabel[] = [];
  const boxes: [number, number, number, number][] = [];
  const order = pts.slice().sort((a, b) => (b.key === hl ? 1 : 0) - (a.key === hl ? 1 : 0));
  for (const p of order) {
    const text = catLabel(c.p, p.key, c.phone);
    const w = textWidth(text, 11, p.key === hl ? 600 : 400);
    const { X, Y, r } = at(p);
    const gap = r + 4;
    const cands: { bx: number; by: number; x: number; y: number; anchor: PlacedLabel["anchor"] }[] = [
      { bx: X + gap, by: Y - 8, x: X + gap, y: Y + 4, anchor: "start" },
      { bx: X - gap - w, by: Y - 8, x: X - gap, y: Y + 4, anchor: "end" },
      ...(tryAll
        ? [
            { bx: X - w / 2, by: Y - r - 15, x: X, y: Y - r - 4, anchor: "middle" as const },
            { bx: X - w / 2, by: Y + r + 3, x: X, y: Y + r + 14, anchor: "middle" as const },
          ]
        : []),
    ];
    for (const cd of cands) {
      const b: [number, number, number, number] = [cd.bx, cd.by, w, 12];
      const inside = b[0] >= box[0] - 40 && b[0] + b[2] <= box[2] && b[1] >= box[1] && b[1] + b[3] <= box[3];
      if (!inside && tryAll) continue;
      if (!tryAll && b[0] + b[2] > c.W && cd.anchor === "start") continue;
      if (boxes.some((q) => q[0] < b[0] + b[2] && b[0] < q[0] + q[2] && q[1] < b[1] + b[3] && b[1] < q[1] + q[3])) continue;
      boxes.push(b);
      out.push({ key: p.key, text, x: cd.x, y: cd.y, anchor: cd.anchor });
      break;
    }
  }
  return out;
}

// ---------- binned ramps (tile map, heatmap)

export function breaksFor(p: ZChartProps, values: number[], classes: number): number[] {
  if (p.breaks && p.breaks.length === classes - 1) return p.breaks;
  return quantileBreaks(values, classes);
}

export function classLabels(breaks: number[], unit: ZUnit, lang: "pl" | "en"): string[] {
  const f = (v: number) => fmtNum(v, lang, decimalsOf(v));
  const u = (s: string) => withUnit(s, unit.symbol === "%" ? "%" : "");
  const out = [`< ${u(f(breaks[0]!))}`];
  for (let i = 1; i < breaks.length; i++) out.push(u(`${f(breaks[i - 1]!)}–${f(breaks[i]!)}`));
  out.push(`≥ ${u(f(breaks[breaks.length - 1]!))}`);
  return out;
}

/** Symmetric thresholds around `reference` (or the rounded mean) for a diverging ramp of 4 or 5 classes. */
export function divergingBreaks(p: ZChartProps, values: number[], classes: number): number[] {
  if (p.breaks && p.breaks.length === classes - 1) return p.breaks;
  const v = values.filter((x) => Number.isFinite(x));
  const mean = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  const spreadAll = v.length ? Math.max(...v) - Math.min(...v) : 1;
  const step = niceStep(spreadAll || 1, 10) / 2 || 1;
  const centre = p.reference?.value ?? Number((Math.round(mean / step) * step).toFixed(6));
  const m = Math.max(step, ...v.map((x) => Math.abs(x - centre)));
  const offs = classes === 5 ? [0.2, 0.6] : [0.5];
  const out: number[] = [];
  let last = 0;
  for (const k of offs) {
    let o = Math.max(step, Math.round((k * m) / step) * step);
    if (o <= last) o = last + step;
    last = o;
    out.push(o);
  }
  const at = (o: number) => Number((centre + o).toFixed(6));
  return classes === 5 ? [at(-out[1]!), at(-out[0]!), at(out[0]!), at(out[1]!)] : [at(-out[0]!), centre, at(out[0]!)];
}

/** A value ramp (sequential, or diverging by `opts.ramp`): colours, class labels, class of a value, dark classes. */
export type ValueRamp = { colors: string[]; labels: string[]; cls: (v: number) => number; dark: (k: number) => boolean; breaks: number[] };

export function valueRamp(p: ZChartProps, values: number[], classes: number): ValueRamp {
  if (p.opts?.ramp === "diverging") {
    const breaks = divergingBreaks(p, values, classes);
    return {
      colors: divergingColors(classes),
      labels: classLabels(breaks, p.unit, p.lang),
      cls: (v) => classOf(v, breaks),
      dark: (k) => k === 0 || k === classes - 1,
      breaks,
    };
  }
  const breaks = breaksFor(p, values, classes);
  return {
    colors: rampColors(classes),
    labels: classLabels(breaks, p.unit, p.lang),
    cls: (v) => classOf(v, breaks),
    dark: (k) => k >= Math.floor(classes / 2),
    breaks,
  };
}

/**
 * Classes of a voivodeship map: the value ramp, or with `opts.ramp: "categorical"` one series colour per class.
 * The class of a region is its ZCategory.group, else its value as a class key; a category keyed by the class key
 * gives the class label.
 */
export type MapClasses = {
  colors: string[];
  labels: string[];
  /** Class index of a region; -1 = no data. */
  of: (geo: string, v: number | null) => number;
  dark: (k: number) => boolean;
  categorical: boolean;
};

export function mapClasses(p: ZChartProps, values: Map<string, number | null>): MapClasses {
  if (p.opts?.ramp === "categorical") {
    const keyOf = (geo: string, v: number | null): string | null =>
      p.categories?.find((k) => k.key === geo)?.group ?? (v === null ? null : String(v));
    const keys: string[] = [];
    for (const t of VOIVODESHIP_TILES) {
      const k = keyOf(t.key, values.get(t.key) ?? null);
      if (k !== null && !keys.includes(k)) keys.push(k);
    }
    keys.sort((a, b) => a.localeCompare(b, p.lang, { numeric: true }));
    return {
      colors: keys.map((_, i) => (i < 5 ? COL.series(i + 1) : COL.context)),
      labels: keys.map((k) => p.categories?.find((q) => q.key === k)?.label ?? k),
      of: (geo, v) => {
        const k = keyOf(geo, v);
        return k === null ? -1 : keys.indexOf(k);
      },
      dark: () => false,
      categorical: true,
    };
  }
  const nums = [...values.values()].filter((v): v is number => v !== null);
  const r = valueRamp(p, nums, 4);
  return { colors: r.colors, labels: r.labels, of: (_g, v) => (v === null ? -1 : r.cls(v)), dark: r.dark, categorical: false };
}

/** tile-map `opts.mini`: the history series of a region (series id = geography key). */
export function miniSeries(p: ZChartProps, geo: string): ZSeries | undefined {
  return p.opts?.mini ? p.series.find((s, i) => i > 0 && s.id === geo) : undefined;
}

export function drawTileMap(c: Ctx): Scene {
  const { d } = c;
  const s = c.p.series[0];
  const values = tileValues(s);
  const mc = mapClasses(c.p, values);
  const mini = !!c.p.opts?.mini && c.p.series.length > 1;
  const gap = 4;
  const tw = Math.max(44, Math.min(mini ? 96 : 76, (c.W - 3 * gap) / 4));
  const th = Math.max(mini ? 50 : 38, Math.round(tw * (mini ? 0.78 : 0.72)));
  const ox = (c.W - (4 * tw + 3 * gap)) / 2;
  const hl = c.p.highlight;
  const stops: Stop[] = [];
  // mini charts share one scale (the history of every region)
  const hist = mini ? VOIVODESHIP_TILES.map((t) => miniSeries(c.p, t.key)).filter((h): h is ZSeries => !!h) : [];
  const hxs = xKeys(c.p, hist);
  const [hlo, hhi] = extent(hist.flatMap((h) => h.points.map((q) => q.y)));
  for (const t of VOIVODESHIP_TILES) {
    const x = ox + t.col * (tw + gap);
    const y = 2 + t.row * (th + gap);
    const v = values.get(t.key) ?? null;
    const k = mc.of(t.key, v);
    const h = miniSeries(c.p, t.key);
    const name = c.lang === "pl" ? t.name_pl : t.name_en;
    const rows: Stop["rows"] = [
      {
        label: s?.label ?? "",
        value: `${fmtVal(v, c.unit, c.lang)}${k >= 0 && !mini ? ` (${mc.labels[k]})` : ""}`,
        color: mini ? COL.series(1) : k >= 0 ? mc.colors[k] : undefined,
      },
    ];
    if (mini) {
      d.rect(x, y, tw, th, COL.sunken, { rx: 4, stroke: COL.line, sw: 1 });
      if (hl && t.key === hl) d.rect(x + 1, y + 1, tw - 2, th - 2, "none", { rx: 3, stroke: COL.ink, sw: 2 });
      d.text(x + 5, y + 14, t.abbr, { tone: "ink", weight: 600 });
      d.text(x + tw - 5, y + 14, fmtNum(v, c.lang, c.unit.decimals), { anchor: "end", tone: "ink-2" });
      if (h) {
        const sx0 = x + 6;
        const sx1 = x + tw - 6;
        const sy0 = y + 21;
        const sy1 = y + th - 6;
        const px = (i: number) => sx0 + (i / Math.max(1, hxs.length - 1)) * (sx1 - sx0);
        const py = (val: number) => sy1 - ((val - hlo) / (hhi - hlo || 1)) * (sy1 - sy0);
        const pts = hxs.map((hx, i) => {
          const val = valueAt(h, hx);
          return val === null ? null : { x: px(i), y: py(val) };
        });
        d.path(linePath(pts), COL.series(1), 1.5);
        const last = [...pts].reverse().find(Boolean);
        if (last) d.circle(last.x, last.y, 2, COL.series(1), false);
        const first = h.points.find((q) => q.y !== null);
        if (first) rows.push({ label: periodLabel(first.x, c.lang, "long"), value: fmtVal(first.y, c.unit, c.lang) });
      }
    } else {
      if (k < 0) d.rect(x, y, tw, th, COL.muted, { rx: 4, stroke: COL.lineStrong, sw: 1, dash: "3 2" });
      else d.rect(x, y, tw, th, mc.colors[k]!, { rx: 4 });
      if (hl && t.key === hl) d.rect(x + 1, y + 1, tw - 2, th - 2, "none", { rx: 3, stroke: COL.ink, sw: 2 });
      const tone = k >= 0 && mc.dark(k) ? "inverse" : "ink";
      d.text(x + tw / 2, y + th / 2 - 2, t.abbr, { anchor: "middle", tone, weight: 600 });
      const second = mc.categorical && k >= 0 ? fitText(mc.labels[k]!, 11, tw - 6) : fmtNum(v, c.lang, c.unit.decimals);
      d.text(x + tw / 2, y + th / 2 + 12, second, { anchor: "middle", tone });
    }
    stops.push({
      x: x + tw,
      y: y + th / 2,
      title: c.p.categories?.find((k2) => k2.key === t.key)?.label ?? name,
      rows,
      outline: [x - 1, y - 1, tw + 2, th + 2],
    });
  }
  return { height: 2 + 5 * (th + gap), els: d.els, stops, pick: "xy", nav: { kind: "spatial" } };
}

export type HeatGrid = {
  rows: string[];
  cols: string[];
  value: (r: number, c: number) => number | null;
  rowLabel: string[];
  colLabel: string[];
};

export function heatGrid(p: ZChartProps, phone = false): HeatGrid {
  const lang = p.lang;
  const s0 = p.series[0];
  const monthly = p.series.length === 1 && !!s0 && s0.points.length > 0 && s0.points.every((pt) => parsePeriod(pt.x).kind === "M");
  if (monthly && s0) {
    const years = [...new Set(s0.points.map((pt) => parsePeriod(pt.x).year))].sort();
    const m = new Map(s0.points.map((pt) => [pt.x, pt.y]));
    return {
      rows: years.map(String),
      cols: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")),
      value: (r, c2) => m.get(`${years[r]}-${String(c2 + 1).padStart(2, "0")}`) ?? null,
      rowLabel: years.map(String),
      colLabel: Array.from({ length: 12 }, (_, i) => monthName(i + 1, lang, phone ? "roman" : "short")),
    };
  }
  const cols = xKeys(p);
  return {
    rows: p.series.map((s) => s.id),
    cols,
    value: (r, c2) => valueAt(p.series[r], cols[c2]!),
    rowLabel: p.series.map((s) => s.label),
    colLabel: cols.map((k) => catLabel(p, k, true)),
  };
}

export function drawHeatmap(c: Ctx): Scene {
  const { d } = c;
  const g = heatGrid(c.p, c.phone);
  const nums: number[] = [];
  g.rows.forEach((_, r) =>
    g.cols.forEach((__, k) => {
      const v = g.value(r, k);
      if (v !== null) nums.push(v);
    }),
  );
  const vr = valueRamp(c.p, nums, 5);
  const ramp = vr.colors;
  const cls = vr.labels;
  const rowW = Math.min(c.W * 0.3, Math.max(...g.rowLabel.map((l) => textWidth(l, 11))));
  const x0 = Math.ceil(rowW) + 8;
  const cw = (c.W - x0) / Math.max(1, g.cols.length);
  const ch = c.phone ? 20 : 22;
  const top = 2;
  const stops: Stop[] = [];
  const monthly = g.cols.length === 12 && g.cols[0] === "01";
  g.rows.forEach((row, r) => {
    const y = top + r * ch;
    d.text(x0 - 6, y + ch / 2 + 3, fitText(g.rowLabel[r]!, 11, rowW), { anchor: "end", tone: "ink-2" });
    g.cols.forEach((col, k) => {
      const v = g.value(r, k);
      const x = x0 + k * cw;
      if (v !== null) d.rect(x + 1, y + 1, cw - 2, ch - 2, ramp[vr.cls(v)]!, { rx: 2 });
      const period = monthly ? `${row}-${col}` : null;
      stops.push({
        x: x + cw,
        y: y + ch / 2,
        title: period ? periodLabel(period, c.lang, "long") : `${g.rowLabel[r]} · ${catLabel(c.p, col)}`,
        rows: [
          {
            label: c.p.series.length === 1 ? (c.p.series[0]?.label ?? "") : g.rowLabel[r]!,
            value: v === null ? "–" : `${fmtVal(v, c.unit, c.lang)} (${cls[vr.cls(v)]})`,
            color: v === null ? undefined : ramp[vr.cls(v)],
          },
        ],
        outline: [x, y, cw, ch],
      });
    });
  });
  const ay = top + g.rows.length * ch + 14;
  const lw = Math.max(...g.colLabel.map((l) => textWidth(l, 11)));
  const every = Math.ceil((lw + 4) / cw);
  g.colLabel.forEach((l, k) => {
    if (k % every === 0) d.text(x0 + (k + 0.5) * cw, ay, l, { anchor: "middle" });
  });
  return { height: ay + 6, els: d.els, stops, pick: "xy", nav: { kind: "grid", cols: g.cols.length } };
}

// ---------- sparkline table

export function sparkRow(s: ZSeries, unit: ZUnit, lang: "pl" | "en") {
  const pts = s.points.filter((p) => p.y !== null);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const u = s.unit ?? unit;
  return {
    last,
    prev,
    value: fmtVal(last?.y, u, lang),
    change: last && prev ? fmtChangeArrow(last.y! - prev.y!, u, lang) : "–",
    unit: u,
  };
}

export function drawSparklineTable(c: Ctx): Scene {
  const { d } = c;
  const series = c.p.series;
  const pl = c.lang === "pl";
  const rows = series.map((s) => sparkRow(s, c.unit, c.lang));
  const valW = Math.max(textWidth(pl ? "Wartość" : "Value", 11, 500), ...rows.map((r) => textWidth(r.value, 12, 600)));
  const chgW = Math.max(textWidth(pl ? "Zmiana" : "Change", 11, 500), ...rows.map((r) => textWidth(r.change, 11)));
  const sparkW = c.phone ? 56 : Math.min(140, c.W * 0.22);
  const xChg = c.W - 2;
  const xVal = xChg - chgW - 16;
  const xSpark1 = xVal - valW - 16;
  const xSpark0 = xSpark1 - sparkW;
  const nameW = xSpark0 - 12;
  const pitch = 36;
  const top = 26;
  d.text(0, 16, pl ? "Wskaźnik" : "Indicator", { weight: 500 });
  d.text(xSpark0, 16, c.phone ? "Trend" : pl ? "Trend (skala wiersza)" : "Trend (own scale)", { weight: 500 });
  d.text(xVal, 16, pl ? "Wartość" : "Value", { anchor: "end", weight: 500 });
  d.text(xChg, 16, pl ? "Zmiana" : "Change", { anchor: "end", weight: 500 });
  const stops: Stop[] = [];
  series.forEach((s, i) => {
    const y = top + i * pitch;
    const row = rows[i]!;
    d.line(0, y, c.W, y, COL.line, 1);
    d.text(0, y + 22, fitText(s.label, 12, nameW), { tone: "ink", size: 12 });
    const ys = s.points.map((p) => p.y);
    const [lo, hi] = extent(ys);
    const n = Math.max(1, s.points.length - 1);
    const pts = s.points.map((p, k) =>
      p.y === null ? null : { x: xSpark0 + (k / n) * sparkW, y: y + 28 - ((p.y - lo) / (hi - lo || 1)) * 20 },
    );
    d.path(linePath(pts), COL.series(1), 1.5);
    const lastPt = [...pts].reverse().find(Boolean);
    if (lastPt) d.circle(lastPt.x, lastPt.y, 2.5, COL.series(1), false);
    d.text(xVal, y + 22, row.value, { anchor: "end", tone: "ink", weight: 600, size: 12 });
    d.text(xChg, y + 22, row.change, { anchor: "end", tone: "ink-2" });
    stops.push({
      x: xSpark1,
      y: y + 8,
      title: s.label,
      rows: [
        ...(row.last ? [{ label: periodLabel(row.last.x, c.lang, "long"), value: row.value, color: COL.series(1) }] : []),
        ...(row.prev ? [{ label: periodLabel(row.prev.x, c.lang, "long"), value: fmtVal(row.prev.y, row.unit, c.lang) }] : []),
      ],
      band: [0, y, c.W, pitch],
    });
  });
  const end = top + series.length * pitch;
  d.line(0, end, c.W, end, COL.line, 1);
  return { height: end + 2, els: d.els, stops, pick: "y" };
}

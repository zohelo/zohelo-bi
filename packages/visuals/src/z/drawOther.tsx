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
import { classOf, extent, linear, niceTicks, quantileBreaks, spread } from "./scale";
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

export function drawPyramid(c: Ctx): Scene {
  const [L, R] = c.p.series;
  const { d } = c;
  const keys = xKeys(c.p, c.p.series.slice(0, 2));
  const n = Math.max(1, keys.length);
  const labels = keys.map((k) => catLabel(c.p, k, true));
  const midW = Math.max(30, ...labels.map((l) => textWidth(l, 11))) + 12;
  const mid = c.W / 2;
  const top = 4;
  const bottom = c.H - 24;
  const pitch = (bottom - top) / n;
  const barH = Math.max(2, pitch - 1.5);
  const [, hi] = extent(keys.flatMap((k) => [valueAt(L, k), valueAt(R, k)]));
  const ticks = niceTicks(0, hi, 2);
  const half = mid - midW / 2 - 4;
  const sw = linear(0, ticks.max, 0, half);
  const every = Math.ceil(13 / pitch);
  const cl = seriesColor(L?.role, 0);
  const cr = seriesColor(R?.role, 1);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = bottom - (i + 1) * pitch;
    const vl = valueAt(L, k);
    const vr = valueAt(R, k);
    if (vl !== null) d.bar(mid - midW / 2 - sw(vl), y, sw(vl), barH, cl, "left", 1);
    if (vr !== null) d.bar(mid + midW / 2, y, sw(vr), barH, cr, "right", 1);
    if (i % every === 0 || i === n - 1) d.text(mid, y + barH / 2 + 4, labels[i]!, { anchor: "middle" });
    stops.push({
      x: mid + midW / 2 + (vr === null ? 0 : sw(vr)),
      y: y + barH / 2,
      title: catLabel(c.p, k),
      rows: [
        { label: L?.label ?? "", value: fmtVal(vl, c.unit, c.lang), color: cl },
        { label: R?.label ?? "", value: fmtVal(vr, c.unit, c.lang), color: cr },
      ],
      band: [0, y - 0.75, c.W, pitch],
    });
  });
  const ay = c.H - 8;
  const maxL = withUnit(fmtTick(ticks.max, { ...c.unit, symbol: "" }, c.lang, ticks.step), c.unit.symbol === "%" ? "%" : "");
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

export type ScatterPoint = { key: string; x: number; y: number };

export function scatterPoints(p: ZChartProps): { xs: ZSeries | undefined; ys: ZSeries | undefined; pts: ScatterPoint[] } {
  const xs = p.series.find((s) => s.id === "x") ?? p.series[0];
  const ys = p.series.find((s) => s.id === "y") ?? p.series[1];
  const pts: ScatterPoint[] = [];
  for (const pt of xs?.points ?? []) {
    const y = valueAt(ys, pt.x);
    if (pt.y !== null && y !== null) pts.push({ key: pt.x, x: pt.y, y });
  }
  return { xs, ys, pts };
}

export function drawScatter(c: Ctx): Scene {
  const { d } = c;
  const { xs, ys, pts } = scatterPoints(c.p);
  const ux: ZUnit = xs?.unit ?? c.unit;
  const uy: ZUnit = ys?.unit ?? c.unit;
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
  // least-squares trend
  let slope = 0;
  let icpt = 0;
  if (pts.length > 2) {
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
    slope = sxx ? pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx : 0;
    icpt = my - slope * mx;
    const clampY = (x: number) => Math.min(ty.max, Math.max(ty.min, slope * x + icpt));
    d.line(sx(xlo), ax.sy(clampY(xlo)), sx(xhi), ax.sy(clampY(xhi)), COL.referenceLight, 1, "4 4");
  }
  const hl = c.p.highlight;
  const resid = pts.map((p) => ({ p, r: Math.abs(p.y - (slope * p.x + icpt)) })).sort((a, b) => b.r - a.r);
  const labelled = new Set<string>([...(hl ? [hl] : []), ...resid.slice(0, c.phone ? 2 : 3).map((o) => o.p.key)]);
  for (const p of pts) if (p.key !== hl) d.circle(sx(p.x), ax.sy(p.y), 5, COL.series(1));
  const hp = pts.find((p) => p.key === hl);
  if (hp) d.circle(sx(hp.x), ax.sy(hp.y), 6.5, COL.series(1));
  const boxes: [number, number, number, number][] = [];
  for (const p of pts) {
    if (!labelled.has(p.key)) continue;
    const t = catLabel(c.p, p.key, c.phone);
    const w = textWidth(t, 11, p.key === hl ? 600 : 400);
    const X = sx(p.x);
    const Y = ax.sy(p.y);
    const right = X + 9 + w <= c.W;
    const bx = right ? X + 9 : X - 9 - w;
    const box: [number, number, number, number] = [bx, Y - 8, w, 12];
    if (boxes.some((b) => b[0] < box[0] + box[2] && box[0] < b[0] + b[2] && b[1] < box[1] + box[3] && box[1] < b[1] + b[3])) continue;
    boxes.push(box);
    d.text(right ? X + 9 : X - 9, Y + 4, t, { anchor: right ? "start" : "end", tone: "ink", weight: p.key === hl ? 600 : 400 });
  }
  const sorted = pts.slice().sort((a, b) => a.x - b.x);
  const stops: Stop[] = sorted.map((p) => ({
    x: sx(p.x),
    y: ax.sy(p.y),
    title: catLabel(c.p, p.key),
    rows: [
      { label: xs?.label ?? "x", value: fmtVal(p.x, ux, c.lang) },
      { label: ys?.label ?? "y", value: fmtVal(p.y, uy, c.lang) },
    ],
    dots: [{ x: sx(p.x), y: ax.sy(p.y), color: COL.series(1) }],
  }));
  return { height: c.H, els: d.els, stops, pick: "xy" };
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

export function drawTileMap(c: Ctx): Scene {
  const { d } = c;
  const s = c.p.series[0];
  const values = tileValues(s);
  const nums = [...values.values()].filter((v): v is number => v !== null);
  const breaks = breaksFor(c.p, nums, 4);
  const ramp = rampColors(4);
  const cls = classLabels(breaks, c.unit, c.lang);
  const gap = 4;
  const tw = Math.max(44, Math.min(76, (c.W - 3 * gap) / 4));
  const th = Math.max(38, Math.round(tw * 0.72));
  const ox = (c.W - (4 * tw + 3 * gap)) / 2;
  const hl = c.p.highlight;
  const stops: Stop[] = [];
  for (const t of VOIVODESHIP_TILES) {
    const x = ox + t.col * (tw + gap);
    const y = 2 + t.row * (th + gap);
    const v = values.get(t.key) ?? null;
    const k = v === null ? -1 : classOf(v, breaks);
    const dark = k >= 2;
    if (v === null) d.rect(x, y, tw, th, COL.muted, { rx: 4, stroke: COL.lineStrong, sw: 1, dash: "3 2" });
    else d.rect(x, y, tw, th, ramp[k]!, { rx: 4 });
    if (hl && t.key === hl) d.rect(x + 1, y + 1, tw - 2, th - 2, "none", { rx: 3, stroke: COL.ink, sw: 2 });
    const tone = dark ? "inverse" : "ink";
    d.text(x + tw / 2, y + th / 2 - 2, t.abbr, { anchor: "middle", tone, weight: 600 });
    d.text(x + tw / 2, y + th / 2 + 12, fmtNum(v, c.lang, c.unit.decimals), { anchor: "middle", tone });
    const name = c.lang === "pl" ? t.name_pl : t.name_en;
    stops.push({
      x: x + tw,
      y: y + th / 2,
      title: c.p.categories?.find((k2) => k2.key === t.key)?.label ?? name,
      rows: [
        {
          label: s?.label ?? "",
          value: `${fmtVal(v, c.unit, c.lang)}${k >= 0 ? ` (${cls[k]})` : ""}`,
          color: k >= 0 ? ramp[k] : undefined,
        },
      ],
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
  const breaks = breaksFor(c.p, nums, 5);
  const ramp = rampColors(5);
  const cls = classLabels(breaks, c.unit, c.lang);
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
      if (v !== null) d.rect(x + 1, y + 1, cw - 2, ch - 2, ramp[classOf(v, breaks)]!, { rx: 2 });
      const period = monthly ? `${row}-${col}` : null;
      stops.push({
        x: x + cw,
        y: y + ch / 2,
        title: period ? periodLabel(period, c.lang, "long") : `${g.rowLabel[r]} · ${catLabel(c.p, col)}`,
        rows: [
          {
            label: c.p.series.length === 1 ? (c.p.series[0]?.label ?? "") : g.rowLabel[r]!,
            value: v === null ? "–" : `${fmtVal(v, c.unit, c.lang)} (${cls[classOf(v, breaks)]})`,
            color: v === null ? undefined : ramp[classOf(v, breaks)],
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

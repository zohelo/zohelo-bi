// Size, ranking and deviation: ranked-bars, grouped-bars, dumbbell, slope, diverging-bars, bullet, waterfall.

import { fitText, fmtDiff, fmtNum, fmtSigned, fmtTick, fmtVal, textWidth } from "./format";
import { extent, linear, niceTicks, spread } from "./scale";
import { COL, catLabel, drawYAxis, makeYAxis, seriesColor, valueAt, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import type { ZSeries, ZUnit } from "./types";

function nameColumn(c: Ctx, keys: string[], share: number): { names: string[]; w: number } {
  const max = c.W * share;
  const full = keys.map((k) => catLabel(c.p, k));
  const pick = full.map((l, i) => (textWidth(l, 11) > max ? catLabel(c.p, keys[i]!, true) : l));
  const names = pick.map((l) => fitText(l, 11, max));
  return { names, w: Math.ceil(Math.min(max, Math.max(0, ...names.map((l) => textWidth(l, 11))))) };
}

/**
 * Frame of a horizontal bar chart (`opts.horizontal`): category names on the left (long labels, shortened only when
 * they exceed the share), a value axis with gridlines and tick labels under the rows.
 */
export function horizontalFrame(c: Ctx, keys: string[], lo: number, hi: number, rowH: number, o: { unit?: ZUnit; rightPad?: number } = {}) {
  const unit = o.unit ?? c.unit;
  const { names, w } = nameColumn(c, keys, c.phone ? 0.4 : 0.34);
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const labels = ticks.values.map((t) => fmtTick(t, unit, c.lang, ticks.step));
  const x0 = w + 10;
  const x1 = c.W - Math.max(o.rightPad ?? 0, textWidth(labels[labels.length - 1] ?? "", 11) / 2 + 2);
  const top = 6;
  const yb = top + keys.length * rowH;
  const sx = linear(ticks.min, ticks.max, x0, x1);
  ticks.values.forEach((t, i) => {
    const zero = Math.abs(t) < ticks.step * 1e-6 && ticks.min < 0;
    c.d.line(sx(t), top - 2, sx(t), yb, zero ? COL.referenceLight : COL.grid, 1);
    c.d.text(sx(t), yb + 14, labels[i]!, { anchor: "middle" });
  });
  keys.forEach((_, i) => c.d.text(x0 - 8, top + i * rowH + rowH / 2 + 4, names[i]!, { anchor: "end", tone: "ink" }));
  return { x0, x1, sx, top, yb, rowH, height: yb + 22, rowY: (i: number) => top + i * rowH };
}

/** Categories by value, largest first (default), smallest first ("asc"), or in their own order ("data"). */
function sortedByValue(c: Ctx, s: ZSeries | undefined): string[] {
  const keys = xKeys(c.p, s ? [s] : []);
  const sort = c.p.opts?.sort ?? "desc";
  if (sort === "data") return keys;
  const sign = sort === "asc" ? -1 : 1;
  return keys.slice().sort((a, b) => sign * ((valueAt(s, b) ?? -Infinity) - (valueAt(s, a) ?? -Infinity)));
}

// ---------- ranked bars

export function drawRankedBars(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = sortedByValue(c, s);
  const ref = c.p.reference;
  const rowH = c.phone ? 28 : 25;
  const barH = c.phone ? 18 : 17;
  const top = 6;
  const { names, w: nameW } = nameColumn(c, keys, c.phone ? 0.36 : 0.3);
  const vals = keys.map((k) => valueAt(s, k));
  const hl = c.p.highlight;
  const bm = c.p.opts?.benchmark && keys.includes(c.p.opts.benchmark) ? c.p.opts.benchmark : undefined;
  const noLabels = c.p.opts?.barLabels === "none";
  const valLabels = vals.map((v) => (noLabels ? "" : fmtNum(v, c.lang, c.unit.decimals)));
  const valW = Math.max(0, ...valLabels.map((l) => textWidth(l, 11, 600)));
  const x0 = nameW + 8;
  const x1 = c.W - valW - 10;
  const [lo, hi] = extent(vals.concat(ref ? [ref.value] : []));
  const sx = linear(Math.min(0, lo), Math.max(0, hi), x0, x1);
  const height = top + keys.length * rowH + (ref ? 26 : 4);
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = top + i * rowH;
    const v = vals[i];
    // benchmark (e.g. EU-27): series-context, its name and value in bold; the highlight stays series-1
    const color = k === bm && k !== hl ? COL.context : (hl ? k === hl : true) ? COL.series(1) : COL.context;
    const strong = k === hl || k === bm;
    d.text(x0 - 6, y + barH / 2 + 4, names[i]!, { anchor: "end", tone: "ink", weight: k === bm ? 600 : 400 });
    if (v !== null && v !== undefined) {
      const a = sx(Math.min(0, v));
      const b = sx(Math.max(0, v));
      d.bar(a, y, b - a, barH, color, v < 0 ? "left" : "right");
    }
    d.text(c.W - 2, y + barH / 2 + 4, valLabels[i]!, { anchor: "end", tone: "ink", weight: strong ? 600 : 400 });
    stops.push({
      x: v === null || v === undefined ? x0 : sx(v),
      y: y + barH / 2,
      title: catLabel(c.p, k),
      rows: [{ label: s?.label ?? "", value: fmtVal(v, c.unit, c.lang), color }],
      band: [0, y - (rowH - barH) / 2, c.W, rowH],
    });
  });
  if (bm) benchmarkLine(c, sx, valueAt(s, bm), top - 4, top + keys.length * rowH - 2);
  if (lo < 0) d.line(sx(0), top - 2, sx(0), top + keys.length * rowH, COL.reference, 1);
  if (ref) {
    const x = sx(ref.value);
    const yb = top + keys.length * rowH;
    d.line(x, top - 4, x, yb - 2, COL.reference, 1, "3 3");
    const tw = textWidth(ref.label, 11);
    d.text(Math.min(Math.max(x, x0 + tw / 2), c.W - tw / 2), yb + 16, ref.label, { anchor: "middle", tone: "ink-2" });
  }
  return { height, els: d.els, stops, pick: "y" };
}

/** Benchmark category (`opts.benchmark`): a dotted line at its value across the rows, in series-context. */
export function benchmarkLine(c: Ctx, sx: (v: number) => number, v: number | null, y0: number, y1: number) {
  if (v === null) return;
  c.d.line(sx(v), y0, sx(v), y1, COL.context, 1, "2 3");
}

// ---------- grouped bars

export function groupColors(series: ZSeries[]): string[] {
  const k = series.length;
  return series.map((s, i) => {
    if (s.role) return seriesColor(s.role, i);
    if (i === k - 1) return COL.series(1);
    if (i === 0) return COL.context;
    return COL.series(2);
  });
}

export function drawGroupedBars(c: Ctx): Scene {
  if (c.p.opts?.horizontal) return drawGroupedBarsH(c);
  const series = c.p.series.slice(0, 3);
  const { d } = c;
  const keys = xKeys(c.p, series);
  const colors = groupColors(series);
  const [lo, hi] = extent(series.flatMap((s) => keys.map((k) => valueAt(s, k))).concat(c.p.reference ? [c.p.reference.value] : []));
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const y0 = 16;
  const y1 = c.H - 26;
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const n = Math.max(1, keys.length);
  const gs = (x1 - x0) / n;
  const k = Math.max(1, series.length);
  const o = c.p.opts ?? {};
  const gw = Math.min(gs * (o.barWidth === "narrow" ? 0.5 : 0.76), k * (o.barWidth === "narrow" ? 32 : 56));
  const bw = Math.max(2, (gw - (k - 1) * 2) / k);
  const zeroY = ax.sy(0);
  if (c.p.reference) {
    const y = ax.sy(c.p.reference.value);
    d.line(x0, y, x1, y, COL.reference, 1, "4 3");
    d.text(x1, y - 5, c.p.reference.label, { anchor: "end", tone: "ink-2" });
  }
  // Value labels: the last series of each group by default, every bar with opts.barLabels "all", none with "none".
  const labelOn = (j: number, i: number) =>
    o.barLabels === "none" ? false : o.barLabels === "all" ? true : o.barLabels === "last" ? i === n - 1 : j === k - 1;
  const stops: Stop[] = [];
  keys.forEach((key, i) => {
    const gx = x0 + gs * i + (gs - gw) / 2;
    let topY = zeroY;
    series.forEach((s, j) => {
      const v = valueAt(s, key);
      if (v === null) return;
      const y = ax.sy(v);
      const x = gx + j * (bw + 2);
      d.bar(x, Math.min(y, zeroY), bw, Math.abs(zeroY - y), colors[j]!, v < 0 ? "bottom" : "top");
      topY = Math.min(topY, y);
      if (labelOn(j, i)) {
        const l = fmtNum(v, c.lang, c.unit.decimals);
        const strong = j === k - 1 && o.barLabels !== "all";
        if (textWidth(l, 11, strong ? 600 : 400) <= bw + 6)
          d.text(x + bw / 2, v < 0 ? y + 14 : y - 5, l, { anchor: "middle", tone: "ink", weight: strong ? 600 : 400 });
      }
    });
    const full = catLabel(c.p, key);
    const label = textWidth(full, 11) <= gs - 4 ? full : fitText(catLabel(c.p, key, true), 11, gs - 2);
    d.text(x0 + gs * (i + 0.5), c.H - 8, label, { anchor: "middle", tone: "ink-2" });
    stops.push({
      x: x0 + gs * (i + 0.5),
      y: topY,
      title: catLabel(c.p, key),
      rows: series.map((s, j) => ({ label: s.label, value: fmtVal(valueAt(s, key), c.unit, c.lang), color: colors[j] })),
      band: [x0 + gs * i, y0 - 8, gs, y1 - y0 + 8],
    });
  });
  if (ticks.min < 0) d.line(x0, zeroY, x1, zeroY, COL.referenceLight, 1);
  return { height: c.H, els: d.els, stops, pick: "x" };
}

/** grouped-bars `opts.horizontal`: categories on the vertical axis, one bar per series in each row. */
function drawGroupedBarsH(c: Ctx): Scene {
  const series = c.p.series.slice(0, 3);
  const { d } = c;
  const keys = xKeys(c.p, series);
  const colors = groupColors(series);
  const k = Math.max(1, series.length);
  const barH = c.phone ? 12 : 11;
  const rowH = k * barH + (k - 1) * 2 + (c.phone ? 12 : 10);
  const last = series[k - 1];
  const valLabels = keys.map((key) => fmtNum(valueAt(last, key), c.lang, c.unit.decimals));
  const valW = Math.max(0, ...valLabels.map((l) => textWidth(l, 11, 600))) + 6;
  const [lo, hi] = extent(series.flatMap((s) => keys.map((key) => valueAt(s, key))).concat(c.p.reference ? [c.p.reference.value] : []));
  const f = horizontalFrame(c, keys, lo, hi, rowH, { rightPad: valW });
  const stops: Stop[] = [];
  keys.forEach((key, i) => {
    const y = f.rowY(i) + (rowH - (k * barH + (k - 1) * 2)) / 2;
    let end = f.sx(0);
    series.forEach((s, j) => {
      const v = valueAt(s, key);
      if (v === null) return;
      const a = f.sx(Math.min(0, v));
      const b = f.sx(Math.max(0, v));
      const by = y + j * (barH + 2);
      d.bar(a, by, b - a, barH, colors[j]!, v < 0 ? "left" : "right");
      end = Math.max(end, b);
      if (j === k - 1) d.text(b + 4, by + barH / 2 + 4, valLabels[i]!, { tone: "ink", weight: 600 });
    });
    stops.push({
      x: end,
      y: f.rowY(i) + rowH / 2,
      title: catLabel(c.p, key),
      rows: series.map((s, j) => ({ label: s.label, value: fmtVal(valueAt(s, key), c.unit, c.lang), color: colors[j] })),
      band: [0, f.rowY(i), c.W, rowH],
    });
  });
  if (c.p.reference) {
    const x = f.sx(c.p.reference.value);
    d.line(x, f.top - 4, x, f.yb, COL.reference, 1, "4 3");
  }
  return { height: f.height, els: d.els, stops, pick: "y" };
}

// ---------- dumbbell

export function drawDumbbell(c: Ctx): Scene {
  const [a, b] = c.p.series;
  const { d } = c;
  const keys0 = xKeys(c.p, c.p.series.slice(0, 2));
  const change = (k: string) => {
    const va = valueAt(a, k);
    const vb = valueAt(b, k);
    return va === null || vb === null ? 0 : vb - va;
  };
  const down = keys0.filter((k) => change(k) < 0).length >= keys0.length / 2;
  const keys = keys0.slice().sort((p, q) => (down ? change(p) - change(q) : change(q) - change(p)));
  const pitch = c.phone ? 34 : 36;
  const top = 18;
  const { names, w: nameW } = nameColumn(c, keys, c.phone ? 0.3 : 0.24);
  const diffs = keys.map((k) => fmtDiff(change(k), c.unit, c.lang));
  const diffW = Math.max(...diffs.map((l) => textWidth(l, 11)));
  const [lo, hi] = extent(keys.flatMap((k) => [valueAt(a, k), valueAt(b, k)]));
  const ticks = niceTicks(lo > 0 && lo < hi - lo ? 0 : lo, hi, c.phone ? 3 : 4);
  const x0 = nameW + 14;
  const x1 = c.W - diffW - 16;
  const sx = linear(ticks.min, ticks.max, x0, x1);
  const yEnd = top + (keys.length - 1) * pitch + 16;
  ticks.values.forEach((t) => {
    d.line(sx(t), 4, sx(t), yEnd, COL.grid, 1);
    d.text(sx(t), yEnd + 16, fmtTick(t, c.unit, c.lang, ticks.step), { anchor: "middle" });
  });
  const stops: Stop[] = [];
  const ca = COL.context;
  const cb = COL.series(1);
  keys.forEach((k, i) => {
    const y = top + i * pitch;
    const va = valueAt(a, k);
    const vb = valueAt(b, k);
    d.text(x0 - 14, y + 4, names[i]!, { anchor: "end", tone: "ink" });
    if (va !== null && vb !== null) d.line(sx(va), y, sx(vb), y, COL.referenceLight, 2);
    if (va !== null) d.circle(sx(va), y, 6, ca);
    if (vb !== null) d.circle(sx(vb), y, 6, cb);
    const right = Math.max(va === null ? -Infinity : sx(va), vb === null ? -Infinity : sx(vb));
    if (va !== null && vb !== null) d.text(right + 11, y + 4, diffs[i]!, { tone: "ink-2" });
    stops.push({
      x: right,
      y,
      title: catLabel(c.p, k),
      rows: [
        { label: a?.label ?? "", value: fmtVal(va, c.unit, c.lang), color: ca },
        { label: b?.label ?? "", value: fmtVal(vb, c.unit, c.lang), color: cb },
        { label: c.lang === "pl" ? "Zmiana" : "Change", value: diffs[i]! },
      ],
      band: [0, y - pitch / 2, c.W, pitch],
    });
  });
  return { height: yEnd + 24, els: d.els, stops, pick: "y" };
}

// ---------- slope

export function drawSlope(c: Ctx): Scene {
  const [a, b] = c.p.series;
  const { d } = c;
  const keys = xKeys(c.p, c.p.series.slice(0, 2)).sort((p, q) => (valueAt(b, q) ?? 0) - (valueAt(b, p) ?? 0));
  const hl = c.p.highlight;
  const dec = c.unit.decimals;
  const leftLabels = keys.map((k) => fmtNum(valueAt(a, k), c.lang, dec));
  const leftW = Math.max(...leftLabels.map((l) => textWidth(l, 11, 600)));
  const rightMax = c.W * (c.phone ? 0.42 : 0.3);
  const rightLabels = keys.map((k) => {
    const v = fmtNum(valueAt(b, k), c.lang, dec);
    const name = fitText(catLabel(c.p, k, c.phone), 11, rightMax - textWidth(` ${v}`, 11, 600), 600);
    return `${name} ${v}`;
  });
  const rightW = Math.max(...rightLabels.map((l) => textWidth(l, 11, 600)));
  const avail = c.W - leftW - rightW - 32;
  const span = Math.min(avail, Math.max(150, c.W * 0.42));
  const xa = leftW + 16 + (avail - span) / 2;
  const xb = xa + span;
  const y0 = 14;
  const y1 = c.H - 34;
  const [lo, hi] = extent(keys.flatMap((k) => [valueAt(a, k), valueAt(b, k)]));
  const pad = (hi - lo) * 0.04 || 1;
  const sy = linear(lo - pad, hi + pad, y1, y0);
  d.line(xa, y0 - 6, xa, y1 + 6, COL.grid, 1);
  d.line(xb, y0 - 6, xb, y1 + 6, COL.grid, 1);
  d.text(xa, c.H - 10, a?.label ?? "", { anchor: "middle", tone: "ink-2", weight: 600, size: 12 });
  d.text(xb, c.H - 10, b?.label ?? "", { anchor: "middle", tone: "ink-2", weight: 600, size: 12 });
  const color = (k: string) => (hl ? (k === hl ? COL.series(1) : COL.context) : COL.series(1));
  const order = keys.slice().sort((p, q) => (p === hl ? 1 : 0) - (q === hl ? 1 : 0));
  for (const k of order) {
    const va = valueAt(a, k);
    const vb = valueAt(b, k);
    const on = k === hl;
    if (va !== null && vb !== null) d.line(xa, sy(va), xb, sy(vb), color(k), on ? 2.5 : hl ? 1.25 : 2);
    if (va !== null) d.circle(xa, sy(va), on ? 4 : 3, color(k));
    if (vb !== null) d.circle(xb, sy(vb), on ? 4 : 3, color(k));
  }
  const ly = spread(
    keys.map((k) => sy(valueAt(a, k) ?? lo) + 4),
    13,
    y0,
    y1 + 8,
  );
  const ry = spread(
    keys.map((k) => sy(valueAt(b, k) ?? lo) + 4),
    13,
    y0,
    y1 + 8,
  );
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const on = k === hl;
    const w = on ? 600 : 400;
    d.text(xa - 8, ly[i]!, leftLabels[i]!, { anchor: "end", tone: on ? "ink" : "ink-2", weight: w });
    d.text(xb + 8, ry[i]!, rightLabels[i]!, { tone: on ? "ink" : "ink-2", weight: w });
    const va = valueAt(a, k);
    const vb = valueAt(b, k);
    stops.push({
      x: xb,
      y: sy(vb ?? lo),
      title: catLabel(c.p, k),
      rows: [
        { label: a?.label ?? "", value: fmtVal(va, c.unit, c.lang), color: color(k) },
        { label: b?.label ?? "", value: fmtVal(vb, c.unit, c.lang), color: color(k) },
      ],
      dots: [
        ...(va !== null ? [{ x: xa, y: sy(va), color: color(k) }] : []),
        ...(vb !== null ? [{ x: xb, y: sy(vb), color: color(k) }] : []),
      ],
    });
  });
  return { height: c.H, els: d.els, stops, pick: "y" };
}

// ---------- diverging bars

export function drawDiverging(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = sortedByValue(c, s);
  const rowH = c.phone ? 28 : 25;
  const barH = c.phone ? 18 : 17;
  const top = 6;
  const vals = keys.map((k) => valueAt(s, k) ?? 0);
  const { names } = nameColumn(c, keys, c.phone ? 0.34 : 0.28);
  const labels = vals.map((v) => fmtSigned(v, c.lang, c.unit.decimals));
  const valW = Math.max(...labels.map((l) => textWidth(l, 11))) + 5;
  const posName = Math.max(0, ...keys.map((_, i) => (vals[i]! >= 0 ? textWidth(names[i]!, 11) + 6 : 0)));
  const negName = Math.max(0, ...keys.map((_, i) => (vals[i]! < 0 ? textWidth(names[i]!, 11) + 6 : 0)));
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const need = (k: number) => {
    const left = Math.max(maxNeg > 0 ? k * maxNeg + valW : 0, posName);
    const right = Math.max(maxPos > 0 ? k * maxPos + valW : 0, negName);
    return { left, right };
  };
  let lo = 0;
  let hi = c.W;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const n = need(mid);
    if (n.left + n.right <= c.W - 4) lo = mid;
    else hi = mid;
  }
  const k = Math.min(lo, (c.W * 0.42) / Math.max(maxPos, maxNeg, 1e-9));
  const zx = need(k).left + 2;
  const stops: Stop[] = [];
  keys.forEach((key, i) => {
    const y = top + i * rowH;
    const v = vals[i]!;
    const w = Math.abs(v) * k;
    const ty = y + barH / 2 + 4;
    if (v >= 0) {
      d.bar(zx, y, w, barH, COL.positive, "right");
      d.text(zx + w + 5, ty, labels[i]!, { tone: "ink" });
      d.text(zx - 6, ty, names[i]!, { anchor: "end", tone: "ink" });
    } else {
      d.bar(zx - w, y, w, barH, COL.negative, "left");
      d.text(zx - w - 5, ty, labels[i]!, { anchor: "end", tone: "ink" });
      d.text(zx + 6, ty, names[i]!, { tone: "ink" });
    }
    stops.push({
      x: v >= 0 ? zx + w : zx - w,
      y: y + barH / 2,
      title: catLabel(c.p, key),
      rows: [{ label: s?.label ?? "", value: fmtVal(valueAt(s, key), c.unit, c.lang), color: v >= 0 ? COL.positive : COL.negative }],
      band: [0, y - (rowH - barH) / 2, c.W, rowH],
    });
  });
  d.line(zx, 2, zx, top + keys.length * rowH, COL.reference, 1);
  return { height: top + keys.length * rowH + 4, els: d.els, stops, pick: "y" };
}

// ---------- bullet

export function drawBullet(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = xKeys(c.p, s ? [s] : []);
  const band = c.p.band;
  const target = bulletTarget(c.p);
  const pitch = c.phone ? 42 : 46;
  const trackH = 24;
  const { names, w: nameW } = nameColumn(c, keys, c.phone ? 0.34 : 0.28);
  const labels = keys.map((k) => fmtVal(valueAt(s, k), c.unit, c.lang));
  const valW = Math.max(...labels.map((l) => textWidth(l, 11, 600)));
  const [lo, hi] = extent(keys.map((k) => valueAt(s, k)).concat(band ?? [], target ? [target.value] : []));
  const ticks = niceTicks(Math.min(0, lo), hi * 1.08, c.phone ? 3 : 3);
  const x0 = nameW + 10;
  const x1 = c.W - valW - 12;
  const sx = linear(ticks.min, ticks.max, x0, x1);
  const top = 6;
  const stops: Stop[] = [];
  keys.forEach((k, i) => {
    const y = top + i * pitch;
    const v = valueAt(s, k);
    d.text(x0 - 8, y + trackH / 2 + 4, names[i]!, { anchor: "end", tone: "ink" });
    d.rect(x0, y, x1 - x0, trackH, COL.muted, { rx: 3 });
    if (band) d.rect(sx(Math.min(...band)), y, sx(Math.max(...band)) - sx(Math.min(...band)), trackH, COL.band);
    if (v !== null) d.bar(sx(Math.min(0, v)), y + 8, Math.abs(sx(v) - sx(0)), 8, COL.series(1), v < 0 ? "left" : "right");
    if (target) d.line(sx(target.value), y + 2, sx(target.value), y + trackH - 2, COL.ink, 2);
    d.text(c.W - 2, y + trackH / 2 + 4, labels[i]!, { anchor: "end", tone: "ink", weight: 600 });
    stops.push({
      x: v === null ? x0 : sx(v),
      y: y + trackH / 2,
      title: catLabel(c.p, k),
      rows: [
        { label: s?.label ?? "", value: labels[i]!, color: COL.series(1) },
        ...(target ? [{ label: target.label, value: fmtVal(target.value, c.unit, c.lang) }] : []),
        ...(band ? [{ label: c.lang === "pl" ? "Pasmo" : "Range", value: bandText(c, band) }] : []),
      ],
      band: [0, y - (pitch - trackH) / 2, c.W, pitch],
    });
  });
  const axisY = top + keys.length * pitch + 4;
  ticks.values.forEach((t) => d.text(sx(t), axisY, fmtTick(t, c.unit, c.lang, ticks.step), { anchor: "middle" }));
  return { height: axisY + 6, els: d.els, stops, pick: "y" };
}

/** Target tick of a bullet: `reference`, else `opts.target` labelled "cel" / "target". */
export function bulletTarget(p: Ctx["p"]): { value: number; label: string } | undefined {
  if (p.reference) return p.reference;
  const t = p.opts?.target;
  return t === undefined || !Number.isFinite(t) ? undefined : { value: t, label: p.lang === "pl" ? "cel" : "target" };
}

export function bandText(c: Ctx, band: [number, number]): string {
  const lo = fmtNum(Math.min(...band), c.lang, c.unit.decimals);
  return `${lo}–${fmtVal(Math.max(...band), c.unit, c.lang)}`;
}

// ---------- waterfall

export function drawWaterfall(c: Ctx): Scene {
  const s = c.p.series[0];
  const { d } = c;
  const keys = xKeys(c.p, s ? [s] : []);
  const steps = keys.map((k) => valueAt(s, k) ?? 0);
  const cum: [number, number][] = [];
  let acc = 0;
  for (const v of steps) {
    cum.push([acc, acc + v]);
    acc += v;
  }
  const total = acc;
  const all = cum.flat().concat([0, total]);
  const [lo, hi] = extent(all);
  const ticks = niceTicks(Math.min(0, lo), Math.max(0, hi), c.phone ? 3 : 4);
  const y0 = 18;
  const y1 = c.H - 26;
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 4;
  drawYAxis(c, ax, x0, x1);
  const n = keys.length + 1;
  const step = (x1 - x0) / n;
  const bw = Math.min(step * 0.7, 64);
  const totalLabel = c.p.totalLabel ?? (c.lang === "pl" ? "Suma" : "Total");
  const stops: Stop[] = [];
  const label = (key: string | null, i: number) => {
    const full = key === null ? totalLabel : catLabel(c.p, key);
    const short = key === null ? totalLabel : catLabel(c.p, key, true);
    const l = textWidth(full, 11) <= step - 4 ? full : fitText(short, 11, step - 2);
    d.text(x0 + step * (i + 0.5), c.H - 8, l, { anchor: "middle", tone: key === null ? "ink" : "ink-2", weight: key === null ? 600 : 400 });
  };
  cum.forEach(([a, b], i) => {
    const x = x0 + step * i + (step - bw) / 2;
    const v = steps[i]!;
    const ya = ax.sy(Math.max(a, b));
    const yb = ax.sy(Math.min(a, b));
    d.bar(x, ya, bw, Math.max(1, yb - ya), v >= 0 ? COL.positive : COL.negative, v >= 0 ? "top" : "bottom");
    d.line(x + bw, ax.sy(b), x + step, ax.sy(b), COL.referenceLight, 1, "2 2");
    d.text(x + bw / 2, ya - 5, fmtSigned(v, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
    label(keys[i]!, i);
    stops.push({
      x: x + bw / 2,
      y: ya,
      title: catLabel(c.p, keys[i]!),
      rows: [
        { label: s?.label ?? "", value: fmtDiff(v, c.unit, c.lang), color: v >= 0 ? COL.positive : COL.negative },
        { label: c.lang === "pl" ? "Narastająco" : "Running total", value: fmtVal(b, c.unit, c.lang) },
      ],
      band: [x0 + step * i, y0 - 8, step, y1 - y0 + 8],
    });
  });
  const tx = x0 + step * keys.length + (step - bw) / 2;
  const ty = ax.sy(Math.max(0, total));
  d.bar(tx, ty, bw, Math.abs(ax.sy(total) - ax.sy(0)), COL.reference, total >= 0 ? "top" : "bottom");
  d.text(tx + bw / 2, ty - 5, fmtNum(total, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
  label(null, keys.length);
  stops.push({
    x: tx + bw / 2,
    y: ty,
    title: totalLabel,
    rows: [{ label: totalLabel, value: fmtVal(total, c.unit, c.lang), color: COL.reference }],
    band: [x0 + step * keys.length, y0 - 8, step, y1 - y0 + 8],
  });
  if (ticks.min < 0) d.line(x0, ax.sy(0), x1, ax.sy(0), COL.referenceLight, 1);
  return { height: c.H, els: d.els, stops, pick: "x" };
}

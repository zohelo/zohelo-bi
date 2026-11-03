// Scales and ticks of the chart library (pixel space).

import { parsePeriod, periodLabel, type Lang } from "./format";

export function niceStep(range: number, count: number): number {
  if (!(range > 0)) return 1;
  const raw = range / Math.max(1, count);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  // 2.5 only where it gives whole-number ticks (25, 250 …)
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && p >= 10 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export type Ticks = { min: number; max: number; step: number; values: number[] };

/** Nice ticks covering [lo, hi]; `count` is the wanted number of intervals. */
export function niceTicks(lo: number, hi: number, count: number): Ticks {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, step: 1, values: [0, 1] };
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep(hi - lo, count);
  const min = Math.floor(lo / step + 1e-9) * step;
  const max = Math.ceil(hi / step - 1e-9) * step;
  const values: number[] = [];
  for (let v = min; v <= max + step * 1e-6; v += step) values.push(Number(v.toFixed(10)));
  return { min, max, step, values };
}

export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function extent(vals: (number | null | undefined)[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of vals) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? [0, 1] : [lo, hi];
}

/** Numeric position of a period (time charts); unknown keys fall back to their index. */
export function periodPositions(xs: string[]): number[] {
  const ts = xs.map((x) => parsePeriod(x).t);
  return ts.some((t) => Number.isNaN(t)) ? xs.map((_, i) => i) : ts;
}

export type XTick = { t: number; label: string };

/**
 * Time ticks: whole years when the span is 3+ years (step 1/2/5/10 so at most `max` labels), otherwise
 * months or quarters. Phone labels are shortened ("II 2023").
 */
export function timeTicks(xs: string[], max: number, lang: Lang, phone: boolean, fmt?: (p: string) => string): XTick[] {
  if (!xs.length) return [];
  const ts = periodPositions(xs);
  const t0 = ts[0]!;
  const t1 = ts[ts.length - 1]!;
  const kind = parsePeriod(xs[0]!).kind;
  if (kind === "X") {
    const every = Math.max(1, Math.ceil(xs.length / max));
    return xs.map((x, i) => ({ t: i, label: fmt?.(x) ?? x })).filter((_, i) => i % every === 0);
  }
  if (t1 - t0 >= 2.5 || kind === "A") {
    const y0 = Math.ceil(t0 - 1e-9);
    const y1 = Math.floor(t1 + 1e-9);
    const span = Math.max(1, y1 - y0);
    const step = [1, 2, 5, 10, 20, 25, 50].find((s) => span / s + 1 <= max) ?? 50;
    const out: XTick[] = [];
    // anchor ticks on the last year so the most recent year is labelled
    for (let y = y1; y >= y0; y -= step) out.unshift({ t: y, label: String(y) });
    return out;
  }
  // short span: label individual periods
  const every = Math.max(1, Math.ceil(xs.length / max));
  const out: XTick[] = [];
  for (let i = xs.length - 1; i >= 0; i -= every) {
    const x = xs[i]!;
    out.unshift({ t: ts[i]!, label: phone ? periodLabel(x, lang, "phone") : (fmt?.(x) ?? periodLabel(x, lang)) });
  }
  return out;
}

/** Spreads label positions so neighbours are at least `gap` apart, kept inside [lo, hi]. */
export function spread(ys: number[], gap: number, lo: number, hi: number): number[] {
  const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = idx.map((o) => o.y);
  for (let k = 0; k < out.length; k++) {
    out[k] = Math.max(out[k]!, lo + 0, k ? out[k - 1]! + gap : lo);
  }
  const over = out.length ? out[out.length - 1]! - hi : 0;
  if (over > 0) {
    out[out.length - 1] = hi;
    for (let k = out.length - 2; k >= 0; k--) out[k] = Math.min(out[k]!, out[k + 1]! - gap);
  }
  const res: number[] = new Array(ys.length);
  idx.forEach((o, k) => (res[o.i] = out[k]!));
  return res;
}

/** Rounded quantile thresholds for an ordinal ramp of `classes` classes. */
export function quantileBreaks(values: number[], classes: number): number[] {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < 2) return Array.from({ length: classes - 1 }, (_, i) => i + 1);
  const range = v[v.length - 1]! - v[0]!;
  const step = niceStep(range, 10) / 2 || 1;
  const out: number[] = [];
  for (let c = 1; c < classes; c++) {
    const q = v[Math.min(v.length - 1, Math.round((c / classes) * (v.length - 1)))]!;
    let b = Math.round(q / step) * step;
    b = Number(b.toFixed(6));
    if (out.length && b <= out[out.length - 1]!) b = Number((out[out.length - 1]! + step).toFixed(6));
    out.push(b);
  }
  return out;
}

export function classOf(v: number, breaks: number[]): number {
  let c = 0;
  while (c < breaks.length && v >= breaks[c]!) c++;
  return c;
}

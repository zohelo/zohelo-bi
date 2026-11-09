// Chart library v2, distribution and projection: strip plot / beeswarm and fan chart (percentile bands or
// scenario lines). Same rules as the rest of the library: real pixel size, text ≥ 11px, tokens only.

import { fitText, fmtNum, fmtVal, periodLabel, textWidth } from "./format";
import { extent, linear, niceTicks, periodPositions, spread, timeTicks } from "./scale";
import { COL, catLabel, drawYAxis, linePath, makeYAxis, r, seriesColor, valueAt, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import type { ZChartProps, ZSeries } from "./types";

// ---------- strip / beeswarm

/** Median of the non-null values (null for none). */
export function median(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = (v.length - 1) / 2;
  return (v[Math.floor(m)]! + v[Math.ceil(m)]!) / 2;
}

/** Deterministic jitter in [−1, 1] from a unit key (FNV-1a), so a strip never moves between renders. */
export function jitter(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/**
 * Beeswarm offsets: every dot (radius `rad`, at pixel x `xs[i]`) gets the vertical offset closest to the axis at
 * which it touches no dot placed before it (dots are placed from left to right). Returns offsets in input order.
 */
export function beeswarm(xs: number[], rad: number, pad = 0.6): number[] {
  const order = xs.map((_, i) => i).sort((a, b) => xs[a]! - xs[b]!);
  const dist = 2 * rad + pad;
  const placed: { x: number; y: number }[] = [];
  const out: number[] = new Array(xs.length).fill(0);
  for (const i of order) {
    const x = xs[i]!;
    const near: { x: number; y: number }[] = [];
    for (let k = placed.length - 1; k >= 0 && x - placed[k]!.x < dist; k--) near.push(placed[k]!);
    const cand = [0];
    for (const q of near) {
      const dy = Math.sqrt(Math.max(0, dist * dist - (x - q.x) ** 2));
      cand.push(q.y + dy, q.y - dy);
    }
    cand.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const y = cand.find((cy) => near.every((q) => (x - q.x) ** 2 + (cy - q.y) ** 2 >= dist * dist - 1e-6)) ?? 0;
    out[i] = y;
    placed.push({ x, y });
  }
  return out;
}

function dotRadius(n: number, phone: boolean): number {
  const rad = n <= 30 ? 5.5 : n <= 100 ? 4 : n <= 250 ? 3 : 2.5;
  return phone ? Math.max(2, rad - 0.5) : rad;
}

export function drawStrip(c: Ctx): Scene {
  const { d } = c;
  const groups = c.p.series;
  const swarm = !!c.p.opts?.beeswarm;
  const hl = c.p.highlight;
  const [lo, hi] = extent(groups.flatMap((g) => g.points.map((pt) => pt.y)));
  const ticks = niceTicks(lo, hi, c.phone ? 3 : 5);
  const labels = groups.map((g) => g.label);
  const nameW = c.phone || groups.length < 2 ? 0 : Math.min(c.W * 0.22, Math.max(...labels.map((l) => textWidth(l, 11, 600))));
  const x0 = nameW ? nameW + 16 : 8;
  const x1 = c.W - 10;
  const sx = linear(ticks.min, ticks.max, x0, x1);
  const labelTop = (c.phone && groups.length > 1 ? 16 : 0) + (hl ? 16 : 0);
  // lay out every row first (beeswarm rows grow with their swarm)
  const rows = groups.map((g) => {
    const pts = g.points.filter((pt): pt is { x: string; y: number } => pt.y !== null && Number.isFinite(pt.y));
    let rad = dotRadius(pts.length, c.phone);
    const px = pts.map((pt) => sx(pt.y));
    let off: number[];
    let half: number;
    if (swarm) {
      for (;;) {
        off = beeswarm(px, rad);
        half = Math.max(0, ...off.map(Math.abs)) + rad;
        if (half <= 100 || rad <= 1.5) break;
        rad -= 0.5;
      }
    } else {
      half = c.phone ? 20 : 18;
      off = pts.map((pt) => jitter(`${g.id}|${pt.x}`) * (half - rad));
    }
    return { g, pts, rad, px, off, half: Math.max(half, 10) };
  });
  let y = 4;
  const stops: Stop[] = [];
  const pl = c.lang === "pl";
  rows.forEach((row, i) => {
    const top = y + labelTop;
    const cy = top + row.half + 2;
    const bottom = cy + row.half + 6;
    if (nameW) c.d.text(x0 - 12, cy + 4, fitText(labels[i]!, 11, nameW, 600), { anchor: "end", tone: "ink", weight: 600 });
    else if (groups.length > 1) c.d.text(0, y + 12, labels[i]!, { tone: "ink", weight: 600 });
    if (i > 0) d.line(0, y, c.W, y, COL.line, 1);
    row.pts.forEach((pt, k) => {
      if (pt.x === hl) return;
      c.d.add((key) => (
        <circle key={key} cx={r(row.px[k]!)} cy={r(cy + row.off[k]!)} r={row.rad} fill={COL.context} opacity={swarm ? 0.9 : 0.6} />
      ));
    });
    const med = median(row.pts.map((pt) => pt.y));
    if (med !== null) d.line(sx(med), cy - row.half + 2, sx(med), cy + row.half + 2, COL.ink, 2);
    const h = row.pts.findIndex((pt) => pt.x === hl);
    if (h >= 0) {
      const hx = row.px[h]!;
      const hy = cy + row.off[h]!;
      d.circle(hx, hy, row.rad + 1.5, COL.series(1));
      const t = `${catLabel(c.p, hl!, c.phone)} ${fmtVal(row.pts[h]!.y, c.unit, c.lang)}`;
      const tw = textWidth(t, 11, 600);
      const tx = Math.max(tw / 2, Math.min(c.W - tw / 2, hx));
      d.text(tx, top - 3, t, { anchor: "middle", tone: "ink", weight: 600 });
    }
    const sorted = row.pts.map((pt, k) => ({ pt, k })).sort((a, b) => a.pt.y - b.pt.y);
    for (const { pt, k } of sorted) {
      const on = pt.x === hl;
      const color = on ? COL.series(1) : COL.context;
      stops.push({
        x: row.px[k]!,
        y: cy + row.off[k]!,
        title: catLabel(c.p, pt.x),
        rows: [
          { label: row.g.label, value: fmtVal(pt.y, c.unit, c.lang), color },
          ...(med !== null ? [{ label: pl ? "Mediana" : "Median", value: fmtVal(med, c.unit, c.lang) }] : []),
        ],
        dots: [{ x: row.px[k]!, y: cy + row.off[k]!, color }],
      });
    }
    y = bottom;
  });
  // value axis: gridlines behind would cross the dots, so ticks sit under the last row
  const dec = Math.max(0, -Math.floor(Math.log10(ticks.step || 1)));
  d.line(x0, y, x1, y, COL.referenceLight, 1);
  ticks.values.forEach((t) => {
    d.line(sx(t), y, sx(t), y + 4, COL.referenceLight, 1);
    d.text(sx(t), y + 17, `${fmtNum(t, c.lang, dec)}${c.unit.symbol === "%" ? "%" : ""}`, { anchor: "middle" });
  });
  return { height: y + 24, els: d.els, stops, pick: "xy" };
}

// ---------- fan (percentile bands or scenarios)

type Frame = { xs: string[]; px: (x: string) => number; sy: (v: number) => number; x0: number; x1: number; y0: number; y1: number };

function timeFrame(c: Ctx, xs: string[], lo: number, hi: number, rightPad: number): Frame {
  const y0 = 14;
  const y1 = c.H - 26;
  const ticks = niceTicks(lo, hi, c.phone ? 3 : 4);
  const ax = makeYAxis(c, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - rightPad;
  const ts = periodPositions(xs);
  const t0 = ts[0] ?? 0;
  const t1 = ts[ts.length - 1] ?? 1;
  const pos = new Map(xs.map((x, i) => [x, ts[i]!]));
  const px = (x: string) => x0 + (((pos.get(x) ?? 0) - t0) / (t1 - t0 || 1)) * (x1 - x0);
  drawYAxis(c, ax, x0, x1);
  const tk = timeTicks(xs, c.phone ? 3 : 6, c.lang, c.phone, c.p.formatPeriod);
  tk.forEach((t, i) => {
    const x = x0 + ((t.t - t0) / (t1 - t0 || 1)) * (x1 - x0);
    const last = i === tk.length - 1 && x > x1 - textWidth(t.label, 11) / 2;
    c.d.text(last ? x1 : x, c.H - 8, t.label, { anchor: last ? "end" : "middle" });
  });
  return { xs, px, sy: ax.sy, x0, x1, y0, y1 };
}

function tipTitle(c: Ctx, x: string): string {
  const pp = periodLabel(x, c.lang, "long");
  return pp !== x ? pp : catLabel(c.p, x);
}

/** Fills of the fan bands from the outer to the inner one (tokens only). */
export function fanFills(n: number): string[] {
  return [COL.band, COL.seq(1), COL.seq(2), COL.seq(3)].slice(0, Math.max(0, n));
}

export type FanModel = {
  xs: string[];
  line: ZSeries | undefined;
  bands: { lower: ZSeries; upper: ZSeries; fill: string; label: string }[];
  scenarios: ZSeries[];
  /** Index of the first forecast period in xs (−1: none). */
  from: number;
  /** Scenario mode with a shared history: drawn once in ink. */
  sharedHistory: boolean;
};

/** Index where scenario lines start to differ (the last common period starts the forecast), −1 when they never do. */
export function divergence(series: ZSeries[], xs: string[]): number {
  for (let i = 0; i < xs.length; i++) {
    const vs = series.map((s) => valueAt(s, xs[i]!)).filter((v): v is number => v !== null);
    if (vs.length > 1 && Math.max(...vs) - Math.min(...vs) > 1e-9) return Math.max(0, i - 1);
    if (vs.length > 0 && vs.length < series.length && i > 0) return Math.max(0, i - 1);
  }
  return -1;
}

export function fanModel(p: ZChartProps): FanModel {
  const xs = xKeys(p);
  const byId = (id: string) => p.series.find((s) => s.id === id);
  const pairs = (p.opts?.fan ?? []).map(([lo, up]) => ({ lower: byId(lo), upper: byId(up) })).filter((b) => b.lower && b.upper);
  const fills = fanFills(pairs.length);
  const bands = pairs.map((b, i) => ({
    lower: b.lower!,
    upper: b.upper!,
    fill: fills[i]!,
    label: `${b.lower!.label} – ${b.upper!.label}`,
  }));
  const ff = p.opts?.forecastFrom;
  const explicit = ff ? xs.indexOf(ff) : -1;
  if (bands.length) {
    const first = xs.findIndex((x) => bands.some((b) => valueAt(b.lower, x) !== null && valueAt(b.upper, x) !== null));
    return { xs, line: p.series[0], bands, scenarios: [], from: explicit >= 0 ? explicit : first, sharedHistory: false };
  }
  const scenarios = p.series.slice(0, 5);
  const div = divergence(scenarios, xs);
  const from = explicit >= 0 ? explicit : div;
  return { xs, line: undefined, bands: [], scenarios, from, sharedHistory: !ff && div > 0 && scenarios.length > 1 };
}

export function drawFan(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const m = fanModel(c.p);
  const ref = c.p.reference;
  const band = c.p.band;
  const all = c.p.series.flatMap((s) => s.points.map((pt) => pt.y)).concat(ref ? [ref.value] : [], band ?? []);
  const [lo, hi] = extent(all);
  const colors = m.scenarios.map((s, i) => seriesColor(s.role, i));
  const lines = m.bands.length ? (m.line ? [m.line] : []) : m.scenarios;
  const ends = lines.map((s) => {
    const last = [...s.points].reverse().find((pt) => pt.y !== null);
    return { s, last, text: last ? fmtVal(last.y, s.unit ?? c.unit, c.lang) : "" };
  });
  const endText = (e: (typeof ends)[number]) => (lines.length > 1 ? `${fitText(e.s.label, 11, c.phone ? 56 : 110)} ${e.text}` : e.text);
  const rightPad = Math.min(c.W * 0.34, Math.max(12, ...ends.map((e) => textWidth(endText(e), 12, 600) + 12)));
  const f = timeFrame(c, m.xs, lo, hi, rightPad);
  if (band) {
    const ya = f.sy(Math.max(band[0], band[1]));
    const yb = f.sy(Math.min(band[0], band[1]));
    d.line(f.x0, ya, f.x1, ya, COL.bandEdge, 1, "3 3");
    d.line(f.x0, yb, f.x1, yb, COL.bandEdge, 1, "3 3");
  }
  // bands, outer first
  for (const b of m.bands) {
    const xs = m.xs.filter((x) => valueAt(b.lower, x) !== null && valueAt(b.upper, x) !== null);
    if (xs.length < 2) continue;
    const up = xs.map((x) => `${r(f.px(x))} ${r(f.sy(valueAt(b.upper, x)!))}`);
    const dn = xs.map((x) => `${r(f.px(x))} ${r(f.sy(valueAt(b.lower, x)!))}`).reverse();
    d.path(`M${up.join("L")}L${dn.join("L")}Z`, "none", 0, { fill: b.fill });
  }
  if (ref) {
    const y = f.sy(ref.value);
    d.line(f.x0, y, f.x1, y, COL.reference, 1, "4 3");
    d.text(f.x0 + 4, y - 5, ref.label, { tone: "ink-2" });
  }
  if (m.from > 0) {
    const x = f.px(m.xs[m.from]!);
    d.line(x, f.y0 - 4, x, f.y1, COL.referenceLight, 1, "2 3");
    const t = m.bands.length ? (pl ? "projekcja" : "projection") : pl ? "prognoza" : "forecast";
    if (x + 4 + textWidth(t, 11) < f.x1) d.text(x + 4, f.y0 + 6, t, { tone: "ink-3" });
  }
  const pts = (s: ZSeries) => m.xs.map((x) => (valueAt(s, x) === null ? null : { x: f.px(x), y: f.sy(valueAt(s, x)!) }));
  /** Solid up to the first forecast period, dashed from the period before it on. */
  const drawLine = (s: ZSeries, color: string, width: number, history = true) => {
    const p = pts(s);
    if (m.from <= 0) {
      d.path(linePath(p), color, width, { dash: m.from === 0 ? "5 4" : undefined });
      return;
    }
    if (history) d.path(linePath(p.map((q, i) => (i <= m.from ? q : null))), color, width);
    d.path(linePath(p.map((q, i) => (i >= m.from ? q : null))), color, width, { dash: "5 4" });
  };
  if (m.bands.length) {
    if (m.line) drawLine(m.line, COL.ink, 2.25);
  } else {
    if (m.sharedHistory && m.scenarios[0]) {
      const p = pts(m.scenarios[0]);
      d.path(linePath(p.map((q, i) => (i <= m.from ? q : null))), COL.ink, 2.25);
    }
    m.scenarios.forEach((s, i) => drawLine(s, colors[i]!, 2, !m.sharedHistory));
  }
  // end labels
  const lineColor = (s: ZSeries) => (m.bands.length ? COL.ink : colors[m.scenarios.indexOf(s)]!);
  const placed = ends.filter((e) => e.last);
  const ly = spread(
    placed.map((e) => f.sy(e.last!.y!) + 4),
    14,
    f.y0 + 4,
    f.y1 + 4,
  );
  placed.forEach((e, k) => {
    const x = f.px(e.last!.x);
    d.circle(x, f.sy(e.last!.y!), 3.5, lineColor(e.s));
    d.text(x + 7, ly[k]!, endText(e), { tone: "ink", weight: 600, size: 12 });
  });
  const stops: Stop[] = m.xs.map((x) => {
    const X = f.px(x);
    const rows = m.bands.length
      ? [
          ...(m.line ? [{ label: m.line.label, value: fmtVal(valueAt(m.line, x), c.unit, c.lang), color: COL.ink }] : []),
          ...m.bands
            .slice()
            .reverse()
            .filter((b) => valueAt(b.lower, x) !== null)
            .map((b) => ({
              label: b.label,
              value: `${fmtNum(valueAt(b.lower, x), c.lang, c.unit.decimals)}–${fmtVal(valueAt(b.upper, x), c.unit, c.lang)}`,
              color: b.fill,
            })),
        ]
      : m.scenarios.map((s, i) => ({ label: s.label, value: fmtVal(valueAt(s, x), c.unit, c.lang), color: colors[i] }));
    const dots = lines.filter((s) => valueAt(s, x) !== null).map((s) => ({ x: X, y: f.sy(valueAt(s, x)!), color: lineColor(s) }));
    return {
      x: X,
      y: dots[0]?.y ?? f.y0,
      title: tipTitle(c, x),
      rows,
      guide: [X, f.y0, X, f.y1] as [number, number, number, number],
      dots,
    };
  });
  return { height: c.H, els: d.els, stops, pick: "x", initial: "last" };
}

// Drawing primitives shared by every chart type: a small retained list of SVG elements in pixel space, colours by
// job (tokens only), axes and the interaction "stops" (one per readable point/bar/row/cell).

import type { ReactElement } from "react";
import { fmtTick, textWidth, type Lang } from "./format";
import { periodPositions } from "./scale";
import type { ZChartProps, ZSeries, ZUnit } from "./types";

// ---------- colours by job (CSS custom properties from tokens.css only)

export const COL = {
  series: (i: number) => `var(--series-${i})`,
  context: "var(--series-context)",
  reference: "var(--series-reference)",
  referenceLight: "var(--series-reference-light)",
  grid: "var(--grid)",
  band: "var(--band)",
  bandEdge: "var(--band-edge)",
  positive: "var(--div-positive)",
  negative: "var(--div-negative)",
  seq: (i: number) => `var(--seq-${i})`,
  surface: "var(--surface)",
  sunken: "var(--surface-sunken)",
  muted: "var(--surface-muted)",
  line: "var(--line-subtle)",
  lineStrong: "var(--line-strong)",
  ink: "var(--ink)",
};

export const PALETTE = [1, 2, 3, 4, 5].map((i) => COL.series(i));

/** Identity colour: hero → series-1, context → series-context, otherwise series-(index+1); a 6th+ series folds into context. */
export function seriesColor(role: string | undefined, index: number): string {
  if (role === "context") return COL.context;
  if (role === "hero") return COL.series(1);
  return PALETTE[index] ?? COL.context;
}

/** 4-class ramp skips seq-3 (cells with values); 5-class uses seq-1…seq-5. */
export function rampColors(classes: number): string[] {
  return classes === 4 ? [1, 2, 4, 5].map(COL.seq) : [1, 2, 3, 4, 5].slice(0, classes).map(COL.seq);
}

export type Tone = "ink" | "ink-2" | "ink-3" | "muted" | "inverse";
const TONE: Record<Tone, string> = {
  ink: "var(--ink)",
  "ink-2": "var(--ink-2)",
  "ink-3": "var(--ink-3)",
  muted: "var(--ink-muted)",
  inverse: "var(--on-inverse)",
};

/** Smallest text the library draws (design template: chart text never below 11px on screen). */
export const MIN_TEXT = 11;

export class Draw {
  els: ReactElement[] = [];
  private k = 0;

  path(d: string, stroke: string, width: number, o: { fill?: string; dash?: string; cap?: "round" | "butt"; opacity?: number } = {}) {
    this.els.push(
      <path
        key={this.k++}
        d={d}
        fill={o.fill ?? "none"}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={o.dash}
        strokeLinejoin="round"
        strokeLinecap={o.cap ?? "round"}
        opacity={o.opacity}
      />,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1, dash?: string) {
    this.path(`M${r(x1)} ${r(y1)}L${r(x2)} ${r(y2)}`, stroke, width, { dash, cap: "butt" });
  }

  rect(x: number, y: number, w: number, h: number, fill: string, o: { rx?: number; stroke?: string; sw?: number; dash?: string } = {}) {
    this.els.push(
      <rect
        key={this.k++}
        x={r(x)}
        y={r(y)}
        width={r(Math.max(0, w))}
        height={r(Math.max(0, h))}
        rx={o.rx ?? 0}
        fill={fill}
        stroke={o.stroke}
        strokeWidth={o.sw}
        strokeDasharray={o.dash}
      />,
    );
  }

  /** Bar with a small rounded data end (2px) and a square base. */
  bar(x: number, y: number, w: number, h: number, fill: string, end: "top" | "bottom" | "left" | "right", rad = 2) {
    if (w <= 0 || h <= 0) return;
    const q = Math.min(rad, w / 2, h / 2);
    const X = x + w;
    const Y = y + h;
    let d: string;
    if (end === "top")
      d = `M${r(x)} ${r(Y)}V${r(y + q)}Q${r(x)} ${r(y)} ${r(x + q)} ${r(y)}H${r(X - q)}Q${r(X)} ${r(y)} ${r(X)} ${r(y + q)}V${r(Y)}Z`;
    else if (end === "bottom")
      d = `M${r(x)} ${r(y)}V${r(Y - q)}Q${r(x)} ${r(Y)} ${r(x + q)} ${r(Y)}H${r(X - q)}Q${r(X)} ${r(Y)} ${r(X)} ${r(Y - q)}V${r(y)}Z`;
    else if (end === "right")
      d = `M${r(x)} ${r(y)}H${r(X - q)}Q${r(X)} ${r(y)} ${r(X)} ${r(y + q)}V${r(Y - q)}Q${r(X)} ${r(Y)} ${r(X - q)} ${r(Y)}H${r(x)}Z`;
    else d = `M${r(X)} ${r(y)}H${r(x + q)}Q${r(x)} ${r(y)} ${r(x)} ${r(y + q)}V${r(Y - q)}Q${r(x)} ${r(Y)} ${r(x + q)} ${r(Y)}H${r(X)}Z`;
    this.els.push(<path key={this.k++} d={d} fill={fill} />);
  }

  circle(cx: number, cy: number, rad: number, fill: string, ring = true) {
    this.els.push(
      <circle
        key={this.k++}
        cx={r(cx)}
        cy={r(cy)}
        r={rad}
        fill={fill}
        stroke={ring ? COL.surface : undefined}
        strokeWidth={ring ? 1.5 : undefined}
      />,
    );
  }

  text(
    x: number,
    y: number,
    t: string,
    o: { size?: number; tone?: Tone; anchor?: "start" | "middle" | "end"; weight?: 400 | 500 | 600 } = {},
  ) {
    const size = Math.max(MIN_TEXT, o.size ?? 11);
    this.els.push(
      <text
        key={this.k++}
        x={r(x)}
        y={r(y)}
        textAnchor={o.anchor ?? "start"}
        fill={TONE[o.tone ?? "muted"]}
        style={{ fontSize: `${size}px`, fontWeight: o.weight ?? 400 }}
      >
        {t}
      </text>,
    );
  }
}

export function r(v: number): number {
  return Math.round(v * 10) / 10;
}

// ---------- interaction model

export type TipRow = { label: string; value: string; color?: string };

export type Stop = {
  /** Tooltip anchor (px). */
  x: number;
  y: number;
  /** Date or category first. */
  title: string;
  rows: TipRow[];
  /** Crosshair line (x1, y1, x2, y2). */
  guide?: [number, number, number, number];
  /** Highlight rectangle under the marks (x, y, w, h). */
  band?: [number, number, number, number];
  /** Ink outline above the marks (cells and tiles). */
  outline?: [number, number, number, number];
  dots?: { x: number; y: number; color: string }[];
};

export type Scene = {
  height: number;
  els: ReactElement[];
  stops: Stop[];
  /** Which pointer coordinate picks the nearest stop. */
  pick: "x" | "y" | "xy";
  /** Keyboard: linear (all arrows step), grid (Up/Down jump `cols`), spatial (nearest stop in arrow direction). */
  nav?: { kind: "linear" } | { kind: "grid"; cols: number } | { kind: "spatial" };
  /** Stop shown first on keyboard focus. */
  initial?: "first" | "last";
};

export type Ctx = {
  p: ZChartProps;
  W: number;
  /** Requested height (plot charts); row charts size to their rows. */
  H: number;
  phone: boolean;
  lang: Lang;
  unit: ZUnit;
  d: Draw;
};

// ---------- data helpers

export function isTimeX(xs: string[]): boolean {
  return xs.length > 0 && !periodPositions(xs).every((t, i) => t === i);
}

/** Union of x keys; time keys sorted by period, category keys in `categories` order, else first appearance. */
export function xKeys(p: ZChartProps, series: ZSeries[] = p.series): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const s of series)
    for (const pt of s.points)
      if (!set.has(pt.x)) {
        set.add(pt.x);
        seen.push(pt.x);
      }
  if (p.categories?.length) {
    const order = new Map(p.categories.map((c, i) => [c.key, i]));
    return seen.slice().sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));
  }
  const ts = periodPositions(seen);
  if (isTimeX(seen))
    return seen
      .map((x, i) => ({ x, t: ts[i]! }))
      .sort((a, b) => a.t - b.t)
      .map((o) => o.x);
  return seen;
}

export function valueAt(s: ZSeries | undefined, x: string): number | null {
  const v = s?.points.find((pt) => pt.x === x)?.y;
  return v === undefined || v === null || Number.isNaN(v) ? null : v;
}

export function catLabel(p: ZChartProps, key: string, short = false): string {
  const c = p.categories?.find((k) => k.key === key);
  if (c) return short && c.short ? c.short : c.label;
  return p.formatPeriod?.(key) ?? key;
}

// ---------- axes

export type YAxis = { ticks: number[]; step: number; sy: (v: number) => number; labelW: number; labels: string[] };

/** Horizontal gridlines with labels at the left; the zero line in series-reference-light. */
export function drawYAxis(c: Ctx, ax: YAxis, x0: number, x1: number, opts: { labels?: boolean } = {}) {
  ax.ticks.forEach((t, i) => {
    const y = ax.sy(t);
    const zero = Math.abs(t) < ax.step * 1e-6 && ax.ticks[0]! < 0;
    c.d.line(x0, y, x1, y, zero ? COL.referenceLight : COL.grid, 1);
    if (opts.labels !== false) c.d.text(x0 - 6, y + 4, ax.labels[i]!, { anchor: "end" });
  });
}

export function makeYAxis(c: Ctx, ticks: { values: number[]; step: number; min: number; max: number }, y0: number, y1: number): YAxis {
  const labels = ticks.values.map((t) => fmtTick(t, c.unit, c.lang, ticks.step));
  const labelW = Math.max(...labels.map((l) => textWidth(l, 11)));
  const sy = (v: number) => y1 - ((v - ticks.min) / (ticks.max - ticks.min || 1)) * (y1 - y0);
  return { ticks: ticks.values, step: ticks.step, sy, labelW, labels };
}

/** Line path through the points, broken at gaps. */
export function linePath(pts: ({ x: number; y: number } | null)[]): string {
  let d = "";
  let pen = false;
  for (const pt of pts) {
    if (!pt) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${r(pt.x)} ${r(pt.y)}`;
    pen = true;
  }
  return d;
}

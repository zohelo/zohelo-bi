// Chart library v2, tables and cards: KPI card, sparkline and the value table (plain, heat, bars, spark cells; row
// groups with subtotals). Numbers are right-aligned in tabular figures; change is never coloured good or bad here.

import { fitText, fmtChangeArrow, fmtDiff, fmtNum, fmtVal, periodLabel, textWidth } from "./format";
import { classOf, extent } from "./scale";
import { COL, catLabel, linePath, r, rampColors, valueAt, xKeys, type Ctx, type Scene, type Stop, type Tone } from "./scene";
import { breaksFor } from "./drawOther";
import type { ZChartProps, ZSeries } from "./types";

const TONE: Record<Tone, string> = {
  ink: "var(--ink)",
  "ink-2": "var(--ink-2)",
  "ink-3": "var(--ink-3)",
  muted: "var(--ink-muted)",
  inverse: "var(--on-inverse)",
};

/** Text in tabular figures (columns of numbers line up). */
function numText(
  c: Ctx,
  x: number,
  y: number,
  t: string,
  o: { size?: number; tone?: Tone; anchor?: "start" | "middle" | "end"; weight?: 400 | 500 | 600 } = {},
) {
  const size = Math.max(11, o.size ?? 12);
  c.d.add((key) => (
    <text
      key={key}
      x={r(x)}
      y={r(y)}
      textAnchor={o.anchor ?? "end"}
      fill={TONE[o.tone ?? "ink"]}
      style={{ fontSize: `${size}px`, fontWeight: o.weight ?? 400, fontVariantNumeric: "tabular-nums" }}
    >
      {t}
    </text>
  ));
}

function periodText(c: Pick<Ctx, "p" | "lang">, x: string, form: "short" | "long" = "long"): string {
  const pp = periodLabel(x, c.lang, form);
  return pp !== x ? pp : (c.p.formatPeriod?.(x) ?? catLabel(c.p, x));
}

// ---------- KPI card

export type KpiModel = {
  s: ZSeries | undefined;
  last: { x: string; y: number } | null;
  prev: { x: string; y: number } | null;
  target: { value: number; label: string } | null;
};

/**
 * Latest value and the point before it; the target when opts.target is set. The target value is opts.target, or
 * the reference value when opts.target is 0 (the library's placeholder) and a reference is given.
 */
export function kpiModel(p: ZChartProps): KpiModel {
  const s = p.series[0];
  const pts = (s?.points ?? []).filter((q): q is { x: string; y: number } => q.y !== null && Number.isFinite(q.y));
  const t = p.opts?.target;
  let target: KpiModel["target"] = null;
  if (t !== undefined) {
    const value = t === 0 && p.reference ? p.reference.value : t;
    target = { value, label: p.reference && p.reference.value === value ? p.reference.label : p.lang === "pl" ? "cel" : "target" };
  }
  return { s, last: pts[pts.length - 1] ?? null, prev: pts[pts.length - 2] ?? null, target };
}

export function drawKpiCard(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const m = kpiModel(c.p);
  const u = m.s?.unit ?? c.unit;
  const value = fmtVal(m.last?.y, u, c.lang);
  const w = c.W;
  d.text(0, 14, fitText(m.s?.label ?? "", 12, w), { tone: "ink-2", size: 12, weight: 500 });
  const size = c.phone ? 28 : 34;
  numText(c, 0, 18 + size, value, { size, weight: 600, anchor: "start" });
  let y = 18 + size + 20;
  const change = m.last && m.prev ? m.last.y - m.prev.y : null;
  if (m.last) {
    const vs = m.prev ? `${pl ? "wobec" : "vs"} ${periodText(c, m.prev.x)}` : "";
    const chg = change !== null ? fmtChangeArrow(change, u, c.lang) : "";
    d.text(0, y, chg, { tone: "ink", weight: 600 });
    d.text(
      chg ? textWidth(chg, 11, 600) + 6 : 0,
      y,
      fitText(`${vs}${vs ? " · " : ""}${periodText(c, m.last.x)}`, 11, w - textWidth(chg, 11, 600) - 6),
      {
        tone: "ink-2",
      },
    );
  }
  const stops: Stop[] = [];
  const pts = (m.s?.points ?? []).filter((q) => q.y !== null);
  const baseRows = () => [
    { label: m.s?.label ?? "", value, color: COL.series(1) },
    ...(m.prev ? [{ label: periodText(c, m.prev.x), value: fmtVal(m.prev.y, u, c.lang) }] : []),
    ...(change !== null ? [{ label: pl ? "Zmiana" : "Change", value: fmtDiff(change, u, c.lang) }] : []),
  ];
  if (c.p.opts?.spark && pts.length > 1) {
    const sy0 = y + 10;
    const sh = 40;
    const lastLabel = fmtVal(m.last?.y, u, c.lang);
    const x1 = w - textWidth(lastLabel, 11, 600) - 10;
    const [lo, hi] = extent(pts.map((q) => q.y));
    const n = pts.length - 1;
    const px = (i: number) => (i / n) * x1;
    const py = (v: number) => sy0 + sh - ((v - lo) / (hi - lo || 1)) * sh;
    d.path(linePath(pts.map((q, i) => ({ x: px(i), y: py(q.y!) }))), COL.series(1), 1.75);
    const lx = px(n);
    const ly = py(pts[n]!.y!);
    d.circle(lx, ly, 3, COL.series(1));
    d.text(lx + 6, ly + 4, lastLabel, { tone: "ink", weight: 600 });
    d.text(0, sy0 + sh + 14, periodText(c, pts[0]!.x, "short"), { tone: "muted" });
    pts.forEach((q, i) => {
      stops.push({
        x: px(i),
        y: py(q.y!),
        title: periodText(c, q.x),
        rows: [{ label: m.s?.label ?? "", value: fmtVal(q.y, u, c.lang), color: COL.series(1) }],
        guide: [px(i), sy0 - 2, px(i), sy0 + sh + 2],
        dots: [{ x: px(i), y: py(q.y!), color: COL.series(1) }],
      });
    });
    y = sy0 + sh + 18;
  }
  if (m.target && m.last) {
    const ty = y + 12;
    const bh = 10;
    const max = Math.max(m.target.value, m.last.y, 0) || 1;
    const sx = (v: number) => (Math.max(0, v) / max) * w;
    d.rect(0, ty, w, bh, COL.muted, { rx: 2 });
    d.bar(0, ty, sx(m.last.y), bh, COL.series(1), "right");
    const tx = Math.min(w - 1, sx(m.target.value));
    d.line(tx, ty - 4, tx, ty + bh + 4, COL.ink, 2);
    const left = `${m.target.label}: ${fmtVal(m.target.value, u, c.lang)}`;
    const gap = m.target.value - m.last.y;
    const pp = fmtVal(Math.abs(gap), { ...u, symbol: u.isRate ? "pp" : u.symbol }, c.lang);
    const right = gap > 0 ? (pl ? `do celu brakuje ${pp}` : `${pp} to go`) : pl ? `powyżej celu o ${pp}` : `${pp} above target`;
    d.text(0, ty + bh + 18, fitText(left, 11, w / 2 - 4), { tone: "ink-2" });
    d.text(w, ty + bh + 18, right, { tone: "ink-2", anchor: "end" });
    if (!stops.length)
      stops.push({
        x: sx(m.last.y),
        y: ty + bh / 2,
        title: periodText(c, m.last.x),
        rows: [...baseRows(), { label: m.target.label, value: fmtVal(m.target.value, u, c.lang), color: COL.ink }],
        band: [0, 0, w, ty + bh + 24],
      });
    y = ty + bh + 26;
  }
  if (!stops.length && m.last)
    stops.push({
      x: Math.min(w, textWidth(value, size, 600)),
      y: 18 + size / 2,
      title: periodText(c, m.last.x),
      rows: baseRows(),
      band: [0, 0, w, y + 6],
    });
  return { height: Math.max(y + 6, 64), els: d.els, stops, pick: stops.length > 1 ? "x" : "xy", initial: "last" };
}

// ---------- sparkline

export function drawSparkline(c: Ctx): Scene {
  const { d } = c;
  const s = c.p.series[0];
  const u = s?.unit ?? c.unit;
  const pts = (s?.points ?? []).filter((q): q is { x: string; y: number } => q.y !== null && Number.isFinite(q.y));
  const height = c.p.height ? Math.min(c.p.height, 120) : c.phone ? 64 : 72;
  const cols = c.p.opts?.mode === "columns";
  const last = pts[pts.length - 1];
  const lastLabel = last ? fmtVal(last.y, u, c.lang) : "";
  const x1 = c.W - textWidth(lastLabel, 12, 600) - 10;
  const y0 = 8;
  const y1 = height - 8;
  const vals = pts.map((q) => q.y);
  let [lo, hi] = extent(vals);
  if (cols) {
    lo = Math.min(0, lo);
    hi = Math.max(0, hi);
  }
  const sy = (v: number) => y1 - ((v - lo) / (hi - lo || 1)) * (y1 - y0);
  const n = pts.length;
  const stops: Stop[] = [];
  if (cols) {
    const step = x1 / Math.max(1, n);
    const bw = Math.max(1, step * 0.72);
    const zero = sy(0);
    d.line(0, zero, x1, zero, COL.referenceLight, 1);
    pts.forEach((q, i) => {
      const x = i * step + (step - bw) / 2;
      const top = Math.min(zero, sy(q.y));
      const color = q.y < 0 ? COL.negative : COL.positive;
      d.bar(x, top, bw, Math.max(q.y === 0 ? 0 : 1, Math.abs(sy(q.y) - zero)), color, q.y < 0 ? "bottom" : "top", 1);
      stops.push({
        x: x + bw / 2,
        y: top,
        title: periodText(c, q.x),
        rows: [{ label: s?.label ?? "", value: fmtVal(q.y, u, c.lang), color }],
        band: [i * step, y0 - 4, step, y1 - y0 + 8],
      });
    });
    if (last) d.text(x1 + 6, Math.max(y0 + 8, Math.min(y1, sy(last.y) + 4)), lastLabel, { tone: "ink", weight: 600, size: 12 });
  } else {
    const px = (i: number) => (n > 1 ? (i / (n - 1)) * x1 : x1);
    d.path(linePath(pts.map((q, i) => ({ x: px(i), y: sy(q.y) }))), COL.series(1), 1.75);
    if (last) {
      d.circle(px(n - 1), sy(last.y), 3, COL.series(1));
      d.text(px(n - 1) + 7, Math.max(y0 + 8, Math.min(y1, sy(last.y) + 4)), lastLabel, { tone: "ink", weight: 600, size: 12 });
    }
    pts.forEach((q, i) =>
      stops.push({
        x: px(i),
        y: sy(q.y),
        title: periodText(c, q.x),
        rows: [{ label: s?.label ?? "", value: fmtVal(q.y, u, c.lang), color: COL.series(1) }],
        guide: [px(i), y0 - 4, px(i), y1 + 4],
        dots: [{ x: px(i), y: sy(q.y), color: COL.series(1) }],
      }),
    );
  }
  return { height, els: d.els, stops, pick: "x", initial: "last" };
}

// ---------- table

export type TableRow = { key: string; label: string; kind: "row" | "group"; depth: number; values: (number | null)[] };

/**
 * Rows of the value table: one per category (x key), one value per series. With opts.hierarchy and categories that
 * name a `group`, every group gets a header row first, with the subtotal of its rows (counts only: rates are
 * never summed, the group row then stays empty).
 */
export function tableRows(p: ZChartProps): TableRow[] {
  const keys = xKeys(p);
  const row = (k: string, depth: number): TableRow => ({
    key: k,
    label: catLabel(p, k),
    kind: "row",
    depth,
    values: p.series.map((s) => valueAt(s, k)),
  });
  const cats = new Map((p.categories ?? []).map((k) => [k.key, k]));
  if (!p.opts?.hierarchy || !keys.some((k) => cats.get(k)?.group)) return keys.map((k) => row(k, 0));
  const out: TableRow[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const g = cats.get(k)?.group;
    if (!g) {
      out.push(row(k, 0));
      continue;
    }
    if (seen.has(g)) continue;
    seen.add(g);
    const members = keys.filter((m) => cats.get(m)?.group === g);
    const values = p.series.map((s) => {
      if (p.unit.isRate || (s.unit && s.unit.isRate)) return null;
      const vs = members.map((m) => valueAt(s, m)).filter((v): v is number => v !== null);
      return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
    });
    out.push({ key: g, label: cats.get(g)?.label ?? g, kind: "group", depth: 0, values });
    for (const m of members) out.push(row(m, 1));
  }
  return out;
}

export function drawTable(c: Ctx): Scene {
  const { d } = c;
  const pl = c.lang === "pl";
  const mode = c.p.opts?.cells ?? "plain";
  const series = c.p.series;
  const rows = tableRows(c.p);
  const fmt = (v: number | null, s: ZSeries) => fmtNum(v, c.lang, (s.unit ?? c.unit).decimals);
  const labels = rows.map((rw) => rw.label);
  const nameW = Math.min(
    c.W * (c.phone ? 0.36 : 0.32),
    Math.max(textWidth(pl ? "Kategoria" : "Category", 11), ...labels.map((l) => textWidth(l, 12) + 14)),
  );
  const sparkW = mode === "spark" ? (c.phone ? 56 : Math.min(120, c.W * 0.18)) : 0;
  const x0 = nameW + 12;
  const colW = (c.W - x0 - (sparkW ? sparkW + 12 : 0)) / Math.max(1, series.length);
  const rowH = 28;
  const head = 30;
  // heat: one 4-class ramp over every row value; bars: one scale per column
  const cells = rows.filter((rw) => rw.kind === "row").flatMap((rw) => rw.values.filter((v): v is number => v !== null));
  const breaks = mode === "heat" ? breaksFor(c.p, cells, 4) : [];
  const ramp = rampColors(4);
  const colMax = series.map((_, j) => Math.max(0, ...rows.filter((rw) => rw.kind === "row").map((rw) => Math.abs(rw.values[j] ?? 0))));
  d.text(0, 18, pl ? "Kategoria" : "Category", { weight: 500 });
  series.forEach((s, j) => d.text(x0 + (j + 1) * colW - 8, 18, fitText(s.label, 11, colW - 10, 500), { anchor: "end", weight: 500 }));
  if (sparkW) d.text(c.W - sparkW, 18, pl ? "Trend" : "Trend", { weight: 500 });
  d.line(0, head, c.W, head, COL.lineStrong, 1);
  const stops: Stop[] = [];
  rows.forEach((rw, i) => {
    const y = head + i * rowH;
    const mid = y + rowH / 2 + 4;
    const group = rw.kind === "group";
    const bold = group || rw.key === c.p.highlight;
    if (group) d.rect(0, y, c.W, rowH, COL.sunken);
    const room = group ? x0 + colW - textWidth(fmt(rw.values[0] ?? null, series[0]!), 12, 600) - 20 : nameW - rw.depth * 14;
    d.text(rw.depth * 14, mid, fitText(rw.label, 12, room, bold ? 600 : 400), { tone: "ink", size: 12, weight: bold ? 600 : 400 });
    const tipRows = series.map((s, j) => {
      const v = rw.values[j] ?? null;
      const cx = x0 + j * colW;
      let tone: Tone = "ink";
      let color: string | undefined;
      if (mode === "heat" && v !== null && !group) {
        const k = classOf(v, breaks);
        color = ramp[k];
        d.rect(cx + 2, y + 2, colW - 4, rowH - 4, color!, { rx: 2 });
        if (k >= 2) tone = "inverse";
      }
      const txt = fmt(v, s);
      if (mode === "bars" && v !== null && !group && colMax[j]! > 0) {
        const room = Math.max(8, colW - textWidth(txt, 12, 600) - 20);
        color = v < 0 ? COL.negative : COL.series(1);
        d.bar(cx + 6, y + rowH / 2 - 5, (Math.abs(v) / colMax[j]!) * room, 10, color, "right");
      }
      numText(c, cx + colW - 8, mid, txt, { tone, weight: bold ? 600 : 400 });
      return { label: s.label, value: v === null ? "–" : fmtVal(v, s.unit ?? c.unit, c.lang), color };
    });
    if (sparkW && !group) {
      const vals = rw.values;
      const [lo, hi] = extent(vals);
      const sx0 = c.W - sparkW;
      const n = Math.max(1, vals.length - 1);
      const pts = vals.map((v, k) =>
        v === null ? null : { x: sx0 + (k / n) * (sparkW - 6), y: y + rowH - 7 - ((v - lo) / (hi - lo || 1)) * (rowH - 14) },
      );
      d.path(linePath(pts), COL.series(1), 1.5);
      const lastPt = [...pts].reverse().find(Boolean);
      if (lastPt) d.circle(lastPt.x, lastPt.y, 2.5, COL.series(1), false);
    }
    d.line(0, y + rowH, c.W, y + rowH, COL.line, 1);
    stops.push({
      x: x0 + series.length * colW - 8,
      y: y + rowH / 2,
      title: group ? `${rw.label} (${pl ? "razem" : "total"})` : rw.label,
      rows: tipRows,
      band: [0, y, c.W, rowH],
    });
  });
  return { height: head + rows.length * rowH + 2, els: d.els, stops, pick: "y" };
}

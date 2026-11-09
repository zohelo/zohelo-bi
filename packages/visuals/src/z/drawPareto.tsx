// Pareto chart (chart catalogue 2026-11-09, docs/chart-catalogue.md: FT "ordered column" with a cumulative line,
// Data Viz Project "Pareto Chart"). Parts of one whole from the largest, as shares, with the cumulative share as a
// line on the same 0–100 % axis: never a second axis. Additive measures only (the explorer locks it otherwise).

import { fitText, fmtNum, fmtVal, textWidth } from "./format";
import { COL, PCT_UNIT, catLabel, drawYAxis, linePath, makeYAxis, valueAt, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import type { ZChartProps } from "./types";

export type ParetoRow = { key: string; label: string; value: number; share: number; cumulative: number };

/** Parts of series[0] from the largest (or in key order with opts.sort "data"), their share and cumulative share. */
export function paretoRows(p: ZChartProps): ParetoRow[] {
  const s = p.series[0];
  const keys = xKeys(p, s ? [s] : []).filter((k) => (valueAt(s, k) ?? 0) > 0);
  const sorted = p.opts?.sort === "data" ? keys : keys.slice().sort((a, b) => (valueAt(s, b) ?? 0) - (valueAt(s, a) ?? 0));
  const total = sorted.reduce((a, k) => a + (valueAt(s, k) ?? 0), 0) || 1;
  let acc = 0;
  return sorted.map((key) => {
    const value = valueAt(s, key) ?? 0;
    const share = (value / total) * 100;
    acc += share;
    return { key, label: catLabel(p, key), value, share, cumulative: Math.min(100, acc) };
  });
}

export function drawPareto(c: Ctx): Scene {
  const { d } = c;
  const rows = paretoRows(c.p);
  const pl = c.lang === "pl";
  const ticks = { values: c.phone ? [0, 50, 100] : [0, 25, 50, 75, 100], step: 25, min: 0, max: 100 };
  const y0 = 18;
  const y1 = c.H - 28;
  const pc = { ...c, unit: PCT_UNIT };
  const ax = makeYAxis(pc, ticks, y0, y1);
  const x0 = Math.ceil(ax.labelW + 10);
  const x1 = c.W - 8;
  drawYAxis(pc, ax, x0, x1);
  const n = Math.max(1, rows.length);
  const step = (x1 - x0) / n;
  const bw = Math.max(3, Math.min(step * 0.68, 56));
  const cx = (i: number) => x0 + step * (i + 0.5);
  // The 80 % line: the Pareto reading aid ("how many parts make four fifths").
  const y80 = ax.sy(80);
  d.line(x0, y80, x1, y80, COL.reference, 1, "4 3");
  d.text(x1, y80 - 5, "80%", { anchor: "end", tone: "ink-2" });
  rows.forEach((rw, i) => d.bar(cx(i) - bw / 2, ax.sy(rw.share), bw, ax.sy(0) - ax.sy(rw.share), COL.series(1), "top"));
  const pts = rows.map((rw, i) => ({ x: cx(i), y: ax.sy(rw.cumulative) }));
  d.path(linePath(pts), COL.ink, 2);
  // Cumulative labels where they fit; always the first point past 80 % and the last one.
  const first80 = rows.findIndex((rw) => rw.cumulative >= 80);
  const lw = Math.max(0, ...rows.map((rw) => textWidth(`${fmtNum(rw.cumulative, c.lang, 0)}%`, 11, 600)));
  const every = Math.max(1, Math.ceil((lw + 6) / step));
  pts.forEach((pt, i) => {
    d.circle(pt.x, pt.y, 3.5, COL.ink);
    if (i % every === 0 || i === first80 || i === rows.length - 1) {
      const t = `${fmtNum(rows[i]!.cumulative, c.lang, 0)}%`;
      const half = textWidth(t, 11, 600) / 2;
      d.text(Math.min(Math.max(pt.x, x0 + half), x1 - half), pt.y - 8, t, {
        anchor: "middle",
        tone: "ink",
        weight: i === first80 ? 600 : 400,
      });
    }
  });
  // Category labels, thinned; short forms when the full ones do not fit.
  const labels = rows.map((rw) =>
    textWidth(rw.label, 11) <= step - 4 ? rw.label : fitText(catLabel(c.p, rw.key, true), 11, step * every - 4),
  );
  rows.forEach((_, i) => {
    if ((rows.length - 1 - i) % every === 0) d.text(cx(i), c.H - 8, labels[i]!, { anchor: "middle", tone: "ink-2" });
  });
  const stops: Stop[] = rows.map((rw, i) => ({
    x: cx(i),
    y: ax.sy(rw.cumulative),
    title: rw.label,
    rows: [
      { label: c.p.series[0]?.label ?? "", value: fmtVal(rw.value, c.unit, c.lang), color: COL.series(1) },
      { label: pl ? "Udział" : "Share", value: `${fmtNum(rw.share, c.lang, 1)}%` },
      { label: pl ? "Narastająco" : "Cumulative", value: `${fmtNum(rw.cumulative, c.lang, 1)}%`, color: COL.ink },
    ],
    band: [cx(i) - step / 2, y0 - 8, step, y1 - y0 + 8] as [number, number, number, number],
  }));
  return { height: c.H, els: d.els, stops, pick: "x" };
}

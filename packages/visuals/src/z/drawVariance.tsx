// Business variance charts (milestone 6, owner review 2026-11-05: "zebra-bi style, ibcs style"):
//   ibcs-columns      IBCS notation over time: AC solid dark, PY grey behind, PL outlined, FC hatched; absolute ΔPY
//                     bars and relative ΔPY% pins in their own rows above (one chart, three aligned rows)
//   ibcs-bars         IBCS structure: AC vs PY per category (horizontal), absolute ΔPY beside
//   variance-columns  integrated variance (Zebra BI pattern): the part between PY and AC coloured on each column,
//                     ΔPY% pins below
//   variance-bars     integrated variance per category with ΔPY% pins beside
//   bridge            calculation waterfall from PY through drivers to AC
// Colour of a variance follows `polarity` (favourable / unfavourable, IBCS green/red) or is neutral; the sign and
// the number are always printed, so colour is never the only cue. Data labels replace the value axis (IBCS).

import { fitText, fmtNum, fmtSigned, fmtVal, textWidth } from "./format";
import { extent, linear } from "./scale";
import { COL, catLabel, defId, valueAt, varianceColor, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import { xLabel } from "./drawMore";
import type { ZSeries } from "./types";

type Scen = { ac?: ZSeries; py?: ZSeries; pl?: ZSeries; fc?: ZSeries };

function scenarios(series: ZSeries[]): Scen {
  const by = (id: string) => series.find((s) => s.id.toUpperCase() === id);
  return { ac: by("AC"), py: by("PY"), pl: by("PL"), fc: by("FC") };
}

/** Actual or, where the actual is missing, forecast value of x (and whether it is a forecast). */
function actual(sc: Scen, x: string): { v: number | null; fc: boolean } {
  const a = valueAt(sc.ac, x);
  if (a !== null) return { v: a, fc: false };
  const f = valueAt(sc.fc, x);
  return { v: f, fc: f !== null };
}

function pct(d: number, base: number | null): number | null {
  return base === null || base === 0 ? null : (d / Math.abs(base)) * 100;
}

/** A hatch pattern for forecast marks (IBCS: FC hatched). Returns the fill url. */
function hatch(c: Ctx): string {
  const id = defId("zc-fc");
  c.d.add((key) => (
    <defs key={key}>
      <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill={COL.surface} />
        <line x1="0" y1="0" x2="0" y2="5" stroke={COL.ac} strokeWidth="2.2" />
      </pattern>
    </defs>
  ));
  return `url(#${id})`;
}

const LABEL_W = 44;

/** Row label at the left of a stacked chart row ("ΔPY", "ΔPY%", "AC"). */
function rowTag(c: Ctx, y: number, text: string) {
  c.d.text(0, y, text, { tone: "ink-3", weight: 600 });
}

// ---------- shared column layout

type Cols = { xs: string[]; step: number; cx: (i: number) => number; x0: number; x1: number };

function columns(c: Ctx, xs: string[]): Cols {
  const x0 = c.phone ? 34 : LABEL_W;
  const x1 = c.W - 4;
  const step = (x1 - x0) / Math.max(1, xs.length);
  return { xs, step, cx: (i) => x0 + step * (i + 0.5), x0, x1 };
}

function xAxisLabels(c: Ctx, k: Cols, y: number) {
  const every = Math.max(1, Math.ceil(k.xs.length / Math.max(1, Math.floor((k.x1 - k.x0) / (c.phone ? 44 : 54)))));
  k.xs.forEach((x, i) => {
    if ((k.xs.length - 1 - i) % every) return;
    const full = xLabel(c, x);
    const l = textWidth(full, 11) <= k.step * every - 4 ? full : fitText(xLabel(c, x, true), 11, k.step * every - 4);
    c.d.text(k.cx(i), y, l, { anchor: "middle", tone: "ink-2" });
  });
}

/** Relative variance pins in a band [top, top+h]: stem from the zero line, a square head, the % label. */
function pinRow(c: Ctx, k: Cols, vals: (number | null)[], deltas: (number | null)[], top: number, h: number, labels: boolean) {
  const max = Math.max(1e-9, ...vals.map((v) => Math.abs(v ?? 0)));
  const mid = top + h / 2;
  const sy = (v: number) => mid - (v / max) * (h / 2 - 12);
  c.d.line(k.x0, mid, k.x1, mid, COL.reference, 1);
  vals.forEach((v, i) => {
    if (v === null) return;
    const x = k.cx(i);
    const col = varianceColor(deltas[i] ?? v, c.p.polarity);
    c.d.line(x, mid, x, sy(v), col, 2);
    c.d.rect(x - 4, sy(v) - 4, 8, 8, col);
    if (labels) c.d.text(x, v >= 0 ? sy(v) - 8 : sy(v) + 16, `${fmtSigned(v, c.lang, 1)}%`, { anchor: "middle", tone: "ink" });
  });
}

/** Absolute variance bars in a band, around a zero line. */
function deltaRow(c: Ctx, k: Cols, deltas: (number | null)[], top: number, h: number, bw: number, labels: boolean) {
  const max = Math.max(1e-9, ...deltas.map((v) => Math.abs(v ?? 0)));
  const mid = top + h / 2;
  const sy = (v: number) => mid - (v / max) * (h / 2 - 12);
  c.d.line(k.x0, mid, k.x1, mid, COL.reference, 1);
  deltas.forEach((d, i) => {
    if (d === null) return;
    const x = k.cx(i);
    const y = sy(d);
    c.d.rect(x - bw / 2, Math.min(y, mid), bw, Math.max(1, Math.abs(mid - y)), varianceColor(d, c.p.polarity));
    if (labels) c.d.text(x, d >= 0 ? y - 5 : y + 14, fmtSigned(d, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink" });
  });
}

function varianceRows(c: Ctx, label: string, sc: Scen, x: string) {
  const pl = c.lang === "pl";
  const a = actual(sc, x);
  const py = valueAt(sc.py, x);
  const d = a.v !== null && py !== null ? a.v - py : null;
  const p = d !== null ? pct(d, py) : null;
  return [
    { label: a.fc ? (pl ? "FC (prognoza)" : "FC (forecast)") : `AC ${label}`, value: fmtVal(a.v, c.unit, c.lang), color: COL.ac },
    { label: pl ? "PY (rok wcześniej)" : "PY (previous year)", value: fmtVal(py, c.unit, c.lang), color: COL.py },
    ...(sc.pl ? [{ label: pl ? "PL (plan)" : "PL (plan)", value: fmtVal(valueAt(sc.pl, x), c.unit, c.lang) }] : []),
    {
      label: "ΔPY",
      value: d === null ? "–" : fmtSigned(d, c.lang, c.unit.decimals),
      color: d === null ? undefined : varianceColor(d, c.p.polarity),
    },
    { label: "ΔPY%", value: p === null ? "–" : `${fmtSigned(p, c.lang, 1)}%` },
  ];
}

// ---------- ibcs-columns

export function drawIbcsColumns(c: Ctx): Scene {
  const sc = scenarios(c.p.series);
  const xs = xKeys(
    c.p,
    [sc.ac, sc.py, sc.fc, sc.pl].filter((s): s is ZSeries => !!s),
  );
  const k = columns(c, xs);
  const labels = xs.length <= (c.phone ? 8 : 16);
  const pinH = 64;
  const dH = 72;
  const mainTop = pinH + dH + 18;
  const mainH = Math.max(150, c.H - 40);
  const height = mainTop + mainH + 26;
  const fcFill = sc.fc ? hatch(c) : "";
  const acts = xs.map((x) => actual(sc, x));
  const pys = xs.map((x) => valueAt(sc.py, x));
  const deltas = xs.map((_, i) => {
    const a = acts[i]!.v;
    const p = pys[i] ?? null;
    return a !== null && p !== null ? a - p : null;
  });
  const pcts = deltas.map((d, i) => (d === null ? null : pct(d, pys[i] ?? null)));
  rowTag(c, 14, "ΔPY%");
  pinRow(c, k, pcts, deltas, 4, pinH, labels);
  rowTag(c, pinH + 18, "ΔPY");
  deltaRow(c, k, deltas, pinH + 6, dH, Math.max(3, Math.min(k.step * 0.5, 30)), labels);
  rowTag(c, mainTop + 12, "AC");
  const [, hi] = extent([...acts.map((a) => a.v), ...pys, ...xs.map((x) => valueAt(sc.pl, x))]);
  const base = mainTop + mainH;
  const sy = linear(0, Math.max(hi, 1e-9) * 1.12, base, mainTop + 14);
  const bw = Math.max(4, Math.min(k.step * 0.56, 44));
  const off = bw * 0.28;
  xs.forEach((x, i) => {
    const cx = k.cx(i);
    const py = pys[i] ?? null;
    if (py !== null && py > 0) c.d.rect(cx - bw / 2 - off, sy(py), bw, base - sy(py), COL.py);
    const a = acts[i]!;
    if (a.v !== null && a.v > 0) {
      if (a.fc) c.d.rect(cx - bw / 2 + off, sy(a.v), bw, base - sy(a.v), fcFill, { stroke: COL.ac, sw: 1.2 });
      else c.d.rect(cx - bw / 2 + off, sy(a.v), bw, base - sy(a.v), COL.ac);
      if (labels) c.d.text(cx + off, sy(a.v) - 5, fmtNum(a.v, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
    }
    const pv = valueAt(sc.pl, x);
    if (pv !== null && pv > 0) c.d.rect(cx - bw / 2 + off, sy(pv), bw, base - sy(pv), "none", { stroke: COL.ink, sw: 1.5 });
  });
  c.d.line(k.x0, base, k.x1, base, COL.ink, 1.5);
  xAxisLabels(c, k, height - 8);
  const stops: Stop[] = xs.map((x, i) => ({
    x: k.cx(i),
    y: sy(Math.max(acts[i]!.v ?? 0, pys[i] ?? 0)),
    title: xLabel(c, x),
    rows: varianceRows(c, "", sc, x),
    band: [k.cx(i) - k.step / 2, 0, k.step, height - 20],
  }));
  return { height, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- variance-columns (integrated variance)

export function drawVarianceColumns(c: Ctx): Scene {
  const sc = scenarios(c.p.series);
  const xs = xKeys(
    c.p,
    [sc.ac, sc.py].filter((s): s is ZSeries => !!s),
  );
  const k = columns(c, xs);
  const labels = xs.length <= (c.phone ? 8 : 16);
  const mainH = Math.max(170, c.H - 30);
  const pinTop = mainH + 32;
  const pinH = 70;
  const height = pinTop + pinH + 22;
  const acs = xs.map((x) => valueAt(sc.ac, x));
  const pys = xs.map((x) => valueAt(sc.py, x));
  const deltas = xs.map((_, i) => {
    const a = acs[i] ?? null;
    const p = pys[i] ?? null;
    return a !== null && p !== null ? a - p : null;
  });
  const pcts = deltas.map((d, i) => (d === null ? null : pct(d, pys[i] ?? null)));
  const [, hi] = extent([...acs, ...pys]);
  const base = mainH;
  const sy = linear(0, Math.max(hi, 1e-9) * 1.14, base, 18);
  const bw = Math.max(5, Math.min(k.step * 0.62, 48));
  rowTag(c, 14, "AC");
  xs.forEach((_, i) => {
    const cx = k.cx(i);
    const a = acs[i] ?? null;
    const p = pys[i] ?? null;
    if (a === null) return;
    const lo = p === null ? a : Math.min(a, p);
    c.d.rect(cx - bw / 2, sy(Math.max(0, lo)), bw, base - sy(Math.max(0, lo)), COL.ac);
    if (p !== null && Math.abs(a - p) > 1e-9) {
      const d = a - p;
      const col = varianceColor(d, c.p.polarity);
      if (d > 0) c.d.rect(cx - bw / 2, sy(a), bw, sy(p) - sy(a), col);
      else c.d.rect(cx - bw / 2 + 1, sy(p), bw - 2, sy(a) - sy(p), COL.surface, { stroke: col, sw: 1.5, dash: "3 2" });
      c.d.line(cx - bw / 2 - 3, sy(p), cx + bw / 2 + 3, sy(p), COL.ink, 1.5);
    }
    if (labels)
      c.d.text(cx, sy(Math.max(a, p ?? a)) - 6, fmtNum(a, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
  });
  c.d.line(k.x0, base, k.x1, base, COL.ink, 1.5);
  xAxisLabels(c, k, base + 16);
  rowTag(c, pinTop + 12, "ΔPY%");
  pinRow(c, k, pcts, deltas, pinTop, pinH, labels);
  const stops: Stop[] = xs.map((x, i) => ({
    x: k.cx(i),
    y: sy(Math.max(acs[i] ?? 0, pys[i] ?? 0)),
    title: xLabel(c, x),
    rows: varianceRows(c, "", sc, x),
    band: [k.cx(i) - k.step / 2, 0, k.step, height - 4],
  }));
  return { height, els: c.d.els, stops, pick: "x", initial: "last" };
}

// ---------- shared bar (row) layout

function rowsOf(c: Ctx, sc: Scen) {
  const keys = xKeys(
    c.p,
    [sc.ac, sc.py].filter((s): s is ZSeries => !!s),
  ).sort((a, b) => (valueAt(sc.ac, b) ?? -Infinity) - (valueAt(sc.ac, a) ?? -Infinity));
  const max = c.W * (c.phone ? 0.3 : 0.22);
  const nm = keys.map((key) => fitText(textWidth(catLabel(c.p, key), 11) > max ? catLabel(c.p, key, true) : catLabel(c.p, key), 11, max));
  const nameW = Math.ceil(Math.min(max, Math.max(0, ...nm.map((l) => textWidth(l, 11)))));
  const acs = keys.map((x) => valueAt(sc.ac, x));
  const pys = keys.map((x) => valueAt(sc.py, x));
  const deltas = keys.map((_, i) => {
    const a = acs[i] ?? null;
    const p = pys[i] ?? null;
    return a !== null && p !== null ? a - p : null;
  });
  const pcts = deltas.map((d, i) => (d === null ? null : pct(d, pys[i] ?? null)));
  return { keys, nm, nameW, acs, pys, deltas, pcts };
}

// ---------- ibcs-bars

export function drawIbcsBars(c: Ctx): Scene {
  const sc = scenarios(c.p.series);
  const { keys, nm, nameW, acs, pys, deltas, pcts } = rowsOf(c, sc);
  const rowH = c.phone ? 30 : 28;
  const head = 20;
  const pl = c.lang === "pl";
  const valLabels = acs.map((v) => fmtNum(v, c.lang, c.unit.decimals));
  const valW = Math.max(...valLabels.map((l) => textWidth(l, 11, 600)), 20);
  const xA = nameW + 10;
  const dW = c.phone ? c.W * 0.3 : c.W * 0.24;
  const pW = c.phone ? 0 : c.W * 0.16;
  const aEnd = c.W - dW - pW - valW - 16;
  const [, hi] = extent([...acs, ...pys]);
  const sx = linear(0, Math.max(hi, 1e-9), xA, aEnd);
  const dMid = aEnd + valW + 12 + dW / 2;
  const dMax = Math.max(1e-9, ...deltas.map((d) => Math.abs(d ?? 0)));
  const dLab = Math.max(...deltas.map((d) => (d === null ? 0 : textWidth(fmtSigned(d, c.lang, c.unit.decimals), 11))));
  const dx = (d: number) => (d / dMax) * (dW / 2 - dLab - 6);
  const pMid = c.W - pW / 2;
  const pMax = Math.max(1e-9, ...pcts.map((p) => Math.abs(p ?? 0)));
  const px = (p: number) => (p / pMax) * (pW / 2 - 34);
  c.d.text(xA, 13, "AC · PY", { tone: "ink-3", weight: 600 });
  c.d.text(dMid, 13, "ΔPY", { tone: "ink-3", weight: 600, anchor: "middle" });
  if (pW) c.d.text(pMid, 13, "ΔPY%", { tone: "ink-3", weight: 600, anchor: "middle" });
  const yEnd = head + keys.length * rowH;
  c.d.line(xA, head - 2, xA, yEnd, COL.ink, 1.5);
  c.d.line(dMid, head - 2, dMid, yEnd, COL.ink, 1.5);
  if (pW) c.d.line(pMid, head - 2, pMid, yEnd, COL.ink, 1.5);
  const stops: Stop[] = [];
  keys.forEach((key, i) => {
    const y = head + i * rowH;
    const mid = y + rowH / 2;
    c.d.text(xA - 8, mid + 4, nm[i]!, { anchor: "end", tone: "ink" });
    const p = pys[i] ?? null;
    const a = acs[i] ?? null;
    const bh = rowH - 12;
    if (p !== null && p > 0) c.d.rect(xA, y + 3, sx(p) - xA, bh, COL.py);
    if (a !== null && a > 0) {
      c.d.rect(xA, y + 9, sx(a) - xA, bh, COL.ac);
      c.d.text(sx(Math.max(a, p ?? 0)) + 6, mid + 6, valLabels[i]!, { tone: "ink", weight: 600 });
    }
    const d = deltas[i] ?? null;
    if (d !== null) {
      const w = dx(d);
      c.d.rect(Math.min(dMid, dMid + w), y + 6, Math.max(1, Math.abs(w)), rowH - 12, varianceColor(d, c.p.polarity));
      c.d.text(dMid + w + (d >= 0 ? 5 : -5), mid + 4, fmtSigned(d, c.lang, c.unit.decimals), {
        anchor: d >= 0 ? "start" : "end",
        tone: "ink",
      });
    }
    const pc = pcts[i] ?? null;
    if (pW && pc !== null && d !== null) {
      const w = px(pc);
      const col = varianceColor(d, c.p.polarity);
      c.d.line(pMid, mid, pMid + w, mid, col, 2);
      c.d.rect(pMid + w - 4, mid - 4, 8, 8, col);
      c.d.text(pMid + w + (pc >= 0 ? 8 : -8), mid + 4, `${fmtSigned(pc, c.lang, 1)}%`, { anchor: pc >= 0 ? "start" : "end", tone: "ink" });
    }
    stops.push({ x: sx(a ?? 0), y: mid, title: catLabel(c.p, key), rows: varianceRows(c, "", sc, key), band: [0, y, c.W, rowH] });
  });
  if (!keys.length) c.d.text(0, head + 16, pl ? "Brak danych" : "No data", { tone: "ink-3" });
  return { height: yEnd + 6, els: c.d.els, stops, pick: "y" };
}

// ---------- variance-bars (integrated)

export function drawVarianceBars(c: Ctx): Scene {
  const sc = scenarios(c.p.series);
  const { keys, nm, nameW, acs, pys, deltas, pcts } = rowsOf(c, sc);
  const rowH = c.phone ? 30 : 28;
  const head = 20;
  const valLabels = acs.map((v) => fmtNum(v, c.lang, c.unit.decimals));
  const valW = Math.max(...valLabels.map((l) => textWidth(l, 11, 600)), 20);
  const xA = nameW + 10;
  const pW = c.phone ? c.W * 0.32 : c.W * 0.26;
  const aEnd = c.W - pW - valW - 18;
  const [, hi] = extent([...acs, ...pys]);
  const sx = linear(0, Math.max(hi, 1e-9), xA, aEnd);
  const pMid = c.W - pW / 2;
  const pMax = Math.max(1e-9, ...pcts.map((p) => Math.abs(p ?? 0)));
  const px = (p: number) => (p / pMax) * (pW / 2 - 36);
  c.d.text(xA, 13, "AC", { tone: "ink-3", weight: 600 });
  c.d.text(pMid, 13, "ΔPY%", { tone: "ink-3", weight: 600, anchor: "middle" });
  const yEnd = head + keys.length * rowH;
  c.d.line(xA, head - 2, xA, yEnd, COL.ink, 1.5);
  c.d.line(pMid, head - 2, pMid, yEnd, COL.ink, 1.5);
  const stops: Stop[] = [];
  keys.forEach((key, i) => {
    const y = head + i * rowH;
    const mid = y + rowH / 2;
    const bh = rowH - 10;
    c.d.text(xA - 8, mid + 4, nm[i]!, { anchor: "end", tone: "ink" });
    const a = acs[i] ?? null;
    const p = pys[i] ?? null;
    const d = deltas[i] ?? null;
    if (a !== null && a > 0) {
      const lo = p === null ? a : Math.min(a, p);
      c.d.rect(xA, y + 5, sx(lo) - xA, bh, COL.ac);
      if (d !== null && p !== null && Math.abs(d) > 1e-9) {
        const col = varianceColor(d, c.p.polarity);
        if (d > 0) c.d.rect(sx(p), y + 5, sx(a) - sx(p), bh, col);
        else c.d.rect(sx(a), y + 6, sx(p) - sx(a), bh - 2, COL.surface, { stroke: col, sw: 1.5, dash: "3 2" });
        c.d.line(sx(p), y + 2, sx(p), y + rowH - 2, COL.ink, 1.5);
      }
      c.d.text(sx(Math.max(a, p ?? 0)) + 6, mid + 4, valLabels[i]!, { tone: "ink", weight: 600 });
    }
    const pc = pcts[i] ?? null;
    if (pc !== null && d !== null) {
      const w = px(pc);
      const col = varianceColor(d, c.p.polarity);
      c.d.line(pMid, mid, pMid + w, mid, col, 2);
      c.d.rect(pMid + w - 4, mid - 4, 8, 8, col);
      c.d.text(pMid + w + (pc >= 0 ? 8 : -8), mid + 4, `${fmtSigned(pc, c.lang, 1)}%`, { anchor: pc >= 0 ? "start" : "end", tone: "ink" });
    }
    stops.push({ x: sx(a ?? 0), y: mid, title: catLabel(c.p, key), rows: varianceRows(c, "", sc, key), band: [0, y, c.W, rowH] });
  });
  return { height: yEnd + 6, els: c.d.els, stops, pick: "y" };
}

// ---------- bridge (calculation waterfall)

export function drawBridge(c: Ctx): Scene {
  const s = c.p.series[0];
  const keys = xKeys(c.p, s ? [s] : []);
  const pl = c.lang === "pl";
  const start = c.p.reference?.value ?? 0;
  const startLabel = c.p.reference?.label ?? "PY";
  const endLabel = c.p.totalLabel ?? "AC";
  const steps = keys.map((k) => valueAt(s, k) ?? 0);
  const levels: [number, number][] = [];
  let acc = start;
  for (const v of steps) {
    levels.push([acc, acc + v]);
    acc += v;
  }
  const end = acc;
  const all = [start, end, ...levels.flat()];
  const [lo, hi] = extent(all);
  // Bridges zoom on the change: the axis starts near the lowest level, marked by the base line, never hidden.
  const floor = lo > 0 && lo > (hi - lo) * 2 ? lo - (hi - lo) * 0.6 : Math.min(0, lo);
  const top = 22;
  const base = c.H - 28;
  const sy = linear(floor, hi + (hi - floor) * 0.08, base, top);
  const n = keys.length + 2;
  const x0 = 4;
  const step = (c.W - x0 - 4) / n;
  const bw = Math.min(step * 0.66, 64);
  const stops: Stop[] = [];
  const label = (text: string, i: number, strong: boolean, short?: string) => {
    const l = textWidth(text, 11) <= step - 4 ? text : fitText(short ?? text, 11, step - 2);
    c.d.text(x0 + step * (i + 0.5), c.H - 8, l, { anchor: "middle", tone: strong ? "ink" : "ink-2", weight: strong ? 600 : 400 });
  };
  const bar = (i: number, a: number, b: number, fill: string) => {
    const x = x0 + step * i + (step - bw) / 2;
    c.d.rect(x, sy(Math.max(a, b)), bw, Math.max(1, Math.abs(sy(a) - sy(b))), fill);
    return x;
  };
  const xs = bar(0, floor, start, COL.py);
  c.d.text(xs + bw / 2, sy(start) - 6, fmtNum(start, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
  label(startLabel, 0, true);
  stops.push({
    x: xs + bw / 2,
    y: sy(start),
    title: startLabel,
    rows: [{ label: startLabel, value: fmtVal(start, c.unit, c.lang), color: COL.py }],
  });
  levels.forEach(([a, b], i) => {
    const v = steps[i]!;
    const col = varianceColor(v, c.p.polarity);
    const x = bar(i + 1, a, b, col);
    c.d.line(x - (step - bw), sy(a), x, sy(a), COL.referenceLight, 1, "2 2");
    c.d.text(x + bw / 2, sy(Math.max(a, b)) - 6, fmtSigned(v, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink" });
    label(catLabel(c.p, keys[i]!), i + 1, false, catLabel(c.p, keys[i]!, true));
    stops.push({
      x: x + bw / 2,
      y: sy(Math.max(a, b)),
      title: catLabel(c.p, keys[i]!),
      rows: [
        { label: s?.label ?? "", value: fmtSigned(v, c.lang, c.unit.decimals), color: col },
        { label: pl ? "Narastająco" : "Running total", value: fmtVal(b, c.unit, c.lang) },
      ],
    });
  });
  const xe = bar(n - 1, floor, end, COL.ac);
  c.d.line(xe - (step - bw), sy(end), xe, sy(end), COL.referenceLight, 1, "2 2");
  c.d.text(xe + bw / 2, sy(end) - 6, fmtNum(end, c.lang, c.unit.decimals), { anchor: "middle", tone: "ink", weight: 600 });
  label(endLabel, n - 1, true);
  stops.push({
    x: xe + bw / 2,
    y: sy(end),
    title: endLabel,
    rows: [{ label: endLabel, value: fmtVal(end, c.unit, c.lang), color: COL.ac }],
  });
  c.d.line(x0, base, c.W - 4, base, COL.ink, 1.5);
  // A zoomed axis is a visible break: two slashes across the start and end bars (never a hidden break).
  if (floor > 0)
    for (const x of [xs, xe]) {
      const y = base - 12;
      c.d.rect(x - 2, y - 5, bw + 4, 8, COL.surface);
      c.d.line(x - 3, y + 1, x + bw + 3, y - 3, COL.ink, 1);
      c.d.line(x - 3, y + 5, x + bw + 3, y + 1, COL.ink, 1);
    }
  return { height: c.H, els: c.d.els, stops, pick: "x" };
}

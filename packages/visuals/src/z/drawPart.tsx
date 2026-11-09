// Chart library v2, part of a whole: pie / donut and waffle. One series, parts by x; colour follows the part's
// place in the key order (categories order), never its rank, and a folded remainder is always series-context.

import { fitText, fmtNum, fmtVal, textWidth } from "./format";
import { spread } from "./scale";
import { COL, catLabel, r, valueAt, xKeys, type Ctx, type Scene, type Stop } from "./scene";
import type { ZChartProps } from "./types";

// ---------- pie parts (shared with table.tsx)

export type PieItem = { key: string; label: string; value: number };
export type PiePart = PieItem & { share: number; color: string; folded: PieItem[] };

/** Most parts a pie draws; more fold into "Pozostałe" / "Other". */
export const PIE_MAX = 5;

/** Key of the part that several folded parts make up (never a data key). */
export const FOLDED_KEY = "__folded";

/** Label of the folded remainder. */
export function otherLabel(lang: "pl" | "en"): string {
  return lang === "pl" ? "Pozostałe" : "Other";
}

/**
 * Parts of the pie: positive values of series[0] in key order. With more than 5 parts the 4 largest stay and the
 * rest (with any part keyed "other") fold into one "Pozostałe" part drawn last in series-context.
 */
export function pieParts(p: ZChartProps): { parts: PiePart[]; total: number; all: PieItem[] } {
  const s = p.series[0];
  const all = xKeys(p, s ? [s] : [])
    .map((key) => ({ key, label: catLabel(p, key), value: Math.max(0, valueAt(s, key) ?? 0) }))
    .filter((a) => a.value > 0);
  const total = all.reduce((a, b) => a + b.value, 0);
  let kept = all.filter((a) => a.key !== "other");
  const folded = all.filter((a) => a.key === "other");
  if (kept.length + (folded.length ? 1 : 0) > PIE_MAX) {
    const top = new Set(
      kept
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, PIE_MAX - 1)
        .map((a) => a.key),
    );
    folded.push(...kept.filter((a) => !top.has(a.key)));
    folded.sort((a, b) => all.indexOf(a) - all.indexOf(b));
    kept = kept.filter((a) => top.has(a.key));
  }
  const share = (v: number) => (total ? v / total : 0);
  const parts: PiePart[] = kept.map((a, i) => ({ ...a, share: share(a.value), color: COL.series(i + 1), folded: [] }));
  if (folded.length) {
    const v = folded.reduce((a, b) => a + b.value, 0);
    const only = folded.length === 1 ? folded[0]! : null;
    parts.push({
      key: only?.key ?? FOLDED_KEY,
      label: only?.label ?? otherLabel(p.lang),
      value: v,
      share: share(v),
      color: COL.context,
      folded: folded.length > 1 ? folded : [],
    });
  }
  return { parts, total, all };
}

/** "45%" (whole per cent; one decimal below 1%). */
export function pctLabel(share: number, lang: "pl" | "en"): string {
  const v = share * 100;
  return `${fmtNum(v, lang, v > 0 && v < 1 ? 1 : 0)}%`;
}

/** Annular (or full) sector; angles in radians, 0 at 12 o'clock, clockwise. */
export function sectorPath(cx: number, cy: number, R: number, r0: number, a0: number, a1: number): string {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    const mid = a0 + Math.PI;
    return sectorPath(cx, cy, R, r0, a0, mid) + sectorPath(cx, cy, R, r0, mid, a1);
  }
  const pt = (a: number, rad: number) => `${r(cx + rad * Math.sin(a))} ${r(cy - rad * Math.cos(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  let d = `M${pt(a0, R)}A${r(R)} ${r(R)} 0 ${large} 1 ${pt(a1, R)}`;
  d += r0 > 0 ? `L${pt(a1, r0)}A${r(r0)} ${r(r0)} 0 ${large} 0 ${pt(a0, r0)}Z` : `L${r(cx)} ${r(cy)}Z`;
  return d;
}

// ---------- pie / donut

export function drawPie(c: Ctx): Scene {
  const { d } = c;
  const s = c.p.series[0];
  const { parts, total } = pieParts(c.p);
  const donut = !!c.p.opts?.donut;
  const H = c.H;
  const pcts = parts.map((pt) => pctLabel(pt.share, c.lang));
  const names = parts.map((pt) => (c.phone && pt.key !== FOLDED_KEY ? catLabel(c.p, pt.key, true) : pt.label));
  const want = Math.max(40, ...parts.map((_, i) => textWidth(names[i]!, 11) + 6 + textWidth(pcts[i]!, 11, 600)));
  const side = Math.min(want, c.W * (c.phone ? 0.3 : 0.28));
  const R = Math.max(36, Math.min((H - 28) / 2, (c.W - 2 * (side + 28)) / 2));
  const r0 = donut ? R * 0.6 : 0;
  const cx = c.W / 2;
  const cy = H / 2;
  const stops: Stop[] = [];
  let a = 0;
  const geo = parts.map((pt) => {
    const a0 = a;
    a += pt.share * Math.PI * 2;
    return { a0, a1: a, mid: (a0 + a) / 2 };
  });
  parts.forEach((pt, i) => {
    const g = geo[i]!;
    if (g.a1 - g.a0 > 1e-4) d.path(sectorPath(cx, cy, R, r0, g.a0, g.a1), COL.surface, parts.length > 1 ? 1.5 : 0, { fill: pt.color });
  });
  // direct labels: right half of the circle to the right, left half to the left, spread vertically
  const right = geo.map((g) => Math.sin(g.mid) >= 0);
  const yAt = (i: number) => cy - (R + 8) * Math.cos(geo[i]!.mid);
  const place = (onRight: boolean) => {
    const idx = parts.map((_, i) => i).filter((i) => right[i] === onRight);
    const ys = spread(
      idx.map((i) => yAt(i)),
      16,
      12,
      H - 6,
    );
    return new Map(idx.map((i, k) => [i, ys[k]!]));
  };
  const ly = new Map([...place(true), ...place(false)]);
  parts.forEach((pt, i) => {
    const g = geo[i]!;
    const y = ly.get(i)!;
    const onRight = right[i]!;
    const xEdge = cx + (R + 2) * Math.sin(g.mid);
    const yEdge = cy - (R + 2) * Math.cos(g.mid);
    const xl = onRight ? cx + R + 18 : cx - R - 18;
    d.path(`M${r(xEdge)} ${r(yEdge)}L${r(xl + (onRight ? -6 : 6))} ${r(y)}L${r(xl + (onRight ? -2 : 2))} ${r(y)}`, COL.referenceLight, 1);
    const pw = textWidth(pcts[i]!, 11, 600);
    const room = Math.max(24, (onRight ? c.W - xl : xl) - pw - 8);
    const name = fitText(names[i]!, 11, room);
    if (onRight) {
      d.text(xl, y + 4, name, { tone: "ink" });
      d.text(xl + textWidth(name, 11) + 5, y + 4, pcts[i]!, { tone: "ink", weight: 600 });
    } else {
      d.text(xl, y + 4, pcts[i]!, { tone: "ink", weight: 600, anchor: "end" });
      d.text(xl - pw - 5, y + 4, name, { tone: "ink", anchor: "end" });
    }
    const rm = donut ? (R + r0) / 2 : R * 0.62;
    const value = c.unit.symbol === "%" ? fmtVal(pt.value, c.unit, c.lang) : `${fmtVal(pt.value, c.unit, c.lang)} (${pcts[i]})`;
    stops.push({
      x: cx + rm * Math.sin(g.mid),
      y: cy - rm * Math.cos(g.mid),
      title: pt.label,
      rows: [
        { label: s?.label ?? "", value, color: pt.color },
        ...pt.folded.map((f) => ({ label: f.label, value: fmtVal(f.value, c.unit, c.lang) })),
      ],
      dots: [{ x: cx + rm * Math.sin(g.mid), y: cy - rm * Math.cos(g.mid), color: pt.color }],
    });
  });
  if (donut && total > 0) {
    const t = fmtVal(total, c.unit, c.lang);
    const size = textWidth(t, 18, 600) <= r0 * 1.7 ? 18 : 13;
    d.text(cx, cy + 4, t, { anchor: "middle", tone: "ink", weight: 600, size });
    d.text(cx, cy + 4 + size, c.lang === "pl" ? "razem" : "total", { anchor: "middle", tone: "ink-2" });
  }
  return { height: H, els: d.els, stops, pick: "xy" };
}

// ---------- waffle (10 × 10)

export type WafflePart = { key: string; label: string; value: number; cells: number; color: string };

/** Largest-remainder rounding of exact cell counts to a whole total. */
export function largestRemainder(exact: number[], total: number): number[] {
  const out = exact.map((v) => Math.floor(v));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length, left--) out[order[k]!.i]!++;
  return out;
}

/**
 * Cells of the 10 × 10 waffle: up to 4 parts of series[0]. Percentages adding to 100 or less are cells of 100
 * directly (27% = 27 cells) with the remainder left empty; other units are split in proportion to their total.
 */
export function waffleParts(p: ZChartProps): { parts: WafflePart[]; rest: number; of100: boolean } {
  const s = p.series[0];
  const keys = xKeys(p, s ? [s] : []).slice(0, 4);
  const vals = keys.map((k) => Math.max(0, valueAt(s, k) ?? 0));
  const sum = vals.reduce((a, b) => a + b, 0);
  const of100 = p.unit.symbol === "%" && sum <= 100 + 1e-9;
  const base = of100 ? 100 : sum || 1;
  const cells = largestRemainder(
    vals.map((v) => (v / base) * 100),
    of100 ? Math.round(sum) : 100,
  );
  const hl = p.highlight;
  const parts = keys.map((key, i) => ({
    key,
    label: catLabel(p, key),
    value: vals[i]!,
    cells: cells[i]!,
    color: hl ? (key === hl ? COL.series(1) : COL.context) : COL.series(i + 1),
  }));
  return { parts, rest: 100 - cells.reduce((a, b) => a + b, 0), of100 };
}

export function drawWaffle(c: Ctx): Scene {
  const { d } = c;
  const s = c.p.series[0];
  const pl = c.lang === "pl";
  const { parts, rest, of100 } = waffleParts(c.p);
  const rows = [
    ...parts,
    ...(rest > 0
      ? [
          {
            key: "rest",
            label: otherLabel(c.lang),
            value: of100 ? 100 - parts.reduce((a, b) => a + b.value, 0) : 0,
            cells: rest,
            color: COL.muted,
          },
        ]
      : []),
  ];
  const gap = 3;
  const rowH = 44;
  const side = c.phone ? Math.min(c.W - 16, 200) : Math.min(Math.max(c.H - 8, rows.length * rowH), 260);
  const cell = (side - 9 * gap) / 10;
  const gx = c.phone ? (c.W - side) / 2 : Math.max(0, Math.min(c.W * 0.12, c.W - side - 260));
  const gy = 4;
  const lx = c.phone ? 8 : gx + side + 28;
  const ly0 = c.phone ? gy + side + 18 : gy + Math.max(0, (side - rows.length * rowH) / 2) + 4;
  const centroids: { x: number; y: number; n: number }[] = rows.map(() => ({ x: 0, y: 0, n: 0 }));
  let part = 0;
  let used = 0;
  for (let i = 0; i < 100; i++) {
    while (part < rows.length && used >= rows[part]!.cells) {
      part++;
      used = 0;
    }
    const x = gx + (i % 10) * (cell + gap);
    const y = gy + Math.floor(i / 10) * (cell + gap);
    const row = rows[part];
    d.rect(x, y, cell, cell, row?.color ?? COL.muted, { rx: 2 });
    if (row) {
      const ce = centroids[part]!;
      ce.x += x + cell / 2;
      ce.y += y + cell / 2;
      ce.n++;
    }
    used++;
  }
  const stops: Stop[] = [];
  rows.forEach((row, i) => {
    const y = ly0 + i * rowH;
    const big = `${row.cells}`;
    const bw = textWidth(big, 20, 600);
    d.rect(lx, y + 4, 10, 10, row.color, { rx: 2 });
    d.text(lx + 16, y + 16, big, { tone: "ink", weight: 600, size: 20 });
    d.text(lx + 20 + bw, y + 16, pl ? "na 100" : "in 100", { tone: "ink-2" });
    d.text(lx + 16, y + 33, fitText(row.label, 12, c.W - lx - 20), { tone: "ink", size: 12 });
    const ce = centroids[i]!;
    const value = fmtVal(row.value, c.unit, c.lang);
    stops.push({
      x: ce.n ? ce.x / ce.n : lx,
      y: ce.n ? ce.y / ce.n : y + 16,
      title: row.label,
      rows: [
        ...(row.key === "rest" && !of100 ? [] : [{ label: s?.label ?? "", value, color: row.color }]),
        { label: pl ? "Kwadraty (na 100)" : "Squares (of 100)", value: String(row.cells) },
      ],
      band: [lx - 6, y, c.W - lx + 6, rowH - 4],
    });
  });
  const height = c.phone ? ly0 + rows.length * rowH : Math.max(gy + side + 4, ly0 + rows.length * rowH);
  return { height, els: d.els, stops, pick: "xy" };
}

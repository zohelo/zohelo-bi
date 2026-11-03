// Period and value transforms of the explorer: the periods an indicator has, aligning mixed frequencies to the
// coarsest one (mean of complete periods only) and the index transform (base year = 100).

import type { Frequency, Kpi } from "../../data";

const RANK: Record<Frequency, number> = { M: 0, Q: 1, A: 2 };
const PER_YEAR: Record<Frequency, number> = { M: 12, Q: 4, A: 1 };

/** The coarsest of the frequencies (annual over quarterly over monthly); monthly when empty. */
export function coarsest(fs: Frequency[]): Frequency {
  return fs.reduce<Frequency>((a, f) => (RANK[f] > RANK[a] ? f : a), "M");
}

export function freqOf(period: string): Frequency {
  return /^\d{4}$/.test(period) ? "A" : /^\d{4}-Q\d$/.test(period) ? "Q" : "M";
}

/** Every period of a frequency from `first` to `last` inclusive ("2010-01" … "2026-09"). */
export function periodsBetween(first: string, last: string, f: Frequency): string[] {
  const out: string[] = [];
  const y0 = Number(first.slice(0, 4));
  const y1 = Number(last.slice(0, 4));
  for (let y = y0; y <= y1; y++) {
    if (f === "A") out.push(String(y));
    else if (f === "Q") for (let q = 1; q <= 4; q++) out.push(`${y}-Q${q}`);
    else for (let m = 1; m <= 12; m++) out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out.filter((p) => p >= first && p <= last);
}

/** The period of a coarser frequency containing `p` ("2026-05" → "2026-Q2" or "2026"). */
export function alignPeriod(p: string, to: Frequency): string {
  const y = p.slice(0, 4);
  if (to === "A") return y;
  if (to === "Q") {
    if (freqOf(p) === "M") return `${y}-Q${Math.ceil(Number(p.slice(5, 7)) / 3)}`;
    return p;
  }
  return p;
}

/** Number of `from` periods in one `to` period (3 months in a quarter, 12 in a year). */
export function partsPer(from: Frequency, to: Frequency): number {
  return RANK[to] <= RANK[from] ? 1 : PER_YEAR[from] / PER_YEAR[to];
}

/** Complete periods of an indicator at frequency `to` (a year with 9 of 12 months is not complete). */
export function kpiPeriods(k: Pick<Kpi, "first_period" | "last_period" | "frequency">, to: Frequency = k.frequency): string[] {
  const own = periodsBetween(k.first_period, k.last_period, k.frequency);
  if (partsPer(k.frequency, to) === 1) return own;
  const n = partsPer(k.frequency, to);
  const count = new Map<string, number>();
  for (const p of own) count.set(alignPeriod(p, to), (count.get(alignPeriod(p, to)) ?? 0) + 1);
  return [...count].filter(([, c]) => c === n).map(([p]) => p);
}

export type Pt = { x: string; y: number | null };

/** Mean per coarser period; a period with a missing or absent part is null (never a partial mean). */
export function alignPoints(points: Pt[], from: Frequency, to: Frequency): Pt[] {
  const n = partsPer(from, to);
  if (n === 1) return points;
  const groups = new Map<string, (number | null)[]>();
  for (const p of points) {
    const k = alignPeriod(p.x, to);
    groups.set(k, [...(groups.get(k) ?? []), p.y]);
  }
  return [...groups].map(([x, ys]) => {
    const ok = ys.length === n && ys.every((v) => v !== null && Number.isFinite(v));
    const mean = ok ? (ys as number[]).reduce((a, b) => a + b, 0) / n : null;
    return { x, y: mean === null ? null : Math.round(mean * 1e6) / 1e6 };
  });
}

/**
 * Index, base year = 100: value / mean of the base year's periods × 100. Null everywhere (ok = false) when the
 * base year has no value or a value ≤ 0 (an index of a negative or zero base has no meaning).
 */
export function indexPoints(points: Pt[], base: number): { points: Pt[]; ok: boolean } {
  const inBase = points.filter((p) => p.x.slice(0, 4) === String(base) && p.y !== null);
  const b = inBase.length ? inBase.reduce((a, p) => a + p.y!, 0) / inBase.length : null;
  if (b === null || !(b > 0)) return { points: points.map((p) => ({ x: p.x, y: null })), ok: false };
  return { points: points.map((p) => ({ x: p.x, y: p.y === null ? null : Math.round((p.y / b) * 100 * 1000) / 1000 })), ok: true };
}

export function yearOfPeriod(p: string): number {
  return Number(p.slice(0, 4));
}

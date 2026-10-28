// Explorer transforms (F5). They run in the browser on one series sorted by period, or on one
// period across members. Exact and null-safe: a missing or zero input gives null, never a fake number.

export type Point = { period: string; value: number | null };
export type Frequency = "A" | "Q" | "M" | "D";

const LAG: Record<Exclude<Frequency, "D">, number> = { A: 1, Q: 4, M: 12 };

/** The last point with a value, or null. */
export function latest(points: Point[]): Point | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i]!.value != null) return points[i]!;
  return null;
}

/** Value minus the previous point's value; the first point is null. */
export function changePrev(points: Point[]): Point[] {
  return points.map((p, i) => {
    const prev = i > 0 ? points[i - 1]!.value : null;
    return { period: p.period, value: p.value != null && prev != null ? p.value - prev : null };
  });
}

// Multiply before dividing: 110 * 100 / 100 is exactly 110, (110 / 100) * 100 is not.
function ratio(value: number | null, base: number | null | undefined): number | null {
  return value != null && base != null && base !== 0 ? (value * 100) / base : null;
}

function yearEarlier(period: string): string {
  const year = Number(period.slice(0, 4));
  return `${String(year - 1).padStart(4, "0")}${period.slice(4)}`;
}

/** Year-on-year change in % ((v / v_lag − 1) × 100, computed as (v − v_lag) × 100 / v_lag): 1, 4 or 12 points back for A, Q, M; for D the same date a year earlier. */
export function yoy(points: Point[], freq: Frequency): Point[] {
  const byPeriod = freq === "D" ? new Map(points.map((p) => [p.period, p.value])) : null;
  return points.map((p, i) => {
    const lagValue = byPeriod ? byPeriod.get(yearEarlier(p.period)) : points[i - LAG[freq as Exclude<Frequency, "D">]]?.value;
    const change = p.value != null && lagValue != null ? p.value - lagValue : null;
    return { period: p.period, value: ratio(change, lagValue) };
  });
}

/** Value as % of the base period's value; all null when the base is missing, null or 0. */
export function index(points: Point[], basePeriod: string): Point[] {
  const base = points.find((p) => p.period === basePeriod)?.value;
  return points.map((p) => ({ period: p.period, value: ratio(p.value, base) }));
}

/** Each member as % of the total member (default "_T"); all null without a total. */
export function share(values: Record<string, number | null>, totalKey = "_T"): Record<string, number | null> {
  const total = values[totalKey];
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, ratio(v, total)]));
}

/** 1 = largest; nulls stay unranked (null); ties share the lower rank (1, 1, 3). */
export function rank(values: Record<string, number | null>): Record<string, number | null> {
  const sorted = Object.values(values)
    .filter((v): v is number => v != null)
    .sort((a, b) => b - a);
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v == null ? null : sorted.indexOf(v) + 1]));
}

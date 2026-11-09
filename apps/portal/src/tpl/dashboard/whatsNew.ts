// "Co nowego" on the Dashboards landing (owner, 2026-11-09: the landing is for orientation and change, not a second
// wall of KPIs). Programmatic, no AI:
//   unusual moves  the latest period-to-period change of a headline indicator measured against its own history
//                  (z-score of the changes) and named the way a reader says it: "the biggest rise since March 2022";
//   latest data    the indicators whose newest period is the newest of their frequency, grouped by period;
//   calendar       the next publication dates, with how many indicators each brings.
// With real data the same functions run on the published `latest` and series; nothing here is sample-specific.

import type { Kpi, Latest, Point } from "../../data";

export type Move = {
  /** Period of the latest value. */
  period: string;
  /** Latest change (latest value minus the previous one). */
  change: number;
  /** How unusual the change is: distance from the mean change in standard deviations. */
  z: number;
  /** The last earlier period with a change as large in the same direction; null when none in the window. */
  since: string | null;
  /** First period of the window (for "the largest in the window since …"). */
  from: string;
  /** Changes since the last one as large (the whole history when none): "biggest since last quarter" is no news. */
  span: number;
};

/** The latest change of a series judged against the changes before it; null when the history is too short or flat. */
export function unusualMove(points: Point[], minHistory = 8): Move | null {
  const vals = points.filter((p): p is { period: string; value: number } => typeof p.value === "number" && Number.isFinite(p.value));
  if (vals.length < minHistory + 2) return null;
  const diffs = vals.slice(1).map((p, i) => ({ period: p.period, d: p.value - vals[i]!.value }));
  const last = diffs[diffs.length - 1]!;
  const hist = diffs.slice(0, -1);
  const mean = hist.reduce((s, x) => s + x.d, 0) / hist.length;
  const sd = Math.sqrt(hist.reduce((s, x) => s + (x.d - mean) ** 2, 0) / hist.length);
  if (!(sd > 0) || last.d === 0) return null;
  const back = [...hist].reverse();
  const at = back.findIndex((x) => Math.sign(x.d) === Math.sign(last.d) && Math.abs(x.d) >= Math.abs(last.d));
  return {
    period: last.period,
    change: last.d,
    z: Math.abs(last.d - mean) / sd,
    since: at >= 0 ? back[at]!.period : null,
    from: vals[0]!.period,
    span: at >= 0 ? at + 1 : hist.length + 1,
  };
}

/**
 * The most unusual moves, strongest first: at least `threshold` standard deviations out and the largest for at
 * least `minSpan` changes (so a rebound after last month's fall does not count).
 */
export function topMoves<T extends { move: Move | null }>(items: T[], n = 5, threshold = 1.5, minSpan = 6): (T & { move: Move })[] {
  return items
    .filter((x): x is T & { move: Move } => !!x.move && x.move.z >= threshold && x.move.span >= minSpan)
    .sort((a, b) => b.move.z - a.move.z)
    .slice(0, n);
}

/** Comparable end of a period ("2025" → "2025-12", "2026-Q2" → "2026-06"). */
export function periodEnd(p: string): string {
  if (/^\d{4}$/.test(p)) return `${p}-12`;
  const q = /^(\d{4})-Q(\d)$/.exec(p);
  return q ? `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}` : p;
}

export type ReleaseGroup = { period: string; frequency: Kpi["frequency"]; kpis: Kpi[] };

/** Indicators at the newest period of their frequency, newest first (one group per frequency). */
export function latestReleases(kpis: Kpi[], latest: Map<string, Latest>): ReleaseGroup[] {
  const byFreq = new Map<string, Kpi[]>();
  for (const k of kpis) if (latest.has(k.kpi_key)) byFreq.set(k.frequency, [...(byFreq.get(k.frequency) ?? []), k]);
  const out: ReleaseGroup[] = [];
  for (const [frequency, ks] of byFreq) {
    const newest = ks.map((k) => latest.get(k.kpi_key)!.period).sort((a, b) => periodEnd(b).localeCompare(periodEnd(a)))[0]!;
    out.push({
      period: newest,
      frequency: frequency as Kpi["frequency"],
      kpis: ks.filter((k) => latest.get(k.kpi_key)!.period === newest),
    });
  }
  return out.sort((a, b) => periodEnd(b.period).localeCompare(periodEnd(a.period)));
}

export type CalendarEntry = { date: string; kpis: Kpi[] };

/** Next publication dates on or after `today` (YYYY-MM-DD), soonest first. */
export function releaseCalendar(kpis: Kpi[], latest: Map<string, Latest>, today: string, n = 4): CalendarEntry[] {
  const byDate = new Map<string, Kpi[]>();
  for (const k of kpis) {
    const d = latest.get(k.kpi_key)?.next_release;
    if (d && d.slice(0, 10) >= today) byDate.set(d.slice(0, 10), [...(byDate.get(d.slice(0, 10)) ?? []), k]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, n)
    .map(([date, ks]) => ({ date, kpis: ks }));
}

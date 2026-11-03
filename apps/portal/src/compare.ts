import type { SeriesRow } from "@zohelo/semantic";

// F10: one KPI from several sources side by side, period by period, with the gap between them.
// Rows of different units are compared as they are. Rows of several areas or breakdowns are not
// compared at all (mixed): a table would silently keep whichever area came first (#322).

export type CompareRow = { period: string; values: Record<string, number | null>; spread: number | null };
export type CompareTable = { sources: string[]; rows: CompareRow[]; mixed: boolean };

/** True when rows hold more than one distinct geography_name or breakdown_json. */
export function mixesAreas(rows: SeriesRow[]): boolean {
  return new Set(rows.map((r) => r.geography_name)).size > 1 || new Set(rows.map((r) => r.breakdown_json)).size > 1;
}

export function compareSources(rows: SeriesRow[]): CompareTable {
  if (mixesAreas(rows)) return { sources: [...new Set(rows.map((r) => r.source_system))], rows: [], mixed: true };
  const sources: string[] = [];
  const byPeriod = new Map<string, Map<string, number | null>>();
  for (const r of rows) {
    if (!sources.includes(r.source_system)) sources.push(r.source_system);
    let period = byPeriod.get(r.date_key);
    if (!period) byPeriod.set(r.date_key, (period = new Map()));
    if (!period.has(r.source_system)) period.set(r.source_system, r.value);
  }
  const out: CompareRow[] = [...byPeriod.entries()].map(([period, found]) => {
    const values: Record<string, number | null> = {};
    for (const s of sources) values[s] = found.get(s) ?? null;
    const present = Object.values(values).filter((v): v is number => v !== null);
    const spread = present.length >= 2 ? Math.max(...present) - Math.min(...present) : null;
    return { period, values, spread };
  });
  out.sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0));
  return { sources, rows: out, mixed: false };
}

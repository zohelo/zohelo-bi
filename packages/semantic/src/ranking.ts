// Rows for the ranking visual (rankingSpec in @zohelo/design draws them; D4: latest and rank are bi
// logic): one row per member with its latest value and its rank among the members.

import { latest, rank, type Point } from "./transforms";

export type RankingRow = { category: string; period: string; value: number; rank: number };

export function rankingRows(rows: Record<string, unknown>[], o: { category: string; period: string; value: string }): RankingRow[] {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    if (row[o.category] == null) continue;
    const key = String(row[o.category]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const latestByMember = new Map<string, Point & { value: number }>();
  for (const [member, group] of groups) {
    const points: Point[] = group
      .map((r) => {
        const v = r[o.value] == null ? null : Number(r[o.value]);
        return { period: String(r[o.period]), value: v === null || Number.isNaN(v) ? null : v };
      })
      .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
    const p = latest(points);
    if (p && p.value !== null) latestByMember.set(member, { period: p.period, value: p.value });
  }
  const ranks = rank(Object.fromEntries([...latestByMember].map(([m, p]) => [m, p.value])));
  return [...latestByMember]
    .map(([category, p]) => ({ category, period: p.period, value: p.value, rank: ranks[category]! }))
    .sort((a, b) => a.rank - b.rank || a.category.localeCompare(b.category, "pl"));
}

// Dashboard YAML rules, shared by the portal (fails the build) and ops/check-dashboards.ts (fails CI),
// so the two cannot drift.

import { metric } from "./index";

export type Tile = {
  title: string;
  note?: string;
  metric: string;
  chart: "line" | "bar";
  selects?: boolean;
  filters: Record<string, string[]>;
};

export type Dashboard = { id: string; title: string; description?: string; tiles: Tile[] };

const CHARTS = ["line", "bar"];

/** Problems with a parsed dashboard file, each prefixed with the file name; empty when valid. */
export function validateDashboard(d: unknown, file: string): string[] {
  const problems: string[] = [];
  const dashboard = (d ?? {}) as Partial<Dashboard>;
  if (!dashboard.id || !Array.isArray(dashboard.tiles) || !dashboard.tiles.length) problems.push(`${file}: needs id and tiles`);
  for (const t of Array.isArray(dashboard.tiles) ? dashboard.tiles : []) {
    const m = metric(t.metric);
    if (!m) problems.push(`${file}: unknown metric ${t.metric}`);
    if (!CHARTS.includes(t.chart)) problems.push(`${file}: unknown chart ${t.chart}`);
    for (const column of Object.keys(t.filters ?? {}))
      if (m && !m.dimensions.some((x) => x.column === column)) problems.push(`${file}: ${t.metric} has no dimension ${column}`);
  }
  return problems;
}

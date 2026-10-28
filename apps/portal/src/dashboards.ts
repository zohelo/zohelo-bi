import { parse } from "yaml";
import { validateDashboard, type Dashboard, type DashboardV2 } from "@zohelo/semantic";

export type { Dashboard, DashboardV2, Tile, TileV2 } from "@zohelo/semantic";

// Dashboards are YAML files in dashboards/, bundled at build time and validated against the
// semantic manifest, so a typo fails the build instead of showing an empty tile. Schema 2 files
// (docs/dashboards.md) are kept apart from v1: they are exported but not rendered yet.

const files = import.meta.glob<string>("../../../dashboards/*.yaml", { query: "?raw", import: "default", eager: true });

/** Parse and validate [file, yaml] entries; throws on the first invalid file. */
export function splitDashboards(entries: [string, string][]): { v1: Dashboard[]; v2: DashboardV2[] } {
  const v1: Dashboard[] = [];
  const v2: DashboardV2[] = [];
  for (const [file, text] of entries) {
    const d = parse(text) as unknown;
    const problems = validateDashboard(d, file);
    if (problems.length) throw new Error(problems.join("; "));
    if ((d as { schema?: unknown }).schema === 2) v2.push(d as DashboardV2);
    else v1.push(d as Dashboard);
  }
  v1.sort((a, b) => (a.id === "overview" ? -1 : b.id === "overview" ? 1 : a.title.localeCompare(b.title)));
  v2.sort((a, b) => (a.id === "poland-overview" ? -1 : b.id === "poland-overview" ? 1 : a.title_en.localeCompare(b.title_en)));
  return { v1, v2 };
}

export const { v1: dashboards, v2: dashboardsV2 } = splitDashboards(Object.entries(files));

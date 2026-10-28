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

export type TileV2 = {
  title_pl: string;
  title_en: string;
  kpi_key: string;
  /** Explorer URL params without '?': rows, cols and filters. */
  view: string;
  chart: "line" | "bar" | "multiples" | "ranking" | "map";
  selects?: boolean;
  note_pl?: string;
  note_en?: string;
};

export type DashboardV2 = {
  schema: 2;
  id: string;
  title_pl: string;
  title_en: string;
  description_pl?: string;
  description_en?: string;
  domain_key: string;
  slicers?: ("geography" | "period")[];
  tiles: TileV2[];
};

const CHARTS = ["line", "bar"];
const CHARTS_V2 = ["line", "bar", "multiples", "ranking", "map"];
const SLICERS = ["geography", "period"];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KPI_KEY = /^[a-z0-9_]+$/;

const filled = (v: unknown): boolean => typeof v === "string" && v.trim() !== "";

// docs/dashboards.md, schema 2. Structure only: kpi_key and domain_key against catalog.json come later.
function validateV2(d: Partial<DashboardV2>, file: string): string[] {
  const problems: string[] = [];
  const say = (msg: string) => problems.push(`${file}: ${msg}`);
  if (typeof d.id !== "string" || !KEBAB.test(d.id)) say("id must be kebab-case");
  else if (file.endsWith(".yaml") && d.id !== (file.split("/").pop() ?? "").slice(0, -".yaml".length)) say("id must equal the file name");
  for (const field of ["title_pl", "title_en", "domain_key"] as const) if (!filled(d[field])) say(`needs ${field}`);
  for (const x of Array.isArray(d.slicers) ? d.slicers : []) if (!SLICERS.includes(x)) say(`unknown slicer ${String(x)}`);
  const tiles = Array.isArray(d.tiles) ? d.tiles : [];
  if (tiles.length < 1 || tiles.length > 12) say("needs 1–12 tiles");
  tiles.forEach((raw, i) => {
    const t = (raw ?? {}) as Partial<TileV2>;
    const tile = (msg: string) => say(`tile ${i + 1}: ${msg}`);
    for (const field of ["title_pl", "title_en", "kpi_key"] as const) if (!filled(t[field])) tile(`needs ${field}`);
    if (filled(t.kpi_key) && !KPI_KEY.test(t.kpi_key!)) tile("kpi_key must match [a-z0-9_]+");
    if (typeof t.view !== "string" || t.view.startsWith("?") || [...new URLSearchParams(t.view).keys()].length === 0)
      tile("view must be URL params without '?'");
    if (!CHARTS_V2.includes(t.chart as string)) tile(`unknown chart ${String(t.chart)}`);
    if (t.selects !== undefined && typeof t.selects !== "boolean") tile("selects must be true or false");
  });
  return problems;
}

/** Problems with a parsed dashboard file, each prefixed with the file name; empty when valid. */
export function validateDashboard(d: unknown, file: string): string[] {
  const schema = (d as { schema?: unknown } | null)?.schema;
  if (schema === 2) return validateV2(d as Partial<DashboardV2>, file);
  if (schema !== undefined) return [`${file}: unsupported schema ${String(schema)}`];
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

import { parse } from "yaml";
import { metric } from "@zohelo/semantic";

// Dashboards are YAML files in dashboards/, bundled at build time and validated against the
// semantic manifest, so a typo fails the build instead of showing an empty tile.

export type Tile = {
  title: string;
  note?: string;
  metric: string;
  chart: "line" | "bar";
  selects?: boolean;
  filters: Record<string, string[]>;
};

export type Dashboard = { id: string; title: string; description?: string; tiles: Tile[] };

const files = import.meta.glob<string>("../dashboards/*.yaml", { query: "?raw", import: "default", eager: true });

function validate(d: Dashboard, file: string): Dashboard {
  for (const t of d.tiles) {
    const m = metric(t.metric);
    if (!m) throw new Error(`${file}: unknown metric ${t.metric}`);
    for (const column of Object.keys(t.filters ?? {})) {
      if (!m.dimensions.some((dim) => dim.column === column)) throw new Error(`${file}: ${t.metric} has no dimension ${column}`);
    }
  }
  return d;
}

export const dashboards: Dashboard[] = Object.entries(files)
  .map(([file, text]) => validate(parse(text) as Dashboard, file))
  .sort((a, b) => (a.id === "overview" ? -1 : b.id === "overview" ? 1 : a.title.localeCompare(b.title)));

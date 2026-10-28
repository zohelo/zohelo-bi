import { parse } from "yaml";
import { validateDashboard, type Dashboard } from "@zohelo/semantic";

export type { Dashboard, Tile } from "@zohelo/semantic";

// Dashboards are YAML files in dashboards/, bundled at build time and validated against the
// semantic manifest, so a typo fails the build instead of showing an empty tile.

const files = import.meta.glob<string>("../../../dashboards/*.yaml", { query: "?raw", import: "default", eager: true });

function validate(d: Dashboard, file: string): Dashboard {
  const problems = validateDashboard(d, file);
  if (problems.length) throw new Error(problems.join("; "));
  return d;
}

export const dashboards: Dashboard[] = Object.entries(files)
  .map(([file, text]) => validate(parse(text) as Dashboard, file))
  .sort((a, b) => (a.id === "overview" ? -1 : b.id === "overview" ? 1 : a.title.localeCompare(b.title)));

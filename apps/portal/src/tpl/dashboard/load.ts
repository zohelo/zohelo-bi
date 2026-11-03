// Domain dashboards (format version 3): dashboards/domains/<domain>.yaml, bundled at build time. A file with a
// structural problem fails the build with the validator's message (file and path); keys are checked against the
// catalogue by ops/check-dashboards.ts, and at run time a card whose KPI is missing or unsuitable shows a state.

import { parse } from "yaml";
import { validateDashboardV3, type DashboardV3 } from "@zohelo/semantic";

const files = import.meta.glob<string>("../../../../../dashboards/domains/*.yaml", { query: "?raw", import: "default", eager: true });

/** Parse and validate [file, yaml] entries into domain key → dashboard; throws listing every problem. */
export function loadDashboards(entries: [string, string][]): Record<string, DashboardV3> {
  const out: Record<string, DashboardV3> = {};
  const problems: string[] = [];
  for (const [path, text] of entries) {
    const file = `dashboards/domains/${path.split("/").pop()}`;
    let d: unknown;
    try {
      d = parse(text);
    } catch (e) {
      problems.push(`${file}: błąd składni YAML / YAML syntax error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const p = validateDashboardV3(d, file);
    if (p.length) problems.push(...p);
    else out[(d as DashboardV3).domain_key] = d as DashboardV3;
  }
  if (problems.length) throw new Error(problems.join("\n"));
  return out;
}

export const domainDashboards = loadDashboards(Object.entries(files));

export function dashboardFor(domain: string): DashboardV3 | undefined {
  return domainDashboards[domain];
}

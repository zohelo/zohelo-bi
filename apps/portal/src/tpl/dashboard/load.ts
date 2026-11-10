// Domain dashboards (format version 3): dashboards/domains/<domain>.yaml, parsed at build time (vite-yaml.ts: a
// syntax error fails the build) and validated when the module loads (a structural problem throws the validator's
// message, file and path); keys are checked against the catalogue by ops/check-dashboards.ts, and at run time a
// card whose KPI is missing or unsuitable shows a state.

import { validateDashboardV3, type DashboardV3 } from "@zohelo/semantic";

const files = import.meta.glob<unknown>("../../../../../dashboards/domains/*.yaml", { import: "default", eager: true });

/** Validate [file, parsed document] entries into domain key → dashboard; throws listing every problem. */
export function loadDashboards(entries: [string, unknown][]): Record<string, DashboardV3> {
  const out: Record<string, DashboardV3> = {};
  const problems: string[] = [];
  for (const [path, d] of entries) {
    const file = `dashboards/domains/${path.split("/").pop()}`;
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

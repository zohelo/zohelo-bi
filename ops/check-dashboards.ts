// Fails CI when dashboards/yardsticks.yaml is malformed, or when a domain dashboard (dashboards/domains/*.yaml,
// format version 3) is malformed or names a KPI, group, dimension, geography or chart type the catalogue does not
// have or that does not suit the KPI. Any other YAML file directly in dashboards/ is an error: the old portal's
// dashboards (versions 1 and 2) were removed with it.
// Version 3 is checked against the dummy catalogue (apps/portal/src/data) until the published catalogue has
// every KPI.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  validateDashboardV3,
  validateDashboardV3Catalog,
  validateYardsticks,
  yardstickUnknownKpis,
  type DashboardV3,
  type Yardsticks,
} from "@zohelo/semantic";
import { dummy } from "../apps/portal/src/data/dummy";

const dir = new URL("../dashboards/", import.meta.url);
let problems = 0;
const report = (file: string, message: string) => {
  problems++;
  console.log(`::error file=${file}::${message}`);
};

// dashboards/yardsticks.yaml: the official thresholds scorecards judge by (not a dashboard).
const YARDSTICKS = "yardsticks.yaml";
const yardsticks = parse(readFileSync(new URL(YARDSTICKS, dir), "utf8")) as unknown;
const yProblems = validateYardsticks(yardsticks);
for (const message of yProblems) report(`dashboards/${YARDSTICKS}`, message);
const frameworks = yProblems.length ? [] : Object.keys((yardsticks as Yardsticks).frameworks);

for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml") && f !== YARDSTICKS))
  report(`dashboards/${file}`, `dashboards/${file}: only domains/<domain>.yaml (format v3) and ${YARDSTICKS} are read`);

const v3dir = new URL("domains/", dir);
if (existsSync(v3dir)) {
  const catalog = await dummy.catalog();
  const files = readdirSync(v3dir).filter((f) => f.endsWith(".yaml"));
  for (const file of files) {
    const path = `dashboards/domains/${file}`;
    let d: unknown;
    try {
      d = parse(readFileSync(new URL(file, v3dir), "utf8"));
    } catch (e) {
      report(path, `${path}: błąd składni YAML / YAML syntax error: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const structural = validateDashboardV3(d, path);
    for (const message of structural) report(path, message);
    if (!structural.length)
      for (const message of validateDashboardV3Catalog(d as DashboardV3, path, catalog, frameworks)) report(path, message);
  }
  if (!yProblems.length)
    for (const message of yardstickUnknownKpis(yardsticks as Yardsticks, catalog.kpis)) report(`dashboards/${YARDSTICKS}`, message);
  const domains = catalog.domains.filter((x) => x.level === "domain").map((x) => x.domain_key);
  for (const key of domains)
    if (!files.includes(`${key}.yaml`))
      report("dashboards/domains", `dashboards/domains: brak pulpitu dziedziny ${key}.yaml / no domain dashboard ${key}.yaml`);
}

if (problems) process.exit(1);
console.log("dashboards ok");

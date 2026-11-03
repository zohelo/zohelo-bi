// Fails CI when a dashboard names a metric or dimension the semantic manifest does not have (dashboards/*.yaml,
// versions 1 and 2), or when a domain dashboard (dashboards/domains/*.yaml, version 3) is malformed or names a
// KPI, group, dimension, geography or chart type the catalogue does not have or that does not suit the KPI.
// Version 3 is checked against the dummy catalogue (apps/portal/src/data) until the published catalogue has
// every KPI.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { validateDashboard, validateDashboardV3, validateDashboardV3Catalog, type DashboardV3 } from "@zohelo/semantic";
import { dummy } from "../apps/portal/src/data/dummy";

const dir = new URL("../dashboards/", import.meta.url);
let problems = 0;
const report = (file: string, message: string) => {
  problems++;
  console.log(`::error file=${file}::${message}`);
};

for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  for (const message of validateDashboard(parse(readFileSync(new URL(file, dir), "utf8")), `dashboards/${file}`))
    report(`dashboards/${file}`, message);
}

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
    if (!structural.length) for (const message of validateDashboardV3Catalog(d as DashboardV3, path, catalog)) report(path, message);
  }
  const domains = catalog.domains.filter((x) => x.level === "domain").map((x) => x.domain_key);
  for (const key of domains)
    if (!files.includes(`${key}.yaml`))
      report("dashboards/domains", `dashboards/domains: brak pulpitu dziedziny ${key}.yaml / no domain dashboard ${key}.yaml`);
}

if (problems) process.exit(1);
console.log("dashboards ok");

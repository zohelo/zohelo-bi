// Fails CI when a dashboard names a metric or dimension the semantic manifest does not have.
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { metric } from "@zohelo/semantic";

const dir = new URL("../dashboards/", import.meta.url);
let problems = 0;
function problem(file: string, message: string) {
  problems++;
  console.log(`::error file=dashboards/${file}::${message}`);
}
for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  const d = parse(readFileSync(new URL(file, dir), "utf8")) as {
    id?: string;
    tiles?: { metric: string; chart: string; filters?: Record<string, unknown[]> }[];
  };
  if (!d.id || !d.tiles?.length) problem(file, "needs id and tiles");
  for (const t of d.tiles ?? []) {
    const m = metric(t.metric);
    if (!m) problem(file, `unknown metric ${t.metric}`);
    if (!["line", "bar"].includes(t.chart)) problem(file, `unknown chart ${t.chart}`);
    for (const column of Object.keys(t.filters ?? {}))
      if (m && !m.dimensions.some((x) => x.column === column)) problem(file, `${t.metric} has no dimension ${column}`);
  }
}
if (problems) process.exit(1);
console.log("dashboards ok");

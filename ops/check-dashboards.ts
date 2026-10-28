// Fails CI when a dashboard names a metric or dimension the semantic manifest does not have.
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { validateDashboard } from "@zohelo/semantic";

const dir = new URL("../dashboards/", import.meta.url);
let problems = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  for (const message of validateDashboard(parse(readFileSync(new URL(file, dir), "utf8")), `dashboards/${file}`)) {
    problems++;
    console.log(`::error file=dashboards/${file}::${message}`);
  }
}
if (problems) process.exit(1);
console.log("dashboards ok");

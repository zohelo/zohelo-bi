// The official yardsticks of the scorecards (dashboards/yardsticks.yaml), bundled at build time; a structural
// problem fails the build with the validator's message (packages/semantic yardsticks.ts).

import { parse } from "yaml";
import { validateYardsticks, type YardstickFramework, type Yardsticks } from "@zohelo/semantic";

function load(raw: string): Yardsticks {
  const y = parse(raw) as unknown;
  const problems = validateYardsticks(y);
  if (problems.length) throw new Error(problems.join("\n"));
  return y as Yardsticks;
}

const files = import.meta.glob<string>("../../../../../dashboards/yardsticks.yaml", { query: "?raw", import: "default", eager: true });

const raw = Object.values(files)[0];
if (raw === undefined) throw new Error("dashboards/yardsticks.yaml: brak pliku / file missing");

export const yardsticks = load(raw);

export function frameworkFor(key: string | undefined): YardstickFramework | undefined {
  return key ? yardsticks.frameworks[key] : undefined;
}

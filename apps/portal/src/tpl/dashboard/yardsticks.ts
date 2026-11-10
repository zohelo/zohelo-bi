// The official yardsticks of the scorecards (dashboards/yardsticks.yaml), parsed at build time (vite-yaml.ts); a
// structural problem throws the validator's message when the module loads (packages/semantic yardsticks.ts).

import { validateYardsticks, type YardstickFramework, type Yardsticks } from "@zohelo/semantic";

function load(y: unknown): Yardsticks {
  const problems = validateYardsticks(y);
  if (problems.length) throw new Error(problems.join("\n"));
  return y as Yardsticks;
}

const files = import.meta.glob<unknown>("../../../../../dashboards/yardsticks.yaml", { import: "default", eager: true });

const raw = Object.values(files)[0];
if (raw === undefined) throw new Error("dashboards/yardsticks.yaml: brak pliku / file missing");

export const yardsticks = load(raw);

export function frameworkFor(key: string | undefined): YardstickFramework | undefined {
  return key ? yardsticks.frameworks[key] : undefined;
}

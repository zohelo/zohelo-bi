// Prints "title<TAB>api path" for every dashboard tile, for the smoke test.
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

const dir = new URL("../dashboards/", import.meta.url);
const sample = "MAZOWIECKIE";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  const d = parse(readFileSync(new URL(file, dir), "utf8")) as {
    tiles: { title: string; metric: string; filters?: Record<string, string[]> }[];
  };
  for (const t of d.tiles) {
    const p = new URLSearchParams();
    for (const [c, vs] of Object.entries(t.filters ?? {})) p.set(c, vs.map((v) => (v === "$selected" ? sample : String(v))).join("|"));
    console.log(`${t.title.replace("$selected", sample)}\t/api/metrics/${t.metric}/series?${p}`);
  }
}

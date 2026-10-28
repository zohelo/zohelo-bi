// Prints "title<TAB>api path" for every dashboard tile, for the smoke test.
// v2 tiles (schema: 2) are listed only while their kpi_key is a metric of today's manifest; the
// others are skipped with a line on stderr, so the smoke test does not fail on them.
import { readdirSync, readFileSync } from "node:fs";
import { metric } from "@zohelo/semantic";
import { parse } from "yaml";

type TileV1 = { title: string; metric: string; filters?: Record<string, string[]> };
type TileV2 = { title_en: string; kpi_key: string; view: string };

const dir = new URL("../dashboards/", import.meta.url);
const sample = "MAZOWIECKIE";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
  const d = parse(readFileSync(new URL(file, dir), "utf8")) as { schema?: number; tiles: unknown[] };
  if (d.schema === 2) {
    for (const { title_en, kpi_key, view } of d.tiles as TileV2[]) {
      if (!metric(kpi_key)) {
        console.error(`skip ${title_en}: ${kpi_key} not in the manifest`);
        continue;
      }
      const p = new URLSearchParams(view);
      for (const k of ["rows", "cols", "t", "view"]) p.delete(k);
      for (const [k, v] of [...p]) if (v === "$selected") p.set(k, sample);
      console.log(`${title_en.replace("$selected", sample)}\t/api/metrics/${kpi_key}/series?${p}`);
    }
    continue;
  }
  for (const t of d.tiles as TileV1[]) {
    const p = new URLSearchParams();
    for (const [c, vs] of Object.entries(t.filters ?? {})) p.set(c, vs.map((v) => (v === "$selected" ? sample : String(v))).join("|"));
    console.log(`${t.title.replace("$selected", sample)}\t/api/metrics/${t.metric}/series?${p}`);
  }
}

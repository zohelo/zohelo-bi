import { describe, expect, it } from "vitest";
import { manifest, metric } from "./index";

describe("semantic manifest", () => {
  it("finds population in the gold namespace", () => {
    expect(metric("population")?.table).toBe("gold.metrics_population");
  });

  it("returns undefined for an unknown metric", () => {
    expect(metric("nope")).toBeUndefined();
  });

  it("keeps every default filter among the metric's dimension columns", () => {
    for (const m of manifest.metrics) {
      const columns = m.dimensions.map((d) => d.column);
      for (const key of Object.keys(m.defaults)) expect(columns, `${m.id}.${key}`).toContain(key);
    }
  });
});

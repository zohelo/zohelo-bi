import { describe, expect, it } from "vitest";
import { dimensionLabel, manifest, metric, metricText } from "./index";

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

describe("metricText and dimensionLabel", () => {
  it("gives every metric and dimension a Polish text that differs from the English where the words differ", () => {
    for (const m of manifest.metrics) {
      for (const field of ["label_pl", "description_pl", "unitLabel_pl"] as const) expect(m[field].trim(), `${m.id} ${field}`).not.toBe("");
      for (const d of m.dimensions) expect(d.label_pl.trim(), `${m.id} ${d.column}`).not.toBe("");
    }
    expect(metricText(metric("population")!, "pl")).toEqual({
      label: "Ludność",
      description: "Ludność ogółem, wszystkie źródła obok siebie.",
      unit: "osoby",
    });
    expect(metricText(metric("population")!, "en").label).toBe("Population");
  });

  it("names the dimensions in the page language", () => {
    const area = metric("population")!.dimensions.find((d) => d.column === "geography_name")!;
    expect(dimensionLabel(area, "pl")).toBe("Obszar");
    expect(dimensionLabel(area, "en")).toBe("Area");
  });
});

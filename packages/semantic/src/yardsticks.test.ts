import { describe, expect, it } from "vitest";
import { judgeYardstick, measureValue, validateYardsticks, yardstickUnknownKpis, type Yardsticks } from "./yardsticks";

const monthly = (vals: number[]) => vals.map((value, i) => ({ period: `2024-${String((i % 12) + 1).padStart(2, "0")}`, value }));
const annual = (vals: (number | null)[]) => vals.map((value, i) => ({ period: String(2020 + i), value }));

describe("official yardsticks", () => {
  it("measures the way the framework does", () => {
    expect(measureValue(monthly([1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3]), "M", "avg12m")!.value).toBe(2);
    expect(measureValue(annual([1, 2, 3, 4]), "A", "avg3y")!.value).toBe(3);
    expect(measureValue(annual([100, 105, 110, 121]), "A", "change3y")!.value).toBeCloseTo(21);
    expect(measureValue(annual([60, 61, 62, 64]), "A", "change3y_pp")!.value).toBe(4);
    expect(measureValue(annual([100, 109.5]), "A", "change1y")!.value).toBeCloseTo(9.5);
    expect(measureValue(annual([5, null]), "A")).toEqual({ value: 5, period: "2020" });
    expect(measureValue(annual([1, 2]), "A", "avg3y")).toBeNull();
  });
  it("judges against max, min, range or a fixed verdict", () => {
    expect(judgeYardstick({ kpi: "a", max: 2.7, label_pl: "", label_en: "" }, 3.4)).toBe("misses");
    expect(judgeYardstick({ kpi: "a", min: -3, label_pl: "", label_en: "" }, -2.5)).toBe("meets");
    expect(judgeYardstick({ kpi: "a", range: [-4, 6], label_pl: "", label_en: "" }, 0.7)).toBe("meets");
    expect(judgeYardstick({ kpi: "a", verdict: "misses", label_pl: "", label_en: "" }, null)).toBe("misses");
    expect(judgeYardstick({ kpi: "a", label_pl: "cel w osobach", label_en: "" }, 15)).toBe("none");
    expect(judgeYardstick(undefined, 1)).toBe("none");
  });
  it("validates the file and its KPIs", () => {
    const y = {
      schema: 1,
      frameworks: {
        maastricht: {
          name_pl: "M",
          name_en: "M",
          source_pl: "EBC",
          source_en: "ECB",
          as_of: "2026-06",
          rules: [{ kpi: "hicp", measure: "avg12m", max: 2.7, label_pl: "≤ 2,7%", label_en: "≤ 2.7%" }],
        },
      },
    };
    expect(validateYardsticks(y)).toEqual([]);
    expect(yardstickUnknownKpis(y as Yardsticks, [{ kpi_key: "gdp" }])[0]).toContain("nieznany KPI hicp");
    const bad = structuredClone(y) as unknown as { frameworks: { maastricht: { as_of: string; rules: Record<string, unknown>[] } } };
    bad.frameworks.maastricht.as_of = "2026";
    bad.frameworks.maastricht.rules[0]!.min = 1;
    bad.frameworks.maastricht.rules[0]!.measure = "avg5y";
    const p = validateYardsticks(bad).join("\n");
    expect(p).toContain("as_of");
    expect(p).toContain("najwyżej jedno");
    expect(p).toContain("measure");
  });
});

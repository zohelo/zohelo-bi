import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, isIndexed, parseExplore, serialiseExplore } from "./exploreState";
import { LINE_LOOKS, applyLineSettings, changedSettings, currentLook, effectiveSettings, layoutOf } from "./looks";

const cat = await dummy.catalog();

describe("line looks (owner's outfits, 2026-11-09)", () => {
  it("starts with the blank look and defaults to Clean", () => {
    expect(LINE_LOOKS[0]!.id).toBe("line.blank");
    expect(currentLook("line", null)!.id).toBe("line.multi");
    expect(currentLook("columns", null)).toBeUndefined();
  });
  it("a setting changed on top of a look marks it modified and lives in the URL", () => {
    const q = parseExplore("?i=hicp_annual_rate&geo=PL,EU27,DE&t=10y&chart=line&x=t&leg=geo&v=line.highlight&o.shape=step", cat);
    const look = currentLook(q.chart, q.v)!;
    expect(effectiveSettings(look, q.o)).toMatchObject({ emphasis: "hero", shape: "step" });
    expect(changedSettings(look, q.o)).toEqual(["shape"]);
    expect(serialiseExplore(q)).toContain("o.shape=step");
    // Another look starts from its own preset.
    expect(applyPatch(q, { v: "line.multi" }, cat).o).toEqual({});
    // A locked setting cannot be switched on.
    expect(effectiveSettings(look, { uncertainty: "band" }).uncertainty).toBe("off");
  });
  it("the index look indexes the series", () => {
    expect(isIndexed(parseExplore("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.indexed", cat))).toBe(true);
    expect(isIndexed(parseExplore("?i=avg_wage&geo=PL&t=5y&chart=line&x=t&v=line.indexed&o.scale=value", cat))).toBe(false);
  });
  it("draws hero, reference and line style from the settings", () => {
    const z = applyLineSettings(
      {
        type: "line-highlight",
        lang: "pl",
        unit: { symbol: "%", isRate: true, decimals: 1 },
        ariaLabel: "",
        series: [
          {
            id: "DE",
            label: "Niemcy",
            points: [
              { x: "2024", y: 2 },
              { x: "2025", y: 4 },
            ],
          },
          {
            id: "PL",
            label: "Polska",
            points: [
              { x: "2024", y: 3 },
              { x: "2025", y: 5 },
            ],
          },
        ],
      },
      { ...LINE_LOOKS.find((l) => l.id === "line.reference")!.settings, shape: "step", names: "legend", fill: "none" },
      "pl",
    );
    expect(z.highlight).toBe("PL");
    expect(z.series.find((s) => s.id === "DE")!.role).toBe("context");
    expect(z.reference?.value).toBe(4);
    expect(z.opts).toMatchObject({ step: true, endLabels: false });
  });

  it("reads the layout of the dimensions from the wells", () => {
    expect(layoutOf({ x: "t", legend: "geo" })).toBe("series");
    expect(layoutOf({ x: "t", sm: "geo" })).toBe("panels");
    expect(layoutOf({ x: "t.moy", legend: "t" })).toBe("seasonal");
  });
  it("band of the others, top N and the extremes", () => {
    const mk = (id: string, a: number, b: number) => ({
      id,
      label: id,
      points: [
        { x: "2024", y: a },
        { x: "2025", y: b },
      ],
    });
    const base = {
      type: "line-highlight" as const,
      lang: "pl" as const,
      unit: { symbol: "%", isRate: true, decimals: 1 },
      ariaLabel: "",
      series: [mk("PL", 3, 5), mk("DE", 1, 2), mk("CZ", 2, 6), mk("SK", 4, 1), mk("HU", 5, 3)],
    };
    const look = LINE_LOOKS.find((l) => l.id === "line.highlight")!;
    const band = applyLineSettings(base, { ...look.settings, band: "minmax" }, "pl");
    const lo = band.series.find((x) => x.id === "lo")!;
    expect(lo.points.map((p) => p.y)).toEqual([1, 1]);
    expect(band.opts?.intervalLabel).toBe("rozpiętość pozostałych");
    const top = applyLineSettings(base, { ...look.settings, top: "3" }, "pl");
    expect(top.series.map((x) => x.id).sort()).toEqual(["CZ", "HU", "PL"]);
    const ext = applyLineSettings(base, { ...look.settings, emphasis: "extremes" }, "pl");
    expect(ext.series.filter((x) => x.role === "series").map((x) => x.id)).toEqual(["CZ", "SK"]);
  });
});

import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import { applyPatch, isIndexed, parseExplore, serialiseExplore } from "./exploreState";
import { LINE_LOOKS, applyLineSettings, changedSettings, currentLook, effectiveSettings } from "./looks";

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
      { ...LINE_LOOKS[3]!.settings, shape: "step", labels: "legend" },
      "pl",
    );
    expect(z.highlight).toBe("PL");
    expect(z.series.find((s) => s.id === "DE")!.role).toBe("context");
    expect(z.reference?.value).toBe(4);
    expect(z.opts).toMatchObject({ step: true, endLabels: false });
  });
});

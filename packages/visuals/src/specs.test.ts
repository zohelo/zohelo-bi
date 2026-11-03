import { describe, expect, it } from "vitest";
import { chartLocale, periodFormat } from "./locale";
import { barSpec, lineSpec } from "./specs";

describe("chart locale", () => {
  it("gives Polish number and month names to vega-embed", () => {
    const pl = chartLocale("pl");
    expect(pl.formatLocale.decimal).toBe(",");
    expect(pl.formatLocale.thousands).toBe(" ");
    expect(pl.formatLocale.minus).toBe("−");
    expect(pl.timeFormatLocale.shortMonths[3]).toBe("kwi");
    expect(pl.timeFormatLocale.months[3]).toBe("kwiecień");
    expect(chartLocale("en").formatLocale.thousands).toBe(",");
  });

  it("formats periods by the finest key", () => {
    expect(periodFormat(["2024", "2025"])).toBe("%Y");
    expect(periodFormat(["2025-04", "2025"])).toBe("%b %Y");
    expect(periodFormat(["2025-04-01"])).toBe("%e %b %Y");
  });
});

describe("specs", () => {
  const rows = [
    { date: "2025-04", value: 3.9, series: "Eurostat" },
    { date: "2025-07", value: 4, series: "Eurostat" },
  ];

  it("uses grouped numbers, not SI prefixes, and Polish tooltip titles", () => {
    const spec = lineSpec(rows, { x: "date", y: "value", series: "series", yTitle: "%", lang: "pl" }) as unknown as {
      encoding: { x: { axis: { format: string } }; y: { axis: { format: string } }; tooltip: { title: string; format?: string }[] };
    };
    expect(spec.encoding.y.axis.format).toBe(",~f");
    expect(spec.encoding.x.axis.format).toBe("%b %Y");
    expect(spec.encoding.tooltip.map((x) => x.title)).toEqual(["Seria", "Okres", "%"]);
  });

  it("names the bar tooltip area in the language", () => {
    const spec = barSpec([{ area: "Mazowieckie", value: 5_500_000 }], {
      category: "area",
      value: "value",
      valueTitle: "osoby",
      accent: "#000",
      mutedMark: "#999",
      lang: "pl",
    }) as unknown as { encoding: { x: { axis: { format: string } }; tooltip: { title: string }[] } };
    expect(spec.encoding.x.axis.format).toBe(",~f");
    expect(spec.encoding.tooltip[0]!.title).toBe("Obszar");
  });
});

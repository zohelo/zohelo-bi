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

  it("formats periods by the finest frequency (date_key is a full date for every frequency)", () => {
    expect(periodFormat(["A"])).toBe("%Y");
    expect(periodFormat(["A", "Q"])).toBe("%b %Y");
    expect(periodFormat(["M"])).toBe("%b %Y");
    expect(periodFormat(["S"])).toBe("%b %Y");
    expect(periodFormat(["D", "M"])).toBe("%-d %b %Y");
    expect(periodFormat(["X"])).toBe("%-d %b %Y");
  });
});

describe("specs", () => {
  const rows = [
    { date: "2025-04-01", value: 3.9, series: "Eurostat" },
    { date: "2025-07-01", value: 4, series: "Eurostat" },
  ];

  it("uses grouped numbers, not SI prefixes, and Polish tooltip titles", () => {
    const spec = lineSpec(rows, { x: "date", y: "value", series: "series", yTitle: "%", frequencies: ["M"], lang: "pl" }) as unknown as {
      encoding: { x: { axis: { format: string } }; y: { axis: { format: string } }; tooltip: { title: string; format?: string }[] };
    };
    expect(spec.encoding.y.axis.format).toBe(",~f");
    expect(spec.encoding.x.axis.format).toBe("%b %Y");
    expect(spec.encoding.tooltip.map((x) => x.title)).toEqual(["Seria", "Okres", "%"]);
    const annual = lineSpec(rows, { x: "date", y: "value", series: "series", yTitle: "%", frequencies: ["A"] }) as unknown as {
      encoding: { x: { axis: { format: string } } };
    };
    expect(annual.encoding.x.axis.format).toBe("%Y");
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

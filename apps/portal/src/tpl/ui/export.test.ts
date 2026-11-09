import { describe, expect, it } from "vitest";
import type { ZChartProps } from "@zohelo/visuals";
import { tableClipboard } from "./copy";
import { buildPptx, nativeChart, type DeckTheme, type SlideSpec } from "./pptx";

const UNIT = { symbol: "zł", isRate: false, decimals: 0 };
const base = (type: ZChartProps["type"], extra: Partial<ZChartProps> = {}): ZChartProps =>
  ({
    type,
    lang: "pl",
    unit: UNIT,
    ariaLabel: "test",
    categories: [
      { key: "PL", label: "Polska" },
      { key: "DE", label: "Niemcy" },
      { key: "CZ", label: "Czechy" },
    ],
    series: [
      {
        id: "a",
        label: "2023",
        points: [
          { x: "PL", y: 7000 },
          { x: "DE", y: 18000.5 },
          { x: "CZ", y: 8000 },
        ],
      },
      {
        id: "b",
        label: "2024",
        points: [
          { x: "PL", y: 7600 },
          { x: "DE", y: null },
          { x: "CZ", y: 8400 },
        ],
      },
    ],
    ...extra,
  }) as ZChartProps;

const THEME: DeckTheme = {
  ink: "111111",
  ink2: "444444",
  ink3: "777777",
  line: "DDDDDD",
  surface: "FFFFFF",
  series: ["2A78D6", "EB6834", "1BAF7A"],
  font: "Inter",
};

/** File names are stored as plain text in a zip, so a byte search tells which parts the deck holds. */
const has = (buf: ArrayBuffer, name: string) => Buffer.from(buf).includes(Buffer.from(name));

describe("copy for Excel (docs/product-principles.md, need 1)", () => {
  const table = {
    columns: ["Okres", "Polska", "Niemcy"],
    rows: [
      ["2024-01", 7600.5, 18000],
      ["2024-02", 7712.25, null],
    ] as (string | number | null)[][],
  };

  it("puts the header row first with the unit, numbers as numbers, text as text, the source under a blank row", () => {
    const { html, text } = tableClipboard("Wynagrodzenia", table, {
      excel: true,
      comma: true,
      unit: "zł",
      sub: "złote",
      foot: ["Źródło: GUS"],
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe("Okres\tPolska (zł)\tNiemcy (zł)");
    // Polish Excel: the decimal comma in the text form.
    expect(lines[1]).toBe("2024-01\t7600,5\t18000");
    expect(lines[2]).toBe("2024-02\t7712,25\t");
    expect(lines.slice(3)).toEqual(["", "Wynagrodzenia", "złote", "Źródło: GUS"]);
    // HTML: the plain value travels in x:num whatever the shown decimal sign; periods are marked as text, so Excel
    // does not turn "2024-01" into a date.
    expect(html).toContain('xmlns:x="urn:schemas-microsoft-com:office:excel"');
    expect(html).toContain('<td x:num="7600.5" align="right">7600,5</td>');
    expect(html).toContain(`<td style='mso-number-format:"\\@"'>2024-01</td>`);
    expect(html).toContain("<th>Polska (zł)</th>");
    expect(html).not.toContain("<caption>");
    expect(html.indexOf("<table>")).toBeLessThan(html.indexOf("Wynagrodzenia"));
  });

  it("keeps the caption-first form for documents and the dot for English", () => {
    const { html, text } = tableClipboard("Wages", table, { foot: ["Source: GUS"] });
    expect(text.split("\n")[0]).toBe("Wages");
    expect(text).toContain("2024-01\t7600.5\t18000");
    expect(html).toContain("<caption>Wages</caption>");
  });
});

describe("PowerPoint export (need 2: charts as editable objects)", () => {
  it("maps plain types to native charts and leaves the rest as pictures", () => {
    expect(nativeChart(base("line-highlight"))).toMatchObject({ kind: "line", labels: ["Polska", "Niemcy", "Czechy"] });
    expect(nativeChart(base("columns"))?.kind).toBe("column");
    expect(nativeChart(base("grouped-bars", { opts: { horizontal: true } }))?.kind).toBe("bar");
    expect(nativeChart(base("stacked-columns", { opts: { percent: true } }))).toMatchObject({ kind: "column", stack: "percent" });
    expect(nativeChart(base("stacked-area"))).toMatchObject({ kind: "area", stack: "stacked" });
    expect(nativeChart(base("pie", { opts: { donut: true } }))?.kind).toBe("doughnut");
    const combo = nativeChart(base("combo"))!;
    expect(combo.series.map((s) => !!s.line)).toEqual([false, true]);
    // Ranked bars go out in the drawn order: from the largest.
    const ranked = nativeChart(base("ranked-bars"))!;
    expect(ranked.labels).toEqual(["Niemcy", "Czechy", "Polska"]);
    expect(ranked.series[0]!.values).toEqual([18000.5, 8000, 7000]);
    // A missing value stays a gap, never a zero.
    expect(nativeChart(base("columns"))!.series[1]!.values).toEqual([7600, null, 8400]);
    // Office cannot draw these: vector picture.
    for (const t of ["ibcs-columns", "variance-bars", "pareto", "choropleth", "small-multiples", "bridge", "dumbbell"] as const)
      expect(nativeChart(base(t)), t).toBeNull();
  });

  it("scatter pairs the x and y measures per unit", () => {
    const z = base("scatter", {
      series: [
        {
          id: "x",
          label: "PKB",
          points: [
            { x: "PL", y: 1 },
            { x: "DE", y: 2 },
            { x: "CZ", y: null },
          ],
        },
        {
          id: "y",
          label: "Płace",
          points: [
            { x: "PL", y: 10 },
            { x: "DE", y: 20 },
            { x: "CZ", y: 30 },
          ],
        },
      ],
    });
    expect(nativeChart(z)).toMatchObject({
      kind: "scatter",
      labels: ["Polska", "Niemcy"],
      series: [{ values: [1, 2] }, { values: [10, 20] }],
    });
  });

  it("writes a deck with a native chart and its embedded workbook, and a vector picture with the note", async () => {
    const slides: SlideSpec[] = [
      {
        title: "Płace rosną",
        sub: "złote · rocznie",
        finding: "Najwyżej Niemcy",
        source: "Źródło: GUS",
        unit: "zł",
        native: nativeChart(base("columns")),
      },
      {
        title: "Odchylenia",
        source: "Źródło: GUS",
        comment: "Do omówienia na zarządzie",
        picture: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200"/></svg>',
          w: 400,
          h: 200,
        },
        note: "PowerPoint nie ma takiego wykresu",
      },
    ];
    const buf = await buildPptx(slides, { title: "Test", theme: THEME });
    expect(buf.byteLength).toBeGreaterThan(10_000);
    expect(has(buf, "ppt/slides/slide1.xml")).toBe(true);
    expect(has(buf, "ppt/slides/slide2.xml")).toBe(true);
    // The native chart and the workbook behind it ("Edytuj dane" in PowerPoint).
    expect(has(buf, "ppt/charts/chart")).toBe(true);
    expect(has(buf, "ppt/embeddings/")).toBe(true);
    // The picture travels as SVG.
    expect(has(buf, ".svg")).toBe(true);
  }, 20_000);
});

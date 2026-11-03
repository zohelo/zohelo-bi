import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareTable } from "./CompareTable";

describe("CompareTable", () => {
  const table = {
    sources: ["eurostat", "gus_bdl"],
    rows: [
      { period: "2023", values: { eurostat: 10, gus_bdl: 12 }, spread: 2 },
      { period: "2022", values: { eurostat: 9, gus_bdl: null }, spread: null },
    ],
    mixed: false,
  };

  it("has a column per source and a spread column", () => {
    const html = renderToStaticMarkup(<CompareTable table={table} />);
    expect(html).toContain("<th>Period</th><th>Eurostat</th><th>GUS BDL</th><th>Spread</th>");
  });

  it("renders a missing value as a dash", () => {
    const html = renderToStaticMarkup(<CompareTable table={table} />);
    expect(html).toContain('<td class="num">–</td>');
  });

  it("says when only one source publishes the KPI", () => {
    const html = renderToStaticMarkup(
      <CompareTable table={{ sources: ["eurostat"], rows: [{ period: "2023", values: { eurostat: 10 }, spread: null }], mixed: false }} />,
    );
    expect(html).toContain("Only one source publishes this KPI.");
    expect(html).not.toContain("<table");
  });

  it("shows only the one-area hint, no table, for rows of several areas (EN and PL)", () => {
    const mixed = { sources: ["eurostat", "gus_bdl"], rows: [], mixed: true };
    const en = renderToStaticMarkup(<CompareTable table={mixed} />);
    expect(en).toContain("pick one area in the filters to compare the sources.");
    expect(en).not.toContain("<table");
    expect(renderToStaticMarkup(<CompareTable table={mixed} lang="pl" />)).toContain("wybierz jeden obszar w filtrach");
  });

  it("gives each source one precision in the page language (4,0 next to 3,9)", () => {
    const one = {
      sources: ["eurostat", "gus_bdl"],
      rows: [
        { period: "2024", values: { eurostat: 4, gus_bdl: 3.9 }, spread: 0.1 },
        { period: "2023", values: { eurostat: 3.9, gus_bdl: 4 }, spread: 0.1 },
      ],
      mixed: false,
    };
    const html = renderToStaticMarkup(<CompareTable table={one} lang="pl" />);
    expect(html).toContain('<td class="num">4,0</td><td class="num">3,9</td><td class="num">0,1</td>');
  });

  it("renders the Polish texts with lang pl", () => {
    const html = renderToStaticMarkup(<CompareTable table={table} lang="pl" />);
    expect(html).toContain("<th>Okres</th>");
    expect(html).toContain("Rozpiętość");
    const one = renderToStaticMarkup(
      <CompareTable
        table={{ sources: ["eurostat"], rows: [{ period: "2023", values: { eurostat: 10 }, spread: null }], mixed: false }}
        lang="pl"
      />,
    );
    expect(one).toContain("Ten wskaźnik publikuje tylko jedno źródło.");
  });
});

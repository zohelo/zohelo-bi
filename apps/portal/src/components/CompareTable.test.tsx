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
      <CompareTable table={{ sources: ["eurostat"], rows: [{ period: "2023", values: { eurostat: 10 }, spread: null }] }} />,
    );
    expect(html).toContain("Only one source publishes this KPI.");
    expect(html).not.toContain("<table");
  });
});

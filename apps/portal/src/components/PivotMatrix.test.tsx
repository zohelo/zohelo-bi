import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PivotResult } from "@zohelo/semantic";
import { PivotMatrix } from "./PivotMatrix";

const grid = (rows: number, cols: number, cell: (r: number, c: number) => number | null = (r, c) => r * 10 + c): PivotResult => ({
  rowKeys: Array.from({ length: rows }, (_, r) => [r < rows / 2 ? "Polska" : "Czechia", `S${r}`]),
  colKeys: Array.from({ length: cols }, (_, c) => [String(2020 + c)]),
  cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => cell(r, c))),
  conflicts: 0,
  truncated: false,
});

const render = (result: PivotResult) =>
  renderToStaticMarkup(<PivotMatrix result={result} unit="persons" rowLabels={["Area", "Source"]} colLabels={["Period"]} />);

describe("PivotMatrix", () => {
  it("renders 16 body rows with 3 value columns", () => {
    const html = render(grid(16, 3));
    const body = html.split("<tbody>")[1]!.split("</tbody>")[0]!;
    const rows = body.split("<tr>").slice(1);
    expect(rows).toHaveLength(16);
    for (const row of rows) expect(row.match(/<td /g)).toHaveLength(3);
    expect(html).toContain("<caption>persons</caption>");
  });

  it("renders a null cell as a dash", () => {
    expect(render(grid(1, 2, (_, c) => (c === 1 ? null : 5)))).toContain('<td class="num">–</td>');
  });

  it("renders the hint and no table when truncated", () => {
    const html = render({ ...grid(2, 2), cells: [], truncated: true });
    expect(html).toContain("Too many cells (4). Narrow a dimension.");
    expect(html).not.toContain("<table");
  });

  it("explains conflicting cells", () => {
    expect(render({ ...grid(2, 2), conflicts: 2 })).toContain("2 cells had more than one value and are left empty.");
  });
});

import { describe, expect, it } from "vitest";
import { acrossMatrix, acrossUnit, type PivotResult } from "./index";

const matrix = (rowKeys: string[][], cells: (number | null)[][], truncated = false): PivotResult => ({
  rowKeys,
  colKeys: [["2024-01-01"]],
  cells,
  conflicts: 0,
  truncated,
});

const abt = () => matrix([["A"], ["B"], ["_T"]], [[50], [30], [100]]);

describe("acrossMatrix", () => {
  it("gives share of the total row and rank without it", () => {
    expect(acrossMatrix(abt(), "share").cells).toEqual([[50], [30], [100]]);
    expect(acrossMatrix(abt(), "rank").cells).toEqual([[1], [2], [null]]);
  });

  it("keeps null cells unranked and gives ties the lower rank", () => {
    const m = matrix([["A"], ["B"], ["C"], ["D"]], [[5], [5], [null], [1]]);
    expect(acrossMatrix(m, "rank").cells).toEqual([[1], [1], [null], [3]]);
  });

  it("gives null shares without a total row", () => {
    const m = matrix([["A"], ["B"]], [[1], [2]]);
    expect(acrossMatrix(m, "share").cells).toEqual([[null], [null]]);
  });

  it("uses a 2-level total key", () => {
    const m = matrix(
      [
        ["Polska", "a"],
        ["Polska", "_T"],
      ],
      [[25], [50]],
    );
    expect(acrossMatrix(m, "share", "Polska / _T").cells).toEqual([[50], [100]]);
  });

  it("returns a truncated result as is and never mutates the input", () => {
    const truncated = matrix([["A"]], [[1]], true);
    expect(acrossMatrix(truncated, "share")).toBe(truncated);
    const input = abt();
    const before = JSON.stringify(input);
    acrossMatrix(input, "share");
    acrossMatrix(input, "rank");
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("acrossUnit", () => {
  it("names the units", () => {
    expect(acrossUnit("share")).toBe("% of total");
    expect(acrossUnit("rank")).toBe("rank (1 = largest)");
  });
});

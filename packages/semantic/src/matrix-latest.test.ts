import { describe, expect, it } from "vitest";
import { latestMatrix, type PivotResult } from "./index";

const matrix = (cells: (number | null)[][], truncated = false): PivotResult => ({
  rowKeys: [["A"], ["B"]],
  colKeys: [["2023-01-01"], ["2024-01-01"]],
  cells,
  conflicts: 0,
  truncated,
});

describe("latestMatrix", () => {
  it("keeps each row's latest value and its period", () => {
    const input = matrix([
      [1, null],
      [null, null],
    ]);
    const before = JSON.stringify(input);
    const { result, periods } = latestMatrix(input);
    expect(result.cells).toEqual([[1], [null]]);
    expect(periods).toEqual(["2023-01-01", null]);
    expect(result.colKeys).toEqual([["latest"]]);
    expect(result.rowKeys).toEqual(input.rowKeys);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("needs periods as the only column dimension", () => {
    const m: PivotResult = { ...matrix([[1]]), colKeys: [["2024-01-01", "eurostat"]] };
    expect(() => latestMatrix(m)).toThrow("latest needs periods as the only column dimension");
  });

  it("returns a truncated result as is", () => {
    const m = matrix([[1, 2]], true);
    const out = latestMatrix(m);
    expect(out.result).toBe(m);
    expect(out.periods).toEqual([]);
  });
});

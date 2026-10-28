import type { PivotResult } from "@zohelo/semantic";
import { describe, expect, it } from "vitest";
import { EXPLORER_TRANSFORMS, applyTransform, parseTransform } from "./transform";

const matrix = (rows: [string, (number | null)[]][], periods: string[]): PivotResult => ({
  rowKeys: rows.map(([k]) => [k]),
  colKeys: periods.map((p) => [p]),
  cells: rows.map(([, cells]) => cells),
  conflicts: 0,
  truncated: false,
});

const clone = (m: PivotResult): PivotResult => JSON.parse(JSON.stringify(m)) as PivotResult;

describe("parseTransform", () => {
  it("accepts the seven transforms and falls back to none", () => {
    expect(EXPLORER_TRANSFORMS).toEqual(["none", "change", "yoy", "index", "latest", "share", "rank"]);
    for (const t of EXPLORER_TRANSFORMS) expect(parseTransform(t)).toBe(t);
    expect(parseTransform("x")).toBe("none");
    expect(parseTransform(null)).toBe("none");
  });
});

describe("applyTransform", () => {
  it("shares and ranks rows without a total row against their sum", () => {
    const m = matrix(
      [
        ["a", [1]],
        ["b", [3]],
      ],
      ["2024-01-01"],
    );
    const before = clone(m);
    const share = applyTransform(m, "share", "persons", "2024-01-01");
    expect(share.result.cells).toEqual([[25], [75]]);
    expect(share.result.rowKeys).toEqual([["a"], ["b"]]);
    expect(share.unit).toBe("% of total");
    expect(share.periods).toBeNull();
    const rank = applyTransform(m, "rank", "persons", "2024-01-01");
    expect(rank.result.cells).toEqual([[2], [1]]);
    expect(rank.result.rowKeys).toHaveLength(2);
    expect(m).toEqual(before);
  });

  it("uses an existing '_T' row as the total and keeps it", () => {
    const m = matrix(
      [
        ["_T", [10]],
        ["a", [1]],
      ],
      ["2024-01-01"],
    );
    const before = clone(m);
    const share = applyTransform(m, "share", "persons", "2024-01-01");
    expect(share.result.rowKeys).toEqual([["_T"], ["a"]]);
    expect(share.result.cells[1]).toEqual([10]);
    expect(m).toEqual(before);
  });

  it("gives null shares in a period where every row is null", () => {
    const m = matrix(
      [
        ["a", [1, null]],
        ["b", [3, null]],
      ],
      ["2024-01-01", "2025-01-01"],
    );
    expect(applyTransform(m, "share", "persons", "2024-01-01").result.cells).toEqual([
      [25, null],
      [75, null],
    ]);
  });

  it("returns the period of each row's latest value", () => {
    const m = matrix(
      [
        ["a", [1, 2]],
        ["b", [3, null]],
      ],
      ["2024-01-01", "2025-01-01"],
    );
    const before = clone(m);
    const latest = applyTransform(m, "latest", "persons", "2024-01-01");
    expect(latest.periods).toEqual(["2025-01-01", "2024-01-01"]);
    expect(latest.result.cells).toEqual([[2], [3]]);
    expect(latest.unit).toBe("persons");
    expect(m).toEqual(before);
  });

  it("applies the along-time transforms with their units", () => {
    const m = matrix([["a", [100, 110]]], ["2024-01-01", "2025-01-01"]);
    const before = clone(m);
    expect(applyTransform(m, "none", "persons", "2024-01-01")).toEqual({ result: m, unit: "persons", periods: null });
    expect(applyTransform(m, "change", "persons", "2024-01-01").result.cells).toEqual([[null, 10]]);
    const yoy = applyTransform(m, "yoy", "persons", "2024-01-01");
    expect(yoy.unit).toBe("% y/y");
    expect(yoy.result.cells[0]?.[1]).toBeCloseTo(10);
    const index = applyTransform(m, "index", "persons", "2024-01-01");
    expect(index.unit).toBe("index, 2024-01-01 = 100");
    expect(index.result.cells).toEqual([[100, 110]]);
    expect(m).toEqual(before);
  });
});

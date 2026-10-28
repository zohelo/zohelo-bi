import { describe, expect, it } from "vitest";
import { NULL_KEY, pivot } from "./index";

const rows = [
  { area: "Polska", year: "2024", value: 1 },
  { area: "Polska", year: "2023", value: 2 },
  { area: "Czechia", year: "2024", value: "3.5" },
  { area: "Czechia", year: "2023", value: 4 },
];

describe("pivot", () => {
  it("builds a 2×2 grid", () => {
    const r = pivot({ rows, rowDims: ["area"], colDims: ["year"], value: "value" });
    expect(r.rowKeys).toEqual([["Czechia"], ["Polska"]]);
    expect(r.colKeys).toEqual([["2023"], ["2024"]]);
    expect(r.cells).toEqual([
      [4, 3.5],
      [2, 1],
    ]);
    expect(r.conflicts).toBe(0);
    expect(r.truncated).toBe(false);
  });

  it("leaves cells without a row null", () => {
    const r = pivot({ rows: rows.slice(0, 3), rowDims: ["area"], colDims: ["year"], value: "value" });
    expect(r.cells[0]).toEqual([null, 3.5]);
  });

  it("keeps empty values null instead of 0", () => {
    const r = pivot({ rows: [{ area: "Polska", value: null }], rowDims: ["area"], colDims: [], value: "value" });
    expect(r.cells).toEqual([[null]]);
  });

  it("counts two rows in one cell as a conflict, never a sum", () => {
    const r = pivot({ rows: [...rows, { area: "Polska", year: "2024", value: 9 }], rowDims: ["area"], colDims: ["year"], value: "value" });
    expect(r.cells[1]).toEqual([2, null]);
    expect(r.conflicts).toBe(1);
  });

  it("truncates above maxCells but keeps the keys", () => {
    const r = pivot({ rows, rowDims: ["area"], colDims: ["year"], value: "value", maxCells: 3 });
    expect(r.truncated).toBe(true);
    expect(r.cells).toEqual([]);
    expect(r.rowKeys).toHaveLength(2);
    expect(r.colKeys).toHaveLength(2);
  });

  it("throws on more than two dimensions per axis", () => {
    expect(() => pivot({ rows, rowDims: ["a", "b", "c"], colDims: [], value: "value" })).toThrow("max 2 dimensions per axis");
  });

  it("sorts dates ascending, numbers numerically, text in Polish order and nulls as ∅", () => {
    const keys = (values: unknown[]) =>
      pivot({ rows: values.map((v) => ({ k: v, value: 1 })), rowDims: ["k"], colDims: [], value: "value" }).rowKeys.flat();
    expect(keys(["2024-01-01", "2023-12-31", "2023-06-30"])).toEqual(["2023-06-30", "2023-12-31", "2024-01-01"]);
    expect(keys([10, 9, 100])).toEqual(["9", "10", "100"]);
    expect(keys(["Łódź", "Lublin", "Zabrze"])).toEqual(["Lublin", "Łódź", "Zabrze"]);
    expect(keys([null])).toEqual([NULL_KEY]);
  });

  it("supports two dimensions on one axis", () => {
    const r = pivot({ rows, rowDims: ["area", "year"], colDims: [], value: "value" });
    expect(r.rowKeys).toEqual([
      ["Czechia", "2023"],
      ["Czechia", "2024"],
      ["Polska", "2023"],
      ["Polska", "2024"],
    ]);
    expect(r.cells.flat()).toEqual([4, 3.5, 2, 1]);
  });
});

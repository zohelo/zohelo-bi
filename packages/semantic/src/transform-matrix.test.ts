import { describe, expect, it } from "vitest";
import { transformMatrix, transformUnit, type PivotResult } from "./index";

const matrix = (periods: string[], values: (number | null)[]): PivotResult => ({
  rowKeys: [["Polska", "eurostat"]],
  colKeys: periods.map((p) => [p]),
  cells: [values],
  conflicts: 0,
  truncated: false,
});
const m = matrix(["2023-01-01", "2024-01-01"], [100, 110]);

describe("transformMatrix", () => {
  it("returns the matrix itself for none", () => {
    expect(transformMatrix(m, "none")).toBe(m);
  });

  it("gives year on year % from the same date a year earlier", () => {
    expect(transformMatrix(m, "yoy").cells).toEqual([[null, 10]]);
  });

  it("gives null after a gap year", () => {
    expect(transformMatrix(matrix(["2022-01-01", "2024-01-01"], [100, 110]), "yoy").cells).toEqual([[null, null]]);
  });

  it("indexes to the base period", () => {
    expect(transformMatrix(m, "index", "2023-01-01").cells).toEqual([[100, 110]]);
    expect(transformMatrix(m, "index").cells).toEqual([[100, 110]]);
  });

  it("gives the change on the previous period", () => {
    expect(transformMatrix(m, "change").cells).toEqual([[null, 10]]);
  });

  it("keeps the keys", () => {
    const out = transformMatrix(m, "change");
    expect(out.rowKeys).toEqual(m.rowKeys);
    expect(out.colKeys).toEqual(m.colKeys);
  });

  it("throws on a 2-level column key", () => {
    expect(() =>
      transformMatrix(
        {
          ...m,
          colKeys: [
            ["2023-01-01", "A"],
            ["2024-01-01", "A"],
          ],
        },
        "yoy",
      ),
    ).toThrow("transforms need periods as the only column dimension");
  });
});

describe("transformUnit", () => {
  it("names the unit of each transform", () => {
    expect(transformUnit("none", "persons", "2023-01-01")).toBe("persons");
    expect(transformUnit("change", "persons", "2023-01-01")).toBe("persons");
    expect(transformUnit("yoy", "persons", "2023-01-01")).toBe("% y/y");
    expect(transformUnit("index", "persons", "2023-01-01")).toBe("index, 2023-01-01 = 100");
  });
});

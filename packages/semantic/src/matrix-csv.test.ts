import { describe, expect, it } from "vitest";
import { matrixToCsv, type PivotResult } from "./index";

const result: PivotResult = {
  rowKeys: [
    ["Polska", "eurostat"],
    ["Bosnia, Herzegovina", "world_bank"],
  ],
  colKeys: [["2023"], ["2024"]],
  cells: [
    [37.6, 37.5],
    [3.2, null],
  ],
  conflicts: 0,
  truncated: false,
};
const lines = (r: PivotResult) => matrixToCsv(r, ["Area", "Source"]).split("\n");

describe("matrixToCsv", () => {
  it("writes the row header, then one column per column key", () => {
    expect(lines(result)[0]).toBe("Area,Source,2023,2024");
    expect(lines(result)[1]).toBe("Polska,eurostat,37.6,37.5");
  });

  it("leaves a null cell empty", () => {
    expect(lines(result)[2]?.endsWith(",3.2,")).toBe(true);
  });

  it("quotes a label with a comma", () => {
    expect(lines(result)[2]).toBe('"Bosnia, Herzegovina",world_bank,3.2,');
  });

  it("quotes and doubles a quote", () => {
    const r = {
      ...result,
      rowKeys: [
        ['Say "hi"', "x"],
        ["b", "y"],
      ],
    };
    expect(lines(r)[1]).toBe('"Say ""hi""",x,37.6,37.5');
  });

  it("joins a 2-level column key with ' / '", () => {
    const r = {
      ...result,
      colKeys: [
        ["2023", "M"],
        ["2024", "M"],
      ],
    };
    expect(lines(r)[0]).toBe("Area,Source,2023 / M,2024 / M");
  });

  it("throws on a truncated matrix", () => {
    expect(() => matrixToCsv({ ...result, truncated: true }, ["Area"])).toThrow("matrix truncated: narrow a dimension");
  });
});

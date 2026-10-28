import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { matrixToXlsx, type PivotResult } from "./index";
import { columnName } from "./xlsx";

const result: PivotResult = {
  rowKeys: [["Polska"], ["Bosnia & Herzegovina"]],
  colKeys: [["2023"], ["2024"]],
  cells: [
    [37.6, 37.5],
    [3.2, null],
  ],
  conflicts: 0,
  truncated: false,
};
const opts = { rowHeader: ["Area"], title: "Population", unit: "million persons" };
const sheet = (r: PivotResult) => strFromU8(unzipSync(matrixToXlsx(r, opts))["xl/worksheets/sheet1.xml"]!);

describe("matrixToXlsx", () => {
  it("writes the workbook parts", () => {
    const files = Object.keys(unzipSync(matrixToXlsx(result, opts))).sort();
    expect(files).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("puts the title in A1 and the header row under it", () => {
    const xml = sheet(result);
    expect(xml).toContain('<c r="A1" t="inlineStr"><is><t>Population (million persons)</t></is></c>');
    expect(xml).toContain(
      '<row r="2"><c r="A2" t="inlineStr"><is><t>Area</t></is></c><c r="B2" t="inlineStr"><is><t>2023</t></is></c><c r="C2" t="inlineStr"><is><t>2024</t></is></c></row>',
    );
  });

  it("writes values as numbers and leaves null cells out", () => {
    const xml = sheet(result);
    expect(xml).toContain('<c r="B3"><v>37.6</v></c>');
    expect(xml).toContain('<c r="B4"><v>3.2</v></c>');
    expect(xml).not.toContain('r="C4"');
  });

  it("escapes XML in labels", () => {
    expect(sheet(result)).toContain("<t>Bosnia &amp; Herzegovina</t>");
  });

  it("names column 27 AA", () => {
    expect([columnName(1), columnName(26), columnName(27), columnName(28), columnName(702), columnName(703)]).toEqual([
      "A",
      "Z",
      "AA",
      "AB",
      "ZZ",
      "AAA",
    ]);
    const wide: PivotResult = { ...result, colKeys: Array.from({ length: 26 }, (_, i) => [String(i)]), cells: [Array(26).fill(1), []] };
    expect(sheet(wide)).toContain('<c r="AA3"><v>1</v></c>');
  });

  it("throws for a truncated matrix", () => {
    expect(() => matrixToXlsx({ ...result, cells: [], truncated: true }, opts)).toThrow("matrix truncated: narrow a dimension");
  });
});

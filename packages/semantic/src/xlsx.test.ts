import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { rowsToXlsx } from "./index";
import { columnName } from "./xlsx";

const rows = [["Population (million persons)"], ["Area", "2023", "2024"], ["Polska", 37.6, 37.5], ["Bosnia & Herzegovina", 3.2, null]];
const sheet = (r: (string | number | null)[][]) => strFromU8(unzipSync(rowsToXlsx(r))["xl/worksheets/sheet1.xml"]!);

describe("rowsToXlsx", () => {
  it("writes the workbook parts", () => {
    const files = Object.keys(unzipSync(rowsToXlsx(rows))).sort();
    expect(files).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("writes any rows as one named sheet", () => {
    const parts = unzipSync(rowsToXlsx([["Tytuł", "Inflacja"], [], ["okres", "wartość"], ["2025", 3.6]], "Eksplorator"));
    expect(strFromU8(parts["xl/workbook.xml"]!)).toContain('name="Eksplorator"');
    const xml = strFromU8(parts["xl/worksheets/sheet1.xml"]!);
    expect(xml).toContain('<c r="B4"><v>3.6</v></c>');
    expect(xml).toContain("<t>wartość</t>");
  });

  it("writes values as numbers and leaves null cells out", () => {
    const xml = sheet(rows);
    expect(xml).toContain('<c r="B3"><v>37.6</v></c>');
    expect(xml).toContain('<c r="B4"><v>3.2</v></c>');
    expect(xml).not.toContain('r="C4"');
  });

  it("escapes XML in labels", () => {
    expect(sheet(rows)).toContain("<t>Bosnia &amp; Herzegovina</t>");
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
    expect(sheet([[], [], Array(27).fill(1)])).toContain('<c r="AA3"><v>1</v></c>');
  });
});

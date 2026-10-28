// The explorer matrix as a minimal .xlsx: four XML parts plus the sheet, zipped with fflate.
// No spreadsheet library (architect decision 28 Oct); no styles, number formats or widths.

import { strToU8, zipSync } from "fflate";
import type { PivotResult } from "./pivot";

export type XlsxOptions = { rowHeader: string[]; title: string; unit: string };

type Cell = string | number | null;

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** 1 → A, 26 → Z, 27 → AA. */
export function columnName(n: number): string {
  let name = "";
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) name = String.fromCharCode(65 + ((i - 1) % 26)) + name;
  return name;
}

function cellXml(value: Cell, ref: string): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? `<c r="${ref}"><v>${value}</v></c>` : "";
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function sheetXml(rows: Cell[][]): string {
  const body = rows
    .map((cells, i) => `<row r="${i + 1}">${cells.map((v, c) => cellXml(v, `${columnName(c + 1)}${i + 1}`)).join("")}</row>`)
    .join("");
  return `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function grid(result: PivotResult, opts: XlsxOptions): Cell[][] {
  const levels = Math.max(result.colKeys[0]?.length ?? 0, 1);
  const header = Array.from({ length: levels }, (_, level): Cell[] => [
    ...opts.rowHeader.map((h) => (level === 0 ? h : null)),
    ...result.colKeys.map((k) => k[level] ?? (level === 0 ? "Value" : null)),
  ]);
  const body = result.rowKeys.map((key, r): Cell[] => [...key, ...(result.cells[r] ?? [])]);
  return [[`${opts.title} (${opts.unit})`], ...header, ...body];
}

export function matrixToXlsx(result: PivotResult, opts: XlsxOptions): Uint8Array {
  if (result.truncated) throw new Error("matrix truncated: narrow a dimension");
  const ns = "http://schemas.openxmlformats.org";
  return zipSync({
    "[Content_Types].xml": strToU8(
      `${XML}<Types xmlns="${ns}/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `</Types>`,
    ),
    "_rels/.rels": strToU8(
      `${XML}<Relationships xmlns="${ns}/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `${XML}<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Matrix" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `${XML}<Relationships xmlns="${ns}/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `</Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(grid(result, opts))),
  });
}

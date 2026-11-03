// Client-side CSV export with a metadata header (source, licence, sample-data notice). Values are written
// machine-readable (dot decimals, comma separators, RFC 4180 quoting); metadata lines start with "# " so
// spreadsheet and pandas readers can skip them (pandas: comment="#").

export type CsvMeta = { label: string; value: string }[];
export type CsvTable = { columns: string[]; rows: (string | number | null | undefined)[][] };

export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  // Defuse spreadsheet formulas in text cells (CSV injection), then quote when needed.
  const text = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(meta: CsvMeta, table: CsvTable): string {
  const head = meta.map((m) => `# ${m.label}: ${m.value.replace(/[\r\n]+/g, " ")}`);
  const body = [table.columns, ...table.rows].map((r) => r.map(csvCell).join(","));
  return [...head, ...body].join("\r\n") + "\r\n";
}

/** File name safe on every OS: "zohelo-hicp_annual_rate-2026-11-03.csv". */
export function csvFileName(stem: string, date = new Date()): string {
  const safe = stem
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `zohelo-${safe || "dane"}-${date.toISOString().slice(0, 10)}.csv`;
}

/** Saves the text as a UTF-8 CSV (with BOM so spreadsheets read Polish letters). */
export function downloadCsv(fileName: string, text: string): void {
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

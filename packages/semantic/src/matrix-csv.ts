// The explorer matrix as CSV, exactly as shown: row key parts, then one column per column key.

import type { PivotResult } from "./pivot";

function esc(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function matrixToCsv(result: PivotResult, rowHeader: string[]): string {
  if (result.truncated) throw new Error("matrix truncated: narrow a dimension");
  const header = [...rowHeader, ...result.colKeys.map((k) => k.join(" / "))];
  const lines = result.rowKeys.map((key, i) => [...key, ...(result.cells[i] ?? []).map((v) => (v == null ? "" : String(v)))]);
  return [header, ...lines].map((cells) => cells.map(esc).join(",")).join("\n");
}

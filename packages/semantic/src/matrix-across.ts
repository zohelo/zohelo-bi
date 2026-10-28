// Share of total and rank across the members of each period: PivotResult has members on rows and
// periods on columns, so both run down each column. A row's member key is its rowKeys entry joined
// with ' / '; '_T' is the total member of published series.

import type { PivotResult } from "./pivot";
import { rank, share } from "./transforms";

export type AcrossTransform = "share" | "rank";

export function acrossMatrix(result: PivotResult, t: AcrossTransform, totalKey = "_T"): PivotResult {
  if (result.truncated) return result;
  const keys = result.rowKeys.map((k) => k.join(" / "));
  const cells = result.rowKeys.map(() => result.colKeys.map((): number | null => null));
  result.colKeys.forEach((_, j) => {
    const values: Record<string, number | null> = {};
    keys.forEach((key, i) => (values[key] = result.cells[i]?.[j] ?? null));
    let out: Record<string, number | null>;
    if (t === "share") out = share(values, totalKey);
    else {
      delete values[totalKey];
      out = rank(values);
    }
    keys.forEach((key, i) => (cells[i]![j] = out[key] ?? null));
  });
  return { ...result, cells };
}

export function acrossUnit(t: AcrossTransform): string {
  return t === "share" ? "% of total" : "rank (1 = largest)";
}

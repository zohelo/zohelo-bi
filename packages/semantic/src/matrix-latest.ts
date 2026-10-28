// The 'latest' matrix transform: each row collapses to its last period with a value. Sources lag
// differently, so the period of each row's value is returned next to the matrix.

import type { PivotResult } from "./pivot";
import { latest } from "./transforms";

export type LatestMatrix = { result: PivotResult; periods: (string | null)[] };

export function latestMatrix(result: PivotResult): LatestMatrix {
  if (!result.colKeys.every((k) => k.length === 1)) throw new Error("latest needs periods as the only column dimension");
  if (result.truncated) return { result, periods: [] };
  const periods: (string | null)[] = [];
  const cells = result.rowKeys.map((_, i) => {
    const p = latest(result.colKeys.map((k, j) => ({ period: k[0]!, value: result.cells[i]?.[j] ?? null })));
    periods.push(p?.period ?? null);
    return [p?.value ?? null];
  });
  return { result: { rowKeys: result.rowKeys, colKeys: [["latest"]], cells, conflicts: result.conflicts, truncated: false }, periods };
}

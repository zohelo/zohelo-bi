// One entry point for every Explorer transform: along time (change, y/y, index), the latest value
// per row, and across the rows of each period (share of total, rank).

import { acrossMatrix, acrossUnit, latestMatrix, transformMatrix, transformUnit, type PivotResult } from "@zohelo/semantic";

export type ExplorerTransform = "none" | "change" | "yoy" | "index" | "latest" | "share" | "rank";

export const EXPLORER_TRANSFORMS: ExplorerTransform[] = ["none", "change", "yoy", "index", "latest", "share", "rank"];

export function parseTransform(v: string | null): ExplorerTransform {
  return (EXPLORER_TRANSFORMS as string[]).includes(v ?? "") ? (v as ExplorerTransform) : "none";
}

/** The transformed matrix, its unit and, for 'latest', the period of each row's value. */
export type Applied = { result: PivotResult; unit: string; periods: (string | null)[] | null };

const TOTAL_KEY = "_T";

/** Share of total; without a '_T' row the total is the sum of the rows in each period. */
function shareMatrix(matrix: PivotResult): PivotResult {
  if (matrix.rowKeys.some((k) => k.join(" / ") === TOTAL_KEY)) return acrossMatrix(matrix, "share", TOTAL_KEY);
  const totals = matrix.colKeys.map((_, j) => {
    const values = matrix.cells.map((row) => row[j] ?? null).filter((v): v is number => v != null);
    return values.length === 0 ? null : values.reduce((a, b) => a + b, 0);
  });
  const withTotal: PivotResult = {
    ...matrix,
    rowKeys: [...matrix.rowKeys, [TOTAL_KEY]],
    cells: [...matrix.cells, totals],
  };
  const shared = acrossMatrix(withTotal, "share", TOTAL_KEY);
  return { ...shared, rowKeys: shared.rowKeys.slice(0, -1), cells: shared.cells.slice(0, -1) };
}

export function applyTransform(matrix: PivotResult, t: ExplorerTransform, unitLabel: string, base: string): Applied {
  switch (t) {
    case "latest": {
      const l = latestMatrix(matrix);
      return { result: l.result, unit: unitLabel, periods: l.periods };
    }
    case "share":
      return { result: shareMatrix(matrix), unit: acrossUnit("share"), periods: null };
    case "rank":
      return { result: acrossMatrix(matrix, "rank"), unit: acrossUnit("rank"), periods: null };
    default:
      return { result: transformMatrix(matrix, t, base), unit: transformUnit(t, unitLabel, base), periods: null };
  }
}

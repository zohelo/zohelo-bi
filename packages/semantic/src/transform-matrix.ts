// Explorer transforms applied to every row of a pivot matrix whose only column dimension is the
// period. date_key is a full ISO date for every frequency, so yoy always looks up the same date a
// year earlier ('D'), which is right for A, Q and M too and survives gaps.

import type { PivotResult } from "./pivot";
import { changePrev, index, yoy, type Point } from "./transforms";

export type MatrixTransform = "none" | "change" | "yoy" | "index";

export function transformMatrix(result: PivotResult, t: MatrixTransform, basePeriod?: string): PivotResult {
  if (t === "none") return result;
  if (!result.colKeys.every((k) => k.length === 1)) throw new Error("transforms need periods as the only column dimension");
  const base = basePeriod ?? result.colKeys[0]?.[0] ?? "";
  const cells = result.cells.map((row) => {
    const points: Point[] = result.colKeys.map((k, j) => ({ period: k[0]!, value: row[j] ?? null }));
    const out = t === "change" ? changePrev(points) : t === "yoy" ? yoy(points, "D") : index(points, base);
    return out.map((p) => p.value);
  });
  return { ...result, cells };
}

export function transformUnit(t: MatrixTransform, unit: string, basePeriod: string): string {
  if (t === "yoy") return "% y/y";
  if (t === "index") return `index, ${basePeriod} = 100`;
  return unit;
}

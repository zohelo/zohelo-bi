// Turns metric rows into a grid for the explorer matrix. Never aggregates: KPIs are often
// non-additive (rates), so two rows landing in one cell is a conflict (cell null), not a total.

export type PivotInput = {
  rows: Record<string, unknown>[];
  rowDims: string[];
  colDims: string[];
  value: string;
  /** Above this many cells the grid is not filled (default 50000). */
  maxCells?: number;
};

export type PivotResult = {
  rowKeys: string[][];
  colKeys: string[][];
  /** cells[row][col]; null when no row, an empty value or a conflict. */
  cells: (number | null)[][];
  /** Cells with two or more source rows. */
  conflicts: number;
  truncated: boolean;
};

export const NULL_KEY = "∅";
const MAX_DIMS = 2;
const ISO_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const NUMBER = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;
const collator = new Intl.Collator("pl");

function compareKey(a: string, b: string): number {
  if (ISO_DATE.test(a) && ISO_DATE.test(b)) return a < b ? -1 : a > b ? 1 : 0;
  if (NUMBER.test(a) && NUMBER.test(b)) return Number(a) - Number(b);
  return collator.compare(a, b);
}

function compareTuple(a: string[], b: string[]): number {
  for (let i = 0; i < a.length; i++) {
    const c = compareKey(a[i] ?? "", b[i] ?? "");
    if (c !== 0) return c;
  }
  return 0;
}

function tuple(row: Record<string, unknown>, dims: string[]): string[] {
  return dims.map((d) => (row[d] == null ? NULL_KEY : String(row[d])));
}

function distinctKeys(rows: Record<string, unknown>[], dims: string[]): string[][] {
  const seen = new Map<string, string[]>();
  for (const row of rows) {
    const t = tuple(row, dims);
    seen.set(JSON.stringify(t), t);
  }
  return [...seen.values()].sort(compareTuple);
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function pivot({ rows, rowDims, colDims, value, maxCells = 50000 }: PivotInput): PivotResult {
  if (rowDims.length > MAX_DIMS || colDims.length > MAX_DIMS) throw new Error("max 2 dimensions per axis");
  const rowKeys = distinctKeys(rows, rowDims);
  const colKeys = distinctKeys(rows, colDims);
  if (rowKeys.length * colKeys.length > maxCells) return { rowKeys, colKeys, cells: [], conflicts: 0, truncated: true };

  const rowIndex = new Map(rowKeys.map((k, i) => [JSON.stringify(k), i]));
  const colIndex = new Map(colKeys.map((k, i) => [JSON.stringify(k), i]));
  const cells: (number | null)[][] = rowKeys.map(() => colKeys.map(() => null));
  const hits: number[][] = rowKeys.map(() => colKeys.map(() => 0));
  for (const row of rows) {
    const r = rowIndex.get(JSON.stringify(tuple(row, rowDims)))!;
    const c = colIndex.get(JSON.stringify(tuple(row, colDims)))!;
    hits[r]![c]! += 1;
    cells[r]![c] = hits[r]![c] === 1 ? toNumber(row[value]) : null;
  }
  const conflicts = hits.flat().filter((h) => h > 1).length;
  return { rowKeys, colKeys, cells, conflicts, truncated: false };
}

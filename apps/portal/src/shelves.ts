import type { Metric } from "@zohelo/semantic";

// The explorer matrix layout: which dimensions are on rows and on columns, kept in the URL as
// rows=a,b&cols=c so every layout can be shared.

export type Shelves = { rows: string[]; cols: string[] };

export const DEFAULT_SHELVES: Shelves = { rows: ["geography_name", "source_system"], cols: ["date_key"] };

const MAX = 2;

/** The dimensions a metric can be laid out by, with Period last. */
export function shelfColumns(m: Metric): { column: string; label: string }[] {
  return [...m.dimensions.map((d) => ({ column: d.column, label: d.label })), { column: "date_key", label: "Period" }];
}

function list(raw: string | null, allowed: string[], taken: string[]): string[] {
  const out: string[] = [];
  for (const v of (raw ?? "").split(",")) {
    if (allowed.includes(v) && !taken.includes(v) && !out.includes(v)) out.push(v);
  }
  return out.slice(0, MAX);
}

export function parseShelves(params: URLSearchParams, allowed: string[]): Shelves {
  const rows = list(params.get("rows"), allowed, []);
  const cols = list(params.get("cols"), allowed, rows);
  if (rows.length && cols.length) return { rows, cols };
  return {
    rows: DEFAULT_SHELVES.rows.filter((c) => allowed.includes(c)),
    cols: DEFAULT_SHELVES.cols.filter((c) => allowed.includes(c)),
  };
}

export function swapShelves(s: Shelves): Shelves {
  return { rows: s.cols, cols: s.rows };
}

export function shelvesToParams(s: Shelves, p: URLSearchParams): void {
  p.set("rows", s.rows.join(","));
  p.set("cols", s.cols.join(","));
}

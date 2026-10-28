// SQL building for the query API, kept out of functions/ (every file there becomes a route).
// Pure: takes the request path and parameters, returns SQL strings; the R2 SQL call is passed in.
// Only metrics and columns from the semantic manifest can be queried; filter values are validated and quoted.

import { manifest, metric, type Metric } from "@zohelo/semantic";

export const MAX_ROWS = 20000;
export const SAFE_VALUE = /^[\p{L}\p{N} .,:;'"()[\]{}\-_/&+%]{1,200}$/u;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Rows = Record<string, unknown>[];
export type RunSql = (query: string) => Promise<Rows>;

export function quote(value: string): string {
  if (!SAFE_VALUE.test(value)) throw new HttpError(400, `unsupported filter value: ${value.slice(0, 50)}`);
  return `'${value.replaceAll("'", "''")}'`;
}

export function where(m: Metric, params: URLSearchParams): string {
  const parts: string[] = [];
  for (const d of m.dimensions) {
    const raw = params.get(d.column);
    if (!raw) continue;
    const values = raw.split("|").filter(Boolean).map(quote);
    if (values.length) parts.push(`${d.column} IN (${values.join(", ")})`);
  }
  return parts.length ? `WHERE ${parts.join(" AND ")}` : "";
}

export function catalogSql(namespace: string): string {
  return `SELECT measure_key, source_system, block_id, block_name, measure_name, unit_key,
              CAST(first_date AS VARCHAR) AS first_date, CAST(last_date AS VARCHAR) AS last_date,
              series, points, areas, activated, status
       FROM ${namespace}.dim_measure
       ORDER BY activated DESC, source_system, measure_name
       LIMIT ${MAX_ROWS}`;
}

/** The metric's filter columns, in manifest order. */
export function memberColumns(m: Metric): string[] {
  return m.dimensions.filter((d) => d.filter).map((d) => d.column);
}

export function membersSql(m: Metric): string {
  return `SELECT DISTINCT ${memberColumns(m).join(", ")} FROM ${m.table} LIMIT ${MAX_ROWS}`;
}

export function seriesSql(m: Metric, params: URLSearchParams): string {
  return `SELECT series_key, source_system, geography_name, geography_level, frequency,
                CAST(date_key AS VARCHAR) AS date_key, value, unit, breakdown_json
         FROM ${m.table}
         ${where(m, params)}
         ORDER BY date_key
         LIMIT ${MAX_ROWS}`;
}

/** Answers one API path; `run` executes a query against R2 SQL. */
export async function route(path: string[], params: URLSearchParams, run: RunSql): Promise<unknown> {
  if (path.length === 1 && path[0] === "manifest") return manifest;

  if (path.length === 1 && path[0] === "catalog") return run(catalogSql(manifest.namespace));

  if (path.length === 3 && path[0] === "metrics") {
    const m = metric(path[1] ?? "");
    if (!m) throw new HttpError(404, `unknown metric: ${path[1]}`);

    if (path[2] === "members") {
      const columns = memberColumns(m);
      const result: Record<string, string[]> = {};
      const found = await run(membersSql(m));
      for (const col of columns) {
        const values = new Set<string>();
        for (const row of found) if (row[col] != null) values.add(String(row[col]));
        result[col] = [...values].sort((a, b) => a.localeCompare(b));
      }
      // Which combinations exist, so the portal can narrow one filter by the others.
      return { values: result, combinations: found };
    }

    if (path[2] === "series") return run(seriesSql(m, params));
  }
  throw new HttpError(404, "not found");
}

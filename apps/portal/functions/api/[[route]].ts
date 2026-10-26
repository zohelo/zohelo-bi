// The query API (Cloudflare Pages Function, same origin as the portal, behind the same Access app).
// Reads the lakehouse through R2 SQL with the read-only catalog token. Only metrics and columns
// from the semantic manifest can be queried; filter values are validated and quoted.
//
//   GET /api/manifest                         the semantic manifest
//   GET /api/catalog                          the measure catalogue (poc.dim_measure)
//   GET /api/metrics/:id/members              distinct values of the metric's filter dimensions
//   GET /api/metrics/:id/series?col=v1,v2...  the metric's rows, filtered (AND across columns, OR within)

import { manifest, metric, type Metric } from "@zohelo/semantic";

type Env = {
  PLATFORM_ACCOUNT_ID: string;
  STORAGE_LAKEHOUSE_BUCKET_NAME: string;
  STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN: string;
};

const CACHE_SECONDS = 3600;
const MAX_ROWS = 20000;
const SAFE_VALUE = /^[\p{L}\p{N} .,:;'"()\[\]{}\-_/&+%]{1,200}$/u;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function quote(value: string): string {
  if (!SAFE_VALUE.test(value)) throw new HttpError(400, `unsupported filter value: ${value.slice(0, 50)}`);
  return `'${value.replaceAll("'", "''")}'`;
}

async function sql(env: Env, query: string): Promise<Record<string, unknown>[]> {
  const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${env.PLATFORM_ACCOUNT_ID}/r2-sql/query/${env.STORAGE_LAKEHOUSE_BUCKET_NAME}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) throw new HttpError(502, `R2 SQL ${response.status}: ${text.slice(0, 400)}`);
  return rows(JSON.parse(text));
}

// R2 SQL has answered in more than one shape; accept rows as objects or columns + rows.
function rows(payload: unknown): Record<string, unknown>[] {
  const p = payload as Record<string, unknown>;
  if (p.success === false) throw new HttpError(502, `R2 SQL failed: ${JSON.stringify(p.errors ?? p).slice(0, 400)}`);
  const candidates = [...(Array.isArray(p.result) ? p.result : [p.result]), p];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const r = (c as Record<string, unknown>).results ?? (c as Record<string, unknown>).rows;
    if (Array.isArray(r)) return r as Record<string, unknown>[];
    if (r && typeof r === "object") {
      const { columns, rows: values } = r as { columns?: string[]; rows?: unknown[][] };
      if (columns && values) return values.map((row) => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    }
  }
  throw new HttpError(502, `unsupported R2 SQL response: ${JSON.stringify(payload).slice(0, 300)}`);
}

function where(m: Metric, params: URLSearchParams): string {
  const parts: string[] = [];
  for (const d of m.dimensions) {
    const raw = params.get(d.column);
    if (!raw) continue;
    const values = raw.split("|").filter(Boolean).map(quote);
    if (values.length) parts.push(`${d.column} IN (${values.join(", ")})`);
  }
  return parts.length ? `WHERE ${parts.join(" AND ")}` : "";
}

async function route(path: string[], params: URLSearchParams, env: Env): Promise<unknown> {
  if (path.length === 1 && path[0] === "manifest") return manifest;

  if (path.length === 1 && path[0] === "catalog") {
    return sql(
      env,
      `SELECT measure_key, source_system, block_id, block_name, measure_name, unit_key,
              CAST(first_date AS VARCHAR) AS first_date, CAST(last_date AS VARCHAR) AS last_date,
              series, points, areas, activated, status
       FROM ${manifest.namespace}.dim_measure
       ORDER BY activated DESC, source_system, measure_name
       LIMIT ${MAX_ROWS}`,
    );
  }

  if (path.length === 3 && path[0] === "metrics") {
    const m = metric(path[1] ?? "");
    if (!m) throw new HttpError(404, `unknown metric: ${path[1]}`);

    if (path[2] === "members") {
      const columns = m.dimensions.filter((d) => d.filter).map((d) => d.column);
      const result: Record<string, string[]> = {};
      const found = await sql(env, `SELECT DISTINCT ${columns.join(", ")} FROM ${m.table} LIMIT ${MAX_ROWS}`);
      for (const col of columns) {
        const values = new Set<string>();
        for (const row of found) if (row[col] != null) values.add(String(row[col]));
        result[col] = [...values].sort((a, b) => a.localeCompare(b));
      }
      // Which combinations exist, so the portal can narrow one filter by the others.
      return { values: result, combinations: found };
    }

    if (path[2] === "series") {
      return sql(
        env,
        `SELECT series_key, source_system, geography_name, geography_level, frequency,
                CAST(date_key AS VARCHAR) AS date_key, value, unit, breakdown_json
         FROM ${m.table}
         ${where(m, params)}
         ORDER BY date_key
         LIMIT ${MAX_ROWS}`,
      );
    }
  }
  throw new HttpError(404, "not found");
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const segments = context.params.route;
  const path = Array.isArray(segments) ? segments : segments ? [segments] : [];
  try {
    const body = await route(path, url.searchParams, context.env);
    const response = new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `private, max-age=${CACHE_SECONDS}` },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status });
  }
};

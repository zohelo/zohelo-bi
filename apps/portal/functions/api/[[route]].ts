// The query API (Cloudflare Pages Function, same origin as the portal, behind the same Access app).
// Reads the lakehouse through R2 SQL with the read-only catalog token. Only metrics and columns
// from the semantic manifest can be queried; filter values are validated and quoted.
//
//   GET /api/manifest                         the semantic manifest
//   GET /api/catalog                          the measure catalogue (gold.dim_measure)
//   GET /api/metrics/:id/members              distinct values of the metric's filter dimensions
//   GET /api/metrics/:id/series?col=v1,v2...  the metric's rows, filtered (AND across columns, OR within)

import { errorBody } from "../../server/errors";
import { HttpError, route, type Rows } from "../../server/query";

type Env = {
  PLATFORM_ACCOUNT_ID: string;
  STORAGE_LAKEHOUSE_BUCKET_NAME: string;
  STORAGE_LAKEHOUSE_CATALOG_READ_TOKEN: string;
};

const CACHE_SECONDS = 3600;

async function sql(env: Env, query: string): Promise<Rows> {
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
function rows(payload: unknown): Rows {
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const segments = context.params.route;
  const path = Array.isArray(segments) ? segments : segments ? [segments] : [];
  try {
    const body = await route(path, url.searchParams, (query) => sql(context.env, query));
    const response = new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `private, max-age=${CACHE_SECONDS}` },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    const e = errorBody(error);
    if (e.status >= 500) console.error(e.detail);
    return Response.json(e.body, { status: e.status, headers: { "Cache-Control": "no-store" } });
  }
};

import type { KpiLatest, PublishedCatalog, PublishedTopics, SeriesRow } from "@zohelo/semantic";

// Thin client for the query API (functions/api), used by the live provider (data/live.ts). Responses are memoised per URL for the session.

const memo = new Map<string, Promise<unknown>>();

/** An answer of the API other than 2xx; `status` lets callers tell "not published" (404) from a failure. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  let pending = memo.get(path);
  if (!pending) {
    pending = fetch(path).then(async (response) => {
      const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      if (!response.ok) throw new ApiError((body as { error?: string }).error ?? `HTTP ${response.status}`, response.status);
      return body;
    });
    pending.catch(() => memo.delete(path));
    memo.set(path, pending);
  }
  return pending as Promise<T>;
}

export type Filters = Record<string, string[]>;

function query(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [column, values] of Object.entries(filters)) if (values.length) params.set(column, values.join("|"));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const api = {
  publishedCatalog: () => get<PublishedCatalog>("/api/published/catalog"),
  kpiLatest: (key: string) => get<KpiLatest>(`/api/published/kpi/${encodeURIComponent(key)}/latest`),
  /** 06_published/v2/topics.json; 404 (ApiError) until zohelo-data publishes it. */
  publishedTopics: () => get<PublishedTopics>("/api/published/topics"),
  series: (metric: string, filters: Filters) => get<SeriesRow[]>(`/api/metrics/${metric}/series${query(filters)}`),
};

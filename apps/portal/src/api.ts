import type { PublishedCalendarV2, PublishedCatalogV2, PublishedLatestV2, PublishedSeriesV2, PublishedTopics } from "@zohelo/semantic";

// Thin client for the query API (functions/api), used by the live provider (data/live.ts): the files of the published
// contract v2 and topics. Responses are memoised per URL for the session.

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

export const api = {
  /** 06_published/v2/catalog.json (contract v2). */
  catalogV2: () => get<PublishedCatalogV2>("/api/published/v2/catalog"),
  /** 06_published/v2/latest.json: the latest value of every KPI × geography. */
  latestV2: () => get<PublishedLatestV2>("/api/published/v2/latest"),
  /** 06_published/v2/kpi/<key>/series.json (columnar). */
  seriesV2: (key: string) => get<PublishedSeriesV2>(`/api/published/v2/kpi/${encodeURIComponent(key)}/series`),
  /** 06_published/v2/calendar.json. */
  calendarV2: () => get<PublishedCalendarV2>("/api/published/v2/calendar"),
  /** 06_published/v2/topics.json; 404 (ApiError) until zohelo-data publishes it. */
  publishedTopics: () => get<PublishedTopics>("/api/published/topics"),
  /** 06_published/v1/review/topics.json, the internal review copy (zohelo-data docs/topics.md); 404 when absent. */
  reviewTopics: () => get<PublishedTopics>("/api/published/v1/review/topics.json"),
};

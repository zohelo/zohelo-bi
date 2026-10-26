import type { CatalogRow, SeriesRow } from "@zohelo/semantic";

// Thin client for the query API (functions/api). Responses are memoised per URL for the session.

const memo = new Map<string, Promise<unknown>>();

async function get<T>(path: string): Promise<T> {
  let pending = memo.get(path);
  if (!pending) {
    pending = fetch(path).then(async (response) => {
      const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      if (!response.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
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

export type Members = { values: Record<string, string[]>; combinations: Record<string, string | null>[] };

export const api = {
  catalog: () => get<CatalogRow[]>("/api/catalog"),
  members: (metric: string) => get<Members>(`/api/metrics/${metric}/members`),
  series: (metric: string, filters: Filters) => get<SeriesRow[]>(`/api/metrics/${metric}/series${query(filters)}`),
};

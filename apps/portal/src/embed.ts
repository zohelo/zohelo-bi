// Pure helpers of the chart-only /embed page: the filters from the explorer's query parameters and
// the footer's sources and latest period.

import type { Metric, SeriesRow } from "@zohelo/semantic";
import type { Filters } from "./api";
import { SOURCES } from "./labels";

/** The explorer's filters for `m`: one parameter per filter column, values joined by '|'; defaults only without 'metric'. */
export function embedFilters(params: URLSearchParams, m: Metric): Filters {
  const out: Filters = {};
  const explicit = params.has("metric");
  for (const d of m.dimensions) {
    if (!d.filter) continue;
    const values = (params.get(d.column) ?? "").split("|").filter(Boolean);
    if (values.length) out[d.column] = values;
    else if (!explicit && m.defaults[d.column]) out[d.column] = [m.defaults[d.column]!];
  }
  return out;
}

/** Source names in first-seen order and the latest period with a value. */
export function embedFooter(rows: SeriesRow[]): { sources: string[]; latest: string | null } {
  const sources = [...new Set(rows.map((r) => r.source_system))].map((s) => SOURCES[s] ?? s);
  let latest: string | null = null;
  for (const r of rows) if (r.value !== null && (latest === null || r.date_key > latest)) latest = r.date_key;
  return { sources, latest };
}

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** The iframe snippet for /embed with the explorer's query; src and title are HTML-escaped. */
export function embedCode(origin: string, search: string, title: string): string {
  return `<iframe src="${esc(`${origin}/embed${search}`)}" title="${esc(title)}" width="100%" height="420" style="border:0" loading="lazy"></iframe>`;
}

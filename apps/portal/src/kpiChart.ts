// The KPI page's first chart: the manifest metric with the same id as the kpi_key, drawn through
// the series API with the metric's default filters (embedFilters without 'metric').

import { metric, metricText } from "@zohelo/semantic";
import type { Filters } from "./api";
import { embedFilters } from "./embed";

export type KpiChartQuery = { metricId: string; filters: Filters; unit: string; label: string; exploreHref: string };

/** The chart query for kpiKey, or null when no manifest metric has that id. */
export function kpiChartQuery(kpiKey: string, lang: "pl" | "en" = "en"): KpiChartQuery | null {
  const m = metric(kpiKey);
  if (!m) return null;
  const filters = embedFilters(new URLSearchParams(), m);
  const p = new URLSearchParams([["metric", m.id], ...Object.entries(filters).map(([c, v]): [string, string] => [c, v.join("|")])]);
  const text = metricText(m, lang);
  return { metricId: m.id, filters, unit: text.unit, label: text.label, exploreHref: `/explore?${p}` };
}

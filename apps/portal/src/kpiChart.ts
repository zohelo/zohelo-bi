// The KPI page's first chart: the manifest metric with the same id as the kpi_key, drawn through
// the series API with the metric's default filters (embedFilters without 'metric').

import { metric } from "@zohelo/semantic";
import type { Filters } from "./api";
import { embedFilters } from "./embed";

export type KpiChartQuery = { metricId: string; filters: Filters; unit: string; label: string; exploreHref: string };

/** The chart query for kpiKey, or null when no manifest metric has that id. */
export function kpiChartQuery(kpiKey: string): KpiChartQuery | null {
  const m = metric(kpiKey);
  if (!m) return null;
  const filters = embedFilters(new URLSearchParams(), m);
  const p = new URLSearchParams([["metric", m.id], ...Object.entries(filters).map(([c, v]): [string, string] => [c, v.join("|")])]);
  return { metricId: m.id, filters, unit: m.unitLabel, label: m.label, exploreHref: `/explore?${p}` };
}

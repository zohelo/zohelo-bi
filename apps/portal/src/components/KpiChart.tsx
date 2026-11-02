import { api } from "../api";
import { t, type Lang } from "../i18n";
import { kpiChartQuery } from "../kpiChart";
import { Link } from "../router";
import { SeriesChart } from "./SeriesChart";
import { useData } from "./useData";

// The KPI page's chart panel: the KPI over time with its default filters and a link to the
// explorer. No page renders it yet.

export function KpiChart({ kpiKey, lang = "en" }: { kpiKey: string; lang?: Lang }) {
  const q = kpiChartQuery(kpiKey);
  const series = useData(q ? JSON.stringify(["kpi-chart", q.metricId, q.filters]) : null, () => api.series(q!.metricId, q!.filters));
  if (!q) return null;
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{t(lang, "kpiChart.title")}</h2>
        <Link to={q.exploreHref} className="tile-link">
          {t(lang, "dashboard.explore")}
        </Link>
      </header>
      {series.error ? (
        <p className="error" role="alert">
          {series.error}
        </p>
      ) : series.loading ? (
        <div className="skeleton tall" />
      ) : (
        <SeriesChart rows={series.data ?? []} chart="line" unit={q.unit} label={q.label} />
      )}
    </section>
  );
}

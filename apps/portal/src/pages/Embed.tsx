import { manifest, metric } from "@zohelo/semantic";
import { api } from "../api";
import { SeriesChart } from "../components/SeriesChart";
import { useData } from "../components/useData";
import { embedFilters, embedFooter } from "../embed";
import { useLocation } from "../router";

// Chart-only page for iframes (/embed?metric=…&<column>=v1|v2, the explorer's parameters): title, line
// chart and a source footer. Framing is limited to zohelo.com by public/_headers.

export function Embed() {
  const url = useLocation();
  const m = metric(url.searchParams.get("metric") ?? "") ?? manifest.metrics[0]!;
  const filters = embedFilters(url.searchParams, m);
  const series = useData(JSON.stringify([m.id, filters]), () => api.series(m.id, filters));
  const { sources, latest } = embedFooter(series.data ?? []);

  return (
    <div className="embed">
      <h1 className="embed-title">{m.label}</h1>
      {series.error ? (
        <p className="error">{series.error}</p>
      ) : series.loading && !series.data ? (
        <div className="skeleton tall" />
      ) : (
        <SeriesChart rows={series.data ?? []} chart="line" unit={m.unitLabel} label={m.label} />
      )}
      <footer className="embed-foot">
        Source: {sources.join(", ")} · Latest: {latest ?? "–"} ·{" "}
        <a href={`/explore${url.search}`} target="_blank" rel="noopener">
          Open in zohelo BI
        </a>
      </footer>
    </div>
  );
}

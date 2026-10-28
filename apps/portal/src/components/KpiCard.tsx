import { FREQUENCIES, GEO_LABELS, deepestGeo } from "../labels";
import { Link } from "../router";

// One card per catalog.json kpis[] row (zohelo-data docs/published.md). No page uses it until
// /api/catalog serves catalog.json.

export type CardKpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  unit_key: string;
  frequency_default: string;
  first_period: string;
  last_period: string;
  loaded_at: string;
  geo_levels: string[];
};

export function KpiCard({ kpi, unit, sourceNames }: { kpi: CardKpi; unit?: { symbol: string; name_en: string }; sourceNames: string[] }) {
  const geo = deepestGeo(kpi.geo_levels);
  return (
    <article className="kpi-card">
      <h3>{kpi.name_en}</h3>
      <p className="kpi-name-pl" lang="pl">
        {kpi.name_pl}
      </p>
      <dl className="kpi-facts">
        <dt>Unit</dt>
        <dd>{unit ? `${unit.name_en} (${unit.symbol})` : kpi.unit_key}</dd>
        <dt>Frequency</dt>
        <dd>{FREQUENCIES[kpi.frequency_default] ?? kpi.frequency_default}</dd>
        <dt>Geography</dt>
        <dd>
          <span className="geo-depth" aria-hidden="true" /> {geo ? (GEO_LABELS[geo] ?? geo) : "–"}
        </dd>
        <dt>Period</dt>
        <dd>{`${kpi.first_period}–${kpi.last_period}`}</dd>
        <dt>Sources</dt>
        <dd>{sourceNames.join(" · ")}</dd>
      </dl>
      <footer className="kpi-card-foot">
        <span className="freshness">Loaded {kpi.loaded_at.slice(0, 10)}</span>
        <Link to={`/explore?metric=${encodeURIComponent(kpi.kpi_key)}`} className="tile-link">
          Open in explorer
        </Link>
      </footer>
    </article>
  );
}

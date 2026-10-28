import { citation, headline, sourceRows, type LatestValue } from "@zohelo/semantic";
import { Citation, DimensionsTable, KpiHeader, SourcesTable } from "./KpiSections";

// The KPI page body for one KPI from loaded catalog.json and latest.json values; the /kpi/:key
// route only has to load the data.

export type KpiCatalog = {
  kpis: {
    kpi_key: string;
    name_en: string;
    name_pl: string;
    unit_key: string;
    source_keys: string[];
    geo_levels: string[];
    dimensions: { dimension_key: string; member_count: number; levels: string[] }[];
  }[];
  units: { unit_key: string; symbol: string }[];
  sources: { source_key: string; name_en: string; register_id: string; licence_key: string }[];
  licences: { licence_key: string; name: string; url: string; attribution_text: string }[];
};

export function KpiView({
  catalog,
  kpiKey,
  latest,
  accessed,
}: {
  catalog: KpiCatalog;
  kpiKey: string;
  latest: LatestValue[] | null;
  accessed: Date;
}) {
  const kpi = catalog.kpis.find((k) => k.kpi_key === kpiKey);
  if (!kpi) return <p className="empty">Unknown KPI: {kpiKey}</p>;
  const rows = sourceRows(kpi.source_keys, catalog.sources, catalog.licences);
  const h = latest ? headline(latest, kpi.source_keys) : null;
  const unitSymbol = catalog.units.find((u) => u.unit_key === kpi.unit_key)?.symbol ?? kpi.unit_key;
  return (
    <article className="kpi-view">
      <KpiHeader name_en={kpi.name_en} name_pl={kpi.name_pl} unitSymbol={unitSymbol} headline={h} />
      <section className="panel">
        <h2>Sources</h2>
        <SourcesTable rows={rows} />
      </section>
      <section className="panel">
        <h2>Dimensions</h2>
        <DimensionsTable geoLevels={kpi.geo_levels} dimensions={kpi.dimensions} />
      </section>
      <Citation
        text={citation(
          kpi,
          rows.map((r) => r.name_en),
          accessed,
        )}
      />
    </article>
  );
}

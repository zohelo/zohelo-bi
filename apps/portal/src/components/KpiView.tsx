import type { ReactNode } from "react";
import { citation, headline, sourceRows, type LatestValue } from "@zohelo/semantic";
import { Citation, DimensionsTable, KpiHeader, SourcesTable } from "./KpiSections";
import { inPoints } from "../change";
import { t, type Lang } from "../i18n";

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
  units: { unit_key: string; symbol: string; is_rate?: boolean }[];
  sources: { source_key: string; name_en: string; name_pl?: string; register_id: string; licence_key: string }[];
  licences: { licence_key: string; name: string; url: string; attribution_text: string }[];
};

export function KpiView({
  catalog,
  kpiKey,
  latest,
  accessed,
  lang = "en",
  chart,
}: {
  catalog: KpiCatalog;
  kpiKey: string;
  latest: LatestValue[] | null;
  accessed: Date;
  lang?: Lang;
  chart?: ReactNode;
}) {
  const kpi = catalog.kpis.find((k) => k.kpi_key === kpiKey);
  if (!kpi) return <p className="empty">{t(lang, "kpi.unknown").replace("{key}", kpiKey)}</p>;
  const rows = sourceRows(kpi.source_keys, catalog.sources, catalog.licences);
  const h = latest ? headline(latest, kpi.source_keys) : null;
  const unit = catalog.units.find((u) => u.unit_key === kpi.unit_key);
  const unitSymbol = unit?.symbol ?? kpi.unit_key;
  return (
    <article className="kpi-view">
      <KpiHeader name_en={kpi.name_en} name_pl={kpi.name_pl} unitSymbol={unitSymbol} isRate={inPoints(unit)} headline={h} lang={lang} />
      {chart}
      <section className="panel">
        <h2>{t(lang, "kpi.sources")}</h2>
        <SourcesTable rows={rows} lang={lang} />
      </section>
      <section className="panel">
        <h2>{t(lang, "kpi.dimensions")}</h2>
        <DimensionsTable geoLevels={kpi.geo_levels} dimensions={kpi.dimensions} lang={lang} />
      </section>
      <Citation
        text={citation(
          kpi,
          rows.map((r) => r.name_en),
          accessed,
        )}
        lang={lang}
      />
    </article>
  );
}

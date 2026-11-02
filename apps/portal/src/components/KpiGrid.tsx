import { KpiCard, type CardKpi } from "./KpiCard";
import { t, type Lang } from "../i18n";

// The catalogue's grid of KPI cards, with loading, error and empty states. No page uses it until
// /api/catalog serves catalog.json.

export type GridKpi = CardKpi & { source_keys: string[] };

export function KpiGrid({
  kpis,
  units,
  sources,
  loading,
  error,
  lang = "en",
}: {
  kpis: GridKpi[] | undefined;
  units: Record<string, { symbol: string; name_en: string; name_pl?: string }>;
  /** source_key → name_en */
  sources: Record<string, string>;
  loading: boolean;
  error: string | null;
  lang?: Lang;
}) {
  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (loading && kpis === undefined) {
    return (
      <div className="kpi-grid" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    );
  }
  if (!kpis || kpis.length === 0) return <p className="hint">{t(lang, "grid.noMatch")}</p>;
  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.kpi_key}
          kpi={kpi}
          unit={units[kpi.unit_key]}
          sourceNames={kpi.source_keys.map((k) => sources[k] ?? k)}
          lang={lang}
        />
      ))}
    </div>
  );
}

import type { KpiLatest } from "@zohelo/semantic";
import { NO_LATEST, nationalValue } from "../change";
import { KpiCard, type CardCurrent, type CardKpi } from "./KpiCard";
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
  latest,
  lang = "en",
}: {
  kpis: GridKpi[] | undefined;
  units: Record<string, { symbol: string; name_en: string; name_pl?: string; is_rate?: boolean }>;
  /** source_key → the source's name in the page language */
  sources: Record<string, string>;
  /** kpi_key → latest.json (null: none published or not loadable); leave out for metadata-only cards. */
  latest?: Record<string, KpiLatest | null>;
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
  const current = (kpi: GridKpi): CardCurrent | "omit" => {
    if (latest === undefined) return "omit";
    if (NO_LATEST.includes(kpi.kpi_key)) return null;
    if (!(kpi.kpi_key in latest)) return "loading";
    const row = nationalValue(latest[kpi.kpi_key]?.values ?? [], kpi.source_keys);
    if (!row) return null;
    const unitKey = row.unit_key !== undefined && row.unit_key in units ? row.unit_key : kpi.unit_key;
    const u = units[unitKey];
    const unit = { unit_key: unitKey, symbol: u?.symbol ?? "", is_rate: u?.is_rate };
    return { row, unit, sourceName: sources[row.source_key] ?? row.source_key };
  };
  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.kpi_key}
          kpi={kpi}
          unit={units[kpi.unit_key]}
          sourceNames={kpi.source_keys.map((k) => sources[k] ?? k)}
          current={current(kpi)}
          lang={lang}
        />
      ))}
    </div>
  );
}

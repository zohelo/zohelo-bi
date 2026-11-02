import { deepestGeo } from "../labels";
import { pickName, t, type Lang, type StringKey } from "../i18n";
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

const FREQ_CODES = ["A", "Q", "M", "D"];

export function KpiCard({
  kpi,
  unit,
  sourceNames,
  lang = "en",
}: {
  kpi: CardKpi;
  unit?: { symbol: string; name_en: string; name_pl?: string };
  sourceNames: string[];
  lang?: Lang;
}) {
  const geo = deepestGeo(kpi.geo_levels);
  const other: Lang = lang === "pl" ? "en" : "pl";
  const unitName = unit ? (lang === "pl" && unit.name_pl ? unit.name_pl : unit.name_en) : null;
  const freq = FREQ_CODES.includes(kpi.frequency_default) ? t(lang, `freq.${kpi.frequency_default}` as StringKey) : kpi.frequency_default;
  return (
    <article className="kpi-card">
      <h3>
        <Link to={`/kpi/${encodeURIComponent(kpi.kpi_key)}`}>{pickName(lang, kpi)}</Link>
      </h3>
      <p className="kpi-name-pl" lang={other}>
        {other === "pl" ? kpi.name_pl : kpi.name_en}
      </p>
      <dl className="kpi-facts">
        <dt>{t(lang, "card.unit")}</dt>
        <dd>{unit ? `${unitName} (${unit.symbol})` : kpi.unit_key}</dd>
        <dt>{t(lang, "card.frequency")}</dt>
        <dd>{freq}</dd>
        <dt>{t(lang, "card.geography")}</dt>
        <dd>
          <span className="geo-depth" aria-hidden="true" /> {geo ? t(lang, `geo.${geo}` as StringKey) : "–"}
        </dd>
        <dt>{t(lang, "card.period")}</dt>
        <dd>{`${kpi.first_period}–${kpi.last_period}`}</dd>
        <dt>{t(lang, "card.sources")}</dt>
        <dd>{sourceNames.join(" · ")}</dd>
      </dl>
      <footer className="kpi-card-foot">
        <span className="freshness">{t(lang, "card.loaded").replace("{date}", kpi.loaded_at.slice(0, 10))}</span>
        <Link to={`/explore?metric=${encodeURIComponent(kpi.kpi_key)}`} className="tile-link">
          {t(lang, "card.open")}
        </Link>
      </footer>
    </article>
  );
}

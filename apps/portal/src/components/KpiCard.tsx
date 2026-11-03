import { cardChange, cardValue, periodWords, type LatestRow } from "../change";
import { deepestGeo } from "../labels";
import { pickName, t, type Lang, type StringKey } from "../i18n";
import { Link } from "../router";

// One card per catalog.json kpis[] row (zohelo-data docs/published.md), in the order of the content standard's
// "KPI card anatomy" (#325): name, latest national value, period in words, change, source, then the metadata.

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

/** The unit of the value shown: the row's unit_key in catalog.json units[], else the KPI's unit. */
export type ValueUnit = { unit_key: string; symbol: string; is_rate?: boolean };

/**
 * The card's current value: the national row, its unit and its source's name; null = no current value; "loading"
 * while latest.json loads.
 */
export type CardCurrent = { row: LatestRow; unit: ValueUnit; sourceName: string } | null | "loading";

function Current({ current, kpiKey, lang }: { current: CardCurrent; kpiKey: string; lang: Lang }) {
  if (current === "loading") return <div className="kpi-current skeleton-line" aria-hidden="true" />;
  if (current === null) return <p className="kpi-current hint">{t(lang, "card.noValue")}</p>;
  const { row, unit, sourceName } = current;
  const preliminary = row.flags?.includes("p");
  const { previous_value, previous_period } = row;
  const change =
    previous_value !== undefined && previous_period !== undefined
      ? cardChange({ value: row.value, previous_value, period: row.period, previous_period }, unit, kpiKey, lang)
      : null;
  return (
    <div className="kpi-current">
      <p className="kpi-card-value">{cardValue(row.value, unit.symbol, unit.unit_key, lang)}</p>
      <p className="kpi-card-period">
        {periodWords(row.period, lang)}
        {preliminary && <span className="kpi-prelim"> · {t(lang, "card.preliminary")}</span>}
      </p>
      {change && <p className="kpi-card-change">{change}</p>}
      <p className="kpi-card-source">{t(lang, "card.source").replace("{source}", sourceName)}</p>
    </div>
  );
}

export function KpiCard({
  kpi,
  unit,
  sourceNames,
  current = "omit",
  lang = "en",
}: {
  kpi: CardKpi;
  unit?: { symbol: string; name_en: string; name_pl?: string; is_rate?: boolean };
  sourceNames: string[];
  /** The latest national value; leave out where the card shows metadata only. */
  current?: CardCurrent | "omit";
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
      {current !== "omit" && <Current current={current} kpiKey={kpi.kpi_key} lang={lang} />}
      <dl className={current !== "omit" ? "kpi-facts small" : "kpi-facts"}>
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

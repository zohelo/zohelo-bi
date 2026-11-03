import { formatNumber } from "../labels";
import { changeText, comparisonText, formatValue, periodWords, withUnit } from "../change";
import { pickName, t, type Lang } from "../i18n";

// The KPI page (/kpi/<key>) sections: value header, sources and dimensions tables, citation.
// Presentational only; field names as in @zohelo/semantic kpi.ts. No route renders them yet.

type HeadlineProps = { period: string; value: number; previous_period?: string; previous_value?: number; delta: number | null };

export function KpiHeader({
  name_en,
  name_pl,
  unitSymbol,
  isRate = false,
  headline,
  lang = "en",
}: {
  name_en: string;
  name_pl: string;
  unitSymbol: string;
  /** Changes are shown in percentage points (inPoints of the KPI's unit). */
  isRate?: boolean;
  headline: HeadlineProps | null;
  lang?: Lang;
}) {
  const other: Lang = lang === "pl" ? "en" : "pl";
  const h = headline;
  const change =
    h && h.previous_value !== undefined && h.previous_period !== undefined
      ? t(lang, "kpi.vs")
          .replace("{delta}", changeText(h.value, h.previous_value, isRate, unitSymbol, lang))
          .replace("{comparison}", comparisonText(h.period, h.previous_period, lang))
      : null;
  return (
    <header className="kpi-head">
      <h1>{pickName(lang, { name_pl, name_en })}</h1>
      <p className="kpi-name-pl" lang={other}>
        {other === "pl" ? name_pl : name_en}
      </p>
      {headline ? (
        <>
          <p className="kpi-value">
            {withUnit(formatValue(headline.value, lang), unitSymbol)} <span className="hint">{periodWords(headline.period, lang)}</span>
          </p>
          {change && <p className="hint">{change}</p>}
        </>
      ) : (
        <p className="empty">{t(lang, "kpi.noValue")}</p>
      )}
    </header>
  );
}

type SourceRow = {
  source_key: string;
  name_en: string;
  name_pl?: string;
  register_id: string;
  licence_name: string | null;
  licence_url: string | null;
  attribution_text: string | null;
};

export function SourcesTable({ rows, lang = "en" }: { rows: SourceRow[]; lang?: Lang }) {
  if (!rows.length) return <p className="empty">{t(lang, "kpi.noSources")}</p>;
  const heads = [t(lang, "kpi.source"), t(lang, "kpi.registerId"), t(lang, "kpi.licence"), t(lang, "kpi.attribution")] as const;
  // Below 600 px each source stacks as a block (styles.css .sources-table), each cell labelled by data-label;
  // the explicit roles keep the table semantics when the cells are display: block.
  return (
    <div className="table-wrap">
      <table className="sources-table" role="table">
        <thead>
          <tr role="row">
            {heads.map((h) => (
              <th key={h} role="columnheader">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source_key} role="row">
              <td role="cell" data-label={heads[0]}>
                {pickName(lang, r)}
              </td>
              <td role="cell" data-label={heads[1]} className="mono">
                {r.register_id}
              </td>
              <td role="cell" data-label={heads[2]}>
                {r.licence_url ? (
                  <a href={r.licence_url} target="_blank" rel="noreferrer">
                    {r.licence_name ?? r.licence_url}
                  </a>
                ) : (
                  "–"
                )}
              </td>
              <td role="cell" data-label={heads[3]}>
                {r.attribution_text ?? "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DimensionsTable({
  geoLevels,
  dimensions,
  lang = "en",
}: {
  geoLevels: string[];
  dimensions: { dimension_key: string; member_count: number; levels: string[] }[];
  lang?: Lang;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t(lang, "kpi.dimension")}</th>
            <th className="num">{t(lang, "kpi.members")}</th>
            <th>{t(lang, "kpi.levels")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>geography</td>
            <td className="num">–</td>
            <td>{geoLevels.join(", ")}</td>
          </tr>
          {dimensions.map((d) => (
            <tr key={d.dimension_key}>
              <td>{d.dimension_key}</td>
              <td className="num">{formatNumber(d.member_count)}</td>
              <td>{d.levels.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Citation({ text, lang = "en" }: { text: string; lang?: Lang }) {
  return (
    <section className="citation">
      <h2>{t(lang, "kpi.cite")}</h2>
      <blockquote>{text}</blockquote>
      <button type="button" className="button" onClick={() => void navigator.clipboard.writeText(text)}>
        {t(lang, "kpi.copy")}
      </button>
    </section>
  );
}

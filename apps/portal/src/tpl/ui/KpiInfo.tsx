// Informacje panel of a chart card: what the indicator is, how it is measured and where it comes from, with
// links to the indicator page (definition, history, citation) and the methodology.

import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { kpiName, sourceName } from "../chartData";
import { fmtPeriod, freqLabel } from "../format";
import { geoCoverage } from "../explore/kpiInfo";

export function KpiInfo({ kpi, cat, lang, extra }: { kpi: Kpi; cat: Catalog; lang: Lang; extra?: Kpi[] }) {
  const pl = lang === "pl";
  const unit = cat.units.find((u) => u.unit_key === kpi.unit_key);
  const rows: [string, string][] = [
    [pl ? "Jednostka" : "Unit", unit ? (pl ? unit.name_pl : unit.name_en) : kpi.unit_key],
    [pl ? "Częstotliwość" : "Frequency", freqLabel(kpi.frequency, lang)],
    [pl ? "Zasięg" : "Coverage", geoCoverage(kpi, cat, lang)],
    [pl ? "Dane" : "Data", `${fmtPeriod(kpi.first_period, lang)} – ${fmtPeriod(kpi.last_period, lang)}`],
    [pl ? "Źródła" : "Sources", kpi.source_keys.map((s) => sourceName(cat, s, lang)).join(", ")],
  ];
  return (
    <div className="t-info">
      <p className="t-info__name">{kpiName(kpi, lang)}</p>
      <dl className="t-info__list">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="t-info__links">
        <Link to={`/kpi/${kpi.kpi_key}`}>{pl ? "Strona wskaźnika i definicja" : "Indicator page and definition"}</Link>
        {(extra ?? []).map((k) => (
          <Link key={k.kpi_key} to={`/kpi/${k.kpi_key}`}>
            {kpiName(k, lang)}
          </Link>
        ))}
        <Link to="/przewodnik/metodologia">{pl ? "Metodologia" : "Methodology"}</Link>
      </p>
    </div>
  );
}

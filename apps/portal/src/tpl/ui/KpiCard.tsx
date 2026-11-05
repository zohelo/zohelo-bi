// Compact KPI card for summaries (home page, Dashboardy): name, value, period and the change, coloured only when
// the indicator has an agreed favourable direction (polarity.ts); the colour is always repeated in words.

import type { Catalog, Kpi, Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { kpiName } from "../chartData";
import { basisFor, fmtChange, fmtPeriod, fmtValue } from "../format";
import { judge } from "../polarity";
import { FavButton } from "./FavButton";
import { Sparkline } from "./blocks";

export function KpiCard({
  kpi,
  latest,
  cat,
  lang,
  context,
  spark,
}: {
  kpi: Kpi;
  latest?: Latest;
  cat: Catalog;
  lang: Lang;
  context?: string;
  /** Recent history drawn as a sparkline (decorative: the value and change are in words). */
  spark?: (number | null)[];
}) {
  const pl = lang === "pl";
  const l = latest;
  const ch = l ? fmtChange(l.value, l.previous_value, kpi.unit_key, basisFor(kpi.frequency), cat, lang) : undefined;
  const verdict = ch ? judge(kpi.kpi_key, ch.delta) : "neutral";
  const word = verdict === "good" ? (pl ? "korzystnie" : "favourable") : verdict === "bad" ? (pl ? "niekorzystnie" : "unfavourable") : "";
  const name = kpiName(kpi, lang);
  return (
    <div className={`zt-card k-card k-card--${verdict}`}>
      <div className="k-card__top">
        <Link to={`/kpi/${kpi.kpi_key}`} className="k-card__name">
          {name}
        </Link>
        <FavButton item={{ id: `kpi:${kpi.kpi_key}`, label: name, to: `/kpi/${kpi.kpi_key}`, kind: "kpi" }} lang={lang} />
      </div>
      <span className="k-card__value">{l ? fmtValue(l.value, kpi.unit_key, cat, lang) : "…"}</span>
      <span className="k-card__meta">
        {l ? fmtPeriod(l.period, lang) : ""}
        {ch ? (
          <span className={`k-chg k-chg--${verdict}`}>
            <span aria-hidden="true">{ch.shown}</span>
            <span className="zt-sr">
              , {ch.spoken}
              {word ? `, ${word}` : ""}
            </span>
          </span>
        ) : null}
      </span>
      {context || spark ? (
        <span className="k-card__foot">
          {context ? <span className="k-card__ctx">{context}</span> : <span />}
          {spark ? <Sparkline values={spark} /> : null}
        </span>
      ) : null}
    </div>
  );
}

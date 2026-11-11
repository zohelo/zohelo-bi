// Compact KPI card for summaries (home page, Dashboardy): name, value, period and the change, coloured only when
// the indicator has an agreed favourable direction (polarity.ts); the colour is always repeated in words.

import type { Catalog, Kpi, Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { kpiName } from "../chartData";
import { latestChange, fmtPeriod, fmtValue, spokenText } from "../format";
import { judge } from "../polarity";
import { FavButton } from "./FavButton";
import { Sparkline } from "./blocks";

/** The change since the previous period and its verdict (polarity.ts); the colour is always repeated in words. */
function changeOf(kpi: Kpi, l: Latest | undefined, cat: Catalog, lang: Lang) {
  const pl = lang === "pl";
  const ch = latestChange(l, kpi, cat, lang);
  const verdict = ch ? judge(kpi.kpi_key, ch.delta) : "neutral";
  const word = verdict === "good" ? (pl ? "korzystnie" : "favourable") : verdict === "bad" ? (pl ? "niekorzystnie" : "unfavourable") : "";
  return { ch, verdict, word };
}

function ChangeBadge({ c }: { c: ReturnType<typeof changeOf> }) {
  if (!c.ch) return null;
  return (
    <span className={`k-chg k-chg--${c.verdict}`}>
      <span aria-hidden="true">{c.ch.shown}</span>
      <span className="zt-sr">
        , {c.ch.spoken}
        {c.word ? `, ${c.word}` : ""}
      </span>
    </span>
  );
}

/**
 * The KPI card's figure without the card (hot topics on the home page): name as a link, value, period and change.
 * The name is the link, so the row reads "name, value, period, change, verdict".
 */
/** A KPI name as shown, with change bases ("r/r") spoken as words for screen readers. */
function SpokenName({ name, lang }: { name: string; lang: Lang }) {
  const spoken = spokenText(name, lang);
  if (spoken === name) return <>{name}</>;
  return (
    <>
      <span aria-hidden="true">{name}</span>
      <span className="zt-sr">{spoken}</span>
    </>
  );
}

export function KpiMini({ kpi, latest, cat, lang }: { kpi: Kpi; latest?: Latest; cat: Catalog; lang: Lang }) {
  const c = changeOf(kpi, latest, cat, lang);
  return (
    <span className={`k-mini k-mini--${c.verdict}`}>
      <Link to={`/kpi/${kpi.kpi_key}`} className="k-mini__name">
        <SpokenName name={kpiName(kpi, lang)} lang={lang} />
      </Link>
      <span className="k-mini__row">
        <span className="k-mini__value">{latest ? fmtValue(latest.value, kpi.unit_key, cat, lang) : "…"}</span>
        <span className="k-card__meta">
          {latest ? fmtPeriod(latest.period, lang) : ""}
          <ChangeBadge c={c} />
        </span>
      </span>
    </span>
  );
}

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
  const l = latest;
  const c = changeOf(kpi, l, cat, lang);
  const verdict = c.verdict;
  const name = kpiName(kpi, lang);
  return (
    <div className={`zt-card k-card k-card--${verdict}`}>
      <div className="k-card__top">
        <Link to={`/kpi/${kpi.kpi_key}`} className="k-card__name">
          <SpokenName name={name} lang={lang} />
        </Link>
        <FavButton item={{ id: `kpi:${kpi.kpi_key}`, label: name, to: `/kpi/${kpi.kpi_key}`, kind: "kpi" }} lang={lang} />
      </div>
      <span className="k-card__value">{l ? fmtValue(l.value, kpi.unit_key, cat, lang) : "…"}</span>
      <span className="k-card__meta">
        {l ? fmtPeriod(l.period, lang) : ""}
        <ChangeBadge c={c} />
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

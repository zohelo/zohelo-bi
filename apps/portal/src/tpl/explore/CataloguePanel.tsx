// Katalog (catalogue panel) of explorer v3, the right zone (Eurostat Data Browser / FRED series notes): with
// nothing selected it shows the whole catalogue — topics with counts (opening one in the field list), sources with
// their latest data, frequencies; with indicators selected it describes each one (unit, frequency, coverage,
// period, sources with licence, links to the definition and methodology) and suggests related indicators.

import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { kpiName, sourceName } from "../chartData";
import { fmtPeriod, freqLabel } from "../format";
import { Icon, domainIcon } from "../ui/icons";
import { KpiInfo } from "../ui/KpiInfo";
import { MAX_KPIS, kpisOf, type Query } from "./exploreState";
import { licenceOf } from "./sources";

/** Comparable end of a period, to find the latest data of a source across frequencies. */
function periodEnd(p: string): string {
  if (/^\d{4}$/.test(p)) return `${p}-12`;
  const q = /^(\d{4})-Q(\d)$/.exec(p);
  return q ? `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}` : p;
}

/** Up to `n` indicators from the same groups as the chosen ones, not chosen yet. */
export function related(cat: Catalog, chosen: Kpi[], n = 4): Kpi[] {
  const groups = new Set(chosen.map((k) => k.group_key));
  return cat.kpis.filter((k) => groups.has(k.group_key) && !chosen.some((c) => c.kpi_key === k.kpi_key)).slice(0, n);
}

export function CataloguePanel({
  cat,
  q,
  lang,
  onOpenDomain,
  onAdd,
}: {
  cat: Catalog;
  q: Query;
  lang: Lang;
  onOpenDomain: (domainKey: string) => void;
  onAdd: (kpiKey: string) => void;
}) {
  const pl = lang === "pl";
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const chosen = kpisOf(cat, q.i);
  if (chosen.length) {
    const rel = related(cat, chosen);
    return (
      <div className="x3-cat">
        <h2 className="x3-cat__h">{pl ? "O wybranych danych" : "About the chosen data"}</h2>
        {chosen.map((k) => {
          const lic = licenceOf(cat, q.src[k.kpi_key] ?? k.source_keys[0] ?? "");
          return (
            <div key={k.kpi_key} className="x3-cat__kpi">
              <KpiInfo kpi={k} cat={cat} lang={lang} />
              {lic ? (
                <p className="caption x3-cat__lic">
                  {pl ? "Licencja: " : "Licence: "}
                  <a href={lic.url} rel="noreferrer" target="_blank">
                    {lic.name}
                  </a>
                </p>
              ) : null}
            </div>
          );
        })}
        {rel.length && chosen.length < MAX_KPIS ? (
          <div className="x3-cat__rel">
            <h3 className="x3-cat__h3">{pl ? "Powiązane wskaźniki" : "Related indicators"}</h3>
            <ul className="x3-cat__list">
              {rel.map((k) => (
                <li key={k.kpi_key}>
                  <button type="button" className="x3-cat__add" onClick={() => onAdd(k.kpi_key)}>
                    +<span className="zt-sr"> {pl ? "Dodaj:" : "Add:"}</span> {kpiName(k, lang)}
                  </button>
                  <span className="caption x3-cat__meta">
                    {freqLabel(k.frequency, lang)} · {fmtPeriod(k.last_period, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const sources = cat.sources
    .map((s) => {
      const kpis = cat.kpis.filter((k) => k.source_keys.includes(s.source_key));
      const last = kpis.map((k) => k.last_period).sort((a, b) => periodEnd(b).localeCompare(periodEnd(a)))[0];
      return { s, n: kpis.length, last };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return (
    <div className="x3-cat">
      <h2 className="x3-cat__h">{pl ? "Katalog danych" : "Data catalogue"}</h2>
      <p className="small x3-cat__lead">
        <strong>{cat.kpis.length}</strong> {pl ? "wskaźników" : "indicators"} ·{" "}
        {(["M", "Q", "A"] as const).map((f) => `${cat.kpis.filter((k) => k.frequency === f).length} ${freqLabel(f, lang)}`).join(" · ")}
      </p>
      <h3 className="x3-cat__h3">{pl ? "Tematy" : "Topics"}</h3>
      <ul className="x3-cat__list">
        {domains.map((d) => (
          <li key={d.domain_key}>
            <button type="button" className="x3-cat__topic" onClick={() => onOpenDomain(d.domain_key)}>
              <Icon name={domainIcon(d.domain_key)} size={14} />
              <span>{name(d)}</span>
              <span className="x3-field__n">{cat.kpis.filter((k) => k.domain_key === d.domain_key).length}</span>
            </button>
          </li>
        ))}
      </ul>
      <h3 className="x3-cat__h3">{pl ? "Źródła i świeżość" : "Sources and freshness"}</h3>
      <ul className="x3-cat__list x3-cat__sources">
        {sources.map(({ s, n, last }) => (
          <li key={s.source_key}>
            <span className="x3-cat__src">{sourceName(cat, s.source_key, lang)}</span>
            <span className="caption x3-cat__meta">
              {n} · {pl ? "dane do " : "data to "}
              {last ? fmtPeriod(last, lang) : "–"}
            </span>
          </li>
        ))}
      </ul>
      <p className="caption x3-cat__foot">
        <Link to="/catalogue">{pl ? "Pełny katalog z filtrami" : "Full catalogue with filters"}</Link> ·{" "}
        <Link to="/przewodnik/metodologia">{pl ? "Metodologia" : "Methodology"}</Link>
      </p>
    </div>
  );
}

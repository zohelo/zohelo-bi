// Przegląd: the numbers to remember across all domains, then one card per domain linking to its dashboard.

import { useData } from "../../components/useData";
import { data, type Kpi, type Latest } from "../../data";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { KpiTile, PageHeader, StatusTag } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { basisFor, fmtChange, fmtPeriod, fmtValue } from "../format";
import { kpiName, sourceName } from "../chartData";

/** Headline indicators shown on the overview (fall back to each domain's first KPI). */
const HEADLINE = [
  "hicp_annual_rate",
  "unemployment_lfs",
  "gdp_real_growth",
  "avg_wage",
  "population_total",
  "eurpln",
  "gg_debt_gdp",
  "res_share",
];

export function Overview() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  useMeta(pl ? "Przegląd" : "Overview", [{ label: pl ? "Przegląd" : "Overview" }]);
  const kpis = HEADLINE.map((k) => catalog?.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const latest = useData(catalog ? "overview-latest" : null, () => Promise.all(kpis.map((k) => data.latest(k.kpi_key))));
  const sparks = useData(catalog ? "overview-sparks" : null, () =>
    Promise.all(kpis.map((k) => data.series(k.kpi_key, { from: String(Number(k.last_period.slice(0, 4)) - 5) }))),
  );
  const domains = (catalog?.domains ?? []).filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);

  return (
    <>
      <PageHeader
        title={pl ? "Polska w danych" : "Poland in data"}
        lead={
          pl
            ? "Najważniejsze liczby o Polsce z GUS, Eurostatu, NBP i Banku Światowego, uporządkowane w 12 dziedzinach statystyki publicznej."
            : "Key figures about Poland from Statistics Poland, Eurostat, NBP and the World Bank, organised in 12 domains of official statistics."
        }
        right={catalog?.sample ? <StatusTag kind="sample">{pl ? "Dane przykładowe" : "Sample data"}</StatusTag> : undefined}
      />
      <section className="t-section" aria-labelledby="ov-kpis">
        <h2 id="ov-kpis" className="section-title">
          {pl ? "Najważniejsze liczby" : "Key figures"}
        </h2>
        <div className="t-kpis">
          {kpis.map((k, i) => {
            const l: Latest | undefined = latest.data?.[i];
            return (
              <KpiTile
                key={k.kpi_key}
                to={`/kpi/${k.kpi_key}`}
                label={kpiName(k, lang)}
                period={l ? fmtPeriod(l.period, lang) : "…"}
                value={l ? fmtValue(l.value, k.unit_key, catalog, lang) : "…"}
                change={l ? fmtChange(l.value, l.previous_value, k.unit_key, basisFor(k.frequency), catalog, lang) : undefined}
                source={l ? sourceName(catalog, l.source_key, lang) : undefined}
                spark={sparks.data?.[i]?.[0]?.points.map((p) => p.value)}
              />
            );
          })}
        </div>
      </section>
      <section className="t-section" aria-labelledby="ov-domains">
        <h2 id="ov-domains" className="section-title">
          {pl ? "Dziedziny" : "Domains"}
        </h2>
        <div className="t-domaingrid">
          {domains.map((d) => {
            const groups = (catalog?.domains ?? []).filter((g) => g.parent_key === d.domain_key && g.level === "group");
            const n = catalog?.kpis.filter((k) => k.domain_key === d.domain_key).length ?? 0;
            return (
              <Link key={d.domain_key} to={`/d/${d.domain_key}`} className="zt-card t-domaincard">
                <span className="t-domaincard__icon">
                  <Icon name={domainIcon(d.domain_key)} />
                </span>
                <span className="t-domaincard__name">{name(d)}</span>
                <span className="t-domaincard__meta">
                  {groups.length} {pl ? "obszarów" : "areas"} · {n} {pl ? "wskaźników" : "indicators"}
                </span>
                <span className="t-domaincard__groups">
                  {groups.slice(0, 4).map(name).join(", ")}
                  {groups.length > 4 ? "…" : ""}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

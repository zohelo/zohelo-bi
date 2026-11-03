// Dashboardy (landing page of the dashboards, /d) and the domain cards shared with the home page: one card per
// domain with its headline figures (the first KPI tiles of the domain overview) — each card opens that dashboard.

import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { PageHeader } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { basisFor, fmtChange, fmtPeriod, fmtValue } from "../format";
import { kpiName } from "../chartData";
import { dashboardFor } from "../dashboard/load";

/** Headline KPIs of a domain: the first `n` tiles of its overview (fallback: its first indicators). */
export function domainHeadline(cat: Catalog, domain: string, n = 3): Kpi[] {
  const tiles = dashboardFor(domain)?.overview.kpis ?? [];
  const keys = tiles.map((t) => (typeof t === "string" ? t : t.kpi));
  const found = keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const fill = cat.kpis.filter((k) => k.domain_key === domain && !found.includes(k));
  return [...found, ...fill].slice(0, n);
}

export function DomainCards({ cat, lang, perCard = 3 }: { cat: Catalog; lang: Lang; perCard?: number }) {
  const pl = lang === "pl";
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const heads = domains.map((d) => domainHeadline(cat, d.domain_key, perCard));
  const flat = heads.flat();
  const latest = useData(`domain-cards|${perCard}`, () => Promise.all(flat.map((k) => data.latest(k.kpi_key))));
  const byKey = new Map<string, Latest>();
  latest.data?.forEach((l, i) => byKey.set(flat[i]!.kpi_key, l));
  return (
    <div className="h-topics">
      {domains.map((d, i) => {
        const pages = cat.domains.filter((g) => g.parent_key === d.domain_key && g.level === "group").length;
        return (
          <Link key={d.domain_key} to={`/d/${d.domain_key}`} className="zt-card h-topic">
            <span className="h-topic__head">
              <Icon name={domainIcon(d.domain_key)} />
              <span className="h-topic__name">{name(d)}</span>
              <span className="h-topic__go" aria-hidden="true">
                <Icon name="chevronRight" size={16} />
              </span>
            </span>
            <span className="h-topic__figs">
              {heads[i]!.map((k) => {
                const l = byKey.get(k.kpi_key);
                const ch = l ? fmtChange(l.value, l.previous_value, k.unit_key, basisFor(k.frequency), cat, lang) : undefined;
                return (
                  <span key={k.kpi_key} className="h-topic__fig">
                    <span className="h-topic__label">{kpiName(k, lang)}</span>
                    <span className="h-topic__value">{l ? fmtValue(l.value, k.unit_key, cat, lang) : "…"}</span>
                    <span className="h-topic__sub">
                      {l ? fmtPeriod(l.period, lang) : ""}
                      {ch ? (
                        <>
                          <span aria-hidden="true"> · {ch.shown}</span>
                          <span className="zt-sr">, {ch.spoken}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                );
              })}
            </span>
            <span className="h-topic__meta">
              {pages} {pl ? (pages >= 5 ? "stron" : "strony") : "pages"} · {cat.kpis.filter((x) => x.domain_key === d.domain_key).length}{" "}
              {pl ? "wskaźników" : "indicators"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardsPage() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Dashboardy" : "Dashboards";
  useMeta(title, [{ label: title }], [lang]);
  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Dwanaście dashboardów tematycznych. Każda karta pokazuje najważniejsze liczby dziedziny i otwiera jej dashboard."
            : "Twelve topic dashboards. Each card shows the domain's headline figures and opens its dashboard."
        }
      />
      {catalog ? (
        <DomainCards cat={catalog} lang={lang} />
      ) : (
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      )}
    </>
  );
}

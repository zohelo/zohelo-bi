// Strona główna (home page), built from the patterns of national statistics portals (ONS, Statistics Canada,
// Destatis, Eurostat, World Bank, Our World in Data; NN/g homepage guidelines):
//   1. one-line purpose + search with example queries + coverage line (scope and freshness)
//   2. key figures for Poland: value, period, change with its basis, sparkline, source; each opens its page
//   3. dashboards by topic, each with one live headline figure (12 cards)
//   4. recently updated indicators (dated list) next to two featured charts that open in the explorer
//   5. ways to use the data (explorer, catalogue, download) and the sources with their licences
// No carousel, nothing animated, every figure shows its period.

import { ZChart } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { KpiTile } from "../ui/blocks";
import { domainIcon, Icon, type IconName } from "../ui/icons";
import { basisFor, fmtChange, fmtPeriod, fmtValue } from "../format";
import { kpiName, periodFormatter, sourceName, toZSeries, zUnit } from "../chartData";
import { dashboardFor } from "../dashboard/load";
import { exploreLink } from "../explore/exploreState";
import { SideSearch } from "../shell/SideSearch";

/** Headline indicators (the "main figures" row). */
const HEADLINE = [
  "gdp_real_growth",
  "cpi_annual_rate",
  "unemployment_lfs",
  "avg_wage",
  "gg_debt_gdp",
  "eurpln",
  "population_total",
  "res_share",
];

/** Example queries under the search box: they open the indicator directly. */
const EXAMPLES = ["cpi_annual_rate", "unemployment_lfs", "gdp_real_growth", "avg_wage", "eurpln"];

/** Comparable end date of a period, so monthly, quarterly and annual periods sort together. */
function periodEnd(p: string): string {
  if (/^\d{4}$/.test(p)) return `${p}-12`;
  const q = /^(\d{4})-Q(\d)$/.exec(p);
  if (q) return `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}`;
  return p;
}

export function recentlyUpdated(cat: Catalog, n = 8): Kpi[] {
  return [...cat.kpis]
    .sort((a, b) => periodEnd(b.last_period).localeCompare(periodEnd(a.last_period)) || a.kpi_key.localeCompare(b.kpi_key))
    .slice(0, n);
}

export function HomePage() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  useMeta(pl ? "Strona główna" : "Home", [{ label: pl ? "Strona główna" : "Home" }]);
  if (!catalog)
    return (
      <div className="zt-state" aria-busy="true">
        {pl ? "Wczytywanie" : "Loading"}
      </div>
    );
  return <HomeBody cat={catalog} lang={lang} />;
}

function HomeBody({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const byKey = (k: string) => cat.kpis.find((x) => x.kpi_key === k);
  const kpis = HEADLINE.map(byKey).filter((k): k is Kpi => !!k);
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  // Each dashboard's first KPI tile is its headline figure on the topic card.
  const topicKpis = domains.map((d) => {
    const t = dashboardFor(d.domain_key)?.overview.kpis[0];
    const key = typeof t === "string" ? t : t?.kpi;
    return (key ? byKey(key) : undefined) ?? cat.kpis.find((k) => k.domain_key === d.domain_key);
  });
  const latest = useData("home-latest", () => Promise.all(kpis.map((k) => data.latest(k.kpi_key))));
  const sparks = useData("home-sparks", () =>
    Promise.all(kpis.map((k) => data.series(k.kpi_key, { from: String(Number(k.last_period.slice(0, 4)) - 5) }))),
  );
  const topicLatest = useData("home-topics", () =>
    Promise.all(topicKpis.map((k) => (k ? data.latest(k.kpi_key) : Promise.resolve(undefined)))),
  );
  const recent = recentlyUpdated(cat);
  const date = cat.generated_at.slice(0, 10).split("-").reverse().join(".");
  const usedSources = cat.sources.filter((s) => cat.kpis.some((k) => k.source_keys.includes(s.source_key)));

  return (
    <div className="h-page">
      <section className="h-hero" aria-labelledby="h-title">
        <h1 id="h-title" className="page-title h-hero__title">
          {pl ? "Polska w danych publicznych" : "Poland in public data"}
        </h1>
        <p className="body-l h-hero__lead">
          {pl
            ? "Statystyki GUS, Eurostatu, NBP, OECD i Banku Światowego w jednym miejscu: dashboardy tematyczne, eksplorator i katalog wskaźników."
            : "Statistics from GUS, Eurostat, NBP, the OECD and the World Bank in one place: topic dashboards, an explorer and an indicator catalogue."}
        </p>
        <SideSearch lang={lang} catalog={cat} compact={false} onPhoneOpen={() => undefined} hero />
        <div className="h-hero__examples">
          <span className="small h-muted">{pl ? "Na przykład:" : "For example:"}</span>
          {EXAMPLES.map(byKey)
            .filter((k): k is Kpi => !!k)
            .map((k) => (
              <Link key={k.kpi_key} to={`/kpi/${k.kpi_key}`} className="zt-chip h-chip">
                {kpiName(k, lang)}
              </Link>
            ))}
        </div>
        <p className="small h-hero__scope">
          <strong>{cat.kpis.length}</strong> {pl ? "wskaźników" : "indicators"} · <strong>{domains.length}</strong>{" "}
          {pl ? "dashboardów tematycznych" : "topic dashboards"} · <strong>{usedSources.length}</strong> {pl ? "źródeł" : "sources"} ·{" "}
          {pl ? "dane z " : "data as of "}
          <time dateTime={cat.generated_at.slice(0, 10)}>{date}</time>
        </p>
      </section>

      <section className="t-section" aria-labelledby="h-figures">
        <div className="h-sechead">
          <h2 id="h-figures" className="section-title">
            {pl ? "Najważniejsze liczby" : "Key figures"}
          </h2>
          <Link to="/catalogue">{pl ? "Wszystkie wskaźniki" : "All indicators"}</Link>
        </div>
        <div className="h-figures">
          {kpis.map((k, i) => {
            const l: Latest | undefined = latest.data?.[i];
            return (
              <KpiTile
                key={k.kpi_key}
                to={`/kpi/${k.kpi_key}`}
                label={kpiName(k, lang)}
                period={l ? fmtPeriod(l.period, lang) : "…"}
                value={l ? fmtValue(l.value, k.unit_key, cat, lang) : "…"}
                change={l ? fmtChange(l.value, l.previous_value, k.unit_key, basisFor(k.frequency), cat, lang) : undefined}
                source={l ? sourceName(cat, l.source_key, lang) : undefined}
                spark={sparks.data?.[i]?.[0]?.points.map((p) => p.value)}
              />
            );
          })}
        </div>
      </section>

      <section className="t-section" aria-labelledby="h-topics">
        <div className="h-sechead">
          <h2 id="h-topics" className="section-title">
            {pl ? "Dashboardy tematyczne" : "Topic dashboards"}
          </h2>
        </div>
        <div className="h-topics">
          {domains.map((d, i) => {
            const k = topicKpis[i];
            const l = topicLatest.data?.[i];
            const pages = cat.domains.filter((g) => g.parent_key === d.domain_key && g.level === "group").length;
            return (
              <Link key={d.domain_key} to={`/d/${d.domain_key}`} className="zt-card h-topic">
                <span className="h-topic__head">
                  <Icon name={domainIcon(d.domain_key)} />
                  <span className="h-topic__name">{name(d)}</span>
                </span>
                {k ? (
                  <span className="h-topic__fig">
                    <span className="h-topic__label">{kpiName(k, lang)}</span>
                    <span className="h-topic__value">
                      {l ? fmtValue(l.value, k.unit_key, cat, lang) : "…"}
                      <span className="h-topic__period">{l ? ` · ${fmtPeriod(l.period, lang)}` : ""}</span>
                    </span>
                  </span>
                ) : null}
                <span className="h-topic__meta">
                  {pages} {pl ? (pages >= 5 ? "stron" : "strony") : "pages"} ·{" "}
                  {cat.kpis.filter((x) => x.domain_key === d.domain_key).length} {pl ? "wskaźników" : "indicators"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="h-split">
        <section className="t-section" aria-labelledby="h-recent">
          <div className="h-sechead">
            <h2 id="h-recent" className="section-title">
              {pl ? "Ostatnio zaktualizowane" : "Recently updated"}
            </h2>
            <Link to="/catalogue?sort=newest">{pl ? "Więcej" : "More"}</Link>
          </div>
          <ul className="zt-card h-recent">
            {recent.map((k) => {
              const g = cat.domains.find((d) => d.domain_key === k.group_key);
              return (
                <li key={k.kpi_key}>
                  <Link to={`/kpi/${k.kpi_key}`} className="h-recent__name">
                    {kpiName(k, lang)}
                  </Link>
                  <span className="h-recent__meta">
                    {g ? name(g) : ""} · {sourceName(cat, k.source_keys[0]!, lang)}
                  </span>
                  <span className="h-recent__period">{fmtPeriod(k.last_period, lang)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="t-section" aria-labelledby="h-featured">
          <div className="h-sechead">
            <h2 id="h-featured" className="section-title">
              {pl ? "Warto zobaczyć" : "Featured"}
            </h2>
          </div>
          <div className="h-featured">
            <Featured cat={cat} lang={lang} kpiKey="cpi_annual_rate" kind="target" />
            <Featured cat={cat} lang={lang} kpiKey="gdp_real_growth" kind="peers" />
          </div>
        </section>
      </div>

      <div className="h-split">
        <section className="t-section" aria-labelledby="h-tools">
          <div className="h-sechead">
            <h2 id="h-tools" className="section-title">
              {pl ? "Jak korzystać z danych" : "Ways to use the data"}
            </h2>
          </div>
          <div className="h-tools">
            <Tool
              to="/explore"
              icon="explore"
              title={pl ? "Eksplorator danych" : "Data explorer"}
              text={
                pl
                  ? "Zestaw kilka wskaźników, obszarów i okresów na jednym wykresie."
                  : "Combine indicators, areas and periods in one chart."
              }
            />
            <Tool
              to="/catalogue"
              icon="catalog"
              title={pl ? "Katalog danych" : "Data catalogue"}
              text={
                pl
                  ? `Wszystkie ${cat.kpis.length} wskaźniki z opisem, zasięgiem i źródłem.`
                  : `All ${cat.kpis.length} indicators with scope and source.`
              }
            />
            <Tool
              to="/przewodnik/metodologia"
              icon="doc"
              title={pl ? "Pobieranie i metodologia" : "Downloads and methodology"}
              text={
                pl
                  ? "Każdy wykres i dashboard pobierzesz jako CSV; API w przygotowaniu."
                  : "Every chart and dashboard downloads as CSV; an API is being prepared."
              }
            />
          </div>
        </section>
        <section className="t-section" aria-labelledby="h-sources">
          <div className="h-sechead">
            <h2 id="h-sources" className="section-title">
              {pl ? "Źródła i licencje" : "Sources and licences"}
            </h2>
            <Link to="/przewodnik/metodologia">{pl ? "Metodologia" : "Methodology"}</Link>
          </div>
          <ul className="zt-card h-sources">
            {usedSources.map((s) => {
              const lic = cat.licences.find((l) => l.licence_key === s.licence_key);
              return (
                <li key={s.source_key}>
                  <span className="h-sources__name">{name(s)}</span>
                  <span className="h-sources__lic">{lic ? lic.name : s.licence_key}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tool({ to, icon, title, text }: { to: string; icon: IconName; title: string; text: string }) {
  return (
    <Link to={to} className="zt-card h-tool">
      <span className="h-tool__icon">
        <Icon name={icon} />
      </span>
      <span className="h-tool__title">{title}</span>
      <span className="h-tool__text">{text}</span>
    </Link>
  );
}

/** A small chart with a one-line finding; opens the same view in the explorer. */
function Featured({ cat, lang, kpiKey, kind }: { cat: Catalog; lang: Lang; kpiKey: string; kind: "target" | "peers" }) {
  const pl = lang === "pl";
  const k = cat.kpis.find((x) => x.kpi_key === kpiKey);
  const geos = kind === "peers" ? ["PL", "EU27", "CZ", "DE"].filter((g) => k?.geographies.includes(g)) : ["PL"];
  const from = k ? String(Number(k.last_period.slice(0, 4)) - 8) : undefined;
  const rows = useData(k ? `home-feat|${kpiKey}|${geos.join(",")}` : null, () => data.series(kpiKey, { geographies: geos, from }));
  if (!k) return null;
  const series = rows.data ? toZSeries(rows.data, cat, lang) : [];
  const last = series[0]?.points.at(-1);
  const value = last?.y != null ? fmtValue(last.y, k.unit_key, cat, lang) : "…";
  const title =
    kind === "target"
      ? pl
        ? `Inflacja CPI ${value} wobec celu NBP 2,5% ± 1 pp`
        : `CPI inflation ${value} against the NBP target 2.5% ± 1 pp`
      : pl
        ? `Wzrost PKB Polski ${value} r/r na tle UE i sąsiadów`
        : `Poland's GDP growth ${value} y/y against the EU and neighbours`;
  return (
    <article className="zt-card h-feat" aria-labelledby={`h-feat-${kpiKey}`}>
      <h3 id={`h-feat-${kpiKey}`} className="zt-card__title">
        {title}
      </h3>
      <p className="zt-card__sub">
        {kpiName(k, lang)}, {pl ? "ostatnie 8 lat" : "last 8 years"}
      </p>
      {series.length ? (
        <ZChart
          type={kind === "target" ? "line-band" : "line-highlight"}
          series={series}
          unit={zUnit(cat, k.unit_key)}
          lang={lang}
          ariaLabel={title}
          band={kind === "target" ? [1.5, 3.5] : undefined}
          formatPeriod={periodFormatter(lang)}
          height={200}
        />
      ) : (
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      )}
      <div className="h-feat__links">
        <Link to={exploreLink(k, cat)}>{pl ? "Otwórz w eksploratorze" : "Open in explorer"}</Link>
        <Link to={`/kpi/${k.kpi_key}`}>{pl ? "Strona wskaźnika" : "Indicator page"}</Link>
      </div>
    </article>
  );
}

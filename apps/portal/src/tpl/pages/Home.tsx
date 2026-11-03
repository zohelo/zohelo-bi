// Strona główna (home page): the landing parts of every main section, one after another in the sidebar's
// order — Start (search, favourites and featured), Dashboardy, Eksplorator danych, Katalog danych, Przewodnik.
// While scrolling, the sidebar marks the section being read (both directions); each section links to its
// full page. Patterns from ONS, Statistics Canada, Eurostat, Our World in Data and NN/g homepage guidance.

import { useEffect, useRef } from "react";
import { ZChart } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { browserStorage, loadViews } from "../../savedViews";
import { useMeta, usePage } from "../context";
import { Icon } from "../ui/icons";
import { fmtPeriod, fmtValue, freqLabel } from "../format";
import { kpiName, periodFormatter, sourceName, toZSeries, zUnit } from "../chartData";
import { exploreLink } from "../explore/exploreState";
import { SideSearch } from "../shell/SideSearch";
import { HOME_SECTION_EVENT, type HomeSection } from "../shell/AppShell";
import { activeTarget } from "../ui/SectionNav";
import { GUIDE_GROUPS, GUIDE_SECTIONS, sectionPath } from "../guide/sections";
import { DomainCards } from "./Dashboards";
import { ViewBuilderSlot } from "./HomeBuilder";

/** Example queries under the search box: they open the indicator directly. */
const EXAMPLES = ["cpi_annual_rate", "unemployment_lfs", "gdp_real_growth", "avg_wage", "eurpln"];

const SECTIONS: HomeSection[] = ["home", "dashboards", "explore", "catalogue", "guide"];
const SECTION_ID: Record<HomeSection, string> = {
  home: "start",
  dashboards: "dashboardy",
  explore: "eksplorator",
  catalogue: "katalog",
  guide: "przewodnik",
};

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

/** Tell the sidebar which home section is being read (scroll-spy; resets when leaving the page). */
function useHomeScrollSpy() {
  const last = useRef<HomeSection | undefined>(undefined);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = SECTIONS.map((s) => document.getElementById(SECTION_ID[s])?.getBoundingClientRect().top ?? Infinity);
      const doc = document.documentElement;
      const atEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      const i = activeTarget(tops, 60 + 120, atEnd);
      const s = SECTIONS[Math.max(0, i)]!;
      if (s !== last.current) {
        last.current = s;
        window.dispatchEvent(new CustomEvent(HOME_SECTION_EVENT, { detail: s }));
      }
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (frame) cancelAnimationFrame(frame);
      window.dispatchEvent(new CustomEvent(HOME_SECTION_EVENT, { detail: "home" }));
    };
  }, []);
}

export function HomePage() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  useMeta(pl ? "Strona główna" : "Home", [{ label: pl ? "Strona główna" : "Home" }], [lang]);
  if (!catalog)
    return (
      <div className="zt-state" aria-busy="true">
        {pl ? "Wczytywanie" : "Loading"}
      </div>
    );
  return <HomeBody cat={catalog} lang={lang} />;
}

function SectionHead({ id, title, lead, to, link }: { id: string; title: string; lead: string; to: string; link: string }) {
  return (
    <div className="h-sechead">
      <div>
        <h2 id={`${id}-h`} className="section-title">
          {title}
        </h2>
        <p className="small h-muted h-sechead__lead">{lead}</p>
      </div>
      <Link to={to} className="zt-btn h-sechead__go">
        {link}
        <Icon name="chevronRight" size={14} />
      </Link>
    </div>
  );
}

function HomeBody({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  useHomeScrollSpy();
  const byKey = (k: string) => cat.kpis.find((x) => x.kpi_key === k);
  const domains = cat.domains.filter((d) => d.level === "domain");
  const usedSources = cat.sources.filter((s) => cat.kpis.some((k) => k.source_keys.includes(s.source_key)));
  const date = cat.generated_at.slice(0, 10).split("-").reverse().join(".");
  const recent = recentlyUpdated(cat);
  const views = loadViews(browserStorage()).slice(0, 4);
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const freqCount = (f: string) => cat.kpis.filter((k) => k.frequency === f).length;

  return (
    <div className="h-page">
      <section id={SECTION_ID.home} className="h-screen" aria-labelledby="h-title">
        <div className="h-hero">
          <h1 id="h-title" className="page-title h-hero__title">
            {pl ? "Polska w danych publicznych" : "Poland in public data"}
          </h1>
          <p className="body-l h-hero__lead">
            {pl
              ? "Statystyki GUS, Eurostatu, NBP, OECD i Banku Światowego w jednym miejscu."
              : "Statistics from GUS, Eurostat, NBP, the OECD and the World Bank in one place."}
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
            {pl ? "dashboardów" : "dashboards"} · <strong>{usedSources.length}</strong> {pl ? "źródeł" : "sources"} ·{" "}
            {pl ? "dane z " : "data as of "}
            <time dateTime={cat.generated_at.slice(0, 10)}>{date}</time>
          </p>
        </div>
        <div className="h-favs">
          <h2 className="h-favs__title">
            {views.length ? (pl ? "Twoje zapisane widoki i polecane" : "Your saved views and featured") : pl ? "Polecane" : "Featured"}
          </h2>
          <div className="h-favs__grid">
            {views.length ? (
              <ul className="zt-card h-saved">
                {views.map((v) => (
                  <li key={v.id}>
                    <Icon name="saved" size={16} />
                    <Link to={v.url}>{v.name}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Featured cat={cat} lang={lang} kpiKey="cpi_annual_rate" kind="target" />
            <Featured cat={cat} lang={lang} kpiKey="gdp_real_growth" kind="peers" />
          </div>
        </div>
      </section>

      <section id={SECTION_ID.dashboards} className="h-screen" aria-labelledby="dashboardy-h">
        <SectionHead
          id="dashboardy"
          title={pl ? "Dashboardy" : "Dashboards"}
          lead={
            pl
              ? "Najważniejsze liczby każdej dziedziny; karta otwiera jej dashboard."
              : "Each domain's headline figures; a card opens its dashboard."
          }
          to="/d"
          link={pl ? "Wszystkie dashboardy" : "All dashboards"}
        />
        <DomainCards cat={cat} lang={lang} perCard={2} />
      </section>

      <section id={SECTION_ID.explore} className="h-screen" aria-labelledby="eksplorator-h">
        <SectionHead
          id="eksplorator"
          title={pl ? "Eksplorator danych" : "Data explorer"}
          lead={
            pl
              ? "Opisz, co chcesz zobaczyć, albo zacznij od gotowego widoku."
              : "Describe what you want to see, or start from a ready view."
          }
          to="/explore"
          link={pl ? "Otwórz eksplorator" : "Open the explorer"}
        />
        <ViewBuilderSlot cat={cat} lang={lang} />
      </section>

      <section id={SECTION_ID.catalogue} className="h-screen" aria-labelledby="katalog-h">
        <SectionHead
          id="katalog"
          title={pl ? "Katalog danych" : "Data catalogue"}
          lead={pl ? "Wszystkie wskaźniki z opisem, zasięgiem i źródłem." : "Every indicator with its scope and source."}
          to="/catalogue"
          link={pl ? "Otwórz katalog" : "Open the catalogue"}
        />
        <div className="h-split">
          <div className="zt-card h-catstats">
            <p className="h-catstats__big">
              <strong>{cat.kpis.length}</strong> {pl ? "wskaźników" : "indicators"}
            </p>
            <dl className="h-catstats__list">
              {(["M", "Q", "A"] as const).map((f) => (
                <div key={f}>
                  <dt>{freqLabel(f, lang)}</dt>
                  <dd>{freqCount(f)}</dd>
                </div>
              ))}
              <div>
                <dt>{pl ? "Źródła" : "Sources"}</dt>
                <dd>{usedSources.length}</dd>
              </div>
            </dl>
            <p className="small h-muted">{usedSources.map((s) => name(s)).join(" · ")}</p>
          </div>
          <div>
            <h3 className="h-subtitle">{pl ? "Ostatnio zaktualizowane" : "Recently updated"}</h3>
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
          </div>
        </div>
      </section>

      <section id={SECTION_ID.guide} className="h-screen" aria-labelledby="przewodnik-h">
        <SectionHead
          id="przewodnik"
          title={pl ? "Przewodnik" : "Guide"}
          lead={
            pl
              ? "Zasady szablonu zohelo: marka, układ, wykresy, treści, dostępność i metodologia."
              : "The zohelo template rules: brand, layout, charts, content, accessibility and methodology."
          }
          to="/przewodnik"
          link={pl ? "Otwórz przewodnik" : "Open the guide"}
        />
        <div className="h-guide">
          {GUIDE_GROUPS.map((g) => (
            <div key={g.key} className="zt-card h-guide__group">
              <h3 className="h-subtitle">{pl ? g.pl : g.en}</h3>
              <ul>
                {GUIDE_SECTIONS.filter((s) => s.group === g.key).map((s) => (
                  <li key={s.slug}>
                    <Link to={sectionPath(s.slug)}>{pl ? s.pl : s.en}</Link>
                    <span className="small h-muted">{pl ? s.sumPl : s.sumEn}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
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
          height={180}
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

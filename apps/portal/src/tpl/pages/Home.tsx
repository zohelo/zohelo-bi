// Strona główna (home page, design brief §4.1): a short, engaging start — not a copy of the sidebar.
//   1. Hero band with a quiet background (variant A mesh, B data lines, C map of the day): title, one-line promise,
//      the ask box, four example prompts, the scope line and "Otwórz eksplorator". Layout "story" puts the chart
//      of the day beside the ask box (Tableau Public's viz of the day).
//   2. Dla Ciebie: favourites, your views, frequently viewed, recommended, featured, popular (one row each).
//   3. Najważniejsze liczby: headline figures of your topics (or of Poland), change coloured only where its
//      direction is clearly good or bad, with a sparkline of the last years.
//   4. Co nowego w danych: what was updated recently and the size of the catalogue.
// Layout "brief" (proposal of 2026-11-10) replaces 2–4 with a briefing and doors by task: home/Brief.tsx.
// Every layout opens the content under the hero with "Na czasie" (hot topics, home/Trending.tsx; owner decision O32).

import { lazy, Suspense, useState } from "react";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { Icon } from "../ui/icons";
import { KpiCard } from "../ui/KpiCard";
import { fmtPeriod, freqLabel } from "../format";
import { kpiName, sourceName } from "../chartData";
import { SideSearch } from "../shell/SideSearch";
import { EXAMPLE_PROMPTS } from "../ai/examples";
import { domainHeadline } from "./Dashboards";
import { ForYouSection, loadInterests } from "./ForYou";
import { heroBackground } from "../home/HeroBackground";
import { usePersonal } from "../usePersonal";
import { Trending } from "../home/Trending";
import "../home/home.css";

// Design variants under review (variants.ts): loaded only when chosen, so the default home stays small.
const StoryCard = lazy(() => import("../home/StoryCard").then((m) => ({ default: m.StoryCard })));
const BriefSections = lazy(() => import("../home/Brief").then((m) => ({ default: m.BriefSections })));

/** Headline figures when the reader has not chosen topics. */
const DEFAULT_FIGURES = [
  "gdp_real_growth",
  "cpi_annual_rate",
  "unemployment_lfs",
  "avg_wage",
  "gg_debt_gdp",
  "eurpln",
  "population_total",
  "res_share",
];

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
  useMeta(pl ? "Strona główna" : "Home", [{ label: pl ? "Strona główna" : "Home" }], [lang]);
  return <HomeBody cat={catalog} lang={lang} />;
}

function SectionHead({ id, title, lead, to, link }: { id: string; title: string; lead: string; to?: string; link?: string }) {
  return (
    <div className="h-sechead">
      <div>
        <h2 id={id} className="section-title">
          {title}
        </h2>
        <p className="small h-muted h-sechead__lead">{lead}</p>
      </div>
      {to && link ? (
        <Link to={to} className="zt-btn h-sechead__go">
          {link}
          <Icon name="chevronRight" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** The hero renders before the catalogue arrives: the ask box is usable at once, the art and counts follow. */
function Hero({ cat, lang }: { cat: Catalog | undefined; lang: Lang }) {
  const pl = lang === "pl";
  const { variants } = usePersonal();
  const story = variants.homeLayout === "story" && !!cat;
  const { art, caption } = heroBackground(variants.homeBg, cat, lang);
  const domains = cat?.domains.filter((d) => d.level === "domain") ?? [];
  const usedSources = cat?.sources.filter((s) => cat.kpis.some((k) => k.source_keys.includes(s.source_key))) ?? [];
  const date = cat?.generated_at.slice(0, 10).split("-").reverse().join(".");
  return (
    <section className={`h-hero h-hero--${variants.homeBg}${story ? " h-hero--story" : ""}`} aria-labelledby="h-title">
      {art}
      <div className="h-hero__inner">
        <div className="h-hero__main">
          <p className="label-caps h-hero__eyebrow">{pl ? "Dane publiczne · jedno miejsce" : "Public data · one place"}</p>
          <h1 id="h-title" className="display-hero h-hero__title">
            {pl ? "Polska w danych publicznych" : "Poland in public data"}
          </h1>
          <p className="body-l h-hero__lead">
            {pl
              ? "Zapytaj własnymi słowami albo wyszukaj wskaźnik: zbudujemy widok w eksploratorze lub wskażemy właściwą stronę."
              : "Ask in your own words or search for an indicator: we build a view in the explorer or point to the right page."}
          </p>
          <div className="h-hero__ask">
            <SideSearch lang={lang} catalog={cat} compact={false} onPhoneOpen={() => undefined} hero />
          </div>
          <div className="h-hero__examples" role="group" aria-label={pl ? "Przykładowe pytania" : "Example questions"}>
            <span className="small h-hero__label">{pl ? "Na przykład:" : "For example:"}</span>
            {EXAMPLE_PROMPTS[lang].map((t) => (
              <Link key={t} to={`/explore?ask=${encodeURIComponent(t)}`} className="zt-chip h-chip">
                {t}
              </Link>
            ))}
          </div>
          <div className="h-hero__foot">
            {cat ? (
              <p className="small h-hero__scope">
                <strong>{cat.kpis.length}</strong> {pl ? "wskaźników" : "indicators"} · <strong>{domains.length}</strong>{" "}
                {pl ? "tematów" : "topics"} · <strong>{usedSources.length}</strong> {pl ? "źródeł" : "sources"} ·{" "}
                {pl ? "dane z " : "data as of "}
                <time dateTime={cat.generated_at.slice(0, 10)}>{date}</time>
              </p>
            ) : null}
            <Link to="/explore" className="zt-btn zt-btn--primary h-hero__go">
              {pl ? "Otwórz eksplorator" : "Open the explorer"}
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          {caption ? <p className="caption h-hero__caption">{caption}</p> : null}
        </div>
        {story && cat ? (
          <div className="h-hero__side">
            <Suspense fallback={null}>
              <StoryCard cat={cat} lang={lang} />
            </Suspense>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HomeBody({ cat, lang }: { cat: Catalog | undefined; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <div className="h-page">
      <Hero cat={cat} lang={lang} />
      {cat ? (
        <Sections cat={cat} lang={lang} />
      ) : (
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      )}
    </div>
  );
}

function Sections({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const usedSources = cat.sources.filter((s) => cat.kpis.some((k) => k.source_keys.includes(s.source_key)));
  const recent = recentlyUpdated(cat, 6);
  const freqCount = (f: string) => cat.kpis.filter((k) => k.frequency === f).length;
  // Figures follow the reader's topics (the same choice as in Dla Ciebie), else a national overview.
  const [interests, setInterests] = useState<string[]>(loadInterests);
  const { variants } = usePersonal();
  const figures: Kpi[] = (
    interests.length
      ? interests.flatMap((d) => domainHeadline(cat, d, 2))
      : DEFAULT_FIGURES.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k)
  ).slice(0, 8);
  const keys = figures.map((k) => k.kpi_key).join(",");
  const latest = useData(`home-figures|${keys}`, () => Promise.all(figures.map((k) => data.latest(k.kpi_key))));
  const sparks = useData(`home-sparks|${keys}`, () =>
    Promise.all(
      figures.map((k) =>
        data
          .series(k.kpi_key, { geographies: ["PL"], from: String(Number(k.last_period.slice(0, 4)) - 5) })
          .then((s) => s[0]?.points.map((p) => p.value) ?? []),
      ),
    ),
  );

  // "Na czasie" opens the page content in every layout (owner decision O32).
  const trending = <Trending cat={cat} lang={lang} />;
  if (variants.homeLayout === "brief")
    return (
      <>
        {trending}
        <Suspense fallback={<div className="t-page-loading" aria-busy="true" />}>
          <BriefSections cat={cat} lang={lang} onInterests={setInterests} />
        </Suspense>
      </>
    );
  return (
    <>
      {trending}
      <section className="h-block" aria-labelledby="h-foryou">
        <SectionHead
          id="h-foryou"
          title={pl ? "Dla Ciebie" : "For you"}
          lead={
            pl
              ? "To, co zapisujesz, oznaczasz i oglądasz, oraz podpowiedzi według Twoich tematów."
              : "What you save, star and view, and suggestions from your topics."
          }
        />
        <ForYouSection cat={cat} lang={lang} onInterests={setInterests} />
      </section>

      <section className="h-block" aria-labelledby="h-figures">
        <SectionHead
          id="h-figures"
          title={pl ? "Najważniejsze liczby" : "Key figures"}
          lead={
            interests.length
              ? pl
                ? "Z Twoich tematów. Zielony i czerwony tylko tam, gdzie kierunek zmiany jest jednoznacznie korzystny lub nie."
                : "From your topics. Green and red only where the direction of change is clearly good or bad."
              : pl
                ? "Polska w ośmiu liczbach. Wybierz tematy w Dla Ciebie, a pokażemy Twoje."
                : "Poland in eight figures. Choose topics in For you to see yours."
          }
          to="/d"
          link={pl ? "Wszystkie tematy" : "All topics"}
        />
        <div className="k-grid">
          {figures.map((k, i) => (
            <KpiCard
              key={k.kpi_key}
              kpi={k}
              latest={latest.data?.[i]}
              spark={sparks.data?.[i]}
              cat={cat}
              lang={lang}
              context={name(cat.domains.find((d) => d.domain_key === k.domain_key) ?? { name_pl: "", name_en: "" })}
            />
          ))}
        </div>
      </section>

      <section className="h-block" aria-labelledby="h-news">
        <SectionHead
          id="h-news"
          title={pl ? "Co nowego w danych" : "What's new in the data"}
          lead={pl ? "Ostatnio zaktualizowane wskaźniki i zasoby katalogu." : "Recently updated indicators and what the catalogue holds."}
          to="/catalogue"
          link={pl ? "Katalog danych" : "Data catalogue"}
        />
        <div className="h-split">
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
          <div className="zt-card h-catstats">
            <p className="h-catstats__big">
              <strong>{cat.kpis.length}</strong> {pl ? "wskaźników w katalogu" : "indicators in the catalogue"}
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
        </div>
      </section>
    </>
  );
}

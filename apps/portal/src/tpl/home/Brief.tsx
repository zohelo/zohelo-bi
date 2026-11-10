// Home layout "brief" (proposal of 2026-11-10, docs/roadmap-2026-11-10.md): the home page as a briefing and a set
// of doors, for a business reader who is not an analyst.
//   1. Polska dziś: the five headline figures with their official yardstick, and how many official criteria are
//      met (the scorecards of "Polska w skrócie"); the first answer to "what is going on".
//   2. Co nowego: unusual moves, latest data, release calendar; the reason to come back.
//   3. Co chcesz zrobić: four doors named by the task, not by the tool, then the topics.
//   4. Dla Ciebie: the reader's own things (first for a returning reader with saved items, last otherwise).

import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { buildCard, planCard } from "../dashboard/build";
import { dashboardFor } from "../dashboard/load";
import { loadCollections } from "../../collections";
import { WhatsNew } from "../pages/Dashboards";
import { ForYouSection } from "../pages/ForYou";
import { loadFavourites } from "../personal";
import { domainIcon, Icon, type IconName } from "../ui/icons";
import { KpiCard } from "../ui/KpiCard";

function Head({ id, title, lead, to, link }: { id: string; title: string; lead?: string; to?: string; link?: string }) {
  return (
    <div className="h-sechead">
      <div>
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {lead ? <p className="small h-muted h-sechead__lead">{lead}</p> : null}
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

/** Headline figures and the official verdicts of "Polska w skrócie". */
function PolandToday({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const dash = dashboardFor("poland");
  const tiles = (dash?.overview.kpis ?? []).map((t) => (typeof t === "string" ? { kpi: t } : t));
  const kpis = tiles.map((t) => cat.kpis.find((k) => k.kpi_key === t.kpi)).filter((k): k is Kpi => !!k);
  const keys = kpis.map((k) => k.kpi_key).join(",");
  const latest = useData(`brief-latest|${keys}`, () => Promise.all(kpis.map((k) => data.latest(k.kpi_key))));
  const sparks = useData(`brief-sparks|${keys}`, () =>
    Promise.all(
      kpis.map((k) =>
        data
          .series(k.kpi_key, { geographies: ["PL"], from: String(Number(k.last_period.slice(0, 4)) - 5) })
          .then((s) => s[0]?.points.map((p) => p.value) ?? []),
      ),
    ),
  );
  // Scorecards of the summary dashboard: how many official criteria are met in each.
  const cards = (dash?.overview.sections ?? []).flatMap((s) =>
    s.cards.filter((c) => c.chart === "scorecard").map((card) => ({ section: s, card })),
  );
  const verdicts = useData(`brief-verdicts|${lang}`, () =>
    Promise.all(
      cards.map(async ({ card }) => {
        const plan = planCard(card, cat, { members: {} });
        if ("problem" in plan) return null;
        const results: Record<string, Series[]> = {};
        await Promise.all(plan.fetches.map(async (f) => void (results[f.id] = await data.series(f.kpi, f.query))));
        const b = buildCard(plan, results, cat, lang);
        return { met: Number(b.facts.met), judged: Number(b.facts.judged) };
      }),
    ),
  );
  if (!dash) return null;
  return (
    <section className="h-block" aria-labelledby="h-today">
      <Head
        id="h-today"
        title={pl ? "Polska dziś" : "Poland today"}
        lead={
          pl
            ? "Pięć liczb i miary, którymi kraj ocenia Unia Europejska. Ocena wynika z oficjalnych progów, nie z naszej opinii."
            : "Five figures and the yardsticks the European Union judges the country by. The verdict comes from official thresholds, not our opinion."
        }
        to="/d/poland"
        link={pl ? dash.title_pl : dash.title_en}
      />
      <div className="k-grid k-grid--5">
        {kpis.map((k, i) => {
          const t = tiles.find((x) => x.kpi === k.kpi_key);
          return (
            <KpiCard
              key={k.kpi_key}
              kpi={k}
              latest={latest.data?.[i]}
              spark={sparks.data?.[i]}
              cat={cat}
              lang={lang}
              context={(pl ? t?.context_pl : t?.context_en) ?? ""}
            />
          );
        })}
      </div>
      {cards.length ? (
        <ul className="b-verdicts" aria-label={pl ? "Oficjalne kryteria: ile spełnionych" : "Official criteria: how many are met"}>
          {cards.map(({ section }, i) => {
            const v = verdicts.data?.[i];
            return (
              <li key={section.id ?? i}>
                <Link to="/d/poland" className="zt-card b-verdict">
                  <span className="b-verdict__name">
                    {pl ? (section.nav_pl ?? section.title_pl) : (section.nav_en ?? section.title_en)}
                  </span>
                  <span className="b-verdict__score">
                    {v ? (
                      <>
                        <strong>
                          {v.met} {pl ? "z" : "of"} {v.judged}
                        </strong>{" "}
                        {pl ? "spełnione" : "met"}
                        <span className="b-verdict__dots" aria-hidden="true">
                          {Array.from({ length: v.judged }, (_, d) => (
                            <span key={d} className={d < v.met ? "b-dot b-dot--met" : "b-dot"} />
                          ))}
                        </span>
                      </>
                    ) : (
                      "…"
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

type Door = { to: string; icon: IconName; pl: string; en: string; leadPl: string; leadEn: string; goPl: string; goEn: string };

const doors = (n: number): Door[] => [
  {
    to: "/catalogue",
    icon: "search",
    pl: "Sprawdzić liczbę",
    en: "Look up a number",
    leadPl: `${n} wskaźników z definicją, źródłem i całą historią.`,
    leadEn: `${n} indicators with their definition, source and full history.`,
    goPl: "Katalog danych",
    goEn: "Data catalogue",
  },
  {
    to: "/explore",
    icon: "explore",
    pl: "Porównać i zbadać",
    en: "Compare and explore",
    leadPl: "Regiony, lata i podziały na jednym wykresie, który składasz sam.",
    leadEn: "Regions, years and breakdowns on one chart you put together.",
    goPl: "Eksplorator danych",
    goEn: "Data explorer",
  },
  {
    to: "/analizy",
    icon: "analysis",
    pl: "Zrozumieć, co się dzieje",
    en: "Understand what is going on",
    leadPl: "Trend, sezon, prognoza i zależności: odpowiedź jednym zdaniem.",
    leadEn: "Trend, season, forecast and links: the answer in one sentence.",
    goPl: "Analizy",
    goEn: "Analyses",
  },
  {
    to: "/kolekcje",
    icon: "saved",
    pl: "Przygotować prezentację",
    en: "Prepare a presentation",
    leadPl: "Zbierz wykresy, dodaj komentarz, pobierz PowerPoint albo skopiuj do Excela.",
    leadEn: "Collect charts, add a comment, download PowerPoint or copy to Excel.",
    goPl: "Kolekcje",
    goEn: "Collections",
  },
];

function Doors({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const topics = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  return (
    <section className="h-block" aria-labelledby="h-doors">
      <Head id="h-doors" title={pl ? "Co chcesz zrobić?" : "What do you want to do?"} />
      <ul className="b-doors">
        {doors(cat.kpis.length).map((d) => (
          <li key={d.to}>
            <Link to={d.to} className="zt-card b-door">
              <span className="fy-card__icon" aria-hidden="true">
                <Icon name={d.icon} size={18} />
              </span>
              <strong className="b-door__title">{pl ? d.pl : d.en}</strong>
              <span className="small b-door__lead">{pl ? d.leadPl : d.leadEn}</span>
              <span className="small b-door__go">
                {pl ? d.goPl : d.goEn}
                <Icon name="chevronRight" size={14} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="b-topics" role="group" aria-label={pl ? "Dashboardy według tematu" : "Dashboards by topic"}>
        <span className="small b-topics__label">{pl ? "Albo przejrzyj temat:" : "Or browse a topic:"}</span>
        {topics.map((t) => (
          <Link key={t.domain_key} to={`/d/${t.domain_key}`} className="zt-chip b-topic">
            <Icon name={domainIcon(t.domain_key)} size={14} />
            {pl ? t.name_pl : t.name_en}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BriefSections({ cat, lang, onInterests }: { cat: Catalog; lang: Lang; onInterests: (keys: string[]) => void }) {
  const pl = lang === "pl";
  // A returning reader with saved things sees them right after the briefing; a first visit ends with the invitation.
  const returning = loadFavourites().length > 0 || loadCollections().length > 0;
  const forYou = (
    <section className="h-block" aria-labelledby="h-foryou">
      <Head
        id="h-foryou"
        title={pl ? "Dla Ciebie" : "For you"}
        lead={pl ? "To, co zapisujesz, oznaczasz i oglądasz." : "What you save, star and view."}
      />
      <ForYouSection cat={cat} lang={lang} onInterests={onInterests} />
    </section>
  );
  return (
    <>
      <PolandToday cat={cat} lang={lang} />
      {returning ? forYou : null}
      <section className="h-block" aria-labelledby="h-new">
        <Head
          id="h-new"
          title={pl ? "Co nowego" : "What's new"}
          lead={
            pl
              ? "Co nietypowego pokazały ostatnie dane i kiedy przyjdą następne."
              : "What the latest data showed that stands out, and when the next arrive."
          }
        />
        <WhatsNew cat={cat} lang={lang} />
      </section>
      <Doors cat={cat} lang={lang} />
      {returning ? null : forYou}
    </>
  );
}

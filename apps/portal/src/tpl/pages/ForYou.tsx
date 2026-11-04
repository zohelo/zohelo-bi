// Dla Ciebie (on the home page): favourites, the reader's own views, frequently visited pages, recommendations
// from chosen topics, views featured by zohelo and popular ones. Kept in this browser until accounts exist.

import { useState, type ReactNode } from "react";
import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { browserStorage, loadViews, removeView, type SavedView } from "../../savedViews";
import { domainIcon, Icon } from "../ui/icons";
import { kpiName } from "../chartData";
import { dashboardFor } from "../dashboard/load";
import { exploreLink } from "../explore/exploreState";
import { domainHeadline } from "./Dashboards";
import { FavButton } from "../ui/FavButton";
import { frequent, type Personal } from "../personal";
import { usePersonal } from "../usePersonal";

const INTERESTS_KEY = "zohelo-bi.interests.v1";

export function loadInterests(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(INTERESTS_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveInterests(keys: string[]) {
  try {
    window.localStorage.setItem(INTERESTS_KEY, JSON.stringify(keys));
  } catch {
    /* storage blocked: the choice lasts for this page view */
  }
}

/** Views featured by zohelo: one per main question people bring to public statistics. */
const FEATURED: { kpis: string[]; areas?: string[]; pl: string; en: string; textPl: string; textEn: string }[] = [
  {
    kpis: ["cpi_annual_rate"],
    pl: "Inflacja wobec celu NBP",
    en: "Inflation against the NBP target",
    textPl: "Gdzie jest inflacja CPI względem pasma 1,5–3,5%.",
    textEn: "Where CPI inflation stands against the 1.5–3.5% band.",
  },
  {
    kpis: ["gdp_real_growth"],
    areas: ["PL", "EU27", "DE", "CZ"],
    pl: "Wzrost PKB na tle UE",
    en: "GDP growth against the EU",
    textPl: "Polska, UE-27, Niemcy i Czechy: realny wzrost r/r.",
    textEn: "Poland, EU-27, Germany and Czechia: real growth y/y.",
  },
  {
    kpis: ["gg_debt_gdp"],
    areas: ["PL", "EU27", "DE", "FR"],
    pl: "Dług publiczny na tle UE",
    en: "Public debt against the EU",
    textPl: "Dług sektora instytucji rządowych i samorządowych w % PKB.",
    textEn: "General government debt as % of GDP.",
  },
  {
    kpis: ["unemployment_lfs"],
    pl: "Bezrobocie w czasie",
    en: "Unemployment over time",
    textPl: "Stopa bezrobocia według BAEL.",
    textEn: "Unemployment rate from the Labour Force Survey.",
  },
];

type Rec = { key: string; title: string; text: string; to: string; icon: string };

/** Recommendations from the reader's topics: each topic's headline indicators and its first pages. */
export function recommendations(cat: Catalog, lang: Lang, interests: string[], n = 6): Rec[] {
  const pl = lang === "pl";
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const out: Rec[] = [];
  for (const d of interests) {
    const dom = cat.domains.find((x) => x.domain_key === d);
    if (!dom) continue;
    domainHeadline(cat, d, 2).forEach((k: Kpi) =>
      out.push({
        key: `${d}-${k.kpi_key}`,
        title: kpiName(k, lang),
        text: `${name(dom)} · ${pl ? "w eksploratorze" : "in the explorer"}`,
        to: exploreLink(k, cat),
        icon: d,
      }),
    );
    const page = dashboardFor(d)?.pages[0];
    if (page)
      out.push({
        key: `${d}-${page.id}`,
        title: pl ? page.title_pl : page.title_en,
        text: `${name(dom)} · ${pl ? "dashboard" : "dashboard"}`,
        to: `/d/${d}/${page.id}`,
        icon: d,
      });
  }
  // Round-robin across topics so every chosen topic shows up early.
  const by = new Map<string, Rec[]>();
  out.forEach((r) => by.set(r.icon, [...(by.get(r.icon) ?? []), r]));
  const lists = [...by.values()];
  const mixed: Rec[] = [];
  for (let i = 0; mixed.length < out.length; i++) lists.forEach((l) => l[i] && mixed.push(l[i]!));
  return mixed.slice(0, n);
}

export function FeaturedCards({ cat, lang, n = 4 }: { cat: Catalog; lang: Lang; n?: number }) {
  const pl = lang === "pl";
  return (
    <div className="fy-grid">
      {FEATURED.slice(0, n).map((f) => {
        const k = cat.kpis.find((x) => x.kpi_key === f.kpis[0]);
        if (!k) return null;
        const areas = f.areas?.filter((g) => k.geographies.includes(g));
        return (
          <PCard
            key={f.en}
            kind={pl ? "Widok" : "View"}
            title={pl ? f.pl : f.en}
            text={pl ? f.textPl : f.textEn}
            to={exploreLink(k, cat, areas ? { areas } : {})}
            fav={{ id: `feat:${f.en}`, label: pl ? f.pl : f.en, to: exploreLink(k, cat, areas ? { areas } : {}), kind: "view" }}
            lang={lang}
          />
        );
      })}
    </div>
  );
}

export function SavedViews({ lang, max, editable }: { lang: Lang; max?: number; editable?: boolean }) {
  const pl = lang === "pl";
  const [views, setViews] = useState<SavedView[]>(() => loadViews(browserStorage()));
  const shown = max ? views.slice(0, max) : views;
  if (!views.length)
    return (
      <p className="small fy-empty">
        {pl
          ? "Nie masz jeszcze zapisanych widoków. W eksploratorze użyj „Zapisz w Dla Ciebie”."
          : "No saved views yet. In the explorer, use “Save to For you”."}{" "}
        <Link to="/explore">{pl ? "Otwórz eksplorator" : "Open the explorer"}</Link>
      </p>
    );
  return (
    <ul className="fy-saved">
      {shown.map((v) => (
        <li key={v.id} className="zt-card fy-saved__item">
          <Icon name="saved" size={16} />
          <Link to={v.url} className="fy-saved__name">
            {v.name}
          </Link>
          {editable ? (
            <button type="button" className="zt-btn" onClick={() => setViews(removeView(browserStorage(), v.id))}>
              {pl ? "Usuń" : "Remove"}
              <span className="zt-sr">: {v.name}</span>
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Interests form: which topics the reader follows; recommendations use it. */
export function InterestsForm({ cat, lang, onChange }: { cat: Catalog; lang: Lang; onChange: (keys: string[]) => void }) {
  const pl = lang === "pl";
  const [sel, setSel] = useState<string[]>(loadInterests);
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const toggle = (k: string) => {
    const next = sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k];
    setSel(next);
    saveInterests(next);
    onChange(next);
  };
  return (
    <fieldset className="fy-interests">
      <legend className="h-subtitle">{pl ? "Co Cię interesuje?" : "What are you interested in?"}</legend>
      <div className="fy-interests__list">
        {domains.map((d) => (
          <label key={d.domain_key} className="zt-chip fy-interest">
            <input type="checkbox" checked={sel.includes(d.domain_key)} onChange={() => toggle(d.domain_key)} />
            <Icon name={domainIcon(d.domain_key)} size={14} />
            {pl ? d.name_pl : d.name_en}
          </label>
        ))}
      </div>
      <p className="caption fy-muted">
        {pl
          ? "Wybór zostaje w tej przeglądarce; z kontem będzie zapisany na stałe."
          : "Your choice stays in this browser; with an account it will be kept for good."}
      </p>
    </fieldset>
  );
}

export function Recommended({ cat, lang, interests, n = 6 }: { cat: Catalog; lang: Lang; interests: string[]; n?: number }) {
  const pl = lang === "pl";
  const recs = recommendations(cat, lang, interests, n);
  if (!recs.length)
    return (
      <p className="small fy-empty">
        {pl ? "Wybierz tematy, a podpowiemy, od czego zacząć." : "Pick topics and we will suggest where to start."}
      </p>
    );
  return (
    <div className="fy-grid">
      {recs.map((r) => (
        <PCard
          key={r.key}
          kind={r.to.startsWith("/d/") ? "Dashboard" : pl ? "Widok" : "View"}
          title={r.title}
          text={r.text}
          to={r.to}
          fav={{ id: `rec:${r.to}`, label: r.title, to: r.to, kind: r.to.startsWith("/d/") ? "dashboard" : "view" }}
          lang={lang}
        />
      ))}
    </div>
  );
}

/** One personal card: kind label, title (link), a line of context and a star. */
export function PCard({
  kind,
  title,
  text,
  to,
  fav,
  lang,
}: {
  kind: string;
  title: string;
  text: string;
  to: string;
  fav: Personal;
  lang: Lang;
}) {
  return (
    <div className="zt-card fy-card">
      <div className="fy-card__top">
        <span className="fy-card__kind">{kind}</span>
        <FavButton item={fav} lang={lang} />
      </div>
      <Link to={to} className="fy-card__title">
        {title}
      </Link>
      <span className="fy-card__text">{text}</span>
    </div>
  );
}

/** Pages people open most (sample list until real usage is measured). */
const POPULAR: { to: string; pl: string; en: string; kind: Personal["kind"] }[] = [
  { to: "/kpi/cpi_annual_rate", pl: "Inflacja CPI (GUS), r/r", en: "CPI inflation (GUS), y/y", kind: "kpi" },
  { to: "/d/labour/wages", pl: "Wynagrodzenia i koszty pracy", en: "Wages & labour costs", kind: "dashboard" },
  { to: "/kpi/eurpln", pl: "Kurs EUR/PLN (NBP)", en: "EUR/PLN rate (NBP)", kind: "kpi" },
  { to: "/d/economy/national_accounts", pl: "Rachunki narodowe i PKB", en: "National accounts & GDP", kind: "dashboard" },
];

function Row({ id, title, children, more }: { id: string; title: string; children: ReactNode; more?: ReactNode }) {
  return (
    <div className="fy-row" role="group" aria-labelledby={id}>
      <div className="fy-row__head">
        <h3 id={id} className="h-subtitle">
          {title}
        </h3>
        {more}
      </div>
      {children}
    </div>
  );
}

/** The full Dla Ciebie section of the home page. */
export function ForYouSection({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const { favourites } = usePersonal();
  const [interests, setInterests] = useState<string[]>(loadInterests);
  const [editTopics, setEditTopics] = useState(false);
  const visits = frequent(4);
  const kindLabel = (k: Personal["kind"]) =>
    k === "kpi" ? (pl ? "Wskaźnik" : "Indicator") : k === "dashboard" ? (pl ? "Dashboard" : "Dashboard") : pl ? "Widok" : "View";
  return (
    <div className="fy-section">
      <Row id="fy-fav" title={pl ? "Ulubione" : "Favourites"}>
        {favourites.length ? (
          <div className="fy-grid">
            {favourites.slice(0, 8).map((f) => (
              <PCard key={f.id} kind={kindLabel(f.kind)} title={f.label} text="" to={f.to} fav={f} lang={lang} />
            ))}
          </div>
        ) : (
          <p className="small fy-empty">
            {pl
              ? "Oznacz gwiazdką wskaźnik, dashboard albo swój widok, a pojawi się tutaj."
              : "Star an indicator, a dashboard or one of your views and it shows up here."}
          </p>
        )}
      </Row>
      <Row id="fy-views" title={pl ? "Twoje widoki" : "Your views"}>
        <SavedViews lang={lang} max={4} />
      </Row>
      {visits.length ? (
        <Row id="fy-freq" title={pl ? "Często oglądane" : "Frequently viewed"}>
          <div className="fy-grid">
            {visits.map((v) => (
              <PCard
                key={v.id}
                kind={kindLabel(v.kind)}
                title={v.label}
                text={pl ? `${v.count}× w tej przeglądarce` : `${v.count}× in this browser`}
                to={v.to}
                fav={{ id: v.id, label: v.label, to: v.to, kind: v.kind }}
                lang={lang}
              />
            ))}
          </div>
        </Row>
      ) : null}
      <Row
        id="fy-rec"
        title={pl ? "Rekomendowane dla Ciebie" : "Recommended for you"}
        more={
          interests.length ? (
            <button type="button" className="zt-btn" aria-expanded={editTopics} onClick={() => setEditTopics(!editTopics)}>
              {pl ? `Twoje tematy (${interests.length})` : `Your topics (${interests.length})`}
            </button>
          ) : null
        }
      >
        {!interests.length || editTopics ? <InterestsForm cat={cat} lang={lang} onChange={setInterests} /> : null}
        <Recommended cat={cat} lang={lang} interests={interests} n={4} />
      </Row>
      <Row id="fy-feat" title={pl ? "Polecane przez zohelo" : "Featured by zohelo"}>
        <FeaturedCards cat={cat} lang={lang} />
      </Row>
      <Row id="fy-pop" title={pl ? "Popularne" : "Popular"}>
        <div className="fy-grid">
          {POPULAR.map((p) => (
            <PCard
              key={p.to}
              kind={kindLabel(p.kind)}
              title={pl ? p.pl : p.en}
              text={pl ? "Często otwierane przez czytelników (dane przykładowe)" : "Often opened by readers (sample)"}
              to={p.to}
              fav={{
                id: p.kind === "kpi" ? `kpi:${p.to.split("/").pop()}` : `page:${p.to}`,
                label: pl ? p.pl : p.en,
                to: p.to,
                kind: p.kind,
              }}
              lang={lang}
            />
          ))}
        </div>
      </Row>
    </div>
  );
}

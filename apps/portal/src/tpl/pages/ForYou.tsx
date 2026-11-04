// Dla Ciebie (/dla-ciebie): views saved in the explorer, views featured by zohelo, and recommendations from the
// topics the reader picked (a short interests form, kept in this browser). The home page shows the same three
// parts in a compact form.

import { useState } from "react";
import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { browserStorage, loadViews, removeView, type SavedView } from "../../savedViews";
import { useMeta, usePage } from "../context";
import { PageHeader } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { kpiName } from "../chartData";
import { dashboardFor } from "../dashboard/load";
import { exploreLink } from "../explore/exploreState";
import { domainHeadline } from "./Dashboards";

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
          <Link key={f.en} to={exploreLink(k, cat, areas ? { areas } : {})} className="zt-card fy-card">
            <span className="fy-card__kind">{pl ? "Polecane przez zohelo" : "Featured by zohelo"}</span>
            <span className="fy-card__title">{pl ? f.pl : f.en}</span>
            <span className="fy-card__text">{pl ? f.textPl : f.textEn}</span>
          </Link>
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
        <Link key={r.key} to={r.to} className="zt-card fy-card">
          <span className="fy-card__kind">
            <Icon name={domainIcon(r.icon)} size={14} /> {pl ? "Dla Ciebie" : "For you"}
          </span>
          <span className="fy-card__title">{r.title}</span>
          <span className="fy-card__text">{r.text}</span>
        </Link>
      ))}
    </div>
  );
}

export function ForYouPage() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Dla Ciebie" : "For you";
  useMeta(title, [{ label: title }], [lang]);
  const [interests, setInterests] = useState<string[]>(loadInterests);
  if (!catalog)
    return (
      <div className="zt-state" aria-busy="true">
        {pl ? "Wczytywanie" : "Loading"}
      </div>
    );
  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Twoje zapisane widoki, widoki polecane przez zohelo i podpowiedzi według tematów, które wybierzesz."
            : "Your saved views, views featured by zohelo and suggestions from the topics you choose."
        }
      />
      <section className="t-section" aria-labelledby="fy-saved-h">
        <h2 id="fy-saved-h" className="section-title">
          {pl ? "Zapisane widoki" : "Saved views"}
        </h2>
        <SavedViews lang={lang} editable />
      </section>
      <section className="t-section" aria-labelledby="fy-rec-h">
        <h2 id="fy-rec-h" className="section-title">
          {pl ? "Polecane dla Ciebie" : "Recommended for you"}
        </h2>
        <InterestsForm cat={catalog} lang={lang} onChange={setInterests} />
        <Recommended cat={catalog} lang={lang} interests={interests} n={9} />
      </section>
      <section className="t-section" aria-labelledby="fy-feat-h">
        <h2 id="fy-feat-h" className="section-title">
          {pl ? "Polecane przez zohelo" : "Featured by zohelo"}
        </h2>
        <FeaturedCards cat={catalog} lang={lang} />
      </section>
    </>
  );
}

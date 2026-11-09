// Dla Ciebie (on the home page; Power BI home, Netflix rows): favourites, the reader's own views, frequently
// visited pages, recommendations from chosen topics, views featured by zohelo and popular ones. Kept in this
// browser until accounts exist.
// Each row shows one line of cards on desktop and "Zobacz wszystkie (n)" when there are more; on phones the row
// scrolls sideways. A first visit (nothing starred, saved, viewed or chosen) gets one onboarding card instead of
// empty rows; later, an empty row says in one line what fills it.

import { useId, useState, type ReactNode } from "react";
import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { loadCollections } from "../../collections";
import { browserStorage, loadViews, removeView, type SavedView } from "../../savedViews";
import { domainIcon, Icon, type IconName } from "../ui/icons";
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
const FEATURED: { kpis: string[]; areas?: string[]; icon: string; pl: string; en: string; textPl: string; textEn: string }[] = [
  {
    kpis: ["cpi_annual_rate"],
    icon: "economy",
    pl: "Inflacja wobec celu NBP",
    en: "Inflation against the NBP target",
    textPl: "Gdzie jest inflacja CPI względem pasma 1,5–3,5%.",
    textEn: "Where CPI inflation stands against the 1.5–3.5% band.",
  },
  {
    kpis: ["gdp_real_growth"],
    areas: ["PL", "EU27", "DE", "CZ"],
    icon: "economy",
    pl: "Wzrost PKB na tle UE",
    en: "GDP growth against the EU",
    textPl: "Polska, UE-27, Niemcy i Czechy: realny wzrost r/r.",
    textEn: "Poland, EU-27, Germany and Czechia: real growth y/y.",
  },
  {
    kpis: ["gg_debt_gdp"],
    areas: ["PL", "EU27", "DE", "FR"],
    icon: "finance",
    pl: "Dług publiczny na tle UE",
    en: "Public debt against the EU",
    textPl: "Dług sektora instytucji rządowych i samorządowych w % PKB.",
    textEn: "General government debt as % of GDP.",
  },
  {
    kpis: ["unemployment_lfs"],
    icon: "labour",
    pl: "Bezrobocie w czasie",
    en: "Unemployment over time",
    textPl: "Stopa bezrobocia według BAEL.",
    textEn: "Unemployment rate from the Labour Force Survey.",
  },
  {
    kpis: ["avg_wage"],
    areas: ["PL14", "PL24", "PL12", "PL30", "PL02"],
    icon: "labour",
    pl: "Płace w największych województwach",
    en: "Wages in the largest voivodeships",
    textPl: "Przeciętne wynagrodzenie brutto, pięć województw.",
    textEn: "Average gross wage, five voivodeships.",
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
        text: `${name(dom)} · dashboard`,
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

/** Interests form: which topics the reader follows; recommendations and key figures use it. */
export function InterestsForm({
  cat,
  lang,
  onChange,
  legend,
}: {
  cat: Catalog;
  lang: Lang;
  onChange: (keys: string[]) => void;
  legend?: string;
}) {
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
      <legend className="h-subtitle">{legend ?? (pl ? "Co Cię interesuje?" : "What are you interested in?")}</legend>
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

/** One personal card: icon, kind label, title (link), a line of context, a star and an optional remove. */
export function PCard({
  kind,
  title,
  text,
  to,
  fav,
  lang,
  icon,
  onRemove,
}: {
  kind: string;
  title: string;
  text: string;
  to: string;
  fav?: Personal;
  lang: Lang;
  icon?: IconName;
  onRemove?: () => void;
}) {
  const pl = lang === "pl";
  return (
    <div className="zt-card fy-card">
      <div className="fy-card__top">
        <span className="fy-card__icon" aria-hidden="true">
          <Icon name={icon ?? "explore"} size={16} />
        </span>
        <span className="fy-card__kind">{kind}</span>
        {fav ? <FavButton item={fav} lang={lang} /> : null}
        {onRemove ? (
          <button type="button" className="zt-btn zt-btn--icon fy-card__remove" onClick={onRemove}>
            <Icon name="close" size={14} />
            <span className="zt-sr">
              {pl ? "Usuń widok" : "Remove view"}: {title}
            </span>
          </button>
        ) : null}
      </div>
      <Link to={to} className="fy-card__title">
        {title}
      </Link>
      {text ? <span className="fy-card__text">{text}</span> : null}
    </div>
  );
}

/** A row of cards: one line on desktop with "Zobacz wszystkie (n)", sideways scrolling on phones. */
function Row({ title, items, hint, more, lang }: { title: string; items: ReactNode[]; hint?: ReactNode; more?: ReactNode; lang: Lang }) {
  const pl = lang === "pl";
  const id = useId();
  const [all, setAll] = useState(false);
  return (
    <div className={`fy-row${all ? " is-all" : ""}`} role="group" aria-labelledby={id} data-count={items.length}>
      <div className="fy-row__head">
        <h3 id={id} className="h-subtitle">
          {title}
          {items.length ? <span className="fy-row__count"> ({items.length})</span> : null}
        </h3>
        {more}
        {items.length > 2 ? (
          <button type="button" className="zt-btn zt-btn--ghost fy-row__all" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? (pl ? "Pokaż mniej" : "Show less") : pl ? `Zobacz wszystkie (${items.length})` : `See all (${items.length})`}
          </button>
        ) : null}
      </div>
      {items.length ? <div className="fy-strip">{items}</div> : <div className="small fy-empty">{hint}</div>}
    </div>
  );
}

type MineItem = { key: string; label: string; to: string; meta: string; icon: IconName; end: ReactNode };

/** One column of the reader's own things: a short list, "Zobacz wszystkie (n)", or a hint that teaches. */
function MineList({ title, items, hint, lang }: { title: string; items: MineItem[]; hint: ReactNode; lang: Lang }) {
  const pl = lang === "pl";
  const id = useId();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 4);
  return (
    <div className="fy-mine__col" role="group" aria-labelledby={id}>
      <h3 id={id} className="h-subtitle fy-mine__title">
        {title}
        {items.length ? <span className="fy-row__count"> ({items.length})</span> : null}
      </h3>
      {items.length ? (
        <ul className="fy-mine__list">
          {shown.map((it) => (
            <li key={it.key}>
              <span className="fy-card__icon" aria-hidden="true">
                <Icon name={it.icon} size={14} />
              </span>
              <span className="fy-mine__text">
                <Link to={it.to} className="fy-mine__name">
                  {it.label}
                </Link>
                <span className="caption fy-mine__meta">{it.meta}</span>
              </span>
              {it.end}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small fy-mine__hint">{hint}</p>
      )}
      {items.length > 4 ? (
        <button type="button" className="zt-btn zt-btn--ghost fy-row__all" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? (pl ? "Pokaż mniej" : "Show less") : pl ? `Zobacz wszystkie (${items.length})` : `See all (${items.length})`}
        </button>
      ) : null}
    </div>
  );
}

/** Pages people open most (sample list until real usage is measured). */
const POPULAR: { to: string; pl: string; en: string; kind: Personal["kind"]; icon: string }[] = [
  { to: "/kpi/cpi_annual_rate", pl: "Inflacja CPI (GUS), r/r", en: "CPI inflation (GUS), y/y", kind: "kpi", icon: "economy" },
  { to: "/d/labour/wages", pl: "Wynagrodzenia i koszty pracy", en: "Wages & labour costs", kind: "dashboard", icon: "labour" },
  { to: "/kpi/eurpln", pl: "Kurs EUR/PLN (NBP)", en: "EUR/PLN rate (NBP)", kind: "kpi", icon: "finance" },
  { to: "/d/economy/national_accounts", pl: "Rachunki narodowe i PKB", en: "National accounts & GDP", kind: "dashboard", icon: "economy" },
  { to: "/d/finance/public_finance", pl: "Finanse publiczne i dług", en: "Public finance & debt", kind: "dashboard", icon: "finance" },
];

const iconOf = (to: string): IconName => {
  const d = /^\/d\/([a-z_]+)/.exec(to)?.[1];
  return d ? domainIcon(d) : to.startsWith("/kpi/") ? "economy" : "explore";
};

/** The full Dla Ciebie section of the home page. */
export function ForYouSection({ cat, lang, onInterests }: { cat: Catalog; lang: Lang; onInterests?: (keys: string[]) => void }) {
  const pl = lang === "pl";
  const { favourites } = usePersonal();
  const [interests, setInterestsState] = useState<string[]>(loadInterests);
  const [views, setViews] = useState<SavedView[]>(() => loadViews(browserStorage()));
  const [collections] = useState(() => loadCollections(browserStorage()));
  const [editTopics, setEditTopics] = useState(false);
  const setInterests = (k: string[]) => {
    setInterestsState(k);
    onInterests?.(k);
  };
  const visits = frequent(12);
  const kindLabel = (k: Personal["kind"]) =>
    k === "kpi" ? (pl ? "Wskaźnik" : "Indicator") : k === "dashboard" ? "Dashboard" : pl ? "Widok" : "View";
  const first = !favourites.length && !views.length && !visits.length && !interests.length;

  const featured = FEATURED.map((f) => {
    const k = cat.kpis.find((x) => x.kpi_key === f.kpis[0]);
    if (!k) return null;
    const areas = f.areas?.filter((g) => k.geographies.includes(g));
    const to = exploreLink(k, cat, areas?.length ? { areas, level: areas.some((a) => a.length === 4) ? "voivodeship" : undefined } : {});
    return (
      <PCard
        key={f.en}
        kind={pl ? "Widok" : "View"}
        icon={domainIcon(f.icon)}
        title={pl ? f.pl : f.en}
        text={pl ? f.textPl : f.textEn}
        to={to}
        fav={{ id: `feat:${f.en}`, label: pl ? f.pl : f.en, to, kind: "view" }}
        lang={lang}
      />
    );
  }).filter(Boolean);
  const popular = POPULAR.map((p) => (
    <PCard
      key={p.to}
      kind={kindLabel(p.kind)}
      icon={domainIcon(p.icon)}
      title={pl ? p.pl : p.en}
      text={pl ? "Często otwierane (dane przykładowe)" : "Often opened (sample)"}
      to={p.to}
      fav={{
        id: p.kind === "kpi" ? `kpi:${p.to.split("/").pop()}` : `page:${p.to}`,
        label: pl ? p.pl : p.en,
        to: p.to,
        kind: p.kind,
      }}
      lang={lang}
    />
  ));
  const recs = recommendations(cat, lang, interests, 8).map((r) => (
    <PCard
      key={r.key}
      kind={r.to.startsWith("/d/") ? "Dashboard" : pl ? "Widok" : "View"}
      icon={domainIcon(r.icon)}
      title={r.title}
      text={r.text}
      to={r.to}
      fav={{ id: `rec:${r.to}`, label: r.title, to: r.to, kind: r.to.startsWith("/d/") ? "dashboard" : "view" }}
      lang={lang}
    />
  ));

  if (first)
    return (
      <div className="fy-section">
        <div className="zt-card fy-onboard">
          <div className="fy-onboard__text">
            <p className="label-caps fy-onboard__eyebrow">{pl ? "Pierwszy raz tutaj?" : "First time here?"}</p>
            <h3 className="card-title fy-onboard__title">
              {pl ? "Wybierz swoje tematy, a ułożymy tę stronę pod Ciebie" : "Pick your topics and we will shape this page for you"}
            </h3>
            <ul className="fy-onboard__tips small">
              <li>
                <Icon name="star" size={14} />{" "}
                {pl ? "Gwiazdka zapisuje wskaźnik lub dashboard w Ulubionych." : "A star keeps an indicator or a dashboard in Favourites."}
              </li>
              <li>
                <Icon name="saved" size={14} />{" "}
                {pl
                  ? "„Zapisz w Dla Ciebie” w eksploratorze zachowuje cały widok."
                  : "“Save to For you” in the explorer keeps a whole view."}
              </li>
              <li>
                <Icon name="search" size={14} />{" "}
                {pl ? "Pytanie własnymi słowami buduje widok od razu." : "A question in your own words builds a view right away."}
              </li>
            </ul>
          </div>
          <InterestsForm cat={cat} lang={lang} onChange={setInterests} legend={pl ? "Twoje tematy" : "Your topics"} />
        </div>
        <Row lang={lang} title={pl ? "Polecane przez zohelo" : "Featured by zohelo"} items={featured} />
        <Row lang={lang} title={pl ? "Popularne" : "Popular"} items={popular} />
      </div>
    );

  return (
    <div className="fy-section">
      <div className="fy-mine">
        <MineList
          lang={lang}
          title={pl ? "Ulubione" : "Favourites"}
          items={favourites.map((f) => ({
            key: f.id,
            label: f.label,
            to: f.to,
            meta: kindLabel(f.kind),
            icon: iconOf(f.to),
            end: <FavButton item={f} lang={lang} />,
          }))}
          hint={
            pl
              ? "Oznacz gwiazdką wskaźnik, dashboard albo widok, a pojawi się tutaj."
              : "Star an indicator, a dashboard or a view and it shows up here."
          }
        />
        <MineList
          lang={lang}
          title={pl ? "Twoje widoki" : "Your views"}
          items={views.map((v) => ({
            key: v.id,
            label: v.name,
            to: v.url,
            meta: new Date(v.saved_at).toLocaleDateString(pl ? "pl-PL" : "en-GB"),
            icon: "saved" as IconName,
            end: (
              <button
                type="button"
                className="zt-btn zt-btn--icon fy-card__remove"
                onClick={() => setViews(removeView(browserStorage(), v.id))}
              >
                <Icon name="close" size={14} />
                <span className="zt-sr">
                  {pl ? "Usuń widok" : "Remove view"}: {v.name}
                </span>
              </button>
            ),
          }))}
          hint={
            <>
              {pl
                ? "W eksploratorze wybierz „Zapisz”, potem „Zapisz w Dla Ciebie”. "
                : "In the explorer, choose “Save”, then “Save to For you”. "}
              <Link to="/explore">{pl ? "Otwórz eksplorator" : "Open the explorer"}</Link>
            </>
          }
        />
        <MineList
          lang={lang}
          title={pl ? "Twoje kolekcje" : "Your collections"}
          items={collections.map((c) => ({
            key: c.id,
            label: c.name,
            to: `/kolekcje/${c.id}`,
            meta: pl
              ? `${c.items.length} w kolekcji · tablica, slajdy, PowerPoint`
              : `${c.items.length} in the collection · board, slides, PowerPoint`,
            icon: "dashboards" as IconName,
            end: null,
          }))}
          hint={
            <>
              {pl
                ? "Zbierz wykresy w kolekcję, dodaj tytuły i komentarze, pobierz jako PowerPoint. W eksploratorze wybierz „Zapisz”, potem „Dodaj do kolekcji”. "
                : "Gather charts into a collection, add titles and comments, download as PowerPoint. In the explorer, choose “Save”, then “Add to collection”. "}
              <Link to="/kolekcje">{pl ? "Otwórz kolekcje" : "Open collections"}</Link>
            </>
          }
        />
        <MineList
          lang={lang}
          title={pl ? "Często oglądane" : "Frequently viewed"}
          items={visits.map((v) => ({
            key: v.id,
            label: v.label,
            to: v.to,
            meta: `${kindLabel(v.kind)} · ${v.count}×`,
            icon: iconOf(v.to),
            end: <FavButton item={{ id: v.id, label: v.label, to: v.to, kind: v.kind }} lang={lang} />,
          }))}
          hint={
            pl
              ? "Wskaźniki i dashboardy, które otwierasz najczęściej, pojawią się tutaj."
              : "The indicators and dashboards you open most will show up here."
          }
        />
      </div>
      <Row
        lang={lang}
        title={pl ? "Rekomendowane dla Ciebie" : "Recommended for you"}
        items={editTopics ? [] : recs}
        hint={<InterestsForm cat={cat} lang={lang} onChange={setInterests} />}
        more={
          interests.length ? (
            <button type="button" className="zt-btn" aria-expanded={editTopics} onClick={() => setEditTopics(!editTopics)}>
              {editTopics ? (pl ? "Gotowe" : "Done") : pl ? `Twoje tematy (${interests.length})` : `Your topics (${interests.length})`}
            </button>
          ) : null
        }
      />
      <Row lang={lang} title={pl ? "Polecane przez zohelo" : "Featured by zohelo"} items={featured} />
      <Row lang={lang} title={pl ? "Popularne" : "Popular"} items={popular} />
    </div>
  );
}

// Dashboardy (landing page of the dashboards, /d). Owner's direction of 2026-11-09 (docs/product-principles.md):
// the landing is for orientation and change, not a second wall of KPIs; the summary of the whole country is a
// dashboard of its own (Polska w skrócie, /d/poland).
//   1. Co nowego: unusual moves of the headline indicators against their own history, the latest data by
//      frequency, the coming publication dates (dashboard/whatsNew.ts; programmatic, no AI).
//   2. Tematy: Polska w skrócie first, then one row per topic (the board the owner chose over cards).
// Sticky page head and scroll spacing as on topic dashboards.

import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { StickyPageHead } from "../ui/SectionNav";
import { Sparkline } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { basisFor, fmtChange, fmtPeriod, fmtValue, freqLabel } from "../format";
import { kpiName } from "../chartData";
import { dashboardFor } from "../dashboard/load";
import { count } from "../dashboard/count";
import { latestReleases, periodEnd, releaseCalendar, topMoves, unusualMove, type Move } from "../dashboard/whatsNew";
import { fmtDate } from "../explore/indicatorInfo";
import { judge } from "../polarity";
import { hotFirst, hotKpiKeys } from "../topics/topics";
import "../home/home.css";

/** Headline KPIs of a domain: the first `n` tiles of its overview (fallback: its first indicators). */
export function domainHeadline(cat: Catalog, domain: string, n = 3): Kpi[] {
  const tiles = dashboardFor(domain)?.overview.kpis ?? [];
  const keys = tiles.map((t) => (typeof t === "string" ? t : t.kpi));
  const found = keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const fill = cat.kpis.filter((k) => k.domain_key === domain && !found.includes(k));
  return [...found, ...fill].slice(0, n);
}

export function latestPeriodOf(cat: Catalog, domain: string): string {
  return cat.kpis
    .filter((k) => k.domain_key === domain)
    .map((k) => k.last_period)
    .sort((a, b) => periodEnd(b).localeCompare(periodEnd(a)))[0]!;
}

const topicDomains = (cat: Catalog) => cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);

type Fig = { kpi: Kpi; latest?: Latest };
type Topic = { key: string; name: string; pages: number; count: number; updated: string; figs: Fig[]; spark?: (number | null)[] };

/** Data of every topic: three headline figures, a sparkline of the first, counts and the latest period. */
function useTopics(cat: Catalog, lang: Lang): Topic[] {
  const pl = lang === "pl";
  const domains = topicDomains(cat);
  const heads = domains.map((d) => domainHeadline(cat, d.domain_key, 3));
  const flat = heads.flat();
  const latest = useData("dash-topics|3", () => Promise.all(flat.map((k) => data.latest(k.kpi_key))));
  const sparks = useData("dash-sparks", () =>
    Promise.all(
      heads.map((h) =>
        h[0]
          ? data
              .series(h[0].kpi_key, { geographies: ["PL"], from: String(Number(h[0].last_period.slice(0, 4)) - 5) })
              .then((s) => s[0]?.points.map((p) => p.value) ?? [])
          : Promise.resolve([]),
      ),
    ),
  );
  const byKey = new Map<string, Latest>();
  latest.data?.forEach((l, i) => byKey.set(flat[i]!.kpi_key, l));
  return domains.map((d, i) => ({
    key: d.domain_key,
    name: pl ? d.name_pl : d.name_en,
    pages: cat.domains.filter((g) => g.parent_key === d.domain_key && g.level === "group").length,
    count: cat.kpis.filter((x) => x.domain_key === d.domain_key).length,
    updated: latestPeriodOf(cat, d.domain_key),
    figs: heads[i]!.map((k) => ({ kpi: k, latest: byKey.get(k.kpi_key) })),
    spark: sparks.data?.[i],
  }));
}

function ChangePill({ f, cat, lang }: { f: Fig; cat: Catalog; lang: Lang }) {
  const l = f.latest;
  if (!l) return null;
  const ch = fmtChange(l.value, l.previous_value, f.kpi.unit_key, basisFor(f.kpi.frequency), cat, lang);
  const verdict = judge(f.kpi.kpi_key, ch.delta);
  const pl = lang === "pl";
  const word = verdict === "good" ? (pl ? "korzystnie" : "favourable") : verdict === "bad" ? (pl ? "niekorzystnie" : "unfavourable") : "";
  return (
    <span className={`k-chg k-chg--${verdict}`}>
      <span aria-hidden="true">{ch.shown}</span>
      <span className="zt-sr">
        , {ch.spoken}
        {word ? `, ${word}` : ""}
      </span>
    </span>
  );
}

function pagesWord(n: number, lang: Lang): string {
  if (lang !== "pl") return n === 1 ? "page" : "pages";
  return n === 1 ? "strona" : n >= 2 && n <= 4 ? "strony" : "stron";
}

// ---------- Co nowego

/** Headline indicators of every dashboard (their KPI rows), without repeats. */
function headlineKpis(cat: Catalog): Kpi[] {
  const keys = ["poland", ...topicDomains(cat).map((d) => d.domain_key)].flatMap((d) =>
    (dashboardFor(d)?.overview.kpis ?? []).map((t) => (typeof t === "string" ? t : t.kpi)),
  );
  return [...new Set(keys)].map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
}

/** "Największy wzrost od marca 2022" / "the biggest fall in the window (since 2016)". */
function movePhrase(m: Move, lang: Lang): string {
  const pl = lang === "pl";
  const up = m.change > 0;
  if (m.since)
    return pl
      ? `Największy ${up ? "wzrost" : "spadek"} od ${fmtPeriod(m.since, lang)}`
      : `Biggest ${up ? "rise" : "fall"} since ${fmtPeriod(m.since, lang)}`;
  return pl
    ? `Największy ${up ? "wzrost" : "spadek"} w danych od ${fmtPeriod(m.from, lang)}`
    : `Biggest ${up ? "rise" : "fall"} in the data since ${fmtPeriod(m.from, lang)}`;
}

export function WhatsNew({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const heads = headlineKpis(cat);
  const all = cat.kpis;
  const latest = useData("dash-new-latest", () => Promise.all(all.map((k) => data.latest(k.kpi_key))));
  // KPIs of this week's hot topics lead the examples (owner decision O32); no topics published = no change.
  const topics = useData("topics", () => data.topics().catch(() => null));
  const hot = hotKpiKeys(topics.data, "week");
  const series = useData("dash-new-series", () =>
    Promise.all(
      heads.map((k) =>
        data
          .series(k.kpi_key, { geographies: ["PL"], from: String(Number(k.last_period.slice(0, 4)) - 10) })
          .then((s) => s.find((x) => Object.keys(x.members).length === 0)?.points ?? s[0]?.points ?? []),
      ),
    ),
  );
  const byKey = new Map<string, Latest>();
  latest.data?.forEach((l, i) => byKey.set(all[i]!.kpi_key, l));
  const domainName = (k: Kpi) => {
    const d = cat.domains.find((x) => x.domain_key === k.domain_key);
    return d ? (pl ? d.name_pl : d.name_en) : "";
  };
  const moves = series.data
    ? topMoves(
        heads.map((kpi, i) => ({ kpi, move: unusualMove(series.data![i]!) })),
        5,
      )
    : [];
  const releases = latest.data ? latestReleases(all, byKey) : [];
  const today = new Date().toISOString().slice(0, 10);
  const calendar = latest.data ? releaseCalendar(all, byKey, today, 3) : [];
  // Examples: indicators of this week's hot topics first, then headline indicators, then the rest in catalogue order.
  const examples = (ks: Kpi[], n = 3) =>
    hotFirst([...ks.filter((k) => heads.includes(k)), ...ks.filter((k) => !heads.includes(k))], hot).slice(0, n);
  const kpiLink = (k: Kpi) => (
    <Link key={k.kpi_key} to={`/kpi/${k.kpi_key}`}>
      {kpiName(k, lang)}
    </Link>
  );
  const list = (ks: Kpi[]) => examples(ks).flatMap((k, i) => (i ? [<span key={`s${i}`}>, </span>, kpiLink(k)] : [kpiLink(k)]));
  const indicators = (n: number) => count(n, ["wskaźnik", "wskaźniki", "wskaźników"], ["indicator", "indicators"], pl);

  return (
    <div className="d-new">
      <article className="zt-card d-new__col" aria-labelledby="d-new-moves">
        <h3 id="d-new-moves" className="d-new__title">
          {pl ? "Nietypowe zmiany" : "Unusual moves"}
        </h3>
        <p className="caption d-new__sub">
          {pl
            ? "Ostatnia zmiana najważniejszych wskaźników wobec ich własnej historii z 10 lat."
            : "The latest change of the headline indicators against their own 10-year history."}
        </p>
        {!series.data ? (
          <p className="small" aria-busy="true">
            {pl ? "Wczytywanie" : "Loading"}
          </p>
        ) : moves.length ? (
          <ol className="d-new__list">
            {moves.map(({ kpi, move }) => (
              <li key={kpi.kpi_key} className="d-move">
                <span className="d-move__head">
                  {kpiLink(kpi)}
                  <span className="caption">{domainName(kpi)}</span>
                </span>
                <span className="d-move__row">
                  <strong className="d-move__value">{fmtValue(byKey.get(kpi.kpi_key)?.value, kpi.unit_key, cat, lang)}</strong>
                  <ChangePill f={{ kpi, latest: byKey.get(kpi.kpi_key) }} cat={cat} lang={lang} />
                </span>
                <span className="small d-move__why">
                  {movePhrase(move, lang)} · {fmtPeriod(move.period, lang)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="small">
            {pl ? "W ostatnich danych nic nie odstaje od zwykłych zmian." : "Nothing in the latest data stands out from the usual changes."}
          </p>
        )}
      </article>

      <article className="zt-card d-new__col" aria-labelledby="d-new-latest">
        <h3 id="d-new-latest" className="d-new__title">
          {pl ? "Najnowsze dane" : "Latest data"}
        </h3>
        <p className="caption d-new__sub">{pl ? "Najnowszy okres każdej częstotliwości." : "The newest period of each frequency."}</p>
        <ul className="d-new__list">
          {releases.map((g) => (
            <li key={g.period} className="d-rel">
              <span className="d-rel__head">
                <strong>{fmtPeriod(g.period, lang)}</strong>
                <span className="caption">
                  {freqLabel(g.frequency, lang)} · {indicators(g.kpis.length)}
                </span>
              </span>
              <span className="small d-rel__kpis">
                {pl ? "m.in. " : "incl. "}
                {list(g.kpis)}
              </span>
            </li>
          ))}
        </ul>
        <Link to="/catalogue" className="small d-new__more">
          {pl ? "Wszystkie wskaźniki w katalogu" : "All indicators in the catalogue"}
        </Link>
      </article>

      <article className="zt-card d-new__col" aria-labelledby="d-new-cal">
        <h3 id="d-new-cal" className="d-new__title">
          {pl ? "Kalendarz publikacji" : "Release calendar"}
        </h3>
        <p className="caption d-new__sub">{pl ? "Kiedy przyjdą następne dane." : "When the next data arrive."}</p>
        {calendar.length ? (
          <ul className="d-new__list">
            {calendar.map((e) => (
              <li key={e.date} className="d-rel">
                <span className="d-rel__head">
                  <strong>
                    <time dateTime={e.date}>{fmtDate(e.date, lang)}</time>
                  </strong>
                  <span className="caption">{indicators(e.kpis.length)}</span>
                </span>
                <span className="small d-rel__kpis">
                  {pl ? "m.in. " : "incl. "}
                  {list(e.kpis)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small">{pl ? "Brak zapowiedzianych publikacji." : "No announced releases."}</p>
        )}
      </article>
    </div>
  );
}

// ---------- Tematy

function SummaryLink({ lang }: { lang: Lang }) {
  const pl = lang === "pl";
  const d = dashboardFor("poland");
  if (!d) return null;
  return (
    <Link to="/d/poland" className="zt-card d-summary">
      <span className="fy-card__icon d-summary__icon" aria-hidden="true">
        <Icon name="poland" size={18} />
      </span>
      <span className="d-summary__text">
        <strong className="d-summary__name">{pl ? d.title_pl : d.title_en}</strong>
        <span className="small">{pl ? d.description_pl : d.description_en}</span>
      </span>
      <span className="d-summary__go" aria-hidden="true">
        <Icon name="chevronRight" size={16} />
      </span>
    </Link>
  );
}

/** Scoreboard: one row per topic (headline figure, change, trend, two more figures, counts, latest period). */
function TopicBoard({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const topics = useTopics(cat, lang);
  return (
    <div className="zt-table-wrap d-board">
      <table className="zt-table d-board__table">
        <caption className="zt-sr">
          {pl ? "Tematy: główny wskaźnik, zmiana, trend i dwa kolejne wskaźniki" : "Topics: headline indicator, change, trend and two more"}
        </caption>
        <thead>
          <tr>
            <th scope="col">{pl ? "Temat" : "Topic"}</th>
            <th scope="col">{pl ? "Główny wskaźnik" : "Headline indicator"}</th>
            <th scope="col" className="d-num">
              {pl ? "Wartość" : "Value"}
            </th>
            <th scope="col">{pl ? "Zmiana" : "Change"}</th>
            <th scope="col">{pl ? "Trend (5 lat)" : "Trend (5 years)"}</th>
            <th scope="col">{pl ? "Także" : "Also"}</th>
            <th scope="col">{pl ? "Dane do" : "Data to"}</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((t) => {
            const lead = t.figs[0];
            return (
              <tr key={t.key}>
                <th scope="row">
                  <Link to={`/d/${t.key}`} className="d-board__topic">
                    <span className="fy-card__icon" aria-hidden="true">
                      <Icon name={domainIcon(t.key)} size={14} />
                    </span>
                    {t.name}
                  </Link>
                  <span className="caption d-board__count">
                    {t.pages} {pagesWord(t.pages, lang)} · {t.count} {pl ? "wskaźników" : "indicators"}
                  </span>
                </th>
                <td>{lead ? kpiName(lead.kpi, lang) : ""}</td>
                <td className="d-num d-board__value">{lead?.latest ? fmtValue(lead.latest.value, lead.kpi.unit_key, cat, lang) : "…"}</td>
                <td>{lead ? <ChangePill f={lead} cat={cat} lang={lang} /> : null}</td>
                <td>{t.spark ? <Sparkline values={t.spark} /> : null}</td>
                <td>
                  <span className="d-board__also">
                    {t.figs.slice(1).map((f) => (
                      <span key={f.kpi.kpi_key}>
                        {kpiName(f.kpi, lang)}: <strong>{f.latest ? fmtValue(f.latest.value, f.kpi.unit_key, cat, lang) : "…"}</strong>
                      </span>
                    ))}
                  </span>
                </td>
                <td className="d-board__when">{fmtPeriod(t.updated, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
      <StickyPageHead
        title={title}
        navLabel={pl ? "Sekcje strony" : "Page sections"}
        targets={[
          { id: "sec-new", label: pl ? "Co nowego" : "What's new" },
          { id: "sec-topics", label: pl ? "Tematy" : "Topics" },
        ]}
      >
        <p className="body-l t-lead t-dlead">
          {pl
            ? "Co nietypowego pokazały ostatnie dane i kiedy przyjdą następne, a niżej wszystkie tematy. Cały kraj na jednej stronie: Polska w skrócie."
            : "What the latest data showed that stands out and when the next arrive, then every topic. The whole country on one page: Poland at a glance."}
        </p>
      </StickyPageHead>
      {catalog ? (
        <>
          <section id="sec-new" className="t-section" aria-labelledby="sec-new-h">
            <h2 id="sec-new-h" className="section-title">
              {pl ? "Co nowego" : "What's new"}
            </h2>
            <WhatsNew cat={catalog} lang={lang} />
          </section>
          <section id="sec-topics" className="t-section" aria-labelledby="sec-topics-h">
            <h2 id="sec-topics-h" className="section-title">
              {pl ? "Tematy" : "Topics"}
            </h2>
            <SummaryLink lang={lang} />
            <TopicBoard cat={catalog} lang={lang} />
          </section>
        </>
      ) : (
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      )}
    </>
  );
}

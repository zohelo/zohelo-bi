// Dashboardy (landing page of the dashboards, /d; design brief §4.3):
//   1. Summary: one line computed from polarity ("5 tematów lepiej, 3 gorzej, 4 bez oceny") with a split bar,
//      then one headline KPI card per topic (agreed red/green, words for screen readers, sparkline).
//   2. Topics, in the variant chosen in the account panel:
//      cards  icon, three figures with change pills, a sparkline, pages and indicator counts, the latest period;
//             grid 4/3/2/1 (12 topics: never a partial row)
//      board  one row per topic, like a markets watchlist (Google Finance) or a Power BI scorecard
// Sticky page head and scroll spacing as on topic dashboards.

import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { StickyPageHead } from "../ui/SectionNav";
import { KpiCard } from "../ui/KpiCard";
import { Sparkline } from "../ui/blocks";
import { domainIcon, Icon } from "../ui/icons";
import { basisFor, fmtChange, fmtPeriod, fmtValue } from "../format";
import { kpiName } from "../chartData";
import { dashboardFor } from "../dashboard/load";
import { judge } from "../polarity";
import { usePersonal } from "../usePersonal";
import "../home/home.css";

/** Headline KPIs of a domain: the first `n` tiles of its overview (fallback: its first indicators). */
export function domainHeadline(cat: Catalog, domain: string, n = 3): Kpi[] {
  const tiles = dashboardFor(domain)?.overview.kpis ?? [];
  const keys = tiles.map((t) => (typeof t === "string" ? t : t.kpi));
  const found = keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const fill = cat.kpis.filter((k) => k.domain_key === domain && !found.includes(k));
  return [...found, ...fill].slice(0, n);
}

/** Comparable end of a period ("2025" → "2025-12"), so the latest period of mixed frequencies can be found. */
function periodEnd(p: string): string {
  if (/^\d{4}$/.test(p)) return `${p}-12`;
  const q = /^(\d{4})-Q(\d)$/.exec(p);
  return q ? `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}` : p;
}

export function latestPeriodOf(cat: Catalog, domain: string): string {
  return cat.kpis
    .filter((k) => k.domain_key === domain)
    .map((k) => k.last_period)
    .sort((a, b) => periodEnd(b).localeCompare(periodEnd(a)))[0]!;
}

type Fig = { kpi: Kpi; latest?: Latest };
type Topic = { key: string; name: string; pages: number; count: number; updated: string; figs: Fig[]; spark?: (number | null)[] };

/** Data of every topic: three headline figures, a sparkline of the first, counts and the latest period. */
function useTopics(cat: Catalog, lang: Lang): Topic[] {
  const pl = lang === "pl";
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
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

/** The change of a figure: shown text, spoken text and the verdict from polarity. */
function changeOf(f: Fig, cat: Catalog, lang: Lang) {
  const l = f.latest;
  if (!l) return null;
  const ch = fmtChange(l.value, l.previous_value, f.kpi.unit_key, basisFor(f.kpi.frequency), cat, lang);
  return { ...ch, verdict: judge(f.kpi.kpi_key, ch.delta) };
}

function verdictWord(v: "good" | "bad" | "neutral", lang: Lang): string {
  const pl = lang === "pl";
  return v === "good" ? (pl ? "korzystnie" : "favourable") : v === "bad" ? (pl ? "niekorzystnie" : "unfavourable") : "";
}

function ChangePill({ f, cat, lang }: { f: Fig; cat: Catalog; lang: Lang }) {
  const ch = changeOf(f, cat, lang);
  if (!ch) return null;
  const word = verdictWord(ch.verdict, lang);
  return (
    <span className={`k-chg k-chg--${ch.verdict}`}>
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

export function DomainCards({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const topics = useTopics(cat, lang);
  return (
    <div className="d-topics">
      {topics.map((t) => (
        <Link key={t.key} to={`/d/${t.key}`} className="zt-card d-topic">
          <span className="d-topic__head">
            <span className="fy-card__icon d-topic__icon" aria-hidden="true">
              <Icon name={domainIcon(t.key)} size={16} />
            </span>
            <span className="d-topic__name">{t.name}</span>
            <span className="d-topic__go" aria-hidden="true">
              <Icon name="chevronRight" size={16} />
            </span>
          </span>
          {t.figs.map((f, i) => (
            <span key={f.kpi.kpi_key} className={`d-fig${i === 0 ? " d-fig--lead" : ""}`}>
              <span className="d-fig__label">{kpiName(f.kpi, lang)}</span>
              <span className="d-fig__row">
                <span className="d-fig__value">{f.latest ? fmtValue(f.latest.value, f.kpi.unit_key, cat, lang) : "…"}</span>
                <ChangePill f={f} cat={cat} lang={lang} />
                {i === 0 && t.spark ? <Sparkline values={t.spark} /> : null}
              </span>
            </span>
          ))}
          <span className="d-topic__meta">
            {t.pages} {pagesWord(t.pages, lang)} · {t.count} {pl ? "wskaźników" : "indicators"} · {pl ? "dane do " : "data to "}
            {fmtPeriod(t.updated, lang)}
          </span>
        </Link>
      ))}
    </div>
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
  const { variants } = usePersonal();
  const pl = lang === "pl";
  const title = pl ? "Dashboardy" : "Dashboards";
  useMeta(title, [{ label: title }], [lang]);
  return (
    <>
      <StickyPageHead
        title={title}
        navLabel={pl ? "Sekcje strony" : "Page sections"}
        targets={[
          { id: "sec-summary", label: pl ? "Podsumowanie" : "Summary" },
          { id: "sec-topics", label: pl ? "Wszystkie tematy" : "All topics" },
        ]}
      >
        <p className="body-l t-lead t-dlead">
          {pl
            ? "Najważniejsza liczba każdego tematu, a niżej dwanaście dashboardów tematycznych."
            : "The headline figure of every topic, then the twelve topic dashboards."}
        </p>
      </StickyPageHead>
      {catalog ? (
        <>
          <section id="sec-summary" className="t-section" aria-labelledby="sec-summary-h">
            <h2 id="sec-summary-h" className="section-title">
              {pl ? "Podsumowanie" : "Summary"}
            </h2>
            <Summary cat={catalog} lang={lang} />
          </section>
          <section id="sec-topics" className="t-section" aria-labelledby="sec-topics-h">
            <h2 id="sec-topics-h" className="section-title">
              {pl ? "Wszystkie tematy" : "All topics"}
            </h2>
            {variants.dash === "board" ? <TopicBoard cat={catalog} lang={lang} /> : <DomainCards cat={catalog} lang={lang} />}
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

/** Counts of the headline changes by verdict. */
export function tally(verdicts: ("good" | "bad" | "neutral")[]) {
  return {
    good: verdicts.filter((v) => v === "good").length,
    bad: verdicts.filter((v) => v === "bad").length,
    neutral: verdicts.filter((v) => v === "neutral").length,
  };
}

function topicsWord(n: number, lang: Lang): string {
  if (lang !== "pl") return n === 1 ? "topic" : "topics";
  return n === 1 ? "temat" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "tematy" : "tematów";
}

/** One headline figure per topic, coloured where the direction of change is clearly good or bad. */
function Summary({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const kpis = domains.map((d) => domainHeadline(cat, d.domain_key, 1)[0]).filter((k): k is Kpi => !!k);
  const latest = useData("dash-summary", () => Promise.all(kpis.map((k) => data.latest(k.kpi_key))));
  const sparks = useData("dash-summary-sparks", () =>
    Promise.all(
      kpis.map((k) =>
        data
          .series(k.kpi_key, { geographies: ["PL"], from: String(Number(k.last_period.slice(0, 4)) - 5) })
          .then((s) => s[0]?.points.map((p) => p.value) ?? []),
      ),
    ),
  );
  const verdicts = latest.data ? kpis.map((k, i) => changeOf({ kpi: k, latest: latest.data![i] }, cat, lang)?.verdict ?? "neutral") : [];
  const t = tally(verdicts);
  const total = verdicts.length || 1;
  return (
    <>
      {latest.data ? (
        <div className="d-verdict">
          <p className="body d-verdict__text">
            {pl ? "Ostatni okres: " : "Last period: "}
            <strong className="d-verdict__good">
              {t.good} {topicsWord(t.good, lang)} {pl ? "lepiej" : "better"}
            </strong>
            {", "}
            <strong className="d-verdict__bad">
              {t.bad} {pl ? "gorzej" : "worse"}
            </strong>
            {", "}
            {t.neutral} {pl ? "bez oceny kierunku (np. ceny, kursy, liczby zdarzeń)." : "with no agreed direction (prices, rates, counts)."}
          </p>
          <span className="d-verdict__bar" aria-hidden="true">
            <i className="d-verdict__seg d-verdict__seg--good" style={{ flexGrow: t.good / total }} />
            <i className="d-verdict__seg d-verdict__seg--bad" style={{ flexGrow: t.bad / total }} />
            <i className="d-verdict__seg d-verdict__seg--neutral" style={{ flexGrow: t.neutral / total }} />
          </span>
        </div>
      ) : null}
      <div className="k-grid k-grid--12">
        {kpis.map((k, i) => (
          <KpiCard
            key={k.kpi_key}
            kpi={k}
            latest={latest.data?.[i]}
            spark={sparks.data?.[i]}
            cat={cat}
            lang={lang}
            context={(pl ? domains[i]!.name_pl : domains[i]!.name_en) as string}
          />
        ))}
      </div>
    </>
  );
}

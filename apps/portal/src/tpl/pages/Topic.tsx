// Strona tematu (/temat/<topic_key>, owner decision O32): what is being said about a topic and what the data say.
//   heading, trend and why it is hot · where the topic stands in each period (rank and heat) · the main KPI's
//   chart beside the next release · every linked KPI as a card (to /kpi/<key>) · all headlines as links out.
// A topic without a linked indicator says so plainly ("no indicator linked yet") and still shows the headlines.
// The route accepts only contract keys (routes.ts); an unknown key or unpublished topics get a friendly state.

import { useMemo } from "react";
import { legendItems, toTable, ZChart, type ZChartProps } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, topicsReview, type Catalog, type Kpi, type Topics } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { fmtPeriod, fmtValue, freqLabel } from "../format";
import { kpiName, periodFormatter, sourceName, zUnit } from "../chartData";
import { ChartCard, DraftBadge, PageHeader, StatusTag } from "../ui/blocks";
import { KpiCard } from "../ui/KpiCard";
import { TableView } from "../ui/TableView";
import { Legend } from "../explore/ui";
import { bandFor, fmtDate } from "../explore/indicatorInfo";
import { Headline, TopicsReviewBanner, TrendArrow } from "../home/Trending";
import { daysBetween, linkedKpis, PERIODS, topicName, topicView, trendWords, whyHot, type TopicView } from "../topics/topics";
import "../home/home.css";

export function TopicPage({ topicKey }: { topicKey: string }) {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const topics = useData("topics", () => data.topics());
  const view = topics.data ? topicView(topics.data, topicKey) : null;
  const title = view
    ? topicName(view.entry, lang)
    : topics.loading
      ? pl
        ? "Temat"
        : "Topic"
      : pl
        ? "Nie znaleziono tematu"
        : "Topic not found";
  useMeta(
    title,
    [{ label: pl ? "Strona główna" : "Home", to: "/" }, { label: pl ? "Na czasie" : "Trending" }, { label: title }],
    [lang, view ? 1 : 0, topics.loading ? 1 : 0],
  );

  if (!catalog || topics.loading)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      </>
    );
  if (topics.error)
    return (
      <>
        <PageHeader title={title} />
        <p className="zt-state zt-state--error" role="alert">
          {topics.error}
        </p>
      </>
    );
  if (!view) return <TopicMissing topicKey={topicKey} published={!!topics.data} lang={lang} />;
  return <TopicBody cat={catalog} topics={topics.data!} view={view} lang={lang} />;
}

function TopicMissing({ topicKey, published, lang }: { topicKey: string; published: boolean; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <>
      <PageHeader
        title={pl ? "Nie znaleziono tematu" : "Topic not found"}
        lead={
          published
            ? pl
              ? `Temat „${topicKey}” nie jest teraz na żadnej liście tematów na czasie (dzień, tydzień, miesiąc, kwartał, rok).`
              : `The topic “${topicKey}” is not on any trending list right now (day, week, month, quarter, year).`
            : pl
              ? "Tematy na czasie nie są jeszcze włączone. Pojawią się, gdy zatwierdzimy rankingi."
              : "Trending topics are not switched on yet. They appear once the rankings are approved."
        }
      />
      <p>
        <Link to="/">{pl ? "Wróć do strony głównej" : "Back to the home page"}</Link>{" "}
        {pl ? "albo wyszukaj wskaźnik w " : "or look for an indicator in the "}
        <Link to="/catalogue">{pl ? "katalogu danych" : "data catalogue"}</Link>.
      </p>
    </>
  );
}

function TopicBody({ cat, topics, view, lang }: { cat: Catalog; topics: Topics; view: TopicView; lang: Lang }) {
  const pl = lang === "pl";
  const { entry } = view;
  const review = topicsReview();
  const today = topics.periods.day.window.to;
  const kpis = linkedKpis(cat, entry);
  const unknown = entry.kpi_keys.length - kpis.length;
  const name = topicName(entry, lang);
  const firstPeriod = view.history.find((h) => h.entry)!;
  const periodWord = (k: string) => {
    const p = PERIODS.find((x) => x.key === k)!;
    return pl ? p.pl : p.en;
  };
  return (
    <>
      <PageHeader
        title={name}
        lead={
          <>
            {pl
              ? `${firstPeriod.entry!.rank}. miejsce na czasie (${periodWord(firstPeriod.period).toLowerCase()})`
              : `Rank ${firstPeriod.entry!.rank} trending (${periodWord(firstPeriod.period).toLowerCase()})`}
            {" · "}
            {whyHot(entry, today, lang)}
          </>
        }
        right={
          cat.sample && !review ? (
            <StatusTag kind="sample">{pl ? "Przykładowy temat i nagłówki" : "Sample topic and headlines"}</StatusTag>
          ) : undefined
        }
      />
      {review ? <TopicsReviewBanner cat={cat} lang={lang} /> : null}
      <p className="tp-pagetrend">
        <TrendArrow trend={entry.trend} lang={lang} />
        <span className="small h-muted">
          {pl ? "wobec poprzedniego okresu tej samej długości" : "against the previous period of the same length"}
        </span>
      </p>

      <section className="t-section tp-section" aria-labelledby="tp-heat">
        <h2 id="tp-heat" className="section-title">
          {pl ? "Jak gorący jest temat" : "How hot the topic is"}
        </h2>
        <HeatHistory view={view} lang={lang} />
      </section>

      <section className="t-section tp-section" aria-labelledby="tp-data">
        <h2 id="tp-data" className="section-title">
          {pl ? "Co mówią dane" : "What the data say"}
        </h2>
        {kpis.length ? (
          <>
            <div className="t-grid">
              <MainChart cat={cat} kpi={kpis[0]!} lang={lang} />
              <NextRelease cat={cat} view={view} today={today} lang={lang} />
            </div>
            <LinkedCards cat={cat} kpis={kpis} lang={lang} />
            {unknown > 0 ? (
              <p className="small h-muted">
                {pl
                  ? `Jeszcze ${unknown} powiązanych wskaźników nie ma w katalogu.`
                  : `${unknown} more linked indicators are not in the catalogue yet.`}
              </p>
            ) : null}
          </>
        ) : (
          <div className="zt-card tp-nodata">
            <p className="tp-nodata__title">
              {pl ? "Nie powiązaliśmy jeszcze wskaźnika z tym tematem." : "No indicator is linked to this topic yet."}
            </p>
            <p className="small">
              {pl
                ? "Temat jest na czasie, ale żadna liczba z naszego katalogu nie odpowiada jeszcze na pytanie, o którym się mówi. Pokazujemy nagłówki; wskaźnik dodamy, gdy będziemy mieli dane, które go mierzą."
                : "The topic is trending, but no figure in our catalogue answers the question being discussed yet. We show the headlines; an indicator follows once we have data that measure it."}
            </p>
            <p className="small">
              <Link to={`/catalogue?q=${encodeURIComponent(name)}`}>
                {pl ? `Szukaj „${name}” w katalogu danych` : `Search the data catalogue for “${name}”`}
              </Link>
            </p>
            {entry.next_release ? <NextReleaseLine cat={cat} view={view} today={today} lang={lang} /> : null}
          </div>
        )}
      </section>

      <section className="t-section tp-section" aria-labelledby="tp-news">
        <h2 id="tp-news" className="section-title">
          {pl ? "Co piszą media" : "What the media write"}
        </h2>
        <p className="small h-muted tp-section__lead">
          {pl
            ? "Tytuły z kanałów RSS wydawców, najnowsze na górze. Linki prowadzą do serwisów wydawców; nie przechowujemy treści artykułów."
            : "Headlines from the publishers' RSS feeds, newest first. Links lead to the publishers' sites; we never keep article text."}
        </p>
        {view.headlines.length ? (
          <ul className="zt-card tp-headlines tp-headlines--all" aria-label={pl ? `Nagłówki: ${name}` : `Headlines: ${name}`}>
            {view.headlines.map((h) => (
              <Headline key={h.url} h={h} today={today} lang={lang} />
            ))}
          </ul>
        ) : (
          <p className="zt-state">{pl ? "Brak nagłówków w oknach rankingu." : "No headlines in the ranking windows."}</p>
        )}
      </section>
    </>
  );
}

/** Rank and heat of the topic in every period; a period without it says "poza listą". */
function HeatHistory({ view, lang }: { view: TopicView; lang: Lang }) {
  const pl = lang === "pl";
  const max = Math.max(...view.history.map((h) => h.entry?.heat ?? 0), 1);
  const num = (x: number) => x.toLocaleString(pl ? "pl-PL" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="tp-heat">
      <div
        className="zt-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={pl ? "Tabela: miejsce i wynik tematu w każdym okresie" : "Table: rank and heat of the topic in each period"}
      >
        <table className="zt-table">
          <caption className="zt-sr">
            {pl ? "Miejsce i wynik tematu w każdym okresie" : "Rank and heat of the topic in each period"}
          </caption>
          <thead>
            <tr>
              <th scope="col">{pl ? "Okres" : "Period"}</th>
              <th scope="col">{pl ? "Okno" : "Window"}</th>
              <th scope="col" className="num">
                {pl ? "Miejsce" : "Rank"}
              </th>
              <th scope="col">{pl ? "Wynik" : "Heat"}</th>
              <th scope="col">{pl ? "Trend" : "Trend"}</th>
            </tr>
          </thead>
          <tbody>
            {view.history.map((h) => {
              const p = PERIODS.find((x) => x.key === h.period)!;
              const e = h.entry;
              return (
                <tr key={h.period}>
                  <th scope="row">{pl ? p.pl : p.en}</th>
                  <td>
                    {h.window.from === h.window.to
                      ? fmtDate(h.window.to, lang)
                      : `${fmtDate(h.window.from, lang)} – ${fmtDate(h.window.to, lang)}`}
                  </td>
                  <td className="num">{e ? `${e.rank}.` : pl ? "poza listą" : "not listed"}</td>
                  <td>
                    {e ? (
                      <span className="tp-heatcell">
                        <span className="tp-heatbar" aria-hidden="true">
                          <span style={{ width: `${Math.max(0, (e.heat / max) * 100)}%` }} />
                        </span>
                        {num(e.heat)}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td>{e ? trendWords(e.trend, lang).word : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="caption h-muted">
        {pl
          ? "Wynik: o ile odchyleń od zwykłego poziomu tematu z ostatnich 90 dni wzrosła liczba publikacji, zasięg w mediach i zainteresowanie czytelników (wagi 0,5 · 0,3 · 0,2), plus premiera danych."
          : "Heat: how many deviations above the topic's usual level over the last 90 days its article count, media coverage and reader interest rose (weights 0.5 · 0.3 · 0.2), plus a data release."}
      </p>
    </div>
  );
}

function MainChart({ cat, kpi, lang }: { cat: Catalog; kpi: Kpi; lang: Lang }) {
  const pl = lang === "pl";
  const from = String(Number(kpi.last_period.slice(0, 4)) - 10);
  const history = useData(`topic-main:${kpi.kpi_key}`, () => data.series(kpi.kpi_key, { geographies: ["PL"], from }));
  const hist = history.data?.find((s) => Object.keys(s.members).length === 0) ?? history.data?.[0];
  const points = useMemo(() => (hist ? hist.points.map((p) => ({ x: p.period, y: p.value })) : []), [hist]);
  const name = kpiName(kpi, lang);
  const band = bandFor(kpi);
  const last = [...points].reverse().find((p) => p.y !== null);
  const title = last && last.y !== null ? `${name}: ${fmtValue(last.y, kpi.unit_key, cat, lang)} (${fmtPeriod(last.x, lang)})` : name;
  const chart: ZChartProps = {
    type: "line-band",
    series: [{ id: "PL", label: pl ? "Polska" : "Poland", role: "hero", points }],
    band,
    bandLabel: band ? (pl ? "cel NBP 2,5% ± 1 pp" : "NBP target 2.5% ± 1 pp") : undefined,
    unit: zUnit(cat, kpi.unit_key, last?.y ?? 1),
    lang,
    ariaLabel: title,
    formatPeriod: periodFormatter(lang),
    height: 280,
  };
  return (
    <ChartCard
      span={8}
      lang={lang}
      title={title}
      sub={`${pl ? "Główny wskaźnik tematu" : "The topic's main indicator"} · ${freqLabel(kpi.frequency, lang)}, ${pl ? "ostatnie 10 lat" : "last 10 years"}`}
      badge={<DraftBadge kpis={[kpi]} lang={lang} small />}
      state={
        history.error
          ? { kind: "error", text: history.error }
          : hist
            ? undefined
            : history.data
              ? { kind: "empty", text: pl ? "Brak danych dla Polski." : "No data for Poland." }
              : { kind: "loading" }
      }
      chart={() => <ZChart {...chart} />}
      table={() => <TableView table={toTable(chart)} />}
      legend={legendItems(chart).length > 1 ? <Legend chart={chart} bare /> : undefined}
      source={
        <>
          <span>
            {pl ? "Źródło: " : "Source: "}
            {sourceName(cat, kpi.source_keys[0] ?? "", lang)}
          </span>
          <Link to={`/kpi/${kpi.kpi_key}`}>{pl ? `Strona wskaźnika: ${name}` : `Indicator page: ${name}`}</Link>
        </>
      }
    />
  );
}

/** "jutro" / "in 3 days"; empty for a past date. */
function relativeDay(today: string, date: string, lang: Lang): string {
  const pl = lang === "pl";
  const n = daysBetween(today, date);
  return n === 0 ? (pl ? "dziś" : "today") : n === 1 ? (pl ? "jutro" : "tomorrow") : n > 1 ? (pl ? `za ${n} dni` : `in ${n} days`) : "";
}

function NextReleaseLine({ cat, view, today, lang }: { cat: Catalog; view: TopicView; today: string; lang: Lang }) {
  const pl = lang === "pl";
  const r = view.entry.next_release;
  if (!r) return null;
  const n = daysBetween(today, r.date);
  const when =
    n === 0 ? (pl ? "dziś" : "today") : n === 1 ? (pl ? "jutro" : "tomorrow") : n > 1 ? (pl ? `za ${n} dni` : `in ${n} days`) : "";
  return (
    <p className="small">
      <strong>{pl ? "Następna publikacja: " : "Next release: "}</strong>
      <time dateTime={r.date}>{fmtDate(r.date, lang)}</time>
      {when ? ` (${when})` : ""}, {sourceName(cat, r.source_key, lang)}: {pl ? r.title_pl : r.title_en}
    </p>
  );
}

function NextRelease({ cat, view, today, lang }: { cat: Catalog; view: TopicView; today: string; lang: Lang }) {
  const pl = lang === "pl";
  const r = view.entry.next_release;
  return (
    <section className="zt-card t-span-4 tp-release" aria-labelledby="tp-release-h">
      <h3 id="tp-release-h" className="zt-card__title">
        {pl ? "Następna publikacja" : "Next release"}
      </h3>
      {r ? (
        <>
          <p className="tp-release__date">
            <time dateTime={r.date}>{fmtDate(r.date, lang)}</time>
          </p>
          <p className="small">
            {sourceName(cat, r.source_key, lang)}: {pl ? r.title_pl : r.title_en}
          </p>
          {relativeDay(today, r.date, lang) ? <p className="small h-muted">{relativeDay(today, r.date, lang)}</p> : null}
        </>
      ) : (
        <p className="small">{pl ? "Brak zapowiedzianej publikacji głównego wskaźnika." : "No announced release of the main indicator."}</p>
      )}
    </section>
  );
}

function LinkedCards({ cat, kpis, lang }: { cat: Catalog; kpis: Kpi[]; lang: Lang }) {
  const pl = lang === "pl";
  const keys = kpis.map((k) => k.kpi_key).join(",");
  const latest = useData(`topic-kpis|${keys}`, () => Promise.all(kpis.map((k) => data.latest(k.kpi_key).catch(() => undefined))));
  const sparks = useData(`topic-sparks|${keys}`, () =>
    Promise.all(
      kpis.map((k) =>
        data
          .series(k.kpi_key, { geographies: ["PL"], from: String(Number(k.last_period.slice(0, 4)) - 5) })
          .then((s) => s[0]?.points.map((p) => p.value) ?? [])
          .catch(() => []),
      ),
    ),
  );
  return (
    <div className="tp-kpis">
      <h3 className="card-title tp-kpis__title">{pl ? "Powiązane wskaźniki" : "Linked indicators"}</h3>
      <div className="k-grid">
        {kpis.map((k, i) => (
          <KpiCard
            key={k.kpi_key}
            kpi={k}
            latest={latest.data?.[i]}
            spark={sparks.data?.[i]}
            cat={cat}
            lang={lang}
            context={i === 0 ? (pl ? "Główny wskaźnik" : "Main indicator") : undefined}
          />
        ))}
      </div>
    </div>
  );
}

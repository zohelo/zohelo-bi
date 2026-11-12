// "Na czasie" (owner decision O32): what is being talked about next to what the data says, at the top of every
// home layout. Topics ranked per day, week, month, quarter and year (period in `?okres=`), each with its trend,
// one line on why it is hot (from the published signals), the main KPI's value and change, and two or three
// headlines as links out (title, outlet, time; never article text). Hidden while topics.json is not published.

import { useState } from "react";
import { useData } from "../../components/useData";
import {
  data,
  topicsReview,
  type Catalog,
  type Latest,
  type TopicEntry,
  type TopicHeadline,
  type TopicPeriodKey,
  type Topics,
} from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { Segmented, StatusTag } from "../ui/blocks";
import { KpiMini } from "../ui/KpiCard";
import {
  headlineTime,
  linkedKpis,
  PERIOD_PARAM,
  PERIODS,
  periodFromParam,
  periodParam,
  topicName,
  trendWords,
  whyHot,
} from "../topics/topics";

/** How many topics the home page shows per period, and headlines per topic. */
const SHOWN = 6;
const HEADLINES = 3;

export function TrendArrow({ trend, lang }: { trend: TopicEntry["trend"]; lang: Lang }) {
  const w = trendWords(trend, lang);
  return (
    <span className={`tp-trend tp-trend--${trend}`}>
      <span aria-hidden="true">{w.arrow}</span>
      <span className="tp-trend__word" aria-hidden="true">
        {w.word}
      </span>
      <span className="zt-sr">{w.spoken}</span>
    </span>
  );
}

/** A headline as a link out: the outlet's name is always visible; the link never carries article text. */
export function Headline({ h, today, lang }: { h: TopicHeadline; today: string; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <li className="tp-headline">
      <a href={h.url} rel="noopener noreferrer" lang={h.lang !== lang ? h.lang : undefined} className="tp-headline__title">
        {h.title}
        <span className="zt-sr">{pl ? ` (${h.outlet}, serwis zewnętrzny)` : ` (${h.outlet}, external site)`}</span>
      </a>
      <span className="tp-headline__meta">
        <span className="tp-headline__outlet">{h.outlet}</span> ·{" "}
        <time dateTime={h.published_at}>{headlineTime(h.published_at, today, lang)}</time>
      </span>
    </li>
  );
}

/**
 * Shown while the review switch (`?tematy=przeglad`) is on: the topics and headlines are the real internal review copy,
 * not published yet; on sample data the indicators beside them are still sample numbers.
 */
export function TopicsReviewBanner({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <p className="tp-review" role="note">
      <i aria-hidden="true" />
      <span>
        <strong>
          {pl ? "Tematy i nagłówki: dane rzeczywiste (przegląd wewnętrzny)" : "Topics and headlines: real data (internal review)"}
        </strong>
        {cat.sample
          ? pl
            ? " · wskaźniki: przykładowe"
            : " · indicators: sample"
          : pl
            ? " · jeszcze nieopublikowane"
            : " · not published yet"}
      </span>
    </p>
  );
}

function TopicCard({
  t,
  today,
  cat,
  lang,
  latest,
}: {
  t: TopicEntry;
  today: string;
  cat: Catalog;
  lang: Lang;
  latest: Latest | null | undefined;
}) {
  const pl = lang === "pl";
  const main = linkedKpis(cat, t)[0];
  const name = topicName(t, lang);
  return (
    <li className="zt-card tp-card">
      <div className="tp-card__head">
        <span className="tp-card__rank" aria-hidden="true">
          {t.rank}
        </span>
        <h3 className="tp-card__name">
          <Link to={`/temat/${t.topic_key}`}>
            <span className="zt-sr">{pl ? `${t.rank}. miejsce: ` : `Rank ${t.rank}: `}</span>
            {name}
          </Link>
        </h3>
        <TrendArrow trend={t.trend} lang={lang} />
      </div>
      <p className="tp-card__why">{whyHot(t, today, lang)}</p>
      <div className="tp-card__data">
        {main ? (
          <KpiMini kpi={main} latest={latest} cat={cat} lang={lang} />
        ) : (
          <span className="tp-card__nodata">
            {pl ? "Nie powiązaliśmy jeszcze wskaźnika z tym tematem." : "No indicator linked to this topic yet."}
          </span>
        )}
      </div>
      {t.headlines.length ? (
        <ul className="tp-headlines" aria-label={pl ? `Nagłówki: ${name}` : `Headlines: ${name}`}>
          {t.headlines.slice(0, HEADLINES).map((h) => (
            <Headline key={h.url} h={h} today={today} lang={lang} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TrendingBody({ topics, cat, lang, review }: { topics: Topics; cat: Catalog; lang: Lang; review: boolean }) {
  const pl = lang === "pl";
  const [period, setPeriod] = useState<TopicPeriodKey>(() => periodFromParam(new URL(window.location.href).searchParams.get(PERIOD_PARAM)));
  const choose = (p: TopicPeriodKey) => {
    setPeriod(p);
    // Keep the choice in the address (shareable, and the UI suite opens tabs by URL) without a new history entry.
    const u = new URL(window.location.href);
    u.searchParams.set(PERIOD_PARAM, periodParam(p));
    window.history.replaceState(window.history.state, "", u.toString());
  };
  const block = topics.periods[period];
  const shown = block.topics.slice(0, SHOWN);
  const mains = shown.map((t) => linkedKpis(cat, t)[0]?.kpi_key ?? null);
  const latest = useData(`topics-latest|${mains.join(",")}`, () =>
    Promise.all(mains.map((k) => (k ? data.latest(k).catch(() => undefined) : Promise.resolve(undefined)))),
  );
  const today = block.window.to;
  return (
    <>
      <div className="tp-bar">
        <Segmented
          label={pl ? "Okres rankingu tematów" : "Period of the topic ranking"}
          options={PERIODS.map((p) => ({ value: p.key, label: pl ? p.pl : p.en }))}
          value={period}
          onChange={choose}
        />
        {cat.sample && !review ? (
          <StatusTag kind="sample">{pl ? "Przykładowe tematy i nagłówki" : "Sample topics and headlines"}</StatusTag>
        ) : null}
      </div>
      {shown.length ? (
        <ol
          className="tp-grid"
          aria-label={
            pl
              ? `Tematy na czasie: ${PERIODS.find((p) => p.key === period)!.pl.toLowerCase()}`
              : `Trending topics: ${PERIODS.find((p) => p.key === period)!.en.toLowerCase()}`
          }
        >
          {shown.map((t, i) => (
            <TopicCard key={t.topic_key} t={t} today={today} cat={cat} lang={lang} latest={latest.data?.[i]} />
          ))}
        </ol>
      ) : (
        <p className="zt-state">
          {pl ? "W tym okresie żaden temat nie przekroczył progu." : "No topic passed the threshold in this period."}
        </p>
      )}
    </>
  );
}

export function Trending({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const topics = useData("topics", () => data.topics());
  const review = topicsReview();
  // Not published yet (null) or not readable: the section is simply not there.
  if (!topics.data) return null;
  return (
    <section className="h-block tp-block" aria-labelledby="h-trending">
      <div className="h-sechead">
        <div>
          <h2 id="h-trending" className="section-title">
            {pl ? "Na czasie" : "Trending"}
          </h2>
          <p className="small h-muted h-sechead__lead">
            {pl
              ? "O czym się mówi i co na to dane. Ranking z liczby publikacji i zainteresowania, bez oceniania treści."
              : "What is being talked about, and what the data say. Ranked by coverage and attention, not by judging content."}
          </p>
        </div>
      </div>
      {review ? <TopicsReviewBanner cat={cat} lang={lang} /> : null}
      <TrendingBody topics={topics.data} cat={cat} lang={lang} review={review} />
    </section>
  );
}

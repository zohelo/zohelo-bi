// Hot topics in the portal (owner decision O32): pure helpers behind "Na czasie" on the home page and the topic
// page /temat/<topic_key>. Rules only: the words come from the published signals and dates, nothing is generated.

import type { Catalog, Kpi, TopicEntry, TopicHeadline, TopicPeriodKey, TopicRelease, Topics, TopicTrend } from "../../data";
import type { Lang } from "../../i18n";

export const PERIODS: { key: TopicPeriodKey; param: string; pl: string; en: string }[] = [
  { key: "day", param: "dzis", pl: "Dziś", en: "Today" },
  { key: "week", param: "tydzien", pl: "Tydzień", en: "Week" },
  { key: "month", param: "miesiac", pl: "Miesiąc", en: "Month" },
  { key: "quarter", param: "kwartal", pl: "Kwartał", en: "Quarter" },
  { key: "year", param: "rok", pl: "Rok", en: "Year" },
];

/** URL parameter of the chosen period on the home page (`?okres=tydzien`), so a tab can be linked and tested. */
export const PERIOD_PARAM = "okres";

/** The period named by `?okres=` (Polish slug or the contract key), else the default. */
export function periodFromParam(value: string | null, fallback: TopicPeriodKey = "day"): TopicPeriodKey {
  const p = PERIODS.find((x) => x.param === value || x.key === value);
  return p ? p.key : fallback;
}

export function periodParam(key: TopicPeriodKey): string {
  return PERIODS.find((p) => p.key === key)!.param;
}

/** Topic keys in links (/temat/<key>) are contract keys: anything else is refused before it reaches the page. */
export const TOPIC_KEY = /^[a-z0-9_]{1,64}$/;

export function isTopicKey(key: string): boolean {
  return TOPIC_KEY.test(key);
}

/** Arrow (decorative) and words (for screen readers and the topic page) of a trend. */
export function trendWords(t: TopicTrend, lang: Lang): { arrow: string; word: string; spoken: string } {
  const pl = lang === "pl";
  if (t === "up") return { arrow: "↑", word: pl ? "rośnie" : "rising", spoken: pl ? "zainteresowanie rośnie" : "attention rising" };
  if (t === "down") return { arrow: "↓", word: pl ? "słabnie" : "cooling", spoken: pl ? "zainteresowanie słabnie" : "attention cooling" };
  return { arrow: "→", word: pl ? "bez zmian" : "steady", spoken: pl ? "zainteresowanie bez zmian" : "attention steady" };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD…). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

/** "premiera danych jutro" / "data out in 3 days"; null when the release is past or more than a week away. */
export function releasePhrase(release: TopicRelease | null, today: string, lang: Lang): string | null {
  if (!release) return null;
  const pl = lang === "pl";
  const n = daysBetween(today, release.date);
  if (n < 0 || n > 7) return null;
  if (n === 0) return pl ? "premiera danych dziś" : "data out today";
  if (n === 1) return pl ? "premiera danych jutro" : "data out tomorrow";
  return pl ? `premiera danych za ${n} dni` : `data out in ${n} days`;
}

/**
 * One line on why a topic is hot, from its signals (robust z-scores against its own 90 days) and the next release:
 * the two strongest signals above 1, then the release when it is within a week. "dużo publikacji · premiera danych jutro".
 */
export function whyHot(t: Pick<TopicEntry, "signals" | "next_release">, today: string, lang: Lang): string {
  const pl = lang === "pl";
  const words: { z: number; text: string }[] = [];
  const { news, volume, attention } = t.signals;
  if (news !== null && news >= 1)
    words.push({
      z: news,
      text: news >= 2 ? (pl ? "dużo publikacji" : "many articles") : pl ? "więcej publikacji niż zwykle" : "more articles than usual",
    });
  if (volume !== null && volume >= 1)
    words.push({
      z: volume,
      text: volume >= 2 ? (pl ? "szeroko w mediach" : "widely covered") : pl ? "więcej w mediach" : "more media coverage",
    });
  if (attention !== null && attention >= 1)
    words.push({
      z: attention,
      text:
        attention >= 2
          ? pl
            ? "duże zainteresowanie czytelników"
            : "strong reader interest"
          : pl
            ? "rosnące zainteresowanie czytelników"
            : "growing reader interest",
    });
  const parts = words
    .sort((a, b) => b.z - a.z)
    .slice(0, 2)
    .map((w) => w.text);
  const release = releasePhrase(t.next_release, today, lang);
  if (release) parts.push(release);
  return parts.length ? parts.join(" · ") : pl ? "stale obecny w mediach" : "steadily in the news";
}

/** KPI keys of a period's topics, in rank order and main KPIs first, without repeats ("this week's hot KPIs"). */
export function hotKpiKeys(topics: Topics | null | undefined, period: TopicPeriodKey = "week"): string[] {
  if (!topics) return [];
  const ranked = [...topics.periods[period].topics].sort((a, b) => a.rank - b.rank);
  return [...new Set(ranked.flatMap((t) => t.kpi_keys))];
}

/** `kpis` with the hot ones first (in hot order), the rest in their own order. */
export function hotFirst<T extends { kpi_key: string }>(kpis: T[], hot: string[]): T[] {
  if (!hot.length) return kpis;
  const rank = new Map(hot.map((k, i) => [k, i]));
  const isHot = kpis.filter((k) => rank.has(k.kpi_key)).sort((a, b) => rank.get(a.kpi_key)! - rank.get(b.kpi_key)!);
  return [...isHot, ...kpis.filter((k) => !rank.has(k.kpi_key))];
}

export type TopicView = {
  /** The entry of the shortest period that lists the topic (its freshest heat and trend). */
  entry: TopicEntry;
  /** Where the topic stands in every period (null = not in that period's list). */
  history: { period: TopicPeriodKey; window: { from: string; to: string }; entry: TopicEntry | null }[];
  /** Headlines of every period, newest first, each link once. */
  headlines: TopicHeadline[];
};

/** Everything the topic page shows about one topic; null when no period lists it. */
export function topicView(topics: Topics, key: string): TopicView | null {
  const history = PERIODS.map((p) => ({
    period: p.key,
    window: topics.periods[p.key].window,
    entry: topics.periods[p.key].topics.find((t) => t.topic_key === key) ?? null,
  }));
  const entry = history.find((h) => h.entry)?.entry;
  if (!entry) return null;
  const seen = new Set<string>();
  const headlines = history
    .flatMap((h) => h.entry?.headlines ?? [])
    .filter((h) => {
      if (seen.has(h.url)) return false;
      seen.add(h.url);
      return true;
    })
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
  return { entry, history, headlines };
}

/** Linked KPIs that the catalogue has (a v2 key the catalogue lacks cannot be shown), main first. */
export function linkedKpis(cat: Catalog, entry: Pick<TopicEntry, "kpi_keys">): Kpi[] {
  return entry.kpi_keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
}

/** "10 lis, 08:40" in Polish time; the day only for headlines older than the reference day. */
export function headlineTime(iso: string, today: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === "pl" ? "pl-PL" : "en-GB";
  const tz = "Europe/Warsaw";
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: tz }).format(d);
  const sameDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d) === today;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
  if (sameDay) return lang === "pl" ? `dziś, ${time}` : `today, ${time}`;
  return daysBetween(iso.slice(0, 10), today) <= 7 ? `${day}, ${time}` : day;
}

export function topicName(t: Pick<TopicEntry, "name_pl" | "name_en">, lang: Lang): string {
  return lang === "pl" ? t.name_pl : t.name_en;
}

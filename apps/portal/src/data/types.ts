// The data interface of the zohelo design template. Every page reads data through `data` (./index.ts):
// the dummy provider (sample data, VITE_DATA_MODE=dummy) and the live provider (the query API over the
// lakehouse) implement the same interface, so switching from sample to real data is configuration.

import type {
  CatalogDomain,
  CatalogLicence,
  CatalogSource,
  CatalogUnit,
  PublishedTopics,
  TopicEntry,
  TopicHeadline,
  TopicPeriod,
  TopicPeriodKey,
  TopicRelease,
  TopicSignals,
  TopicTrend,
  V2Aggregation,
  V2Polarity,
} from "@zohelo/semantic";

export type Frequency = "M" | "Q" | "A";
export type GeoLevel = "country" | "voivodeship";

export type Geography = { key: string; name_pl: string; name_en: string; level: GeoLevel; eu: boolean };

export type DimensionMember = { key: string; name_pl: string; name_en: string };
export type Dimension = { dimension_key: string; name_pl: string; name_en: string; members: DimensionMember[] };

export type Kpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  /** Unit of what the KPI shows by default. On live data: the unit of Poland's latest value from the preferred
   * source, because sources publish one KPI in different units (GDP in mln EUR, mln PLN, US$); each series and latest
   * value also carries its own. */
  unit_key: string;
  /** The catalogue's unit of the concept (live data), when it differs from `unit_key`. */
  catalog_unit_key?: string;
  frequency: Frequency;
  /** Domain group key, e.g. economy.prices. */
  group_key: string;
  domain_key: string;
  source_keys: string[];
  geo_levels: GeoLevel[];
  /** Geographies with data (Poland first). */
  geographies: string[];
  /** Extra breakdowns besides geography and source. */
  dimension_keys: string[];
  first_period: string;
  last_period: string;
  /** What is measured, how, coverage (published contract v2; the sample catalogue has none). */
  definition_pl?: string;
  definition_en?: string;
  /** How values combine: sum (parts add up), mean, rate, index, none. Absent in the sample catalogue, where the
   * template guesses from the unit and name. */
  aggregation?: Aggregation;
  /** Which direction of change is good; absent = the template's own list (polarity.ts). */
  polarity?: KpiPolarity;
  /** Next release date (YYYY-MM-DD) from the release calendar, or null. */
  next_release?: string | null;
};

export type Aggregation = V2Aggregation;
export type KpiPolarity = V2Polarity;

export type Catalog = {
  generated_at: string;
  sample: boolean;
  domains: CatalogDomain[];
  kpis: Kpi[];
  units: CatalogUnit[];
  sources: CatalogSource[];
  licences: CatalogLicence[];
  dimensions: Dimension[];
  geographies: Geography[];
};

export type Point = { period: string; value: number | null };

export type Series = {
  kpi_key: string;
  geography: string;
  source_key: string;
  /** Unit of this series (live data: sources differ); absent = the KPI's unit. */
  unit_key?: string;
  /** Frequency of this series when it differs from the KPI's (a source with only another frequency); absent = the
   * KPI's. Such series are returned only when their source is asked for, never mixed in silently. */
  frequency?: Frequency;
  /** Dimension member per breakdown, e.g. { sex: "f" }; empty = totals. */
  members: Record<string, string>;
  points: Point[];
};

export type SeriesQuery = {
  /** Default: Poland. */
  geographies?: string[];
  /**
   * Sources to return, one series per source (owner decision O31: every source is its own series, never mixed).
   * Default: per geography, the KPI's preferred source (first of `source_keys`) with data there at the KPI's frequency,
   * in the unit of the first geography's series when a source has it (no silent mix of units).
   */
  sources?: string[];
  /** Every source with data, in the KPI's order of preference (for comparing sources), series at another frequency
   * included (marked with `frequency`); overrides `sources`. */
  allSources?: boolean;
  /** Inclusive period bounds, e.g. "2015" or "2015-01". */
  from?: string;
  to?: string;
  /** Members to fix per dimension; a dimension named in `split` returns one series per member. */
  members?: Record<string, string>;
  split?: string;
};

export type Latest = {
  kpi_key: string;
  geography: string;
  source_key: string;
  /** Unit of this value (live data: sources differ); absent = the KPI's unit. */
  unit_key?: string;
  period: string;
  value: number;
  /** The period before; null when there is none. */
  previous_period: string | null;
  previous_value: number | null;
  /** Same period a year earlier (for monthly and quarterly KPIs). */
  year_ago_value: number | null;
  flags: string[];
  loaded_at: string;
  next_release: string | null;
};

/** One date of the release calendar (published contract v2, calendar.json). */
export type Release = { date: string; source_key: string; kpi_keys: string[]; title_pl: string; title_en: string; url: string | null };

/**
 * Hot topics (owner decision O32): what is being talked about, ranked per day, week, month, quarter and year, each
 * linked to the KPIs that measure it. Exactly the published file 06_published/v2/topics.json (zohelo-data
 * docs/published.md, "topics.json"; method in docs/topics.md); the types live with its validator in
 * @zohelo/semantic. Headlines are links with the outlet's name, never article text.
 */
export type Topics = PublishedTopics;
export type { TopicEntry, TopicHeadline, TopicPeriod, TopicPeriodKey, TopicRelease, TopicSignals, TopicTrend };

export interface DataProvider {
  readonly mode: "dummy" | "live";
  catalog(): Promise<Catalog>;
  series(kpiKey: string, query?: SeriesQuery): Promise<Series[]>;
  latest(kpiKey: string, geography?: string): Promise<Latest>;
  /** Release dates from today on, soonest first. */
  calendar(): Promise<Release[]>;
  /** Hot topics; null while topics are not switched on for the portals (the file is not published), and the UI hides them. */
  topics(): Promise<Topics | null>;
}

// --- dummy catalogue shapes (generated file) -----------------------------------------------------------

export type DummyDimension = Dimension;

export type DummyKpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  unit_key: string;
  frequency: Frequency;
  group_key: string;
  domain_key: string;
  geo: "nuts2" | "eu" | "pl";
  dims: string[];
  base: number;
  trend: number;
  noise: number;
  sources: string[];
};

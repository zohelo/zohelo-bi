// Types and validators for the published layer (06_published/v1 and v2), mirroring zohelo-data's JSON Schemas
// in warehouse/published/schemas/. The producer owns the field names: bi never adds or renames a field and
// validates exactly what the schemas declare (decision D24). v1 and topics: required properties and JSON types,
// extra properties allowed (hand-written mirror below). v2: the schemas themselves, copied byte for byte into
// packages/semantic/schemas/v2 (schemas/v2/SOURCE.md) and read by schema.ts.

import { checkSchema, type JsonSchema } from "./schema";
import calendarV2Schema from "../schemas/v2/calendar.schema.json";
import catalogV2Schema from "../schemas/v2/catalog.schema.json";
import latestV2Schema from "../schemas/v2/latest.schema.json";
import seriesV2Schema from "../schemas/v2/series.schema.json";
import statusV2Schema from "../schemas/v2/status.schema.json";

export type CatalogKpiDimension = { dimension_key: string; member_count: number; levels: string[] };

export type CatalogKpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  unit_key: string;
  frequency_default: string;
  subgroup_key: string;
  domain_path: string[];
  source_keys: string[];
  geo_levels: string[];
  first_period: string;
  last_period: string;
  dimensions: CatalogKpiDimension[];
  loaded_at: string;
  status: string;
};

export type CatalogDomain = {
  domain_key: string;
  level: string;
  parent_key: string | null;
  name_en: string;
  name_pl: string;
  csa_code: string;
  sort: number;
};

export type CatalogUnit = { unit_key: string; symbol: string; name_en: string; name_pl: string; is_rate: boolean };

export type CatalogSource = {
  source_key: string;
  name_pl: string;
  name_en: string;
  licence_key: string;
  register_id: string;
};

export type CatalogLicence = {
  licence_key: string;
  name: string;
  url: string;
  attribution_text: string;
  commercial_ok: boolean;
};

export type PublishedCatalog = {
  version: number;
  generated_at: string;
  kpis: CatalogKpi[];
  domains: CatalogDomain[];
  units: CatalogUnit[];
  sources: CatalogSource[];
  licences: CatalogLicence[];
};

export type PublishedMetricDimension = { dimension_key: string; column: string };

export type PublishedMetric = {
  kpi_key: string;
  table: string;
  unit_key: string;
  frequency: string;
  time_column: string;
  value_column: string;
  source_column: string;
  dimensions: PublishedMetricDimension[];
  default_filters?: Record<string, unknown>;
};

export type PublishedManifest = { version: number; generated_at: string; metrics: PublishedMetric[] };

export type KpiLatestValue = {
  source_key: string;
  geography_key: string;
  geography_level: string;
  period: string;
  value: number;
  previous_period?: string;
  previous_value?: number;
  flags: string[];
  checked_at: string;
};

export type KpiLatest = { kpi_key: string; unit_key: string; generated_at: string; values: KpiLatestValue[] };

// --- topics.json (06_published/v2/topics.json, zohelo-data docs/published.md "topics.json", owner decision O32)

export type TopicPeriodKey = "day" | "week" | "month" | "quarter" | "year";

/** A news headline: a link with the outlet's name, never article text. */
export type TopicHeadline = { title: string; url: string; outlet: string; lang: string; published_at: string };

/** The next official release of one of the topic's main KPIs. */
export type TopicRelease = { date: string; source_key: string; title_pl: string; title_en: string };

/**
 * The robust z-scores behind the heat ("why is this hot"). A signal the topic does not have drops out of the
 * heat formula (docs/topics.md); bi reads it as null.
 */
export type TopicSignals = { news: number | null; volume: number | null; attention: number | null };

export type TopicTrend = "up" | "down" | "flat";

export type TopicEntry = {
  topic_key: string;
  name_pl: string;
  name_en: string;
  /** Rank in the period, from 1. */
  rank: number;
  /** Heat score, 2 decimals. */
  heat: number;
  /** Against the previous window of the same length. */
  trend: TopicTrend;
  /** v2 KPI keys linked to the topic, `main` ones first; may be empty. */
  kpi_keys: string[];
  /** At most 5, newest first. */
  headlines: TopicHeadline[];
  next_release: TopicRelease | null;
  signals: TopicSignals;
};

export type TopicPeriod = { window: { from: string; to: string }; topics: TopicEntry[] };

export type PublishedTopics = { version: number; generated_at: string; periods: Record<TopicPeriodKey, TopicPeriod> };

// --- contract v2 (06_published/v2/, zohelo-data docs/published.md "Published layer contract v2") ------------------

export type V2Frequency = "M" | "Q" | "A";
/** sum: parts add up; mean: averages; rate: shares and rates; index: an index level; none: nothing to combine. */
export type V2Aggregation = "sum" | "mean" | "rate" | "index" | "none";
export type V2Polarity = "up" | "down" | "neutral";
export type V2GeoLevel = "country" | "voivodeship" | "aggregate";
export type V2Status = "draft" | "published";

export type CatalogV2Kpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  definition_pl: string;
  definition_en: string;
  unit_key: string;
  frequency: V2Frequency;
  domain_key: string;
  group_key: string;
  /** The preferred source first. */
  source_keys: string[];
  /** PL first. */
  geographies: string[];
  dimension_keys: string[];
  first_period: string;
  last_period: string;
  aggregation: V2Aggregation;
  polarity: V2Polarity;
  loaded_at: string;
  /** YYYY-MM-DD or null. */
  next_release: string | null;
  /** The concept's review status (owner decision O37): a `draft` KPI is real Gold data under the owner's review,
   * shown with a draft badge; `published` passed it. Information only: the KPI is in v2 either way. */
  status: V2Status;
};

/** A breakdown member; the total (`_T`) is never listed. */
export type CatalogV2Member = { key: string; name_pl: string; name_en: string; sort: number; parent_key?: string | null };
export type CatalogV2Dimension = { dimension_key: string; name_pl: string; name_en: string; members: CatalogV2Member[] };
export type CatalogV2Geography = { key: string; name_pl: string; name_en: string; level: V2GeoLevel; eu: boolean };
export type CatalogV2Unit = CatalogUnit & { decimals: number };
/** A taxonomy entry; v2 requires fewer columns than v1 (`csa_code` and `sort` may be absent). */
export type CatalogV2Domain = Omit<CatalogDomain, "csa_code" | "sort"> & { csa_code?: string; sort?: number };

export type PublishedCatalogV2 = {
  version: number;
  generated_at: string;
  kpis: CatalogV2Kpi[];
  dimensions: CatalogV2Dimension[];
  geographies: CatalogV2Geography[];
  units: CatalogV2Unit[];
  domains: CatalogV2Domain[];
  sources: CatalogSource[];
  licences: CatalogLicence[];
};

/** One KPI × geography, totals only. */
export type LatestV2Value = {
  kpi_key: string;
  geography: string;
  source_key: string;
  /** Unit of this value: sources publish one KPI in different units (GDP in mln EUR, mln PLN, US$). */
  unit_key: string;
  period: string;
  value: number;
  previous_period: string | null;
  previous_value: number | null;
  year_ago_value: number | null;
  flags: string[];
  checked_at: string;
};

export type PublishedLatestV2 = { version: number; generated_at: string; values: LatestV2Value[] };

/** Observation flags (contract v2): provisional, estimated, break, forecast, low reliability, definition differs,
 * not significant, confidential. */
export const V2_FLAGS = ["p", "e", "b", "f", "u", "d", "n", "c"] as const;

/**
 * One geography × source × member combination; `members` {} = totals; one value or null per period. Its own
 * `unit_key` (sources differ). `frequency`: only on a series of another frequency than the KPI's (a source that has
 * the KPI only at another frequency); its values then follow `periods_by_frequency[frequency]` of the file.
 */
export type SeriesV2Entry = {
  geography: string;
  source_key: string;
  unit_key: string;
  members: Record<string, string>;
  values: (number | null)[];
  flags?: Record<string, string>;
  frequency?: V2Frequency;
};

export type PublishedSeriesV2 = {
  kpi_key: string;
  frequency: V2Frequency;
  unit_key: string;
  periods: string[];
  /** Every period of each other frequency a series uses, sorted; never the shown frequency. */
  periods_by_frequency?: Partial<Record<V2Frequency, string[]>>;
  series: SeriesV2Entry[];
};

export type CalendarV2Release = {
  date: string;
  source_key: string;
  kpi_keys: string[];
  title_pl: string;
  title_en: string;
  url: string | null;
};

export type PublishedCalendarV2 = { version: number; generated_at: string; releases: CalendarV2Release[] };

export type StatusV2Source = {
  source_key: string;
  name_pl: string;
  name_en: string;
  last_loaded_at: string | null;
  next_expected_at: string | null;
  lag_days: number | null;
};

/** status.json (as v1, copied to v2). */
export type PublishedStatusV2 = { version: number; generated_at: string; sources: StatusV2Source[] };

// --- schema mirror ---------------------------------------------------------------------------------------

type JsonType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

type Spec = {
  type: JsonType | JsonType[];
  required?: readonly string[];
  properties?: Record<string, Spec>;
  items?: Spec;
};

const str: Spec = { type: "string" };
const int: Spec = { type: "integer" };
const num: Spec = { type: "number" };
const bool: Spec = { type: "boolean" };
const strings: Spec = { type: "array", items: str };

/** An object whose listed properties are all required, plus optional ones. */
function obj(required: Record<string, Spec>, optional: Record<string, Spec> = {}): Spec {
  return { type: "object", required: Object.keys(required), properties: { ...required, ...optional } };
}

const arrayOf = (items: Spec): Spec => ({ type: "array", items });

const catalogSpec = obj({
  version: int,
  generated_at: str,
  kpis: arrayOf(
    obj({
      kpi_key: str,
      name_pl: str,
      name_en: str,
      unit_key: str,
      frequency_default: str,
      subgroup_key: str,
      domain_path: strings,
      source_keys: strings,
      geo_levels: strings,
      first_period: str,
      last_period: str,
      dimensions: arrayOf(obj({ dimension_key: str, member_count: int, levels: strings })),
      loaded_at: str,
      status: str,
    }),
  ),
  domains: arrayOf(
    obj({
      domain_key: str,
      level: str,
      parent_key: { type: ["string", "null"] },
      name_en: str,
      name_pl: str,
      csa_code: str,
      sort: int,
    }),
  ),
  units: arrayOf(obj({ unit_key: str, symbol: str, name_en: str, name_pl: str, is_rate: bool })),
  sources: arrayOf(obj({ source_key: str, name_pl: str, name_en: str, licence_key: str, register_id: str })),
  licences: arrayOf(obj({ licence_key: str, name: str, url: str, attribution_text: str, commercial_ok: bool })),
});

const manifestSpec = obj({
  version: int,
  generated_at: str,
  metrics: arrayOf(
    obj(
      {
        kpi_key: str,
        table: str,
        unit_key: str,
        frequency: str,
        time_column: str,
        value_column: str,
        source_column: str,
        dimensions: arrayOf(obj({ dimension_key: str, column: str })),
      },
      { default_filters: { type: "object" } },
    ),
  ),
});

const kpiLatestSpec = obj({
  kpi_key: str,
  unit_key: str,
  generated_at: str,
  values: arrayOf(
    obj(
      {
        source_key: str,
        geography_key: str,
        geography_level: str,
        period: str,
        value: num,
        flags: strings,
        checked_at: str,
      },
      { previous_period: str, previous_value: num },
    ),
  ),
});

const signal: Spec = { type: ["number", "null"] };

const topicPeriodSpec = obj({
  window: obj({ from: str, to: str }),
  topics: arrayOf(
    obj({
      topic_key: str,
      name_pl: str,
      name_en: str,
      rank: int,
      heat: num,
      trend: str,
      kpi_keys: strings,
      headlines: arrayOf(obj({ title: str, url: str, outlet: str, lang: str, published_at: str })),
      next_release: { ...obj({ date: str, source_key: str, title_pl: str, title_en: str }), type: ["object", "null"] },
      signals: obj({ news: signal, volume: signal, attention: signal }),
    }),
  ),
});

const topicsSpec = obj({
  version: int,
  generated_at: str,
  periods: obj({ day: topicPeriodSpec, week: topicPeriodSpec, month: topicPeriodSpec, quarter: topicPeriodSpec, year: topicPeriodSpec }),
});

function jsonType(x: unknown): JsonType {
  if (x === null) return "null";
  if (Array.isArray(x)) return "array";
  if (typeof x === "number") return Number.isInteger(x) ? "integer" : "number";
  return typeof x as JsonType;
}

function matches(actual: JsonType, expected: JsonType): boolean {
  return actual === expected || (expected === "number" && actual === "integer");
}

function check(file: string, x: unknown, spec: Spec, path: string): void {
  const expected = Array.isArray(spec.type) ? spec.type : [spec.type];
  const actual = jsonType(x);
  if (!expected.some((t) => matches(actual, t))) {
    throw new Error(`${file}: ${path}: expected ${expected.join(" or ")}, got ${actual}`);
  }
  if (actual === "object") {
    const o = x as Record<string, unknown>;
    for (const key of spec.required ?? []) {
      if (!(key in o)) throw new Error(`${file}: ${path}.${key}: required property missing`);
    }
    for (const [key, sub] of Object.entries(spec.properties ?? {})) {
      if (key in o) check(file, o[key], sub, `${path}.${key}`);
    }
  } else if (actual === "array" && spec.items) {
    (x as unknown[]).forEach((item, i) => check(file, item, spec.items as Spec, `${path}[${i}]`));
  }
}

/** Validates 06_published/v1/catalog/catalog.json; throws Error('<file>: <json path>: <problem>'). */
export function validateCatalog(x: unknown): PublishedCatalog {
  check("catalog/catalog.json", x, catalogSpec, "$");
  return x as PublishedCatalog;
}

/** Validates 06_published/v1/manifest.json; throws Error('<file>: <json path>: <problem>'). */
export function validateManifest(x: unknown): PublishedManifest {
  check("manifest.json", x, manifestSpec, "$");
  return x as PublishedManifest;
}

/** Validates 06_published/v1/kpi/<kpi_key>/latest.json; throws Error('<file>: <json path>: <problem>'). */
export function validateKpiLatest(x: unknown): KpiLatest {
  check("kpi/<kpi_key>/latest.json", x, kpiLatestSpec, "$");
  return x as KpiLatest;
}

const TRENDS: readonly string[] = ["up", "down", "flat"];

/**
 * Validates 06_published/v2/topics.json; throws Error('<file>: <json path>: <problem>'). Besides the JSON types it
 * checks the two things the portal relies on for safety: trend is one of up/down/flat, and every headline link is
 * http(s) (a headline is rendered as an outbound link).
 */
export function validateTopics(x: unknown): PublishedTopics {
  check("topics.json", x, topicsSpec, "$");
  const t = x as PublishedTopics;
  for (const [p, period] of Object.entries(t.periods))
    period.topics.forEach((topic, i) => {
      const at = `$.periods.${p}.topics[${i}]`;
      if (!TRENDS.includes(topic.trend)) throw new Error(`topics.json: ${at}.trend: expected up, down or flat, got ${topic.trend}`);
      topic.headlines.forEach((h, j) => {
        if (!/^https?:\/\//i.test(h.url)) throw new Error(`topics.json: ${at}.headlines[${j}].url: expected an http(s) link`);
      });
    });
  return t;
}

/**
 * Validates 06_published/v2/catalog.json against zohelo-data's schema (schemas/v2/catalog.schema.json, copied):
 * every required field, JSON type, closed vocabulary (frequency, aggregation, polarity, status, geography level) and
 * key pattern. Throws Error('<file>: <json path>: <problem>').
 */
export function validateCatalogV2(x: unknown): PublishedCatalogV2 {
  checkSchema("catalog.json", x, catalogV2Schema as JsonSchema);
  return x as PublishedCatalogV2;
}

/** Validates 06_published/v2/latest.json against schemas/v2/latest.schema.json; throws Error('<file>: <json path>: <problem>'). */
export function validateLatestV2(x: unknown): PublishedLatestV2 {
  checkSchema("latest.json", x, latestV2Schema as JsonSchema);
  return x as PublishedLatestV2;
}

/** The periods a series' values follow: `periods_by_frequency[frequency]` for a series with its own frequency, else `periods`. */
export function seriesPeriods(
  file: Pick<PublishedSeriesV2, "periods" | "periods_by_frequency">,
  one: Pick<SeriesV2Entry, "frequency">,
): string[] | undefined {
  return one.frequency === undefined ? file.periods : file.periods_by_frequency?.[one.frequency];
}

/**
 * Validates 06_published/v2/kpi/<kpi_key>/series.json against schemas/v2/series.schema.json, and the reader rule of
 * the contract: one value per period, the periods of a series with its own `frequency` being
 * `periods_by_frequency[frequency]`.
 */
export function validateSeriesV2(x: unknown): PublishedSeriesV2 {
  const file = "kpi/<kpi_key>/series.json";
  checkSchema(file, x, seriesV2Schema as JsonSchema);
  const s = x as PublishedSeriesV2;
  s.series.forEach((one, i) => {
    const periods = seriesPeriods(s, one);
    if (!periods)
      throw new Error(`${file}: $.periods_by_frequency.${one.frequency}: missing, but $.series[${i}] has frequency ${one.frequency}`);
    if (one.values.length !== periods.length)
      throw new Error(`${file}: $.series[${i}].values: expected ${periods.length} values (one per period), got ${one.values.length}`);
  });
  return s;
}

/** Validates 06_published/v2/status.json against schemas/v2/status.schema.json; throws Error('<file>: <json path>: <problem>'). */
export function validateStatusV2(x: unknown): PublishedStatusV2 {
  checkSchema("status.json", x, statusV2Schema as JsonSchema);
  return x as PublishedStatusV2;
}

/** Validates 06_published/v2/calendar.json against schemas/v2/calendar.schema.json; throws Error('<file>: <json path>: <problem>'). */
export function validateCalendarV2(x: unknown): PublishedCalendarV2 {
  checkSchema("calendar.json", x, calendarV2Schema as JsonSchema);
  return x as PublishedCalendarV2;
}

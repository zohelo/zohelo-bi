// The data interface of the zohelo design template. Every page reads data through `data` (./index.ts):
// the dummy provider (sample data, VITE_DATA_MODE=dummy) and the live provider (the query API over the
// lakehouse) implement the same interface, so switching from sample to real data is configuration.

import type { CatalogDomain, CatalogLicence, CatalogSource, CatalogUnit } from "@zohelo/semantic";

export type Frequency = "M" | "Q" | "A";
export type GeoLevel = "country" | "voivodeship";

export type Geography = { key: string; name_pl: string; name_en: string; level: GeoLevel; eu: boolean };

export type DimensionMember = { key: string; name_pl: string; name_en: string };
export type Dimension = { dimension_key: string; name_pl: string; name_en: string; members: DimensionMember[] };

export type Kpi = {
  kpi_key: string;
  name_pl: string;
  name_en: string;
  unit_key: string;
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
};

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
  /** Dimension member per breakdown, e.g. { sex: "f" }; empty = totals. */
  members: Record<string, string>;
  points: Point[];
};

export type SeriesQuery = {
  geographies?: string[];
  sources?: string[];
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
  period: string;
  value: number;
  previous_period: string;
  previous_value: number;
  /** Same period a year earlier (for monthly and quarterly KPIs). */
  year_ago_value: number | null;
  flags: string[];
  loaded_at: string;
  next_release: string | null;
};

export interface DataProvider {
  readonly mode: "dummy" | "live";
  catalog(): Promise<Catalog>;
  series(kpiKey: string, query?: SeriesQuery): Promise<Series[]>;
  latest(kpiKey: string, geography?: string): Promise<Latest>;
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

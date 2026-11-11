// Live data provider: the same interface as the dummy provider, over the published contract v2 (zohelo-data
// docs/published.md, "Published layer contract v2"), read through the query API (functions/api,
// /api/published/v2/…). The contract maps one to one onto the data interface (types.ts):
//   catalog.json            → catalog(): KPIs with definition, frequency, geographies, dimensions with members,
//                             aggregation, polarity, next release and sources (preferred first)
//   latest.json             → latest(): one file for every KPI × geography (year-ago value, next release)
//   kpi/<key>/series.json   → series(): columnar periods × series, one series per geography × source × members
//   calendar.json           → calendar()
// Two things the template expects and the contract writes differently: a breakdown's total is the member "total"
// here (the contract leaves the dimension out of `members`), and the EU-27 aggregate is shown beside the countries.
// Only KPIs that zohelo-data publishes in v2 exist here; a dashboard card naming another KPI shows "no data".

import type { PublishedCatalogV2, PublishedSeriesV2 } from "@zohelo/semantic";
import { api, ApiError } from "../api";
import { rememberPolarity } from "../tpl/polarity";
import type {
  Catalog,
  DataProvider,
  Dimension,
  GeoLevel,
  Geography,
  Kpi,
  Latest,
  Point,
  Release,
  Series,
  SeriesQuery,
  Topics,
} from "./types";

/** The template's name for a breakdown's total; the contract leaves the dimension out instead. */
const TOTAL = "total";
const TOTAL_MEMBER = { key: TOTAL, name_pl: "ogółem", name_en: "total" };

const levelOf = (level: string): GeoLevel => (level === "voivodeship" ? "voivodeship" : "country");

/** Contract v2 catalog.json → the template's Catalog. */
export function mapCatalog(c: PublishedCatalogV2): Catalog {
  const geographies: Geography[] = c.geographies.map((g) => ({
    key: g.key,
    name_pl: g.name_pl,
    name_en: g.name_en,
    level: levelOf(g.level),
    eu: g.eu,
  }));
  const level = new Map(geographies.map((g) => [g.key, g.level]));
  const dimensions: Dimension[] = c.dimensions.map((d) => ({
    dimension_key: d.dimension_key,
    name_pl: d.name_pl,
    name_en: d.name_en,
    members: [
      TOTAL_MEMBER,
      ...[...d.members].sort((a, b) => a.sort - b.sort).map((m) => ({ key: m.key, name_pl: m.name_pl, name_en: m.name_en })),
    ],
  }));
  const kpis: Kpi[] = c.kpis.map((k) => {
    const levels = new Set(k.geographies.map((g) => level.get(g) ?? "country"));
    return {
      kpi_key: k.kpi_key,
      name_pl: k.name_pl,
      name_en: k.name_en,
      definition_pl: k.definition_pl,
      definition_en: k.definition_en,
      unit_key: k.unit_key,
      frequency: k.frequency,
      group_key: k.group_key,
      domain_key: k.domain_key,
      source_keys: k.source_keys,
      geo_levels: (["country", "voivodeship"] as const).filter((l) => levels.has(l)),
      geographies: k.geographies,
      dimension_keys: k.dimension_keys,
      first_period: k.first_period,
      last_period: k.last_period,
      aggregation: k.aggregation,
      polarity: k.polarity,
      next_release: k.next_release,
    };
  });
  return {
    generated_at: c.generated_at,
    sample: false,
    domains: c.domains,
    kpis,
    units: c.units,
    sources: c.sources,
    licences: c.licences,
    dimensions,
    geographies,
  };
}

/** Points of one columnar series inside the window, without the empty (null) stretches at either end. */
function pointsOf(periods: string[], values: (number | null)[], from?: string, to?: string): Point[] {
  const pts: Point[] = [];
  periods.forEach((period, i) => {
    if (from && period < from) return;
    if (to && period.slice(0, to.length) > to) return;
    pts.push({ period, value: values[i] ?? null });
  });
  let a = 0;
  let b = pts.length;
  while (a < b && pts[a]!.value === null) a++;
  while (b > a && pts[b - 1]!.value === null) b--;
  return pts.slice(a, b);
}

/**
 * The series a query asks for, from a KPI's series.json. One series per geography × source × members (owner
 * decision O31). Sources: `allSources` → every source with data; `sources` → those; default → per geography the
 * KPI's preferred source that has data there. Members: fixed per dimension (default the total), or one series per
 * member of the `split` dimension, in the catalogue's order.
 */
export function selectSeries(file: PublishedSeriesV2, kpi: Kpi, cat: Pick<Catalog, "dimensions">, q: SeriesQuery = {}): Series[] {
  const dims = kpi.dimension_keys;
  const memberOf = (m: Record<string, string>, d: string) => m[d] ?? TOTAL;
  const base: Record<string, string> = Object.fromEntries(dims.map((d) => [d, q.members?.[d] ?? TOTAL]));
  const split = q.split && dims.includes(q.split) ? q.split : undefined;
  const order = split ? (cat.dimensions.find((d) => d.dimension_key === split)?.members.map((m) => m.key) ?? []) : [];
  const wanted = (m: Record<string, string>) => dims.every((d) => (d === split ? memberOf(m, d) !== TOTAL : memberOf(m, d) === base[d]));
  const rank = (m: Record<string, string>) => (split ? order.indexOf(memberOf(m, split)) : 0);
  const sourceRank = (s: string) => {
    const i = kpi.source_keys.indexOf(s);
    return i < 0 ? kpi.source_keys.length : i;
  };

  const out: Series[] = [];
  for (const geo of q.geographies?.length ? q.geographies : ["PL"]) {
    const here = file.series
      .filter((s) => s.geography === geo && wanted(s.members))
      .map((s) => ({ s, points: pointsOf(file.periods, s.values, q.from, q.to) }))
      .filter((x) => x.points.length);
    const has = [...new Set(here.map((x) => x.s.source_key))].sort((a, b) => sourceRank(a) - sourceRank(b));
    const sources = q.allSources ? has : q.sources?.length ? q.sources.filter((s) => has.includes(s)) : has.slice(0, 1);
    for (const source of sources)
      for (const { s, points } of here.filter((x) => x.s.source_key === source).sort((a, b) => rank(a.s.members) - rank(b.s.members)))
        out.push({
          kpi_key: kpi.kpi_key,
          geography: geo,
          source_key: source,
          members: Object.fromEntries(dims.map((d) => [d, memberOf(s.members, d)])),
          points,
        });
  }
  return out;
}

async function catalog(): Promise<Catalog> {
  const cat = mapCatalog(await api.catalogV2());
  // Published polarity replaces the template's own list (KPI cards colour changes from it).
  rememberPolarity(cat.kpis);
  return cat;
}

async function kpiOf(kpiKey: string): Promise<Kpi> {
  const k = (await catalog()).kpis.find((x) => x.kpi_key === kpiKey);
  if (!k) throw new Error(`Nieznany wskaźnik: ${kpiKey}`);
  return k;
}

export const live: DataProvider = {
  mode: "live",
  catalog,
  async series(kpiKey: string, q: SeriesQuery = {}): Promise<Series[]> {
    const [cat, file] = await Promise.all([catalog(), api.seriesV2(kpiKey)]);
    const kpi = cat.kpis.find((k) => k.kpi_key === kpiKey);
    if (!kpi) throw new Error(`Nieznany wskaźnik: ${kpiKey}`);
    return selectSeries(file, kpi, cat, q);
  },
  async latest(kpiKey: string, geography = "PL"): Promise<Latest> {
    const [kpi, file] = await Promise.all([kpiOf(kpiKey), api.latestV2()]);
    const v = file.values.find((x) => x.kpi_key === kpiKey && x.geography === geography);
    if (!v) throw new Error(`Brak danych: ${kpiKey}, ${geography}`);
    return {
      kpi_key: kpiKey,
      geography,
      source_key: v.source_key,
      period: v.period,
      value: v.value,
      previous_period: v.previous_period,
      previous_value: v.previous_value,
      year_ago_value: v.year_ago_value,
      flags: v.flags,
      loaded_at: v.checked_at,
      next_release: kpi.next_release ?? null,
    };
  },
  async calendar(): Promise<Release[]> {
    try {
      return (await api.calendarV2()).releases.map((r) => ({ ...r }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [];
      throw e;
    }
  },
  async topics(): Promise<Topics | null> {
    // topics.json is written only once the owner switches topics on (zohelo-data warehouse.yaml, topics.publish);
    // until then the API answers 404 and the portal hides the section.
    try {
      return await api.publishedTopics();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
};

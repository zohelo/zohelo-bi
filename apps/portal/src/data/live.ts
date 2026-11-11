// Live data provider: the same interface as the dummy provider, over the published contract v2 (zohelo-data
// docs/published.md, "Published layer contract v2"), read through the query API (functions/api,
// /api/published/v2/…). The contract maps one to one onto the data interface (types.ts):
//   catalog.json            → catalog(): KPIs with definition, frequency, geographies, dimensions with members,
//                             aggregation, polarity, next release and sources (preferred first)
//   latest.json             → latest(): one file for every KPI × geography (year-ago value, next release)
//   kpi/<key>/series.json   → series(): columnar periods × series, one series per geography × source × members
//   calendar.json           → calendar()
// Things the template expects and the contract writes differently: a breakdown's total is the member "total" here
// (the contract leaves the dimension out of `members`); the EU-27 aggregate is shown beside the countries; a KPI is
// labelled with the unit of what it shows by default (Poland's latest value, preferred source), since every series
// and latest value carries its own unit (sources publish GDP in mln EUR, mln PLN, US$). A series at another frequency
// than the KPI's (planned in the contract) is returned only when its source is asked for, marked with `frequency`.
// Only KPIs that zohelo-data publishes in v2 exist here; a dashboard card naming another KPI shows "no data".

import type { PublishedCatalogV2, PublishedLatestV2, PublishedSeriesV2 } from "@zohelo/semantic";
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

/** Contract v2 catalog.json (and latest.json, for the unit each KPI shows by default) → the template's Catalog. */
export function mapCatalog(c: PublishedCatalogV2, latest?: PublishedLatestV2): Catalog {
  const shownUnit = new Map((latest?.values ?? []).filter((v) => v.geography === "PL").map((v) => [v.kpi_key, v.unit_key]));
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
    const unit = shownUnit.get(k.kpi_key) ?? k.unit_key;
    return {
      kpi_key: k.kpi_key,
      name_pl: k.name_pl,
      name_en: k.name_en,
      definition_pl: k.definition_pl,
      definition_en: k.definition_en,
      unit_key: unit,
      ...(unit !== k.unit_key ? { catalog_unit_key: k.unit_key } : {}),
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
    // v2 may leave out csa_code and sort: the template sorts domains by `sort`, so the published order stands in.
    domains: c.domains.map((d, i) => ({ ...d, csa_code: d.csa_code ?? "", sort: d.sort ?? i + 1 })),
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
 * decision O31), each with its unit. Sources: `allSources` → every source with data; `sources` → those; default →
 * per geography the KPI's preferred source with data there at the KPI's frequency, preferring the unit of the first
 * geography's series so one chart does not mix units silently. A series at another frequency (its own `frequency`
 * and `periods`) is never a default. Members: fixed per dimension (default the total), or one series per member of
 * the `split` dimension, in the catalogue's order.
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
  const byRank = (a: string, b: string) => sourceRank(a) - sourceRank(b);

  const out: Series[] = [];
  let anchorUnit: string | undefined;
  for (const geo of q.geographies?.length ? q.geographies : ["PL"]) {
    const here = file.series
      .filter((s) => s.geography === geo && wanted(s.members))
      .map((s) => ({
        s,
        native: (s.frequency ?? file.frequency) === kpi.frequency,
        points: pointsOf(s.periods ?? file.periods, s.values, q.from, q.to),
      }))
      .filter((x) => x.points.length);
    const has = [...new Set(here.map((x) => x.s.source_key))].sort(byRank);
    let sources: string[];
    if (q.allSources) sources = has;
    else if (q.sources?.length) sources = q.sources.filter((s) => has.includes(s));
    else {
      const native = here.filter((x) => x.native).sort((a, b) => byRank(a.s.source_key, b.s.source_key));
      const pick = native.find((x) => anchorUnit !== undefined && x.s.unit_key === anchorUnit) ?? native[0];
      sources = pick ? [pick.s.source_key] : [];
      if (pick && anchorUnit === undefined) anchorUnit = pick.s.unit_key;
    }
    for (const source of sources)
      for (const { s, native, points } of here
        .filter((x) => x.s.source_key === source)
        .sort((a, b) => rank(a.s.members) - rank(b.s.members)))
        out.push({
          kpi_key: kpi.kpi_key,
          geography: geo,
          source_key: source,
          unit_key: s.unit_key,
          ...(native ? {} : { frequency: s.frequency }),
          members: Object.fromEntries(dims.map((d) => [d, memberOf(s.members, d)])),
          points,
        });
  }
  return out;
}

async function catalog(): Promise<Catalog> {
  const [c, latest] = await Promise.all([api.catalogV2(), api.latestV2().catch(() => undefined)]);
  const cat = mapCatalog(c, latest);
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
      unit_key: v.unit_key,
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

// Live data provider: the same interface as the dummy provider, over the query API (functions/api) and the
// published layer. The catalogue and latest values come from the published layer; series come from the
// metric endpoints, keyed by KPI (the published manifest maps a KPI to its table).
// Note: only KPIs that zohelo-data publishes exist here; dashboards that name a KPI the published catalogue
// lacks show the chart card's "no data" state.

import { api, ApiError } from "../api";
import type { Catalog, DataProvider, Frequency, GeoLevel, Latest, Series, SeriesQuery, Topics } from "./types";
import { GEOGRAPHIES } from "./geographies";

const FREQ: Record<string, Frequency> = { monthly: "M", quarterly: "Q", annual: "A", M: "M", Q: "Q", A: "A" };

export const live: DataProvider = {
  mode: "live",
  async catalog(): Promise<Catalog> {
    const c = await api.publishedCatalog();
    return {
      generated_at: c.generated_at,
      sample: false,
      domains: c.domains,
      kpis: c.kpis.map((k) => {
        const group = c.domains.find((d) => d.domain_key === k.subgroup_key);
        const groupKey = group?.level === "subgroup" ? (group.parent_key ?? k.subgroup_key) : k.subgroup_key;
        return {
          kpi_key: k.kpi_key,
          name_pl: k.name_pl,
          name_en: k.name_en,
          unit_key: k.unit_key,
          frequency: FREQ[k.frequency_default] ?? "A",
          group_key: groupKey,
          domain_key: groupKey.split(".")[0] ?? groupKey,
          source_keys: k.source_keys,
          geo_levels: k.geo_levels.filter((l): l is GeoLevel => l === "country" || l === "voivodeship"),
          geographies: ["PL"],
          dimension_keys: k.dimensions.map((d) => d.dimension_key).filter((d) => d !== "geography" && d !== "time"),
          first_period: k.first_period,
          last_period: k.last_period,
        };
      }),
      units: c.units,
      sources: c.sources,
      licences: c.licences,
      dimensions: [],
      geographies: GEOGRAPHIES,
    };
  },
  async series(kpiKey: string, q: SeriesQuery = {}): Promise<Series[]> {
    const filters: Record<string, string[]> = {};
    if (q.sources?.length) filters.source_system = q.sources;
    const geos = q.geographies?.length ? q.geographies : ["PL"];
    const names = geos.map((g) => GEOGRAPHIES.find((x) => x.key === g)?.name_pl ?? g);
    filters.geography_name = names;
    const rows = await api.series(kpiKey, filters);
    const groups = new Map<string, Series>();
    for (const r of rows) {
      if (q.from && r.date_key < q.from) continue;
      if (q.to && r.date_key.slice(0, q.to.length) > q.to) continue;
      const geo = GEOGRAPHIES.find((g) => g.name_pl === r.geography_name)?.key ?? r.geography_name ?? "PL";
      const id = `${geo}|${r.source_system}`;
      let s = groups.get(id);
      if (!s) groups.set(id, (s = { kpi_key: kpiKey, geography: geo, source_key: r.source_system, members: {}, points: [] }));
      s.points.push({ period: r.date_key, value: r.value });
    }
    return [...groups.values()];
  },
  async latest(kpiKey: string, geography = "PL"): Promise<Latest> {
    const l = await api.kpiLatest(kpiKey);
    const v = l.values.find((x) => x.geography_key === geography) ?? l.values[0];
    if (!v) throw new Error(`Brak danych: ${kpiKey}`);
    return {
      kpi_key: kpiKey,
      geography,
      source_key: v.source_key,
      period: v.period,
      value: v.value,
      previous_period: v.previous_period ?? v.period,
      previous_value: v.previous_value ?? v.value,
      year_ago_value: null,
      flags: v.flags,
      loaded_at: v.checked_at,
      next_release: null,
    };
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

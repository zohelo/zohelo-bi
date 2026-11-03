// Dashboard filter state lives in the URL (?period=5y&geo=PL14&level=voivodeship&source=eurostat&sex=f), so a
// link reproduces the view. Only the filters a page declares are read; unknown values are ignored.

import type { Catalog, GeoLevel, Kpi } from "../../data";
import { V3_FILTERS, type V3KpiTile, type V3Section } from "@zohelo/semantic";

export type PeriodChoice = "1y" | "5y" | "10y" | "max";
export const PERIOD_CHOICES: PeriodChoice[] = ["1y", "5y", "10y", "max"];

export type DashState = {
  period?: PeriodChoice;
  geo?: string;
  level?: GeoLevel;
  source?: string;
  /** Fixed dimension members, e.g. { sex: "f" }. */
  members: Record<string, string>;
};

/** URL parameter of each filter. */
export function paramOf(filter: string): string {
  return filter === "geography" ? "geo" : filter === "geo_level" ? "level" : filter;
}

export function readState(params: URLSearchParams, filters: string[], cat: Catalog | undefined): DashState {
  const s: DashState = { members: {} };
  for (const f of filters) {
    const v = params.get(paramOf(f));
    if (!v) continue;
    if (f === "period") {
      if ((PERIOD_CHOICES as string[]).includes(v)) s.period = v as PeriodChoice;
    } else if (f === "geography") {
      if (!cat || cat.geographies.some((g) => g.key === v)) s.geo = v;
    } else if (f === "geo_level") {
      if (v === "country" || v === "voivodeship") s.level = v;
    } else if (f === "source") {
      if (!cat || cat.sources.some((x) => x.source_key === v)) s.source = v;
    } else {
      const dim = cat?.dimensions.find((d) => d.dimension_key === f);
      if (!cat || dim?.members.some((m) => m.key === v)) if (v !== "total") s.members[f] = v;
    }
  }
  return s;
}

/** The URL with one filter set (value) or cleared (null); other parameters are kept. */
export function withFilter(url: URL, filter: string, value: string | null): string {
  const u = new URL(url.href);
  if (value === null || value === "") u.searchParams.delete(paramOf(filter));
  else u.searchParams.set(paramOf(filter), value);
  return u.pathname + (u.search ? u.search : "") + u.hash;
}

/** Every KPI a page names (tiles, cards, compare lists), in order, without repeats. */
export function pageKpiKeys(tiles: V3KpiTile[], sections: V3Section[] | undefined): string[] {
  const keys = [
    ...tiles.map((t) => (typeof t === "string" ? t : t.kpi)),
    ...(sections ?? []).flatMap((s) => s.cards.flatMap((c) => [c.kpi, ...(c.compare ?? [])])),
  ];
  return [...new Set(keys)];
}

export type FilterOption = { value: string; label_pl: string; label_en: string; group?: "pl" | "voivodeship" | "country" };

/** Options of a select filter from the page's KPIs; the first option is the default (value ""). */
export function filterOptions(filter: string, kpis: Kpi[], cat: Catalog): FilterOption[] {
  if (filter === "geography") {
    const keys = new Set(kpis.flatMap((k) => k.geographies));
    return cat.geographies
      .filter((g) => keys.has(g.key))
      .map((g) => ({
        value: g.key === "PL" ? "" : g.key,
        label_pl: g.name_pl,
        label_en: g.name_en,
        group: g.key === "PL" ? "pl" : g.level === "voivodeship" ? "voivodeship" : "country",
      }));
  }
  if (filter === "geo_level") {
    const levels = new Set(kpis.flatMap((k) => k.geo_levels));
    return [
      { value: "", label_pl: "domyślny", label_en: "default" },
      ...(levels.has("voivodeship") ? [{ value: "voivodeship", label_pl: "województwa", label_en: "voivodeships" }] : []),
      { value: "country", label_pl: "kraje UE", label_en: "EU countries" },
    ];
  }
  if (filter === "source") {
    const keys = new Set(kpis.flatMap((k) => k.source_keys));
    return [
      { value: "", label_pl: "podstawowe", label_en: "primary" },
      ...cat.sources.filter((s) => keys.has(s.source_key)).map((s) => ({ value: s.source_key, label_pl: s.name_pl, label_en: s.name_en })),
    ];
  }
  const dim = cat.dimensions.find((d) => d.dimension_key === filter);
  return (dim?.members ?? []).map((m) => ({ value: m.key === "total" ? "" : m.key, label_pl: m.name_pl, label_en: m.name_en }));
}

/** Filter label (the button's name). */
export function filterLabel(filter: string, cat: Catalog | undefined, pl: boolean): string {
  const fixed: Record<(typeof V3_FILTERS)[number], [string, string]> = {
    period: ["Okres", "Period"],
    geography: ["Obszar", "Area"],
    geo_level: ["Poziom", "Level"],
    source: ["Źródło", "Source"],
  };
  if (filter in fixed) return fixed[filter as keyof typeof fixed][pl ? 0 : 1];
  const d = cat?.dimensions.find((x) => x.dimension_key === filter);
  return d ? (pl ? d.name_pl : d.name_en) : filter;
}

// Bridges the data layer and the chart library: data Series → ZChart series, units, tables.

import type { Lang } from "../i18n";
import type { Catalog, Kpi, Series } from "../data";
import type { ZSeries, ZUnit } from "@zohelo/visuals";
import { decimalsFor, fmtPeriod } from "./format";

export function zUnit(cat: Catalog | undefined, unitKey: string, sample = 1): ZUnit {
  const u = cat?.units.find((x) => x.unit_key === unitKey);
  return { symbol: u?.symbol ?? "", isRate: u?.is_rate ?? false, decimals: decimalsFor(unitKey, sample) };
}

export function geoName(cat: Catalog | undefined, key: string, lang: Lang): string {
  const g = cat?.geographies.find((x) => x.key === key);
  return g ? (lang === "pl" ? g.name_pl : g.name_en) : key;
}

export function memberName(cat: Catalog | undefined, dim: string, key: string, lang: Lang): string {
  const m = cat?.dimensions.find((d) => d.dimension_key === dim)?.members.find((x) => x.key === key);
  return m ? (lang === "pl" ? m.name_pl : m.name_en) : key;
}

export function sourceName(cat: Catalog | undefined, key: string, lang: Lang): string {
  const s = cat?.sources.find((x) => x.source_key === key);
  return s ? (lang === "pl" ? s.name_pl : s.name_en) : key;
}

export function kpiName(k: Pick<Kpi, "name_pl" | "name_en">, lang: Lang): string {
  return lang === "pl" ? k.name_pl : k.name_en;
}

/** One ZSeries per data series; label from what differs (geography, member or source). Poland is the hero. */
export function toZSeries(series: Series[], cat: Catalog | undefined, lang: Lang, opts: { hero?: string } = {}): ZSeries[] {
  const geos = new Set(series.map((s) => s.geography));
  const sources = new Set(series.map((s) => s.source_key));
  const hero = opts.hero ?? "PL";
  return series.map((s) => {
    const member = Object.entries(s.members).find(([, m]) => m !== "total");
    const parts: string[] = [];
    if (geos.size > 1 || (!member && sources.size <= 1)) parts.push(geoName(cat, s.geography, lang));
    if (member) parts.push(memberName(cat, member[0], member[1], lang));
    if (sources.size > 1) parts.push(sourceName(cat, s.source_key, lang));
    const id = [s.geography, s.source_key, member?.[1]].filter(Boolean).join("|");
    return {
      id,
      label: parts.join(" · ") || geoName(cat, s.geography, lang),
      role: geos.size > 1 ? (s.geography === hero ? "hero" : "context") : "series",
      points: s.points.map((p) => ({ x: p.period, y: p.value })),
    };
  });
}

export function periodFormatter(lang: Lang) {
  return (p: string) => fmtPeriod(p, lang);
}

/**
 * The KPI labelled with its series' unit when every series of it carries one unit other than the KPI's (live data:
 * a picked source that publishes in another unit, e.g. GDP in mln PLN instead of mln EUR); else the KPI as it is.
 * Mixed units are left alone (the explorer notes them).
 */
export function relabelKpi<K extends Pick<Kpi, "kpi_key" | "unit_key">>(kpi: K, series: Pick<Series, "kpi_key" | "unit_key">[]): K {
  const units = new Set(series.filter((s) => s.kpi_key === kpi.kpi_key).map((s) => s.unit_key ?? kpi.unit_key));
  const [only] = units;
  return units.size === 1 && only !== kpi.unit_key ? { ...kpi, unit_key: only! } : kpi;
}

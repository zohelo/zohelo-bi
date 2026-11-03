// ZChartData builders shared by the explorer and the indicator page: ranked bars and the voivodeship tile
// map from one value per category, plus formatters bound to an indicator's unit.

import type { Lang } from "../../i18n";
import type { Catalog, Kpi, Series } from "../../data";
import type { ZCategory, ZChartData, ZSeries } from "@zohelo/visuals";
import { geoName, zUnit } from "../chartData";
import { fmtPeriod, fmtValue } from "../format";
import { lastPoint } from "./findings";
import { VOIV_SHORT, voivodeshipKeys } from "./kpiInfo";

export type Fmt = { value: (v: number) => string; period: (p: string) => string };

export function fmtFor(cat: Catalog, k: Kpi, lang: Lang): Fmt {
  return { value: (v) => fmtValue(v, k.unit_key, cat, lang), period: (p) => fmtPeriod(p, lang) };
}

export type Ranked = { key: string; label: string; period: string; value: number };

/** Last valued point of each data series, labelled by geography, high to low. */
export function rankGeos(series: Series[], cat: Catalog, lang: Lang): Ranked[] {
  return series
    .map((s) => ({ s, p: lastPoint(s.points.map((q) => ({ x: q.period, y: q.value }))) }))
    .filter((r) => !!r.p)
    .map((r) => ({ key: r.s.geography, label: geoName(cat, r.s.geography, lang), period: r.p!.x, value: r.p!.y }))
    .sort((a, b) => b.value - a.value);
}

/** Ranked bars: one series, one point per category, highest first. */
export function rankedBars(
  rows: Ranked[],
  base: {
    unit: ZChartData["unit"];
    lang: Lang;
    ariaLabel: string;
    highlight?: string;
    reference?: ZChartData["reference"];
    seriesLabel: string;
  },
): ZChartData {
  return {
    type: "ranked-bars",
    categories: rows.map((r) => ({ key: r.key, label: r.label })),
    series: [{ id: "value", label: base.seriesLabel, points: rows.map((r) => ({ x: r.key, y: r.value })) }],
    unit: base.unit,
    lang: base.lang,
    ariaLabel: base.ariaLabel,
    highlight: base.highlight,
    reference: base.reference,
  };
}

export function voivCategories(cat: Catalog, lang: Lang): ZCategory[] {
  return voivodeshipKeys(cat).map((g) => ({ key: g, label: geoName(cat, g, lang), short: VOIV_SHORT[g] }));
}

export function tileMap(
  rows: Ranked[],
  cat: Catalog,
  base: { unit: ZChartData["unit"]; lang: Lang; ariaLabel: string; highlight?: string; seriesLabel: string },
): ZChartData {
  const v = new Set(voivodeshipKeys(cat));
  return {
    type: "tile-map",
    categories: voivCategories(cat, base.lang),
    series: [{ id: "value", label: base.seriesLabel, points: rows.filter((r) => v.has(r.key)).map((r) => ({ x: r.key, y: r.value })) }],
    unit: base.unit,
    lang: base.lang,
    ariaLabel: base.ariaLabel,
    highlight: base.highlight,
  };
}

export function unitFor(cat: Catalog, k: Kpi, series: ZSeries[] | Ranked[]): ZChartData["unit"] {
  const first = series[0];
  const sample = !first ? 1 : "value" in first ? first.value : (lastPoint(first.points)?.y ?? 1);
  return zUnit(cat, k.unit_key, sample);
}

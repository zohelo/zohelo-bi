// Pure helpers of the indicator page: dates, target band, related indicators and the citation text.

import type { Lang } from "../../i18n";
import type { Catalog, Kpi } from "../../data";
import { kpiName, sourceName } from "../chartData";
import { registerId } from "./sources";

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24 paź 2026" from an ISO date or timestamp. */
export function fmtDate(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${(lang === "pl" ? MONTHS_PL : MONTHS_EN)[Number(m[2]) - 1]} ${m[1]}`;
}

/** Target band where one is meaningful (NBP inflation target 2,5% ± 1 pp for consumer-price rates). */
export function bandFor(k: Kpi): [number, number] | undefined {
  return /hicp|cpi|inflation/.test(k.kpi_key) && k.unit_key === "pct" ? [1.5, 3.5] : undefined;
}

/** Same group first, then same domain; at most four. */
export function relatedKpis(cat: Catalog, kpi: Kpi): Kpi[] {
  const same = cat.kpis.filter((k) => k.group_key === kpi.group_key && k.kpi_key !== kpi.kpi_key);
  const dom = cat.kpis.filter((k) => k.domain_key === kpi.domain_key && k.group_key !== kpi.group_key);
  return [...same, ...dom].slice(0, 4);
}

export function citationText(cat: Catalog, kpi: Kpi, lang: Lang, today = new Date()): string {
  const pl = lang === "pl";
  const src = kpi.source_keys[0]!;
  const date = fmtDate(today.toISOString(), lang);
  return `${kpiName(kpi, lang)}, ${sourceName(cat, src, lang)} (${registerId(cat, src)}), via zohelo bi, ${pl ? "dostęp" : "accessed"} ${date}, bi.zohelo.com/kpi/${kpi.kpi_key}${cat.sample ? (pl ? " [dane przykładowe]" : " [sample data]") : ""}`;
}

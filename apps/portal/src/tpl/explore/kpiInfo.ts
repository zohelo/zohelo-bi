// Facts about one indicator derived from the catalogue: geographic scope, coverage text, series length,
// and the names used in breadcrumbs and rows. Pure functions shared by the catalogue, explorer and indicator.

import type { Lang } from "../../i18n";
import type { Catalog, Frequency, Kpi } from "../../data";
import { freqLabel } from "../format";

export type Scope = "voiv" | "eu" | "pl";
export const SCOPES: Scope[] = ["voiv", "eu", "pl"];

export function hasVoivodeships(k: Kpi): boolean {
  return k.geo_levels.includes("voivodeship");
}

/** Countries besides Poland (EU members and the EU-27 aggregate) with data. */
export function euGeographies(k: Kpi, cat: Catalog): string[] {
  const eu = new Set(cat.geographies.filter((g) => g.level === "country" && g.eu && g.key !== "PL").map((g) => g.key));
  return k.geographies.filter((g) => eu.has(g));
}

export function voivodeshipKeys(cat: Catalog): string[] {
  return cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
}

/** Scopes an indicator belongs to (a filter value matches when it is in the list). */
export function scopesOf(k: Kpi, cat: Catalog): Scope[] {
  const out: Scope[] = [];
  if (hasVoivodeships(k)) out.push("voiv");
  if (euGeographies(k, cat).length) out.push("eu");
  if (!out.length) out.push("pl");
  return out;
}

export function scopeLabel(s: Scope, lang: Lang): string {
  const pl = { voiv: "Województwa", eu: "Kraje UE", pl: "Tylko Polska" };
  const en = { voiv: "Voivodeships", eu: "EU countries", pl: "Poland only" };
  return (lang === "pl" ? pl : en)[s];
}

/** "Polska, województwa i kraje UE", "Polska i kraje UE", "Polska". */
export function geoCoverage(k: Kpi, cat: Catalog, lang: Lang): string {
  const v = hasVoivodeships(k),
    e = euGeographies(k, cat).length > 0;
  if (lang === "pl") return v && e ? "Polska, województwa, kraje UE" : v ? "Polska, województwa" : e ? "Polska i kraje UE" : "Polska";
  return v && e ? "Poland, voivodeships, EU" : v ? "Poland, voivodeships" : e ? "Poland and EU countries" : "Poland";
}

export function yearOf(period: string): number {
  return Number(period.slice(0, 4));
}

export function yearRange(k: Kpi): string {
  return `${yearOf(k.first_period)}–${yearOf(k.last_period)}`;
}

/** "miesięcznie · 2010–2026". */
export function freqRange(k: Kpi, lang: Lang): string {
  return `${freqLabel(k.frequency, lang)} · ${yearRange(k)}`;
}

const PER_YEAR: Record<Frequency, number> = { M: 12, Q: 4, A: 1 };

/** Sub-period index within its year, 1-based (months 1–12, quarters 1–4, years 1). */
function subOf(period: string): number {
  if (/^\d{4}-Q\d$/.test(period)) return Number(period.slice(-1));
  if (/^\d{4}-\d{2}$/.test(period)) return Number(period.slice(5, 7));
  return 1;
}

/** Number of periods from first to last inclusive. */
export function seriesLength(k: Kpi): number {
  const n = PER_YEAR[k.frequency];
  return (yearOf(k.last_period) - yearOf(k.first_period)) * n + subOf(k.last_period) - subOf(k.first_period) + 1;
}

/** Time span covered, in years (a monthly series Jan 2010–Sep 2026 covers 16,75 years). */
export function seriesYears(k: Kpi): number {
  return seriesLength(k) / PER_YEAR[k.frequency];
}

/** Comparable end month of a period ("2025" → "2025-12", "2026-Q2" → "2026-06"), for "newest data" sorting. */
export function periodEnd(period: string): string {
  if (/^\d{4}$/.test(period)) return `${period}-12`;
  const q = /^(\d{4})-Q(\d)$/.exec(period);
  if (q) return `${q[1]}-${String(Number(q[2]) * 3).padStart(2, "0")}`;
  return period;
}

export function domainOf(cat: Catalog, key: string) {
  return cat.domains.find((d) => d.domain_key === key);
}

export function nameOf(x: { name_pl: string; name_en: string } | undefined, lang: Lang, fallback = ""): string {
  return x ? (lang === "pl" ? x.name_pl : x.name_en) : fallback;
}

/** "/d/economy/prices" for the group "economy.prices". */
export function groupPath(groupKey: string): string {
  const [d, g] = groupKey.split(".");
  return g ? `/d/${d}/${g}` : `/d/${d}`;
}

export function unitName(cat: Catalog, unitKey: string, lang: Lang): string {
  return nameOf(
    cat.units.find((u) => u.unit_key === unitKey),
    lang,
    unitKey,
  );
}

/** Two-letter voivodeship codes (tile-map labels). */
export const VOIV_SHORT: Record<string, string> = {
  "PL-02": "DS",
  "PL-04": "KP",
  "PL-06": "LU",
  "PL-08": "LB",
  "PL-10": "LD",
  "PL-12": "MA",
  "PL-14": "MZ",
  "PL-16": "OP",
  "PL-18": "PK",
  "PL-20": "PD",
  "PL-22": "PM",
  "PL-24": "SL",
  "PL-26": "SK",
  "PL-28": "WN",
  "PL-30": "WP",
  "PL-32": "ZP",
};

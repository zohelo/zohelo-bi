// How a KPI's latest value and its change are written (content standard 2 Nov, "KPI card anatomy" 3–5):
// numbers in the locale's format, periods in words, rate changes in percentage points, level changes in
// the unit and in %, and the comparison named. Pure functions; KpiHeader and the catalogue cards use them.

import type { Lang } from "./i18n";

const MONTHS: Record<Lang, string[]> = {
  pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
// Polish month names after "wobec" and in dates take the genitive.
const MONTHS_PL_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];
const ROMAN = ["I", "II", "III", "IV"];

const LOCALE: Record<Lang, string> = { pl: "pl-PL", en: "en-GB" };
const MINUS = "−";
const NBSP = " ";

type Period =
  | { year: number; kind: "A" }
  | { year: number; kind: "Q"; n: number }
  | { year: number; kind: "M"; n: number }
  | { year: number; kind: "D"; n: number; day: number };

function parse(period: string): Period | null {
  let m = /^(\d{4})$/.exec(period);
  if (m) return { year: +m[1]!, kind: "A" };
  m = /^(\d{4})-Q([1-4])$/.exec(period);
  if (m) return { year: +m[1]!, kind: "Q", n: +m[2]! };
  m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (m) return { year: +m[1]!, kind: "M", n: +m[2]! };
  m = /^(\d{4})-(0[1-9]|1[0-2])-(\d{2})$/.exec(period);
  if (m) return { year: +m[1]!, kind: "D", n: +m[2]!, day: +m[3]! };
  return null;
}

/**
 * A period in words: '2025' → '2025'; '2026-09' → 'wrzesień 2026' / 'September 2026'; '2026-Q2' → 'II kw. 2026' /
 * 'Q2 2026'; '2026-10-27' → '27 października 2026' / '27 October 2026'. Unknown forms are returned as they are.
 * genitive: the Polish month in the genitive ('września 2026'), as after "wobec".
 */
export function periodWords(period: string, lang: Lang, genitive = false): string {
  const p = parse(period);
  if (!p) return period;
  if (p.kind === "A") return String(p.year);
  if (p.kind === "Q") return lang === "pl" ? `${ROMAN[p.n - 1]} kw. ${p.year}` : `Q${p.n} ${p.year}`;
  if (p.kind === "M") return `${lang === "pl" && genitive ? MONTHS_PL_GENITIVE[p.n - 1] : MONTHS[lang][p.n - 1]} ${p.year}`;
  return `${p.day} ${lang === "pl" ? MONTHS_PL_GENITIVE[p.n - 1] : MONTHS.en[p.n - 1]} ${p.year}`;
}

/** True when previous is the same month, quarter or day one year before period (a year-on-year comparison). */
export function isYearOnYear(period: string, previous: string): boolean {
  const a = parse(period);
  const b = parse(previous);
  if (!a || !b || a.kind === "A" || a.kind !== b.kind || a.year !== b.year + 1) return false;
  if (a.kind === "D" && b.kind === "D") return a.n === b.n && a.day === b.day;
  return "n" in b && a.n === b.n;
}

/** A number in the locale's format: up to 2 decimals below 100, none from 100 (as formatNumber), true minus sign. */
export function formatValue(v: number, lang: Lang): string {
  const digits = Math.abs(v) < 100 ? 2 : 0;
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: digits }).format(v).replace("-", MINUS);
}

function signed(v: number, lang: Lang, digits?: number): string {
  const text =
    digits === undefined
      ? formatValue(Math.abs(v), lang)
      : new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: digits }).format(Math.abs(v));
  if (text.replace(/[^1-9]/g, "") === "") return text; // rounds to zero: no sign
  return `${v < 0 ? MINUS : "+"}${text}`;
}

/**
 * The change from previous to value: for a rate in percentage points ('−0,1 p.p.' / '−0.1 pp'), for a level in its
 * unit and, in brackets, in per cent ('+95 mld EUR (+12,7 %)'); the per cent is left out when previous is 0.
 */
export function changeText(value: number, previous: number, isRate: boolean, unitSymbol: string, lang: Lang): string {
  const delta = value - previous;
  if (isRate) return `${signed(delta, lang)}${NBSP}${lang === "pl" ? "p.p." : "pp"}`;
  const level = unitSymbol ? `${signed(delta, lang)}${NBSP}${unitSymbol}` : signed(delta, lang);
  if (previous === 0) return level;
  const pct = signed((delta / Math.abs(previous)) * 100, lang, 1);
  return `${level} (${pct}${lang === "pl" ? `${NBSP}%` : "%"})`;
}

/**
 * True when a unit's changes are shown in percentage points: a rate (catalog units[].is_rate) measured in per cent.
 * is_rate also marks other ratios (PLN per currency unit), whose changes are shown in the unit and in per cent.
 */
export function inPoints(unit: { symbol: string; is_rate?: boolean } | undefined): boolean {
  return unit?.is_rate === true && unit.symbol.trim() === "%";
}

/** The comparison of the change: 'r/r' / 'y/y' for the same period a year before, else 'wobec <period>' / 'vs <period>'. */
export function comparisonText(period: string, previous: string, lang: Lang): string {
  if (isYearOnYear(period, previous)) return lang === "pl" ? "r/r" : "y/y";
  return `${lang === "pl" ? "wobec" : "vs"} ${periodWords(previous, lang, true)}`;
}

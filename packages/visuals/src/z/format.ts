// Number, period and text-width helpers of the chart library. Polish first: decimal comma, thousands with a
// (non-breaking) space, typographic minus.

import type { ZUnit } from "./types";

export type Lang = "pl" | "en";

const MINUS = "−";
const fmtCache = new Map<string, Intl.NumberFormat>();

function nf(lang: Lang, decimals: number): Intl.NumberFormat {
  const key = `${lang}:${decimals}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    fmtCache.set(key, f);
  }
  return f;
}

/** "2,9", "−0,6", "12 345" (pl) / "2.9", "−0.6", "12,345" (en). Null → "–". */
export function fmtNum(v: number | null | undefined, lang: Lang, decimals = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  const r = Number(v.toFixed(decimals));
  return nf(lang, decimals)
    .format(Object.is(r, -0) ? 0 : r)
    .replace(/^-/, MINUS);
}

/** Number with the unit symbol: "2,9%", "4,26 zł", "37,49 mln". The "pkt" symbol is never repeated. */
export function fmtVal(v: number | null | undefined, unit: ZUnit, lang: Lang, decimals = unit.decimals): string {
  const n = fmtNum(v, lang, decimals);
  if (n === "–") return n;
  return withUnit(n, unit.symbol);
}

export function withUnit(n: string, symbol: string): string {
  if (!symbol || symbol === "pkt") return n;
  return symbol === "%" ? `${n}%` : `${n} ${symbol}`;
}

/** "+2,0" / "−0,6" / "0,0". */
export function fmtSigned(v: number, lang: Lang, decimals = 1): string {
  const n = fmtNum(Math.abs(v), lang, decimals);
  if (Number(Math.abs(v).toFixed(decimals)) === 0) return n;
  return (v > 0 ? "+" : MINUS) + n;
}

/** Difference in the unit's terms: percentage points for rates, otherwise the unit. "−4,3 pp", "+0,02 zł". */
export function fmtDiff(d: number, unit: ZUnit, lang: Lang): string {
  const s = fmtSigned(d, lang, unit.isRate ? 1 : unit.decimals);
  if (unit.isRate) return `${s} pp`;
  return withUnit(s, unit.symbol);
}

/** Neutral change with an arrow (arrow is decorative; the table has the words). "▼ 0,1 pp". */
export function fmtChangeArrow(d: number, unit: ZUnit, lang: Lang): string {
  const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "■";
  const abs = fmtNum(Math.abs(d), lang, unit.isRate ? 1 : unit.decimals);
  return `${arrow} ${unit.isRate ? `${abs} pp` : withUnit(abs, unit.symbol)}`;
}

function decimalsOfStep(step: number): number {
  if (step <= 0) return 0;
  return Math.min(4, decimalsOf(step));
}

/** Axis tick: no unit except % on percentage axes; large counts as tys./mln/mld (k/m/bn). */
export function fmtTick(v: number, unit: ZUnit, lang: Lang, step: number): string {
  const abs = Math.abs(v);
  const big = Math.max(abs, Math.abs(step));
  let txt: string;
  if (big >= 1e9 && abs > 0) txt = `${fmtNum(v / 1e9, lang, decimalsOfStep(step / 1e9))} ${lang === "pl" ? "mld" : "bn"}`;
  else if (big >= 1e6 && abs > 0) txt = `${fmtNum(v / 1e6, lang, decimalsOfStep(step / 1e6))} ${lang === "pl" ? "mln" : "m"}`;
  else if (big >= 1e4 && abs > 0) txt = `${fmtNum(v / 1e3, lang, decimalsOfStep(step / 1e3))} ${lang === "pl" ? "tys." : "k"}`;
  else txt = fmtNum(v, lang, decimalsOfStep(step));
  return unit.symbol === "%" ? `${txt}%` : txt;
}

/** Decimals needed to show a threshold without trailing zeros (4 → 0, 1.5 → 1). */
export function decimalsOf(v: number): number {
  const s = String(Number(v.toFixed(4)));
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

// ---------- periods

const MONTHS = {
  pl: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const MONTHS_LONG = {
  pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function monthName(m: number, lang: Lang, form: "short" | "long" | "roman" = "short"): string {
  if (form === "roman") return ROMAN[m - 1] ?? String(m);
  return (form === "long" ? MONTHS_LONG : MONTHS)[lang][m - 1] ?? String(m);
}

export type Period = { t: number; kind: "A" | "Q" | "M" | "X"; year: number; sub: number };

/** "2026-09" → 2026.67 (M), "2026-Q2" → 2026.25 (Q), "2025" → 2025 (A); anything else → kind X. */
export function parsePeriod(p: string): Period {
  let m = /^(\d{4})-(\d{2})$/.exec(p);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    return { t: y + (mo - 1) / 12, kind: "M", year: y, sub: mo };
  }
  m = /^(\d{4})-Q([1-4])$/.exec(p);
  if (m) {
    const y = Number(m[1]);
    const q = Number(m[2]);
    return { t: y + (q - 1) / 4, kind: "Q", year: y, sub: q };
  }
  m = /^(\d{4})$/.exec(p);
  if (m) return { t: Number(m[1]), kind: "A", year: Number(m[1]), sub: 0 };
  return { t: NaN, kind: "X", year: 0, sub: 0 };
}

/** Default period label: "wrz 2026", "2 kw. 2026" / "Sep 2026", "Q2 2026", "2025"; long: "wrzesień 2026". */
export function periodLabel(p: string, lang: Lang, form: "short" | "long" | "phone" = "short"): string {
  const pp = parsePeriod(p);
  if (pp.kind === "M") {
    if (form === "phone") return `${monthName(pp.sub, lang, "roman")} ${pp.year}`;
    return `${monthName(pp.sub, lang, form === "long" ? "long" : "short")} ${pp.year}`;
  }
  if (pp.kind === "Q") return lang === "pl" ? `${pp.sub} kw. ${pp.year}` : `Q${pp.sub} ${pp.year}`;
  return p;
}

// ---------- text width (no DOM: works in SSR and tests). Inter metrics, em units.

const NARROW = new Set("iljtfrI1!.,:;'|()[] ’ʼ".split(""));
const WIDE = new Set("mwMWŚ%@".split(""));
const DIGITS = new Set("0123456789".split(""));

export function textWidth(s: string, size: number, weight = 400): number {
  let em = 0;
  for (const ch of s) {
    if (ch === " " || ch === " " || ch === " ") em += 0.27;
    else if (DIGITS.has(ch)) em += 0.6;
    else if (NARROW.has(ch)) em += 0.3;
    else if (WIDE.has(ch)) em += 0.84;
    else if (ch >= "A" && ch <= "Z") em += 0.66;
    else if (ch === "▲" || ch === "▼" || ch === "■") em += 0.62;
    else em += 0.54;
  }
  return em * size * (weight >= 600 ? 1.05 : 1);
}

/** Shortens text to fit `max` px, ending with "…". */
export function fitText(s: string, size: number, max: number, weight = 400): string {
  if (textWidth(s, size, weight) <= max) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + "…", size, weight) > max) out = out.slice(0, -1);
  return out.trimEnd() + "…";
}

// Polish-first number, period and change formatting (design template: Content fundamentals).

import type { Lang } from "../i18n";
import type { Catalog, Frequency, Kpi, Latest } from "../data";

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function decimalsFor(unitKey: string, value: number): number {
  if (unitKey === "rate_fx") return 2;
  if (["pct", "pp", "per_1000", "celsius", "years", "ug_m3", "hours"].includes(unitKey)) return 1;
  if (["persons_mn", "eur_bn", "pln_bn"].includes(unitKey)) return Math.abs(value) < 100 ? 2 : 1;
  if (unitKey === "idx") return Math.abs(value) < 10 ? 2 : Math.abs(value) < 1000 ? 1 : 0;
  return Math.abs(value) < 10 ? 2 : Math.abs(value) < 100 ? 1 : 0;
}

export function fmtNumber(value: number | null | undefined, lang: Lang, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(value);
}

export function unitSymbol(cat: Catalog | undefined, unitKey: string): string {
  return cat?.units.find((u) => u.unit_key === unitKey)?.symbol ?? "";
}

/** "2,9%", "4,26 zł", "37,57 mln osób". */
export function fmtValue(value: number | null | undefined, unitKey: string, cat: Catalog | undefined, lang: Lang): string {
  if (value === null || value === undefined) return "–";
  const n = fmtNumber(value, lang, decimalsFor(unitKey, value));
  const sym = unitSymbol(cat, unitKey);
  if (!sym || sym === "pkt") return n;
  return sym === "%" ? `${n}%` : `${n} ${sym}`;
}

export function fmtPeriod(period: string, lang: Lang, long = false): string {
  const months = lang === "pl" ? MONTHS_PL : MONTHS_EN;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const m = months[Number(period.slice(5, 7)) - 1]!;
    return long && lang === "pl" ? `${m} ${period.slice(0, 4)}` : `${m} ${period.slice(0, 4)}`;
  }
  if (/^\d{4}-Q\d$/.test(period))
    return lang === "pl" ? `${period.slice(-1)} kw. ${period.slice(0, 4)}` : `Q${period.slice(-1)} ${period.slice(0, 4)}`;
  return period;
}

export function freqLabel(f: Frequency, lang: Lang): string {
  const pl = { M: "miesięcznie", Q: "kwartalnie", A: "rocznie" };
  const en = { M: "monthly", Q: "quarterly", A: "annual" };
  return (lang === "pl" ? pl : en)[f];
}

/** Neutral change: shown text and spoken text (screen readers hear words, not symbols). */
export function fmtChange(
  value: number,
  previous: number,
  unitKey: string,
  basis: "m/m" | "k/k" | "r/r",
  cat: Catalog | undefined,
  lang: Lang,
): { shown: string; spoken: string; delta: number } {
  const raw = value - previous;
  const step = 10 ** -decimalsFor(rateKey(unitKey, cat), Math.abs(raw));
  // The arrow follows the change as shown: a change that rounds to zero is "no change".
  const d = Math.abs(raw) < step / 2 ? 0 : raw;
  const rate = cat?.units.find((u) => u.unit_key === unitKey)?.is_rate ?? false;
  const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "■";
  const abs = Math.abs(d);
  const amount = rate ? `${fmtNumber(abs, lang, decimalsFor("pct", abs))} pp` : fmtValue(abs, unitKey, cat, lang);
  const pct = !rate && previous ? ` (${fmtNumber((Math.abs(d) / Math.abs(previous)) * 100, lang, 1)}%)` : "";
  const shown = `${arrow} ${amount}${pct} ${basis}`;
  const basisWords =
    lang === "pl"
      ? {
          "m/m": "w porównaniu z poprzednim miesiącem",
          "k/k": "w porównaniu z poprzednim kwartałem",
          "r/r": "w porównaniu z poprzednim rokiem",
        }[basis]
      : {
          "m/m": "compared with the previous month",
          "k/k": "compared with the previous quarter",
          "r/r": "compared with the previous year",
        }[basis];
  const dir = lang === "pl" ? (d > 0 ? "wzrost o" : d < 0 ? "spadek o" : "bez zmian") : d > 0 ? "up" : d < 0 ? "down" : "unchanged";
  const spokenAmount = amount
    .replace(" pp", lang === "pl" ? " punktu procentowego" : " percentage points")
    .replaceAll("%", lang === "pl" ? " procent" : " per cent");
  return {
    shown,
    delta: d,
    spoken:
      d === 0
        ? `${dir} ${basisWords}`
        : `${dir} ${spokenAmount}${pct.replaceAll("%", lang === "pl" ? " procent" : " per cent")} ${basisWords}`,
  };
}

function rateKey(unitKey: string, cat: Catalog | undefined): string {
  return cat?.units.find((u) => u.unit_key === unitKey)?.is_rate ? "pct" : unitKey;
}

/** The unit of a latest value: its own (live data: sources publish in different units), else the KPI's. */
export function latestUnit(l: Pick<Latest, "unit_key"> | undefined, kpi: Pick<Kpi, "unit_key">): string {
  return l?.unit_key ?? kpi.unit_key;
}

/** The change of a latest value against the period before, formatted in the value's unit; undefined without a value
 * or a period before. */
export function latestChange(
  l: Pick<Latest, "value" | "previous_value" | "unit_key"> | undefined,
  kpi: Pick<Kpi, "unit_key" | "frequency">,
  cat: Catalog | undefined,
  lang: Lang,
): ReturnType<typeof fmtChange> | undefined {
  if (!l || l.previous_value === null) return undefined;
  return fmtChange(l.value, l.previous_value, latestUnit(l, kpi), basisFor(kpi.frequency), cat, lang);
}

export function basisFor(f: Frequency): "m/m" | "k/k" | "r/r" {
  return f === "M" ? "m/m" : f === "Q" ? "k/k" : "r/r";
}

/** Text for screen readers: change bases written with a slash ("r/r", "y/y") as words, so they are not read as
 * "r slash r". Use next to the visible text (visible text aria-hidden, this one in .zt-sr). */
export function spokenText(s: string, lang: Lang): string {
  const words: Record<string, [string, string]> = {
    "r/r": ["rok do roku", "year on year"],
    "k/k": ["kwartał do kwartału", "quarter on quarter"],
    "m/m": ["miesiąc do miesiąca", "month on month"],
    "y/y": ["rok do roku", "year on year"],
    "q/q": ["kwartał do kwartału", "quarter on quarter"],
  };
  return s.replace(/\b([rkmyq])\/\1\b/g, (m) => (words[m] ? words[m]![lang === "pl" ? 0 : 1] : m));
}

/** Observation flags of the published contract v2, as words (Polish, English). */
const FLAG_WORDS: Record<string, [string, string]> = {
  p: ["dane wstępne", "provisional"],
  e: ["szacunek", "estimated"],
  b: ["przerwa w szeregu", "break in series"],
  f: ["prognoza", "forecast"],
  u: ["niska wiarygodność", "low reliability"],
  d: ["inna definicja", "definition differs"],
  n: ["nieistotne statystycznie", "not significant"],
  c: ["dane poufne", "confidential"],
};

/** The words for a value's flags; letters the contract does not define are left out. */
export function flagWords(flags: string[], lang: Lang): string[] {
  return flags.filter((f) => FLAG_WORDS[f]).map((f) => FLAG_WORDS[f]![lang === "pl" ? 0 : 1]);
}

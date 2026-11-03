// d3 number and time locales for the chart languages, passed to vega-embed (formatLocale, timeFormatLocale), so
// axes and tooltips read `37 500 000`, `3,5` and `kwi 2025` on Polish pages (zohelo-bi#320; zohelo locale.ts).

export type ChartLang = "pl" | "en";

const PL_NUMBER = { decimal: ",", thousands: " ", grouping: [3], currency: ["", " zł"], minus: "−" };
const EN_NUMBER = { decimal: ".", thousands: ",", grouping: [3], currency: ["£", ""], minus: "−" };

const PL_TIME = {
  dateTime: "%A, %e %B %Y, %X",
  date: "%d.%m.%Y",
  time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"],
  shortDays: ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."],
  months: [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień",
  ],
  shortMonths: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
};
const EN_TIME = {
  dateTime: "%a %e %b %Y %X",
  date: "%d/%m/%Y",
  time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/** The vega-embed locale options of a chart language. */
export function chartLocale(lang: ChartLang) {
  return lang === "pl" ? { formatLocale: PL_NUMBER, timeFormatLocale: PL_TIME } : { formatLocale: EN_NUMBER, timeFormatLocale: EN_TIME };
}

/** Axis and tooltip texts of the chart specs. */
export const CHART_TEXT: Record<ChartLang, { series: string; period: string; area: string }> = {
  pl: { series: "Seria", period: "Okres", area: "Obszar" },
  en: { series: "Series", period: "Period", area: "Area" },
};

/**
 * The d3 time format for period keys ('2025', '2025-03', '2025-03-14'): years as '%Y', months as '%b %Y', days as
 * '%e %b %Y'; the finest form among the keys wins.
 */
export function periodFormat(keys: string[]): string {
  let level = 0;
  for (const k of keys) level = Math.max(level, k.length > 7 ? 2 : k.length > 4 ? 1 : 0);
  return ["%Y", "%b %Y", "%e %b %Y"][level]!;
}

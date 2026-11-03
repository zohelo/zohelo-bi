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
 * The d3 time format for a chart's frequencies (date_key is a full ISO date for every frequency, so the frequency
 * decides): annual '%Y', half-yearly, quarterly and monthly '%b %Y' (the period's first month), daily '%-d %b %Y';
 * the finest frequency among them wins, unknown ones count as daily.
 */
export function periodFormat(frequencies: string[]): string {
  const rank = (f: string) => (f === "A" ? 0 : f === "S" || f === "Q" || f === "M" ? 1 : 2);
  const level = frequencies.reduce((most, f) => Math.max(most, rank(f)), 0);
  return ["%Y", "%b %Y", "%-d %b %Y"][level]!;
}

/**
 * The time-axis tick interval for a chart's frequencies, at the same level as periodFormat: one tick per year at most
 * for annual series, per month for half-yearly, quarterly and monthly ones (labelOverlap thins them), and about 7
 * ticks for daily ones. Without it, short annual spans got several ticks per year, all labelled with the same '%Y'.
 */
export function periodTicks(frequencies: string[]): { interval: "year" | "month" } | number {
  const level = frequencies.reduce((most, f) => Math.max(most, f === "A" ? 0 : f === "S" || f === "Q" || f === "M" ? 1 : 2), 0);
  return level === 0 ? { interval: "year" } : level === 1 ? { interval: "month" } : 7;
}

// "Analizy" (docs/analysis-design.md; owner 2026-11-10): statistics and econometrics as guided recipes. A recipe
// starts from a business question, takes one or two indicators, and answers with a sentence, a chart, a few facts,
// the cautions that apply and one paragraph on the method. The numbers come from @zohelo/stats (textbook methods,
// no AI); this file decides the wording and the guardrails:
//   - a trend is a growth rate for levels and a change in points for rates;
//   - two indicators are compared on their yearly changes, never on levels (two rising series always correlate);
//   - a forecast method must beat "same as a year ago" on the series' own past to be used, and shows its past error;
//   - every result says what it assumes and when not to trust it.

import { betaConvergence, change, correlation, crossCorrelation, decompose, dispersion, forecast, mean, sd, trend } from "@zohelo/stats";
import type { ZChartProps, ZUnit } from "@zohelo/visuals";
import type { Catalog, Kpi, Point } from "../../data";
import type { Lang } from "../../i18n";
import { geoName, kpiName, zUnit } from "../chartData";
import { fmtNumber, fmtPeriod, fmtValue } from "../format";

export type RecipeId = "trend" | "season" | "forecast" | "relation" | "convergence";
export type RecipeNeeds = "series" | "pair" | "regions";

export type Recipe = {
  id: RecipeId;
  needs: RecipeNeeds;
  pl: string;
  en: string;
  /** What the reader gets, one line. */
  leadPl: string;
  leadEn: string;
  /** A ready example: indicator keys. */
  example: string[];
};

export const RECIPES: Recipe[] = [
  {
    id: "trend",
    needs: "series",
    pl: "Jaki jest trend?",
    en: "What is the trend?",
    leadPl: "Średnie tempo zmian w czasie i to, czy kierunek jest wyraźny.",
    leadEn: "The average pace of change over time and whether the direction is clear.",
    example: ["avg_wage"],
  },
  {
    id: "season",
    needs: "series",
    pl: "Czy to sezonowe?",
    en: "Is it seasonal?",
    leadPl: "Które miesiące lub kwartały są zwykle wyżej i niżej oraz jak wygląda szereg bez sezonu.",
    leadEn: "Which months or quarters usually run high or low, and the series without the season.",
    example: ["overnight_stays"],
  },
  {
    id: "forecast",
    needs: "series",
    pl: "Co będzie dalej?",
    en: "What comes next?",
    leadPl: "Prognoza na najbliższy rok z przedziałem i z błędem, jaki ta metoda robiła w przeszłości.",
    leadEn: "A forecast for the coming year with its interval and the error this method made in the past.",
    example: ["avg_wage"],
  },
  {
    id: "relation",
    needs: "pair",
    pl: "Czy te dwa wskaźniki idą razem?",
    en: "Do these two move together?",
    leadPl: "Siła związku zmian dwóch wskaźników i to, który wyprzedza drugi.",
    leadEn: "How strongly the changes of two indicators are linked, and which one leads.",
    example: ["cpi_annual_rate", "nbp_reference_rate"],
  },
  {
    id: "convergence",
    needs: "regions",
    pl: "Czy regiony się wyrównują?",
    en: "Are regions converging?",
    leadPl: "Czy różnice między województwami maleją i czy słabsze rosną szybciej.",
    leadEn: "Whether the differences between voivodeships shrink and whether the weaker grow faster.",
    example: ["gdp_per_capita_region"],
  },
];

export type Fact = { label: string; value: string };
export type AnalysisCard = { title: string; sub: string; chart: ZChartProps };
export type Analysis =
  { ok: true; finding: string; cards: AnalysisCard[]; facts: Fact[]; cautions: string[]; method: string } | { ok: false; problem: string };

export type SeriesInput = { kpi: Kpi; geo: string; points: Point[] };

type Ctx = { cat: Catalog; lang: Lang };

const SEASON: Record<Kpi["frequency"], number> = { M: 12, Q: 4, A: 1 };
const PERCENT: ZUnit = { symbol: "%", isRate: true, decimals: 1 };
const POINTS: ZUnit = { symbol: "pp", isRate: true, decimals: 2 };
const PLAIN: ZUnit = { symbol: "", isRate: false, decimals: 2 };

type Clean = { periods: string[]; values: number[]; dropped: number };

function clean(points: Point[]): Clean {
  const kept = points.filter((p): p is { period: string; value: number } => typeof p.value === "number" && Number.isFinite(p.value));
  return { periods: kept.map((p) => p.period), values: kept.map((p) => p.value), dropped: points.length - kept.length };
}

export function nextPeriod(p: string): string {
  const mo = /^(\d{4})-(\d{2})$/.exec(p);
  if (mo) {
    const m = Number(mo[2]);
    return m === 12 ? `${Number(mo[1]) + 1}-01` : `${mo[1]}-${String(m + 1).padStart(2, "0")}`;
  }
  const q = /^(\d{4})-Q(\d)$/.exec(p);
  if (q) return Number(q[2]) === 4 ? `${Number(q[1]) + 1}-Q1` : `${q[1]}-Q${Number(q[2]) + 1}`;
  return String(Number(p.slice(0, 4)) + 1);
}

/** Name of a position in the season: "grudzień" / "4 kw.". */
function seasonName(period: string, lang: Lang, short = false): string {
  const mo = /^\d{4}-(\d{2})$/.exec(period);
  if (mo)
    return new Date(Date.UTC(2024, Number(mo[1]) - 1, 1)).toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", {
      month: short ? "short" : "long",
      timeZone: "UTC",
    });
  const q = /^\d{4}-Q(\d)$/.exec(period);
  return q ? (lang === "pl" ? `${q[1]} kw.` : `Q${q[1]}`) : period;
}

const signed = (v: number, lang: Lang, d = 1) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtNumber(Math.abs(v), lang, d);
const pct = (v: number, lang: Lang, d = 1) => `${signed(v, lang, d)}%`;
const span = (c: Clean, lang: Lang) => `${fmtPeriod(c.periods[0]!, lang)}–${fmtPeriod(c.periods.at(-1)!, lang)}`;

/** How sure a direction is, in words (from a p-value). */
function sureness(p: number, pl: boolean): string {
  if (p < 0.01) return pl ? "bardzo wysoka" : "very high";
  if (p < 0.05) return pl ? "wysoka" : "high";
  if (p < 0.1) return pl ? "umiarkowana" : "moderate";
  return pl ? "niska: taki wynik mógł wyjść przypadkiem" : "low: a result like this could come by chance";
}

function title(input: SeriesInput, { cat, lang }: Ctx): string {
  return `${kpiName(input.kpi, lang)}, ${geoName(cat, input.geo, lang)}`;
}

function gaps(c: Clean, pl: boolean): string[] {
  return c.dropped ? [pl ? `Pominięto ${c.dropped} okresów bez wartości.` : `${c.dropped} periods without a value were left out.`] : [];
}

// ---------- 1. trend

export function analyseTrend(input: SeriesInput, ctx: Ctx): Analysis {
  const { cat, lang } = ctx;
  const pl = lang === "pl";
  const c = clean(input.points);
  const m = SEASON[input.kpi.frequency];
  if (c.values.length < Math.max(8, 2 * m))
    return {
      ok: false,
      problem: pl
        ? "Za krótki szereg: trend wymaga co najmniej dwóch lat danych (minimum 8 obserwacji)."
        : "The series is too short: a trend needs at least two years of data (8 observations or more).",
    };
  const unit = zUnit(cat, input.kpi.unit_key, c.values.at(-1));
  const t = trend(c.values, m, !unit.isRate);
  if (!t) return { ok: false, problem: pl ? "Nie udało się dopasować trendu." : "No trend could be fitted." };
  const name = kpiName(input.kpi, lang);
  const clear = t.p < 0.05;
  const up = t.perYear > 0;
  const pace =
    t.kind === "log"
      ? pct(t.perYear * 100, lang)
      : unit.isRate
        ? `${signed(t.perYear, lang, 2)} pp`
        : `${up ? "+" : "−"}${fmtValue(Math.abs(t.perYear), input.kpi.unit_key, cat, lang)}`;
  const finding = clear
    ? pl
      ? `${name}: ${up ? "rośnie" : "spada"} średnio o ${pace.replace(/^[+−]/, "")} rocznie (${span(c, lang)})`
      : `${name}: ${up ? "rising" : "falling"} by ${pace.replace(/^[+−]/, "")} a year on average (${span(c, lang)})`
    : pl
      ? `${name}: brak wyraźnego trendu (${span(c, lang)})`
      : `${name}: no clear trend (${span(c, lang)})`;
  const last = c.values.at(-1)!;
  const fit = t.fitted.at(-1)!;
  const gap =
    t.kind === "log"
      ? pct((last / fit - 1) * 100, lang)
      : unit.isRate
        ? `${signed(last - fit, lang, 2)} pp`
        : signed(last - fit, lang, unit.decimals);
  const resid = c.values.map((v, i) => (t.kind === "log" ? Math.log(v / t.fitted[i]!) : v - t.fitted[i]!));
  const s = sd(resid);
  const worst = resid.reduce((bi, r, i) => (Math.abs(r) > Math.abs(resid[bi]!) ? i : bi), 0);
  const cautions = [
    ...gaps(c, pl),
    ...(s > 0 && Math.abs(resid[worst]!) > 3 * s
      ? [
          pl
            ? `W okresie ${fmtPeriod(c.periods[worst]!, lang)} wartość mocno odbiega od trendu. Jedna linia przez taki okres bywa myląca: sprawdź trend osobno przed nim i po nim.`
            : `In ${fmtPeriod(c.periods[worst]!, lang)} the value is far from the trend. One line through such a period can mislead: check the trend before and after it separately.`,
        ]
      : []),
    ...(t.r2 < 0.5 && clear
      ? [
          pl
            ? "Kierunek jest wyraźny, ale wahania wokół trendu są duże: pojedynczy okres niewiele mówi."
            : "The direction is clear but the swings around the trend are large: a single period says little.",
        ]
      : []),
    pl
      ? "Trend opisuje przeszłość. Nie jest prognozą ani nie tłumaczy przyczyn."
      : "A trend describes the past. It is not a forecast and does not explain causes.",
  ];
  const chart: ZChartProps = {
    type: "line-highlight",
    lang,
    unit,
    ariaLabel: finding,
    series: [
      { id: "y", label: name, role: "hero", points: c.periods.map((x, i) => ({ x, y: c.values[i]! })) },
      { id: "trend", label: pl ? "trend" : "trend", role: "context", points: c.periods.map((x, i) => ({ x, y: t.fitted[i]! })) },
    ],
    opts: { contextDash: true },
  };
  return {
    ok: true,
    finding,
    cards: [{ title: pl ? "Dane i linia trendu" : "Data and trend line", sub: `${title(input, ctx)} · ${span(c, lang)}`, chart }],
    facts: [
      { label: pl ? "Średnia zmiana rocznie" : "Average change a year", value: pace },
      { label: pl ? "Pewność kierunku" : "Confidence in the direction", value: sureness(t.p, pl) },
      {
        label: pl ? "Ile zmienności wyjaśnia trend" : "Variation explained by the trend",
        value: `${fmtNumber(t.r2 * 100, lang, 0)}%`,
      },
      { label: pl ? "Ostatnia wartość wobec trendu" : "Latest value against the trend", value: gap },
      { label: pl ? "Okres i liczba obserwacji" : "Period and observations", value: `${span(c, lang)} · ${c.values.length}` },
    ],
    cautions,
    method:
      t.kind === "log"
        ? pl
          ? "Linia prosta dopasowana metodą najmniejszych kwadratów do logarytmu wartości. Jej nachylenie to średnie tempo wzrostu na okres, przeliczone na rok procentem składanym. Pewność kierunku pochodzi z testu t nachylenia; dla danych, w których kolejne okresy są do siebie podobne, test bywa zbyt optymistyczny."
          : "A straight line fitted by least squares to the logarithm of the values. Its slope is the average growth per period, compounded to a year. Confidence comes from the t-test of the slope; when neighbouring periods resemble each other the test tends to be optimistic."
        : pl
          ? "Linia prosta dopasowana metodą najmniejszych kwadratów do wartości (stopy i salda nie mają tempa wzrostu, więc zmiana jest w punktach lub jednostkach na rok). Pewność kierunku pochodzi z testu t nachylenia; dla danych, w których kolejne okresy są do siebie podobne, test bywa zbyt optymistyczny."
          : "A straight line fitted by least squares to the values (rates and balances have no growth rate, so the change is in points or units a year). Confidence comes from the t-test of the slope; when neighbouring periods resemble each other the test tends to be optimistic.",
  };
}

// ---------- 2. seasonality

export function analyseSeason(input: SeriesInput, ctx: Ctx): Analysis {
  const { cat, lang } = ctx;
  const pl = lang === "pl";
  const m = SEASON[input.kpi.frequency];
  if (m === 1)
    return {
      ok: false,
      problem: pl
        ? "Dane roczne nie mają sezonu. Wybierz wskaźnik miesięczny lub kwartalny."
        : "Annual data have no season. Choose a monthly or quarterly indicator.",
    };
  const c = clean(input.points);
  const d = decompose(c.values, m);
  if (!d)
    return {
      ok: false,
      problem: pl
        ? "Za krótki szereg: sezonowość wymaga co najmniej dwóch pełnych lat."
        : "The series is too short: seasonality needs at least two full years.",
    };
  const unit = zUnit(cat, input.kpi.unit_key, c.values.at(-1));
  const name = kpiName(input.kpi, lang);
  const level = mean(d.trend.filter((v): v is number => v !== null));
  const relative = !unit.isRate && c.values.every((v) => v > 0);
  // Effects by position in the season, in calendar order starting from the first position of the year.
  const order = Array.from({ length: m }, (_, k) => k).sort((a, b) => positionOf(c.periods[a]!) - positionOf(c.periods[b]!));
  const eff = (k: number) => (relative ? (d.seasonal[k]! / level) * 100 : d.seasonal[k]!);
  const show = (k: number) => (relative ? pct(eff(k), lang) : `${signed(eff(k), lang, 2)} ${unit.isRate ? "pp" : unit.symbol}`.trim());
  const hi = order.reduce((a, b) => (d.seasonal[b]! > d.seasonal[a]! ? b : a));
  const lo = order.reduce((a, b) => (d.seasonal[b]! < d.seasonal[a]! ? b : a));
  const strong = d.strength >= 0.6;
  const some = d.strength >= 0.3;
  const finding = some
    ? pl
      ? `${name}: ${strong ? "silna" : "umiarkowana"} sezonowość, najwyżej ${seasonName(c.periods[hi]!, lang)} (${show(hi)}), najniżej ${seasonName(c.periods[lo]!, lang)} (${show(lo)})`
      : `${name}: ${strong ? "strong" : "moderate"} seasonality, highest in ${seasonName(c.periods[hi]!, lang)} (${show(hi)}), lowest in ${seasonName(c.periods[lo]!, lang)} (${show(lo)})`
    : pl
      ? `${name}: brak wyraźnej sezonowości`
      : `${name}: no clear seasonality`;
  const profile: ZChartProps = {
    type: "grouped-bars",
    lang,
    unit: relative ? PERCENT : unit.isRate ? POINTS : unit,
    ariaLabel: finding,
    categories: order.map((k) => ({ key: String(k), label: seasonName(c.periods[k]!, lang, true) })),
    series: [
      {
        id: "season",
        label: pl ? "odchylenie od trendu" : "deviation from the trend",
        role: "hero",
        points: order.map((k) => ({ x: String(k), y: Math.round(eff(k) * 100) / 100 })),
      },
    ],
  };
  const adjusted: ZChartProps = {
    type: "line-highlight",
    lang,
    unit,
    ariaLabel: pl ? `${name} po usunięciu sezonu` : `${name} with the season removed`,
    series: [
      { id: "adj", label: pl ? "bez sezonu" : "season removed", role: "hero", points: c.periods.map((x, i) => ({ x, y: d.adjusted[i]! })) },
      { id: "raw", label: pl ? "dane" : "data", role: "context", points: c.periods.map((x, i) => ({ x, y: c.values[i]! })) },
    ],
  };
  return {
    ok: true,
    finding,
    cards: [
      {
        title: pl ? "Typowy rok: odchylenia od trendu" : "A typical year: deviations from the trend",
        sub: `${title(input, ctx)} · ${relative ? (pl ? "% wobec trendu" : "% against the trend") : pl ? "różnica wobec trendu" : "difference from the trend"}`,
        chart: profile,
      },
      {
        title: pl ? "Ten sam szereg bez sezonu" : "The same series without the season",
        sub: `${title(input, ctx)} · ${span(c, lang)}`,
        chart: adjusted,
      },
    ],
    facts: [
      {
        label: pl ? "Siła sezonu" : "Strength of the season",
        value: `${fmtNumber(d.strength * 100, lang, 0)}% ${pl ? "wahań wokół trendu to sezon" : "of the swings around the trend are seasonal"}`,
      },
      { label: pl ? "Najwyżej" : "Highest", value: `${seasonName(c.periods[hi]!, lang)} (${show(hi)})` },
      { label: pl ? "Najniżej" : "Lowest", value: `${seasonName(c.periods[lo]!, lang)} (${show(lo)})` },
      { label: pl ? "Okres" : "Period", value: `${span(c, lang)} · ${c.values.length}` },
    ],
    cautions: [
      ...gaps(c, pl),
      ...(some
        ? [
            pl
              ? "Porównuj ten wskaźnik rok do roku albo po usunięciu sezonu. Zmiana z miesiąca na miesiąc w dużej części powtarza się co roku."
              : "Compare this indicator year on year or with the season removed. Much of the change from one period to the next repeats every year.",
          ]
        : []),
      pl
        ? "Wzorzec jest średnią z całego okresu. Jeśli sezon zmieniał się w czasie, najnowsze lata mogą wyglądać inaczej."
        : "The pattern is an average over the whole period. If the season has changed over time, recent years may look different.",
    ],
    method: pl
      ? `Klasyczna dekompozycja addytywna: trend to średnia ruchoma z ${m} okresów, sezon to przeciętne odchylenie od trendu w danym ${m === 12 ? "miesiącu" : "kwartale"}, reszta to to, czego nie tłumaczy ani trend, ani sezon. Siła sezonu = 1 − wariancja reszty / wariancja (sezon + reszta).`
      : `Classical additive decomposition: the trend is a moving average over ${m} periods, the season is the average deviation from the trend in each ${m === 12 ? "month" : "quarter"}, the remainder is what neither explains. Strength = 1 − variance of the remainder / variance of (season + remainder).`,
  };
}

/** Month 1..12 or quarter 1..4 of a period (annual: 1). */
function positionOf(period: string): number {
  const mo = /^\d{4}-(\d{2})$/.exec(period);
  if (mo) return Number(mo[1]);
  const q = /^\d{4}-Q(\d)$/.exec(period);
  return q ? Number(q[1]) : 1;
}

// ---------- 3. forecast

const Z80 = 1.2816;

export function analyseForecast(input: SeriesInput, ctx: Ctx): Analysis {
  const { cat, lang } = ctx;
  const pl = lang === "pl";
  const c = clean(input.points);
  const m = SEASON[input.kpi.frequency];
  const h = m === 1 ? 3 : m;
  const f = forecast(c.values, m, h);
  if (!f)
    return {
      ok: false,
      problem: pl
        ? "Za krótki szereg: prognoza wymaga co najmniej dwóch lat danych miesięcznych lub kwartalnych albo ośmiu lat danych rocznych."
        : "The series is too short: a forecast needs two years of monthly or quarterly data, or eight years of annual data.",
    };
  const unit = zUnit(cat, input.kpi.unit_key, c.values.at(-1));
  const name = kpiName(input.kpi, lang);
  const val = (v: number) => fmtValue(v, input.kpi.unit_key, cat, lang);
  const future: string[] = [];
  let p = c.periods.at(-1)!;
  for (let k = 0; k < h; k++) future.push((p = nextPeriod(p)));
  const lo = f.forecast.mean.map((v, i) => v - Z80 * f.forecast.sd[i]!);
  const hi = f.forecast.mean.map((v, i) => v + Z80 * f.forecast.sd[i]!);
  const end = h - 1;
  const horizon = m === 1 ? (pl ? "Za 3 lata" : "In 3 years") : pl ? "Za rok" : "In a year";
  const finding = pl
    ? `${name}: ${horizon.toLowerCase()} (${fmtPeriod(future[end]!, lang)}) około ${val(f.forecast.mean[end]!)}, z 80% pewnością między ${val(lo[end]!)} a ${val(hi[end]!)}`
    : `${name}: ${horizon.toLowerCase()} (${fmtPeriod(future[end]!, lang)}) about ${val(f.forecast.mean[end]!)}, with 80% confidence between ${val(lo[end]!)} and ${val(hi[end]!)}`;
  const smoothing = f.forecast.method === "smoothing";
  const bt = f.backtest;
  const skill = bt.mae.smoothing !== null && bt.mae.naive !== null && bt.mae.naive > 0 ? (1 - bt.mae.smoothing / bt.mae.naive) * 100 : null;
  // Show the last six years of data so the forecast is readable.
  const shown = Math.min(c.values.length, 6 * m + (m === 1 ? 6 : 0));
  const from = c.values.length - shown;
  const lastX = c.periods.at(-1)!;
  const lastY = c.values.at(-1)!;
  const chart: ZChartProps = {
    type: "line-highlight",
    lang,
    unit,
    ariaLabel: finding,
    series: [
      {
        id: "y",
        label: name,
        role: "hero",
        points: [
          ...c.periods.slice(from).map((x, i) => ({ x, y: c.values[from + i]! })),
          ...future.map((x, i) => ({ x, y: f.forecast.mean[i]! })),
        ],
      },
      {
        id: "lo",
        label: pl ? "dolna granica (80%)" : "lower bound (80%)",
        points: [{ x: lastX, y: lastY }, ...future.map((x, i) => ({ x, y: lo[i]! }))],
      },
      {
        id: "hi",
        label: pl ? "górna granica (80%)" : "upper bound (80%)",
        points: [{ x: lastX, y: lastY }, ...future.map((x, i) => ({ x, y: hi[i]! }))],
      },
    ],
    opts: {
      forecastFrom: future[0]!,
      interval: { lower: "lo", upper: "hi" },
      intervalLabel: pl ? "przedział 80%" : "80% interval",
      endLabels: false,
    },
  };
  const methodName = smoothing
    ? pl
      ? m > 1
        ? "wygładzanie wykładnicze z trendem i sezonem (Holt-Winters)"
        : "wygładzanie wykładnicze z trendem (Holt)"
      : m > 1
        ? "exponential smoothing with trend and season (Holt-Winters)"
        : "exponential smoothing with trend (Holt)"
    : pl
      ? m > 1
        ? "metoda naiwna: tak jak rok wcześniej"
        : "metoda naiwna: tak jak ostatnio"
      : m > 1
        ? "naive: the same as a year earlier"
        : "naive: the same as the last value";
  const facts: Fact[] = [
    {
      label: `${horizon} (${fmtPeriod(future[end]!, lang)})`,
      value: `${val(f.forecast.mean[end]!)} (${val(lo[end]!)} – ${val(hi[end]!)})`,
    },
    { label: pl ? "Metoda" : "Method", value: methodName },
    ...(bt.tests
      ? [
          {
            label: pl ? "Sprawdzian na przeszłości" : "Test on the past",
            value:
              bt.mape !== null
                ? pl
                  ? `średni błąd ${fmtNumber(bt.mape, lang, 1)}% w ${bt.tests} próbach`
                  : `average error ${fmtNumber(bt.mape, lang, 1)}% over ${bt.tests} trials`
                : pl
                  ? `średni błąd ${val(smoothing ? bt.mae.smoothing! : bt.mae.naive!)} w ${bt.tests} próbach`
                  : `average error ${val(smoothing ? bt.mae.smoothing! : bt.mae.naive!)} over ${bt.tests} trials`,
          },
        ]
      : []),
    ...(skill !== null
      ? [
          {
            label: pl ? "Wobec metody naiwnej" : "Against the naive method",
            value:
              skill > 0
                ? pl
                  ? `błąd mniejszy o ${fmtNumber(skill, lang, 0)}%`
                  : `error smaller by ${fmtNumber(skill, lang, 0)}%`
                : pl
                  ? "nie lepsza: użyto metody naiwnej"
                  : "no better: the naive method is used",
          },
        ]
      : []),
  ];
  return {
    ok: true,
    finding,
    cards: [
      {
        title: pl ? "Dane i prognoza z przedziałem 80%" : "Data and forecast with the 80% interval",
        sub: `${title(input, ctx)} · ${pl ? "prognoza linią przerywaną" : "forecast dashed"}`,
        chart,
      },
    ],
    facts,
    cautions: [
      ...gaps(c, pl),
      ...(bt.tests === 0
        ? [
            pl
              ? "Szereg jest za krótki, by sprawdzić metodę na przeszłości: traktuj wynik jako orientacyjny."
              : "The series is too short to test the method on the past: treat the result as indicative.",
          ]
        : []),
      ...(bt.mape !== null && bt.mape > 10
        ? [
            pl
              ? `W przeszłości ta metoda myliła się średnio o ${fmtNumber(bt.mape, lang, 0)}%: to raczej kierunek niż liczba.`
              : `In the past this method was off by ${fmtNumber(bt.mape, lang, 0)}% on average: read it as a direction, not a number.`,
          ]
        : []),
      pl
        ? "Prognoza przedłuża dotychczasowy wzorzec. Nie zna decyzji, kryzysów ani zmian metodologii, a przedział zakłada, że przyszłe wahania będą takie jak dawne."
        : "The forecast extends the pattern so far. It knows nothing of decisions, crises or changes of method, and the interval assumes future swings like past ones.",
    ],
    method: pl
      ? "Dwie metody konkurują na przeszłości tego szeregu: wygładzanie wykładnicze (poziom, tłumiony trend i sezon, parametry dobrane tak, by błąd o jeden okres naprzód był najmniejszy) oraz metoda naiwna „tak jak rok wcześniej”. Każdą uruchamiamy z kilku wcześniejszych punktów i porównujemy z tym, co się naprawdę stało; wygrywa mniejszy średni błąd, a przy remisie prostsza. Przedział 80% wynika z rozrzutu dawnych błędów i rośnie z horyzontem."
      : "Two methods compete on this series' own past: exponential smoothing (level, damped trend and season, parameters chosen for the smallest one-step error) and the naive “same as a year earlier”. Each is run from several earlier points and compared with what really happened; the smaller average error wins and a tie goes to the simpler. The 80% interval comes from the spread of past errors and widens with the horizon.",
  };
}

// ---------- 4. relationship of two indicators

export function analyseRelation(a: SeriesInput, b: SeriesInput, ctx: Ctx): Analysis {
  const { cat, lang } = ctx;
  const pl = lang === "pl";
  if (a.kpi.kpi_key === b.kpi.kpi_key)
    return { ok: false, problem: pl ? "Wybierz dwa różne wskaźniki." : "Choose two different indicators." };
  if (a.kpi.frequency !== b.kpi.frequency)
    return {
      ok: false,
      problem: pl
        ? "Wskaźniki mają różną częstotliwość (np. miesięczną i roczną). Wybierz dwa o tej samej."
        : "The indicators have different frequencies (e.g. monthly and annual). Choose two with the same one.",
    };
  const m = SEASON[a.kpi.frequency];
  const ca = clean(a.points);
  const cb = clean(b.points);
  const bAt = new Map(cb.periods.map((p, i) => [p, cb.values[i]!]));
  const periods = ca.periods.filter((p) => bAt.has(p));
  if (periods.length < m + 8)
    return {
      ok: false,
      problem: pl
        ? "Za mało wspólnych okresów, by ocenić związek (potrzeba roku i ośmiu obserwacji zmian)."
        : "Too few common periods to judge the link (a year plus eight observations of change are needed).",
    };
  const aAt = new Map(ca.periods.map((p, i) => [p, ca.values[i]!]));
  const ua = zUnit(cat, a.kpi.unit_key, 1);
  const ub = zUnit(cat, b.kpi.unit_key, 1);
  const da = change(
    periods.map((p) => aAt.get(p)!),
    m,
    !ua.isRate,
  );
  const db = change(
    periods.map((p) => bAt.get(p)!),
    m,
    !ub.isRate,
  );
  const c0 = correlation(da, db);
  if (!c0)
    return {
      ok: false,
      problem: pl
        ? "Jeden ze wskaźników prawie się nie zmienia: nie ma czego porównywać."
        : "One of the indicators hardly changes: there is nothing to compare.",
    };
  const maxLag = m === 12 ? 12 : m === 4 ? 4 : 2;
  const cc = crossCorrelation(da, db, maxLag);
  const best = cc.reduce((x, y) => (Math.abs(y.r) > Math.abs(x.r) ? y : x), { lag: 0, r: c0.r, n: c0.n });
  const leads = best.lag !== 0 && Math.abs(best.r) - Math.abs(c0.r) > 0.1 && Math.abs(best.r) >= 0.4;
  const na = kpiName(a.kpi, lang);
  const nb = kpiName(b.kpi, lang);
  const abs = Math.abs(leads ? best.r : c0.r);
  const strength =
    abs >= 0.7 ? (pl ? "silny" : "strong") : abs >= 0.4 ? (pl ? "umiarkowany" : "moderate") : abs >= 0.2 ? (pl ? "słaby" : "weak") : null;
  const same = (leads ? best.r : c0.r) > 0;
  const unitName = (k: number) => {
    const n = Math.abs(k);
    if (m === 12) return pl ? (n === 1 ? "miesiąc" : n < 5 ? "miesiące" : "miesięcy") : n === 1 ? "month" : "months";
    if (m === 4) return pl ? (n === 1 ? "kwartał" : n < 5 ? "kwartały" : "kwartałów") : n === 1 ? "quarter" : "quarters";
    return pl ? (n === 1 ? "rok" : "lata") : n === 1 ? "year" : "years";
  };
  const r2 = (v: number) => fmtNumber(v, lang, 2);
  const leader = best.lag > 0 ? na : nb;
  const follower = best.lag > 0 ? nb : na;
  const finding = !strength
    ? pl
      ? `${na} i ${nb}: zmiany nie są ze sobą powiązane (korelacja ${r2(c0.r)})`
      : `${na} and ${nb}: their changes are not linked (correlation ${r2(c0.r)})`
    : leads
      ? pl
        ? `${leader} wyprzedza ${follower} o ${Math.abs(best.lag)} ${unitName(best.lag)}: związek ${strength}, ${same ? "w tę samą stronę" : "w przeciwną stronę"} (korelacja ${r2(best.r)})`
        : `${leader} leads ${follower} by ${Math.abs(best.lag)} ${unitName(best.lag)}: a ${strength} link, ${same ? "in the same direction" : "in the opposite direction"} (correlation ${r2(best.r)})`
      : pl
        ? `${na} i ${nb}: związek ${strength}, zmiany idą ${same ? "w tę samą stronę" : "w przeciwne strony"} (korelacja ${r2(c0.r)})`
        : `${na} and ${nb}: a ${strength} link, changes move ${same ? "in the same direction" : "in opposite directions"} (correlation ${r2(c0.r)})`;
  const pairs = periods
    .map((p, i) => ({ p, x: da[i], y: db[i] }))
    .filter((r): r is { p: string; x: number; y: number } => r.x !== null && r.y !== null);
  const chg = (u: ZUnit) => (u.isRate ? POINTS : PERCENT);
  const yoy = pl ? "zmiana r/r" : "change y/y";
  const scatter: ZChartProps = {
    type: "scatter",
    lang,
    unit: chg(ub),
    ariaLabel: finding,
    categories: pairs.map((r) => ({ key: r.p, label: fmtPeriod(r.p, lang) })),
    series: [
      { id: "x", label: `${na}, ${yoy}`, unit: chg(ua), points: pairs.map((r) => ({ x: r.p, y: Math.round(r.x * 100) / 100 })) },
      { id: "y", label: `${nb}, ${yoy}`, unit: chg(ub), points: pairs.map((r) => ({ x: r.p, y: Math.round(r.y * 100) / 100 })) },
    ],
    opts: { trend: true },
  };
  const lags: ZChartProps = {
    type: "grouped-bars",
    lang,
    unit: PLAIN,
    ariaLabel: pl ? "Korelacja przy różnych przesunięciach w czasie" : "Correlation at different shifts in time",
    categories: cc.map((x) => ({ key: String(x.lag), label: x.lag === 0 ? "0" : signed(x.lag, lang, 0) })),
    highlight: String(leads ? best.lag : 0),
    series: [
      {
        id: "r",
        label: pl ? "korelacja" : "correlation",
        role: "hero",
        points: cc.map((x) => ({ x: String(x.lag), y: Math.round(x.r * 100) / 100 })),
      },
    ],
  };
  const geo = geoName(cat, a.geo, lang);
  return {
    ok: true,
    finding,
    cards: [
      {
        title: pl
          ? "Każdy punkt to jeden okres: zmiana jednego wobec zmiany drugiego"
          : "Each dot is one period: the change of one against the change of the other",
        sub: `${geo} · ${yoy}: ${na} (${pl ? "poziomo" : "across"}), ${nb} (${pl ? "pionowo" : "up"}) · ${pairs.length} ${pl ? "okresów" : "periods"}`,
        chart: scatter,
      },
      {
        title: pl ? "Kto kogo wyprzedza: korelacja przy przesunięciu w czasie" : "Which one leads: correlation at a shift in time",
        sub: pl
          ? `Przesunięcie w ${m === 12 ? "miesiącach" : m === 4 ? "kwartałach" : "latach"}: po prawej ${na} wyprzedza, po lewej ${nb}`
          : `Shift in ${m === 12 ? "months" : m === 4 ? "quarters" : "years"}: right, ${na} leads; left, ${nb} leads`,
        chart: lags,
      },
    ],
    facts: [
      { label: pl ? "Korelacja zmian w tym samym okresie" : "Correlation of changes in the same period", value: r2(c0.r) },
      {
        label: pl ? "Najsilniejszy związek" : "Strongest link",
        value:
          best.lag === 0
            ? pl
              ? "w tym samym okresie"
              : "in the same period"
            : `${leader} ${pl ? "wyprzedza o" : "leads by"} ${Math.abs(best.lag)} ${unitName(best.lag)} (${r2(best.r)})`,
      },
      { label: pl ? "Pewność związku" : "Confidence in the link", value: sureness(c0.p, pl) },
      {
        label: pl ? "Wspólny okres" : "Common period",
        value: `${fmtPeriod(pairs[0]!.p, lang)}–${fmtPeriod(pairs.at(-1)!.p, lang)} · ${pairs.length}`,
      },
    ],
    cautions: [
      pl
        ? "Korelacja nie oznacza przyczyny. Oba wskaźniki może napędzać trzeci czynnik, na przykład koniunktura."
        : "Correlation is not causation. A third factor, such as the business cycle, may drive both.",
      ...(pairs.length < 24
        ? [
            pl
              ? "Mało obserwacji: kilka nietypowych okresów może zmienić wynik."
              : "Few observations: a handful of unusual periods can change the result.",
          ]
        : []),
      ...(leads
        ? [
            pl
              ? "Wyprzedzanie wynika z danych z przeszłości. Nie gwarantuje, że tak będzie dalej."
              : "The lead comes from past data. It does not guarantee the same ahead.",
          ]
        : []),
    ],
    method: pl
      ? "Porównujemy zmiany rok do roku (dla poziomów w procentach, dla stóp w punktach procentowych), a nie same wartości: dwa rosnące szeregi zawsze wyglądają na powiązane, nawet gdy nic ich nie łączy, a zmiana roczna usuwa też sezon. Korelacja Pearsona od −1 do 1; przesunięcie w czasie sprawdza, czy zmiany jednego wskaźnika pojawiają się wcześniej niż drugiego."
      : "We compare year-on-year changes (per cent for levels, percentage points for rates), not the values themselves: two rising series always look linked even when nothing connects them, and the yearly change also removes the season. Pearson correlation runs from −1 to 1; the shift in time checks whether the changes of one indicator come before the other's.",
  };
}

// ---------- 5. convergence across regions

export type RegionsInput = { kpi: Kpi; units: { geo: string; points: Point[] }[]; scopePl: string; scopeEn: string };

export function analyseConvergence(input: RegionsInput, ctx: Ctx): Analysis {
  const { cat, lang } = ctx;
  const pl = lang === "pl";
  const units = input.units.map((u) => ({ geo: u.geo, c: clean(u.points) })).filter((u) => u.c.values.length);
  if (units.length < 5)
    return {
      ok: false,
      problem: pl ? "Ten wskaźnik nie ma danych dla co najmniej pięciu regionów." : "This indicator has no data for at least five regions.",
    };
  // Periods every unit has, one per year (the last of the year).
  const common = units[0]!.c.periods.filter((p) => units.every((u) => u.c.periods.includes(p)));
  const byYear = new Map<string, string>();
  for (const p of common) byYear.set(p.slice(0, 4), p);
  const periods = [...byYear.values()];
  if (periods.length < 5)
    return { ok: false, problem: pl ? "Za mało wspólnych lat (potrzeba pięciu)." : "Too few common years (five are needed)." };
  const at = (u: (typeof units)[number], p: string) => u.c.values[u.c.periods.indexOf(p)]!;
  const panel = units.map((u) => periods.map((p) => at(u, p)));
  const unit = zUnit(cat, input.kpi.unit_key, panel[0]![0]);
  const level = !unit.isRate && panel.every((u) => u.every((v) => v > 0));
  const disp = dispersion(panel, !level).map((v) => (level ? v * 100 : v));
  const d0 = disp[0]!;
  const d1 = disp.at(-1)!;
  const rel = d0 === 0 ? 0 : (d1 - d0) / d0;
  const years = Number(periods.at(-1)!.slice(0, 4)) - Number(periods[0]!.slice(0, 4));
  const beta = level
    ? betaConvergence(
        panel.map((u) => u[0]!),
        panel.map((u) => u.at(-1)!),
        years,
      )
    : null;
  const name = kpiName(input.kpi, lang);
  const scope = pl ? input.scopePl : input.scopeEn;
  const show = (v: number) => (level ? `${fmtNumber(v, lang, 1)}%` : `${fmtNumber(v, lang, 2)} pp`);
  const verdict = rel <= -0.05 ? "down" : rel >= 0.05 ? "up" : "flat";
  const y0 = periods[0]!.slice(0, 4);
  const y1 = periods.at(-1)!.slice(0, 4);
  const finding =
    verdict === "down"
      ? pl
        ? `${name}: różnice między ${scope} maleją, rozrzut spadł z ${show(d0)} do ${show(d1)} (${y0}–${y1})`
        : `${name}: differences between ${scope} are shrinking, the spread fell from ${show(d0)} to ${show(d1)} (${y0}–${y1})`
      : verdict === "up"
        ? pl
          ? `${name}: różnice między ${scope} rosną, rozrzut wzrósł z ${show(d0)} do ${show(d1)} (${y0}–${y1})`
          : `${name}: differences between ${scope} are widening, the spread rose from ${show(d0)} to ${show(d1)} (${y0}–${y1})`
        : pl
          ? `${name}: różnice między ${scope} prawie się nie zmieniły (rozrzut ${show(d0)} → ${show(d1)}, ${y0}–${y1})`
          : `${name}: differences between ${scope} have hardly changed (spread ${show(d0)} → ${show(d1)}, ${y0}–${y1})`;
  const sigma: ZChartProps = {
    type: "line-highlight",
    lang,
    unit: level ? PERCENT : POINTS,
    ariaLabel: finding,
    series: [
      {
        id: "cv",
        label: pl ? "rozrzut między regionami" : "spread between regions",
        role: "hero",
        points: periods.map((p, i) => ({ x: p.slice(0, 4), y: Math.round(disp[i]! * 100) / 100 })),
      },
    ],
    opts: { zeroBase: true, markers: true },
  };
  const cards: AnalysisCard[] = [
    {
      title: pl ? "Rozrzut między regionami rok po roku" : "Spread between regions year by year",
      sub: level
        ? pl
          ? `Współczynnik zmienności (odchylenie standardowe / średnia), %, ${units.length} regionów`
          : `Coefficient of variation (standard deviation / mean), %, ${units.length} regions`
        : pl
          ? `Odchylenie standardowe między regionami, pp, ${units.length} regionów`
          : `Standard deviation between regions, pp, ${units.length} regions`,
      chart: sigma,
    },
  ];
  const facts: Fact[] = [
    { label: pl ? `Rozrzut w ${y0}` : `Spread in ${y0}`, value: show(d0) },
    { label: pl ? `Rozrzut w ${y1}` : `Spread in ${y1}`, value: show(d1) },
  ];
  const firsts = panel.map((u) => u[0]!);
  const lasts = panel.map((u) => u.at(-1)!);
  if (level)
    facts.push({
      label: pl ? "Najwyższy do najniższego" : "Highest to lowest",
      value: `${fmtNumber(Math.max(...firsts) / Math.min(...firsts), lang, 2)}× → ${fmtNumber(Math.max(...lasts) / Math.min(...lasts), lang, 2)}×`,
    });
  if (beta) {
    const catching = beta.beta < 0 && beta.p < 0.1;
    facts.push({
      label: pl ? "Czy słabsze rosły szybciej" : "Did the weaker grow faster",
      value: catching
        ? pl
          ? `tak (pewność ${sureness(beta.p, pl)})`
          : `yes (confidence ${sureness(beta.p, pl)})`
        : beta.p >= 0.1
          ? pl
            ? "nie widać zależności: tempo nie zależało od poziomu startowego"
            : "no pattern: growth did not depend on the starting level"
          : pl
            ? "nie: szybciej rosły silniejsze"
            : "no: the stronger grew faster",
    });
    if (catching && beta.halfLife)
      facts.push({
        label: pl ? "Tempo wyrównywania" : "Speed of catching up",
        value: pl
          ? `połowa dystansu znika w około ${fmtNumber(beta.halfLife, lang, 0)} lat`
          : `half the gap closes in about ${fmtNumber(beta.halfLife, lang, 0)} years`,
      });
    cards.push({
      title: catching
        ? pl
          ? "Regiony, które startowały niżej, rosły szybciej"
          : "Regions that started lower grew faster"
        : pl
          ? "Tempo wzrostu nie zależało wyraźnie od poziomu startowego"
          : "Growth did not clearly depend on the starting level",
      sub: pl
        ? `Poziom w ${y0} (poziomo) i średni roczny wzrost ${y0}–${y1} (pionowo), ${units.length} regionów`
        : `Level in ${y0} (across) and average yearly growth ${y0}–${y1} (up), ${units.length} regions`,
      chart: {
        type: "scatter",
        lang,
        unit: PERCENT,
        ariaLabel: pl ? "Poziom startowy a średni roczny wzrost" : "Starting level against average yearly growth",
        categories: units.map((u) => ({ key: u.geo, label: geoName(cat, u.geo, lang) })),
        series: [
          { id: "x", label: `${name}, ${y0}`, unit, points: units.map((u, i) => ({ x: u.geo, y: firsts[i]! })) },
          {
            id: "y",
            label: pl ? "średni roczny wzrost" : "average yearly growth",
            unit: PERCENT,
            points: units.map((u, i) => ({ x: u.geo, y: Math.round(beta.points[i]!.growth * 100) / 100 })),
          },
        ],
        opts: { trend: true, labels: "all" },
      },
    });
  }
  return {
    ok: true,
    finding,
    cards,
    facts,
    cautions: [
      pl
        ? `${units.length} regionów to mało obserwacji: wniosek o „doganianiu” traktuj jako wskazówkę, nie dowód.`
        : `${units.length} regions are few observations: treat the catching-up conclusion as a hint, not proof.`,
      ...(level
        ? []
        : [
            pl
              ? "To stopa lub udział, więc liczymy tylko rozrzut w punktach procentowych, bez tempa wzrostu."
              : "This is a rate or a share, so only the spread in percentage points is measured, not growth.",
          ]),
      pl
        ? "Mniejszy rozrzut nie mówi, czy wszystkim jest lepiej: regiony mogą się zbliżać także wtedy, gdy liderzy zwalniają."
        : "A smaller spread does not say everyone is better off: regions also converge when the leaders slow down.",
    ],
    method: pl
      ? "Dwie klasyczne miary konwergencji. Sigma: rozrzut wartości między regionami w każdym roku (współczynnik zmienności); spadek oznacza wyrównywanie. Beta: regresja średniego rocznego wzrostu regionu względem logarytmu jego poziomu startowego; ujemne nachylenie oznacza, że słabsze regiony rosły szybciej."
      : "Two classic measures of convergence. Sigma: the spread of values between regions in each year (coefficient of variation); a fall means convergence. Beta: a regression of each region's average yearly growth on the log of its starting level; a negative slope means the weaker regions grew faster.",
  };
}

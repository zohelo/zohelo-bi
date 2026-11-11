// Card spec (dashboard format v3) + data-layer series → ZChartData, for every chart type of the library.
// Two pure steps so the page can fetch in between and tests can run without React:
//   planCard(card, cat, state)        → which series to fetch (or why the card cannot be drawn)
//   buildCard(plan, results, cat, lang) → ZChartData, the subtitle, and the finding tokens for the title
// Encoding per type follows packages/visuals/src/z/types.ts (x = period for time charts, x = category key for
// category charts, scatter ids "x"/"y", one series for bullet and waterfall, one series per indicator for the
// sparkline table, one series per member plus the KPI's total for contributions).

import type { Catalog, Kpi, Series, SeriesQuery } from "../../data";
import type { Lang } from "../../i18n";
import { fmtSigned, type ZCategory, type ZChartData, type ZScoreRow, type ZSeries, type ZUnit } from "@zohelo/visuals";
import {
  judgeYardstick,
  measureValue,
  v3Areas,
  v3ChartFit,
  type V3Card,
  type V3ChartType,
  type V3Period,
  type YardstickMeasure,
} from "@zohelo/semantic";
import { frameworkFor } from "./yardsticks";
import { decimalsFor, fmtNumber, fmtPeriod, fmtValue, freqLabel, unitSymbol } from "../format";
import { geoName, kpiName, memberName, sourceName, zUnit } from "../chartData";
import type { DashState } from "./state";

export type Text = { pl: string; en: string };
export type Fetch = { id: string; kpi: string; query: SeriesQuery };

type KpiCtx = { kpi: Kpi; hero: string; source: string; members: Record<string, string>; from: string; to: string };

export type Plan = {
  card: V3Card;
  main: KpiCtx;
  /** Category geographies (empty when the card splits by a dimension or is a time chart of one area). */
  areas: string[];
  level: "country" | "voivodeship";
  others: KpiCtx[];
  fetches: Fetch[];
  notes: Text[];
};

export type Built = {
  z: ZChartData;
  sub: string;
  /** Finding tokens for {value} {period} {geo} {top} {bottom} {from} {to}. */
  facts: Record<string, string>;
  source: string;
  empty: boolean;
};

const TIME: V3ChartType[] = [
  "line-band",
  "line-highlight",
  "columns",
  "contributions",
  "small-multiples",
  "area-share",
  "heatmap",
  "sparkline-table",
  "scorecard",
];
const TWO_POINT: V3ChartType[] = ["grouped-bars", "dumbbell", "slope", "diverging-bars", "waterfall", "stacked-bars"];
const LATEST: V3ChartType[] = ["ranked-bars", "tile-map", "histogram", "scatter", "bullet", "segmented-bar", "pyramid"];

export const DEFAULT_PERIOD: Partial<Record<V3ChartType, V3Period>> = {
  heatmap: "5y",
  "sparkline-table": "5y",
  scorecard: "5y",
  contributions: "5y",
};
const NEIGHBOURS = ["EU27", "DE", "CZ", "SK", "HU"];

/** Two-letter voivodeship codes for tile labels. */
export const VOIV_CODE: Record<string, string> = {
  "PL-02": "DŚ",
  "PL-04": "KP",
  "PL-06": "LU",
  "PL-08": "LB",
  "PL-10": "ŁD",
  "PL-12": "MP",
  "PL-14": "MZ",
  "PL-16": "OP",
  "PL-18": "PK",
  "PL-20": "PD",
  "PL-22": "PM",
  "PL-24": "ŚL",
  "PL-26": "ŚK",
  "PL-28": "WM",
  "PL-30": "WP",
  "PL-32": "ZP",
};

/** Charts whose window the card's period control changes (time charts and two-period charts). */
export function periodApplies(chart: V3ChartType): boolean {
  return TIME.includes(chart) || TWO_POINT.includes(chart);
}

// --- periods ---------------------------------------------------------------------------------------------

export function shiftYears(period: string, years: number): string {
  return String(Number(period.slice(0, 4)) + years) + period.slice(4);
}

/** Start or end of a year-or-period bound in a KPI's frequency ("2015" → "2015-01" for monthly). */
export function alignPeriod(p: string, freq: Kpi["frequency"], end: boolean): string {
  const y = p.slice(0, 4);
  if (freq === "A") return y;
  if (freq === "Q")
    return /Q\d$/.test(p) ? p : /^\d{4}-\d{2}$/.test(p) ? `${y}-Q${Math.ceil(Number(p.slice(5)) / 3)}` : `${y}-Q${end ? 4 : 1}`;
  return /^\d{4}-\d{2}$/.test(p)
    ? p
    : /Q\d$/.test(p)
      ? `${y}-${String(Number(p.slice(-1)) * 3 - (end ? 0 : 2)).padStart(2, "0")}`
      : `${y}-${end ? "12" : "01"}`;
}

/** Inclusive window [from, to] of a period spec for a KPI, clamped to its data. */
export function windowFor(spec: V3Period, kpi: Kpi, sameSub = false): { from: string; to: string } {
  const clampTo = (p: string) => (p > kpi.last_period ? kpi.last_period : p);
  if (typeof spec === "object") {
    const to = clampTo(spec.to ? alignPeriod(spec.to, kpi.frequency, true) : kpi.last_period);
    let from = sameSub && /^\d{4}$/.test(spec.from) ? spec.from + to.slice(4) : alignPeriod(spec.from, kpi.frequency, false);
    if (from < kpi.first_period) from = kpi.first_period;
    return { from, to };
  }
  const to = kpi.last_period;
  if (spec === "max") {
    const first = sameSub ? kpi.first_period.slice(0, 4) + to.slice(4) : kpi.first_period;
    return { from: first < kpi.first_period ? shiftYears(first, 1) : first, to };
  }
  const n = spec === "1y" ? 1 : spec === "5y" ? 5 : 10;
  const from = shiftYears(to, -n);
  return { from: from < kpi.first_period ? kpi.first_period : from, to };
}

// --- planning --------------------------------------------------------------------------------------------

function ctxFor(kpi: Kpi, card: V3Card, state: DashState, cat: Catalog, notes: Text[], primary: boolean): KpiCtx {
  let hero = "PL";
  if (state.geo && state.geo !== "PL") {
    if (kpi.geographies.includes(state.geo)) hero = state.geo;
    else if (primary)
      notes.push({
        pl: `dane dla: Polska (brak danych dla: ${geoName(cat, state.geo, "pl")})`,
        en: `data for Poland (no data for ${geoName(cat, state.geo, "en")})`,
      });
  }
  let source = kpi.source_keys[0] ?? "";
  if (state.source) {
    if (kpi.source_keys.includes(state.source)) source = state.source;
    else if (primary) notes.push({ pl: `źródło: ${sourceName(cat, source, "pl")}`, en: `source: ${sourceName(cat, source, "en")}` });
  }
  const members: Record<string, string> = {};
  for (const [d, m] of Object.entries(state.members)) {
    if (kpi.dimension_keys.includes(d) && d !== card.split && !(card.chart === "pyramid" && (d === "sex" || d === "age"))) members[d] = m;
    else if (primary) {
      const name = cat.dimensions.find((x) => x.dimension_key === d);
      notes.push({ pl: `filtr „${name?.name_pl ?? d}” nie dotyczy`, en: `filter "${name?.name_en ?? d}" does not apply` });
    }
  }
  const twoPoint = TWO_POINT.includes(card.chart);
  const spec: V3Period =
    (TIME.includes(card.chart) || twoPoint ? state.period : undefined) ?? card.period ?? DEFAULT_PERIOD[card.chart] ?? "10y";
  const w = windowFor(spec, kpi, twoPoint);
  if (card.chart === "heatmap") w.from = `${w.from.slice(0, 4)}-01`;
  if (LATEST.includes(card.chart)) w.from = w.to;
  return { kpi, hero, source, members, ...w };
}

function areasFor(
  card: V3Card,
  kpi: Kpi,
  cat: Catalog,
  state: DashState,
  notes: Text[],
): { areas: string[]; level: "country" | "voivodeship" } {
  const voiv = v3Areas(kpi, cat, "voivodeship");
  const countries = v3Areas(kpi, cat, "country");
  if (Array.isArray(card.geographies)) {
    const list = card.geographies.filter((g) => kpi.geographies.includes(g));
    const level = list.some((g) => voiv.includes(g)) ? "voivodeship" : "country";
    return { areas: list, level };
  }
  if (card.geographies === "voivodeships") return { areas: voiv, level: "voivodeship" };
  if (card.geographies === "eu") return { areas: ["PL", ...countries], level: "country" };
  if (card.chart === "tile-map" || card.chart === "histogram") {
    if (state.level === "country") notes.push({ pl: "tylko województwa", en: "voivodeships only" });
    return { areas: voiv, level: "voivodeship" };
  }
  let level: "country" | "voivodeship" = voiv.length ? "voivodeship" : "country";
  if (state.level === "country" && countries.length) level = "country";
  if (state.level === "voivodeship" && voiv.length) level = "voivodeship";
  return { areas: level === "voivodeship" ? voiv : ["PL", ...countries], level };
}

/** What a card needs fetched, or the reason (Polish / English) it cannot be drawn with this catalogue. */
export function planCard(card: V3Card, cat: Catalog, state: DashState): Plan | { problem: Text } {
  const kpi = cat.kpis.find((k) => k.kpi_key === card.kpi);
  if (!kpi) return { problem: { pl: `Brak wskaźnika ${card.kpi} w katalogu.`, en: `Indicator ${card.kpi} is not in the catalogue.` } };
  const misfit = v3ChartFit(card, kpi, cat);
  if (misfit)
    return {
      problem: { pl: `Ten wykres nie pasuje do wskaźnika: ${misfit[0]}.`, en: `This chart does not suit the indicator: ${misfit[1]}.` },
    };
  const notes: Text[] = [];
  if (state.period && LATEST.includes(card.chart) && card.chart !== "bullet")
    notes.push({ pl: "ostatni okres (filtr okresu nie dotyczy)", en: "latest period (period filter does not apply)" });
  const main = ctxFor(kpi, card, state, cat, notes, true);
  const others: KpiCtx[] = [];
  for (const key of card.compare ?? []) {
    const k = cat.kpis.find((x) => x.kpi_key === key);
    if (!k) return { problem: { pl: `Brak wskaźnika ${key} w katalogu.`, en: `Indicator ${key} is not in the catalogue.` } };
    others.push(ctxFor(k, card, state, cat, notes, false));
  }
  const q = (c: KpiCtx, extra: SeriesQuery = {}): SeriesQuery => ({
    geographies: [c.hero],
    sources: [c.source],
    members: c.members,
    from: c.from,
    to: c.to,
    ...extra,
  });
  const fetches: Fetch[] = [];
  let areas: string[] = [];
  let level: "country" | "voivodeship" = "country";
  const split = card.split;
  const chart = card.chart;
  const byArea =
    !split &&
    ![
      "line-band",
      "columns",
      "heatmap",
      "area-share",
      "pyramid",
      "sparkline-table",
      "scorecard",
      "waterfall",
      "stacked-bars",
      "segmented-bar",
    ].includes(chart);
  if (byArea && !(chart === "bullet" && others.length)) ({ areas, level } = areasFor(card, kpi, cat, state, notes));
  if (chart === "line-highlight" && byArea && !Array.isArray(card.geographies)) {
    // Hero plus context lines: neighbours for countries, every voivodeship (trimmed to extremes when built).
    const pool = level === "country" ? NEIGHBOURS.filter((g) => kpi.geographies.includes(g)) : areas;
    areas = [main.hero, ...pool.filter((g) => g !== main.hero)];
    if (level === "voivodeship" && main.hero !== "PL") areas.splice(1, 0, "PL");
  }

  switch (chart) {
    case "pyramid":
      fetches.push({ id: "m", kpi: kpi.kpi_key, query: q(main, { split: "age", members: { ...main.members, sex: "m" } }) });
      fetches.push({ id: "f", kpi: kpi.kpi_key, query: q(main, { split: "age", members: { ...main.members, sex: "f" } }) });
      break;
    case "scatter":
      fetches.push({ id: "main", kpi: kpi.kpi_key, query: q(main, { geographies: areas }) });
      fetches.push({ id: "x", kpi: others[0]!.kpi.kpi_key, query: q(others[0]!, { geographies: areas }) });
      break;
    case "sparkline-table":
      for (const c of [main, ...others]) fetches.push({ id: `k:${c.kpi.kpi_key}`, kpi: c.kpi.kpi_key, query: q(c) });
      break;
    case "scorecard":
      // Poland (or the page's area) for the value and trend, EU-27 for the comparison column. The measures look
      // up to three years back (plus one period), so the window is never shorter than four years.
      for (const c of [main, ...others]) {
        const from4 = alignPeriod(shiftYears(c.to, -4), c.kpi.frequency, false);
        fetches.push({
          id: `k:${c.kpi.kpi_key}`,
          kpi: c.kpi.kpi_key,
          query: q(c, {
            geographies: [c.hero, ...(c.kpi.geographies.includes("EU27") && c.hero !== "EU27" ? ["EU27"] : [])],
            from: c.from < from4 ? c.from : from4,
          }),
        });
      }
      break;
    case "contributions":
      // the members (components) and the KPI's total member (the headline drawn as a dot)
      fetches.push({ id: "main", kpi: kpi.kpi_key, query: q(main, { split }) });
      fetches.push({ id: "total", kpi: kpi.kpi_key, query: q(main) });
      break;
    case "bullet":
      if (others.length) {
        for (const c of [main, ...others]) fetches.push({ id: `k:${c.kpi.kpi_key}`, kpi: c.kpi.kpi_key, query: q(c) });
        break;
      }
      fetches.push({ id: "main", kpi: kpi.kpi_key, query: split ? q(main, { split }) : q(main, { geographies: areas }) });
      break;
    default:
      fetches.push({
        id: "main",
        kpi: kpi.kpi_key,
        query: split ? q(main, { split }) : byArea ? q(main, { geographies: areas }) : q(main),
      });
  }
  const ref = card.reference;
  if (typeof ref === "string" && kpi.geographies.includes(ref))
    fetches.push({ id: "ref", kpi: kpi.kpi_key, query: q(main, { geographies: [ref], from: main.to }) });
  return { card, main, areas, level, others, fetches, notes };
}

export function planKey(plan: Plan): string {
  return JSON.stringify(plan.fetches);
}

// --- building --------------------------------------------------------------------------------------------

const at = (s: Series | undefined, period: string): number | null => s?.points.find((p) => p.period === period)?.value ?? null;

function lastValue(s: ZSeries | undefined): { x: string; y: number } | null {
  for (let i = (s?.points.length ?? 0) - 1; i >= 0; i--) {
    const p = s!.points[i]!;
    if (p.y !== null) return { x: p.x, y: p.y };
  }
  return null;
}

const SHARE: ZUnit = { symbol: "%", isRate: true, decimals: 1 };

/** How a scorecard row is measured, as the reader sees it. */
const MEASURE_TEXT: Record<YardstickMeasure, Text> = {
  latest: { pl: "ostatnia wartość", en: "latest value" },
  avg12m: { pl: "średnia 12 miesięcy", en: "12-month average" },
  avg3y: { pl: "średnia 3 lat", en: "3-year average" },
  change1y: { pl: "zmiana r/r, %", en: "change y/y, %" },
  change3y: { pl: "zmiana w 3 lata, %", en: "3-year change, %" },
  change3y_pp: { pl: "zmiana w 3 lata, pp", en: "3-year change, pp" },
};

function rateOf(cat: Catalog, unitKey: string): boolean {
  return cat.units.find((u) => u.unit_key === unitKey)?.is_rate ?? false;
}

function memberKey(s: Series): string {
  return Object.entries(s.members).find(([, m]) => m !== "total")?.[1] ?? "total";
}

function shareOf(values: (number | null)[]): (number | null)[] {
  const sum = values.reduce<number>((a, v) => a + Math.max(0, v ?? 0), 0);
  return values.map((v) => (v === null || !sum ? null : (Math.max(0, v) / sum) * 100));
}

function round(v: number | null, d: number): number | null {
  return v === null ? null : Math.round(v * 10 ** d) / 10 ** d;
}

/** Categories and their latest values: one per area or, when split, one per dimension member. */
function categoryValues(plan: Plan, rows: Series[], cat: Catalog, lang: Lang, period: string) {
  const split = plan.card.split;
  return rows.map((s) => {
    const key = split ? memberKey(s) : s.geography;
    const label = split ? memberName(cat, split, key, lang) : geoName(cat, key, lang);
    return { key, label, series: s, value: at(s, period) };
  });
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function annualise(s: Series, rate: boolean, freq: Kpi["frequency"]): { x: string; y: number | null }[] {
  const per = freq === "M" ? 12 : freq === "Q" ? 4 : 1;
  const years = new Map<string, number[]>();
  for (const p of s.points) if (p.value !== null) years.set(p.period.slice(0, 4), [...(years.get(p.period.slice(0, 4)) ?? []), p.value]);
  return [...years.entries()]
    .filter(([, v]) => v.length === per)
    .map(([y, v]) => ({ x: y, y: rate ? v.reduce((a, b) => a + b, 0) / v.length : v[v.length - 1]! }));
}

/** Draw a planned card from the fetched series (results keyed by fetch id). */
export function buildCard(plan: Plan, results: Record<string, Series[]>, cat: Catalog, lang: Lang): Built {
  const { card, main } = plan;
  const kpi = main.kpi;
  const pl = lang === "pl";
  const rows = results.main ?? [];
  const sample = rows[0]?.points.find((p) => p.value !== null)?.value ?? 1;
  let unit: ZUnit = zUnit(cat, kpi.unit_key, sample);
  const rate = rateOf(cat, kpi.unit_key);
  let series: ZSeries[] = [];
  let categories: ZCategory[] | undefined;
  const facts: Record<string, string> = {
    geo: geoName(cat, main.hero, lang),
    from: fmtPeriod(main.from, lang),
    to: fmtPeriod(main.to, lang),
    period: fmtPeriod(main.to, lang),
  };
  const kpiUnit = unit;
  /** A value in the card's current unit (the KPI's own, or a share / change the builder switched to). */
  const fv = (v: number | null | undefined): string => {
    if (v === null || v === undefined) return "–";
    if (unit === kpiUnit) return fmtValue(v, kpi.unit_key, cat, lang);
    return `${fmtNumber(v, lang, unit.decimals)}${unit.symbol === "%" ? "%" : unit.symbol ? " " + unit.symbol : ""}`;
  };
  let autoReference: ZChartData["reference"];
  let total: ZSeries | undefined;
  let scorecard: ZScoreRow[] | undefined;
  let what = ""; // unit/measure part of the subtitle
  let range = `${fmtPeriod(main.from, lang)}–${fmtPeriod(main.to, lang)}`;
  const hero = card.highlight ?? (plan.areas.includes(main.hero) ? main.hero : undefined);
  const extremes = (items: { label: string; v: number | null }[]) => {
    const ok = items.filter((i): i is { label: string; v: number } => i.v !== null);
    if (!ok.length) return;
    const sorted = [...ok].sort((a, b) => b.v - a.v);
    facts.top = sorted[0]!.label;
    facts.bottom = sorted[sorted.length - 1]!.label;
  };
  const areaCount = (n: number) =>
    plan.level === "voivodeship"
      ? pl
        ? `${n} województw`
        : `${n} voivodeships`
      : pl
        ? `${n} ${n === 1 ? "kraj" : n < 5 ? "kraje" : "krajów"}`
        : `${n} countries`;
  const timeSeries = (list: Series[], roleHero: boolean): ZSeries[] =>
    list.map((s) => {
      const key = card.split ? memberKey(s) : s.geography;
      return {
        id: key,
        label: card.split ? memberName(cat, card.split, key, lang) : geoName(cat, key, lang),
        role: card.split || !roleHero ? "series" : key === (card.highlight ?? main.hero) ? "hero" : "context",
        points: s.points.map((p) => ({ x: p.period, y: p.value })),
      };
    });

  switch (card.chart) {
    case "line-band":
    case "line-highlight": {
      series = timeSeries(rows, card.chart === "line-highlight");
      if (card.chart === "line-highlight" && !card.split && plan.level === "voivodeship" && series.length > 6) {
        // Hero (and Poland) with the two highest and two lowest voivodeships as context.
        const fixed = series.filter((s) => s.id === main.hero || s.id === "PL");
        const rest = series.filter((s) => !fixed.includes(s)).sort((a, b) => (lastValue(b)?.y ?? 0) - (lastValue(a)?.y ?? 0));
        series = [...fixed, ...rest.slice(0, 2), ...rest.slice(-2)];
      }
      if (card.chart === "line-band") series = series.slice(0, 1).map((s) => ({ ...s, role: "hero" }));
      const last = lastValue(series.find((s) => s.role === "hero") ?? series[0]);
      if (last) Object.assign(facts, { value: fv(last.y), period: fmtPeriod(last.x, lang) });
      extremes(series.map((s) => ({ label: s.label, v: lastValue(s)?.y ?? null })));
      break;
    }
    case "columns": {
      const s = rows[0];
      const vals = s ? annualise(s, rate, kpi.frequency) : [];
      let pts = vals;
      if (!rate) {
        const diff = ["idx", "celsius", "years"].includes(kpi.unit_key);
        pts = vals.slice(1).map((p, i) => {
          const prev = vals[i]!.y;
          return {
            x: p.x,
            y: p.y === null || prev === null ? null : diff ? p.y - prev : prev ? ((p.y - prev) / Math.abs(prev)) * 100 : null,
          };
        });
        if (!diff) unit = { symbol: "%", isRate: true, decimals: 1 };
        what = diff
          ? pl
            ? `zmiana roczna, ${unitSymbol(cat, kpi.unit_key) || "pkt"}`
            : `annual change, ${unitSymbol(cat, kpi.unit_key) || "points"}`
          : pl
            ? "zmiana r/r, %"
            : "change y/y, %";
      } else if (kpi.frequency !== "A")
        what = pl ? `średnia roczna, ${unitSymbol(cat, kpi.unit_key)}` : `annual average, ${unitSymbol(cat, kpi.unit_key)}`;
      series = [
        { id: main.hero, label: geoName(cat, main.hero, lang), role: "hero", points: pts.map((p) => ({ x: p.x, y: round(p.y, 3) })) },
      ];
      const last = lastValue(series[0]);
      if (last) Object.assign(facts, { value: fv(last.y), period: last.x });
      range = pts.length ? `${pts[0]!.x}–${pts[pts.length - 1]!.x}` : range;
      break;
    }
    case "contributions": {
      // Components as delivered (either sign); the total is the KPI's own total member, else their sum.
      series = timeSeries(rows, false).map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x, y: round(p.y, 3) })) }));
      const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
      const own = results.total?.[0];
      const sum = (x: string) => {
        const vs = series.map((s) => s.points.find((p) => p.x === x)?.y ?? null).filter((v): v is number => v !== null);
        return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
      };
      total = {
        id: "total",
        label: kpiName(kpi, lang),
        points: xs.map((x) => ({ x, y: round(own ? at(own, x) : sum(x), 3) })),
      };
      unit = { symbol: "pp", isRate: true, decimals: 1 };
      const last = lastValue(total);
      if (last) Object.assign(facts, { value: `${fmtSigned(last.y, lang, 1)} pp`, period: fmtPeriod(last.x, lang) });
      if (last) extremes(series.map((s) => ({ label: s.label, v: s.points.find((p) => p.x === last.x)?.y ?? null })));
      what = pl ? "wkład, punkty procentowe" : "contribution, percentage points";
      break;
    }
    case "small-multiples": {
      series = timeSeries(rows, false).map((s) => ({ ...s, role: s.id === (card.highlight ?? main.hero) ? "hero" : "series" }));
      if (series.length > 9) {
        const fixed = series.filter((s) => s.id === main.hero);
        const rest = series.filter((s) => s.id !== main.hero).sort((a, b) => (lastValue(b)?.y ?? 0) - (lastValue(a)?.y ?? 0));
        series = [...fixed, ...rest.slice(0, 9 - fixed.length)];
      }
      extremes(series.map((s) => ({ label: s.label, v: lastValue(s)?.y ?? null })));
      what = pl ? `${unitSymbol(cat, kpi.unit_key)}, wspólna skala` : `${unitSymbol(cat, kpi.unit_key)}, shared scale`;
      break;
    }
    case "area-share": {
      const parts = timeSeries(rows, false);
      const xs = parts[0]?.points.map((p) => p.x) ?? [];
      const shares = xs.map((_, i) => shareOf(parts.map((s) => s.points[i]?.y ?? null)));
      series = parts.map((s, j) => ({ ...s, points: xs.map((x, i) => ({ x, y: round(shares[i]![j]!, 2) })) }));
      unit = SHARE;
      extremes(series.map((s) => ({ label: s.label, v: lastValue(s)?.y ?? null })));
      what = pl ? "udział, %" : "share, %";
      break;
    }
    case "heatmap": {
      // One monthly series; the chart lays it out month × year (at most the last 8 years).
      const s = rows[0];
      const years = [...new Set((s?.points ?? []).map((p) => p.period.slice(0, 4)))].slice(-8);
      const pts = (s?.points ?? []).filter((p) => years.includes(p.period.slice(0, 4)));
      series = [
        { id: main.hero, label: geoName(cat, main.hero, lang), role: "hero", points: pts.map((p) => ({ x: p.period, y: p.value })) },
      ];
      let best: { v: number; at: string } | null = null;
      for (const p of pts) if (p.value !== null && (!best || p.value > best.v)) best = { v: p.value, at: p.period };
      if (best) facts.top = fmtPeriod(best.at, lang);
      range = years.length ? `${years[0]}–${years[years.length - 1]}` : range;
      break;
    }
    case "ranked-bars":
    case "tile-map":
    case "segmented-bar": {
      const items = categoryValues(plan, rows, cat, lang, main.to);
      let values = items.map((i) => i.value);
      if (card.chart === "segmented-bar") {
        values = shareOf(values).map((v) => round(v, 2));
        unit = SHARE;
        what = pl ? "udział, %" : "share, %";
      }
      const order = items
        .map((it, i) => ({ ...it, v: values[i] ?? null }))
        .sort((a, b) => (card.chart === "tile-map" ? 0 : (b.v ?? -Infinity) - (a.v ?? -Infinity)));
      categories = order.map((o) => ({
        key: o.key,
        label: o.label,
        ...(card.chart === "tile-map" && VOIV_CODE[o.key] ? { short: VOIV_CODE[o.key] } : {}),
      }));
      series = [{ id: main.to, label: fmtPeriod(main.to, lang), role: "hero", points: order.map((o) => ({ x: o.key, y: o.v })) }];
      extremes(order.map((o) => ({ label: o.label, v: o.v })));
      range = `${fmtPeriod(main.to, lang)}${card.split ? "" : `, ${areaCount(order.length)}`}`;
      break;
    }
    case "grouped-bars":
    case "dumbbell":
    case "slope":
    case "diverging-bars": {
      let items = categoryValues(plan, rows, cat, lang, main.to).map((it) => ({ ...it, a: at(it.series, main.from), b: it.value }));
      const change = (i: { a: number | null; b: number | null }) =>
        i.a === null || i.b === null
          ? null
          : rate || card.chart !== "diverging-bars"
            ? i.b - i.a
            : i.a
              ? ((i.b - i.a) / Math.abs(i.a)) * 100
              : null;
      const max = card.chart === "grouped-bars" ? 8 : card.chart === "slope" ? 6 : card.chart === "dumbbell" ? 10 : 16;
      if (items.length > max) {
        const keep = items.filter((i) => i.key === main.hero);
        const rest = items
          .filter((i) => i.key !== main.hero)
          .sort((x, y) => (card.chart === "grouped-bars" ? (y.b ?? 0) - (x.b ?? 0) : Math.abs(change(y) ?? 0) - Math.abs(change(x) ?? 0)));
        items = [...keep, ...rest.slice(0, max - keep.length)];
      }
      if (card.chart === "diverging-bars") {
        const sorted = items.map((i) => ({ ...i, c: change(i) })).sort((x, y) => (y.c ?? -Infinity) - (x.c ?? -Infinity));
        categories = sorted.map((i) => ({ key: i.key, label: i.label }));
        const sym = kpi.unit_key === "pct" ? "pp" : unitSymbol(cat, kpi.unit_key);
        unit = rate ? { symbol: sym, isRate: true, decimals: 1 } : { symbol: "%", isRate: true, decimals: 1 };
        series = [
          { id: "change", label: pl ? "Zmiana" : "Change", role: "hero", points: sorted.map((i) => ({ x: i.key, y: round(i.c, 3) })) },
        ];
        extremes(sorted.map((i) => ({ label: i.label, v: i.c })));
        what = `${pl ? "zmiana" : "change"}, ${unit.symbol}`;
        range = `${fmtPeriod(main.from, lang)}–${fmtPeriod(main.to, lang)}`;
      } else {
        const sorted =
          card.chart === "grouped-bars"
            ? [...items].sort((x, y) => (y.b ?? -Infinity) - (x.b ?? -Infinity))
            : [...items].sort((x, y) => (change(y) ?? -Infinity) - (change(x) ?? -Infinity));
        categories = sorted.map((i) => ({ key: i.key, label: i.label }));
        series = [
          { id: main.from, label: fmtPeriod(main.from, lang), role: "context", points: sorted.map((i) => ({ x: i.key, y: i.a })) },
          { id: main.to, label: fmtPeriod(main.to, lang), role: "hero", points: sorted.map((i) => ({ x: i.key, y: i.b })) },
        ];
        if (card.chart === "grouped-bars") extremes(sorted.map((i) => ({ label: i.label, v: i.b })));
        else {
          const byAbs = [...sorted].sort((x, y) => Math.abs(change(y) ?? 0) - Math.abs(change(x) ?? 0));
          facts.top = byAbs[0]?.label ?? "–";
          facts.bottom = byAbs[byAbs.length - 1]?.label ?? "–";
        }
        range =
          card.chart === "dumbbell"
            ? `${fmtPeriod(main.from, lang)} → ${fmtPeriod(main.to, lang)}`
            : `${fmtPeriod(main.from, lang)} ${pl ? "i" : "and"} ${fmtPeriod(main.to, lang)}`;
      }
      range += card.split ? "" : `, ${areaCount(items.length)}`;
      break;
    }
    case "waterfall": {
      const items = categoryValues(plan, rows, cat, lang, main.to).map((it) => ({
        ...it,
        c: it.value === null || at(it.series, main.from) === null ? null : it.value - at(it.series, main.from)!,
      }));
      categories = items.map((i) => ({ key: i.key, label: i.label }));
      series = [{ id: "contribution", label: pl ? "Wkład" : "Contribution", points: items.map((i) => ({ x: i.key, y: round(i.c, 3) })) }];
      extremes(items.map((i) => ({ label: i.label, v: i.c })));
      what = pl ? `zmiana według składników, ${unitSymbol(cat, kpi.unit_key)}` : `change by component, ${unitSymbol(cat, kpi.unit_key)}`;
      break;
    }
    case "stacked-bars": {
      const ps = [
        main.from,
        shiftYears(main.from, Math.round((Number(main.to.slice(0, 4)) - Number(main.from.slice(0, 4))) / 2)),
        main.to,
      ].filter((p, i, a) => a.indexOf(p) === i);
      const parts = rows.map((s) => ({ key: memberKey(s), s }));
      const shares = ps.map((p) => shareOf(parts.map((x) => at(x.s, p))));
      categories = ps.map((p) => ({ key: p, label: fmtPeriod(p, lang) }));
      series = parts.map((x, j) => ({
        id: x.key,
        label: memberName(cat, card.split!, x.key, lang),
        points: ps.map((p, i) => ({ x: p, y: round(shares[i]![j]!, 2) })),
      }));
      unit = SHARE;
      extremes(series.map((s) => ({ label: s.label, v: lastValue(s)?.y ?? null })));
      what = pl ? "udział, %" : "share, %";
      range = ps.map((p) => fmtPeriod(p, lang)).join(", ");
      break;
    }
    case "pyramid": {
      const sides = (["m", "f"] as const).map((sex) => ({ sex, rows: results[sex] ?? [] }));
      const ages = (cat.dimensions.find((d) => d.dimension_key === "age")?.members ?? []).filter((m) => m.key !== "total");
      categories = ages.map((m) => ({ key: m.key, label: pl ? m.name_pl : m.name_en }));
      series = sides.map(({ sex, rows: r }) => ({
        id: sex,
        label: memberName(cat, "sex", sex, lang),
        points: ages.map((a) => ({
          x: a.key,
          y: at(
            r.find((s) => s.members.age === a.key),
            main.to,
          ),
        })),
      }));
      extremes(ages.map((a, i) => ({ label: categories![i]!.label, v: series.reduce((t, s) => t + (s.points[i]?.y ?? 0), 0) })));
      range = fmtPeriod(main.to, lang);
      break;
    }
    case "histogram": {
      const vals = categoryValues(plan, rows, cat, lang, main.to)
        .map((i) => i.value)
        .filter((v): v is number => v !== null);
      const lo = Math.min(...vals),
        hi = Math.max(...vals);
      const step = niceStep((hi - lo) / 5 || 1);
      const start = Math.floor(lo / step) * step;
      const bins: { a: number; b: number; n: number }[] = [];
      for (let a = start; a <= hi || !bins.length; a += step) bins.push({ a, b: a + step, n: 0 });
      for (const v of vals) bins[Math.min(bins.length - 1, Math.floor((v - start) / step))]!.n++;
      const d = decimalsFor(kpi.unit_key, step);
      categories = bins.map((b, i) => ({ key: `b${i}`, label: `${fmtNumber(b.a, lang, d)}–${fmtNumber(b.b, lang, d)}` }));
      series = [
        {
          id: "count",
          label: pl ? "Liczba województw" : "Voivodeships",
          role: "hero",
          points: bins.map((b, i) => ({ x: `b${i}`, y: b.n })),
        },
      ];
      const sorted = [...vals].sort((a, b) => a - b);
      const median = sorted.length ? (sorted[(sorted.length - 1) >> 1]! + sorted[sorted.length >> 1]!) / 2 : null;
      if (median !== null) autoReference = { value: median, label: `${pl ? "mediana" : "median"} ${fv(median)}` };
      unit = { symbol: "", isRate: false, decimals: 0 };
      facts.top = categories[bins.reduce((m, b, i) => (b.n > bins[m]!.n ? i : m), 0)]?.label ?? "–";
      what = pl
        ? `liczba województw w przedziałach wartości (${unitSymbol(cat, kpi.unit_key) || "pkt"})`
        : `number of voivodeships by value range (${unitSymbol(cat, kpi.unit_key) || "points"})`;
      range = `${fmtPeriod(main.to, lang)}, ${areaCount(vals.length)}`;
      break;
    }
    case "scatter": {
      const xs = results.x ?? [];
      const xk = plan.others[0]!;
      categories = plan.areas.map((g) => ({ key: g, label: geoName(cat, g, lang) }));
      series = [
        {
          id: "x",
          label: kpiName(xk.kpi, lang),
          unit: zUnit(cat, xk.kpi.unit_key, at(xs[0], xk.to) ?? 1),
          points: plan.areas.map((g) => ({
            x: g,
            y: at(
              xs.find((s) => s.geography === g),
              xk.to,
            ),
          })),
        },
        {
          id: "y",
          label: kpiName(kpi, lang),
          unit,
          points: plan.areas.map((g) => ({
            x: g,
            y: at(
              rows.find((s) => s.geography === g),
              main.to,
            ),
          })),
        },
      ];
      extremes(categories.map((c, i) => ({ label: c.label, v: series[1]!.points[i]!.y })));
      what = `${kpiName(xk.kpi, lang)} (${pl ? "oś X" : "x axis"}) ${pl ? "i" : "and"} ${kpiName(kpi, lang)} (${pl ? "oś Y" : "y axis"})`;
      range = `${fmtPeriod(main.to, lang)}, ${areaCount(plan.areas.length)}`;
      break;
    }
    case "bullet": {
      if (plan.others.length) {
        const ks = [main, ...plan.others];
        categories = ks.map((c) => ({ key: c.kpi.kpi_key, label: kpiName(c.kpi, lang) }));
        series = [
          {
            id: main.to,
            label: fmtPeriod(main.to, lang),
            role: "hero",
            points: ks.map((c) => ({ x: c.kpi.kpi_key, y: at(results[`k:${c.kpi.kpi_key}`]?.[0], c.to) })),
          },
        ];
        what = unitSymbol(cat, kpi.unit_key);
      } else {
        const items = categoryValues(plan, rows, cat, lang, main.to).sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
        const shown =
          items.length > 6 ? [...items.filter((i) => i.key === main.hero), ...items.filter((i) => i.key !== main.hero)].slice(0, 6) : items;
        categories = shown.map((i) => ({ key: i.key, label: i.label }));
        series = [{ id: main.to, label: fmtPeriod(main.to, lang), role: "hero", points: shown.map((i) => ({ x: i.key, y: i.value })) }];
        what = unitSymbol(cat, kpi.unit_key);
      }
      extremes(categories.map((c, i) => ({ label: c.label, v: series[0]!.points[i]!.y })));
      const v = series[0]!.points[0]?.y;
      if (v !== null && v !== undefined) facts.value = fv(v);
      range = fmtPeriod(main.to, lang);
      break;
    }
    case "scorecard": {
      const fw = frameworkFor(card.framework);
      const ks = [main, ...plan.others];
      const rowsOut: ZScoreRow[] = [];
      series = ks.map((c) => {
        const got = results[`k:${c.kpi.kpi_key}`] ?? [];
        const own = got.find((x) => x.geography === c.hero) ?? got[0];
        const eu = got.find((x) => x.geography === "EU27" && c.hero !== "EU27");
        const rule = fw?.rules.find((r) => r.kpi === c.kpi.kpi_key);
        const measure = rule?.measure ?? "latest";
        const yp = (x: Series | undefined) => (x?.points ?? []).map((p) => ({ period: p.period, value: p.value }));
        const m = measureValue(yp(own), c.kpi.frequency, measure);
        const e = measureValue(yp(eu), c.kpi.frequency, measure);
        const seriesUnit = zUnit(cat, c.kpi.unit_key, own?.points.at(-1)?.value ?? 1);
        const change = measure === "change1y" || measure === "change3y";
        rowsOut.push({
          id: c.kpi.kpi_key,
          measure: MEASURE_TEXT[measure][pl ? "pl" : "en"],
          value: m?.value ?? null,
          ...(change ? { valueUnit: SHARE } : measure === "change3y_pp" ? { valueUnit: { symbol: "pp", isRate: true, decimals: 1 } } : {}),
          period: m?.period,
          yardstick: rule ? (pl ? rule.label_pl : rule.label_en) : pl ? "brak progu" : "no yardstick",
          eu: e?.value ?? null,
          verdict: judgeYardstick(rule, m?.value),
          ...(rule && (pl ? rule.note_pl : rule.note_en) ? { note: (pl ? rule.note_pl : rule.note_en)! } : {}),
        });
        return {
          id: c.kpi.kpi_key,
          label: kpiName(c.kpi, lang),
          unit: seriesUnit,
          // The trend shows the card's window; the measures may have looked further back.
          points: (own?.points ?? []).filter((p) => p.period >= c.from).map((p) => ({ x: p.period, y: p.value })),
        };
      });
      scorecard = rowsOut;
      const met = rowsOut.filter((r) => r.verdict === "meets").length;
      const judged = rowsOut.filter((r) => r.verdict !== "none").length;
      facts.met = String(met);
      facts.judged = String(judged);
      what = fw ? (pl ? fw.name_pl : fw.name_en) : "";
      range = fw ? `${pl ? "progi" : "yardsticks"}: ${pl ? fw.source_pl : fw.source_en}` : "";
      break;
    }
    case "sparkline-table": {
      const ks = [main, ...plan.others];
      series = ks.map((c) => ({
        id: c.kpi.kpi_key,
        label: kpiName(c.kpi, lang),
        unit: zUnit(cat, c.kpi.unit_key, results[`k:${c.kpi.kpi_key}`]?.[0]?.points.at(-1)?.value ?? 1),
        points: (results[`k:${c.kpi.kpi_key}`]?.[0]?.points ?? []).map((p) => ({ x: p.period, y: p.value })),
      }));
      what = pl
        ? "ostatnia wartość, zmiana i trend; każda linia we własnej skali"
        : "latest value, change and trend; each line on its own scale";
      range = pl ? "ostatnie 5 lat" : "last 5 years";
      if (card.period && card.period !== "5y") range = `${fmtPeriod(main.from, lang)}–${fmtPeriod(main.to, lang)}`;
      break;
    }
  }

  // Reference, annotation, band, highlight.
  let reference = autoReference;
  const r = card.reference;
  if (typeof r === "number") reference = { value: r, label: fv(r) };
  else if (typeof r === "string") {
    const v =
      at(results.ref?.[0], main.to) ??
      (results.ref?.[0]
        ? (lastValue({ id: "", label: "", points: results.ref[0].points.map((p) => ({ x: p.period, y: p.value })) })?.y ?? null)
        : null);
    if (v !== null) reference = { value: v, label: `${geoName(cat, r, lang)}: ${fv(v)}` };
  } else if (r) reference = { value: r.value, label: pl ? r.label_pl : r.label_en };
  let annotate: ZChartData["annotate"];
  const a = card.annotate;
  const heroSeries = series.find((s) => s.role === "hero") ?? series[0];
  if (a && heroSeries) {
    if (typeof a === "object") annotate = { x: a.x, label: pl ? a.label_pl : a.label_en };
    else {
      const pts = heroSeries.points.filter((p): p is { x: string; y: number } => p.y !== null);
      const p =
        a === "last"
          ? pts[pts.length - 1]
          : pts.reduce<{ x: string; y: number } | undefined>((m, q) => (!m || (a === "max" ? q.y > m.y : q.y < m.y) ? q : m), undefined);
      if (p) annotate = { x: p.x, label: `${fmtPeriod(p.x, lang)}: ${fv(p.y)}` };
    }
  }
  if (facts.value === undefined) {
    const last = lastValue(heroSeries);
    if (last && card.chart !== "histogram") facts.value = fv(last.y);
  }
  facts.top ??= "–";
  facts.bottom ??= "–";

  const unitText =
    what ||
    unitSymbol(cat, kpi.unit_key) ||
    (pl ? cat.units.find((u) => u.unit_key === kpi.unit_key)?.name_pl : cat.units.find((u) => u.unit_key === kpi.unit_key)?.name_en) ||
    "";
  // Sparkline table and scatter name their measures in `what`; the rest lead with the KPI and its frequency.
  const own = card.chart === "sparkline-table" || card.chart === "scatter" || card.chart === "scorecard";
  const head = own
    ? [unitText.charAt(0).toUpperCase() + unitText.slice(1)]
    : [kpiName(kpi, lang), unitText, freqLabel(kpi.frequency, lang)];
  const parts = [...head, range, ...plan.notes.map((n) => (pl ? n.pl : n.en))].filter(Boolean);
  const sub = (pl ? card.sub_pl : card.sub_en) ?? parts.join(", ");
  const title = fillTokens(pl ? card.title_pl : card.title_en, facts);
  const z: ZChartData = {
    ...(scorecard ? { scorecard } : {}),
    type: card.chart,
    series,
    unit,
    lang,
    ariaLabel: title,
    formatPeriod: (p: string) => fmtPeriod(p, lang),
    ...(categories ? { categories } : {}),
    ...(card.band ? { band: card.band } : {}),
    ...(reference ? { reference } : {}),
    ...(hero && card.chart !== "scatter"
      ? { highlight: hero }
      : card.chart === "scatter" && plan.areas.includes(main.hero)
        ? { highlight: main.hero }
        : {}),
    ...(annotate ? { annotate } : {}),
    ...(card.chart === "waterfall" ? { totalLabel: pl ? "Zmiana razem" : "Total change" } : {}),
    ...(total ? { total } : {}),
  };
  const sources = [...new Set([main, ...plan.others].map((c) => sourceName(cat, c.source, lang)))];
  const empty = series.length === 0 || series.every((s) => s.points.every((p) => p.y === null));
  return { z, sub, facts, source: sources.join("; "), empty };
}

/** Replace {token}s in a title with the card's facts ("–" when the data has none). */
export function fillTokens(text: string, facts: Record<string, string>): string {
  return text.replace(/\{([a-z]+)\}/g, (m, k: string) => facts[k] ?? m);
}

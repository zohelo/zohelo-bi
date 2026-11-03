// Dummy data provider: deterministic synthetic series for every KPI in dummyCatalog.ts. The same KPI,
// geography and members always give the same numbers, so screenshots, tests and links are stable.

import { DIMENSIONS, DOMAINS, KPIS, LICENCES, SOURCES, UNITS } from "./dummyCatalog";
import type { Catalog, DataProvider, DummyKpi, Frequency, Geography, Kpi, Latest, Point, Series, SeriesQuery } from "./types";

export const GEOGRAPHIES: Geography[] = [
  { key: "PL", name_pl: "Polska", name_en: "Poland", level: "country", eu: true },
  ...(
    [
      ["PL02", "dolnośląskie", "Lower Silesia"],
      ["PL04", "kujawsko-pomorskie", "Kuyavia-Pomerania"],
      ["PL06", "lubelskie", "Lublin"],
      ["PL08", "lubuskie", "Lubusz"],
      ["PL10", "łódzkie", "Łódź"],
      ["PL12", "małopolskie", "Lesser Poland"],
      ["PL14", "mazowieckie", "Masovia"],
      ["PL16", "opolskie", "Opole"],
      ["PL18", "podkarpackie", "Subcarpathia"],
      ["PL20", "podlaskie", "Podlaskie"],
      ["PL22", "pomorskie", "Pomerania"],
      ["PL24", "śląskie", "Silesia"],
      ["PL26", "świętokrzyskie", "Holy Cross"],
      ["PL28", "warmińsko-mazurskie", "Warmia-Masuria"],
      ["PL30", "wielkopolskie", "Greater Poland"],
      ["PL32", "zachodniopomorskie", "West Pomerania"],
    ] as const
  ).map(([key, pl, en]) => ({ key, name_pl: pl, name_en: en, level: "voivodeship" as const, eu: false })),
  ...(
    [
      ["DE", "Niemcy", "Germany"],
      ["CZ", "Czechy", "Czechia"],
      ["SK", "Słowacja", "Slovakia"],
      ["HU", "Węgry", "Hungary"],
      ["LT", "Litwa", "Lithuania"],
      ["RO", "Rumunia", "Romania"],
      ["FR", "Francja", "France"],
      ["ES", "Hiszpania", "Spain"],
      ["IT", "Włochy", "Italy"],
      ["EU27", "UE-27", "EU-27"],
    ] as const
  ).map(([key, pl, en]) => ({ key, name_pl: pl, name_en: en, level: "country" as const, eu: true })),
];

const VOIVODESHIPS = GEOGRAPHIES.filter((g) => g.level === "voivodeship").map((g) => g.key);
const EU = GEOGRAPHIES.filter((g) => g.level === "country" && g.key !== "PL").map((g) => g.key);

const FIRST_YEAR = 2010;
/** Last period with data, per frequency (sample data stops where real releases would). */
const LAST: Record<Frequency, string> = { M: "2026-09", Q: "2026-Q2", A: "2025" };
const LOADED_AT = "2026-10-24T06:00:00Z";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function periods(freq: Frequency, from?: string, to?: string): string[] {
  const out: string[] = [];
  const [lastY, lastSub] = LAST[freq].split(/-Q?/).map(Number) as [number, number | undefined];
  for (let y = FIRST_YEAR; y <= lastY; y++) {
    if (freq === "A") out.push(String(y));
    else if (freq === "Q") for (let q = 1; q <= 4 && (y < lastY || q <= (lastSub ?? 4)); q++) out.push(`${y}-Q${q}`);
    else for (let m = 1; m <= 12 && (y < lastY || m <= (lastSub ?? 12)); m++) out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out.filter((p) => (!from || p >= from) && (!to || p.slice(0, to.length) <= to));
}

function yearsSinceStart(period: string): number {
  const y = Number(period.slice(0, 4));
  const sub =
    period.length === 4 ? 0.5 : period.includes("Q") ? (Number(period.slice(-1)) - 0.5) / 4 : (Number(period.slice(5, 7)) - 0.5) / 12;
  return y - FIRST_YEAR + sub;
}

function geographiesOf(k: DummyKpi): string[] {
  return k.geo === "nuts2" ? ["PL", ...VOIVODESHIPS, ...EU] : k.geo === "eu" ? ["PL", ...EU] : ["PL"];
}

/** Level shift per geography (regions and countries differ from Poland in a stable way). */
function geoFactor(k: DummyKpi, geo: string): number {
  if (geo === "PL") return 1;
  const r = rng(hash(k.kpi_key + geo))();
  return 0.65 + r * 0.7;
}

/**
 * Level of a breakdown member relative to the total. Rates (%, index) vary around the total; additive units
 * (counts, money, persons) and contributions (pp) are shares that sum to the total across a dimension's
 * members, so part-of-whole charts, pyramids and contribution charts add up.
 */
function memberFactor(k: DummyKpi, members: Record<string, string>): number {
  let f = 1;
  for (const [dim, m] of Object.entries(members)) {
    if (m === "total") continue;
    const weight = (key: string) => 0.7 + rng(hash(k.kpi_key + dim + key))() * 0.6;
    if (isRateLike(k) && k.unit_key !== "pp") {
      f *= weight(m);
      continue;
    }
    const others = DIMENSIONS.find((d) => d.dimension_key === dim)?.members.filter((x) => x.key !== "total") ?? [];
    const sum = others.reduce((acc, x) => acc + weight(x.key), 0) || 1;
    f *= weight(m) / sum;
  }
  return f;
}

function isRateLike(k: DummyKpi): boolean {
  return ["pct", "pp", "idx", "per_1000", "per_100k", "years", "rate_fx", "celsius", "ug_m3", "hours", "t_ha"].includes(k.unit_key);
}

/**
 * Contributions (unit pp, e.g. demand components to GDP growth): the members always sum to the total, but
 * unlike shares they swing and change sign (inventories, net exports), so contribution charts look real.
 */
function contributions(k: DummyKpi, geo: string, members: Record<string, string>, ps: string[], source: string): Point[] {
  const totalMembers = Object.fromEntries(Object.keys(members).map((d) => [d, "total"]));
  const total = generate(k, geo, totalMembers, ps, source);
  const [dim, m] = Object.entries(members).find(([, v]) => v !== "total")!;
  const keys = DIMENSIONS.find((d) => d.dimension_key === dim)
    ?.members.filter((x) => x.key !== "total")
    .map((x) => x.key) ?? [m];
  const share = memberFactor(k, { [dim]: m });
  const amp = Math.max(Math.abs(k.base), 1) * 0.7;
  const osc = (key: string, t: number) => {
    const r = rng(hash(`${k.kpi_key}|${dim}|${key}|osc`));
    const f = 0.8 + r() * 2.2,
      ph = r() * Math.PI * 2,
      w = 0.3 + r();
    return Math.sin(t * f + ph) * amp * w;
  };
  return total.map((pt) => {
    const t = yearsSinceStart(pt.period);
    const mean = keys.reduce((acc, key) => acc + osc(key, t), 0) / keys.length;
    const v = (pt.value ?? 0) * share + osc(m, t) - mean;
    return { period: pt.period, value: Math.round(v * 1000) / 1000 };
  });
}

const SEASONAL = /^(overnight_stays|tourists_accommodated|bed_occupancy|dwellings_started|building_permits)$/;
/** Contribution KPIs whose total is a headline KPI of the same page, so the total dot equals the headline. */
const HEADLINE: Record<string, string> = { gg_balance_subsectors: "gg_deficit_gdp", m3_contributions: "m3_growth" };
const RATE_CYCLE = /^(nbp_reference_rate|wibor_3m|lending_rate_new|deposit_rate_new|bond_yield_10y)$/;

/** One synthetic series: trend + smooth cycle + noise, with a 2022 shock for prices-like rates. */
function generate(k: DummyKpi, geo: string, members: Record<string, string>, ps: string[], source: string): Point[] {
  if (k.unit_key === "pp" && Object.values(members).some((m) => m !== "total")) return contributions(k, geo, members, ps, source);
  const headline = HEADLINE[k.kpi_key] ? byKey.get(HEADLINE[k.kpi_key]!) : undefined;
  if (headline) return generate(headline, geo, {}, ps, headline.sources[0]!);
  const rand = rng(hash(`${k.kpi_key}|${geo}|${JSON.stringify(members)}|${source}`));
  const gf = geoFactor(k, geo) * (k.unit_key === "pp" ? 1 : memberFactor(k, members));
  const srcShift = source === k.sources[0] ? 0 : (rand() - 0.5) * 0.02;
  const phase = rand() * Math.PI * 2;
  const amp = Math.abs(k.base) * k.noise * 1.5 + Math.abs(k.trend) * 0.6;
  let drift = 0;
  return ps.map((p) => {
    const t = yearsSinceStart(p);
    drift = drift * 0.85 + (rand() - 0.5) * amp * 0.5;
    let v = (k.base + k.trend * t) * (isRateLike(k) ? 1 : gf) + Math.sin(t * 0.9 + phase) * amp * 0.6 + drift;
    if (isRateLike(k)) v += (gf - 1) * Math.max(Math.abs(k.base), 1) * 0.6;
    if (/inflation|hicp|cpi/.test(k.kpi_key)) v += 12 * Math.exp(-((t - 13.1) ** 2) / 0.35);
    // Interest rates follow the 2022–2023 tightening cycle a few months after the inflation peak.
    if (RATE_CYCLE.test(k.kpi_key)) v += 4.5 * Math.exp(-((t - 13.4) ** 2) / 2.2);
    // Monthly seasonality where the real series is strongly seasonal (summer tourism peak, winter construction low).
    if (k.frequency === "M" && SEASONAL.test(k.kpi_key)) v *= 1 + 0.55 * Math.cos(((Number(p.slice(5, 7)) - 7.5) / 12) * 2 * Math.PI);
    if (k.unit_key !== "pct" && k.unit_key !== "pp" && k.base > 0 && v < 0) v = Math.abs(v) * 0.1;
    v *= 1 + srcShift;
    return { period: p, value: Math.round(v * 1000) / 1000 };
  });
}

function toKpi(k: DummyKpi): Kpi {
  const ps = periods(k.frequency);
  const geos = geographiesOf(k);
  return {
    kpi_key: k.kpi_key,
    name_pl: k.name_pl,
    name_en: k.name_en,
    unit_key: k.unit_key,
    frequency: k.frequency,
    group_key: k.group_key,
    domain_key: k.domain_key,
    source_keys: k.sources,
    geo_levels: k.geo === "nuts2" ? ["country", "voivodeship"] : ["country"],
    geographies: geos,
    dimension_keys: k.dims,
    first_period: ps[0]!,
    last_period: ps[ps.length - 1]!,
  };
}

const byKey = new Map(KPIS.map((k) => [k.kpi_key, k]));

function need(kpiKey: string): DummyKpi {
  const k = byKey.get(kpiKey);
  if (!k) throw new Error(`Nieznany wskaźnik: ${kpiKey}`);
  return k;
}

function nextRelease(freq: Frequency): string {
  return freq === "M" ? "2026-11-17" : freq === "Q" ? "2026-11-28" : "2027-03-31";
}

export const dummy: DataProvider = {
  mode: "dummy",
  async catalog(): Promise<Catalog> {
    return {
      generated_at: LOADED_AT,
      sample: true,
      domains: DOMAINS,
      kpis: KPIS.map(toKpi),
      units: UNITS,
      sources: SOURCES,
      licences: LICENCES,
      dimensions: DIMENSIONS,
      geographies: GEOGRAPHIES,
    };
  },
  async series(kpiKey: string, q: SeriesQuery = {}): Promise<Series[]> {
    const k = need(kpiKey);
    const all = geographiesOf(k);
    const geos = (q.geographies?.length ? q.geographies : ["PL"]).filter((g) => all.includes(g));
    const srcs = (q.sources?.length ? q.sources : [k.sources[0]!]).filter((s) => k.sources.includes(s));
    const ps = periods(k.frequency, q.from, q.to);
    const inWindow = new Set(ps);
    const base: Record<string, string> = {};
    for (const d of k.dims) base[d] = q.members?.[d] ?? "total";
    const splitDim = q.split && k.dims.includes(q.split) ? DIMENSIONS.find((d) => d.dimension_key === q.split) : undefined;
    const memberSets = splitDim
      ? splitDim.members.filter((m) => m.key !== "total").map((m) => ({ ...base, [splitDim.dimension_key]: m.key }))
      : [base];
    const out: Series[] = [];
    for (const geo of geos)
      for (const source of srcs)
        for (const members of memberSets)
          // Generate the whole history, then cut the window: a period's value never depends on the query.
          out.push({
            kpi_key: kpiKey,
            geography: geo,
            source_key: source,
            members,
            points: generate(k, geo, members, periods(k.frequency), source).filter((p) => inWindow.has(p.period)),
          });
    return out;
  },
  async latest(kpiKey: string, geography = "PL"): Promise<Latest> {
    const k = need(kpiKey);
    const ps = periods(k.frequency);
    const pts = generate(k, geography, Object.fromEntries(k.dims.map((d) => [d, "total"])), ps, k.sources[0]!);
    const n = pts.length;
    const lag = k.frequency === "M" ? 12 : k.frequency === "Q" ? 4 : 1;
    return {
      kpi_key: kpiKey,
      geography,
      source_key: k.sources[0]!,
      period: pts[n - 1]!.period,
      value: pts[n - 1]!.value!,
      previous_period: pts[n - 2]!.period,
      previous_value: pts[n - 2]!.value!,
      year_ago_value: k.frequency === "A" ? null : (pts[n - 1 - lag]?.value ?? null),
      flags: k.frequency === "M" && /inflation|hicp/.test(kpiKey) ? ["p"] : [],
      loaded_at: LOADED_AT,
      next_release: nextRelease(k.frequency),
    };
  },
};

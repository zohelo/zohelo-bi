// Samples of the chart library v2 types (docs/chart-library-proposal.md) and one sample per library variant that
// draws one of them. Sample data only: rounded, close to published GUS / NBP / Eurostat figures, never a source.

import { VARIANT_BY_ID } from "./library";
import { VOIVODESHIP_TILES } from "./tiles";
import type { ChartSample, ZCategory, ZPoint, ZSeries, ZUnit } from "./types";

export type ExtraType = "pie" | "waffle" | "strip" | "fan" | "symbol-map" | "sankey" | "kpi-card" | "sparkline" | "table" | "pareto";

const PCT: ZUnit = { symbol: "%", isRate: true, decimals: 1 };

const G = {
  time: { group_pl: "Zmiana w czasie", group_en: "Change over time" },
  part: { group_pl: "Część całości", group_en: "Part of a whole" },
  dist: { group_pl: "Rozkład", group_en: "Distribution" },
  rel: { group_pl: "Zależność i przestrzeń", group_en: "Relationship and space" },
  over: { group_pl: "Przegląd", group_en: "Overview" },
} as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NAME: Record<string, string> = Object.fromEntries(VOIVODESHIP_TILES.map((t) => [t.key, cap(t.name_pl)]));
const SHORT: Record<string, string> = {
  PL28: "Warm.-maz.",
  PL32: "Zach.-pom.",
  PL04: "Kuj.-pom.",
  PL26: "Świętokrz.",
  PL02: "Dolnośl.",
  PL30: "Wielkop.",
  PL18: "Podkarp.",
  PL12: "Małopol.",
  PL14: "Mazow.",
};
const VOIV_KEYS = VOIVODESHIP_TILES.map((t) => t.key).sort();
const voivCats = (keys = VOIV_KEYS): ZCategory[] =>
  keys.map((k) => ({ key: k, label: NAME[k] ?? k, ...(SHORT[k] ? { short: SHORT[k] } : {}) }));
const byVoiv = (id: string, label: string, values: Record<string, number>, unit?: ZUnit): ZSeries => ({
  id,
  label,
  ...(unit ? { unit } : {}),
  points: VOIV_KEYS.map((k) => ({ x: k, y: values[k] ?? null })),
});
const pts = (xs: string[], ys: number[]): ZPoint[] => xs.map((x, i) => ({ x, y: ys[i] ?? null }));

// ---------- data

/** Registered unemployment rate, %, end of year (rounded). */
const UNEMP: Record<string, Record<string, number>> = {
  "2005": {
    PL02: 18.9,
    PL04: 21.2,
    PL06: 17.3,
    PL08: 21.9,
    PL10: 16.9,
    PL12: 13.7,
    PL14: 13.3,
    PL16: 17.0,
    PL18: 17.7,
    PL20: 15.0,
    PL22: 17.9,
    PL24: 15.0,
    PL26: 20.8,
    PL28: 25.6,
    PL30: 14.8,
    PL32: 25.6,
  },
  "2015": {
    PL02: 8.5,
    PL04: 13.2,
    PL06: 11.7,
    PL08: 10.0,
    PL10: 10.3,
    PL12: 8.5,
    PL14: 8.0,
    PL16: 10.3,
    PL18: 13.2,
    PL20: 11.1,
    PL22: 8.8,
    PL24: 8.2,
    PL26: 12.6,
    PL28: 16.2,
    PL30: 6.1,
    PL32: 13.2,
  },
  "2020": {
    PL02: 5.4,
    PL04: 8.4,
    PL06: 8.1,
    PL08: 5.4,
    PL10: 5.9,
    PL12: 5.0,
    PL14: 4.6,
    PL16: 6.2,
    PL18: 8.9,
    PL20: 7.4,
    PL22: 5.5,
    PL24: 4.6,
    PL26: 8.4,
    PL28: 9.1,
    PL30: 3.6,
    PL32: 7.2,
  },
  "2025": {
    PL02: 4.0,
    PL04: 6.8,
    PL06: 6.5,
    PL08: 4.5,
    PL10: 5.0,
    PL12: 4.0,
    PL14: 3.6,
    PL16: 5.1,
    PL18: 8.2,
    PL20: 6.2,
    PL22: 4.2,
    PL24: 3.9,
    PL26: 8.9,
    PL28: 7.6,
    PL30: 2.9,
    PL32: 6.1,
  },
};

/** Population at 31 December 2024, persons (rounded). */
const POP: Record<string, number> = {
  PL02: 2_876_000,
  PL04: 2_005_000,
  PL06: 2_026_000,
  PL08: 975_000,
  PL10: 2_350_000,
  PL12: 3_432_000,
  PL14: 5_514_000,
  PL16: 942_000,
  PL18: 2_075_000,
  PL20: 1_156_000,
  PL22: 2_342_000,
  PL24: 4_322_000,
  PL26: 1_178_000,
  PL28: 1_371_000,
  PL30: 3_489_000,
  PL32: 1_632_000,
};

/** Registered unemployed persons (sample: from the rate and the working-age population). */
const UNEMPLOYED: Record<string, number> = Object.fromEntries(
  VOIV_KEYS.map((k) => [k, Math.round((POP[k]! * 0.47 * UNEMP["2025"]![k]!) / 100 / 100) * 100]),
);

/** Powiats per voivodeship (380 in all). */
const POWIATS: Record<string, number> = {
  PL02: 30,
  PL04: 23,
  PL06: 24,
  PL08: 14,
  PL10: 24,
  PL12: 22,
  PL14: 42,
  PL16: 12,
  PL18: 25,
  PL20: 17,
  PL22: 20,
  PL24: 36,
  PL26: 14,
  PL28: 21,
  PL30: 35,
  PL32: 21,
};

/** Small deterministic generator (mulberry32) for the simulated powiat values. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 380 powiats: simulated around the voivodeship rate (lognormal spread), two named ones at their real extremes. */
function powiatSample(): { cats: ZCategory[]; series: ZSeries[] } {
  const rand = rng(380);
  const normal = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  /** Soft ceiling: values above `cap` are pulled in (log-compressed) so no powiat passes the named extremes. */
  const tail = (cap: number, v: number) => (v <= cap ? v : Math.round((cap + Math.log1p(v - cap) * 1.5) * 10) / 10);
  const cats: ZCategory[] = [];
  const y15: ZPoint[] = [];
  const y25: ZPoint[] = [];
  for (const v of VOIV_KEYS) {
    for (let i = 1; i <= POWIATS[v]!; i++) {
      const key = `${v}-${String(i).padStart(2, "0")}`;
      const f = Math.exp(normal() * 0.42);
      let a = tail(24, Math.max(1.5, Math.round(UNEMP["2015"]![v]! * f * Math.exp(normal() * 0.08) * 10) / 10));
      let b = tail(16, Math.max(0.9, Math.round(UNEMP["2025"]![v]! * f * Math.exp(normal() * 0.08) * 10) / 10));
      let label = `powiat ${i} (${NAME[v]!.toLowerCase()})`;
      if (key === "PL14-01") [label, a, b] = ["Warszawa", 4.8, 1.4];
      if (key === "PL14-42") [label, a, b] = ["powiat szydłowiecki", 30.2, 21.9];
      cats.push({ key, label, short: label.replace(/^powiat /, "") });
      y15.push({ x: key, y: a });
      y25.push({ x: key, y: b });
    }
  }
  return {
    cats,
    series: [
      { id: "2015", label: "2015", points: y15 },
      { id: "2025", label: "2025", points: y25 },
    ],
  };
}
const POWIAT = powiatSample();

const quarters = (from: number, n: number) => Array.from({ length: n }, (_, i) => `${from + Math.floor(i / 4)}-Q${(i % 4) + 1}`);
const months = (y: number, m: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const k = y * 12 + (m - 1) + i;
    return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`;
  });

// CPI y/y, NBP-style projection: actuals to 2025-Q3, central path and percentile bands from there.
const CPI_Q = quarters(2023, 20);
const CPI_ACT = [17.0, 13.9, 9.7, 6.5, 2.8, 2.5, 4.5, 4.8, 4.9, 4.1, 2.9];
const CPI_PROJ = [2.9, 2.7, 2.6, 2.8, 2.9, 2.7, 2.6, 2.5, 2.5];
const CPI_CENTRAL = [...CPI_ACT, ...CPI_PROJ];
const LAST_ACT = CPI_ACT.length - 1;
const bandPts = (q: number, up: boolean) =>
  CPI_Q.map((x, i) => {
    if (i < LAST_ACT) return { x, y: null };
    const h = i - LAST_ACT;
    const half = Math.min(2.6, 0.38 * h) * q;
    const skew = up ? 1.12 : 0.92;
    return { x, y: Math.round((CPI_CENTRAL[i]! + (up ? half * skew : -half * skew)) * 10) / 10 };
  });

// GUS population projection 2023–2060, mln: shared history, then three variants.
const POP_X = ["2000", "2005", "2010", "2015", "2020", "2023", "2025", "2030", "2035", "2040", "2045", "2050", "2055", "2060"];
const POP_HIST = [38.26, 38.16, 38.53, 38.44, 38.27, 37.64];
const scenario = (proj: number[]) => pts(POP_X, [...POP_HIST, ...proj]);

const CPI_M = months(2024, 9, 25);
const CPI_MONTHLY = [
  4.9, 5.0, 4.7, 4.7, 4.9, 4.9, 4.9, 4.3, 4.0, 4.1, 3.1, 2.9, 2.9, 2.8, 2.9, 3.1, 3.0, 2.9, 2.8, 2.6, 2.7, 2.8, 3.0, 3.1, 2.9,
];
const EMP_X = ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
const EMP = [67.8, 69.3, 70.9, 72.2, 73.0, 73.6, 75.4, 76.7, 77.9, 78.6, 78.9];
const GDP_Q = quarters(2022, 18);
const GDP_QQ = [2.4, -2.1, 0.9, -0.4, 1.1, 0.3, 0.6, 0.2, 0.4, 1.2, 0.3, 1.3, 0.7, 0.8, 0.9, -0.2, 0.8, 0.9];

/** NUTS 1 macroregions (2018) with their voivodeships, for the matrix with subtotals. */
const MACRO: [string, string, string[]][] = [
  ["M1", "Makroregion południowy", ["PL12", "PL24"]],
  ["M2", "Makroregion północno-zachodni", ["PL30", "PL32", "PL08"]],
  ["M3", "Makroregion południowo-zachodni", ["PL02", "PL16"]],
  ["M4", "Makroregion północny", ["PL04", "PL28", "PL22"]],
  ["M5", "Makroregion centralny", ["PL10", "PL26"]],
  ["M6", "Makroregion wschodni", ["PL06", "PL18", "PL20"]],
  ["M7", "Makroregion województwo mazowieckie", ["PL14"]],
];
const POP_2015: Record<string, number> = {
  PL02: 2_904_000,
  PL04: 2_087_000,
  PL06: 2_140_000,
  PL08: 1_018_000,
  PL10: 2_494_000,
  PL12: 3_373_000,
  PL14: 5_349_000,
  PL16: 996_000,
  PL18: 2_128_000,
  PL20: 1_188_000,
  PL22: 2_308_000,
  PL24: 4_571_000,
  PL26: 1_253_000,
  PL28: 1_439_000,
  PL30: 3_476_000,
  PL32: 1_710_000,
};
const THOUS: ZUnit = { symbol: "tys.", isRate: false, decimals: 0 };
const thous = (v: Record<string, number>) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Math.round(x / 1000)]));

const MIGR_KEYS = ["PL14", "PL12", "PL30", "PL02", "PL22"];
const MIGR: [string, string, number][] = [
  ["PL14", "PL12", 2100],
  ["PL14", "PL30", 1300],
  ["PL14", "PL02", 1200],
  ["PL14", "PL22", 1500],
  ["PL12", "PL14", 3400],
  ["PL12", "PL30", 500],
  ["PL12", "PL02", 900],
  ["PL12", "PL22", 600],
  ["PL30", "PL14", 2300],
  ["PL30", "PL12", 500],
  ["PL30", "PL02", 1700],
  ["PL30", "PL22", 900],
  ["PL02", "PL14", 1800],
  ["PL02", "PL12", 800],
  ["PL02", "PL30", 1500],
  ["PL02", "PL22", 600],
  ["PL22", "PL14", 2000],
  ["PL22", "PL12", 500],
  ["PL22", "PL30", 800],
  ["PL22", "PL02", 500],
];

// ---------- one sample per type

export const EXTRA_SAMPLES: Record<ExtraType, ChartSample> = {
  pie: {
    type: "pie",
    kind_pl: "Kołowy",
    kind_en: "Pie",
    ...G.part,
    title: "Węgiel wciąż daje ponad połowę prądu",
    sub: "Produkcja energii elektrycznej według źródła, TWh, 2024 (dane przykładowe)",
    use_pl: "Jedna całość w 2–5 częściach, gdy liczy się udział, a nie dokładne porównanie części.",
    avoid_pl: "Więcej niż 5 części, porównanie kilku całości albo zmiana w czasie (użyj słupków lub warstw).",
    use_en: "One whole in 2–5 parts, when the share matters more than comparing the parts exactly.",
    avoid_en: "More than 5 parts, comparing several wholes or change over time (use bars or stacked areas).",
    lang: "pl",
    unit: { symbol: "TWh", isRate: false, decimals: 1 },
    ariaLabel: "Węgiel kamienny i brunatny dały w 2024 roku 56% produkcji energii elektrycznej, wiatr 16%.",
    categories: [
      { key: "hard_coal", label: "Węgiel kamienny", short: "W. kamienny" },
      { key: "lignite", label: "Węgiel brunatny", short: "W. brunatny" },
      { key: "gas", label: "Gaz ziemny" },
      { key: "wind", label: "Wiatr" },
      { key: "solar", label: "Słońce" },
      { key: "biomass", label: "Biomasa i biogaz" },
      { key: "hydro", label: "Woda" },
      { key: "other", label: "Inne paliwa" },
    ],
    series: [
      {
        id: "generation",
        label: "Produkcja",
        points: pts(
          ["hard_coal", "lignite", "gas", "wind", "solar", "biomass", "hydro", "other"],
          [57.0, 32.5, 17.8, 25.6, 13.2, 7.5, 2.0, 3.5],
        ),
      },
    ],
  },
  waffle: {
    type: "waffle",
    kind_pl: "Waflowy",
    kind_en: "Waffle",
    ...G.part,
    title: "27 na 100 seniorów żyje poniżej granicy ubóstwa relatywnego",
    sub: "Osoby w wieku 65+ zagrożone ubóstwem relatywnym, %, 2024 (dane przykładowe)",
    use_pl: "Jeden udział, który ma być zrozumiały od razu („27 na 100”), także dla odbiorców spoza statystyki.",
    avoid_pl: "Małe różnice między udziałami, więcej niż 4 części albo wartości poniżej 1%.",
    use_en: "One share that must be understood at once (“27 in 100”), also by readers outside statistics.",
    avoid_en: "Small differences between shares, more than 4 parts or values below 1%.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "27 na 100 osób w wieku 65 lat i więcej jest zagrożonych ubóstwem relatywnym.",
    categories: [{ key: "arop", label: "Zagrożeni ubóstwem relatywnym" }],
    series: [{ id: "arop65", label: "Odsetek osób 65+", points: [{ x: "arop", y: 27.0 }] }],
  },
  strip: {
    type: "strip",
    kind_pl: "Rozkład punktowy",
    kind_en: "Strip plot",
    ...G.dist,
    title: "Województwa zbliżyły się do siebie, podkarpackie wciąż wysoko",
    sub: "Stopa bezrobocia rejestrowanego w 16 województwach, %, koniec roku",
    use_pl: "Każda jednostka jako punkt: widać rozrzut, skupienia i wartości odstające, z jedną jednostką wyróżnioną.",
    avoid_pl: "Setki jednostek w wąskim zakresie (punkty się nakładają: użyj roju) albo potrzeba dokładnych wartości.",
    use_en: "Every unit as a dot: spread, clusters and outliers are visible, with one unit highlighted.",
    avoid_en: "Hundreds of units in a narrow range (dots overlap: use a beeswarm) or when exact values are needed.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Rozrzut stóp bezrobocia w województwach zmalał z 13–26% w 2005 roku do 3–9% w 2025 roku; podkarpackie ma 8,2%.",
    categories: voivCats(),
    highlight: "PL18",
    series: ["2005", "2015", "2025"].map((y) => byVoiv(y, y, UNEMP[y]!)),
  },
  fan: {
    type: "fan",
    kind_pl: "Wachlarzowy",
    kind_en: "Fan chart",
    ...G.time,
    title: "Inflacja ma pozostać blisko celu, ale niepewność rośnie z horyzontem",
    sub: "Inflacja CPI r/r, %, kwartalnie; projekcja z pasmami percentyli (dane przykładowe w stylu NBP)",
    use_pl: "Projekcja z niepewnością: ścieżka centralna i pasma prawdopodobieństwa, które rozszerzają się z horyzontem.",
    avoid_pl: "Prognoza bez oszacowanej niepewności (pasma byłyby zmyślone) albo wiele serii naraz.",
    use_en: "A projection with uncertainty: the central path and probability bands that widen with the horizon.",
    avoid_en: "A forecast without an estimated uncertainty (the bands would be invented) or many series at once.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Według projekcji inflacja CPI utrzyma się w pobliżu 2,5–2,9% do końca 2027 roku, z rosnącym pasmem niepewności.",
    reference: { value: 2.5, label: "cel NBP 2,5%" },
    opts: {
      fan: [
        ["p10", "p90"],
        ["p30", "p70"],
      ],
    },
    series: [
      { id: "central", label: "Ścieżka centralna", role: "hero", points: pts(CPI_Q, CPI_CENTRAL) },
      { id: "p10", label: "10. percentyl", points: bandPts(1, false) },
      { id: "p90", label: "90. percentyl", points: bandPts(1, true) },
      { id: "p30", label: "30. percentyl", points: bandPts(0.4, false) },
      { id: "p70", label: "70. percentyl", points: bandPts(0.4, true) },
    ],
  },
  "symbol-map": {
    type: "symbol-map",
    kind_pl: "Kartodiagram",
    kind_en: "Proportional symbol map",
    ...G.rel,
    title: "Co siódmy mieszkaniec Polski mieszka na Mazowszu",
    sub: "Ludność według województw, osoby, 31 grudnia 2024 (dane przykładowe)",
    use_pl: "Liczby bezwzględne na mapie (ludność, liczba firm): pole koła rośnie z wartością.",
    avoid_pl: "Stopy i udziały (użyj kartogramu) albo wiele małych jednostek, których koła się zasłaniają.",
    use_en: "Absolute counts on a map (population, firms): the circle area grows with the value.",
    avoid_en: "Rates and shares (use a choropleth) or many small units whose circles hide each other.",
    lang: "pl",
    unit: { symbol: "osób", isRate: false, decimals: 0 },
    ariaLabel: "Najwięcej mieszkańców ma mazowieckie (5,5 mln) i śląskie (4,3 mln), najmniej opolskie (0,9 mln).",
    categories: voivCats(),
    highlight: "PL14",
    series: [byVoiv("population", "Ludność", POP)],
  },
  sankey: {
    type: "sankey",
    kind_pl: "Diagram Sankeya",
    kind_en: "Sankey",
    ...G.rel,
    title: "Mazowieckie przyciąga najwięcej osób z innych regionów",
    sub: "Migracje wewnętrzne na pobyt stały między pięcioma województwami, osoby, 2023 (dane przykładowe)",
    use_pl: "Przepływy między dwoma zbiorami (skąd → dokąd), gdy liczą się zarówno sumy, jak i kierunki.",
    avoid_pl: "Więcej niż kilkanaście połączeń albo przepływy w wielu etapach (rysunek staje się nieczytelny).",
    use_en: "Flows between two sets (from → to), when both totals and directions matter.",
    avoid_en: "More than a dozen or so links, or flows over many stages (the drawing gets unreadable).",
    lang: "pl",
    unit: { symbol: "osób", isRate: false, decimals: 0 },
    ariaLabel:
      "Z pięciu województw najwięcej osób przeprowadziło się do mazowieckiego (9 500), najwięcej z mazowieckiego wyjechało do małopolskiego.",
    categories: voivCats(MIGR_KEYS),
    highlight: "PL14",
    series: [{ id: "migration", label: "Migracje", points: MIGR.map(([a, b, v]) => ({ x: `${a}>${b}`, y: v })) }],
  },
  "kpi-card": {
    type: "kpi-card",
    kind_pl: "Karta wskaźnika",
    kind_en: "KPI card",
    ...G.over,
    title: "Inflacja",
    sub: "CPI, r/r, %, miesięcznie (dane przykładowe)",
    use_pl: "Najnowsza wartość jednego wskaźnika i jej zmiana, na górze pulpitu.",
    avoid_pl: "Porównanie wielu wskaźników lub regionów (użyj tabeli albo słupków).",
    use_en: "The latest value of one indicator and its change, at the top of a dashboard.",
    avoid_en: "Comparing many indicators or regions (use a table or bars).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Inflacja CPI wyniosła we wrześniu 2026 roku 2,9% r/r, o 0,2 pkt proc. mniej niż w sierpniu.",
    series: [{ id: "cpi", label: "Inflacja CPI, r/r", points: pts(CPI_M, CPI_MONTHLY) }],
  },
  sparkline: {
    type: "sparkline",
    kind_pl: "Mikrowykres",
    kind_en: "Sparkline",
    ...G.over,
    title: "Inflacja w ostatnich dwóch latach",
    sub: "CPI, r/r, %, wrzesień 2024 – wrzesień 2026 (dane przykładowe)",
    use_pl: "Kształt trendu w tekście, tabeli lub karcie, bez osi; ostatnia wartość podpisana.",
    avoid_pl: "Odczyt konkretnych wartości z przeszłości albo porównanie skal kilku serii.",
    use_en: "The shape of a trend in text, a table or a card, without axes; the last value labelled.",
    avoid_en: "Reading specific past values or comparing the scales of several series.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Inflacja CPI spadła z 4,9% we wrześniu 2024 roku do 2,9% we wrześniu 2026 roku.",
    series: [{ id: "cpi", label: "Inflacja CPI, r/r", points: pts(CPI_M, CPI_MONTHLY) }],
  },
  table: {
    type: "table",
    kind_pl: "Tabela",
    kind_en: "Table",
    ...G.over,
    title: "Bezrobocie spadło w każdym województwie",
    sub: "Stopa bezrobocia rejestrowanego, %, koniec roku",
    use_pl: "Dokładne wartości do odczytania i porównania w wierszach i kolumnach.",
    avoid_pl: "Pokazanie jednego wniosku lub trendu (wykres przekazuje go szybciej).",
    use_en: "Exact values to look up and compare across rows and columns.",
    avoid_en: "Telling one finding or trend (a chart conveys it faster).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Stopa bezrobocia spadła w latach 2015–2025 we wszystkich województwach; najwyższa jest w świętokrzyskim (8,9%).",
    categories: voivCats().sort((a, b) => a.label.localeCompare(b.label, "pl")),
    highlight: "PL14",
    series: ["2015", "2020", "2025"].map((y) => byVoiv(y, y, UNEMP[y]!)),
  },
  pareto: {
    type: "pareto",
    kind_pl: "Pareto",
    kind_en: "Pareto",
    ...G.part,
    title: "Sześć województw daje cztery piąte eksportu",
    sub: "Eksport towarów według województwa siedziby eksportera, mld zł, 2024 (dane przykładowe)",
    use_pl: "Które części całości liczą się najbardziej: słupki od największej i linia udziału narastająco na jednej osi procentowej.",
    avoid_pl: "Średnie, stopy i udziały (części się nie sumują) oraz szeregi czasowe (kolejność to czas, nie wielkość).",
    use_en: "Which parts of a whole matter most: bars from the largest and the cumulative share as a line on one per-cent axis.",
    avoid_en: "Averages, rates and shares (the parts do not add up) and time series (the order is time, not size).",
    lang: "pl",
    unit: { symbol: "mld zł", isRate: false, decimals: 0 },
    ariaLabel: "Mazowieckie, śląskie, wielkopolskie, dolnośląskie, małopolskie i pomorskie dają razem 80% eksportu towarów.",
    categories: voivCats(),
    series: [
      byVoiv("exports", "Eksport", {
        PL14: 410,
        PL24: 230,
        PL30: 200,
        PL02: 180,
        PL12: 130,
        PL22: 120,
        PL10: 60,
        PL04: 55,
        PL32: 40,
        PL18: 40,
        PL06: 25,
        PL08: 25,
        PL16: 22,
        PL26: 20,
        PL28: 18,
        PL20: 12,
      }),
    ],
  },
};

// ---------- one sample per library variant drawn by these types

/** A variant sample: the base sample with the variant's chart and options (copied from the library, never edited). */
function variant(id: string, base: ChartSample, patch: Partial<ChartSample> = {}): ChartSample {
  const v = VARIANT_BY_ID[id];
  if (!v) throw new Error(`Unknown chart variant ${id}`);
  const { opts: _drop, ...rest } = { ...base, ...patch };
  void _drop;
  return { ...rest, type: v.chart, ...(v.opts ? { opts: structuredClone(v.opts) } : {}) };
}

const S = EXTRA_SAMPLES;

export const EXTRA_VARIANT_SAMPLES: Record<string, ChartSample> = {
  "pie.pie": variant("pie.pie", S.pie),
  "pie.donut": variant("pie.donut", S.pie, {
    title: "Co piąty mieszkaniec jest w wieku poprodukcyjnym",
    sub: "Ludność według ekonomicznych grup wieku, mln, 2024 (dane przykładowe)",
    unit: { symbol: "mln", isRate: false, decimals: 1 },
    ariaLabel: "Z 37,6 mln mieszkańców 22,4 mln jest w wieku produkcyjnym, 8,4 mln w poprodukcyjnym, 6,8 mln w przedprodukcyjnym.",
    categories: [
      { key: "pre", label: "Przedprodukcyjny (0–17)", short: "0–17" },
      { key: "work", label: "Produkcyjny (18–64/59)", short: "18–64/59" },
      { key: "post", label: "Poprodukcyjny (65/60+)", short: "65/60+" },
    ],
    series: [{ id: "population", label: "Ludność", points: pts(["pre", "work", "post"], [6.8, 22.4, 8.4]) }],
  }),
  "waffle.grid": variant("waffle.grid", S.waffle),
  "strip.strip": variant("strip.strip", S.strip),
  "strip.beeswarm": variant("strip.beeswarm", S.strip, {
    title: "W większości powiatów bezrobocie spadło poniżej 8%",
    sub: "Stopa bezrobocia rejestrowanego w 380 powiatach, %, koniec roku (dane przykładowe: powiaty symulowane wokół średniej województwa)",
    ariaLabel:
      "Rozkład stóp bezrobocia w 380 powiatach przesunął się w dół między 2015 a 2025 rokiem; najwyższa stopa jest w powiecie szydłowieckim (21,9%).",
    categories: POWIAT.cats,
    highlight: "PL14-42",
    series: POWIAT.series,
  }),
  "fan.percentile": variant("fan.percentile", S.fan),
  "fan.scenarios": variant("fan.scenarios", S.fan, {
    title: "We wszystkich wariantach ludności Polski ubędzie",
    sub: "Ludność, mln; dane do 2023, potem prognoza GUS w trzech wariantach (dane przykładowe)",
    unit: { symbol: "mln", isRate: false, decimals: 1 },
    ariaLabel:
      "Według prognozy ludność spadnie z 37,6 mln w 2023 roku do 30,4 mln w 2060 roku w wariancie średnim (26,7–34,2 mln w pozostałych).",
    reference: undefined,
    series: [
      { id: "medium", label: "Wariant średni", role: "hero", points: scenario([37.4, 36.6, 35.8, 35.0, 34.0, 32.9, 31.7, 30.4]) },
      { id: "high", label: "Wariant wysoki", points: scenario([37.5, 37.1, 36.7, 36.4, 35.9, 35.4, 34.8, 34.2]) },
      { id: "low", label: "Wariant niski", points: scenario([37.3, 36.2, 35.0, 33.7, 32.3, 30.6, 28.7, 26.7]) },
    ],
  }),
  "symbols.circles": variant("symbols.circles", S["symbol-map"]),
  "symbols.overlay": variant("symbols.overlay", S["symbol-map"], {
    title: "Najwięcej bezrobotnych na Mazowszu, najwyższa stopa na wschodzie",
    sub: "Bezrobotni zarejestrowani (koła) i stopa bezrobocia (kolor), koniec 2025 (dane przykładowe)",
    ariaLabel:
      "Najwięcej bezrobotnych jest w mazowieckim i podkarpackim, a najwyższa stopa bezrobocia w świętokrzyskim (8,9%) i podkarpackim (8,2%).",
    breaks: [4, 6, 8],
    highlight: undefined,
    series: [byVoiv("unemployed", "Bezrobotni", UNEMPLOYED), byVoiv("rate", "Stopa bezrobocia", UNEMP["2025"]!, PCT)],
  }),
  "sankey.two": variant("sankey.two", S.sankey),
  "pareto.simple": variant("pareto.simple", S.pareto),
  "table.plain": variant("table.plain", S.table),
  "table.heat": variant("table.heat", S.table, { breaks: [5, 8, 11] }),
  "matrix.crosstab": variant("matrix.crosstab", S.table, {
    title: "Ludność województw w 2015 i 2024 roku",
    sub: "Ludność, tys., 31 grudnia (dane przykładowe)",
    unit: THOUS,
    ariaLabel:
      "Ludność wzrosła w latach 2015–2024 w mazowieckim, małopolskim, pomorskim i wielkopolskim, w pozostałych województwach spadła.",
    highlight: undefined,
    series: [byVoiv("2015", "2015", thous(POP_2015)), byVoiv("2024", "2024", thous(POP))],
  }),
  "matrix.subtotals": variant("matrix.subtotals", S.table, {
    title: "Ludność makroregionów i województw",
    sub: "Ludność, tys., 31 grudnia; makroregiony NUTS 1 z sumami (dane przykładowe)",
    unit: THOUS,
    ariaLabel: "Najludniejszy jest makroregion południowy (7,8 mln w 2024 roku), przed województwem mazowieckim (5,5 mln).",
    highlight: undefined,
    categories: MACRO.flatMap(([g, label, keys]) => [{ key: g, label }, ...keys.map((k) => ({ key: k, label: NAME[k]!, group: g }))]),
    series: [byVoiv("2015", "2015", thous(POP_2015)), byVoiv("2024", "2024", thous(POP))],
  }),
  "kpi.change": variant("kpi.change", S["kpi-card"]),
  "kpi.spark": variant("kpi.spark", S["kpi-card"]),
  "kpi.target": variant("kpi.target", S["kpi-card"], {
    title: "Wskaźnik zatrudnienia",
    sub: "Osoby w wieku 20–64 lata, %, rocznie; cel UE na 2030 rok: 78% (dane przykładowe)",
    ariaLabel: "Wskaźnik zatrudnienia osób w wieku 20–64 lata wyniósł w 2025 roku 78,9%, powyżej celu UE na 2030 rok (78%).",
    reference: { value: 78, label: "cel UE 2030" },
    series: [{ id: "emp", label: "Wskaźnik zatrudnienia 20–64", points: pts(EMP_X, EMP) }],
  }),
  "sparkline.line": variant("sparkline.line", S.sparkline),
  "sparkline.columns": variant("sparkline.columns", S.sparkline, {
    title: "PKB kwartał do kwartału",
    sub: "Zmiana PKB wyrównanego sezonowo, % kw/kw (dane przykładowe)",
    ariaLabel: "PKB rósł w większości kwartałów od 2022 roku; spadki były w 2 i 4 kw. 2022 oraz w 4 kw. 2025.",
    series: [{ id: "gdp_qq", label: "PKB, kw/kw", points: pts(GDP_Q, GDP_QQ) }],
  }),
};

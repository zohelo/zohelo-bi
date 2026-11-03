// One documented sample per chart type (design template: Chart library). Sample (dummy) data consistent with the
// visual reference kit (packages/design-template/kit/zchart.js); the guide page renders these live.

import { VOIVODESHIP_TILES, tileMapSeries } from "./tiles";
import type { ChartSample, ChartType, ZCategory, ZPoint, ZUnit } from "./types";

const PCT: ZUnit = { symbol: "%", isRate: true, decimals: 1 };
const IDX: ZUnit = { symbol: "", isRate: false, decimals: 0 };

const G = {
  time: ["Zmiana w czasie", "Change over time"],
  rank: ["Wielkość i ranking", "Size and ranking"],
  dev: ["Odchylenie", "Deviation"],
  part: ["Część całości", "Part of a whole"],
  dist: ["Rozkład", "Distribution"],
  rel: ["Zależność i przestrzeń", "Relationship and space"],
  over: ["Przegląd", "Overview"],
} as const;

function group(g: keyof typeof G) {
  return { group_pl: G[g][0], group_en: G[g][1] };
}

/** Piecewise-linear monthly path through [index, value] keys (the kit's sample curves). */
function interp(keys: [number, number][], n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let a = keys[0]!;
    let b = keys[keys.length - 1]!;
    for (let k = 0; k < keys.length - 1; k++) {
      if (i >= keys[k]![0] && i <= keys[k + 1]![0]) {
        a = keys[k]!;
        b = keys[k + 1]!;
        break;
      }
    }
    const t = b[0] === a[0] ? 0 : (i - a[0]) / (b[0] - a[0]);
    out.push(Math.round((a[1] + (b[1] - a[1]) * t) * 10) / 10);
  }
  return out;
}

const N = 129; // 2016-01 … 2026-09
const month = (i: number) => `${2016 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
const monthly = (vals: number[], from = 0): ZPoint[] => vals.slice(from).map((y, i) => ({ x: month(i + from), y }));
const PL = interp(
  [
    [0, -0.2],
    [24, 1.6],
    [48, 3.8],
    [60, 3.6],
    [72, 8.7],
    [78, 14.2],
    [85, 18.0],
    [96, 4.5],
    [102, 2.8],
    [108, 4.9],
    [114, 4.1],
    [120, 3.2],
    [128, 2.9],
  ],
  N,
);
const CZ = interp(
  [
    [0, 0.6],
    [24, 2.2],
    [48, 3.8],
    [60, 2.2],
    [72, 8.8],
    [81, 17.3],
    [84, 15.7],
    [96, 2.0],
    [108, 2.8],
    [120, 2.4],
    [128, 2.5],
  ],
  N,
);
const HU = interp(
  [
    [0, 1.0],
    [24, 2.4],
    [48, 4.7],
    [60, 3.0],
    [72, 7.9],
    [84, 26.2],
    [96, 3.8],
    [108, 5.7],
    [120, 4.6],
    [128, 4.3],
  ],
  N,
);
const DE = interp(
  [
    [0, 0.4],
    [24, 1.4],
    [48, 1.6],
    [60, 1.6],
    [72, 5.1],
    [81, 10.9],
    [84, 9.2],
    [96, 3.1],
    [108, 2.8],
    [120, 2.1],
    [128, 2.1],
  ],
  N,
);

const years = (from: number, vals: (number | null)[]): ZPoint[] => vals.map((y, i) => ({ x: String(from + i), y }));

function cats(rows: [string, string, string?][]): ZCategory[] {
  return rows.map(([key, label, short]) => ({ key, label, ...(short ? { short } : {}) }));
}

const VOIV: Record<string, string> = Object.fromEntries(
  VOIVODESHIP_TILES.map((t) => [t.key, t.name_pl.charAt(0).toUpperCase() + t.name_pl.slice(1)]),
);
const VOIV_SHORT: Record<string, string> = {
  PL28: "Warm.-maz.",
  PL32: "Zachodniopom.",
  PL04: "Kuj.-pom.",
  PL26: "Świętokrz.",
  PL02: "Dolnośl.",
  PL30: "Wielkop.",
  PL18: "Podkarp.",
  PL12: "Małopol.",
  PL14: "Mazow.",
};
const voivCats = (keys: string[]) => keys.map((k) => ({ key: k, label: VOIV[k] ?? k, ...(VOIV_SHORT[k] ? { short: VOIV_SHORT[k] } : {}) }));

const UNEMP: Record<string, number> = {
  PL22: 4.2,
  PL28: 7.6,
  PL20: 6.2,
  PL32: 6.1,
  PL04: 6.8,
  PL14: 3.6,
  PL08: 4.5,
  PL30: 2.9,
  PL10: 5.0,
  PL06: 6.5,
  PL02: 4.0,
  PL16: 5.1,
  PL26: 8.9,
  PL24: 3.9,
  PL12: 4.0,
  PL18: 8.2,
};
const GDP_PC: Record<string, number> = {
  PL14: 160,
  PL02: 110,
  PL30: 108,
  PL24: 101,
  PL22: 97,
  PL10: 94,
  PL12: 93,
  PL32: 85,
  PL04: 80,
  PL08: 78,
  PL28: 76,
  PL16: 72,
  PL18: 70,
  PL20: 69,
  PL26: 68,
  PL06: 66,
};

const COUNTRIES = cats([
  ["PL", "Polska"],
  ["CZ", "Czechy"],
  ["DE", "Niemcy"],
  ["SK", "Słowacja"],
  ["LT", "Litwa"],
]);

/** Contributions to real GDP growth y/y, pp: period, total, household consumption, public consumption, GFCF, inventories, net exports. */
const GDP_CONTRIB: [string, number, number, number, number, number, number][] = [
  ["2021-Q3", 6.0, 2.6, 0.9, 1.0, 2.4, -0.9],
  ["2021-Q4", 8.0, 4.1, 0.6, 1.1, 3.6, -1.4],
  ["2022-Q1", 8.8, 6.4, 0.2, 0.6, 3.5, -1.9],
  ["2022-Q2", 6.0, 3.8, 0.1, 1.0, 2.4, -1.3],
  ["2022-Q3", 3.9, 0.6, 0.3, 0.8, 1.2, 1.0],
  ["2022-Q4", 2.3, -0.6, 0.1, 0.4, 0.2, 2.2],
  ["2023-Q1", -0.3, -0.6, 0.2, 0.5, -2.4, 2.0],
  ["2023-Q2", -0.6, -1.4, 0.4, 0.4, -2.0, 2.0],
  ["2023-Q3", 0.5, 0.3, 0.6, 1.4, -3.7, 1.9],
  ["2023-Q4", 1.0, 0.4, 0.7, 1.5, -2.9, 1.3],
  ["2024-Q1", 1.9, 2.8, 0.9, -0.4, 0.0, -1.4],
  ["2024-Q2", 3.2, 2.6, 1.1, -0.3, 1.0, -1.2],
  ["2024-Q3", 2.7, 0.2, 0.9, -0.2, 2.6, -0.8],
  ["2024-Q4", 3.4, 1.9, 0.9, -1.5, 3.4, -1.3],
  ["2025-Q1", 3.2, 1.4, 0.7, 0.4, 2.0, -1.3],
  ["2025-Q2", 3.4, 2.5, 0.8, 0.3, 0.5, -0.7],
  ["2025-Q3", 3.7, 1.9, 0.6, 1.4, 0.6, -0.8],
  ["2025-Q4", 3.6, 1.8, 0.5, 1.8, 0.4, -0.9],
  ["2026-Q1", 3.5, 1.7, 0.5, 1.9, 0.3, -0.9],
  ["2026-Q2", 3.3, 1.6, 0.5, 2.0, 0.1, -0.9],
];
const contrib = (col: number): ZPoint[] => GDP_CONTRIB.map((r) => ({ x: r[0], y: r[col] as number }));

const S: Record<ChartType, ChartSample> = {
  "line-band": {
    type: "line-band",
    kind_pl: "Linia + pasmo",
    kind_en: "Line with band",
    ...group("time"),
    title: "Inflacja w paśmie celu NBP",
    sub: "HICP r/r, %, miesięcznie, 2016–2026",
    use_pl: "Jedna seria w czasie z punktem odniesienia (cel, średnia).",
    avoid_pl: "Więcej niż 5 linii; oś przerwana bez oznaczenia.",
    use_en: "One series over time with a reference (target, average).",
    avoid_en: "More than 5 lines; a broken axis without a mark.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Inflacja HICP w Polsce wróciła do pasma celu NBP 1,5–3,5% po szczycie 18,0% w lutym 2023; we wrześniu 2026 wynosi 2,9%.",
    series: [{ id: "PL", label: "Polska", role: "hero", points: monthly(PL) }],
    band: [1.5, 3.5],
    bandLabel: "cel NBP 1,5–3,5%",
    annotate: { x: "2023-02", label: "szczyt 18,0%" },
  },
  "line-highlight": {
    type: "line-highlight",
    kind_pl: "Linia z wyróżnieniem",
    kind_en: "Highlighted line",
    ...group("time"),
    title: "Polska na tle sąsiadów",
    sub: "HICP r/r, %, miesięcznie, Polska i 3 kraje, 2016–2026",
    use_pl: "Jedna seria jest bohaterem, reszta to kontekst.",
    avoid_pl: "Kilka równie jaskrawych kolorów; legenda daleko od linii.",
    use_en: "One series is the hero, the rest are context.",
    avoid_en: "Several equally bright colours; a legend far from the lines.",
    lang: "pl",
    unit: PCT,
    ariaLabel:
      "Inflacja w Polsce (2,9%) jest we wrześniu 2026 między Węgrami (4,3%) a Czechami i Niemcami; szczyt na Węgrzech był najwyższy.",
    series: [
      { id: "HU", label: "Węgry", role: "context", points: monthly(HU) },
      { id: "CZ", label: "Czechy", role: "context", points: monthly(CZ) },
      { id: "DE", label: "Niemcy", role: "context", points: monthly(DE) },
      { id: "PL", label: "Polska", role: "hero", points: monthly(PL) },
    ],
  },
  columns: {
    type: "columns",
    kind_pl: "Kolumny",
    kind_en: "Columns",
    ...group("time"),
    title: "PKB rośnie z wyjątkiem 2020",
    sub: "PKB, wzrost realny, %, rocznie, 2015–2024",
    use_pl: "Wartości roczne lub kwartalne, kilkanaście okresów, z zerem.",
    avoid_pl: "Oś nie od zera; kolumny dla setek okresów (użyj linii).",
    use_en: "Annual or quarterly values, a dozen or so periods, with zero.",
    avoid_en: "An axis not starting at zero; columns for hundreds of periods (use a line).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Realny PKB Polski rósł co roku w latach 2015–2024 z wyjątkiem 2020 (spadek o 2,0%); w 2024 wzrost wyniósł 2,9%.",
    series: [{ id: "PL", label: "Polska", points: years(2015, [3.8, 3.1, 5.1, 5.9, 4.4, -2.0, 6.9, 5.3, 0.2, 2.9]) }],
    annotate: { x: "2020", label: "pandemia" },
  },
  contributions: {
    type: "contributions",
    kind_pl: "Wkłady do wzrostu",
    kind_en: "Contributions to growth",
    ...group("time"),
    title: "Wzrost PKB niosą konsumpcja i inwestycje",
    sub: "Wkład do wzrostu realnego PKB r/r, punkty procentowe, kwartalnie, 3 kw. 2021–2 kw. 2026",
    use_pl: "Składniki, które sumują się do wskaźnika głównego (PKB, CPI), w kolejnych okresach; wkłady w pp.",
    avoid_pl: "Więcej niż ~7 składników; składniki, które się nie sumują; jeden okres (użyj kaskady).",
    use_en: "Components that add up to a headline (GDP, CPI) over periods; contributions in pp.",
    avoid_en: "More than ~7 components; parts that do not add up; a single period (use a waterfall).",
    lang: "pl",
    unit: { symbol: "pp", isRate: true, decimals: 1 },
    ariaLabel:
      "Realny PKB rósł w 2 kw. 2026 o 3,3% r/r: konsumpcja prywatna dodała 1,6 pp, inwestycje 2,0 pp, a eksport netto odjął 0,9 pp; w 2023 wzrost hamowały zapasy.",
    series: [
      { id: "cons", label: "Konsumpcja prywatna", points: contrib(2) },
      { id: "gov", label: "Konsumpcja publiczna", points: contrib(3) },
      { id: "gfcf", label: "Inwestycje", points: contrib(4) },
      { id: "inv", label: "Zapasy", points: contrib(5) },
      { id: "nx", label: "Eksport netto", points: contrib(6) },
    ],
    total: { id: "total", label: "PKB, r/r", points: contrib(1) },
  },
  "small-multiples": {
    type: "small-multiples",
    kind_pl: "Małe wielokrotności",
    kind_en: "Small multiples",
    ...group("time"),
    title: "Bezrobocie spada w każdym regionie",
    sub: "Stopa bezrobocia rejestrowanego, %, rocznie, 2015–2025, wspólna skala",
    use_pl: "Ten sam wskaźnik dla 4–12 obszarów; porównanie kształtów.",
    avoid_pl: "Różne skale osi w panelach; więcej niż 12 paneli.",
    use_en: "The same indicator for 4–12 areas; comparing shapes.",
    avoid_en: "Different axis scales across panels; more than 12 panels.",
    lang: "pl",
    unit: PCT,
    ariaLabel:
      "Stopa bezrobocia spadła w latach 2015–2025 w każdym z sześciu województw; najwyższa pozostaje w warmińsko-mazurskim (7,6%).",
    series: (
      [
        ["PL14", 8.5, 3.6],
        ["PL24", 9.6, 3.9],
        ["PL30", 6.4, 2.9],
        ["PL12", 8.9, 4.0],
        ["PL06", 11.7, 6.5],
        ["PL28", 16.3, 7.6],
      ] as const
    ).map(([key, a, b]) => ({
      id: key,
      label: VOIV[key]!,
      points: years(
        2015,
        Array.from({ length: 11 }, (_, k) => Math.round((a + (b - a) * Math.pow(k / 10, 0.8)) * 10) / 10),
      ),
    })),
  },
  "area-share": {
    type: "area-share",
    kind_pl: "Obszar 100%",
    kind_en: "100% area",
    ...group("time"),
    title: "Węgiel traci udział w produkcji prądu",
    sub: "Struktura produkcji energii elektrycznej, %, rocznie, 2015–2025",
    use_pl: "Zmiana struktury w czasie, 2–4 składniki.",
    avoid_pl: "Więcej niż 4 warstwy; porównywanie górnych warstw (użyj linii).",
    use_en: "Change of structure over time, 2–4 parts.",
    avoid_en: "More than 4 layers; comparing upper layers (use lines).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Udział węgla w produkcji energii elektrycznej spadł z 81% w 2015 do 53% w 2025, a udział OZE wzrósł do 35%.",
    series: (() => {
      const coal = [81, 79, 78, 77, 74, 70, 72, 70, 61, 57, 53];
      const gas = [5, 6, 7, 8, 9, 10, 9, 7, 9, 11, 12];
      return [
        { id: "coal", label: "węgiel", role: "context" as const, points: years(2015, coal) },
        { id: "gas", label: "gaz", points: years(2015, gas) },
        {
          id: "res",
          label: "OZE",
          points: years(
            2015,
            coal.map((c, i) => 100 - c - gas[i]!),
          ),
        },
      ];
    })(),
  },
  "ranked-bars": {
    type: "ranked-bars",
    kind_pl: "Słupki rankingowe",
    kind_en: "Ranked bars",
    ...group("rank"),
    title: "Mazowieckie daleko przed resztą",
    sub: "PKB na mieszkańca, Polska = 100, 2023, 8 z 16 województw",
    use_pl: "Porządek i wielkość dla wielu kategorii o długich nazwach.",
    avoid_pl: "Kolejność alfabetyczna; kolor każdego słupka inny.",
    use_en: "Order and size for many categories with long names.",
    avoid_en: "Alphabetical order; a different colour for every bar.",
    lang: "pl",
    unit: IDX,
    ariaLabel: "PKB na mieszkańca w mazowieckim (160) jest o 60% wyższy niż średnia Polski; kolejne województwa są blisko średniej.",
    categories: voivCats(["PL14", "PL02", "PL30", "PL24", "PL22", "PL10", "PL12", "PL32"]),
    series: [
      {
        id: "gdp_pc",
        label: "PKB na mieszkańca",
        points: ["PL14", "PL02", "PL30", "PL24", "PL22", "PL10", "PL12", "PL32"].map((k) => ({ x: k, y: GDP_PC[k]! })),
      },
    ],
    highlight: "PL14",
    reference: { value: 100, label: "Polska = 100" },
  },
  "grouped-bars": {
    type: "grouped-bars",
    kind_pl: "Słupki grupowane",
    kind_en: "Grouped bars",
    ...group("rank"),
    title: "Bezrobocie: 2015 i 2025",
    sub: "Stopa bezrobocia (BAEL), %, 5 krajów",
    use_pl: "2–3 serie dla kilku kategorii, porównanie w grupie.",
    avoid_pl: "Więcej niż 3 serie w grupie (użyj małych wielokrotności).",
    use_en: "2–3 series for a few categories, compared within each group.",
    avoid_en: "More than 3 series per group (use small multiples).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "W każdym z pięciu krajów stopa bezrobocia w 2025 jest niższa niż w 2015; w Polsce spadła z 7,5% do 3,2%.",
    categories: COUNTRIES,
    series: [
      { id: "2015", label: "2015", points: [7.5, 5.1, 4.6, 11.5, 9.1].map((y, i) => ({ x: COUNTRIES[i]!.key, y })) },
      { id: "2025", label: "2025", points: [3.2, 2.8, 3.6, 5.4, 6.9].map((y, i) => ({ x: COUNTRIES[i]!.key, y })) },
    ],
  },
  dumbbell: {
    type: "dumbbell",
    kind_pl: "Wykres hantlowy",
    kind_en: "Dumbbell",
    ...group("rank"),
    title: "Największy spadek: Słowacja",
    sub: "Stopa bezrobocia (BAEL), %, 2015 → 2025, 5 krajów",
    use_pl: "Zmiana między dwoma punktami dla wielu kategorii.",
    avoid_pl: "Więcej niż 2 punkty na wiersz; brak oznaczenia kierunku.",
    use_en: "Change between two points for many categories.",
    avoid_en: "More than 2 points per row; no sign of direction.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Stopa bezrobocia spadła w latach 2015–2025 we wszystkich pięciu krajach, najbardziej na Słowacji (o 6,1 pp).",
    categories: COUNTRIES,
    series: [
      { id: "2015", label: "2015", points: [7.5, 5.1, 4.6, 11.5, 9.1].map((y, i) => ({ x: COUNTRIES[i]!.key, y })) },
      { id: "2025", label: "2025", points: [3.2, 2.8, 3.6, 5.4, 6.9].map((y, i) => ({ x: COUNTRIES[i]!.key, y })) },
    ],
  },
  slope: {
    type: "slope",
    kind_pl: "Wykres nachylenia",
    kind_en: "Slope chart",
    ...group("rank"),
    title: "Polska dogania średnią UE",
    sub: "PKB na mieszkańca w PPS, UE-27 = 100, 2004 i 2024",
    use_pl: "Dwa okresy, kilka kategorii; widać kierunek i tempo.",
    avoid_pl: "Wiele krzyżujących się linii bez wyróżnienia.",
    use_en: "Two periods, a few categories; direction and pace are visible.",
    avoid_en: "Many crossing lines without a highlight.",
    lang: "pl",
    unit: IDX,
    ariaLabel: "PKB na mieszkańca Polski wzrósł z 51% do 80% średniej UE w latach 2004–2024; szybciej rosła tylko Litwa.",
    categories: cats([
      ["CZ", "Czechy"],
      ["LT", "Litwa"],
      ["PL", "Polska"],
      ["HU", "Węgry"],
      ["SK", "Słowacja"],
    ]),
    series: [
      {
        id: "2004",
        label: "2004",
        points: [
          ["CZ", 78],
          ["LT", 50],
          ["PL", 51],
          ["HU", 61],
          ["SK", 57],
        ].map(([x, y]) => ({ x: x as string, y: y as number })),
      },
      {
        id: "2024",
        label: "2024",
        points: [
          ["CZ", 91],
          ["LT", 89],
          ["PL", 80],
          ["HU", 76],
          ["SK", 73],
        ].map(([x, y]) => ({ x: x as string, y: y as number })),
      },
    ],
    highlight: "PL",
  },
  "diverging-bars": {
    type: "diverging-bars",
    kind_pl: "Słupki rozbieżne",
    kind_en: "Diverging bars",
    ...group("dev"),
    title: "Ludność rośnie tylko wokół metropolii",
    sub: "Zmiana liczby ludności 2014–2024, %, 8 z 16 województw",
    use_pl: "Wartości dodatnie i ujemne względem zera lub średniej.",
    avoid_pl: "Kolory oceniające (zielony/czerwony) bez legendy; brak linii zera.",
    use_en: "Positive and negative values around zero or an average.",
    avoid_en: "Judging colours (green/red) without a legend; no zero line.",
    lang: "pl",
    unit: PCT,
    ariaLabel:
      "W latach 2014–2024 ludność wzrosła w pomorskim, małopolskim, mazowieckim i wielkopolskim, a spadła najbardziej w świętokrzyskim (o 6,1%).",
    categories: voivCats(["PL22", "PL12", "PL14", "PL30", "PL06", "PL16", "PL10", "PL26"]),
    series: [
      {
        id: "pop_change",
        label: "Zmiana liczby ludności",
        points: (
          [
            ["PL22", 2.6],
            ["PL12", 2.5],
            ["PL14", 2.2],
            ["PL30", 0.3],
            ["PL06", -4.6],
            ["PL16", -5.2],
            ["PL10", -5.4],
            ["PL26", -6.1],
          ] as const
        ).map(([x, y]) => ({ x, y })),
      },
    ],
  },
  bullet: {
    type: "bullet",
    kind_pl: "Wykres pociskowy",
    kind_en: "Bullet chart",
    ...group("dev"),
    title: "Wszystkie miary inflacji blisko celu",
    sub: "Wartość wobec pasma celu NBP, %, wrzesień 2026",
    use_pl: "Wartość wobec celu lub progu, kilka miar obok siebie.",
    avoid_pl: "Okrągłe wskaźniki „zegarowe”: zajmują miejsce, trudno je porównać.",
    use_en: "A value against a target or threshold, several measures side by side.",
    avoid_en: "Round “gauge” dials: they take space and are hard to compare.",
    lang: "pl",
    unit: PCT,
    ariaLabel:
      "We wrześniu 2026 wszystkie cztery miary inflacji mieszczą się w paśmie celu NBP 1,5–3,5%; najwyższa jest inflacja bazowa (3,4%).",
    categories: cats([
      ["cpi", "CPI (GUS)", "CPI"],
      ["hicp", "HICP (Eurostat)", "HICP"],
      ["core", "Inflacja bazowa", "Bazowa"],
      ["food", "Ceny żywności", "Żywność"],
    ]),
    series: [
      {
        id: "value",
        label: "wartość",
        points: [
          { x: "cpi", y: 3.1 },
          { x: "hicp", y: 2.9 },
          { x: "core", y: 3.4 },
          { x: "food", y: 2.2 },
        ],
      },
    ],
    band: [1.5, 3.5],
    bandLabel: "pasmo celu 1,5–3,5%",
    reference: { value: 2.5, label: "cel 2,5%" },
  },
  waterfall: {
    type: "waterfall",
    kind_pl: "Wykres kaskadowy",
    kind_en: "Waterfall",
    ...group("dev"),
    title: "Wzrost PKB napędza konsumpcja",
    sub: "Wkład do wzrostu PKB w 2024, punkty procentowe",
    use_pl: "Jak składniki dodają się do sumy (wkłady, bilans).",
    avoid_pl: "Więcej niż ~7 kroków; brak słupka sumy.",
    use_en: "How components add up to a total (contributions, balance).",
    avoid_en: "More than ~7 steps; no total bar.",
    lang: "pl",
    unit: { symbol: "pp", isRate: false, decimals: 1 },
    ariaLabel: "Konsumpcja prywatna dodała 2,0 pp do wzrostu PKB o 2,9% w 2024, a eksport netto odjął 0,6 pp.",
    categories: cats([
      ["cons", "Konsumpcja", "Konsump."],
      ["gov", "Państwo"],
      ["inv_stock", "Zapasy"],
      ["inv", "Inwestycje", "Inwest."],
      ["nx", "Eksport netto", "Eksport"],
    ]),
    series: [
      {
        id: "contrib",
        label: "Wkład",
        points: [
          { x: "cons", y: 2.0 },
          { x: "gov", y: 0.8 },
          { x: "inv_stock", y: 0.5 },
          { x: "inv", y: 0.2 },
          { x: "nx", y: -0.6 },
        ],
      },
    ],
    totalLabel: "PKB",
  },
  "stacked-bars": {
    type: "stacked-bars",
    kind_pl: "Słupki skumulowane 100%",
    kind_en: "100% stacked bars",
    ...group("part"),
    title: "Usługi to już 3/5 pracujących",
    sub: "Pracujący według sektora, %, 2004, 2014, 2024",
    use_pl: "Struktura dla kilku okresów lub grup, 2–5 części.",
    avoid_pl: "Wykres kołowy; więcej niż 5 części (zsumuj w „inne”).",
    use_en: "Structure for a few periods or groups, 2–5 parts.",
    avoid_en: "A pie chart; more than 5 parts (sum into “other”).",
    lang: "pl",
    unit: { symbol: "%", isRate: true, decimals: 0 },
    ariaLabel: "Udział usług wśród pracujących wzrósł z 52% w 2004 do 60% w 2024, a rolnictwa spadł z 19% do 8%.",
    series: [
      { id: "services", label: "usługi", points: years(2004, [52]).concat(years(2014, [57]), years(2024, [60])) },
      { id: "industry", label: "przemysł i budownictwo", points: years(2004, [29]).concat(years(2014, [31]), years(2024, [32])) },
      { id: "agri", label: "rolnictwo", points: years(2004, [19]).concat(years(2014, [12]), years(2024, [8])) },
    ],
  },
  "segmented-bar": {
    type: "segmented-bar",
    kind_pl: "Słupek segmentowany",
    kind_en: "Segmented bar",
    ...group("part"),
    title: "Na co idą wydatki budżetu",
    sub: "Struktura wydatków budżetu państwa, %, 2025",
    use_pl: "Jedna całość podzielona na 3–6 części z etykietami.",
    avoid_pl: "Wykres kołowy lub pierścieniowy; segmenty bez etykiet.",
    use_en: "One whole split into 3–6 labelled parts.",
    avoid_en: "A pie or donut chart; segments without labels.",
    lang: "pl",
    unit: { symbol: "%", isRate: true, decimals: 0 },
    ariaLabel: "Ponad jedna trzecia wydatków budżetu państwa w 2025 (35%) idzie na zabezpieczenie społeczne, 12% na obronę narodową.",
    categories: cats([
      ["social", "Zabezpieczenie społeczne", "Zabezp. społeczne"],
      ["defence", "Obrona narodowa", "Obrona"],
      ["edu", "Edukacja i nauka", "Edukacja"],
      ["debt", "Obsługa długu", "Dług"],
      ["health", "Ochrona zdrowia", "Zdrowie"],
      ["other", "Pozostałe"],
    ]),
    series: [
      {
        id: "share",
        label: "Udział w wydatkach",
        points: [
          { x: "social", y: 35 },
          { x: "defence", y: 12 },
          { x: "edu", y: 10 },
          { x: "debt", y: 9 },
          { x: "health", y: 8 },
          { x: "other", y: 26 },
        ],
      },
    ],
  },
  pyramid: (() => {
    const men = [960, 1010, 1050, 940, 920, 1120, 1380, 1560, 1520, 1290, 1120, 1080, 1220, 1180, 900, 560, 300, 230];
    const wom = [910, 960, 1000, 900, 890, 1090, 1340, 1520, 1500, 1300, 1160, 1150, 1370, 1420, 1200, 860, 560, 600];
    const bands = men.map((_, i) => (i === 17 ? "85+" : `${i * 5}-${i * 5 + 4}`));
    return {
      type: "pyramid" as const,
      kind_pl: "Piramida ludności",
      kind_en: "Population pyramid",
      ...group("dist"),
      title: "Społeczeństwo się starzeje",
      sub: "Ludność według wieku i płci, tys., 2024",
      use_pl: "Rozkład wieku dwóch grup (płeć) w jednym momencie.",
      avoid_pl: "Różne skale stron; więcej niż ~20 grup wieku.",
      use_en: "Age distribution of two groups (sex) at one point in time.",
      avoid_en: "Different scales on the two sides; more than ~20 age groups.",
      lang: "pl" as const,
      unit: { symbol: "tys.", isRate: false, decimals: 0 },
      ariaLabel: "Najliczniejsze grupy wieku w 2024 to 35–44 lata; wśród osób 65+ wyraźnie przeważają kobiety.",
      categories: bands.map((b) => ({
        key: b,
        label: b === "85+" ? "85 lat i więcej" : `${b.replace("-", "–")} lat`,
        short: b.replace("-", "–"),
      })),
      series: [
        { id: "M", label: "mężczyźni", points: bands.map((x, i) => ({ x, y: men[i]! })) },
        { id: "F", label: "kobiety", points: bands.map((x, i) => ({ x, y: wom[i]! })) },
      ],
    };
  })(),
  histogram: (() => {
    const bins = [180, 520, 610, 430, 290, 180, 110, 65, 40, 22];
    const keys = bins.map((_, i) => `${i * 2}-${i * 2 + 2}`);
    return {
      type: "histogram" as const,
      kind_pl: "Histogram",
      kind_en: "Histogram",
      ...group("dist"),
      title: "Większość gmin ma niskie bezrobocie",
      sub: "Liczba gmin według stopy bezrobocia, %, przedziały co 2 pp, 2025",
      use_pl: "Rozkład jednej miary dla wielu jednostek (gminy, powiaty).",
      avoid_pl: "Odstępy między słupkami jak w wykresie kategorii; nierówne przedziały.",
      use_en: "Distribution of one measure across many units (municipalities, districts).",
      avoid_en: "Gaps between bars as in a category chart; unequal bins.",
      lang: "pl" as const,
      unit: { symbol: "", isRate: false, decimals: 0 },
      ariaLabel: "Większość z 2477 gmin ma stopę bezrobocia poniżej 6%; mediana wynosi 4,9%.",
      categories: keys.map((k, i) => ({ key: k, label: `${i * 2}–${i * 2 + 2}%` })),
      series: [{ id: "count", label: "Liczba gmin", points: keys.map((x, i) => ({ x, y: bins[i]! })) }],
      reference: { value: 4.9, label: "mediana 4,9%" },
    };
  })(),
  scatter: {
    type: "scatter",
    kind_pl: "Wykres rozrzutu",
    kind_en: "Scatter plot",
    ...group("rel"),
    title: "Bogatsze regiony mają niższe bezrobocie",
    sub: "PKB na mieszkańca (Polska = 100, 2023) i stopa bezrobocia (%, 2025), 16 województw",
    use_pl: "Zależność dwóch miar; jedna kropka = jedna jednostka.",
    avoid_pl: "Dwie osie Y na jednym wykresie; sugerowanie przyczyny bez dowodu.",
    use_en: "Relationship of two measures; one dot = one unit.",
    avoid_en: "Two Y axes on one chart; implying cause without evidence.",
    lang: "pl",
    unit: PCT,
    ariaLabel:
      "Województwa z wyższym PKB na mieszkańca mają zwykle niższą stopę bezrobocia; najwyższe bezrobocie jest w świętokrzyskim i podkarpackim.",
    categories: voivCats(VOIVODESHIP_TILES.map((t) => t.key)),
    series: [
      { id: "x", label: "PKB na mieszkańca, Polska = 100", unit: IDX, points: Object.keys(GDP_PC).map((k) => ({ x: k, y: GDP_PC[k]! })) },
      { id: "y", label: "Stopa bezrobocia, %", unit: PCT, points: Object.keys(GDP_PC).map((k) => ({ x: k, y: UNEMP[k]! })) },
    ],
    highlight: "PL14",
  },
  "tile-map": {
    type: "tile-map",
    kind_pl: "Kartogram kafelkowy",
    kind_en: "Tile map",
    ...group("rel"),
    title: "Najwyższe bezrobocie na wschodzie",
    sub: "Stopa bezrobocia rejestrowanego, %, 2025, 16 województw",
    use_pl: "Wartości dla regionów, gdy kształt mapy nie jest ważny; każdy region równie widoczny.",
    avoid_pl: "Mapa choropletyczna z liczbami bezwzględnymi (użyj wartości na mieszkańca).",
    use_en: "Values for regions when the map shape does not matter; every region equally visible.",
    avoid_en: "A choropleth map of absolute numbers (use per-capita values).",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Stopa bezrobocia jest najwyższa w świętokrzyskim (8,9%) i podkarpackim (8,2%), a najniższa w wielkopolskim (2,9%).",
    series: [tileMapSeries(UNEMP, "Stopa bezrobocia")],
    breaks: [4, 6, 8],
  },
  heatmap: {
    type: "heatmap",
    kind_pl: "Mapa ciepła",
    kind_en: "Heatmap",
    ...group("rel"),
    title: "Szczyt inflacji: przełom 2022 i 2023",
    sub: "HICP r/r, %, miesięcznie, 2019–2026",
    use_pl: "Wzory w czasie (miesiąc × rok) lub kategoria × kategoria.",
    avoid_pl: "Tęczowa skala barw; komórki bez możliwości odczytu wartości.",
    use_en: "Patterns over time (month × year) or category × category.",
    avoid_en: "A rainbow colour scale; cells whose values cannot be read.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Inflacja przekraczała 15% od jesieni 2022 do wiosny 2023; od 2024 utrzymuje się poniżej 6%.",
    series: [{ id: "PL", label: "Polska", points: monthly(PL, 36) }],
    breaks: [3, 6, 10, 15],
  },
  "sparkline-table": {
    type: "sparkline-table",
    kind_pl: "Tabela z liniami trendu",
    kind_en: "Sparkline table",
    ...group("over"),
    title: "Wiele wskaźników na jednym ekranie",
    sub: "Ostatnia wartość, zmiana r/r i trend 2020–2025; każda linia we własnej skali",
    use_pl: "Przegląd 5–15 wskaźników o różnych jednostkach.",
    avoid_pl: "Różne skale linii trendu sugerujące porównanie; brak jednostek.",
    use_en: "An overview of 5–15 indicators with different units.",
    avoid_en: "Different sparkline scales implying comparison; missing units.",
    lang: "pl",
    unit: PCT,
    ariaLabel: "Inflacja i EUR/PLN spadły w ostatnim roku, PKB i bezrobocie wzrosły, ludność nieznacznie maleje.",
    series: [
      { id: "hicp", label: "Inflacja HICP", unit: PCT, points: years(2020, [4.5, 2.8, 4.9, 4.1, 3.0, 2.9]) },
      { id: "unemp", label: "Bezrobocie (BAEL)", unit: PCT, points: years(2020, [3.4, 3.0, 2.8, 2.9, 2.9, 3.2]) },
      { id: "gdp", label: "PKB, wzrost realny", unit: PCT, points: years(2020, [-2.0, 6.9, 5.3, 0.2, 2.9, 3.1]) },
      {
        id: "eurpln",
        label: "Kurs EUR/PLN",
        unit: { symbol: "zł", isRate: false, decimals: 2 },
        points: years(2020, [4.44, 4.56, 4.69, 4.54, 4.31, 4.26]),
      },
      {
        id: "pop",
        label: "Ludność",
        unit: { symbol: "mln", isRate: false, decimals: 2 },
        points: years(2020, [38.0, 37.9, 37.8, 37.7, 37.64, 37.49]),
      },
    ],
  },
};

/** One documented sample per chart type, in library order. */
export const CHART_SAMPLES: Record<ChartType, ChartSample> = S;

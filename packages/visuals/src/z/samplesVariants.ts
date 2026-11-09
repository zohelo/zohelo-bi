// One documented sample per chart library v2 VARIANT drawn by an existing chart type (the library page shows each
// variant live). Each sample uses exactly its variant's chart type and options (library.ts); a placeholder option
// ("" in the library: forecastFrom, overlay) is filled with the sample's own value. Sample (dummy) data shaped
// like Polish public statistics (GUS, NBP, Eurostat); values are illustrative.

import { CHART_SAMPLES } from "./samples";
import { GROUP_INFO, LIBRARY, VARIANT_BY_ID } from "./library";
import { VOIVODESHIP_TILES, tileMapSeries } from "./tiles";
import type { ChartSample, ChartType, ZCategory, ZOptions, ZPoint, ZUnit } from "./types";

const PCT: ZUnit = { symbol: "%", isRate: true, decimals: 1 };
const IDX: ZUnit = { symbol: "", isRate: false, decimals: 0 };

/** Sample fields written per variant; type, kind, group, use and opts come from the library. */
type Doc = Omit<ChartSample, "type" | "kind_pl" | "kind_en" | "group_pl" | "group_en" | "use_pl" | "use_en" | "opts"> & {
  use_pl?: string;
  use_en?: string;
  /** Values for the library's placeholder options ("" in library.ts). */
  fill?: Partial<ZOptions>;
};

function variant(id: string, doc: Doc): [string, ChartSample] {
  const v = VARIANT_BY_ID[id];
  if (!v) throw new Error(`unknown variant ${id}`);
  const t = LIBRARY.find((d) => d.id === v.type)!;
  const g = GROUP_INFO[t.group];
  const { fill, ...rest } = doc;
  const opts = v.opts ? { ...v.opts, ...fill } : undefined;
  const sample: ChartSample = {
    ...rest,
    type: v.chart,
    kind_pl: v.pl,
    kind_en: v.en,
    group_pl: g.pl,
    group_en: g.en,
    use_pl: doc.use_pl ?? v.usePl,
    use_en: doc.use_en ?? v.useEn,
    ...(opts ? { opts } : {}),
  };
  return [id, sample];
}

/** The data of a chart type's documented sample (without its texts), to restyle as a variant. */
function base(type: ChartType) {
  const s = CHART_SAMPLES[type];
  return {
    lang: s.lang,
    unit: s.unit,
    series: s.series,
    ...(s.categories ? { categories: s.categories } : {}),
    ...(s.band ? { band: s.band } : {}),
    ...(s.bandLabel ? { bandLabel: s.bandLabel } : {}),
    ...(s.reference ? { reference: s.reference } : {}),
    ...(s.highlight ? { highlight: s.highlight } : {}),
    ...(s.annotate ? { annotate: s.annotate } : {}),
    ...(s.breaks ? { breaks: s.breaks } : {}),
    ...(s.total ? { total: s.total } : {}),
    ...(s.totalLabel ? { totalLabel: s.totalLabel } : {}),
    ...(s.polarity ? { polarity: s.polarity } : {}),
  };
}

const years = (from: number, vals: (number | null)[]): ZPoint[] => vals.map((y, i) => ({ x: String(from + i), y }));
const quarters = (from: number, vals: number[]): ZPoint[] => vals.map((y, i) => ({ x: `${from + Math.floor(i / 4)}-Q${(i % 4) + 1}`, y }));
const r1 = (v: number) => Math.round(v * 10) / 10;

function cats(rows: [string, string, string?][]): ZCategory[] {
  return rows.map(([key, label, short]) => ({ key, label, ...(short ? { short } : {}) }));
}

const VOIV: Record<string, string> = Object.fromEntries(
  VOIVODESHIP_TILES.map((t) => [t.key, t.name_pl.charAt(0).toUpperCase() + t.name_pl.slice(1)]),
);
const voivCats = (keys: string[]) => keys.map((k) => ({ key: k, label: VOIV[k] ?? k }));
const VKEYS = VOIVODESHIP_TILES.map((t) => t.key);

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
const POP: Record<string, number> = {
  PL14: 5.5,
  PL24: 4.3,
  PL30: 3.5,
  PL12: 3.4,
  PL02: 2.9,
  PL10: 2.4,
  PL22: 2.3,
  PL18: 2.1,
  PL06: 2.0,
  PL04: 2.0,
  PL32: 1.6,
  PL28: 1.4,
  PL26: 1.2,
  PL20: 1.1,
  PL08: 1.0,
  PL16: 0.9,
};

/** NBP reference rate, %, monthly 2019-01 … 2026-09 (decisions take effect in the month shown). */
const NBP_RATE: ZPoint[] = (() => {
  const changes: [string, number][] = [
    ["2019-01", 1.5],
    ["2020-03", 1.0],
    ["2020-04", 0.5],
    ["2020-05", 0.1],
    ["2021-10", 0.5],
    ["2021-11", 1.25],
    ["2021-12", 1.75],
    ["2022-01", 2.25],
    ["2022-02", 2.75],
    ["2022-03", 3.5],
    ["2022-04", 4.5],
    ["2022-05", 5.25],
    ["2022-06", 6.0],
    ["2022-07", 6.5],
    ["2022-09", 6.75],
    ["2023-09", 6.0],
    ["2023-10", 5.75],
    ["2025-05", 5.25],
    ["2025-07", 5.0],
    ["2025-09", 4.75],
    ["2025-10", 4.5],
    ["2025-11", 4.25],
    ["2025-12", 4.0],
  ];
  const out: ZPoint[] = [];
  let v = 1.5;
  for (let i = 0; i < 93; i++) {
    const x = `${2019 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
    v = changes.find((c) => c[0] === x)?.[1] ?? v;
    out.push({ x, y: v });
  }
  return out;
})();

/** LFS unemployment rate, %, quarterly 2019-Q1 … 2026-Q2, with an illustrative 95% interval. */
const LFS = [
  3.9, 3.2, 3.2, 2.9, 3.1, 3.1, 3.3, 3.0, 4.0, 3.4, 3.2, 3.0, 3.1, 2.7, 2.6, 2.8, 2.8, 2.7, 2.8, 2.7, 3.0, 2.8, 2.9, 2.6, 2.7, 3.2, 3.1,
  3.0, 3.2, 3.1,
];
const LFS_CI = LFS.map((_, i) => 0.25 + (i % 3) * 0.03);

const pyramidBands = Array.from({ length: 18 }, (_, i) => (i === 17 ? "85+" : `${i * 5}-${i * 5 + 4}`));
const pyramidCats = pyramidBands.map((b) => ({
  key: b,
  label: b === "85+" ? "85 lat i więcej" : `${b.replace("-", "–")} lat`,
  short: b.replace("-", "–"),
}));
const MEN_2025 = [930, 1000, 1050, 950, 900, 1080, 1350, 1550, 1530, 1310, 1130, 1060, 1180, 1200, 960, 600, 320, 240];
const WOM_2025 = [880, 950, 1000, 910, 870, 1050, 1310, 1510, 1510, 1310, 1160, 1120, 1320, 1430, 1250, 900, 590, 620];
const MEN_2050 = [640, 680, 720, 760, 800, 850, 880, 900, 920, 980, 1040, 1220, 1420, 1400, 1150, 960, 700, 520];
const WOM_2050 = [610, 650, 690, 730, 770, 820, 860, 880, 900, 970, 1050, 1230, 1440, 1450, 1250, 1120, 920, 980];

/** Registered unemployment by voivodeship, %, 2015 … 2025 (towards the 2025 value). */
const unempHistory = (k: string) => {
  const end = UNEMP[k]!;
  const start = r1(end * 2.1 + (k.charCodeAt(3) % 4) * 0.4);
  return years(
    2015,
    Array.from({ length: 11 }, (_, i) => r1(start + (end - start) * Math.pow(i / 10, 0.7))),
  );
};

const COUNTRIES_EMP = cats([
  ["NL", "Niderlandy"],
  ["CZ", "Czechy"],
  ["DE", "Niemcy"],
  ["PL", "Polska"],
  ["EU27", "UE-27"],
  ["FR", "Francja"],
  ["ES", "Hiszpania"],
  ["IT", "Włochy"],
]);

export const VARIANT_SAMPLES: Record<string, ChartSample> = Object.fromEntries([
  // ---------------- line
  variant("line.simple", {
    lang: "pl",
    unit: PCT,
    title: "Inflacja wróciła do kilku procent",
    sub: "HICP r/r, %, miesięcznie, 2016–2026",
    avoid_pl: "Kilka serii bez wyróżnienia; oś przerwana bez oznaczenia.",
    avoid_en: "Several series without a hero; a broken axis without a mark.",
    ariaLabel: "Inflacja HICP w Polsce spadła ze szczytu 18,0% w lutym 2023 do 2,9% we wrześniu 2026.",
    series: CHART_SAMPLES["line-band"].series,
  }),
  variant("line.multi", {
    lang: "pl",
    unit: PCT,
    title: "Inflacja w Polsce i u sąsiadów",
    sub: "HICP r/r, %, miesięcznie, 4 kraje, 2016–2026",
    avoid_pl: "Więcej niż 5 serii; serie w różnych jednostkach.",
    avoid_en: "More than 5 series; series in different units.",
    ariaLabel: "Po szczycie w latach 2022–2023 inflacja we wszystkich czterech krajach spadła poniżej 5%.",
    series: CHART_SAMPLES["line-highlight"].series
      .slice()
      .reverse()
      .map((s) => ({ ...s, role: "series" as const })),
  }),
  variant("line.highlight", {
    ...base("line-highlight"),
    title: "Polska na tle sąsiadów",
    sub: "HICP r/r, %, miesięcznie, Polska i 3 kraje, 2016–2026",
    avoid_pl: "Kilka równie jaskrawych kolorów; bohater bez etykiety.",
    avoid_en: "Several equally bright colours; a hero without a label.",
    ariaLabel: CHART_SAMPLES["line-highlight"].ariaLabel,
  }),
  variant("line.reference", {
    ...base("line-band"),
    title: "Inflacja w paśmie celu NBP",
    sub: "HICP r/r, %, miesięcznie, 2016–2026",
    avoid_pl: "Pasmo lub linia bez podpisu; kilka linii odniesienia naraz.",
    avoid_en: "A band or line without a label; several references at once.",
    ariaLabel: CHART_SAMPLES["line-band"].ariaLabel,
  }),
  variant("line.step", {
    lang: "pl",
    unit: { symbol: "%", isRate: true, decimals: 2 },
    title: "Stopa referencyjna NBP",
    sub: "Stopa referencyjna NBP, %, stan na koniec miesiąca, 2019–2026",
    avoid_pl: "Wartości, które zmieniają się płynnie (np. inflacja); linia ukośna sugeruje stan pośredni.",
    avoid_en: "Values that change smoothly (e.g. inflation); a sloped line suggests states in between.",
    ariaLabel: "Stopa referencyjna NBP wzrosła z 0,1% w 2021 do 6,75% we wrześniu 2022; od grudnia 2025 wynosi 4,0%.",
    series: [{ id: "ref", label: "Stopa referencyjna", role: "hero", points: NBP_RATE }],
  }),
  variant("line.indexed", {
    lang: "pl",
    unit: IDX,
    title: "Płace realne rosną najszybciej w Polsce",
    sub: "Przeciętne wynagrodzenie realne, 2015 = 100, rocznie, 2015–2025 (dane przykładowe)",
    avoid_pl: "Indeks bez podanego roku bazowego; rok bazowy wybrany pod tezę.",
    avoid_en: "An index without its base year; a base year picked to fit the story.",
    ariaLabel: "Realne wynagrodzenie w Polsce wzrosło od 2015 o 41%, w Czechach o 19%, a w Niemczech o 6%.",
    reference: { value: 100, label: "2015 = 100" },
    series: [
      { id: "DE", label: "Niemcy", role: "context", points: years(2015, [100, 102, 103, 104, 106, 105, 105, 101, 101, 104, 106]) },
      { id: "CZ", label: "Czechy", role: "context", points: years(2015, [100, 104, 108, 114, 119, 120, 123, 113, 110, 114, 119]) },
      { id: "PL", label: "Polska", role: "hero", points: years(2015, [100, 104, 108, 114, 119, 122, 125, 123, 124, 134, 141]) },
    ],
  }),
  variant("line.band", {
    lang: "pl",
    unit: PCT,
    title: "Bezrobocie BAEL z przedziałem ufności",
    sub: "Stopa bezrobocia (BAEL), %, kwartalnie, 2019–2026; pasmo: 95% przedział ufności (dane przykładowe)",
    avoid_pl: "Pasmo bez objaśnienia; przedział ukryty, gdy różnice są w granicach błędu.",
    avoid_en: "A band without a note; hiding the interval when differences are within the error.",
    ariaLabel: "Stopa bezrobocia BAEL waha się między 2,6% a 4,0%; różnice między sąsiednimi kwartałami mieszczą się w przedziale ufności.",
    series: [
      { id: "PL", label: "Polska", role: "hero", points: quarters(2019, LFS) },
      {
        id: "lo",
        label: "dolna granica",
        points: quarters(
          2019,
          LFS.map((v, i) => r1(v - LFS_CI[i]!)),
        ),
      },
      {
        id: "hi",
        label: "górna granica",
        points: quarters(
          2019,
          LFS.map((v, i) => r1(v + LFS_CI[i]!)),
        ),
      },
    ],
  }),
  variant("line.forecast", {
    lang: "pl",
    unit: PCT,
    title: "Inflacja: dane i projekcja",
    sub: "CPI, średniorocznie, %, 2016–2025 dane GUS, 2026–2028 projekcja (dane przykładowe)",
    avoid_pl: "Prognoza narysowana tak samo jak dane; brak daty prognozy.",
    avoid_en: "A forecast drawn like the data; no forecast date.",
    ariaLabel: "Po szczycie 14,4% w 2022 inflacja spada; projekcja zakłada 2,6% w 2028, blisko celu NBP.",
    fill: { forecastFrom: "2026" },
    band: [1.5, 3.5],
    bandLabel: "cel NBP 1,5–3,5%",
    series: [
      { id: "cpi", label: "CPI", role: "hero", points: years(2016, [-0.6, 2.0, 1.6, 2.3, 3.4, 5.1, 14.4, 11.4, 3.6, 3.8, 3.0, 2.8, 2.6]) },
    ],
  }),
  // ---------------- column
  variant("column.simple", {
    ...base("columns"),
    title: "PKB rośnie z wyjątkiem 2020",
    sub: "PKB, wzrost realny, %, rocznie, 2015–2024",
    avoid_pl: "Oś nie od zera; kolumny dla setek okresów (użyj linii).",
    avoid_en: "An axis not starting at zero; columns for hundreds of periods (use a line).",
    ariaLabel: CHART_SAMPLES.columns.ariaLabel,
  }),
  variant("column.clustered", {
    ...base("grouped-bars"),
    title: "Bezrobocie: 2015 i 2025",
    sub: "Stopa bezrobocia (BAEL), %, 5 krajów",
    avoid_pl: "Więcej niż 3 serie w grupie (użyj małych wielokrotności).",
    avoid_en: "More than 3 series per group (use small multiples).",
    ariaLabel: CHART_SAMPLES["grouped-bars"].ariaLabel,
  }),
  variant("column.stacked", {
    ...base("stacked-columns"),
    title: "VAT niesie wzrost dochodów podatkowych",
    sub: "Dochody podatkowe budżetu państwa według podatków, mld zł, rocznie, 2019–2025",
    avoid_pl: "Porównywanie górnych segmentów między kolumnami; więcej niż 6 składników.",
    avoid_en: "Comparing upper segments across columns; more than 6 parts.",
    ariaLabel: CHART_SAMPLES["stacked-columns"].ariaLabel,
  }),
  variant("column.percent", {
    ...base("stacked-columns"),
    title: "Struktura dochodów podatkowych prawie się nie zmienia",
    sub: "Dochody podatkowe budżetu państwa według podatków, % sumy, rocznie, 2019–2025",
    avoid_pl: "Gdy liczy się poziom sumy (pokaż kolumny skumulowane); więcej niż 5 składników.",
    avoid_en: "When the level of the total matters (use stacked columns); more than 5 parts.",
    ariaLabel: "VAT to stale 44–47% dochodów podatkowych; udział CIT wzrósł z 10% w 2019 do 12% w 2025.",
  }),
  variant("column.diverging", {
    lang: "pl",
    unit: PCT,
    title: "Deficyt sektora finansów publicznych",
    sub: "Saldo sektora instytucji rządowych i samorządowych, % PKB, rocznie, 2015–2025 (dane przykładowe)",
    avoid_pl: "Wartości bez znaku (użyj kolumn prostych); kolory dobry/zły bez oceny.",
    avoid_en: "Unsigned values (use simple columns); good/bad colours without a judgement.",
    ariaLabel: "Sektor publiczny miał deficyt w każdym roku 2015–2025; najgłębszy w 2020 (−6,9% PKB) i w 2024 (−6,6%).",
    series: [{ id: "bal", label: "Saldo", points: years(2015, [-2.6, -2.4, -1.5, -0.2, -0.7, -6.9, -1.8, -3.4, -5.3, -6.6, -6.4]) }],
    reference: { value: -3, label: "kryterium z Maastricht −3%" },
  }),
  variant("column.ibcs", {
    ...base("ibcs-columns"),
    title: CHART_SAMPLES["ibcs-columns"].title,
    sub: CHART_SAMPLES["ibcs-columns"].sub,
    avoid_pl: CHART_SAMPLES["ibcs-columns"].avoid_pl,
    avoid_en: CHART_SAMPLES["ibcs-columns"].avoid_en,
    ariaLabel: CHART_SAMPLES["ibcs-columns"].ariaLabel,
  }),
  variant("column.variance", {
    ...base("variance-columns"),
    title: CHART_SAMPLES["variance-columns"].title,
    sub: CHART_SAMPLES["variance-columns"].sub,
    avoid_pl: CHART_SAMPLES["variance-columns"].avoid_pl,
    avoid_en: CHART_SAMPLES["variance-columns"].avoid_en,
    ariaLabel: CHART_SAMPLES["variance-columns"].ariaLabel,
  }),
  // ---------------- bar
  variant("bar.ranked", {
    ...base("ranked-bars"),
    title: "Mazowieckie daleko przed resztą",
    sub: "PKB na mieszkańca, Polska = 100, 2023, 8 z 16 województw",
    avoid_pl: "Kolejność alfabetyczna; kolor każdego słupka inny.",
    avoid_en: "Alphabetical order; a different colour for every bar.",
    ariaLabel: CHART_SAMPLES["ranked-bars"].ariaLabel,
  }),
  variant("bar.benchmark", {
    lang: "pl",
    unit: PCT,
    title: "Polska powyżej średniej UE",
    sub: "Wskaźnik zatrudnienia osób w wieku 20–64 lata, %, 2024, wybrane kraje i UE-27 (dane przykładowe)",
    avoid_pl: "Średnia UE narysowana jak zwykły kraj; kilka punktów odniesienia naraz.",
    avoid_en: "The EU average drawn like any country; several benchmarks at once.",
    ariaLabel: "Wskaźnik zatrudnienia w Polsce (78,3%) jest o 2,5 pp wyższy niż średnia UE-27 (75,8%).",
    categories: COUNTRIES_EMP,
    series: [
      {
        id: "emp",
        label: "Wskaźnik zatrudnienia",
        points: [83.5, 82.3, 81.3, 78.3, 75.8, 74.9, 70.9, 67.1].map((y, i) => ({ x: COUNTRIES_EMP[i]!.key, y })),
      },
    ],
    highlight: "PL",
  }),
  variant("bar.clustered", {
    lang: "pl",
    unit: PCT,
    title: "Nakłady na B+R rosną w każdym regionie",
    sub: "Nakłady wewnętrzne na działalność B+R, % PKB, 2015 i 2023, 6 województw (dane przykładowe)",
    avoid_pl: "Więcej niż 3 serie w wierszu; krótkie etykiety (użyj kolumn).",
    avoid_en: "More than 3 series per row; short labels (use columns).",
    ariaLabel: "Nakłady na B+R wzrosły w latach 2015–2023 w każdym z sześciu województw; najwyższe są w małopolskim (2,6% PKB).",
    categories: voivCats(["PL12", "PL14", "PL02", "PL22", "PL28", "PL04"]),
    series: [
      {
        id: "2015",
        label: "2015",
        points: ["PL12", "PL14", "PL02", "PL22", "PL28", "PL04"].map((x, i) => ({ x, y: [1.8, 1.7, 0.9, 1.1, 0.4, 0.5][i]! })),
      },
      {
        id: "2023",
        label: "2023",
        points: ["PL12", "PL14", "PL02", "PL22", "PL28", "PL04"].map((x, i) => ({ x, y: [2.6, 2.3, 1.5, 1.6, 0.8, 0.9][i]! })),
      },
    ],
  }),
  variant("bar.stacked", {
    lang: "pl",
    unit: { symbol: "tys.", isRate: false, decimals: 0 },
    title: "Usługi dominują w dużych województwach",
    sub: "Pracujący według sektorów, tys. osób, 2024, 6 województw (dane przykładowe)",
    avoid_pl: "Porównywanie środkowych segmentów między wierszami; więcej niż 5 składników.",
    avoid_en: "Comparing middle segments across rows; more than 5 parts.",
    ariaLabel: "Mazowieckie ma najwięcej pracujących (2 870 tys.), z czego 72% w usługach; w lubelskim co piąty pracuje w rolnictwie.",
    categories: voivCats(["PL14", "PL24", "PL30", "PL12", "PL02", "PL06"]),
    series: [
      {
        id: "agr",
        label: "Rolnictwo",
        points: ["PL14", "PL24", "PL30", "PL12", "PL02", "PL06"].map((x, i) => ({ x, y: [210, 40, 190, 170, 60, 190][i]! })),
      },
      {
        id: "ind",
        label: "Przemysł i budownictwo",
        points: ["PL14", "PL24", "PL30", "PL12", "PL02", "PL06"].map((x, i) => ({ x, y: [600, 620, 560, 450, 430, 230][i]! })),
      },
      {
        id: "srv",
        label: "Usługi",
        points: ["PL14", "PL24", "PL30", "PL12", "PL02", "PL06"].map((x, i) => ({ x, y: [2060, 1110, 940, 980, 860, 520][i]! })),
      },
    ],
  }),
  variant("bar.percent", {
    ...base("stacked-bars"),
    title: CHART_SAMPLES["stacked-bars"].title,
    sub: CHART_SAMPLES["stacked-bars"].sub,
    avoid_pl: CHART_SAMPLES["stacked-bars"].avoid_pl,
    avoid_en: CHART_SAMPLES["stacked-bars"].avoid_en,
    ariaLabel: CHART_SAMPLES["stacked-bars"].ariaLabel,
  }),
  variant("bar.diverging", {
    ...base("diverging-bars"),
    title: CHART_SAMPLES["diverging-bars"].title,
    sub: CHART_SAMPLES["diverging-bars"].sub,
    avoid_pl: CHART_SAMPLES["diverging-bars"].avoid_pl,
    avoid_en: CHART_SAMPLES["diverging-bars"].avoid_en,
    ariaLabel: CHART_SAMPLES["diverging-bars"].ariaLabel,
  }),
  variant("bar.segmented", {
    ...base("segmented-bar"),
    title: CHART_SAMPLES["segmented-bar"].title,
    sub: CHART_SAMPLES["segmented-bar"].sub,
    avoid_pl: CHART_SAMPLES["segmented-bar"].avoid_pl,
    avoid_en: CHART_SAMPLES["segmented-bar"].avoid_en,
    ariaLabel: CHART_SAMPLES["segmented-bar"].ariaLabel,
  }),
  variant("bar.ibcs", {
    ...base("ibcs-bars"),
    title: CHART_SAMPLES["ibcs-bars"].title,
    sub: CHART_SAMPLES["ibcs-bars"].sub,
    avoid_pl: CHART_SAMPLES["ibcs-bars"].avoid_pl,
    avoid_en: CHART_SAMPLES["ibcs-bars"].avoid_en,
    ariaLabel: CHART_SAMPLES["ibcs-bars"].ariaLabel,
  }),
  variant("bar.variance", {
    ...base("variance-bars"),
    title: CHART_SAMPLES["variance-bars"].title,
    sub: CHART_SAMPLES["variance-bars"].sub,
    avoid_pl: CHART_SAMPLES["variance-bars"].avoid_pl,
    avoid_en: CHART_SAMPLES["variance-bars"].avoid_en,
    ariaLabel: CHART_SAMPLES["variance-bars"].ariaLabel,
  }),
  // ---------------- area
  variant("area.simple", {
    ...base("area"),
    title: CHART_SAMPLES.area.title,
    sub: CHART_SAMPLES.area.sub,
    avoid_pl: CHART_SAMPLES.area.avoid_pl,
    avoid_en: CHART_SAMPLES.area.avoid_en,
    ariaLabel: CHART_SAMPLES.area.ariaLabel,
  }),
  variant("area.stacked", {
    ...base("stacked-area"),
    title: CHART_SAMPLES["stacked-area"].title,
    sub: CHART_SAMPLES["stacked-area"].sub,
    avoid_pl: CHART_SAMPLES["stacked-area"].avoid_pl,
    avoid_en: CHART_SAMPLES["stacked-area"].avoid_en,
    ariaLabel: CHART_SAMPLES["stacked-area"].ariaLabel,
  }),
  variant("area.percent", {
    ...base("area-share"),
    title: CHART_SAMPLES["area-share"].title,
    sub: CHART_SAMPLES["area-share"].sub,
    avoid_pl: CHART_SAMPLES["area-share"].avoid_pl,
    avoid_en: CHART_SAMPLES["area-share"].avoid_en,
    ariaLabel: CHART_SAMPLES["area-share"].ariaLabel,
  }),
  variant("area.surplus", {
    lang: "pl",
    unit: { symbol: "mld zł", isRate: false, decimals: 0 },
    title: "Handel towarami: od deficytu do nadwyżki",
    sub: "Saldo obrotów towarowych handlu zagranicznego, mld zł, rocznie, 2008–2025 (dane przykładowe)",
    avoid_pl: "Wartości bez naturalnego zera lub poziomu odniesienia; kilka serii naraz.",
    avoid_en: "Values without a natural zero or reference level; several series at once.",
    ariaLabel:
      "Saldo handlu towarami było ujemne do 2014, dodatnie w latach 2015–2016 i 2019–2021; po deficycie 90 mld zł w 2022 znów jest nadwyżka.",
    series: [
      {
        id: "bal",
        label: "Saldo obrotów towarowych",
        points: years(2008, [-98, -36, -46, -48, -34, -6, -10, 12, 15, 1, -29, 6, 51, -14, -90, 52, 18, 4]),
      },
    ],
  }),
  variant("area.range", {
    lang: "pl",
    unit: PCT,
    title: "Bezrobocie spada we wszystkich regionach",
    sub: "Stopa bezrobocia rejestrowanego, %, rocznie, 2015–2025; pasmo: od najniższej do najwyższej wśród województw",
    avoid_pl: "Pasmo bez podpisu granic; zakres mylony z przedziałem ufności.",
    avoid_en: "A band without its bounds named; a range mistaken for a confidence interval.",
    ariaLabel: "Stopa bezrobocia w Polsce spadła z 9,7% do 5,0%, a rozpiętość między województwami zmalała z 9,9 do 6,0 pp.",
    series: [
      { id: "PL", label: "Polska", role: "hero", points: years(2015, [9.7, 8.2, 6.6, 5.8, 5.2, 6.2, 5.8, 5.2, 5.1, 5.1, 5.0]) },
      { id: "lo", label: "minimum (wielkopolskie)", points: years(2015, [6.4, 4.9, 3.8, 3.1, 2.8, 3.6, 3.2, 2.9, 2.9, 2.9, 2.9]) },
      {
        id: "hi",
        label: "maksimum (warmińsko-mazurskie)",
        points: years(2015, [16.3, 14.2, 11.6, 10.7, 9.8, 10.9, 10.0, 8.9, 8.6, 8.2, 8.9]),
      },
    ],
  }),
  // ---------------- combo
  variant("combo.column-line", {
    ...base("combo"),
    title: CHART_SAMPLES.combo.title,
    sub: CHART_SAMPLES.combo.sub,
    avoid_pl: CHART_SAMPLES.combo.avoid_pl,
    avoid_en: CHART_SAMPLES.combo.avoid_en,
    ariaLabel: CHART_SAMPLES.combo.ariaLabel,
  }),
  variant("combo.contributions", {
    ...base("contributions"),
    title: CHART_SAMPLES.contributions.title,
    sub: CHART_SAMPLES.contributions.sub,
    avoid_pl: CHART_SAMPLES.contributions.avoid_pl,
    avoid_en: CHART_SAMPLES.contributions.avoid_en,
    ariaLabel: CHART_SAMPLES.contributions.ariaLabel,
  }),
  // ---------------- scatter / bubble
  variant("scatter.simple", {
    ...base("scatter"),
    title: CHART_SAMPLES.scatter.title,
    sub: CHART_SAMPLES.scatter.sub,
    avoid_pl: CHART_SAMPLES.scatter.avoid_pl,
    avoid_en: CHART_SAMPLES.scatter.avoid_en,
    ariaLabel: CHART_SAMPLES.scatter.ariaLabel,
  }),
  variant("scatter.trend", {
    ...base("scatter"),
    title: "Bogatsze regiony mają niższe bezrobocie",
    sub: "PKB na mieszkańca (Polska = 100, 2023) i stopa bezrobocia (%, 2025), 16 województw",
    avoid_pl: "Linia trendu dla kilku punktów lub zależności nieliniowej; trend czytany jako przyczyna.",
    avoid_en: "A trend line for a few points or a non-linear relation; a trend read as a cause.",
    ariaLabel: "Im wyższy PKB na mieszkańca województwa, tym niższa stopa bezrobocia; zależność jest umiarkowana.",
  }),
  variant("scatter.labelled", {
    ...base("scatter"),
    title: "Każde województwo na mapie zależności",
    sub: "PKB na mieszkańca (Polska = 100, 2023) i stopa bezrobocia (%, 2025), 16 województw",
    avoid_pl: "Więcej niż ~25 punktów (etykiety się nakładają); etykiety zamiast tabeli.",
    avoid_en: "More than ~25 points (labels overlap); labels instead of a table.",
    ariaLabel: "Świętokrzyskie i podkarpackie łączą niski PKB na mieszkańca z najwyższym bezrobociem; mazowieckie odstaje w drugą stronę.",
    highlight: undefined,
    categories: voivCats(VKEYS),
  }),
  variant("scatter.quadrants", {
    lang: "pl",
    unit: PCT,
    title: "Zatrudnienie i płace: cztery grupy województw",
    sub: "Wskaźnik zatrudnienia 20–64 lata (%) i przeciętne wynagrodzenie (Polska = 100), 2024, 16 województw (dane przykładowe)",
    avoid_pl: "Średnia ważona i nieważona pomylone; ćwiartki dla kilku punktów.",
    avoid_en: "Weighted and unweighted means confused; quadrants for a few points.",
    ariaLabel:
      "Mazowieckie, dolnośląskie i pomorskie mają wyższe od średniej zatrudnienie i płace; warmińsko-mazurskie i świętokrzyskie niższe.",
    categories: voivCats(VKEYS),
    series: [
      {
        id: "x",
        label: "Wskaźnik zatrudnienia 20–64, %",
        unit: PCT,
        points: VKEYS.map((k) => ({ x: k, y: r1(81 - UNEMP[k]! * 0.9 + (GDP_PC[k]! - 90) * 0.04) })),
      },
      {
        id: "y",
        label: "Przeciętne wynagrodzenie, Polska = 100",
        unit: IDX,
        points: VKEYS.map((k) => ({ x: k, y: Math.round(78 + GDP_PC[k]! * 0.22 + (k.charCodeAt(3) % 3)) })),
      },
    ],
    highlight: "PL14",
  }),
  variant("scatter.connected", {
    lang: "pl",
    unit: PCT,
    title: "Krzywa Beveridge’a: rynek pracy coraz ciaśniejszy",
    sub: "Stopa bezrobocia BAEL (%) i wskaźnik wolnych miejsc pracy (%), rocznie, 2012–2025 (dane przykładowe)",
    avoid_pl: "Więcej niż ~20 okresów; pętle bez etykiet lat.",
    avoid_en: "More than ~20 periods; loops without year labels.",
    ariaLabel: "Od 2012 bezrobocie spadło z 10,1% do 2,9%, a wskaźnik wolnych miejsc pracy wzrósł z 0,4% do 0,9% przy szczycie w 2022.",
    series: [
      {
        id: "x",
        label: "Stopa bezrobocia BAEL, %",
        unit: PCT,
        points: years(2012, [10.1, 10.3, 9.0, 7.5, 6.2, 4.9, 3.9, 3.3, 3.2, 3.4, 2.9, 2.8, 2.9, 3.2]),
      },
      {
        id: "y",
        label: "Wskaźnik wolnych miejsc pracy, %",
        unit: { symbol: "%", isRate: true, decimals: 2 },
        points: years(2012, [0.4, 0.4, 0.5, 0.6, 0.7, 0.9, 1.0, 0.9, 0.7, 0.9, 1.1, 0.9, 0.8, 0.9]),
      },
    ],
  }),
  variant("bubble.simple", {
    lang: "pl",
    unit: PCT,
    title: "Duże województwa, różne rynki pracy",
    sub: "PKB na mieszkańca (Polska = 100), stopa bezrobocia (%) i ludność (mln, wielkość koła), 16 województw",
    avoid_pl: "Wielkość koła liczona z promienia zamiast pola; więcej niż ~30 kół.",
    avoid_en: "Circle size from the radius instead of the area; more than ~30 circles.",
    ariaLabel:
      "Mazowieckie, najludniejsze, ma najwyższy PKB na mieszkańca i niskie bezrobocie; małe świętokrzyskie ma najwyższe bezrobocie.",
    categories: voivCats(VKEYS),
    series: [
      { id: "x", label: "PKB na mieszkańca, Polska = 100", unit: IDX, points: VKEYS.map((k) => ({ x: k, y: GDP_PC[k]! })) },
      { id: "y", label: "Stopa bezrobocia, %", unit: PCT, points: VKEYS.map((k) => ({ x: k, y: UNEMP[k]! })) },
      {
        id: "size",
        label: "Ludność, mln",
        unit: { symbol: "mln", isRate: false, decimals: 1 },
        points: VKEYS.map((k) => ({ x: k, y: POP[k]! })),
      },
    ],
    highlight: "PL14",
  }),
  variant("bubble.connected", {
    lang: "pl",
    unit: PCT,
    title: "Polska: wyższy PKB i wyższe zatrudnienie",
    sub: "PKB na mieszkańca w PPS (UE = 100), wskaźnik zatrudnienia 20–64 (%), PKB (bln zł, wielkość koła), 2015–2024",
    avoid_pl: "Więcej niż ~12 okresów; ślad bez etykiet początku i końca.",
    avoid_en: "More than ~12 periods; a trail without start and end labels.",
    ariaLabel: "W latach 2015–2024 PKB Polski na mieszkańca wzrósł z 69 do 80% średniej UE, a wskaźnik zatrudnienia z 69,3% do 78,3%.",
    series: [
      { id: "x", label: "PKB na mieszkańca w PPS, UE = 100", unit: IDX, points: years(2015, [69, 69, 70, 71, 73, 76, 77, 79, 79, 80]) },
      {
        id: "y",
        label: "Wskaźnik zatrudnienia 20–64, %",
        unit: PCT,
        points: years(2015, [69.3, 70.9, 72.2, 72.7, 73.0, 73.6, 75.4, 76.7, 77.9, 78.3]),
      },
      {
        id: "size",
        label: "PKB, bln zł",
        unit: { symbol: "bln zł", isRate: false, decimals: 1 },
        points: years(2015, [1.8, 1.86, 1.99, 2.12, 2.29, 2.33, 2.63, 3.07, 3.41, 3.64]),
      },
    ],
  }),
  // ---------------- dot
  variant("dot.lollipop", {
    ...base("lollipop"),
    title: CHART_SAMPLES.lollipop.title,
    sub: CHART_SAMPLES.lollipop.sub,
    avoid_pl: CHART_SAMPLES.lollipop.avoid_pl,
    avoid_en: CHART_SAMPLES.lollipop.avoid_en,
    ariaLabel: CHART_SAMPLES.lollipop.ariaLabel,
  }),
  variant("dot.cleveland", {
    ...base("dot-plot"),
    title: CHART_SAMPLES["dot-plot"].title,
    sub: CHART_SAMPLES["dot-plot"].sub,
    avoid_pl: CHART_SAMPLES["dot-plot"].avoid_pl,
    avoid_en: CHART_SAMPLES["dot-plot"].avoid_en,
    ariaLabel: CHART_SAMPLES["dot-plot"].ariaLabel,
  }),
  variant("dot.interval", {
    lang: "pl",
    unit: PCT,
    title: "Ubóstwo skrajne: różnice w granicach błędu",
    sub: "Zasięg ubóstwa skrajnego, % osób, 2024, 8 województw; odcinek: 95% przedział ufności (dane przykładowe)",
    avoid_pl: "Przedziały bez objaśnienia; ranking jednostek, których przedziały się nakładają.",
    avoid_en: "Intervals without a note; ranking units whose intervals overlap.",
    ariaLabel: "Zasięg ubóstwa skrajnego jest najwyższy w podkarpackim (8,1%), ale przedziały ufności większości województw się nakładają.",
    categories: voivCats(["PL18", "PL06", "PL26", "PL20", "PL28", "PL24", "PL30", "PL14"]),
    series: (() => {
      const keys = ["PL18", "PL06", "PL26", "PL20", "PL28", "PL24", "PL30", "PL14"];
      const v = [8.1, 7.6, 7.2, 6.9, 6.4, 4.8, 4.2, 3.1];
      const e = [1.3, 1.2, 1.6, 1.7, 1.5, 0.8, 0.9, 0.7];
      return [
        { id: "pov", label: "Zasięg ubóstwa skrajnego", points: keys.map((x, i) => ({ x, y: v[i]! })) },
        { id: "lo", label: "dolna granica", points: keys.map((x, i) => ({ x, y: r1(v[i]! - e[i]!) })) },
        { id: "hi", label: "górna granica", points: keys.map((x, i) => ({ x, y: r1(v[i]! + e[i]!) })) },
      ];
    })(),
  }),
  // ---------------- dumbbell / slope / bump
  variant("dumbbell.periods", {
    ...base("dumbbell"),
    title: CHART_SAMPLES.dumbbell.title,
    sub: CHART_SAMPLES.dumbbell.sub,
    avoid_pl: CHART_SAMPLES.dumbbell.avoid_pl,
    avoid_en: CHART_SAMPLES.dumbbell.avoid_en,
    ariaLabel: CHART_SAMPLES.dumbbell.ariaLabel,
  }),
  variant("dumbbell.groups", {
    lang: "pl",
    unit: PCT,
    title: "Luka zatrudnienia kobiet i mężczyzn",
    sub: "Wskaźnik zatrudnienia 20–64 lata według płci, %, 2024, 6 krajów (dane przykładowe)",
    avoid_pl: "Więcej niż dwie grupy; luka bez podanej wartości.",
    avoid_en: "More than two groups; a gap without its value.",
    ariaLabel: "Luka zatrudnienia kobiet i mężczyzn w Polsce wynosi 12,4 pp, więcej niż w Niemczech (7,3 pp) i Szwecji (4,9 pp).",
    categories: cats([
      ["PL", "Polska"],
      ["CZ", "Czechy"],
      ["DE", "Niemcy"],
      ["SE", "Szwecja"],
      ["IT", "Włochy"],
      ["EU27", "UE-27"],
    ]),
    series: [
      {
        id: "F",
        label: "kobiety",
        points: ["PL", "CZ", "DE", "SE", "IT", "EU27"].map((x, i) => ({ x, y: [72.1, 75.8, 77.6, 80.9, 57.4, 70.8][i]! })),
      },
      {
        id: "M",
        label: "mężczyźni",
        points: ["PL", "CZ", "DE", "SE", "IT", "EU27"].map((x, i) => ({ x, y: [84.5, 88.4, 84.9, 85.8, 76.8, 80.8][i]! })),
      },
    ],
  }),
  variant("slope.simple", {
    ...base("slope"),
    highlight: undefined,
    title: "PKB na mieszkańca: 2004 i 2024",
    sub: CHART_SAMPLES.slope.sub,
    avoid_pl: "Wiele przecinających się linii bez wyróżnienia; więcej niż dwa okresy.",
    avoid_en: "Many crossing lines without a highlight; more than two periods.",
    ariaLabel: CHART_SAMPLES.slope.ariaLabel,
  }),
  variant("slope.highlight", {
    ...base("slope"),
    title: CHART_SAMPLES.slope.title,
    sub: CHART_SAMPLES.slope.sub,
    avoid_pl: CHART_SAMPLES.slope.avoid_pl,
    avoid_en: CHART_SAMPLES.slope.avoid_en,
    ariaLabel: CHART_SAMPLES.slope.ariaLabel,
  }),
  variant("bump.rank", {
    ...base("bump"),
    title: CHART_SAMPLES.bump.title,
    sub: CHART_SAMPLES.bump.sub,
    avoid_pl: CHART_SAMPLES.bump.avoid_pl,
    avoid_en: CHART_SAMPLES.bump.avoid_en,
    ariaLabel: CHART_SAMPLES.bump.ariaLabel,
  }),
  // ---------------- pyramid
  variant("pyramid.absolute", {
    ...base("pyramid"),
    title: CHART_SAMPLES.pyramid.title,
    sub: CHART_SAMPLES.pyramid.sub,
    avoid_pl: CHART_SAMPLES.pyramid.avoid_pl,
    avoid_en: CHART_SAMPLES.pyramid.avoid_en,
    ariaLabel: CHART_SAMPLES.pyramid.ariaLabel,
  }),
  variant("pyramid.percent", {
    ...base("pyramid"),
    title: "Struktura wieku: udział w ludności",
    sub: "Ludność według wieku i płci, % całej ludności, 2024",
    avoid_pl: "Porównanie liczebności między krajami w liczbach bezwzględnych (użyj udziałów).",
    avoid_en: "Comparing populations of different size in absolute numbers (use shares).",
    ariaLabel: "Osoby w wieku 35–44 lata to największa grupa, po ok. 4% ludności na płeć; kobiety 85+ to 1,5% ludności.",
  }),
  variant("pyramid.overlay", {
    lang: "pl",
    unit: { symbol: "tys.", isRate: false, decimals: 0 },
    title: "W 2050 mniej dzieci, więcej seniorów",
    sub: "Ludność według wieku i płci, tys., 2025 (słupki) i prognoza GUS na 2050 (obrys) (dane przykładowe)",
    avoid_pl: "Więcej niż dwa okresy; obrys w kolorze słupków.",
    avoid_en: "More than two periods; an outline in the colour of the bars.",
    ariaLabel: "Do 2050 liczba dzieci do 14 lat spadnie o ok. 30%, a ludność w wieku 75+ wzrośnie o ponad połowę.",
    fill: { overlay: "2050" },
    categories: pyramidCats,
    series: [
      { id: "M", label: "mężczyźni 2025", points: pyramidBands.map((x, i) => ({ x, y: MEN_2025[i]! })) },
      { id: "F", label: "kobiety 2025", points: pyramidBands.map((x, i) => ({ x, y: WOM_2025[i]! })) },
      { id: "2050|M", label: "mężczyźni 2050", points: pyramidBands.map((x, i) => ({ x, y: MEN_2050[i]! })) },
      { id: "2050|F", label: "kobiety 2050", points: pyramidBands.map((x, i) => ({ x, y: WOM_2050[i]! })) },
    ],
  }),
  // ---------------- histogram / boxplot
  variant("histogram.simple", {
    ...base("histogram"),
    reference: undefined,
    title: "Rozkład gmin według bezrobocia",
    sub: "Liczba gmin według stopy bezrobocia, %, przedziały co 2 pp, 2025",
    avoid_pl: "Odstępy między słupkami jak w wykresie kategorii; nierówne przedziały.",
    avoid_en: "Gaps between bars as in a category chart; unequal bins.",
    ariaLabel: "Większość z 2477 gmin ma stopę bezrobocia poniżej 6%; rozkład jest prawostronnie skośny.",
  }),
  variant("histogram.marker", {
    ...base("histogram"),
    title: CHART_SAMPLES.histogram.title,
    sub: CHART_SAMPLES.histogram.sub,
    avoid_pl: CHART_SAMPLES.histogram.avoid_pl,
    avoid_en: CHART_SAMPLES.histogram.avoid_en,
    ariaLabel: CHART_SAMPLES.histogram.ariaLabel,
  }),
  variant("boxplot.category", {
    lang: "pl",
    unit: { symbol: "zł", isRate: false, decimals: 0 },
    title: "Płace w sekcjach: największy rozrzut w informacji i komunikacji",
    sub: "Przeciętne wynagrodzenie brutto w 16 województwach według sekcji PKD, zł, 2024; kropka: mazowieckie (dane przykładowe)",
    avoid_pl: "Mniej niż ~8 jednostek w grupie (pokaż punkty); odbiorcy bez objaśnienia kwartyli.",
    avoid_en: "Fewer than ~8 units per group (show the points); readers without a note on quartiles.",
    ariaLabel:
      "Mediana płac w informacji i komunikacji (10 900 zł) jest prawie dwa razy wyższa niż w zakwaterowaniu i gastronomii (5 600 zł).",
    categories: voivCats(VKEYS),
    highlight: "PL14",
    series: (
      [
        ["C", "Przetwórstwo przemysłowe", 7400],
        ["F", "Budownictwo", 7100],
        ["G", "Handel", 6900],
        ["I", "Gastronomia", 5600],
        ["J", "Informacja i komunikacja", 10900],
        ["K", "Finanse", 10200],
      ] as [string, string, number][]
    ).map(([id, label, med]) => ({
      id,
      label,
      points: VKEYS.map((k) => ({ x: k, y: Math.round(med * (0.78 + (GDP_PC[k]! / 160) * 0.32 + (k.charCodeAt(3) % 4) * 0.015)) })),
    })),
  }),
  variant("boxplot.time", {
    ...base("boxplot"),
    title: CHART_SAMPLES.boxplot.title,
    sub: CHART_SAMPLES.boxplot.sub,
    avoid_pl: CHART_SAMPLES.boxplot.avoid_pl,
    avoid_en: CHART_SAMPLES.boxplot.avoid_en,
    ariaLabel: CHART_SAMPLES.boxplot.ariaLabel,
  }),
  // ---------------- waterfall / bullet
  variant("waterfall.bridge", {
    ...base("bridge"),
    title: CHART_SAMPLES.bridge.title,
    sub: CHART_SAMPLES.bridge.sub,
    avoid_pl: CHART_SAMPLES.bridge.avoid_pl,
    avoid_en: CHART_SAMPLES.bridge.avoid_en,
    ariaLabel: CHART_SAMPLES.bridge.ariaLabel,
  }),
  variant("waterfall.period", {
    ...base("waterfall"),
    title: CHART_SAMPLES.waterfall.title,
    sub: CHART_SAMPLES.waterfall.sub,
    avoid_pl: CHART_SAMPLES.waterfall.avoid_pl,
    avoid_en: CHART_SAMPLES.waterfall.avoid_en,
    ariaLabel: CHART_SAMPLES.waterfall.ariaLabel,
  }),
  variant("bullet.target", {
    ...base("bullet"),
    band: undefined,
    bandLabel: undefined,
    title: "Miary inflacji wobec celu NBP",
    sub: "Inflacja r/r, %, wrzesień 2026; kreska: cel 2,5%",
    avoid_pl: "Cel bez podpisu; kilka celów na jednym pasku.",
    avoid_en: "A target without a label; several targets on one bar.",
    ariaLabel: CHART_SAMPLES.bullet.ariaLabel,
  }),
  variant("bullet.ranges", {
    ...base("bullet"),
    title: CHART_SAMPLES.bullet.title,
    sub: CHART_SAMPLES.bullet.sub,
    avoid_pl: CHART_SAMPLES.bullet.avoid_pl,
    avoid_en: CHART_SAMPLES.bullet.avoid_en,
    ariaLabel: CHART_SAMPLES.bullet.ariaLabel,
  }),
  // ---------------- treemap
  variant("treemap.flat", {
    ...base("treemap"),
    title: CHART_SAMPLES.treemap.title,
    sub: CHART_SAMPLES.treemap.sub,
    avoid_pl: CHART_SAMPLES.treemap.avoid_pl,
    avoid_en: CHART_SAMPLES.treemap.avoid_en,
    ariaLabel: CHART_SAMPLES.treemap.ariaLabel,
  }),
  variant("treemap.hierarchy", {
    lang: "pl",
    unit: { symbol: "mld zł", isRate: false, decimals: 0 },
    title: "Wydatki państwa: bezpieczeństwo i sprawy społeczne",
    sub: "Wydatki budżetu państwa według grup i celów, mld zł, 2025 (dane przykładowe)",
    avoid_pl: "Więcej niż 2 poziomy; grupy bez podpisu; porównywanie podobnych wielkości.",
    avoid_en: "More than 2 levels; unlabelled groups; comparing similar sizes.",
    ariaLabel: "Sprawy społeczne (180 mld zł) i bezpieczeństwo (153 mld zł) to razem ponad połowa wydatków budżetu państwa.",
    categories: [
      ...cats([
        ["soc", "Sprawy społeczne"],
        ["sec", "Bezpieczeństwo"],
        ["pub", "Usługi publiczne"],
        ["eco", "Gospodarka i państwo"],
      ]),
      ...(
        [
          ["pen", "Emerytury (dotacja FUS)", "soc"],
          ["fam", "Rodzina", "soc"],
          ["soc2", "Pomoc społeczna", "soc"],
          ["def", "Obrona narodowa", "sec"],
          ["pol", "Bezpieczeństwo publiczne", "sec"],
          ["hea", "Ochrona zdrowia", "pub"],
          ["edu", "Oświata i nauka", "pub"],
          ["cul", "Kultura", "pub"],
          ["debt", "Obsługa długu", "eco"],
          ["tra", "Transport", "eco"],
          ["agr", "Rolnictwo", "eco"],
          ["adm", "Administracja", "eco"],
        ] as [string, string, string][]
      ).map(([key, label, group]) => ({ key, label, group })),
    ],
    series: [
      {
        id: "exp",
        label: "Wydatki",
        points: (
          [
            ["pen", 90],
            ["fam", 70],
            ["soc2", 20],
            ["def", 118],
            ["pol", 35],
            ["hea", 60],
            ["edu", 50],
            ["cul", 12],
            ["debt", 66],
            ["tra", 30],
            ["agr", 25],
            ["adm", 20],
          ] as [string, number][]
        ).map(([x, y]) => ({ x, y })),
      },
    ],
  }),
  // ---------------- heatmap
  variant("heatmap.time", {
    ...base("heatmap"),
    title: CHART_SAMPLES.heatmap.title,
    sub: CHART_SAMPLES.heatmap.sub,
    avoid_pl: CHART_SAMPLES.heatmap.avoid_pl,
    avoid_en: CHART_SAMPLES.heatmap.avoid_en,
    ariaLabel: CHART_SAMPLES.heatmap.ariaLabel,
  }),
  variant("heatmap.region", {
    lang: "pl",
    unit: PCT,
    title: "Bezrobocie młodych najwyższe na wschodzie",
    sub: "Stopa bezrobocia rejestrowanego według wieku, %, 2025, 8 województw (dane przykładowe)",
    avoid_pl: "Wskaźniki w różnych jednostkach w jednej skali; więcej niż 5 klas.",
    avoid_en: "Indicators in different units on one scale; more than 5 classes.",
    ariaLabel:
      "Bezrobocie osób do 24 lat przekracza 10% w podkarpackim, świętokrzyskim i warmińsko-mazurskim; w wielkopolskim jest poniżej 5%.",
    categories: voivCats(["PL30", "PL14", "PL24", "PL12", "PL02", "PL28", "PL26", "PL18"]).map((c) => ({
      ...c,
      short: VOIVODESHIP_TILES.find((t) => t.key === c.key)!.abbr,
    })),
    series: (
      [
        ["y24", "do 24 lat", 1.6],
        ["y34", "25–34 lata", 1.15],
        ["y44", "35–44 lata", 0.9],
        ["y54", "45–54 lata", 0.85],
        ["y55", "55 lat i więcej", 0.8],
      ] as [string, string, number][]
    ).map(([id, label, f]) => ({
      id,
      label,
      points: ["PL30", "PL14", "PL24", "PL12", "PL02", "PL28", "PL26", "PL18"].map((x) => ({ x, y: r1(UNEMP[x]! * f) })),
    })),
  }),
  variant("heatmap.correlation", {
    lang: "pl",
    unit: { symbol: "", isRate: false, decimals: 2 },
    title: "Wskaźniki regionalne: co idzie w parze",
    sub: "Współczynnik korelacji Pearsona między wskaźnikami 16 województw, 2024 (dane przykładowe)",
    avoid_pl: "Korelacja czytana jako przyczyna; skala jednostronna dla wartości ujemnych i dodatnich.",
    avoid_en: "Correlation read as a cause; a one-sided scale for negative and positive values.",
    ariaLabel: "PKB na mieszkańca jest silnie dodatnio skorelowany z płacami (0,92) i ujemnie z bezrobociem (−0,71).",
    reference: { value: 0, label: "brak korelacji" },
    categories: cats([
      ["gdp", "PKB na mieszkańca", "PKB"],
      ["wage", "Wynagrodzenie", "Płace"],
      ["unemp", "Bezrobocie", "Bezrob."],
      ["rd", "Nakłady na B+R", "B+R"],
      ["pov", "Ubóstwo", "Ubóstwo"],
    ]),
    series: (() => {
      const keys = ["gdp", "wage", "unemp", "rd", "pov"];
      const labels = ["PKB na mieszkańca", "Wynagrodzenie", "Bezrobocie", "Nakłady na B+R", "Ubóstwo"];
      const m = [
        [1, 0.92, -0.71, 0.78, -0.66],
        [0.92, 1, -0.64, 0.74, -0.61],
        [-0.71, -0.64, 1, -0.52, 0.81],
        [0.78, 0.74, -0.52, 1, -0.47],
        [-0.66, -0.61, 0.81, -0.47, 1],
      ];
      return keys.map((id, r) => ({ id, label: labels[r]!, points: keys.map((x, k) => ({ x, y: m[r]![k]! })) }));
    })(),
  }),
  // ---------------- maps
  variant("choropleth.sequential", {
    ...base("choropleth"),
    title: CHART_SAMPLES.choropleth.title,
    sub: CHART_SAMPLES.choropleth.sub,
    avoid_pl: CHART_SAMPLES.choropleth.avoid_pl,
    avoid_en: CHART_SAMPLES.choropleth.avoid_en,
    ariaLabel: CHART_SAMPLES.choropleth.ariaLabel,
  }),
  variant("choropleth.diverging", {
    lang: "pl",
    unit: IDX,
    title: "PKB na mieszkańca wobec średniej kraju",
    sub: "PKB na mieszkańca, Polska = 100, 2023; kolory: poniżej i powyżej średniej",
    avoid_pl: "Skala dwustronna bez naturalnego środka; środek inny niż podany w opisie.",
    avoid_en: "A two-sided scale without a natural midpoint; a midpoint other than the one stated.",
    ariaLabel: "Tylko cztery województwa mają PKB na mieszkańca powyżej średniej kraju; najbardziej odstaje mazowieckie (160).",
    series: [tileMapSeries(GDP_PC, "PKB na mieszkańca")],
    reference: { value: 100, label: "Polska = 100" },
    highlight: "PL14",
  }),
  variant("choropleth.typology", {
    lang: "pl",
    unit: IDX,
    title: "Typy województw według struktury gospodarki",
    sub: "Dominujący profil gospodarczy województwa, 2024 (dane przykładowe)",
    avoid_pl: "Więcej niż 5 typów; kolejność kolorów sugerująca ranking.",
    avoid_en: "More than 5 types; a colour order that suggests a ranking.",
    ariaLabel: "Metropolitalne usługi dominują w mazowieckim, małopolskim, dolnośląskim i pomorskim; ściana wschodnia ma profil rolniczy.",
    categories: [
      ...cats([
        ["metro", "usługi metropolitalne"],
        ["ind", "przemysł"],
        ["agr", "rolnictwo"],
        ["mix", "mieszany"],
      ]),
      ...(
        [
          ["PL14", "metro"],
          ["PL12", "metro"],
          ["PL02", "metro"],
          ["PL22", "metro"],
          ["PL24", "ind"],
          ["PL30", "ind"],
          ["PL10", "ind"],
          ["PL16", "ind"],
          ["PL06", "agr"],
          ["PL20", "agr"],
          ["PL18", "agr"],
          ["PL26", "agr"],
          ["PL28", "mix"],
          ["PL04", "mix"],
          ["PL32", "mix"],
          ["PL08", "mix"],
        ] as [string, string][]
      ).map(([key, group]) => ({ key, label: VOIV[key]!, group })),
    ],
    series: [tileMapSeries(GDP_PC, "PKB na mieszkańca, Polska = 100")],
  }),
  variant("tiles.color", {
    ...base("tile-map"),
    title: CHART_SAMPLES["tile-map"].title,
    sub: CHART_SAMPLES["tile-map"].sub,
    avoid_pl: CHART_SAMPLES["tile-map"].avoid_pl,
    avoid_en: CHART_SAMPLES["tile-map"].avoid_en,
    ariaLabel: CHART_SAMPLES["tile-map"].ariaLabel,
  }),
  variant("tiles.mini", {
    lang: "pl",
    unit: PCT,
    title: "Bezrobocie spada w każdym województwie",
    sub: "Stopa bezrobocia rejestrowanego, %, 2025, i jej przebieg 2015–2025 (wspólna skala)",
    avoid_pl: "Więcej niż ~10 okresów w kafelku; osobna skala w każdym kafelku.",
    avoid_en: "More than ~10 periods per tile; a separate scale in every tile.",
    ariaLabel: "Bezrobocie spadło w latach 2015–2025 w każdym z 16 województw; najwięcej w warmińsko-mazurskim i podkarpackim.",
    series: [tileMapSeries(UNEMP, "Stopa bezrobocia 2025"), ...VKEYS.map((k) => ({ id: k, label: VOIV[k]!, points: unempHistory(k) }))],
  }),
  // ---------------- tables
  variant("table.ranking", {
    ...base("ranking-table"),
    title: CHART_SAMPLES["ranking-table"].title,
    sub: CHART_SAMPLES["ranking-table"].sub,
    avoid_pl: CHART_SAMPLES["ranking-table"].avoid_pl,
    avoid_en: CHART_SAMPLES["ranking-table"].avoid_en,
    ariaLabel: CHART_SAMPLES["ranking-table"].ariaLabel,
  }),
  variant("table.spark", {
    ...base("sparkline-table"),
    title: CHART_SAMPLES["sparkline-table"].title,
    sub: CHART_SAMPLES["sparkline-table"].sub,
    avoid_pl: CHART_SAMPLES["sparkline-table"].avoid_pl,
    avoid_en: CHART_SAMPLES["sparkline-table"].avoid_en,
    ariaLabel: CHART_SAMPLES["sparkline-table"].ariaLabel,
  }),
]);

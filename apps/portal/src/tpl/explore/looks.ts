// The wardrobe (owner's "outfits", 2026-11-09; spec: docs/chart-looks-spec.md). A chart TYPE is the garment (line,
// column, bar, area, combo); its LOOKS are prepared outfits for an occasion, flipped with ‹ › on the chart; its
// SETTINGS are the accessories and alterations, grouped like the format and analytics panes of Power BI, Tableau and
// Qlik: data layout (which dimension goes where, stacking, top N, sort), business comparison (IBCS), emphasis, marks,
// analytics, labels, axes, legend and title. A look is a preset of the settings plus a layout of the dimensions;
// anything the reader changes on top marks the look modified, with a way back. The URL keeps `v=<look>` and
// `o.<key>=<value>` for the changes. Every look draws in the one zohelo palette: a style changes notation, not colour.

import type { ChartType, ZCategory, ZChartProps, ZSeries } from "@zohelo/visuals";
import type { ChartKind, Grain, Query, Shape, SlotKey } from "./exploreState";
import { additive } from "./layout";
import { FREQ_GRAIN } from "./model";
import { QUESTION_ORDER, type QuestionId } from "./questions";
import { coarsest } from "./transform";

// ---------- types of the wardrobe

export type WardrobeType = "line" | "column" | "bar" | "area" | "combo";
export const WARDROBE_TYPES: WardrobeType[] = ["line", "column", "bar", "area", "combo"];

/** The explorer kind whose wells and data a wardrobe type uses. */
export const WARDROBE_BASE: Record<WardrobeType, ChartKind> = {
  line: "line",
  column: "columns",
  bar: "bars",
  area: "area",
  combo: "combo",
};
const KIND_WARDROBE = Object.fromEntries(Object.entries(WARDROBE_BASE).map(([t, k]) => [k, t])) as Partial<Record<ChartKind, WardrobeType>>;

/** The wardrobe type of an explorer kind (undefined for kinds without looks: maps, scatter, tables…). */
export function wardrobeOf(chart: ChartKind): WardrobeType | undefined {
  return KIND_WARDROBE[chart];
}

/**
 * Old explorer kinds that are now a look of a wardrobe type: a link with `chart=stackcols` opens column charts in the
 * stacked look. The kinds stay in KIND_INFO for the builders; the picker never offers them.
 */
export const LEGACY_KIND: Partial<Record<ChartKind, { chart: ChartKind; v: string }>> = {
  stackcols: { chart: "columns", v: "column.stacked" },
  ibcs: { chart: "columns", v: "column.ibcs" },
  variance: { chart: "columns", v: "column.variance" },
  stacked: { chart: "area", v: "area.stacked" },
  share: { chart: "area", v: "area.percent" },
  stackbars: { chart: "bars", v: "bar.percent" },
  diverging: { chart: "bars", v: "bar.diverging" },
  ibcsbars: { chart: "bars", v: "bar.ibcs" },
  varbars: { chart: "bars", v: "bar.variance" },
  bridge: { chart: "bars", v: "bar.bridge" },
};

// ---------- settings

export type SettingGroup = "layout" | "compare" | "emphasis" | "marks" | "analytics" | "labels" | "axes" | "legend";
export const GROUP_ORDER: SettingGroup[] = ["layout", "compare", "emphasis", "marks", "analytics", "labels", "axes", "legend"];

export const SETTING_GROUPS: Record<SettingGroup, { pl: string; en: string }> = {
  layout: { pl: "Układ danych", en: "Data layout" },
  compare: { pl: "Porównanie biznesowe", en: "Business comparison" },
  emphasis: { pl: "Wyróżnienie", en: "Emphasis" },
  marks: { pl: "Kształt", en: "Marks" },
  analytics: { pl: "Analityka", en: "Analytics" },
  labels: { pl: "Etykiety", en: "Labels" },
  axes: { pl: "Osie", en: "Axes" },
  legend: { pl: "Legenda i tytuł", en: "Legend and title" },
};

export type Settings = Record<string, string>;

export type Option = { value: string; pl: string; en: string };

/**
 * What the reader's data allows (computed once per view): the locks of looks and options come from here, so the
 * pane, the URL and the drawing agree.
 */
export type LookCtx = {
  /** The measures are rates or shares: an index makes no sense. */
  rates: boolean;
  /** Every measure is an additive amount: parts may be stacked, shared out or summed into "Pozostałe". */
  additive: boolean;
  grain: Grain;
  /** The x axis is time (periods). */
  timeX: boolean;
  /** A dimension splits the series (legend or panels), with this many members. */
  seriesCount: number;
  /** Years with data in the window (a previous-year comparison needs two). */
  years: number;
  /** Poland and EU-27 are among the categories or series. */
  hasPL: boolean;
  hasEU: boolean;
  /** Dimension layout read from the wells. */
  layout: "one" | "legend" | "panels" | "seasonal";
  /** The data are being compared with the previous year (business looks). */
  business?: boolean;
};

export type SettingDef = {
  key: string;
  pl: string;
  en: string;
  group: SettingGroup;
  options: Option[];
  /** One line under the control: what the setting does. */
  hintPl?: string;
  hintEn?: string;
  /** Why the whole setting cannot be changed with the current data (template: the catalogue lacks it). */
  lockedPl?: string;
  lockedEn?: string;
  /** Shown only when this holds (e.g. panel settings with panels). */
  when?: (s: Settings, ctx: LookCtx) => boolean;
  /** Why one option cannot be chosen now (empty = it can). */
  lock?: (value: string, ctx: LookCtx, s: Settings) => { pl: string; en: string } | null;
};

const O = (value: string, pl: string, en: string): Option => ({ value, pl, en });
const D = (key: string, group: SettingGroup, pl: string, en: string, options: Option[], extra: Partial<SettingDef> = {}): SettingDef => ({
  key,
  pl,
  en,
  group,
  options,
  ...extra,
});

/** Keys that move dimensions between the wells instead of changing the drawing (never stored in `o`). */
export const LAYOUT_KEYS = ["series"];

const NO_SERIES = {
  pl: "Potrzebny jest wymiar w legendzie (obszary, kategorie lub miary).",
  en: "Needs a dimension in the legend (areas, categories or measures).",
};
const NOT_ADDITIVE = {
  pl: "Części tej miary się nie sumują (średnia, stopa lub udział): skumulowanie pokazałoby fałszywą sumę.",
  en: "The parts of this measure do not add up (an average, rate or share): stacking would show a false total.",
};
const NO_PY = {
  pl: "Porównanie z rokiem poprzednim wymaga co najmniej dwóch lat danych.",
  en: "A previous-year comparison needs at least two years of data.",
};
const NO_BRIDGE = {
  pl: "Most sumuje części całości; części tej miary (średniej, stopy lub udziału) się nie sumują.",
  en: "A bridge adds up parts of a whole; the parts of this measure (an average, rate or share) do not add up.",
};
const NO_INDEX = {
  pl: "Indeks ma sens dla poziomów (PKB, płace), nie dla stóp i udziałów.",
  en: "An index suits levels (GDP, wages), not rates and shares.",
};
const NO_EU = { pl: "UE-27 nie ma wśród wybranych obszarów.", en: "EU-27 is not among the chosen areas." };
const TIME_ORDER = { pl: "Oś czasu zachowuje kolejność okresów.", en: "A time axis keeps the order of the periods." };
const NO_SEASON = { pl: "Sezonowość wymaga danych miesięcznych lub kwartalnych.", en: "Seasonality needs monthly or quarterly data." };

const seriesLock = (v: string, ctx: LookCtx) => (v !== "one" && v !== "legend" && ctx.seriesCount < 2 ? NO_SERIES : null);
const stackLock = (v: string, ctx: LookCtx) =>
  v === "stacked" || v === "percent" ? (ctx.seriesCount < 2 ? NO_SERIES : !ctx.additive ? NOT_ADDITIVE : null) : null;
const noBusiness = (_: Settings, ctx: LookCtx) => !ctx.business;

// --- shared definitions (built per type so the labels fit the type)
const topDef = (pl: string, en: string, hintPl: string, hintEn: string) =>
  D(
    "top",
    "layout",
    pl,
    en,
    [O("all", "Wszystkie", "All"), O("10", "10 najwyższych", "Top 10"), O("5", "5 najwyższych", "Top 5"), O("3", "3 najwyższe", "Top 3")],
    {
      hintPl,
      hintEn,
    },
  );
const sortDef = D(
  "sort",
  "layout",
  "Kolejność",
  "Order",
  [O("data", "Jak w danych", "As in the data"), O("desc", "Malejąco", "Descending"), O("asc", "Rosnąco", "Ascending")],
  {
    lock: (v, ctx) => (v !== "data" && ctx.timeX ? TIME_ORDER : null),
  },
);
const panelAxis = D(
  "panelAxis",
  "layout",
  "Oś w panelach",
  "Panel axis",
  [O("shared", "Wspólna skala", "Shared scale"), O("own", "Dopasowana do panelu", "Fitted per panel")],
  {
    when: (s) => s.series === "panels",
  },
);
const panelContext = D(
  "panelContext",
  "layout",
  "Tło w panelach",
  "Panel context",
  [O("off", "Bez tła", "None"), O("on", "Pozostałe serie na szaro", "Other series in grey")],
  {
    when: (s) => s.series === "panels",
  },
);
const heroDef = (pl: string, en: string, hintPl: string, hintEn: string, extremes = false) =>
  D(
    "emphasis",
    "emphasis",
    "Wyróżnienie",
    "Emphasis",
    [
      O("none", "Wszystkie w kolorach", "All in colour"),
      O("hero", pl, en),
      ...(extremes ? [O("extremes", "Najwyższa i najniższa", "Highest and lowest")] : []),
    ],
    { hintPl, hintEn, when: noBusiness },
  );
const contextDash = D(
  "context",
  "emphasis",
  "Serie tła",
  "Context series",
  [O("solid", "Ciągłe", "Solid"), O("dashed", "Przerywane", "Dashed")],
  {
    when: (s, ctx) => s.emphasis !== "none" && !ctx.business,
  },
);
const shapeDef = D("shape", "marks", "Kształt linii", "Line shape", [
  O("line", "Prosta", "Straight"),
  O("smooth", "Wygładzona", "Smooth"),
  O("step", "Schodki", "Steps"),
]);
const weightDef = D("weight", "marks", "Grubość linii", "Line weight", [
  O("thin", "Cienka", "Thin"),
  O("normal", "Standard", "Standard"),
  O("thick", "Gruba", "Thick"),
]);
const markersDef = D("markers", "marks", "Punkty", "Markers", [O("off", "Bez", "None"), O("on", "W każdym okresie", "Every period")]);
const barWidthDef = D(
  "barWidth",
  "marks",
  "Szerokość słupków",
  "Bar width",
  [O("normal", "Standard", "Standard"), O("narrow", "Wąskie", "Narrow")],
  { when: noBusiness },
);
const referenceDef = (eu: boolean) =>
  D(
    "reference",
    "analytics",
    "Linia odniesienia",
    "Reference line",
    [
      O("none", "Brak", "None"),
      O("zero", "Zero", "Zero"),
      O("avg", "Średnia", "Average"),
      O("median", "Mediana", "Median"),
      ...(eu ? [O("eu", "UE-27", "EU-27")] : []),
    ],
    { lock: (v, ctx) => (v === "eu" && !ctx.hasEU ? NO_EU : null), when: noBusiness },
  );
const annotateDef = D(
  "annotate",
  "analytics",
  "Adnotacje",
  "Annotations",
  [O("none", "Brak", "None"), O("max", "Szczyt", "Peak"), O("min", "Dołek", "Trough"), O("both", "Szczyt i dołek", "Peak and trough")],
  {
    when: (s, ctx) => ctx.timeX && s.series !== "panels",
  },
);
const trendDef = D("trend", "analytics", "Linia trendu", "Trend line", [O("off", "Bez", "None"), O("on", "Liniowy", "Linear")], {
  when: (s, ctx) => ctx.timeX && s.series !== "panels",
});
const namesDef = D("names", "labels", "Nazwy serii", "Series names", [
  O("end", "Na końcu linii", "At the line ends"),
  O("legend", "W legendzie", "In the legend"),
  O("both", "Oba", "Both"),
]);
const valuesDef = D("values", "labels", "Etykiety wartości", "Data labels", [
  O("none", "Brak", "None"),
  O("last", "Ostatnia", "Last"),
  O("minmax", "Najwyższa i najniższa", "Highest and lowest"),
  O("all", "Wszystkie (do 24)", "All (up to 24)"),
]);
const barLabelsDef = D(
  "barLabels",
  "labels",
  "Etykiety wartości",
  "Data labels",
  [O("auto", "Ostatnia i wyróżniona", "Last and emphasised"), O("all", "Wszystkie", "All"), O("none", "Brak", "None")],
  { when: noBusiness },
);
const decimalsDef = D("decimals", "labels", "Miejsca po przecinku", "Decimals", [
  O("auto", "Auto", "Auto"),
  O("0", "0", "0"),
  O("1", "1", "1"),
  O("2", "2", "2"),
]);
const scaleDef = D(
  "scale",
  "axes",
  "Skala",
  "Scale",
  [O("value", "Wartości", "Values"), O("index", "Indeks, start = 100", "Index, start = 100")],
  {
    lock: (v, ctx) => (v === "index" && ctx.rates ? NO_INDEX : null),
    when: (s, ctx) => ctx.timeX && !ctx.business && s.stack !== "percent",
  },
);
const zeroDef = D("zero", "axes", "Początek osi", "Axis start", [O("auto", "Dopasowany", "Fitted"), O("zero", "Od zera", "From zero")]);
const gridDef = D("grid", "axes", "Siatka", "Gridlines", [O("on", "Pozioma", "Horizontal"), O("off", "Bez", "None")], { when: noBusiness });
const legendDef = D("legend", "legend", "Legenda", "Legend", [
  O("bottom", "Pod wykresem", "Below"),
  O("top", "Nad wykresem", "Above"),
  O("hidden", "Ukryta", "Hidden"),
]);
const titleDef = D("title", "legend", "Tytuł", "Title", [
  O("auto", "Opis danych", "Data description"),
  O("finding", "Wniosek jako tytuł", "Finding as title"),
]);
const compareDef = (bridge: boolean) =>
  D(
    "compare",
    "compare",
    "Wobec roku poprzedniego",
    "Against the previous year",
    [
      O("none", "Bez", "None"),
      O("ibcs", "IBCS: AC i PY", "IBCS: AC and PY"),
      O("variance", "Odchylenie na słupku", "Variance on the bar"),
      ...(bridge ? [O("bridge", "Most PY → AC", "Bridge PY → AC")] : []),
    ],
    {
      hintPl: "Wykonanie (AC) w kolorze serii, rok wcześniej (PY) szary; zielony i czerwony tylko dla ocenianych odchyleń.",
      hintEn: "Actual (AC) in the series colour, the previous year (PY) grey; green and red only for judged variances.",
      lock: (v, ctx) => (v !== "none" && ctx.years < 2 ? NO_PY : v === "bridge" && !ctx.additive ? NO_BRIDGE : null),
    },
  );

// --- line
export const LINE_SETTINGS: SettingDef[] = [
  D(
    "series",
    "layout",
    "Układ serii",
    "Series layout",
    [
      O("one", "Serie na jednym wykresie", "Series on one chart"),
      O("panels", "Osobne panele", "Small multiples"),
      O("seasonal", "Sezonowo: lata jako serie", "Seasonal: years as series"),
    ],
    { lock: (v, ctx) => (v === "seasonal" && ctx.grain === "y" ? NO_SEASON : seriesLock(v, ctx)) },
  ),
  panelAxis,
  panelContext,
  topDef(
    "Liczba serii",
    "Number of series",
    "Według ostatniej wartości; Polska zostaje zawsze.",
    "By the latest value; Poland always stays.",
  ),
  heroDef(
    "Jedna na tle szarych",
    "One against grey",
    "Polska, gdy jest na wykresie; w układzie sezonowym ostatni rok.",
    "Poland when it is on the chart; the latest year in the seasonal layout.",
    true,
  ),
  contextDash,
  shapeDef,
  weightDef,
  markersDef,
  D("fill", "marks", "Wypełnienie", "Area fill", [
    O("none", "Bez", "None"),
    O("hero", "Pod wyróżnioną", "Under the hero"),
    O("all", "Pod wszystkimi", "Under all"),
  ]),
  referenceDef(false),
  D(
    "band",
    "analytics",
    "Pasmo",
    "Band",
    [
      O("none", "Brak", "None"),
      O("minmax", "Rozpiętość pozostałych", "Range of the others"),
      O("iqr", "Środkowe 50% pozostałych", "Middle 50% of the others"),
    ],
    {
      hintPl: "W układzie sezonowym: rozpiętość poprzednich lat.",
      hintEn: "In the seasonal layout: the range of the previous years.",
      lock: (v, ctx) =>
        v !== "none" && ctx.seriesCount < 3
          ? { pl: "Pasmo wymaga co najmniej trzech serii.", en: "A band needs at least three series." }
          : null,
      when: (s) => s.series !== "panels",
    },
  ),
  trendDef,
  annotateDef,
  D("uncertainty", "analytics", "Przedział ufności", "Confidence band", [O("off", "Bez", "None"), O("band", "Pokaż", "Show")], {
    lockedPl: "Ta miara nie ma przedziałów ufności.",
    lockedEn: "This measure has no confidence intervals.",
  }),
  D("forecast", "analytics", "Prognoza", "Forecast", [O("off", "Bez", "None"), O("on", "Pokaż", "Show")], {
    lockedPl: "Ta miara nie ma prognozy.",
    lockedEn: "This measure has no forecast.",
  }),
  namesDef,
  valuesDef,
  decimalsDef,
  scaleDef,
  zeroDef,
  gridDef,
  legendDef,
  titleDef,
];

// --- column
export const COLUMN_SETTINGS: SettingDef[] = [
  D(
    "series",
    "layout",
    "Układ serii",
    "Series layout",
    [O("legend", "Na jednym wykresie", "On one chart"), O("panels", "Osobne panele", "Small multiples")],
    {
      lock: seriesLock,
      when: (_, ctx) => ctx.seriesCount > 1,
    },
  ),
  D(
    "stack",
    "layout",
    "Słupki serii",
    "Series bars",
    [
      O("clustered", "Obok siebie", "Side by side"),
      O("stacked", "Skumulowane", "Stacked"),
      O("percent", "Skumulowane 100%", "100% stacked"),
    ],
    {
      lock: stackLock,
      when: (s, ctx) => ctx.seriesCount > 1 && s.series !== "panels" && !ctx.business,
    },
  ),
  panelAxis,
  topDef(
    "Liczba kategorii",
    "Number of categories",
    "Reszta trafia do „Pozostałe”, gdy wartości się sumują; serie: według ostatniej wartości.",
    "The rest fold into “Other” when the values add up; series: by the latest value.",
  ),
  sortDef,
  compareDef(false),
  heroDef(
    "Polska lub ostatni okres",
    "Poland or the latest period",
    "Na osi czasu: ostatni okres; wśród obszarów: Polska; inaczej pierwsza seria.",
    "On a time axis: the latest period; among areas: Poland; else the first series.",
  ),
  barWidthDef,
  referenceDef(true),
  barLabelsDef,
  D("totals", "labels", "Sumy", "Totals", [O("on", "Nad słupkiem", "Above the bar"), O("off", "Bez", "None")], {
    when: (s) => s.stack === "stacked",
  }),
  decimalsDef,
  scaleDef,
  gridDef,
  legendDef,
  titleDef,
];

// --- bar
export const BAR_SETTINGS: SettingDef[] = [
  D(
    "series",
    "layout",
    "Układ serii",
    "Series layout",
    [O("legend", "Na jednym wykresie", "On one chart"), O("panels", "Osobne panele", "Small multiples")],
    {
      lock: seriesLock,
      when: (_, ctx) => ctx.seriesCount > 1,
    },
  ),
  D(
    "stack",
    "layout",
    "Słupki serii",
    "Series bars",
    [
      O("clustered", "Obok siebie", "Side by side"),
      O("stacked", "Skumulowane", "Stacked"),
      O("percent", "Skumulowane 100%", "100% stacked"),
    ],
    {
      lock: stackLock,
      when: (s, ctx) => ctx.seriesCount > 1 && s.series !== "panels" && !ctx.business,
    },
  ),
  topDef(
    "Liczba kategorii",
    "Number of categories",
    "Reszta trafia do „Pozostałe”, gdy wartości się sumują.",
    "The rest fold into “Other” when the values add up.",
  ),
  {
    ...sortDef,
    options: [O("desc", "Malejąco", "Descending"), O("asc", "Rosnąco", "Ascending"), O("data", "Jak w danych", "As in the data")],
  },
  compareDef(true),
  heroDef(
    "Polska na tle szarych",
    "Poland against grey",
    "Polska, gdy jest wśród kategorii; inaczej pierwsza.",
    "Poland when it is among the categories; else the first.",
  ),
  D(
    "benchmark",
    "emphasis",
    "Punkt odniesienia",
    "Benchmark",
    [O("off", "Bez", "None"), O("eu", "UE-27 (szary, linia kropkowana)", "EU-27 (grey, dotted line)")],
    {
      lock: (v, ctx) => (v === "eu" && !ctx.hasEU ? NO_EU : null),
      when: noBusiness,
    },
  ),
  D(
    "diverging",
    "marks",
    "Wokół zera",
    "Around zero",
    [O("off", "Od zera w prawo", "From zero to the right"), O("on", "Dodatnie i ujemne", "Positive and negative")],
    {
      hintPl: "Dla sald i zmian: słupki w dwie strony od osi.",
      hintEn: "For balances and changes: bars both ways from the axis.",
      when: (s, ctx) => ctx.seriesCount < 2 && !ctx.business && s.series !== "panels",
    },
  ),
  referenceDef(true),
  {
    ...barLabelsDef,
    options: [O("auto", "Wartości przy słupkach", "Values beside the bars"), O("all", "Wszystkie", "All"), O("none", "Brak", "None")],
  },
  decimalsDef,
  legendDef,
  titleDef,
];

// --- area
export const AREA_SETTINGS: SettingDef[] = [
  D(
    "series",
    "layout",
    "Układ serii",
    "Series layout",
    [O("legend", "Na jednym wykresie", "On one chart"), O("panels", "Osobne panele", "Small multiples")],
    {
      lock: seriesLock,
      when: (_, ctx) => ctx.seriesCount > 1,
    },
  ),
  D(
    "stack",
    "layout",
    "Warstwy",
    "Layers",
    [O("overlap", "Nakładające się", "Overlapping"), O("stacked", "Skumulowane", "Stacked"), O("percent", "Struktura 100%", "100% share")],
    {
      lock: stackLock,
      when: (s, ctx) => ctx.seriesCount > 1 && s.series !== "panels",
    },
  ),
  panelAxis,
  topDef(
    "Liczba serii",
    "Number of series",
    "Według ostatniej wartości; Polska zostaje zawsze.",
    "By the latest value; Poland always stays.",
  ),
  heroDef(
    "Jedna na tle szarych",
    "One against grey",
    "Polska, gdy jest na wykresie; inaczej pierwsza seria.",
    "Poland when it is on the chart; else the first series.",
  ),
  shapeDef,
  D("areaFill", "marks", "Wypełnienie", "Fill", [O("light", "Lekkie", "Light"), O("strong", "Mocne", "Strong")], {
    when: (s) => s.stack === "overlap" || !s.stack,
  }),
  markersDef,
  D(
    "surplus",
    "analytics",
    "Nadwyżka i deficyt",
    "Surplus and deficit",
    [O("off", "Bez", "None"), O("on", "Nad i pod linią", "Above and below the line")],
    {
      hintPl: "Pole nad zerem (lub linią odniesienia) w kolorze serii, pod nim czerwone: salda, bilanse.",
      hintEn: "The area above zero (or the reference line) in the series colour, below it red: balances.",
      when: (s, ctx) => (s.stack === "overlap" || !s.stack) && ctx.seriesCount < 2,
    },
  ),
  D(
    "band",
    "analytics",
    "Pasmo",
    "Band",
    [O("none", "Brak", "None"), O("minmax", "Rozpiętość pozostałych wokół wyróżnionej", "Range of the others around the hero")],
    {
      lock: (v, ctx) =>
        v !== "none" && ctx.seriesCount < 3
          ? { pl: "Pasmo wymaga co najmniej trzech serii.", en: "A band needs at least three series." }
          : null,
      when: (s) => s.stack === "overlap" || !s.stack,
    },
  ),
  referenceDef(false),
  namesDef,
  decimalsDef,
  scaleDef,
  gridDef,
  legendDef,
  titleDef,
];

// --- combo
export const COMBO_SETTINGS: SettingDef[] = [
  D("series", "layout", "Układ", "Layout", [O("one", "Jeden wykres", "One chart"), O("panels", "Osobne panele", "Small multiples")], {
    lock: (v, ctx) =>
      v === "panels" && ctx.seriesCount < 2
        ? {
            pl: "Panele wymagają wymiaru w „Małych wielokrotnościach” (np. obszary).",
            en: "Panels need a dimension in “Small multiples” (e.g. areas).",
          }
        : null,
  }),
  D("swap", "layout", "Co jest kolumnami", "What the columns show", [
    O("first", "Pierwsza miara", "The first measure"),
    O("second", "Druga miara", "The second measure"),
  ]),
  D("emphasis", "emphasis", "Wyróżnienie", "Emphasis", [
    O("both", "Kolumny i linia w kolorze", "Columns and line in colour"),
    O("line", "Linia na tle szarych kolumn", "The line against grey columns"),
  ]),
  D("lineColour", "emphasis", "Kolor linii", "Line colour", [
    O("ink", "Atrament", "Ink"),
    O("series", "Drugi kolor serii", "Second series colour"),
  ]),
  shapeDef,
  weightDef,
  { ...markersDef, options: [O("on", "W każdym okresie", "Every period"), O("off", "Bez", "None")] },
  barWidthDef,
  referenceDef(false),
  { ...barLabelsDef, options: [O("none", "Brak", "None"), O("last", "Ostatnia", "Last"), O("all", "Wszystkie", "All")] },
  D("lineLabel", "labels", "Wartość linii", "Line value", [O("end", "Na końcu linii", "At the line end"), O("none", "Brak", "None")]),
  decimalsDef,
  gridDef,
  legendDef,
  titleDef,
];

export const SETTINGS: Record<WardrobeType, SettingDef[]> = {
  line: LINE_SETTINGS,
  column: COLUMN_SETTINGS,
  bar: BAR_SETTINGS,
  area: AREA_SETTINGS,
  combo: COMBO_SETTINGS,
};

/** The neutral preset of a type: the first option of every setting, with a few deliberate defaults. */
function baseOf(type: WardrobeType): Settings {
  const b: Settings = Object.fromEntries(SETTINGS[type].map((d) => [d.key, d.options[0]!.value]));
  if (type === "line") Object.assign(b, { names: "end", weight: "normal", panelAxis: "shared" });
  if (type === "area") Object.assign(b, { names: "end" });
  if (type === "column") Object.assign(b, { barLabels: "auto" });
  return b;
}

// ---------- looks

export type Glyph =
  | {
      k: "lines";
      n?: number;
      hero?: boolean;
      ctx?: boolean;
      band?: boolean;
      fill?: boolean;
      step?: boolean;
      smooth?: boolean;
      trend?: boolean;
      markers?: boolean;
      labels?: boolean;
      index?: boolean;
      extremes?: boolean;
    }
  | { k: "panels"; ctx?: boolean }
  | { k: "seasonal" }
  | {
      k: "cols";
      stack?: "clustered" | "stacked" | "percent";
      series?: number;
      hero?: "last" | "pl";
      labels?: boolean;
      ibcs?: boolean;
      variance?: boolean;
      sorted?: boolean;
      other?: boolean;
    }
  | {
      k: "bars";
      stack?: "clustered" | "stacked" | "percent";
      series?: number;
      hero?: boolean;
      benchmark?: boolean;
      diverging?: boolean;
      ibcs?: boolean;
      variance?: boolean;
      other?: boolean;
    }
  | { k: "bridge" }
  | {
      k: "area";
      stack?: "overlap" | "stacked" | "percent";
      hero?: boolean;
      surplus?: boolean;
      band?: boolean;
      strong?: boolean;
      smooth?: boolean;
      index?: boolean;
    }
  | { k: "combo"; ctx?: boolean; labels?: boolean; smooth?: boolean }
  | { k: "blank" };

export type Look = {
  /** "type.look", stable: URLs (`v=`), saved views. */
  id: string;
  type: WardrobeType;
  pl: string;
  en: string;
  /** The occasion, in one line. */
  notePl: string;
  noteEn: string;
  settings: Settings;
  style: "standard" | "business" | "scientific" | "editorial";
  glyph: Glyph;
  /** Shown, but not available with the current data. */
  lockedPl?: string;
  lockedEn?: string;
  /** Only for levels (amounts, counts), not for rates and shares. */
  forLevelsOnly?: boolean;
  /** The business question the look answers (questions.ts); `qCats` when the axis holds categories, not time. */
  q: QuestionId;
  qCats?: QuestionId;
  /**
   * A purely visual variant of the named look of the same type (smooth, step, labels). Not on the look bar: its
   * settings live in "Dostosuj"; a link that names it opens the base look with those settings changed.
   */
  visual?: string;
};

type LookIn = Omit<Look, "id" | "type" | "settings"> & { key: string; s: Settings };
const looksOfType = (type: WardrobeType, ls: LookIn[]): Look[] =>
  ls.map(({ key, s, ...l }) => ({ ...l, id: `${type}.${key}`, type, settings: { ...baseOf(type), ...s } }));

export const LINE_LOOKS: Look[] = looksOfType("line", [
  {
    key: "blank",
    q: "own",
    pl: "Pusty",
    en: "Blank",
    notePl: "Same linie i legenda: zacznij od zera i dodaj, co potrzebne.",
    noteEn: "Just the lines and a legend: start from scratch.",
    style: "standard",
    glyph: { k: "blank" },
    s: { names: "legend" },
  },
  {
    key: "multi",
    q: "time",
    pl: "Czysty",
    en: "Clean",
    notePl: "Każda seria w swoim kolorze, nazwy na końcach linii.",
    noteEn: "Every series in its colour, names at the line ends.",
    style: "standard",
    glyph: { k: "lines", n: 3, labels: true },
    s: {},
  },
  {
    key: "highlight",
    q: "compare",
    pl: "Bohater i tło",
    en: "Hero and context",
    notePl: "Polska wyróżniona, reszta szara jako tło; tylko bohater podpisany.",
    noteEn: "Poland stands out, the rest is grey context; only the hero is named.",
    style: "editorial",
    glyph: { k: "lines", n: 4, hero: true, ctx: true },
    s: { emphasis: "hero" },
  },
  {
    key: "extremes",
    q: "outlier",
    pl: "Najwyższa i najniższa",
    en: "Highest and lowest",
    notePl: "Dwie skrajne serie w kolorze, pasmo pokazuje rozpiętość pozostałych.",
    noteEn: "The two extremes in colour, a band shows the spread of the rest.",
    style: "editorial",
    glyph: { k: "lines", n: 2, extremes: true, band: true },
    s: { emphasis: "extremes", band: "minmax" },
  },
  {
    key: "panels",
    q: "compare",
    pl: "Panele",
    en: "Small multiples",
    notePl: "Każda seria w osobnym panelu na wspólnej skali: łatwe porównanie kształtów.",
    noteEn: "Every series in its own panel on a shared scale: shapes are easy to compare.",
    style: "standard",
    glyph: { k: "panels" },
    s: { series: "panels" },
  },
  {
    key: "panelsContext",
    q: "compare",
    pl: "Panele z tłem",
    en: "Panels with context",
    notePl: "W każdym panelu jedna seria na tle pozostałych (styl FT).",
    noteEn: "One series per panel against the others in grey (FT style).",
    style: "editorial",
    glyph: { k: "panels", ctx: true },
    s: { series: "panels", panelContext: "on" },
  },
  {
    key: "seasonal",
    q: "season",
    pl: "Sezonowość",
    en: "Seasonality",
    notePl: "Miesiące na osi, każdy rok osobną linią; ostatni rok wyróżniony na tle rozpiętości poprzednich.",
    noteEn: "Months on the axis, every year as a line; the latest year against the range of the previous ones.",
    style: "standard",
    glyph: { k: "seasonal" },
    s: { series: "seasonal", emphasis: "hero", band: "minmax", names: "end" },
  },
  {
    key: "reference",
    q: "target",
    pl: "Wobec średniej",
    en: "Against the average",
    notePl: "Bohater na tle średniej okresu, pole pod linią.",
    noteEn: "The hero against the period average, area under the line.",
    style: "standard",
    glyph: { k: "lines", n: 1, hero: true, fill: true, trend: false },
    s: { emphasis: "hero", reference: "avg", fill: "hero" },
  },
  {
    key: "trend",
    q: "time",
    pl: "Z trendem",
    en: "With trend",
    notePl: "Linia trendu i adnotacje szczytu i dołka.",
    noteEn: "A trend line with the peak and trough annotated.",
    style: "scientific",
    glyph: { k: "lines", n: 1, hero: true, trend: true, markers: true },
    s: { emphasis: "hero", trend: "on", annotate: "both" },
  },
  {
    key: "labelled",
    q: "time",
    visual: "multi",
    pl: "Z etykietami",
    en: "Labelled",
    notePl: "Bez siatki, gruba linia, wartości szczytu, dołka i ostatniego okresu.",
    noteEn: "No grid, a thick line, peak, trough and latest values on the line.",
    style: "editorial",
    glyph: { k: "lines", n: 1, hero: true, labels: true },
    s: { emphasis: "hero", values: "minmax", grid: "off", weight: "thick" },
  },
  {
    key: "indexed",
    q: "change",
    pl: "Indeks = 100",
    en: "Indexed = 100",
    notePl: "Wszystkie serie od 100 w pierwszym okresie: porównanie tempa, nie poziomu.",
    noteEn: "Every series from 100 in the first period: compares pace, not level.",
    style: "editorial",
    glyph: { k: "lines", n: 3, index: true },
    s: { scale: "index" },
    forLevelsOnly: true,
  },
  {
    key: "smooth",
    q: "time",
    visual: "multi",
    pl: "Miękki",
    en: "Soft",
    notePl: "Wygładzone linie i pole pod wyróżnioną: do prezentacji, nie do odczytu wartości.",
    noteEn: "Smoothed lines and an area under the hero: for presenting, not reading values.",
    style: "editorial",
    glyph: { k: "lines", n: 2, hero: true, smooth: true, fill: true },
    s: { shape: "smooth", emphasis: "hero", fill: "hero", grid: "off" },
  },
  {
    key: "step",
    q: "time",
    visual: "multi",
    pl: "Schodkowy",
    en: "Steps",
    notePl: "Wartość obowiązuje do następnej zmiany, np. stopy procentowe.",
    noteEn: "A value holds until the next change, e.g. interest rates.",
    style: "standard",
    glyph: { k: "lines", n: 1, step: true, markers: true },
    s: { shape: "step", markers: "on" },
  },
  {
    key: "band",
    q: "soon",
    pl: "Z przedziałem ufności",
    en: "With confidence band",
    notePl: "Wynik badania z niepewnością (BAEL, EU-SILC).",
    noteEn: "A survey result with its uncertainty (LFS, EU-SILC).",
    style: "scientific",
    glyph: { k: "lines", n: 1, hero: true, band: true },
    s: { emphasis: "hero", uncertainty: "band" },
    lockedPl: "Ta miara nie ma przedziałów ufności.",
    lockedEn: "This measure has no confidence intervals.",
  },
  {
    key: "forecast",
    q: "soon",
    pl: "Z prognozą",
    en: "With forecast",
    notePl: "Dane i prognoza w jednej linii, prognoza przerywana.",
    noteEn: "Data and forecast in one line, the forecast dashed.",
    style: "standard",
    glyph: { k: "lines", n: 1, hero: true, step: false },
    s: { emphasis: "hero", forecast: "on" },
    lockedPl: "Ta miara nie ma prognozy.",
    lockedEn: "This measure has no forecast.",
  },
]);

export const COLUMN_LOOKS: Look[] = looksOfType("column", [
  {
    key: "blank",
    q: "own",
    pl: "Pusty",
    en: "Blank",
    notePl: "Same kolumny i legenda: punkt wyjścia do własnych ustawień.",
    noteEn: "Just the columns and a legend: a starting point.",
    style: "standard",
    glyph: { k: "blank" },
    s: { barLabels: "none" },
  },
  {
    key: "simple",
    q: "time",
    qCats: "level",
    pl: "Czysty",
    en: "Clean",
    notePl: "Kolumny w okresach lub kategoriach, serie obok siebie, ostatnia wartość podpisana.",
    noteEn: "Columns per period or category, series side by side, the last value labelled.",
    style: "standard",
    glyph: { k: "cols" },
    s: {},
  },
  {
    key: "latest",
    q: "time",
    pl: "Ostatni okres",
    en: "Latest period",
    notePl: "Ostatnia kolumna w kolorze, wcześniejsze szare: gdzie jesteśmy dziś.",
    noteEn: "The latest column in colour, the earlier ones grey: where we are today.",
    style: "editorial",
    glyph: { k: "cols", hero: "last" },
    s: { emphasis: "hero" },
  },
  {
    key: "labelled",
    q: "time",
    qCats: "level",
    visual: "simple",
    pl: "Z etykietami",
    en: "Labelled",
    notePl: "Wartość nad każdą kolumną, bez siatki: do raportu i slajdu.",
    noteEn: "A value above every column, no grid: for reports and slides.",
    style: "editorial",
    glyph: { k: "cols", labels: true },
    s: { barLabels: "all", grid: "off" },
  },
  {
    key: "ranked",
    q: "rank",
    pl: "Ranking",
    en: "Ranked",
    notePl: "Kategorie od największej, Polska wyróżniona, średnia jako linia odniesienia.",
    noteEn: "Categories from the largest, Poland emphasised, the average as a reference line.",
    style: "standard",
    glyph: { k: "cols", sorted: true, hero: "pl" },
    s: { sort: "desc", emphasis: "hero", reference: "avg" },
  },
  {
    key: "top",
    q: "rank",
    pl: "Top 5 i pozostałe",
    en: "Top 5 and the rest",
    notePl: "Pięć największych kategorii, reszta zebrana w „Pozostałe”.",
    noteEn: "The five largest categories, the rest folded into “Other”.",
    style: "standard",
    glyph: { k: "cols", sorted: true, other: true },
    s: { sort: "desc", top: "5" },
  },
  {
    key: "clustered",
    q: "compare",
    pl: "Grupowane",
    en: "Clustered",
    notePl: "Dwie–trzy serie obok siebie w każdej kategorii, każda w swoim kolorze.",
    noteEn: "Two or three series side by side per category, each in its colour.",
    style: "standard",
    glyph: { k: "cols", stack: "clustered", series: 2 },
    s: { stack: "clustered", barLabels: "none" },
  },
  {
    key: "stacked",
    q: "structure",
    pl: "Skumulowane",
    en: "Stacked",
    notePl: "Części sumują się do całości, suma nad słupkiem.",
    noteEn: "Parts add up to a whole, the total above the bar.",
    style: "standard",
    glyph: { k: "cols", stack: "stacked", series: 3 },
    s: { stack: "stacked" },
  },
  {
    key: "percent",
    q: "structure",
    pl: "Struktura 100%",
    en: "100% stacked",
    notePl: "Udziały części w każdym okresie lub kategorii.",
    noteEn: "Shares of the parts per period or category.",
    style: "standard",
    glyph: { k: "cols", stack: "percent", series: 3 },
    s: { stack: "percent", barLabels: "all" },
  },
  {
    key: "panels",
    q: "compare",
    pl: "Panele",
    en: "Small multiples",
    notePl: "Każda seria w osobnym panelu na wspólnej skali.",
    noteEn: "Every series in its own panel on a shared scale.",
    style: "standard",
    glyph: { k: "panels" },
    s: { series: "panels" },
  },
  {
    key: "ibcs",
    q: "py",
    pl: "Biznesowy: AC i PY",
    en: "Business: AC vs PY",
    notePl: "Notacja IBCS: wykonanie w kolorze serii, rok wcześniej szary, odchylenia ΔPY i ΔPY% nad kolumnami.",
    noteEn: "IBCS notation: actual in the series colour, the previous year grey, ΔPY and ΔPY% above the columns.",
    style: "business",
    glyph: { k: "cols", ibcs: true },
    s: { compare: "ibcs" },
  },
  {
    key: "variance",
    q: "py",
    pl: "Biznesowy: odchylenia",
    en: "Business: variances",
    notePl: "Odchylenie od roku poprzedniego narysowane na kolumnie, ΔPY% pod spodem (styl Zebra BI).",
    noteEn: "The variance against the previous year drawn on the column, ΔPY% below (Zebra BI style).",
    style: "business",
    glyph: { k: "cols", variance: true },
    s: { compare: "variance" },
  },
]);

export const BAR_LOOKS: Look[] = looksOfType("bar", [
  {
    key: "blank",
    q: "own",
    pl: "Pusty",
    en: "Blank",
    notePl: "Same słupki w kolejności danych: punkt wyjścia.",
    noteEn: "Just the bars in data order: a starting point.",
    style: "standard",
    glyph: { k: "blank" },
    s: { sort: "data", barLabels: "none" },
  },
  {
    key: "ranked",
    q: "rank",
    pl: "Ranking",
    en: "Ranked",
    notePl: "Od największej do najmniejszej, Polska wyróżniona, wartości przy słupkach.",
    noteEn: "Largest to smallest, Poland emphasised, values beside the bars.",
    style: "standard",
    glyph: { k: "bars", hero: true },
    s: { sort: "desc", emphasis: "hero" },
  },
  {
    key: "benchmark",
    q: "target",
    pl: "Wobec UE-27",
    en: "Against EU-27",
    notePl: "Ranking z Polską w kolorze i średnią UE jako szarym punktem odniesienia.",
    noteEn: "A ranking with Poland in colour and the EU average as a grey benchmark.",
    style: "standard",
    glyph: { k: "bars", hero: true, benchmark: true },
    s: { sort: "desc", emphasis: "hero", benchmark: "eu" },
  },
  {
    key: "top",
    q: "rank",
    pl: "Top 5 i pozostałe",
    en: "Top 5 and the rest",
    notePl: "Pięć największych, reszta zebrana w „Pozostałe” na końcu.",
    noteEn: "The five largest, the rest folded into “Other” at the end.",
    style: "standard",
    glyph: { k: "bars", other: true },
    s: { sort: "desc", top: "5" },
  },
  {
    key: "diverging",
    q: "change",
    pl: "Wokół zera",
    en: "Around zero",
    notePl: "Dodatnie w prawo, ujemne w lewo: salda i zmiany.",
    noteEn: "Positive to the right, negative to the left: balances and changes.",
    style: "standard",
    glyph: { k: "bars", diverging: true },
    s: { diverging: "on", sort: "desc" },
  },
  {
    key: "clustered",
    q: "compare",
    pl: "Grupowane",
    en: "Clustered",
    notePl: "Dwie–trzy serie na kategorię, długie nazwy po lewej.",
    noteEn: "Two or three series per category, long names on the left.",
    style: "standard",
    glyph: { k: "bars", stack: "clustered", series: 2 },
    s: { stack: "clustered", sort: "data" },
  },
  {
    key: "stacked",
    q: "structure",
    pl: "Skumulowane",
    en: "Stacked",
    notePl: "Części całości w każdej kategorii, suma na końcu słupka.",
    noteEn: "Parts of a whole per category, the total at the end of the bar.",
    style: "standard",
    glyph: { k: "bars", stack: "stacked", series: 3 },
    s: { stack: "stacked", sort: "data" },
  },
  {
    key: "percent",
    q: "structure",
    pl: "Struktura 100%",
    en: "100% stacked",
    notePl: "Udziały części w każdej kategorii, np. wykształcenie w województwach.",
    noteEn: "Shares per category, e.g. education by voivodeship.",
    style: "standard",
    glyph: { k: "bars", stack: "percent", series: 3 },
    s: { stack: "percent", sort: "data" },
  },
  {
    key: "panels",
    q: "compare",
    pl: "Panele",
    en: "Small multiples",
    notePl: "Każda seria w osobnym panelu na wspólnej skali.",
    noteEn: "Every series in its own panel on a shared scale.",
    style: "standard",
    glyph: { k: "panels" },
    s: { series: "panels", sort: "desc" },
  },
  {
    key: "ibcs",
    q: "py",
    pl: "Biznesowy: AC i PY",
    en: "Business: AC vs PY",
    notePl: "Struktura wobec roku poprzedniego: AC w kolorze, PY szary, ΔPY i ΔPY% obok.",
    noteEn: "Structure against the previous year: AC in colour, PY grey, ΔPY and ΔPY% beside.",
    style: "business",
    glyph: { k: "bars", ibcs: true },
    s: { compare: "ibcs" },
  },
  {
    key: "variance",
    q: "py",
    pl: "Biznesowy: odchylenia",
    en: "Business: variances",
    notePl: "Odchylenie od roku poprzedniego na słupku, procentowe obok.",
    noteEn: "The variance on the bar, the percentage beside.",
    style: "business",
    glyph: { k: "bars", variance: true },
    s: { compare: "variance" },
  },
  {
    key: "bridge",
    q: "change",
    pl: "Most PY → AC",
    en: "Bridge PY → AC",
    notePl: "Od roku poprzedniego do wykonania przez czynniki zmiany (podział).",
    noteEn: "From the previous year to the actual through the drivers of change (a breakdown).",
    style: "business",
    glyph: { k: "bridge" },
    s: { compare: "bridge" },
  },
]);

export const AREA_LOOKS: Look[] = looksOfType("area", [
  {
    key: "blank",
    q: "own",
    pl: "Pusty",
    en: "Blank",
    notePl: "Same pola i legenda: punkt wyjścia.",
    noteEn: "Just the areas and a legend: a starting point.",
    style: "standard",
    glyph: { k: "blank" },
    s: { names: "legend" },
  },
  {
    key: "simple",
    q: "time",
    pl: "Czysty",
    en: "Clean",
    notePl: "Wielkość w czasie, lekkie wypełnienie, nazwy na końcach.",
    noteEn: "A volume over time, light fill, names at the ends.",
    style: "standard",
    glyph: { k: "area" },
    s: {},
  },
  {
    key: "highlight",
    q: "compare",
    pl: "Bohater i tło",
    en: "Hero and context",
    notePl: "Polska wypełniona, pozostałe serie szare liniami.",
    noteEn: "Poland filled, the other series as grey lines.",
    style: "editorial",
    glyph: { k: "area", hero: true, strong: true },
    s: { emphasis: "hero", areaFill: "strong" },
  },
  {
    key: "stacked",
    q: "structure",
    pl: "Skumulowany",
    en: "Stacked",
    notePl: "Części całości w czasie, wartości bezwzględne.",
    noteEn: "Parts of a whole over time, absolute values.",
    style: "standard",
    glyph: { k: "area", stack: "stacked" },
    s: { stack: "stacked" },
  },
  {
    key: "percent",
    q: "structure",
    pl: "Struktura 100%",
    en: "100% share",
    notePl: "Zmiana struktury w czasie, np. miks energetyczny.",
    noteEn: "Structure over time, e.g. the energy mix.",
    style: "standard",
    glyph: { k: "area", stack: "percent" },
    s: { stack: "percent" },
  },
  {
    key: "surplus",
    q: "target",
    pl: "Nadwyżka i deficyt",
    en: "Surplus and deficit",
    notePl: "Saldo nad i pod zerem w dwóch kolorach, np. bilans handlowy.",
    noteEn: "A balance above and below zero in two colours, e.g. the trade balance.",
    style: "standard",
    glyph: { k: "area", surplus: true },
    s: { surplus: "on", reference: "zero" },
  },
  {
    key: "range",
    q: "compare",
    pl: "Pasmo pozostałych",
    en: "Range band",
    notePl: "Polska jako linia, rozpiętość pozostałych obszarów jako pasmo.",
    noteEn: "Poland as a line, the spread of the other areas as a band.",
    style: "scientific",
    glyph: { k: "area", band: true, hero: true },
    s: { emphasis: "hero", band: "minmax" },
  },
  {
    key: "panels",
    q: "compare",
    pl: "Panele",
    en: "Small multiples",
    notePl: "Każda seria w osobnym panelu na wspólnej skali.",
    noteEn: "Every series in its own panel on a shared scale.",
    style: "standard",
    glyph: { k: "panels" },
    s: { series: "panels" },
  },
  {
    key: "indexed",
    q: "change",
    pl: "Indeks = 100",
    en: "Indexed = 100",
    notePl: "Pola od wspólnego startu: tempo, nie poziom.",
    noteEn: "Areas from a common start: pace, not level.",
    style: "editorial",
    glyph: { k: "area", index: true },
    s: { scale: "index" },
    forLevelsOnly: true,
  },
  {
    key: "smooth",
    q: "time",
    visual: "simple",
    pl: "Miękki",
    en: "Soft",
    notePl: "Wygładzone, mocne wypełnienie, bez siatki: do prezentacji.",
    noteEn: "Smoothed, strong fill, no grid: for presenting.",
    style: "editorial",
    glyph: { k: "area", smooth: true, strong: true, hero: true },
    s: { shape: "smooth", areaFill: "strong", grid: "off", emphasis: "hero" },
  },
]);

export const COMBO_LOOKS: Look[] = looksOfType("combo", [
  {
    key: "blank",
    q: "own",
    pl: "Pusty",
    en: "Blank",
    notePl: "Kolumny i linia bez etykiet: punkt wyjścia.",
    noteEn: "Columns and a line without labels: a starting point.",
    style: "standard",
    glyph: { k: "blank" },
    s: { barLabels: "none", lineLabel: "none", markers: "off" },
  },
  {
    key: "column-line",
    q: "pair",
    pl: "Kolumny i linia",
    en: "Columns and line",
    notePl: "Pierwsza miara jako kolumny, druga jako linia, jedna oś.",
    noteEn: "The first measure as columns, the second as a line, one axis.",
    style: "standard",
    glyph: { k: "combo" },
    s: {},
  },
  {
    key: "line-lead",
    q: "pair",
    pl: "Linia na tle kolumn",
    en: "Line in the lead",
    notePl: "Kolumny szare jako tło, linia w kolorze z ostatnią wartością.",
    noteEn: "Grey columns as context, the line in colour with its last value.",
    style: "editorial",
    glyph: { k: "combo", ctx: true },
    s: { emphasis: "line", lineColour: "series" },
  },
  {
    key: "labelled",
    q: "pair",
    visual: "column-line",
    pl: "Z etykietami",
    en: "Labelled",
    notePl: "Wartości nad kolumnami, bez siatki: do raportu.",
    noteEn: "Values above the columns, no grid: for reports.",
    style: "editorial",
    glyph: { k: "combo", labels: true },
    s: { barLabels: "all", grid: "off" },
  },
  {
    key: "smooth",
    q: "pair",
    visual: "column-line",
    pl: "Miękki",
    en: "Soft",
    notePl: "Wąskie kolumny i wygładzona linia bez punktów: do prezentacji.",
    noteEn: "Narrow columns and a smoothed line without markers: for presenting.",
    style: "editorial",
    glyph: { k: "combo", smooth: true },
    s: { shape: "smooth", markers: "off", barWidth: "narrow", grid: "off" },
  },
  {
    key: "panels",
    q: "compare",
    pl: "Panele",
    en: "Small multiples",
    notePl: "Jeden wykres na obszar lub kategorię.",
    noteEn: "One chart per area or category.",
    style: "standard",
    glyph: { k: "panels" },
    s: { series: "panels" },
  },
]);

export const LOOKS: Record<WardrobeType, Look[]> = {
  line: LINE_LOOKS,
  column: COLUMN_LOOKS,
  bar: BAR_LOOKS,
  area: AREA_LOOKS,
  combo: COMBO_LOOKS,
};
const DEFAULT_LOOK: Record<WardrobeType, string> = {
  line: "line.multi",
  column: "column.simple",
  bar: "bar.ranked",
  area: "area.simple",
  combo: "combo.column-line",
};
export const TYPE_NAME: Record<WardrobeType, { pl: string; en: string }> = {
  line: { pl: "Liniowy", en: "Line" },
  column: { pl: "Kolumnowy", en: "Column" },
  bar: { pl: "Słupkowy", en: "Bar" },
  area: { pl: "Warstwowy", en: "Area" },
  combo: { pl: "Złożony", en: "Combo" },
};

/** Looks of a chart kind (undefined for kinds without a wardrobe). */
export function looksOf(chart: ChartKind): Look[] | undefined {
  const t = wardrobeOf(chart);
  return t ? LOOKS[t] : undefined;
}

/** The look in effect for a kind: the chosen id when it is one of the kind's looks, else the type's default. */
export function currentLook(chart: ChartKind, id: string | null | undefined): Look | undefined {
  const t = wardrobeOf(chart);
  if (!t) return undefined;
  const ls = LOOKS[t];
  return ls.find((l) => l.id === id) ?? ls.find((l) => l.id === DEFAULT_LOOK[t]);
}

export function isDefaultLook(look: Look): boolean {
  return DEFAULT_LOOK[look.type] === look.id;
}

// ---------- looks by business question (docs/product-principles.md)

/** The question a look answers with the current axis: `qCats` when the axis holds categories instead of time. */
export function lookQuestion(l: Look, timeX: boolean): QuestionId {
  return !timeX && l.qCats ? l.qCats : l.q;
}

/** The looks offered on the look bar and in the picker: no purely visual variants, grouped and ordered by question. */
export function stripLooks(type: WardrobeType, timeX = true): Look[] {
  const order = QUESTION_ORDER[type];
  const rank = (l: Look) => {
    const i = order.indexOf(lookQuestion(l, timeX));
    return i < 0 ? order.length : i;
  };
  return LOOKS[type]
    .filter((l) => !l.visual)
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map((x) => x.l);
}

/** The strip in groups: one per question, in the type's order. */
export function lookGroups(type: WardrobeType, timeX = true): { q: QuestionId; looks: Look[] }[] {
  const out: { q: QuestionId; looks: Look[] }[] = [];
  for (const l of stripLooks(type, timeX)) {
    const q = lookQuestion(l, timeX);
    const last = out[out.length - 1];
    if (last && last.q === q) last.looks.push(l);
    else out.push({ q, looks: [l] });
  }
  return out;
}

/** The purely visual variants of a type, now presets inside "Dostosuj". */
export function visualVariants(type: WardrobeType): Look[] {
  return LOOKS[type].filter((l) => l.visual);
}

/** What a visual variant changes on its base look: the settings that differ, as `o.` overrides. */
export function visualOverrides(l: Look): { base: Look; o: Record<string, string> } | null {
  if (!l.visual) return null;
  const base = LOOKS[l.type].find((b) => b.id === `${l.type}.${l.visual}`);
  if (!base) return null;
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(l.settings)) if (base.settings[k] !== v && !LAYOUT_KEYS.includes(k)) o[k] = v;
  return { base, o };
}

/** A link or a saved view that names a visual variant opens its base look with the variant's settings changed. */
export function foldVisualLook(
  chart: ChartKind,
  v: string | null | undefined,
  o: Record<string, string>,
): { v: string; o: Record<string, string> } | null {
  const t = wardrobeOf(chart);
  const l = t && v ? LOOKS[t].find((x) => x.id === v) : undefined;
  const f = l ? visualOverrides(l) : null;
  return f ? { v: f.base.id, o: { ...f.o, ...o } } : null;
}

// ---------- context and layouts

/** Dimension layout read from the wells. */
export function layoutOf(slots: Partial<Record<string, string | null>>): LookCtx["layout"] {
  if (slots.x === "t.moy" || slots.x === "t.qoy") return "seasonal";
  if (slots.sm) return "panels";
  if (slots.legend) return "legend";
  return "one";
}

/** What the data allows, from the query and its shape (no data needed). */
export function lookContext(q: Query, shape: Shape, look?: Look, o: Record<string, string> = {}): LookCtx {
  const type = wardrobeOf(q.chart);
  const layout = layoutOf(q.slots);
  const dim = q.slots.legend && q.slots.legend !== "t" ? q.slots.legend : q.slots.sm;
  const xD = q.slots.x;
  const xMembers = xD ? (shape.members[xD] ?? []) : [];
  const serMembers = dim ? (shape.members[dim] ?? []) : [];
  const around = type === "bar" ? xMembers : serMembers;
  const hasGeoX = xD === "geo";
  const ctx: LookCtx = {
    rates: shape.kpis.some((k) => /^(pct|pp|rate|per_)/.test(k.unit_key)),
    additive: additive(shape),
    // The native grain of the measures (a seasonal layout reads years, but the data are monthly or quarterly).
    grain: shape.kpis.length ? FREQ_GRAIN[coarsest(shape.kpis.map((k) => k.frequency))] : shape.grain,
    timeX: xD === "t",
    seriesCount: layout === "seasonal" ? shape.periods.length : serMembers.length,
    years: shape.span[1] - shape.span[0] + 1,
    hasPL: around.includes("PL") || (hasGeoX && xMembers.includes("PL")),
    hasEU: around.includes("EU27") || (hasGeoX && xMembers.includes("EU27")),
    layout,
  };
  if (look && (type === "column" || type === "bar")) {
    const cmp = o.compare ?? look.settings.compare ?? "none";
    ctx.business = cmp !== "none" && !defOf(type, "compare")?.lock?.(cmp, ctx, {});
  }
  return ctx;
}

function defOf(type: WardrobeType, key: string): SettingDef | undefined {
  return SETTINGS[type].find((d) => d.key === key);
}

/**
 * Wells for a dimension layout; undefined when the data cannot be laid out that way. Series dimension = the one in the
 * legend or the panels; "seasonal" puts the month (or quarter) of the year on the axis and the years in the legend.
 */
export function layoutSlots(q: Query, layout: string, ctx: Pick<LookCtx, "grain">): Partial<Query["slots"]> | undefined {
  const type = wardrobeOf(q.chart);
  const s = q.slots;
  const d = s.legend && s.legend !== "t" ? s.legend : (s.sm ?? null);
  if (type === "combo") {
    if (layout === "one") return { ...s, sm: null };
    const cand = s.sm ?? (q.geo.length > 1 ? "geo" : null);
    return layout === "panels" && cand ? { ...s, sm: cand } : undefined;
  }
  const xBack = s.x === "t.moy" || s.x === "t.qoy" ? "t" : s.x;
  if (layout === "one" || layout === "legend") return { ...s, x: xBack, legend: d, sm: null };
  if (layout === "panels") return d ? { ...s, x: xBack, legend: null, sm: d } : undefined;
  if (layout === "seasonal" && type === "line")
    return ctx.grain === "y" ? undefined : { ...s, x: ctx.grain === "m" ? "t.moy" : "t.qoy", legend: "t", sm: d };
  return undefined;
}

/** The value of the layout setting that the wells realise. */
export function seriesValue(type: WardrobeType, layout: LookCtx["layout"]): string {
  if (layout === "seasonal") return "seasonal";
  if (layout === "panels") return "panels";
  return type === "line" || type === "combo" ? "one" : "legend";
}

/** Why an option cannot be chosen now (empty = it can). */
export function optionLock(def: SettingDef, value: string, ctx: LookCtx, s: Settings, lang: "pl" | "en"): string {
  const r = def.lock?.(value, ctx, s);
  return r ? (lang === "pl" ? r.pl : r.en) : "";
}

/** Settings in effect: the look's preset with the reader's changes on top, locked values falling back. */
export function effectiveSettings(
  look: Look,
  o: Record<string, string>,
  slotsOrCtx?: Partial<Record<string, string | null>> | LookCtx,
): Settings {
  const type = look.type;
  const out = { ...look.settings };
  const ctx: LookCtx | undefined = slotsOrCtx && "rates" in slotsOrCtx ? (slotsOrCtx as LookCtx) : undefined;
  const slots = slotsOrCtx && !ctx ? (slotsOrCtx as Partial<Record<string, string | null>>) : undefined;
  for (const def of SETTINGS[type]) {
    const v = o[def.key];
    if (v && !def.lockedPl && !LAYOUT_KEYS.includes(def.key) && def.options.some((x) => x.value === v)) out[def.key] = v;
    if (ctx && def.lock?.(out[def.key]!, ctx, out))
      out[def.key] = def.options.find((x) => !def.lock?.(x.value, ctx, out))?.value ?? def.options[0]!.value;
  }
  if (ctx) out.series = seriesValue(type, ctx.layout);
  else if (slots) out.series = seriesValue(type, layoutOf(slots));
  return out;
}

/** Changes the reader made to the look (empty = the look as prepared). */
export function changedSettings(
  look: Look,
  o: Record<string, string>,
  ctxOrSlots?: Partial<Record<string, string | null>> | LookCtx,
): string[] {
  const eff = effectiveSettings(look, o, ctxOrSlots);
  return SETTINGS[look.type].map((d) => d.key).filter((k) => eff[k] !== look.settings[k] && !(k === "series" && !ctxOrSlots));
}

/** Settings whose `when` holds now (the pane shows these). */
export function visibleSettings(look: Look, s: Settings, ctx: LookCtx): SettingDef[] {
  return SETTINGS[look.type].filter((d) => !d.when || d.when(s, ctx));
}

/** Whether a look can be worn with the current data. */
export function lookUsable(l: Look, q: Query, ctx: LookCtx): boolean {
  if (l.lockedPl) return false;
  if (ctx.rates && l.forLevelsOnly) return false;
  if (l.settings.series && !layoutSlots(q, l.settings.series, ctx)) return false;
  for (const def of SETTINGS[l.type]) {
    const v = l.settings[def.key];
    // A look is unusable when one of its defining (non-default) settings is locked.
    if (v && v !== baseOf(l.type)[def.key] && def.lock?.(v, ctx, l.settings)) return false;
  }
  return true;
}

/** Why a look cannot be worn now (for the strip). */
export function lookLock(l: Look, q: Query, ctx: LookCtx, lang: "pl" | "en"): string {
  const pl = lang === "pl";
  if (l.lockedPl) return pl ? l.lockedPl : l.lockedEn!;
  if (ctx.rates && l.forLevelsOnly) return pl ? NO_INDEX.pl : NO_INDEX.en;
  if (l.settings.series && !layoutSlots(q, l.settings.series, ctx))
    return l.settings.series === "seasonal" ? (pl ? NO_SEASON.pl : NO_SEASON.en) : pl ? NO_SERIES.pl : NO_SERIES.en;
  for (const def of SETTINGS[l.type]) {
    const v = l.settings[def.key];
    const r = v && v !== baseOf(l.type)[def.key] ? def.lock?.(v, ctx, l.settings) : null;
    if (r) return pl ? r.pl : r.en;
  }
  return "";
}

// ---------- the look in effect, business mode (previous-year comparison) and index

export type LookInEffect = {
  look: Look;
  ctx: LookCtx;
  settings: Settings;
  /** The chosen look cannot be worn with these data: why, and the type's default look is worn instead. */
  fallback?: { chosen: Look; why: string };
};

/** Whether the query wears a look: no `v`, or a `v` that is one of the kind's looks (not a library variant drawn from the kind). */
export function wearsLook(q: Pick<Query, "chart" | "v">): boolean {
  const ls = looksOf(q.chart);
  return !!ls && (!q.v || ls.some((l) => l.id === q.v));
}

/** The look worn now: the chosen one, or the type's default when the chosen one is locked for these data. */
export function lookInEffect(q: Query, shape: Shape, lang: "pl" | "en"): LookInEffect | null {
  if (!wearsLook(q)) return null;
  const chosen = currentLook(q.chart, q.v);
  if (!chosen) return null;
  let look = chosen;
  let ctx = lookContext(q, shape, look, q.o);
  let fallback: LookInEffect["fallback"];
  if (!lookUsable(look, q, ctx) && !isDefaultLook(look)) {
    fallback = { chosen, why: lookLock(look, q, ctx, lang) };
    look = currentLook(q.chart, null)!;
    ctx = lookContext(q, shape, look, {});
    return { look, ctx, settings: effectiveSettings(look, {}, ctx), fallback };
  }
  return { look, ctx, settings: effectiveSettings(look, q.o, ctx) };
}

/** The business comparison in effect, if any: the drawn type and whether it runs over time or over categories. */
export function businessOf(q: Query, shape: Shape): { type: ChartType; over: "time" | "cats" } | null {
  const w = lookInEffect(q, shape, "pl");
  if (!w || (w.look.type !== "column" && w.look.type !== "bar")) return null;
  const { look, ctx, settings: s } = w;
  if (!ctx.business) return null;
  const over = ctx.timeX ? "time" : "cats";
  const type: ChartType =
    s.compare === "bridge"
      ? "bridge"
      : look.type === "bar"
        ? s.compare === "ibcs"
          ? "ibcs-bars"
          : "variance-bars"
        : s.compare === "ibcs"
          ? "ibcs-columns"
          : "variance-columns";
  return { type, over };
}

/** Whether the look in effect indexes the values (start = 100); from the query alone, so the index base can follow. */
export function lookIndexes(q: Query, shape?: Shape): boolean {
  if (shape) return lookInEffect(q, shape, "pl")?.settings.scale === "index";
  const look = wearsLook(q) ? currentLook(q.chart, q.v) : undefined;
  if (!look) return false;
  return effectiveSettings(look, q.o ?? {}, q.slots).scale === "index";
}

// ---------- drawing: the look's settings applied to the chart the builder made

const num = (y: number | null | undefined): y is number => typeof y === "number" && Number.isFinite(y);
const lastY = (s: ZSeries) => [...s.points].reverse().find((p) => num(p.y))?.y ?? null;
function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Top N series by their latest value (Poland always kept), the rest folded into "Pozostałe" when they add up. */
function topSeries(all: ZSeries[], top: string, fold: boolean, pl: boolean, keepLast = false): ZSeries[] {
  if (top === "all" || all.length <= Number(top)) return all;
  const n = Number(top);
  const ranked = keepLast ? [...all].reverse() : [...all].sort((a, b) => (lastY(b) ?? -Infinity) - (lastY(a) ?? -Infinity));
  const keep = new Set(ranked.slice(0, n).map((x) => x.id));
  const kept = all.filter((x) => keep.has(x.id) || x.id === "PL");
  const rest = all.filter((x) => !kept.includes(x));
  if (!fold || !rest.length) return kept;
  const xs = [...new Set(rest.flatMap((s) => s.points.map((p) => p.x)))];
  const other: ZSeries = {
    id: "other",
    label: pl ? "Pozostałe" : "Other",
    role: "context",
    points: xs.map((x) => {
      const v = rest.map((s) => s.points.find((p) => p.x === x)?.y).filter(num);
      return { x, y: v.length ? v.reduce((a, b) => a + b, 0) : null };
    }),
  };
  return [...kept, other];
}

/** Top N categories of a single series by value (Poland kept), the rest folded into one "Pozostałe" category. */
function topCategories(z: ZChartProps, top: string, fold: boolean, pl: boolean): ZChartProps {
  const s = z.series[0];
  if (!s || top === "all" || !z.categories || z.categories.length <= Number(top)) return z;
  const n = Number(top);
  const val = (k: string) => s.points.find((p) => p.x === k)?.y ?? null;
  const ranked = [...z.categories].sort((a, b) => (val(b.key) ?? -Infinity) - (val(a.key) ?? -Infinity));
  const keep = new Set(ranked.slice(0, n).map((c) => c.key));
  const kept = z.categories.filter((c) => keep.has(c.key) || c.key === "PL");
  const rest = z.categories.filter((c) => !kept.includes(c));
  const cats: ZCategory[] = [...kept];
  const points = s.points.filter((p) => keep.has(p.x) || p.x === "PL");
  if (fold && rest.length) {
    const v = rest.map((c) => val(c.key)).filter(num);
    cats.push({ key: "other", label: pl ? `Pozostałe (${rest.length})` : `Other (${rest.length})` });
    points.push({ x: "other", y: v.length ? v.reduce((a, b) => a + b, 0) : null });
  }
  return {
    ...z,
    categories: cats,
    series: [{ ...s, points }, ...z.series.slice(1).map((t) => ({ ...t, points: t.points.filter((p) => keep.has(p.x) || p.x === "PL") }))],
  };
}

/** Categories reordered by the first series' value. */
function sortCategories(z: ZChartProps, sort: string): ZChartProps {
  if (sort === "data" || !z.categories || !z.series[0]) return z;
  const s = z.series[0];
  const val = (k: string) => s.points.find((p) => p.x === k)?.y ?? -Infinity;
  const sign = sort === "asc" ? -1 : 1;
  const cats = [...z.categories].sort((a, b) => (a.key === "other" ? 1 : b.key === "other" ? -1 : sign * (val(b.key) - val(a.key))));
  return { ...z, categories: cats };
}

/** A reference line from the setting: zero, the average or median of the hero series, or EU-27's value. */
function referenceOf(z: ZChartProps, s: Settings, hero: ZSeries | undefined, pl: boolean): ZChartProps["reference"] {
  if (s.reference === "none" || !s.reference) return undefined;
  if (s.reference === "zero") return { value: 0, label: "0" };
  if (s.reference === "eu") {
    const cat = z.series[0]?.points.find((p) => p.x === "EU27");
    if (num(cat?.y)) return { value: cat!.y, label: pl ? "UE-27" : "EU-27" };
    const ser = z.series.find((x) => x.id === "EU27");
    const v = ser ? lastY(ser) : null;
    return v === null ? undefined : { value: v, label: pl ? "UE-27" : "EU-27" };
  }
  const vals = (hero ?? z.series[0])?.points.map((p) => p.y).filter(num) ?? [];
  if (!vals.length) return undefined;
  if (s.reference === "avg") return { value: mean(vals)!, label: pl ? "średnia" : "average" };
  return {
    value: quantile(
      [...vals].sort((a, b) => a - b),
      0.5,
    ),
    label: pl ? "mediana" : "median",
  };
}

/** Min–max or interquartile band of the given series per x, as the two bound series. */
function bandOf(base: ZSeries[], kind: "minmax" | "iqr"): [ZSeries, ZSeries] {
  const xs = [...new Set(base.flatMap((x) => x.points.map((p) => p.x)))];
  const q = kind === "iqr" ? [0.25, 0.75] : [0, 1];
  const lo: ZSeries = { id: "lo", label: "lo", points: [] };
  const hi: ZSeries = { id: "hi", label: "hi", points: [] };
  for (const x of xs) {
    const v = base
      .map((ser) => ser.points.find((p) => p.x === x)?.y)
      .filter(num)
      .sort((a, b) => a - b);
    lo.points.push({ x, y: v.length ? quantile(v, q[0]!) : null });
    hi.points.push({ x, y: v.length ? quantile(v, q[1]!) : null });
  }
  return [lo, hi];
}

/** The hero series: Poland when present, the latest year in a seasonal layout, else the first. */
function heroOf(all: ZSeries[], ctx: LookCtx): ZSeries | undefined {
  if (ctx.layout === "seasonal") return all[all.length - 1];
  return all.find((x) => x.id === "PL") ?? all.find((x) => x.role === "hero") ?? all[0];
}

function withDecimals(z: ZChartProps, s: Settings): ZChartProps {
  return s.decimals && s.decimals !== "auto" ? { ...z, unit: { ...z.unit, decimals: Number(s.decimals) } } : z;
}

/** Line chart (or its panels) with the settings; data transforms (index) are applied before, in the view. */
export function applyLineSettings(z: ZChartProps, s: Settings, lang: "pl" | "en", ctx: LookCtx = CTX_FALLBACK): ZChartProps {
  const pl = lang === "pl";
  const panels = z.type === "small-multiples";
  const seasonal = ctx.layout === "seasonal";
  const all = topSeries(z.series, s.top ?? "all", false, pl, seasonal);
  const heroSeries = heroOf(all, ctx);
  const ranked = [...all].filter((x) => lastY(x) !== null).sort((a, b) => lastY(b)! - lastY(a)!);
  const extremes = new Set(ranked.length > 2 ? [ranked[0]!.id, ranked[ranked.length - 1]!.id] : []);
  let series: ZSeries[] = all.map((x) => ({
    ...x,
    role:
      s.emphasis === "hero"
        ? x === heroSeries
          ? "hero"
          : "context"
        : s.emphasis === "extremes" && extremes.size
          ? extremes.has(x.id)
            ? "series"
            : "context"
          : "series",
  }));
  const hero = s.emphasis === "hero" ? heroSeries : undefined;
  // Band from the other series (the previous years in a seasonal layout): full range or the middle 50%.
  let interval: { lower: string; upper: string } | undefined;
  let intervalLabel: string | undefined;
  if (s.band && s.band !== "none" && !panels) {
    const others = all.filter((x) => x !== hero && !(s.emphasis === "extremes" && extremes.has(x.id)));
    const base = others.length >= 2 ? others : all;
    const [lo, hi] = bandOf(base, s.band as "minmax" | "iqr");
    // The band stands for the grey series: with a hero or the extremes in colour, the grey lines are not drawn twice.
    if (others.length >= 2 && s.emphasis !== "none") series = series.filter((x) => x.role !== "context");
    series = [...series, lo, hi];
    interval = { lower: "lo", upper: "hi" };
    intervalLabel =
      s.band === "iqr"
        ? pl
          ? seasonal
            ? "środkowe 50% poprzednich lat"
            : "środkowe 50% pozostałych"
          : seasonal
            ? "middle 50% of the previous years"
            : "middle 50% of the others"
        : pl
          ? seasonal
            ? "rozpiętość poprzednich lat"
            : "rozpiętość pozostałych"
          : seasonal
            ? "range of the previous years"
            : "range of the others";
  }
  const reference = referenceOf(z, s, hero, pl) ?? (s.reference === "none" ? undefined : z.reference);
  // Annotations: peak / trough of the hero (both = value labels on the extremes).
  let annotate = z.annotate;
  const target = hero ?? all[0];
  if (s.annotate === "none") annotate = undefined;
  if ((s.annotate === "max" || s.annotate === "min") && target) {
    const pts = target.points.filter((p) => num(p.y)) as { x: string; y: number }[];
    const p = pts.length ? pts.reduce((a, b) => ((s.annotate === "max" ? b.y > a.y : b.y < a.y) ? b : a)) : undefined;
    annotate = p ? { x: p.x, label: s.annotate === "max" ? (pl ? "szczyt" : "peak") : pl ? "dołek" : "trough" } : undefined;
  }
  const values = s.annotate === "both" && s.values === "none" ? "minmax" : s.values;
  return {
    ...withDecimals(z, s),
    type: panels ? "small-multiples" : "line-highlight",
    series,
    highlight: hero?.id,
    reference: panels ? undefined : reference,
    annotate: panels ? undefined : annotate,
    opts: {
      ...(z.opts ?? {}),
      step: s.shape === "step",
      smooth: s.shape === "smooth",
      weight: s.weight as "thin" | "normal" | "thick",
      markers: s.markers === "on",
      fill: s.fill === "none" ? undefined : (s.fill as "hero" | "all"),
      contextDash: s.context === "dashed",
      endLabels: s.names !== "legend",
      // With a hero (or two extremes) and more than four grey lines, the grey ones go unlabelled at the ends.
      contextLabels: !((s.emphasis === "hero" || s.emphasis === "extremes") && all.length > 4),
      valueLabels: values === "none" ? undefined : (values as "last" | "minmax" | "all"),
      trendLine: s.trend === "on",
      zeroBase: s.zero === "zero",
      grid: s.grid !== "off",
      interval,
      intervalLabel,
      sharedY: s.panelAxis !== "own",
      panelContext: s.panelContext === "on",
    },
  };
}

const CTX_FALLBACK: LookCtx = {
  rates: false,
  additive: true,
  grain: "y",
  timeX: true,
  seriesCount: 0,
  years: 10,
  hasPL: false,
  hasEU: false,
  layout: "legend",
};

/** Column chart from the builder's columns / grouped-bars (or a business chart, which keeps its notation). */
export function applyColumnSettings(z: ZChartProps, s: Settings, lang: "pl" | "en", ctx: LookCtx): ZChartProps {
  const pl = lang === "pl";
  if (z.type === "ibcs-columns" || z.type === "variance-columns" || z.type === "small-multiples") return withDecimals(z, s);
  let out: ZChartProps = { ...withDecimals(z, s) };
  const multi = z.series.length > 1;
  if (multi) {
    const series = topSeries(z.series, s.top ?? "all", ctx.additive, pl);
    const hero = s.emphasis === "hero" ? heroOf(series, ctx) : undefined;
    out.series = series.map((x) => ({ ...x, role: x.id === "other" ? "context" : hero ? (x === hero ? "hero" : "context") : "series" }));
    if (!ctx.timeX) out = sortCategories(out, s.sort ?? "data");
    const stacked = s.stack === "stacked" || s.stack === "percent";
    out.type = stacked ? "stacked-columns" : "grouped-bars";
    out.opts = { ...(out.opts ?? {}), percent: s.stack === "percent", totals: s.totals !== "off" };
    if (s.stack === "percent")
      out.unit = { symbol: "%", isRate: true, decimals: s.decimals && s.decimals !== "auto" ? Number(s.decimals) : 0 };
  } else {
    if (!ctx.timeX) {
      out = topCategories(out, s.top ?? "all", ctx.additive, pl);
      out = sortCategories(out, s.sort ?? "data");
    }
    out.type = "columns";
    if (s.emphasis === "hero") {
      const keys = out.series[0]?.points.map((p) => p.x) ?? [];
      out.highlight = ctx.timeX ? "last" : keys.includes("PL") ? "PL" : keys[0];
    } else out.highlight = undefined;
  }
  const refHero = out.series.find((x) => x.role === "hero") ?? out.series[0];
  out.reference = referenceOf(out, s, refHero, pl);
  out.opts = {
    ...(out.opts ?? {}),
    // "auto": the last period (or the emphasised bar); with several series every series gets its last value.
    barLabels: s.barLabels === "auto" ? (multi ? "last" : undefined) : (s.barLabels as "all" | "none"),
    contextBars: s.emphasis === "hero" && !multi,
    barWidth: s.barWidth as "normal" | "narrow",
    grid: s.grid !== "off",
  };
  return out;
}

/** Bar chart from the builder's ranked-bars (one series per legend member) or a business chart. */
export function applyBarSettings(z: ZChartProps, s: Settings, lang: "pl" | "en", ctx: LookCtx): ZChartProps {
  const pl = lang === "pl";
  if (z.type === "ibcs-bars" || z.type === "variance-bars" || z.type === "bridge" || z.type === "small-multiples")
    return withDecimals(z, s);
  let out: ZChartProps = { ...withDecimals(z, s) };
  const multi = z.series.length > 1;
  if (multi) {
    const series = topSeries(z.series, s.top ?? "all", ctx.additive, pl);
    const hero = s.emphasis === "hero" ? heroOf(series, ctx) : undefined;
    out.series = series.map((x) => ({ ...x, role: x.id === "other" ? "context" : hero ? (x === hero ? "hero" : "context") : "series" }));
    out = sortCategories(out, s.sort ?? "desc");
    const stacked = s.stack === "stacked" || s.stack === "percent";
    out.type = stacked ? "stacked-columns" : "grouped-bars";
    out.opts = { ...(out.opts ?? {}), horizontal: true, percent: s.stack === "percent" };
    if (s.stack === "percent")
      out.unit = { symbol: "%", isRate: true, decimals: s.decimals && s.decimals !== "auto" ? Number(s.decimals) : 0 };
    out.highlight = undefined;
  } else {
    out = topCategories(out, s.top ?? "all", ctx.additive, pl);
    out.type = s.diverging === "on" ? "diverging-bars" : "ranked-bars";
    const keys = out.series[0]?.points.map((p) => p.x) ?? [];
    out.highlight = s.emphasis === "hero" ? (keys.includes("PL") ? "PL" : keys[0]) : undefined;
    out.opts = {
      ...(out.opts ?? {}),
      sort: (s.sort ?? "desc") as "data" | "desc" | "asc",
      benchmark: s.benchmark === "eu" && keys.includes("EU27") ? "EU27" : undefined,
    };
  }
  out.reference = referenceOf(out, s, out.series[0], pl);
  out.opts = { ...(out.opts ?? {}), barLabels: s.barLabels === "auto" ? undefined : (s.barLabels as "all" | "none") };
  return out;
}

/** Area chart from the builder's area (one series per legend member). */
export function applyAreaSettings(z: ZChartProps, s: Settings, lang: "pl" | "en", ctx: LookCtx): ZChartProps {
  const pl = lang === "pl";
  if (z.type === "small-multiples") return withDecimals(z, s);
  const out: ZChartProps = { ...withDecimals(z, s) };
  const all = topSeries(z.series, s.top ?? "all", ctx.additive && s.stack !== "overlap", pl);
  const hero = s.emphasis === "hero" ? heroOf(all, ctx) : undefined;
  let series: ZSeries[] = all.map((x) => ({
    ...x,
    role: x.id === "other" ? "context" : hero ? (x === hero ? "hero" : "context") : "series",
  }));
  const stacked = (s.stack === "stacked" || s.stack === "percent") && all.length > 1;
  if (stacked) {
    out.type = s.stack === "percent" ? "area-share" : "stacked-area";
    series = series.map((x) => ({ ...x, role: x.id === "other" ? "context" : "series" }));
    if (s.stack === "percent") out.unit = { symbol: "%", isRate: true, decimals: 1 };
  } else {
    out.type = "area";
    if (s.band === "minmax" && all.length >= 3) {
      const base = all.filter((x) => x !== (hero ?? all[0]));
      const [lo, hi] = bandOf(base, "minmax");
      series = [
        { ...(hero ?? all[0])!, role: "hero" },
        { ...lo, label: pl ? "najniższa" : "lowest" },
        { ...hi, label: pl ? "najwyższa" : "highest" },
      ];
    }
    // Otherwise the hero on top: context lines are drawn first.
    else series = [...series.filter((x) => x.role !== "hero"), ...series.filter((x) => x.role === "hero")];
  }
  out.series = series;
  out.highlight = hero?.id;
  out.reference = stacked ? undefined : referenceOf(out, s, hero ?? all[0], pl);
  if (s.surplus === "on" && !stacked && !out.reference) out.reference = { value: 0, label: "0" };
  out.opts = {
    ...(out.opts ?? {}),
    step: s.shape === "step",
    smooth: s.shape === "smooth",
    markers: s.markers === "on",
    areaFill: s.areaFill as "light" | "strong",
    surplus: s.surplus === "on" && !stacked && series.length <= 1,
    range: s.band === "minmax" && !stacked && all.length >= 3,
    endLabels: s.names !== "legend",
    grid: s.grid !== "off",
  };
  return out;
}

/** Combo chart from the builder's combo (series[0] columns, series[1] line). */
export function applyComboSettings(z: ZChartProps, s: Settings, lang: "pl" | "en"): ZChartProps {
  const pl = lang === "pl";
  const out: ZChartProps = { ...withDecimals(z, s) };
  if (s.swap === "second" && z.series.length >= 2) out.series = [z.series[1]!, z.series[0]!, ...z.series.slice(2)];
  out.reference = referenceOf(out, s, out.series[1] ?? out.series[0], pl);
  out.opts = {
    ...(out.opts ?? {}),
    contextBars: s.emphasis === "line",
    lineColour: s.lineColour as "ink" | "series",
    step: s.shape === "step",
    smooth: s.shape === "smooth",
    weight: s.weight as "thin" | "normal" | "thick",
    markers: s.markers !== "off",
    barWidth: s.barWidth as "normal" | "narrow",
    barLabels: (s.barLabels ?? "none") as "none" | "last" | "all",
    endLabels: s.lineLabel !== "none",
    grid: s.grid !== "off",
  };
  return out;
}

/** The look's settings applied to a built chart, by type. */
export function applyLook(type: WardrobeType, z: ZChartProps, s: Settings, lang: "pl" | "en", ctx: LookCtx): ZChartProps {
  switch (type) {
    case "line":
      return applyLineSettings(z, s, lang, ctx);
    case "column":
      return applyColumnSettings(z, s, lang, ctx);
    case "bar":
      return applyBarSettings(z, s, lang, ctx);
    case "area":
      return applyAreaSettings(z, s, lang, ctx);
    case "combo":
      return applyComboSettings(z, s, lang);
  }
}

/** Wells of the explorer kind a look's layout needs when it is chosen from the picker (keeps the rest). */
export function pickLookPatch(
  q: Query,
  look: Look,
  ctx: Pick<LookCtx, "grain">,
): { slots?: Partial<Record<SlotKey, string | null>>; grain?: null } {
  const layout = look.settings.series;
  if (!layout || seriesValue(look.type, layoutOf(q.slots)) === layout) return {};
  const slots = layoutSlots(q, layout, ctx);
  if (!slots) return {};
  return { slots: slots as Partial<Record<SlotKey, string | null>>, ...(layoutOf(q.slots) === "seasonal" ? { grain: null } : {}) };
}

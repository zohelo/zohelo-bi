// Chart kinds of the explorer: label (picker, buttons), long name (spoken summary), lower-case name (AI answers),
// icon, style family, the library type it usually draws, and its wells (owner review 2026-11-05: Power BI-style
// "Wartości / Oś X / Legenda / Małe wielokrotności / Filtry", named per chart where the chart needs other words —
// scatter "Punkty" with X/Y measures, bubble size, waterfall steps, map location…).
// Families follow the library (packages/visuals families.ts): standard, IBCS, variances (Zebra BI style), editorial.

import type { ChartFamily, ChartType } from "@zohelo/visuals";
import type { Lang } from "../../i18n";
import type { ChartKind, DimId, SlotKey } from "./exploreState";

type L = [string, string];

export type SlotSpec = {
  key: SlotKey;
  label: L;
  required?: boolean;
  /** Most members the slot shows (time keeps its latest periods instead of failing). */
  cap?: number;
  /** Only these dimensions may go here (map location: areas; IBCS x: time). */
  only?: DimId[];
  /** The chart uses two members of this slot (first and last for time): dumbbell, slope, pyramid. */
  pair?: boolean;
};

type KindInfo = {
  family: ChartFamily;
  /** The library type it usually draws (the builder may switch, e.g. columns → grouped columns). */
  type: ChartType;
  label: L;
  long: L;
  lower: L;
  icon: string;
  slots: SlotSpec[];
  /** Name of the measures well ("Wartości (oś Y)"), or one fixed well per measure (combo, scatter, bubble). */
  values: L | L[];
};

const VY: L = ["Wartości (oś Y)", "Values (Y axis)"];
const VX: L = ["Wartości (oś X)", "Values (X axis)"];
const V: L = ["Wartości", "Values"];
const X = (o: Partial<SlotSpec> = {}): SlotSpec => ({ key: "x", label: ["Oś X", "X axis"], required: true, ...o });
const CATS = (o: Partial<SlotSpec> = {}): SlotSpec => ({
  key: "x",
  label: ["Oś Y (kategorie)", "Y axis (categories)"],
  required: true,
  cap: 40,
  ...o,
});
const LEG = (o: Partial<SlotSpec> = {}): SlotSpec => ({ key: "legend", label: ["Legenda", "Legend"], ...o });
const SM = (cap = 12): SlotSpec => ({ key: "sm", label: ["Małe wielokrotności", "Small multiples"], cap });
const PAIR = (label: L): SlotSpec => ({ key: "legend", label, required: true, pair: true });

export const KIND_INFO: Record<ChartKind, KindInfo> = {
  line: {
    family: "standard",
    type: "line-highlight",
    label: ["Linia", "Line"],
    long: ["Wykres liniowy", "Line chart"],
    lower: ["linia", "line"],
    icon: "M2 14l4-5 3 3 4-6 3 3",
    values: VY,
    slots: [X(), LEG({ cap: 8 }), SM()],
  },
  columns: {
    family: "standard",
    type: "columns",
    label: ["Kolumny", "Columns"],
    long: ["Wykres kolumnowy", "Column chart"],
    lower: ["kolumny", "columns"],
    icon: "M3 15V9M7 15V5M11 15v-4M15 15V7",
    values: VY,
    slots: [X({ cap: 40 }), LEG({ cap: 6 }), SM()],
  },
  area: {
    family: "standard",
    type: "area",
    label: ["Obszar", "Area"],
    long: ["Wykres obszarowy", "Area chart"],
    lower: ["obszar", "area"],
    icon: "M2 15l4-6 3 2 4-6 3 3v7z",
    values: VY,
    slots: [X(), LEG({ cap: 20 }), SM()],
  },
  stacked: {
    family: "standard",
    type: "stacked-area",
    label: ["Obszar skumulowany", "Stacked area"],
    long: ["Obszar skumulowany", "Stacked area chart"],
    lower: ["obszar skumulowany", "stacked area"],
    icon: "M2 15V9l4-2 4 1 6-3v10zM2 12l4-1 4 1 6-2",
    values: VY,
    slots: [X(), LEG({ label: ["Legenda (części)", "Legend (parts)"], required: true, cap: 6 }), SM(6)],
  },
  stackcols: {
    family: "standard",
    type: "stacked-columns",
    label: ["Kolumny skumulowane", "Stacked columns"],
    long: ["Kolumny skumulowane", "Stacked columns"],
    lower: ["kolumny skumulowane", "stacked columns"],
    icon: "M3 15V8M7 15V4M11 15V9M15 15V6M2 11h3M6 9h3M10 12h3M14 10h3",
    values: VY,
    slots: [X({ cap: 40 }), LEG({ label: ["Legenda (części)", "Legend (parts)"], required: true, cap: 6 }), SM(6)],
  },
  share: {
    family: "standard",
    type: "area-share",
    label: ["Struktura 100%", "100% share"],
    long: ["Obszar 100% (struktura)", "100% area (structure)"],
    lower: ["struktura 100%", "100% share"],
    icon: "M2 3h14v12H2zM2 9l5-2 4 2 5-3",
    values: VY,
    slots: [X(), LEG({ label: ["Legenda (części)", "Legend (parts)"], required: true, cap: 4 }), SM(6)],
  },
  contributions: {
    family: "standard",
    type: "contributions",
    label: ["Wkłady", "Contributions"],
    long: ["Wkłady do zmiany (kolumny dodatnie i ujemne)", "Contributions (positive and negative stacks)"],
    lower: ["wkłady", "contributions"],
    icon: "M3 9V5M3 9v3M7 9V4M7 9v2M11 9V6M11 9v4M15 9V5M2 9h14",
    values: VY,
    slots: [X({ cap: 40 }), LEG({ label: ["Składniki", "Components"], required: true, cap: 8 }), SM(6)],
  },
  combo: {
    family: "standard",
    type: "combo",
    label: ["Kolumny + linia", "Columns + line"],
    long: ["Kolumny i linia na jednej osi", "Columns and line on one axis"],
    lower: ["kolumny i linia", "columns and line"],
    icon: "M3 15v-5M7 15V7M11 15v-4M15 15V8M2 9l4-4 4 3 6-4",
    values: [
      ["Kolumny (miara)", "Columns (measure)"],
      ["Linia (miara)", "Line (measure)"],
    ],
    slots: [X({ cap: 40 }), SM(6)],
  },
  bars: {
    family: "standard",
    type: "ranked-bars",
    label: ["Słupki", "Bars"],
    long: ["Słupki poziome (ranking)", "Horizontal bars (ranking)"],
    lower: ["ranking", "ranked bars"],
    icon: "M3 4h12M3 8h9M3 12h6M3 16h3",
    values: VX,
    slots: [CATS(), LEG({ cap: 6 }), SM(6)],
  },
  stackbars: {
    family: "standard",
    type: "stacked-bars",
    label: ["Słupki 100%", "100% bars"],
    long: ["Słupki skumulowane 100%", "100% stacked bars"],
    lower: ["słupki 100%", "100% bars"],
    icon: "M2 4h7M9 4h4M13 4h3M2 9h5M7 9h6M13 9h3M2 14h9M11 14h2M13 14h3",
    values: VX,
    slots: [CATS({ cap: 20 }), LEG({ label: ["Części", "Parts"], required: true, cap: 5 }), SM(6)],
  },
  segmented: {
    family: "standard",
    type: "segmented-bar",
    label: ["Słupek segmentowany", "Segmented bar"],
    long: ["Jedna całość podzielona na części", "One whole split into parts"],
    lower: ["słupek segmentowany", "segmented bar"],
    icon: "M2 7h5v4H2zM7 7h4v4H7zM11 7h3v4h-3zM14 7h2v4h-2z",
    values: V,
    slots: [LEG({ label: ["Części", "Parts"], required: true, cap: 6 }), SM(6)],
  },
  treemap: {
    family: "standard",
    type: "treemap",
    label: ["Mapa drzewa", "Treemap"],
    long: ["Mapa drzewa (części całości)", "Treemap (parts of a whole)"],
    lower: ["mapa drzewa", "treemap"],
    icon: "M2 3h8v12H2zM10 3h6v7h-6zM10 10h6v5h-6z",
    values: V,
    slots: [{ key: "x", label: ["Grupy", "Groups"], required: true, cap: 40 }, SM(6)],
  },
  waterfall: {
    family: "standard",
    type: "waterfall",
    label: ["Kaskada", "Waterfall"],
    long: ["Wykres kaskadowy: części dodające się do sumy", "Waterfall: parts adding up to the total"],
    lower: ["kaskada", "waterfall"],
    icon: "M2 15V11h3V8h3V5h3v3h3v7",
    values: VY,
    slots: [{ key: "x", label: ["Kroki (podział)", "Steps (breakdown)"], required: true, cap: 10 }, SM(6)],
  },
  diverging: {
    family: "standard",
    type: "diverging-bars",
    label: ["Słupki rozbieżne", "Diverging bars"],
    long: ["Słupki wokół zera", "Bars around zero"],
    lower: ["słupki rozbieżne", "diverging bars"],
    icon: "M9 3v12M9 5h5M5 8h4M9 11h3M6 14h3",
    values: VX,
    slots: [CATS({ cap: 30 }), SM(6)],
  },
  heatmap: {
    family: "standard",
    type: "heatmap",
    label: ["Mapa cieplna", "Heatmap"],
    long: ["Mapa cieplna", "Heatmap"],
    lower: ["mapa cieplna", "heatmap"],
    icon: "M3 3h4v4H3zM8 3h4v4H8zM13 3h2v4h-2zM3 8h4v4H3zM8 8h4v4H8zM3 13h4v2H3z",
    values: V,
    slots: [
      { key: "rows", label: ["Wiersze", "Rows"], required: true, cap: 40 },
      { key: "cols", label: ["Kolumny", "Columns"], required: true, cap: 120 },
    ],
  },
  matrix: {
    family: "standard",
    type: "sparkline-table",
    label: ["Macierz (tabela)", "Matrix (table)"],
    long: ["Macierz: wiersze × kolumny", "Matrix: rows × columns"],
    lower: ["macierz", "matrix"],
    icon: "M2 3h14v12H2zM2 7h14M2 11h14M7 3v12M12 3v12",
    values: V,
    slots: [
      { key: "rows", label: ["Wiersze", "Rows"], required: true, cap: 60 },
      { key: "cols", label: ["Kolumny", "Columns"], cap: 40 },
    ],
  },
  sparkline: {
    family: "standard",
    type: "sparkline-table",
    label: ["Tabela z trendem", "Sparkline table"],
    long: ["Tabela: ostatnia wartość, zmiana i trend", "Table: latest value, change and trend"],
    lower: ["tabela z trendem", "sparkline table"],
    icon: "M2 4h4M2 9h4M2 14h4M8 5l2-2 2 2 3-2M8 10l2-1 2 1 3-2M8 15l2-2 2 1 3-1",
    values: V,
    slots: [{ key: "rows", label: ["Wiersze", "Rows"], required: true, cap: 15 }],
  },
  map: {
    family: "standard",
    type: "tile-map",
    label: ["Mapa kafelkowa", "Tile map"],
    long: ["Kartogram kafelkowy województw", "Voivodeship tile map"],
    lower: ["mapa kafelkowa", "tile map"],
    icon: "M3 4h4v4H3zM8 4h4v4H8zM5 9h4v4H5zM10 9h4v4h-4z",
    values: [["Kolor (miara)", "Colour (measure)"]],
    slots: [{ key: "x", label: ["Lokalizacja (województwa)", "Location (voivodeships)"], required: true, only: ["geo"] }, SM(6)],
  },
  choro: {
    family: "standard",
    type: "choropleth",
    label: ["Mapa województw", "Voivodeship map"],
    long: ["Mapa województw (kartogram)", "Voivodeship map (choropleth)"],
    lower: ["mapa województw", "voivodeship map"],
    icon: "M3 5l4-2 3 2 4-1 2 3-1 4 1 3-4 1-3-1-4 1-2-3 1-3z",
    values: [["Kolor (miara)", "Colour (measure)"]],
    slots: [{ key: "x", label: ["Lokalizacja (województwa)", "Location (voivodeships)"], required: true, only: ["geo"] }, SM(6)],
  },
  scatter: {
    family: "standard",
    type: "scatter",
    label: ["Rozrzut", "Scatter"],
    long: ["Wykres rozrzutu", "Scatter plot"],
    lower: ["rozrzut", "scatter"],
    icon: "M4 13h.01M7 9h.01M10 11h.01M12 6h.01M14 4h.01M3 3v12h12",
    values: [
      ["Oś X (miara)", "X axis (measure)"],
      ["Oś Y (miara)", "Y axis (measure)"],
    ],
    slots: [{ key: "x", label: ["Punkty (szczegóły)", "Points (details)"], required: true, cap: 80 }, SM(6)],
  },
  bubble: {
    family: "standard",
    type: "scatter",
    label: ["Bąbelkowy", "Bubble"],
    long: ["Wykres bąbelkowy: oś X, oś Y i rozmiar", "Bubble chart: X, Y and size"],
    lower: ["wykres bąbelkowy", "bubble chart"],
    icon: "M5 12a2 2 0 100-.01M11 7a3.5 3.5 0 100-.01M14 13a1.5 1.5 0 100-.01M3 3v12h12",
    values: [
      ["Oś X (miara)", "X axis (measure)"],
      ["Oś Y (miara)", "Y axis (measure)"],
      ["Rozmiar (miara)", "Size (measure)"],
    ],
    slots: [{ key: "x", label: ["Punkty (szczegóły)", "Points (details)"], required: true, cap: 80 }, SM(6)],
  },
  boxplot: {
    family: "standard",
    type: "boxplot",
    label: ["Pudełkowy", "Box plot"],
    long: ["Wykres pudełkowy (rozrzut jednostek)", "Box plot (spread of units)"],
    lower: ["wykres pudełkowy", "box plot"],
    icon: "M5 3v3M5 12v3M3 6h4v6H3zM3 9h4M13 4v2M13 11v3M11 6h4v5h-4zM11 8h4",
    values: VY,
    slots: [X({ label: ["Pudełka (oś X)", "Boxes (X axis)"], cap: 16 }), LEG({ label: ["Rozkład wg", "Spread over"], required: true })],
  },
  histogram: {
    family: "standard",
    type: "histogram",
    label: ["Histogram", "Histogram"],
    long: ["Histogram: rozkład wartości jednostek", "Histogram: distribution of units' values"],
    lower: ["histogram", "histogram"],
    icon: "M2 15h14M3 15v-4h3v4M6 15V7h3v8M9 15V4h3v11M12 15v-6h3v6",
    values: VY,
    slots: [{ key: "x", label: ["Jednostki (rozkład)", "Units (distribution)"], required: true }],
  },
  pyramid: {
    family: "standard",
    type: "pyramid",
    label: ["Piramida", "Pyramid"],
    long: ["Piramida: dwie strony według grup", "Pyramid: two sides by group"],
    lower: ["piramida", "pyramid"],
    icon: "M9 3v12M9 4H6M9 7H4M9 10H3M9 13H5M9 4h3M9 7h4M9 10h6M9 13h4",
    values: VX,
    slots: [CATS({ label: ["Grupy (oś Y)", "Groups (Y axis)"], cap: 20 }), PAIR(["Strony (2 wartości)", "Sides (2 values)"])],
  },
  ibcs: {
    family: "ibcs",
    type: "ibcs-columns",
    label: ["Kolumny IBCS", "IBCS columns"],
    long: ["Kolumny IBCS: wykonanie wobec roku poprzedniego", "IBCS columns: actual against previous year"],
    lower: ["kolumny IBCS", "IBCS columns"],
    icon: "M3 15V9M4.5 15V8M8 15V6M9.5 15V5M13 15V8M14.5 15V7M2 3h14",
    values: VY,
    slots: [X({ label: ["Oś X (okresy)", "X axis (periods)"], only: ["t"] }), SM(6)],
  },
  ibcsbars: {
    family: "ibcs",
    type: "ibcs-bars",
    label: ["Słupki IBCS", "IBCS bars"],
    long: ["Słupki IBCS: struktura wobec roku poprzedniego", "IBCS bars: structure against previous year"],
    lower: ["słupki IBCS", "IBCS bars"],
    icon: "M3 3v12M3 5h9M3 6.5h8M3 9h6M3 10.5h7M3 13h4M3 14.5h3M15 4v11",
    values: VX,
    slots: [CATS({ cap: 20 }), SM(6)],
  },
  bridge: {
    family: "ibcs",
    type: "bridge",
    label: ["Most (PY → AC)", "Bridge (PY → AC)"],
    long: ["Most: od roku poprzedniego do wykonania przez czynniki zmiany", "Bridge: from previous year to actual by drivers"],
    lower: ["most", "bridge"],
    icon: "M2 15V6h2M4 6v3h3v3h3V8h3v7",
    values: VY,
    slots: [{ key: "x", label: ["Czynniki zmiany (podział)", "Drivers (breakdown)"], required: true, cap: 10 }],
  },
  variance: {
    family: "variance",
    type: "variance-columns",
    label: ["Odchylenia w czasie", "Variances over time"],
    long: ["Kolumny ze zintegrowanym odchyleniem od roku poprzedniego", "Columns with the integrated variance from the previous year"],
    lower: ["odchylenia w czasie", "variances over time"],
    icon: "M3 15V9M3 9V7M8 15V6M8 6V4M13 15V8M13 8V9.5M2 15h14",
    values: VY,
    slots: [X({ label: ["Oś X (okresy)", "X axis (periods)"], only: ["t"] }), SM(6)],
  },
  varbars: {
    family: "variance",
    type: "variance-bars",
    label: ["Odchylenia kategorii", "Variances by category"],
    long: ["Słupki ze zintegrowanym odchyleniem od roku poprzedniego", "Bars with the integrated variance from the previous year"],
    lower: ["odchylenia kategorii", "variances by category"],
    icon: "M3 3v12M3 5h8M11 5h2M3 9h6M9 9h-1M3 13h9M12 13h1",
    values: VX,
    slots: [CATS({ cap: 20 }), SM(6)],
  },
  dumbbell: {
    family: "editorial",
    type: "dumbbell",
    label: ["Hantle (zmiana)", "Dumbbell (change)"],
    long: ["Zmiana między dwiema wartościami", "Change between two values"],
    lower: ["zmiana (hantle)", "change (dumbbell)"],
    icon: "M4 5h9M4 9h6M4 13h10M4 5h.01M13 5h.01M4 9h.01M10 9h.01M4 13h.01M14 13h.01",
    values: VX,
    slots: [CATS({ cap: 30 }), PAIR(["Porównanie (2 wartości)", "Compare (2 values)"])],
  },
  slope: {
    family: "editorial",
    type: "slope",
    label: ["Nachylenie", "Slope"],
    long: ["Wykres nachylenia", "Slope chart"],
    lower: ["nachylenie", "slope"],
    icon: "M4 4v11M14 4v11M4 6l10 4M4 12l10-6",
    values: VY,
    slots: [
      { key: "x", label: ["Kategorie (linie)", "Categories (lines)"], required: true, cap: 16 },
      PAIR(["Porównanie (2 wartości)", "Compare (2 values)"]),
    ],
  },
  bump: {
    family: "editorial",
    type: "bump",
    label: ["Ranking w czasie", "Bump chart"],
    long: ["Ranking w czasie", "Rank over time"],
    lower: ["ranking w czasie", "bump chart"],
    icon: "M2 5l4 0 4 6 6 0M2 11l4 0 4-6 6 0M2 15h14",
    values: VY,
    slots: [X(), LEG({ label: ["Pozycje (legenda)", "Ranked items (legend)"], required: true, cap: 12 })],
  },
  lollipop: {
    family: "editorial",
    type: "lollipop",
    label: ["Lizak", "Lollipop"],
    long: ["Ranking punktowy (lizak)", "Lollipop ranking"],
    lower: ["lizak", "lollipop"],
    icon: "M3 4h10M3 9h7M3 14h4M13 4h.01M10 9h.01M7 14h.01",
    values: VX,
    slots: [CATS(), SM(6)],
  },
  dots: {
    family: "editorial",
    type: "dot-plot",
    label: ["Punkty", "Dot plot"],
    long: ["Wykres punktowy (dwie–trzy wartości na kategorię)", "Dot plot (two or three values per category)"],
    lower: ["wykres punktowy", "dot plot"],
    icon: "M4 4h6M7 9h7M3 14h5M4 4h.01M10 4h.01M7 9h.01M14 9h.01M3 14h.01M8 14h.01",
    values: VX,
    slots: [CATS({ cap: 30 }), LEG({ required: true, cap: 3 })],
  },
  ranking: {
    family: "editorial",
    type: "ranking-table",
    label: ["Tabela rankingowa", "Ranking table"],
    long: ["Tabela rankingowa ze zmianą miejsca", "Ranking table with rank change"],
    lower: ["tabela rankingowa", "ranking table"],
    icon: "M2 4h2M2 9h2M2 14h2M6 4h10M6 9h7M6 14h5",
    values: V,
    slots: [{ key: "x", label: ["Wiersze (kategorie)", "Rows (categories)"], required: true, cap: 30 }],
  },
};

const at = (pair: L, lang: Lang) => pair[lang === "pl" ? 0 : 1];

export function kindLabel(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].label, lang);
}
export function kindName(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].long, lang);
}
export function kindLower(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].lower, lang);
}
export function slotLabel(k: ChartKind, s: SlotKey, lang: Lang): string {
  const spec = KIND_INFO[k].slots.find((x) => x.key === s);
  return spec ? at(spec.label, lang) : s;
}
/** Fixed measure wells of a kind (combo, scatter, bubble, maps), or null when it takes a list of values. */
export function measureWells(k: ChartKind): L[] | null {
  const v = KIND_INFO[k].values;
  return Array.isArray(v[0]) ? (v as L[]) : null;
}
export function valuesLabel(k: ChartKind, lang: Lang): string {
  const v = KIND_INFO[k].values;
  return Array.isArray(v[0]) ? (lang === "pl" ? "Wartości" : "Values") : at(v as L, lang);
}

/** Kinds per family, in picker order. */
export function kindsByFamily(): { family: ChartFamily; kinds: ChartKind[] }[] {
  const families: ChartFamily[] = ["standard", "ibcs", "variance", "editorial"];
  const all = Object.keys(KIND_INFO) as ChartKind[];
  return families.map((family) => ({ family, kinds: all.filter((k) => KIND_INFO[k].family === family) }));
}

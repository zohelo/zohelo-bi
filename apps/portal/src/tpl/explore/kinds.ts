// Chart kinds of the explorer (explorer v3): one row per kind with its short label (picker, buttons), long name
// (spoken summary, subtitles), lower-case name (AI answers), icon, style family and the chart library type it draws.
// Families follow the library (packages/visuals families.ts): standard, IBCS, variances (Zebra BI style), editorial.

import type { ChartFamily, ChartType } from "@zohelo/visuals";
import type { Lang } from "../../i18n";
import type { ChartKind } from "./exploreState";

type KindInfo = {
  family: ChartFamily;
  /** The library type it usually draws (the builder may switch, e.g. columns → grouped bars). */
  type: ChartType;
  label: [string, string];
  long: [string, string];
  lower: [string, string];
  icon: string;
};

export const KIND_INFO: Record<ChartKind, KindInfo> = {
  line: {
    family: "standard",
    type: "line-highlight",
    label: ["Linia", "Line"],
    long: ["Wykres liniowy", "Line chart"],
    lower: ["linia", "line"],
    icon: "M2 14l4-5 3 3 4-6 3 3",
  },
  columns: {
    family: "standard",
    type: "columns",
    label: ["Słupki w czasie", "Columns"],
    long: ["Słupki w czasie", "Columns over time"],
    lower: ["słupki w czasie", "columns"],
    icon: "M3 15V9M7 15V5M11 15v-4M15 15V7",
  },
  area: {
    family: "standard",
    type: "area",
    label: ["Obszar", "Area"],
    long: ["Wykres obszarowy", "Area chart"],
    lower: ["obszar", "area"],
    icon: "M2 15l4-6 3 2 4-6 3 3v7z",
  },
  stacked: {
    family: "standard",
    type: "stacked-area",
    label: ["Obszar skumulowany", "Stacked area"],
    long: ["Obszar skumulowany", "Stacked area chart"],
    lower: ["obszar skumulowany", "stacked area"],
    icon: "M2 15V9l4-2 4 1 6-3v10zM2 12l4-1 4 1 6-2",
  },
  stackcols: {
    family: "standard",
    type: "stacked-columns",
    label: ["Kolumny skumulowane", "Stacked columns"],
    long: ["Kolumny skumulowane", "Stacked columns"],
    lower: ["kolumny skumulowane", "stacked columns"],
    icon: "M3 15V8M3 11h0M7 15V4M11 15V9M15 15V6M2 11h3M6 9h3M10 12h3M14 10h3",
  },
  share: {
    family: "standard",
    type: "area-share",
    label: ["Struktura 100%", "100% share"],
    long: ["Obszar 100% (struktura w czasie)", "100% area (structure over time)"],
    lower: ["struktura 100%", "100% share"],
    icon: "M2 3h14v12H2zM2 9l5-2 4 2 5-3",
  },
  combo: {
    family: "standard",
    type: "combo",
    label: ["Kolumny + linia", "Columns + line"],
    long: ["Kolumny i linia na jednej osi", "Columns and line on one axis"],
    lower: ["kolumny i linia", "columns and line"],
    icon: "M3 15v-5M7 15V7M11 15v-4M15 15V8M2 9l4-4 4 3 6-4",
  },
  bars: {
    family: "standard",
    type: "ranked-bars",
    label: ["Ranking", "Ranking"],
    long: ["Ranking słupkowy", "Bar ranking"],
    lower: ["ranking", "ranked bars"],
    icon: "M3 4h12M3 8h9M3 12h6M3 16h3",
  },
  treemap: {
    family: "standard",
    type: "treemap",
    label: ["Mapa drzewa", "Treemap"],
    long: ["Mapa drzewa (części całości)", "Treemap (parts of a whole)"],
    lower: ["mapa drzewa", "treemap"],
    icon: "M2 3h8v12H2zM10 3h6v7h-6zM10 10h6v5h-6z",
  },
  heatmap: {
    family: "standard",
    type: "heatmap",
    label: ["Mapa cieplna", "Heatmap"],
    long: ["Mapa cieplna", "Heatmap"],
    lower: ["mapa cieplna", "heatmap"],
    icon: "M3 3h4v4H3zM8 3h4v4H8zM13 3h2v4h-2zM3 8h4v4H3zM8 8h4v4H8zM3 13h4v2H3z",
  },
  matrix: {
    family: "standard",
    type: "sparkline-table",
    label: ["Macierz (tabela)", "Matrix (table)"],
    long: ["Macierz: wiersze × kolumny", "Matrix: rows × columns"],
    lower: ["macierz", "matrix"],
    icon: "M2 3h14v12H2zM2 7h14M2 11h14M7 3v12M12 3v12",
  },
  map: {
    family: "standard",
    type: "tile-map",
    label: ["Mapa kafelkowa", "Tile map"],
    long: ["Kartogram kafelkowy województw", "Voivodeship tile map"],
    lower: ["mapa kafelkowa", "tile map"],
    icon: "M3 4h4v4H3zM8 4h4v4H8zM5 9h4v4H5zM10 9h4v4h-4z",
  },
  choro: {
    family: "standard",
    type: "choropleth",
    label: ["Mapa województw", "Voivodeship map"],
    long: ["Mapa województw (kartogram)", "Voivodeship map (choropleth)"],
    lower: ["mapa województw", "voivodeship map"],
    icon: "M3 5l4-2 3 2 4-1 2 3-1 4 1 3-4 1-3-1-4 1-2-3 1-3z",
  },
  scatter: {
    family: "standard",
    type: "scatter",
    label: ["Rozrzut", "Scatter"],
    long: ["Wykres rozrzutu", "Scatter plot"],
    lower: ["rozrzut", "scatter"],
    icon: "M4 13h.01M7 9h.01M10 11h.01M12 6h.01M14 4h.01M3 3v12h12",
  },
  boxplot: {
    family: "standard",
    type: "boxplot",
    label: ["Pudełkowy", "Box plot"],
    long: ["Wykres pudełkowy (rozrzut województw)", "Box plot (spread of voivodeships)"],
    lower: ["wykres pudełkowy", "box plot"],
    icon: "M5 3v3M5 12v3M3 6h4v6H3zM3 9h4M13 4v2M13 11v3M11 6h4v5h-4zM11 8h4",
  },
  ibcs: {
    family: "ibcs",
    type: "ibcs-columns",
    label: ["Kolumny IBCS", "IBCS columns"],
    long: ["Kolumny IBCS: wykonanie wobec roku poprzedniego", "IBCS columns: actual against previous year"],
    lower: ["kolumny IBCS", "IBCS columns"],
    icon: "M3 15V9M4.5 15V8M8 15V6M9.5 15V5M13 15V8M14.5 15V7M2 3h14",
  },
  ibcsbars: {
    family: "ibcs",
    type: "ibcs-bars",
    label: ["Słupki IBCS", "IBCS bars"],
    long: ["Słupki IBCS: struktura wobec roku poprzedniego", "IBCS bars: structure against previous year"],
    lower: ["słupki IBCS", "IBCS bars"],
    icon: "M3 3v12M3 5h9M3 6.5h8M3 9h6M3 10.5h7M3 13h4M3 14.5h3M15 4v11",
  },
  variance: {
    family: "variance",
    type: "variance-columns",
    label: ["Odchylenia w czasie", "Variances over time"],
    long: ["Kolumny ze zintegrowanym odchyleniem od roku poprzedniego", "Columns with the integrated variance from the previous year"],
    lower: ["odchylenia w czasie", "variances over time"],
    icon: "M3 15V9M3 9V7M8 15V6M8 6V4M13 15V8M13 8V9.5M2 15h14",
  },
  varbars: {
    family: "variance",
    type: "variance-bars",
    label: ["Odchylenia kategorii", "Variances by category"],
    long: ["Słupki ze zintegrowanym odchyleniem od roku poprzedniego", "Bars with the integrated variance from the previous year"],
    lower: ["odchylenia kategorii", "variances by category"],
    icon: "M3 3v12M3 5h8M11 5h2M3 9h6M9 9h-1M3 13h9M12 13h1",
  },
  dumbbell: {
    family: "editorial",
    type: "dumbbell",
    label: ["Zmiana", "Change"],
    long: ["Zmiana między okresami", "Change between periods"],
    lower: ["zmiana (hantle)", "change (dumbbell)"],
    icon: "M4 5h9M4 9h6M4 13h10M4 5h.01M13 5h.01M4 9h.01M10 9h.01M4 13h.01M14 13h.01",
  },
  slope: {
    family: "editorial",
    type: "slope",
    label: ["Nachylenie", "Slope"],
    long: ["Wykres nachylenia", "Slope chart"],
    lower: ["nachylenie", "slope"],
    icon: "M4 4v11M14 4v11M4 6l10 4M4 12l10-6",
  },
  bump: {
    family: "editorial",
    type: "bump",
    label: ["Ranking w czasie", "Bump chart"],
    long: ["Ranking w czasie", "Rank over time"],
    lower: ["ranking w czasie", "bump chart"],
    icon: "M2 5l4 0 4 6 6 0M2 11l4 0 4-6 6 0M2 15h14",
  },
  lollipop: {
    family: "editorial",
    type: "lollipop",
    label: ["Lizak", "Lollipop"],
    long: ["Ranking punktowy (lizak)", "Lollipop ranking"],
    lower: ["lizak", "lollipop"],
    icon: "M3 4h10M3 9h7M3 14h4M13 4h.01M10 9h.01M7 14h.01",
  },
  dots: {
    family: "editorial",
    type: "dot-plot",
    label: ["Punkty", "Dot plot"],
    long: ["Wykres punktowy (dwie–trzy wartości na kategorię)", "Dot plot (two or three values per category)"],
    lower: ["wykres punktowy", "dot plot"],
    icon: "M4 4h6M7 9h7M3 14h5M4 4h.01M10 4h.01M7 9h.01M14 9h.01M3 14h.01M8 14h.01",
  },
  ranking: {
    family: "editorial",
    type: "ranking-table",
    label: ["Tabela rankingowa", "Ranking table"],
    long: ["Tabela rankingowa ze zmianą miejsca", "Ranking table with rank change"],
    lower: ["tabela rankingowa", "ranking table"],
    icon: "M2 4h2M2 9h2M2 14h2M6 4h10M6 9h7M6 14h5",
  },
};

const at = (pair: [string, string], lang: Lang) => pair[lang === "pl" ? 0 : 1];

export function kindLabel(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].label, lang);
}
export function kindName(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].long, lang);
}
export function kindLower(k: ChartKind, lang: Lang): string {
  return at(KIND_INFO[k].lower, lang);
}

/** Kinds per family, in picker order. */
export function kindsByFamily(): { family: ChartFamily; kinds: ChartKind[] }[] {
  const families: ChartFamily[] = ["standard", "ibcs", "variance", "editorial"];
  const all = Object.keys(KIND_INFO) as ChartKind[];
  return families.map((family) => ({ family, kinds: all.filter((k) => KIND_INFO[k].family === family) }));
}

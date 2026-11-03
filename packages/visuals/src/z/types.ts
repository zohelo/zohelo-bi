// Contract of the zohelo chart library (design template: Chart library). Every chart type is drawn by
// <ZChart type=… />; pages build ZChartData from the data layer and never style charts themselves.

/** The 20 chart types (the KPI tile is a page component, not a chart). */
export const CHART_TYPES = [
  "line-band", // one series over time with a target band and the last value labelled
  "line-highlight", // hero series in series-1, others in series-context, direct labels at line ends
  "columns", // values per period with zero line; negative in div-negative
  "small-multiples", // one small line panel per category (shared scale)
  "area-share", // 100% stacked area: structure over time (2–4 parts)
  "ranked-bars", // horizontal bars sorted by value; highlight + optional reference line
  "grouped-bars", // 2–3 series per category (e.g. two years)
  "dumbbell", // change between two points per category
  "slope", // two periods, several categories
  "diverging-bars", // positive/negative around zero per category
  "bullet", // value vs target band and target tick, several measures
  "waterfall", // contributions adding to a total
  "stacked-bars", // 100% stacked horizontal bars per category/period
  "segmented-bar", // one whole split into 3–6 labelled parts
  "pyramid", // two groups (men/women) by age band
  "histogram", // distribution of one measure across units
  "scatter", // relationship of two measures; one dot per unit
  "tile-map", // 16 voivodeships as a tile grid, ordinal 4-class ramp
  "heatmap", // month × year (or category × category), ordinal 5-class ramp
  "sparkline-table", // several indicators: name, sparkline, value, change
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

export type ZPoint = { x: string; y: number | null };

export type ZSeries = {
  /** Stable key (geography key, member key, KPI key, year…). Colour follows the key, never the position. */
  id: string;
  label: string;
  /** hero = series-1 emphasised; context = series-context; series = next categorical slot. Default: series. */
  role?: "hero" | "context" | "series";
  points: ZPoint[];
  /** Optional unit of this series when it differs from the chart unit (sparkline-table rows, scatter x/y). */
  unit?: ZUnit;
};

export type ZCategory = { key: string; label: string; short?: string };

export type ZUnit = { symbol: string; isRate: boolean; decimals: number };

export type ZChartData = {
  type: ChartType;
  /**
   * Time charts: x = period ("2026-09", "2026-Q2", "2025"), one series per line/part.
   * Category charts (ranked, grouped, dumbbell, slope, diverging, tile-map, histogram buckets…):
   *   x = category key (see `categories`), one series per measure or period (e.g. "2015", "2025").
   * scatter: two series, ids "x" and "y", x = category key (unit), y = value.
   * bullet: one series, x = measure key, y = value; band and target from `band`/`reference`.
   * waterfall: one series, x = step key, y = contribution; the total is computed and drawn last.
   * sparkline-table: one series per indicator (label = indicator name, points = history, optional own `unit`).
   * tile-map: one series, x = geography key PL02…PL32 (ids like "PL14|gus" also match); see `tileMapSeries`.
   * heatmap: one series with monthly periods (month × year), or one series per row with x = column category.
   * segmented-bar: one series, x = part key; a part keyed "other" is drawn in series-context ("Pozostałe").
   * pyramid: two series (series[0] left, e.g. men; series[1] right), x = age band key, youngest first.
   * histogram: one series, x = bin key ("0-2", "2-4" … numeric edges are drawn on the axis); `reference` = median.
   */
  series: ZSeries[];
  categories?: ZCategory[];
  unit: ZUnit;
  lang: "pl" | "en";
  /** One sentence stating the finding; becomes the SVG's aria-label. */
  ariaLabel: string;
  /** Target or normal range drawn as a band with dashed edges. */
  band?: [number, number];
  /** Reference value: EU average, Poland = 100, target tick (bullet). */
  reference?: { value: number; label: string };
  /** Series id or category key to emphasise. */
  highlight?: string;
  /** One annotated point, e.g. a peak. */
  annotate?: { x: string; label: string };
  /** For x-axis labels of time charts. */
  formatPeriod?: (period: string) => string;
  /** Optional legend text for `band` (default "pasmo celu 1,5–3,5%" / "target range …"). */
  bandLabel?: string;
  /**
   * Optional class thresholds (ascending) for the binned ramps: 3 values for tile-map (4 classes), 4 for heatmap
   * (5 classes). Default: rounded quantiles of the data.
   */
  breaks?: number[];
  /** Optional label of the computed total bar of a waterfall (default "Suma" / "Total"). */
  totalLabel?: string;
};

export type ZChartProps = ZChartData & {
  /** Pixel height at desktop width; phone variants may reduce it. Default per type (row charts size to rows). */
  height?: number;
  /** Optional fixed pixel width; by default the chart measures its container (ResizeObserver). */
  width?: number;
  /**
   * Grow to the height the container offers (e.g. a card stretched to its row's tallest neighbour) instead
   * of leaving empty space under the chart. Never smaller than the chart's own height; off on phones.
   */
  fill?: boolean;
};

export type ZTable = { caption: string; columns: string[]; rows: string[][]; numeric: boolean[] };

export type ZLegendItem = { label: string; color: string; shape: "line" | "square" | "dot" | "band" | "tick" };

/** A documented example of one chart type (the chart library page shows every one of these live). */
export type ChartSample = ZChartData & {
  /** Polish kind name, e.g. "Linia + pasmo". */
  kind_pl: string;
  kind_en: string;
  /** Library group: Zmiana w czasie, Wielkość i ranking, Odchylenie, Część całości, Rozkład, Zależność i przestrzeń, Przegląd. */
  group_pl: string;
  group_en: string;
  title: string;
  sub: string;
  use_pl: string;
  avoid_pl: string;
  use_en: string;
  avoid_en: string;
};

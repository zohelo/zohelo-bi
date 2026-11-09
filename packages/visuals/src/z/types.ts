// Contract of the zohelo chart library (design template: Chart library). Every chart type is drawn by
// <ZChart type=… />; pages build ZChartData from the data layer and never style charts themselves.

/** The chart types (the KPI tile is a page component, not a chart), grouped in four style families below. */
export const CHART_TYPES = [
  "line-band", // one series over time with a target band and the last value labelled
  "line-highlight", // hero series in series-1, others in series-context, direct labels at line ends
  "columns", // values per period with zero line; negative in div-negative
  "contributions", // contributions to growth: signed stacked columns per period (pp) with the total as a dot
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
  // --- added in the user-layer brief (milestone 6)
  "area", // one to three series over time, filled to zero
  "stacked-area", // parts adding to a whole over time, absolute values
  "stacked-columns", // parts adding to a whole per period or category, total on top
  "combo", // columns of one measure and a line of a second in the same unit (one axis, never two)
  "bump", // rank of each category over time
  "lollipop", // ranked dots on stems (lighter than bars for many categories)
  "dot-plot", // two or three values per category on one scale (Cleveland dot plot)
  "ranking-table", // rank, rank change, name, inline bar, value, change
  "treemap", // many parts of one whole as nested rectangles
  "boxplot", // spread of units (e.g. voivodeships) per group or period: quartiles, median, outliers
  "choropleth", // the 16 voivodeships on a real map, ordinal 4-class ramp
  "ibcs-columns", // IBCS: AC solid vs PY grey per period, absolute ΔPY and relative ΔPY% above
  "ibcs-bars", // IBCS: AC vs PY per category (structure), absolute ΔPY beside
  "variance-columns", // integrated variance: AC columns with the ΔPY segment coloured, ΔPY% pins below
  "variance-bars", // integrated variance per category: AC bars with the ΔPY segment, ΔPY% pins beside
  "bridge", // calculation waterfall from a start value (PY) through drivers to the end value (AC)
  // --- chart library v2 (owner approval 2026-11-09, docs/chart-library-proposal.md)
  "pie", // one whole in 2–5 parts; opts.donut = ring with the total in the centre
  "waffle", // 10×10 grid of squares, one part highlighted (or up to 4 parts)
  "strip", // one dot per unit along one value axis, per group; opts.beeswarm = dots packed without overlap
  "fan", // projection: median line with percentile bands (opts.fan) or scenario lines after opts.forecastFrom
  "symbol-map", // voivodeship map with circles sized by value (kartodiagram); opts.ramp colours the regions too
  "sankey", // two-stage flows: one series, x = "from>to", y = flow size
  "kpi-card", // one headline value with change; opts.spark = with a sparkline, opts.target = value vs target
  "sparkline", // one small line (opts.mode "line") or columns ("columns") without axes, last value labelled
  "table", // plain table of values per category and series; opts.cells "heat" | "bars" | "spark"
] as const;

/**
 * Variant options (chart library v2). A variant of a type is a ChartType plus these options (library.ts); every
 * option is ignored by types that do not use it. Data transforms (index = 100, y/y, per capita) are applied by the
 * caller before drawing, never here.
 */
export type ZOptions = {
  /** line-highlight / line-band / area: draw steps (value holds until the next period), e.g. a policy rate. */
  step?: boolean;
  /** Time charts (lines, columns, fan): periods at or after this x are a forecast: dashed line / hatched column. */
  forecastFrom?: string;
  /** Uncertainty: ids of the series holding the lower and upper bound (line: shaded band; dot-plot: error bar). */
  interval?: { lower: string; upper: string };
  /** fan: pairs of series ids [lower, upper] from the outer to the inner band; the line is series[0]. */
  fan?: [string, string][];
  /** scatter: least-squares trend line with its equation in the legend. */
  trend?: boolean;
  /** scatter: dashed lines at the mean of x and of y, quadrants labelled. */
  quadrants?: boolean;
  /** scatter: connect the points in the order of categories (connected scatter over time). */
  connect?: boolean;
  /** scatter / bubble: label every point ("all") or only the highlighted one (default). */
  labels?: "all" | "highlight";
  /** stacked-columns / stacked-area / stacked-bars: 100% stacking; pyramid: share of the total population. */
  percent?: boolean;
  /** pyramid: id of a second pair drawn as an outline over the bars ("2050|m", "2050|f" style ids: overlay prefix). */
  overlay?: string;
  /** area: fill above opts reference (or zero) in div-positive and below in div-negative (surplus/deficit). */
  surplus?: boolean;
  /** area: band between the series ids "lo" and "hi" with series[0] as the line (range band, min–max). */
  range?: boolean;
  /** pie: ring with the total in the centre. */
  donut?: boolean;
  /** strip: pack dots without overlap (beeswarm) instead of a jittered strip. */
  beeswarm?: boolean;
  /** choropleth / tile-map / symbol-map: class ramp; diverging is centred on `reference` (or the mean). */
  ramp?: "sequential" | "diverging" | "categorical";
  /** tile-map: a small sparkline in every tile (series[0] = latest values, series with id = geo key = history). */
  mini?: boolean;
  /** treemap: nest parts in groups by ZCategory.group. */
  hierarchy?: boolean;
  /** sparkline: line (default) or columns (win/loss for signed values). */
  mode?: "line" | "columns";
  /** kpi-card: draw series[0] history as a sparkline under the value. */
  spark?: boolean;
  /** kpi-card / bullet: the target value. */
  target?: number;
  /** table: what the value cells show besides the number. */
  cells?: "plain" | "heat" | "bars" | "spark";
  /** line-highlight: name and last value at the end of every line (default true); false = the legend names them. */
  endLabels?: boolean;
  /** line-highlight: a dot on every period (short series, few points). */
  markers?: boolean;
  /** line-highlight / small-multiples: smooth curve (monotone) instead of straight segments. */
  smooth?: boolean;
  /** line-highlight: line weight. */
  weight?: "thin" | "normal" | "thick";
  /** line-highlight: context (grey) series dashed. */
  contextDash?: boolean;
  /** line-highlight: shaded area under the hero ("hero") or under every series ("all"). */
  fill?: "hero" | "all";
  /** line-highlight: value labels on the hero (or every series when there is no hero). */
  valueLabels?: "last" | "minmax" | "all";
  /** line-highlight / small-multiples: value axis starts at zero. */
  zeroBase?: boolean;
  /** line-highlight / small-multiples: horizontal gridlines (default true). */
  grid?: boolean;
  /** line-highlight: least-squares trend line of the hero, dashed. */
  trendLine?: boolean;
  /** line-highlight: legend label of the interval band (default "przedział ufności"). */
  intervalLabel?: string;
  /** small-multiples: one value axis for every panel (default true); false = each panel scaled to its data. */
  sharedY?: boolean;
  /** small-multiples: the other series drawn in grey behind each panel's line. */
  panelContext?: boolean;
  /** grouped-bars / stacked-columns: draw horizontally (categories on the vertical axis). */
  horizontal?: boolean;
  /** ranked-bars / lollipop: also highlight the benchmark category (e.g. EU-27) in series-context with a label. */
  benchmark?: string;
  // --- chart looks (owner's wardrobe, 2026-11-09): settings shared by the line, column, bar, area and combo types
  /** line-highlight: end labels on the context (grey) series too (default true); false = hero and coloured only. */
  contextLabels?: boolean;
  /** columns / grouped-bars / stacked-columns / combo: value labels ("all" = every bar, "last" = the last x only). */
  barLabels?: "none" | "last" | "all";
  /** columns / combo: bars other than `highlight` (or the last x when `highlight` is "last") in series-context. */
  contextBars?: boolean;
  /** ranked-bars / lollipop: keep the category order ("data") instead of sorting by value (default "desc"). */
  sort?: "data" | "desc" | "asc";
  /** stacked-columns: total labels on top (default true). */
  totals?: boolean;
  /** columns / grouped-bars / stacked-columns: narrower bars (more air between them). */
  barWidth?: "normal" | "narrow";
  /** area: fill strength (default "light"). */
  areaFill?: "light" | "strong";
  /** small-multiples: panels per row (default: fitted to the width with no orphan row where possible). */
  panelCols?: number;
  /** combo: the line in series-2 (default ink). */
  lineColour?: "ink" | "series";
};

/** Style families of the library (owner review 2026-11-05): every type belongs to exactly one. */
export const CHART_FAMILIES = ["standard", "ibcs", "variance", "editorial"] as const;
export type ChartFamily = (typeof CHART_FAMILIES)[number];

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

export type ZCategory = { key: string; label: string; short?: string; /** Parent group (hierarchical treemap). */ group?: string };

export type ZUnit = { symbol: string; isRate: boolean; decimals: number };

export type ZChartData = {
  type: ChartType;
  /**
   * Time charts: x = period ("2026-09", "2026-Q2", "2025"), one series per line/part.
   * Category charts (ranked, grouped, dumbbell, slope, diverging, tile-map, histogram buckets…):
   *   x = category key (see `categories`), one series per measure or period (e.g. "2015", "2025").
   * scatter: two series, ids "x" and "y", x = category key (unit), y = value; an optional third series id "size"
   *   makes it a bubble chart (dot area proportional to |size|).
   * bullet: one series, x = measure key, y = value; band and target from `band`/`reference`.
   * contributions: one series per component (x = period, y = contribution in pp, either sign); `total` = the
   *   headline series (default: the sum of the components). More than 5 components: the rest fold into "Pozostałe".
   * waterfall: one series, x = step key, y = contribution; the total is computed and drawn last.
   * sparkline-table: one series per indicator (label = indicator name, points = history, optional own `unit`).
   * tile-map: one series, x = geography key PL02…PL32 (ids like "PL14|gus" also match); see `tileMapSeries`.
   * heatmap: one series with monthly periods (month × year), or one series per row with x = column category.
   * segmented-bar: one series, x = part key; a part keyed "other" is drawn in series-context ("Pozostałe").
   * pyramid: two series (series[0] left, e.g. men; series[1] right), x = age band key, youngest first.
   * histogram: one series, x = bin key ("0-2", "2-4" … numeric edges are drawn on the axis); `reference` = median.
   * area / stacked-area / stacked-columns / bump: one series per line or part, x = period (stacked-columns also
   *   accepts category keys); bump ranks the series at each x (highest value = rank 1).
   * combo: two series in the same unit: series[0] columns, series[1] line.
   * lollipop / ranking-table: series[0] = values per category; ranking-table series[1] = the previous values.
   * dot-plot: two or three series, x = category key (one dot per series and category).
   * treemap: one series, x = part key, positive values.
   * boxplot: one series per box (label = group, e.g. a year), x = unit key (e.g. PL14), y = value; `highlight` marks
   *   one unit in every box.
   * choropleth: as tile-map (one series, x = PL02…PL32).
   * ibcs-columns / variance-columns: series ids "AC" (actual) and "PY" (previous year), optional "PL" (plan) and
   *   "FC" (forecast, drawn hatched); x = period. ibcs-bars / variance-bars: the same ids, x = category key.
   * bridge: one series of drivers (x = driver key, y = signed contribution); `reference` = the start value (PY);
   *   the end value (AC) is computed and labelled with `totalLabel`.
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
  /** contributions: the headline total per period, drawn as a dot on each column (e.g. GDP growth y/y). */
  total?: ZSeries;
  /**
   * Variance charts (ibcs-*, variance-*, bridge): which direction of the measure is favourable. "up"/"down" colour
   * a variance in change-good / change-bad (IBCS green/red); absent = neutral div-positive / div-negative.
   */
  polarity?: "up" | "down";
  /** Variant options (chart library v2), see ZOptions. */
  opts?: ZOptions;
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

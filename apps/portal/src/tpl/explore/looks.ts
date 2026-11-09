// Looks (owner's "outfits", 2026-11-09): a chart type comes with prepared looks, flipped with ‹ › on the chart, and
// settings (the accessories), grouped like the format and analytics panes of Power BI, Tableau and Qlik: data layout
// (series, small multiples, seasonal), emphasis, lines, analytics, labels, axes, legend and title. A look is a preset
// of the settings and of the layout of the dimensions; changing anything marks the look modified, with a way back.
// Prototype for the line chart; the other types follow once it is approved.

import type { ZChartProps, ZSeries } from "@zohelo/visuals";

export type SettingGroup = "layout" | "emphasis" | "lines" | "analytics" | "labels" | "axes" | "legend";

export type SettingDef = {
  key: string;
  pl: string;
  en: string;
  group: SettingGroup;
  options: { value: string; pl: string; en: string }[];
  /** Why the setting cannot be changed with the current data (template: the catalogue lacks it). */
  lockedPl?: string;
  lockedEn?: string;
};

export type Settings = Record<string, string>;

const O = (value: string, pl: string, en: string) => ({ value, pl, en });

/** Layout keys change where the dimensions go (the wells), not the drawing. */
export const LAYOUT_KEYS = ["layout"];

export const LINE_SETTINGS: SettingDef[] = [
  // ---- data layout: how the dimensions are used
  {
    key: "layout",
    pl: "Układ serii",
    en: "Series layout",
    group: "layout",
    options: [
      O("series", "Serie na jednym wykresie", "Series on one chart"),
      O("panels", "Osobne panele", "Small multiples"),
      O("seasonal", "Sezonowo: lata jako serie", "Seasonal: years as series"),
    ],
  },
  {
    key: "panelAxis",
    pl: "Oś w panelach",
    en: "Panel axis",
    group: "layout",
    options: [O("shared", "Wspólna skala", "Shared scale"), O("own", "Dopasowana do panelu", "Fitted per panel")],
  },
  {
    key: "panelContext",
    pl: "Tło w panelach",
    en: "Panel context",
    group: "layout",
    options: [O("off", "Bez tła", "None"), O("on", "Pozostałe serie na szaro", "Other series in grey")],
  },
  {
    key: "top",
    pl: "Liczba serii",
    en: "Number of series",
    group: "layout",
    options: [O("all", "Wszystkie", "All"), O("5", "5 najwyższych", "Top 5"), O("3", "3 najwyższe", "Top 3")],
  },
  // ---- emphasis
  {
    key: "emphasis",
    pl: "Wyróżnienie",
    en: "Emphasis",
    group: "emphasis",
    options: [
      O("none", "Wszystkie w kolorach", "All in colour"),
      O("hero", "Polska na tle szarych", "Poland against grey"),
      O("extremes", "Najwyższa i najniższa", "Highest and lowest"),
    ],
  },
  {
    key: "context",
    pl: "Serie tła",
    en: "Context series",
    group: "emphasis",
    options: [O("solid", "Ciągłe", "Solid"), O("dashed", "Przerywane", "Dashed")],
  },
  // ---- lines
  {
    key: "shape",
    pl: "Kształt",
    en: "Shape",
    group: "lines",
    options: [O("line", "Prosta", "Straight"), O("smooth", "Wygładzona", "Smooth"), O("step", "Schodki", "Steps")],
  },
  {
    key: "weight",
    pl: "Grubość",
    en: "Weight",
    group: "lines",
    options: [O("thin", "Cienka", "Thin"), O("normal", "Standard", "Standard"), O("thick", "Gruba", "Thick")],
  },
  {
    key: "markers",
    pl: "Punkty",
    en: "Markers",
    group: "lines",
    options: [O("off", "Bez", "None"), O("on", "W każdym okresie", "Every period")],
  },
  {
    key: "fill",
    pl: "Wypełnienie",
    en: "Area fill",
    group: "lines",
    options: [O("none", "Bez", "None"), O("hero", "Pod wyróżnioną", "Under the hero"), O("all", "Pod wszystkimi", "Under all")],
  },
  // ---- analytics (Tableau analytics pane, Power BI analytics)
  {
    key: "reference",
    pl: "Linia odniesienia",
    en: "Reference line",
    group: "analytics",
    options: [O("none", "Brak", "None"), O("zero", "Zero", "Zero"), O("avg", "Średnia", "Average"), O("median", "Mediana", "Median")],
  },
  {
    key: "band",
    pl: "Pasmo",
    en: "Band",
    group: "analytics",
    options: [
      O("none", "Brak", "None"),
      O("minmax", "Rozpiętość pozostałych", "Range of the others"),
      O("iqr", "Środkowe 50% pozostałych", "Middle 50% of the others"),
    ],
  },
  {
    key: "trend",
    pl: "Linia trendu",
    en: "Trend line",
    group: "analytics",
    options: [O("off", "Bez", "None"), O("on", "Liniowy", "Linear")],
  },
  {
    key: "annotate",
    pl: "Adnotacje",
    en: "Annotations",
    group: "analytics",
    options: [
      O("none", "Brak", "None"),
      O("max", "Szczyt", "Peak"),
      O("min", "Dołek", "Trough"),
      O("both", "Szczyt i dołek", "Peak and trough"),
    ],
  },
  {
    key: "uncertainty",
    pl: "Przedział ufności",
    en: "Confidence band",
    group: "analytics",
    options: [O("off", "Bez", "None"), O("band", "Pokaż", "Show")],
    lockedPl: "Ta miara nie ma przedziałów ufności.",
    lockedEn: "This measure has no confidence intervals.",
  },
  {
    key: "forecast",
    pl: "Prognoza",
    en: "Forecast",
    group: "analytics",
    options: [O("off", "Bez", "None"), O("on", "Pokaż", "Show")],
    lockedPl: "Ta miara nie ma prognozy.",
    lockedEn: "This measure has no forecast.",
  },
  // ---- labels
  {
    key: "names",
    pl: "Nazwy serii",
    en: "Series names",
    group: "labels",
    options: [O("end", "Na końcu linii", "At the line ends"), O("legend", "W legendzie", "In the legend"), O("both", "Oba", "Both")],
  },
  {
    key: "values",
    pl: "Etykiety wartości",
    en: "Data labels",
    group: "labels",
    options: [
      O("none", "Brak", "None"),
      O("last", "Ostatnia", "Last"),
      O("minmax", "Najwyższa i najniższa", "Highest and lowest"),
      O("all", "Wszystkie (do 24)", "All (up to 24)"),
    ],
  },
  {
    key: "decimals",
    pl: "Miejsca po przecinku",
    en: "Decimals",
    group: "labels",
    options: [O("auto", "Auto", "Auto"), O("0", "0", "0"), O("1", "1", "1"), O("2", "2", "2")],
  },
  // ---- axes
  {
    key: "scale",
    pl: "Skala",
    en: "Scale",
    group: "axes",
    options: [O("value", "Wartości", "Values"), O("index", "Indeks, start = 100", "Index, start = 100")],
  },
  {
    key: "zero",
    pl: "Początek osi",
    en: "Axis start",
    group: "axes",
    options: [O("auto", "Dopasowany", "Fitted"), O("zero", "Od zera", "From zero")],
  },
  { key: "grid", pl: "Siatka", en: "Gridlines", group: "axes", options: [O("on", "Pozioma", "Horizontal"), O("off", "Bez", "None")] },
  // ---- legend and title
  {
    key: "legend",
    pl: "Legenda",
    en: "Legend",
    group: "legend",
    options: [O("bottom", "Pod wykresem", "Below"), O("top", "Nad wykresem", "Above"), O("hidden", "Ukryta", "Hidden")],
  },
  {
    key: "title",
    pl: "Tytuł",
    en: "Title",
    group: "legend",
    options: [O("auto", "Opis danych", "Data description"), O("finding", "Wniosek jako tytuł", "Finding as title")],
  },
];

export const SETTING_GROUPS: Record<SettingGroup, { pl: string; en: string }> = {
  layout: { pl: "Układ danych", en: "Data layout" },
  emphasis: { pl: "Wyróżnienie", en: "Emphasis" },
  lines: { pl: "Linie", en: "Lines" },
  analytics: { pl: "Analityka", en: "Analytics" },
  labels: { pl: "Etykiety", en: "Labels" },
  axes: { pl: "Osie", en: "Axes" },
  legend: { pl: "Legenda i tytuł", en: "Legend and title" },
};

const BASE: Settings = Object.fromEntries(LINE_SETTINGS.map((d) => [d.key, d.options[0]!.value]));
Object.assign(BASE, { names: "end", weight: "normal", panelAxis: "shared" });

export type Look = {
  id: string;
  pl: string;
  en: string;
  notePl: string;
  noteEn: string;
  settings: Settings;
  style: "standard" | "business" | "scientific" | "editorial";
  /** Shown, but not available with the current data. */
  lockedPl?: string;
  lockedEn?: string;
  /** Only for levels (amounts, counts), not for rates and shares. */
  forLevelsOnly?: boolean;
};

const L = (
  id: string,
  pl: string,
  en: string,
  notePl: string,
  noteEn: string,
  style: Look["style"],
  s: Settings,
  extra: Partial<Look> = {},
): Look => ({
  id,
  pl,
  en,
  notePl,
  noteEn,
  style,
  settings: { ...BASE, ...s },
  ...extra,
});

/** Prepared looks of the line chart, in carousel order; the first is the blank start. */
export const LINE_LOOKS: Look[] = [
  L(
    "line.blank",
    "Pusty",
    "Blank",
    "Same linie i legenda: zacznij od zera i dodaj, co potrzebne.",
    "Just the lines and a legend: start from scratch.",
    "standard",
    { names: "legend" },
  ),
  L(
    "line.multi",
    "Czysty",
    "Clean",
    "Każda seria w swoim kolorze, nazwy na końcach linii.",
    "Every series in its colour, names at the line ends.",
    "standard",
    {},
  ),
  L(
    "line.highlight",
    "Bohater i tło",
    "Hero and context",
    "Polska wyróżniona, reszta szara jako tło.",
    "Poland stands out, the rest is grey context.",
    "editorial",
    { emphasis: "hero" },
  ),
  L(
    "line.extremes",
    "Najwyższa i najniższa",
    "Highest and lowest",
    "Dwie skrajne serie w kolorze, pasmo pokazuje rozpiętość pozostałych.",
    "The two extremes in colour, a band shows the spread of the rest.",
    "editorial",
    { emphasis: "extremes", band: "minmax" },
  ),
  L(
    "line.panels",
    "Panele",
    "Small multiples",
    "Każda seria w osobnym panelu na wspólnej skali: łatwe porównanie kształtów.",
    "Every series in its own panel on a shared scale: shapes are easy to compare.",
    "standard",
    { layout: "panels" },
  ),
  L(
    "line.panelsContext",
    "Panele z tłem",
    "Panels with context",
    "W każdym panelu jedna seria na tle pozostałych (styl FT).",
    "One series per panel against the others in grey (FT style).",
    "editorial",
    { layout: "panels", panelContext: "on" },
  ),
  L(
    "line.seasonal",
    "Sezonowość",
    "Seasonality",
    "Miesiące na osi, każdy rok osobną linią: widać wzór sezonowy i odchylenia.",
    "Months on the axis, every year as a line: the seasonal pattern and departures.",
    "standard",
    { layout: "seasonal", emphasis: "none", names: "end" },
  ),
  L(
    "line.reference",
    "Wobec średniej",
    "Against the average",
    "Bohater na tle średniej okresu, pole pod linią.",
    "The hero against the period average, area under the line.",
    "standard",
    { emphasis: "hero", reference: "avg", fill: "hero" },
  ),
  L(
    "line.trend",
    "Z trendem",
    "With trend",
    "Linia trendu i adnotacje szczytu i dołka.",
    "A trend line with the peak and trough annotated.",
    "scientific",
    { emphasis: "hero", trend: "on", annotate: "both" },
  ),
  L(
    "line.labelled",
    "Z etykietami",
    "Labelled",
    "Bez siatki, wartości szczytu, dołka i ostatniego okresu na linii.",
    "No grid, peak, trough and latest values on the line.",
    "editorial",
    { emphasis: "hero", values: "minmax", grid: "off", weight: "thick", annotate: "none" },
  ),
  L(
    "line.indexed",
    "Indeks = 100",
    "Indexed = 100",
    "Wszystkie serie od 100 w pierwszym okresie: porównanie tempa, nie poziomu.",
    "Every series from 100 in the first period: compares pace, not level.",
    "editorial",
    { scale: "index", reference: "none" },
    { forLevelsOnly: true },
  ),
  L(
    "line.smooth",
    "Miękki",
    "Soft",
    "Wygładzone linie i pole pod wyróżnioną: do prezentacji, nie do odczytu wartości.",
    "Smoothed lines and an area under the hero: for presenting, not reading values.",
    "editorial",
    { shape: "smooth", emphasis: "hero", fill: "hero", grid: "off" },
  ),
  L(
    "line.step",
    "Schodkowy",
    "Steps",
    "Wartość obowiązuje do następnej zmiany, np. stopy procentowe.",
    "A value holds until the next change, e.g. interest rates.",
    "standard",
    { shape: "step", markers: "on" },
  ),
  L(
    "line.band",
    "Z przedziałem ufności",
    "With confidence band",
    "Wynik badania z niepewnością (BAEL, EU-SILC).",
    "A survey result with its uncertainty (LFS, EU-SILC).",
    "scientific",
    { emphasis: "hero", uncertainty: "band" },
    { lockedPl: "Ta miara nie ma przedziałów ufności.", lockedEn: "This measure has no confidence intervals." },
  ),
  L(
    "line.forecast",
    "Z prognozą",
    "With forecast",
    "Dane i prognoza w jednej linii, prognoza przerywana.",
    "Data and forecast in one line, the forecast dashed.",
    "standard",
    { emphasis: "hero", forecast: "on" },
    { lockedPl: "Ta miara nie ma prognozy.", lockedEn: "This measure has no forecast." },
  ),
];

/** Looks of a chart kind (prototype: line only). */
export function looksOf(chart: string): Look[] | undefined {
  return chart === "line" ? LINE_LOOKS : undefined;
}

/** The look in effect for a kind: the chosen id when it is one of the kind's looks, else the default (Clean). */
export function currentLook(chart: string, id: string | null | undefined): Look | undefined {
  const ls = looksOf(chart);
  if (!ls) return undefined;
  return ls.find((l) => l.id === id) ?? ls.find((l) => l.id === "line.multi");
}

/** Layout of the dimensions read from the wells: series on one chart, panels, or seasonal. */
export function layoutOf(slots: Partial<Record<string, string | null>>): "series" | "panels" | "seasonal" {
  if (slots.x === "t.moy" || slots.x === "t.qoy") return "seasonal";
  if (slots.sm) return "panels";
  return "series";
}

/** Settings in effect: the look's preset with the reader's changes on top (only known keys and values). */
export function effectiveSettings(look: Look, o: Record<string, string>, slots?: Partial<Record<string, string | null>>): Settings {
  const out = { ...look.settings };
  for (const def of LINE_SETTINGS)
    if (o[def.key] && !def.lockedPl && !LAYOUT_KEYS.includes(def.key) && def.options.some((x) => x.value === o[def.key]))
      out[def.key] = o[def.key]!;
  if (slots) out.layout = layoutOf(slots);
  return out;
}

/** Changes the reader made to the look (empty = the look as prepared). */
export function changedSettings(look: Look, o: Record<string, string>, slots?: Partial<Record<string, string | null>>): string[] {
  const eff = effectiveSettings(look, o, slots);
  return LINE_SETTINGS.map((d) => d.key).filter((k) => eff[k] !== look.settings[k]);
}

const num = (y: number | null | undefined): y is number => typeof y === "number" && Number.isFinite(y);
const lastY = (s: ZSeries) => [...s.points].reverse().find((p) => num(p.y))?.y ?? null;
function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** Draw the line chart (or its panels) with the settings; data transforms (index) are applied before, in the view. */
export function applyLineSettings(z: ZChartProps, s: Settings, lang: "pl" | "en"): ZChartProps {
  const pl = lang === "pl";
  const panels = z.type === "small-multiples";
  // Top N series by the latest value (Poland always kept).
  let all = z.series;
  if (s.top !== "all") {
    const n = Number(s.top);
    const ranked = [...all].sort((a, b) => (lastY(b) ?? -Infinity) - (lastY(a) ?? -Infinity));
    const keep = new Set(ranked.slice(0, n).map((x) => x.id));
    all = all.filter((x) => keep.has(x.id) || x.id === "PL");
  }
  const heroSeries = all.find((x) => x.id === "PL") ?? all[0];
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
  // Band from the other series: full range or the middle 50%.
  let interval: { lower: string; upper: string } | undefined;
  let intervalLabel: string | undefined;
  if (s.band !== "none" && !panels) {
    const others = all.filter((x) => x !== hero && !(s.emphasis === "extremes" && extremes.has(x.id)));
    const base = others.length >= 2 ? others : all;
    const xs = [...new Set(base.flatMap((x) => x.points.map((p) => p.x)))];
    const at = (ser: ZSeries, x: string) => ser.points.find((p) => p.x === x)?.y;
    const q = s.band === "iqr" ? [0.25, 0.75] : [0, 1];
    const lo: ZSeries = { id: "lo", label: "lo", points: [] };
    const hi: ZSeries = { id: "hi", label: "hi", points: [] };
    for (const x of xs) {
      const v = base
        .map((ser) => at(ser, x))
        .filter(num)
        .sort((a, b) => a - b);
      lo.points.push({ x, y: v.length ? quantile(v, q[0]!) : null });
      hi.points.push({ x, y: v.length ? quantile(v, q[1]!) : null });
    }
    series = [...series, lo, hi];
    interval = { lower: "lo", upper: "hi" };
    intervalLabel =
      s.band === "iqr"
        ? pl
          ? "środkowe 50% pozostałych"
          : "middle 50% of the others"
        : pl
          ? "rozpiętość pozostałych"
          : "range of the others";
  }
  // Reference line.
  let reference = z.reference;
  const refSeries = (hero ?? all[0])?.points.map((p) => p.y).filter(num) ?? [];
  if (s.reference === "none") reference = undefined;
  if (s.reference === "zero") reference = { value: 0, label: "0" };
  if (s.reference === "avg" && refSeries.length)
    reference = { value: refSeries.reduce((a, b) => a + b, 0) / refSeries.length, label: pl ? "średnia" : "average" };
  if (s.reference === "median" && refSeries.length)
    reference = {
      value: quantile(
        [...refSeries].sort((a, b) => a - b),
        0.5,
      ),
      label: pl ? "mediana" : "median",
    };
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
  const decimals = s.decimals === "auto" ? z.unit.decimals : Number(s.decimals);
  return {
    ...z,
    type: panels ? "small-multiples" : "line-highlight",
    series,
    unit: { ...z.unit, decimals },
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

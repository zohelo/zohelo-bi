import type { VisualizationSpec } from "vega-embed";
import { CHART_TEXT, periodFormat, type ChartLang } from "./locale";

// Vega-Lite spec builders: one function per chart type, fed with plain rows.
// Field names are passed in, so the same builders serve every metric.

/** Colours read from the page's CSS tokens, so charts follow light and dark mode. */
export type Theme = { text: string; muted: string; grid: string; accent: string; mutedMark: string; palette: string[] };

export function config(t: Theme) {
  return {
    // The page font by name: vega measures labels with it, so wide labels get room ("inherit" measured as 10 px sans).
    font: "Inter Variable, system-ui, sans-serif",
    axis: {
      labelColor: t.muted,
      titleColor: t.muted,
      gridColor: t.grid,
      domainColor: t.grid,
      tickColor: t.grid,
      labelFontSize: 11,
      titleFontSize: 11,
      titleFontWeight: 500,
    },
    legend: { labelColor: t.text, titleColor: t.muted, labelFontSize: 12 },
    view: { stroke: null },
    range: { category: t.palette },
    line: { strokeCap: "round" },
  };
}

export type LineOptions = {
  x: string;
  y: string;
  series: string;
  yTitle: string;
  highlight?: string | null;
  /** The series' frequencies (A, S, Q, M, D): they pick the period format of the axis and tooltip. */
  frequencies?: string[];
  lang?: ChartLang;
};

// Numbers on axes and in tooltips use the chart locale's grouping and decimal mark, never SI prefixes
// ('37 500 000', not '37.5M'), with trailing zeros trimmed.
const AXIS_NUMBER = ",~f";
const TOOLTIP_NUMBER = ",.4~f";
// The y unit sits above the axis, level, so wide grouped labels ('37 500 000') never run into it.
const UNIT_ON_TOP = { titleAngle: 0, titleAlign: "left", titleAnchor: "end", titleBaseline: "bottom", titleX: 0, titleY: -8 } as const;

const base = {
  $schema: "https://vega.github.io/schema/vega-lite/v6.json",
  width: "container",
  autosize: { type: "fit", contains: "padding" },
  background: "transparent",
} as const;

export function lineSpec(rows: object[], o: LineOptions): VisualizationSpec {
  const text = CHART_TEXT[o.lang ?? "en"];
  const time = periodFormat(o.frequencies ?? ["D"]);
  return {
    ...base,
    height: 300,
    data: { values: rows },
    mark: { type: "line", point: rows.length <= 60, strokeWidth: 2, interpolate: "monotone" },
    encoding: {
      x: { field: o.x, type: "temporal", title: null, axis: { tickCount: 7, labelOverlap: true, grid: false, format: time } },
      y: {
        field: o.y,
        type: "quantitative",
        title: o.yTitle,
        scale: { zero: false },
        axis: { format: AXIS_NUMBER, tickCount: 5, ...UNIT_ON_TOP },
      },
      color: {
        field: o.series,
        type: "nominal",
        title: null,
        legend: { orient: "bottom", direction: "vertical", labelLimit: 420, symbolType: "stroke", symbolStrokeWidth: 3 },
      },
      opacity: o.highlight
        ? { condition: { test: `datum['${o.series}'] === ${JSON.stringify(o.highlight)}`, value: 1 }, value: 0.25 }
        : { value: 1 },
      tooltip: [
        { field: o.series, type: "nominal", title: text.series },
        { field: o.x, type: "temporal", title: text.period, format: time },
        { field: o.y, type: "quantitative", title: o.yTitle, format: TOOLTIP_NUMBER },
      ],
    },
  } as VisualizationSpec;
}

export type BarOptions = {
  category: string;
  value: string;
  valueTitle: string;
  selected?: string | null;
  accent: string;
  mutedMark: string;
  lang?: ChartLang;
};

export function barSpec(rows: object[], o: BarOptions): VisualizationSpec {
  const text = CHART_TEXT[o.lang ?? "en"];
  return {
    ...base,
    height: { step: 22 },
    data: { values: rows },
    mark: { type: "bar", cornerRadiusEnd: 3, cursor: "pointer" },
    encoding: {
      y: { field: o.category, type: "nominal", sort: "-x", title: null, axis: { labelLimit: 220 } },
      x: { field: o.value, type: "quantitative", title: o.valueTitle, axis: { format: AXIS_NUMBER, tickCount: 5 } },
      color: o.selected
        ? { condition: { test: `datum['${o.category}'] === ${JSON.stringify(o.selected)}`, value: o.accent }, value: o.mutedMark }
        : { value: o.accent },
      tooltip: [
        { field: o.category, type: "nominal", title: text.area },
        { field: o.value, type: "quantitative", title: o.valueTitle, format: TOOLTIP_NUMBER },
      ],
    },
  } as VisualizationSpec;
}

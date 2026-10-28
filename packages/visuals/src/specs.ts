import type { VisualizationSpec } from "vega-embed";

// Vega-Lite spec builders: one function per chart type, fed with plain rows.
// Field names are passed in, so the same builders serve every metric.

/** Colours read from the page's CSS tokens, so charts follow light and dark mode. */
export type Theme = { text: string; muted: string; grid: string; accent: string; mutedMark: string; palette: string[] };

export function config(t: Theme) {
  return {
    font: "inherit",
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
};

const base = {
  $schema: "https://vega.github.io/schema/vega-lite/v6.json",
  width: "container",
  autosize: { type: "fit", contains: "padding" },
  background: "transparent",
} as const;

export function lineSpec(rows: object[], o: LineOptions): VisualizationSpec {
  return {
    ...base,
    height: 300,
    data: { values: rows },
    mark: { type: "line", point: rows.length <= 60, strokeWidth: 2, interpolate: "monotone" },
    encoding: {
      x: { field: o.x, type: "temporal", title: null, axis: { tickCount: 7, labelOverlap: true, grid: false } },
      y: { field: o.y, type: "quantitative", title: o.yTitle, scale: { zero: false }, axis: { format: "~s", tickCount: 5 } },
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
        { field: o.series, type: "nominal", title: "Series" },
        { field: o.x, type: "temporal", title: "Period" },
        { field: o.y, type: "quantitative", title: o.yTitle, format: ",.4~f" },
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
};

export function barSpec(rows: object[], o: BarOptions): VisualizationSpec {
  return {
    ...base,
    height: { step: 22 },
    data: { values: rows },
    mark: { type: "bar", cornerRadiusEnd: 3, cursor: "pointer" },
    encoding: {
      y: { field: o.category, type: "nominal", sort: "-x", title: null, axis: { labelLimit: 220 } },
      x: { field: o.value, type: "quantitative", title: o.valueTitle, axis: { format: "~s", tickCount: 5 } },
      color: o.selected
        ? { condition: { test: `datum['${o.category}'] === ${JSON.stringify(o.selected)}`, value: o.accent }, value: o.mutedMark }
        : { value: o.accent },
      tooltip: [
        { field: o.category, type: "nominal", title: "Area" },
        { field: o.value, type: "quantitative", title: o.valueTitle, format: ",.4~f" },
      ],
    },
  } as VisualizationSpec;
}

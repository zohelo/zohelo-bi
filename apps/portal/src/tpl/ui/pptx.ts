// Editable PowerPoint export (docs/product-principles.md, need 2 and 3: "charts as editable objects", "many charts at
// once"). One slide per chart: title, subtitle, finding, the chart, an optional comment, the source and the unit.
//   native   line, column, bar, area, pie, scatter and combo go out as PowerPoint's own chart with the data embedded:
//            the user can restyle it, change the type or edit the numbers in PowerPoint ("Edytuj dane").
//   picture  what Office cannot draw (IBCS variance, Pareto, maps, small multiples, tables…) goes out as the chart's
//            SVG, a vector picture that PowerPoint ungroups into shapes ("Konwertuj na kształt"), with a one-line note.
// pptxgenjs is loaded on demand, so the library costs nothing until someone exports.

import type { ZChartProps } from "@zohelo/visuals";

export type NativeKind = "line" | "column" | "bar" | "area" | "pie" | "doughnut" | "scatter" | "combo";

export type NativeSeries = { name: string; values: (number | null)[]; color?: string; line?: boolean };

export type NativeChart = {
  kind: NativeKind;
  stack?: "stacked" | "percent";
  labels: string[];
  series: NativeSeries[];
};

export type SlideSpec = {
  title: string;
  sub?: string;
  finding?: string;
  /** The reader's own note beside the chart (collections). */
  comment?: string;
  source: string;
  /** Unit symbol for the value axis. */
  unit?: string;
  native?: NativeChart | null;
  /** The chart as a vector picture when there is no native form. */
  picture?: { svg: string; w: number; h: number } | null;
  /** Shown under a picture: why it is not a native chart. */
  note?: string;
  /** Speaker notes (link back to the live view). */
  notes?: string;
};

/** Colours and font of the deck, read from the design tokens by the caller (no colour literals here). */
export type DeckTheme = { ink: string; ink2: string; ink3: string; line: string; surface: string; series: string[]; font: string };

/** The label of an x key as the chart writes it: the category's name, or the period in words ("sty 2024"). */
const labelOf = (z: ZChartProps, key: string) => z.categories?.find((c) => c.key === key)?.label ?? z.formatPeriod?.(key) ?? key;

function xKeys(z: ZChartProps): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of z.series)
    for (const p of s.points)
      if (!seen.has(p.x)) {
        seen.add(p.x);
        out.push(p.x);
      }
  return out;
}

const valuesOf = (z: ZChartProps, i: number, keys: string[]) => {
  const m = new Map(z.series[i]!.points.map((p) => [p.x, p.y]));
  return keys.map((k) => m.get(k) ?? null);
};

/**
 * The native PowerPoint form of a chart, or null when Office has no honest equivalent (the caller then sends the
 * vector picture). Only plain types qualify: anything with bands, variance notation, references that carry the
 * message, panels or a map stays a picture, because a native chart would silently drop that part.
 */
export function nativeChart(z: ZChartProps): NativeChart | null {
  if (!z.series.length) return null;
  const o = z.opts ?? {};
  const keys = xKeys(z);
  if (!keys.length) return null;
  const labels = keys.map((k) => labelOf(z, k));
  const all = (line?: boolean): NativeSeries[] =>
    z.series.map((s, i) => ({ name: s.label, values: valuesOf(z, i, keys), ...(line ? { line } : {}) }));
  switch (z.type) {
    case "line-highlight":
      return { kind: "line", labels, series: all() };
    case "columns":
      return { kind: "column", labels, series: all() };
    case "grouped-bars":
      return { kind: o.horizontal ? "bar" : "column", labels, series: all() };
    case "stacked-columns":
      return { kind: o.horizontal ? "bar" : "column", stack: o.percent ? "percent" : "stacked", labels, series: all() };
    case "stacked-bars":
      return { kind: "bar", stack: "percent", labels, series: all() };
    case "ranked-bars":
    case "lollipop": {
      // As drawn: one series, categories from the largest.
      const vals = valuesOf(z, 0, keys);
      const order = keys.map((_, i) => i).sort((a, b) => (vals[b] ?? -Infinity) - (vals[a] ?? -Infinity));
      return {
        kind: "bar",
        labels: order.map((i) => labels[i]!),
        series: [{ name: z.series[0]!.label, values: order.map((i) => vals[i]!) }],
      };
    }
    case "area":
      return { kind: "area", labels, series: all() };
    case "stacked-area":
      return { kind: "area", stack: "stacked", labels, series: all() };
    case "area-share":
      return { kind: "area", stack: "percent", labels, series: all() };
    case "pie":
      return { kind: o.donut ? "doughnut" : "pie", labels, series: [{ name: z.series[0]!.label, values: valuesOf(z, 0, keys) }] };
    case "scatter": {
      const xs = z.series.find((s) => s.id === "x");
      const ys = z.series.find((s) => s.id === "y");
      if (!xs || !ys || z.series.some((s) => s.id === "size")) return null;
      const xm = new Map(xs.points.map((p) => [p.x, p.y]));
      const pts = ys.points.filter((p) => p.y !== null && xm.get(p.x) !== null && xm.get(p.x) !== undefined);
      if (!pts.length) return null;
      return {
        kind: "scatter",
        labels: pts.map((p) => labelOf(z, p.x)),
        series: [
          { name: xs.label, values: pts.map((p) => xm.get(p.x)!) },
          { name: ys.label, values: pts.map((p) => p.y) },
        ],
      };
    }
    case "combo":
      if (z.series.length < 2) return null;
      return { kind: "combo", labels, series: z.series.map((s, i) => ({ name: s.label, values: valuesOf(z, i, keys), line: i > 0 })) };
    default:
      return null;
  }
}

const hex = (c: string) => c.replace(/^#/, "").toUpperCase();

/** Decimals of the axis and labels from the data: none for large values, one otherwise. */
function formatCode(n: NativeChart): string {
  const max = Math.max(0, ...n.series.flatMap((s) => s.values.map((v) => Math.abs(v ?? 0))));
  if (n.stack === "percent") return "0%";
  return max >= 1000 ? "#,##0" : max >= 20 ? "#,##0.0" : "#,##0.00";
}

/** Slide geometry in inches (16:9, 13.33 × 7.5). */
const W = 13.33;
const M = 0.5;

type Pptx = InstanceType<(typeof import("pptxgenjs"))["default"]>;

function addChart(
  pptx: Pptx,
  slide: ReturnType<Pptx["addSlide"]>,
  n: NativeChart,
  box: { x: number; y: number; w: number; h: number },
  t: DeckTheme,
  unit?: string,
) {
  const colors = n.series.map((s, i) => hex(s.color ?? t.series[i % t.series.length]!));
  const fmt = formatCode(n);
  const many = n.series.length > 1 || n.kind === "pie" || n.kind === "doughnut";
  const base = {
    ...box,
    catAxisLabelFontFace: t.font,
    catAxisLabelFontSize: 10,
    catAxisLabelColor: hex(t.ink2),
    valAxisLabelFontFace: t.font,
    valAxisLabelFontSize: 10,
    valAxisLabelColor: hex(t.ink2),
    valAxisLabelFormatCode: fmt,
    valGridLine: { color: hex(t.line), size: 0.5 },
    catGridLine: { style: "none" as const },
    showLegend: many,
    legendPos: "b" as const,
    legendFontFace: t.font,
    legendFontSize: 10,
    legendColor: hex(t.ink),
    showValAxisTitle: !!unit && n.kind !== "pie" && n.kind !== "doughnut",
    valAxisTitle: unit,
    valAxisTitleFontFace: t.font,
    valAxisTitleFontSize: 10,
    valAxisTitleColor: hex(t.ink2),
    dataLabelFormatCode: fmt,
    dataLabelFontFace: t.font,
    dataLabelFontSize: 9,
    chartArea: { roundedCorners: false },
  };
  const data = (ss: NativeSeries[]) => ss.map((s) => ({ name: s.name, labels: n.labels, values: s.values as number[] }));
  const grouping =
    n.stack === "percent" ? ("percentStacked" as const) : n.stack === "stacked" ? ("stacked" as const) : ("clustered" as const);
  switch (n.kind) {
    case "line":
      slide.addChart(pptx.ChartType.line, data(n.series), {
        ...base,
        chartColors: colors,
        lineSize: 2,
        lineDataSymbol: n.labels.length > 24 ? "none" : "circle",
        lineDataSymbolSize: 5,
      });
      return;
    case "area":
      slide.addChart(pptx.ChartType.area, data(n.series), { ...base, chartColors: colors, barGrouping: n.stack ? grouping : "standard" });
      return;
    case "column":
    case "bar":
      slide.addChart(pptx.ChartType.bar, data(n.series), {
        ...base,
        chartColors: colors,
        barDir: n.kind === "bar" ? "bar" : "col",
        barGrouping: grouping,
        barGapWidthPct: 60,
        // Horizontal bars read from the top, as on the page.
        ...(n.kind === "bar" ? { catAxisOrientation: "maxMin" as "minMax", valAxisLabelPos: "high" as const } : {}),
        showValue: n.series.length === 1 && n.labels.length <= 16,
      });
      return;
    case "pie":
    case "doughnut": {
      const slices = n.labels.map((_, i) => hex(t.series[i % t.series.length]!));
      slide.addChart(n.kind === "pie" ? pptx.ChartType.pie : pptx.ChartType.doughnut, data(n.series), {
        ...base,
        chartColors: slices,
        showPercent: true,
        showValue: false,
        dataLabelColor: hex(t.surface),
        ...(n.kind === "doughnut" ? { holeSize: 55 } : {}),
      });
      return;
    }
    case "scatter":
      slide.addChart(
        pptx.ChartType.scatter,
        [
          { name: n.series[0]!.name, values: n.series[0]!.values as number[] },
          { name: n.series[1]!.name, values: n.series[1]!.values as number[] },
        ],
        {
          ...base,
          chartColors: [colors[0]!],
          lineSize: 0,
          lineDataSymbol: "circle",
          lineDataSymbolSize: 7,
          showLegend: false,
          showCatAxisTitle: true,
          catAxisTitle: n.series[0]!.name,
          showValAxisTitle: true,
          valAxisTitle: n.series[1]!.name,
        },
      );
      return;
    case "combo": {
      const bars = n.series.filter((s) => !s.line);
      const lines = n.series.filter((s) => s.line);
      const colorOf = (s: NativeSeries) => colors[n.series.indexOf(s)]!;
      slide.addChart(
        [
          { type: pptx.ChartType.bar, data: data(bars), options: { chartColors: bars.map(colorOf), barDir: "col", barGapWidthPct: 60 } },
          {
            type: pptx.ChartType.line,
            data: data(lines),
            options: { chartColors: lines.map(colorOf), lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 5 },
          },
        ],
        // For a multi-type chart pptxgenjs reads the options from the second argument.
        base as unknown as unknown[],
        base,
      );
      return;
    }
  }
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** The deck as bytes: one slide per spec, in order. */
export async function buildPptx(slides: SlideSpec[], meta: { title: string; theme: DeckTheme }): Promise<ArrayBuffer> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const t = meta.theme;
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = meta.title;
  pptx.company = "zohelo bi";
  pptx.theme = { headFontFace: t.font, bodyFontFace: t.font };
  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: hex(t.surface) };
    let y = 0.4;
    slide.addText(s.title, {
      x: M,
      y,
      w: W - 2 * M,
      h: 0.7,
      fontFace: t.font,
      fontSize: 24,
      bold: true,
      color: hex(t.ink),
      valign: "top",
      fit: "shrink",
    });
    y += 0.75;
    if (s.sub) {
      slide.addText(s.sub, { x: M, y, w: W - 2 * M, h: 0.3, fontFace: t.font, fontSize: 12, color: hex(t.ink2), valign: "top" });
      y += 0.32;
    }
    if (s.finding) {
      slide.addText(s.finding, { x: M, y, w: W - 2 * M, h: 0.36, fontFace: t.font, fontSize: 14, color: hex(t.ink), valign: "top" });
      y += 0.4;
    }
    const bottom = 6.75;
    const noteH = s.note && !s.native ? 0.3 : 0;
    const commentW = s.comment ? 3.4 : 0;
    const box = { x: M, y: y + 0.1, w: W - 2 * M - (commentW ? commentW + 0.3 : 0), h: bottom - noteH - y - 0.15 };
    if (s.native) addChart(pptx, slide, s.native, box, t, s.unit);
    else if (s.picture) {
      const k = Math.min(box.w / s.picture.w, box.h / s.picture.h);
      const w = s.picture.w * k;
      const h = s.picture.h * k;
      slide.addImage({ data: `data:image/svg+xml;base64,${b64(s.picture.svg)}`, x: box.x, y: box.y, w, h });
      if (s.note)
        slide.addText(s.note, {
          x: M,
          y: bottom - noteH,
          w: box.w,
          h: noteH,
          fontFace: t.font,
          fontSize: 9,
          italic: true,
          color: hex(t.ink3),
          valign: "top",
        });
    }
    if (s.comment)
      slide.addText(s.comment, {
        x: W - M - commentW,
        y: box.y,
        w: commentW,
        h: box.h,
        fontFace: t.font,
        fontSize: 14,
        color: hex(t.ink),
        valign: "top",
        paraSpaceAfter: 6,
      });
    slide.addText(s.source, {
      x: M,
      y: bottom + 0.05,
      w: W - 2 * M,
      h: 0.4,
      fontFace: t.font,
      fontSize: 10,
      color: hex(t.ink3),
      valign: "top",
    });
    if (s.notes) slide.addNotes(s.notes);
  }
  return (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
}

export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// An explorer view as a PowerPoint slide (ui/pptx.ts): the native chart when Office can draw it, otherwise the vector
// picture with the note. Shared by the explorer's "PowerPoint" button and by collections (one deck, many views).

import type { Lang } from "../../i18n";
import { downloadBlob, type LegendEntry } from "../ui/copy";
import { PPTX_MIME, buildPptx, nativeChart, type DeckTheme, type SlideSpec } from "../ui/pptx";
import type { ExploreView } from "./view";

/** A CSS colour as six hex digits (canvas normalises names, rgb() and variables already resolved). */
function toHex(css: string): string {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return css;
    ctx.fillStyle = css;
    const v = String(ctx.fillStyle);
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
    if (m) return [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    return v.replace(/^#/, "");
  } catch {
    return css;
  }
}

/** The deck's colours and font from the design tokens of the page. */
export function deckTheme(): DeckTheme & { context: string } {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => toHex(css.getPropertyValue(name).trim());
  return {
    ink: v("--ink"),
    ink2: v("--ink-2"),
    ink3: v("--ink-3"),
    line: v("--line"),
    surface: v("--surface"),
    series: [1, 2, 3, 4, 5].map((i) => v(`--series-${i}`)),
    context: v("--series-context"),
    // Inter is the portal's face; PowerPoint substitutes its default sans where Inter is not installed.
    font: "Inter",
  };
}

export const VECTOR_NOTE = {
  pl: "PowerPoint nie ma takiego wykresu, więc to grafika wektorowa. Aby ją edytować, kliknij prawym przyciskiem i wybierz „Konwertuj na kształt”.",
  en: "PowerPoint has no such chart, so this is a vector picture. To edit it, right-click and choose “Convert to Shape”.",
};

export type SlideInput = {
  view: ExploreView;
  lang: Lang;
  source: string;
  /** Colours as drawn (legend entries of the card), matched to the series by label. */
  legend: LegendEntry[];
  /** The chart as SVG, without title and source (the slide writes those as text). Called only when needed. */
  picture: () => { svg: string; w: number; h: number } | null;
  /** The reader's own title and comment (collections). */
  title?: string;
  comment?: string;
  link?: string;
};

/** Whether the view goes out as a native PowerPoint chart. */
export function isNative(view: ExploreView): boolean {
  const z = !view.grid && !view.matrix && view.panels.length === 1 ? view.panels[0]!.chart : null;
  return !!z && !!nativeChart(z);
}

export function viewSlide(i: SlideInput, theme: DeckTheme & { context: string }): SlideSpec {
  const { view: v } = i;
  const z = !v.grid && !v.matrix && v.panels.length === 1 ? v.panels[0]!.chart : null;
  const native = z ? nativeChart(z) : null;
  if (native && z) {
    const byLabel = new Map(i.legend.map((e) => [e.label, toHex(e.color)]));
    native.series = native.series.map((s, k) => {
      const role = z.series.find((x) => x.label === s.name)?.role;
      const color = byLabel.get(s.name) ?? (role === "context" ? theme.context : theme.series[k % theme.series.length]);
      return { ...s, color };
    });
  }
  return {
    title: i.title?.trim() || v.title,
    sub: v.sub,
    finding: v.finding || undefined,
    comment: i.comment?.trim() || undefined,
    source: i.source,
    unit: z?.unit.symbol || undefined,
    native,
    picture: native ? null : i.picture(),
    note: native ? undefined : VECTOR_NOTE[i.lang],
    notes: i.link,
  };
}

/** Builds the deck and hands it to the browser as a download. */
export async function downloadDeck(name: string, slides: SlideSpec[], title: string, theme: DeckTheme): Promise<void> {
  const bytes = await buildPptx(slides, { title, theme });
  downloadBlob(`${name}.pptx`, new Blob([bytes], { type: PPTX_MIME }));
}

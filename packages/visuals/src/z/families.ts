// Style families of the chart library (owner review 2026-11-05): the same zohelo layout and tokens, four ways of
// telling numbers. Every chart type belongs to one family; the guide and the explorer's chart picker group by it.
//   standard   the zohelo default: one message per chart, FT Visual Vocabulary jobs, ONS/GOV.UK guidance
//   ibcs       International Business Communication Standards (SUCCESS): scenario notation AC/PY/PL/FC, data
//              labels instead of axes, time horizontal and structure vertical, variances in their own rows
//   variance   business variance charts in the pattern made popular by Zebra BI: the variance drawn on the
//              chart itself (integrated), absolute and relative variances side by side
//   editorial  newsroom charts (Financial Times, The Economist, Our World in Data): ranks, gaps and changes
//              told with dots, slopes and highlights

import type { ChartFamily, ChartType } from "./types";

export const CHART_FAMILY: Record<ChartType, ChartFamily> = {
  "line-band": "standard",
  "line-highlight": "editorial",
  columns: "standard",
  contributions: "standard",
  "small-multiples": "editorial",
  "area-share": "standard",
  "ranked-bars": "standard",
  "grouped-bars": "standard",
  dumbbell: "editorial",
  slope: "editorial",
  "diverging-bars": "standard",
  bullet: "ibcs",
  waterfall: "standard",
  "stacked-bars": "standard",
  "segmented-bar": "standard",
  pyramid: "standard",
  histogram: "standard",
  scatter: "standard",
  "tile-map": "standard",
  heatmap: "standard",
  "sparkline-table": "standard",
  area: "standard",
  "stacked-area": "standard",
  "stacked-columns": "standard",
  combo: "standard",
  bump: "editorial",
  lollipop: "editorial",
  "dot-plot": "editorial",
  "ranking-table": "editorial",
  treemap: "standard",
  boxplot: "standard",
  choropleth: "standard",
  "ibcs-columns": "ibcs",
  "ibcs-bars": "ibcs",
  "variance-columns": "variance",
  "variance-bars": "variance",
  bridge: "ibcs",
  pie: "standard",
  waffle: "editorial",
  strip: "standard",
  fan: "standard",
  "symbol-map": "standard",
  sankey: "editorial",
  "kpi-card": "ibcs",
  sparkline: "editorial",
  table: "standard",
  pareto: "standard",
};

export const FAMILY_INFO: Record<ChartFamily, { pl: string; en: string; notePl: string; noteEn: string }> = {
  standard: {
    pl: "Standard zohelo",
    en: "zohelo standard",
    notePl: "Domyślny język wykresów: jeden wniosek na wykres, wybór według zadania (FT Visual Vocabulary, wytyczne ONS).",
    noteEn: "The default chart language: one message per chart, chosen by job (FT Visual Vocabulary, ONS guidance).",
  },
  ibcs: {
    pl: "IBCS (raporty biznesowe)",
    en: "IBCS (business reports)",
    notePl:
      "Notacja scenariuszy: AC wykonanie (pełne ciemne), PY rok poprzedni (szare), PL plan (obrys), FC prognoza (kreskowane); etykiety danych zamiast osi, odchylenia w osobnych wierszach.",
    noteEn:
      "Scenario notation: AC actual (solid dark), PY previous year (grey), PL plan (outline), FC forecast (hatched); data labels instead of axes, variances in their own rows.",
  },
  variance: {
    pl: "Odchylenia (styl Zebra BI)",
    en: "Variances (Zebra BI style)",
    notePl: "Odchylenie narysowane na samym wykresie: odcinek między PY a AC w kolorze oceny, obok odchylenie względne jako szpilki.",
    noteEn: "The variance drawn on the chart itself: the segment between PY and AC coloured by verdict, relative variance as pins beside.",
  },
  editorial: {
    pl: "Redakcyjne (FT, The Economist)",
    en: "Editorial (FT, The Economist)",
    notePl: "Wykresy z redakcji: bohater i kontekst, rankingi, luki i zmiany pokazane kropkami, nachyleniem i wyróżnieniem.",
    noteEn: "Newsroom charts: hero and context, ranks, gaps and changes told with dots, slopes and highlights.",
  },
};

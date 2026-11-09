// Samples of the chart library v2 types (docs/chart-library-proposal.md). Sample data only.

import type { ChartSample, ZUnit } from "./types";

export type ExtraType = "pie" | "waffle" | "strip" | "fan" | "symbol-map" | "sankey" | "kpi-card" | "sparkline" | "table";

const PCT: ZUnit = { symbol: "%", isRate: true, decimals: 1 };

/** Placeholder sample of a v2 type (replaced by a real one with its renderer). */
function stub(type: ExtraType, kind_pl: string, kind_en: string): ChartSample {
  return {
    type,
    kind_pl,
    kind_en,
    group_pl: "Przegląd",
    group_en: "Overview",
    title: kind_pl,
    sub: "",
    use_pl: "",
    avoid_pl: "",
    use_en: "",
    avoid_en: "",
    lang: "pl",
    unit: PCT,
    ariaLabel: kind_pl,
    series: [{ id: "a", label: "A", points: [{ x: "a", y: 1 }] }],
  };
}

export const EXTRA_SAMPLES: Record<ExtraType, ChartSample> = {
  pie: stub("pie", "Kołowy", "Pie"),
  waffle: stub("waffle", "Waflowy", "Waffle"),
  strip: stub("strip", "Rozkład punktowy", "Strip plot"),
  fan: stub("fan", "Wachlarzowy", "Fan chart"),
  "symbol-map": stub("symbol-map", "Kartodiagram", "Proportional symbol map"),
  sankey: stub("sankey", "Diagram Sankeya", "Sankey"),
  "kpi-card": stub("kpi-card", "Karta wskaźnika", "KPI card"),
  sparkline: stub("sparkline", "Mikrowykres", "Sparkline"),
  table: stub("table", "Tabela", "Table"),
};

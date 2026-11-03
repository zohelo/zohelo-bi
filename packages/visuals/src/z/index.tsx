// zohelo chart library entry. PLACEHOLDER implementation: the full library (all CHART_TYPES) replaces
// ZChart's body; toTable and legendItems keep their signatures.
import type { ZChartProps, ZLegendItem, ZTable } from "./types";

export * from "./types";

export const PALETTE = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

export function seriesColor(role: string | undefined, index: number): string {
  return role === "context" ? "var(--series-context)" : role === "hero" ? "var(--series-1)" : PALETTE[index % PALETTE.length]!;
}

export function ZChart(props: ZChartProps) {
  return (
    <svg role="img" aria-label={props.ariaLabel} viewBox="0 0 400 120" width="100%" height={props.height ?? 240}>
      <text x="8" y="20" style={{ fontSize: 12, fill: "var(--ink-3)" }}>
        {props.type}
      </text>
    </svg>
  );
}

export function toTable(p: ZChartProps): ZTable {
  const xs = [...new Set(p.series.flatMap((s) => s.points.map((pt) => pt.x)))];
  const label = (x: string) => p.categories?.find((c) => c.key === x)?.label ?? p.formatPeriod?.(x) ?? x;
  return {
    caption: p.ariaLabel,
    columns: ["", ...p.series.map((s) => s.label)],
    rows: xs.map((x) => [
      label(x),
      ...p.series.map((s) => {
        const v = s.points.find((pt) => pt.x === x)?.y;
        return v === null || v === undefined
          ? "–"
          : v.toLocaleString(p.lang === "pl" ? "pl-PL" : "en-GB", {
              maximumFractionDigits: p.unit.decimals,
              minimumFractionDigits: p.unit.decimals,
            });
      }),
    ]),
    numeric: [false, ...p.series.map(() => true)],
  };
}

export function legendItems(p: ZChartProps): ZLegendItem[] {
  return p.series.map((s, i) => ({ label: s.label, color: seriesColor(s.role, i), shape: "line" }));
}

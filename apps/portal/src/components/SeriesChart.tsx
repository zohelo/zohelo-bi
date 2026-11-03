import { useCallback, useMemo } from "react";
import { Chart, barSpec, lineSpec, type Theme } from "@zohelo/visuals";
import type { SeriesRow } from "@zohelo/semantic";
import { display, seriesLabels } from "../labels";
import { t, type Lang } from "../i18n";

// Turns metric rows into chart rows: one line per series (labelled by what differs), or one bar
// per area holding its latest value.

type Props = {
  rows: SeriesRow[];
  chart: "line" | "bar";
  unit: string;
  label: string;
  selected?: string | null;
  onSelect?: (area: string) => void;
  lang?: Lang;
};

export function latestByArea(rows: SeriesRow[]): { area: string; raw: string; value: number; date: string }[] {
  const latest = new Map<string, SeriesRow>();
  for (const r of rows) {
    if (r.value == null || !r.geography_name) continue;
    const prev = latest.get(r.geography_name);
    if (!prev || r.date_key > prev.date_key) latest.set(r.geography_name, r);
  }
  return [...latest.values()].map((r) => ({
    area: display("geography_name", r.geography_name!),
    raw: r.geography_name!,
    value: r.value!,
    date: r.date_key,
  }));
}

export function SeriesChart({ rows, chart, unit, label, selected, onSelect, lang = "en" }: Props) {
  const data = useMemo(() => {
    if (chart === "bar") return latestByArea(rows);
    const labels = seriesLabels(rows);
    return rows.filter((r) => r.value != null).map((r) => ({ date: r.date_key, value: r.value, series: labels.get(r.series_key) }));
  }, [rows, chart]);

  const selectedLabel = selected ? display("geography_name", selected) : null;
  const build = useCallback(
    (t: Theme) =>
      chart === "bar"
        ? barSpec(data, {
            category: "area",
            value: "value",
            valueTitle: unit,
            selected: selectedLabel,
            accent: t.accent,
            mutedMark: t.mutedMark,
            lang,
          })
        : lineSpec(data, { x: "date", y: "value", series: "series", yTitle: unit, lang }),
    [data, chart, unit, selectedLabel, lang],
  );
  const onPick = useCallback(
    (datum: Record<string, unknown>) => {
      if (typeof datum.raw === "string") onSelect?.(datum.raw);
    },
    [onSelect],
  );
  if (!data.length) return <p className="empty">{t(lang, "chart.noData")}</p>;
  return <Chart build={build} onPick={onSelect ? onPick : undefined} label={label} lang={lang} />;
}

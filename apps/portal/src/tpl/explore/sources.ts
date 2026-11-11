// Sources, licences, attribution and the export metadata built from them; plus the period × series matrix
// used by the explorer table and the CSV export.

import type { Lang } from "../../i18n";
import type { Catalog, Frequency, Kpi, Series } from "../../data";
import type { ZSeries } from "@zohelo/visuals";
import { sourceName } from "../chartData";
import { freqLabel } from "../format";
import type { CsvMeta, CsvTable } from "./csv";
import { unitName } from "./kpiInfo";

export type SourceRow = { source: string; period: string | null; value: number | null; unit_key: string; frequency: Frequency };

/**
 * The latest value of a KPI per source (its own unit and frequency: sources publish one KPI differently), and the
 * spread between them only when every source with a value shares the unit and the frequency.
 */
export function compareSources(
  kpi: Pick<Kpi, "unit_key" | "frequency" | "source_keys">,
  series: Series[],
): { rows: SourceRow[]; spread: number | null; sameUnit: boolean; sameFrequency: boolean } {
  const rows = kpi.source_keys.map((source): SourceRow => {
    const one = series.find((x) => x.source_key === source);
    const last = [...(one?.points ?? [])].reverse().find((p) => p.value !== null);
    return {
      source,
      period: last?.period ?? null,
      value: last?.value ?? null,
      unit_key: one?.unit_key ?? kpi.unit_key,
      frequency: one?.frequency ?? kpi.frequency,
    };
  });
  const withValue = rows.filter((r) => r.value !== null);
  const sameUnit = new Set(withValue.map((r) => r.unit_key)).size <= 1;
  const sameFrequency = new Set(withValue.map((r) => r.frequency)).size <= 1;
  const vals = withValue.map((r) => r.value!);
  const spread = sameUnit && sameFrequency && vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : null;
  return { rows, spread, sameUnit, sameFrequency };
}

export function licenceOf(cat: Catalog, sourceKey: string) {
  const s = cat.sources.find((x) => x.source_key === sourceKey);
  return s ? cat.licences.find((l) => l.licence_key === s.licence_key) : undefined;
}

export function registerId(cat: Catalog, sourceKey: string): string {
  return cat.sources.find((x) => x.source_key === sourceKey)?.register_id ?? sourceKey;
}

/** "Źródło: Eurostat, licencja CC BY 4.0". */
export function attribution(cat: Catalog, sourceKey: string, lang: Lang): string {
  const l = licenceOf(cat, sourceKey);
  const name = sourceName(cat, sourceKey, lang);
  return l ? l.attribution_text.replace("{source}", name) : name;
}

export function sampleNotice(lang: Lang): string {
  return lang === "pl"
    ? "Dane przykładowe: wartości są syntetyczne i służą tylko do pokazania układu; nie cytuj ich"
    : "Sample data: values are synthetic and only show the layout; do not cite them";
}

export function exportMeta(
  cat: Catalog,
  k: Kpi,
  sources: string[],
  lang: Lang,
  extra: { title?: string; url?: string; now?: Date } = {},
): CsvMeta {
  const pl = lang === "pl";
  const lic = [...new Set(sources.map((s) => licenceOf(cat, s)).filter((l) => !!l))];
  const meta: CsvMeta = [
    ...(extra.title ? [{ label: pl ? "Tytuł" : "Title", value: extra.title }] : []),
    { label: pl ? "Wskaźnik" : "Indicator", value: `${pl ? k.name_pl : k.name_en} (${k.kpi_key})` },
    { label: pl ? "Jednostka" : "Unit", value: unitName(cat, k.unit_key, lang) },
    { label: pl ? "Częstotliwość" : "Frequency", value: freqLabel(k.frequency, lang) },
    {
      label: pl ? "Źródło" : "Source",
      value: sources.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join("; "),
    },
    { label: pl ? "Licencja" : "Licence", value: lic.map((l) => `${l.name} ${l.url}`).join("; ") || "–" },
  ];
  if (cat.sample) meta.push({ label: pl ? "Uwaga" : "Note", value: sampleNotice(lang) });
  meta.push({ label: pl ? "Wersja danych" : "Data version", value: cat.generated_at.slice(0, 10) });
  meta.push({ label: pl ? "Pobrano" : "Downloaded", value: (extra.now ?? new Date()).toISOString().slice(0, 10) });
  if (extra.url) meta.push({ label: "URL", value: extra.url });
  return meta;
}

export type Matrix = { periods: string[]; labels: string[]; values: (number | null)[][] };

/** Rows = periods (newest first), columns = series. Missing values are null. */
export function seriesMatrix(series: ZSeries[]): Matrix {
  const periods = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort().reverse();
  const maps = series.map((s) => new Map(s.points.map((p) => [p.x, p.y])));
  return {
    periods,
    labels: series.map((s) => s.label),
    values: periods.map((p) => maps.map((m) => m.get(p) ?? null)),
  };
}

export function matrixCsv(m: Matrix, periodLabel: string): CsvTable {
  return { columns: [periodLabel, ...m.labels], rows: m.periods.map((p, i) => [p, ...m.values[i]!]) };
}

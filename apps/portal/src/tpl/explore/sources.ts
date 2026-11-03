// Sources, licences, attribution and the export metadata built from them; plus the period × series matrix
// used by the explorer table and the CSV export.

import type { Lang } from "../../i18n";
import type { Catalog, Kpi } from "../../data";
import type { ZSeries } from "@zohelo/visuals";
import { sourceName } from "../chartData";
import { freqLabel } from "../format";
import type { CsvMeta, CsvTable } from "./csv";
import { unitName } from "./kpiInfo";

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

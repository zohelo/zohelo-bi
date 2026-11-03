import type { SeriesRow } from "@zohelo/semantic";
import type { Lang } from "./i18n";

export const SOURCES: Record<string, string> = {
  eurostat: "Eurostat",
  gus_bdl: "GUS BDL",
  gus_dbw: "GUS DBW",
  world_bank_wdi: "World Bank",
  nbp: "NBP",
};

export const FREQUENCIES: Record<string, string> = { A: "Annual", Q: "Quarterly", M: "Monthly", D: "Daily" };
const FREQUENCIES_PL: Record<string, string> = { A: "Roczna", Q: "Kwartalna", M: "Miesięczna", D: "Dzienna" };

// Member values shown on Polish pages; EN pages keep the published values.
const GEO_LEVELS_PL: Record<string, string> = {
  country: "kraj",
  nuts1: "NUTS 1",
  nuts2: "NUTS 2",
  voivodeship: "województwo",
  powiat: "powiat",
  gmina: "gmina",
};
const UNITS_PL: Record<string, string> = { persons: "osoby" };

/** Geography levels of the published layer, coarsest first. */
export const GEO_LEVELS = ["country", "nuts1", "nuts2", "voivodeship", "powiat", "gmina"];

export const GEO_LABELS: Record<string, string> = {
  country: "Country",
  nuts1: "NUTS 1",
  nuts2: "NUTS 2",
  voivodeship: "Voivodeship",
  powiat: "Powiat",
  gmina: "Gmina",
};

/** The finest known level among levels, or null. */
export function deepestGeo(levels: string[]): string | null {
  let best = -1;
  for (const l of levels) best = Math.max(best, GEO_LEVELS.indexOf(l));
  return best < 0 ? null : GEO_LEVELS[best]!;
}

/** A member value as shown on a page in lang: source names, frequencies, and on Polish pages geography levels and units. */
export function display(column: string, value: string, lang: Lang = "en"): string {
  if (column === "source_system") return SOURCES[value] ?? value;
  if (column === "frequency") return (lang === "pl" ? FREQUENCIES_PL[value] : undefined) ?? FREQUENCIES[value] ?? value;
  if (lang === "pl" && column === "geography_level") return GEO_LEVELS_PL[value] ?? value;
  if (lang === "pl" && column === "unit") return UNITS_PL[value] ?? value;
  if (column === "breakdown_json") return breakdown(value);
  if (column === "geography_name" && value === value.toUpperCase() && /\p{L}/u.test(value)) return titleCase(value);
  return value;
}

function titleCase(s: string): string {
  return s.toLocaleLowerCase("pl").replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pl"));
}

export function breakdown(json: string | null): string {
  if (!json) return "";
  try {
    const parsed = JSON.parse(json) as Record<string, string>;
    return Object.values(parsed).join(" · ");
  } catch {
    return json;
  }
}

/** One label per series, built only from the parts that differ between the series shown. */
export function seriesLabels(rows: SeriesRow[]): Map<string, string> {
  const bySeries = new Map<string, SeriesRow>();
  for (const r of rows) if (!bySeries.has(r.series_key)) bySeries.set(r.series_key, r);
  const parts: [keyof SeriesRow, (r: SeriesRow) => string][] = [
    ["geography_name", (r) => display("geography_name", r.geography_name ?? "")],
    ["source_system", (r) => display("source_system", r.source_system)],
    ["frequency", (r) => display("frequency", r.frequency)],
    ["breakdown_json", (r) => breakdown(r.breakdown_json)],
    ["series_key", (r) => r.series_key.split("|")[0]?.split(":")[1] ?? ""],
  ];
  const series = [...bySeries.values()];
  const varying = parts.filter(([key]) => new Set(series.map((r) => r[key])).size > 1);
  const meaningful = varying.filter(([key]) => key !== "series_key");
  const used = meaningful.length ? meaningful : parts.slice(1, 2);
  const labels = new Map<string, string>();
  for (const r of series)
    labels.set(
      r.series_key,
      used
        .map(([, f]) => f(r))
        .filter(Boolean)
        .join(" · "),
    );
  // Still ambiguous (same area, source and unit, different measure): add the block id.
  const counts = new Map<string, number>();
  for (const l of labels.values()) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const r of series) {
    const l = labels.get(r.series_key)!;
    if ((counts.get(l) ?? 0) > 1) labels.set(r.series_key, `${l} · ${parts[4]![1](r)}`);
  }
  return labels;
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null) return "–";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 }).format(v);
}

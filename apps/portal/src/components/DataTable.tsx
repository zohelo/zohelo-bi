import type { SeriesRow } from "@zohelo/semantic";
import { t, type Lang, type StringKey } from "../i18n";
import { decimalsOf, display, formatNumber } from "../labels";

const COLUMNS: [keyof SeriesRow, StringKey][] = [
  ["date_key", "table.period"],
  ["geography_name", "table.area"],
  ["source_system", "table.source"],
  ["frequency", "table.frequency"],
  ["value", "table.value"],
  ["unit", "table.unit"],
  ["breakdown_json", "table.breakdown"],
];

export function toCsv(rows: SeriesRow[]): string {
  const cols = [...COLUMNS.map(([c]) => c), "series_key" as const];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function download(name: string, data: string | Uint8Array, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable({ rows, limit = 50, lang = "en" }: { rows: SeriesRow[]; limit?: number; lang?: Lang }) {
  const shown = [...rows].sort((a, b) => b.date_key.localeCompare(a.date_key)).slice(0, limit);
  // One precision per series, so 4,0 stands next to 3,9.
  const digits = new Map<string, number>();
  for (const key of new Set(shown.map((r) => r.series_key)))
    digits.set(key, decimalsOf(shown.filter((r) => r.series_key === key).map((r) => r.value)));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map(([c, key]) => (
              <th key={c} className={c === "value" ? "num" : undefined}>
                {t(lang, key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={`${r.series_key}|${r.date_key}|${i}`}>
              {COLUMNS.map(([c]) => (
                <td key={c} className={c === "value" ? "num" : undefined}>
                  {c === "value" ? formatNumber(r.value, lang, digits.get(r.series_key)) : display(c, String(r[c] ?? ""))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && (
        <p className="hint">
          {t(lang, "table.showing")
            .replace("{limit}", String(limit))
            .replace("{total}", rows.length.toLocaleString(lang === "pl" ? "pl-PL" : "en-GB"))}
        </p>
      )}
    </div>
  );
}

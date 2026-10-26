import type { SeriesRow } from "@zohelo/semantic";
import { display, formatNumber } from "../labels";

const COLUMNS: [keyof SeriesRow, string][] = [
  ["date_key", "Period"],
  ["geography_name", "Area"],
  ["source_system", "Source"],
  ["frequency", "Frequency"],
  ["value", "Value"],
  ["unit", "Unit"],
  ["breakdown_json", "Breakdown"],
];

export function toCsv(rows: SeriesRow[]): string {
  const cols = [...COLUMNS.map(([c]) => c), "series_key" as const];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable({ rows, limit = 50 }: { rows: SeriesRow[]; limit?: number }) {
  const shown = [...rows].sort((a, b) => b.date_key.localeCompare(a.date_key)).slice(0, limit);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map(([c, label]) => (
              <th key={c} className={c === "value" ? "num" : undefined}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={`${r.series_key}|${r.date_key}|${i}`}>
              {COLUMNS.map(([c]) => (
                <td key={c} className={c === "value" ? "num" : undefined}>
                  {c === "value" ? formatNumber(r.value) : display(c, String(r[c] ?? ""))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && <p className="hint">Showing the latest {limit} of {rows.length.toLocaleString("en-GB")} rows. Download CSV for all.</p>}
    </div>
  );
}

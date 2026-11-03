import type { CompareTable as Table } from "../compare";
import { decimalsOf, display, formatNumber } from "../labels";
import { t, type Lang } from "../i18n";

// compareSources as a table: one column per source, one row per period, and the spread.

export function CompareTable({ table, lang = "en" }: { table: Table; lang?: Lang }) {
  if (table.sources.length < 2) return <p className="compare-empty">{t(lang, "compare.oneSource")}</p>;
  if (table.mixed) return <p className="compare-empty">{t(lang, "compare.oneArea")}</p>;
  // One precision per column (source) and for the spread, so 4,0 stands next to 3,9.
  const digits = Object.fromEntries(table.sources.map((s) => [s, decimalsOf(table.rows.map((r) => r.values[s]))]));
  const spreadDigits = Math.max(decimalsOf(table.rows.map((r) => r.spread)), ...Object.values(digits));
  return (
    <table className="compare-table">
      <thead>
        <tr>
          <th>{t(lang, "compare.period")}</th>
          {table.sources.map((s) => (
            <th key={s}>{display("source_system", s)}</th>
          ))}
          <th>{t(lang, "compare.spread")}</th>
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.period}>
            <td>{r.period}</td>
            {table.sources.map((s) => (
              <td key={s} className="num">
                {formatNumber(r.values[s], lang, digits[s])}
              </td>
            ))}
            <td className="num">{formatNumber(r.spread, lang, spreadDigits)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

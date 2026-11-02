import type { CompareTable as Table } from "../compare";
import { display, formatNumber } from "../labels";
import { t, type Lang } from "../i18n";

// compareSources as a table: one column per source, one row per period, and the spread.

export function CompareTable({ table, lang = "en" }: { table: Table; lang?: Lang }) {
  if (table.sources.length < 2) return <p className="compare-empty">{t(lang, "compare.oneSource")}</p>;
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
                {formatNumber(r.values[s])}
              </td>
            ))}
            <td className="num">{formatNumber(r.spread)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

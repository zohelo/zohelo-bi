import type { CompareTable as Table } from "../compare";
import { display, formatNumber } from "../labels";

// compareSources as a table: one column per source, one row per period, and the spread.

export function CompareTable({ table }: { table: Table }) {
  if (table.sources.length < 2) return <p className="compare-empty">Only one source publishes this KPI.</p>;
  return (
    <table className="compare-table">
      <thead>
        <tr>
          <th>Period</th>
          {table.sources.map((s) => (
            <th key={s}>{display("source_system", s)}</th>
          ))}
          <th>Spread</th>
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

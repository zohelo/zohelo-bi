// Small render pieces shared by the explorer and the indicator page: chart legend from the chart library's
// legendItems, and a scrollable data table.

import type { ReactNode } from "react";
import { legendItems, ZLegend, type ZChartProps } from "@zohelo/visuals";

/** Chart legend from the chart library (shown for two or more entries: series, band, reference). */
export function Legend({ chart, bare }: { chart: ZChartProps; bare?: boolean }) {
  const items = legendItems(chart);
  if (items.length < 2) return null;
  return bare ? (
    <ZLegend items={items} />
  ) : (
    <div className="zt-legend t-legend">
      <ZLegend items={items} />
    </div>
  );
}

export type ShownTable = {
  caption: string;
  columns: ReactNode[];
  numeric: boolean[];
  rows: { key: string; cells: ReactNode[]; strong?: boolean }[];
};

/** Real table with caption and th scope; first column is the row header; wide tables scroll inside. */
export function DataTable({ table, label, maxHeight }: { table: ShownTable; label: string; maxHeight?: boolean }) {
  return (
    <div className={`zt-table-wrap ex-tablewrap${maxHeight ? " ex-tablewrap--tall" : ""}`} tabIndex={0} role="region" aria-label={label}>
      <table className="zt-table">
        <caption className="zt-sr">{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i} scope="col" className={table.numeric[i] ? "num" : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.key} className={r.strong ? "ex-row-strong" : undefined}>
              {r.cells.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="ex-rowhead">
                    {c}
                  </th>
                ) : (
                  <td key={j} className={table.numeric[j] ? "num" : undefined}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

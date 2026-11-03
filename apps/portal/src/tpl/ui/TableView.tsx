// Table view of a chart (every chart has one): same caption, numbers right-aligned in tabular figures.
import type { ZTable } from "@zohelo/visuals";

export function TableView({ table }: { table: ZTable }) {
  return (
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
        {table.rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) =>
              j === 0 ? (
                <th
                  key={j}
                  scope="row"
                  style={{ fontWeight: 400, textAlign: "left", background: "transparent", color: "var(--ink)", fontSize: 13 }}
                >
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
  );
}

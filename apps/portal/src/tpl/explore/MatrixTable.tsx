// Macierz (matrix kind of explorer v3, Power BI matrix): the rows × columns pivot as a real table — a caption,
// column headers, a row header per row, numbers right-aligned in tabular figures, "–" for a missing value. Wide
// matrices scroll inside their own frame (focusable, labelled), never the page.

import type { Lang } from "../../i18n";
import type { MatrixModel } from "./viewMore";

export function MatrixTable({ m, caption, lang }: { m: MatrixModel; caption: string; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <div className="x3-matrix" tabIndex={0} role="region" aria-label={`${pl ? "Macierz" : "Matrix"}: ${caption}`}>
      <table className="zt-table x3-matrix__table">
        <caption className="zt-sr">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              {m.rowHead}
              {m.colHead ? ` \\ ${m.colHead}` : ""}
            </th>
            {m.cols.map((c) => (
              <th key={c.key} scope="col" className="num">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r, i) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {m.cols.map((c, j) => (
                <td key={c.key} className="num">
                  {m.cells[i]![j]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

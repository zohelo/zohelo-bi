import type { PivotResult } from "@zohelo/semantic";
import { t, type Lang } from "../i18n";
import { display, formatNumber } from "../labels";

// The explorer matrix: rows × columns from pivot(), up to two key levels per axis.
// Never sums (pivot leaves conflicting cells empty); sticky first column and header.

// rowDims/colDims: the dimension of each key level, so member values read as on the rest of the page (source names,
// Polish geography levels and frequencies).
type Props = {
  result: PivotResult;
  unit: string;
  rowLabels: string[];
  colLabels: string[];
  rowDims?: string[];
  colDims?: string[];
  lang?: Lang;
};

/** Runs of consecutive keys sharing the same parts up to `level`: [start index, length]. */
function runs(keys: string[][], level: number): [number, number][] {
  const out: [number, number][] = [];
  const prefix = (k: string[]) => JSON.stringify(k.slice(0, level + 1));
  keys.forEach((k, i) => {
    const last = out[out.length - 1];
    if (last && prefix(keys[last[0]]!) === prefix(k)) last[1] += 1;
    else out.push([i, 1]);
  });
  return out;
}

export function PivotMatrix({ result, unit, rowLabels, colLabels, rowDims = [], colDims = [], lang = "en" }: Props) {
  const { rowKeys, colKeys, cells, conflicts, truncated } = result;
  const fmt = new Intl.NumberFormat(lang === "pl" ? "pl-PL" : "en-GB");

  if (truncated) {
    return <p className="hint">{t(lang, "matrix.tooMany").replace("{n}", fmt.format(rowKeys.length * colKeys.length))}</p>;
  }

  const colLevels = Math.max(colLabels.length, 1);
  const rowLevels = rowLabels.length;
  // Where each row-key level starts a new run, and how many rows the run spans.
  const rowSpans = rowLabels.map((_, level) => new Map(runs(rowKeys, level)));

  return (
    <>
      {conflicts > 0 && <p className="hint">{t(lang, "matrix.conflicts").replace("{n}", fmt.format(conflicts))}</p>}
      <div className="matrix" tabIndex={0} role="region" aria-label={t(lang, "matrix.label")}>
        <table>
          <caption>{unit}</caption>
          <thead>
            {Array.from({ length: colLevels }, (_, level) => (
              <tr key={level}>
                {level === 0 &&
                  rowLabels.map((label) => (
                    <th key={label} rowSpan={colLevels} scope="col">
                      {label}
                    </th>
                  ))}
                {colLabels.length === 0 ? (
                  <th className="num" scope="col">
                    {t(lang, "matrix.value")}
                  </th>
                ) : (
                  runs(colKeys, level).map(([start, span]) => (
                    <th key={start} colSpan={span} className="num" scope="col">
                      {display(colDims[level] ?? "", colKeys[start]![level]!, lang)}
                    </th>
                  ))
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {rowKeys.map((key, r) => (
              <tr key={JSON.stringify(key)}>
                {key.slice(0, rowLevels).map((part, level) => {
                  const span = level < rowLevels - 1 ? rowSpans[level]!.get(r) : 1;
                  return span ? (
                    <th key={level} rowSpan={span} scope="row">
                      {display(rowDims[level] ?? "", part, lang)}
                    </th>
                  ) : null;
                })}
                {(cells[r] ?? []).map((v, c) => (
                  <td key={c} className="num">
                    {formatNumber(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
